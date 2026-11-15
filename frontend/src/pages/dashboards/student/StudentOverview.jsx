import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';
import api from '../../../services/api';
import './StudentOverview.css';
import '../../../pages/dashboards/student/StudentLayout.css';

/* ── helpers ── */
const setTitle = (t) => {
  const el = document.getElementById('st-page-title');
  if (el) el.textContent = t;
};

const timeAgo = (d) => {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const PRIORITY_STYLE = {
  low:    { bg: '#f0fdf4', color: '#16a34a' },
  normal: { bg: '#eff6ff', color: '#2563eb' },
  high:   { bg: '#fff7ed', color: '#ea580c' },
  urgent: { bg: '#fef2f2', color: '#dc2626' },
};

const CAT_ICON = {
  academic: '📖', cultural: '🎭', sports: '🏆',
  seminar: '🎤', workshop: '🛠️', holiday: '🎉',
  exam: '📝', other: '📌',
};

/* ── Attendance ring ── */
const AttendanceRing = ({ pct }) => {
  const color = pct >= 85 ? '#059669' : pct >= 75 ? '#d97706' : '#dc2626';
  return (
    <div className="att-ring">
      <ResponsiveContainer width={140} height={140}>
        <RadialBarChart
          innerRadius={52} outerRadius={68}
          startAngle={90} endAngle={-270}
          data={[{ value: pct, fill: color }]}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" cornerRadius={8} background={{ fill: '#f1f5f9' }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="att-ring__center">
        <span className="att-ring__pct" style={{ color }}>{pct}%</span>
        <span className="att-ring__label">Attendance</span>
      </div>
    </div>
  );
};

/* ── Component ── */
const StudentOverview = () => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    setTitle('Overview');
    api.get('/student/dashboard')
      .then(r => setData(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="st-loading" role="status">
      <div className="st-loading__spinner"/><span>Loading your dashboard…</span>
    </div>
  );
  if (error) return (
    <div className="st-error" role="alert">
      <span>⚠️</span>
      <div><strong>Failed to load dashboard</strong><p>{error}</p></div>
    </div>
  );

  const { profile, stats, shortageSubjects, pendingAssignments, latestResults, upcomingEvents, announcements } = data;

  return (
    <div className="st-page ov-page">

      {/* ── Profile hero ── */}
      <div className="ov-hero">
        <div className="ov-hero__avatar">{profile.name?.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()}</div>
        <div className="ov-hero__info">
          <h1 className="ov-hero__name">{profile.name}</h1>
          <div className="ov-hero__meta">
            <span>🎓 {profile.studentId}</span>
            <span>🏛️ {profile.department?.name || '—'}</span>
            <span>📅 Semester {profile.semester}</span>
            <span>📧 {profile.email}</span>
          </div>
        </div>
        <div className="ov-hero__ring">
          <AttendanceRing pct={stats.overallAttendance} />
        </div>
      </div>

      {/* ── Attendance shortage warning banner ── */}
      {shortageSubjects.length > 0 && (
        <div className="ov-warning" role="alert">
          <span className="ov-warning__icon">⚠️</span>
          <div className="ov-warning__body">
            <strong>Attendance Shortage Warning</strong>
            <p>
              You have low attendance in{' '}
              <strong>{shortageSubjects.length} subject{shortageSubjects.length > 1 ? 's' : ''}</strong>:{' '}
              {shortageSubjects.map(s => `${s.courseName} (${s.percentage}%)`).join(', ')}.
              Minimum required is 75%.
            </p>
          </div>
          <Link to="/dashboard/student/attendance" className="ov-warning__link">View Details →</Link>
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="ov-stats">
        {[
          { icon: '📊', label: 'Overall GPA',    value: Number(stats.gpa).toFixed(2),    color: 'green' },
          { icon: '📚', label: 'Courses',         value: stats.totalCourses,              color: 'teal'  },
          { icon: '📝', label: 'Pending Tasks',   value: pendingAssignments.length,       color: stats.pendingAssignments?.length ? 'orange' : 'green' },
          { icon: '🏅', label: 'Semester',        value: `Sem ${stats.semester}`,         color: 'blue'  },
        ].map(c => (
          <div key={c.label} className={`ov-stat ov-stat--${c.color}`}>
            <span className="ov-stat__icon">{c.icon}</span>
            <div className="ov-stat__body">
              <span className="ov-stat__value">{c.value}</span>
              <span className="ov-stat__label">{c.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── 2-column grid ── */}
      <div className="ov-grid">

        {/* Pending assignments */}
        <div className="st-panel">
          <div className="st-panel__header">
            <div>
              <div className="st-panel__title">Pending Assignments</div>
              <div className="st-panel__sub">Due soon</div>
            </div>
            <Link to="/dashboard/student/assignments" className="ov-see-all">See all →</Link>
          </div>
          {pendingAssignments.length === 0
            ? <p className="st-empty">🎉 No pending assignments!</p>
            : (
              <ul className="ov-assign-list">
                {pendingAssignments.map(a => {
                  const daysLeft = Math.ceil((new Date(a.dueDate) - Date.now()) / 86400000);
                  return (
                    <li key={a._id} className="ov-assign-item">
                      <span className={`ov-assign-type ov-assign-type--${a.type}`}>{a.type}</span>
                      <div className="ov-assign-info">
                        <span className="ov-assign-title">{a.title}</span>
                        <span className="ov-assign-course">{a.courseName}</span>
                      </div>
                      <span className={`ov-assign-due ${daysLeft <= 2 ? 'ov-assign-due--urgent' : ''}`}>
                        {daysLeft <= 0 ? 'Today' : `${daysLeft}d`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )
          }
        </div>

        {/* Latest results */}
        <div className="st-panel">
          <div className="st-panel__header">
            <div>
              <div className="st-panel__title">Recent Results</div>
              <div className="st-panel__sub">Latest published grades</div>
            </div>
            <Link to="/dashboard/student/results" className="ov-see-all">See all →</Link>
          </div>
          {latestResults.length === 0
            ? <p className="st-empty">No results published yet.</p>
            : (
              <ul className="ov-results-list">
                {latestResults.map(r => (
                  <li key={r._id} className="ov-result-item">
                    <div className="ov-result-info">
                      <span className="ov-result-name">{r.courseName}</span>
                      <span className="ov-result-code">{r.courseCode} · Sem {r.semester}</span>
                    </div>
                    <div className="ov-result-right">
                      <span className={`ov-grade ov-grade--${r.grade?.replace('+','p')?.toLowerCase()}`}>{r.grade || '—'}</span>
                      <span className={`ov-pass ${r.isPassed ? 'ov-pass--pass' : 'ov-pass--fail'}`}>{r.isPassed ? 'Pass' : 'Fail'}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )
          }
        </div>

        {/* Upcoming events */}
        <div className="st-panel">
          <div className="st-panel__header">
            <div>
              <div className="st-panel__title">Upcoming Events</div>
              <div className="st-panel__sub">Next 30 days</div>
            </div>
            <Link to="/dashboard/student/events" className="ov-see-all">See all →</Link>
          </div>
          {upcomingEvents.length === 0
            ? <p className="st-empty">No upcoming events.</p>
            : (
              <ul className="ov-event-list">
                {upcomingEvents.map(ev => (
                  <li key={ev._id} className="ov-event-item">
                    <div className="ov-event-icon">{CAT_ICON[ev.category] || '📌'}</div>
                    <div className="ov-event-info">
                      <span className="ov-event-title">{ev.title}</span>
                      <span className="ov-event-meta">{fmtDate(ev.startDate)}{ev.venue ? ` · ${ev.venue}` : ''}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )
          }
        </div>

        {/* Announcements */}
        <div className="st-panel">
          <div className="st-panel__header">
            <div>
              <div className="st-panel__title">Announcements</div>
              <div className="st-panel__sub">Latest campus notices</div>
            </div>
            <Link to="/dashboard/student/announcements" className="ov-see-all">See all →</Link>
          </div>
          {announcements.length === 0
            ? <p className="st-empty">No announcements yet.</p>
            : (
              <ul className="ov-ann-list">
                {announcements.map(a => {
                  const ps = PRIORITY_STYLE[a.priority] || PRIORITY_STYLE.normal;
                  return (
                    <li key={a._id} className="ov-ann-item">
                      <div className="ov-ann-header">
                        <span className="ov-ann-title">{a.title}</span>
                        <span className="ov-ann-badge" style={{ background: ps.bg, color: ps.color }}>
                          {a.priority}
                        </span>
                      </div>
                      <p className="ov-ann-content">{a.content}</p>
                      <span className="ov-ann-meta">{a.authorName} · {timeAgo(a.createdAt)}</span>
                    </li>
                  );
                })}
              </ul>
            )
          }
        </div>
      </div>
    </div>
  );
};

export default StudentOverview;
