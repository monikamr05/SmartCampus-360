import React, { useEffect, useState, useCallback } from 'react';
import api from '../../../services/api';
import './StudentEvents.css';

const setTitle = (t) => { const el = document.getElementById('st-page-title'); if (el) el.textContent = t; };
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'}) : '—';
const isUpcoming = (d) => new Date(d) >= new Date();

const CAT_META = {
  academic: { icon:'📖', bg:'#eff6ff', color:'#1d4ed8', border:'#93c5fd' },
  cultural: { icon:'🎭', bg:'#fdf4ff', color:'#7e22ce', border:'#d8b4fe' },
  sports:   { icon:'🏆', bg:'#f0fdf4', color:'#15803d', border:'#86efac' },
  seminar:  { icon:'🎤', bg:'#ecfeff', color:'#155e75', border:'#67e8f9' },
  workshop: { icon:'🛠️', bg:'#fff7ed', color:'#9a3412', border:'#fdba74' },
  holiday:  { icon:'🎉', bg:'#fef9c3', color:'#854d0e', border:'#fde047' },
  exam:     { icon:'📝', bg:'#fef2f2', color:'#991b1b', border:'#fca5a5' },
  other:    { icon:'📌', bg:'#f8fafc', color:'#475569', border:'#cbd5e1' },
};

const daysUntil = (d) => {
  const diff = Math.ceil((new Date(d).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000);
  if (diff < 0) return { text:'Past', color:'#94a3b8' };
  if (diff === 0) return { text:'Today!', color:'#dc2626' };
  if (diff === 1) return { text:'Tomorrow', color:'#d97706' };
  if (diff <= 7) return { text:`In ${diff} days`, color:'#d97706' };
  return { text:`In ${diff} days`, color:'#64748b' };
};

const Toast = ({ msg }) => msg.text
  ? <div className="st-toast st-toast--success" role="alert">{msg.text}</div>
  : null;

export default function StudentEvents() {
  const [view,         setView]        = useState('browse'); // 'browse' | 'mine'
  const [events,       setEvents]      = useState([]);
  const [myRegs,       setMyRegs]      = useState([]);
  const [loading,      setLoading]     = useState(true);
  const [toast,        setToast]       = useState({ text:'' });
  const [registering,  setRegistering] = useState({});
  const [period,       setPeriod]      = useState('upcoming');
  const [catFilter,    setCatFilter]   = useState('');
  const [search,       setSearch]      = useState('');

  useEffect(() => { setTitle('Campus Events'); }, []);

  const showToast = (text) => { setToast({ text }); setTimeout(()=>setToast({ text:'' }), 3000); };

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (period === 'upcoming') p.set('upcoming', 'true');
      if (catFilter) p.set('category', catFilter);
      if (search)    p.set('search',   search);
      const { data } = await api.get(`/events?${p}&limit=50`);
      setEvents(data.events);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [period, catFilter, search]);

  const loadMyRegs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/events/my-registrations');
      setMyRegs(data.registrations);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (view === 'browse') loadEvents();
    else loadMyRegs();
  }, [view, loadEvents, loadMyRegs]);

  const isRegistered = (eventId) => myRegs.some(r => r._id === eventId);

  const handleRegister = async (ev) => {
    setRegistering(r => ({...r, [ev._id]: 'registering'}));
    try {
      await api.post(`/events/${ev._id}/register`);
      showToast(`✅ Registered for "${ev.title}"!`);
      await loadMyRegs();
    } catch (e) { showToast(`⚠️ ${e.message}`); }
    finally { setRegistering(r => ({...r, [ev._id]: null})); }
  };

  const handleUnregister = async (ev) => {
    setRegistering(r => ({...r, [ev._id]: 'cancelling'}));
    try {
      await api.delete(`/events/${ev._id}/register`);
      showToast(`Cancelled registration for "${ev.title}"`);
      await loadMyRegs();
    } catch (e) { showToast(`⚠️ ${e.message}`); }
    finally { setRegistering(r => ({...r, [ev._id]: null})); }
  };

  // Group browse events by month
  const grouped = {};
  events.forEach(ev => {
    const key = new Date(ev.startDate).toLocaleDateString('en-US',{month:'long',year:'numeric'});
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(ev);
  });

  return (
    <div className="st-page sev-page">
      <Toast msg={toast} />

      {/* Header */}
      <div className="st-page-header">
        <div className="st-page-header__left">
          <h1 className="st-page-title">Campus Events</h1>
          <p className="st-page-sub">Discover, register and track campus activities</p>
        </div>
        <div className="san-tabs" style={{width:'fit-content'}}>
          <button className={`san-tab ${view==='browse'?'san-tab--active':''}`} onClick={()=>setView('browse')}>🔍 Browse</button>
          <button className={`san-tab ${view==='mine'?'san-tab--active':''}`} onClick={()=>setView('mine')}>
            📋 My Registrations {myRegs.length > 0 && <span style={{marginLeft:'0.3rem',background:'#059669',color:'white',fontSize:'0.65rem',padding:'0.1rem 0.4rem',borderRadius:'9999px'}}>{myRegs.length}</span>}
          </button>
        </div>
      </div>

      {/* ── BROWSE VIEW ── */}
      {view === 'browse' && (
        <>
          {/* Filters */}
          <div className="fc-panel" style={{padding:'0.85rem 1.25rem'}}>
            <div style={{display:'flex',gap:'0.75rem',flexWrap:'wrap',alignItems:'center'}}>
              <div style={{flex:1,minWidth:180,position:'relative'}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{position:'absolute',left:'0.75rem',top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)',pointerEvents:'none'}}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input type="text" placeholder="Search events…" value={search} onChange={e=>setSearch(e.target.value)}
                  style={{width:'100%',padding:'0.55rem 0.75rem 0.55rem 2.25rem',border:'1.5px solid var(--border)',borderRadius:'var(--radius-md)',fontSize:'0.875rem',fontFamily:'var(--font-sans)',outline:'none',background:'var(--gray-50)'}}/>
              </div>
              <select className="att-sem-select" value={period} onChange={e=>setPeriod(e.target.value)}>
                <option value="upcoming">Upcoming</option>
                <option value="all">All Events</option>
              </select>
              <select className="att-sem-select" value={catFilter} onChange={e=>setCatFilter(e.target.value)}>
                <option value="">All Categories</option>
                {Object.keys(CAT_META).map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="st-loading"><div className="st-loading__spinner"/><span>Loading events…</span></div>
          ) : events.length === 0 ? (
            <div className="st-panel st-empty">📅 No events found.</div>
          ) : (
            Object.entries(grouped).map(([month, evs]) => (
              <div key={month} className="sev-group">
                <div className="sev-group__header">
                  <span className="sev-group__month">{month}</span>
                  <span className="sev-group__count">{evs.length} event{evs.length!==1?'s':''}</span>
                </div>
                <div className="sev-grid">
                  {evs.map(ev => {
                    const m    = CAT_META[ev.category] || CAT_META.other;
                    const dl   = daysUntil(ev.startDate);
                    const reg  = isRegistered(ev._id);
                    const busy = registering[ev._id];
                    const up   = isUpcoming(ev.startDate);
                    return (
                      <div key={ev._id} className={`sev-card ${reg?'sev-card--registered':''}`}
                        style={{ borderTop:`3px solid ${m.border}` }}>
                        <div className="sev-card__header">
                          <div className="sev-card__icon-wrap" style={{background:m.bg}}>
                            <span className="sev-card__icon">{m.icon}</span>
                          </div>
                          <div className="sev-card__header-right">
                            <span className="sev-card__cat" style={{color:m.color,background:m.bg}}>{ev.category}</span>
                            <span className="sev-card__countdown" style={{color:dl.color}}>{dl.text}</span>
                          </div>
                        </div>
                        <h3 className="sev-card__title">{ev.title}</h3>
                        {ev.description && <p className="sev-card__desc">{ev.description}</p>}
                        <div className="sev-card__details">
                          <div>📅 {fmtDate(ev.startDate)}{ev.startTime ? ` · ${ev.startTime}` : ''}</div>
                          {ev.venue && <div>📍 {ev.venue}</div>}
                          {ev.organizer && <div>👤 {ev.organizer}</div>}
                          {ev.registrationRequired && (
                            <div>
                              👥 {ev.registeredCount||0}
                              {ev.maxParticipants>0?` / ${ev.maxParticipants}`:''}
                              {ev.isFull && <span className="sev-full-badge">Full</span>}
                            </div>
                          )}
                        </div>
                        {ev.registrationRequired && up && (
                          <div className="sev-card__footer">
                            {reg ? (
                              <div style={{display:'flex',gap:'0.5rem',alignItems:'center'}}>
                                <span className="sev-registered-badge">✓ Registered</span>
                                <button className="sev-cancel-btn" onClick={()=>handleUnregister(ev)} disabled={!!busy}>
                                  {busy==='cancelling'?'…':'Cancel'}
                                </button>
                              </div>
                            ) : ev.isFull ? (
                              <span className="sev-full-text">Event is full</span>
                            ) : (
                              <button className="sev-register-btn" onClick={()=>handleRegister(ev)} disabled={!!busy}>
                                {busy==='registering' ? '…' : '+ Register'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* ── MY REGISTRATIONS VIEW ── */}
      {view === 'mine' && (
        loading ? (
          <div className="st-loading"><div className="st-loading__spinner"/><span>Loading…</span></div>
        ) : myRegs.length === 0 ? (
          <div className="st-panel san-empty">
            <span>📋</span>
            <div>
              <strong>No registrations yet</strong>
              <p>Browse events and register for the ones you'd like to attend.</p>
            </div>
          </div>
        ) : (
          <div className="sev-grid">
            {myRegs.map(r => {
              const m  = CAT_META[r.category] || CAT_META.other;
              const up = isUpcoming(r.startDate);
              return (
                <div key={r._id} className="sev-card" style={{borderTop:`3px solid ${m.border}`}}>
                  <div className="sev-card__header">
                    <div className="sev-card__icon-wrap" style={{background:m.bg}}>
                      <span className="sev-card__icon">{m.icon}</span>
                    </div>
                    <div className="sev-card__header-right">
                      <span className="sev-card__cat" style={{color:m.color,background:m.bg}}>{r.category}</span>
                      {r.attended
                        ? <span style={{fontSize:'0.7rem',fontWeight:700,background:'#dcfce7',color:'#15803d',padding:'0.15rem 0.5rem',borderRadius:'9999px'}}>✓ Attended</span>
                        : up ? <span style={{color:'#2563eb',fontSize:'0.72rem',fontWeight:700}}>Upcoming</span>
                              : <span style={{color:'#94a3b8',fontSize:'0.72rem',fontWeight:700}}>Past</span>}
                    </div>
                  </div>
                  <h3 className="sev-card__title">{r.title}</h3>
                  <div className="sev-card__details">
                    <div>📅 {fmtDate(r.startDate)}{r.startTime?` · ${r.startTime}`:''}</div>
                    {r.venue && <div>📍 {r.venue}</div>}
                    <div style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>Registered: {new Date(r.registeredAt).toLocaleDateString()}</div>
                  </div>
                  {up && (
                    <div className="sev-card__footer">
                      <button className="sev-cancel-btn" onClick={()=>handleUnregister(r)}>Cancel Registration</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
