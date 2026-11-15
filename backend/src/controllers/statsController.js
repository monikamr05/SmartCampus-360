const StudentProfile = require('../models/StudentProfile');
const FacultyProfile = require('../models/FacultyProfile');
const Department     = require('../models/Department');
const Course         = require('../models/Course');
const Activity       = require('../models/Activity');
const Announcement   = require('../models/Announcement');

// @desc  Get dashboard overview stats
// @route GET /api/admin/stats
// @access Private/Admin
const getDashboardStats = async (req, res) => {
  try {
    const [
      totalStudents,
      activeStudents,
      totalFaculty,
      activeFaculty,
      totalDepartments,
      totalCourses,
      recentActivities,
      recentAnnouncements,
    ] = await Promise.all([
      StudentProfile.countDocuments(),
      StudentProfile.countDocuments({ status: 'active' }),
      FacultyProfile.countDocuments(),
      FacultyProfile.countDocuments({ status: 'active' }),
      Department.countDocuments({ isActive: true }),
      Course.countDocuments({ isActive: true }),
      Activity.find().sort({ createdAt: -1 }).limit(10).lean(),
      Announcement.find({ isActive: true }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    // Attendance distribution buckets
    const attendanceBuckets = await StudentProfile.aggregate([
      {
        $bucket: {
          groupBy: '$attendancePct',
          boundaries: [0, 60, 75, 85, 100.1],
          default: 'other',
          output: { count: { $sum: 1 } },
        },
      },
    ]);

    // Map bucket results
    const attendanceLabels = ['<60%', '60–74%', '75–84%', '85–100%'];
    const attendanceData = [0, 0, 0, 0];
    attendanceBuckets.forEach((b) => {
      if (b._id === 0)   attendanceData[0] = b.count;
      if (b._id === 60)  attendanceData[1] = b.count;
      if (b._id === 75)  attendanceData[2] = b.count;
      if (b._id === 85)  attendanceData[3] = b.count;
    });

    // GPA distribution
    const gpaBuckets = await StudentProfile.aggregate([
      {
        $bucket: {
          groupBy: '$gpa',
          boundaries: [0, 1, 2, 3, 3.5, 4.01],
          default: 'other',
          output: { count: { $sum: 1 } },
        },
      },
    ]);
    const gpaLabels = ['0–0.9', '1–1.9', '2–2.9', '3–3.4', '3.5–4.0'];
    const gpaData = [0, 0, 0, 0, 0];
    gpaBuckets.forEach((b) => {
      if (b._id === 0)   gpaData[0] = b.count;
      if (b._id === 1)   gpaData[1] = b.count;
      if (b._id === 2)   gpaData[2] = b.count;
      if (b._id === 3)   gpaData[3] = b.count;
      if (b._id === 3.5) gpaData[4] = b.count;
    });

    // Students per department
    const studentsByDept = await StudentProfile.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'dept' } },
      { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
      { $project: { name: { $ifNull: ['$dept.name', 'Unassigned'] }, count: 1 } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]);

    // Monthly enrollment trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const enrollmentTrend = await StudentProfile.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year:  { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const trendData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const found = enrollmentTrend.find(e => e._id.year === y && e._id.month === m);
      trendData.push({ month: monthNames[m - 1], enrollments: found ? found.count : 0 });
    }

    // Status breakdown for pie chart
    const statusBreakdown = await StudentProfile.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    res.json({
      overview: {
        totalStudents,
        activeStudents,
        totalFaculty,
        activeFaculty,
        totalDepartments,
        totalCourses,
      },
      charts: {
        attendanceDistribution: attendanceLabels.map((label, i) => ({
          label,
          value: attendanceData[i],
        })),
        gpaDistribution: gpaLabels.map((label, i) => ({
          label,
          value: gpaData[i],
        })),
        studentsByDept: studentsByDept.map(d => ({ name: d.name, students: d.count })),
        enrollmentTrend: trendData,
        statusBreakdown: statusBreakdown.map(s => ({ name: s._id, value: s.count })),
      },
      recentActivities,
      recentAnnouncements,
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getDashboardStats };
