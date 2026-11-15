const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    course:      { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    courseName:  { type: String, trim: true },
    courseCode:  { type: String, trim: true },
    instructor:  { type: String, trim: true, default: '' },
    dueDate:     { type: Date, required: true },
    maxMarks:    { type: Number, default: 100 },
    type:        { type: String, enum: ['assignment', 'project', 'quiz', 'lab', 'presentation'], default: 'assignment' },

    // Targeted at specific students or all in a semester
    semester:    { type: Number, default: 1 },
    department:  { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },

    // Submission records  (one per student)
    submissions: [
      {
        student:     { type: mongoose.Schema.Types.ObjectId, ref: 'StudentProfile' },
        submittedAt: { type: Date, default: null },
        fileUrl:     { type: String, default: '' },
        marks:       { type: Number, default: null },
        feedback:    { type: String, default: '' },
        status:      { type: String, enum: ['pending', 'submitted', 'late', 'graded', 'missing'], default: 'pending' },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Assignment', assignmentSchema);
