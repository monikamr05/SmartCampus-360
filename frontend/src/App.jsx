import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute              from './routes/PrivateRoute';
import RoleRoute                 from './routes/RoleRoute';

// Public layout
import Navbar      from './components/Navbar';
import Footer      from './components/Footer';

// Public pages
import Home         from './pages/Home';
import About        from './pages/About';
import FeaturesPage from './pages/FeaturesPage';
import Login        from './pages/Login';
import NotFound     from './pages/NotFound';

// ── Admin dashboard ───────────────────────────────────────────────────────────
import AdminLayout        from './pages/dashboards/admin/AdminLayout';
import AdminOverview      from './pages/dashboards/admin/AdminOverview';
import AdminStudents      from './pages/dashboards/admin/AdminStudents';
import AdminFaculty       from './pages/dashboards/admin/AdminFaculty';
import AdminDepartments   from './pages/dashboards/admin/AdminDepartments';
import AdminCourses       from './pages/dashboards/admin/AdminCourses';
import AdminAnnouncements from './pages/dashboards/admin/AdminAnnouncements';
import AdminTimetable     from './pages/dashboards/admin/AdminTimetable';
import AdminAttendance    from './pages/dashboards/admin/AdminAttendance';
import AdminExaminations  from './pages/dashboards/admin/AdminExaminations';
import AdminAnalytics     from './pages/dashboards/admin/AdminAnalytics';
import AdminEvents        from './pages/dashboards/admin/AdminEvents';
import AdminLibrary       from './pages/dashboards/admin/AdminLibrary';

// ── Faculty dashboard ─────────────────────────────────────────────────────────
import FacultyLayout        from './pages/dashboards/faculty/FacultyLayout';
import FacultyOverview      from './pages/dashboards/faculty/FacultyOverview';
import FacultyCourses       from './pages/dashboards/faculty/FacultyCourses';
import FacultyAttendance    from './pages/dashboards/faculty/FacultyAttendance';
import FacultyMarks         from './pages/dashboards/faculty/FacultyMarks';
import FacultyAssignments   from './pages/dashboards/faculty/FacultyAssignments';
import FacultyPerformance   from './pages/dashboards/faculty/FacultyPerformance';
import FacultyAnnouncements from './pages/dashboards/faculty/FacultyAnnouncements';
import FacultyAnalytics     from './pages/dashboards/faculty/FacultyAnalytics';

// ── Student dashboard ─────────────────────────────────────────────────────────
import StudentLayout        from './pages/dashboards/student/StudentLayout';
import StudentOverview      from './pages/dashboards/student/StudentOverview';
import StudentAttendance    from './pages/dashboards/student/StudentAttendance';
import StudentResults       from './pages/dashboards/student/StudentResults';
import StudentTimetable     from './pages/dashboards/student/StudentTimetable';
import StudentAssignments   from './pages/dashboards/student/StudentAssignments';
import StudentEvents        from './pages/dashboards/student/StudentEvents';
import StudentAnnouncements from './pages/dashboards/student/StudentAnnouncements';
import StudentAnalytics     from './pages/dashboards/student/StudentAnalytics';
import StudentNotifications from './pages/dashboards/student/StudentNotifications';
import StudentLibrary       from './pages/dashboards/student/StudentLibrary';

import './styles/App.css';

// ── Public wrapper ────────────────────────────────────────────────────────────
const PublicLayout = ({ children }) => (
  <div className="app">
    <Navbar />
    <main className="app__main">{children}</main>
    <Footer />
  </div>
);

// ── Role-based /dashboard redirect ───────────────────────────────────────────
const DashboardRedirect = () => {
  const { user } = useAuth();
  const map = {
    admin:   '/dashboard/admin',
    faculty: '/dashboard/faculty',
    student: '/dashboard/student',
  };
  return <Navigate to={map[user?.role] || '/'} replace />;
};

// ── All routes ────────────────────────────────────────────────────────────────
const AppRoutes = () => (
  <Routes>

    {/* ── Public ──────────────────────────────────────────────────────────── */}
    <Route path="/"         element={<PublicLayout><Home /></PublicLayout>} />
    <Route path="/about"    element={<PublicLayout><About /></PublicLayout>} />
    <Route path="/features" element={<PublicLayout><FeaturesPage /></PublicLayout>} />
    <Route path="/login"    element={<PublicLayout><Login /></PublicLayout>} />

    {/* Smart /dashboard redirect */}
    <Route path="/dashboard" element={<PrivateRoute><DashboardRedirect /></PrivateRoute>} />

    {/* ── Admin dashboard ─────────────────────────────────────────────────── */}
    <Route
      path="/dashboard/admin"
      element={
        <PrivateRoute>
          <RoleRoute roles={['admin']}>
            <AdminLayout />
          </RoleRoute>
        </PrivateRoute>
      }
    >
      <Route index                    element={<AdminOverview />} />
      <Route path="students"          element={<AdminStudents />} />
      <Route path="faculty"           element={<AdminFaculty />} />
      <Route path="departments"       element={<AdminDepartments />} />
      <Route path="courses"           element={<AdminCourses />} />
      <Route path="announcements"     element={<AdminAnnouncements />} />
      <Route path="timetable"         element={<AdminTimetable />} />
      <Route path="attendance"        element={<AdminAttendance />} />
      <Route path="examinations"      element={<AdminExaminations />} />
      <Route path="analytics"         element={<AdminAnalytics />} />
      <Route path="events"            element={<AdminEvents />} />
      <Route path="library"           element={<AdminLibrary />} />
    </Route>

    {/* ── Faculty dashboard ───────────────────────────────────────────────── */}
    <Route
      path="/dashboard/faculty"
      element={
        <PrivateRoute>
          <RoleRoute roles={['faculty']}>
            <FacultyLayout />
          </RoleRoute>
        </PrivateRoute>
      }
    >
      <Route index                    element={<FacultyOverview />} />
      <Route path="courses"           element={<FacultyCourses />} />
      <Route path="attendance"        element={<FacultyAttendance />} />
      <Route path="marks"             element={<FacultyMarks />} />
      <Route path="assignments"       element={<FacultyAssignments />} />
      <Route path="performance"       element={<FacultyPerformance />} />
      <Route path="announcements"     element={<FacultyAnnouncements />} />
      <Route path="analytics"         element={<FacultyAnalytics />} />
    </Route>

    {/* ── Student dashboard ───────────────────────────────────────────────── */}
    <Route
      path="/dashboard/student"
      element={
        <PrivateRoute>
          <RoleRoute roles={['student']}>
            <StudentLayout />
          </RoleRoute>
        </PrivateRoute>
      }
    >
      <Route index                    element={<StudentOverview />} />
      <Route path="attendance"        element={<StudentAttendance />} />
      <Route path="results"           element={<StudentResults />} />
      <Route path="timetable"         element={<StudentTimetable />} />
      <Route path="assignments"       element={<StudentAssignments />} />
      <Route path="events"            element={<StudentEvents />} />
      <Route path="announcements"     element={<StudentAnnouncements />} />
      <Route path="analytics"         element={<StudentAnalytics />} />
      <Route path="notifications"     element={<StudentNotifications />} />
      <Route path="library"           element={<StudentLibrary />} />
    </Route>

    {/* ── 404 ─────────────────────────────────────────────────────────────── */}
    <Route path="*" element={<PublicLayout><NotFound /></PublicLayout>} />

  </Routes>
);

const App = () => (
  <AuthProvider>
    <Router>
      <AppRoutes />
    </Router>
  </AuthProvider>
);

export default App;
