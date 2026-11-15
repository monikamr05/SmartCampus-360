import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './GlobalSearch.css';

const TYPE_META = {
  student: { icon: '👤', color: '#2563eb', label: 'Student' },
  faculty: { icon: '🧑‍🏫', color: '#d97706', label: 'Faculty' },
  course:  { icon: '📚', color: '#7c3aed', label: 'Course'  },
  event:   { icon: '📅', color: '#059669', label: 'Event'   },
  book:    { icon: '📖', color: '#0891b2', label: 'Book'    },
};

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const GlobalSearch = ({ placeholder = 'Search…' }) => {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(false);
  const [focused, setFocused] = useState(false);

  const wrapRef   = useRef(null);
  const inputRef  = useRef(null);
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const debounced = useDebounce(query, 300);

  // Search on debounced query change
  useEffect(() => {
    if (debounced.trim().length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    api.get(`/notifications/search?q=${encodeURIComponent(debounced)}&role=${user?.role || ''}`)
      .then(r => { setResults(r.data.results || []); setOpen(true); })
      .catch(() => { setResults([]); })
      .finally(() => setLoading(false));
  }, [debounced, user?.role]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false); setFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard: Escape closes, arrow keys navigate
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
  };

  const handleSelect = (item) => {
    setQuery(''); setResults([]); setOpen(false);
    if (item.link) navigate(item.link);
  };

  const handleClear = () => { setQuery(''); setResults([]); setOpen(false); inputRef.current?.focus(); };

  const isActive = focused || query.length > 0;

  return (
    <div className={`gs-wrap ${isActive ? 'gs-wrap--active' : ''}`} ref={wrapRef}>
      <div className="gs-input-wrap">
        <svg className="gs-icon" width="15" height="15" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          ref={inputRef}
          type="text"
          className="gs-input"
          placeholder={placeholder}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => { setFocused(true); if (results.length > 0) setOpen(true); }}
          onKeyDown={handleKeyDown}
          aria-label="Global search"
          aria-expanded={open}
          aria-haspopup="listbox"
          autoComplete="off"
        />
        {loading && <div className="gs-spinner" aria-hidden="true" />}
        {!loading && query.length > 0 && (
          <button className="gs-clear" onClick={handleClear} aria-label="Clear search">×</button>
        )}
      </div>

      {open && (
        <div className="gs-dropdown" role="listbox" aria-label="Search results">
          {results.length === 0 ? (
            <div className="gs-empty">No results for "{debounced}"</div>
          ) : (
            <>
              <div className="gs-dropdown__header">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </div>
              {results.map((item, i) => {
                const m = TYPE_META[item.type] || { icon: '🔍', color: '#64748b', label: item.type };
                return (
                  <div
                    key={`${item.type}-${item._id}-${i}`}
                    className="gs-item"
                    role="option"
                    tabIndex={0}
                    onClick={() => handleSelect(item)}
                    onKeyDown={e => e.key === 'Enter' && handleSelect(item)}
                  >
                    <span className="gs-item__icon" style={{ color: m.color, background: `${m.color}18` }}>
                      {m.icon}
                    </span>
                    <div className="gs-item__body">
                      <span className="gs-item__label">{item.label}</span>
                      {item.sub && <span className="gs-item__sub">{item.sub}</span>}
                    </div>
                    <span className="gs-item__type" style={{ color: m.color }}>
                      {m.label}
                    </span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
