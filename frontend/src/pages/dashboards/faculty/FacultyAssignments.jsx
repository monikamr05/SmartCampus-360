import React, { useEffect, useState, useCallback } from 'react';
import api from '../../../services/api';
import './FacultyAssignments.css';

const setTitle = (t) => { const el = document.getElementById('fc-page-title'); if (el) el.textContent = t; };
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—';
const daysLeft = (d) => { const diff = Math.ceil((new Date(d)-Date.now())/86400000); if(diff<0) return { text:'Overdue', c:'#dc2626' }; if(diff===0) return { text:'Due today', c:'#dc2626' }; return { text:`${diff}d left`, c: diff<=3?'#d97706':'#059669' }; };
const Toast = ({ msg }) => msg.text ? <div className={`fc-toast fc-toast--${msg.type}`} role="alert">{msg.type==='success'?'✓':'✗'} {msg.text}</div> : null;

const TYPE_OPTIONS = ['assignment','project','quiz','lab','presentation'];
const EMPTY_FORM = { title:'', description:'', type:'assignment', dueDate:'', maxMarks:100 };

const FacultyAssignments = () => {
  const [courses,      setCourses]      = useState([]);
  const [courseId,     setCourseId]     = useState('');
  const [assignments,  setAssignments]  = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [toast,        setToast]        = useState({ type:'', text:'' });
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [saving,       setSaving]       = useState(false);
  const [delTarget,    setDelTarget]    = useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const [gradeModal,   setGradeModal]   = useState(null); // { assignmentId, submission }
  const [gradeForm,    setGradeForm]    = useState({ marks:'', feedback:'' });
  const [gradingSaving,setGradingSaving]= useState(false);
  const [expanded,     setExpanded]     = useState(null);

  const showToast = (t, x) => { setToast({ type:t, text:x }); setTimeout(()=>setToast({ type:'', text:'' }), 3500); };

  useEffect(() => {
    setTitle('Assignments');
    api.get('/faculty/courses').then(r => {
      setCourses(r.data.courses);
      if (r.data.courses.length) setCourseId(r.data.courses[0]._id);
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try { const { data } = await api.get(`/faculty/assignments/${courseId}`); setAssignments(data.assignments); }
    catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  }, [courseId]);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit   = (a) => { setEditTarget(a); setForm({ title:a.title, description:a.description, type:a.type, dueDate:a.dueDate?.slice(0,10)||'', maxMarks:a.maxMarks }); setModalOpen(true); };
  const closeModal = ()  => { setModalOpen(false); setEditTarget(null); };
  const setF = (k,v) => setForm(f => ({...f,[k]:v}));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editTarget) await api.put(`/faculty/assignments/${courseId}/${editTarget._id}`, form);
      else            await api.post(`/faculty/assignments/${courseId}`, form);
      showToast('success', editTarget ? 'Assignment updated.' : 'Assignment created.');
      closeModal(); load();
    } catch (err) { showToast('error', err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    setDeleting(true);
    try { await api.delete(`/faculty/assignments/${courseId}/${delTarget._id}`); showToast('success', 'Assignment deleted.'); setDelTarget(null); load(); }
    catch (err) { showToast('error', err.message); }
    finally { setDeleting(false); }
  };

  const openGrade = (asgn, sub) => { setGradeModal({ assignmentId: asgn._id, sub }); setGradeForm({ marks: sub.marks ?? '', feedback: sub.feedback || '' }); };
  const handleGrade = async (e) => {
    e.preventDefault(); setGradingSaving(true);
    try {
      await api.put(`/faculty/assignments/${courseId}/${gradeModal.assignmentId}/grade/${gradeModal.sub._id}`, gradeForm);
      showToast('success', 'Submission graded.');
      setGradeModal(null); load();
    } catch (err) { showToast('error', err.message); }
    finally { setGradingSaving(false); }
  };

  const STATUS_STYLE = { pending:{bg:'#fef3c7',c:'#92400e'}, submitted:{bg:'#d1fae5',c:'#065f46'}, late:{bg:'#ffedd5',c:'#c2410c'}, graded:{bg:'#dbeafe',c:'#1d4ed8'}, missing:{bg:'#fee2e2',c:'#991b1b'} };

  return (
    <div className="fc-page asgn-page">
      <Toast msg={toast} />

      <div className="fc-page-header">
        <div className="fc-page-header__left">
          <h1 className="fc-page-title">Assignments</h1>
          <p className="fc-page-sub">Create, manage and grade assignments</p>
        </div>
        <button className="fc-btn-primary" onClick={openCreate} disabled={!courseId}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Assignment
        </button>
      </div>

      <div className="fc-panel asgn-toolbar">
        <div className="att-toolbar__group">
          <label className="form-label">Course</label>
          <select className="form-input" value={courseId} onChange={e => setCourseId(e.target.value)}>
            {courses.map(c => <option key={c._id} value={c._id}>{c.code} — {c.name}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="fc-loading"><div className="fc-loading__spinner"/><span>Loading…</span></div>
      ) : assignments.length === 0 ? (
        <div className="fc-panel"><p className="fc-empty">📝 No assignments for this course yet.</p></div>
      ) : (
        <div className="asgn-list">
          {assignments.map(a => {
            const dl = daysLeft(a.dueDate);
            const isOpen = expanded === a._id;
            return (
              <div key={a._id} className="asgn-card">
                {/* Header */}
                <div className="asgn-card__header" onClick={() => setExpanded(isOpen ? null : a._id)} role="button" tabIndex={0} onKeyDown={e=>e.key==='Enter'&&setExpanded(isOpen?null:a._id)}>
                  <div className="asgn-card__left">
                    <span className={`asgn-type-badge asgn-type-badge--${a.type}`}>{a.type}</span>
                    <span className="asgn-card__title">{a.title}</span>
                    {a.description && <span className="asgn-card__desc">{a.description}</span>}
                    <div className="asgn-card__meta">
                      <span>🏆 {a.maxMarks} marks</span>
                      <span>📅 Due: {fmtDate(a.dueDate)}</span>
                      <span style={{ color:dl.c, fontWeight:700 }}>{dl.text}</span>
                    </div>
                  </div>
                  <div className="asgn-card__right">
                    <div className="asgn-counts-row">
                      <span className="asgn-count asgn-count--submitted">{a.submittedCount}/{a.totalStudents} submitted</span>
                      <span className="asgn-count asgn-count--graded">{a.gradedCount} graded</span>
                    </div>
                    <div className="asgn-card__actions" onClick={e=>e.stopPropagation()}>
                      <button className="fc-tbl-btn" onClick={() => openEdit(a)} title="Edit">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="fc-tbl-btn fc-tbl-btn--danger" onClick={() => setDelTarget(a)} title="Delete">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </div>
                    <svg className={`asgn-chevron ${isOpen?'asgn-chevron--open':''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                  </div>
                </div>

                {/* Submissions */}
                {isOpen && (
                  <div className="asgn-submissions">
                    <div className="asgn-submissions__header">Student Submissions</div>
                    {a.submissions.length === 0 ? (
                      <p className="fc-empty" style={{ padding:'1rem 0' }}>No submissions yet.</p>
                    ) : (
                      <div className="fc-table-wrap">
                        <table className="fc-table">
                          <thead>
                            <tr><th>Student</th><th>Status</th><th>Submitted</th><th>Marks</th><th>Feedback</th><th>Action</th></tr>
                          </thead>
                          <tbody>
                            {a.submissions.map(sub => {
                              const ss = STATUS_STYLE[sub.status] || STATUS_STYLE.pending;
                              return (
                                <tr key={sub._id}>
                                  <td style={{ fontSize:'0.82rem', color:'var(--gray-800)' }}>{sub.student?.toString().slice(-6)}</td>
                                  <td><span style={{ fontSize:'0.72rem', fontWeight:700, padding:'0.18rem 0.55rem', borderRadius:'9999px', background:ss.bg, color:ss.c }}>{sub.status}</span></td>
                                  <td style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>{sub.submittedAt ? fmtDate(sub.submittedAt) : '—'}</td>
                                  <td style={{ fontWeight:700 }}>{sub.marks ?? '—'}{sub.marks!=null ? `/${a.maxMarks}` : ''}</td>
                                  <td style={{ fontSize:'0.78rem', color:'var(--text-muted)', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sub.feedback || '—'}</td>
                                  <td>
                                    {['submitted','late'].includes(sub.status) && (
                                      <button className="marks-action-btn marks-action-btn--save" onClick={() => openGrade(a, sub)}>Grade</button>
                                    )}
                                    {sub.status === 'graded' && (
                                      <button className="marks-action-btn marks-action-btn--edit" onClick={() => openGrade(a, sub)}>Edit</button>
                                    )}
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
          })}
        </div>
      )}

      {/* Create / Edit modal */}
      {modalOpen && (
        <div className="fc-modal-backdrop" onClick={e=>e.target===e.currentTarget&&closeModal()}>
          <div className="fc-modal" role="dialog" aria-modal="true">
            <div className="fc-modal__header">
              <h2 className="fc-modal__title">{editTarget ? 'Edit Assignment' : 'New Assignment'}</h2>
              <button className="fc-modal__close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSave} noValidate>
              <div className="fc-modal__body">
                <div className="form-group"><label className="form-label">Title *</label><input className="form-input" value={form.title} onChange={e=>setF('title',e.target.value)} required placeholder="Assignment title…"/></div>
                <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" rows={3} value={form.description} onChange={e=>setF('description',e.target.value)} style={{ resize:'vertical' }} placeholder="Instructions…"/></div>
                <div className="fc-modal__grid">
                  <div className="form-group"><label className="form-label">Type</label>
                    <select className="form-input" value={form.type} onChange={e=>setF('type',e.target.value)}>
                      {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Max Marks</label><input className="form-input" type="number" min={1} value={form.maxMarks} onChange={e=>setF('maxMarks',e.target.value)}/></div>
                  <div className="form-group" style={{ gridColumn:'1/-1' }}><label className="form-label">Due Date *</label><input className="form-input" type="date" value={form.dueDate} onChange={e=>setF('dueDate',e.target.value)} required/></div>
                </div>
              </div>
              <div className="fc-modal__footer">
                <button type="button" className="fc-modal-btn fc-modal-btn--cancel" onClick={closeModal}>Cancel</button>
                <button type="submit" className="fc-modal-btn fc-modal-btn--submit" disabled={saving}>{saving?'Saving…':editTarget?'Save Changes':'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grade submission modal */}
      {gradeModal && (
        <div className="fc-modal-backdrop" onClick={e=>e.target===e.currentTarget&&setGradeModal(null)}>
          <div className="fc-modal" role="dialog" aria-modal="true">
            <div className="fc-modal__header">
              <h2 className="fc-modal__title">Grade Submission</h2>
              <button className="fc-modal__close" onClick={()=>setGradeModal(null)}>×</button>
            </div>
            <form onSubmit={handleGrade} noValidate>
              <div className="fc-modal__body">
                <div className="form-group"><label className="form-label">Marks</label><input className="form-input" type="number" min={0} value={gradeForm.marks} onChange={e=>setGradeForm(f=>({...f,marks:e.target.value}))} required/></div>
                <div className="form-group"><label className="form-label">Feedback</label><textarea className="form-input" rows={3} value={gradeForm.feedback} onChange={e=>setGradeForm(f=>({...f,feedback:e.target.value}))} placeholder="Comments…" style={{ resize:'vertical' }}/></div>
              </div>
              <div className="fc-modal__footer">
                <button type="button" className="fc-modal-btn fc-modal-btn--cancel" onClick={()=>setGradeModal(null)}>Cancel</button>
                <button type="submit" className="fc-modal-btn fc-modal-btn--submit" disabled={gradingSaving}>{gradingSaving?'Grading…':'Save Grade'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {delTarget && (
        <div className="fc-modal-backdrop">
          <div className="fc-confirm" role="alertdialog" aria-modal="true">
            <div className="fc-confirm__icon">🗑️</div>
            <h3 className="fc-confirm__title">Delete Assignment?</h3>
            <p className="fc-confirm__sub">Permanently delete "<strong>{delTarget.title}</strong>"? All submissions will be lost.</p>
            <div className="fc-confirm__actions">
              <button className="fc-modal-btn fc-modal-btn--cancel" onClick={()=>setDelTarget(null)} disabled={deleting}>Cancel</button>
              <button className="fc-modal-btn fc-modal-btn--danger" onClick={handleDelete} disabled={deleting}>{deleting?'Deleting…':'Yes, Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyAssignments;
