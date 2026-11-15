import React, { useEffect, useState, useCallback } from 'react';
import api from '../../../services/api';
import './StudentAssignments.css';

const setTitle = (t) => { const el = document.getElementById('st-page-title'); if (el) el.textContent = t; };

const STATUS_META = {
  pending:   { label: 'Pending',   bg: '#fef3c7', color: '#92400e', icon: '⏳' },
  submitted: { label: 'Submitted', bg: '#d1fae5', color: '#065f46', icon: '✅' },
  late:      { label: 'Late',      bg: '#ffedd5', color: '#c2410c', icon: '⚠️' },
  graded:    { label: 'Graded',    bg: '#dbeafe', color: '#1d4ed8', icon: '📊' },
  missing:   { label: 'Missing',   bg: '#fee2e2', color: '#991b1b', icon: '❌' },
};

const TYPE_META = {
  assignment:   { label: 'Assignment',   bg: '#eff6ff', color: '#2563eb' },
  project:      { label: 'Project',      bg: '#f5f3ff', color: '#7c3aed' },
  quiz:         { label: 'Quiz',         bg: '#fef3c7', color: '#d97706' },
  lab:          { label: 'Lab',          bg: '#ecfeff', color: '#0891b2' },
  presentation: { label: 'Presentation', bg: '#fdf2f8', color: '#9333ea' },
};

const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const daysLeft = (d) => {
  const diff = Math.ceil((new Date(d) - Date.now()) / 86400000);
  if (diff < 0)  return { text: `${Math.abs(diff)}d overdue`, urgent: true };
  if (diff === 0) return { text: 'Due today',  urgent: true };
  if (diff <= 2)  return { text: `${diff}d left`, urgent: true };
  return { text: `${diff}d left`, urgent: false };
};

const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || STATUS_META.pending;
  return <span className="asgn-status-badge" style={{ background: m.bg, color: m.color }}>{m.icon} {m.label}</span>;
};

const TypeBadge = ({ type }) => {
  const m = TYPE_META[type] || { label: type, bg: '#f1f5f9', color: '#64748b' };
  return <span className="asgn-type-badge" style={{ background: m.bg, color: m.color }}>{m.label}</span>;
};

const StudentAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [counts,      setCounts]      = useState({});
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter,   setTypeFilter]   = useState('');
  const [search,       setSearch]       = useState('');
  const [expanded,     setExpanded]     = useState(null);

  useEffect(() => { setTitle('Assignments'); }, []);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter)   params.set('type',   typeFilter);
      const { data } = await api.get(`/student/assignments?${params}`);
      setAssignments(data.assignments);
      setCounts(data.counts);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [statusFilter, typeFilter]);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  const filtered = search
    ? assignments.filter(a =>
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.courseName?.toLowerCase().includes(search.toLowerCase())
      )
    : assignments;

  if (error) return <div className="st-error"><span>⚠️</span><div><strong>Error</strong><p>{error}</p></div></div>;

  return (
    <div className="st-page asgn-page">

      <div className="st-page-header">
        <div className="st-page-header__left">
          <h1 className="st-page-title">Assignments</h1>
          <p className="st-page-sub">Track all submissions and deadlines</p>
        </div>
      </div>

      {/* Counts strip */}
      <div className="asgn-counts">
        {[
          { key: '', label: 'All',       val: counts.total      || 0 },
          { key: 'pending',   label: 'Pending',   val: counts.pending   || 0, color: '#d97706' },
          { key: 'submitted', label: 'Submitted', val: counts.submitted || 0, color: '#059669' },
          { key: 'missing',   label: 'Missing',   val: counts.missing   || 0, color: '#dc2626' },
          { key: 'late',      label: 'Late',       val: counts.late      || 0, color: '#ea580c' },
        ].map(c => (
          <button
            key={c.key}
            className={`asgn-count-btn ${statusFilter === c.key ? 'asgn-count-btn--active' : ''}`}
            onClick={() => setStatusFilter(c.key)}
          >
            <span className="asgn-count-btn__val" style={c.color ? { color: c.color } : {}}>{c.val}</span>
            <span className="asgn-count-btn__label">{c.label}</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="asgn-toolbar">
        <div className="asgn-search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position:'absolute', left:'0.75rem', top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search assignments…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="asgn-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          {Object.entries(TYPE_META).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="st-loading"><div className="st-loading__spinner"/><span>Loading…</span></div>
      ) : filtered.length === 0 ? (
        <div className="st-panel"><p className="st-empty">🎉 No assignments matching your filters.</p></div>
      ) : (
        <div className="asgn-list">
          {filtered.map(a => {
            const dl = a.dueDate ? daysLeft(a.dueDate) : null;
            const isOpen = expanded === a._id;
            return (
              <div key={a._id} className={`asgn-card ${a.isOverdue && a.status === 'missing' ? 'asgn-card--missing' : ''}`}>
                <div className="asgn-card__main" onClick={() => setExpanded(isOpen ? null : a._id)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && setExpanded(isOpen ? null : a._id)}>
                  <div className="asgn-card__left">
                    <div className="asgn-card__badges">
                      <TypeBadge   type={a.type} />
                      <StatusBadge status={a.status} />
                    </div>
                    <div className="asgn-card__title">{a.title}</div>
                    <div className="asgn-card__meta">
                      <span>📚 {a.courseName}</span>
                      {a.instructor && <span>👤 {a.instructor}</span>}
                      <span>🏆 {a.maxMarks} marks</span>
                    </div>
                  </div>
                  <div className="asgn-card__right">
                    <div className="asgn-card__due-date">{fmtDate(a.dueDate)}</div>
                    {dl && (
                      <span className={`asgn-card__due-left ${dl.urgent ? 'asgn-card__due-left--urgent' : ''}`}>
                        {dl.text}
                      </span>
                    )}
                    <svg className={`asgn-card__chevron ${isOpen ? 'asgn-card__chevron--open' : ''}`}
                      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 9l6 6 6-6"/>
                    </svg>
                  </div>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="asgn-card__detail">
                    {a.description && <p className="asgn-card__desc">{a.description}</p>}
                    {a.submission ? (
                      <div className="asgn-submission">
                        <div className="asgn-submission__header">Submission Details</div>
                        <div className="asgn-submission__grid">
                          <div className="asgn-submission__item"><span>Submitted</span><strong>{a.submission.submittedAt ? fmtDate(a.submission.submittedAt) : '—'}</strong></div>
                          <div className="asgn-submission__item"><span>Marks</span><strong>{a.submission.marks !== null && a.submission.marks !== undefined ? `${a.submission.marks} / ${a.maxMarks}` : 'Not graded'}</strong></div>
                          {a.submission.feedback && <div className="asgn-submission__item asgn-submission__item--full"><span>Feedback</span><strong>{a.submission.feedback}</strong></div>}
                        </div>
                      </div>
                    ) : (
                      <div className="asgn-no-submission">
                        {a.isOverdue ? '❌ Not submitted — this assignment is overdue.' : '📤 You have not submitted this assignment yet.'}
                      </div>
                    )}
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

export default StudentAssignments;
