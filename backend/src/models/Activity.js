const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    action:      { type: String, required: true },
    entity:      { type: String, required: true },   // 'student' | 'faculty' | 'course' | 'department' | 'announcement'
    entityId:    { type: String, default: '' },
    description: { type: String, required: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    performedByName: { type: String, default: 'System' },
    icon:        { type: String, default: '📝' },
  },
  { timestamps: true }
);

// Keep only latest 200 activities
activitySchema.post('save', async function () {
  const count = await this.constructor.countDocuments();
  if (count > 200) {
    const oldest = await this.constructor.find().sort({ createdAt: 1 }).limit(count - 200);
    const ids = oldest.map(d => d._id);
    await this.constructor.deleteMany({ _id: { $in: ids } });
  }
});

module.exports = mongoose.model('Activity', activitySchema);
