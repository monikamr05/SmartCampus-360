import React, { useEffect, useState, useCallback } from 'react';
import api from '../../../services/api';
import './FacultyAttendance.css';

const setTitle = (t) => { const el = document.getElementById('fc-page-title'); if (el) el.textContent = t; };
const initials = (n='') => n.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase() || '?';
const fmtDate  = (d) => new Date(d).toISOString().slice(0, 10);
const today    = () => fmtDate(new Date());

const Toast = ({ msg }) => msg.text
  ? <div className={`fc-toast fc-toast--${msg.type}`} role="alert">{msg.type==='success'?'✓':'✗'} {msg.text}</div>
  : null;

const FacultyAttendance = () => {
  const [courses,   setCourses]   = useState([]);
  const [courseId,  setCourseId]  = useState('');
  const [date,      setDate]      = useState(today());
  const [records,   setRecords]   = useState([]); // { studentId, name, studentCode, present, note }
  const [history,   setHistory]   = useState([]); // full attendance from API
  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState({ type:'', text:'' });
  const [view,      setView]      = useState('mark'); // 'mark' | 'report'
  const [search,    setSearch]    = useState('');

  const showToast = (type, text) => { setToast({ type, text }); setTimeout(() => setToast({ type:'', text:'' }), 3500); };

  // Load courses
  useEffect(() => {
    setTitle('Attendance');
    api.get('/faculty/courses').then(r => {
      setCourses(r.data.courses);
      if (r.data.courses.length) setCourseId(r.data.courses[0]._id);
    }).catch(() => {});
  }, []);

  // Load attendance roster + pre-fill today's status
  const loadAttendance = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/faculty/attendance/${courseId}?date=${date}`);
      setHistory(data.attendance);
      // Build mark-attendance grid: if record exists for date, pre-fill; else default present=true
      const rows = await api.get(`/faculty/courses/${courseId}/students`);
      const studentsArr = rows.data.students;
      const grid = studentsArr.map(s => {
        const att = data.attendance.find(a => a.student._id === s._id || a.student === s._id);
        const todayRec = att?.records?.find(r => fmtDate(r.date) === date);
        return {
          studentId: s._id,
          studentCode: s.studentId,
          name: s.name,
          present: todayRec ? todayRec.present : true,
          note: todayRec?.note || '',
          percentage: att?.percentage || 0,
          attended:   att?.attended || 0,
          total:      att?.totalClasses || 0,
        };
      });
      setRecords(grid);
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  }, [courseId, date]);

  useEffect(() => { loadAttendance(); }, [loadAttendance]);

  const toggleAll = (val) => setRecords(r => r.map(x => ({ ...x, present: val })));

  const handleSave = async () => {
    if (!records.length) return;
    setSaving(true);
    try {
      await api.post(`/faculty/attendance/${courseId}`, {
        date,
        records: records.map(r => ({ studentId: r.studentId, present: r.present, note: r.note })),
      });
      showToast('success', `Attendance saved for ${records.length} students.`);
      loadAttendance();
    } catch (e) { showToast('error', e.message); }
    finally { setSaving(false); }
  };

  const filtered = search
    ? records.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || r.studentCode.includes(search))
    : records;

  const presentCount = records.filter(r => r.present).length;
  const absentCount  = records.length - presentCount;

  return (
    <div className="fc-page att-page">
      <Toast msg={toast} />

      <div className="fc-page-header">
        <div className="fc-page-header__left">
          <h1 className="fc-page-title">Attendance</h1>
          <p className="fc-page-sub">Mark and manage student attendance</p>
        </div>
        <div className="att-controls">
          <div className="att-view-toggle">
            <button className={`att-vbtn ${view==='mark'?'att-vbtn--active':''}`} onClick={()=>setView('mark')}>Mark</button>
            <button className={`att-vbtn ${view==='report'?'att-vbtn--active':''}`} onClick={()=>setView('report')}>Report</button>
          </div>
        </div>
      </div>

      {/* Course + Date selectors */}
      <div className="fc-panel att-toolbar">
        <div className="att-toolbar__group">
          <label className="form-label">Course</label>
          <select className="form-input" value={courseId} onChange={e => setCourseId(e.target.value)}>
            {courses.map(c => <option key={c._id} value={c._id}>{c.code} — {c.name}</option>)}
          </select>
        </div>
        <div className="att-toolbar__group">
          <label className="form-label">Date</label>
          <input className="form-input" type="date" value={date} max={today()} onChange={e => setDate(e.target.value)} />
        </div>
        {view === 'mark' && (
          <div className="att-toolbar__group att-toolbar__group--end">
            <label className="form-label">Search</label>
            <input className="form-input" type="text" placeholder="Name or ID…" value={search} onChange={e => setSearch(e.target.value)} style={{ minWidth: 160 }} />
          </div>
        )}
      </div>

      {/* ── Mark attendance ── */}
      {view === 'mark' && (
        <>
          {/* Summary bar */}
          <div className="att-summary-bar">
            <div className="att-summary-bar__item att-summary-bar__item--present">
              <span className="att-summary-bar__val">{presentCount}</span>
              <span className="att-summary-bar__lbl">Present</span>
            </div>
            <div className="att-summary-bar__item att-summary-bar__item--absent">
              <span className="att-summary-bar__val">{absentCount}</span>
              <span className="att-summary-bar__lbl">Absent</span>
            </div>
            <div className="att-summary-bar__item">
              <span className="att-summary-bar__val">{records.length}</span>
              <span className="att-summary-bar__lbl">Total</span>
            </div>
            <div className="att-summary-bar__actions">
              <button className="att-bulk-btn att-bulk-btn--present" onClick={() => toggleAll(true)}>✓ All Present</button>
              <button className="att-bulk-btn att-bulk-btn--absent"  onClick={() => toggleAll(false)}>✗ All Absent</button>
            </div>
          </div>

          {loading ? (
            <div className="fc-loading"><div className="fc-loading__spinner"/><span>Loading students…</span></div>
          ) : (
            <div className="fc-panel">
              <div className="fc-table-wrap">
                <table className="fc-table att-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th style={{ textAlign:'center' }}>Present</th>
                      <th style={{ textAlign:'center' }}>Absent</th>
                      <th>Overall Att%</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row, i) => {
                      const idx = records.findIndex(r => r.studentId === row.studentId);
                      return (
                        <tr key={row.studentId} className={!row.present ? 'att-row--absent' : ''}>
                          <td>
                            <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
                              <div style={{ width:30, height:30, borderRadius:'50%', background:'linear-gradient(135deg,#d97706,#dc2626)', color:'#fff', fontSize:'0.7rem', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{initials(row.name)}</div>
                              <div>
                                <div style={{ fontWeight:600, fontSize:'0.875rem' }}>{row.name}</div>
                                <div style={{ fontSize:'0.73rem', color:'var(--text-muted)' }}>{row.studentCode}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ textAlign:'center' }}>
                            <input type="radio" name={`att-${row.studentId}`} checked={row.present === true}
                              onChange={() => setRecords(r => r.map((x, j) => j===idx ? {...x, present:true} : x))}
                              style={{ width:18, height:18, accentColor:'#059669', cursor:'pointer' }} />
                          </td>
                          <td style={{ textAlign:'center' }}>
                            <input type="radio" name={`att-${row.studentId}`} checked={row.present === false}
                              onChange={() => setRecords(r => r.map((x, j) => j===idx ? {...x, present:false} : x))}
                              style={{ width:18, height:18, accentColor:'#dc2626', cursor:'pointer' }} />
                          </td>
                          <td>
                            <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
                              <div style={{ height:6, width:50, background:'var(--gray-200)', borderRadius:3, overflow:'hidden' }}>
                                <div style={{ height:'100%', width:`${row.percentage}%`, background: row.percentage>=75?'#059669':row.percentage>=60?'#d97706':'#dc2626', borderRadius:3 }}/>
                              </div>
                              <span style={{ fontSize:'0.78rem', fontWeight:700, color: row.percentage>=75?'#059669':row.percentage<60?'#dc2626':'#d97706' }}>{row.percentage}%</span>
                            </div>
                          </td>
                          <td>
                            <input
                              type="text"
                              className="att-note-input"
                              placeholder="Optional note…"
                              value={row.note}
                              onChange={e => setRecords(r => r.map((x, j) => j===idx ? {...x, note: e.target.value} : x))}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="att-save-row">
                <button className="fc-btn-primary" onClick={handleSave} disabled={saving || !records.length}>
                  {saving ? 'Saving…' : `💾 Save Attendance (${date})`}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Attendance report ── */}
      {view === 'report' && (
        <div className="fc-panel">
          <div className="fc-panel__header"><div className="fc-panel__title">Cumulative Attendance Report</div></div>
          {loading ? (
            <div className="fc-loading" style={{ minHeight:120 }}><div className="fc-loading__spinner"/></div>
          ) : history.length === 0 ? (
            <p className="fc-empty">No attendance records found for this course.</p>
          ) : (
            <div className="fc-table-wrap">
              <table className="fc-table">
                <thead>
                  <tr><th>Student</th><th>ID</th><th>Attended</th><th>Total</th><th>Absent</th><th>Percentage</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {history
                    .sort((a, b) => a.student?.name?.localeCompare(b.student?.name))
                    .map(r => {
                      const pct = r.totalClasses ? Math.round((r.attended / r.totalClasses) * 100) : 0;
                      const color = pct >= 75 ? '#059669' : pct >= 60 ? '#d97706' : '#dc2626';
                      return (
                        <tr key={r._id}>
                          <td style={{ fontWeight:600 }}>{r.student?.name}</td>
                          <td><code style={{ fontSize:'0.78rem', background:'var(--gray-100)', padding:'0.1rem 0.4rem', borderRadius:4 }}>{r.student?.studentId}</code></td>
                          <td style={{ textAlign:'center', fontWeight:700, color:'#059669' }}>{r.attended}</td>
                          <td style={{ textAlign:'center' }}>{r.totalClasses}</td>
                          <td style={{ textAlign:'center', color:'#dc2626', fontWeight:700 }}>{r.totalClasses - r.attended}</td>
                          <td>
                            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                              <div style={{ height:8, flex:1, background:'var(--gray-200)', borderRadius:4, overflow:'hidden', maxWidth:80 }}>
                                <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:4 }}/>
                              </div>
                              <span style={{ fontWeight:700, color, fontSize:'0.82rem', minWidth:36 }}>{pct}%</span>
                            </div>
                          </td>
                          <td>
                            <span className={`fc-badge ${pct>=75?'fc-badge--green':pct>=60?'fc-badge--amber':'fc-badge--red'}`}>
                              {pct >= 75 ? 'OK' : pct >= 60 ? 'At Risk' : 'Shortage'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FacultyAttendance;
