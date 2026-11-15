const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  student:      { type: mongoose.Schema.Types.ObjectId, ref: 'StudentProfile', required: true },
  studentName:  { type: String, default: '' },
  studentEmail: { type: String, default: '' },
  studentId:    { type: String, default: '' },
  registeredAt: { type: Date, default: Date.now },
  attended:     { type: Boolean, default: false },
}, { _id: true });

const eventSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    category:    {
      type: String,
      enum: ['academic', 'cultural', 'sports', 'seminar', 'workshop', 'holiday', 'exam', 'other'],
      default: 'other',
    },
    startDate:   { type: Date, required: true },
    endDate:     { type: Date },
    startTime:   { type: String, default: '' },
    endTime:     { type: String, default: '' },
    venue:       { type: String, trim: true, default: '' },
    organizer:   { type: String, trim: true, default: '' },
    isAllDay:    { type: Boolean, default: false },

    audience:    { type: String, enum: ['all', 'students', 'faculty', 'department'], default: 'all' },
    department:  { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },

    registrationRequired: { type: Boolean, default: false },
    maxParticipants:      { type: Number, default: 0 },

    // Participant registrations
    registrations: [registrationSchema],

    tags:        [{ type: String, trim: true }],
    imageUrl:    { type: String, default: '' },

    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Virtual: registered count
eventSchema.virtual('registeredCount').get(function () {
  return this.registrations.length;
});
eventSchema.virtual('isFull').get(function () {
  return this.maxParticipants > 0 && this.registrations.length >= this.maxParticipants;
});
eventSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Event', eventSchema);
