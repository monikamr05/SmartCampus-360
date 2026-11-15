const express = require('express');
const router  = express.Router();
const { protect }     = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const {
  getEvents, getEvent, createEvent, updateEvent, deleteEvent,
  getParticipants, markAttended,
  registerForEvent, unregisterFromEvent, getMyRegistrations,
} = require('../controllers/eventController');

router.use(protect);

// All roles: list & detail
router.get('/',                                    getEvents);
router.get('/my-registrations',                    requireRole('student'), getMyRegistrations);
router.get('/:id',                                 getEvent);

// Admin: CRUD
router.post('/',                                   requireRole('admin'), createEvent);
router.put('/:id',                                 requireRole('admin'), updateEvent);
router.delete('/:id',                              requireRole('admin'), deleteEvent);

// Admin: participant management
router.get('/:id/participants',                    requireRole('admin'), getParticipants);
router.put('/:id/participants/:regId/attendance',  requireRole('admin'), markAttended);

// Student: register / unregister
router.post('/:id/register',                       requireRole('student'), registerForEvent);
router.delete('/:id/register',                     requireRole('student'), unregisterFromEvent);

module.exports = router;
