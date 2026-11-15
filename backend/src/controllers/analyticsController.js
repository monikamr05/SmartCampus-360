/**
 * Analytics Controller
 *
 * All "predictions" are clearly labelled as statistical estimates, not guarantees.
 *
 * ATTENDANCE SHORTAGE PREDICTION FORMULA
 * ───────────────────────────────────────
 * Given:
 *   attended      = classes attended so far
 *   totalClasses  = total classes held so far
 *   remaining     = estimated remaining classes in the semester
 *   threshold     = 0.75 (minimum required attendance fraction)
 *
 * To determine whether shortage is avoidable:
 *   Future total = totalClasses + remaining
 *   Min required attended = ceil(threshold × future_total)
 *   Still needed = max(0, min_required - attended)
 *   Shortfall    = max(0, still_needed - remaining)   ← classes needed but impossible to attend
 *
 * "classesNeededToReach75" = max(0, ceil((threshold × future_total) - attended))
 *   If that value > remaining → shortage cannot be avoided even with 100% future attendance
 *   We call this "critical" (canReachThreshold = false)
 *
 * ACADEMIC AT-RISK IDENTIFICATION
 * ─────────────────────────────────
 * A student is flagged "at risk" if their internal total is below 50 % (< 55/110)
 * or if their attendance in any subject is below 60 % (double-shortage territory).
 * These are configurable via query params for flexibility.
 */

const SubjectAttendance = require('../models/SubjectAttendance');
const ExamResult        = require('../models/ExamResult');
const StudentProfile    = require('../models/StudentProfile');
const FacultyProfile    = require('../models/FacultyProfile');
const Course            = require('../models/Course');
const Department        = require('../models/Department');

/* ── Maths helpers ─────────────────────────────────────────────────────────── */

/**
 * Predict attendance outcome given remaining classes.
 * Returns a plain object safe to serialise to JSON.
 */
const predictAttendance = (attended, totalClasses, remaining = 0, threshold = 0.75) => {
  const currentPct = totalClasses > 0
    ? Math.round((attended / totalClasses) * 100 * 10) / 10
    : 0;

  const futureTotalClasses = totalClasses + remaining;
  const minRequired        = futureTotalClasses > 0
    ? Math.ceil(threshold * futureTotalClasses)
    : 0;
  const classesNeededMore  = Math.max(0, minRequired - attended);
  const canReach           = classesNeededMore <= remaining;

  // If student attends ALL remaining classes what % would they achieve?
  const bestCasePct = futureTotalClasses > 0
    ? Math.round(((attended + remaining) / futureTotalClasses) * 100 * 10) / 10
    : currentPct;

  // If student misses ALL remaining classes
  const worstCasePct = futureTotalClasses > 0
    ? Math.round((attended / futureTotalClasses) * 100 * 10) / 10
    : currentPct;

  // How many consecutive absences before dropping below threshold (from current state)?
  let consecutiveAbsencesBeforeShortage = 0;
  if (currentPct >= threshold * 100) {
    let a = attended, t = totalClasses;
    while (true) {
      t += 1; // absent class
      const pct = a / t;
      if (pct < threshold) break;
      consecutiveAbsencesBeforeShortage++;
      if (consecutiveAbsencesBeforeShortage > 100) break; // safety
    }
  }

  return {
    currentPct,
    attended,
    totalClasses,
    remaining,
    futureTotalClasses,
    minRequired,
    classesNeededMore,
    canReach,
    bestCasePct,
    worstCasePct,
    consecutiveAbsencesBeforeShortage,
    isShortage: currentPct < threshold * 100,
    isCritical: !canReach && currentPct < threshold * 100,
  };
};

/* ════════════════════════════════════════════════════════════════════════════
   ADMIN ANALYTICS
   ════════════════════════════════════════════════════════════════════════════ */

/**
 * GET /api/analytics/admin/attendance
 * Attendance analytics across all courses with shortage predictions.
 * Query params:
 *   departmentId, courseId, remaining (default 20), threshold (default 75)
 */
const adminAttendanceAnalytics = async (req, res) => {
  try {
    const {
      departmentId,
      courseId,
      remaining  = 20,
      threshold  = 75,
    } = req.query;

    const thr = Number(threshold) / 100;
    const rem = Number(remaining);

    /* ── Courses to analyse ── */
    const courseFilter = { isActive: true };
    if (departmentId) courseFilter.department = departmentId;
    if (courseId)     courseFilter._id        = courseId;

    const courses = await Course.find(courseFilter)
      .populate('department', 'name code')
      .sort({ name: 1 })
      .lean();

    /* ── Per-course aggregation ── */
    const courseStats = await Promise.all(courses.map(async (c) => {
      const records = await SubjectAttendance.find({ course: c._id })
        .populate('student', 'studentId name email')
        .lean();

      if (!records.length) return { course: c, students: [], summary: null };

      const students = records.map(r => {
        const pred = predictAttendance(r.attended, r.totalClasses, rem, thr);
        return {
          _id:        r.student?._id,
          studentId:  r.student?.studentId,
          name:       r.student?.name,
          email:      r.student?.email,
          attended:   r.attended,
          total:      r.totalClasses,
          ...pred,
        };
      }).sort((a, b) => a.currentPct - b.currentPct);

      // Buckets for chart
      const buckets = [
        { label: '<60%',  count: 0 },
        { label: '60–74%',count: 0 },
        { label: '75–84%',count: 0 },
        { label: '85%+',  count: 0 },
      ];
      students.forEach(s => {
        if (s.currentPct < 60)       buckets[0].count++;
        else if (s.currentPct < 75)  buckets[1].count++;
        else if (s.currentPct < 85)  buckets[2].count++;
        else                         buckets[3].count++;
      });

      const totalStudents  = students.length;
      const shortageCount  = students.filter(s => s.isShortage).length;
      const criticalCount  = students.filter(s => s.isCritical).length;
      const avgPct         = Math.round(students.reduce((s, x) => s + x.currentPct, 0) / totalStudents * 10) / 10;

      return {
        course:  c,
        students,
        summary: { totalStudents, shortageCount, criticalCount, avgPct, buckets },
      };
    }));

    /* ── Institute-wide distribution (all courses combined) ── */
    const allRecords = await SubjectAttendance.find({}).lean();
    const instituteBuckets = [
      { label: '<60%',  count: 0 },
      { label: '60–74%',count: 0 },
      { label: '75–84%',count: 0 },
      { label: '85%+',  count: 0 },
    ];
    allRecords.forEach(r => {
      const p = r.totalClasses ? (r.attended / r.totalClasses) * 100 : 0;
      if (p < 60)      instituteBuckets[0].count++;
      else if (p < 75) instituteBuckets[1].count++;
      else if (p < 85) instituteBuckets[2].count++;
      else             instituteBuckets[3].count++;
    });

    // All students in shortage (deduplicated by student ID)
    const allShortage = [];
    const seen = new Set();
    courseStats.forEach(cs => {
      cs.students.forEach(s => {
        if (s.isShortage && !seen.has(String(s._id))) {
          seen.add(String(s._id));
          allShortage.push({ ...s, courseName: cs.course.name, courseCode: cs.course.code });
        }
      });
    });

    res.json({
      courseStats: courseStats.filter(cs => cs.summary),
      instituteBuckets,
      allShortageStudents: allShortage.sort((a, b) => a.currentPct - b.currentPct),
      predictionParams: {
        remainingClasses: rem,
        thresholdPct:     Number(threshold),
        disclaimer: 'Predictions are statistical estimates based on current attendance rate. Actual outcomes depend on future attendance and are not guaranteed.',
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/analytics/admin/academic
 * Academic performance analytics across all courses.
 * Returns grade distributions, averages, subject-wise comparisons, at-risk students.
 */
const adminAcademicAnalytics = async (req, res) => {
  try {
    const { departmentId, courseId, atRiskThreshold = 50 } = req.query;
    const riskMark = Number(atRiskThreshold); // internal total below this → at risk

    const courseFilter = { isActive: true };
    if (departmentId) courseFilter.department = departmentId;
    if (courseId)     courseFilter._id        = courseId;

    const courses = await Course.find(courseFilter)
      .populate('department', 'name code')
      .sort({ name: 1 })
      .lean();

    /* ── Per-course exam stats ── */
    const GRADE_ORDER = ['A+', 'A', 'B+', 'B', 'C', 'D', 'F'];
    const courseStats = await Promise.all(courses.map(async (c) => {
      const results = await ExamResult.find({ course: c._id })
        .populate('student', 'studentId name email')
        .lean();

      if (!results.length) return { course: c, results: [], summary: null };

      const gradeDist = GRADE_ORDER.reduce((a, g) => { a[g] = 0; return a; }, {});
      results.forEach(r => { if (r.grade && gradeDist[r.grade] !== undefined) gradeDist[r.grade]++; });

      const totals     = results.map(r => r.internal?.total || 0);
      const avg        = Math.round(totals.reduce((s, v) => s + v, 0) / totals.length * 10) / 10;
      const highest    = Math.max(...totals);
      const lowest     = Math.min(...totals);
      const passCount  = results.filter(r => r.isPassed).length;
      const passRate   = Math.round((passCount / results.length) * 100);

      const atRisk = results
        .filter(r => (r.internal?.total || 0) < riskMark)
        .map(r => ({
          studentId:     r.student?.studentId,
          name:          r.student?.name,
          internalTotal: r.internal?.total || 0,
          grade:         r.grade || '—',
          isPassed:      r.isPassed,
        }))
        .sort((a, b) => a.internalTotal - b.internalTotal);

      return {
        course: c,
        results: results.map(r => ({
          studentId:     r.student?.studentId,
          name:          r.student?.name,
          internalTotal: r.internal?.total || 0,
          grade:         r.grade || '—',
          gradePoint:    r.gradePoint,
          isPassed:      r.isPassed,
          assignment1:   r.internal?.assignment1 || 0,
          assignment2:   r.internal?.assignment2 || 0,
          midterm:       r.internal?.midterm || 0,
          quiz:          r.internal?.quiz || 0,
          externalMarks: r.external?.marksObtained || 0,
        })),
        gradeDist: GRADE_ORDER.map(g => ({ grade: g, count: gradeDist[g] })),
        summary: { avg, highest, lowest, passCount, passRate, totalStudents: results.length, atRiskCount: atRisk.length },
        atRisk,
      };
    }));

    /* ── Subject-wise average comparison (bar chart data) ── */
    const subjectComparison = courseStats
      .filter(cs => cs.summary)
      .map(cs => ({
        name:      cs.course.code,
        fullName:  cs.course.name,
        avg:       cs.summary.avg,
        passRate:  cs.summary.passRate,
        students:  cs.summary.totalStudents,
      }))
      .sort((a, b) => b.avg - a.avg);

    /* ── All at-risk students (deduplicated) ── */
    const allAtRisk = [];
    const seenAR    = new Set();
    courseStats.forEach(cs => {
      if (!cs.summary) return;
      cs.atRisk.forEach(s => {
        const key = `${s.studentId}-${cs.course._id}`;
        if (!seenAR.has(key)) {
          seenAR.add(key);
          allAtRisk.push({ ...s, courseName: cs.course.name, courseCode: cs.course.code });
        }
      });
    });

    /* ── Institute-wide grade distribution ── */
    const allResults = await ExamResult.find({}).lean();
    const instituteGradeDist = GRADE_ORDER.reduce((a, g) => { a[g] = 0; return a; }, {});
    allResults.forEach(r => { if (r.grade && instituteGradeDist[r.grade] !== undefined) instituteGradeDist[r.grade]++; });
    const instituteGradeChart = GRADE_ORDER.map(g => ({ grade: g, count: instituteGradeDist[g] }));

    // Department-level average (for department comparison)
    const deptAverages = {};
    courseStats.forEach(cs => {
      if (!cs.summary) return;
      const deptName = cs.course.department?.name || 'Unknown';
      if (!deptAverages[deptName]) deptAverages[deptName] = { total: 0, count: 0 };
      deptAverages[deptName].total += cs.summary.avg;
      deptAverages[deptName].count++;
    });
    const deptComparison = Object.entries(deptAverages).map(([name, v]) => ({
      name,
      avg: Math.round((v.total / v.count) * 10) / 10,
    })).sort((a, b) => b.avg - a.avg);

    res.json({
      courseStats: courseStats.filter(cs => cs.summary),
      subjectComparison,
      instituteGradeChart,
      deptComparison,
      allAtRiskStudents: allAtRisk.sort((a, b) => a.internalTotal - b.internalTotal),
      atRiskThreshold: riskMark,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ════════════════════════════════════════════════════════════════════════════
   STUDENT ANALYTICS  (personal, scoped to req.user)
   ════════════════════════════════════════════════════════════════════════════ */

/**
 * GET /api/analytics/student
 * Returns personal attendance predictions + academic performance for the logged-in student.
 */
const studentAnalytics = async (req, res) => {
  try {
    const { remaining = 20, threshold = 75 } = req.query;
    const thr = Number(threshold) / 100;
    const rem = Number(remaining);

    const profile = await StudentProfile.findOne({ user: req.user._id })
      .populate('department', 'name code')
      .lean();
    if (!profile) return res.status(404).json({ message: 'Student profile not found.' });

    /* ── Attendance per subject ── */
    const attRecords = await SubjectAttendance.find({ student: profile._id })
      .populate('course', 'name code')
      .lean();

    const attendanceData = attRecords.map(r => {
      const pred = predictAttendance(r.attended, r.totalClasses, rem, thr);
      return {
        courseId:   r.course?._id,
        courseName: r.courseName || r.course?.name || 'Unknown',
        courseCode: r.courseCode || r.course?.code || '',
        semester:   r.semester,
        ...pred,
      };
    }).sort((a, b) => a.currentPct - b.currentPct);

    // Trend: attendance % over last 10 recorded dates across all subjects
    const allDates = new Map();
    attRecords.forEach(r => {
      (r.records || []).forEach(rec => {
        const dateKey = new Date(rec.date).toISOString().slice(0, 10);
        if (!allDates.has(dateKey)) allDates.set(dateKey, { present: 0, total: 0 });
        const entry = allDates.get(dateKey);
        entry.total++;
        if (rec.present) entry.present++;
      });
    });
    const attendanceTrend = [...allDates.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-20)
      .map(([date, v]) => ({
        date,
        pct: v.total ? Math.round((v.present / v.total) * 100) : 0,
        present: v.present,
        total:   v.total,
      }));

    /* ── Academic performance per subject ── */
    const examResults = await ExamResult.find({ student: profile._id })
      .populate('course', 'name code')
      .lean();

    const GRADE_COLORS = { 'A+':'#15803d','A':'#059669','B+':'#1d4ed8','B':'#2563eb','C':'#d97706','D':'#c2410c','F':'#dc2626' };
    const academicData = examResults.map(r => ({
      courseId:    r.course?._id,
      courseName:  r.courseName || r.course?.name || 'Unknown',
      courseCode:  r.courseCode || r.course?.code || '',
      semester:    r.semester,
      assignment1: r.internal?.assignment1 || 0,
      assignment2: r.internal?.assignment2 || 0,
      midterm:     r.internal?.midterm || 0,
      quiz:        r.internal?.quiz || 0,
      total:       r.internal?.total || 0,
      external:    r.external?.marksObtained || 0,
      grade:       r.grade || '—',
      gradePoint:  r.gradePoint || 0,
      isPassed:    r.isPassed ?? null,
      color:       GRADE_COLORS[r.grade] || '#94a3b8',
    })).sort((a, b) => a.semester - b.semester || a.courseName.localeCompare(b.courseName));

    // Radar data: each axis is a component average
    const radarData = academicData.map(r => ({
      subject:    r.courseCode || r.courseName.slice(0, 8),
      Assignment: r.assignment1 + r.assignment2,
      Midterm:    r.midterm,
      Quiz:       r.quiz,
      External:   r.external,
    }));

    // Semester-wise GPA trend
    const semGpa = {};
    examResults.forEach(r => {
      const s = r.semester;
      if (!semGpa[s]) semGpa[s] = { total: 0, count: 0 };
      semGpa[s].total += r.gradePoint || 0;
      semGpa[s].count++;
    });
    const gpaTrend = Object.entries(semGpa)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([sem, v]) => ({
        semester: `Sem ${sem}`,
        gpa: Math.round((v.total / v.count) * 100) / 100,
      }));

    // Identify weak subjects
    const weakSubjects = academicData.filter(r => (r.total < 55) || r.grade === 'F' || r.grade === 'D');
    const needsSupport  = weakSubjects.length > 0;

    res.json({
      profile: { name: profile.name, studentId: profile.studentId, department: profile.department?.name, semester: profile.semester, gpa: profile.gpa },
      attendanceData,
      attendanceTrend,
      academicData,
      radarData,
      gpaTrend,
      weakSubjects,
      needsSupport,
      shortageSubjects: attendanceData.filter(a => a.isShortage),
      predictionParams: {
        remainingClasses: rem,
        thresholdPct:     Number(threshold),
        disclaimer: 'Attendance predictions are estimates based on current data and assume no changes to the class schedule. These are not guaranteed outcomes.',
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ════════════════════════════════════════════════════════════════════════════
   FACULTY ANALYTICS  (scoped to faculty's assigned courses)
   ════════════════════════════════════════════════════════════════════════════ */

/**
 * GET /api/analytics/faculty
 * Returns attendance risk + academic performance for courses assigned to the logged-in faculty.
 */
const facultyAnalytics = async (req, res) => {
  try {
    const { remaining = 20, threshold = 75, atRiskThreshold = 50 } = req.query;
    const thr     = Number(threshold) / 100;
    const rem     = Number(remaining);
    const riskMark = Number(atRiskThreshold);

    const faculty = await FacultyProfile.findOne({ user: req.user._id })
      .populate('courses', 'name code semester')
      .lean();
    if (!faculty) return res.status(404).json({ message: 'Faculty profile not found.' });

    const courseIds = (faculty.courses || []).map(c => c._id);
    if (!courseIds.length) {
      return res.json({ courses: [], predictionParams: { remainingClasses: rem, thresholdPct: Number(threshold), disclaimer: '' } });
    }

    const courses = await Course.find({ _id: { $in: courseIds } })
      .populate('department', 'name code')
      .lean();

    const GRADE_ORDER = ['A+', 'A', 'B+', 'B', 'C', 'D', 'F'];

    const courseAnalytics = await Promise.all(courses.map(async (c) => {
      /* Attendance */
      const attRecords = await SubjectAttendance.find({ course: c._id })
        .populate('student', 'studentId name')
        .lean();

      const attStudents = attRecords.map(r => {
        const pred = predictAttendance(r.attended, r.totalClasses, rem, thr);
        return { studentId: r.student?.studentId, name: r.student?.name, ...pred };
      });

      const attBuckets = [
        { label: '<60%',  count: 0, color: '#dc2626' },
        { label: '60–74%',count: 0, color: '#d97706' },
        { label: '75–84%',count: 0, color: '#2563eb' },
        { label: '85%+',  count: 0, color: '#059669' },
      ];
      attStudents.forEach(s => {
        if (s.currentPct < 60)      attBuckets[0].count++;
        else if (s.currentPct < 75) attBuckets[1].count++;
        else if (s.currentPct < 85) attBuckets[2].count++;
        else                        attBuckets[3].count++;
      });

      const attRiskStudents = attStudents.filter(s => s.isShortage).sort((a, b) => a.currentPct - b.currentPct);
      const attCritical     = attStudents.filter(s => s.isCritical);

      /* Academic */
      const examResults = await ExamResult.find({ course: c._id })
        .populate('student', 'studentId name')
        .lean();

      const gradeDist = GRADE_ORDER.reduce((a, g) => { a[g] = 0; return a; }, {});
      examResults.forEach(r => { if (r.grade && gradeDist[r.grade] !== undefined) gradeDist[r.grade]++; });

      const internalTotals = examResults.map(r => r.internal?.total || 0);
      const avgInternal    = internalTotals.length
        ? Math.round(internalTotals.reduce((s, v) => s + v, 0) / internalTotals.length * 10) / 10
        : 0;
      const passRate       = examResults.length
        ? Math.round((examResults.filter(r => r.isPassed).length / examResults.length) * 100)
        : 0;

      const academicRisk = examResults
        .filter(r => (r.internal?.total || 0) < riskMark)
        .map(r => ({
          studentId:     r.student?.studentId,
          name:          r.student?.name,
          internalTotal: r.internal?.total || 0,
          grade:         r.grade || '—',
        }))
        .sort((a, b) => a.internalTotal - b.internalTotal);

      // Top performers
      const topPerformers = examResults
        .sort((a, b) => (b.internal?.total || 0) - (a.internal?.total || 0))
        .slice(0, 5)
        .map(r => ({
          studentId:     r.student?.studentId,
          name:          r.student?.name,
          internalTotal: r.internal?.total || 0,
          grade:         r.grade || '—',
        }));

      return {
        course:         c,
        attendance: {
          buckets:      attBuckets,
          riskStudents: attRiskStudents,
          criticalCount:attCritical.length,
          totalStudents:attStudents.length,
          avgPct:       attStudents.length
            ? Math.round(attStudents.reduce((s, x) => s + x.currentPct, 0) / attStudents.length * 10) / 10
            : 0,
        },
        academic: {
          gradeDist:    GRADE_ORDER.map(g => ({ grade: g, count: gradeDist[g] })),
          avgInternal,
          passRate,
          atRisk:       academicRisk,
          topPerformers,
          totalStudents:examResults.length,
        },
      };
    }));

    res.json({
      faculty: { name: faculty.name, facultyId: faculty.facultyId, department: faculty.department },
      courseAnalytics,
      predictionParams: {
        remainingClasses: rem,
        thresholdPct:     Number(threshold),
        disclaimer: 'Attendance predictions are estimates only. Actual results depend on future class attendance and schedule changes.',
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  adminAttendanceAnalytics,
  adminAcademicAnalytics,
  studentAnalytics,
  facultyAnalytics,
};
