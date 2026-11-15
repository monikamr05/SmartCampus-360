/**
 * Academic Controller  (Admin-only)
 *
 * Provides consolidated views of:
 *   - Attendance  : course-wise summary, shortage students, date roster
 *   - Examinations: course+student results, upsert internal marks, averages
 *
 * All attendance writes enforce duplicate-entry prevention:
 * if a record already exists for student+course+date it is updated, not duplicated.
 */

const SubjectAttendance = require('../models/SubjectAttendance');
const ExamResult        = require('../models/ExamResult');
const StudentProfile    = require('../models/StudentProfile');
const Course            = require('../models/Course');
const Department        = require('../models/Department');
const Activity          = require('../models/Activity');

const log = (action, desc, req) =>
  Activity.create({
    action, entity: 'academic', description: desc,
    performedBy: req.user?._id, performedByName: req.user?.name || 'Admin', icon: '🎓',
  }).catch(() => {});

const computeGrade = (total) => {
  if (total >= 90) return { grade: 'A+', gp: 4.0 };
  if (total >= 80) return { grade: 'A',  gp: 3.7 };
  if (total >= 70) return { grade: 'B+', gp: 3.3 };
  if (total >= 60) return { grade: 'B',  gp: 3.0 };
  if (total >= 50) return { grade: 'C',  gp: 2.0 };
  if (total >= 40) return { grade: 'D',  gp: 1.0 };
  return { grade: 'F', gp: 0.0 };
};

/* ════════════════════════════════════════════════════════════════════════════
   ATTENDANCE
   ════════════════════════════════════════════════════════════════════════════ */

// GET /api/academic/attendance
// Paginated course-wise attendance summary with shortage flag
const getAttendanceOverview = async (req, res) => {
  try {
    const { courseId, departmentId, search, page = 1, limit = 15 } = req.query;

    // Build course filter
    const courseFilter = { isActive: true };
    if (courseId)     courseFilter._id        = courseId;
    if (departmentId) courseFilter.department  = departmentId;
    if (search)       courseFilter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
    ];

    const skip = (Number(page) - 1) * Number(limit);
    const [courses, total] = await Promise.all([
      Course.find(courseFilter)
        .populate('department', 'name code')
        .sort({ name: 1 }).skip(skip).limit(Number(limit)).lean(),
      Course.countDocuments(courseFilter),
    ]);

    // For each course: aggregate attendance stats
    const summary = await Promise.all(courses.map(async (c) => {
      const records = await SubjectAttendance.find({ course: c._id }).lean();
      const totalStudents = records.length;
      const totalClasses  = records.length ? records[0].totalClasses : 0;
      const avgAttendance = totalStudents
        ? Math.round(records.reduce((s, r) =>
            s + (r.totalClasses ? (r.attended / r.totalClasses) * 100 : 0), 0
          ) / totalStudents)
        : 0;
      const shortageCount = records.filter(r =>
        r.totalClasses ? (r.attended / r.totalClasses) * 100 < 75 : false
      ).length;

      return {
        course: c,
        totalStudents,
        totalClasses,
        avgAttendance,
        shortageCount,
      };
    }));

    res.json({ summary, pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/academic/attendance/:courseId
// Full student-wise attendance for one course + shortage list
const getCourseAttendance = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId)
      .populate('department', 'name code').lean();
    if (!course) return res.status(404).json({ message: 'Course not found.' });

    const records = await SubjectAttendance.find({ course: req.params.courseId })
      .populate('student', 'studentId name email attendancePct')
      .lean();

    const rows = records.map(r => ({
      _id:          r._id,
      student:      r.student,
      totalClasses: r.totalClasses,
      attended:     r.attended,
      absent:       r.totalClasses - r.attended,
      percentage:   r.totalClasses ? Math.round((r.attended / r.totalClasses) * 100) : 0,
      semester:     r.semester,
      academic:     r.academic,
      recentRecords: (r.records || []).slice(-5).reverse(),
    })).sort((a, b) => a.student?.name?.localeCompare(b.student?.name || '') || 0);

    const shortage = rows.filter(r => r.percentage < 75);

    // Unique date list (for the date-wise roster)
    const allDates = [...new Set(
      records.flatMap(r => r.records.map(x => new Date(x.date).toISOString().slice(0, 10)))
    )].sort();

    res.json({ course, rows, shortage, allDates });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/academic/attendance/:courseId/roster?date=YYYY-MM-DD
// Returns present/absent status for each student on a specific date
const getDateRoster = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'date query param required.' });
    const d = new Date(date);

    const records = await SubjectAttendance.find({ course: req.params.courseId })
      .populate('student', 'studentId name').lean();

    const roster = records.map(r => {
      const rec = r.records.find(x => new Date(x.date).toDateString() === d.toDateString());
      return {
        studentId:   r.student?._id,
        studentCode: r.student?.studentId,
        name:        r.student?.name,
        present:     rec ? rec.present : null,  // null = not marked
        note:        rec?.note || '',
      };
    }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    res.json({ roster, date, courseId: req.params.courseId });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /api/academic/attendance/:courseId/mark
// Bulk mark attendance — PREVENTS duplicates by updating existing records
const markAttendanceBulk = async (req, res) => {
  try {
    const { date, records } = req.body;
    if (!date || !Array.isArray(records)) {
      return res.status(400).json({ message: 'date and records[] are required.' });
    }
    const d = new Date(date);
    const course = await Course.findById(req.params.courseId).lean();
    if (!course) return res.status(404).json({ message: 'Course not found.' });

    let created = 0, updated = 0;

    await Promise.all(records.map(async ({ studentId, present, note = '' }) => {
      let att = await SubjectAttendance.findOne({
        student: studentId,
        course:  req.params.courseId,
      });

      if (!att) {
        const sp = await StudentProfile.findById(studentId).lean();
        att = new SubjectAttendance({
          student:    studentId,
          course:     req.params.courseId,
          courseName: course.name,
          courseCode: course.code,
          semester:   sp?.semester || 1,
        });
        created++;
      }

      // ── Duplicate prevention ──────────────────────────────────────────────
      const dateStr = d.toDateString();
      const existingIdx = att.records.findIndex(
        r => new Date(r.date).toDateString() === dateStr
      );

      if (existingIdx >= 0) {
        // Update existing record — adjust counters
        const wasPresent = att.records[existingIdx].present;
        att.records[existingIdx] = { date: d, present, note };
        if (wasPresent && !present) att.attended = Math.max(0, att.attended - 1);
        if (!wasPresent && present) att.attended += 1;
        updated++;
      } else {
        // New date entry
        att.records.push({ date: d, present, note });
        att.totalClasses += 1;
        if (present) att.attended += 1;
      }

      await att.save();

      // Sync overall attendancePct on StudentProfile
      await StudentProfile.findByIdAndUpdate(studentId, {
        attendancePct: att.totalClasses
          ? Math.round((att.attended / att.totalClasses) * 100)
          : 0,
      });
    }));

    await log('ATTENDANCE', `Marked attendance for ${records.length} students on ${d.toDateString()} (${course.name})`, req);
    res.json({ message: `Attendance saved. ${created} new, ${updated} updated.`, date });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PUT /api/academic/attendance/:courseId/student/:studentId
// Update a single student's attendance record for a date
const updateStudentAttendance = async (req, res) => {
  try {
    const { date, present, note = '' } = req.body;
    if (!date) return res.status(400).json({ message: 'date is required.' });
    const d = new Date(date);

    const att = await SubjectAttendance.findOne({
      student: req.params.studentId,
      course:  req.params.courseId,
    });
    if (!att) return res.status(404).json({ message: 'Attendance record not found.' });

    const idx = att.records.findIndex(r => new Date(r.date).toDateString() === d.toDateString());
    if (idx >= 0) {
      const was = att.records[idx].present;
      att.records[idx] = { date: d, present, note };
      if (was && !present) att.attended = Math.max(0, att.attended - 1);
      if (!was && present)  att.attended += 1;
    } else {
      att.records.push({ date: d, present, note });
      att.totalClasses += 1;
      if (present) att.attended += 1;
    }

    await att.save();
    await StudentProfile.findByIdAndUpdate(req.params.studentId, {
      attendancePct: att.totalClasses
        ? Math.round((att.attended / att.totalClasses) * 100)
        : 0,
    });

    res.json({ percentage: att.totalClasses ? Math.round((att.attended / att.totalClasses) * 100) : 0 });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ════════════════════════════════════════════════════════════════════════════
   EXAMINATIONS
   ════════════════════════════════════════════════════════════════════════════ */

// GET /api/academic/exams
// All courses with result summary (avg internal, pass rate, grade dist)
const getExamOverview = async (req, res) => {
  try {
    const { courseId, departmentId, semester, page = 1, limit = 15 } = req.query;

    const courseFilter = { isActive: true };
    if (courseId)     courseFilter._id       = courseId;
    if (departmentId) courseFilter.department = departmentId;
    if (semester)     courseFilter.semester   = semester;

    const skip = (Number(page) - 1) * Number(limit);
    const [courses, total] = await Promise.all([
      Course.find(courseFilter)
        .populate('department', 'name code')
        .sort({ name: 1 }).skip(skip).limit(Number(limit)).lean(),
      Course.countDocuments(courseFilter),
    ]);

    const summary = await Promise.all(courses.map(async (c) => {
      const results = await ExamResult.find({ course: c._id }).lean();
      const totalStudents = results.length;
      const passCount     = results.filter(r => r.isPassed).length;
      const avgInternal   = totalStudents
        ? Math.round(results.reduce((s, r) => s + (r.internal?.total || 0), 0) / totalStudents)
        : 0;
      const gradeDist     = { 'A+':0,'A':0,'B+':0,'B':0,'C':0,'D':0,'F':0 };
      results.forEach(r => { if (r.grade && gradeDist[r.grade]!==undefined) gradeDist[r.grade]++; });

      return { course: c, totalStudents, passCount, failCount: totalStudents - passCount, avgInternal, gradeDist };
    }));

    res.json({ summary, pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/academic/exams/:courseId — full student-wise results for one course
const getCourseResults = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId)
      .populate('department', 'name code').lean();
    if (!course) return res.status(404).json({ message: 'Course not found.' });

    const students = await StudentProfile.find({ courses: req.params.courseId })
      .select('studentId name email semester').sort({ name: 1 }).lean();

    const results = await ExamResult.find({ course: req.params.courseId }).lean();

    const rows = students.map(s => {
      const r = results.find(x => x.student.toString() === s._id.toString());
      return {
        student:  s,
        result:   r || null,
        internal: r?.internal || { assignment1:0, assignment2:0, midterm:0, quiz:0, total:0 },
        external: r?.external || { marksObtained:0, maxMarks:100 },
        grade:    r?.grade    || '—',
        gradePoint: r?.gradePoint || 0,
        isPassed: r?.isPassed  ?? null,
        remarks:  r?.remarks   || '',
        publishedAt: r?.publishedAt || null,
      };
    });

    // Class averages
    const withResults = rows.filter(r => r.result);
    const avgInternal   = withResults.length
      ? Math.round(withResults.reduce((s, r) => s + r.internal.total, 0) / withResults.length)
      : 0;
    const avgExternal   = withResults.length
      ? Math.round(withResults.reduce((s, r) => s + r.external.marksObtained, 0) / withResults.length)
      : 0;
    const passRate      = withResults.length
      ? Math.round((withResults.filter(r => r.isPassed).length / withResults.length) * 100)
      : 0;

    res.json({ course, rows, stats: { totalStudents: students.length, entered: withResults.length, avgInternal, avgExternal, passRate } });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PUT /api/academic/exams/:courseId/:studentId — upsert internal marks
const upsertExamResult = async (req, res) => {
  try {
    const { assignment1=0, assignment2=0, midterm=0, quiz=0,
            marksObtained=0, maxMarks=100, remarks='' } = req.body;

    const course = await Course.findById(req.params.courseId).lean();
    if (!course) return res.status(404).json({ message: 'Course not found.' });
    const sp     = await StudentProfile.findById(req.params.studentId).lean();
    if (!sp)     return res.status(404).json({ message: 'Student not found.' });

    const internalTotal = Number(assignment1)+Number(assignment2)+Number(midterm)+Number(quiz);
    const { grade, gp } = computeGrade(internalTotal);

    const result = await ExamResult.findOneAndUpdate(
      { student: req.params.studentId, course: req.params.courseId },
      {
        $set: {
          student: req.params.studentId,
          course:  req.params.courseId,
          courseName: course.name, courseCode: course.code,
          semester: sp.semester || 1,
          internal: { assignment1:+assignment1, assignment2:+assignment2, midterm:+midterm, quiz:+quiz, total: internalTotal },
          external: { marksObtained:+marksObtained, maxMarks:+maxMarks },
          grade, gradePoint: gp, isPassed: grade !== 'F', remarks,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

    // Recalculate student overall GPA
    const allResults = await ExamResult.find({ student: req.params.studentId }).lean();
    if (allResults.length) {
      const avg = allResults.reduce((s, r) => s + (r.gradePoint || 0), 0) / allResults.length;
      await StudentProfile.findByIdAndUpdate(req.params.studentId, { gpa: Math.round(avg * 100) / 100 });
    }

    await log('MARKS', `Updated marks for ${sp.name} in ${course.name}`, req);
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PUT /api/academic/exams/:courseId/publish — publish all results for a course
const publishResults = async (req, res) => {
  try {
    const result = await ExamResult.updateMany(
      { course: req.params.courseId, publishedAt: null },
      { $set: { publishedAt: new Date() } }
    );
    await log('PUBLISH', `Published exam results for course ${req.params.courseId}`, req);
    res.json({ message: `Published ${result.modifiedCount} results.` });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = {
  getAttendanceOverview, getCourseAttendance, getDateRoster, markAttendanceBulk, updateStudentAttendance,
  getExamOverview, getCourseResults, upsertExamResult, publishResults,
};
