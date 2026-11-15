import React, { useEffect, useState, useCallback } from 'react';
import api from '../../../services/api';
import './shared.css';

const EMPTY_FORM = { title: '', content: '', audience: 'all', priority: 'normal', isActive: true, expiresAt: '' };

const PRIORITY_META = {
  low:    { label: 'Low',    bg: '#f0fdf4', color: '#16a34a' },
  normal: { label: 'Normal', bg: '#eff6ff', color: '#2563eb' },
  high:   { label: 'High',   bg: '#fff7ed', color: '#ea580c' },
  urgent: { label: 'Urgent', bg: '#fef2f2', color: '#dc2626' },
};

const timeAgo = (d) => {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const Toast = ({ msg }) =>
  msg.text ? <div className={`mgmt-toast mgmt-toast--${msg.type}`} role="alert">{msg.type === 'success' ? '✓' : '✗'} {msg.text}</div> : null;

const AdminAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [pagination,    setPagination]    = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading,       setLoading]       = useState(true);
  const [toast,         setToast]         = useState({ type: '', text: '' });

  const [search,          setSearch]          = useState('');
  const [audienceFilter,  setAudienceFilter]  = useState('');
  const [priorityFilter,  setPriorityFilter]  = useState('');
  const [page,            setPage]            = useState(1);

  const [modalOpen,    setModalOpen]    = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [formErrors,   setFormErrors]   = useState({});
  const [saving,       setSaving]       = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  const fetchAnn = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 8, search,
        ...(audienceFilter && { audience: audienceFilter }),
        ...(priorityFilter && { priority: priorityFilter }),
      });
      const { data } = await api.get(`/admin/announcements?${params}`);
      setAnnouncements(data.announcements);
      setPagination(data.pagination);
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  }, [page, search, audienceFilter, priorityFilter]);

  useEffect(() => { fetchAnn(); }, [fetchAnn]);
  useEffect(() => { document.getElementById('page-title').textContent = 'Announcements'; }, []);
  useEffect(() => { setPage(1); }, [search, audienceFilter, priorityFilter]);

  const showToast = (type, text) => { setToast({ type, text }); setTimeout(() => setToast({ type: '', text: '' }), 3500); };

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setFormErrors({}); setModalOpen(true); };
  const openEdit   = (a) => { setEditTarget(a); setForm({ title: a.title, content: a.content, audience: a.audience, priority: a.priority, isActive: a.isActive, expiresAt: a.expiresAt ? a.expiresAt.slice(0, 10) : '' }); setFormErrors({}); setModalOpen(true); };
  const closeModal = ()  => { setModalOpen(false); setEditTarget(null); setFormErrors({}); };
  const setF = (k, v)    => { setForm(p => ({ ...p, [k]: v })); setFormErrors(p => ({ ...p, [k]: '' })); };

  const validateForm = () => {
    const e = {};
    if (!form.title.trim())   e.title   = 'Title is required.';
    if (!form.content.trim()) e.content = 'Content is required.';
    return e;
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setSaving(true);
    const payload = { ...form, expiresAt: form.expiresAt || null };
    try {
      if (editTarget) await api.put(`/admin/announcements/${editTarget._id}`, payload);
      else            await api.post('/admin/announcements', payload);
      showToast('success', editTarget ? 'Announcement updated.' : 'Announcement posted.');
      closeModal(); fetchAnn();
    } catch (err) { showToast('error', err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/announcements/${deleteTarget._id}`);
      showToast('success', 'Announcement deleted.');
      setDeleteTarget(null); fetchAnn();
    } catch (err) { showToast('error', err.message); }
    finally { setDeleting(false); }
  };

  const toggleActive = async (ann) => {
    try {
      await api.put(`/admin/announcements/${ann._id}`, { ...ann, isActive: !ann.isActive });
      showToast('success', `Announcement ${ann.isActive ? 'deactivated' : 'activated'}.`);
      fetchAnn();
    } catch (err) { showToast('error', err.message); }
  };

  const pages = Array.from({ length: pagination.totalPages }, (_, i) => i + 1);

  return (
    <div className="mgmt-page">
      <Toast msg={toast} />

      <div className="mgmt-header">
        <div className="mgmt-header__left">
          <h1 className="mgmt-header__title">Announcements</h1>
          <p className="mgmt-header__sub">{pagination.total} total announcements</p>
        </div>
        <button className="mgmt-toolbar__add" onClick={openCreate}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Announcement
        </button>
      </div>

      <div className="mgmt-toolbar">
        <div className="mgmt-toolbar__search">
          <svg className="mgmt-toolbar__search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search announcements…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="mgmt-toolbar__select" value={audienceFilter} onChange={e => setAudienceFilter(e.target.value)}>
          <option value="">All Audiences</option>
          {['all','students','faculty','admin'].map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
        </select>
        <select className="mgmt-toolbar__select" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
          <option value="">All Priorities</option>
          {['low','normal','high','urgent'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
      </div>

      {/* Announcement cards */}
      {loading ? (
        <div className="dash-loading"><div className="dash-loading__spinner" /><span>Loading…</span></div>
      ) : announcements.length === 0 ? (
        <div className="mgmt-table-card"><div className="mgmt-empty"><span className="mgmt-empty__icon">📢</span><span className="mgmt-empty__title">No announcements</span><span className="mgmt-empty__sub">Post an announcement to reach your campus community.</span></div></div>
      ) : (
        <div className="ann-cards">
          {announcements.map(a => {
            const pm = PRIORITY_META[a.priority] || PRIORITY_META.normal;
            return (
              <div key={a._id} className={`ann-card ${!a.isActive ? 'ann-card--inactive' : ''}`}>
                <div className="ann-card__header">
                  <div className="ann-card__badges">
                    <span className="priority-badge priority-badge--${a.priority}" style={{ background: pm.bg, color: pm.color }}>
                      {pm.label}
                    </span>
                    <span className="ann-card__audience">For: {a.audience}</span>
                  </div>
                  <div className="tbl-actions">
                    <button className="tbl-btn" onClick={() => toggleActive(a)} title={a.isActive ? 'Deactivate' : 'Activate'} aria-label={a.isActive ? 'Deactivate' : 'Activate'}>
                      {a.isActive
                        ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22"/></svg>
                        : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                    <button className="tbl-btn" onClick={() => openEdit(a)} title="Edit" aria-label={`Edit ${a.title}`}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button className="tbl-btn tbl-btn--danger" onClick={() => setDeleteTarget(a)} title="Delete" aria-label={`Delete ${a.title}`}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                  </div>
                </div>
                <h3 className="ann-card__title">{a.title}</h3>
                <p className="ann-card__content">{a.content}</p>
                <div className="ann-card__footer">
                  <span className="ann-card__meta">By {a.authorName} · {timeAgo(a.createdAt)}</span>
                  {!a.isActive && <span className="ann-card__inactive-badge">Inactive</span>}
                  {a.expiresAt && <span className="ann-card__meta">Expires: {new Date(a.expiresAt).toLocaleDateString()}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="mgmt-pagination" style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '0.75rem 1.25rem' }}>
          <span className="mgmt-pagination__info">{pagination.total} total</span>
          <div className="mgmt-pagination__btns">
            <button className="mgmt-pagination__btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
            {pages.map(p => <button key={p} className={`mgmt-pagination__btn ${p === page ? 'mgmt-pagination__btn--active' : ''}`} onClick={() => setPage(p)}>{p}</button>)}
            <button className="mgmt-pagination__btn" onClick={() => setPage(p => p + 1)} disabled={page === pagination.totalPages}>›</button>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="ann-modal-title">
            <div className="modal__header">
              <h2 className="modal__title" id="ann-modal-title">{editTarget ? 'Edit Announcement' : 'New Announcement'}</h2>
              <button className="modal__close" onClick={closeModal} aria-label="Close">×</button>
            </div>
            <form onSubmit={handleSave} noValidate>
              <div className="modal__body">
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input className={`form-input ${formErrors.title ? 'form-input--error' : ''}`} value={form.title} onChange={e => setF('title', e.target.value)} placeholder="Announcement title…" />
                  {formErrors.title && <span className="form-error">{formErrors.title}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Content *</label>
                  <textarea className={`form-input ${formErrors.content ? 'form-input--error' : ''}`} rows={4} value={form.content} onChange={e => setF('content', e.target.value)} placeholder="Announcement body…" style={{ resize: 'vertical' }} />
                  {formErrors.content && <span className="form-error">{formErrors.content}</span>}
                </div>
                <div className="modal__grid">
                  <div className="form-group">
                    <label className="form-label">Audience</label>
                    <select className="form-input" value={form.audience} onChange={e => setF('audience', e.target.value)}>
                      {['all','students','faculty','admin'].map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="form-input" value={form.priority} onChange={e => setF('priority', e.target.value)}>
                      {['low','normal','high','urgent'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expires On (optional)</label>
                    <input className="form-input" type="date" value={form.expiresAt} onChange={e => setF('expiresAt', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '1.6rem' }}>
                      <input type="checkbox" checked={form.isActive} onChange={e => setF('isActive', e.target.checked)} style={{ width: 16, height: 16 }} />
                      <span className="form-label" style={{ marginBottom: 0 }}>Published</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal__footer">
                <button type="button" className="modal__btn modal__btn--cancel" onClick={closeModal}>Cancel</button>
                <button type="submit" className="modal__btn modal__btn--submit" disabled={saving}>{saving ? 'Posting…' : editTarget ? 'Save Changes' : 'Post Announcement'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-backdrop">
          <div className="confirm-dialog" role="alertdialog" aria-modal="true">
            <div className="confirm-dialog__icon">🗑️</div>
            <h3 className="confirm-dialog__title">Delete Announcement?</h3>
            <p className="confirm-dialog__sub">Permanently delete "<strong>{deleteTarget.title}</strong>"? This cannot be undone.</p>
            <div className="confirm-dialog__actions">
              <button className="modal__btn modal__btn--cancel" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</button>
              <button className="modal__btn modal__btn--danger" onClick={handleDelete} disabled={deleting}>{deleting ? 'Deleting…' : 'Yes, Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAnnouncements;
