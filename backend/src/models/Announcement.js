const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title:     { type: String, required: [true, 'Title is required'], trim: true },
    content:   { type: String, required: [true, 'Content is required'], trim: true },
    author:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorName:{ type: String, trim: true },
    audience:  { type: String, enum: ['all', 'students', 'faculty', 'admin'], default: 'all' },
    priority:  { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    isActive:  { type: Boolean, default: true },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Announcement', announcementSchema);
