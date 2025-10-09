import React from 'react';
import { theme } from '../styles/theme';

const StatCard = ({ title, value, icon, trend, color = theme.colors.accent.primary }) => {
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
        {icon && (
          <div
            style={{
              width: '48px',
              height: '48px',
              backgroundColor: color + '20',
              borderRadius: theme.radius.lg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
            }}
          >
            {icon}
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
