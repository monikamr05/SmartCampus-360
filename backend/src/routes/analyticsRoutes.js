/**
 * Analytics Routes  —  /api/analytics
 *
 * GET /api/analytics/admin/attendance   admin only
 * GET /api/analytics/admin/academic     admin only
 * GET /api/analytics/student            student only (personal)
 * GET /api/analytics/faculty            faculty only (assigned courses)
 */
const express = require('express');
const router  = express.Router();

const { protect }     = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const {
  adminAttendanceAnalytics,
  adminAcademicAnalytics,
  studentAnalytics,
  facultyAnalytics,
} = require('../controllers/analyticsController');

router.use(protect);

router.get('/admin/attendance', requireRole('admin'),   adminAttendanceAnalytics);
router.get('/admin/academic',   requireRole('admin'),   adminAcademicAnalytics);
router.get('/student',          requireRole('student'), studentAnalytics);
router.get('/faculty',          requireRole('faculty'), facultyAnalytics);

module.exports = router;
