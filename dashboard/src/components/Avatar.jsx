import React from 'react';
import { theme } from '../styles/theme';

const Avatar = ({
  name,
  src,
  size = 'md',
  color,
  status,
  className,
  style = {},
}) => {
  const sizes = {
    xs: { width: '24px', height: '24px', fontSize: theme.fontSize.xs, statusSize: '8px' },
    sm: { width: '32px', height: '32px', fontSize: theme.fontSize.sm, statusSize: '10px' },
    md: { width: '40px', height: '40px', fontSize: theme.fontSize.base, statusSize: '12px' },
    lg: { width: '48px', height: '48px', fontSize: theme.fontSize.lg, statusSize: '14px' },
    xl: { width: '64px', height: '64px', fontSize: theme.fontSize.xl, statusSize: '16px' },
  };

  const colors = [
    theme.colors.accent.primary,
    theme.colors.accent.secondary,
    theme.colors.accent.success,
    theme.colors.accent.info,
    theme.colors.chart.purple,
    theme.colors.chart.pink,
  ];

  const statusColors = {
    online: theme.colors.status.online,
    offline: theme.colors.status.offline,
    busy: theme.colors.status.busy,
    away: theme.colors.status.away,
  };

  // Generate a consistent color based on the name
  const getColor = () => {
    if (color) return color;
    if (!name) return colors[0];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  // Get initials from name
  const getInitials = () => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const sizeStyle = sizes[size] || sizes.md;

  const styles = {
    container: {
      position: 'relative',
      display: 'inline-flex',
      flexShrink: 0,
    },
    avatar: {
      width: sizeStyle.width,
      height: sizeStyle.height,
      borderRadius: theme.radius.full,
      backgroundColor: src ? 'transparent' : getColor(),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: theme.colors.text.inverse,
      fontWeight: theme.fontWeight.semibold,
      fontSize: sizeStyle.fontSize,
      overflow: 'hidden',
      border: `2px solid ${theme.colors.background.secondary}`,
      boxShadow: theme.shadows.sm,
      ...style,
    },
    image: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    },
    status: {
      position: 'absolute',
      bottom: '0',
      right: '0',
      width: sizeStyle.statusSize,
      height: sizeStyle.statusSize,
      borderRadius: theme.radius.full,
      backgroundColor: statusColors[status] || statusColors.offline,
      border: `2px solid ${theme.colors.background.secondary}`,
    },
  };

  return (
    <div className={className} style={styles.container}>
      <div style={styles.avatar}>
        {src ? (
          <img src={src} alt={name || 'Avatar'} style={styles.image} />
        ) : (
          getInitials()
        )}
      </div>
      {status && <div style={styles.status} />}
    </div>
  );
};

// Avatar group for showing multiple avatars overlapping
export const AvatarGroup = ({
  avatars = [],
  max = 4,
  size = 'md',
  className,
  style = {},
}) => {
  const displayAvatars = avatars.slice(0, max);
  const remaining = avatars.length - max;

  const sizes = {
    xs: { offset: '-8px' },
    sm: { offset: '-10px' },
    md: { offset: '-12px' },
    lg: { offset: '-14px' },
    xl: { offset: '-18px' },
  };

  const sizeStyle = sizes[size] || sizes.md;

  const styles = {
    container: {
      display: 'flex',
      alignItems: 'center',
      ...style,
    },
    avatar: (index) => ({
      marginLeft: index === 0 ? 0 : sizeStyle.offset,
      zIndex: displayAvatars.length - index,
    }),
    remaining: {
      marginLeft: sizeStyle.offset,
      zIndex: 0,
    },
  };

  return (
    <div className={className} style={styles.container}>
      {displayAvatars.map((avatar, index) => (
        <div key={index} style={styles.avatar(index)}>
          <Avatar
            name={avatar.name}
            src={avatar.src}
            color={avatar.color}
            size={size}
          />
        </div>
      ))}
      {remaining > 0 && (
        <div style={styles.remaining}>
          <Avatar
            name={`+${remaining}`}
            size={size}
            color={theme.colors.background.tertiary}
            style={{ color: theme.colors.text.secondary }}
          />
        </div>
      )}
    </div>
  );
};

export default Avatar;
