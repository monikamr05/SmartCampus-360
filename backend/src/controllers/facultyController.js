const FacultyProfile = require('../models/FacultyProfile');
const User           = require('../models/User');
const Activity       = require('../models/Activity');

const log = (action, description, req) =>
  Activity.create({
    action,
    entity: 'faculty',
    description,
    performedBy: req.user?._id,
    performedByName: req.user?.name || 'Admin',
    icon: '🧑‍🏫',
  }).catch(() => {});

// @route GET /api/admin/faculty
const getFaculty = async (req, res) => {
  try {
    const {
      page = 1, limit = 10,
      search = '',
      department = '',
      status = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const filter = {};
    if (search) {
      filter.$or = [
        { name:      { $regex: search, $options: 'i' } },
        { facultyId: { $regex: search, $options: 'i' } },
        { email:     { $regex: search, $options: 'i' } },
      ];
    }
    if (department) filter.department = department;
    if (status)     filter.status = status;

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (Number(page) - 1) * Number(limit);

    const [faculty, total] = await Promise.all([
      FacultyProfile.find(filter)
        .populate('department', 'name code')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      FacultyProfile.countDocuments(filter),
    ]);

    res.json({
      faculty,
      pagination: {
        total,
        page:       Number(page),
        limit:      Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route GET /api/admin/faculty/:id
const getFacultyMember = async (req, res) => {
  try {
    const member = await FacultyProfile.findById(req.params.id)
      .populate('department', 'name code')
      .populate('courses', 'name code');
    if (!member) return res.status(404).json({ message: 'Faculty member not found' });
    res.json(member);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route POST /api/admin/faculty
const createFaculty = async (req, res) => {
  try {
    const exists = await FacultyProfile.findOne({ facultyId: req.body.facultyId });
    if (exists) return res.status(400).json({ message: 'Faculty ID already exists' });

    const cleanEmail = (req.body.email || '').trim().toLowerCase();
    let user = await User.findOne({ email: cleanEmail });
    if (!user) {
      user = await User.create({
        name: req.body.name,
        email: cleanEmail,
        password: req.body.password || 'Faculty@123',
        role: 'faculty',
      });
    } else if (user.role !== 'faculty') {
      user.role = 'faculty';
      await user.save();
    }

    const member = await FacultyProfile.create({
      ...req.body,
      email: cleanEmail,
      user: user._id,
    });
    await log('CREATE', `Added faculty ${member.name} (${member.facultyId})`, req);
    res.status(201).json(member);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Faculty ID or email already exists' });
    res.status(500).json({ message: err.message });
  }
};

// @route PUT /api/admin/faculty/:id
const updateFaculty = async (req, res) => {
  try {
    const member = await FacultyProfile.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('department', 'name code');
    if (!member) return res.status(404).json({ message: 'Faculty member not found' });
    await log('UPDATE', `Updated faculty ${member.name} (${member.facultyId})`, req);
    res.json(member);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route DELETE /api/admin/faculty/:id
const deleteFaculty = async (req, res) => {
  try {
    const member = await FacultyProfile.findByIdAndDelete(req.params.id);
    if (!member) return res.status(404).json({ message: 'Faculty member not found' });
    await log('DELETE', `Removed faculty ${member.name} (${member.facultyId})`, req);
    res.json({ message: 'Faculty member deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getFaculty, getFacultyMember, createFaculty, updateFaculty, deleteFaculty };
