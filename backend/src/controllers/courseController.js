const Course     = require('../models/Course');
const Activity   = require('../models/Activity');

const log = (action, description, req) =>
  Activity.create({
    action,
    entity: 'course',
    description,
    performedBy: req.user?._id,
    performedByName: req.user?.name || 'Admin',
    icon: '📚',
  }).catch(() => {});

// @route GET /api/admin/courses
const getCourses = async (req, res) => {
  try {
    const { search = '', department = '', semester = '', page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const filter = {};
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
    ];
    if (department) filter.department = department;
    if (semester)   filter.semester   = semester;

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (Number(page) - 1) * Number(limit);

    const [courses, total] = await Promise.all([
      Course.find(filter).populate('department', 'name code').sort(sort).skip(skip).limit(Number(limit)).lean(),
      Course.countDocuments(filter),
    ]);

    res.json({ courses, pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route POST /api/admin/courses
const createCourse = async (req, res) => {
  try {
    const course = await Course.create(req.body);
    await log('CREATE', `Created course ${course.name} (${course.code})`, req);
    const populated = await course.populate('department', 'name code');
    res.status(201).json(populated);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Course code already exists' });
    res.status(500).json({ message: err.message });
  }
};

// @route PUT /api/admin/courses/:id
const updateCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('department', 'name code');
    if (!course) return res.status(404).json({ message: 'Course not found' });
    await log('UPDATE', `Updated course ${course.name} (${course.code})`, req);
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route DELETE /api/admin/courses/:id
const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    await log('DELETE', `Deleted course ${course.name} (${course.code})`, req);
    res.json({ message: 'Course deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getCourses, createCourse, updateCourse, deleteCourse };
