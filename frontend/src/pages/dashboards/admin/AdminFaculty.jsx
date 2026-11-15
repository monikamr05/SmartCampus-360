import React, { useEffect, useState, useCallback } from 'react';
import api from '../../../services/api';
import './shared.css';

const EMPTY_FORM = {
  facultyId: '', name: '', email: '', phone: '',
  department: '', designation: 'Lecturer', qualification: '',
  experience: 0, specialization: '', status: 'active', joinedYear: new Date().getFullYear(),
};

const initials = (name = '') =>
  name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';

const Toast = ({ msg }) =>
  msg.text ? <div className={`mgmt-toast mgmt-toast--${msg.type}`} role="alert">{msg.type === 'success' ? '✓' : '✗'} {msg.text}</div> : null;

const AdminFaculty = () => {
  const [faculty,     setFaculty]     = useState([]);
  const [departments, setDepartments] = useState([]);
  const [pagination,  setPagination]  = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading,     setLoading]     = useState(true);
  const [toast,       setToast]       = useState({ type: '', text: '' });

  const [search,       setSearch]       = useState('');
  const [deptFilter,   setDeptFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy,       setSortBy]       = useState('createdAt');
  const [sortOrder,    setSortOrder]    = useState('desc');
  const [page,         setPage]         = useState(1);

  const [modalOpen,  setModalOpen]  = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving,     setSaving]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  const fetchFaculty = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page, limit: 10, search, sortBy, sortOrder,
        ...(deptFilter   && { department: deptFilter }),
        ...(statusFilter && { status:     statusFilter }),
      });
      const { data } = await api.get(`/admin/faculty?${params}`);
      setFaculty(data.faculty);
      setPagination(data.pagination);
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  }, [page, search, deptFilter, statusFilter, sortBy, sortOrder]);

  useEffect(() => { fetchFaculty(); }, [fetchFaculty]);
  useEffect(() => {
    document.getElementById('page-title').textContent = 'Faculty';
    api.get('/admin/departments/all').then(r => setDepartments(r.data)).catch(() => {});
  }, []);
  useEffect(() => { setPage(1); }, [search, deptFilter, statusFilter]);

  const showToast = (type, text) => { setToast({ type, text }); setTimeout(() => setToast({ type: '', text: '' }), 3500); };

  const handleSort = (col) => {
    if (sortBy === col) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortOrder('asc'); }
  };
  const SortIcon = ({ col }) => sortBy !== col ? ' ⇅' : sortOrder === 'asc' ? ' ↑' : ' ↓';

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setFormErrors({}); setModalOpen(true); };
  const openEdit   = (f) => { setEditTarget(f); setForm({ ...f, department: f.department?._id || '' }); setFormErrors({}); setModalOpen(true); };
  const closeModal = ()  => { setModalOpen(false); setEditTarget(null); setFormErrors({}); };
  const setF = (k, v)    => { setForm(p => ({ ...p, [k]: v })); setFormErrors(p => ({ ...p, [k]: '' })); };

  const validateForm = () => {
    const e = {};
    if (!form.facultyId.trim()) e.facultyId = 'Faculty ID is required.';
    if (!form.name.trim())      e.name      = 'Name is required.';
    if (!form.email.trim())     e.email     = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email.';
    return e;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setSaving(true);
    try {
      if (editTarget) await api.put(`/admin/faculty/${editTarget._id}`, form);
      else            await api.post('/admin/faculty', form);
      showToast('success', editTarget ? 'Faculty member updated.' : 'Faculty member added.');
      closeModal(); fetchFaculty();
    } catch (err) { showToast('error', err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/faculty/${deleteTarget._id}`);
      showToast('success', `${deleteTarget.name} removed.`);
      setDeleteTarget(null); fetchFaculty();
    } catch (err) { showToast('error', err.message); }
    finally { setDeleting(false); }
  };

  const pages = Array.from({ length: pagination.totalPages }, (_, i) => i + 1);

  const DESIGNATIONS = ['Professor','Associate Professor','Assistant Professor','Lecturer','Senior Lecturer','Visiting Faculty'];

  return (
    <div className="mgmt-page">
      <Toast msg={toast} />

      <div className="mgmt-header">
        <div className="mgmt-header__left">
          <h1 className="mgmt-header__title">Faculty</h1>
          <p className="mgmt-header__sub">{pagination.total} total faculty members</p>
        </div>
        <button className="mgmt-toolbar__add" onClick={openCreate}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Faculty
        </button>
      </div>

      <div className="mgmt-toolbar">
        <div className="mgmt-toolbar__search">
          <svg className="mgmt-toolbar__search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search by name, ID or email…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="mgmt-toolbar__select" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
        </select>
        <select className="mgmt-toolbar__select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {['active','inactive','on-leave'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="mgmt-table-card">
        <div className="mgmt-table-wrap">
          <table className="mgmt-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('name')} className={sortBy === 'name' ? 'sorted' : ''}>Faculty Member<SortIcon col="name" /></th>
                <th onClick={() => handleSort('facultyId')} className={sortBy === 'facultyId' ? 'sorted' : ''}>ID<SortIcon col="facultyId" /></th>
                <th>Department</th>
                <th onClick={() => handleSort('designation')} className={sortBy === 'designation' ? 'sorted' : ''}>Designation<SortIcon col="designation" /></th>
                <th onClick={() => handleSort('experience')} className={sortBy === 'experience' ? 'sorted' : ''}>Exp.<SortIcon col="experience" /></th>
                <th onClick={() => handleSort('status')} className={sortBy === 'status' ? 'sorted' : ''}>Status<SortIcon col="status" /></th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>Loading…</td></tr>
              ) : faculty.length === 0 ? (
                <tr><td colSpan={7}><div className="mgmt-empty"><span className="mgmt-empty__icon">🧑‍🏫</span><span className="mgmt-empty__title">No faculty found</span><span className="mgmt-empty__sub">Adjust filters or add new faculty.</span></div></td></tr>
              ) : faculty.map(f => (
                <tr key={f._id}>
                  <td>
                    <div className="tbl-avatar">
                      <div className="tbl-avatar__img">{initials(f.name)}</div>
                      <div><div className="tbl-avatar__name">{f.name}</div><div className="tbl-avatar__sub">{f.email}</div></div>
                    </div>
                  </td>
                  <td><code style={{ fontSize: '0.78rem', background: 'var(--gray-100)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>{f.facultyId}</code></td>
                  <td>{f.department?.name || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td><span style={{ fontSize: '0.82rem' }}>{f.designation}</span></td>
                  <td><span style={{ fontWeight: 600 }}>{f.experience} yr{f.experience !== 1 ? 's' : ''}</span></td>
                  <td><span className={`status-badge status-badge--${f.status.replace('-','-')}`}>{f.status}</span></td>
                  <td>
                    <div className="tbl-actions">
                      <button className="tbl-btn" onClick={() => openEdit(f)} title="Edit" aria-label={`Edit ${f.name}`}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="tbl-btn tbl-btn--danger" onClick={() => setDeleteTarget(f)} title="Delete" aria-label={`Delete ${f.name}`}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination.totalPages > 1 && (
          <div className="mgmt-pagination">
            <span className="mgmt-pagination__info">Showing {((pagination.page - 1) * 10) + 1}–{Math.min(pagination.page * 10, pagination.total)} of {pagination.total}</span>
            <div className="mgmt-pagination__btns">
              <button className="mgmt-pagination__btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
              {pages.slice(Math.max(0, page - 3), Math.min(pages.length, page + 2)).map(p => (
                <button key={p} className={`mgmt-pagination__btn ${p === page ? 'mgmt-pagination__btn--active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className="mgmt-pagination__btn" onClick={() => setPage(p => p + 1)} disabled={page === pagination.totalPages}>›</button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal modal--wide" role="dialog" aria-modal="true" aria-labelledby="faculty-modal-title">
            <div className="modal__header">
              <h2 className="modal__title" id="faculty-modal-title">{editTarget ? 'Edit Faculty' : 'Add Faculty Member'}</h2>
              <button className="modal__close" onClick={closeModal} aria-label="Close">×</button>
            </div>
            <form onSubmit={handleSave} noValidate>
              <div className="modal__body">
                <div className="modal__grid">
                  <div className="form-group">
                    <label className="form-label">Faculty ID *</label>
                    <input className={`form-input ${formErrors.facultyId ? 'form-input--error' : ''}`} value={form.facultyId} onChange={e => setF('facultyId', e.target.value)} placeholder="FAC2024001" />
                    {formErrors.facultyId && <span className="form-error">{formErrors.facultyId}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input className={`form-input ${formErrors.name ? 'form-input--error' : ''}`} value={form.name} onChange={e => setF('name', e.target.value)} placeholder="Dr. John Doe" />
                    {formErrors.name && <span className="form-error">{formErrors.name}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input className={`form-input ${formErrors.email ? 'form-input--error' : ''}`} type="email" value={form.email} onChange={e => setF('email', e.target.value)} placeholder="john@uni.edu" />
                    {formErrors.email && <span className="form-error">{formErrors.email}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" value={form.phone} onChange={e => setF('phone', e.target.value)} placeholder="+1 555 0100" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <select className="form-input" value={form.department} onChange={e => setF('department', e.target.value)}>
                      <option value="">— Select —</option>
                      {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Designation</label>
                    <select className="form-input" value={form.designation} onChange={e => setF('designation', e.target.value)}>
                      {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Qualification</label>
                    <input className="form-input" value={form.qualification} onChange={e => setF('qualification', e.target.value)} placeholder="Ph.D. Computer Science" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Experience (years)</label>
                    <input className="form-input" type="number" min="0" value={form.experience} onChange={e => setF('experience', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Specialization</label>
                    <input className="form-input" value={form.specialization} onChange={e => setF('specialization', e.target.value)} placeholder="Machine Learning" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-input" value={form.status} onChange={e => setF('status', e.target.value)}>
                      {['active','inactive','on-leave'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal__footer">
                <button type="button" className="modal__btn modal__btn--cancel" onClick={closeModal}>Cancel</button>
                <button type="submit" className="modal__btn modal__btn--submit" disabled={saving}>{saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Add Faculty'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="modal-backdrop">
          <div className="confirm-dialog" role="alertdialog" aria-modal="true">
            <div className="confirm-dialog__icon">🗑️</div>
            <h3 className="confirm-dialog__title">Remove Faculty Member?</h3>
            <p className="confirm-dialog__sub">This will permanently remove <strong>{deleteTarget.name}</strong> ({deleteTarget.facultyId}). This cannot be undone.</p>
            <div className="confirm-dialog__actions">
              <button className="modal__btn modal__btn--cancel" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</button>
              <button className="modal__btn modal__btn--danger" onClick={handleDelete} disabled={deleting}>{deleting ? 'Removing…' : 'Yes, Remove'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFaculty;
