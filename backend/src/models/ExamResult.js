const mongoose = require('mongoose');

const examResultSchema = new mongoose.Schema(
  {
    student:    { type: mongoose.Schema.Types.ObjectId, ref: 'StudentProfile', required: true },
    course:     { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    courseName: { type: String, trim: true },
    courseCode: { type: String, trim: true },
    semester:   { type: Number, required: true, min: 1, max: 8 },
    academic:   { type: String, default: '' },

    // Internal / continuous assessment
    internal: {
      assignment1:  { type: Number, default: 0, min: 0, max: 25 },
      assignment2:  { type: Number, default: 0, min: 0, max: 25 },
      midterm:      { type: Number, default: 0, min: 0, max: 50 },
      quiz:         { type: Number, default: 0, min: 0, max: 10 },
      total:        { type: Number, default: 0, min: 0, max: 100 },
    },

    // Final / external exam
    external: {
      marksObtained: { type: Number, default: 0 },
      maxMarks:      { type: Number, default: 100 },
    },

    grade:        { type: String, default: '' },   // A+, A, B+, B, C, D, F
    gradePoint:   { type: Number, default: 0 },
    isPassed:     { type: Boolean, default: true },
    remarks:      { type: String, default: '' },
    publishedAt:  { type: Date, default: null },
  },
  { timestamps: true }
);

// Virtual: total marks
examResultSchema.virtual('totalMarks').get(function () {
  return this.internal.total + this.external.marksObtained;
});

examResultSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('ExamResult', examResultSchema);
