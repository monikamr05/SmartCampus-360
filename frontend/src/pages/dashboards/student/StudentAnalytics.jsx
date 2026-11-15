import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, LineChart, Line, ReferenceLine,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area,
} from 'recharts';
import api from '../../../services/api';
import './StudentAnalytics.css';

/* ── helpers ── */
const setTitle = (t) => { const el = document.getElementById('st-page-title'); if (el) el.textContent = t; };
const pctColor   = (p) => p >= 75 ? '#059669' : p >= 60 ? '#d97706' : '#dc2626';
const scoreColor = (s) => s >= 70 ? '#059669' : s >= 50 ? '#d97706' : '#dc2626';
const GRADE_COLORS = { 'A+':'#15803d','A':'#059669','B+':'#1d4ed8','B':'#2563eb','C':'#d97706','D':'#c2410c','F':'#dc2626' };

/* ── Custom tooltip ── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="san-tooltip">
      {label && <div className="san-tooltip__label">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="san-tooltip__row">
          <span style={{ color: p.color || p.fill }}>■</span>
          <span>{p.name}:</span>
          <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

/* ── Prediction card ── */
const PredictionCard = ({ subject, disclaimer }) => {
  const { canReach, isCritical, currentPct, classesNeededMore,
          bestCasePct, worstCasePct, attended, totalClasses,
          consecutiveAbsencesBeforeShortage, remaining } = subject;

  return (
    <div className={`san-pred-card ${isCritical ? 'san-pred-card--critical' : currentPct < 75 ? 'san-pred-card--warn' : 'san-pred-card--ok'}`}>
      <div className="san-pred-card__header">
        <div>
          <span className="san-pred-card__code">{subject.courseCode}</span>
          <span className="san-pred-card__name">{subject.courseName}</span>
        </div>
        <div className={`san-pred-card__badge ${isCritical ? 'san-pred-card__badge--critical' : currentPct < 75 ? 'san-pred-card__badge--warn' : 'san-pred-card__badge--ok'}`}>
          {isCritical ? '⛔ Unavoidable shortage' : currentPct < 75 ? '⚠️ Shortage — recoverable' : '✓ On track'}
        </div>
      </div>

      {/* Current % ring */}
      <div className="san-pred-card__body">
        <div className="san-pred-card__ring-wrap">
          <svg viewBox="0 0 100 100" className="san-pred-ring">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="10"/>
            <circle cx="50" cy="50" r="40" fill="none"
              stroke={pctColor(currentPct)} strokeWidth="10"
              strokeDasharray={`${2 * Math.PI * 40 * currentPct / 100} ${2 * Math.PI * 40 * (1 - currentPct / 100)}`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
            <text x="50" y="46" textAnchor="middle" fontSize="18" fontWeight="800" fill={pctColor(currentPct)}>{currentPct}%</text>
            <text x="50" y="60" textAnchor="middle" fontSize="9" fill="#94a3b8">Current</text>
          </svg>
        </div>

        <div className="san-pred-card__details">
          <div className="san-pred-card__detail-row">
            <span>Attended</span>
            <strong>{attended} / {totalClasses} classes</strong>
          </div>
          {classesNeededMore > 0 && (
            <div className="san-pred-card__detail-row">
              <span>Classes needed to reach 75%</span>
              <strong style={{ color: canReach ? '#d97706' : '#dc2626' }}>
                {classesNeededMore} of {remaining} remaining
              </strong>
            </div>
          )}
          <div className="san-pred-card__detail-row">
            <span>Best case (attend all remaining)</span>
            <strong style={{ color: pctColor(bestCasePct) }}>{bestCasePct}%</strong>
          </div>
          <div className="san-pred-card__detail-row">
            <span>Worst case (miss all remaining)</span>
            <strong style={{ color: pctColor(worstCasePct) }}>{worstCasePct}%</strong>
          </div>
          {!subject.isShortage && (
            <div className="san-pred-card__detail-row">
              <span>Can miss before shortage</span>
              <strong style={{ color: '#d97706' }}>{consecutiveAbsencesBeforeShortage} consecutive classes</strong>
            </div>
          )}
        </div>
      </div>

      {/* Case range bar */}
      <div className="san-pred-range">
        <span className="san-pred-range__label">Range</span>
        <div className="san-pred-range__track">
          <div className="san-pred-range__fill"
            style={{
              left: `${worstCasePct}%`,
              width: `${bestCasePct - worstCasePct}%`,
              background: pctColor(currentPct),
            }}
          />
          <div className="san-pred-range__marker san-pred-range__marker--current"
            style={{ left: `${currentPct}%` }}
            title={`Current: ${currentPct}%`}
          />
          <div className="san-pred-range__marker san-pred-range__marker--threshold"
            title="75% threshold"
          />
        </div>
        <div className="san-pred-range__labels">
          <span>{worstCasePct}%</span>
          <span style={{ marginLeft: 'auto' }}>{bestCasePct}%</span>
        </div>
      </div>

      <p className="san-pred-card__disclaimer">{disclaimer}</p>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════ */
export default function StudentAnalytics() {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [remaining, setRemaining] = useState(20);
  const [tab,       setTab]       = useState('attendance'); // 'attendance' | 'academic'

  useEffect(() => { setTitle('My Analytics'); }, []);

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data: d } = await api.get(`/analytics/student?remaining=${remaining}&threshold=75`);
      setData(d);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [remaining]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return (
    <div className="st-loading" role="status">
      <div className="st-loading__spinner" /><span>Loading your analytics…</span>
    </div>
  );
  if (error) return (
    <div className="st-error" role="alert">
      <span>⚠️</span><div><strong>Failed to load analytics</strong><p>{error}</p></div>
    </div>
  );
  if (!data) return null;

  const { attendanceData, attendanceTrend, academicData, radarData,
          gpaTrend, weakSubjects, needsSupport, shortageSubjects,
          predictionParams } = data;

  return (
    <div className="st-page san-page">

      {/* ── Header ── */}
      <div className="san-header">
        <div className="san-header__left">
          <h1 className="st-page-title">My Analytics</h1>
          <p className="st-page-sub">Personal attendance predictions and academic performance insights</p>
        </div>
        <div className="san-header__controls">
          <div className="san-filter-group">
            <label className="san-filter-label">Remaining classes</label>
            <input className="san-input" type="number" min={0} max={100} value={remaining}
              onChange={e => setRemaining(Number(e.target.value))} style={{ width: 70 }} />
          </div>
          <button className="san-btn-refresh" onClick={fetchData}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
            Refresh
          </button>
        </div>
      </div>

      {/* ── Support alert ── */}
      {needsSupport && (
        <div className="san-support-alert" role="alert">
          <span className="san-support-alert__icon">🚨</span>
          <div className="san-support-alert__body">
            <strong>Academic Support Recommended</strong>
            <p>
              You have low marks or failing grades in{' '}
              <strong>{weakSubjects.length} subject{weakSubjects.length !== 1 ? 's' : ''}</strong>:{' '}
              {weakSubjects.map(s => s.courseName).join(', ')}.
              Consider speaking to your faculty or academic advisor.
            </p>
          </div>
        </div>
      )}

      {/* ── Shortage alert ── */}
      {shortageSubjects.length > 0 && (
        <div className="san-shortage-alert" role="alert">
          <span>⚠️</span>
          <div>
            <strong>Attendance Shortage in {shortageSubjects.length} subject{shortageSubjects.length !== 1 ? 's' : ''}</strong>
            <p>
              {shortageSubjects.map(s => `${s.courseName} (${s.currentPct}%)`).join(', ')}.
              Minimum required attendance is 75%.
            </p>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="san-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'attendance'}
          className={`san-tab ${tab === 'attendance' ? 'san-tab--active' : ''}`}
          onClick={() => setTab('attendance')}>
          ✅ Attendance Analytics
        </button>
        <button role="tab" aria-selected={tab === 'academic'}
          className={`san-tab ${tab === 'academic' ? 'san-tab--active' : ''}`}
          onClick={() => setTab('academic')}>
          🎓 Academic Analytics
        </button>
      </div>

      {/* ══════════════════════════════════════════════
          ATTENDANCE TAB
      ══════════════════════════════════════════════ */}
      {tab === 'attendance' && (
        <div className="san-content">

          {/* Disclaimer */}
          <div className="san-disclaimer">
            <span>ℹ️</span>
            <span>{predictionParams.disclaimer}</span>
          </div>

          {/* Subject-wise overview bar chart */}
          {attendanceData.length > 0 && (
            <div className="st-panel">
              <div className="st-panel__header">
                <div className="st-panel__title">Subject-wise Attendance Overview</div>
                <div className="st-panel__sub">Current attendance % per subject — 75% minimum required</div>
              </div>
              <ResponsiveContainer width="100%" height={Math.max(220, attendanceData.length * 42)}>
                <BarChart data={attendanceData} layout="vertical" margin={{ top: 5, right: 60, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="%" />
                  <YAxis type="category" dataKey="courseCode" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={55} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div className="san-tooltip">
                          <div className="san-tooltip__label">{d.courseName}</div>
                          <div className="san-tooltip__row"><span style={{ color: pctColor(d.currentPct) }}>■</span><span>Attendance:</span><strong>{d.currentPct}%</strong></div>
                          <div className="san-tooltip__row"><span style={{ color: '#94a3b8' }}>■</span><span>Attended:</span><strong>{d.attended}/{d.totalClasses}</strong></div>
                          <div className="san-tooltip__row"><span style={{ color: '#2563eb' }}>■</span><span>Best case:</span><strong>{d.bestCasePct}%</strong></div>
                          <div className="san-tooltip__row"><span style={{ color: '#dc2626' }}>■</span><span>Worst case:</span><strong>{d.worstCasePct}%</strong></div>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine x={75} stroke="#d97706" strokeDasharray="5 3" strokeWidth={1.5}
                    label={{ value: '75%', position: 'right', fontSize: 11, fill: '#d97706' }} />
                  <Bar dataKey="currentPct" name="Attendance %" radius={[0, 5, 5, 0]}>
                    {attendanceData.map((d, i) => <Cell key={i} fill={pctColor(d.currentPct)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Per-subject prediction cards */}
          {attendanceData.length > 0 && (
            <div className="san-pred-grid">
              {attendanceData.map(s => (
                <PredictionCard key={s.courseId} subject={s} disclaimer={predictionParams.disclaimer} />
              ))}
            </div>
          )}

          {/* Attendance trend (area chart) */}
          {attendanceTrend.length > 1 && (
            <div className="st-panel">
              <div className="st-panel__header">
                <div className="st-panel__title">Daily Attendance Trend</div>
                <div className="st-panel__sub">Your aggregated daily attendance % across all subjects (last 20 days)</div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={attendanceTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="attTrendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#059669" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                    tickFormatter={d => d.slice(5)} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip content={<ChartTooltip />} />
                  <ReferenceLine y={75} stroke="#d97706" strokeDasharray="5 3" strokeWidth={1.5}
                    label={{ value: '75% min', position: 'right', fontSize: 10, fill: '#d97706' }} />
                  <Area type="monotone" dataKey="pct" name="Daily %" stroke="#059669" strokeWidth={2.5}
                    fill="url(#attTrendGrad)" dot={{ r: 3, fill: '#059669', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {attendanceData.length === 0 && (
            <div className="st-panel san-empty">
              <span>📋</span>
              <div><strong>No attendance records found</strong><p>Attendance data will appear here once your faculty starts marking classes.</p></div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          ACADEMIC TAB
      ══════════════════════════════════════════════ */}
      {tab === 'academic' && (
        <div className="san-content">

          {/* Subject-wise performance bar chart */}
          {academicData.length > 0 && (
            <div className="st-panel">
              <div className="st-panel__header">
                <div className="st-panel__title">Subject-wise Internal Marks</div>
                <div className="st-panel__sub">Your internal marks breakdown per subject (total out of 110)</div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={academicData} margin={{ top: 5, right: 20, left: 0, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="courseCode" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" />
                  <YAxis domain={[0, 110]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div className="san-tooltip">
                          <div className="san-tooltip__label">{d.courseName}</div>
                          <div className="san-tooltip__row"><span style={{ color: '#2563eb' }}>■</span><span>Assign 1+2:</span><strong>{d.assignment1 + d.assignment2}/50</strong></div>
                          <div className="san-tooltip__row"><span style={{ color: '#7c3aed' }}>■</span><span>Midterm:</span><strong>{d.midterm}/50</strong></div>
                          <div className="san-tooltip__row"><span style={{ color: '#0891b2' }}>■</span><span>Quiz:</span><strong>{d.quiz}/10</strong></div>
                          <div className="san-tooltip__row"><span style={{ color: GRADE_COLORS[d.grade] || '#94a3b8' }}>■</span><span>Total:</span><strong>{d.total}/110 ({d.grade})</strong></div>
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine y={55} stroke="#d97706" strokeDasharray="5 3" strokeWidth={1.5}
                    label={{ value: 'Pass threshold', position: 'right', fontSize: 10, fill: '#d97706' }} />
                  <Bar dataKey="assignment1" stackId="a" name="Assignment 1" fill="#60a5fa" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="assignment2" stackId="a" name="Assignment 2" fill="#2563eb" />
                  <Bar dataKey="midterm"     stackId="a" name="Midterm"      fill="#7c3aed" />
                  <Bar dataKey="quiz"        stackId="a" name="Quiz"         fill="#0891b2" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Radar chart: component averages */}
          {radarData.length > 0 && (
            <div className="san-two-col">
              <div className="st-panel">
                <div className="st-panel__header">
                  <div className="st-panel__title">Performance Radar</div>
                  <div className="st-panel__sub">Score distribution across assessment types per subject</div>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <PolarRadiusAxis angle={90} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Radar name="Assignment" dataKey="Assignment" stroke="#2563eb" fill="#2563eb" fillOpacity={0.15} />
                    <Radar name="Midterm"    dataKey="Midterm"    stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.12} />
                    <Radar name="Quiz"       dataKey="Quiz"       stroke="#0891b2" fill="#0891b2" fillOpacity={0.12} />
                    <Radar name="External"   dataKey="External"   stroke="#059669" fill="#059669" fillOpacity={0.12} />
                    <Legend iconSize={9} wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* GPA trend */}
              {gpaTrend.length > 0 && (
                <div className="st-panel">
                  <div className="st-panel__header">
                    <div className="st-panel__title">GPA Trend by Semester</div>
                    <div className="st-panel__sub">Your grade point average progression over semesters</div>
                  </div>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={gpaTrend} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="semester" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 4]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <ReferenceLine y={2.0} stroke="#d97706" strokeDasharray="5 3" strokeWidth={1.5}
                        label={{ value: 'Min GPA', position: 'right', fontSize: 10, fill: '#d97706' }} />
                      <Line type="monotone" dataKey="gpa" name="GPA" stroke="#059669" strokeWidth={2.5}
                        dot={{ r: 5, fill: '#059669', strokeWidth: 0 }} activeDot={{ r: 7 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Per-subject cards with mark breakdown */}
          {academicData.length > 0 && (
            <div className="st-panel">
              <div className="st-panel__header">
                <div className="st-panel__title">Subject-wise Result Cards</div>
              </div>
              <div className="san-result-grid">
                {academicData.map(r => (
                  <div key={r.courseId}
                    className={`san-result-card ${!r.isPassed && r.isPassed !== null ? 'san-result-card--fail' : r.total < 55 ? 'san-result-card--risk' : 'san-result-card--ok'}`}>
                    <div className="san-result-card__header">
                      <div>
                        <span className="san-result-card__code">{r.courseCode}</span>
                        <span className="san-result-card__name">{r.courseName}</span>
                      </div>
                      <div className="san-result-card__grade"
                        style={{ background: `${GRADE_COLORS[r.grade] || '#94a3b8'}20`, color: GRADE_COLORS[r.grade] || '#94a3b8' }}>
                        {r.grade}
                      </div>
                    </div>
                    {/* Score bar segments */}
                    <div className="san-result-card__bar-row">
                      {[
                        { label: 'A1',  val: r.assignment1, max: 25, color: '#60a5fa' },
                        { label: 'A2',  val: r.assignment2, max: 25, color: '#2563eb' },
                        { label: 'Mid', val: r.midterm,     max: 50, color: '#7c3aed' },
                        { label: 'Qz',  val: r.quiz,        max: 10, color: '#0891b2' },
                      ].map(seg => (
                        <div key={seg.label} className="san-result-card__seg">
                          <div className="san-result-card__seg-track">
                            <div style={{ width: `${(seg.val / seg.max) * 100}%`, background: seg.color, height: '100%', borderRadius: 2, transition: 'width 0.6s ease' }} />
                          </div>
                          <span className="san-result-card__seg-label">{seg.label}: <strong>{seg.val}</strong></span>
                        </div>
                      ))}
                    </div>
                    <div className="san-result-card__total">
                      Total: <strong style={{ color: scoreColor(r.total) }}>{r.total}/110</strong>
                      {r.isPassed === false && <span className="san-result-card__fail-badge">✗ Fail</span>}
                      {r.isPassed === true  && <span className="san-result-card__pass-badge">✓ Pass</span>}
                    </div>
                    {(r.total < 55) && (
                      <div className="san-result-card__warning">
                        {r.total < 44 ? '⛔ Urgent: speak to your faculty advisor immediately' : '⚠️ Below average — additional study recommended'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {academicData.length === 0 && (
            <div className="st-panel san-empty">
              <span>📝</span>
              <div><strong>No results published yet</strong><p>Your marks will appear here once your faculty enters and publishes them.</p></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
