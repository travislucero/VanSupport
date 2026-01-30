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
import NotificationBell from './NotificationBell';
import { useNotifications } from '../hooks/useNotifications.jsx';
import { useToast } from '../hooks/useToast.jsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const SIDEBAR_WIDTH = '260px';

const Sidebar = ({ user, onLogout, hasRole, isSiteAdmin }) => {
  const location = useLocation();
  const [adminExpanded, setAdminExpanded] = useState(true);
  const [activeSequencesCount, setActiveSequencesCount] = useState(0);

  const toast = useToast();
  const {
    notifications,
    unreadCount,
    newNotifications,
    clearNewNotifications,
    markAsRead,
    markAllAsRead,
    dismissAll,
  } = useNotifications(!!user);

  // Helper to check if user can access a feature (site_admin bypasses all)
  const canAccess = (roles) => {
    if (isSiteAdmin && isSiteAdmin()) return true;
    return roles.some(role => hasRole(role));
  };

  // Fetch active sequences count for the badge
  useEffect(() => {
    const fetchActiveCount = async () => {
      // Technician, manager, and admin can see active sequences
      const hasAccess = (isSiteAdmin && isSiteAdmin()) ||
        ['technician', 'manager', 'admin'].some(role => hasRole(role));
      if (!hasAccess) return;

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
  }, [hasRole, isSiteAdmin]);

  // Dismiss notifications when navigating to tickets page
  useEffect(() => {
    if (location.pathname.startsWith('/tickets')) {
      dismissAll();
    }
  }, [location.pathname, dismissAll]);

  // Show toast for new broadcast notifications
  useEffect(() => {
    if (newNotifications.length > 0) {
      newNotifications.forEach((n) => {
        toast.info(n.message_body, 5000);
      });
      clearNewNotifications();
    }
  }, [newNotifications, clearNewNotifications, toast]);

  // Top-level menu items (always visible based on role)
  const getTopLevelItems = () => {
    const items = [];

    // Dashboard for admin and manager only (not technician)
    if (canAccess(['admin', 'manager'])) {
      items.push({
        id: 'dashboard',
        label: 'Dashboard',
        Icon: LayoutDashboard,
        path: '/',
        show: true
      });
    }

    // Support Tickets for technician, manager, and admin
    if (canAccess(['technician', 'manager', 'admin'])) {
      items.push({
        id: 'support-tickets',
        label: 'Support Tickets',
        Icon: Ticket,
        path: '/tickets',
        show: true
      });
    }

    // Active Sequences for technician, manager, and admin
    if (canAccess(['technician', 'manager', 'admin'])) {
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

    // Sequences for technician, manager, admin
    if (canAccess(['technician', 'manager', 'admin'])) {
      items.push({
        id: 'sequences',
        label: 'Sequences',
        Icon: List,
        path: '/sequences',
        show: true
      });
    }

    // Trigger Patterns for admin only
    if (canAccess(['admin'])) {
      items.push({
        id: 'trigger-patterns',
        label: 'Trigger Patterns',
        Icon: Target,
        path: '/patterns',
        show: true
      });
    }

    // Vans for technician, manager, admin
    if (canAccess(['technician', 'manager', 'admin'])) {
      items.push({
        id: 'vans',
        label: 'Vans',
        Icon: Truck,
        path: '/vans',
        show: true
      });
    }

    // Owners for technician, manager, admin
    if (canAccess(['technician', 'manager', 'admin'])) {
      items.push({
        id: 'owners',
        label: 'Owners',
        Icon: User,
        path: '/owners',
        show: true
      });
    }

    // Users for admin only
    if (canAccess(['admin'])) {
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

  // Styles
  const styles = {
    sidebar: {
      width: SIDEBAR_WIDTH,
      height: '100vh',
      backgroundColor: theme.colors.background.secondary,
      borderRight: `1px solid ${theme.colors.border.light}`,
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0,
      top: 0,
      overflowY: 'auto',
      zIndex: theme.zIndex.fixed,
      boxShadow: theme.shadows.sm,
    },
    brand: {
      padding: theme.spacing['2xl'],
      borderBottom: `1px solid ${theme.colors.border.light}`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      backgroundColor: theme.colors.background.secondary,
    },
    logo: {
      height: '48px',
      width: 'auto',
      marginBottom: theme.spacing.sm,
    },
    brandName: {
      margin: 0,
      fontSize: theme.fontSize['2xl'],
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.accent.primary,
      letterSpacing: '0.05em',
    },
    brandTagline: {
      color: theme.colors.text.tertiary,
      fontSize: theme.fontSize.xs,
      marginTop: theme.spacing.xs,
      fontWeight: theme.fontWeight.medium,
      textAlign: 'center',
    },
    userSection: {
      padding: theme.spacing.xl,
      borderBottom: `1px solid ${theme.colors.border.light}`,
      backgroundColor: theme.colors.background.tertiary,
    },
    userInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    avatar: {
      width: '44px',
      height: '44px',
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.accent.primary,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: theme.colors.text.inverse,
      fontWeight: theme.fontWeight.semibold,
      fontSize: theme.fontSize.lg,
      boxShadow: theme.shadows.sm,
    },
    userDetails: {
      flex: 1,
      minWidth: 0,
    },
    userName: {
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    userRole: {
      color: theme.colors.text.tertiary,
      fontSize: theme.fontSize.xs,
      marginTop: '2px',
      textTransform: 'capitalize',
    },
    navigation: {
      padding: theme.spacing.lg,
      flex: 1,
    },
    sectionLabel: {
      color: theme.colors.text.tertiary,
      fontSize: theme.fontSize.xs,
      fontWeight: theme.fontWeight.semibold,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      marginBottom: theme.spacing.md,
      paddingLeft: theme.spacing.md,
    },
    navItem: (isActive) => ({
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing.md,
      padding: `${theme.spacing.md} ${theme.spacing.lg}`,
      backgroundColor: isActive ? theme.colors.accent.primaryLight : 'transparent',
      color: isActive ? theme.colors.accent.primary : theme.colors.text.secondary,
      border: 'none',
      borderRadius: theme.radius.lg,
      cursor: 'pointer',
      fontSize: theme.fontSize.sm,
      fontWeight: isActive ? theme.fontWeight.semibold : theme.fontWeight.medium,
      marginBottom: theme.spacing.xs,
      transition: theme.transitions.fast,
      textAlign: 'left',
      textDecoration: 'none',
      position: 'relative',
    }),
    navItemActive: {
      boxShadow: `inset 3px 0 0 ${theme.colors.accent.primary}`,
    },
    badge: (isActive) => ({
      backgroundColor: isActive ? theme.colors.accent.primary : theme.colors.background.tertiary,
      color: isActive ? theme.colors.text.inverse : theme.colors.text.secondary,
      padding: '2px 8px',
      borderRadius: theme.radius.full,
      fontSize: theme.fontSize.xs,
      fontWeight: theme.fontWeight.semibold,
      minWidth: '20px',
      textAlign: 'center',
    }),
    adminHeader: {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: `${theme.spacing.md} ${theme.spacing.lg}`,
      backgroundColor: 'transparent',
      color: theme.colors.text.secondary,
      border: 'none',
      borderRadius: theme.radius.lg,
      cursor: 'pointer',
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.medium,
      marginBottom: theme.spacing.xs,
      transition: theme.transitions.fast,
      textAlign: 'left',
    },
    adminSubmenu: {
      marginLeft: theme.spacing.lg,
      marginTop: theme.spacing.xs,
      paddingLeft: theme.spacing.md,
      borderLeft: `2px solid ${theme.colors.border.light}`,
    },
    subNavItem: (isActive) => ({
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing.md,
      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
      backgroundColor: isActive ? theme.colors.accent.primaryLight : 'transparent',
      color: isActive ? theme.colors.accent.primary : theme.colors.text.secondary,
      border: 'none',
      borderRadius: theme.radius.md,
      cursor: 'pointer',
      fontSize: theme.fontSize.sm,
      fontWeight: isActive ? theme.fontWeight.medium : theme.fontWeight.normal,
      marginBottom: theme.spacing.xs,
      transition: theme.transitions.fast,
      textAlign: 'left',
      textDecoration: 'none',
    }),
    logoutSection: {
      padding: theme.spacing.lg,
      borderTop: `1px solid ${theme.colors.border.light}`,
      backgroundColor: theme.colors.background.secondary,
    },
    logoutButton: {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      padding: `${theme.spacing.md} ${theme.spacing.lg}`,
      backgroundColor: 'transparent',
      color: theme.colors.text.secondary,
      border: `1px solid ${theme.colors.border.medium}`,
      borderRadius: theme.radius.lg,
      cursor: 'pointer',
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.medium,
      transition: theme.transitions.fast,
    },
  };

  return (
    <nav aria-label="Main navigation" style={styles.sidebar}>
      {/* Logo/Brand */}
      <div style={styles.brand}>
        <img
          src="/max-logo-small.png"
          alt="MAX Logo"
          style={styles.logo}
        />
        <h1 style={styles.brandName}>MAX</h1>
        <div style={styles.brandTagline}>
          Mobile AI Xpress Support
        </div>
      </div>

      {/* User Profile */}
      {user && (
        <div style={styles.userSection}>
          <div style={styles.userInfo}>
            <div style={styles.avatar}>
              {user.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div style={styles.userDetails}>
              <div style={styles.userName}>
                {user.email?.split('@')[0] || 'User'}
              </div>
              {user.roles && user.roles.length > 0 && (
                <div style={styles.userRole}>
                  {user.roles[0].name}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notification Bell */}
      {user && (
        <div style={{
          padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}>
          <NotificationBell
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
          />
        </div>
      )}

      {/* Navigation Menu */}
      <div style={styles.navigation}>
        <div style={styles.sectionLabel}>Navigation</div>

        {/* Top-Level Menu Items */}
        {topLevelItems.map((item) => {
          const Icon = item.Icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.id}
              to={item.path}
              style={{
                ...styles.navItem(isActive),
                ...(isActive ? styles.navItemActive : {}),
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = theme.colors.background.tertiary;
                  e.currentTarget.style.color = theme.colors.text.primary;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = theme.colors.text.secondary;
                }
              }}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span style={styles.badge(isActive)}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        {/* Admin Submenu */}
        {shouldShowAdmin && (
          <div style={{ marginTop: theme.spacing.lg }}>
            {/* Admin Header - Clickable to expand/collapse */}
            <button
              onClick={() => setAdminExpanded(!adminExpanded)}
              style={styles.adminHeader}
              aria-expanded={adminExpanded}
              aria-controls="admin-submenu"
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
              <div id="admin-submenu" role="group" style={styles.adminSubmenu}>
                {adminItems.map((item) => {
                  const Icon = item.Icon;
                  const isActive = location.pathname === item.path;

                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      style={styles.subNavItem(isActive)}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = theme.colors.background.tertiary;
                          e.currentTarget.style.color = theme.colors.text.primary;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = theme.colors.text.secondary;
                        }
                      }}
                    >
                      <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
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
      <div style={styles.logoutSection}>
        <button
          onClick={onLogout}
          style={styles.logoutButton}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.accent.dangerLight;
            e.currentTarget.style.borderColor = theme.colors.accent.danger;
            e.currentTarget.style.color = theme.colors.accent.danger;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = theme.colors.border.medium;
            e.currentTarget.style.color = theme.colors.text.secondary;
          }}
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </nav>
  );
};

export default Sidebar;
