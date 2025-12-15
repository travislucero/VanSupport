import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  List,
  Target,
  Ticket,
  Users,
  LogOut,
  Truck,
  User,
  Shield,
  ChevronDown,
  ChevronRight,
  Settings,
  MessageSquare
} from 'lucide-react';
import { theme } from '../styles/theme';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const Sidebar = ({ user, onLogout, hasRole }) => {
  const location = useLocation();
  const [adminExpanded, setAdminExpanded] = useState(true);
  const [activeSequencesCount, setActiveSequencesCount] = useState(0);

  // Fetch active sequences count for the badge
  useEffect(() => {
    const fetchActiveCount = async () => {
      if (!hasRole('manager') && !hasRole('admin')) return;

      try {
        const response = await fetch(`${API_BASE_URL}/api/sequences/active`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setActiveSequencesCount(data?.length || 0);
        }
      } catch (error) {
        console.error('Error fetching active sequences count:', error);
      }
    };

    fetchActiveCount();
    // Refresh count every 30 seconds
    const interval = setInterval(fetchActiveCount, 30000);
    return () => clearInterval(interval);
  }, [hasRole]);

  // Top-level menu items (always visible based on role)
  const getTopLevelItems = () => {
    const items = [
      {
        id: 'dashboard',
        label: 'Dashboard',
        Icon: LayoutDashboard,
        path: '/',
        show: true // Always show dashboard
      },
    ];

    // Add Support Tickets for manager and admin
    if (hasRole('manager') || hasRole('admin')) {
      items.push({
        id: 'support-tickets',
        label: 'Support Tickets',
        Icon: Ticket,
        path: '/tickets',
        show: true
      });
    }

    // Add Active Sequences for manager and admin
    if (hasRole('manager') || hasRole('admin')) {
      items.push({
        id: 'active-sequences',
        label: 'Active Sequences',
        Icon: MessageSquare,
        path: '/active-sequences',
        show: true,
        badge: activeSequencesCount > 0 ? activeSequencesCount : null
      });
    }

    return items.filter(item => item.show);
  };

  // Admin submenu items
  const getAdminItems = () => {
    const items = [];

    // Add Sequences for viewer and above
    if (hasRole('viewer') || hasRole('manager') || hasRole('admin')) {
      items.push({
        id: 'sequences',
        label: 'Sequences',
        Icon: List,
        path: '/sequences',
        show: true
      });
    }

    // Add Trigger Patterns for manager and admin
    if (hasRole('manager') || hasRole('admin')) {
      items.push({
        id: 'trigger-patterns',
        label: 'Trigger Patterns',
        Icon: Target,
        path: '/patterns',
        show: true
      });
    }

    // Add Vans for viewer and above
    if (hasRole('viewer') || hasRole('manager') || hasRole('admin')) {
      items.push({
        id: 'vans',
        label: 'Vans',
        Icon: Truck,
        path: '/vans',
        show: true
      });
    }

    // Add Owners for viewer and above
    if (hasRole('viewer') || hasRole('manager') || hasRole('admin')) {
      items.push({
        id: 'owners',
        label: 'Owners',
        Icon: User,
        path: '/owners',
        show: true
      });
    }

    // Add Users for manager and admin
    if (hasRole('manager') || hasRole('admin')) {
      items.push({
        id: 'users',
        label: 'Users',
        Icon: Shield,
        path: '/users',
        show: true
      });
    }

    return items.filter(item => item.show);
  };

  const topLevelItems = getTopLevelItems();
  const adminItems = getAdminItems();
  const shouldShowAdmin = adminItems.length > 0;

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

        {/* Top-Level Menu Items */}
        {topLevelItems.map((item) => {
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
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span style={{
                  backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : theme.colors.accent.primary,
                  color: isActive ? '#fff' : '#fff',
                  padding: '2px 8px',
                  borderRadius: theme.radius.full,
                  fontSize: theme.fontSize.xs,
                  fontWeight: theme.fontWeight.semibold,
                  minWidth: '20px',
                  textAlign: 'center'
                }}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        {/* Admin Submenu */}
        {shouldShowAdmin && (
          <div style={{ marginTop: theme.spacing.sm }}>
            {/* Admin Header - Clickable to expand/collapse */}
            <button
              onClick={() => setAdminExpanded(!adminExpanded)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
                <Settings size={20} />
                <span>Admin</span>
              </div>
              {adminExpanded ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>

            {/* Admin Submenu Items - Only show when expanded */}
            {adminExpanded && (
              <div style={{ marginLeft: theme.spacing.md, marginTop: theme.spacing.xs }}>
                {adminItems.map((item) => {
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
                          ? theme.colors.accent.primaryLight
                          : 'transparent',
                        color: isActive
                          ? theme.colors.accent.primary
                          : theme.colors.text.secondary,
                        border: 'none',
                        borderRadius: theme.radius.md,
                        cursor: 'pointer',
                        fontSize: theme.fontSize.sm,
                        fontWeight: isActive ? theme.fontWeight.medium : theme.fontWeight.normal,
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
                      <Icon size={16} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
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
