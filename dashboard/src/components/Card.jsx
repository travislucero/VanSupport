import React from 'react';
import { theme } from '../styles/theme';

const Card = ({
  children,
  title,
  description,
  action,
  noPadding = false,
  className,
  style = {}
}) => {
  return (
    <div
      className={className}
      style={{
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.radius.xl,
        border: `1px solid ${theme.colors.border.light}`,
        overflow: 'hidden',
        boxShadow: theme.shadows.sm,
        ...style,
      }}
    >
      {(title || action) && (
        <div
          style={{
            padding: theme.spacing.lg,
            borderBottom: `1px solid ${theme.colors.border.light}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            {title && (
              <h3
                style={{
                  margin: 0,
                  color: theme.colors.text.primary,
                  fontSize: theme.fontSize.lg,
                  fontWeight: theme.fontWeight.semibold,
                }}
              >
                {title}
              </h3>
            )}
            {description && (
              <p
                style={{
                  margin: '4px 0 0 0',
                  color: theme.colors.text.secondary,
                  fontSize: theme.fontSize.sm,
                }}
              >
                {description}
              </p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div style={{ padding: noPadding ? 0 : theme.spacing.lg }}>
        {children}
      </div>
    </div>
  );
};

export default Card;
