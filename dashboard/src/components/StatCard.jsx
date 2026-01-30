import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { theme, hexToRgba } from '../styles/theme';

const StatCard = ({
  title,
  value,
  icon,
  trend,
  color = theme.colors.accent.primary,
  subtitle,
  loading = false,
}) => {
  // Generate background color from the main color
  const getBackgroundColor = (baseColor) => {
    // Use the light variants from theme if available, otherwise create a light version
    if (baseColor === theme.colors.accent.primary) return theme.colors.accent.primaryLight;
    if (baseColor === theme.colors.accent.success) return theme.colors.accent.successLight;
    if (baseColor === theme.colors.accent.warning) return theme.colors.accent.warningLight;
    if (baseColor === theme.colors.accent.danger) return theme.colors.accent.dangerLight;
    if (baseColor === theme.colors.accent.info) return theme.colors.accent.infoLight;
    return hexToRgba(baseColor, 0.08);
  };

  const styles = {
    card: {
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.radius.xl,
      border: `1px solid ${theme.colors.border.light}`,
      padding: theme.spacing.xl,
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing.lg,
      position: 'relative',
      overflow: 'hidden',
      boxShadow: theme.shadows.sm,
      transition: theme.transitions.normal,
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    content: {
      flex: 1,
    },
    title: {
      color: theme.colors.text.secondary,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.medium,
      marginBottom: theme.spacing.sm,
      letterSpacing: '0.01em',
    },
    value: {
      color: theme.colors.text.primary,
      fontSize: theme.fontSize['3xl'],
      fontWeight: theme.fontWeight.bold,
      lineHeight: 1,
      letterSpacing: '-0.02em',
    },
    subtitle: {
      color: theme.colors.text.tertiary,
      fontSize: theme.fontSize.xs,
      marginTop: theme.spacing.sm,
    },
    iconWrapper: {
      width: '52px',
      height: '52px',
      backgroundColor: getBackgroundColor(color),
      borderRadius: theme.radius.lg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    trend: {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    trendValue: (isPositive) => ({
      color: isPositive ? theme.colors.accent.success : theme.colors.accent.danger,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      display: 'flex',
      alignItems: 'center',
      gap: '2px',
    }),
    trendLabel: {
      color: theme.colors.text.tertiary,
      fontSize: theme.fontSize.sm,
    },
    loadingValue: {
      height: '36px',
      width: '80px',
      backgroundColor: theme.colors.background.tertiary,
      borderRadius: theme.radius.md,
      animation: 'pulse 2s ease-in-out infinite',
    },
    decorativeCircle: {
      position: 'absolute',
      top: '-20px',
      right: '-20px',
      width: '100px',
      height: '100px',
      backgroundColor: color,
      opacity: 0.03,
      borderRadius: theme.radius.full,
      pointerEvents: 'none',
    },
  };

  // Clone the icon element and apply color styling
  const styledIcon = icon ? React.cloneElement(icon, {
    size: 26,
    color: color,
    strokeWidth: 2,
  }) : null;

  return (
    <div style={styles.card}>
      {/* Decorative background element */}
      <div style={styles.decorativeCircle} />

      <div style={styles.header}>
        <div style={styles.content}>
          <div style={styles.title}>{title}</div>
          {loading ? (
            <div style={styles.loadingValue} />
          ) : (
            <div style={styles.value}>{value}</div>
          )}
          {subtitle && <div style={styles.subtitle}>{subtitle}</div>}
        </div>
        {styledIcon && (
          <div style={styles.iconWrapper}>
            {styledIcon}
          </div>
        )}
      </div>

      {trend && (
        <div style={styles.trend}>
          <span style={styles.trendValue(trend.isPositive)}>
            {trend.isPositive ? (
              <TrendingUp size={14} />
            ) : (
              <TrendingDown size={14} />
            )}
            {trend.value}
          </span>
          {trend.label && (
            <span style={styles.trendLabel}>{trend.label}</span>
          )}
        </div>
      )}
    </div>
  );
};

// Mini stat for inline displays
export const MiniStat = ({ label, value, color = theme.colors.text.primary }) => {
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing.xs,
    },
    label: {
      color: theme.colors.text.tertiary,
      fontSize: theme.fontSize.xs,
      fontWeight: theme.fontWeight.medium,
    },
    value: {
      color: color,
      fontSize: theme.fontSize.xl,
      fontWeight: theme.fontWeight.bold,
    },
  };

  return (
    <div style={styles.container}>
      <span style={styles.label}>{label}</span>
      <span style={styles.value}>{value}</span>
    </div>
  );
};

export default StatCard;
