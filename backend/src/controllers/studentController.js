const StudentProfile = require('../models/StudentProfile');
const User           = require('../models/User');
const Activity       = require('../models/Activity');

// helper: log activity
const log = (action, description, req) =>
  Activity.create({
    action,
    entity: 'student',
    description,
    performedBy: req.user?._id,
    performedByName: req.user?.name || 'Admin',
    icon: '👤',
  }).catch(() => {});

// @desc  Get all students (paginated, filtered, sorted)
// @route GET /api/admin/students
const getStudents = async (req, res) => {
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
        { studentId: { $regex: search, $options: 'i' } },
        { email:     { $regex: search, $options: 'i' } },
      ];
    }
    if (department) filter.department = department;
    if (status)     filter.status = status;

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (Number(page) - 1) * Number(limit);

    const [students, total] = await Promise.all([
      StudentProfile.find(filter)
        .populate('department', 'name code')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      StudentProfile.countDocuments(filter),
    ]);

    res.json({
      students,
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

// @desc  Get single student
// @route GET /api/admin/students/:id
const getStudent = async (req, res) => {
  try {
    const student = await StudentProfile.findById(req.params.id)
      .populate('department', 'name code')
      .populate('courses', 'name code');
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Create student
// @route POST /api/admin/students
const createStudent = async (req, res) => {
  try {
    const exists = await StudentProfile.findOne({ studentId: req.body.studentId });
    if (exists) return res.status(400).json({ message: 'Student ID already exists' });

    const cleanEmail = (req.body.email || '').trim().toLowerCase();
    let user = await User.findOne({ email: cleanEmail });
    if (!user) {
      user = await User.create({
        name: req.body.name,
        email: cleanEmail,
        password: req.body.password || 'Student@123',
        role: 'student',
      });
    } else if (user.role !== 'student') {
      user.role = 'student';
      await user.save();
    }

    const student = await StudentProfile.create({
      ...req.body,
      email: cleanEmail,
      user: user._id,
    });
    await log('CREATE', `Added student ${student.name} (${student.studentId})`, req);
    res.status(201).json(student);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Student ID or email already exists' });
    res.status(500).json({ message: err.message });
  }
};

// @desc  Update student
// @route PUT /api/admin/students/:id
const updateStudent = async (req, res) => {
  try {
    const student = await StudentProfile.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('department', 'name code');
    if (!student) return res.status(404).json({ message: 'Student not found' });
    await log('UPDATE', `Updated student ${student.name} (${student.studentId})`, req);
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Delete student
// @route DELETE /api/admin/students/:id
const deleteStudent = async (req, res) => {
  try {
    const student = await StudentProfile.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    await log('DELETE', `Removed student ${student.name} (${student.studentId})`, req);
    res.json({ message: 'Student deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getStudents, getStudent, createStudent, updateStudent, deleteStudent };
