import React, { useEffect, useState, useCallback } from 'react';
import api from '../../../services/api';
import './shared.css';
import './AdminLibrary.css';

const setTitle = (t) => { const el = document.getElementById('page-title'); if (el) el.textContent = t; };
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';

const EMPTY_FORM = {
  title:'', author:'', isbn:'', publisher:'', publishYear:'', edition:'',
  category:'other', totalCopies:1, description:'', language:'English', location:'', isActive:true,
};
const CATEGORIES = ['textbook','reference','fiction','science','technology','arts','sports','other'];

const Toast = ({ msg }) => msg.text
  ? <div className={`mgmt-toast mgmt-toast--${msg.type}`} role="alert">{msg.type==='success'?'✓':'✗'} {msg.text}</div>
  : null;

export default function AdminLibrary() {
  const [view, setView]           = useState('books'); // 'books' | 'issued'
  const [books,      setBooks]    = useState([]);
  const [pagination, setPagination] = useState({total:0,page:1,totalPages:1});
  const [issued,     setIssued]   = useState([]);
  const [loading,    setLoading]  = useState(true);
  const [toast,      setToast]    = useState({type:'',text:''});

  // Filters
  const [search,     setSearch]    = useState('');
  const [catFilter,  setCatFilter] = useState('');
  const [availOnly,  setAvailOnly] = useState('');
  const [page,       setPage]      = useState(1);

  // Book modal
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving,     setSaving]     = useState(false);

  // Delete
  const [delTarget,  setDelTarget]  = useState(null);
  const [deleting,   setDeleting]   = useState(false);

  // Issue modal
  const [issueBook,     setIssueBook]     = useState(null);
  const [issueStudentId, setIssueStudentId] = useState('');
  const [issueDays,     setIssueDays]     = useState(14);
  const [issueSaving,   setIssueSaving]   = useState(false);
  const [students,      setStudents]      = useState([]);

  const showToast = (t, x) => { setToast({type:t,text:x}); setTimeout(()=>setToast({type:'',text:''}),3500); };

  const loadBooks = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit:16 });
      if (search)    p.set('search',    search);
      if (catFilter) p.set('category',  catFilter);
      if (availOnly) p.set('available', availOnly);
      const { data } = await api.get(`/library/books?${p}`);
      setBooks(data.books);
      setPagination(data.pagination);
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  }, [page, search, catFilter, availOnly]);

  const loadIssued = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/library/issued');
      setIssued(data.issuedBooks);
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    setTitle('Library');
    if (view === 'books') loadBooks();
    else loadIssued();
  }, [view, loadBooks, loadIssued]);
  useEffect(() => { setPage(1); }, [search, catFilter, availOnly]);

  // Load students for issue dropdown
  useEffect(() => {
    if (issueBook) {
      api.get('/admin/students?limit=200').then(r => setStudents(r.data.students || [])).catch(()=>{});
    }
  }, [issueBook]);

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setFormErrors({}); setModalOpen(true); };
  const openEdit   = (b) => {
    setEditTarget(b);
    setForm({ title:b.title, author:b.author, isbn:b.isbn||'', publisher:b.publisher||'',
      publishYear:b.publishYear||'', edition:b.edition||'', category:b.category||'other',
      totalCopies:b.totalCopies||1, description:b.description||'', language:b.language||'English',
      location:b.location||'', isActive:b.isActive!==false });
    setFormErrors({}); setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditTarget(null); setFormErrors({}); };
  const setF = (k, v) => setForm(f => ({...f,[k]:v}));

  const validate = () => {
    const e = {};
    if (!form.title.trim())  e.title  = 'Title is required.';
    if (!form.author.trim()) e.author = 'Author is required.';
    if (!form.totalCopies || form.totalCopies < 1) e.totalCopies = 'At least 1 copy required.';
    return e;
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setSaving(true);
    try {
      if (editTarget) await api.put(`/library/books/${editTarget._id}`, form);
      else            await api.post('/library/books', form);
      showToast('success', editTarget ? 'Book updated.' : 'Book added.');
      closeModal(); loadBooks();
    } catch (err) { showToast('error', err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/library/books/${delTarget._id}`);
      showToast('success', 'Book deleted.');
      setDelTarget(null); loadBooks();
    } catch (err) { showToast('error', err.message); }
    finally { setDeleting(false); }
  };

  const handleIssue = async (e) => {
    e.preventDefault();
    if (!issueStudentId) return;
    setIssueSaving(true);
    try {
      await api.post(`/library/books/${issueBook._id}/issue`, { studentId: issueStudentId, dueDays: issueDays });
      showToast('success', 'Book issued successfully.');
      setIssueBook(null); setIssueStudentId(''); setIssueDays(14);
      loadBooks();
    } catch (err) { showToast('error', err.message); }
    finally { setIssueSaving(false); }
  };

  const handleReturn = async (bookId, recordId) => {
    try {
      const { data } = await api.put(`/library/books/${bookId}/return/${recordId}`);
      showToast('success', `Returned.${data.fine > 0 ? ` Fine: $${data.fine}` : ''}`);
      loadIssued();
    } catch (err) { showToast('error', err.message); }
  };

  const pages = Array.from({ length: pagination.totalPages }, (_, i) => i + 1);

  return (
    <div className="mgmt-page">
      <Toast msg={toast} />

      <div className="mgmt-header">
        <div className="mgmt-header__left">
          <h1 className="mgmt-header__title">Library</h1>
          <p className="mgmt-header__sub">{view==='books' ? `${pagination.total} books` : `${issued.length} currently issued`}</p>
        </div>
        <div style={{display:'flex',gap:'0.6rem',flexWrap:'wrap'}}>
          <div className="att-view-toggle">
            <button className={`att-view-btn ${view==='books'?'att-view-btn--active':''}`} onClick={()=>setView('books')}>📚 Books</button>
            <button className={`att-view-btn ${view==='issued'?'att-view-btn--active':''}`} onClick={()=>setView('issued')}>📤 Issued</button>
          </div>
          {view==='books' && (
            <button className="mgmt-toolbar__add" onClick={openCreate}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Book
            </button>
          )}
        </div>
      </div>

      {/* ── BOOKS VIEW ── */}
      {view === 'books' && (
        <>
          <div className="mgmt-toolbar">
            <div className="mgmt-toolbar__search">
              <svg className="mgmt-toolbar__search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search title, author, ISBN…" value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <select className="mgmt-toolbar__select" value={catFilter} onChange={e=>setCatFilter(e.target.value)}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
            </select>
            <select className="mgmt-toolbar__select" value={availOnly} onChange={e=>setAvailOnly(e.target.value)}>
              <option value="">All Books</option>
              <option value="true">Available Only</option>
            </select>
          </div>

          {loading ? (
            <div className="dash-loading"><div className="dash-loading__spinner"/><span>Loading…</span></div>
          ) : (
            <div className="mgmt-table-card">
              <div className="mgmt-table-wrap">
                <table className="mgmt-table">
                  <thead>
                    <tr><th>Book</th><th>Author</th><th>ISBN</th><th>Category</th><th>Copies</th><th>Availability</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {books.length === 0 ? (
                      <tr><td colSpan={7}><div className="mgmt-empty"><span className="mgmt-empty__icon">📚</span><span className="mgmt-empty__title">No books found</span></div></td></tr>
                    ) : books.map(b => (
                      <tr key={b._id}>
                        <td>
                          <div style={{fontWeight:600,color:'var(--gray-900)',fontSize:'0.875rem'}}>{b.title}</div>
                          {b.location && <div style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>📍 {b.location}</div>}
                        </td>
                        <td style={{fontSize:'0.84rem'}}>{b.author}</td>
                        <td><code style={{fontSize:'0.78rem',background:'var(--gray-100)',padding:'0.1rem 0.4rem',borderRadius:4}}>{b.isbn||'—'}</code></td>
                        <td><span style={{fontSize:'0.75rem',fontWeight:700,background:'var(--blue-50)',color:'var(--blue-700)',padding:'0.18rem 0.55rem',borderRadius:'9999px',textTransform:'capitalize'}}>{b.category}</span></td>
                        <td style={{textAlign:'center',fontWeight:600}}>{b.totalCopies}</td>
                        <td>
                          <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                            <span style={{fontWeight:700,color:b.availableCopies>0?'#059669':'#dc2626'}}>{b.availableCopies}</span>
                            <span style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>/ {b.totalCopies} avail.</span>
                            {b.availableCopies===0 && <span className="status-badge status-badge--suspended">Out</span>}
                          </div>
                        </td>
                        <td>
                          <div className="tbl-actions">
                            {b.availableCopies > 0 && (
                              <button className="tbl-btn" title="Issue Book" onClick={()=>setIssueBook(b)}>📤</button>
                            )}
                            <button className="tbl-btn" title="Edit" onClick={()=>openEdit(b)}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button className="tbl-btn tbl-btn--danger" title="Delete" onClick={()=>setDelTarget(b)}>
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
                  <span className="mgmt-pagination__info">{pagination.total} books</span>
                  <div className="mgmt-pagination__btns">
                    <button className="mgmt-pagination__btn" onClick={()=>setPage(p=>p-1)} disabled={page===1}>‹</button>
                    {pages.slice(Math.max(0,page-3),Math.min(pages.length,page+2)).map(p=>(
                      <button key={p} className={`mgmt-pagination__btn ${p===page?'mgmt-pagination__btn--active':''}`} onClick={()=>setPage(p)}>{p}</button>
                    ))}
                    <button className="mgmt-pagination__btn" onClick={()=>setPage(p=>p+1)} disabled={page===pagination.totalPages}>›</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── ISSUED VIEW ── */}
      {view === 'issued' && (
        <div className="mgmt-table-card">
          <div className="mgmt-table-wrap">
            <table className="mgmt-table">
              <thead>
                <tr><th>Book</th><th>Student</th><th>Issued</th><th>Due Date</th><th>Overdue</th><th>Fine</th><th>Action</th></tr>
              </thead>
              <tbody>
                {issued.length === 0 ? (
                  <tr><td colSpan={7}><div className="mgmt-empty"><span className="mgmt-empty__icon">✅</span><span className="mgmt-empty__title">No books currently issued</span></div></td></tr>
                ) : issued.map(r => (
                  <tr key={`${r.bookId}-${r.recordId}`} className={r.isOverdue ? 'lib-row--overdue' : ''}>
                    <td>
                      <div style={{fontWeight:600,fontSize:'0.875rem'}}>{r.bookTitle}</div>
                      <div style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>{r.bookAuthor}</div>
                    </td>
                    <td>
                      <div style={{fontWeight:600,fontSize:'0.875rem'}}>{r.studentName}</div>
                      <code style={{fontSize:'0.72rem',background:'var(--gray-100)',padding:'0.1rem 0.3rem',borderRadius:3}}>{r.studentId}</code>
                    </td>
                    <td style={{fontSize:'0.8rem'}}>{fmtDate(r.issuedAt)}</td>
                    <td style={{fontSize:'0.8rem',color:r.isOverdue?'#dc2626':'var(--text-primary)',fontWeight:r.isOverdue?700:400}}>{fmtDate(r.dueDate)}</td>
                    <td style={{textAlign:'center'}}>
                      {r.overdueDays > 0
                        ? <span style={{color:'#dc2626',fontWeight:700}}>{r.overdueDays}d</span>
                        : <span style={{color:'#059669'}}>On time</span>}
                    </td>
                    <td style={{fontWeight:700,color:r.estimatedFine>0?'#dc2626':'var(--text-muted)'}}>
                      {r.estimatedFine > 0 ? `$${r.estimatedFine}` : '—'}
                    </td>
                    <td>
                      <button className="mgmt-toolbar__add" style={{padding:'0.4rem 0.9rem',fontSize:'0.78rem'}} onClick={()=>handleReturn(r.bookId, r.recordId)}>
                        ↩ Return
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&closeModal()}>
          <div className="modal modal--wide" role="dialog" aria-modal="true">
            <div className="modal__header">
              <h2 className="modal__title">{editTarget?'Edit Book':'Add Book'}</h2>
              <button className="modal__close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSave} noValidate>
              <div className="modal__body">
                <div className="modal__grid">
                  <div className="form-group" style={{gridColumn:'1/-1'}}>
                    <label className="form-label">Title *</label>
                    <input className={`form-input ${formErrors.title?'form-input--error':''}`} value={form.title} onChange={e=>setF('title',e.target.value)} placeholder="Book title…"/>
                    {formErrors.title && <span className="form-error">{formErrors.title}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Author *</label>
                    <input className={`form-input ${formErrors.author?'form-input--error':''}`} value={form.author} onChange={e=>setF('author',e.target.value)} placeholder="Author name"/>
                    {formErrors.author && <span className="form-error">{formErrors.author}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">ISBN</label>
                    <input className="form-input" value={form.isbn} onChange={e=>setF('isbn',e.target.value)} placeholder="978-…"/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Publisher</label>
                    <input className="form-input" value={form.publisher} onChange={e=>setF('publisher',e.target.value)}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Publish Year</label>
                    <input className="form-input" type="number" min={1900} max={2099} value={form.publishYear} onChange={e=>setF('publishYear',e.target.value)}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-input" value={form.category} onChange={e=>setF('category',e.target.value)}>
                      {CATEGORIES.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Copies *</label>
                    <input className={`form-input ${formErrors.totalCopies?'form-input--error':''}`} type="number" min={1} value={form.totalCopies} onChange={e=>setF('totalCopies',Number(e.target.value))}/>
                    {formErrors.totalCopies && <span className="form-error">{formErrors.totalCopies}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Location / Shelf</label>
                    <input className="form-input" value={form.location} onChange={e=>setF('location',e.target.value)} placeholder="Rack A-3"/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Language</label>
                    <input className="form-input" value={form.language} onChange={e=>setF('language',e.target.value)}/>
                  </div>
                </div>
                <div className="form-group" style={{marginTop:'0.5rem'}}>
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows={2} value={form.description} onChange={e=>setF('description',e.target.value)} style={{resize:'vertical'}}/>
                </div>
                <label style={{display:'flex',alignItems:'center',gap:'0.5rem',cursor:'pointer',fontSize:'0.875rem',fontWeight:600,color:'var(--gray-700)',marginTop:'0.5rem'}}>
                  <input type="checkbox" checked={form.isActive} onChange={e=>setF('isActive',e.target.checked)} style={{width:16,height:16}}/>
                  Active (visible in catalog)
                </label>
              </div>
              <div className="modal__footer">
                <button type="button" className="modal__btn modal__btn--cancel" onClick={closeModal}>Cancel</button>
                <button type="submit" className="modal__btn modal__btn--submit" disabled={saving}>{saving?'Saving…':editTarget?'Save Changes':'Add Book'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {delTarget && (
        <div className="modal-backdrop">
          <div className="confirm-dialog">
            <div className="confirm-dialog__icon">🗑️</div>
            <h3 className="confirm-dialog__title">Delete Book?</h3>
            <p className="confirm-dialog__sub">Delete "<strong>{delTarget.title}</strong>"? Books with active issues cannot be deleted.</p>
            <div className="confirm-dialog__actions">
              <button className="modal__btn modal__btn--cancel" onClick={()=>setDelTarget(null)} disabled={deleting}>Cancel</button>
              <button className="modal__btn modal__btn--danger" onClick={handleDelete} disabled={deleting}>{deleting?'Deleting…':'Yes, Delete'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Book modal */}
      {issueBook && (
        <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&setIssueBook(null)}>
          <div className="modal" role="dialog" aria-modal="true">
            <div className="modal__header">
              <h2 className="modal__title">Issue Book</h2>
              <button className="modal__close" onClick={()=>setIssueBook(null)}>×</button>
            </div>
            <form onSubmit={handleIssue} noValidate>
              <div className="modal__body">
                <div style={{background:'var(--gray-50)',padding:'0.85rem',borderRadius:'var(--radius-md)',marginBottom:'1rem'}}>
                  <div style={{fontWeight:700,color:'var(--gray-900)'}}>{issueBook.title}</div>
                  <div style={{fontSize:'0.8rem',color:'var(--text-muted)'}}>by {issueBook.author} · {issueBook.availableCopies} cop{issueBook.availableCopies===1?'y':'ies'} available</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Student *</label>
                  <select className="form-input" value={issueStudentId} onChange={e=>setIssueStudentId(e.target.value)} required>
                    <option value="">— Select Student —</option>
                    {students.map(s=><option key={s._id} value={s._id}>{s.name} ({s.studentId})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Due in (days)</label>
                  <input className="form-input" type="number" min={1} max={90} value={issueDays} onChange={e=>setIssueDays(Number(e.target.value))}/>
                </div>
                <p style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>Due date: {new Date(Date.now()+issueDays*86400000).toDateString()}</p>
              </div>
              <div className="modal__footer">
                <button type="button" className="modal__btn modal__btn--cancel" onClick={()=>setIssueBook(null)}>Cancel</button>
                <button type="submit" className="modal__btn modal__btn--submit" disabled={issueSaving||!issueStudentId}>{issueSaving?'Issuing…':'Issue Book'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
