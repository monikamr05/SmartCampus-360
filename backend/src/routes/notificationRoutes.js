const express = require('express');
const router  = express.Router();
const { protect }     = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const {
  getMyNotifications, getUnreadCount, markRead, markAllRead,
  deleteNotification, sendAdminNotification,
  generateAttendanceAlerts, generateAssignmentAlerts, generateEventReminders,
  globalSearch,
} = require('../controllers/notificationController');

router.use(protect);

// All authenticated users
router.get('/',                       getMyNotifications);
router.get('/unread-count',           getUnreadCount);
router.put('/read-all',               markAllRead);
router.put('/:id/read',               markRead);
router.delete('/:id',                 deleteNotification);

// Global search (all roles)
router.get('/search',                 globalSearch);

// Admin: send + generate
router.post('/admin/send',            requireRole('admin'), sendAdminNotification);
router.post('/generate/attendance',   requireRole('admin'), generateAttendanceAlerts);
router.post('/generate/assignments',  requireRole('admin'), generateAssignmentAlerts);
router.post('/generate/events',       requireRole('admin'), generateEventReminders);

module.exports = router;
