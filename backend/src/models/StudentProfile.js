const mongoose = require('mongoose');

const studentProfileSchema = new mongoose.Schema(
  {
    user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    studentId:     { type: String, required: [true, 'Student ID is required'], unique: true, trim: true },
    name:          { type: String, required: [true, 'Name is required'], trim: true },
    email:         { type: String, required: [true, 'Email is required'], lowercase: true, trim: true },
    phone:         { type: String, trim: true, default: '' },
    department:    { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    enrolledYear:  { type: Number, required: true },
    semester:      { type: Number, default: 1, min: 1, max: 8 },
    gpa:           { type: Number, default: 0, min: 0, max: 4 },
    attendancePct: { type: Number, default: 0, min: 0, max: 100 },
    status:        { type: String, enum: ['active', 'inactive', 'graduated', 'suspended'], default: 'active' },
    address:       { type: String, trim: true, default: '' },
    avatar:        { type: String, default: '' },
    courses:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('StudentProfile', studentProfileSchema);
