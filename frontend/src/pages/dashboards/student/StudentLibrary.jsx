import React, { useEffect, useState, useCallback } from 'react';
import api from '../../../services/api';
import './StudentLibrary.css';

const setTitle = (t) => { const el = document.getElementById('st-page-title'); if (el) el.textContent = t; };
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const CAT_COLORS = {
  textbook:   '#2563eb', reference: '#7c3aed', fiction: '#0891b2',
  science:    '#059669', technology:'#d97706', arts:    '#db2777',
  sports:     '#16a34a', other:     '#475569',
};

const AvailBadge = ({ copies }) => copies > 0
  ? <span className="slib-avail slib-avail--yes">✓ {copies} available</span>
  : <span className="slib-avail slib-avail--no">✗ Unavailable</span>;

export default function StudentLibrary() {
  const [view,       setView]       = useState('browse'); // 'browse' | 'mine'
  const [books,      setBooks]      = useState([]);
  const [myBooks,    setMyBooks]    = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [catFilter,  setCatFilter]  = useState('');
  const [availOnly,  setAvailOnly]  = useState('');
  const [page,       setPage]       = useState(1);
  const [expanded,   setExpanded]   = useState(null);

  useEffect(() => { setTitle('Library'); }, []);

  const loadBooks = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: 18 });
      if (search)    p.set('search',    search);
      if (catFilter) p.set('category',  catFilter);
      if (availOnly) p.set('available', availOnly);
      const { data } = await api.get(`/library/books?${p}`);
      setBooks(data.books);
      setPagination(data.pagination);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, search, catFilter, availOnly]);

  const loadMyBooks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/library/my-books');
      setMyBooks(data.books);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (view === 'browse') loadBooks();
    else loadMyBooks();
  }, [view, loadBooks, loadMyBooks]);

  useEffect(() => { setPage(1); }, [search, catFilter, availOnly]);

  const pages = Array.from({ length: pagination.totalPages }, (_, i) => i + 1);

  const CATEGORIES = ['textbook', 'reference', 'fiction', 'science', 'technology', 'arts', 'sports', 'other'];

  return (
    <div className="st-page slib-page">

      {/* Header */}
      <div className="st-page-header">
        <div className="st-page-header__left">
          <h1 className="st-page-title">📚 Library</h1>
          <p className="st-page-sub">Browse and search the campus book catalog</p>
        </div>
        <div className="san-tabs" style={{ width: 'fit-content' }}>
          <button className={`san-tab ${view === 'browse' ? 'san-tab--active' : ''}`} onClick={() => setView('browse')}>
            🔍 Browse Books
          </button>
          <button className={`san-tab ${view === 'mine' ? 'san-tab--active' : ''}`} onClick={() => setView('mine')}>
            📖 My Books {myBooks.filter(b => !b.isReturned).length > 0 && (
              <span style={{ marginLeft: '0.3rem', background: '#059669', color: 'white', fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '9999px' }}>
                {myBooks.filter(b => !b.isReturned).length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── BROWSE VIEW ── */}
      {view === 'browse' && (
        <>
          {/* Search & filter bar */}
          <div className="st-panel" style={{ padding: '0.85rem 1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search by title, author, ISBN…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.25rem', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', outline: 'none', background: 'var(--gray-50)' }}
                />
              </div>
              <select className="att-sem-select" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                <option value="">All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
              <select className="att-sem-select" value={availOnly} onChange={e => setAvailOnly(e.target.value)}>
                <option value="">All Books</option>
                <option value="true">Available Only</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="st-loading"><div className="st-loading__spinner"/><span>Loading books…</span></div>
          ) : books.length === 0 ? (
            <div className="st-panel san-empty">
              <span>📚</span>
              <div><strong>No books found</strong><p>Try adjusting your search or filters.</p></div>
            </div>
          ) : (
            <div className="slib-grid">
              {books.map(b => {
                const color   = CAT_COLORS[b.category] || '#475569';
                const isOpen  = expanded === b._id;
                return (
                  <div key={b._id} className="slib-card" style={{ borderTop: `3px solid ${color}` }}>
                    <div className="slib-card__header">
                      <span className="slib-card__cat" style={{ color, background: `${color}15` }}>
                        {b.category}
                      </span>
                      <AvailBadge copies={b.availableCopies} />
                    </div>

                    <h3 className="slib-card__title">{b.title}</h3>
                    <p className="slib-card__author">by {b.author}</p>

                    {b.publisher && (
                      <p className="slib-card__pub">{b.publisher}{b.publishYear ? ` · ${b.publishYear}` : ''}</p>
                    )}

                    <div className="slib-card__stats">
                      <span>📦 {b.totalCopies} cop{b.totalCopies !== 1 ? 'ies' : 'y'}</span>
                      {b.location && <span>📍 {b.location}</span>}
                      {b.isbn && <span>ISBN: {b.isbn}</span>}
                    </div>

                    {/* Expandable description */}
                    {b.description && (
                      <>
                        <button
                          className="slib-card__toggle"
                          onClick={() => setExpanded(isOpen ? null : b._id)}
                        >
                          {isOpen ? '▲ Less' : '▼ More info'}
                        </button>
                        {isOpen && <p className="slib-card__desc">{b.description}</p>}
                      </>
                    )}

                    {b.availableCopies === 0 && (
                      <div className="slib-card__unavail">
                        All copies are currently issued. Contact the library to reserve.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setPage(p => p - 1)} disabled={page === 1}
                style={{ padding: '0.45rem 0.9rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--white)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
              >‹</button>
              {pages.slice(Math.max(0, page - 3), Math.min(pages.length, page + 2)).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  style={{ padding: '0.45rem 0.9rem', border: `1px solid ${p === page ? 'var(--blue-600)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', background: p === page ? 'var(--blue-600)' : 'var(--white)', color: p === page ? 'white' : 'var(--gray-700)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 600 }}
                >{p}</button>
              ))}
              <button
                onClick={() => setPage(p => p + 1)} disabled={page === pagination.totalPages}
                style={{ padding: '0.45rem 0.9rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--white)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
              >›</button>
            </div>
          )}
        </>
      )}

      {/* ── MY BOOKS VIEW ── */}
      {view === 'mine' && (
        loading ? (
          <div className="st-loading"><div className="st-loading__spinner"/><span>Loading your books…</span></div>
        ) : myBooks.length === 0 ? (
          <div className="st-panel san-empty">
            <span>📖</span>
            <div>
              <strong>No books issued to you</strong>
              <p>Books issued from the library will appear here.</p>
            </div>
          </div>
        ) : (
          <div className="st-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--border)' }}>
                    {['Book', 'Author', 'Issued', 'Due Date', 'Status', 'Fine'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {myBooks.map(b => (
                    <tr key={b.recordId} style={{ borderBottom: '1px solid var(--gray-100)', background: b.isOverdue ? '#fff5f5' : 'transparent' }}>
                      <td style={{ padding: '0.9rem 1rem', fontWeight: 600, color: 'var(--gray-900)' }}>{b.title}</td>
                      <td style={{ padding: '0.9rem 1rem', color: 'var(--text-secondary)' }}>{b.author}</td>
                      <td style={{ padding: '0.9rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{fmtDate(b.issuedAt)}</td>
                      <td style={{ padding: '0.9rem 1rem', color: b.isOverdue ? '#dc2626' : 'var(--text-primary)', fontWeight: b.isOverdue ? 700 : 400 }}>
                        {fmtDate(b.dueDate)}
                        {b.isOverdue && <span style={{ marginLeft: '0.4rem', fontSize: '0.72rem', background: '#fee2e2', color: '#dc2626', padding: '0.1rem 0.4rem', borderRadius: '9999px', fontWeight: 700 }}>
                          {b.overdueDays}d overdue
                        </span>}
                      </td>
                      <td style={{ padding: '0.9rem 1rem' }}>
                        {b.isReturned
                          ? <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.72rem', fontWeight: 700, padding: '0.22rem 0.65rem', borderRadius: '9999px' }}>✓ Returned {fmtDate(b.returnedAt)}</span>
                          : b.isOverdue
                          ? <span style={{ background: '#fee2e2', color: '#dc2626', fontSize: '0.72rem', fontWeight: 700, padding: '0.22rem 0.65rem', borderRadius: '9999px' }}>⚠ Overdue</span>
                          : <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.72rem', fontWeight: 700, padding: '0.22rem 0.65rem', borderRadius: '9999px' }}>📖 Issued</span>}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', fontWeight: 700, color: (b.fine || 0) > 0 ? '#dc2626' : 'var(--text-muted)' }}>
                        {(b.fine || 0) > 0 ? `$${b.fine}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}
