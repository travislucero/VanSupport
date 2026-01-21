// Professional light theme for VanSupport Dashboard
// Designed for a professional van service company with white logo background

export const theme = {
  colors: {
    // Background colors - soft grays for depth
    background: {
      page: '#f8fafc',        // Soft gray page background
      primary: '#f8fafc',     // Main background
      secondary: '#ffffff',   // Card/elevated surfaces
      tertiary: '#f1f5f9',    // Subtle backgrounds
      hover: '#e2e8f0',       // Hover states
      muted: '#f8fafc',       // Muted backgrounds
    },

    // Border colors - refined grays
    border: {
      light: '#e2e8f0',
      medium: '#cbd5e1',
      dark: '#94a3b8',
      focus: '#1e3a5f',
    },

    // Text colors - high contrast for readability
    text: {
      primary: '#0f172a',     // Near black - main text
      secondary: '#475569',   // Dark gray - secondary text
      tertiary: '#64748b',    // Medium gray - muted text
      inverse: '#ffffff',     // White text on dark backgrounds
      link: '#1e3a5f',        // Link color
    },

    // Accent colors - navy blue primary with supporting colors
    accent: {
      primary: '#1e3a5f',         // Navy blue - main brand
      primaryHover: '#152d47',    // Darker navy for hover
      primaryLight: '#e8f0f8',    // Light navy for backgrounds
      primaryMuted: '#dbeafe',    // Very light blue
      secondary: '#5a8aa3',       // Lighter blue-gray
      secondaryHover: '#4a7a93',
      success: '#059669',         // Green
      successHover: '#047857',    // Darker green for hover states
      successLight: '#d1fae5',    // Light green background
      warning: '#d97706',         // Orange
      warningLight: '#fef3c7',    // Light orange background
      danger: '#dc2626',          // Red
      dangerLight: '#fee2e2',     // Light red background
      info: '#0891b2',            // Cyan
      infoLight: '#cffafe',       // Light cyan background
    },

    // Status colors
    status: {
      online: '#059669',
      onlineLight: '#d1fae5',
      offline: '#64748b',
      offlineLight: '#f1f5f9',
      busy: '#dc2626',
      busyLight: '#fee2e2',
      away: '#d97706',
      awayLight: '#fef3c7',
    },

    // Chart colors - vibrant but professional
    chart: {
      blue: '#1e3a5f',
      lightBlue: '#3b82f6',
      purple: '#7c3aed',
      green: '#059669',
      orange: '#ea580c',
      pink: '#db2777',
      cyan: '#0891b2',
      yellow: '#ca8a04',
      red: '#dc2626',
      gray: '#64748b',
    }
  },

  // Border radius - slightly larger for modern feel
  radius: {
    xs: '4px',
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '20px',
    full: '9999px',
  },

  // Shadows - subtle and layered
  shadows: {
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
    focus: '0 0 0 3px rgba(30, 58, 95, 0.15)',
  },

  // Spacing scale
  spacing: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '0.75rem',    // 12px
    lg: '1rem',       // 16px
    xl: '1.5rem',     // 24px
    '2xl': '2rem',    // 32px
    '3xl': '2.5rem',  // 40px
    '4xl': '3rem',    // 48px
  },

  // Typography
  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',     // 48px
  },

  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },

  // Transitions
  transitions: {
    fast: '150ms ease',
    normal: '200ms ease',
    slow: '300ms ease',
    bounce: '300ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  // Z-index scale
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modal: 1040,
    popover: 1050,
    tooltip: 1060,
  },

  // Breakpoints for responsive design
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
};

// Helper function to create rgba from hex
export const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Common style mixins
export const mixins = {
  // Focus ring style
  focusRing: {
    outline: 'none',
    boxShadow: theme.shadows.focus,
  },

  // Card base style
  card: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.xl,
    border: `1px solid ${theme.colors.border.light}`,
    boxShadow: theme.shadows.sm,
  },

  // Button base style
  buttonBase: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: theme.fontWeight.medium,
    borderRadius: theme.radius.md,
    transition: theme.transitions.fast,
    cursor: 'pointer',
    border: 'none',
  },

  // Input base style
  inputBase: {
    width: '100%',
    backgroundColor: theme.colors.background.secondary,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.radius.md,
    fontSize: theme.fontSize.base,
    color: theme.colors.text.primary,
    transition: theme.transitions.fast,
  },

  // Truncate text
  truncate: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  // Flex center
  flexCenter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Flex between
  flexBetween: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
};
