import React from 'react';
import { theme } from '../styles/theme';

const StatCard = ({ title, value, icon, trend, color = theme.colors.accent.primary, iconColor, iconBackground }) => {
  // Define default icon styling based on the card type (by title)
  let defaultIconColor = iconColor;
  let defaultIconBackground = iconBackground;

  if (!iconColor || !iconBackground) {
    if (title === 'Total Calls') {
      defaultIconColor = '#1e3a5f'; // Navy blue
      defaultIconBackground = 'rgba(59, 130, 246, 0.1)'; // Light blue background
    } else if (title === 'Completion Rate') {
      defaultIconColor = '#10b981'; // Green
      defaultIconBackground = 'rgba(16, 185, 129, 0.1)'; // Light green background
    } else if (title === 'Avg Resolution Time') {
      defaultIconColor = '#f59e0b'; // Orange
      defaultIconBackground = 'rgba(245, 158, 11, 0.1)'; // Light orange background
    } else {
      // Fallback to prop-based color
      defaultIconColor = color;
      defaultIconBackground = color + '20';
    }
  }

  // Clone the icon element and apply color styling
  const styledIcon = icon ? React.cloneElement(icon, {
    size: 32,
    color: defaultIconColor,
    style: { opacity: 1 }
  }) : null;

  return (
    <div
      style={{
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.radius.xl,
        border: `1px solid ${theme.colors.border.light}`,
        padding: theme.spacing.lg,
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.md,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: theme.shadows.sm,
      }}
    >
      {/* Background decoration */}
      <div
        style={{
          position: 'absolute',
          top: '-10px',
          right: '-10px',
          width: '100px',
          height: '100px',
          backgroundColor: color,
          opacity: 0.05,
          borderRadius: theme.radius.full,
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div
            style={{
              color: theme.colors.text.secondary,
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.medium,
              marginBottom: theme.spacing.xs,
            }}
          >
            {title}
          </div>
          <div
            style={{
              color: theme.colors.text.primary,
              fontSize: theme.fontSize['3xl'],
              fontWeight: theme.fontWeight.bold,
              lineHeight: 1,
            }}
          >
            {value}
          </div>
        </div>
        {styledIcon && (
          <div
            style={{
              width: '56px',
              height: '56px',
              backgroundColor: defaultIconBackground,
              borderRadius: theme.radius.lg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {styledIcon}
          </div>
        )}
      </div>

      {trend && (
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
          <span
            style={{
              color: trend.isPositive ? theme.colors.accent.success : theme.colors.accent.danger,
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.medium,
            }}
          >
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </span>
          <span style={{ color: theme.colors.text.tertiary, fontSize: theme.fontSize.sm }}>
            {trend.label}
          </span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
