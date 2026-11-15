/**
 * Timetable Controller
 *
 * Admin:   Full CRUD over timetable documents and their slots.
 * Faculty: Read-only view of their own department/semester timetable.
 * Student: Read-only (handled in studentDashboardController — left untouched).
 *
 * Duplicate-slot prevention: within a timetable, two slots cannot share the
 * same day + room + overlapping time window, and a single course cannot appear
 * twice on the same day at the same time.
 */

const Timetable  = require('../models/Timetable');
const Department = require('../models/Department');
const Course     = require('../models/Course');
const Activity   = require('../models/Activity');

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const log = (action, description, req) =>
  Activity.create({
    action, entity: 'timetable', description,
    performedBy: req.user?._id,
    performedByName: req.user?.name || 'Admin',
    icon: '📅',
  }).catch(() => {});

/* ── time helpers ─────────────────────────────────────────────────────────── */
const toMinutes = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

/** Returns true when [s1,e1) and [s2,e2) overlap */
const overlaps = (s1, e1, s2, e2) =>
  toMinutes(s1) < toMinutes(e2) && toMinutes(s2) < toMinutes(e1);

/**
 * Check for duplicate/conflict within existing slots array.
 * Conflicts detected:
 *   1. Same room, same day, overlapping time
 *   2. Same course, same day, overlapping time
 * excludeIndex: index of slot to skip during edit checks
 */
const findConflict = (slots, incoming, excludeIndex = -1) => {
  for (let i = 0; i < slots.length; i++) {
    if (i === excludeIndex) continue;
    const s = slots[i];
    if (s.day !== incoming.day) continue;
    if (!overlaps(incoming.startTime, incoming.endTime, s.startTime, s.endTime)) continue;

    if (incoming.room && s.room && incoming.room === s.room) {
      return `Room "${incoming.room}" is already booked on ${incoming.day} ${s.startTime}–${s.endTime}.`;
    }
    if (incoming.course && s.course &&
        incoming.course.toString() === s.course.toString()) {
      return `This course already has a class on ${incoming.day} at ${s.startTime}–${s.endTime}.`;
    }
  }
  return null;
};

/* ════════════════════════════════════════════════════════════════════════════
   TIMETABLE DOCUMENT CRUD
   ════════════════════════════════════════════════════════════════════════════ */

// GET /api/admin/timetables — list all timetables
const getTimetables = async (req, res) => {
  try {
    const { department, semester, search } = req.query;
    const filter = {};
    if (department) filter.department = department;
    if (semester)   filter.semester   = Number(semester);

    const timetables = await Timetable.find(filter)
      .populate('department', 'name code')
      .populate('slots.course', 'name code')
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ timetables });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/admin/timetables/:id
const getTimetable = async (req, res) => {
  try {
    const tt = await Timetable.findById(req.params.id)
      .populate('department', 'name code')
      .populate('slots.course', 'name code instructor');
    if (!tt) return res.status(404).json({ message: 'Timetable not found.' });
    res.json(tt);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /api/admin/timetables — create empty timetable
const createTimetable = async (req, res) => {
  try {
    const { department, semester, academic } = req.body;
    if (!department || !semester) {
      return res.status(400).json({ message: 'department and semester are required.' });
    }
    // Prevent duplicate active timetable for same dept+semester
    const existing = await Timetable.findOne({ department, semester, isActive: true });
    if (existing) {
      return res.status(400).json({
        message: 'An active timetable already exists for this department and semester.',
        existingId: existing._id,
      });
    }
    const tt = await Timetable.create({ department, semester, academic: academic || '', slots: [] });
    await log('CREATE', `Created timetable for Sem ${semester}`, req);
    const populated = await tt.populate('department', 'name code');
    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PUT /api/admin/timetables/:id — update metadata (academic year, isActive)
const updateTimetable = async (req, res) => {
  try {
    const { academic, isActive } = req.body;
    const tt = await Timetable.findByIdAndUpdate(
      req.params.id, { academic, isActive }, { new: true, runValidators: true }
    ).populate('department', 'name code');
    if (!tt) return res.status(404).json({ message: 'Timetable not found.' });
    await log('UPDATE', `Updated timetable metadata`, req);
    res.json(tt);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// DELETE /api/admin/timetables/:id
const deleteTimetable = async (req, res) => {
  try {
    const tt = await Timetable.findByIdAndDelete(req.params.id);
    if (!tt) return res.status(404).json({ message: 'Timetable not found.' });
    await log('DELETE', `Deleted timetable`, req);
    res.json({ message: 'Timetable deleted.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ════════════════════════════════════════════════════════════════════════════
   SLOT CRUD  (within a timetable document)
   ════════════════════════════════════════════════════════════════════════════ */

// POST /api/admin/timetables/:id/slots — add a slot
const addSlot = async (req, res) => {
  try {
    const tt = await Timetable.findById(req.params.id);
    if (!tt) return res.status(404).json({ message: 'Timetable not found.' });

    const slot = req.body; // { day, startTime, endTime, course, courseName, courseCode, instructor, room, type }

    if (!DAYS.includes(slot.day)) {
      return res.status(400).json({ message: `Invalid day: ${slot.day}.` });
    }
    if (!slot.startTime || !slot.endTime) {
      return res.status(400).json({ message: 'startTime and endTime are required.' });
    }
    if (toMinutes(slot.startTime) >= toMinutes(slot.endTime)) {
      return res.status(400).json({ message: 'startTime must be before endTime.' });
    }

    // Enrich from Course document if only courseId provided
    if (slot.course && (!slot.courseName || !slot.courseCode)) {
      const course = await Course.findById(slot.course).lean();
      if (course) {
        slot.courseName = slot.courseName || course.name;
        slot.courseCode = slot.courseCode || course.code;
        slot.instructor = slot.instructor || course.instructor || '';
      }
    }

    const conflict = findConflict(tt.slots, slot);
    if (conflict) return res.status(409).json({ message: conflict });

    tt.slots.push(slot);
    await tt.save();
    await log('CREATE', `Added slot on ${slot.day} ${slot.startTime}–${slot.endTime}`, req);
    res.status(201).json(tt.slots[tt.slots.length - 1]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PUT /api/admin/timetables/:id/slots/:slotIndex — edit a slot by array index
const updateSlot = async (req, res) => {
  try {
    const tt = await Timetable.findById(req.params.id);
    if (!tt) return res.status(404).json({ message: 'Timetable not found.' });

    const idx = Number(req.params.slotIndex);
    if (isNaN(idx) || idx < 0 || idx >= tt.slots.length) {
      return res.status(400).json({ message: 'Invalid slot index.' });
    }

    const updated = { ...tt.slots[idx].toObject(), ...req.body };

    if (toMinutes(updated.startTime) >= toMinutes(updated.endTime)) {
      return res.status(400).json({ message: 'startTime must be before endTime.' });
    }

    // Enrich course info if course changed
    if (req.body.course && req.body.course !== tt.slots[idx].course?.toString()) {
      const course = await Course.findById(req.body.course).lean();
      if (course) {
        updated.courseName = updated.courseName || course.name;
        updated.courseCode = updated.courseCode || course.code;
      }
    }

    const conflict = findConflict(tt.slots, updated, idx);
    if (conflict) return res.status(409).json({ message: conflict });

    tt.slots[idx] = updated;
    await tt.save();
    await log('UPDATE', `Updated slot on ${updated.day} ${updated.startTime}–${updated.endTime}`, req);
    res.json(tt.slots[idx]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// DELETE /api/admin/timetables/:id/slots/:slotIndex
const deleteSlot = async (req, res) => {
  try {
    const tt = await Timetable.findById(req.params.id);
    if (!tt) return res.status(404).json({ message: 'Timetable not found.' });

    const idx = Number(req.params.slotIndex);
    if (isNaN(idx) || idx < 0 || idx >= tt.slots.length) {
      return res.status(400).json({ message: 'Invalid slot index.' });
    }

    const removed = tt.slots.splice(idx, 1)[0];
    await tt.save();
    await log('DELETE', `Removed slot on ${removed.day} ${removed.startTime}–${removed.endTime}`, req);
    res.json({ message: 'Slot removed.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ════════════════════════════════════════════════════════════════════════════
   FACULTY READ ENDPOINT
   GET /api/faculty/timetable  (kept here, called from facultyRoutes)
   ════════════════════════════════════════════════════════════════════════════ */
const getFacultyTimetable = async (req, res) => {
  try {
    const FacultyProfile = require('../models/FacultyProfile');
    const profile = await FacultyProfile.findOne({ user: req.user._id })
      .populate('courses', 'name code').lean();
    if (!profile) return res.status(404).json({ message: 'Faculty profile not found.' });

    // All active timetables for this department
    const timetables = await Timetable.find({
      department: profile.department,
      isActive: true,
    }).populate('slots.course', 'name code').lean();

    // Filter slots to only those where instructor name matches or course is theirs
    const myCourseIds = (profile.courses || []).map(c => c._id.toString());

    const result = timetables.map(tt => ({
      ...tt,
      slots: tt.slots.filter(s =>
        myCourseIds.includes(s.course?._id?.toString() || s.course?.toString()) ||
        s.instructor?.toLowerCase().includes((profile.name || '').split(' ')[0]?.toLowerCase())
      ),
    })).filter(tt => tt.slots.length > 0);

    const DAYS_ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const byDay = {};
    DAYS_ORDER.forEach(d => { byDay[d] = []; });
    result.forEach(tt => {
      tt.slots.forEach(slot => {
        if (byDay[slot.day] !== undefined) {
          byDay[slot.day].push({ ...slot, semester: tt.semester, academic: tt.academic });
          byDay[slot.day].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
        }
      });
    });

    res.json({ byDay, timetables: result });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = {
  getTimetables, getTimetable, createTimetable, updateTimetable, deleteTimetable,
  addSlot, updateSlot, deleteSlot,
  getFacultyTimetable,
};
