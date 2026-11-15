const express = require('express');
const router  = express.Router();

const { protect }      = require('../middleware/authMiddleware');
const { requireRole }  = require('../middleware/roleMiddleware');

const {
  getMyProfile,
  getDashboardOverview,
  getAttendance,
  getResults,
  getTimetable,
  getAssignments,
  getEvents,
  getAnnouncements,
} = require('../controllers/studentDashboardController');

// All routes require a valid JWT and the student role
router.use(protect, requireRole('student'));

router.get('/profile',       getMyProfile);
router.get('/dashboard',     getDashboardOverview);
router.get('/attendance',    getAttendance);
router.get('/results',       getResults);
router.get('/timetable',     getTimetable);
router.get('/assignments',   getAssignments);
router.get('/events',        getEvents);
router.get('/announcements', getAnnouncements);

module.exports = router;
