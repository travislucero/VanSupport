import React from 'react';
import { theme } from '../styles/theme';

const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  soft = false,
  dot = false,
  icon,
  className,
  style = {},
}) => {
  // Solid variants (filled background, white text)
  const solidVariants = {
    default: {
      background: theme.colors.background.tertiary,
      color: theme.colors.text.primary,
    },
    primary: {
      background: theme.colors.accent.primary,
      color: theme.colors.text.inverse,
    },
    success: {
      background: theme.colors.accent.success,
      color: theme.colors.text.inverse,
    },
    warning: {
      background: theme.colors.accent.warning,
      color: theme.colors.text.inverse,
    },
    danger: {
      background: theme.colors.accent.danger,
      color: theme.colors.text.inverse,
    },
    info: {
      background: theme.colors.accent.info,
      color: theme.colors.text.inverse,
    },
    secondary: {
      background: theme.colors.accent.secondary,
      color: theme.colors.text.inverse,
    },
  };

  // Soft variants (light background, colored text)
  const softVariants = {
    default: {
      background: theme.colors.background.tertiary,
      color: theme.colors.text.secondary,
    },
    primary: {
      background: theme.colors.accent.primaryLight,
      color: theme.colors.accent.primary,
    },
    success: {
      background: theme.colors.accent.successLight,
      color: theme.colors.accent.success,
    },
    warning: {
      background: theme.colors.accent.warningLight,
      color: theme.colors.accent.warning,
    },
    danger: {
      background: theme.colors.accent.dangerLight,
      color: theme.colors.accent.danger,
    },
    info: {
      background: theme.colors.accent.infoLight,
      color: theme.colors.accent.info,
    },
    secondary: {
      background: theme.colors.background.tertiary,
      color: theme.colors.accent.secondary,
    },
  };

  const sizes = {
    xs: {
      padding: '1px 6px',
      fontSize: '10px',
      gap: '3px',
    },
    sm: {
      padding: '2px 8px',
      fontSize: theme.fontSize.xs,
      gap: '4px',
    },
    md: {
      padding: '4px 10px',
      fontSize: theme.fontSize.sm,
      gap: '5px',
    },
    lg: {
      padding: '6px 14px',
      fontSize: theme.fontSize.base,
      gap: '6px',
    },
  };

  const variants = soft ? softVariants : solidVariants;
  const variantStyle = variants[variant] || variants.default;
  const sizeStyle = sizes[size] || sizes.md;

  const styles = {
    badge: {
      display: 'inline-flex',
      alignItems: 'center',
      backgroundColor: variantStyle.background,
      color: variantStyle.color,
      padding: sizeStyle.padding,
      borderRadius: theme.radius.full,
      fontSize: sizeStyle.fontSize,
      fontWeight: theme.fontWeight.medium,
      whiteSpace: 'nowrap',
      gap: sizeStyle.gap,
      lineHeight: 1.4,
      ...style,
    },
    dot: {
      width: size === 'xs' ? '4px' : size === 'sm' ? '5px' : '6px',
      height: size === 'xs' ? '4px' : size === 'sm' ? '5px' : '6px',
      borderRadius: theme.radius.full,
      backgroundColor: 'currentColor',
      flexShrink: 0,
    },
  };

  return (
    <span className={className} style={styles.badge}>
      {dot && <span style={styles.dot} />}
      {icon && React.cloneElement(icon, { size: size === 'xs' ? 10 : size === 'sm' ? 12 : 14 })}
      {children}
    </span>
  );
};

// Status badge specifically for online/offline/busy/away states
export const StatusBadge = ({ status, showLabel = true, size = 'sm' }) => {
  const statusConfig = {
    online: { variant: 'success', label: 'Online' },
    offline: { variant: 'default', label: 'Offline' },
    busy: { variant: 'danger', label: 'Busy' },
    away: { variant: 'warning', label: 'Away' },
    active: { variant: 'success', label: 'Active' },
    inactive: { variant: 'default', label: 'Inactive' },
    pending: { variant: 'warning', label: 'Pending' },
    completed: { variant: 'success', label: 'Completed' },
    failed: { variant: 'danger', label: 'Failed' },
    processing: { variant: 'info', label: 'Processing' },
  };

  const config = statusConfig[status] || statusConfig.offline;

  return (
    <Badge variant={config.variant} size={size} soft dot>
      {showLabel && config.label}
    </Badge>
  );
};

// Count badge for notifications
export const CountBadge = ({ count, max = 99, variant = 'danger' }) => {
  const displayCount = count > max ? `${max}+` : count;

  if (!count || count <= 0) return null;

  return (
    <Badge variant={variant} size="xs">
      {displayCount}
    </Badge>
  );
};

export default Badge;
