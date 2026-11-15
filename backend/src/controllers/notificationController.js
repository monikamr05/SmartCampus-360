/**
 * Notification Controller
 *
 * GET  /api/notifications         — my notifications (paginated)
 * PUT  /api/notifications/:id/read — mark one as read
 * PUT  /api/notifications/read-all — mark all as read
 * DELETE /api/notifications/:id   — delete one
 * GET  /api/notifications/unread-count
 *
 * POST /api/notifications/admin   — admin: send manual notification to users
 *
 * Auto-generation helpers (called by other controllers or a periodic job):
 *   generateAttendanceAlerts  — creates shortage notifications
 *   generateAssignmentAlerts  — creates deadline notifications
 *   generateEventReminders    — creates event reminders
 */

const Notification      = require('../models/Notification');
const StudentProfile    = require('../models/StudentProfile');
const SubjectAttendance = require('../models/SubjectAttendance');
const Assignment        = require('../models/Assignment');
const Event             = require('../models/Event');
const User              = require('../models/User');

/* ── My notifications ────────────────────────────────────────────────────── */

const getMyNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const filter = { recipient: req.user._id };
    if (unreadOnly === 'true') filter.isRead = false;

    const skip = (Number(page) - 1) * Number(limit);
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipient: req.user._id, isRead: false }),
    ]);

    res.json({
      notifications,
      unreadCount,
      pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
    res.json({ count });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const markRead = async (req, res) => {
  try {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    if (!n) return res.status(404).json({ message: 'Notification not found.' });
    res.json(n);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const deleteNotification = async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
    res.json({ message: 'Deleted.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── Admin: send manual notification ────────────────────────────────────── */

// POST /api/notifications/admin/send
const sendAdminNotification = async (req, res) => {
  try {
    const { title, body, type = 'announcement', priority = 'normal', targetRole, link = '' } = req.body;
    if (!title || !body) return res.status(400).json({ message: 'title and body are required.' });

    // Find recipient users
    const userFilter = {};
    if (targetRole && ['student', 'faculty', 'admin'].includes(targetRole)) {
      userFilter.role = targetRole;
    }
    const users = await User.find(userFilter).select('_id').lean();

    const notifications = users.map(u => ({
      recipient: u._id,
      title, body, type, priority, link,
      createdBy: req.user._id,
    }));

    await Notification.insertMany(notifications, { ordered: false });
    res.json({ message: `Sent to ${notifications.length} user${notifications.length !== 1 ? 's' : ''}.` });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── Auto-generation helpers ─────────────────────────────────────────────── */

/**
 * POST /api/notifications/generate/attendance
 * Creates attendance shortage notifications for all students below 75%.
 */
const generateAttendanceAlerts = async (req, res) => {
  try {
    const threshold = 0.75;
    const records = await SubjectAttendance.find({})
      .populate({ path: 'student', select: 'user name' })
      .lean();

    let created = 0;
    for (const r of records) {
      const pct = r.totalClasses ? (r.attended / r.totalClasses) * 100 : 0;
      if (pct < threshold * 100 && r.student?.user) {
        // Avoid duplicates — don't re-notify if one already sent today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const exists = await Notification.findOne({
          recipient: r.student.user,
          type:      'attendance_shortage',
          refId:     r._id,
          createdAt: { $gte: today },
        });
        if (!exists) {
          await Notification.create({
            recipient: r.student.user,
            title:     `⚠️ Attendance Shortage: ${r.courseName}`,
            body:      `Your attendance in ${r.courseName} is ${Math.round(pct)}% — below the required 75%. Please attend upcoming classes to avoid being barred from exams.`,
            type:      'attendance_shortage',
            link:      '/dashboard/student/attendance',
            refModel:  '',
            refId:     r._id,
            priority:  pct < 60 ? 'urgent' : 'high',
          });
          created++;
        }
      }
    }
    res.json({ message: `Generated ${created} attendance shortage alert${created !== 1 ? 's' : ''}.` });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/**
 * POST /api/notifications/generate/assignments
 * Notifies students about assignments due within 3 days.
 */
const generateAssignmentAlerts = async (req, res) => {
  try {
    const threeDays = new Date();
    threeDays.setDate(threeDays.getDate() + 3);

    const assignments = await Assignment.find({
      dueDate: { $gte: new Date(), $lte: threeDays },
    }).lean();

    let created = 0;
    for (const a of assignments) {
      // Find students in the same semester/department
      const students = await StudentProfile.find({
        semester:   a.semester,
        department: a.department,
      }).select('user name').lean();

      const daysLeft = Math.ceil((new Date(a.dueDate) - Date.now()) / 86400000);
      const today = new Date(); today.setHours(0, 0, 0, 0);

      for (const s of students) {
        if (!s.user) continue;
        const exists = await Notification.findOne({
          recipient: s.user,
          type:      'assignment_deadline',
          refId:     a._id,
          createdAt: { $gte: today },
        });
        if (!exists) {
          await Notification.create({
            recipient: s.user,
            title:     `📝 Assignment Due Soon: ${a.title}`,
            body:      `"${a.title}" for ${a.courseName} is due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} (${new Date(a.dueDate).toDateString()}). Make sure to submit on time.`,
            type:      'assignment_deadline',
            link:      '/dashboard/student/assignments',
            refModel:  'Assignment',
            refId:     a._id,
            priority:  daysLeft <= 1 ? 'urgent' : 'high',
          });
          created++;
        }
      }
    }
    res.json({ message: `Generated ${created} assignment deadline alert${created !== 1 ? 's' : ''}.` });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/**
 * POST /api/notifications/generate/events
 * Notifies students about events starting within 2 days.
 */
const generateEventReminders = async (req, res) => {
  try {
    const twoDays = new Date();
    twoDays.setDate(twoDays.getDate() + 2);

    const events = await Event.find({
      isActive:  true,
      startDate: { $gte: new Date(), $lte: twoDays },
    }).lean();

    let created = 0;
    const students = await StudentProfile.find({}).select('user name').lean();
    const today = new Date(); today.setHours(0, 0, 0, 0);

    for (const ev of events) {
      const daysLeft = Math.ceil((new Date(ev.startDate) - Date.now()) / 86400000);
      for (const s of students) {
        if (!s.user) continue;
        const exists = await Notification.findOne({
          recipient: s.user,
          type:      'event_reminder',
          refId:     ev._id,
          createdAt: { $gte: today },
        });
        if (!exists) {
          await Notification.create({
            recipient: s.user,
            title:     `📅 Event Reminder: ${ev.title}`,
            body:      `"${ev.title}" starts ${daysLeft === 0 ? 'today' : `in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`}${ev.venue ? ` at ${ev.venue}` : ''}. Don't miss it!`,
            type:      'event_reminder',
            link:      '/dashboard/student/events',
            refModel:  'Event',
            refId:     ev._id,
            priority:  daysLeft === 0 ? 'urgent' : 'high',
          });
          created++;
        }
      }
    }
    res.json({ message: `Generated ${created} event reminder${created !== 1 ? 's' : ''}.` });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── Global search endpoint ─────────────────────────────────────────────── */
const globalSearch = async (req, res) => {
  try {
    const { q, role } = req.query;
    if (!q || q.trim().length < 2) return res.json({ results: [] });

    const regex = { $regex: q, $options: 'i' };
    const results = [];

    // Always search events and books
    const [events, books] = await Promise.all([
      Event.find({ title: regex, isActive: true }).select('title category startDate venue').limit(5).lean(),
      require('../models/Book').find({ $or: [{ title: regex }, { author: regex }], isActive: true }).select('title author availableCopies').limit(5).lean(),
    ]);

    events.forEach(e => results.push({ type: 'event',   _id: e._id, label: e.title, sub: `${e.category} · ${new Date(e.startDate).toDateString()}`, link: '/dashboard/student/events' }));
    books.forEach(b  => results.push({ type: 'book',    _id: b._id, label: b.title, sub: `by ${b.author}`, link: '/dashboard/student/library' }));

    // Role-specific searches
    if (role === 'admin' || role === 'faculty') {
      const StudentProfile = require('../models/StudentProfile');
      const Course         = require('../models/Course');
      const [students, courses] = await Promise.all([
        StudentProfile.find({ $or: [{ name: regex }, { studentId: regex }] }).select('studentId name email').limit(5).lean(),
        Course.find({ $or: [{ name: regex }, { code: regex }] }).select('name code semester').limit(5).lean(),
      ]);
      students.forEach(s => results.push({ type: 'student', _id: s._id, label: s.name, sub: s.studentId, link: '/dashboard/admin/students' }));
      courses.forEach(c  => results.push({ type: 'course',  _id: c._id, label: c.name, sub: `${c.code} · ${c.semester}`, link: '/dashboard/admin/courses' }));
    }

    res.json({ results: results.slice(0, 12) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = {
  getMyNotifications, getUnreadCount, markRead, markAllRead,
  deleteNotification, sendAdminNotification,
  generateAttendanceAlerts, generateAssignmentAlerts, generateEventReminders,
  globalSearch,
};
