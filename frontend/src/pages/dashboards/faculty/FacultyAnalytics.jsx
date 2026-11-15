import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, PieChart, Pie, ReferenceLine,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import api from '../../../services/api';
import './FacultyAnalytics.css';

/* ── helpers ── */
const setTitle  = (t) => { const el = document.getElementById('fc-page-title'); if (el) el.textContent = t; };
const pctColor   = (p) => p >= 75 ? '#059669' : p >= 60 ? '#d97706' : '#dc2626';
const scoreColor = (s) => s >= 70 ? '#059669' : s >= 50 ? '#d97706' : '#dc2626';
const initials   = (n = '') => n.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
const GRADE_COLORS = { 'A+': '#15803d', 'A': '#059669', 'B+': '#1d4ed8', 'B': '#2563eb', 'C': '#d97706', 'D': '#c2410c', 'F': '#dc2626' };
const ATT_COLORS   = ['#dc2626', '#d97706', '#2563eb', '#059669'];

/* ── Tooltip ── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="fan-tooltip">
      {label && <div className="fan-tooltip__label">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="fan-tooltip__row">
          <span style={{ color: p.color || p.fill }}>■</span>
          <span>{p.name}:</span>
          <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

/* ── Disclaimer ── */
const Disclaimer = ({ text }) => (
  <div className="fan-disclaimer" role="note">
    <span>ℹ️</span><span>{text}</span>
  </div>
);

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════ */
export default function FacultyAnalytics() {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [remaining,  setRemaining]  = useState(20);
  const [atRiskMark, setAtRiskMark] = useState(50);
  const [activeCourse, setActiveCourse] = useState(null); // courseAnalytics index
  const [courseTab,    setCourseTab]    = useState('attendance'); // 'attendance' | 'academic'
  const [search,       setSearch]       = useState('');

  useEffect(() => { setTitle('Course Analytics'); }, []);

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data: d } = await api.get(
        `/analytics/faculty?remaining=${remaining}&threshold=75&atRiskThreshold=${atRiskMark}`
      );
      setData(d);
      if (d.courseAnalytics?.length) setActiveCourse(0);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [remaining, atRiskMark]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="fc-loading"><div className="fc-loading__spinner" /><span>Loading analytics…</span></div>;
  if (error)   return <div className="fc-error"><span>⚠️</span><div><strong>Failed to load</strong><p>{error}</p></div></div>;
  if (!data)   return null;

  const { courseAnalytics, predictionParams } = data;
  const ca = activeCourse !== null ? courseAnalytics[activeCourse] : null;

  /* Filtered risk students for search */
  const filteredAttRisk = (ca?.attendance?.riskStudents || [])
    .filter(s => !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.studentId?.includes(search));
  const filteredAcRisk = (ca?.academic?.atRisk || [])
    .filter(s => !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.studentId?.includes(search));

  return (
    <div className="fc-page fan-page">

      {/* ── Header ── */}
      <div className="fc-page-header">
        <div className="fc-page-header__left">
          <h1 className="fc-page-title">
            <span style={{ marginRight: '0.5rem' }}>📊</span>Course Analytics
          </h1>
          <p className="fc-page-sub">Attendance risk predictions and academic performance for your assigned courses</p>
        </div>
        <div className="fan-controls">
          <div className="fan-filter-group">
            <label className="fan-filter-label">Remaining classes</label>
            <input className="fan-input" type="number" min={0} max={100} value={remaining}
              onChange={e => setRemaining(Number(e.target.value))} style={{ width: 70 }} />
          </div>
          <div className="fan-filter-group">
            <label className="fan-filter-label">At-risk below (/110)</label>
            <input className="fan-input" type="number" min={0} max={110} value={atRiskMark}
              onChange={e => setAtRiskMark(Number(e.target.value))} style={{ width: 70 }} />
          </div>
          <button className="fc-btn-primary" onClick={fetchData}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {courseAnalytics.length === 0 ? (
        <div className="fc-panel fan-empty">
          <span>📚</span>
          <div><strong>No courses assigned</strong><p>Analytics will appear once courses are assigned to your profile.</p></div>
        </div>
      ) : (
        <>
          <Disclaimer text={predictionParams.disclaimer} />

          {/* ── Course selector ── */}
          <div className="fc-panel">
            <div className="fc-panel__header"><div className="fc-panel__title">Select Course</div></div>
            <div className="fan-course-tabs">
              {courseAnalytics.map((ca, i) => (
                <button
                  key={ca.course._id}
                  className={`fan-course-tab ${activeCourse === i ? 'fan-course-tab--active' : ''} ${ca.attendance.criticalCount > 0 ? 'fan-course-tab--critical' : ca.attendance.riskStudents.length > 0 ? 'fan-course-tab--warn' : ''}`}
                  onClick={() => { setActiveCourse(i); setCourseTab('attendance'); setSearch(''); }}
                >
                  <span className="fan-course-tab__code">{ca.course.code}</span>
                  <span className="fan-course-tab__name">{ca.course.name}</span>
                  <div className="fan-course-tab__badges">
                    {ca.attendance.riskStudents.length > 0 && (
                      <span className="fan-course-tab__badge fan-course-tab__badge--att">
                        {ca.attendance.criticalCount > 0 ? '⛔' : '⚠️'} {ca.attendance.riskStudents.length}
                      </span>
                    )}
                    {ca.academic.atRisk.length > 0 && (
                      <span className="fan-course-tab__badge fan-course-tab__badge--ac">
                        🎓 {ca.academic.atRisk.length}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Course summary strip ── */}
          {ca && (
            <div className="fan-summary-strip">
              {[
                { icon: '👨‍🎓', label: 'Students',      value: Math.max(ca.attendance.totalStudents, ca.academic.totalStudents) },
                { icon: '📊',   label: 'Avg Attendance', value: `${ca.attendance.avgPct}%`, color: pctColor(ca.attendance.avgPct) },
                { icon: '⚠️',   label: 'Att. Shortage',  value: ca.attendance.riskStudents.length, color: ca.attendance.riskStudents.length > 0 ? '#d97706' : '#059669' },
                { icon: '⛔',   label: 'Critical',        value: ca.attendance.criticalCount, color: ca.attendance.criticalCount > 0 ? '#dc2626' : '#059669' },
                { icon: '📝',   label: 'Avg Internal',   value: `${ca.academic.avgInternal}/110`, color: scoreColor(ca.academic.avgInternal) },
                { icon: '✅',   label: 'Pass Rate',       value: `${ca.academic.passRate}%`, color: ca.academic.passRate >= 75 ? '#059669' : '#d97706' },
                { icon: '🚨',   label: 'At Academic Risk',value: ca.academic.atRisk.length, color: ca.academic.atRisk.length > 0 ? '#dc2626' : '#059669' },
              ].map(s => (
                <div key={s.label} className="fan-summary-item">
                  <span className="fan-summary-item__icon">{s.icon}</span>
                  <span className="fan-summary-item__val" style={s.color ? { color: s.color } : {}}>{s.value}</span>
                  <span className="fan-summary-item__lbl">{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Course detail tabs ── */}
          {ca && (
            <>
              <div className="fan-detail-tabs">
                <button className={`fan-detail-tab ${courseTab === 'attendance' ? 'fan-detail-tab--active' : ''}`}
                  onClick={() => setCourseTab('attendance')}>
                  ✅ Attendance Analytics
                </button>
                <button className={`fan-detail-tab ${courseTab === 'academic' ? 'fan-detail-tab--active' : ''}`}
                  onClick={() => setCourseTab('academic')}>
                  🎓 Academic Analytics
                </button>
              </div>

              {/* ══════════════════════════════════════════
                  ATTENDANCE ANALYTICS
              ══════════════════════════════════════════ */}
              {courseTab === 'attendance' && (
                <div className="fan-content">

                  {/* Distribution charts */}
                  <div className="fan-charts-row">
                    <div className="fc-panel">
                      <div className="fc-panel__header"><div className="fc-panel__title">Attendance Distribution</div><div className="fc-panel__sub">{ca.course.name}</div></div>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={ca.attendance.buckets} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip content={<ChartTooltip />} />
                          <Bar dataKey="count" name="Students" radius={[6, 6, 0, 0]}>
                            {ca.attendance.buckets.map((_, i) => <Cell key={i} fill={ATT_COLORS[i]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="fc-panel">
                      <div className="fc-panel__header"><div className="fc-panel__title">Attendance Pie</div></div>
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={ca.attendance.buckets} dataKey="count" nameKey="label"
                            cx="50%" cy="50%" outerRadius={85} innerRadius={48} paddingAngle={3}>
                            {ca.attendance.buckets.map((_, i) => <Cell key={i} fill={ATT_COLORS[i]} />)}
                          </Pie>
                          <Tooltip content={<ChartTooltip />} />
                          <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Students in shortage */}
                  {ca.attendance.riskStudents.length > 0 ? (
                    <div className="fc-panel">
                      <div className="fan-panel-header">
                        <div>
                          <div className="fc-panel__title">
                            ⚠️ Students in Attendance Shortage ({ca.attendance.riskStudents.length})
                          </div>
                          <div className="fc-panel__sub">
                            Currently below 75% — predictions based on {remaining} estimated remaining classes.
                            These are estimates, not guarantees.
                          </div>
                        </div>
                        <input className="fan-search" type="text" placeholder="Search students…"
                          value={search} onChange={e => setSearch(e.target.value)} />
                      </div>

                      <div className="fc-table-wrap">
                        <table className="fc-table fan-table">
                          <thead>
                            <tr>
                              <th>Student</th>
                              <th>Current %</th>
                              <th>Attended/Total</th>
                              <th>Need to attend</th>
                              <th>Best case</th>
                              <th>Worst case</th>
                              <th>Can reach 75%?</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredAttRisk.length === 0 ? (
                              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>No matching students.</td></tr>
                            ) : filteredAttRisk.map((s, i) => (
                              <tr key={i} className={s.isCritical ? 'fan-row--critical' : 'fan-row--warn'}>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: `linear-gradient(135deg,${pctColor(s.currentPct)},#1e40af)`, color: '#fff', fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                      {initials(s.name)}
                                    </div>
                                    <div>
                                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.name}</div>
                                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.studentId}</div>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ height: 6, width: 60, background: 'var(--gray-200)', borderRadius: 3, overflow: 'hidden' }}>
                                      <div style={{ height: '100%', width: `${s.currentPct}%`, background: pctColor(s.currentPct), borderRadius: 3 }} />
                                    </div>
                                    <span style={{ color: pctColor(s.currentPct), fontWeight: 700, fontSize: '0.82rem' }}>{s.currentPct}%</span>
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center', fontWeight: 600 }}>{s.attended} / {s.totalClasses}</td>
                                <td style={{ textAlign: 'center', color: s.canReach ? '#d97706' : '#dc2626', fontWeight: 700 }}>
                                  {s.classesNeededMore > 0 ? `${s.classesNeededMore} of ${remaining}` : '—'}
                                </td>
                                <td style={{ textAlign: 'center', color: pctColor(s.bestCasePct), fontWeight: 600 }}>{s.bestCasePct}%</td>
                                <td style={{ textAlign: 'center', color: pctColor(s.worstCasePct), fontWeight: 600 }}>{s.worstCasePct}%</td>
                                <td style={{ textAlign: 'center' }}>
                                  {s.canReach
                                    ? <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.18rem 0.6rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700 }}>Possible</span>
                                    : <span style={{ background: '#fee2e2', color: '#991b1b', padding: '0.18rem 0.6rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700 }}>Not possible</span>}
                                </td>
                                <td>
                                  {s.isCritical
                                    ? <span className="fan-badge fan-badge--critical">⛔ Critical</span>
                                    : <span className="fan-badge fan-badge--warn">⚠️ Shortage</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="fc-panel fan-ok-banner">
                      <span>✅</span>
                      <div>
                        <strong>No attendance shortages in this course</strong>
                        <p>All {ca.attendance.totalStudents} enrolled students are currently above the 75% threshold.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ══════════════════════════════════════════
                  ACADEMIC ANALYTICS
              ══════════════════════════════════════════ */}
              {courseTab === 'academic' && (
                <div className="fan-content">

                  {/* Grade distribution + radar */}
                  <div className="fan-charts-row">
                    {/* Grade dist bar */}
                    <div className="fc-panel">
                      <div className="fc-panel__header"><div className="fc-panel__title">Grade Distribution</div><div className="fc-panel__sub">Pass rate: {ca.academic.passRate}% · Avg: {ca.academic.avgInternal}/110</div></div>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={ca.academic.gradeDist} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="grade" tick={{ fontSize: 13, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip content={<ChartTooltip />} />
                          <Bar dataKey="count" name="Students" radius={[6, 6, 0, 0]}>
                            {ca.academic.gradeDist.map((d, i) => (
                              <Cell key={i} fill={GRADE_COLORS[d.grade] || '#94a3b8'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Top performers */}
                    <div className="fc-panel">
                      <div className="fc-panel__header"><div className="fc-panel__title">🏆 Top Performers</div></div>
                      {ca.academic.topPerformers.length === 0
                        ? <p className="fc-empty">No results entered yet.</p>
                        : (
                          <div className="fan-top-list">
                            {ca.academic.topPerformers.map((s, i) => (
                              <div key={i} className={`fan-top-item fan-top-item--${i === 0 ? 'gold' : i === 1 ? 'silver' : 'bronze'}`}>
                                <span className="fan-top-item__rank">{i + 1}</span>
                                <div className="fan-top-item__info">
                                  <span className="fan-top-item__name">{s.name}</span>
                                  <span className="fan-top-item__id">{s.studentId}</span>
                                </div>
                                <div className="fan-top-item__right">
                                  <div style={{ height: 6, width: 60, background: 'var(--gray-200)', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${(s.internalTotal / 110) * 100}%`, background: scoreColor(s.internalTotal), borderRadius: 3 }} />
                                  </div>
                                  <span style={{ fontWeight: 800, fontSize: '0.9rem', color: scoreColor(s.internalTotal) }}>{s.internalTotal}</span>
                                  <span style={{ fontSize: '0.78rem', padding: '0.18rem 0.55rem', borderRadius: '9999px', fontWeight: 700, background: `${GRADE_COLORS[s.grade] || '#94a3b8'}20`, color: GRADE_COLORS[s.grade] || '#94a3b8' }}>{s.grade}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Score distribution scatter via horizontal bars */}
                  {ca.academic.topPerformers.length > 0 && (
                    <div className="fc-panel">
                      <div className="fc-panel__header">
                        <div className="fc-panel__title">Score Distribution (All Students)</div>
                        <div className="fc-panel__sub">Internal marks out of 110 — sorted high to low</div>
                      </div>
                      <ResponsiveContainer width="100%" height={Math.max(180, ca.academic.totalStudents * 28)}>
                        <BarChart
                          data={[...ca.academic.topPerformers, ...ca.academic.atRisk]
                            .sort((a, b) => b.internalTotal - a.internalTotal)
                            .map(s => ({ name: s.name?.split(' ')[0] || '?', score: s.internalTotal }))}
                          layout="vertical"
                          margin={{ top: 5, right: 60, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                          <XAxis type="number" domain={[0, 110]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={60} />
                          <Tooltip content={<ChartTooltip />} />
                          <ReferenceLine x={55} stroke="#d97706" strokeDasharray="5 3" strokeWidth={1.5}
                            label={{ value: 'Pass', position: 'top', fontSize: 10, fill: '#d97706' }} />
                          <Bar dataKey="score" name="Internal Score" radius={[0, 5, 5, 0]}>
                            {[...ca.academic.topPerformers, ...ca.academic.atRisk]
                              .sort((a, b) => b.internalTotal - a.internalTotal)
                              .map((s, i) => <Cell key={i} fill={scoreColor(s.internalTotal)} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* At-risk academic students */}
                  {ca.academic.atRisk.length > 0 ? (
                    <div className="fc-panel">
                      <div className="fan-panel-header">
                        <div>
                          <div className="fc-panel__title">🚨 Students Needing Academic Support ({ca.academic.atRisk.length})</div>
                          <div className="fc-panel__sub">Internal marks below {atRiskMark}/110. Early intervention is recommended — these students may benefit from extra help.</div>
                        </div>
                        <input className="fan-search" type="text" placeholder="Search…"
                          value={search} onChange={e => setSearch(e.target.value)} />
                      </div>
                      <div className="fc-table-wrap">
                        <table className="fc-table fan-table">
                          <thead>
                            <tr><th>Student</th><th>Internal /110</th><th>Grade</th><th>Status</th><th>Recommended action</th></tr>
                          </thead>
                          <tbody>
                            {filteredAcRisk.length === 0
                              ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>No matching students.</td></tr>
                              : filteredAcRisk.map((s, i) => (
                                <tr key={i} className={s.internalTotal < 44 ? 'fan-row--critical' : 'fan-row--warn'}>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#fee2e2', color: '#991b1b', fontSize: '0.65rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        {initials(s.name)}
                                      </div>
                                      <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.name}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.studentId}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <div style={{ height: 6, width: 70, background: 'var(--gray-200)', borderRadius: 3, overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${(s.internalTotal / 110) * 100}%`, background: scoreColor(s.internalTotal), borderRadius: 3 }} />
                                      </div>
                                      <span style={{ fontWeight: 700, color: scoreColor(s.internalTotal) }}>{s.internalTotal}</span>
                                    </div>
                                  </td>
                                  <td>
                                    <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontWeight: 800, fontSize: '0.78rem', background: `${GRADE_COLORS[s.grade] || '#94a3b8'}20`, color: GRADE_COLORS[s.grade] || '#94a3b8' }}>
                                      {s.grade}
                                    </span>
                                  </td>
                                  <td>
                                    {s.grade === 'F'
                                      ? <span style={{ background: '#fee2e2', color: '#dc2626', padding: '0.18rem 0.55rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700 }}>Failing</span>
                                      : <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.18rem 0.55rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700 }}>Low marks</span>}
                                  </td>
                                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    {s.internalTotal < 44 ? '⛔ Urgent: notify department head' : s.internalTotal < 55 ? '⚠️ Schedule one-on-one session' : '📚 Recommend revision materials'}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : ca.academic.totalStudents > 0 && (
                    <div className="fc-panel fan-ok-banner">
                      <span>🏆</span>
                      <div>
                        <strong>All students above the academic threshold</strong>
                        <p>No students have internal marks below {atRiskMark}/110 in this course.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
