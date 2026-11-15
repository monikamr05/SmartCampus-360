import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import api from '../../../services/api';
import './StudentResults.css';

const setTitle = (t) => { const el = document.getElementById('st-page-title'); if (el) el.textContent = t; };

const GRADE_STYLE = {
  'A+': { bg: '#dcfce7', color: '#15803d' }, 'A': { bg: '#d1fae5', color: '#065f46' },
  'B+': { bg: '#dbeafe', color: '#1d4ed8' }, 'B': { bg: '#eff6ff', color: '#2563eb' },
  'C+': { bg: '#fef9c3', color: '#854d0e' }, 'C': { bg: '#fefce8', color: '#a16207' },
  'D':  { bg: '#ffedd5', color: '#c2410c' }, 'F': { bg: '#fee2e2', color: '#dc2626' },
};

const GradePill = ({ grade }) => {
  const s = GRADE_STYLE[grade] || { bg: '#f1f5f9', color: '#64748b' };
  return (
    <span className="res-grade-pill" style={{ background: s.bg, color: s.color }}>
      {grade || '—'}
    </span>
  );
};

const ScoreBar = ({ value, max, color }) => (
  <div className="res-score-bar-wrap">
    <div className="res-score-bar">
      <div className="res-score-bar__fill" style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }}/>
    </div>
    <span className="res-score-bar__val">{value}<span className="res-score-bar__max">/{max}</span></span>
  </div>
);

const StudentResults = () => {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [activeSem,  setActiveSem]  = useState(null);
  const [view,       setView]       = useState('table'); // 'table' | 'chart'

  useEffect(() => {
    setTitle('Exam Results');
    api.get('/student/results')
      .then(r => {
        setData(r.data);
        if (r.data.semesterSummaries?.length) {
          setActiveSem(r.data.semesterSummaries[r.data.semesterSummaries.length - 1].semester);
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="st-loading"><div className="st-loading__spinner"/><span>Loading results…</span></div>;
  if (error)   return <div className="st-error"><span>⚠️</span><div><strong>Error</strong><p>{error}</p></div></div>;

  const { semesterSummaries = [], overallGpa } = data;

  if (!semesterSummaries.length)
    return (
      <div className="st-page">
        <div className="st-panel"><p className="st-empty">No results published yet.</p></div>
      </div>
    );

  const activeSummary = semesterSummaries.find(s => s.semester === activeSem) || semesterSummaries[0];
  const results = activeSummary.results;

  /* Radar data for spider chart */
  const radarData = results.map(r => ({
    subject: r.courseCode || r.courseName?.slice(0, 8),
    marks: r.external?.marksObtained ?? 0,
    fullMark: r.external?.maxMarks ?? 100,
  }));

  /* Bar data: internal vs external */
  const barData = results.map(r => ({
    name: r.courseCode || r.courseName?.slice(0, 10),
    internal: r.internal?.total ?? 0,
    external: r.external?.marksObtained ?? 0,
    courseName: r.courseName,
  }));

  return (
    <div className="st-page res-page">

      {/* Header */}
      <div className="st-page-header">
        <div className="st-page-header__left">
          <h1 className="st-page-title">Exam Results</h1>
          <p className="st-page-sub">Academic performance across all semesters</p>
        </div>
        <div className="res-controls">
          <div className="att-view-toggle">
            <button className={`att-view-btn ${view==='table'?'att-view-btn--active':''}`} onClick={()=>setView('table')}>Table</button>
            <button className={`att-view-btn ${view==='chart'?'att-view-btn--active':''}`} onClick={()=>setView('chart')}>Charts</button>
          </div>
        </div>
      </div>

      {/* CGPA banner */}
      <div className="res-gpa-banner">
        <div className="res-gpa-banner__main">
          <span className="res-gpa-banner__val">{Number(overallGpa).toFixed(2)}</span>
          <span className="res-gpa-banner__lbl">Cumulative GPA</span>
        </div>
        <div className="res-gpa-banner__sems">
          {semesterSummaries.map(s => (
            <button
              key={s.semester}
              className={`res-sem-btn ${activeSem === s.semester ? 'res-sem-btn--active' : ''}`}
              onClick={() => setActiveSem(s.semester)}
            >
              <span>Sem {s.semester}</span>
              <span className="res-sem-btn__gpa">{s.sgpa.toFixed(2)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* SGPA card */}
      <div className="res-sem-header">
        <span className="res-sem-header__label">Semester {activeSem} Results</span>
        <div className="res-sem-header__sgpa">
          SGPA: <strong>{activeSummary.sgpa.toFixed(2)}</strong>
        </div>
      </div>

      {/* Table view */}
      {view === 'table' && (
        <div className="st-panel">
          <div className="res-table-wrap">
            <table className="res-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Assign 1 <span className="res-th-max">/25</span></th>
                  <th>Assign 2 <span className="res-th-max">/25</span></th>
                  <th>Midterm <span className="res-th-max">/50</span></th>
                  <th>Quiz <span className="res-th-max">/10</span></th>
                  <th>Internal <span className="res-th-max">/100</span></th>
                  <th>External <span className="res-th-max">/100</span></th>
                  <th>Grade</th>
                  <th>GP</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r._id}>
                    <td>
                      <div className="res-subj-cell">
                        <span className="res-subj-name">{r.courseName}</span>
                        <span className="res-subj-code">{r.courseCode}</span>
                      </div>
                    </td>
                    <td>{r.internal.assignment1}</td>
                    <td>{r.internal.assignment2}</td>
                    <td>
                      <ScoreBar value={r.internal.midterm} max={50} color="#2563eb"/>
                    </td>
                    <td>{r.internal.quiz}</td>
                    <td>
                      <ScoreBar value={r.internal.total} max={100} color="#059669"/>
                    </td>
                    <td>
                      <ScoreBar value={r.external.marksObtained} max={r.external.maxMarks || 100} color="#7c3aed"/>
                    </td>
                    <td><GradePill grade={r.grade}/></td>
                    <td><strong>{r.gradePoint}</strong></td>
                    <td>
                      <span className={`res-status ${r.isPassed ? 'res-status--pass' : 'res-status--fail'}`}>
                        {r.isPassed ? '✓ Pass' : '✗ Fail'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Chart view */}
      {view === 'chart' && (
        <div className="res-charts-row">
          {/* Internal vs External bar */}
          <div className="st-panel res-chart-panel">
            <div className="st-panel__header"><div className="st-panel__title">Internal vs External Marks</div></div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData} margin={{ top: 5, right: 20, left: 0, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} angle={-30} textAnchor="end"/>
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}/>
                <Bar dataKey="internal" name="Internal" fill="#059669" radius={[4,4,0,0]}/>
                <Bar dataKey="external" name="External" fill="#2563eb" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Radar chart */}
          <div className="st-panel res-chart-panel">
            <div className="st-panel__header"><div className="st-panel__title">Subject Performance Radar</div></div>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke="#e2e8f0"/>
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#64748b' }}/>
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }}/>
                <Radar name="Marks" dataKey="marks" stroke="#059669" fill="#059669" fillOpacity={0.25}/>
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}/>
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentResults;
