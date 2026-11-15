const mongoose = require('mongoose');

const subjectAttendanceSchema = new mongoose.Schema(
  {
    student:      { type: mongoose.Schema.Types.ObjectId, ref: 'StudentProfile', required: true },
    course:       { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    courseName:   { type: String, trim: true },          // denormalised for speed
    courseCode:   { type: String, trim: true },
    totalClasses: { type: Number, default: 0, min: 0 },
    attended:     { type: Number, default: 0, min: 0 },
    // Per-day records
    records: [
      {
        date:    { type: Date, required: true },
        present: { type: Boolean, default: false },
        note:    { type: String, default: '' },
      },
    ],
    semester:  { type: Number, default: 1, min: 1, max: 8 },
    academic:  { type: String, default: '' },   // e.g. "2024-25"
  },
  { timestamps: true }
);

// Virtual: computed attendance %
subjectAttendanceSchema.virtual('percentage').get(function () {
  if (!this.totalClasses) return 0;
  return Math.round((this.attended / this.totalClasses) * 100);
});

subjectAttendanceSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('SubjectAttendance', subjectAttendanceSchema);
