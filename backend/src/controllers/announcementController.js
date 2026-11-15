const Announcement = require('../models/Announcement');
const Activity     = require('../models/Activity');

const log = (action, description, req) =>
  Activity.create({
    action,
    entity: 'announcement',
    description,
    performedBy: req.user?._id,
    performedByName: req.user?.name || 'Admin',
    icon: '📢',
  }).catch(() => {});

// @route GET /api/admin/announcements
const getAnnouncements = async (req, res) => {
  try {
    const { search = '', audience = '', priority = '', page = 1, limit = 10 } = req.query;
    const filter = {};
    if (search)   filter.$or = [{ title: { $regex: search, $options: 'i' } }, { content: { $regex: search, $options: 'i' } }];
    if (audience) filter.audience = audience;
    if (priority) filter.priority = priority;

    const skip = (Number(page) - 1) * Number(limit);
    const [announcements, total] = await Promise.all([
      Announcement.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Announcement.countDocuments(filter),
    ]);
    res.json({ announcements, pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route POST /api/admin/announcements
const createAnnouncement = async (req, res) => {
  try {
    const ann = await Announcement.create({
      ...req.body,
      author: req.user._id,
      authorName: req.user.name,
    });
    await log('CREATE', `Posted announcement: "${ann.title}"`, req);
    res.status(201).json(ann);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route PUT /api/admin/announcements/:id
const updateAnnouncement = async (req, res) => {
  try {
    const ann = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!ann) return res.status(404).json({ message: 'Announcement not found' });
    await log('UPDATE', `Updated announcement: "${ann.title}"`, req);
    res.json(ann);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route DELETE /api/admin/announcements/:id
const deleteAnnouncement = async (req, res) => {
  try {
    const ann = await Announcement.findByIdAndDelete(req.params.id);
    if (!ann) return res.status(404).json({ message: 'Announcement not found' });
    await log('DELETE', `Deleted announcement: "${ann.title}"`, req);
    res.json({ message: 'Announcement deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement };
