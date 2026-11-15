import React, { useEffect, useState, useCallback } from 'react';
import api from '../../../services/api';
import './FacultyMarks.css';

const setTitle = (t) => { const el = document.getElementById('fc-page-title'); if (el) el.textContent = t; };
const initials = (n='') => n.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase() || '?';
const Toast = ({ msg }) => msg.text
  ? <div className={`fc-toast fc-toast--${msg.type}`} role="alert">{msg.type==='success'?'✓':'✗'} {msg.text}</div>
  : null;

const computeTotal = (f) =>
  Number(f.assignment1||0) + Number(f.assignment2||0) + Number(f.midterm||0) + Number(f.quiz||0);

const computeGrade = (total) => {
  if (total >= 90) return 'A+';
  if (total >= 80) return 'A';
  if (total >= 70) return 'B+';
  if (total >= 60) return 'B';
  if (total >= 50) return 'C';
  if (total >= 40) return 'D';
  return 'F';
};

const GRADE_STYLE = { 'A+':'#15803d','A':'#059669','B+':'#1d4ed8','B':'#2563eb','C':'#d97706','D':'#c2410c','F':'#dc2626' };

const FacultyMarks = () => {
  const [courses,   setCourses]   = useState([]);
  const [courseId,  setCourseId]  = useState('');
  const [rows,      setRows]      = useState([]);
  const [course,    setCourse]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState({});   // { studentId: bool }
  const [toast,     setToast]     = useState({ type:'', text:'' });
  const [editing,   setEditing]   = useState(null); // studentId being edited
  const [editForm,  setEditForm]  = useState({});
  const [search,    setSearch]    = useState('');

  const showToast = (type, text) => { setToast({ type, text }); setTimeout(() => setToast({ type:'', text:'' }), 3500); };

  useEffect(() => {
    setTitle('Internal Marks');
    api.get('/faculty/courses').then(r => {
      setCourses(r.data.courses);
      if (r.data.courses.length) setCourseId(r.data.courses[0]._id);
    }).catch(() => {});
  }, []);

  const loadMarks = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/faculty/marks/${courseId}`);
      setRows(data.rows);
      setCourse(data.course);
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  }, [courseId]);

  useEffect(() => { loadMarks(); }, [loadMarks]);

  const startEdit = (row) => {
    setEditing(row.student._id);
    setEditForm({ ...row.internal, remarks: row.result?.remarks || '' });
  };
  const cancelEdit = () => { setEditing(null); setEditForm({}); };

  const handleSave = async (studentId) => {
    setSaving(s => ({ ...s, [studentId]: true }));
    try {
      await api.put(`/faculty/marks/${courseId}/${studentId}`, editForm);
      showToast('success', 'Marks saved.');
      setEditing(null);
      loadMarks();
    } catch (e) { showToast('error', e.message); }
    finally { setSaving(s => ({ ...s, [studentId]: false })); }
  };

  const setF = (k, v) => setEditForm(f => ({ ...f, [k]: v }));

  const filtered = search
    ? rows.filter(r => r.student.name.toLowerCase().includes(search.toLowerCase()) || r.student.studentId.includes(search))
    : rows;

  const previewTotal = computeTotal(editForm);
  const previewGrade = computeGrade(previewTotal);

  return (
    <div className="fc-page marks-page">
      <Toast msg={toast} />

      <div className="fc-page-header">
        <div className="fc-page-header__left">
          <h1 className="fc-page-title">Internal Marks</h1>
          <p className="fc-page-sub">Enter and update marks for your assigned courses</p>
        </div>
      </div>

      {/* Controls */}
      <div className="fc-panel marks-toolbar">
        <div className="att-toolbar__group">
          <label className="form-label">Course</label>
          <select className="form-input" value={courseId} onChange={e => setCourseId(e.target.value)}>
            {courses.map(c => <option key={c._id} value={c._id}>{c.code} — {c.name}</option>)}
          </select>
        </div>
        <div className="att-toolbar__group">
          <label className="form-label">Search student</label>
          <input className="form-input" type="text" placeholder="Name or ID…" value={search} onChange={e => setSearch(e.target.value)} style={{ minWidth:180 }}/>
        </div>
        {course && (
          <div className="marks-schema">
            <span>Schema:</span>
            <span className="marks-schema__item">Assign 1 <strong>/25</strong></span>
            <span className="marks-schema__item">Assign 2 <strong>/25</strong></span>
            <span className="marks-schema__item">Midterm <strong>/50</strong></span>
            <span className="marks-schema__item">Quiz <strong>/10</strong></span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="fc-loading"><div className="fc-loading__spinner"/><span>Loading marks…</span></div>
      ) : (
        <div className="fc-panel">
          <div className="fc-table-wrap">
            <table className="fc-table marks-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Assign 1 <span style={{ fontWeight:400 }}>/25</span></th>
                  <th>Assign 2 <span style={{ fontWeight:400 }}>/25</span></th>
                  <th>Midterm <span style={{ fontWeight:400 }}>/50</span></th>
                  <th>Quiz <span style={{ fontWeight:400 }}>/10</span></th>
                  <th>Total <span style={{ fontWeight:400 }}>/110</span></th>
                  <th>Grade</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign:'center', padding:'2rem', color:'var(--text-muted)' }}>No students found.</td></tr>
                )}
                {filtered.map(row => {
                  const isEditing = editing === row.student._id;
                  const displayForm = isEditing ? editForm : row.internal;
                  const total = isEditing ? previewTotal : computeTotal(row.internal);
                  const grade = isEditing ? previewGrade : (row.grade || computeGrade(total));
                  return (
                    <tr key={row.student._id} className={isEditing ? 'marks-row--editing' : ''}>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
                          <div style={{ width:30, height:30, borderRadius:'50%', background:'linear-gradient(135deg,#d97706,#dc2626)', color:'#fff', fontSize:'0.7rem', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{initials(row.student.name)}</div>
                          <div>
                            <div style={{ fontWeight:600, fontSize:'0.875rem' }}>{row.student.name}</div>
                            <div style={{ fontSize:'0.73rem', color:'var(--text-muted)' }}>{row.student.studentId}</div>
                          </div>
                        </div>
                      </td>
                      {isEditing ? (
                        <>
                          <td><input className="marks-input" type="number" min={0} max={25} value={editForm.assignment1} onChange={e=>setF('assignment1',e.target.value)}/></td>
                          <td><input className="marks-input" type="number" min={0} max={25} value={editForm.assignment2} onChange={e=>setF('assignment2',e.target.value)}/></td>
                          <td><input className="marks-input" type="number" min={0} max={50} value={editForm.midterm}     onChange={e=>setF('midterm',    e.target.value)}/></td>
                          <td><input className="marks-input" type="number" min={0} max={10} value={editForm.quiz}        onChange={e=>setF('quiz',       e.target.value)}/></td>
                        </>
                      ) : (
                        <>
                          <td style={{ textAlign:'center', fontWeight:600 }}>{displayForm.assignment1}</td>
                          <td style={{ textAlign:'center', fontWeight:600 }}>{displayForm.assignment2}</td>
                          <td style={{ textAlign:'center', fontWeight:600 }}>{displayForm.midterm}</td>
                          <td style={{ textAlign:'center', fontWeight:600 }}>{displayForm.quiz}</td>
                        </>
                      )}
                      <td style={{ textAlign:'center' }}>
                        <span style={{ fontFamily:'var(--font-display)', fontSize:'1rem', fontWeight:800, color: total >= 50 ? '#059669' : '#dc2626' }}>{total}</span>
                      </td>
                      <td>
                        <span className="marks-grade-pill" style={{ background: `${GRADE_STYLE[grade]}22`, color: GRADE_STYLE[grade] }}>{grade}</span>
                      </td>
                      <td>
                        {isEditing ? (
                          <div style={{ display:'flex', gap:'0.4rem' }}>
                            <button className="marks-action-btn marks-action-btn--save" onClick={() => handleSave(row.student._id)} disabled={saving[row.student._id]}>
                              {saving[row.student._id] ? '…' : '✓'}
                            </button>
                            <button className="marks-action-btn marks-action-btn--cancel" onClick={cancelEdit}>✗</button>
                          </div>
                        ) : (
                          <button className="marks-action-btn marks-action-btn--edit" onClick={() => startEdit(row)}>✏️ Edit</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {editing && (
            <div className="marks-preview-bar">
              Preview: Total = <strong>{previewTotal}</strong> → Grade = <strong style={{ color: GRADE_STYLE[previewGrade] }}>{previewGrade}</strong>
              <span style={{ color: previewGrade==='F'?'#dc2626':'#059669', marginLeft:'0.5rem', fontWeight:700 }}>
                {previewGrade==='F' ? '✗ Fail' : '✓ Pass'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FacultyMarks;
