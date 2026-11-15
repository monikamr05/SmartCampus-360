const mongoose = require('mongoose');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const slotSchema = new mongoose.Schema({
  day:        { type: String, enum: DAYS, required: true },
  startTime:  { type: String, required: true },   // "09:00"
  endTime:    { type: String, required: true },   // "10:00"
  course:     { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  courseName: { type: String, trim: true },
  courseCode: { type: String, trim: true },
  instructor: { type: String, trim: true, default: '' },
  room:       { type: String, trim: true, default: '' },
  type:       { type: String, enum: ['lecture', 'lab', 'tutorial', 'seminar'], default: 'lecture' },
}, { _id: false });

const timetableSchema = new mongoose.Schema(
  {
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    semester:   { type: Number, required: true, min: 1, max: 8 },
    academic:   { type: String, default: '' },   // "2024-25"
    slots:      [slotSchema],
    isActive:   { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Timetable', timetableSchema);
