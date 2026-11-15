import React, { useEffect, useState, useCallback } from 'react';
import api from '../../../services/api';
import './shared.css';

const EMPTY_FORM = { name: '', code: '', head: '', description: '', isActive: true };

const Toast = ({ msg }) =>
  msg.text ? <div className={`mgmt-toast mgmt-toast--${msg.type}`} role="alert">{msg.type === 'success' ? '✓' : '✗'} {msg.text}</div> : null;

const AdminDepartments = () => {
  const [departments, setDepartments] = useState([]);
  const [pagination,  setPagination]  = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading,     setLoading]     = useState(true);
  const [toast,       setToast]       = useState({ type: '', text: '' });
  const [search,      setSearch]      = useState('');
  const [page,        setPage]        = useState(1);

  const [modalOpen,    setModalOpen]    = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [formErrors,   setFormErrors]   = useState({});
  const [saving,       setSaving]       = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  const fetchDepts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/departments?search=${search}&page=${page}&limit=10`);
      setDepartments(data.departments);
      setPagination(data.pagination);
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { fetchDepts(); }, [fetchDepts]);
  useEffect(() => { document.getElementById('page-title').textContent = 'Departments'; }, []);
  useEffect(() => { setPage(1); }, [search]);

  const showToast = (type, text) => { setToast({ type, text }); setTimeout(() => setToast({ type: '', text: '' }), 3500); };

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setFormErrors({}); setModalOpen(true); };
  const openEdit   = (d) => { setEditTarget(d); setForm({ name: d.name, code: d.code, head: d.head || '', description: d.description || '', isActive: d.isActive }); setFormErrors({}); setModalOpen(true); };
  const closeModal = ()  => { setModalOpen(false); setEditTarget(null); setFormErrors({}); };
  const setF = (k, v)    => { setForm(p => ({ ...p, [k]: v })); setFormErrors(p => ({ ...p, [k]: '' })); };

  const validateForm = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Department name is required.';
    if (!form.code.trim()) e.code = 'Department code is required.';
    else if (form.code.trim().length > 8) e.code = 'Code must be 8 characters or less.';
    return e;
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setSaving(true);
    try {
      if (editTarget) await api.put(`/admin/departments/${editTarget._id}`, form);
      else            await api.post('/admin/departments', form);
      showToast('success', editTarget ? 'Department updated.' : 'Department created.');
      closeModal(); fetchDepts();
    } catch (err) { showToast('error', err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/departments/${deleteTarget._id}`);
      showToast('success', `${deleteTarget.name} deleted.`);
      setDeleteTarget(null); fetchDepts();
    } catch (err) { showToast('error', err.message); }
    finally { setDeleting(false); }
  };

  const pages = Array.from({ length: pagination.totalPages }, (_, i) => i + 1);

  return (
    <div className="mgmt-page">
      <Toast msg={toast} />

      <div className="mgmt-header">
        <div className="mgmt-header__left">
          <h1 className="mgmt-header__title">Departments</h1>
          <p className="mgmt-header__sub">{pagination.total} departments</p>
        </div>
        <button className="mgmt-toolbar__add" onClick={openCreate}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Department
        </button>
      </div>

      <div className="mgmt-toolbar">
        <div className="mgmt-toolbar__search">
          <svg className="mgmt-toolbar__search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search by name or code…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Department cards grid */}
      {loading ? (
        <div className="dash-loading"><div className="dash-loading__spinner" /><span>Loading…</span></div>
      ) : departments.length === 0 ? (
        <div className="mgmt-table-card"><div className="mgmt-empty"><span className="mgmt-empty__icon">🏛️</span><span className="mgmt-empty__title">No departments found</span><span className="mgmt-empty__sub">Create your first department to get started.</span></div></div>
      ) : (
        <div className="dept-grid">
          {departments.map(d => (
            <div key={d._id} className={`dept-card ${!d.isActive ? 'dept-card--inactive' : ''}`}>
              <div className="dept-card__header">
                <div className="dept-card__icon" aria-hidden="true">🏛️</div>
                <div className="dept-card__badge">{d.code}</div>
              </div>
              <h3 className="dept-card__name">{d.name}</h3>
              {d.head && <p className="dept-card__head">Head: {d.head}</p>}
              {d.description && <p className="dept-card__desc">{d.description}</p>}
              <div className="dept-card__stats">
                <div className="dept-card__stat">
                  <span className="dept-card__stat-val">{d.studentCount ?? 0}</span>
                  <span className="dept-card__stat-label">Students</span>
                </div>
                <div className="dept-card__stat">
                  <span className="dept-card__stat-val">{d.facultyCount ?? 0}</span>
                  <span className="dept-card__stat-label">Faculty</span>
                </div>
                <div className="dept-card__stat">
                  <span className={`status-badge status-badge--${d.isActive ? 'active' : 'inactive'}`}>{d.isActive ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
              <div className="dept-card__actions">
                <button className="tbl-btn" onClick={() => openEdit(d)} title="Edit" aria-label={`Edit ${d.name}`}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button className="tbl-btn tbl-btn--danger" onClick={() => setDeleteTarget(d)} title="Delete" aria-label={`Delete ${d.name}`}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
              </div>
            </div>
          ))}
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
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="dept-modal-title">
            <div className="modal__header">
              <h2 className="modal__title" id="dept-modal-title">{editTarget ? 'Edit Department' : 'New Department'}</h2>
              <button className="modal__close" onClick={closeModal} aria-label="Close">×</button>
            </div>
            <form onSubmit={handleSave} noValidate>
              <div className="modal__body">
                <div className="form-group">
                  <label className="form-label">Department Name *</label>
                  <input className={`form-input ${formErrors.name ? 'form-input--error' : ''}`} value={form.name} onChange={e => setF('name', e.target.value)} placeholder="Computer Science" />
                  {formErrors.name && <span className="form-error">{formErrors.name}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Code *</label>
                  <input className={`form-input ${formErrors.code ? 'form-input--error' : ''}`} value={form.code} onChange={e => setF('code', e.target.value.toUpperCase())} placeholder="CS" maxLength={8} />
                  {formErrors.code && <span className="form-error">{formErrors.code}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Department Head</label>
                  <input className="form-input" value={form.head} onChange={e => setF('head', e.target.value)} placeholder="Prof. Jane Smith" />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows={3} value={form.description} onChange={e => setF('description', e.target.value)} placeholder="Brief description of the department…" style={{ resize: 'vertical' }} />
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.isActive} onChange={e => setF('isActive', e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                    <span className="form-label" style={{ marginBottom: 0 }}>Active</span>
                  </label>
                </div>
              </div>
              <div className="modal__footer">
                <button type="button" className="modal__btn modal__btn--cancel" onClick={closeModal}>Cancel</button>
                <button type="submit" className="modal__btn modal__btn--submit" disabled={saving}>{saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Create Department'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-backdrop">
          <div className="confirm-dialog" role="alertdialog" aria-modal="true">
            <div className="confirm-dialog__icon">🗑️</div>
            <h3 className="confirm-dialog__title">Delete Department?</h3>
            <p className="confirm-dialog__sub">Permanently delete <strong>{deleteTarget.name}</strong>? Departments with assigned students or faculty cannot be deleted.</p>
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

export default AdminDepartments;
