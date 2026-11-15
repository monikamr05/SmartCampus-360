const express    = require('express');
const router     = express.Router();

const { protect }      = require('../middleware/authMiddleware');
const { requireRole }  = require('../middleware/roleMiddleware');

const { getDashboardStats }                                                     = require('../controllers/statsController');
const { getStudents, getStudent, createStudent, updateStudent, deleteStudent }  = require('../controllers/studentController');
const { getFaculty, getFacultyMember, createFaculty, updateFaculty, deleteFaculty } = require('../controllers/facultyController');
const { getDepartments, getAllDepartments, createDepartment, updateDepartment, deleteDepartment } = require('../controllers/departmentController');
const { getCourses, createCourse, updateCourse, deleteCourse }                  = require('../controllers/courseController');
const { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } = require('../controllers/announcementController');

// All routes below are admin-only
router.use(protect, requireRole('admin'));

// ── Stats ────────────────────────────────────────────────────────────────────
router.get('/stats', getDashboardStats);

// ── Students ─────────────────────────────────────────────────────────────────
router.route('/students')
  .get(getStudents)
  .post(createStudent);
router.route('/students/:id')
  .get(getStudent)
  .put(updateStudent)
  .delete(deleteStudent);

// ── Faculty ──────────────────────────────────────────────────────────────────
router.route('/faculty')
  .get(getFaculty)
  .post(createFaculty);
router.route('/faculty/:id')
  .get(getFacultyMember)
  .put(updateFaculty)
  .delete(deleteFaculty);

// ── Departments ───────────────────────────────────────────────────────────────
router.get('/departments/all', getAllDepartments);   // must come before /:id
router.route('/departments')
  .get(getDepartments)
  .post(createDepartment);
router.route('/departments/:id')
  .put(updateDepartment)
  .delete(deleteDepartment);

// ── Courses ───────────────────────────────────────────────────────────────────
router.route('/courses')
  .get(getCourses)
  .post(createCourse);
router.route('/courses/:id')
  .put(updateCourse)
  .delete(deleteCourse);

// ── Announcements ─────────────────────────────────────────────────────────────
router.route('/announcements')
  .get(getAnnouncements)
  .post(createAnnouncement);
router.route('/announcements/:id')
  .put(updateAnnouncement)
  .delete(deleteAnnouncement);

module.exports = router;
