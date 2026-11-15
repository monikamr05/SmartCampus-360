const mongoose = require('mongoose');

const issueRecordSchema = new mongoose.Schema({
  student:      { type: mongoose.Schema.Types.ObjectId, ref: 'StudentProfile' },
  studentName:  { type: String, default: '' },
  studentId:    { type: String, default: '' },
  issuedAt:     { type: Date, default: Date.now },
  dueDate:      { type: Date, required: true },
  returnedAt:   { type: Date, default: null },
  isReturned:   { type: Boolean, default: false },
  fine:         { type: Number, default: 0 },     // fine in currency units
  notes:        { type: String, default: '' },
}, { _id: true });

const bookSchema = new mongoose.Schema(
  {
    title:        { type: String, required: true, trim: true },
    author:       { type: String, required: true, trim: true },
    isbn:         { type: String, trim: true, default: '' },
    publisher:    { type: String, trim: true, default: '' },
    publishYear:  { type: Number },
    edition:      { type: String, trim: true, default: '' },
    category:     {
      type: String,
      enum: ['textbook', 'reference', 'fiction', 'science', 'technology', 'arts', 'sports', 'other'],
      default: 'other',
    },
    department:   { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    totalCopies:  { type: Number, required: true, min: 1, default: 1 },
    description:  { type: String, trim: true, default: '' },
    language:     { type: String, default: 'English' },
    location:     { type: String, trim: true, default: '' },  // shelf / rack
    coverUrl:     { type: String, default: '' },

    // Current issues (active + historical)
    issueRecords: [issueRecordSchema],

    isActive:     { type: Boolean, default: true },
    addedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Virtual: available copies
bookSchema.virtual('availableCopies').get(function () {
  const issuedCount = this.issueRecords.filter(r => !r.isReturned).length;
  return Math.max(0, this.totalCopies - issuedCount);
});
bookSchema.virtual('issuedCount').get(function () {
  return this.issueRecords.filter(r => !r.isReturned).length;
});

// Text index for search
bookSchema.index({ title: 'text', author: 'text', isbn: 'text', publisher: 'text' });
bookSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Book', bookSchema);
