import React, { useEffect, useState, useCallback } from 'react';
import api from '../../../services/api';

const setTitle = (t) => { const el = document.getElementById('st-page-title'); if (el) el.textContent = t; };
const timeAgo = (d) => {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
};
const TYPE_ICON = { attendance_shortage:'⚠️', assignment_deadline:'📝', exam_announcement:'🎓', event_reminder:'📅', announcement:'📢', general:'🔔' };
const PRIORITY_COLOR = { urgent:'#dc2626', high:'#d97706', normal:'#2563eb', low:'#64748b' };
const PRIORITY_BG    = { urgent:'#fef2f2', high:'#fff7ed', normal:'#eff6ff', low:'var(--gray-50)' };

export default function StudentNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [filter,        setFilter]        = useState('all'); // 'all' | 'unread'
  const [page,          setPage]          = useState(1);
  const [pagination,    setPagination]    = useState({ totalPages:1, total:0 });

  useEffect(() => { setTitle('Notifications'); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit:20 });
      if (filter === 'unread') p.set('unreadOnly','true');
      const { data } = await api.get(`/notifications?${p}`);
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      setPagination(data.pagination);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, filter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [filter]);

  const markRead = async (n) => {
    if (n.isRead) return;
    await api.put(`/notifications/${n._id}/read`).catch(()=>{});
    setNotifications(prev => prev.map(x => x._id===n._id ? {...x,isRead:true} : x));
    setUnreadCount(c => Math.max(0,c-1));
  };

  const markAllRead = async () => {
    await api.put('/notifications/read-all').catch(()=>{});
    setNotifications(prev => prev.map(x => ({...x,isRead:true})));
    setUnreadCount(0);
  };

  const deleteNotif = async (id) => {
    await api.delete(`/notifications/${id}`).catch(()=>{});
    setNotifications(prev => prev.filter(x => x._id !== id));
  };

  const pages = Array.from({length: pagination.totalPages},(_,i)=>i+1);

  return (
    <div className="st-page">
      <div className="st-page-header">
        <div className="st-page-header__left">
          <h1 className="st-page-title">Notifications</h1>
          <p className="st-page-sub">{pagination.total} total{unreadCount>0?` · ${unreadCount} unread`:''}</p>
        </div>
        <div style={{display:'flex',gap:'0.75rem',alignItems:'center',flexWrap:'wrap'}}>
          <div className="san-tabs">
            <button className={`san-tab ${filter==='all'?'san-tab--active':''}`} onClick={()=>setFilter('all')}>All</button>
            <button className={`san-tab ${filter==='unread'?'san-tab--active':''}`} onClick={()=>setFilter('unread')}>
              Unread {unreadCount>0 && <span style={{marginLeft:'0.3rem',background:'#dc2626',color:'white',fontSize:'0.65rem',padding:'0.1rem 0.4rem',borderRadius:'9999px'}}>{unreadCount}</span>}
            </button>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} style={{padding:'0.5rem 1rem',background:'var(--blue-600)',color:'white',border:'none',borderRadius:'var(--radius-full)',fontSize:'0.82rem',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-sans)'}}>
              Mark all read
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="st-loading"><div className="st-loading__spinner"/><span>Loading…</span></div>
      ) : notifications.length === 0 ? (
        <div className="st-panel san-empty">
          <span>🔔</span>
          <div><strong>All caught up!</strong><p>No {filter==='unread'?'unread ':''}notifications at the moment.</p></div>
        </div>
      ) : (
        <div className="st-panel" style={{padding:0,overflow:'hidden'}}>
          {notifications.map((n,i) => (
            <div key={n._id}
              className={`notif-item ${!n.isRead?'notif-item--unread':''}`}
              style={{borderBottom: i<notifications.length-1?'1px solid var(--gray-100)':'none',background:!n.isRead?PRIORITY_BG[n.priority]:'var(--white)'}}
              onClick={()=>markRead(n)}
              role="button" tabIndex={0}
              onKeyDown={e=>e.key==='Enter'&&markRead(n)}
            >
              <div className="notif-item__icon-wrap" style={{background:`${PRIORITY_COLOR[n.priority]||'#2563eb'}15`}}>
                <span style={{fontSize:'1.2rem'}}>{TYPE_ICON[n.type]||'🔔'}</span>
              </div>
              <div className="notif-item__body">
                <div className="notif-item__title">{n.title}</div>
                <p className="notif-item__text">{n.body}</p>
                <div className="notif-item__meta">
                  <span className="notif-item__time">{timeAgo(n.createdAt)}</span>
                  <span className="notif-item__priority" style={{color:PRIORITY_COLOR[n.priority]||'#2563eb'}}>{n.priority}</span>
                  {!n.isRead && <span style={{fontSize:'0.68rem',fontWeight:700,background:PRIORITY_COLOR[n.priority]||'#2563eb',color:'white',padding:'0.1rem 0.4rem',borderRadius:'9999px'}}>New</span>}
                </div>
              </div>
              <button
                className="notif-item__delete"
                onClick={e=>{e.stopPropagation();deleteNotif(n._id);}}
                aria-label="Delete notification"
              >×</button>
            </div>
          ))}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div style={{display:'flex',justifyContent:'center',gap:'0.4rem',flexWrap:'wrap'}}>
          <button onClick={()=>setPage(p=>p-1)} disabled={page===1}
            style={{padding:'0.4rem 0.9rem',border:'1px solid var(--border)',borderRadius:'var(--radius-md)',background:'var(--white)',cursor:'pointer',fontFamily:'var(--font-sans)'}}>‹</button>
          {pages.map(p=>(
            <button key={p} onClick={()=>setPage(p)}
              style={{padding:'0.4rem 0.9rem',border:`1px solid ${p===page?'var(--blue-600)':'var(--border)'}`,borderRadius:'var(--radius-md)',background:p===page?'var(--blue-600)':'var(--white)',color:p===page?'white':'var(--gray-700)',cursor:'pointer',fontFamily:'var(--font-sans)',fontWeight:600}}>
              {p}
            </button>
          ))}
          <button onClick={()=>setPage(p=>p+1)} disabled={page===pagination.totalPages}
            style={{padding:'0.4rem 0.9rem',border:'1px solid var(--border)',borderRadius:'var(--radius-md)',background:'var(--white)',cursor:'pointer',fontFamily:'var(--font-sans)'}}>›</button>
        </div>
      )}
    </div>
  );
}
