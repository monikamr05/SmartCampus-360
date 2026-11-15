/**
 * Event Controller
 * Admin:   Full CRUD + mark attendance
 * Student: List events, register, unregister, view own registrations
 * Faculty: List events (read-only)
 */

const Event          = require('../models/Event');
const StudentProfile = require('../models/StudentProfile');
const Notification   = require('../models/Notification');
const Activity       = require('../models/Activity');

const log = (action, desc, req) =>
  Activity.create({
    action, entity: 'event', description: desc,
    performedBy: req.user?._id, performedByName: req.user?.name || 'Admin', icon: '📅',
  }).catch(() => {});

/* helper: notify all students about an event */
const notifyStudents = async (event) => {
  try {
    const students = await StudentProfile.find({}).select('user').lean();
    const daysUntil = Math.ceil((new Date(event.startDate) - Date.now()) / 86400000);
    const notifications = students.map(s => ({
      recipient: s.user,
      title:     `📅 Upcoming Event: ${event.title}`,
      body:      `${event.title} is happening on ${new Date(event.startDate).toDateString()}${event.venue ? ` at ${event.venue}` : ''}.${daysUntil <= 3 ? ` Only ${daysUntil} day${daysUntil !== 1 ? 's' : ''} away!` : ''}`,
      type:      'event_reminder',
      link:      '/dashboard/student/events',
      refModel:  'Event',
      refId:     event._id,
      priority:  daysUntil <= 2 ? 'high' : 'normal',
    }));
    await Notification.insertMany(notifications, { ordered: false });
  } catch { /* non-critical */ }
};

/* ── Admin: CRUD ──────────────────────────────────────────────────────────── */

// GET /api/events  (admin: all | student/faculty: active + filtered by audience)
const getEvents = async (req, res) => {
  try {
    const { search, category, upcoming, page = 1, limit = 20, myEvents } = req.query;
    const filter = {};

    if (req.user.role !== 'admin') filter.isActive = true;

    if (search)   filter.$or = [
      { title:       { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { venue:       { $regex: search, $options: 'i' } },
    ];
    if (category) filter.category = category;
    if (upcoming === 'true') filter.startDate = { $gte: new Date() };

    const skip = (Number(page) - 1) * Number(limit);
    const [events, total] = await Promise.all([
      Event.find(filter)
        .populate('department', 'name code')
        .sort({ startDate: 1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Event.countDocuments(filter),
    ]);

    // For each event, attach registration count
    const enriched = events.map(e => ({
      ...e,
      registeredCount: e.registrations?.length || 0,
      isFull: e.maxParticipants > 0 && (e.registrations?.length || 0) >= e.maxParticipants,
    }));

    res.json({ events: enriched, pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/events/:id
const getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('department', 'name code')
      .populate('registrations.student', 'studentId name email');
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    res.json(event);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /api/events  (admin only)
const createEvent = async (req, res) => {
  try {
    const event = await Event.create({ ...req.body, createdBy: req.user._id });
    await log('CREATE', `Created event "${event.title}"`, req);
    // Notify students if it starts within 7 days
    const daysUntil = Math.ceil((new Date(event.startDate) - Date.now()) / 86400000);
    if (daysUntil <= 7 && event.isActive) await notifyStudents(event);
    res.status(201).json(event);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PUT /api/events/:id  (admin only)
const updateEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('department', 'name code');
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    await log('UPDATE', `Updated event "${event.title}"`, req);
    res.json(event);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// DELETE /api/events/:id  (admin only)
const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    await log('DELETE', `Deleted event "${event.title}"`, req);
    res.json({ message: 'Event deleted.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── Admin: participant management ────────────────────────────────────────── */

// GET /api/events/:id/participants  (admin)
const getParticipants = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('registrations.student', 'studentId name email phone department');
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    res.json({
      eventTitle:        event.title,
      registrations:     event.registrations,
      registeredCount:   event.registrations.length,
      maxParticipants:   event.maxParticipants,
      isFull:            event.maxParticipants > 0 && event.registrations.length >= event.maxParticipants,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PUT /api/events/:id/participants/:regId/attendance  (admin: mark attended)
const markAttended = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    const reg = event.registrations.id(req.params.regId);
    if (!reg) return res.status(404).json({ message: 'Registration not found.' });
    reg.attended = req.body.attended ?? true;
    await event.save();
    res.json({ message: 'Attendance updated.', attended: reg.attended });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── Student: register / unregister ──────────────────────────────────────── */

// POST /api/events/:id/register  (student)
const registerForEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    if (!event.isActive) return res.status(400).json({ message: 'Event is no longer active.' });
    if (new Date(event.startDate) < new Date()) return res.status(400).json({ message: 'Event has already started.' });

    const profile = await StudentProfile.findOne({ user: req.user._id }).lean();
    if (!profile) return res.status(404).json({ message: 'Student profile not found.' });

    // Duplicate check
    const alreadyRegistered = event.registrations.some(
      r => r.student.toString() === profile._id.toString()
    );
    if (alreadyRegistered) return res.status(400).json({ message: 'You are already registered for this event.' });

    // Capacity check
    if (event.maxParticipants > 0 && event.registrations.length >= event.maxParticipants) {
      return res.status(400).json({ message: 'Event is full. No spots remaining.' });
    }

    event.registrations.push({
      student:      profile._id,
      studentName:  profile.name,
      studentEmail: profile.email,
      studentId:    profile.studentId,
    });
    await event.save();

    // Confirmation notification
    await Notification.create({
      recipient:  req.user._id,
      title:      `✅ Registered: ${event.title}`,
      body:       `You have successfully registered for "${event.title}" on ${new Date(event.startDate).toDateString()}${event.venue ? ` at ${event.venue}` : ''}.`,
      type:       'event_reminder',
      link:       '/dashboard/student/events',
      refModel:   'Event',
      refId:      event._id,
      priority:   'normal',
    });

    res.json({ message: 'Successfully registered.', registeredCount: event.registrations.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// DELETE /api/events/:id/register  (student: cancel registration)
const unregisterFromEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found.' });

    const profile = await StudentProfile.findOne({ user: req.user._id }).lean();
    if (!profile) return res.status(404).json({ message: 'Student profile not found.' });

    const idx = event.registrations.findIndex(
      r => r.student.toString() === profile._id.toString()
    );
    if (idx === -1) return res.status(400).json({ message: 'You are not registered for this event.' });

    event.registrations.splice(idx, 1);
    await event.save();
    res.json({ message: 'Registration cancelled.', registeredCount: event.registrations.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/events/my-registrations  (student: events this student registered for)
const getMyRegistrations = async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({ user: req.user._id }).lean();
    if (!profile) return res.status(404).json({ message: 'Student profile not found.' });

    const events = await Event.find({ 'registrations.student': profile._id })
      .select('title category startDate startTime endTime venue organizer registrations isActive')
      .sort({ startDate: 1 })
      .lean();

    const result = events.map(e => {
      const myReg = e.registrations.find(r => r.student.toString() === profile._id.toString());
      return {
        _id:          e._id,
        title:        e.title,
        category:     e.category,
        startDate:    e.startDate,
        startTime:    e.startTime,
        endTime:      e.endTime,
        venue:        e.venue,
        organizer:    e.organizer,
        isActive:     e.isActive,
        registeredAt: myReg?.registeredAt,
        attended:     myReg?.attended || false,
      };
    });

    res.json({ registrations: result });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = {
  getEvents, getEvent, createEvent, updateEvent, deleteEvent,
  getParticipants, markAttended,
  registerForEvent, unregisterFromEvent, getMyRegistrations,
};
