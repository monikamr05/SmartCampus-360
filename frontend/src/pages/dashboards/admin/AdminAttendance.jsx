import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import api from '../../../services/api';
import './shared.css';
import './AdminAttendance.css';

const setTitle = (t) => { const el = document.getElementById('page-title'); if (el) el.textContent = t; };
const today   = () => new Date().toISOString().slice(0, 10);
const fmtPct  = (p) => `${p}%`;
const attColor = (p) => p >= 75 ? '#059669' : p >= 60 ? '#d97706' : '#dc2626';
const initials = (n='') => n.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase() || '?';
const Toast = ({msg}) => msg.text
  ? <div className={`mgmt-toast mgmt-toast--${msg.type}`} role="alert">{msg.type==='success'?'✓':'✗'} {msg.text}</div>
  : null;

export default function AdminAttendance() {
  const [departments, setDepartments] = useState([]);
  const [courses,     setCourses]     = useState([]);

  /* overview state */
  const [overview,  setOverview]  = useState([]);
  const [ovLoading, setOvLoading] = useState(true);
  const [ovPagination, setOvPagination] = useState({ total:0, page:1, totalPages:1 });

  /* filters */
  const [deptFilter, setDeptFilter] = useState('');
  const [search,     setSearch]     = useState('');
  const [page,       setPage]       = useState(1);

  /* selected course */
  const [activeCourse, setActiveCourse]   = useState(null);
  const [courseData,   setCourseData]     = useState(null);
  const [cLoading,     setCLoading]       = useState(false);

  /* date roster */
  const [rosterDate, setRosterDate] = useState(today());
  const [roster,     setRoster]     = useState([]);
  const [rosterLoad, setRosterLoad] = useState(false);
  const [marking,    setMarking]    = useState(false);
  const [markRecords, setMarkRecords] = useState([]); // { studentId, name, present, note }

  /* view mode inside course */
  const [courseView, setCourseView] = useState('summary'); // 'summary' | 'mark' | 'chart'

  const [toast, setToast] = useState({type:'',text:''});
  const showToast = (t, x) => { setToast({type:t,text:x}); setTimeout(()=>setToast({type:'',text:''}),3500); };

  /* load supporting data */
  useEffect(() => {
    setTitle('Attendance Management');
    api.get('/admin/departments/all').then(r=>setDepartments(r.data)).catch(()=>{});
  }, []);

  /* load overview */
  const loadOverview = useCallback(async () => {
    setOvLoading(true);
    try {
      const params = new URLSearchParams({ page, limit:12 });
      if (deptFilter) params.set('departmentId', deptFilter);
      if (search)     params.set('search',       search);
      const { data } = await api.get(`/academic/attendance?${params}`);
      setOverview(data.summary);
      setOvPagination(data.pagination);
    } catch (e) { showToast('error', e.message); }
    finally { setOvLoading(false); }
  }, [deptFilter, search, page]);

  useEffect(() => { loadOverview(); }, [loadOverview]);
  useEffect(() => { setPage(1); }, [deptFilter, search]);

  /* load course attendance detail */
  const loadCourseDetail = useCallback(async (courseId) => {
    if (!courseId) return;
    setCLoading(true);
    try {
      const { data } = await api.get(`/academic/attendance/${courseId}`);
      setCourseData(data);
    } catch (e) { showToast('error', e.message); }
    finally { setCLoading(false); }
  }, []);

  useEffect(() => { if (activeCourse) loadCourseDetail(activeCourse); }, [activeCourse]);

  /* load roster for date */
  const loadRoster = useCallback(async () => {
    if (!activeCourse) return;
    setRosterLoad(true);
    try {
      const { data } = await api.get(`/academic/attendance/${activeCourse}/roster?date=${rosterDate}`);
      setRoster(data.roster);
      setMarkRecords(data.roster.map(r => ({
        studentId: r.studentId,
        name: r.name,
        present: r.present ?? true,
        note: r.note || '',
      })));
    } catch (e) { showToast('error', e.message); }
    finally { setRosterLoad(false); }
  }, [activeCourse, rosterDate]);

  useEffect(() => { if (courseView === 'mark' && activeCourse) loadRoster(); }, [courseView, activeCourse, rosterDate]);

  const toggleAll = (val) => setMarkRecords(r => r.map(x => ({...x, present: val})));

  const handleMarkSave = async () => {
    if (!markRecords.length) return;
    setMarking(true);
    try {
      await api.post(`/academic/attendance/${activeCourse}/mark`, {
        date: rosterDate,
        records: markRecords.map(r => ({ studentId: r.studentId, present: r.present, note: r.note })),
      });
      showToast('success', `Attendance saved for ${markRecords.length} students.`);
      loadCourseDetail(activeCourse);
    } catch (e) { showToast('error', e.message); }
    finally { setMarking(false); }
  };

  /* chart data */
  const chartData = courseData?.rows?.map(r => ({
    name: r.student?.name?.split(' ')[0] || '?',
    pct:  r.percentage,
  })).sort((a, b) => b.pct - a.pct) || [];

  const pages = Array.from({length: ovPagination.totalPages}, (_, i) => i + 1);

  return (
    <div className="mgmt-page">
      <Toast msg={toast}/>

      {/* Header */}
      <div className="mgmt-header">
        <div className="mgmt-header__left">
          <h1 className="mgmt-header__title">Attendance Management</h1>
          <p className="mgmt-header__sub">Course-wise attendance overview with shortage alerts</p>
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
      </div>

      {/* Overview cards */}
      {ovLoading ? (
        <div className="dash-loading"><div className="dash-loading__spinner"/><span>Loading…</span></div>
      ) : (
        <div className="att-overview-grid">
          {overview.map(({ course, totalStudents, totalClasses, avgAttendance, shortageCount }) => (
            <div key={course._id}
              className={`att-course-card ${activeCourse===course._id?'att-course-card--active':''} ${shortageCount>0?'att-course-card--warning':''}`}
              onClick={()=>{ setActiveCourse(a=>a===course._id?null:course._id); setCourseView('summary'); }}>
              <div className="att-course-card__header">
                <span className="att-course-card__code">{course.code}</span>
                {shortageCount > 0 && (
                  <span className="att-course-card__alert" title={`${shortageCount} students below 75%`}>
                    ⚠️ {shortageCount}
                  </span>
                )}
              </div>
              <div className="att-course-card__name">{course.name}</div>
              <div className="att-course-card__dept">{course.department?.name}</div>
              {/* Mini bar */}
              <div className="att-course-card__bar-wrap">
                <div className="att-course-card__bar">
                  <div className="att-course-card__bar-fill" style={{ width:`${avgAttendance}%`, background: attColor(avgAttendance) }}/>
                </div>
                <span style={{ fontSize:'0.75rem', fontWeight:700, color: attColor(avgAttendance) }}>{avgAttendance}%</span>
              </div>
              <div className="att-course-card__stats">
                <span>{totalStudents} students</span>
                <span>{totalClasses} classes</span>
              </div>
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

      {/* Course detail panel */}
      {activeCourse && (
        <div className="mgmt-table-card att-detail-panel">
          {/* Sub-nav */}
          <div className="att-detail-nav">
            {['summary','mark','chart'].map(v=>(
              <button key={v} className={`att-detail-nav__btn ${courseView===v?'att-detail-nav__btn--active':''}`} onClick={()=>setCourseView(v)}>
                {v==='summary'?'📋 Summary':v==='mark'?'✅ Mark Attendance':'📊 Chart'}
              </button>
            ))}
          </div>

          {cLoading ? (
            <div className="dash-loading" style={{minHeight:120}}><div className="dash-loading__spinner"/></div>
          ) : !courseData ? null : (

            <>
              {/* ── SUMMARY ── */}
              {courseView==='summary' && (
                <>
                  {/* Shortage banner */}
                  {courseData.shortage.length > 0 && (
                    <div className="att-shortage-banner">
                      <span>⚠️</span>
                      <div>
                        <strong>{courseData.shortage.length} student{courseData.shortage.length!==1?'s':''} below 75% attendance</strong>
                        <div className="att-shortage-names">
                          {courseData.shortage.map(r=>(
                            <span key={r._id} className="att-shortage-pill">{r.student?.name} ({r.percentage}%)</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="mgmt-table-wrap">
                    <table className="mgmt-table">
                      <thead>
                        <tr><th>Student</th><th>ID</th><th>Attended</th><th>Total</th><th>Absent</th><th>Percentage</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {courseData.rows.length===0 ? (
                          <tr><td colSpan={7}><div className="mgmt-empty"><span className="mgmt-empty__icon">📋</span><span className="mgmt-empty__title">No attendance records yet</span></div></td></tr>
                        ) : courseData.rows.map(r=>(
                          <tr key={r._id}>
                            <td>
                              <div style={{display:'flex',alignItems:'center',gap:'0.6rem'}}>
                                <div style={{width:30,height:30,borderRadius:'50%',background:'linear-gradient(135deg,#2563eb,#7c3aed)',color:'#fff',fontSize:'0.7rem',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{initials(r.student?.name)}</div>
                                <div style={{fontWeight:600,fontSize:'0.875rem'}}>{r.student?.name}</div>
                              </div>
                            </td>
                            <td><code style={{fontSize:'0.78rem',background:'var(--gray-100)',padding:'0.1rem 0.4rem',borderRadius:4}}>{r.student?.studentId}</code></td>
                            <td style={{textAlign:'center',fontWeight:700,color:'#059669'}}>{r.attended}</td>
                            <td style={{textAlign:'center'}}>{r.totalClasses}</td>
                            <td style={{textAlign:'center',color:'#dc2626',fontWeight:700}}>{r.absent}</td>
                            <td>
                              <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                                <div style={{height:8,flex:1,background:'var(--gray-200)',borderRadius:4,overflow:'hidden',maxWidth:80}}>
                                  <div style={{height:'100%',width:`${r.percentage}%`,background:attColor(r.percentage),borderRadius:4}}/>
                                </div>
                                <span style={{fontWeight:700,color:attColor(r.percentage),fontSize:'0.82rem',minWidth:36}}>{r.percentage}%</span>
                              </div>
                            </td>
                            <td>
                              <span className={`status-badge ${r.percentage>=75?'status-badge--active':r.percentage>=60?'':''}`}
                                style={r.percentage<75?{background:'#fef3c7',color:'#92400e'}:{}}>
                                {r.percentage>=75?'On Track':r.percentage>=60?'At Risk':'Shortage'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* ── MARK ATTENDANCE ── */}
              {courseView==='mark' && (
                <div style={{padding:'1.25rem'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'1rem',marginBottom:'1.25rem',flexWrap:'wrap'}}>
                    <div>
                      <label className="form-label">Date</label>
                      <input className="form-input" type="date" value={rosterDate} max={today()} onChange={e=>setRosterDate(e.target.value)} style={{width:160}}/>
                    </div>
                    <div style={{display:'flex',gap:'0.5rem',marginTop:'1.4rem'}}>
                      <button style={{padding:'0.45rem 0.85rem',border:'none',borderRadius:'var(--radius-full)',background:'#dcfce7',color:'#15803d',fontWeight:700,cursor:'pointer',fontSize:'0.8rem'}} onClick={()=>toggleAll(true)}>✓ All Present</button>
                      <button style={{padding:'0.45rem 0.85rem',border:'none',borderRadius:'var(--radius-full)',background:'#fee2e2',color:'#991b1b',fontWeight:700,cursor:'pointer',fontSize:'0.8rem'}} onClick={()=>toggleAll(false)}>✗ All Absent</button>
                    </div>
                    <div style={{marginLeft:'auto',marginTop:'1.4rem'}}>
                      <button className="mgmt-toolbar__add" onClick={handleMarkSave} disabled={marking||rosterLoad}>
                        {marking?'Saving…':'💾 Save Attendance'}
                      </button>
                    </div>
                  </div>
                  {rosterLoad ? (
                    <div className="dash-loading" style={{minHeight:80}}><div className="dash-loading__spinner"/></div>
                  ) : (
                    <div className="mgmt-table-wrap">
                      <table className="mgmt-table">
                        <thead><tr><th>Student</th><th>ID</th><th style={{textAlign:'center'}}>Present</th><th style={{textAlign:'center'}}>Absent</th><th>Note</th></tr></thead>
                        <tbody>
                          {markRecords.map((row, i) => (
                            <tr key={row.studentId} style={!row.present?{background:'#fff5f5'}:{}}>
                              <td style={{fontWeight:600}}>{row.name}</td>
                              <td><code style={{fontSize:'0.78rem',background:'var(--gray-100)',padding:'0.1rem 0.4rem',borderRadius:4}}>{row.studentId}</code></td>
                              <td style={{textAlign:'center'}}>
                                <input type="radio" name={`a-${row.studentId}`} checked={row.present===true}
                                  onChange={()=>setMarkRecords(r=>r.map((x,j)=>j===i?{...x,present:true}:x))}
                                  style={{width:18,height:18,accentColor:'#059669',cursor:'pointer'}}/>
                              </td>
                              <td style={{textAlign:'center'}}>
                                <input type="radio" name={`a-${row.studentId}`} checked={row.present===false}
                                  onChange={()=>setMarkRecords(r=>r.map((x,j)=>j===i?{...x,present:false}:x))}
                                  style={{width:18,height:18,accentColor:'#dc2626',cursor:'pointer'}}/>
                              </td>
                              <td>
                                <input type="text" placeholder="Note…" value={row.note}
                                  onChange={e=>setMarkRecords(r=>r.map((x,j)=>j===i?{...x,note:e.target.value}:x))}
                                  style={{width:'100%',padding:'0.3rem 0.5rem',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',fontSize:'0.8rem',fontFamily:'var(--font-sans)',outline:'none'}}/>
                              </td>
                            </tr>
                          ))}
                          {markRecords.length===0 && <tr><td colSpan={5} style={{textAlign:'center',padding:'1.5rem',color:'var(--text-muted)'}}>No students enrolled in this course.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── CHART ── */}
              {courseView==='chart' && (
                <div style={{padding:'1.5rem'}}>
                  <div style={{marginBottom:'0.75rem',fontFamily:'var(--font-display)',fontWeight:700,fontSize:'0.95rem',color:'var(--gray-900)'}}>
                    Attendance by Student — {courseData.course?.name}
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData} margin={{top:5,right:20,left:0,bottom:60}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                      <XAxis dataKey="name" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} angle={-35} textAnchor="end"/>
                      <YAxis domain={[0,100]} tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} unit="%"/>
                      <Tooltip formatter={v=>`${v}%`} contentStyle={{borderRadius:10,border:'1px solid #e2e8f0',fontSize:13}} cursor={{fill:'#f8fafc'}}/>
                      <ReferenceLine y={75} stroke="#d97706" strokeDasharray="5 3" strokeWidth={1.5} label={{value:'75%',position:'right',fontSize:11,fill:'#d97706'}}/>
                      <Bar dataKey="pct" radius={[6,6,0,0]} name="Attendance %">
                        {chartData.map((d,i)=><Cell key={i} fill={attColor(d.pct)}/>)}
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
