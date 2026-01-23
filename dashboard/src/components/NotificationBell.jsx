import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { theme } from '../styles/theme';

const NotificationBell = ({ notifications, unreadCount, onMarkAsRead, onMarkAllAsRead }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notification) => {
    onMarkAsRead(notification.id);
    if (notification.ticket_id) {
      navigate(`/tickets/${notification.ticket_id}`);
    }
    setIsOpen(false);
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        style={{
          position: 'relative',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: theme.spacing.sm,
          borderRadius: theme.radius.md,
          color: theme.colors.text.secondary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            minWidth: '16px',
            height: '16px',
            borderRadius: theme.radius.full,
            backgroundColor: theme.colors.accent.danger,
            color: '#ffffff',
            fontSize: '10px',
            fontWeight: theme.fontWeight.bold,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '0',
          marginBottom: theme.spacing.sm,
          width: '320px',
          maxHeight: '400px',
          overflowY: 'auto',
          backgroundColor: theme.colors.background.primary,
          border: `1px solid ${theme.colors.border.light}`,
          borderRadius: theme.radius.lg,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          zIndex: 1000,
        }}>
          {/* Header */}
          <div style={{
            padding: theme.spacing.md,
            borderBottom: `1px solid ${theme.colors.border.light}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{
              fontWeight: theme.fontWeight.semibold,
              fontSize: theme.fontSize.sm,
              color: theme.colors.text.primary,
            }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAllAsRead();
                }}
                style={{
                  fontSize: theme.fontSize.xs,
                  color: theme.colors.accent.primary,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: theme.fontWeight.medium,
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification items */}
          {notifications.length === 0 ? (
            <div style={{
              padding: theme.spacing.xl,
              textAlign: 'center',
              color: theme.colors.text.secondary,
              fontSize: theme.fontSize.sm,
            }}>
              No new notifications
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                onClick={() => handleNotificationClick(n)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNotificationClick(n); } }}
                style={{
                  padding: theme.spacing.md,
                  borderBottom: `1px solid ${theme.colors.border.light}`,
                  cursor: 'pointer',
                  transition: 'background-color 0.15s',
                  outline: 'none',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.colors.background.secondary; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                onFocus={(e) => { e.currentTarget.style.backgroundColor = theme.colors.background.secondary; }}
                onBlur={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <div style={{
                  fontSize: theme.fontSize.sm,
                  color: theme.colors.text.primary,
                  lineHeight: '1.4',
                }}>
                  {n.message_body}
                </div>
                <div style={{
                  fontSize: theme.fontSize.xs,
                  color: theme.colors.text.tertiary,
                  marginTop: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span>{formatTime(n.created_at)}</span>
                  {n.metadata?.priority && (
                    <span style={{
                      padding: '1px 6px',
                      borderRadius: theme.radius.sm,
                      backgroundColor: n.metadata.priority === 'high' || n.metadata.priority === 'urgent'
                        ? 'rgba(239, 68, 68, 0.1)'
                        : theme.colors.background.tertiary,
                      color: n.metadata.priority === 'high' || n.metadata.priority === 'urgent'
                        ? theme.colors.accent.danger
                        : theme.colors.text.secondary,
                      fontSize: theme.fontSize.xs,
                    }}>
                      {n.metadata.priority}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
