import React, { useEffect, useState } from 'react';
import {
  RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell,
} from 'recharts';
import api from '../../../services/api';
import './StudentAttendance.css';

const setTitle = (t) => { const el = document.getElementById('st-page-title'); if (el) el.textContent = t; };

/* colour by attendance % */
const attColor = (pct) => pct >= 85 ? '#059669' : pct >= 75 ? '#d97706' : '#dc2626';

/* how many more classes to attend to reach 75 % */
const classesNeeded = (attended, total) => {
  if (!total) return 0;
  const pct = (attended / total) * 100;
  if (pct >= 75) return 0;
  // (attended + x) / (total + x) = 0.75  →  x = (0.75*total - attended) / 0.25
  return Math.ceil((0.75 * total - attended) / 0.25);
};

const SemSelect = ({ value, onChange }) => (
  <select className="att-sem-select" value={value} onChange={e => onChange(e.target.value)}>
    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
  </select>
);

/* ── Donut ring (single subject or overall) ── */
const Ring = ({ pct, size = 120, label }) => {
  const color = attColor(pct);
  return (
    <div className="att-ring-wrap" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart innerRadius="70%" outerRadius="90%"
          startAngle={90} endAngle={-270}
          data={[{ value: pct, fill: color }]}>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" cornerRadius={6} background={{ fill: '#f1f5f9' }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="att-ring-center">
        <span className="att-ring-pct" style={{ color }}>{pct}%</span>
        {label && <span className="att-ring-lbl">{label}</span>}
      </div>
    </div>
  );
};

/* ── Custom Tooltip for bar chart ── */
const BarTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="att-tooltip">
      <div className="att-tooltip__title">{d.courseName}</div>
      <div className="att-tooltip__row"><span>Attended</span><strong>{d.attended}/{d.totalClasses}</strong></div>
      <div className="att-tooltip__row"><span>Percentage</span><strong style={{ color: attColor(d.percentage) }}>{d.percentage}%</strong></div>
    </div>
  );
};

const StudentAttendance = () => {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [semester,  setSemester]  = useState('');
  const [view,      setView]      = useState('cards'); // 'cards' | 'chart'

  useEffect(() => { setTitle('Attendance'); }, []);

  useEffect(() => {
    setLoading(true); setError('');
    const q = semester ? `?semester=${semester}` : '';
    api.get(`/student/attendance${q}`)
      .then(r => { setData(r.data); if (!semester) setSemester(String(r.data.semester)); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [semester]);

  if (loading) return <div className="st-loading"><div className="st-loading__spinner"/><span>Loading attendance…</span></div>;
  if (error)   return <div className="st-error"><span>⚠️</span><div><strong>Error</strong><p>{error}</p></div></div>;

  const { subjects = [], overall = 0, shortage = [] } = data;

  return (
    <div className="st-page att-page">

      {/* Header */}
      <div className="st-page-header">
        <div className="st-page-header__left">
          <h1 className="st-page-title">Attendance</h1>
          <p className="st-page-sub">Subject-wise attendance for Semester {semester}</p>
        </div>
        <div className="att-header-right">
          <SemSelect value={semester} onChange={setSemester} />
          <div className="att-view-toggle">
            <button className={view === 'cards' ? 'att-view-btn att-view-btn--active' : 'att-view-btn'} onClick={() => setView('cards')}>Cards</button>
            <button className={view === 'chart' ? 'att-view-btn att-view-btn--active' : 'att-view-btn'} onClick={() => setView('chart')}>Chart</button>
          </div>
        </div>
      </div>

      {/* Overall summary */}
      <div className="att-summary">
        <div className="att-summary__ring">
          <Ring pct={overall} size={160} label="Overall" />
        </div>
        <div className="att-summary__info">
          <div className="att-summary__kpis">
            {[
              { label: 'Total Subjects', value: subjects.length },
              { label: 'On Track (≥75%)', value: subjects.filter(s => s.percentage >= 75).length, color: '#059669' },
              { label: 'At Risk (60–74%)',  value: subjects.filter(s => s.percentage >= 60 && s.percentage < 75).length, color: '#d97706' },
              { label: 'Critical (<60%)',   value: subjects.filter(s => s.percentage < 60).length, color: '#dc2626' },
            ].map(k => (
              <div key={k.label} className="att-kpi">
                <span className="att-kpi__val" style={k.color ? { color: k.color } : {}}>{k.value}</span>
                <span className="att-kpi__lbl">{k.label}</span>
              </div>
            ))}
          </div>
          {shortage.length > 0 && (
            <div className="att-summary__warning">
              <span>⚠️</span>
              <div>
                <strong>Attendance Shortage in {shortage.length} subject{shortage.length > 1 ? 's' : ''}</strong>
                <p>You must attend more classes to avoid being barred from exams. Minimum required: 75%.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Shortage detail cards */}
      {shortage.length > 0 && (
        <div className="st-panel att-shortage-panel">
          <div className="st-panel__header">
            <div className="st-panel__title">⚠️ Shortage Details</div>
            <span className="st-panel__badge st-panel__badge--danger">{shortage.length} subject{shortage.length > 1 ? 's' : ''}</span>
          </div>
          <div className="att-shortage-grid">
            {shortage.map(s => {
              const needed = classesNeeded(s.attended, s.totalClasses);
              return (
                <div key={s._id || s.courseName} className="att-shortage-card">
                  <div className="att-shortage-card__header">
                    <span className="att-shortage-card__code">{s.courseCode}</span>
                    <span className="att-shortage-card__pct" style={{ color: attColor(s.percentage) }}>{s.percentage}%</span>
                  </div>
                  <div className="att-shortage-card__name">{s.courseName}</div>
                  <div className="att-shortage-card__bar-wrap">
                    <div className="att-shortage-card__bar">
                      <div className="att-shortage-card__bar-fill" style={{ width: `${s.percentage}%`, background: attColor(s.percentage) }}/>
                      <div className="att-shortage-card__bar-min" style={{ left: '75%' }} title="75% minimum"/>
                    </div>
                  </div>
                  <div className="att-shortage-card__stats">
                    <span>{s.attended}/{s.totalClasses} classes</span>
                    {needed > 0 && <span className="att-shortage-card__needed">Attend {needed} more to reach 75%</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Subject list — cards or chart */}
      {subjects.length === 0 ? (
        <div className="st-panel"><p className="st-empty">No attendance records for this semester.</p></div>
      ) : view === 'chart' ? (
        <div className="st-panel">
          <div className="st-panel__header"><div className="st-panel__title">Subject-wise Attendance</div></div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={subjects} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
              <XAxis dataKey="courseCode" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} angle={-35} textAnchor="end"/>
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="%"/>
              <Tooltip content={<BarTooltip />}/>
              <ReferenceLine y={75} stroke="#d97706" strokeDasharray="5 3" strokeWidth={1.5} label={{ value: '75% min', position: 'right', fontSize: 11, fill: '#d97706' }}/>
              <Bar dataKey="percentage" radius={[6,6,0,0]}>
                {subjects.map((s, i) => <Cell key={i} fill={attColor(s.percentage)}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="att-cards-grid">
          {subjects.map(s => {
            const color = attColor(s.percentage);
            const needed = classesNeeded(s.attended, s.totalClasses);
            return (
              <div key={s._id} className="att-subj-card">
                <div className="att-subj-card__top">
                  <div className="att-subj-card__info">
                    <span className="att-subj-card__code">{s.courseCode}</span>
                    <span className="att-subj-card__name">{s.courseName}</span>
                    {s.instructor && <span className="att-subj-card__inst">{s.instructor}</span>}
                  </div>
                  <Ring pct={s.percentage} size={80} />
                </div>
                {/* Progress bar */}
                <div className="att-subj-card__bar-wrap">
                  <div className="att-subj-card__bar">
                    <div className="att-subj-card__fill" style={{ width: `${s.percentage}%`, background: color }}/>
                    <div className="att-subj-card__min-line" title="75% minimum"/>
                  </div>
                  <span className="att-subj-card__bar-pct" style={{ color }}>{s.percentage}%</span>
                </div>
                <div className="att-subj-card__footer">
                  <span>{s.attended} attended / {s.absent} absent / {s.totalClasses} total</span>
                  {needed > 0 && <span className="att-subj-card__needed">Need {needed} more</span>}
                </div>
                {/* Recent record dots */}
                {s.records?.length > 0 && (
                  <div className="att-subj-card__dots" aria-label="Recent attendance">
                    {s.records.map((r, i) => (
                      <span key={i}
                        className={`att-dot ${r.present ? 'att-dot--present' : 'att-dot--absent'}`}
                        title={`${new Date(r.date).toLocaleDateString()} — ${r.present ? 'Present' : 'Absent'}`}
                      />
                    ))}
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

export default StudentAttendance;
