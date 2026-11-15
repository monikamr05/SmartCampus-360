import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import NotificationBell from '../../../components/NotificationBell';
import GlobalSearch     from '../../../components/GlobalSearch';
import './StudentLayout.css';

const NAV_ITEMS = [
  {
    to: '/dashboard/student', end: true, label: 'Overview',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  },
  {
    to: '/dashboard/student/attendance', label: 'Attendance',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  },
  {
    to: '/dashboard/student/results', label: 'Results',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  },
  {
    to: '/dashboard/student/timetable', label: 'Timetable',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  },
  {
    to: '/dashboard/student/assignments', label: 'Assignments',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  },
  {
    to: '/dashboard/student/events', label: 'Events',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  },
  {
    to: '/dashboard/student/announcements', label: 'Announcements',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  },
  {
    to: '/dashboard/student/analytics', label: 'Analytics',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><path d="M2 20h20"/></svg>,
  },
  {
    to: '/dashboard/student/library', label: 'Library',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
  },
  {
    to: '/dashboard/student/notifications', label: 'Notifications',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  },
];

const StudentLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'ST';

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div className="st-layout">

      {/* ── Sidebar ── */}
      <aside className={`st-sidebar ${sidebarOpen ? 'st-sidebar--open' : ''}`}>
        <div className="st-sidebar__brand">
          <div className="st-sidebar__brand-icon">
            <svg viewBox="0 0 36 36" fill="none">
              <rect width="36" height="36" rx="9" fill="url(#stGrad)"/>
              <path d="M18 7L29 13V23L18 29L7 23V13Z" fill="none" stroke="white" strokeWidth="2"/>
              <circle cx="18" cy="18" r="3.5" fill="white"/>
              <defs>
                <linearGradient id="stGrad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#059669"/><stop offset="1" stopColor="#0891b2"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="st-sidebar__brand-text">
            <span className="st-sidebar__brand-name">SmartCampus</span>
            <span className="st-sidebar__brand-sub">Student Portal</span>
          </div>
        </div>

        <nav className="st-sidebar__nav" aria-label="Student navigation">
          <span className="st-sidebar__section-label">Navigation</span>
          {NAV_ITEMS.map(({ to, label, icon, end }) => (
            <NavLink
              key={to} to={to} end={end}
              className={({ isActive }) =>
                `st-sidebar__link ${isActive ? 'st-sidebar__link--active' : ''}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <span className="st-sidebar__link-icon">{icon}</span>
              <span className="st-sidebar__link-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="st-sidebar__footer">
          <div className="st-sidebar__user">
            <div className="st-sidebar__avatar">{initials}</div>
            <div className="st-sidebar__user-info">
              <span className="st-sidebar__user-name">{user?.name}</span>
              <span className="st-sidebar__user-role">Student</span>
            </div>
          </div>
          <button className="st-sidebar__logout" onClick={handleLogout} aria-label="Sign out">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" width="17" height="17">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="st-sidebar__overlay" onClick={() => setSidebarOpen(false)} aria-hidden="true"/>
      )}

      {/* ── Main ── */}
      <div className="st-main">
        <header className="st-topbar">
          <button className="st-topbar__toggle" onClick={() => setSidebarOpen(o => !o)} aria-label="Toggle sidebar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div className="st-topbar__title" id="st-page-title" aria-live="polite"/>
          <div className="st-topbar__right">
            <GlobalSearch placeholder="Search books, events…" />
            <NotificationBell dashboardBase="/dashboard/student" />
            <span className="st-topbar__date">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <div className="st-topbar__avatar">{initials}</div>
          </div>
        </header>
        <main className="st-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default StudentLayout;
