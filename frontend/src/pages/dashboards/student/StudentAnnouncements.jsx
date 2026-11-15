import React, { useEffect, useState } from 'react';
import api from '../../../services/api';
import './StudentAnnouncements.css';

const setTitle = (t) => { const el = document.getElementById('st-page-title'); if (el) el.textContent = t; };

const PRIORITY_META = {
  low:    { label: 'Low',    bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
  normal: { label: 'Normal', bg: '#eff6ff', color: '#2563eb', border: '#93c5fd' },
  high:   { label: 'High',   bg: '#fff7ed', color: '#ea580c', border: '#fdba74' },
  urgent: { label: 'Urgent', bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
};

const timeAgo = (d) => {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const StudentAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [priority,  setPriority]  = useState('');
  const [search,    setSearch]    = useState('');
  const [expanded,  setExpanded]  = useState(null);

  useEffect(() => { setTitle('Announcements'); }, []);

  useEffect(() => {
    setLoading(true);
    api.get('/student/announcements')
      .then(r => setAnnouncements(r.data.announcements))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = announcements
    .filter(a => !priority || a.priority === priority)
    .filter(a =>
      !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase())
    );

  const urgentCount = announcements.filter(a => a.priority === 'urgent').length;

  if (error) return <div className="st-error"><span>⚠️</span><div><strong>Error</strong><p>{error}</p></div></div>;

  return (
    <div className="st-page ann-page">

      <div className="st-page-header">
        <div className="st-page-header__left">
          <h1 className="st-page-title">Announcements</h1>
          <p className="st-page-sub">
            {announcements.length} notice{announcements.length !== 1 ? 's' : ''}
            {urgentCount > 0 && ` · ${urgentCount} urgent`}
          </p>
        </div>
      </div>

      {/* Urgent banner */}
      {urgentCount > 0 && (
        <div className="ann-urgent-banner" role="alert">
          <span>🚨</span>
          <div>
            <strong>You have {urgentCount} urgent announcement{urgentCount > 1 ? 's' : ''}.</strong>
            <p>Please read them carefully below.</p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="ann-toolbar">
        <div className="asgn-search" style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position:'absolute', left:'0.75rem', top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" placeholder="Search announcements…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ width:'100%', padding:'0.6rem 0.75rem 0.6rem 2.25rem', border:'1.5px solid var(--border)', borderRadius:'var(--radius-md)', fontSize:'0.875rem', fontFamily:'var(--font-sans)', outline:'none', background:'var(--gray-50)', transition:'var(--transition)' }} />
        </div>
        <div className="ann-priority-tabs">
          {['', 'urgent', 'high', 'normal', 'low'].map(p => {
            const m = p ? PRIORITY_META[p] : null;
            return (
              <button
                key={p || 'all'}
                className={`ann-priority-btn ${priority === p ? 'ann-priority-btn--active' : ''}`}
                style={priority === p && m ? { background: m.bg, color: m.color, borderColor: m.border } : {}}
                onClick={() => setPriority(p)}
              >
                {p ? m.label : 'All'}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="st-loading"><div className="st-loading__spinner"/><span>Loading announcements…</span></div>
      ) : filtered.length === 0 ? (
        <div className="st-panel"><p className="st-empty">📭 No announcements found.</p></div>
      ) : (
        <div className="ann-list">
          {filtered.map(a => {
            const m = PRIORITY_META[a.priority] || PRIORITY_META.normal;
            const isOpen = expanded === a._id;
            return (
              <div key={a._id}
                className={`ann-card ann-card--${a.priority}`}
                style={{ borderLeft: `3px solid ${m.border}` }}
              >
                <div
                  className="ann-card__header"
                  onClick={() => setExpanded(isOpen ? null : a._id)}
                  role="button" tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && setExpanded(isOpen ? null : a._id)}
                >
                  <div className="ann-card__header-left">
                    <span className="ann-card__priority-badge"
                      style={{ background: m.bg, color: m.color }}>
                      {a.priority === 'urgent' && '🚨 '}
                      {a.priority === 'high'   && '⚠️ '}
                      {m.label}
                    </span>
                    <h3 className="ann-card__title">{a.title}</h3>
                    <div className="ann-card__meta">
                      <span>By {a.authorName}</span>
                      <span>·</span>
                      <span>{timeAgo(a.createdAt)}</span>
                      <span>·</span>
                      <span>For: {a.audience}</span>
                    </div>
                  </div>
                  <svg className={`ann-card__chevron ${isOpen ? 'ann-card__chevron--open' : ''}`}
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </div>

                {/* Preview (collapsed) */}
                {!isOpen && (
                  <p className="ann-card__preview">{a.content}</p>
                )}

                {/* Full content (expanded) */}
                {isOpen && (
                  <div className="ann-card__full">
                    <p className="ann-card__content">{a.content}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentAnnouncements;
