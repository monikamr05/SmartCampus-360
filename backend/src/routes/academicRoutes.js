/**
 * Academic Routes  —  /api/academic
 * Admin:   full access to timetable, attendance and exam endpoints
 * Faculty: read timetable + read/write attendance for own courses
 */
const express = require('express');
const router  = express.Router();

const { protect }     = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const {
  getTimetables, getTimetable, createTimetable, updateTimetable, deleteTimetable,
  addSlot, updateSlot, deleteSlot,
  getFacultyTimetable,
} = require('../controllers/timetableController');

const {
  getAttendanceOverview, getCourseAttendance, getDateRoster,
  markAttendanceBulk, updateStudentAttendance,
  getExamOverview, getCourseResults, upsertExamResult, publishResults,
} = require('../controllers/academicController');

/* ─── Admin + Faculty shared middleware ───────────────────────────────────── */
router.use(protect);

/* ─────────────────────────────────────────────────────────────────────────────
   TIMETABLE  (Admin manages; Faculty reads)
   ───────────────────────────────────────────────────────────────────────────── */

// Faculty read-only view of their own timetable
router.get('/timetable/faculty', requireRole('faculty'), getFacultyTimetable);

// Admin CRUD
router.get('/timetables',     requireRole('admin'), getTimetables);
router.post('/timetables',    requireRole('admin'), createTimetable);
router.get('/timetables/:id', requireRole('admin', 'faculty'), getTimetable);
router.put('/timetables/:id', requireRole('admin'), updateTimetable);
router.delete('/timetables/:id', requireRole('admin'), deleteTimetable);

// Slot management  (admin only)
router.post('/timetables/:id/slots',                    requireRole('admin'), addSlot);
router.put('/timetables/:id/slots/:slotIndex',          requireRole('admin'), updateSlot);
router.delete('/timetables/:id/slots/:slotIndex',       requireRole('admin'), deleteSlot);

/* ─────────────────────────────────────────────────────────────────────────────
   ATTENDANCE  (Admin full access)
   ───────────────────────────────────────────────────────────────────────────── */
router.get('/attendance',                                        requireRole('admin'), getAttendanceOverview);
router.get('/attendance/:courseId',                              requireRole('admin'), getCourseAttendance);
router.get('/attendance/:courseId/roster',                       requireRole('admin'), getDateRoster);
router.post('/attendance/:courseId/mark',                        requireRole('admin'), markAttendanceBulk);
router.put('/attendance/:courseId/student/:studentId',           requireRole('admin'), updateStudentAttendance);

/* ─────────────────────────────────────────────────────────────────────────────
   EXAMINATIONS  (Admin full access)
   ───────────────────────────────────────────────────────────────────────────── */
router.get('/exams',                        requireRole('admin'), getExamOverview);
router.get('/exams/:courseId',              requireRole('admin'), getCourseResults);
router.put('/exams/:courseId/:studentId',   requireRole('admin'), upsertExamResult);
router.put('/exams/:courseId/publish',      requireRole('admin'), publishResults);

module.exports = router;
