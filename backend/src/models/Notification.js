const mongoose = require('mongoose');

/**
 * Notification model
 *
 * Notifications are created by the system (auto) or by admin/faculty.
 * Each record targets a specific user (recipient).
 *
 * Types map to their source:
 *   attendance_shortage  — student attendance < 75%
 *   assignment_deadline  — assignment due within N days
 *   exam_announcement    — new exam result published
 *   event_reminder       — event starting within N days
 *   announcement         — general campus announcement
 *   general              — catch-all
 */
const notificationSchema = new mongoose.Schema(
  {
    recipient:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title:       { type: String, required: true, trim: true },
    body:        { type: String, required: true, trim: true },
    type:        {
      type: String,
      enum: ['attendance_shortage', 'assignment_deadline', 'exam_announcement',
             'event_reminder', 'announcement', 'general'],
      default: 'general',
    },
    // Deep-link: front-end can route to this path
    link:        { type: String, default: '' },
    // Source reference (optional — which entity triggered this)
    refModel:    { type: String, enum: ['Event', 'Assignment', 'ExamResult', 'Announcement', ''], default: '' },
    refId:       { type: mongoose.Schema.Types.ObjectId, default: null },

    isRead:      { type: Boolean, default: false },
    readAt:      { type: Date, default: null },
    priority:    { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },

    // Who triggered it (system = null)
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
