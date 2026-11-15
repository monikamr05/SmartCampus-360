/**
 * Faculty Dashboard Controller
 * All handlers resolve the FacultyProfile via req.user._id,
 * then scope every query to that profile's .courses array —
 * so faculty can only manage their own assigned subjects.
 */

const FacultyProfile    = require('../models/FacultyProfile');
const StudentProfile    = require('../models/StudentProfile');
const Course            = require('../models/Course');
const SubjectAttendance = require('../models/SubjectAttendance');
const ExamResult        = require('../models/ExamResult');
const Assignment        = require('../models/Assignment');
const Announcement      = require('../models/Announcement');
const Activity          = require('../models/Activity');

// ── helpers ───────────────────────────────────────────────────────────────────
const resolveProfile = (userId) =>
  FacultyProfile.findOne({ user: userId })
    .populate('department', 'name code')
    .populate('courses', 'name code semester year credits enrolled maxStudents instructor department');

const noProfile = (res) =>
  res.status(404).json({ message: 'Faculty profile not found. Contact your administrator.' });

/** Throw 403 if courseId is not in faculty's course list */
const assertOwns = (profile, courseId) => {
  const owns = profile.courses.some(c => c._id.toString() === courseId.toString());
  if (!owns) throw Object.assign(new Error('You are not assigned to this course.'), { status: 403 });
};

const computeGrade = (total) => {
  if (total >= 90) return { grade: 'A+', gp: 4.0 };
  if (total >= 80) return { grade: 'A',  gp: 3.7 };
  if (total >= 70) return { grade: 'B+', gp: 3.3 };
  if (total >= 60) return { grade: 'B',  gp: 3.0 };
  if (total >= 50) return { grade: 'C',  gp: 2.0 };
  if (total >= 40) return { grade: 'D',  gp: 1.0 };
  return { grade: 'F', gp: 0.0 };
};

const log = (action, description, req) =>
  Activity.create({
    action, entity: 'faculty', description,
    performedBy: req.user?._id,
    performedByName: req.user?.name || 'Faculty',
    icon: '🧑‍🏫',
  }).catch(() => {});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/faculty/profile
// ─────────────────────────────────────────────────────────────────────────────
const getMyProfile = async (req, res) => {
  try {
    const profile = await resolveProfile(req.user._id);
    if (!profile) return noProfile(res);
    res.json(profile);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/faculty/dashboard  — overview stats + recent activity
// ─────────────────────────────────────────────────────────────────────────────
const getDashboardOverview = async (req, res) => {
  try {
    const profile = await resolveProfile(req.user._id);
    if (!profile) return noProfile(res);

    const courseIds = profile.courses.map(c => c._id);

    // Total unique students across all assigned courses
    const studentProfiles = await StudentProfile.find({ courses: { $in: courseIds } })
      .select('_id name attendancePct gpa')
      .lean();
    const uniqueStudents = [...new Map(studentProfiles.map(s => [s._id.toString(), s])).values()];

    // Pending (ungraded) assignments
    const pendingGrading = await Assignment.countDocuments({
      course: { $in: courseIds },
      'submissions.status': 'submitted',
    });

    // Assignments created by this faculty
    const totalAssignments = await Assignment.countDocuments({ course: { $in: courseIds } });

    // Recent activity
    const recentActivity = await Activity.find({ performedBy: req.user._id })
      .sort({ createdAt: -1 }).limit(8).lean();

    // Low-attendance students (< 75%) across all courses
    const lowAttendance = await SubjectAttendance.aggregate([
      { $match: { course: { $in: courseIds } } },
      {
        $addFields: {
          pct: {
            $cond: [
              { $gt: ['$totalClasses', 0] },
              { $multiply: [{ $divide: ['$attended', '$totalClasses'] }, 100] },
              0,
            ],
          },
        },
      },
      { $match: { pct: { $lt: 75 } } },
      { $count: 'count' },
    ]);

    res.json({
      profile,
      stats: {
        assignedCourses:  courseIds.length,
        totalStudents:    uniqueStudents.length,
        totalAssignments,
        pendingGrading,
        lowAttendanceCount: lowAttendance[0]?.count || 0,
        avgClassGpa: uniqueStudents.length
          ? Math.round((uniqueStudents.reduce((s, x) => s + (x.gpa || 0), 0) / uniqueStudents.length) * 100) / 100
          : 0,
      },
      recentActivity,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/faculty/courses          — assigned courses with enrolled students
// GET /api/faculty/courses/:id/students — students for one course
// ─────────────────────────────────────────────────────────────────────────────
const getMyCourses = async (req, res) => {
  try {
    const profile = await resolveProfile(req.user._id);
    if (!profile) return noProfile(res);

    const courses = await Course.find({ _id: { $in: profile.courses } })
      .populate('department', 'name code')
      .lean();

    // Attach enrolled student count per course
    const enriched = await Promise.all(courses.map(async (c) => {
      const students = await StudentProfile.countDocuments({ courses: c._id });
      return { ...c, enrolledStudents: students };
    }));

    res.json({ courses: enriched });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getCourseStudents = async (req, res) => {
  try {
    const profile = await resolveProfile(req.user._id);
    if (!profile) return noProfile(res);
    assertOwns(profile, req.params.courseId);

    const students = await StudentProfile.find({ courses: req.params.courseId })
      .populate('department', 'name code')
      .select('studentId name email phone semester gpa attendancePct status department')
      .sort({ name: 1 })
      .lean();

    res.json({ students, courseId: req.params.courseId });
  } catch (err) { res.status(err.status || 500).json({ message: err.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET  /api/faculty/attendance/:courseId        — attendance roster for a course
// POST /api/faculty/attendance/:courseId        — mark attendance for a date
// PUT  /api/faculty/attendance/:courseId/:studentId — update one student record
// ─────────────────────────────────────────────────────────────────────────────
const getAttendance = async (req, res) => {
  try {
    const profile = await resolveProfile(req.user._id);
    if (!profile) return noProfile(res);
    assertOwns(profile, req.params.courseId);

    const { date } = req.query; // optional — filter to a specific date

    const records = await SubjectAttendance.find({ course: req.params.courseId })
      .populate('student', 'studentId name email')
      .lean();

    const enriched = records.map(r => {
      const pct = r.totalClasses ? Math.round((r.attended / r.totalClasses) * 100) : 0;
      let dayRecord = null;
      if (date) {
        const d = new Date(date);
        dayRecord = r.records.find(x => new Date(x.date).toDateString() === d.toDateString()) || null;
      }
      return { ...r, percentage: pct, todayRecord: dayRecord };
    });

    res.json({ attendance: enriched, courseId: req.params.courseId });
  } catch (err) { res.status(err.status || 500).json({ message: err.message }); }
};

const markAttendance = async (req, res) => {
  try {
    const profile = await resolveProfile(req.user._id);
    if (!profile) return noProfile(res);
    assertOwns(profile, req.params.courseId);

    const { date, records } = req.body;
    // records: [{ studentId, present, note }]
    if (!date || !Array.isArray(records)) {
      return res.status(400).json({ message: 'date and records[] are required.' });
    }
    const d = new Date(date);

    const course = profile.courses.find(c => c._id.toString() === req.params.courseId);

    const results = await Promise.all(records.map(async ({ studentId, present, note = '' }) => {
      let att = await SubjectAttendance.findOne({ student: studentId, course: req.params.courseId });
      if (!att) {
        const sp = await StudentProfile.findById(studentId).lean();
        att = new SubjectAttendance({
          student: studentId,
          course: req.params.courseId,
          courseName: course?.name || '',
          courseCode: course?.code || '',
          semester: sp?.semester || 1,
        });
      }

      // Check if this date already recorded
      const existing = att.records.findIndex(r => new Date(r.date).toDateString() === d.toDateString());
      if (existing >= 0) {
        const wasPresent = att.records[existing].present;
        att.records[existing] = { date: d, present, note };
        if (wasPresent && !present) att.attended = Math.max(0, att.attended - 1);
        if (!wasPresent && present) att.attended += 1;
      } else {
        att.records.push({ date: d, present, note });
        att.totalClasses += 1;
        if (present) att.attended += 1;
      }
      await att.save();
      return att;
    }));

    await log('ATTENDANCE', `Marked attendance for ${records.length} students on ${d.toDateString()}`, req);
    res.json({ message: 'Attendance saved.', count: results.length });
  } catch (err) { res.status(err.status || 500).json({ message: err.message }); }
};

const updateStudentAttendance = async (req, res) => {
  try {
    const profile = await resolveProfile(req.user._id);
    if (!profile) return noProfile(res);
    assertOwns(profile, req.params.courseId);

    const { date, present, note = '' } = req.body;
    if (!date) return res.status(400).json({ message: 'date is required.' });
    const d = new Date(date);

    const att = await SubjectAttendance.findOne({
      student: req.params.studentId,
      course: req.params.courseId,
    });
    if (!att) return res.status(404).json({ message: 'Attendance record not found.' });

    const idx = att.records.findIndex(r => new Date(r.date).toDateString() === d.toDateString());
    if (idx >= 0) {
      const was = att.records[idx].present;
      att.records[idx] = { date: d, present, note };
      if (was && !present) att.attended = Math.max(0, att.attended - 1);
      if (!was && present) att.attended += 1;
    } else {
      att.records.push({ date: d, present, note });
      att.totalClasses += 1;
      if (present) att.attended += 1;
    }
    await att.save();
    res.json(att);
  } catch (err) { res.status(err.status || 500).json({ message: err.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/faculty/marks/:courseId             — all students' internal marks
// PUT /api/faculty/marks/:courseId/:studentId  — upsert marks for one student
// ─────────────────────────────────────────────────────────────────────────────
const getMarks = async (req, res) => {
  try {
    const profile = await resolveProfile(req.user._id);
    if (!profile) return noProfile(res);
    assertOwns(profile, req.params.courseId);

    const course = await Course.findById(req.params.courseId).lean();
    const students = await StudentProfile.find({ courses: req.params.courseId })
      .select('studentId name email').sort({ name: 1 }).lean();

    const results = await ExamResult.find({
      course: req.params.courseId,
      student: { $in: students.map(s => s._id) },
    }).lean();

    // Zip students with their marks
    const rows = students.map(s => {
      const r = results.find(x => x.student.toString() === s._id.toString());
      return {
        student: s,
        result: r || null,
        internal: r?.internal || { assignment1: 0, assignment2: 0, midterm: 0, quiz: 0, total: 0 },
        grade: r?.grade || '',
        gradePoint: r?.gradePoint || 0,
        isPassed: r?.isPassed ?? true,
      };
    });

    res.json({ rows, course, courseId: req.params.courseId });
  } catch (err) { res.status(err.status || 500).json({ message: err.message }); }
};

const upsertMarks = async (req, res) => {
  try {
    const profile = await resolveProfile(req.user._id);
    if (!profile) return noProfile(res);
    assertOwns(profile, req.params.courseId);

    const { assignment1 = 0, assignment2 = 0, midterm = 0, quiz = 0, remarks = '' } = req.body;
    const total = Number(assignment1) + Number(assignment2) + Number(midterm) + Number(quiz);
    const { grade, gp } = computeGrade(total);

    const course = await Course.findById(req.params.courseId).lean();
    const sp = await StudentProfile.findById(req.params.studentId).lean();
    if (!sp) return res.status(404).json({ message: 'Student not found.' });

    const update = {
      student: req.params.studentId,
      course:  req.params.courseId,
      courseName: course?.name || '',
      courseCode: course?.code || '',
      semester: sp.semester || 1,
      internal: { assignment1: +assignment1, assignment2: +assignment2, midterm: +midterm, quiz: +quiz, total },
      grade, gradePoint: gp,
      isPassed: grade !== 'F',
      remarks,
    };

    const result = await ExamResult.findOneAndUpdate(
      { student: req.params.studentId, course: req.params.courseId },
      { $set: update },
      { upsert: true, new: true, runValidators: true }
    );

    // Update student's overall GPA (simple average of all results)
    const allResults = await ExamResult.find({ student: req.params.studentId }).lean();
    if (allResults.length) {
      const avgGpa = allResults.reduce((s, r) => s + (r.gradePoint || 0), 0) / allResults.length;
      await StudentProfile.findByIdAndUpdate(req.params.studentId, { gpa: Math.round(avgGpa * 100) / 100 });
    }

    await log('MARKS', `Updated marks for student in ${course?.name}`, req);
    res.json(result);
  } catch (err) { res.status(err.status || 500).json({ message: err.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET    /api/faculty/assignments/:courseId       — list assignments for course
// POST   /api/faculty/assignments/:courseId       — create assignment
// PUT    /api/faculty/assignments/:courseId/:id   — edit assignment
// DELETE /api/faculty/assignments/:courseId/:id   — delete assignment
// PUT    /api/faculty/assignments/:courseId/:id/grade/:subId — grade a submission
// ─────────────────────────────────────────────────────────────────────────────
const getAssignments = async (req, res) => {
  try {
    const profile = await resolveProfile(req.user._id);
    if (!profile) return noProfile(res);
    assertOwns(profile, req.params.courseId);

    const assignments = await Assignment.find({ course: req.params.courseId })
      .sort({ dueDate: 1 }).lean();

    // Enrich each with submission counts
    const enriched = assignments.map(a => ({
      ...a,
      submittedCount: a.submissions.filter(s => ['submitted','late','graded'].includes(s.status)).length,
      gradedCount:    a.submissions.filter(s => s.status === 'graded').length,
      totalStudents:  a.submissions.length,
    }));

    res.json({ assignments: enriched });
  } catch (err) { res.status(err.status || 500).json({ message: err.message }); }
};

const createAssignment = async (req, res) => {
  try {
    const profile = await resolveProfile(req.user._id);
    if (!profile) return noProfile(res);
    assertOwns(profile, req.params.courseId);

    const course = await Course.findById(req.params.courseId).lean();
    const students = await StudentProfile.find({ courses: req.params.courseId }).select('_id').lean();

    const assignment = await Assignment.create({
      ...req.body,
      course: req.params.courseId,
      courseName: course?.name || '',
      courseCode: course?.code || '',
      instructor: profile.name,
      department: profile.department,
      semester: course?.semester || 1,
      submissions: students.map(s => ({ student: s._id, status: 'pending' })),
    });

    await log('CREATE', `Created assignment "${assignment.title}" for ${course?.name}`, req);
    res.status(201).json(assignment);
  } catch (err) { res.status(err.status || 500).json({ message: err.message }); }
};

const updateAssignment = async (req, res) => {
  try {
    const profile = await resolveProfile(req.user._id);
    if (!profile) return noProfile(res);
    assertOwns(profile, req.params.courseId);

    const a = await Assignment.findOneAndUpdate(
      { _id: req.params.id, course: req.params.courseId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!a) return res.status(404).json({ message: 'Assignment not found.' });
    await log('UPDATE', `Updated assignment "${a.title}"`, req);
    res.json(a);
  } catch (err) { res.status(err.status || 500).json({ message: err.message }); }
};

const deleteAssignment = async (req, res) => {
  try {
    const profile = await resolveProfile(req.user._id);
    if (!profile) return noProfile(res);
    assertOwns(profile, req.params.courseId);

    const a = await Assignment.findOneAndDelete({ _id: req.params.id, course: req.params.courseId });
    if (!a) return res.status(404).json({ message: 'Assignment not found.' });
    await log('DELETE', `Deleted assignment "${a.title}"`, req);
    res.json({ message: 'Assignment deleted.' });
  } catch (err) { res.status(err.status || 500).json({ message: err.message }); }
};

const gradeSubmission = async (req, res) => {
  try {
    const profile = await resolveProfile(req.user._id);
    if (!profile) return noProfile(res);
    assertOwns(profile, req.params.courseId);

    const { marks, feedback } = req.body;
    const a = await Assignment.findOne({ _id: req.params.id, course: req.params.courseId });
    if (!a) return res.status(404).json({ message: 'Assignment not found.' });

    const sub = a.submissions.id(req.params.subId);
    if (!sub) return res.status(404).json({ message: 'Submission not found.' });

    sub.marks    = marks;
    sub.feedback = feedback || '';
    sub.status   = 'graded';
    await a.save();
    res.json(sub);
  } catch (err) { res.status(err.status || 500).json({ message: err.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/faculty/performance/:courseId — class performance analytics
// ─────────────────────────────────────────────────────────────────────────────
const getCoursePerformance = async (req, res) => {
  try {
    const profile = await resolveProfile(req.user._id);
    if (!profile) return noProfile(res);
    assertOwns(profile, req.params.courseId);

    const students = await StudentProfile.find({ courses: req.params.courseId })
      .select('studentId name gpa attendancePct').lean();

    const results = await ExamResult.find({ course: req.params.courseId }).lean();
    const attendance = await SubjectAttendance.find({ course: req.params.courseId }).lean();

    // Grade distribution
    const gradeDist = { 'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 };
    results.forEach(r => { if (r.grade && gradeDist[r.grade] !== undefined) gradeDist[r.grade]++; });

    // Attendance distribution buckets
    const attBuckets = [0, 0, 0, 0]; // <60, 60-74, 75-84, 85+
    attendance.forEach(a => {
      const p = a.totalClasses ? Math.round((a.attended / a.totalClasses) * 100) : 0;
      if (p < 60) attBuckets[0]++;
      else if (p < 75) attBuckets[1]++;
      else if (p < 85) attBuckets[2]++;
      else attBuckets[3]++;
    });

    // Top performers (by internal total)
    const topPerformers = results
      .sort((a, b) => (b.internal?.total || 0) - (a.internal?.total || 0))
      .slice(0, 5)
      .map(r => {
        const s = students.find(x => x._id.toString() === r.student.toString());
        return { name: s?.name || 'Unknown', studentId: s?.studentId || '', total: r.internal?.total || 0, grade: r.grade };
      });

    // Per-student merged rows for the table
    const rows = students.map(s => {
      const r   = results.find(x => x.student.toString() === s._id.toString());
      const att = attendance.find(x => x.student.toString() === s._id.toString());
      const pct = att?.totalClasses ? Math.round((att.attended / att.totalClasses) * 100) : 0;
      return {
        studentId:   s.studentId,
        name:        s.name,
        internalTotal: r?.internal?.total || 0,
        grade:       r?.grade || '—',
        isPassed:    r?.isPassed ?? true,
        attendancePct: pct,
      };
    }).sort((a, b) => b.internalTotal - a.internalTotal);

    res.json({
      students: rows,
      gradeDist: Object.entries(gradeDist).map(([g, v]) => ({ grade: g, count: v })),
      attDist: [
        { label: '<60%',   count: attBuckets[0] },
        { label: '60–74%', count: attBuckets[1] },
        { label: '75–84%', count: attBuckets[2] },
        { label: '85%+',   count: attBuckets[3] },
      ],
      topPerformers,
      summary: {
        totalStudents: students.length,
        passCount:     results.filter(r => r.isPassed).length,
        failCount:     results.filter(r => !r.isPassed).length,
        avgInternal:   results.length
          ? Math.round(results.reduce((s, r) => s + (r.internal?.total || 0), 0) / results.length)
          : 0,
      },
    });
  } catch (err) { res.status(err.status || 500).json({ message: err.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET    /api/faculty/announcements            — own announcements
// POST   /api/faculty/announcements            — create
// PUT    /api/faculty/announcements/:id        — update
// DELETE /api/faculty/announcements/:id        — delete
// ─────────────────────────────────────────────────────────────────────────────
const getAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find({ author: req.user._id })
      .sort({ createdAt: -1 }).lean();
    res.json({ announcements });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const createAnnouncement = async (req, res) => {
  try {
    const ann = await Announcement.create({
      ...req.body,
      author: req.user._id,
      authorName: req.user.name,
    });
    await log('CREATE', `Posted announcement: "${ann.title}"`, req);
    res.status(201).json(ann);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const updateAnnouncement = async (req, res) => {
  try {
    const ann = await Announcement.findOneAndUpdate(
      { _id: req.params.id, author: req.user._id },
      req.body, { new: true, runValidators: true }
    );
    if (!ann) return res.status(404).json({ message: 'Announcement not found or not yours.' });
    res.json(ann);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const deleteAnnouncement = async (req, res) => {
  try {
    const ann = await Announcement.findOneAndDelete({ _id: req.params.id, author: req.user._id });
    if (!ann) return res.status(404).json({ message: 'Announcement not found or not yours.' });
    await log('DELETE', `Deleted announcement: "${ann.title}"`, req);
    res.json({ message: 'Deleted.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = {
  getMyProfile,
  getDashboardOverview,
  getMyCourses,
  getCourseStudents,
  getAttendance,
  markAttendance,
  updateStudentAttendance,
  getMarks,
  upsertMarks,
  getAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  gradeSubmission,
  getCoursePerformance,
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
};
