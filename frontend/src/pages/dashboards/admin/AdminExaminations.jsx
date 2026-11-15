import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import api from '../../../services/api';
import './shared.css';
import './AdminExaminations.css';

const setTitle = (t) => { const el = document.getElementById('page-title'); if (el) el.textContent = t; };
const initials = (n='') => n.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase() || '?';
const Toast = ({msg}) => msg.text
  ? <div className={`mgmt-toast mgmt-toast--${msg.type}`} role="alert">{msg.type==='success'?'✓':'✗'} {msg.text}</div>
  : null;

const GRADE_COLORS = {'A+':'#15803d','A':'#059669','B+':'#1d4ed8','B':'#2563eb','C':'#d97706','D':'#c2410c','F':'#dc2626'};
const computeGrade = (t) => t>=90?'A+':t>=80?'A':t>=70?'B+':t>=60?'B':t>=50?'C':t>=40?'D':'F';
const computeTotal = (f) => Number(f.assignment1||0)+Number(f.assignment2||0)+Number(f.midterm||0)+Number(f.quiz||0);

export default function AdminExaminations() {
  const [departments, setDepartments] = useState([]);

  /* overview */
  const [overview,  setOverview]  = useState([]);
  const [ovLoading, setOvLoading] = useState(true);
  const [ovPagination, setOvPagination] = useState({total:0,page:1,totalPages:1});
  const [page, setPage]           = useState(1);
  const [deptFilter, setDeptFilter] = useState('');
  const [semFilter,  setSemFilter]  = useState('');
  const [search,     setSearch]     = useState('');

  /* selected course */
  const [activeCourse, setActiveCourse] = useState(null);
  const [courseData,   setCourseData]   = useState(null);
  const [cLoading,     setCLoading]     = useState(false);

  /* inline editing */
  const [editing, setEditing]     = useState(null); // studentId
  const [editForm, setEditForm]   = useState({});
  const [saving,  setSaving]      = useState({});
  const [view,    setView]        = useState('table'); // 'table' | 'chart'

  const [toast, setToast] = useState({type:'',text:''});
  const showToast = (t, x) => { setToast({type:t,text:x}); setTimeout(()=>setToast({type:'',text:''}),3500); };

  useEffect(() => {
    setTitle('Examinations');
    api.get('/admin/departments/all').then(r=>setDepartments(r.data)).catch(()=>{});
  }, []);

  /* load overview */
  const loadOverview = useCallback(async () => {
    setOvLoading(true);
    try {
      const params = new URLSearchParams({ page, limit:12 });
      if (deptFilter) params.set('departmentId', deptFilter);
      if (semFilter)  params.set('semester',     semFilter);
      if (search)     params.set('search',       search);
      const { data } = await api.get(`/academic/exams?${params}`);
      setOverview(data.summary);
      setOvPagination(data.pagination);
    } catch (e) { showToast('error', e.message); }
    finally { setOvLoading(false); }
  }, [deptFilter, semFilter, search, page]);

  useEffect(() => { loadOverview(); }, [loadOverview]);
  useEffect(() => { setPage(1); }, [deptFilter, semFilter, search]);

  /* load course results */
  const loadCourse = useCallback(async (id) => {
    if (!id) return;
    setCLoading(true);
    try {
      const { data } = await api.get(`/academic/exams/${id}`);
      setCourseData(data);
    } catch (e) { showToast('error', e.message); }
    finally { setCLoading(false); }
  }, []);

  useEffect(() => { if (activeCourse) loadCourse(activeCourse); }, [activeCourse]);

  /* edit helpers */
  const startEdit = (row) => {
    setEditing(row.student._id);
    setEditForm({
      assignment1: row.internal.assignment1,
      assignment2: row.internal.assignment2,
      midterm:     row.internal.midterm,
      quiz:        row.internal.quiz,
      marksObtained: row.external.marksObtained,
      maxMarks:      row.external.maxMarks || 100,
      remarks:     row.remarks || '',
    });
  };
  const cancelEdit = () => { setEditing(null); setEditForm({}); };
  const setF = (k, v) => setEditForm(f => ({...f,[k]:v}));

  const handleSave = async (studentId) => {
    setSaving(s=>({...s,[studentId]:true}));
    try {
      await api.put(`/academic/exams/${activeCourse}/${studentId}`, editForm);
      showToast('success', 'Marks saved.');
      setEditing(null);
      loadCourse(activeCourse);
      loadOverview();
    } catch (e) { showToast('error', e.message); }
    finally { setSaving(s=>({...s,[studentId]:false})); }
  };

  const handlePublish = async () => {
    try {
      const { data } = await api.put(`/academic/exams/${activeCourse}/publish`);
      showToast('success', data.message);
      loadCourse(activeCourse);
    } catch (e) { showToast('error', e.message); }
  };

  /* grade distribution chart data */
  const gradeDistChart = activeCourse
    ? Object.entries(overview.find(o=>o.course._id===activeCourse)?.gradeDist||{}).map(([g,c])=>({grade:g,count:c}))
    : [];

  const previewTotal = computeTotal(editForm);
  const previewGrade = computeGrade(previewTotal);

  const pages = Array.from({length:ovPagination.totalPages},(_, i)=>i+1);

  return (
    <div className="mgmt-page">
      <Toast msg={toast}/>

      <div className="mgmt-header">
        <div className="mgmt-header__left">
          <h1 className="mgmt-header__title">Examinations</h1>
          <p className="mgmt-header__sub">Internal marks, results and grade analytics</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mgmt-toolbar">
        <div className="mgmt-toolbar__search">
          <svg className="mgmt-toolbar__search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search courses…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select className="mgmt-toolbar__select" value={deptFilter} onChange={e=>setDeptFilter(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map(d=><option key={d._id} value={d._id}>{d.name}</option>)}
        </select>
        <select className="mgmt-toolbar__select" value={semFilter} onChange={e=>setSemFilter(e.target.value)}>
          <option value="">All Semesters</option>
          {['Fall','Spring','Summer'].map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Overview cards */}
      {ovLoading ? (
        <div className="dash-loading"><div className="dash-loading__spinner"/><span>Loading…</span></div>
      ) : (
        <div className="exam-overview-grid">
          {overview.map(({ course, totalStudents, passCount, failCount, avgInternal, gradeDist }) => (
            <div key={course._id}
              className={`exam-course-card ${activeCourse===course._id?'exam-course-card--active':''}`}
              onClick={()=>{ setActiveCourse(a=>a===course._id?null:course._id); setView('table'); setEditing(null); }}>
              <div className="exam-course-card__header">
                <span className="exam-course-card__code">{course.code}</span>
                <span className="exam-course-card__sem">{course.semester}</span>
              </div>
              <div className="exam-course-card__name">{course.name}</div>
              <div className="exam-course-card__dept">{course.department?.name}</div>
              <div className="exam-course-card__stats">
                <span className="exam-stat exam-stat--total">{totalStudents} students</span>
                {totalStudents > 0 && <>
                  <span className="exam-stat exam-stat--pass">✓ {passCount}</span>
                  <span className="exam-stat exam-stat--fail">✗ {failCount}</span>
                </>}
              </div>
              {totalStudents > 0 && (
                <div className="exam-course-card__avg">Avg internal: <strong>{avgInternal}/110</strong></div>
              )}
              {/* Mini grade dist dots */}
              {totalStudents > 0 && (
                <div className="exam-grade-dots">
                  {Object.entries(gradeDist).map(([g,c]) => c>0 && (
                    <span key={g} style={{fontSize:'0.65rem',padding:'0.12rem 0.4rem',borderRadius:'9999px',background:`${GRADE_COLORS[g]||'#94a3b8'}18`,color:GRADE_COLORS[g]||'#94a3b8',fontWeight:700}}>{g}:{c}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {ovPagination.totalPages > 1 && (
        <div className="mgmt-pagination">
          <span className="mgmt-pagination__info">{ovPagination.total} courses</span>
          <div className="mgmt-pagination__btns">
            <button className="mgmt-pagination__btn" onClick={()=>setPage(p=>p-1)} disabled={page===1}>‹</button>
            {pages.slice(Math.max(0,page-3),Math.min(pages.length,page+2)).map(p=>(
              <button key={p} className={`mgmt-pagination__btn ${p===page?'mgmt-pagination__btn--active':''}`} onClick={()=>setPage(p)}>{p}</button>
            ))}
            <button className="mgmt-pagination__btn" onClick={()=>setPage(p=>p+1)} disabled={page===ovPagination.totalPages}>›</button>
          </div>
        </div>
      )}

      {/* Course detail */}
      {activeCourse && (
        <div className="mgmt-table-card exam-detail-panel">
          <div className="exam-detail-nav">
            <div style={{display:'flex',gap:'0.4rem'}}>
              <button className={`att-detail-nav__btn ${view==='table'?'att-detail-nav__btn--active':''}`} onClick={()=>{setView('table');setEditing(null);}}>📋 Results Table</button>
              <button className={`att-detail-nav__btn ${view==='chart'?'att-detail-nav__btn--active':''}`} onClick={()=>{setView('chart');setEditing(null);}}>📊 Grade Chart</button>
            </div>
            {courseData && (
              <button className="mgmt-toolbar__add" style={{padding:'0.5rem 1rem',fontSize:'0.82rem'}} onClick={handlePublish}>
                📢 Publish Results
              </button>
            )}
          </div>

          {cLoading ? (
            <div className="dash-loading" style={{minHeight:120}}><div className="dash-loading__spinner"/></div>
          ) : courseData && (
            <>
              {/* Stats strip */}
              <div className="exam-stats-strip">
                {[
                  {label:'Students',  val: courseData.stats.totalStudents },
                  {label:'Entered',   val: courseData.stats.entered },
                  {label:'Avg Internal', val: `${courseData.stats.avgInternal}/110` },
                  {label:'Pass Rate', val: `${courseData.stats.passRate}%` },
                ].map(s=>(
                  <div key={s.label} className="exam-stats-strip__item">
                    <span className="exam-stats-strip__val">{s.val}</span>
                    <span className="exam-stats-strip__lbl">{s.label}</span>
                  </div>
                ))}
              </div>

              {/* Table */}
              {view==='table' && (
                <>
                  <div className="mgmt-table-wrap">
                    <table className="mgmt-table exam-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>A1<span className="res-th-max">/25</span></th>
                          <th>A2<span className="res-th-max">/25</span></th>
                          <th>Mid<span className="res-th-max">/50</span></th>
                          <th>Quiz<span className="res-th-max">/10</span></th>
                          <th>Internal<span className="res-th-max">/110</span></th>
                          <th>External<span className="res-th-max">/100</span></th>
                          <th>Grade</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {courseData.rows.length===0 ? (
                          <tr><td colSpan={10}><div className="mgmt-empty"><span className="mgmt-empty__icon">📝</span><span className="mgmt-empty__title">No students enrolled</span></div></td></tr>
                        ) : courseData.rows.map(row => {
                          const isEditing = editing===row.student._id;
                          const internalTotal = isEditing ? previewTotal : computeTotal(row.internal);
                          const grade = isEditing ? previewGrade : (row.grade==='—'?null:row.grade) || (row.result ? computeGrade(internalTotal) : '—');
                          return (
                            <tr key={row.student._id} className={isEditing?'exam-row--editing':''}>
                              <td>
                                <div style={{display:'flex',alignItems:'center',gap:'0.6rem'}}>
                                  <div style={{width:30,height:30,borderRadius:'50%',background:'linear-gradient(135deg,#2563eb,#7c3aed)',color:'#fff',fontSize:'0.7rem',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{initials(row.student.name)}</div>
                                  <div>
                                    <div style={{fontWeight:600,fontSize:'0.875rem'}}>{row.student.name}</div>
                                    <div style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>{row.student.studentId}</div>
                                  </div>
                                </div>
                              </td>
                              {isEditing ? (
                                <>
                                  <td><input className="exam-mark-input" type="number" min={0} max={25} value={editForm.assignment1} onChange={e=>setF('assignment1',e.target.value)}/></td>
                                  <td><input className="exam-mark-input" type="number" min={0} max={25} value={editForm.assignment2} onChange={e=>setF('assignment2',e.target.value)}/></td>
                                  <td><input className="exam-mark-input" type="number" min={0} max={50} value={editForm.midterm}     onChange={e=>setF('midterm',    e.target.value)}/></td>
                                  <td><input className="exam-mark-input" type="number" min={0} max={10} value={editForm.quiz}        onChange={e=>setF('quiz',       e.target.value)}/></td>
                                </>
                              ) : (
                                <>
                                  <td style={{textAlign:'center',fontWeight:600}}>{row.internal.assignment1}</td>
                                  <td style={{textAlign:'center',fontWeight:600}}>{row.internal.assignment2}</td>
                                  <td style={{textAlign:'center',fontWeight:600}}>{row.internal.midterm}</td>
                                  <td style={{textAlign:'center',fontWeight:600}}>{row.internal.quiz}</td>
                                </>
                              )}
                              <td style={{textAlign:'center'}}>
                                <span style={{fontFamily:'var(--font-display)',fontSize:'1rem',fontWeight:800,color:internalTotal>=44?'#059669':'#dc2626'}}>{internalTotal}</span>
                              </td>
                              <td style={{textAlign:'center'}}>
                                {isEditing
                                  ? <input className="exam-mark-input" type="number" min={0} max={editForm.maxMarks} value={editForm.marksObtained} onChange={e=>setF('marksObtained',e.target.value)} style={{width:55}}/>
                                  : <span style={{fontWeight:600}}>{row.external.marksObtained}</span>}
                              </td>
                              <td>
                                {grade && grade!=='—'
                                  ? <span style={{display:'inline-block',padding:'0.2rem 0.6rem',borderRadius:'9999px',fontWeight:800,fontSize:'0.8rem',background:`${GRADE_COLORS[grade]||'#94a3b8'}20`,color:GRADE_COLORS[grade]||'#94a3b8'}}>{grade}</span>
                                  : <span style={{color:'var(--text-muted)'}}>—</span>}
                              </td>
                              <td>
                                {row.result
                                  ? <span className={`status-badge status-badge--${row.isPassed?'active':'suspended'}`}>{row.isPassed?'Pass':'Fail'}</span>
                                  : <span style={{color:'var(--text-muted)',fontSize:'0.78rem'}}>Not entered</span>}
                              </td>
                              <td>
                                {isEditing ? (
                                  <div style={{display:'flex',gap:'0.3rem'}}>
                                    <button onClick={()=>handleSave(row.student._id)} disabled={saving[row.student._id]}
                                      style={{padding:'0.3rem 0.65rem',border:'none',borderRadius:'var(--radius-sm)',background:'#dcfce7',color:'#15803d',cursor:'pointer',fontWeight:700,fontSize:'0.78rem'}}>
                                      {saving[row.student._id]?'…':'✓'}
                                    </button>
                                    <button onClick={cancelEdit}
                                      style={{padding:'0.3rem 0.65rem',border:'none',borderRadius:'var(--radius-sm)',background:'#fee2e2',color:'#991b1b',cursor:'pointer',fontWeight:700,fontSize:'0.78rem'}}>✗</button>
                                  </div>
                                ) : (
                                  <button onClick={()=>startEdit(row)}
                                    style={{padding:'0.35rem 0.75rem',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',background:'var(--white)',color:'var(--gray-600)',cursor:'pointer',fontSize:'0.78rem',fontFamily:'var(--font-sans)',transition:'var(--transition)'}}>
                                    ✏️ Edit
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Grade preview bar */}
                  {editing && (
                    <div style={{padding:'0.75rem 1.25rem',background:'#fffbeb',borderTop:'1px solid #fcd34d',fontSize:'0.875rem',color:'var(--gray-800)'}}>
                      Preview: Total = <strong>{previewTotal}</strong> → Grade =&nbsp;
                      <strong style={{color:GRADE_COLORS[previewGrade]||'#94a3b8'}}>{previewGrade}</strong>&nbsp;
                      <span style={{color:previewGrade==='F'?'#dc2626':'#059669',fontWeight:700}}>{previewGrade==='F'?'✗ Fail':'✓ Pass'}</span>
                    </div>
                  )}
                </>
              )}

              {/* Chart */}
              {view==='chart' && (
                <div style={{padding:'1.5rem'}}>
                  <div style={{marginBottom:'0.75rem',fontFamily:'var(--font-display)',fontWeight:700,fontSize:'0.95rem',color:'var(--gray-900)'}}>Grade Distribution — {courseData.course?.name}</div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={Object.entries(courseData.rows.reduce((acc,r)=>{ const g=r.grade&&r.grade!=='—'?r.grade:'N/A'; acc[g]=(acc[g]||0)+1; return acc; },{})).map(([g,c])=>({grade:g,count:c}))}
                      margin={{top:5,right:20,left:0,bottom:5}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                      <XAxis dataKey="grade" tick={{fontSize:12,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:12,fill:'#94a3b8'}} axisLine={false} tickLine={false} allowDecimals={false}/>
                      <Tooltip contentStyle={{borderRadius:10,border:'1px solid #e2e8f0',fontSize:13}} cursor={{fill:'#f8fafc'}}/>
                      <Bar dataKey="count" radius={[6,6,0,0]}>
                        {Object.keys(courseData.rows.reduce((acc,r)=>{ const g=r.grade&&r.grade!=='—'?r.grade:'N/A'; acc[g]=1; return acc; },{})).map((g,i)=>(
                          <Cell key={i} fill={GRADE_COLORS[g]||'#94a3b8'}/>
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
