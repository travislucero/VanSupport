import React, { forwardRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { theme } from '../styles/theme';

const Select = forwardRef(({
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Select an option',
  error,
  helperText,
  disabled = false,
  required = false,
  size = 'md',
  fullWidth = true,
  className,
  style = {},
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);

  const sizes = {
    sm: {
      height: '34px',
      padding: '8px 32px 8px 12px',
      fontSize: theme.fontSize.sm,
      labelSize: theme.fontSize.xs,
    },
    md: {
      height: '42px',
      padding: '10px 36px 10px 14px',
      fontSize: theme.fontSize.base,
      labelSize: theme.fontSize.sm,
    },
    lg: {
      height: '50px',
      padding: '12px 40px 12px 16px',
      fontSize: theme.fontSize.lg,
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
    label: {
      color: error ? theme.colors.accent.danger : theme.colors.text.primary,
      fontSize: sizeStyle.labelSize,
      fontWeight: theme.fontWeight.medium,
    },
    required: {
      color: theme.colors.accent.danger,
      marginLeft: '2px',
    },
    selectWrapper: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
    },
    select: {
      width: '100%',
      height: sizeStyle.height,
      padding: sizeStyle.padding,
      backgroundColor: disabled ? theme.colors.background.tertiary : theme.colors.background.secondary,
      border: `1px solid ${getBorderColor()}`,
      borderRadius: theme.radius.lg,
      fontSize: sizeStyle.fontSize,
      color: value ? theme.colors.text.primary : theme.colors.text.tertiary,
      outline: 'none',
      transition: theme.transitions.fast,
      boxShadow: getBoxShadow(),
      cursor: disabled ? 'not-allowed' : 'pointer',
      appearance: 'none',
      WebkitAppearance: 'none',
      MozAppearance: 'none',
    },
    chevron: {
      position: 'absolute',
      right: '12px',
      pointerEvents: 'none',
      color: theme.colors.text.tertiary,
      transition: theme.transitions.fast,
      transform: isFocused ? 'rotate(180deg)' : 'rotate(0deg)',
    },
    helperText: {
      fontSize: theme.fontSize.xs,
      color: error ? theme.colors.accent.danger : theme.colors.text.tertiary,
      marginTop: '-2px',
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
      <div style={styles.selectWrapper}>
        <select
          ref={ref}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          required={required}
          style={styles.select}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option, index) => (
            <option
              key={option.value ?? index}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown size={18} style={styles.chevron} />
      </div>
      {(helperText || error) && (
        <span style={styles.helperText}>
          {error || helperText}
        </span>
      )}
    </div>
  );
});

Select.displayName = 'Select';

// Multi-select with checkboxes
export const CheckboxGroup = ({
  label,
  options = [],
  value = [],
  onChange,
  error,
  helperText,
  disabled = false,
  required = false,
  direction = 'vertical',
  className,
  style = {},
}) => {
  const handleChange = (optionValue) => {
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue];
    onChange?.(newValue);
  };

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing.sm,
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
    optionsContainer: {
      display: 'flex',
      flexDirection: direction === 'horizontal' ? 'row' : 'column',
      gap: direction === 'horizontal' ? theme.spacing.lg : theme.spacing.md,
      flexWrap: 'wrap',
    },
    option: {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing.sm,
      cursor: disabled ? 'not-allowed' : 'pointer',
    },
    checkbox: {
      width: '18px',
      height: '18px',
      accentColor: theme.colors.accent.primary,
      cursor: disabled ? 'not-allowed' : 'pointer',
    },
    optionLabel: {
      color: disabled ? theme.colors.text.tertiary : theme.colors.text.primary,
      fontSize: theme.fontSize.sm,
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
      <div style={styles.optionsContainer}>
        {options.map((option) => (
          <label
            key={option.value}
            style={{
              ...styles.option,
              opacity: option.disabled ? 0.5 : 1,
            }}
          >
            <input
              type="checkbox"
              checked={value.includes(option.value)}
              onChange={() => handleChange(option.value)}
              disabled={disabled || option.disabled}
              style={styles.checkbox}
            />
            <span style={styles.optionLabel}>{option.label}</span>
          </label>
        ))}
      </div>
      {(helperText || error) && (
        <span style={styles.helperText}>
          {error || helperText}
        </span>
      )}
    </div>
  );
};

// Radio group
export const RadioGroup = ({
  label,
  options = [],
  value,
  onChange,
  error,
  helperText,
  disabled = false,
  required = false,
  direction = 'vertical',
  name,
  className,
  style = {},
}) => {
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing.sm,
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
    optionsContainer: {
      display: 'flex',
      flexDirection: direction === 'horizontal' ? 'row' : 'column',
      gap: direction === 'horizontal' ? theme.spacing.lg : theme.spacing.md,
      flexWrap: 'wrap',
    },
    option: {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing.sm,
      cursor: disabled ? 'not-allowed' : 'pointer',
    },
    radio: {
      width: '18px',
      height: '18px',
      accentColor: theme.colors.accent.primary,
      cursor: disabled ? 'not-allowed' : 'pointer',
    },
    optionLabel: {
      color: disabled ? theme.colors.text.tertiary : theme.colors.text.primary,
      fontSize: theme.fontSize.sm,
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
      <div style={styles.optionsContainer}>
        {options.map((option) => (
          <label
            key={option.value}
            style={{
              ...styles.option,
              opacity: option.disabled ? 0.5 : 1,
            }}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange?.(e.target.value)}
              disabled={disabled || option.disabled}
              style={styles.radio}
            />
            <span style={styles.optionLabel}>{option.label}</span>
          </label>
        ))}
      </div>
      {(helperText || error) && (
        <span style={styles.helperText}>
          {error || helperText}
        </span>
      )}
    </div>
  );
};

export default Select;
