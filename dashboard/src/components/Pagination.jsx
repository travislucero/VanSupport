import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { theme } from '../styles/theme';

/**
 * Reusable Pagination Component
 */
const Pagination = ({
  currentPage,
  totalPages,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  loading = false,
  showPageSize = true,
  className,
  style = {},
}) => {
  // Calculate range of items being shown
  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        end = 4;
      }

      if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
      }

      if (start > 2) {
        pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push('...');
      }

      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  const handlePrevious = () => {
    if (currentPage > 1 && !loading) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages && !loading) {
      onPageChange(currentPage + 1);
    }
  };

  const handleFirst = () => {
    if (currentPage > 1 && !loading) {
      onPageChange(1);
    }
  };

  const handleLast = () => {
    if (currentPage < totalPages && !loading) {
      onPageChange(totalPages);
    }
  };

  const handlePageClick = (page) => {
    if (page !== '...' && page !== currentPage && !loading) {
      onPageChange(page);
    }
  };

  const handlePageSizeChange = (e) => {
    const newSize = parseInt(e.target.value);
    onPageSizeChange(newSize);
  };

  if (totalCount === 0) {
    return null;
  }

  const styles = {
    container: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
      borderTop: `1px solid ${theme.colors.border.light}`,
      backgroundColor: theme.colors.background.secondary,
      flexWrap: 'wrap',
      gap: theme.spacing.lg,
      ...style,
    },
    info: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.text.secondary,
      minWidth: '200px',
    },
    infoHighlight: {
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.text.primary,
    },
    nav: {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing.xs,
      flex: 1,
      justifyContent: 'center',
    },
    navButton: (disabled) => ({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.sm,
      minWidth: '36px',
      height: '36px',
      backgroundColor: disabled ? theme.colors.background.tertiary : theme.colors.background.secondary,
      color: disabled ? theme.colors.text.tertiary : theme.colors.text.secondary,
      border: `1px solid ${theme.colors.border.light}`,
      borderRadius: theme.radius.md,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.medium,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: theme.transitions.fast,
      opacity: disabled ? 0.5 : 1,
    }),
    pageButton: (isActive) => ({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.sm,
      minWidth: '36px',
      height: '36px',
      backgroundColor: isActive ? theme.colors.accent.primary : theme.colors.background.secondary,
      color: isActive ? theme.colors.text.inverse : theme.colors.text.primary,
      border: `1px solid ${isActive ? theme.colors.accent.primary : theme.colors.border.light}`,
      borderRadius: theme.radius.md,
      fontSize: theme.fontSize.sm,
      fontWeight: isActive ? theme.fontWeight.semibold : theme.fontWeight.medium,
      cursor: loading ? 'not-allowed' : 'pointer',
      transition: theme.transitions.fast,
    }),
    ellipsis: {
      padding: theme.spacing.sm,
      color: theme.colors.text.tertiary,
      fontSize: theme.fontSize.sm,
      minWidth: '36px',
      textAlign: 'center',
    },
    pageSizeContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing.sm,
      minWidth: '150px',
      justifyContent: 'flex-end',
    },
    pageSizeLabel: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.text.secondary,
      whiteSpace: 'nowrap',
    },
    pageSizeSelect: {
      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
      backgroundColor: theme.colors.background.secondary,
      color: theme.colors.text.primary,
      border: `1px solid ${theme.colors.border.medium}`,
      borderRadius: theme.radius.md,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.medium,
      cursor: loading ? 'not-allowed' : 'pointer',
      outline: 'none',
    },
  };

  return (
    <div className={className} style={styles.container}>
      {/* Left: Item count */}
      <div style={styles.info}>
        Showing{' '}
        <span style={styles.infoHighlight}>{startItem}-{endItem}</span>{' '}
        of{' '}
        <span style={styles.infoHighlight}>{totalCount.toLocaleString()}</span>{' '}
        items
      </div>

      {/* Center: Page numbers */}
      <div style={styles.nav}>
        {/* First page button */}
        {totalPages > 5 && (
          <button
            onClick={handleFirst}
            disabled={currentPage === 1 || loading}
            style={styles.navButton(currentPage === 1 || loading)}
            title="First page"
          >
            <ChevronsLeft size={16} />
          </button>
        )}

        {/* Previous button */}
        <button
          onClick={handlePrevious}
          disabled={currentPage === 1 || loading}
          style={styles.navButton(currentPage === 1 || loading)}
          title="Previous page"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Page numbers */}
        {pageNumbers.map((page, index) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${index}`} style={styles.ellipsis}>
                ...
              </span>
            );
          }

          const isActive = page === currentPage;

          return (
            <button
              key={page}
              onClick={() => handlePageClick(page)}
              disabled={loading}
              style={styles.pageButton(isActive)}
              onMouseEnter={(e) => {
                if (!isActive && !loading) {
                  e.currentTarget.style.backgroundColor = theme.colors.background.tertiary;
                  e.currentTarget.style.borderColor = theme.colors.border.medium;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive && !loading) {
                  e.currentTarget.style.backgroundColor = theme.colors.background.secondary;
                  e.currentTarget.style.borderColor = theme.colors.border.light;
                }
              }}
            >
              {page}
            </button>
          );
        })}

        {/* Next button */}
        <button
          onClick={handleNext}
          disabled={currentPage === totalPages || loading}
          style={styles.navButton(currentPage === totalPages || loading)}
          title="Next page"
        >
          <ChevronRight size={16} />
        </button>

        {/* Last page button */}
        {totalPages > 5 && (
          <button
            onClick={handleLast}
            disabled={currentPage === totalPages || loading}
            style={styles.navButton(currentPage === totalPages || loading)}
            title="Last page"
          >
            <ChevronsRight size={16} />
          </button>
        )}
      </div>

      {/* Right: Page size selector */}
      {showPageSize && (
        <div style={styles.pageSizeContainer}>
          <label htmlFor="pageSize" style={styles.pageSizeLabel}>
            Per page:
          </label>
          <select
            id="pageSize"
            value={pageSize}
            onChange={handlePageSizeChange}
            disabled={loading}
            style={styles.pageSizeSelect}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      )}
    </div>
  );
};

export default Pagination;
