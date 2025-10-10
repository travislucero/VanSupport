// Light mode color palette inspired by MAXp branding
export const theme = {
  colors: {
    // Background colors
    background: {
      primary: '#ffffff',      // White background
      secondary: '#ffffff',    // Card background (white)
      tertiary: '#f8f9fa',     // Elevated/hover elements
      hover: '#e9ecef',        // Hover states
    },

    // Border colors
    border: {
      light: '#e5e7eb',
      medium: '#d1d5db',
      dark: '#9ca3af',
    },

    // Text colors
    text: {
      primary: '#1f2937',      // Dark gray - main text
      secondary: '#475569',    // Dark gray - secondary text
      tertiary: '#64748b',     // Medium gray - muted text
    },

    // Accent colors (using navy blue #1e3a5f as primary)
    accent: {
      primary: '#1e3a5f',      // Navy blue
      primaryHover: '#152d47', // Darker navy for hover
      secondary: '#5a8aa3',    // Lighter navy/blue-gray
      secondaryHover: '#4a7a93',
      success: '#059669',      // Green (darker for light bg)
      warning: '#d97706',      // Orange (darker for light bg)
      danger: '#dc2626',       // Red (darker for light bg)
      info: '#0891b2',         // Cyan (darker for light bg)
    },

    // Status colors (adjusted for light background)
    status: {
      online: '#059669',
      offline: '#64748b',
      busy: '#dc2626',
      away: '#d97706',
    },

    // Chart colors (adjusted for light theme with navy primary)
    chart: {
      blue: '#1e3a5f',        // Navy blue
      purple: '#7c3aed',
      green: '#059669',
      orange: '#ea580c',
      pink: '#db2777',
      cyan: '#0891b2',
      yellow: '#ca8a04',
      red: '#dc2626',
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

  // Shadows (softer for light mode)
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
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
