import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { theme } from '../styles/theme';

const ToastContext = createContext(null);

let toastId = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = toastId++;
    const toast = { id, message, type, duration };

    setToasts((prev) => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, [removeToast]);

  const success = useCallback((message, duration) => showToast(message, 'success', duration), [showToast]);
  const error = useCallback((message, duration) => showToast(message, 'error', duration), [showToast]);
  const warning = useCallback((message, duration) => showToast(message, 'warning', duration), [showToast]);
  const info = useCallback((message, duration) => showToast(message, 'info', duration), [showToast]);

  const value = useMemo(() => ({
    showToast,
    success,
    error,
    warning,
    info,
    removeToast,
  }), [showToast, success, error, warning, info, removeToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

const ToastContainer = ({ toasts, removeToast }) => {
  const containerStyle = {
    position: 'fixed',
    top: theme.spacing.lg,
    right: theme.spacing.lg,
    zIndex: theme.zIndex.tooltip + 10,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.sm,
    pointerEvents: 'none',
  };

  return (
    <div style={containerStyle}>
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const toastColorMap = {
  success: {
    icon: CheckCircle,
    bg: theme.colors.accent.successLight,
    border: theme.colors.accent.success,
    iconColor: theme.colors.accent.success,
    text: theme.colors.text.primary,
  },
  error: {
    icon: XCircle,
    bg: theme.colors.accent.dangerLight,
    border: theme.colors.accent.danger,
    iconColor: theme.colors.accent.danger,
    text: theme.colors.text.primary,
  },
  warning: {
    icon: AlertTriangle,
    bg: theme.colors.accent.warningLight,
    border: theme.colors.accent.warning,
    iconColor: theme.colors.accent.warning,
    text: theme.colors.text.primary,
  },
  info: {
    icon: Info,
    bg: theme.colors.accent.infoLight,
    border: theme.colors.accent.info,
    iconColor: theme.colors.accent.info,
    text: theme.colors.text.primary,
  },
};

const Toast = ({ toast, onClose }) => {
  const { message, type } = toast;
  const config = toastColorMap[type] || toastColorMap.info;
  const Icon = config.icon;

  const toastStyle = {
    backgroundColor: config.bg,
    borderLeft: `4px solid ${config.border}`,
    borderRadius: theme.radius.lg,
    boxShadow: theme.shadows.lg,
    padding: theme.spacing.lg,
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    minWidth: '300px',
    maxWidth: '448px',
    pointerEvents: 'auto',
    animation: 'slide-in 0.3s ease-out',
  };

  const iconStyle = {
    color: config.iconColor,
    flexShrink: 0,
    marginTop: '2px',
  };

  const messageStyle = {
    color: config.text,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    flex: 1,
    margin: 0,
  };

  const closeButtonStyle = {
    color: config.iconColor,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    flexShrink: 0,
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    opacity: 0.8,
    transition: theme.transitions.fast,
  };

  return (
    <div style={toastStyle} role="alert">
      <Icon size={20} style={iconStyle} />
      <p style={messageStyle}>{message}</p>
      <button
        onClick={onClose}
        style={closeButtonStyle}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.6'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.8'; }}
        aria-label="Close notification"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
};

// Add animation styles to your global CSS or Tailwind config
// For now, we'll add it inline via a style tag
if (typeof document !== 'undefined') {
  const styleId = 'toast-animations';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes slide-in {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      .animate-slide-in {
        animation: slide-in 0.3s ease-out;
      }
    `;
    document.head.appendChild(style);
  }
}
