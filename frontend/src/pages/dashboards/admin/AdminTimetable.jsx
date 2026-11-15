import React, { useEffect, useState, useCallback } from 'react';
import api from '../../../services/api';
import './shared.css';
import './AdminTimetable.css';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const TYPES = ['lecture','lab','tutorial','seminar'];
const TYPE_COLOR = { lecture:'#2563eb', lab:'#059669', tutorial:'#d97706', seminar:'#7c3aed' };
const EMPTY_SLOT = { day:'Monday', startTime:'09:00', endTime:'10:00', course:'', courseName:'', courseCode:'', instructor:'', room:'', type:'lecture' };

const setTitle = (t) => { const el = document.getElementById('page-title'); if (el) el.textContent = t; };
const fmt12 = (t) => { if(!t) return ''; const [h,m]=t.split(':').map(Number); return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`; };
const Toast = ({msg}) => msg.text ? <div className={`mgmt-toast mgmt-toast--${msg.type}`} role="alert">{msg.type==='success'?'✓':'✗'} {msg.text}</div> : null;

export default function AdminTimetable() {
  const [departments, setDepartments] = useState([]);
  const [courses,     setCourses]     = useState([]);
  const [timetables,  setTimetables]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [toast,       setToast]       = useState({type:'',text:''});

  /* filters */
  const [deptFilter, setDeptFilter] = useState('');
  const [semFilter,  setSemFilter]  = useState('');

  /* selected timetable for slot management */
  const [activeTT,   setActiveTT]   = useState(null);

  /* create timetable modal */
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ department:'', semester:1, academic:'' });
  const [creating,   setCreating]   = useState(false);

  /* slot modal */
  const [slotModal,  setSlotModal]  = useState(null); // null | { mode:'add'|'edit', slotIndex? }
  const [slotForm,   setSlotForm]   = useState(EMPTY_SLOT);
  const [slotSaving, setSlotSaving] = useState(false);
  const [slotError,  setSlotError]  = useState('');

  /* delete confirm */
  const [delTT,    setDelTT]    = useState(null);
  const [delSlot,  setDelSlot]  = useState(null); // { ttId, slotIndex, label }
  const [deleting, setDeleting] = useState(false);

  const showToast = (type, text) => { setToast({type,text}); setTimeout(()=>setToast({type:'',text:''}),3500); };

  /* load supporting data */
  useEffect(() => {
    setTitle('Timetable Management');
    Promise.all([
      api.get('/admin/departments/all'),
      api.get('/admin/courses?limit=200'),
    ]).then(([d, c]) => {
      setDepartments(d.data);
      setCourses(c.data.courses || []);
    }).catch(() => {});
  }, []);

  /* load timetables */
  const loadTimetables = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (deptFilter) params.set('department', deptFilter);
      if (semFilter)  params.set('semester',   semFilter);
      const { data } = await api.get(`/academic/timetables?${params}`);
      setTimetables(data.timetables);
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  }, [deptFilter, semFilter]);

  useEffect(() => { loadTimetables(); }, [loadTimetables]);

  /* when activeTT id matches, keep it in sync after reload */
  useEffect(() => {
    if (activeTT) {
      const fresh = timetables.find(t => t._id === activeTT._id);
      if (fresh) setActiveTT(fresh);
    }
  }, [timetables]);

  /* ── Create timetable ── */
  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/academic/timetables', createForm);
      showToast('success', 'Timetable created.');
      setCreateOpen(false);
      setCreateForm({ department:'', semester:1, academic:'' });
      loadTimetables();
    } catch (err) { showToast('error', err.message); }
    finally { setCreating(false); }
  };

  /* ── Delete timetable ── */
  const handleDeleteTT = async () => {
    if (!delTT) return;
    setDeleting(true);
    try {
      await api.delete(`/academic/timetables/${delTT._id}`);
      showToast('success', 'Timetable deleted.');
      setDelTT(null);
      if (activeTT?._id === delTT._id) setActiveTT(null);
      loadTimetables();
    } catch (err) { showToast('error', err.message); }
    finally { setDeleting(false); }
  };

  /* ── Open slot modal ── */
  const openAddSlot = () => {
    setSlotForm({ ...EMPTY_SLOT });
    setSlotError('');
    setSlotModal({ mode:'add' });
  };
  const openEditSlot = (slot, index) => {
    setSlotForm({
      day: slot.day, startTime: slot.startTime, endTime: slot.endTime,
      course: slot.course?._id || slot.course || '',
      courseName: slot.courseName || '', courseCode: slot.courseCode || '',
      instructor: slot.instructor || '', room: slot.room || '', type: slot.type || 'lecture',
    });
    setSlotError('');
    setSlotModal({ mode:'edit', slotIndex: index });
  };

  /* ── Save slot ── */
  const handleSaveSlot = async (e) => {
    e.preventDefault();
    setSlotSaving(true); setSlotError('');
    try {
      /* enrich courseName/Code from local list if course selected */
      const payload = { ...slotForm };
      if (payload.course && (!payload.courseName || !payload.courseCode)) {
        const c = courses.find(x => x._id === payload.course);
        if (c) { payload.courseName = c.name; payload.courseCode = c.code; payload.instructor = payload.instructor || c.instructor || ''; }
      }
      if (slotModal.mode === 'add') {
        await api.post(`/academic/timetables/${activeTT._id}/slots`, payload);
        showToast('success', 'Slot added.');
      } else {
        await api.put(`/academic/timetables/${activeTT._id}/slots/${slotModal.slotIndex}`, payload);
        showToast('success', 'Slot updated.');
      }
      setSlotModal(null);
      loadTimetables();
    } catch (err) { setSlotError(err.message); }
    finally { setSlotSaving(false); }
  };

  /* ── Delete slot ── */
  const handleDeleteSlot = async () => {
    if (!delSlot) return;
    setDeleting(true);
    try {
      await api.delete(`/academic/timetables/${delSlot.ttId}/slots/${delSlot.slotIndex}`);
      showToast('success', 'Slot removed.');
      setDelSlot(null);
      loadTimetables();
    } catch (err) { showToast('error', err.message); }
    finally { setDeleting(false); }
  };

  const setF = (k, v) => setSlotForm(f => ({...f, [k]: v}));

  /* ── grouped slot view ── */
  const slotsByDay = activeTT
    ? DAYS.reduce((acc, d) => {
        acc[d] = (activeTT.slots || [])
          .map((s, i) => ({ ...s, _idx: i }))
          .filter(s => s.day === d)
          .sort((a, b) => a.startTime.localeCompare(b.startTime));
        return acc;
      }, {})
    : {};

  return (
    <div className="mgmt-page">
      <Toast msg={toast} />

      {/* Page header */}
      <div className="mgmt-header">
        <div className="mgmt-header__left">
          <h1 className="mgmt-header__title">Timetable Management</h1>
          <p className="mgmt-header__sub">{timetables.length} timetable{timetables.length!==1?'s':''}</p>
        </div>
        <button className="mgmt-toolbar__add" onClick={() => setCreateOpen(true)}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Timetable
        </button>
      </div>

      {/* Filters */}
      <div className="mgmt-toolbar">
        <select className="mgmt-toolbar__select" value={deptFilter} onChange={e=>{setDeptFilter(e.target.value);setActiveTT(null);}}>
          <option value="">All Departments</option>
          {departments.map(d=><option key={d._id} value={d._id}>{d.name}</option>)}
        </select>
        <select className="mgmt-toolbar__select" value={semFilter} onChange={e=>{setSemFilter(e.target.value);setActiveTT(null);}}>
          <option value="">All Semesters</option>
          {[1,2,3,4,5,6,7,8].map(s=><option key={s} value={s}>Semester {s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="dash-loading"><div className="dash-loading__spinner"/><span>Loading…</span></div>
      ) : (
        <div className="tt-layout">
          {/* Left — timetable list */}
          <div className="tt-list-panel">
            <div className="tt-list-header">Timetables</div>
            {timetables.length === 0 ? (
              <div className="mgmt-empty"><span className="mgmt-empty__icon">📅</span><span className="mgmt-empty__title">No timetables yet</span><span className="mgmt-empty__sub">Create one to get started.</span></div>
            ) : timetables.map(tt => (
              <div key={tt._id}
                className={`tt-list-item ${activeTT?._id === tt._id ? 'tt-list-item--active' : ''}`}
                onClick={() => setActiveTT(activeTT?._id === tt._id ? null : tt)}>
                <div className="tt-list-item__left">
                  <span className="tt-list-item__dept">{tt.department?.name || '—'}</span>
                  <span className="tt-list-item__meta">Sem {tt.semester}{tt.academic ? ` · ${tt.academic}` : ''} · {tt.slots?.length||0} slots</span>
                </div>
                <div className="tt-list-item__right">
                  <span className={`status-badge status-badge--${tt.isActive?'active':'inactive'}`}>{tt.isActive?'Active':'Off'}</span>
                  <button className="tbl-btn tbl-btn--danger" title="Delete" onClick={e=>{e.stopPropagation();setDelTT(tt);}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Right — slot grid */}
          {activeTT ? (
            <div className="tt-grid-panel">
              <div className="tt-grid-header">
                <div>
                  <span className="tt-grid-header__title">{activeTT.department?.name} — Semester {activeTT.semester}</span>
                  {activeTT.academic && <span className="tt-grid-header__academic"> · {activeTT.academic}</span>}
                </div>
                <button className="mgmt-toolbar__add" onClick={openAddSlot}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add Slot
                </button>
              </div>

              {/* Weekly grid */}
              <div className="tt-weekly">
                {DAYS.map(day => (
                  <div key={day} className="tt-day-col">
                    <div className="tt-day-col__header">{day}</div>
                    <div className="tt-day-col__slots">
                      {slotsByDay[day].length === 0 ? (
                        <div className="tt-day-col__empty">Free</div>
                      ) : slotsByDay[day].map(slot => (
                        <div key={slot._idx} className="tt-slot-card"
                          style={{ borderLeft:`3px solid ${TYPE_COLOR[slot.type]||'#64748b'}` }}>
                          <div className="tt-slot-card__time">{fmt12(slot.startTime)} – {fmt12(slot.endTime)}</div>
                          <div className="tt-slot-card__name">{slot.courseName || slot.courseCode || '—'}</div>
                          {slot.room       && <div className="tt-slot-card__meta">📍 {slot.room}</div>}
                          {slot.instructor && <div className="tt-slot-card__meta">👤 {slot.instructor}</div>}
                          <div className="tt-slot-card__type" style={{ color: TYPE_COLOR[slot.type]||'#64748b' }}>{slot.type}</div>
                          <div className="tt-slot-card__actions">
                            <button className="tbl-btn" title="Edit" onClick={() => openEditSlot(slot, slot._idx)}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button className="tbl-btn tbl-btn--danger" title="Remove" onClick={() => setDelSlot({ ttId: activeTT._id, slotIndex: slot._idx, label:`${slot.day} ${slot.startTime}` })}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="tt-legend">
                {Object.entries(TYPE_COLOR).map(([type, color]) => (
                  <span key={type} className="tt-legend-item">
                    <span style={{ width:10, height:10, borderRadius:'50%', background:color, display:'inline-block', flexShrink:0 }}/>
                    {type}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="tt-grid-panel tt-grid-panel--empty">
              <span>📅</span><p>Select a timetable to view and manage its slots.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Create timetable modal ── */}
      {createOpen && (
        <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&setCreateOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true">
            <div className="modal__header">
              <h2 className="modal__title">New Timetable</h2>
              <button className="modal__close" onClick={()=>setCreateOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreate} noValidate>
              <div className="modal__body">
                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <select className="form-input" value={createForm.department} onChange={e=>setCreateForm(f=>({...f,department:e.target.value}))} required>
                    <option value="">— Select —</option>
                    {departments.map(d=><option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Semester *</label>
                  <select className="form-input" value={createForm.semester} onChange={e=>setCreateForm(f=>({...f,semester:Number(e.target.value)}))}>
                    {[1,2,3,4,5,6,7,8].map(s=><option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Academic Year</label>
                  <input className="form-input" value={createForm.academic} onChange={e=>setCreateForm(f=>({...f,academic:e.target.value}))} placeholder="e.g. 2024-25"/>
                </div>
              </div>
              <div className="modal__footer">
                <button type="button" className="modal__btn modal__btn--cancel" onClick={()=>setCreateOpen(false)}>Cancel</button>
                <button type="submit" className="modal__btn modal__btn--submit" disabled={creating||!createForm.department}>{creating?'Creating…':'Create Timetable'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add / Edit slot modal ── */}
      {slotModal && (
        <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&setSlotModal(null)}>
          <div className="modal modal--wide" role="dialog" aria-modal="true">
            <div className="modal__header">
              <h2 className="modal__title">{slotModal.mode==='add'?'Add Slot':'Edit Slot'}</h2>
              <button className="modal__close" onClick={()=>setSlotModal(null)}>×</button>
            </div>
            <form onSubmit={handleSaveSlot} noValidate>
              <div className="modal__body">
                {slotError && <div className="mgmt-toast mgmt-toast--error" style={{position:'static',marginBottom:'1rem',animation:'none'}}>{slotError}</div>}
                <div className="modal__grid">
                  <div className="form-group">
                    <label className="form-label">Day *</label>
                    <select className="form-input" value={slotForm.day} onChange={e=>setF('day',e.target.value)}>
                      {DAYS.map(d=><option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select className="form-input" value={slotForm.type} onChange={e=>setF('type',e.target.value)}>
                      {TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Start Time *</label>
                    <input className="form-input" type="time" value={slotForm.startTime} onChange={e=>setF('startTime',e.target.value)} required/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Time *</label>
                    <input className="form-input" type="time" value={slotForm.endTime} onChange={e=>setF('endTime',e.target.value)} required/>
                  </div>
                  <div className="form-group" style={{gridColumn:'1/-1'}}>
                    <label className="form-label">Course</label>
                    <select className="form-input" value={slotForm.course} onChange={e=>{
                      const c = courses.find(x=>x._id===e.target.value);
                      setF('course', e.target.value);
                      if (c) { setF('courseName', c.name); setF('courseCode', c.code); if (!slotForm.instructor) setF('instructor', c.instructor||''); }
                    }}>
                      <option value="">— Select Course —</option>
                      {courses.map(c=><option key={c._id} value={c._id}>{c.code} — {c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Instructor</label>
                    <input className="form-input" value={slotForm.instructor} onChange={e=>setF('instructor',e.target.value)} placeholder="Dr. Smith"/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Room</label>
                    <input className="form-input" value={slotForm.room} onChange={e=>setF('room',e.target.value)} placeholder="Room 101"/>
                  </div>
                </div>
              </div>
              <div className="modal__footer">
                <button type="button" className="modal__btn modal__btn--cancel" onClick={()=>setSlotModal(null)}>Cancel</button>
                <button type="submit" className="modal__btn modal__btn--submit" disabled={slotSaving}>{slotSaving?'Saving…':slotModal.mode==='add'?'Add Slot':'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete timetable confirm ── */}
      {delTT && (
        <div className="modal-backdrop">
          <div className="confirm-dialog" role="alertdialog" aria-modal="true">
            <div className="confirm-dialog__icon">🗑️</div>
            <h3 className="confirm-dialog__title">Delete Timetable?</h3>
            <p className="confirm-dialog__sub">Delete the timetable for <strong>{delTT.department?.name}</strong> Semester {delTT.semester}? All {delTT.slots?.length||0} slots will be lost.</p>
            <div className="confirm-dialog__actions">
              <button className="modal__btn modal__btn--cancel" onClick={()=>setDelTT(null)} disabled={deleting}>Cancel</button>
              <button className="modal__btn modal__btn--danger" onClick={handleDeleteTT} disabled={deleting}>{deleting?'Deleting…':'Yes, Delete'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete slot confirm ── */}
      {delSlot && (
        <div className="modal-backdrop">
          <div className="confirm-dialog" role="alertdialog" aria-modal="true">
            <div className="confirm-dialog__icon">🗑️</div>
            <h3 className="confirm-dialog__title">Remove Slot?</h3>
            <p className="confirm-dialog__sub">Remove the slot on <strong>{delSlot.label}</strong>?</p>
            <div className="confirm-dialog__actions">
              <button className="modal__btn modal__btn--cancel" onClick={()=>setDelSlot(null)} disabled={deleting}>Cancel</button>
              <button className="modal__btn modal__btn--danger" onClick={handleDeleteSlot} disabled={deleting}>{deleting?'Removing…':'Yes, Remove'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
