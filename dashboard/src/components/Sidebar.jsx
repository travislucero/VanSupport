import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { LayoutDashboard, List, Target, Ticket, Users, LogOut } from 'lucide-react';
import { theme } from '../styles/theme';

const Sidebar = ({ user, onLogout, hasRole }) => {
  const location = useLocation();

  // Build menu items based on user role
  const getMenuItems = () => {
    const items = [
      {
        id: 'dashboard',
        label: 'Dashboard',
        Icon: LayoutDashboard,
        path: '/',
        roles: ['viewer', 'manager', 'admin'] // All roles
      },
    ];

    // Add Sequences for viewer and above
    if (hasRole('viewer') || hasRole('manager') || hasRole('admin')) {
      items.push({
        id: 'sequences',
        label: 'Sequences',
        Icon: List,
        path: '/sequences',
        roles: ['viewer', 'manager', 'admin']
      });
    }

    // Add Trigger Patterns for manager and admin
    if (hasRole('manager') || hasRole('admin')) {
      items.push({
        id: 'trigger-patterns',
        label: 'Trigger Patterns',
        Icon: Target,
        path: '/patterns',
        roles: ['manager', 'admin']
      });
    }

    // Add Support Tickets for manager and admin
    if (hasRole('manager') || hasRole('admin')) {
      items.push({
        id: 'support-tickets',
        label: 'Support Tickets',
        Icon: Ticket,
        path: '/tickets',
        roles: ['manager', 'admin']
      });
    }

    // Add Manage Users for admin
    if (hasRole('admin')) {
      items.push({
        id: 'manage-users',
        label: 'Manage Users',
        Icon: Users,
        path: '/admin/users',
        roles: ['admin']
      });
    }

    return items;
  };

  const menuItems = getMenuItems();

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
        zIndex: 10,
      }}
    >
      {/* Logo/Brand */}
      <div
        style={{
          padding: theme.spacing.xl,
          borderBottom: `1px solid ${theme.colors.border.light}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <img
          src="/max-logo-small.png"
          alt="MAX Logo"
          style={{
            height: '48px',
            width: 'auto',
            marginBottom: theme.spacing.sm,
          }}
        />
        <h1
          style={{
            margin: 0,
            fontSize: theme.fontSize['2xl'],
            fontWeight: theme.fontWeight.bold,
            color: theme.colors.accent.primary,
            letterSpacing: '0.05em',
          }}
        >
          MAX
        </h1>
        <div
          style={{
            color: theme.colors.text.tertiary,
            fontSize: theme.fontSize.xs,
            marginTop: theme.spacing.xs,
            fontWeight: theme.fontWeight.medium,
            textAlign: 'center',
          }}
        >
          Mobile AI Xpress Support
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
                color: '#ffffff',
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

      {/* Navigation Menu */}
      <div style={{ padding: theme.spacing.lg, flex: 1 }}>
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
          Navigation
        </div>
        {menuItems.map((item) => {
          const Icon = item.Icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.id}
              to={item.path}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.md,
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                backgroundColor: isActive
                  ? theme.colors.accent.primary
                  : 'transparent',
                color: isActive
                  ? '#ffffff'
                  : theme.colors.text.secondary,
                border: 'none',
                borderRadius: theme.radius.md,
                cursor: 'pointer',
                fontSize: theme.fontSize.sm,
                fontWeight: theme.fontWeight.medium,
                marginBottom: theme.spacing.xs,
                transition: 'all 0.2s',
                textAlign: 'left',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = theme.colors.background.tertiary;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Logout Button */}
      <div style={{ padding: theme.spacing.lg, borderTop: `1px solid ${theme.colors.border.light}` }}>
        <button
          onClick={onLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing.sm,
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
            e.currentTarget.style.borderColor = theme.colors.border.dark;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = theme.colors.border.medium;
          }}
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
