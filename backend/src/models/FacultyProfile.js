const mongoose = require('mongoose');

const facultyProfileSchema = new mongoose.Schema(
  {
    user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    facultyId:     { type: String, required: [true, 'Faculty ID is required'], unique: true, trim: true },
    name:          { type: String, required: [true, 'Name is required'], trim: true },
    email:         { type: String, required: [true, 'Email is required'], lowercase: true, trim: true },
    phone:         { type: String, trim: true, default: '' },
    department:    { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    designation:   { type: String, trim: true, default: 'Lecturer' },
    qualification: { type: String, trim: true, default: '' },
    experience:    { type: Number, default: 0 },
    specialization:{ type: String, trim: true, default: '' },
    status:        { type: String, enum: ['active', 'inactive', 'on-leave'], default: 'active' },
    courses:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    avatar:        { type: String, default: '' },
    joinedYear:    { type: Number, default: () => new Date().getFullYear() },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FacultyProfile', facultyProfileSchema);
