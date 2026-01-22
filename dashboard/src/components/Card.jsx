import React from 'react';
import { theme } from '../styles/theme';

const Card = ({
  children,
  title,
  description,
  action,
  icon,
  noPadding = false,
  hoverable = false,
  className,
  style = {},
  headerStyle = {},
  bodyStyle = {},
  id,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  ...restProps
}) => {
  const [isHovered, setIsHovered] = React.useState(false);

  const styles = {
    card: {
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.radius.xl,
      border: `1px solid ${theme.colors.border.light}`,
      overflow: 'visible',
      boxShadow: isHovered && hoverable ? theme.shadows.md : theme.shadows.sm,
      transition: theme.transitions.normal,
      transform: isHovered && hoverable ? 'translateY(-2px)' : 'translateY(0)',
      ...style,
    },
    header: {
      padding: theme.spacing.xl,
      borderBottom: `1px solid ${theme.colors.border.light}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.background.secondary,
      ...headerStyle,
    },
    headerContent: {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing.md,
      flex: 1,
    },
    iconWrapper: {
      width: '40px',
      height: '40px',
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.accent.primaryLight,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: theme.colors.accent.primary,
      flexShrink: 0,
    },
    titleWrapper: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      margin: 0,
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.semibold,
      lineHeight: theme.lineHeight.tight,
    },
    description: {
      margin: '4px 0 0 0',
      color: theme.colors.text.tertiary,
      fontSize: theme.fontSize.sm,
      lineHeight: theme.lineHeight.normal,
    },
    body: {
      padding: noPadding ? 0 : theme.spacing.xl,
      ...bodyStyle,
    },
  };

  return (
    <div
      id={id}
      className={className}
      style={styles.card}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      {...restProps}
    >
      {(title || action || icon) && (
        <div style={styles.header}>
          <div style={styles.headerContent}>
            {icon && (
              <div style={styles.iconWrapper}>
                {React.cloneElement(icon, { size: 20 })}
              </div>
            )}
            <div style={styles.titleWrapper}>
              {title && <h3 style={styles.title}>{title}</h3>}
              {description && <p style={styles.description}>{description}</p>}
            </div>
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div style={styles.body}>
        {children}
      </div>
    </div>
  );
};

// Compact card variant for smaller content
export const CompactCard = ({
  children,
  title,
  className,
  style = {},
}) => {
  const styles = {
    card: {
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.radius.lg,
      border: `1px solid ${theme.colors.border.light}`,
      padding: theme.spacing.lg,
      boxShadow: theme.shadows.xs,
      ...style,
    },
    title: {
      margin: `0 0 ${theme.spacing.md} 0`,
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
    },
  };

  return (
    <div className={className} style={styles.card}>
      {title && <h4 style={styles.title}>{title}</h4>}
      {children}
    </div>
  );
};

export default Card;
