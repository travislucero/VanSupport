import React from 'react';
import { theme } from '../styles/theme';

const Sidebar = ({ user, onLogout, hasRole }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', active: true },
    { id: 'analytics', label: 'Analytics', icon: '📈', active: false },
    { id: 'reports', label: 'Reports', icon: '📄', active: false },
    { id: 'settings', label: 'Settings', icon: '⚙️', active: false },
  ];

  const departmentItems = [
    { id: 'performance', label: 'Performance', color: theme.colors.accent.primary },
    { id: 'issues', label: 'Issues', color: theme.colors.accent.success },
    { id: 'handoffs', label: 'Handoffs', color: theme.colors.accent.warning },
  ];

  return (
    <div
      style={{
        width: '260px',
        height: '100vh',
        backgroundColor: theme.colors.background.secondary,
        borderRight: `1px solid ${theme.colors.border.light}`,
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: 0,
        overflowY: 'auto',
      }}
    >
      {/* Logo/Brand */}
      <div
        style={{
          padding: theme.spacing.xl,
          borderBottom: `1px solid ${theme.colors.border.light}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              backgroundColor: theme.colors.accent.primary,
              borderRadius: theme.radius.lg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
            }}
          >
            🚐
          </div>
          <div>
            <div
              style={{
                color: theme.colors.text.primary,
                fontSize: theme.fontSize.lg,
                fontWeight: theme.fontWeight.bold,
              }}
            >
              VanSupport
            </div>
          </div>
        </div>
      </div>

      {/* User Profile */}
      {user && (
        <div
          style={{
            padding: theme.spacing.lg,
            borderBottom: `1px solid ${theme.colors.border.light}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: theme.radius.full,
                backgroundColor: theme.colors.accent.secondary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme.colors.text.primary,
                fontWeight: theme.fontWeight.semibold,
                fontSize: theme.fontSize.lg,
              }}
            >
              {user.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  color: theme.colors.text.primary,
                  fontSize: theme.fontSize.sm,
                  fontWeight: theme.fontWeight.medium,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user.email?.split('@')[0] || 'User'}
              </div>
              {user.roles && user.roles.length > 0 && (
                <div
                  style={{
                    color: theme.colors.text.secondary,
                    fontSize: theme.fontSize.xs,
                    marginTop: '2px',
                  }}
                >
                  {user.roles[0].name}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Menu */}
      <div style={{ padding: theme.spacing.lg }}>
        <div
          style={{
            color: theme.colors.text.tertiary,
            fontSize: theme.fontSize.xs,
            fontWeight: theme.fontWeight.semibold,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: theme.spacing.md,
          }}
        >
          Main Menu
        </div>
        {menuItems.map((item) => (
          <button
            key={item.id}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.md,
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              backgroundColor: item.active
                ? theme.colors.background.tertiary
                : 'transparent',
              color: item.active
                ? theme.colors.text.primary
                : theme.colors.text.secondary,
              border: 'none',
              borderRadius: theme.radius.md,
              cursor: 'pointer',
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.medium,
              marginBottom: theme.spacing.xs,
              transition: 'all 0.2s',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              if (!item.active) {
                e.currentTarget.style.backgroundColor = theme.colors.background.tertiary;
              }
            }}
            onMouseLeave={(e) => {
              if (!item.active) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      {/* Department/Categories */}
      <div style={{ padding: `0 ${theme.spacing.lg} ${theme.spacing.lg}` }}>
        <div
          style={{
            color: theme.colors.text.tertiary,
            fontSize: theme.fontSize.xs,
            fontWeight: theme.fontWeight.semibold,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: theme.spacing.md,
          }}
        >
          Categories
        </div>
        {departmentItems.map((item) => (
          <button
            key={item.id}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.md,
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              backgroundColor: 'transparent',
              color: theme.colors.text.secondary,
              border: 'none',
              borderRadius: theme.radius.md,
              cursor: 'pointer',
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.medium,
              marginBottom: theme.spacing.xs,
              transition: 'all 0.2s',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.background.tertiary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: theme.radius.full,
                backgroundColor: item.color,
              }}
            />
            {item.label}
          </button>
        ))}
      </div>

      {/* Footer Actions */}
      <div style={{ marginTop: 'auto', padding: theme.spacing.lg, borderTop: `1px solid ${theme.colors.border.light}` }}>
        {hasRole('admin') && (
          <a
            href="/admin/users"
            style={{
              display: 'block',
              width: '100%',
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              backgroundColor: theme.colors.accent.secondary,
              color: theme.colors.text.primary,
              border: 'none',
              borderRadius: theme.radius.md,
              cursor: 'pointer',
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.medium,
              marginBottom: theme.spacing.sm,
              textAlign: 'center',
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.accent.secondaryHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.accent.secondary;
            }}
          >
            👥 Manage Users
          </a>
        )}
        <button
          onClick={onLogout}
          style={{
            width: '100%',
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            backgroundColor: 'transparent',
            color: theme.colors.text.secondary,
            border: `1px solid ${theme.colors.border.medium}`,
            borderRadius: theme.radius.md,
            cursor: 'pointer',
            fontSize: theme.fontSize.sm,
            fontWeight: theme.fontWeight.medium,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.background.tertiary;
            e.currentTarget.style.borderColor = theme.colors.border.light;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = theme.colors.border.medium;
          }}
        >
          🚪 Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
