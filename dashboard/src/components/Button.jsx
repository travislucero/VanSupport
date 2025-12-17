import React from 'react';
import { Loader2 } from 'lucide-react';
import { theme } from '../styles/theme';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  type = 'button',
  onClick,
  className,
  style = {},
  ...props
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isPressed, setIsPressed] = React.useState(false);

  const variants = {
    primary: {
      background: theme.colors.accent.primary,
      backgroundHover: theme.colors.accent.primaryHover,
      color: theme.colors.text.inverse,
      border: 'none',
    },
    secondary: {
      background: theme.colors.background.tertiary,
      backgroundHover: theme.colors.background.hover,
      color: theme.colors.text.primary,
      border: `1px solid ${theme.colors.border.medium}`,
    },
    outline: {
      background: 'transparent',
      backgroundHover: theme.colors.accent.primaryLight,
      color: theme.colors.accent.primary,
      border: `1px solid ${theme.colors.accent.primary}`,
    },
    ghost: {
      background: 'transparent',
      backgroundHover: theme.colors.background.tertiary,
      color: theme.colors.text.secondary,
      border: 'none',
    },
    danger: {
      background: theme.colors.accent.danger,
      backgroundHover: '#b91c1c',
      color: theme.colors.text.inverse,
      border: 'none',
    },
    dangerOutline: {
      background: 'transparent',
      backgroundHover: theme.colors.accent.dangerLight,
      color: theme.colors.accent.danger,
      border: `1px solid ${theme.colors.accent.danger}`,
    },
    success: {
      background: theme.colors.accent.success,
      backgroundHover: '#047857',
      color: theme.colors.text.inverse,
      border: 'none',
    },
  };

  const sizes = {
    xs: {
      padding: '4px 10px',
      fontSize: theme.fontSize.xs,
      height: '28px',
      gap: '4px',
      iconSize: 12,
    },
    sm: {
      padding: '6px 12px',
      fontSize: theme.fontSize.sm,
      height: '32px',
      gap: '6px',
      iconSize: 14,
    },
    md: {
      padding: '8px 16px',
      fontSize: theme.fontSize.sm,
      height: '38px',
      gap: '8px',
      iconSize: 16,
    },
    lg: {
      padding: '12px 24px',
      fontSize: theme.fontSize.base,
      height: '46px',
      gap: '10px',
      iconSize: 18,
    },
    xl: {
      padding: '16px 32px',
      fontSize: theme.fontSize.lg,
      height: '54px',
      gap: '12px',
      iconSize: 20,
    },
  };

  const variantStyle = variants[variant] || variants.primary;
  const sizeStyle = sizes[size] || sizes.md;
  const isDisabled = disabled || loading;

  const getBackgroundColor = () => {
    if (isDisabled) return theme.colors.background.tertiary;
    if (isPressed) return variantStyle.backgroundHover;
    if (isHovered) return variantStyle.backgroundHover;
    return variantStyle.background;
  };

  const styles = {
    button: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: sizeStyle.gap,
      padding: sizeStyle.padding,
      height: sizeStyle.height,
      backgroundColor: getBackgroundColor(),
      color: isDisabled ? theme.colors.text.tertiary : variantStyle.color,
      border: variantStyle.border,
      borderRadius: theme.radius.lg,
      fontSize: sizeStyle.fontSize,
      fontWeight: theme.fontWeight.medium,
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      transition: theme.transitions.fast,
      width: fullWidth ? '100%' : 'auto',
      opacity: isDisabled ? 0.6 : 1,
      transform: isPressed && !isDisabled ? 'scale(0.98)' : 'scale(1)',
      boxShadow: variant === 'primary' && !isDisabled ? theme.shadows.sm : 'none',
      outline: 'none',
      textDecoration: 'none',
      whiteSpace: 'nowrap',
      ...style,
    },
    spinner: {
      animation: 'spin 1s linear infinite',
    },
  };

  const renderIcon = (position) => {
    if (loading && position === 'left') {
      return <Loader2 size={sizeStyle.iconSize} style={styles.spinner} />;
    }
    if (icon && iconPosition === position) {
      return React.cloneElement(icon, { size: sizeStyle.iconSize });
    }
    return null;
  };

  return (
    <button
      type={type}
      className={className}
      style={styles.button}
      disabled={isDisabled}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      {...props}
    >
      {renderIcon('left')}
      {children}
      {renderIcon('right')}
    </button>
  );
};

// Icon-only button variant
export const IconButton = ({
  icon,
  variant = 'ghost',
  size = 'md',
  label,
  ...props
}) => {
  const sizes = {
    xs: { size: '24px', iconSize: 12 },
    sm: { size: '32px', iconSize: 16 },
    md: { size: '38px', iconSize: 18 },
    lg: { size: '46px', iconSize: 20 },
  };

  const sizeStyle = sizes[size] || sizes.md;

  return (
    <Button
      variant={variant}
      style={{
        width: sizeStyle.size,
        height: sizeStyle.size,
        padding: 0,
        minWidth: sizeStyle.size,
      }}
      aria-label={label}
      {...props}
    >
      {React.cloneElement(icon, { size: sizeStyle.iconSize })}
    </Button>
  );
};

// Button group for related actions
export const ButtonGroup = ({ children, className, style = {} }) => {
  const styles = {
    group: {
      display: 'inline-flex',
      ...style,
    },
  };

  return (
    <div className={className} style={styles.group} role="group">
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;

        const isFirst = index === 0;
        const isLast = index === React.Children.count(children) - 1;

        return React.cloneElement(child, {
          style: {
            ...child.props.style,
            borderRadius: isFirst
              ? `${theme.radius.lg} 0 0 ${theme.radius.lg}`
              : isLast
              ? `0 ${theme.radius.lg} ${theme.radius.lg} 0`
              : 0,
            marginLeft: isFirst ? 0 : '-1px',
          },
        });
      })}
    </div>
  );
};

export default Button;
