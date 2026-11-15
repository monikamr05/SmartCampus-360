import React, { useEffect, useState, useCallback } from 'react';
import api from '../../../services/api';
import './shared.css';

const EMPTY_FORM = {
  name: '', code: '', department: '', instructor: '',
  credits: 3, semester: 'Fall', year: new Date().getFullYear(),
  maxStudents: 40, enrolled: 0, description: '', isActive: true,
};

const Toast = ({ msg }) =>
  msg.text ? <div className={`mgmt-toast mgmt-toast--${msg.type}`} role="alert">{msg.type === 'success' ? '✓' : '✗'} {msg.text}</div> : null;

const AdminCourses = () => {
  const [courses,     setCourses]     = useState([]);
  const [departments, setDepartments] = useState([]);
  const [pagination,  setPagination]  = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading,     setLoading]     = useState(true);
  const [toast,       setToast]       = useState({ type: '', text: '' });

  const [search,      setSearch]      = useState('');
  const [deptFilter,  setDeptFilter]  = useState('');
  const [semFilter,   setSemFilter]   = useState('');
  const [sortBy,      setSortBy]      = useState('createdAt');
  const [sortOrder,   setSortOrder]   = useState('desc');
  const [page,        setPage]        = useState(1);

  const [modalOpen,    setModalOpen]    = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [formErrors,   setFormErrors]   = useState({});
  const [saving,       setSaving]       = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10, search, sortBy, sortOrder,
        ...(deptFilter && { department: deptFilter }),
        ...(semFilter  && { semester:   semFilter }),
      });
      const { data } = await api.get(`/admin/courses?${params}`);
      setCourses(data.courses);
      setPagination(data.pagination);
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  }, [page, search, deptFilter, semFilter, sortBy, sortOrder]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);
  useEffect(() => {
    document.getElementById('page-title').textContent = 'Courses';
    api.get('/admin/departments/all').then(r => setDepartments(r.data)).catch(() => {});
  }, []);
  useEffect(() => { setPage(1); }, [search, deptFilter, semFilter]);

  const showToast = (type, text) => { setToast({ type, text }); setTimeout(() => setToast({ type: '', text: '' }), 3500); };

  const handleSort = (col) => {
    if (sortBy === col) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortOrder('asc'); }
  };
  const SortIcon = ({ col }) => sortBy !== col ? ' ⇅' : sortOrder === 'asc' ? ' ↑' : ' ↓';

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setFormErrors({}); setModalOpen(true); };
  const openEdit   = (c) => { setEditTarget(c); setForm({ ...c, department: c.department?._id || '' }); setFormErrors({}); setModalOpen(true); };
  const closeModal = ()  => { setModalOpen(false); setEditTarget(null); setFormErrors({}); };
  const setF = (k, v)    => { setForm(p => ({ ...p, [k]: v })); setFormErrors(p => ({ ...p, [k]: '' })); };

  const validateForm = () => {
    const e = {};
    if (!form.name.trim())       e.name       = 'Course name is required.';
    if (!form.code.trim())       e.code       = 'Course code is required.';
    if (!form.department)        e.department = 'Department is required.';
    if (!form.credits || form.credits < 1) e.credits = 'Credits must be at least 1.';
    if (!form.year)              e.year       = 'Year is required.';
    return e;
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setSaving(true);
    try {
      if (editTarget) await api.put(`/admin/courses/${editTarget._id}`, form);
      else            await api.post('/admin/courses', form);
      showToast('success', editTarget ? 'Course updated.' : 'Course created.');
      closeModal(); fetchCourses();
    } catch (err) { showToast('error', err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/courses/${deleteTarget._id}`);
      showToast('success', `${deleteTarget.name} deleted.`);
      setDeleteTarget(null); fetchCourses();
    } catch (err) { showToast('error', err.message); }
    finally { setDeleting(false); }
  };

  const pages = Array.from({ length: pagination.totalPages }, (_, i) => i + 1);

  const semColor = { Fall: '#2563eb', Spring: '#16a34a', Summer: '#d97706' };

  return (
    <div className="mgmt-page">
      <Toast msg={toast} />

      <div className="mgmt-header">
        <div className="mgmt-header__left">
          <h1 className="mgmt-header__title">Courses</h1>
          <p className="mgmt-header__sub">{pagination.total} total courses</p>
        </div>
        <button className="mgmt-toolbar__add" onClick={openCreate}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Course
        </button>
      </div>

      <div className="mgmt-toolbar">
        <div className="mgmt-toolbar__search">
          <svg className="mgmt-toolbar__search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search by name or code…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="mgmt-toolbar__select" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
        </select>
        <select className="mgmt-toolbar__select" value={semFilter} onChange={e => setSemFilter(e.target.value)}>
          <option value="">All Semesters</option>
          {['Fall','Spring','Summer'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="mgmt-table-card">
        <div className="mgmt-table-wrap">
          <table className="mgmt-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('name')} className={sortBy === 'name' ? 'sorted' : ''}>Course<SortIcon col="name" /></th>
                <th onClick={() => handleSort('code')} className={sortBy === 'code' ? 'sorted' : ''}>Code<SortIcon col="code" /></th>
                <th>Department</th>
                <th>Instructor</th>
                <th onClick={() => handleSort('credits')} className={sortBy === 'credits' ? 'sorted' : ''}>Credits<SortIcon col="credits" /></th>
                <th>Semester</th>
                <th>Enrolment</th>
                <th onClick={() => handleSort('year')} className={sortBy === 'year' ? 'sorted' : ''}>Year<SortIcon col="year" /></th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>Loading…</td></tr>
              ) : courses.length === 0 ? (
                <tr><td colSpan={9}><div className="mgmt-empty"><span className="mgmt-empty__icon">📚</span><span className="mgmt-empty__title">No courses found</span></div></td></tr>
              ) : courses.map(c => (
                <tr key={c._id}>
                  <td><span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{c.name}</span></td>
                  <td><code style={{ fontSize: '0.78rem', background: 'var(--gray-100)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>{c.code}</code></td>
                  <td><span style={{ fontSize: '0.82rem' }}>{c.department?.name || '—'}</span></td>
                  <td><span style={{ fontSize: '0.82rem' }}>{c.instructor || '—'}</span></td>
                  <td style={{ textAlign: 'center' }}><span style={{ fontWeight: 700 }}>{c.credits}</span></td>
                  <td>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: semColor[c.semester] || '#64748b',
                      background: `${(semColor[c.semester] || '#64748b')}18`, padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
                      {c.semester}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div style={{ height: 6, width: 50, background: 'var(--gray-200)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, (c.enrolled / (c.maxStudents || 40)) * 100)}%`, background: '#2563eb', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.enrolled}/{c.maxStudents}</span>
                    </div>
                  </td>
                  <td>{c.year}</td>
                  <td>
                    <div className="tbl-actions">
                      <button className="tbl-btn" onClick={() => openEdit(c)} title="Edit"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                      <button className="tbl-btn tbl-btn--danger" onClick={() => setDeleteTarget(c)} title="Delete"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
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
              {pages.slice(Math.max(0, page - 3), Math.min(pages.length, page + 2)).map(p => <button key={p} className={`mgmt-pagination__btn ${p === page ? 'mgmt-pagination__btn--active' : ''}`} onClick={() => setPage(p)}>{p}</button>)}
              <button className="mgmt-pagination__btn" onClick={() => setPage(p => p + 1)} disabled={page === pagination.totalPages}>›</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal modal--wide" role="dialog" aria-modal="true" aria-labelledby="course-modal-title">
            <div className="modal__header">
              <h2 className="modal__title" id="course-modal-title">{editTarget ? 'Edit Course' : 'Add Course'}</h2>
              <button className="modal__close" onClick={closeModal} aria-label="Close">×</button>
            </div>
            <form onSubmit={handleSave} noValidate>
              <div className="modal__body">
                <div className="modal__grid">
                  <div className="form-group">
                    <label className="form-label">Course Name *</label>
                    <input className={`form-input ${formErrors.name ? 'form-input--error' : ''}`} value={form.name} onChange={e => setF('name', e.target.value)} placeholder="Introduction to Programming" />
                    {formErrors.name && <span className="form-error">{formErrors.name}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Course Code *</label>
                    <input className={`form-input ${formErrors.code ? 'form-input--error' : ''}`} value={form.code} onChange={e => setF('code', e.target.value.toUpperCase())} placeholder="CS101" />
                    {formErrors.code && <span className="form-error">{formErrors.code}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department *</label>
                    <select className={`form-input ${formErrors.department ? 'form-input--error' : ''}`} value={form.department} onChange={e => setF('department', e.target.value)}>
                      <option value="">— Select —</option>
                      {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </select>
                    {formErrors.department && <span className="form-error">{formErrors.department}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Instructor</label>
                    <input className="form-input" value={form.instructor} onChange={e => setF('instructor', e.target.value)} placeholder="Dr. Jane Smith" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Credits *</label>
                    <input className={`form-input ${formErrors.credits ? 'form-input--error' : ''}`} type="number" min="1" max="6" value={form.credits} onChange={e => setF('credits', Number(e.target.value))} />
                    {formErrors.credits && <span className="form-error">{formErrors.credits}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Semester</label>
                    <select className="form-input" value={form.semester} onChange={e => setF('semester', e.target.value)}>
                      {['Fall','Spring','Summer'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Year *</label>
                    <input className={`form-input ${formErrors.year ? 'form-input--error' : ''}`} type="number" min="2000" max="2099" value={form.year} onChange={e => setF('year', Number(e.target.value))} />
                    {formErrors.year && <span className="form-error">{formErrors.year}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max Students</label>
                    <input className="form-input" type="number" min="1" value={form.maxStudents} onChange={e => setF('maxStudents', Number(e.target.value))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows={2} value={form.description} onChange={e => setF('description', e.target.value)} style={{ resize: 'vertical' }} />
                </div>
              </div>
              <div className="modal__footer">
                <button type="button" className="modal__btn modal__btn--cancel" onClick={closeModal}>Cancel</button>
                <button type="submit" className="modal__btn modal__btn--submit" disabled={saving}>{saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Add Course'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-backdrop">
          <div className="confirm-dialog" role="alertdialog" aria-modal="true">
            <div className="confirm-dialog__icon">🗑️</div>
            <h3 className="confirm-dialog__title">Delete Course?</h3>
            <p className="confirm-dialog__sub">Permanently delete <strong>{deleteTarget.name}</strong> ({deleteTarget.code})?</p>
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

export default AdminCourses;
