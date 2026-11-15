const express = require('express');
const router  = express.Router();

const { protect }     = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const {
  getMyProfile, getDashboardOverview,
  getMyCourses, getCourseStudents,
  getAttendance, markAttendance, updateStudentAttendance,
  getMarks, upsertMarks,
  getAssignments, createAssignment, updateAssignment, deleteAssignment, gradeSubmission,
  getCoursePerformance,
  getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
} = require('../controllers/facultyDashboardController');

router.use(protect, requireRole('faculty'));

// Profile & overview
router.get('/profile',   getMyProfile);
router.get('/dashboard', getDashboardOverview);

// Courses
router.get('/courses',                       getMyCourses);
router.get('/courses/:courseId/students',    getCourseStudents);

// Attendance
router.get('/attendance/:courseId',                           getAttendance);
router.post('/attendance/:courseId',                          markAttendance);
router.put('/attendance/:courseId/:studentId',                updateStudentAttendance);

// Marks
router.get('/marks/:courseId',               getMarks);
router.put('/marks/:courseId/:studentId',    upsertMarks);

// Assignments
router.get('/assignments/:courseId',                             getAssignments);
router.post('/assignments/:courseId',                            createAssignment);
router.put('/assignments/:courseId/:id',                         updateAssignment);
router.delete('/assignments/:courseId/:id',                      deleteAssignment);
router.put('/assignments/:courseId/:id/grade/:subId',            gradeSubmission);

// Performance
router.get('/performance/:courseId',         getCoursePerformance);

// Announcements
router.get('/announcements',           getAnnouncements);
router.post('/announcements',          createAnnouncement);
router.put('/announcements/:id',       updateAnnouncement);
router.delete('/announcements/:id',    deleteAnnouncement);

module.exports = router;
