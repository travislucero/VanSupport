import { ChevronLeft, ChevronRight } from 'lucide-react';
import { theme } from '../styles/theme';

/**
 * Reusable Pagination Component
 *
 * @param {Object} props
 * @param {number} props.currentPage - Current page number (1-indexed)
 * @param {number} props.totalPages - Total number of pages
 * @param {number} props.pageSize - Number of items per page
 * @param {number} props.totalCount - Total number of items
 * @param {Function} props.onPageChange - Callback when page changes
 * @param {Function} props.onPageSizeChange - Callback when page size changes
 * @param {boolean} props.loading - Whether data is currently loading
 */
const Pagination = ({
  currentPage,
  totalPages,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  loading = false
}) => {
  // Calculate range of items being shown
  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 7; // Max page numbers to show

    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate range around current page
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      // Adjust if we're near the start
      if (currentPage <= 3) {
        end = 4;
      }

      // Adjust if we're near the end
      if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
      }

      // Add ellipsis after first page if needed
      if (start > 2) {
        pages.push('...');
      }

      // Add middle pages
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Add ellipsis before last page if needed
      if (end < totalPages - 1) {
        pages.push('...');
      }

      // Always show last page
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

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 1.5rem',
        borderTop: `1px solid ${theme.colors.border.light}`,
        backgroundColor: theme.colors.background.primary,
        flexWrap: 'wrap',
        gap: '1rem'
      }}
    >
      {/* Left: Item count */}
      <div style={{
        fontSize: theme.fontSize.sm,
        color: theme.colors.text.secondary,
        minWidth: '200px'
      }}>
        Showing <span style={{ fontWeight: theme.fontWeight.semibold }}>{startItem}-{endItem}</span> of{' '}
        <span style={{ fontWeight: theme.fontWeight.semibold }}>{totalCount}</span> tickets
      </div>

      {/* Center: Page numbers */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
        flex: 1,
        justifyContent: 'center'
      }}>
        {/* Previous button */}
        <button
          onClick={handlePrevious}
          disabled={currentPage === 1 || loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.5rem 0.75rem',
            backgroundColor: currentPage === 1 || loading ? theme.colors.background.tertiary : 'white',
            color: currentPage === 1 || loading ? theme.colors.text.disabled : theme.colors.text.primary,
            border: `1px solid ${theme.colors.border.medium}`,
            borderRadius: theme.radius.md,
            fontSize: theme.fontSize.sm,
            fontWeight: theme.fontWeight.medium,
            cursor: currentPage === 1 || loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            opacity: currentPage === 1 || loading ? 0.5 : 1
          }}
          onMouseEnter={(e) => {
            if (currentPage !== 1 && !loading) {
              e.currentTarget.style.backgroundColor = theme.colors.background.tertiary;
            }
          }}
          onMouseLeave={(e) => {
            if (currentPage !== 1 && !loading) {
              e.currentTarget.style.backgroundColor = 'white';
            }
          }}
        >
          <ChevronLeft size={16} />
          Previous
        </button>

        {/* Page numbers */}
        <div style={{ display: 'flex', gap: '0.25rem', margin: '0 0.5rem' }}>
          {pageNumbers.map((page, index) => {
            if (page === '...') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  style={{
                    padding: '0.5rem 0.75rem',
                    color: theme.colors.text.tertiary,
                    fontSize: theme.fontSize.sm
                  }}
                >
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
                style={{
                  padding: '0.5rem 0.75rem',
                  minWidth: '2.5rem',
                  backgroundColor: isActive ? theme.colors.primary : 'white',
                  color: isActive ? 'white' : theme.colors.text.primary,
                  border: `1px solid ${isActive ? theme.colors.primary : theme.colors.border.medium}`,
                  borderRadius: theme.radius.md,
                  fontSize: theme.fontSize.sm,
                  fontWeight: isActive ? theme.fontWeight.semibold : theme.fontWeight.medium,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!isActive && !loading) {
                    e.currentTarget.style.backgroundColor = theme.colors.background.tertiary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive && !loading) {
                    e.currentTarget.style.backgroundColor = 'white';
                  }
                }}
              >
                {page}
              </button>
            );
          })}
        </div>

        {/* Next button */}
        <button
          onClick={handleNext}
          disabled={currentPage === totalPages || loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.5rem 0.75rem',
            backgroundColor: currentPage === totalPages || loading ? theme.colors.background.tertiary : 'white',
            color: currentPage === totalPages || loading ? theme.colors.text.disabled : theme.colors.text.primary,
            border: `1px solid ${theme.colors.border.medium}`,
            borderRadius: theme.radius.md,
            fontSize: theme.fontSize.sm,
            fontWeight: theme.fontWeight.medium,
            cursor: currentPage === totalPages || loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            opacity: currentPage === totalPages || loading ? 0.5 : 1
          }}
          onMouseEnter={(e) => {
            if (currentPage !== totalPages && !loading) {
              e.currentTarget.style.backgroundColor = theme.colors.background.tertiary;
            }
          }}
          onMouseLeave={(e) => {
            if (currentPage !== totalPages && !loading) {
              e.currentTarget.style.backgroundColor = 'white';
            }
          }}
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Right: Page size selector */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        minWidth: '150px',
        justifyContent: 'flex-end'
      }}>
        <label
          htmlFor="pageSize"
          style={{
            fontSize: theme.fontSize.sm,
            color: theme.colors.text.secondary,
            whiteSpace: 'nowrap'
          }}
        >
          Per page:
        </label>
        <select
          id="pageSize"
          value={pageSize}
          onChange={handlePageSizeChange}
          disabled={loading}
          style={{
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            backgroundColor: 'white',
            color: theme.colors.text.primary,
            border: `1px solid ${theme.colors.border.medium}`,
            borderRadius: theme.radius.md,
            fontSize: theme.fontSize.sm,
            fontWeight: theme.fontWeight.medium,
            cursor: loading ? 'not-allowed' : 'pointer',
            outline: 'none'
          }}
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>
    </div>
  );
};

export default Pagination;
