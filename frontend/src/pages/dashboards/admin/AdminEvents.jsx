import React, { useEffect, useState, useCallback } from 'react';
import api from '../../../services/api';
import './shared.css';
import './AdminEvents.css';

const setTitle = (t) => { const el = document.getElementById('page-title'); if (el) el.textContent = t; };
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';
const isUpcoming = (d) => new Date(d) >= new Date();

const CAT_ICON = { academic:'📖', cultural:'🎭', sports:'🏆', seminar:'🎤', workshop:'🛠️', holiday:'🎉', exam:'📝', other:'📌' };
const CAT_COLORS = { academic:'#1d4ed8', cultural:'#7e22ce', sports:'#15803d', seminar:'#0891b2', workshop:'#c2410c', holiday:'#d97706', exam:'#dc2626', other:'#475569' };

const EMPTY_FORM = {
  title:'', description:'', category:'other', startDate:'', endDate:'',
  startTime:'', endTime:'', venue:'', organizer:'', audience:'all',
  registrationRequired:false, maxParticipants:0, isActive:true, isAllDay:false,
};

const Toast = ({ msg }) => msg.text
  ? <div className={`mgmt-toast mgmt-toast--${msg.type}`} role="alert">{msg.type==='success'?'✓':'✗'} {msg.text}</div>
  : null;

export default function AdminEvents() {
  const [events,     setEvents]     = useState([]);
  const [pagination, setPagination] = useState({ total:0, page:1, totalPages:1 });
  const [loading,    setLoading]    = useState(true);
  const [toast,      setToast]      = useState({ type:'', text:'' });

  // Filters
  const [search,     setSearch]     = useState('');
  const [catFilter,  setCatFilter]  = useState('');
  const [upcoming,   setUpcoming]   = useState('');
  const [page,       setPage]       = useState(1);

  // Modal
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving,     setSaving]     = useState(false);

  // Delete
  const [delTarget,  setDelTarget]  = useState(null);
  const [deleting,   setDeleting]   = useState(false);

  // Participants drawer
  const [partEvent,  setPartEvent]  = useState(null);
  const [parts,      setParts]      = useState(null);
  const [partLoad,   setPartLoad]   = useState(false);

  const showToast = (t, x) => { setToast({type:t,text:x}); setTimeout(()=>setToast({type:'',text:''}),3500); };

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit:12 });
      if (search)   p.set('search',   search);
      if (catFilter) p.set('category', catFilter);
      if (upcoming)  p.set('upcoming', upcoming);
      const { data } = await api.get(`/events?${p}`);
      setEvents(data.events);
      setPagination(data.pagination);
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  }, [page, search, catFilter, upcoming]);

  useEffect(() => { setTitle('Events'); loadEvents(); }, [loadEvents]);
  useEffect(() => { setPage(1); }, [search, catFilter, upcoming]);

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setFormErrors({}); setModalOpen(true); };
  const openEdit   = (e) => {
    setEditTarget(e);
    setForm({
      title: e.title, description: e.description, category: e.category,
      startDate: e.startDate?.slice(0,10)||'', endDate: e.endDate?.slice(0,10)||'',
      startTime: e.startTime||'', endTime: e.endTime||'',
      venue: e.venue||'', organizer: e.organizer||'', audience: e.audience||'all',
      registrationRequired: !!e.registrationRequired, maxParticipants: e.maxParticipants||0,
      isActive: e.isActive!==false, isAllDay: !!e.isAllDay,
    });
    setFormErrors({}); setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditTarget(null); setFormErrors({}); };
  const setF = (k, v) => setForm(f => ({...f, [k]: v}));

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required.';
    if (!form.startDate)    e.startDate = 'Start date is required.';
    return e;
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setSaving(true);
    try {
      if (editTarget) await api.put(`/events/${editTarget._id}`, form);
      else            await api.post('/events', form);
      showToast('success', editTarget ? 'Event updated.' : 'Event created.');
      closeModal(); loadEvents();
    } catch (err) { showToast('error', err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/events/${delTarget._id}`);
      showToast('success', 'Event deleted.');
      setDelTarget(null); loadEvents();
    } catch (err) { showToast('error', err.message); }
    finally { setDeleting(false); }
  };

  const openParticipants = async (ev) => {
    setPartEvent(ev); setPartLoad(true); setParts(null);
    try {
      const { data } = await api.get(`/events/${ev._id}/participants`);
      setParts(data);
    } catch (e) { showToast('error', e.message); }
    finally { setPartLoad(false); }
  };

  const toggleAttended = async (regId, attended) => {
    try {
      await api.put(`/events/${partEvent._id}/participants/${regId}/attendance`, { attended: !attended });
      openParticipants(partEvent); // refresh
    } catch (e) { showToast('error', e.message); }
  };

  const generateReminders = async () => {
    try {
      const { data } = await api.post('/notifications/generate/events');
      showToast('success', data.message);
    } catch (e) { showToast('error', e.message); }
  };

  const pages = Array.from({ length: pagination.totalPages }, (_, i) => i + 1);

  return (
    <div className="mgmt-page">
      <Toast msg={toast} />

      {/* Header */}
      <div className="mgmt-header">
        <div className="mgmt-header__left">
          <h1 className="mgmt-header__title">Events</h1>
          <p className="mgmt-header__sub">{pagination.total} total events</p>
        </div>
        <div style={{ display:'flex', gap:'0.6rem', flexWrap:'wrap' }}>
          <button className="mgmt-toolbar__add" style={{ background:'var(--gray-100)', color:'var(--gray-700)', border:'1px solid var(--border)' }} onClick={generateReminders}>
            🔔 Send Reminders
          </button>
          <button className="mgmt-toolbar__add" onClick={openCreate}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Event
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mgmt-toolbar">
        <div className="mgmt-toolbar__search">
          <svg className="mgmt-toolbar__search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search events…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="mgmt-toolbar__select" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">All Categories</option>
          {['academic','cultural','sports','seminar','workshop','holiday','exam','other'].map(c=>(
            <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>
          ))}
        </select>
        <select className="mgmt-toolbar__select" value={upcoming} onChange={e => setUpcoming(e.target.value)}>
          <option value="">All Dates</option>
          <option value="true">Upcoming Only</option>
        </select>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="dash-loading"><div className="dash-loading__spinner"/><span>Loading…</span></div>
      ) : events.length === 0 ? (
        <div className="mgmt-table-card"><div className="mgmt-empty"><span className="mgmt-empty__icon">📅</span><span className="mgmt-empty__title">No events found</span></div></div>
      ) : (
        <div className="ev-grid">
          {events.map(ev => {
            const icon  = CAT_ICON[ev.category] || '📌';
            const color = CAT_COLORS[ev.category] || '#475569';
            const up    = isUpcoming(ev.startDate);
            return (
              <div key={ev._id} className={`ev-card ${!ev.isActive?'ev-card--inactive':''} ${!up?'ev-card--past':''}`}
                style={{ borderTop:`3px solid ${color}` }}>
                <div className="ev-card__header">
                  <div className="ev-card__icon-wrap" style={{ background:`${color}18` }}>
                    <span className="ev-card__icon">{icon}</span>
                  </div>
                  <div className="ev-card__meta-top">
                    <span className="ev-card__cat" style={{ color, background:`${color}15` }}>{ev.category}</span>
                    {!up && <span className="ev-card__past-badge">Past</span>}
                    {!ev.isActive && <span className="ev-card__inactive-badge">Inactive</span>}
                  </div>
                </div>
                <h3 className="ev-card__title">{ev.title}</h3>
                {ev.description && <p className="ev-card__desc">{ev.description}</p>}
                <div className="ev-card__details">
                  <div className="ev-card__detail">📅 {fmtDate(ev.startDate)}{ev.startTime ? ` · ${ev.startTime}` : ''}</div>
                  {ev.venue    && <div className="ev-card__detail">📍 {ev.venue}</div>}
                  {ev.organizer && <div className="ev-card__detail">👤 {ev.organizer}</div>}
                  {ev.registrationRequired && (
                    <div className="ev-card__detail">
                      👥 {ev.registeredCount||0}
                      {ev.maxParticipants>0 ? ` / ${ev.maxParticipants}` : ' registered'}
                      {ev.isFull && <span className="ev-card__full-badge">Full</span>}
                    </div>
                  )}
                </div>
                <div className="ev-card__actions">
                  {ev.registrationRequired && (
                    <button className="tbl-btn" title="View Participants" onClick={() => openParticipants(ev)}>
                      👥
                    </button>
                  )}
                  <button className="tbl-btn" title="Edit" onClick={() => openEdit(ev)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button className="tbl-btn tbl-btn--danger" title="Delete" onClick={() => setDelTarget(ev)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mgmt-pagination">
          <span className="mgmt-pagination__info">{pagination.total} events</span>
          <div className="mgmt-pagination__btns">
            <button className="mgmt-pagination__btn" onClick={()=>setPage(p=>p-1)} disabled={page===1}>‹</button>
            {pages.slice(Math.max(0,page-3),Math.min(pages.length,page+2)).map(p=>(
              <button key={p} className={`mgmt-pagination__btn ${p===page?'mgmt-pagination__btn--active':''}`} onClick={()=>setPage(p)}>{p}</button>
            ))}
            <button className="mgmt-pagination__btn" onClick={()=>setPage(p=>p+1)} disabled={page===pagination.totalPages}>›</button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&closeModal()}>
          <div className="modal modal--wide" role="dialog" aria-modal="true">
            <div className="modal__header">
              <h2 className="modal__title">{editTarget?'Edit Event':'New Event'}</h2>
              <button className="modal__close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSave} noValidate>
              <div className="modal__body">
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input className={`form-input ${formErrors.title?'form-input--error':''}`} value={form.title} onChange={e=>setF('title',e.target.value)} placeholder="Event title…"/>
                  {formErrors.title && <span className="form-error">{formErrors.title}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows={3} value={form.description} onChange={e=>setF('description',e.target.value)} style={{resize:'vertical'}} placeholder="Details…"/>
                </div>
                <div className="modal__grid">
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-input" value={form.category} onChange={e=>setF('category',e.target.value)}>
                      {['academic','cultural','sports','seminar','workshop','holiday','exam','other'].map(c=>(
                        <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Audience</label>
                    <select className="form-input" value={form.audience} onChange={e=>setF('audience',e.target.value)}>
                      {['all','students','faculty','department'].map(a=>(
                        <option key={a} value={a}>{a.charAt(0).toUpperCase()+a.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Start Date *</label>
                    <input className={`form-input ${formErrors.startDate?'form-input--error':''}`} type="date" value={form.startDate} onChange={e=>setF('startDate',e.target.value)}/>
                    {formErrors.startDate && <span className="form-error">{formErrors.startDate}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input className="form-input" type="date" value={form.endDate} onChange={e=>setF('endDate',e.target.value)}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Start Time</label>
                    <input className="form-input" type="time" value={form.startTime} onChange={e=>setF('startTime',e.target.value)}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Time</label>
                    <input className="form-input" type="time" value={form.endTime} onChange={e=>setF('endTime',e.target.value)}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Venue</label>
                    <input className="form-input" value={form.venue} onChange={e=>setF('venue',e.target.value)} placeholder="Main Auditorium"/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Organizer</label>
                    <input className="form-input" value={form.organizer} onChange={e=>setF('organizer',e.target.value)} placeholder="Student Council"/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max Participants (0 = unlimited)</label>
                    <input className="form-input" type="number" min={0} value={form.maxParticipants} onChange={e=>setF('maxParticipants',Number(e.target.value))}/>
                  </div>
                </div>
                <div style={{display:'flex',gap:'1.5rem',flexWrap:'wrap',marginTop:'0.5rem'}}>
                  {[['registrationRequired','Registration Required'],['isActive','Published'],['isAllDay','All-Day Event']].map(([k,l])=>(
                    <label key={k} style={{display:'flex',alignItems:'center',gap:'0.5rem',cursor:'pointer',fontSize:'0.875rem',fontWeight:600,color:'var(--gray-700)'}}>
                      <input type="checkbox" checked={!!form[k]} onChange={e=>setF(k,e.target.checked)} style={{width:16,height:16}}/>
                      {l}
                    </label>
                  ))}
                </div>
              </div>
              <div className="modal__footer">
                <button type="button" className="modal__btn modal__btn--cancel" onClick={closeModal}>Cancel</button>
                <button type="submit" className="modal__btn modal__btn--submit" disabled={saving}>{saving?'Saving…':editTarget?'Save Changes':'Create Event'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {delTarget && (
        <div className="modal-backdrop">
          <div className="confirm-dialog" role="alertdialog">
            <div className="confirm-dialog__icon">🗑️</div>
            <h3 className="confirm-dialog__title">Delete Event?</h3>
            <p className="confirm-dialog__sub">Permanently delete "<strong>{delTarget.title}</strong>"? All registrations will be lost.</p>
            <div className="confirm-dialog__actions">
              <button className="modal__btn modal__btn--cancel" onClick={()=>setDelTarget(null)} disabled={deleting}>Cancel</button>
              <button className="modal__btn modal__btn--danger" onClick={handleDelete} disabled={deleting}>{deleting?'Deleting…':'Yes, Delete'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Participants drawer */}
      {partEvent && (
        <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&setPartEvent(null)}>
          <div className="modal modal--wide" role="dialog" aria-modal="true">
            <div className="modal__header">
              <div>
                <h2 className="modal__title">Participants — {partEvent.title}</h2>
                {parts && <p style={{fontSize:'0.78rem',color:'var(--text-muted)',marginTop:2}}>{parts.registeredCount} registered{parts.maxParticipants>0?` / ${parts.maxParticipants} max`:''}</p>}
              </div>
              <button className="modal__close" onClick={()=>setPartEvent(null)}>×</button>
            </div>
            <div className="modal__body">
              {partLoad ? (
                <div className="dash-loading" style={{minHeight:120}}><div className="dash-loading__spinner"/></div>
              ) : !parts?.registrations?.length ? (
                <p style={{color:'var(--text-muted)',textAlign:'center',padding:'2rem'}}>No registrations yet.</p>
              ) : (
                <div className="mgmt-table-wrap">
                  <table className="mgmt-table">
                    <thead>
                      <tr><th>#</th><th>Student</th><th>ID</th><th>Email</th><th>Registered</th><th>Attended</th></tr>
                    </thead>
                    <tbody>
                      {parts.registrations.map((r,i)=>(
                        <tr key={r._id}>
                          <td style={{color:'var(--text-muted)',fontSize:'0.8rem'}}>{i+1}</td>
                          <td style={{fontWeight:600}}>{r.studentName}</td>
                          <td><code style={{fontSize:'0.78rem',background:'var(--gray-100)',padding:'0.1rem 0.4rem',borderRadius:4}}>{r.studentId}</code></td>
                          <td style={{fontSize:'0.8rem',color:'var(--text-muted)'}}>{r.studentEmail}</td>
                          <td style={{fontSize:'0.8rem'}}>{new Date(r.registeredAt).toLocaleDateString()}</td>
                          <td>
                            <button
                              className={`status-badge status-badge--${r.attended?'active':'inactive'}`}
                              style={{cursor:'pointer',border:'none',padding:'0.22rem 0.65rem'}}
                              onClick={()=>toggleAttended(r._id, r.attended)}
                            >
                              {r.attended?'✓ Present':'Mark Present'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
