import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import api from '../../../services/api';
import './FacultyPerformance.css';

const setTitle = (t) => { const el = document.getElementById('fc-page-title'); if (el) el.textContent = t; };
const GRADE_COLORS = { 'A+':'#15803d','A':'#059669','B+':'#1d4ed8','B':'#2563eb','C':'#d97706','D':'#c2410c','F':'#dc2626' };
const ATT_COLORS   = ['#dc2626','#d97706','#2563eb','#059669'];

const FacultyPerformance = () => {
  const [courses,   setCourses]   = useState([]);
  const [courseId,  setCourseId]  = useState('');
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    setTitle('Student Performance');
    api.get('/faculty/courses').then(r => {
      setCourses(r.data.courses);
      if (r.data.courses.length) setCourseId(r.data.courses[0]._id);
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (!courseId) return;
    setLoading(true); setError('');
    try { const { data: d } = await api.get(`/faculty/performance/${courseId}`); setData(d); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [courseId]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="fc-page perf-page">
      <div className="fc-page-header">
        <div className="fc-page-header__left">
          <h1 className="fc-page-title">Student Performance</h1>
          <p className="fc-page-sub">Analytics and reports for your classes</p>
        </div>
      </div>

      <div className="fc-panel">
        <label className="form-label">Select Course</label>
        <select className="form-input" value={courseId} onChange={e => setCourseId(e.target.value)} style={{ maxWidth: 360 }}>
          {courses.map(c => <option key={c._id} value={c._id}>{c.code} — {c.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="fc-loading"><div className="fc-loading__spinner"/><span>Loading…</span></div>
      ) : error ? (
        <div className="fc-error"><span>⚠️</span><div><strong>Error</strong><p>{error}</p></div></div>
      ) : data && (
        <>
          {/* Summary cards */}
          <div className="perf-summary-grid">
            {[
              { icon:'👨‍🎓', label:'Total Students', value: data.summary.totalStudents, color:'amber' },
              { icon:'✅',   label:'Passed',          value: data.summary.passCount,     color:'green' },
              { icon:'❌',   label:'Failed',           value: data.summary.failCount,     color:'red'   },
              { icon:'📊',   label:'Avg Internal',    value: `${data.summary.avgInternal}/110`, color:'blue' },
            ].map(c => (
              <div key={c.label} className={`perf-card perf-card--${c.color}`}>
                <span className="perf-card__icon">{c.icon}</span>
                <div>
                  <div className="perf-card__val">{c.value}</div>
                  <div className="perf-card__lbl">{c.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="perf-charts-row">
            {/* Grade distribution bar */}
            <div className="fc-panel">
              <div className="fc-panel__header"><div className="fc-panel__title">Grade Distribution</div></div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.gradeDist} margin={{ top:5, right:20, left:0, bottom:5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                  <XAxis dataKey="grade" tick={{ fontSize:12, fill:'#94a3b8' }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontSize:12, fill:'#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false}/>
                  <Tooltip contentStyle={{ borderRadius:10, border:'1px solid #e2e8f0', fontSize:13 }}/>
                  <Bar dataKey="count" radius={[6,6,0,0]}>
                    {data.gradeDist.map((d, i) => <Cell key={i} fill={GRADE_COLORS[d.grade] || '#94a3b8'}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Attendance pie */}
            <div className="fc-panel">
              <div className="fc-panel__header"><div className="fc-panel__title">Attendance Distribution</div></div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={data.attDist} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={80} paddingAngle={3}>
                    {data.attDist.map((_, i) => <Cell key={i} fill={ATT_COLORS[i % ATT_COLORS.length]}/>)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius:10, border:'1px solid #e2e8f0', fontSize:12 }}/>
                  <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize:12 }}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top performers */}
          {data.topPerformers.length > 0 && (
            <div className="fc-panel">
              <div className="fc-panel__header"><div className="fc-panel__title">🏆 Top Performers</div></div>
              <div className="perf-top-list">
                {data.topPerformers.map((s, i) => (
                  <div key={i} className={`perf-top-item perf-top-item--${i===0?'gold':i===1?'silver':'bronze'}`}>
                    <span className="perf-top-item__rank">{i+1}</span>
                    <div className="perf-top-item__info">
                      <span className="perf-top-item__name">{s.name}</span>
                      <span className="perf-top-item__id">{s.studentId}</span>
                    </div>
                    <div className="perf-top-item__right">
                      <span className="perf-top-item__total">{s.total}/110</span>
                      <span className="perf-grade-pill" style={{ background:`${GRADE_COLORS[s.grade]}22`, color:GRADE_COLORS[s.grade] }}>{s.grade}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full student table */}
          <div className="fc-panel">
            <div className="fc-panel__header"><div className="fc-panel__title">All Students — Marks & Attendance</div></div>
            {data.students.length === 0 ? (
              <p className="fc-empty">No data yet. Enter marks to see performance.</p>
            ) : (
              <div className="fc-table-wrap">
                <table className="fc-table">
                  <thead>
                    <tr><th>#</th><th>Student</th><th>ID</th><th>Internal /110</th><th>Grade</th><th>Attendance</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {data.students.map((s, i) => (
                      <tr key={s.studentId}>
                        <td style={{ color:'var(--text-muted)', fontSize:'0.8rem' }}>{i+1}</td>
                        <td style={{ fontWeight:600 }}>{s.name}</td>
                        <td><code style={{ fontSize:'0.78rem', background:'var(--gray-100)', padding:'0.1rem 0.4rem', borderRadius:4 }}>{s.studentId}</code></td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                            <div style={{ height:6, width:60, background:'var(--gray-200)', borderRadius:3, overflow:'hidden' }}>
                              <div style={{ height:'100%', width:`${Math.min(100,(s.internalTotal/110)*100)}%`, background: s.internalTotal>=66?'#059669':s.internalTotal>=44?'#d97706':'#dc2626', borderRadius:3 }}/>
                            </div>
                            <span style={{ fontWeight:700, fontSize:'0.82rem' }}>{s.internalTotal}</span>
                          </div>
                        </td>
                        <td>
                          <span className="perf-grade-pill" style={{ background:`${GRADE_COLORS[s.grade]||'#94a3b8'}22`, color:GRADE_COLORS[s.grade]||'#94a3b8' }}>{s.grade}</span>
                        </td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
                            <div style={{ height:6, width:50, background:'var(--gray-200)', borderRadius:3, overflow:'hidden' }}>
                              <div style={{ height:'100%', width:`${s.attendancePct}%`, background: s.attendancePct>=75?'#059669':s.attendancePct>=60?'#d97706':'#dc2626', borderRadius:3 }}/>
                            </div>
                            <span style={{ fontSize:'0.78rem', fontWeight:700, color: s.attendancePct>=75?'#059669':s.attendancePct<60?'#dc2626':'#d97706' }}>{s.attendancePct}%</span>
                          </div>
                        </td>
                        <td><span className={`fc-badge ${s.isPassed?'fc-badge--green':'fc-badge--red'}`}>{s.isPassed?'Pass':'Fail'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default FacultyPerformance;
