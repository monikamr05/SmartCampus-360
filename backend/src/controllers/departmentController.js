const Department     = require('../models/Department');
const StudentProfile = require('../models/StudentProfile');
const FacultyProfile = require('../models/FacultyProfile');
const Activity       = require('../models/Activity');

const log = (action, description, req) =>
  Activity.create({
    action,
    entity: 'department',
    description,
    performedBy: req.user?._id,
    performedByName: req.user?.name || 'Admin',
    icon: '🏛️',
  }).catch(() => {});

// @route GET /api/admin/departments
const getDepartments = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const filter = {};
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
    ];

    const skip = (Number(page) - 1) * Number(limit);
    const [departments, total] = await Promise.all([
      Department.find(filter).sort({ name: 1 }).skip(skip).limit(Number(limit)).lean(),
      Department.countDocuments(filter),
    ]);

    // Attach live counts
    const withCounts = await Promise.all(
      departments.map(async (dept) => {
        const [sCount, fCount] = await Promise.all([
          StudentProfile.countDocuments({ department: dept._id }),
          FacultyProfile.countDocuments({ department: dept._id }),
        ]);
        return { ...dept, studentCount: sCount, facultyCount: fCount };
      })
    );

    res.json({ departments: withCounts, pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route GET /api/admin/departments/all  — lightweight list for dropdowns
const getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true }).select('name code').sort({ name: 1 }).lean();
    res.json(departments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route POST /api/admin/departments
const createDepartment = async (req, res) => {
  try {
    const dept = await Department.create(req.body);
    await log('CREATE', `Created department ${dept.name} (${dept.code})`, req);
    res.status(201).json(dept);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Department name or code already exists' });
    res.status(500).json({ message: err.message });
  }
};

// @route PUT /api/admin/departments/:id
const updateDepartment = async (req, res) => {
  try {
    const dept = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    await log('UPDATE', `Updated department ${dept.name}`, req);
    res.json(dept);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Department name or code already exists' });
    res.status(500).json({ message: err.message });
  }
};

// @route DELETE /api/admin/departments/:id
const deleteDepartment = async (req, res) => {
  try {
    // Check if any students/faculty are assigned
    const [sCount, fCount] = await Promise.all([
      StudentProfile.countDocuments({ department: req.params.id }),
      FacultyProfile.countDocuments({ department: req.params.id }),
    ]);
    if (sCount > 0 || fCount > 0) {
      return res.status(400).json({ message: `Cannot delete — ${sCount} students and ${fCount} faculty are assigned to this department.` });
    }
    const dept = await Department.findByIdAndDelete(req.params.id);
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    await log('DELETE', `Deleted department ${dept.name}`, req);
    res.json({ message: 'Department deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getDepartments, getAllDepartments, createDepartment, updateDepartment, deleteDepartment };
