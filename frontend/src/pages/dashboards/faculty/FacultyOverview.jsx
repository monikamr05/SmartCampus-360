import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../services/api';
import './FacultyOverview.css';

const setTitle = (t) => { const el = document.getElementById('fc-page-title'); if (el) el.textContent = t; };
const timeAgo = (d) => {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const StatCard = ({ icon, label, value, sub, color, to }) => (
  <div className={`fc-stat-card fc-stat-card--${color}`}>
    <div className="fc-stat-card__icon">{icon}</div>
    <div className="fc-stat-card__body">
      <span className="fc-stat-card__value">{value ?? '—'}</span>
      <span className="fc-stat-card__label">{label}</span>
      {sub && <span className="fc-stat-card__sub">{sub}</span>}
    </div>
    {to && <Link to={to} className="fc-stat-card__link" aria-label={`Go to ${label}`}>→</Link>}
  </div>
);

const FacultyOverview = () => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    setTitle('Overview');
    api.get('/faculty/dashboard')
      .then(r => setData(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="fc-loading"><div className="fc-loading__spinner"/><span>Loading dashboard…</span></div>;
  if (error)   return <div className="fc-error"><span>⚠️</span><div><strong>Failed to load</strong><p>{error}</p></div></div>;

  const { profile, stats, recentActivity } = data;

  return (
    <div className="fc-page ov-page">

      {/* Profile hero */}
      <div className="fc-hero">
        <div className="fc-hero__avatar">
          {profile.name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
        </div>
        <div className="fc-hero__info">
          <h1 className="fc-hero__name">{profile.name}</h1>
          <div className="fc-hero__meta">
            <span>🏷️ {profile.facultyId}</span>
            <span>🎓 {profile.designation}</span>
            <span>🏛️ {profile.department?.name || '—'}</span>
            <span>📧 {profile.email}</span>
            {profile.specialization && <span>🔬 {profile.specialization}</span>}
            {profile.experience > 0 && <span>📅 {profile.experience} yr{profile.experience !== 1 ? 's' : ''} exp.</span>}
          </div>
        </div>
        <div className="fc-hero__quals">
          {profile.qualification && (
            <span className="fc-hero__qual-badge">{profile.qualification}</span>
          )}
          <span className={`fc-hero__status fc-hero__status--${profile.status}`}>{profile.status}</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="fc-stats-grid">
        <StatCard icon="📚" label="Assigned Courses"  value={stats.assignedCourses}     color="amber"  to="/dashboard/faculty/courses" />
        <StatCard icon="👨‍🎓" label="Total Students"  value={stats.totalStudents}        color="blue"   to="/dashboard/faculty/courses" />
        <StatCard icon="📝" label="Assignments"        value={stats.totalAssignments}     color="purple" to="/dashboard/faculty/assignments" />
        <StatCard icon="⏳" label="Pending Grading"    value={stats.pendingGrading}       color={stats.pendingGrading > 0 ? 'orange' : 'green'} to="/dashboard/faculty/assignments" sub={stats.pendingGrading > 0 ? 'Need grading' : 'All caught up'} />
        <StatCard icon="⚠️" label="Low Attendance"    value={stats.lowAttendanceCount}   color={stats.lowAttendanceCount > 0 ? 'red' : 'green'} to="/dashboard/faculty/attendance" sub="< 75%" />
        <StatCard icon="📊" label="Avg Class GPA"      value={stats.avgClassGpa?.toFixed(2)} color="teal" to="/dashboard/faculty/performance" />
      </div>

      {/* Quick links row */}
      <div className="fc-quick-links">
        {[
          { to: '/dashboard/faculty/attendance',   icon: '✅', label: 'Mark Attendance' },
          { to: '/dashboard/faculty/marks',        icon: '📋', label: 'Enter Marks' },
          { to: '/dashboard/faculty/assignments',  icon: '➕', label: 'New Assignment' },
          { to: '/dashboard/faculty/performance',  icon: '📈', label: 'View Reports' },
          { to: '/dashboard/faculty/announcements',icon: '📢', label: 'Post Announcement' },
        ].map(({ to, icon, label }) => (
          <Link key={to} to={to} className="fc-quick-link">
            <span className="fc-quick-link__icon">{icon}</span>
            <span className="fc-quick-link__label">{label}</span>
          </Link>
        ))}
      </div>

      <div className="fc-bottom-row">
        {/* Assigned courses mini list */}
        <div className="fc-panel">
          <div className="fc-panel__header">
            <div className="fc-panel__title">My Courses</div>
            <Link to="/dashboard/faculty/courses" className="fc-see-all">See all →</Link>
          </div>
          {profile.courses?.length === 0
            ? <p className="fc-empty">No courses assigned yet.</p>
            : (
              <ul className="fc-course-list">
                {profile.courses.slice(0, 6).map(c => (
                  <li key={c._id} className="fc-course-item">
                    <div className="fc-course-item__info">
                      <span className="fc-course-item__code">{c.code}</span>
                      <span className="fc-course-item__name">{c.name}</span>
                    </div>
                    <div className="fc-course-item__right">
                      <span className="fc-badge fc-badge--amber">{c.semester}</span>
                      <span className="fc-badge fc-badge--blue">{c.credits} cr</span>
                    </div>
                  </li>
                ))}
              </ul>
            )
          }
        </div>

        {/* Recent activity */}
        <div className="fc-panel">
          <div className="fc-panel__header">
            <div className="fc-panel__title">Recent Activity</div>
          </div>
          {recentActivity.length === 0
            ? <p className="fc-empty">No activity yet.</p>
            : (
              <ul className="fc-activity-list">
                {recentActivity.map(act => (
                  <li key={act._id} className="fc-activity-item">
                    <span className="fc-activity-item__icon">{act.icon}</span>
                    <div className="fc-activity-item__body">
                      <span className="fc-activity-item__desc">{act.description}</span>
                      <span className="fc-activity-item__meta">{timeAgo(act.createdAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )
          }
        </div>
      </div>
    </div>
  );
};

export default FacultyOverview;
