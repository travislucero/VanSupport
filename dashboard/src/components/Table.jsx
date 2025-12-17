import React from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { theme } from '../styles/theme';

const Table = ({
  children,
  striped = false,
  hoverable = true,
  bordered = false,
  compact = false,
  className,
  style = {},
}) => {
  const styles = {
    wrapper: {
      width: '100%',
      overflowX: 'auto',
      borderRadius: theme.radius.lg,
      border: bordered ? `1px solid ${theme.colors.border.light}` : 'none',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: compact ? theme.fontSize.sm : theme.fontSize.base,
      ...style,
    },
  };

  return (
    <div style={styles.wrapper}>
      <table
        className={className}
        style={styles.table}
        data-striped={striped}
        data-hoverable={hoverable}
        data-compact={compact}
      >
        {children}
      </table>
    </div>
  );
};

// Table Head
export const TableHead = ({ children, className, style = {} }) => {
  const styles = {
    thead: {
      backgroundColor: theme.colors.background.tertiary,
      ...style,
    },
  };

  return (
    <thead className={className} style={styles.thead}>
      {children}
    </thead>
  );
};

// Table Body
export const TableBody = ({ children, className, style = {} }) => {
  return (
    <tbody className={className} style={style}>
      {children}
    </tbody>
  );
};

// Table Row
export const TableRow = ({
  children,
  selected = false,
  onClick,
  className,
  style = {},
}) => {
  const [isHovered, setIsHovered] = React.useState(false);

  const styles = {
    row: {
      borderBottom: `1px solid ${theme.colors.border.light}`,
      backgroundColor: selected
        ? theme.colors.accent.primaryLight
        : isHovered
        ? theme.colors.background.tertiary
        : 'transparent',
      transition: theme.transitions.fast,
      cursor: onClick ? 'pointer' : 'default',
      ...style,
    },
  };

  return (
    <tr
      className={className}
      style={styles.row}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </tr>
  );
};

// Table Header Cell
export const TableHeaderCell = ({
  children,
  sortable = false,
  sortDirection, // 'asc' | 'desc' | undefined
  onSort,
  align = 'left',
  width,
  className,
  style = {},
}) => {
  const [isHovered, setIsHovered] = React.useState(false);

  const styles = {
    th: {
      padding: '12px 16px',
      textAlign: align,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.text.secondary,
      fontSize: theme.fontSize.xs,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      whiteSpace: 'nowrap',
      width: width,
      cursor: sortable ? 'pointer' : 'default',
      userSelect: sortable ? 'none' : 'auto',
      backgroundColor: isHovered && sortable ? theme.colors.background.hover : 'transparent',
      transition: theme.transitions.fast,
      ...style,
    },
    content: {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing.xs,
      justifyContent: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start',
    },
    sortIcon: {
      color: sortDirection ? theme.colors.accent.primary : theme.colors.text.tertiary,
      flexShrink: 0,
    },
  };

  const renderSortIcon = () => {
    if (!sortable) return null;

    if (sortDirection === 'asc') {
      return <ChevronUp size={14} style={styles.sortIcon} />;
    }
    if (sortDirection === 'desc') {
      return <ChevronDown size={14} style={styles.sortIcon} />;
    }
    return <ChevronsUpDown size={14} style={styles.sortIcon} />;
  };

  return (
    <th
      className={className}
      style={styles.th}
      onClick={sortable ? onSort : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={styles.content}>
        {children}
        {renderSortIcon()}
      </div>
    </th>
  );
};

// Table Cell
export const TableCell = ({
  children,
  align = 'left',
  width,
  className,
  style = {},
}) => {
  const styles = {
    td: {
      padding: '12px 16px',
      textAlign: align,
      color: theme.colors.text.primary,
      verticalAlign: 'middle',
      width: width,
      ...style,
    },
  };

  return (
    <td className={className} style={styles.td}>
      {children}
    </td>
  );
};

// Empty state for tables
export const TableEmpty = ({
  icon,
  title = 'No data',
  description,
  action,
}) => {
  const styles = {
    container: {
      padding: theme.spacing['3xl'],
      textAlign: 'center',
    },
    icon: {
      color: theme.colors.text.tertiary,
      marginBottom: theme.spacing.lg,
    },
    title: {
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.semibold,
      marginBottom: theme.spacing.sm,
    },
    description: {
      color: theme.colors.text.tertiary,
      fontSize: theme.fontSize.sm,
      marginBottom: action ? theme.spacing.xl : 0,
    },
  };

  return (
    <TableRow>
      <TableCell colSpan={100}>
        <div style={styles.container}>
          {icon && (
            <div style={styles.icon}>
              {React.cloneElement(icon, { size: 48 })}
            </div>
          )}
          <div style={styles.title}>{title}</div>
          {description && <div style={styles.description}>{description}</div>}
          {action}
        </div>
      </TableCell>
    </TableRow>
  );
};

// Loading skeleton for table
export const TableSkeleton = ({ rows = 5, columns = 4 }) => {
  const styles = {
    skeleton: {
      height: '16px',
      backgroundColor: theme.colors.background.tertiary,
      borderRadius: theme.radius.sm,
      animation: 'pulse 2s ease-in-out infinite',
    },
  };

  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <TableCell key={colIndex}>
              <div
                style={{
                  ...styles.skeleton,
                  width: `${60 + Math.random() * 30}%`,
                }}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
};

export default Table;
