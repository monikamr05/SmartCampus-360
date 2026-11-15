import React, { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import api from '../../../services/api';
import './AdminOverview.css';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const PIE_COLORS  = ['#2563eb', '#7c3aed', '#059669', '#d97706'];
const AREA_COLORS = { stroke: '#2563eb', fill: 'url(#areaGrad)' };

const StatCard = ({ icon, label, value, sub, color, trend }) => (
  <div className={`stat-card stat-card--${color}`}>
    <div className="stat-card__icon" aria-hidden="true">{icon}</div>
    <div className="stat-card__body">
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value">{value ?? '—'}</span>
      {sub  && <span className="stat-card__sub">{sub}</span>}
    </div>
    {trend !== undefined && (
      <div className={`stat-card__trend ${trend >= 0 ? 'stat-card__trend--up' : 'stat-card__trend--down'}`}>
        {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
      </div>
    )}
  </div>
);

const SectionHeader = ({ title, subtitle }) => (
  <div className="dash-section-header">
    <h2 className="dash-section-title">{title}</h2>
    {subtitle && <p className="dash-section-sub">{subtitle}</p>}
  </div>
);

const PRIORITY_STYLES = {
  low:    { bg: '#f0fdf4', color: '#16a34a', label: 'Low' },
  normal: { bg: '#eff6ff', color: '#2563eb', label: 'Normal' },
  high:   { bg: '#fff7ed', color: '#ea580c', label: 'High' },
  urgent: { bg: '#fef2f2', color: '#dc2626', label: 'Urgent' },
};

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

/* ─── Component ───────────────────────────────────────────────────────────── */
const AdminOverview = () => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    document.getElementById('page-title').textContent = 'Dashboard Overview';
    api.get('/admin/stats')
      .then(r => setData(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="dash-loading" role="status">
      <div className="dash-loading__spinner" /><span>Loading dashboard…</span>
    </div>
  );
  if (error) return (
    <div className="dash-error" role="alert">
      <span>⚠️</span>
      <div>
        <strong>Failed to load dashboard</strong>
        <p>{error}</p>
      </div>
    </div>
  );

  const { overview, charts, recentActivities, recentAnnouncements } = data;

  const statCards = [
    { icon: '👨‍🎓', label: 'Total Students',    value: overview.totalStudents,    sub: `${overview.activeStudents} active`,    color: 'blue',   trend: 8  },
    { icon: '🧑‍🏫', label: 'Total Faculty',     value: overview.totalFaculty,     sub: `${overview.activeFaculty} active`,     color: 'purple', trend: 3  },
    { icon: '🏛️', label: 'Departments',        value: overview.totalDepartments, sub: 'All active',                            color: 'cyan',   trend: 0  },
    { icon: '📚', label: 'Active Courses',     value: overview.totalCourses,     sub: 'This semester',                         color: 'green',  trend: 12 },
  ];

  return (
    <div className="admin-overview">

      {/* ── Stat cards ── */}
      <div className="stat-cards-grid">
        {statCards.map(c => <StatCard key={c.label} {...c} />)}
      </div>

      {/* ── Charts row 1 ── */}
      <div className="dash-charts-row">

        {/* Enrollment trend — area chart */}
        <div className="dash-chart-card dash-chart-card--wide">
          <SectionHeader title="Enrollment Trend" subtitle="New students added over the last 6 months" />
          <div className="dash-chart-wrap">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={charts.enrollmentTrend} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.18}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }} />
                <Area type="monotone" dataKey="enrollments" stroke="#2563eb" strokeWidth={2.5}
                  fill="url(#areaGrad)" dot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Student status — pie */}
        <div className="dash-chart-card">
          <SectionHeader title="Student Status" subtitle="Breakdown by enrolment status" />
          <div className="dash-chart-wrap dash-chart-wrap--pie">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={charts.statusBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  dataKey="value" nameKey="name" paddingAngle={3}>
                  {charts.statusBreakdown.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Charts row 2 ── */}
      <div className="dash-charts-row">

        {/* Students per department — bar */}
        <div className="dash-chart-card dash-chart-card--wide">
          <SectionHeader title="Students by Department" subtitle="Distribution across all departments" />
          <div className="dash-chart-wrap">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.studentsByDept} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="students" radius={[6,6,0,0]}>
                  {charts.studentsByDept.map((_, i) => (
                    <Cell key={i} fill={i % 2 === 0 ? '#2563eb' : '#7c3aed'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attendance distribution — bar */}
        <div className="dash-chart-card">
          <SectionHeader title="Attendance Distribution" />
          <div className="dash-chart-wrap">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={charts.attendanceDistribution} layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={55} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="value" radius={[0,6,6,0]}>
                  {charts.attendanceDistribution.map((_, i) => (
                    <Cell key={i} fill={['#ef4444','#f97316','#eab308','#22c55e'][i] || '#2563eb'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Bottom row: Activity + Announcements ── */}
      <div className="dash-bottom-row">

        {/* Recent activities */}
        <div className="dash-panel">
          <SectionHeader title="Recent Activity" subtitle="Latest administrative actions" />
          {recentActivities.length === 0 ? (
            <p className="dash-empty">No activity yet.</p>
          ) : (
            <ul className="activity-list">
              {recentActivities.map(act => (
                <li key={act._id} className="activity-item">
                  <span className="activity-item__icon" aria-hidden="true">{act.icon}</span>
                  <div className="activity-item__body">
                    <span className="activity-item__desc">{act.description}</span>
                    <span className="activity-item__meta">
                      {act.performedByName} · {timeAgo(act.createdAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Announcements */}
        <div className="dash-panel">
          <SectionHeader title="Announcements" subtitle="Latest campus-wide posts" />
          {recentAnnouncements.length === 0 ? (
            <p className="dash-empty">No announcements yet.</p>
          ) : (
            <ul className="ann-list">
              {recentAnnouncements.map(ann => {
                const ps = PRIORITY_STYLES[ann.priority] || PRIORITY_STYLES.normal;
                return (
                  <li key={ann._id} className="ann-item">
                    <div className="ann-item__header">
                      <span className="ann-item__title">{ann.title}</span>
                      <span className="ann-item__badge"
                        style={{ background: ps.bg, color: ps.color }}>
                        {ps.label}
                      </span>
                    </div>
                    <p className="ann-item__content">{ann.content}</p>
                    <span className="ann-item__meta">
                      {ann.authorName} · {timeAgo(ann.createdAt)} · For: {ann.audience}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
