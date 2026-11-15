import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ReferenceLine,
} from 'recharts';
import api from '../../../services/api';
import './AdminAnalytics.css';

/* ── helpers ── */
const setTitle = (t) => { const el = document.getElementById('page-title'); if (el) el.textContent = t; };
const pctColor = (p) => p >= 75 ? '#059669' : p >= 60 ? '#d97706' : '#dc2626';
const GRADE_COLORS = { 'A+':'#15803d','A':'#059669','B+':'#1d4ed8','B':'#2563eb','C':'#d97706','D':'#c2410c','F':'#dc2626' };
const ATT_BUCKET_COLORS = ['#dc2626','#d97706','#2563eb','#059669'];
const initials = (n='') => n.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase() || '?';

/* ── Custom tooltip ── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="an-tooltip">
      {label && <div className="an-tooltip__label">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="an-tooltip__row">
          <span style={{ color: p.color || p.fill }}>■</span>
          <span>{p.name}:</span>
          <strong>{typeof p.value === 'number' ? p.value : p.value}</strong>
        </div>
      ))}
    </div>
  );
};

/* ── Prediction badge ── */
const PredBadge = ({ canReach, isCritical }) => {
  if (isCritical) return <span className="an-pred-badge an-pred-badge--critical">⛔ Unavoidable shortage</span>;
  if (!canReach)  return <span className="an-pred-badge an-pred-badge--risk">⚠️ At risk</span>;
  return <span className="an-pred-badge an-pred-badge--ok">✓ On track</span>;
};

/* ── Disclaimer box ── */
const Disclaimer = ({ text }) => (
  <div className="an-disclaimer" role="note">
    <span>ℹ️</span>
    <span>{text}</span>
  </div>
);

/* ── Section header ── */
const SectionHead = ({ title, sub }) => (
  <div className="an-section-head">
    <h2 className="an-section-head__title">{title}</h2>
    {sub && <p className="an-section-head__sub">{sub}</p>}
  </div>
);

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
export default function AdminAnalytics() {
  const [tab, setTab] = useState('attendance'); // 'attendance' | 'academic'

  /* ── Shared filters ── */
  const [departments, setDepartments] = useState([]);
  const [deptFilter,  setDeptFilter]  = useState('');
  const [remaining,   setRemaining]   = useState(20);
  const [threshold,   setThreshold]   = useState(75);
  const [atRiskMark,  setAtRiskMark]  = useState(50);

  /* ── Attendance state ── */
  const [attData,    setAttData]    = useState(null);
  const [attLoading, setAttLoading] = useState(false);
  const [attError,   setAttError]   = useState('');
  const [attCourse,  setAttCourse]  = useState(''); // expanded course

  /* ── Academic state ── */
  const [acData,    setAcData]    = useState(null);
  const [acLoading, setAcLoading] = useState(false);
  const [acError,   setAcError]   = useState('');
  const [acCourse,  setAcCourse]  = useState('');

  /* ── Search within tables ── */
  const [attSearch, setAttSearch] = useState('');
  const [acSearch,  setAcSearch]  = useState('');

  useEffect(() => {
    setTitle('Smart Analytics');
    api.get('/admin/departments/all').then(r => setDepartments(r.data)).catch(() => {});
  }, []);

  /* ── Fetch attendance analytics ── */
  const fetchAtt = useCallback(async () => {
    setAttLoading(true); setAttError('');
    try {
      const params = new URLSearchParams({ remaining, threshold });
      if (deptFilter) params.set('departmentId', deptFilter);
      const { data } = await api.get(`/analytics/admin/attendance?${params}`);
      setAttData(data);
    } catch (e) { setAttError(e.message); }
    finally { setAttLoading(false); }
  }, [remaining, threshold, deptFilter]);

  /* ── Fetch academic analytics ── */
  const fetchAc = useCallback(async () => {
    setAcLoading(true); setAcError('');
    try {
      const params = new URLSearchParams({ atRiskThreshold: atRiskMark });
      if (deptFilter) params.set('departmentId', deptFilter);
      const { data } = await api.get(`/analytics/admin/academic?${params}`);
      setAcData(data);
    } catch (e) { setAcError(e.message); }
    finally { setAcLoading(false); }
  }, [atRiskMark, deptFilter]);

  useEffect(() => { if (tab === 'attendance') fetchAtt(); }, [tab, fetchAtt]);
  useEffect(() => { if (tab === 'academic')   fetchAc();  }, [tab, fetchAc]);

  /* ── Filtered shortage students ── */
  const filteredShortage = (attData?.allShortageStudents || [])
    .filter(s => !attSearch || s.name?.toLowerCase().includes(attSearch.toLowerCase()) || s.studentId?.includes(attSearch));

  /* ── Filtered at-risk students ── */
  const filteredAtRisk = (acData?.allAtRiskStudents || [])
    .filter(s => !acSearch || s.name?.toLowerCase().includes(acSearch.toLowerCase()) || s.studentId?.includes(acSearch));

  /* ── Active course data ── */
  const activeCourseAtt = attData?.courseStats?.find(cs => cs.course._id === attCourse);
  const activeCourseAc  = acData?.courseStats?.find(cs => cs.course._id === acCourse);

  return (
    <div className="an-page">

      {/* ── Page header ── */}
      <div className="an-page-header">
        <div>
          <h1 className="an-page-title">
            <span className="an-page-title__icon">📊</span> Smart Analytics
          </h1>
          <p className="an-page-sub">Data-driven insights with shortage predictions and at-risk identification</p>
        </div>
        {/* Tabs */}
        <div className="an-tabs" role="tablist">
          <button
            role="tab" aria-selected={tab === 'attendance'}
            className={`an-tab ${tab === 'attendance' ? 'an-tab--active' : ''}`}
            onClick={() => setTab('attendance')}
          >
            ✅ Attendance Analytics
          </button>
          <button
            role="tab" aria-selected={tab === 'academic'}
            className={`an-tab ${tab === 'academic' ? 'an-tab--active' : ''}`}
            onClick={() => setTab('academic')}
          >
            🎓 Academic Analytics
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          ATTENDANCE TAB
      ═══════════════════════════════════════════════════════════════════ */}
      {tab === 'attendance' && (
        <div className="an-content">

          {/* Filter bar */}
          <div className="an-filter-bar">
            <div className="an-filter-group">
              <label className="an-filter-label">Department</label>
              <select className="an-select" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
                <option value="">All Departments</option>
                {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </div>
            <div className="an-filter-group">
              <label className="an-filter-label">Remaining classes</label>
              <input className="an-input" type="number" min={0} max={100} value={remaining}
                onChange={e => setRemaining(Number(e.target.value))} style={{ width: 80 }} />
            </div>
            <div className="an-filter-group">
              <label className="an-filter-label">Threshold (%)</label>
              <input className="an-input" type="number" min={50} max={100} value={threshold}
                onChange={e => setThreshold(Number(e.target.value))} style={{ width: 80 }} />
            </div>
            <button className="an-btn-primary" onClick={fetchAtt}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
              Refresh
            </button>
          </div>

          {attLoading && <div className="an-loading"><div className="an-spinner" />Loading attendance data…</div>}
          {attError   && <div className="an-error"><span>⚠️</span><div><strong>Error</strong><p>{attError}</p></div></div>}

          {attData && !attLoading && (
            <>
              <Disclaimer text={attData.predictionParams.disclaimer} />

              {/* ── Institute-wide distribution ── */}
              <div className="an-card">
                <SectionHead
                  title="Institute-wide Attendance Distribution"
                  sub="Proportion of all attendance records across all courses and students"
                />
                <div className="an-charts-row">
                  <div className="an-chart-wrap">
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={attData.instituteBuckets} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <ReferenceLine y={0} stroke="#e2e8f0" />
                        <Bar dataKey="count" name="Students" radius={[6, 6, 0, 0]}>
                          {attData.instituteBuckets.map((_, i) => (
                            <Cell key={i} fill={ATT_BUCKET_COLORS[i]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="an-chart-wrap">
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={attData.instituteBuckets} dataKey="count" nameKey="label"
                          cx="50%" cy="50%" outerRadius={90} paddingAngle={3} innerRadius={50}>
                          {attData.instituteBuckets.map((_, i) => (
                            <Cell key={i} fill={ATT_BUCKET_COLORS[i]} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                        <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* ── Course-level summary cards ── */}
              {attData.courseStats.length > 0 && (
                <div className="an-card">
                  <SectionHead
                    title="Course-wise Attendance Overview"
                    sub="Click a course to drill down into individual student predictions"
                  />
                  <div className="an-course-grid">
                    {attData.courseStats.map(cs => (
                      <div
                        key={cs.course._id}
                        className={`an-course-card ${attCourse === cs.course._id ? 'an-course-card--active' : ''} ${cs.summary.shortageCount > 0 ? 'an-course-card--warn' : ''}`}
                        onClick={() => setAttCourse(a => a === cs.course._id ? '' : cs.course._id)}
                        role="button" tabIndex={0}
                        onKeyDown={e => e.key === 'Enter' && setAttCourse(a => a === cs.course._id ? '' : cs.course._id)}
                      >
                        <div className="an-course-card__header">
                          <span className="an-course-card__code">{cs.course.code}</span>
                          {cs.summary.criticalCount > 0 && (
                            <span className="an-course-card__critical">⛔ {cs.summary.criticalCount} critical</span>
                          )}
                          {cs.summary.shortageCount > 0 && cs.summary.criticalCount === 0 && (
                            <span className="an-course-card__shortage">⚠️ {cs.summary.shortageCount}</span>
                          )}
                        </div>
                        <div className="an-course-card__name">{cs.course.name}</div>
                        <div className="an-course-card__dept">{cs.course.department?.name}</div>
                        <div className="an-course-card__meter-wrap">
                          <div className="an-course-card__meter">
                            <div className="an-course-card__meter-fill"
                              style={{ width: `${cs.summary.avgPct}%`, background: pctColor(cs.summary.avgPct) }} />
                          </div>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: pctColor(cs.summary.avgPct) }}>
                            {cs.summary.avgPct}%
                          </span>
                        </div>
                        <div className="an-course-card__stats">
                          <span>{cs.summary.totalStudents} students</span>
                          <span style={{ color: cs.summary.shortageCount > 0 ? '#d97706' : '#059669' }}>
                            {cs.summary.shortageCount} in shortage
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Drilled-down course predictions ── */}
              {activeCourseAtt && (
                <div className="an-card an-card--highlighted">
                  <SectionHead
                    title={`Attendance Predictions — ${activeCourseAtt.course.name} (${activeCourseAtt.course.code})`}
                    sub={`Based on ${remaining} estimated remaining classes. Assumes same attendance rate continues. These are estimates, not guarantees.`}
                  />

                  {/* Bucket mini-chart for this course */}
                  <div className="an-charts-row" style={{ marginBottom: '1.5rem' }}>
                    <div className="an-chart-wrap">
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={activeCourseAtt.summary.buckets} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip content={<ChartTooltip />} />
                          <Bar dataKey="count" name="Students" radius={[5, 5, 0, 0]}>
                            {activeCourseAtt.summary.buckets.map((_, i) => (
                              <Cell key={i} fill={ATT_BUCKET_COLORS[i]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Summary stats */}
                    <div className="an-pred-summary">
                      {[
                        { label: 'Total Students',  value: activeCourseAtt.summary.totalStudents },
                        { label: 'In Shortage',     value: activeCourseAtt.summary.shortageCount, warn: activeCourseAtt.summary.shortageCount > 0 },
                        { label: 'Critical (unavoidable)', value: activeCourseAtt.summary.criticalCount, crit: activeCourseAtt.summary.criticalCount > 0 },
                        { label: 'Class Average',   value: `${activeCourseAtt.summary.avgPct}%` },
                      ].map(s => (
                        <div key={s.label} className="an-pred-summary__item">
                          <span className="an-pred-summary__val"
                            style={{ color: s.crit ? '#dc2626' : s.warn ? '#d97706' : 'inherit' }}>
                            {s.value}
                          </span>
                          <span className="an-pred-summary__lbl">{s.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Per-student prediction table */}
                  <div className="an-table-wrap">
                    <table className="an-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Current %</th>
                          <th>Attended / Total</th>
                          <th>Classes needed</th>
                          <th>Best case</th>
                          <th>Worst case</th>
                          <th>Absences before shortage</th>
                          <th>Prediction</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeCourseAtt.students.map(s => (
                          <tr key={s._id} className={s.isCritical ? 'an-row--critical' : s.isShortage ? 'an-row--warn' : ''}>
                            <td>
                              <div className="an-student-cell">
                                <div className="an-avatar" style={{ background: `linear-gradient(135deg,${pctColor(s.currentPct)},#1e40af)` }}>
                                  {initials(s.name)}
                                </div>
                                <div>
                                  <div className="an-student-cell__name">{s.name}</div>
                                  <div className="an-student-cell__id">{s.studentId}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="an-pct-cell">
                                <div className="an-pct-bar">
                                  <div style={{ width: `${s.currentPct}%`, background: pctColor(s.currentPct), height: '100%', borderRadius: 3 }} />
                                </div>
                                <span style={{ color: pctColor(s.currentPct), fontWeight: 700, fontSize: '0.82rem' }}>{s.currentPct}%</span>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 600 }}>{s.attended} / {s.totalClasses}</td>
                            <td style={{ textAlign: 'center' }}>
                              {s.classesNeededMore > 0
                                ? <span style={{ color: s.canReach ? '#d97706' : '#dc2626', fontWeight: 700 }}>{s.classesNeededMore}</span>
                                : <span style={{ color: '#059669', fontWeight: 700 }}>—</span>}
                            </td>
                            <td style={{ textAlign: 'center', color: pctColor(s.bestCasePct), fontWeight: 600 }}>{s.bestCasePct}%</td>
                            <td style={{ textAlign: 'center', color: pctColor(s.worstCasePct), fontWeight: 600 }}>{s.worstCasePct}%</td>
                            <td style={{ textAlign: 'center', fontWeight: 600 }}>
                              {s.isShortage
                                ? <span style={{ color: '#94a3b8' }}>Already below</span>
                                : <span style={{ color: '#d97706' }}>{s.consecutiveAbsencesBeforeShortage}</span>}
                            </td>
                            <td><PredBadge canReach={s.canReach} isCritical={s.isCritical} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── All shortage students ── */}
              {attData.allShortageStudents.length > 0 && (
                <div className="an-card">
                  <div className="an-card__header">
                    <SectionHead
                      title={`⚠️ All Students in Attendance Shortage (${attData.allShortageStudents.length})`}
                      sub={`Students currently below ${threshold}% across any course`}
                    />
                    <input className="an-search" type="text" placeholder="Search students…"
                      value={attSearch} onChange={e => setAttSearch(e.target.value)} />
                  </div>
                  <div className="an-table-wrap">
                    <table className="an-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Course</th>
                          <th>Current %</th>
                          <th>Classes needed</th>
                          <th>Can reach {threshold}%?</th>
                          <th>Best case %</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredShortage.length === 0
                          ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>No matching students.</td></tr>
                          : filteredShortage.map((s, i) => (
                            <tr key={`${s._id}-${i}`} className={s.isCritical ? 'an-row--critical' : 'an-row--warn'}>
                              <td>
                                <div className="an-student-cell">
                                  <div className="an-avatar" style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.65rem' }}>
                                    {initials(s.name)}
                                  </div>
                                  <div>
                                    <div className="an-student-cell__name">{s.name}</div>
                                    <div className="an-student-cell__id">{s.studentId}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <code style={{ fontSize: '0.78rem', background: 'var(--gray-100)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>
                                  {s.courseCode}
                                </code>
                                <span style={{ marginLeft: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.courseName}</span>
                              </td>
                              <td>
                                <span style={{ color: pctColor(s.currentPct), fontWeight: 700 }}>{s.currentPct}%</span>
                              </td>
                              <td style={{ textAlign: 'center', color: s.canReach ? '#d97706' : '#dc2626', fontWeight: 700 }}>
                                {s.classesNeededMore}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {s.canReach
                                  ? <span style={{ color: '#d97706', fontWeight: 600 }}>Possible</span>
                                  : <span style={{ color: '#dc2626', fontWeight: 700 }}>Not possible</span>}
                              </td>
                              <td style={{ textAlign: 'center', color: pctColor(s.bestCasePct), fontWeight: 600 }}>{s.bestCasePct}%</td>
                              <td><PredBadge canReach={s.canReach} isCritical={s.isCritical} /></td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {attData.allShortageStudents.length === 0 && !attLoading && (
                <div className="an-card an-empty">
                  <span>✅</span>
                  <div>
                    <strong>No attendance shortages detected</strong>
                    <p>All students are currently above the {threshold}% threshold.</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          ACADEMIC TAB
      ═══════════════════════════════════════════════════════════════════ */}
      {tab === 'academic' && (
        <div className="an-content">

          {/* Filter bar */}
          <div className="an-filter-bar">
            <div className="an-filter-group">
              <label className="an-filter-label">Department</label>
              <select className="an-select" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
                <option value="">All Departments</option>
                {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </div>
            <div className="an-filter-group">
              <label className="an-filter-label">At-risk below (internal /110)</label>
              <input className="an-input" type="number" min={0} max={110} value={atRiskMark}
                onChange={e => setAtRiskMark(Number(e.target.value))} style={{ width: 80 }} />
            </div>
            <button className="an-btn-primary" onClick={fetchAc}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
              Refresh
            </button>
          </div>

          {acLoading && <div className="an-loading"><div className="an-spinner" />Loading academic data…</div>}
          {acError   && <div className="an-error"><span>⚠️</span><div><strong>Error</strong><p>{acError}</p></div></div>}

          {acData && !acLoading && (
            <>
              {/* ── Institute-wide grade distribution ── */}
              <div className="an-card">
                <SectionHead title="Institute-wide Grade Distribution" sub="All exam results combined across every course" />
                <div className="an-charts-row">
                  <div className="an-chart-wrap">
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={acData.instituteGradeChart} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="grade" tick={{ fontSize: 13, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="count" name="Students" radius={[6, 6, 0, 0]}>
                          {acData.instituteGradeChart.map((d, i) => (
                            <Cell key={i} fill={GRADE_COLORS[d.grade] || '#94a3b8'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Department comparison */}
                  {acData.deptComparison.length > 1 && (
                    <div className="an-chart-wrap">
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
                        Avg Internal Score by Department
                      </div>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={acData.deptComparison} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0, 110]} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={80} />
                          <Tooltip content={<ChartTooltip />} />
                          <Bar dataKey="avg" name="Avg Internal" radius={[0, 5, 5, 0]} fill="#2563eb" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Subject-wise performance comparison ── */}
              {acData.subjectComparison.length > 0 && (
                <div className="an-card">
                  <SectionHead
                    title="Subject-wise Average Performance"
                    sub="Average internal marks (out of 110) and pass rate per course — sorted by performance"
                  />
                  <div className="an-chart-wrap">
                    <ResponsiveContainer width="100%" height={Math.max(280, acData.subjectComparison.length * 36)}>
                      <BarChart data={acData.subjectComparison} layout="vertical"
                        margin={{ top: 5, right: 60, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0, 110]} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={55} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0]?.payload;
                            return (
                              <div className="an-tooltip">
                                <div className="an-tooltip__label">{d.fullName}</div>
                                <div className="an-tooltip__row"><span style={{ color: '#2563eb' }}>■</span><span>Avg:</span><strong>{d.avg}</strong></div>
                                <div className="an-tooltip__row"><span style={{ color: '#059669' }}>■</span><span>Pass rate:</span><strong>{d.passRate}%</strong></div>
                                <div className="an-tooltip__row"><span style={{ color: '#94a3b8' }}>■</span><span>Students:</span><strong>{d.students}</strong></div>
                              </div>
                            );
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="avg" name="Avg Internal (/110)" radius={[0, 5, 5, 0]}>
                          {acData.subjectComparison.map((d, i) => (
                            <Cell key={i} fill={d.avg >= 70 ? '#2563eb' : d.avg >= 50 ? '#d97706' : '#dc2626'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* ── Course cards ── */}
              {acData.courseStats.length > 0 && (
                <div className="an-card">
                  <SectionHead title="Course-wise Summary" sub="Click a course to see the grade breakdown chart" />
                  <div className="an-course-grid">
                    {acData.courseStats.map(cs => (
                      <div
                        key={cs.course._id}
                        className={`an-course-card ${acCourse === cs.course._id ? 'an-course-card--active' : ''} ${cs.summary.atRiskCount > 0 ? 'an-course-card--warn' : ''}`}
                        onClick={() => setAcCourse(a => a === cs.course._id ? '' : cs.course._id)}
                        role="button" tabIndex={0}
                        onKeyDown={e => e.key === 'Enter' && setAcCourse(a => a === cs.course._id ? '' : cs.course._id)}
                      >
                        <div className="an-course-card__header">
                          <span className="an-course-card__code">{cs.course.code}</span>
                          {cs.summary.atRiskCount > 0 && (
                            <span className="an-course-card__shortage">⚠️ {cs.summary.atRiskCount} at risk</span>
                          )}
                        </div>
                        <div className="an-course-card__name">{cs.course.name}</div>
                        <div className="an-course-card__dept">{cs.course.department?.name}</div>
                        <div className="an-course-card__stats">
                          <span>Avg: <strong>{cs.summary.avg}/110</strong></span>
                          <span style={{ color: cs.summary.passRate >= 75 ? '#059669' : '#d97706', fontWeight: 600 }}>
                            {cs.summary.passRate}% pass
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Drilled course grade chart ── */}
              {activeCourseAc && (
                <div className="an-card an-card--highlighted">
                  <SectionHead
                    title={`Grade Distribution — ${activeCourseAc.course.name} (${activeCourseAc.course.code})`}
                    sub={`${activeCourseAc.summary.totalStudents} students · Pass rate: ${activeCourseAc.summary.passRate}% · Avg internal: ${activeCourseAc.summary.avg}/110`}
                  />
                  <div className="an-charts-row">
                    <div className="an-chart-wrap">
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={activeCourseAc.gradeDist} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="grade" tick={{ fontSize: 13, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip content={<ChartTooltip />} />
                          <Bar dataKey="count" name="Students" radius={[6, 6, 0, 0]}>
                            {activeCourseAc.gradeDist.map((d, i) => (
                              <Cell key={i} fill={GRADE_COLORS[d.grade] || '#94a3b8'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Score distribution scatter via dots */}
                    <div className="an-chart-wrap">
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
                        Individual Student Scores
                      </div>
                      <div className="an-score-dots">
                        {activeCourseAc.results
                          .sort((a, b) => b.internalTotal - a.internalTotal)
                          .map((r, i) => (
                            <div key={i} className="an-score-dot" title={`${r.name}: ${r.internalTotal}/110 (${r.grade})`}
                              style={{
                                background: GRADE_COLORS[r.grade] || '#94a3b8',
                                width: 10, height: 10, borderRadius: '50%',
                                opacity: 0.85,
                              }}
                            />
                          ))}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        Each dot = one student (hover for details) · Sorted high→low
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── All at-risk students ── */}
              {acData.allAtRiskStudents.length > 0 && (
                <div className="an-card">
                  <div className="an-card__header">
                    <SectionHead
                      title={`🚨 Students Needing Academic Support (${acData.allAtRiskStudents.length})`}
                      sub={`Internal marks below ${atRiskMark}/110. Early intervention recommended — these students may benefit from additional support.`}
                    />
                    <input className="an-search" type="text" placeholder="Search students…"
                      value={acSearch} onChange={e => setAcSearch(e.target.value)} />
                  </div>
                  <div className="an-table-wrap">
                    <table className="an-table">
                      <thead>
                        <tr><th>Student</th><th>Course</th><th>Internal /110</th><th>Grade</th><th>Status</th><th>Action needed</th></tr>
                      </thead>
                      <tbody>
                        {filteredAtRisk.length === 0
                          ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>No matching students.</td></tr>
                          : filteredAtRisk.map((s, i) => (
                            <tr key={`${s.studentId}-${i}`} className={!s.isPassed ? 'an-row--critical' : 'an-row--warn'}>
                              <td>
                                <div className="an-student-cell">
                                  <div className="an-avatar" style={{ background: '#fee2e2', color: '#991b1b', fontSize: '0.65rem' }}>{initials(s.name)}</div>
                                  <div>
                                    <div className="an-student-cell__name">{s.name}</div>
                                    <div className="an-student-cell__id">{s.studentId}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <code style={{ fontSize: '0.78rem', background: 'var(--gray-100)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>{s.courseCode}</code>
                                <span style={{ marginLeft: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.courseName}</span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <div style={{ height: 6, width: 60, background: 'var(--gray-200)', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${(s.internalTotal / 110) * 100}%`, background: s.internalTotal >= 55 ? '#d97706' : '#dc2626', borderRadius: 3 }} />
                                  </div>
                                  <span style={{ fontWeight: 700, color: s.internalTotal >= 55 ? '#d97706' : '#dc2626' }}>{s.internalTotal}</span>
                                </div>
                              </td>
                              <td>
                                <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontWeight: 800, fontSize: '0.78rem', background: `${GRADE_COLORS[s.grade] || '#94a3b8'}22`, color: GRADE_COLORS[s.grade] || '#94a3b8' }}>
                                  {s.grade}
                                </span>
                              </td>
                              <td>
                                {s.isPassed === false
                                  ? <span style={{ background: '#fee2e2', color: '#dc2626', padding: '0.18rem 0.55rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700 }}>Failing</span>
                                  : <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.18rem 0.55rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700 }}>Low marks</span>}
                              </td>
                              <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {s.internalTotal < 40 ? '⛔ Urgent — remedial support' : s.internalTotal < 55 ? '⚠️ Counselling recommended' : '📚 Extra revision'}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {acData.allAtRiskStudents.length === 0 && !acLoading && (
                <div className="an-card an-empty">
                  <span>🏆</span>
                  <div>
                    <strong>No students below the at-risk threshold</strong>
                    <p>All students have internal marks above {atRiskMark}/110.</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
