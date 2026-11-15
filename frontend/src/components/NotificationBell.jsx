import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './NotificationBell.css';

const TYPE_ICON = {
  attendance_shortage: '⚠️',
  assignment_deadline: '📝',
  exam_announcement:   '🎓',
  event_reminder:      '📅',
  announcement:        '📢',
  general:             '🔔',
};

const PRIORITY_COLOR = {
  urgent: '#dc2626',
  high:   '#d97706',
  normal: '#2563eb',
  low:    '#64748b',
};

const timeAgo = (d) => {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const NotificationBell = ({ dashboardBase }) => {
  const [open,          setOpen]          = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Poll unread count every 60s
  const fetchCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const { data } = await api.get('/notifications/unread-count');
      setUnreadCount(data.count);
    } catch { /* silent */ }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchCount();
    const id = setInterval(fetchCount, 60000);
    return () => clearInterval(id);
  }, [fetchCount]);

  // Load notifications when panel opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.get('/notifications?limit=15')
      .then(r => { setNotifications(r.data.notifications); setUnreadCount(r.data.unreadCount); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (n) => {
    if (!n.isRead) {
      await api.put(`/notifications/${n._id}/read`).catch(() => {});
      setNotifications(prev => prev.map(x => x._id === n._id ? {...x, isRead:true} : x));
      setUnreadCount(c => Math.max(0, c - 1));
    }
    if (n.link) { navigate(n.link); setOpen(false); }
  };

  const markAllRead = async () => {
    await api.put('/notifications/read-all').catch(() => {});
    setNotifications(prev => prev.map(x => ({...x, isRead:true})));
    setUnreadCount(0);
  };

  const viewAll = () => {
    setOpen(false);
    navigate(`${dashboardBase}/notifications`);
  };

  return (
    <div className="nb-wrap" ref={panelRef}>
      {/* Bell button */}
      <button
        className="nb-bell"
        onClick={() => setOpen(o => !o)}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        aria-expanded={open}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span className="nb-badge" aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="nb-panel" role="menu" aria-label="Notifications">
          <div className="nb-panel__header">
            <span className="nb-panel__title">
              Notifications {unreadCount > 0 && <span className="nb-unread-pill">{unreadCount} new</span>}
            </span>
            <div className="nb-panel__actions">
              {unreadCount > 0 && (
                <button className="nb-action-btn" onClick={markAllRead}>Mark all read</button>
              )}
              <button className="nb-action-btn" onClick={viewAll}>View all</button>
            </div>
          </div>

          <div className="nb-panel__list">
            {loading ? (
              <div className="nb-loading">
                <div className="nb-spinner" /> Loading…
              </div>
            ) : notifications.length === 0 ? (
              <div className="nb-empty">
                <span>🔔</span>
                <span>All caught up — no notifications!</span>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n._id}
                  className={`nb-item ${!n.isRead ? 'nb-item--unread' : ''}`}
                  onClick={() => markRead(n)}
                  role="menuitem"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && markRead(n)}
                >
                  <span className="nb-item__icon" style={{ color: PRIORITY_COLOR[n.priority] || '#2563eb' }}>
                    {TYPE_ICON[n.type] || '🔔'}
                  </span>
                  <div className="nb-item__body">
                    <div className="nb-item__title">{n.title}</div>
                    <div className="nb-item__body-text">{n.body}</div>
                    <div className="nb-item__time">{timeAgo(n.createdAt)}</div>
                  </div>
                  {!n.isRead && <span className="nb-item__dot" aria-hidden="true" />}
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="nb-panel__footer">
              <button className="nb-view-all-btn" onClick={viewAll}>
                View all notifications →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
