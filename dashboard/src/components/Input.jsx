import React, { forwardRef, useState } from 'react';
import { Eye, EyeOff, Search, X } from 'lucide-react';
import { theme } from '../styles/theme';

const Input = forwardRef(({
  type = 'text',
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  onFocus,
  error,
  helperText,
  disabled = false,
  required = false,
  icon,
  iconPosition = 'left',
  clearable = false,
  onClear,
  size = 'md',
  fullWidth = true,
  className,
  style = {},
  inputStyle = {},
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === 'password';
  const isSearch = type === 'search';
  const hasValue = value && value.length > 0;

  const sizes = {
    sm: {
      height: '34px',
      padding: '8px 12px',
      fontSize: theme.fontSize.sm,
      iconSize: 14,
      labelSize: theme.fontSize.xs,
    },
    md: {
      height: '42px',
      padding: '10px 14px',
      fontSize: theme.fontSize.base,
      iconSize: 16,
      labelSize: theme.fontSize.sm,
    },
    lg: {
      height: '50px',
      padding: '12px 16px',
      fontSize: theme.fontSize.lg,
      iconSize: 18,
      labelSize: theme.fontSize.sm,
    },
  };

  const sizeStyle = sizes[size] || sizes.md;

  const getBorderColor = () => {
    if (error) return theme.colors.accent.danger;
    if (isFocused) return theme.colors.accent.primary;
    return theme.colors.border.medium;
  };

  const getBoxShadow = () => {
    if (error && isFocused) return `0 0 0 3px ${theme.colors.accent.dangerLight}`;
    if (isFocused) return theme.shadows.focus;
    return 'none';
  };

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing.sm,
      width: fullWidth ? '100%' : 'auto',
      ...style,
    },
    labelWrapper: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    label: {
      color: error ? theme.colors.accent.danger : theme.colors.text.primary,
      fontSize: sizeStyle.labelSize,
      fontWeight: theme.fontWeight.medium,
    },
    required: {
      color: theme.colors.accent.danger,
      marginLeft: '2px',
    },
    inputWrapper: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
    },
    input: {
      width: '100%',
      height: sizeStyle.height,
      padding: sizeStyle.padding,
      paddingLeft: icon && iconPosition === 'left' ? `calc(${sizeStyle.padding} + 24px)` : sizeStyle.padding,
      paddingRight: (isPassword || clearable || (icon && iconPosition === 'right'))
        ? `calc(${sizeStyle.padding} + 28px)`
        : sizeStyle.padding,
      backgroundColor: disabled ? theme.colors.background.tertiary : theme.colors.background.secondary,
      border: `1px solid ${getBorderColor()}`,
      borderRadius: theme.radius.lg,
      fontSize: sizeStyle.fontSize,
      color: disabled ? theme.colors.text.tertiary : theme.colors.text.primary,
      outline: 'none',
      transition: theme.transitions.fast,
      boxShadow: getBoxShadow(),
      cursor: disabled ? 'not-allowed' : 'text',
      ...inputStyle,
    },
    iconLeft: {
      position: 'absolute',
      left: '12px',
      color: isFocused ? theme.colors.accent.primary : theme.colors.text.tertiary,
      pointerEvents: 'none',
      transition: theme.transitions.fast,
    },
    iconRight: {
      position: 'absolute',
      right: '12px',
      color: theme.colors.text.tertiary,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4px',
      borderRadius: theme.radius.sm,
      transition: theme.transitions.fast,
    },
    helperText: {
      fontSize: theme.fontSize.xs,
      color: error ? theme.colors.accent.danger : theme.colors.text.tertiary,
      marginTop: '-2px',
    },
  };

  const handleFocus = (e) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const handleClear = () => {
    onClear?.();
    onChange?.({ target: { value: '' } });
  };

  const renderLeftIcon = () => {
    if (isSearch) {
      return (
        <div style={styles.iconLeft}>
          <Search size={sizeStyle.iconSize} />
        </div>
      );
    }
    if (icon && iconPosition === 'left') {
      return (
        <div style={styles.iconLeft}>
          {React.cloneElement(icon, { size: sizeStyle.iconSize })}
        </div>
      );
    }
    return null;
  };

  const renderRightIcon = () => {
    if (isPassword) {
      return (
        <div
          style={styles.iconRight}
          onClick={() => setShowPassword(!showPassword)}
          role="button"
          tabIndex={-1}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.background.tertiary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {showPassword ? (
            <EyeOff size={sizeStyle.iconSize} />
          ) : (
            <Eye size={sizeStyle.iconSize} />
          )}
        </div>
      );
    }
    if (clearable && hasValue) {
      return (
        <div
          style={styles.iconRight}
          onClick={handleClear}
          role="button"
          tabIndex={-1}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.background.tertiary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <X size={sizeStyle.iconSize} />
        </div>
      );
    }
    if (icon && iconPosition === 'right') {
      return (
        <div style={{ ...styles.iconRight, cursor: 'default', pointerEvents: 'none' }}>
          {React.cloneElement(icon, { size: sizeStyle.iconSize })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={className} style={styles.container}>
      {label && (
        <div style={styles.labelWrapper}>
          <label style={styles.label}>
            {label}
            {required && <span style={styles.required}>*</span>}
          </label>
        </div>
      )}
      <div style={styles.inputWrapper}>
        {renderLeftIcon()}
        <input
          ref={ref}
          type={isPassword && showPassword ? 'text' : type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          required={required}
          style={styles.input}
          {...props}
        />
        {renderRightIcon()}
      </div>
      {(helperText || error) && (
        <span style={styles.helperText}>
          {error || helperText}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';

// Textarea variant
export const Textarea = forwardRef(({
  label,
  placeholder,
  value,
  onChange,
  error,
  helperText,
  disabled = false,
  required = false,
  rows = 4,
  resize = 'vertical',
  fullWidth = true,
  className,
  style = {},
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);

  const getBorderColor = () => {
    if (error) return theme.colors.accent.danger;
    if (isFocused) return theme.colors.accent.primary;
    return theme.colors.border.medium;
  };

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing.sm,
      width: fullWidth ? '100%' : 'auto',
      ...style,
    },
    label: {
      color: error ? theme.colors.accent.danger : theme.colors.text.primary,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.medium,
    },
    required: {
      color: theme.colors.accent.danger,
      marginLeft: '2px',
    },
    textarea: {
      width: '100%',
      padding: '12px 14px',
      backgroundColor: disabled ? theme.colors.background.tertiary : theme.colors.background.secondary,
      border: `1px solid ${getBorderColor()}`,
      borderRadius: theme.radius.lg,
      fontSize: theme.fontSize.base,
      color: disabled ? theme.colors.text.tertiary : theme.colors.text.primary,
      outline: 'none',
      transition: theme.transitions.fast,
      boxShadow: isFocused ? theme.shadows.focus : 'none',
      resize: resize,
      fontFamily: 'inherit',
      lineHeight: theme.lineHeight.normal,
    },
    helperText: {
      fontSize: theme.fontSize.xs,
      color: error ? theme.colors.accent.danger : theme.colors.text.tertiary,
    },
  };

  return (
    <div className={className} style={styles.container}>
      {label && (
        <label style={styles.label}>
          {label}
          {required && <span style={styles.required}>*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={disabled}
        required={required}
        rows={rows}
        style={styles.textarea}
        {...props}
      />
      {(helperText || error) && (
        <span style={styles.helperText}>
          {error || helperText}
        </span>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export default Input;
