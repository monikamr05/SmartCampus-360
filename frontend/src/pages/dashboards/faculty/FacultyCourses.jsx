import React, { useEffect, useState } from 'react';
import api from '../../../services/api';
import './FacultyCourses.css';

const setTitle = (t) => { const el = document.getElementById('fc-page-title'); if (el) el.textContent = t; };
const initials = (n='') => n.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase() || '?';

const FacultyCourses = () => {
  const [courses,   setCourses]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [activeId,  setActiveId]  = useState(null);
  const [students,  setStudents]  = useState([]);
  const [stuLoad,   setStuLoad]   = useState(false);
  const [search,    setSearch]    = useState('');

  useEffect(() => {
    setTitle('My Courses');
    api.get('/faculty/courses')
      .then(r => { setCourses(r.data.courses); if (r.data.courses.length) setActiveId(r.data.courses[0]._id); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeId) return;
    setStuLoad(true); setStudents([]);
    api.get(`/faculty/courses/${activeId}/students`)
      .then(r => setStudents(r.data.students))
      .catch(() => setStudents([]))
      .finally(() => setStuLoad(false));
  }, [activeId]);

  const activeCourse = courses.find(c => c._id === activeId);
  const filtered = search
    ? students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.studentId.includes(search))
    : students;

  if (loading) return <div className="fc-loading"><div className="fc-loading__spinner"/><span>Loading courses…</span></div>;
  if (error)   return <div className="fc-error"><span>⚠️</span><div><strong>Error</strong><p>{error}</p></div></div>;

  return (
    <div className="fc-page">
      <div className="fc-page-header">
        <div className="fc-page-header__left">
          <h1 className="fc-page-title">My Courses</h1>
          <p className="fc-page-sub">{courses.length} assigned course{courses.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="fc-panel"><p className="fc-empty">No courses assigned yet. Contact your administrator.</p></div>
      ) : (
        <>
          {/* Course tabs */}
          <div className="fc-panel">
            <div className="fc-panel__header"><div className="fc-panel__title">Select Course</div></div>
            <div className="fc-course-tabs">
              {courses.map(c => (
                <button key={c._id}
                  className={`fc-course-tab ${activeId === c._id ? 'fc-course-tab--active' : ''}`}
                  onClick={() => setActiveId(c._id)}>
                  <span className="fc-ctab-code">{c.code}</span>
                  <span className="fc-ctab-name">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Active course details */}
          {activeCourse && (
            <div className="fc-course-detail-row">
              <div className="fc-panel fc-course-info">
                <div className="fc-course-info__header">
                  <div>
                    <div className="fc-course-info__code">{activeCourse.code}</div>
                    <div className="fc-course-info__name">{activeCourse.name}</div>
                  </div>
                  <span className={`fc-badge ${activeCourse.isActive ? 'fc-badge--green' : 'fc-badge--gray'}`}>
                    {activeCourse.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="fc-course-info__grid">
                  {[
                    { label: 'Department',  value: activeCourse.department?.name || '—' },
                    { label: 'Semester',    value: activeCourse.semester },
                    { label: 'Year',        value: activeCourse.year },
                    { label: 'Credits',     value: activeCourse.credits },
                    { label: 'Enrolled',    value: `${activeCourse.enrolledStudents ?? activeCourse.enrolled} / ${activeCourse.maxStudents}` },
                    { label: 'Description', value: activeCourse.description || '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="fc-course-info__item">
                      <span className="fc-course-info__item-label">{label}</span>
                      <span className="fc-course-info__item-value">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Enrolled students */}
              <div className="fc-panel fc-student-list-panel">
                <div className="fc-panel__header">
                  <div>
                    <div className="fc-panel__title">Enrolled Students</div>
                    <div className="fc-panel__sub">{filtered.length} student{filtered.length !== 1 ? 's' : ''}</div>
                  </div>
                  <input
                    className="fc-student-search"
                    type="text" placeholder="Search…"
                    value={search} onChange={e => setSearch(e.target.value)}
                  />
                </div>
                {stuLoad ? (
                  <div className="fc-loading" style={{ minHeight: 120 }}><div className="fc-loading__spinner"/></div>
                ) : filtered.length === 0 ? (
                  <p className="fc-empty">No students enrolled in this course.</p>
                ) : (
                  <div className="fc-table-wrap">
                    <table className="fc-table">
                      <thead>
                        <tr><th>Student</th><th>ID</th><th>Semester</th><th>GPA</th><th>Attendance</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {filtered.map(s => (
                          <tr key={s._id}>
                            <td>
                              <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
                                <div style={{ width:30, height:30, borderRadius:'50%', background:'linear-gradient(135deg,#d97706,#dc2626)', color:'#fff', fontSize:'0.7rem', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{initials(s.name)}</div>
                                <div>
                                  <div style={{ fontWeight:600, fontSize:'0.875rem', color:'var(--gray-900)' }}>{s.name}</div>
                                  <div style={{ fontSize:'0.73rem', color:'var(--text-muted)' }}>{s.email}</div>
                                </div>
                              </div>
                            </td>
                            <td><code style={{ fontSize:'0.78rem', background:'var(--gray-100)', padding:'0.1rem 0.4rem', borderRadius:4 }}>{s.studentId}</code></td>
                            <td style={{ textAlign:'center' }}>{s.semester}</td>
                            <td><span style={{ fontWeight:700, color: s.gpa>=3.5?'#16a34a':s.gpa>=2.5?'#2563eb':'#dc2626' }}>{Number(s.gpa||0).toFixed(2)}</span></td>
                            <td>
                              <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
                                <div style={{ height:6, width:50, background:'var(--gray-200)', borderRadius:3, overflow:'hidden' }}>
                                  <div style={{ height:'100%', width:`${s.attendancePct||0}%`, background: (s.attendancePct||0)>=75?'#059669':'#dc2626', borderRadius:3 }}/>
                                </div>
                                <span style={{ fontSize:'0.75rem', fontWeight:700 }}>{s.attendancePct||0}%</span>
                              </div>
                            </td>
                            <td><span className={`fc-badge fc-badge--${s.status==='active'?'green':s.status==='suspended'?'red':'gray'}`}>{s.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FacultyCourses;
