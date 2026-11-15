import React, { useEffect, useState, useCallback } from 'react';
import api from '../../../services/api';
import './shared.css';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const EMPTY_FORM = {
  studentId: '', name: '', email: '', phone: '',
  department: '', enrolledYear: new Date().getFullYear(),
  semester: 1, gpa: 0, attendancePct: 0, status: 'active', address: '',
};

const initials = (name = '') =>
  name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';

const Toast = ({ msg }) =>
  msg.text ? (
    <div className={`mgmt-toast mgmt-toast--${msg.type}`} role="alert">
      {msg.type === 'success' ? '✓' : '✗'} {msg.text}
    </div>
  ) : null;

/* ─── Component ───────────────────────────────────────────────────────────── */
const AdminStudents = () => {
  const [students,     setStudents]     = useState([]);
  const [departments,  setDepartments]  = useState([]);
  const [pagination,   setPagination]   = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading,      setLoading]      = useState(true);
  const [toast,        setToast]        = useState({ type: '', text: '' });

  // Filters / sort
  const [search,     setSearch]     = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy,     setSortBy]     = useState('createdAt');
  const [sortOrder,  setSortOrder]  = useState('desc');
  const [page,       setPage]       = useState(1);

  // Modal state
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editTarget,  setEditTarget]  = useState(null); // null = create
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [formErrors,  setFormErrors]  = useState({});
  const [saving,      setSaving]      = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  /* ── Data fetching ── */
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page, limit: 10, search, sortBy, sortOrder,
        ...(deptFilter   && { department: deptFilter }),
        ...(statusFilter && { status:     statusFilter }),
      });
      const { data } = await api.get(`/admin/students?${params}`);
      setStudents(data.students);
      setPagination(data.pagination);
    } catch (e) {
      showToast('error', e.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, deptFilter, statusFilter, sortBy, sortOrder]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  useEffect(() => {
    document.getElementById('page-title').textContent = 'Students';
    api.get('/admin/departments/all')
      .then(r => setDepartments(r.data))
      .catch(() => {});
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, deptFilter, statusFilter]);

  /* ── Toast ── */
  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast({ type: '', text: '' }), 3500);
  };

  /* ── Sorting ── */
  const handleSort = (col) => {
    if (sortBy === col) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortOrder('asc'); }
  };
  const SortIcon = ({ col }) => sortBy !== col ? ' ⇅' : sortOrder === 'asc' ? ' ↑' : ' ↓';

  /* ── Modal ── */
  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setFormErrors({}); setModalOpen(true); };
  const openEdit   = (s)  => { setEditTarget(s);  setForm({ ...s, department: s.department?._id || '' }); setFormErrors({}); setModalOpen(true); };
  const closeModal = ()   => { setModalOpen(false); setEditTarget(null); setFormErrors({}); };

  const setF = (k, v) => { setForm(p => ({ ...p, [k]: v })); setFormErrors(p => ({ ...p, [k]: '' })); };

  const validateForm = () => {
    const e = {};
    if (!form.studentId.trim()) e.studentId = 'Student ID is required.';
    if (!form.name.trim())      e.name      = 'Name is required.';
    if (!form.email.trim())     e.email     = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email.';
    if (!form.enrolledYear)     e.enrolledYear = 'Enrolled year is required.';
    return e;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setSaving(true);
    try {
      if (editTarget) {
        await api.put(`/admin/students/${editTarget._id}`, form);
        showToast('success', 'Student updated successfully.');
      } else {
        await api.post('/admin/students', form);
        showToast('success', 'Student added successfully.');
      }
      closeModal();
      fetchStudents();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/students/${deleteTarget._id}`);
      showToast('success', `${deleteTarget.name} removed.`);
      setDeleteTarget(null);
      fetchStudents();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setDeleting(false);
    }
  };

  /* ── Pagination ── */
  const pages = Array.from({ length: pagination.totalPages }, (_, i) => i + 1);

  return (
    <div className="mgmt-page">
      <Toast msg={toast} />

      {/* Header */}
      <div className="mgmt-header">
        <div className="mgmt-header__left">
          <h1 className="mgmt-header__title">Students</h1>
          <p className="mgmt-header__sub">{pagination.total} total students</p>
        </div>
        <button className="mgmt-toolbar__add" onClick={openCreate}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Student
        </button>
      </div>

      {/* Toolbar */}
      <div className="mgmt-toolbar">
        <div className="mgmt-toolbar__search">
          <svg className="mgmt-toolbar__search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text" placeholder="Search by name, ID or email…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="mgmt-toolbar__select" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
        </select>
        <select className="mgmt-toolbar__select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {['active','inactive','graduated','suspended'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="mgmt-table-card">
        <div className="mgmt-table-wrap">
          <table className="mgmt-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('name')} className={sortBy === 'name' ? 'sorted' : ''}>Student<SortIcon col="name" /></th>
                <th onClick={() => handleSort('studentId')} className={sortBy === 'studentId' ? 'sorted' : ''}>ID<SortIcon col="studentId" /></th>
                <th>Department</th>
                <th onClick={() => handleSort('semester')} className={sortBy === 'semester' ? 'sorted' : ''}>Sem<SortIcon col="semester" /></th>
                <th onClick={() => handleSort('gpa')} className={sortBy === 'gpa' ? 'sorted' : ''}>GPA<SortIcon col="gpa" /></th>
                <th onClick={() => handleSort('attendancePct')} className={sortBy === 'attendancePct' ? 'sorted' : ''}>Att%<SortIcon col="attendancePct" /></th>
                <th onClick={() => handleSort('status')} className={sortBy === 'status' ? 'sorted' : ''}>Status<SortIcon col="status" /></th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>Loading…</td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={8}>
                  <div className="mgmt-empty">
                    <span className="mgmt-empty__icon">👨‍🎓</span>
                    <span className="mgmt-empty__title">No students found</span>
                    <span className="mgmt-empty__sub">Try adjusting your search or filters.</span>
                  </div>
                </td></tr>
              ) : students.map(s => (
                <tr key={s._id}>
                  <td>
                    <div className="tbl-avatar">
                      <div className="tbl-avatar__img">{initials(s.name)}</div>
                      <div>
                        <div className="tbl-avatar__name">{s.name}</div>
                        <div className="tbl-avatar__sub">{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><code style={{ fontSize: '0.78rem', background: 'var(--gray-100)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>{s.studentId}</code></td>
                  <td>{s.department?.name || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td style={{ textAlign: 'center' }}>{s.semester}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: s.gpa >= 3.5 ? '#16a34a' : s.gpa >= 2.5 ? '#2563eb' : '#dc2626' }}>
                      {Number(s.gpa).toFixed(2)}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div style={{
                        height: 6, flex: 1, background: 'var(--gray-200)', borderRadius: 3, overflow: 'hidden',
                        maxWidth: 60,
                      }}>
                        <div style={{
                          height: '100%', width: `${s.attendancePct}%`, borderRadius: 3,
                          background: s.attendancePct >= 85 ? '#22c55e' : s.attendancePct >= 75 ? '#f59e0b' : '#ef4444',
                        }} />
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{s.attendancePct}%</span>
                    </div>
                  </td>
                  <td><span className={`status-badge status-badge--${s.status}`}>{s.status}</span></td>
                  <td>
                    <div className="tbl-actions">
                      <button className="tbl-btn" onClick={() => openEdit(s)} title="Edit" aria-label={`Edit ${s.name}`}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="tbl-btn tbl-btn--danger" onClick={() => setDeleteTarget(s)} title="Delete" aria-label={`Delete ${s.name}`}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mgmt-pagination">
            <span className="mgmt-pagination__info">
              Showing {((pagination.page - 1) * 10) + 1}–{Math.min(pagination.page * 10, pagination.total)} of {pagination.total}
            </span>
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

      {/* ── Add / Edit Modal ── */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal modal--wide" role="dialog" aria-modal="true" aria-labelledby="student-modal-title">
            <div className="modal__header">
              <h2 className="modal__title" id="student-modal-title">
                {editTarget ? 'Edit Student' : 'Add New Student'}
              </h2>
              <button className="modal__close" onClick={closeModal} aria-label="Close modal">×</button>
            </div>
            <form onSubmit={handleSave} noValidate>
              <div className="modal__body">
                <div className="modal__grid">
                  {/* Student ID */}
                  <div className="form-group">
                    <label className="form-label">Student ID *</label>
                    <input className={`form-input ${formErrors.studentId ? 'form-input--error' : ''}`}
                      value={form.studentId} onChange={e => setF('studentId', e.target.value)} placeholder="e.g. STU2024001" />
                    {formErrors.studentId && <span className="form-error">{formErrors.studentId}</span>}
                  </div>
                  {/* Name */}
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input className={`form-input ${formErrors.name ? 'form-input--error' : ''}`}
                      value={form.name} onChange={e => setF('name', e.target.value)} placeholder="Jane Smith" />
                    {formErrors.name && <span className="form-error">{formErrors.name}</span>}
                  </div>
                  {/* Email */}
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input className={`form-input ${formErrors.email ? 'form-input--error' : ''}`}
                      type="email" value={form.email} onChange={e => setF('email', e.target.value)} placeholder="jane@uni.edu" />
                    {formErrors.email && <span className="form-error">{formErrors.email}</span>}
                  </div>
                  {/* Phone */}
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" value={form.phone} onChange={e => setF('phone', e.target.value)} placeholder="+1 555 0100" />
                  </div>
                  {/* Department */}
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <select className="form-input" value={form.department} onChange={e => setF('department', e.target.value)}>
                      <option value="">— Select Department —</option>
                      {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </select>
                  </div>
                  {/* Enrolled year */}
                  <div className="form-group">
                    <label className="form-label">Enrolled Year *</label>
                    <input className={`form-input ${formErrors.enrolledYear ? 'form-input--error' : ''}`}
                      type="number" min="2000" max="2099" value={form.enrolledYear}
                      onChange={e => setF('enrolledYear', e.target.value)} />
                    {formErrors.enrolledYear && <span className="form-error">{formErrors.enrolledYear}</span>}
                  </div>
                  {/* Semester */}
                  <div className="form-group">
                    <label className="form-label">Semester</label>
                    <select className="form-input" value={form.semester} onChange={e => setF('semester', Number(e.target.value))}>
                      {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                    </select>
                  </div>
                  {/* Status */}
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-input" value={form.status} onChange={e => setF('status', e.target.value)}>
                      {['active','inactive','graduated','suspended'].map(s => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  {/* GPA */}
                  <div className="form-group">
                    <label className="form-label">GPA (0 – 4.0)</label>
                    <input className="form-input" type="number" min="0" max="4" step="0.01"
                      value={form.gpa} onChange={e => setF('gpa', e.target.value)} />
                  </div>
                  {/* Attendance */}
                  <div className="form-group">
                    <label className="form-label">Attendance %</label>
                    <input className="form-input" type="number" min="0" max="100"
                      value={form.attendancePct} onChange={e => setF('attendancePct', e.target.value)} />
                  </div>
                </div>
                {/* Address */}
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input className="form-input" value={form.address} onChange={e => setF('address', e.target.value)} placeholder="123 Campus Rd, City" />
                </div>
              </div>
              <div className="modal__footer">
                <button type="button" className="modal__btn modal__btn--cancel" onClick={closeModal}>Cancel</button>
                <button type="submit" className="modal__btn modal__btn--submit" disabled={saving}>
                  {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteTarget && (
        <div className="modal-backdrop">
          <div className="confirm-dialog" role="alertdialog" aria-modal="true">
            <div className="confirm-dialog__icon">🗑️</div>
            <h3 className="confirm-dialog__title">Delete Student?</h3>
            <p className="confirm-dialog__sub">
              You are about to permanently remove <strong>{deleteTarget.name}</strong> ({deleteTarget.studentId}).
              This action cannot be undone.
            </p>
            <div className="confirm-dialog__actions">
              <button className="modal__btn modal__btn--cancel" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</button>
              <button className="modal__btn modal__btn--danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStudents;
