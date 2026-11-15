/**
 * Student Dashboard Controller
 * All handlers derive the student from req.user (the JWT-authenticated User document).
 * They look up the StudentProfile whose .user field matches req.user._id.
 */

const StudentProfile   = require('../models/StudentProfile');
const SubjectAttendance = require('../models/SubjectAttendance');
const ExamResult       = require('../models/ExamResult');
const Assignment       = require('../models/Assignment');
const Timetable        = require('../models/Timetable');
const Event            = require('../models/Event');
const Announcement     = require('../models/Announcement');

// ─── Helper: resolve StudentProfile for the logged-in user ───────────────────
const resolveProfile = async (userId) => {
  const profile = await StudentProfile.findOne({ user: userId })
    .populate('department', 'name code')
    .populate('courses', 'name code credits instructor semester');
  return profile;
};

// ─── Helper: build a "not set up" response ───────────────────────────────────
const noProfile = (res) =>
  res.status(404).json({
    message: 'Student profile not found. Please contact your administrator.',
  });

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/student/profile
// Returns the full StudentProfile for the logged-in user
// ─────────────────────────────────────────────────────────────────────────────
const getMyProfile = async (req, res) => {
  try {
    const profile = await resolveProfile(req.user._id);
    if (!profile) return noProfile(res);
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/student/dashboard
// Returns everything the Overview page needs in one request
// ─────────────────────────────────────────────────────────────────────────────
const getDashboardOverview = async (req, res) => {
  try {
    const profile = await resolveProfile(req.user._id);
    if (!profile) return noProfile(res);

    // Subject attendance for current semester
    const subjectAttendance = await SubjectAttendance.find({
      student: profile._id,
      semester: profile.semester,
    }).lean();

    // Attendance shortage subjects (< 75 %)
    const shortageSubjects = subjectAttendance
      .map((sa) => ({
        courseName: sa.courseName,
        courseCode: sa.courseCode,
        percentage: sa.totalClasses
          ? Math.round((sa.attended / sa.totalClasses) * 100)
          : 0,
        attended:     sa.attended,
        totalClasses: sa.totalClasses,
      }))
      .filter((s) => s.percentage < 75);

    // Pending assignments for the student
    const pendingAssignments = await Assignment.find({
      semester:   profile.semester,
      department: profile.department,
      dueDate:    { $gte: new Date() },
      'submissions.student': { $ne: profile._id },
    })
      .select('title courseName dueDate type')
      .sort({ dueDate: 1 })
      .limit(5)
      .lean();

    // Latest exam results (most recent semester)
    const latestResults = await ExamResult.find({ student: profile._id })
      .sort({ semester: -1, createdAt: -1 })
      .limit(5)
      .select('courseName courseCode grade gradePoint isPassed semester')
      .lean();

    // Upcoming events (next 30 days)
    const upcoming = new Date();
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);

    const upcomingEvents = await Event.find({
      isActive:  true,
      startDate: { $gte: upcoming, $lte: thirtyDays },
      $or: [
        { audience: 'all' },
        { audience: 'students' },
        { audience: 'department', department: profile.department },
      ],
    })
      .sort({ startDate: 1 })
      .limit(5)
      .select('title category startDate startTime venue')
      .lean();

    // Active announcements
    const announcements = await Announcement.find({
      isActive: true,
      $or: [{ audience: 'all' }, { audience: 'students' }],
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title content priority authorName createdAt')
      .lean();

    res.json({
      profile,
      stats: {
        overallAttendance: profile.attendancePct,
        gpa:               profile.gpa,
        totalCourses:      profile.courses?.length || 0,
        semester:          profile.semester,
      },
      shortageSubjects,
      pendingAssignments,
      latestResults,
      upcomingEvents,
      announcements,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/student/attendance
// Full subject-wise attendance for the student's current semester
// ─────────────────────────────────────────────────────────────────────────────
const getAttendance = async (req, res) => {
  try {
    const profile = await resolveProfile(req.user._id);
    if (!profile) return noProfile(res);

    const { semester = profile.semester } = req.query;

    const records = await SubjectAttendance.find({
      student:  profile._id,
      semester: Number(semester),
    })
      .populate('course', 'name code instructor')
      .lean();

    const subjects = records.map((r) => ({
      _id:          r._id,
      courseId:     r.course?._id,
      courseName:   r.courseName || r.course?.name,
      courseCode:   r.courseCode || r.course?.code,
      instructor:   r.course?.instructor || '',
      totalClasses: r.totalClasses,
      attended:     r.attended,
      absent:       r.totalClasses - r.attended,
      percentage:   r.totalClasses
        ? Math.round((r.attended / r.totalClasses) * 100)
        : 0,
      records: (r.records || [])
        .slice(-10)              // last 10 entries
        .sort((a, b) => new Date(b.date) - new Date(a.date)),
    }));

    // Overall (re-compute from raw counts)
    const totalClasses = subjects.reduce((s, x) => s + x.totalClasses, 0);
    const totalAttended = subjects.reduce((s, x) => s + x.attended, 0);
    const overall = totalClasses
      ? Math.round((totalAttended / totalClasses) * 100)
      : profile.attendancePct;

    // Shortage subjects
    const shortage = subjects.filter((s) => s.percentage < 75);

    res.json({ subjects, overall, shortage, semester: Number(semester) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/student/results
// Exam results (all semesters or filtered)
// ─────────────────────────────────────────────────────────────────────────────
const getResults = async (req, res) => {
  try {
    const profile = await resolveProfile(req.user._id);
    if (!profile) return noProfile(res);

    const { semester } = req.query;
    const filter = { student: profile._id };
    if (semester) filter.semester = Number(semester);

    const results = await ExamResult.find(filter)
      .sort({ semester: 1, courseName: 1 })
      .lean();

    // Group by semester
    const bySemester = {};
    results.forEach((r) => {
      const key = r.semester;
      if (!bySemester[key]) bySemester[key] = [];
      bySemester[key].push({
        ...r,
        percentage: r.external.maxMarks
          ? Math.round(
              ((r.internal.total + r.external.marksObtained) /
                (100 + r.external.maxMarks)) *
                100
            )
          : 0,
      });
    });

    // Compute semester GPA for each group
    const semesterSummaries = Object.keys(bySemester)
      .sort((a, b) => Number(a) - Number(b))
      .map((sem) => {
        const rows = bySemester[sem];
        const sgpa =
          rows.reduce((s, r) => s + r.gradePoint, 0) / (rows.length || 1);
        return {
          semester: Number(sem),
          sgpa:     Math.round(sgpa * 100) / 100,
          results:  rows,
        };
      });

    res.json({ semesterSummaries, overallGpa: profile.gpa });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/student/timetable
// Weekly timetable for student's department + semester
// ─────────────────────────────────────────────────────────────────────────────
const getTimetable = async (req, res) => {
  try {
    const profile = await resolveProfile(req.user._id);
    if (!profile) return noProfile(res);

    const timetable = await Timetable.findOne({
      department: profile.department,
      semester:   profile.semester,
      isActive:   true,
    })
      .populate('slots.course', 'name code')
      .lean();

    if (!timetable) {
      return res.json({ slots: [], message: 'No timetable published yet.' });
    }

    // Organise by day
    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const byDay = {};
    DAYS.forEach((d) => { byDay[d] = []; });

    (timetable.slots || []).forEach((slot) => {
      if (byDay[slot.day] !== undefined) {
        byDay[slot.day].push({
          ...slot,
          courseName: slot.courseName || slot.course?.name,
          courseCode: slot.courseCode || slot.course?.code,
        });
        byDay[slot.day].sort((a, b) =>
          a.startTime.localeCompare(b.startTime)
        );
      }
    });

    res.json({ byDay, semester: timetable.semester, academic: timetable.academic });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/student/assignments
// All assignments for the student (with their personal submission status)
// ─────────────────────────────────────────────────────────────────────────────
const getAssignments = async (req, res) => {
  try {
    const profile = await resolveProfile(req.user._id);
    if (!profile) return noProfile(res);

    const { status, type } = req.query;

    const filter = {
      semester:   profile.semester,
      department: profile.department,
    };
    if (type) filter.type = type;

    const raw = await Assignment.find(filter)
      .sort({ dueDate: 1 })
      .lean();

    const now = new Date();

    // Flatten: replace submissions array with just THIS student's submission
    let assignments = raw.map((a) => {
      const mySub = a.submissions.find(
        (s) => s.student?.toString() === profile._id.toString()
      );
      const isOverdue = new Date(a.dueDate) < now;

      let myStatus = 'pending';
      if (mySub) {
        myStatus = mySub.status;
      } else if (isOverdue) {
        myStatus = 'missing';
      }

      return {
        _id:         a._id,
        title:       a.title,
        description: a.description,
        courseName:  a.courseName,
        courseCode:  a.courseCode,
        instructor:  a.instructor,
        dueDate:     a.dueDate,
        maxMarks:    a.maxMarks,
        type:        a.type,
        isOverdue,
        submission: mySub
          ? {
              submittedAt: mySub.submittedAt,
              status:      mySub.status,
              marks:       mySub.marks,
              feedback:    mySub.feedback,
            }
          : null,
        status: myStatus,
      };
    });

    // Apply status filter after deriving
    if (status) {
      assignments = assignments.filter((a) => a.status === status);
    }

    const counts = {
      total:     assignments.length,
      pending:   assignments.filter((a) => a.status === 'pending').length,
      submitted: assignments.filter((a) => ['submitted', 'graded'].includes(a.status)).length,
      missing:   assignments.filter((a) => a.status === 'missing').length,
      late:      assignments.filter((a) => a.status === 'late').length,
    };

    res.json({ assignments, counts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/student/events
// Upcoming + recent campus events visible to this student
// ─────────────────────────────────────────────────────────────────────────────
const getEvents = async (req, res) => {
  try {
    const profile = await resolveProfile(req.user._id);
    if (!profile) return noProfile(res);

    const { period = 'upcoming' } = req.query;

    const now = new Date();
    const dateFilter =
      period === 'past'
        ? { startDate: { $lt: now } }
        : { startDate: { $gte: now } };

    const events = await Event.find({
      isActive: true,
      ...dateFilter,
      $or: [
        { audience: 'all' },
        { audience: 'students' },
        { audience: 'department', department: profile.department?._id },
      ],
    })
      .sort({ startDate: period === 'past' ? -1 : 1 })
      .limit(20)
      .lean();

    res.json({ events });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/student/announcements
// Active announcements for students
// ─────────────────────────────────────────────────────────────────────────────
const getAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find({
      isActive: true,
      $or: [{ audience: 'all' }, { audience: 'students' }],
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json({ announcements });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getMyProfile,
  getDashboardOverview,
  getAttendance,
  getResults,
  getTimetable,
  getAssignments,
  getEvents,
  getAnnouncements,
};
