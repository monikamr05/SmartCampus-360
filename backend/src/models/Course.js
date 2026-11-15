const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    name:       { type: String, required: [true, 'Course name is required'], trim: true },
    code:       { type: String, required: [true, 'Course code is required'], trim: true, uppercase: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    instructor: { type: String, trim: true, default: '' },
    credits:    { type: Number, required: true, min: 1, max: 6 },
    semester:   { type: String, enum: ['Fall', 'Spring', 'Summer'], required: true },
    year:       { type: Number, required: true },
    maxStudents:{ type: Number, default: 40 },
    enrolled:   { type: Number, default: 0 },
    description:{ type: String, trim: true, default: '' },
    isActive:   { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Course', courseSchema);
