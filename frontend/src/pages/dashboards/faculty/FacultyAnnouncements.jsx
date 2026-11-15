import React, { useEffect, useState, useCallback } from 'react';
import api from '../../../services/api';
import './FacultyAnnouncements.css';

const setTitle = (t) => { const el = document.getElementById('fc-page-title'); if (el) el.textContent = t; };
const timeAgo = (d) => { const diff = Date.now()-new Date(d).getTime(); const m=Math.floor(diff/60000); if(m<1)return 'just now'; if(m<60)return `${m}m ago`; const h=Math.floor(m/60); if(h<24)return `${h}h ago`; return `${Math.floor(h/24)}d ago`; };
const PRIORITY = { low:{bg:'#f0fdf4',c:'#16a34a'}, normal:{bg:'#eff6ff',c:'#2563eb'}, high:{bg:'#fff7ed',c:'#ea580c'}, urgent:{bg:'#fef2f2',c:'#dc2626'} };
const AUDIENCE = ['all','students','faculty'];
const PRIORITIES = ['low','normal','high','urgent'];
const EMPTY = { title:'', content:'', audience:'all', priority:'normal', isActive:true, expiresAt:'' };
const Toast = ({ msg }) => msg.text ? <div className={`fc-toast fc-toast--${msg.type}`} role="alert">{msg.type==='success'?'✓':'✗'} {msg.text}</div> : null;

const FacultyAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [toast,     setToast]     = useState({ type:'', text:'' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget,setEditTarget]= useState(null);
  const [form,      setForm]      = useState(EMPTY);
  const [saving,    setSaving]    = useState(false);
  const [delTarget, setDelTarget] = useState(null);
  const [deleting,  setDeleting]  = useState(false);
  const [search,    setSearch]    = useState('');

  const showToast = (t, x) => { setToast({ type:t, text:x }); setTimeout(()=>setToast({ type:'', text:'' }), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/faculty/announcements'); setAnnouncements(data.announcements); }
    catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { setTitle('Announcements'); load(); }, [load]);

  const openCreate = () => { setEditTarget(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit   = (a) => { setEditTarget(a); setForm({ title:a.title, content:a.content, audience:a.audience, priority:a.priority, isActive:a.isActive, expiresAt:a.expiresAt?a.expiresAt.slice(0,10):'' }); setModalOpen(true); };
  const closeModal = ()  => { setModalOpen(false); setEditTarget(null); };
  const setF = (k,v) => setForm(f => ({...f,[k]:v}));

  const validate = () => !form.title.trim() || !form.content.trim();

  const handleSave = async (e) => {
    e.preventDefault();
    if (validate()) return;
    setSaving(true);
    const payload = { ...form, expiresAt: form.expiresAt || null };
    try {
      if (editTarget) await api.put(`/faculty/announcements/${editTarget._id}`, payload);
      else            await api.post('/faculty/announcements', payload);
      showToast('success', editTarget ? 'Announcement updated.' : 'Announcement posted.');
      closeModal(); load();
    } catch (err) { showToast('error', err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    setDeleting(true);
    try { await api.delete(`/faculty/announcements/${delTarget._id}`); showToast('success', 'Deleted.'); setDelTarget(null); load(); }
    catch (err) { showToast('error', err.message); }
    finally { setDeleting(false); }
  };

  const toggleActive = async (a) => {
    try { await api.put(`/faculty/announcements/${a._id}`, { ...a, isActive: !a.isActive }); showToast('success', `Announcement ${a.isActive?'deactivated':'activated'}.`); load(); }
    catch (err) { showToast('error', err.message); }
  };

  const filtered = search ? announcements.filter(a => a.title.toLowerCase().includes(search.toLowerCase())) : announcements;

  return (
    <div className="fc-page fca-page">
      <Toast msg={toast} />

      <div className="fc-page-header">
        <div className="fc-page-header__left">
          <h1 className="fc-page-title">Announcements</h1>
          <p className="fc-page-sub">{announcements.length} announcement{announcements.length!==1?'s':''} posted by you</p>
        </div>
        <button className="fc-btn-primary" onClick={openCreate}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Announcement
        </button>
      </div>

      {/* Search */}
      <div className="fc-panel fca-toolbar">
        <div style={{ flex:1, minWidth:200, position:'relative' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position:'absolute', left:'0.75rem', top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" placeholder="Search announcements…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ width:'100%', padding:'0.6rem 0.75rem 0.6rem 2.25rem', border:'1.5px solid var(--border)', borderRadius:'var(--radius-md)', fontSize:'0.875rem', fontFamily:'var(--font-sans)', outline:'none', background:'var(--gray-50)', transition:'var(--transition)' }}/>
        </div>
      </div>

      {loading ? (
        <div className="fc-loading"><div className="fc-loading__spinner"/><span>Loading…</span></div>
      ) : filtered.length === 0 ? (
        <div className="fc-panel"><p className="fc-empty">📢 No announcements yet. Post your first one!</p></div>
      ) : (
        <div className="fca-list">
          {filtered.map(a => {
            const pm = PRIORITY[a.priority] || PRIORITY.normal;
            return (
              <div key={a._id} className={`fca-card ${!a.isActive?'fca-card--inactive':''}`} style={{ borderLeft:`3px solid ${pm.c}` }}>
                <div className="fca-card__header">
                  <div className="fca-card__header-left">
                    <div className="fca-card__badges">
                      <span className="fca-priority-badge" style={{ background:pm.bg, color:pm.c }}>{a.priority}</span>
                      <span className="fca-audience-badge">For: {a.audience}</span>
                      {!a.isActive && <span className="fca-inactive-badge">Inactive</span>}
                    </div>
                    <h3 className="fca-card__title">{a.title}</h3>
                    <p className="fca-card__content">{a.content}</p>
                    <div className="fca-card__meta">
                      <span>{timeAgo(a.createdAt)}</span>
                      {a.expiresAt && <span>· Expires: {new Date(a.expiresAt).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="fca-card__actions">
                    <button className="fc-tbl-btn" onClick={() => toggleActive(a)} title={a.isActive?'Deactivate':'Activate'}>
                      {a.isActive
                        ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22"/></svg>
                        : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                    <button className="fc-tbl-btn" onClick={() => openEdit(a)} title="Edit">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button className="fc-tbl-btn fc-tbl-btn--danger" onClick={() => setDelTarget(a)} title="Delete">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                  </div>
                </div>
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
              <h2 className="fc-modal__title">{editTarget?'Edit Announcement':'New Announcement'}</h2>
              <button className="fc-modal__close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSave} noValidate>
              <div className="fc-modal__body">
                <div className="form-group"><label className="form-label">Title *</label><input className="form-input" value={form.title} onChange={e=>setF('title',e.target.value)} required placeholder="Announcement title…"/></div>
                <div className="form-group"><label className="form-label">Content *</label><textarea className="form-input" rows={4} value={form.content} onChange={e=>setF('content',e.target.value)} required placeholder="Write your announcement…" style={{ resize:'vertical' }}/></div>
                <div className="fc-modal__grid">
                  <div className="form-group"><label className="form-label">Audience</label>
                    <select className="form-input" value={form.audience} onChange={e=>setF('audience',e.target.value)}>
                      {AUDIENCE.map(a=><option key={a} value={a}>{a.charAt(0).toUpperCase()+a.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Priority</label>
                    <select className="form-input" value={form.priority} onChange={e=>setF('priority',e.target.value)}>
                      {PRIORITIES.map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Expires (optional)</label><input className="form-input" type="date" value={form.expiresAt} onChange={e=>setF('expiresAt',e.target.value)}/></div>
                  <div className="form-group">
                    <label style={{ display:'flex', alignItems:'center', gap:'0.5rem', cursor:'pointer', marginTop:'1.6rem' }}>
                      <input type="checkbox" checked={form.isActive} onChange={e=>setF('isActive',e.target.checked)} style={{ width:16, height:16 }}/>
                      <span className="form-label" style={{ marginBottom:0 }}>Published</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="fc-modal__footer">
                <button type="button" className="fc-modal-btn fc-modal-btn--cancel" onClick={closeModal}>Cancel</button>
                <button type="submit" className="fc-modal-btn fc-modal-btn--submit" disabled={saving||validate()}>{saving?'Posting…':editTarget?'Save Changes':'Post'}</button>
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
            <h3 className="fc-confirm__title">Delete Announcement?</h3>
            <p className="fc-confirm__sub">Permanently delete "<strong>{delTarget.title}</strong>"?</p>
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

export default FacultyAnnouncements;
