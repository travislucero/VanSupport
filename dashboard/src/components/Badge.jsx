import React from 'react';
import { theme } from '../styles/theme';

const Badge = ({ children, variant = 'default', size = 'md' }) => {
  const variants = {
    default: {
      background: theme.colors.background.tertiary,
      color: theme.colors.text.primary,
    },
    primary: {
      background: theme.colors.accent.primary,
      color: theme.colors.text.primary,
    },
    success: {
      background: theme.colors.accent.success,
      color: theme.colors.text.primary,
    },
    warning: {
      background: theme.colors.accent.warning,
      color: theme.colors.text.primary,
    },
    danger: {
      background: theme.colors.accent.danger,
      color: theme.colors.text.primary,
    },
    secondary: {
      background: theme.colors.accent.secondary,
      color: theme.colors.text.primary,
    },
  };

  const sizes = {
    sm: {
      padding: '2px 8px',
      fontSize: theme.fontSize.xs,
    },
    md: {
      padding: '4px 12px',
      fontSize: theme.fontSize.sm,
    },
  };

  const style = variants[variant] || variants.default;
  const sizeStyle = sizes[size] || sizes.md;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: style.background,
        color: style.color,
        padding: sizeStyle.padding,
        borderRadius: theme.radius.full,
        fontSize: sizeStyle.fontSize,
        fontWeight: theme.fontWeight.medium,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
};

export default Badge;
