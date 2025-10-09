import React from 'react';
import { theme } from '../styles/theme';

const Avatar = ({ name, size = 'md', color }) => {
  const sizes = {
    sm: { width: '32px', height: '32px', fontSize: theme.fontSize.sm },
    md: { width: '40px', height: '40px', fontSize: theme.fontSize.base },
    lg: { width: '48px', height: '48px', fontSize: theme.fontSize.lg },
  };

  const colors = [
    theme.colors.accent.primary,
    theme.colors.accent.secondary,
    theme.colors.accent.success,
    theme.colors.accent.warning,
    theme.colors.chart.pink,
    theme.colors.chart.cyan,
  ];

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

  return (
    <div
      style={{
        width: sizes[size].width,
        height: sizes[size].height,
        borderRadius: theme.radius.full,
        backgroundColor: getColor(),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: theme.colors.text.primary,
        fontWeight: theme.fontWeight.semibold,
        fontSize: sizes[size].fontSize,
        flexShrink: 0,
      }}
    >
      {getInitials()}
    </div>
  );
};

export default Avatar;
