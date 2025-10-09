// Dark mode color palette inspired by modern dashboard design
export const theme = {
  colors: {
    // Background colors
    background: {
      primary: '#0f172a',      // Deep navy background
      secondary: '#1e293b',    // Card background
      tertiary: '#334155',     // Elevated elements
      hover: '#475569',        // Hover states
    },

    // Border colors
    border: {
      light: '#334155',
      medium: '#475569',
      dark: '#1e293b',
    },

    // Text colors
    text: {
      primary: '#f1f5f9',      // Main text
      secondary: '#94a3b8',    // Secondary text
      tertiary: '#64748b',     // Muted text
    },

    // Accent colors
    accent: {
      primary: '#3b82f6',      // Blue
      primaryHover: '#2563eb',
      secondary: '#8b5cf6',    // Purple
      secondaryHover: '#7c3aed',
      success: '#10b981',      // Green
      warning: '#f59e0b',      // Orange
      danger: '#ef4444',       // Red
      info: '#06b6d4',         // Cyan
    },

    // Status colors
    status: {
      online: '#10b981',
      offline: '#64748b',
      busy: '#ef4444',
      away: '#f59e0b',
    },

    // Chart colors
    chart: {
      blue: '#60a5fa',
      purple: '#a78bfa',
      green: '#34d399',
      orange: '#fb923c',
      pink: '#f472b6',
      cyan: '#22d3ee',
      yellow: '#fbbf24',
      red: '#f87171',
    }
  },

  // Border radius
  radius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
  },

  // Spacing
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },

  // Typography
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  },

  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  }
};
