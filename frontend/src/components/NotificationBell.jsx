import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await client.get('/notifications');
      if (res.data?.success) {
        setNotifications(res.data.data || []);
        setUnreadCount(res.data.unread_count || 0);
      }
    } catch {
      // Silently ignore background polling errors
    }
  }, [user]);

  // Initial load and auto-refresh every 20 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      setActionInProgress(true);
      await client.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setActionInProgress(true);
      await client.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setActionInProgress(false);
    }
  };

  if (!user || user.role === 'student') {
    return null;
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        className="btn btn-ghost btn-sm notif-bell-btn"
        onClick={() => {
          setIsOpen(prev => !prev);
          if (!isOpen) fetchNotifications();
        }}
        title="Department Notifications"
        aria-label="View notifications"
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: 8,
          color: unreadCount > 0 ? 'var(--nav-brand-highlight, #facc15)' : 'inherit'
        }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              minWidth: 18,
              height: 18,
              padding: '0 4px',
              borderRadius: 9,
              background: '#DC2626',
              color: '#FFFFFF',
              fontSize: 10.5,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(220, 38, 38, 0.4)'
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="notif-dropdown-popover animate-scaleIn"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 360,
            maxWidth: '90vw',
            maxHeight: 460,
            background: 'var(--bg-card, #0f1a2b)',
            border: '1.5px solid var(--border-strong, rgba(250, 204, 21, 0.35))',
            borderRadius: 14,
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              background: 'var(--bg-glass-card, rgba(255,255,255,0.03))',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={16} color="var(--accent-primary, #10b981)" />
              <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--color-text)' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: 'rgba(220, 38, 38, 0.15)',
                    color: '#EF4444',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '1px 7px',
                    borderRadius: 10
                  }}
                >
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={actionInProgress}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-text, #10b981)',
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 6px'
                }}
              >
                <CheckCheck size={13} />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div
            style={{
              padding: '8px 0',
              overflowY: 'auto',
              maxHeight: 380,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: '36px 20px',
                  textAlign: 'center',
                  color: 'var(--color-text-muted)',
                  fontSize: 13
                }}
              >
                <AlertCircle size={28} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                <div>No notifications at this time.</div>
              </div>
            ) : (
              notifications.map(n => {
                const dateStr = n.created_at ? new Date(n.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : '';

                return (
                  <div
                    key={n.id}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border-light, rgba(255,255,255,0.06))',
                      background: n.is_read ? 'transparent' : 'var(--accent-soft-2, rgba(16, 185, 129, 0.08))',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      transition: 'background 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 12.5,
                          lineHeight: 1.5,
                          fontWeight: n.is_read ? 500 : 650,
                          color: 'var(--color-text)'
                        }}
                      >
                        {n.message}
                      </p>
                      {!n.is_read && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(n.id, e)}
                          disabled={actionInProgress}
                          title="Mark as read"
                          style={{
                            background: 'var(--accent-soft-2, rgba(16, 185, 129, 0.2))',
                            border: '1px solid var(--accent-primary, #10b981)',
                            borderRadius: 6,
                            padding: '3px 6px',
                            color: 'var(--accent-primary, #10b981)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                            fontSize: 11,
                            flexShrink: 0
                          }}
                        >
                          <Check size={11} />
                          Read
                        </button>
                      )}
                    </div>
                    {dateStr && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11,
                          color: 'var(--color-text-muted)'
                        }}
                      >
                        <Clock size={11} />
                        <span>{dateStr}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
