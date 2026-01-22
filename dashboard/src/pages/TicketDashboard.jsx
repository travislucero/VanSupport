import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  Ticket,
  UserPlus,
  Plus,
  RefreshCw,
  Clock,
  UserCheck,
  Wrench,
  MessageCircle,
  CheckCircle,
  X,
  XCircle,
  AlertTriangle,
  ArrowUp,
  Minus,
  ArrowDown,
  Search,
  PartyPopper,
  Calendar,
  Archive,
  Filter,
  GripVertical
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Pagination from '../components/Pagination';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { theme } from '../styles/theme';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Auto-refresh interval (30 seconds)
const AUTO_REFRESH_INTERVAL = 30000;

// Debounce delay for search input (500ms)
const SEARCH_DEBOUNCE_DELAY = 500;

const TicketDashboard = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, logout, hasRole, isSiteAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab state
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'active');

  const [unassignedTickets, setUnassignedTickets] = useState([]);
  const [myTickets, setMyTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigningTicket, setAssigningTicket] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Drag and drop state
  const [draggingTicketId, setDraggingTicketId] = useState(null);
  const [isDragOverMyTickets, setIsDragOverMyTickets] = useState(false);

  // Pagination state for unassigned tickets
  const [unassignedPage, setUnassignedPage] = useState(parseInt(searchParams.get('unassignedPage')) || 1);
  const [unassignedPageSize, setUnassignedPageSize] = useState(parseInt(searchParams.get('unassignedLimit')) || 25);
  const [unassignedPagination, setUnassignedPagination] = useState(null);

  // Pagination state for my tickets
  const [myTicketsPage, setMyTicketsPage] = useState(parseInt(searchParams.get('myTicketsPage')) || 1);
  const [myTicketsPageSize, setMyTicketsPageSize] = useState(parseInt(searchParams.get('myTicketsLimit')) || 25);
  const [myTicketsPagination, setMyTicketsPagination] = useState(null);

  // Filters and search for active tickets
  const [unassignedSearch, setUnassignedSearch] = useState('');
  const [unassignedSort, setUnassignedSort] = useState('priority');
  const [myTicketsSearch, setMyTicketsSearch] = useState('');
  const [myTicketsSort, setMyTicketsSort] = useState('last_activity');
  const [myTicketsStatusFilter, setMyTicketsStatusFilter] = useState('all');

  // Closed tickets state
  const [closedTickets, setClosedTickets] = useState([]);
  const [closedPage, setClosedPage] = useState(parseInt(searchParams.get('closedPage')) || 1);
  const [closedPageSize, setClosedPageSize] = useState(parseInt(searchParams.get('closedLimit')) || 25);
  const [closedPagination, setClosedPagination] = useState(null);
  const [closedLoading, setClosedLoading] = useState(false);
  const [closedStatusFilter, setClosedStatusFilter] = useState(searchParams.get('closedStatus') || 'all');
  const [closedSearch, setClosedSearch] = useState(searchParams.get('closedSearch') || '');
  const [closedSearchInput, setClosedSearchInput] = useState(searchParams.get('closedSearch') || '');
  const [closedDateFrom, setClosedDateFrom] = useState(searchParams.get('closedDateFrom') || '');
  const [closedDateTo, setClosedDateTo] = useState(searchParams.get('closedDateTo') || '');
  const [closedSortBy, setClosedSortBy] = useState(searchParams.get('closedSort') || 'closed_date');
  const [closedSortOrder] = useState('desc');

  // Ref for debounce timer
  const searchDebounceRef = useRef(null);

  // Fetch tickets for active tab
  const fetchTickets = useCallback(async (showRefreshingState = false) => {
    try {
      if (showRefreshingState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [unassignedRes, myTicketsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/tickets/unassigned?page=${unassignedPage}&limit=${unassignedPageSize}`, {
          credentials: 'include'
        }),
        fetch(`${API_BASE_URL}/api/tickets/my-tickets?page=${myTicketsPage}&limit=${myTicketsPageSize}`, {
          credentials: 'include'
        })
      ]);

      if (!unassignedRes.ok || !myTicketsRes.ok) {
        throw new Error('Failed to fetch tickets');
      }

      const unassignedData = await unassignedRes.json();
      const myTicketsData = await myTicketsRes.json();

      console.log('=== UNASSIGNED TICKETS DATA ===');
      console.log('Pagination:', unassignedData.pagination);
      console.log('Tickets:', unassignedData.tickets?.length || 0);

      console.log('=== MY TICKETS DATA ===');
      console.log('Pagination:', myTicketsData.pagination);
      console.log('Tickets:', myTicketsData.tickets?.length || 0);

      setUnassignedTickets(unassignedData.tickets || []);
      setUnassignedPagination(unassignedData.pagination);

      setMyTickets(myTicketsData.tickets || []);
      setMyTicketsPagination(myTicketsData.pagination);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      showToast('Failed to load tickets', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast, unassignedPage, unassignedPageSize, myTicketsPage, myTicketsPageSize]);

  // Fetch closed tickets
  const fetchClosedTickets = useCallback(async (showRefreshingState = false) => {
    try {
      if (showRefreshingState) {
        setRefreshing(true);
      } else {
        setClosedLoading(true);
      }

      // Build query parameters
      const params = new URLSearchParams();
      params.set('page', closedPage.toString());
      params.set('limit', closedPageSize.toString());
      params.set('sortBy', closedSortBy);
      params.set('sortOrder', closedSortOrder);

      if (closedStatusFilter && closedStatusFilter !== 'all') {
        params.set('status', closedStatusFilter);
      }
      if (closedSearch) {
        params.set('search', closedSearch);
      }
      if (closedDateFrom) {
        params.set('dateFrom', closedDateFrom);
      }
      if (closedDateTo) {
        params.set('dateTo', closedDateTo);
      }

      const response = await fetch(`${API_BASE_URL}/api/tickets/closed?${params.toString()}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch closed tickets');
      }

      const data = await response.json();

      console.log('=== CLOSED TICKETS DATA ===');
      console.log('Pagination:', data.pagination);
      console.log('Tickets:', data.tickets?.length || 0);

      setClosedTickets(data.tickets || []);
      setClosedPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching closed tickets:', error);
      showToast('Failed to load closed tickets', 'error');
    } finally {
      setClosedLoading(false);
      setRefreshing(false);
    }
  }, [showToast, closedPage, closedPageSize, closedStatusFilter, closedSearch, closedDateFrom, closedDateTo, closedSortBy, closedSortOrder]);

  // Debounced search handler for closed tickets
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      setClosedSearch(closedSearchInput);
      // Reset to page 1 when search changes
      if (closedSearchInput !== closedSearch) {
        setClosedPage(1);
      }
    }, SEARCH_DEBOUNCE_DELAY);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [closedSearchInput]);

  // Initial fetch based on active tab
  useEffect(() => {
    if (activeTab === 'active') {
      fetchTickets();
    } else if (activeTab === 'closed') {
      fetchClosedTickets();
    }
  }, [activeTab, fetchTickets, fetchClosedTickets]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'active') {
        fetchTickets(true);
      } else if (activeTab === 'closed') {
        fetchClosedTickets(true);
      }
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [activeTab, fetchTickets, fetchClosedTickets]);

  // Update URL params when closed ticket filters change
  useEffect(() => {
    const params = new URLSearchParams(searchParams);

    // Always set tab
    if (activeTab !== 'active') {
      params.set('tab', activeTab);
    } else {
      params.delete('tab');
    }

    // Closed ticket params
    if (activeTab === 'closed') {
      if (closedPage !== 1) {
        params.set('closedPage', closedPage.toString());
      } else {
        params.delete('closedPage');
      }

      if (closedPageSize !== 25) {
        params.set('closedLimit', closedPageSize.toString());
      } else {
        params.delete('closedLimit');
      }

      if (closedStatusFilter && closedStatusFilter !== 'all') {
        params.set('closedStatus', closedStatusFilter);
      } else {
        params.delete('closedStatus');
      }

      if (closedSearch) {
        params.set('closedSearch', closedSearch);
      } else {
        params.delete('closedSearch');
      }

      if (closedDateFrom) {
        params.set('closedDateFrom', closedDateFrom);
      } else {
        params.delete('closedDateFrom');
      }

      if (closedDateTo) {
        params.set('closedDateTo', closedDateTo);
      } else {
        params.delete('closedDateTo');
      }

      if (closedSortBy && closedSortBy !== 'closed_date') {
        params.set('closedSort', closedSortBy);
      } else {
        params.delete('closedSort');
      }
    }

    setSearchParams(params, { replace: true });
  }, [activeTab, closedPage, closedPageSize, closedStatusFilter, closedSearch, closedDateFrom, closedDateTo, closedSortBy, searchParams, setSearchParams]);

  // Assign ticket to current user
  const handleAssignToMe = async (ticketId, ticketNumber) => {
    setAssigningTicket(ticketId);
    try {
      const response = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({}) // Empty body assigns to self
      });

      if (!response.ok) {
        throw new Error('Failed to assign ticket');
      }

      showToast(`Ticket #${ticketNumber} assigned to you`, 'success');

      // Refresh tickets to update UI
      await fetchTickets();
    } catch (error) {
      console.error('Error assigning ticket:', error);
      showToast('Failed to assign ticket', 'error');
    } finally {
      setAssigningTicket(null);
    }
  };

  // Manual refresh
  const handleRefresh = () => {
    if (activeTab === 'active') {
      fetchTickets(true);
    } else if (activeTab === 'closed') {
      fetchClosedTickets(true);
    }
  };

  // Drag and drop handlers
  const handleDragStart = useCallback((e, ticket) => {
    setDraggingTicketId(ticket.ticket_id);
    e.dataTransfer.setData('text/plain', JSON.stringify({
      ticketId: ticket.ticket_id,
      ticketNumber: ticket.ticket_number
    }));
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingTicketId(null);
    setIsDragOverMyTickets(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    setIsDragOverMyTickets(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    // Only set to false if we're leaving the drop zone entirely
    // Check if the related target is not a child of the drop zone
    const dropZone = e.currentTarget;
    const relatedTarget = e.relatedTarget;
    if (!dropZone.contains(relatedTarget)) {
      setIsDragOverMyTickets(false);
    }
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragOverMyTickets(false);
    setDraggingTicketId(null);

    // Parse and validate the dropped data
    let data;
    try {
      const rawData = e.dataTransfer.getData('text/plain');
      if (!rawData) return;
      data = JSON.parse(rawData);
    } catch {
      return; // Silently ignore invalid drops
    }

    // Validate data structure
    if (!data || typeof data.ticketId === 'undefined' || typeof data.ticketNumber === 'undefined') {
      return;
    }

    const ticketId = String(data.ticketId);
    const ticketNumber = String(data.ticketNumber);

    // Find the ticket in unassigned tickets
    const ticket = unassignedTickets.find(t => String(t.ticket_id) === ticketId);
    if (!ticket) {
      showToast('Ticket not found', 'error');
      return;
    }

    setAssigningTicket(ticketId);

    try {
      const response = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}/assign-to-me`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.status === 409) {
        showToast(`Ticket #${ticketNumber} is already assigned to another user`, 'warning');
        await fetchTickets();
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to assign ticket');
      }

      const result = await response.json();

      // Remove from unassigned tickets
      setUnassignedTickets(prev => prev.filter(t => String(t.ticket_id) !== ticketId));

      // Add to my tickets with updated assigned_to info
      const updatedTicket = {
        ...ticket,
        assigned_to: user?.id,
        assigned_to_name: user?.name || user?.username,
        status: result.ticket?.status || 'assigned'
      };
      setMyTickets(prev => [updatedTicket, ...prev]);

      // Update pagination counts
      setUnassignedPagination(prev => prev ? ({
        ...prev,
        totalCount: Math.max(0, (prev.totalCount || 1) - 1)
      }) : prev);
      setMyTicketsPagination(prev => prev ? ({
        ...prev,
        totalCount: (prev.totalCount || 0) + 1
      }) : prev);

      showToast(`Ticket #${ticketNumber} assigned to you`, 'success');
    } catch (error) {
      console.error('Error assigning ticket via drag and drop:', error);
      showToast('Failed to assign ticket', 'error');
    } finally {
      setAssigningTicket(null);
    }
  }, [unassignedTickets, user, showToast, setUnassignedTickets, setMyTickets, setUnassignedPagination, setMyTicketsPagination]);

  // Navigate to ticket detail
  const handleTicketClick = (ticketId) => {
    navigate(`/tickets/${ticketId}`);
  };

  // Tab change handler
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Pagination handlers for unassigned tickets
  const handleUnassignedPageChange = (newPage) => {
    setUnassignedPage(newPage);
    const params = new URLSearchParams(searchParams);
    params.set('unassignedPage', newPage.toString());
    setSearchParams(params);
    // Scroll to top of tickets section
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUnassignedPageSizeChange = (newSize) => {
    setUnassignedPageSize(newSize);
    setUnassignedPage(1); // Reset to first page
    const params = new URLSearchParams(searchParams);
    params.set('unassignedLimit', newSize.toString());
    params.set('unassignedPage', '1');
    setSearchParams(params);
  };

  // Pagination handlers for my tickets
  const handleMyTicketsPageChange = (newPage) => {
    setMyTicketsPage(newPage);
    const params = new URLSearchParams(searchParams);
    params.set('myTicketsPage', newPage.toString());
    setSearchParams(params);
    // Scroll to my tickets section
    const myTicketsSection = document.getElementById('my-tickets-section');
    if (myTicketsSection) {
      myTicketsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleMyTicketsPageSizeChange = (newSize) => {
    setMyTicketsPageSize(newSize);
    setMyTicketsPage(1); // Reset to first page
    const params = new URLSearchParams(searchParams);
    params.set('myTicketsLimit', newSize.toString());
    params.set('myTicketsPage', '1');
    setSearchParams(params);
  };

  // Pagination handlers for closed tickets
  const handleClosedPageChange = (newPage) => {
    setClosedPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClosedPageSizeChange = (newSize) => {
    setClosedPageSize(newSize);
    setClosedPage(1);
  };

  // Clear closed tickets filters
  const handleClearClosedFilters = () => {
    setClosedSearchInput('');
    setClosedSearch('');
    setClosedStatusFilter('all');
    setClosedDateFrom('');
    setClosedDateTo('');
    setClosedSortBy('closed_date');
    setClosedPage(1);
  };

  // Check if any closed filters are active
  const hasActiveClosedFilters = closedSearchInput || closedStatusFilter !== 'all' || closedDateFrom || closedDateTo || closedSortBy !== 'closed_date';

  // Get status badge config
  const getStatusBadge = (status) => {
    const configs = {
      open: { color: 'blue', icon: Clock, label: 'Open' },
      assigned: { color: 'purple', icon: UserCheck, label: 'Assigned' },
      in_progress: { color: 'yellow', icon: Wrench, label: 'In Progress' },
      waiting_customer: { color: 'orange', icon: MessageCircle, label: 'Waiting Customer' },
      resolved: { color: 'green', icon: CheckCircle, label: 'Resolved' },
      closed: { color: 'gray', icon: X, label: 'Closed' },
      cancelled: { color: 'red', icon: XCircle, label: 'Cancelled' }
    };
    return configs[status] || { color: 'gray', icon: Clock, label: status };
  };

  // Get priority badge config
  const getPriorityBadge = (priority) => {
    const configs = {
      urgent: { color: 'red', icon: AlertTriangle, label: 'Urgent' },
      high: { color: 'orange', icon: ArrowUp, label: 'High' },
      normal: { color: 'blue', icon: Minus, label: 'Normal' },
      low: { color: 'gray', icon: ArrowDown, label: 'Low' }
    };
    return configs[priority] || { color: 'gray', icon: Minus, label: priority };
  };

  // Get urgency badge config
  const getUrgencyBadge = (urgency) => {
    if (!urgency) return null;
    const configs = {
      high: { color: 'red', label: 'High' },
      medium: { color: 'yellow', label: 'Medium' },
      low: { color: 'green', label: 'Low' }
    };
    return configs[urgency] || { color: 'gray', label: urgency };
  };

  // Format relative time
  const getRelativeTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  // Format relative time using date-fns for closed tickets
  const getClosedRelativeTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'N/A';
    }
  };

  // Truncate text
  const truncate = (text, maxLength) => {
    if (!text) return '';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  // Filter and sort unassigned tickets
  const getFilteredUnassignedTickets = () => {
    let filtered = unassignedTickets.filter(ticket => {
      const searchTerm = unassignedSearch.toLowerCase();
      return (
        ticket.ticket_number?.toString().includes(searchTerm) ||
        ticket.subject?.toLowerCase().includes(searchTerm) ||
        ticket.customer_name?.toLowerCase().includes(searchTerm) ||
        ticket.customer_phone?.includes(searchTerm)
      );
    });

    // Sort
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    filtered.sort((a, b) => {
      if (unassignedSort === 'priority') {
        const priorityDiff = (priorityOrder[a.priority] || 999) - (priorityOrder[b.priority] || 999);
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(a.created_at) - new Date(b.created_at);
      } else if (unassignedSort === 'created') {
        return new Date(b.created_at) - new Date(a.created_at);
      } else if (unassignedSort === 'customer') {
        return (a.customer_name || '').localeCompare(b.customer_name || '');
      }
      return 0;
    });

    return filtered;
  };

  // Filter and sort my tickets
  const getFilteredMyTickets = () => {
    let filtered = myTickets.filter(ticket => {
      // Status filter
      if (myTicketsStatusFilter !== 'all' && ticket.status !== myTicketsStatusFilter) {
        return false;
      }

      // Search filter
      const searchTerm = myTicketsSearch.toLowerCase();
      return (
        ticket.ticket_number?.toString().includes(searchTerm) ||
        ticket.subject?.toLowerCase().includes(searchTerm)
      );
    });

    // Sort
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    filtered.sort((a, b) => {
      if (myTicketsSort === 'last_activity') {
        return new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at);
      } else if (myTicketsSort === 'status') {
        return (a.status || '').localeCompare(b.status || '');
      } else if (myTicketsSort === 'priority') {
        return (priorityOrder[a.priority] || 999) - (priorityOrder[b.priority] || 999);
      }
      return 0;
    });

    return filtered;
  };

  const filteredUnassigned = getFilteredUnassignedTickets();
  const filteredMyTickets = getFilteredMyTickets();

  // Skeleton loader for active tickets
  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-48"></div></td>
      <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded w-16"></div></td>
      <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded w-16"></div></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
      <td className="px-6 py-4"><div className="h-8 bg-gray-200 rounded w-24"></div></td>
    </tr>
  );

  // Skeleton loader for closed tickets
  const ClosedSkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-48"></div></td>
      <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded w-20"></div></td>
      <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded w-16"></div></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-28"></div></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
    </tr>
  );

  // Tab button styles
  const getTabStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
    backgroundColor: isActive ? theme.colors.accent.primary : 'transparent',
    border: isActive ? 'none' : `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.radius.md,
    color: isActive ? theme.colors.text.inverse : theme.colors.text.secondary,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',
    transition: theme.transitions.normal
  });

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: theme.colors.background.page }}>
      {/* ARIA live region for screen reader announcements during drag-drop */}
      <div
        role="status"
        aria-live="polite"
        className="sr-only"
        style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}
      >
        {draggingTicketId ? 'Dragging ticket. Drop on My Tickets section to assign it to yourself.' : ''}
      </div>

      <Sidebar user={user} onLogout={logout} hasRole={hasRole} isSiteAdmin={isSiteAdmin} />

      <div style={{ marginLeft: '260px', flex: 1, padding: theme.spacing['2xl'], position: 'relative', zIndex: 1 }}>
        {/* Page Header */}
        <div style={{ marginBottom: theme.spacing['2xl'] }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
              <div style={{
                padding: theme.spacing.md,
                backgroundColor: theme.colors.accent.primary,
                borderRadius: theme.radius.lg
              }}>
                <Ticket size={24} style={{ color: theme.colors.text.inverse }} />
              </div>
              <div>
                <h1 style={{
                  fontSize: theme.fontSize['3xl'],
                  fontWeight: theme.fontWeight.bold,
                  color: theme.colors.text.primary,
                  margin: 0,
                  lineHeight: theme.lineHeight.tight
                }}>Support Tickets</h1>
                <p style={{
                  marginTop: theme.spacing.xs,
                  marginBottom: 0,
                  color: theme.colors.text.tertiary,
                  fontSize: theme.fontSize.sm
                }}>Manage and track customer support tickets</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: theme.spacing.md }}>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.sm,
                  padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                  backgroundColor: theme.colors.background.secondary,
                  border: `1px solid ${theme.colors.border.medium}`,
                  borderRadius: theme.radius.md,
                  color: theme.colors.text.secondary,
                  fontSize: theme.fontSize.sm,
                  fontWeight: theme.fontWeight.medium,
                  cursor: refreshing ? 'not-allowed' : 'pointer',
                  opacity: refreshing ? 0.5 : 1,
                  transition: theme.transitions.fast,
                  height: '40px',
                  boxSizing: 'border-box'
                }}
                onMouseEnter={(e) => !refreshing && (e.currentTarget.style.backgroundColor = theme.colors.background.tertiary)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.colors.background.secondary)}
              >
                <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                Refresh
              </button>

              {/* Create New Ticket - available to all authenticated users */}
              {(isSiteAdmin() || hasRole('admin') || hasRole('manager') || hasRole('technician')) && (
                <button
                  onClick={() => navigate('/tickets/new')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.sm,
                    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                    backgroundColor: theme.colors.accent.primary,
                    border: 'none',
                    borderRadius: theme.radius.md,
                    color: theme.colors.text.inverse,
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    cursor: 'pointer',
                    boxShadow: theme.shadows.sm,
                    transition: theme.transitions.fast,
                    height: '40px',
                    boxSizing: 'border-box'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.colors.accent.primaryHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.colors.accent.primary)}
                >
                  <Plus size={18} />
                  Create New Ticket
                </button>
              )}
            </div>
          </div>
        </div>

          {/* Tabs */}
          <div role="tablist" style={{ display: 'flex', gap: theme.spacing.md, marginTop: theme.spacing.xl, marginBottom: theme.spacing.xl }}>
            <button
              role="tab"
              aria-selected={activeTab === 'active'}
              aria-controls="active-tab-panel"
              id="active-tab"
              onClick={() => handleTabChange('active')}
              style={getTabStyle(activeTab === 'active')}
              onMouseEnter={(e) => {
                if (activeTab !== 'active') {
                  e.currentTarget.style.backgroundColor = theme.colors.background.hover;
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'active') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <Ticket size={18} />
              Active Tickets
              {(unassignedPagination?.totalCount || 0) + (myTicketsPagination?.totalCount || 0) > 0 && (
                <Badge color="blue" style={{ marginLeft: '4px' }}>
                  {(unassignedPagination?.totalCount || 0) + (myTicketsPagination?.totalCount || 0)}
                </Badge>
              )}
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'closed'}
              aria-controls="closed-tab-panel"
              id="closed-tab"
              onClick={() => handleTabChange('closed')}
              style={getTabStyle(activeTab === 'closed')}
              onMouseEnter={(e) => {
                if (activeTab !== 'closed') {
                  e.currentTarget.style.backgroundColor = theme.colors.background.hover;
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'closed') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <Archive size={18} />
              Closed Tickets
              {closedPagination?.totalCount > 0 && (
                <Badge color="gray" style={{ marginLeft: '4px' }}>
                  {closedPagination.totalCount}
                </Badge>
              )}
            </button>
          </div>

          {/* Active Tickets Tab Content */}
          {activeTab === 'active' && (
            <div role="tabpanel" id="active-tab-panel" aria-labelledby="active-tab">
              {/* Unassigned Queue Section */}
              <Card style={{ marginBottom: theme.spacing['2xl'] }}>
                <div style={{
                  padding: theme.spacing.xl,
                  borderBottom: `1px solid ${theme.colors.border.light}`
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: theme.spacing.lg
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
                      <h2 style={{
                        fontSize: theme.fontSize.xl,
                        fontWeight: theme.fontWeight.semibold,
                        color: theme.colors.text.primary,
                        margin: 0
                      }}>Unassigned Tickets</h2>
                      <Badge color="blue">{unassignedPagination?.totalCount || 0}</Badge>
                    </div>
                    <p style={{
                      fontSize: theme.fontSize.sm,
                      color: theme.colors.text.tertiary,
                      margin: 0
                    }}>
                      Drag tickets to "My Tickets" to assign
                    </p>
                  </div>

                  {/* Search and Sort */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.md
                  }}>
                    <div style={{ flex: 1, position: 'relative', minWidth: '200px' }}>
                      <Search
                        size={16}
                        style={{
                          position: 'absolute',
                          left: theme.spacing.md,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: theme.colors.text.tertiary,
                          pointerEvents: 'none'
                        }}
                        aria-hidden="true"
                      />
                      <input
                        type="text"
                        id="unassigned-search"
                        aria-label="Search unassigned tickets by ticket number, customer name, or phone"
                        placeholder="Search tickets, customer name, or phone"
                        value={unassignedSearch}
                        onChange={(e) => setUnassignedSearch(e.target.value)}
                        style={{
                          width: '100%',
                          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                          paddingLeft: `calc(${theme.spacing.md} + 16px + ${theme.spacing.sm})`,
                          backgroundColor: theme.colors.background.tertiary,
                          color: theme.colors.text.primary,
                          border: `1px solid ${theme.colors.border.medium}`,
                          borderRadius: theme.radius.md,
                          fontSize: theme.fontSize.sm,
                          lineHeight: theme.lineHeight.normal,
                          outline: 'none',
                          transition: theme.transitions.fast,
                          height: '38px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <select
                      id="unassigned-sort"
                      aria-label="Sort unassigned tickets"
                      value={unassignedSort}
                      onChange={(e) => setUnassignedSort(e.target.value)}
                      style={{
                        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                        paddingRight: theme.spacing.xl,
                        backgroundColor: theme.colors.background.tertiary,
                        color: theme.colors.text.primary,
                        border: `1px solid ${theme.colors.border.medium}`,
                        borderRadius: theme.radius.md,
                        fontSize: theme.fontSize.sm,
                        fontWeight: theme.fontWeight.medium,
                        cursor: 'pointer',
                        outline: 'none',
                        minWidth: '180px',
                        height: '38px',
                        boxSizing: 'border-box',
                        transition: theme.transitions.fast
                      }}
                    >
                      <option value="priority">Sort by Priority</option>
                      <option value="created">Sort by Created Date</option>
                      <option value="customer">Sort by Customer Name</option>
                    </select>
                  </div>
                </div>

                {/* Unassigned Tickets Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{
                      backgroundColor: theme.colors.background.tertiary,
                      borderBottom: `1px solid ${theme.colors.border.light}`
                    }}>
                      <tr>
                        <th scope="col" style={{
                          padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                          textAlign: 'left',
                          fontSize: theme.fontSize.xs,
                          fontWeight: theme.fontWeight.semibold,
                          color: theme.colors.text.primary,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          minWidth: '120px',
                          width: '120px'
                        }}>
                          Ticket #
                        </th>
                        <th scope="col" style={{
                          padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                          textAlign: 'left',
                          fontSize: theme.fontSize.xs,
                          fontWeight: theme.fontWeight.semibold,
                          color: theme.colors.text.primary,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          minWidth: '300px'
                        }}>
                          Subject
                        </th>
                        <th scope="col" style={{
                          padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                          textAlign: 'left',
                          fontSize: theme.fontSize.xs,
                          fontWeight: theme.fontWeight.semibold,
                          color: theme.colors.text.primary,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Priority
                        </th>
                        <th scope="col" style={{
                          padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                          textAlign: 'left',
                          fontSize: theme.fontSize.xs,
                          fontWeight: theme.fontWeight.semibold,
                          color: theme.colors.text.primary,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Urgency
                        </th>
                        <th scope="col" style={{
                          padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                          textAlign: 'left',
                          fontSize: theme.fontSize.xs,
                          fontWeight: theme.fontWeight.semibold,
                          color: theme.colors.text.primary,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Customer
                        </th>
                        <th scope="col" style={{
                          padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                          textAlign: 'left',
                          fontSize: theme.fontSize.xs,
                          fontWeight: theme.fontWeight.semibold,
                          color: theme.colors.text.primary,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Created
                        </th>
                        <th scope="col" style={{
                          padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                          textAlign: 'left',
                          fontSize: theme.fontSize.xs,
                          fontWeight: theme.fontWeight.semibold,
                          color: theme.colors.text.primary,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody style={{ backgroundColor: theme.colors.background.secondary }}>
                      {loading ? (
                        <>
                          <SkeletonRow />
                          <SkeletonRow />
                          <SkeletonRow />
                        </>
                      ) : filteredUnassigned.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ padding: 0 }}>
                            <div style={{
                              textAlign: 'center',
                              padding: `${theme.spacing['2xl']} ${theme.spacing.lg}`,
                              backgroundColor: theme.colors.background.primary
                            }}>
                              <PartyPopper size={48} style={{ color: theme.colors.border.medium, margin: '0 auto', marginBottom: theme.spacing.md }} />
                              <p style={{
                                fontSize: theme.fontSize.base,
                                fontWeight: theme.fontWeight.medium,
                                color: theme.colors.text.secondary,
                                marginBottom: theme.spacing.xs
                              }}>No unassigned tickets</p>
                              <p style={{
                                fontSize: theme.fontSize.sm,
                                color: theme.colors.text.tertiary
                              }}>All tickets are assigned!</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredUnassigned.map((ticket, index) => {
                          const priorityConfig = getPriorityBadge(ticket.priority);
                          const urgencyConfig = getUrgencyBadge(ticket.urgency);
                          const PriorityIcon = priorityConfig.icon;
                          const hasUnreadComments = ticket.unread_customer_comments > 0;

                          const isDragging = draggingTicketId === ticket.ticket_id;

                          return (
                            <tr
                              key={ticket.ticket_id}
                              draggable="true"
                              onDragStart={(e) => handleDragStart(e, ticket)}
                              onDragEnd={handleDragEnd}
                              onClick={() => handleTicketClick(ticket.ticket_id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleTicketClick(ticket.ticket_id);
                                }
                              }}
                              tabIndex={0}
                              aria-label={`View ticket ${ticket.ticket_number}. Drag to My Tickets to assign.`}
                              style={{
                                cursor: isDragging ? 'grabbing' : 'grab',
                                transition: theme.transitions.fast,
                                borderBottom: index < filteredUnassigned.length - 1 ? `1px solid ${theme.colors.border.light}` : 'none',
                                opacity: isDragging ? 0.5 : 1,
                                backgroundColor: isDragging ? theme.colors.background.tertiary : 'transparent'
                              }}
                              onMouseEnter={(e) => {
                                if (!isDragging) {
                                  e.currentTarget.style.backgroundColor = theme.colors.background.hover;
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isDragging) {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }
                              }}
                            >
                              <td style={{
                                padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
                                whiteSpace: 'nowrap',
                                minWidth: '120px',
                                width: '120px'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
                                  <GripVertical
                                    size={16}
                                    style={{
                                      color: isDragging ? theme.colors.accent.primary : theme.colors.text.tertiary,
                                      flexShrink: 0,
                                      cursor: 'grab'
                                    }}
                                    aria-hidden="true"
                                  />
                                  <span style={{
                                    fontSize: theme.fontSize.sm,
                                    fontWeight: theme.fontWeight.bold,
                                    color: theme.colors.accent.info
                                  }}>
                                    #{ticket.ticket_number}
                                  </span>
                                  {hasUnreadComments && (
                                    <span
                                      style={{
                                        width: '8px',
                                        height: '8px',
                                        backgroundColor: theme.colors.accent.warning,
                                        borderRadius: theme.radius.full
                                      }}
                                      title="Unread customer comments"
                                    />
                                  )}
                                </div>
                              </td>
                              <td style={{
                                padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
                                minWidth: '300px'
                              }}>
                                <span style={{
                                  fontSize: theme.fontSize.sm,
                                  fontWeight: theme.fontWeight.medium,
                                  color: theme.colors.text.primary
                                }}>{truncate(ticket.subject, 60)}</span>
                              </td>
                              <td style={{
                                padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
                                whiteSpace: 'nowrap'
                              }}>
                                <Badge color={priorityConfig.color}>
                                  <PriorityIcon style={{ width: '12px', height: '12px', marginRight: theme.spacing.xs }} />
                                  {priorityConfig.label}
                                </Badge>
                              </td>
                              <td style={{
                                padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
                                whiteSpace: 'nowrap'
                              }}>
                                {urgencyConfig ? (
                                  <Badge color={urgencyConfig.color}>{urgencyConfig.label}</Badge>
                                ) : (
                                  <span style={{
                                    fontSize: theme.fontSize.sm,
                                    color: theme.colors.text.tertiary
                                  }}>N/A</span>
                                )}
                              </td>
                              <td style={{ padding: `${theme.spacing.lg} ${theme.spacing.xl}` }}>
                                <div>
                                  <div style={{
                                    fontSize: theme.fontSize.sm,
                                    fontWeight: theme.fontWeight.medium,
                                    color: theme.colors.text.primary
                                  }}>{ticket.customer_name || 'N/A'}</div>
                                  <div style={{
                                    fontSize: theme.fontSize.sm,
                                    color: theme.colors.text.secondary
                                  }}>{ticket.customer_phone || 'No phone'}</div>
                                </div>
                              </td>
                              <td style={{
                                padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
                                whiteSpace: 'nowrap',
                                fontSize: theme.fontSize.sm,
                                color: theme.colors.text.secondary
                              }}>
                                {getRelativeTime(ticket.created_at)}
                              </td>
                              {/* Assign button - only for manager+ */}
                              {(isSiteAdmin() || hasRole('admin') || hasRole('manager')) && (
                                <td
                                  style={{
                                    padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
                                    whiteSpace: 'nowrap'
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={() => handleAssignToMe(ticket.ticket_id, ticket.ticket_number)}
                                    disabled={assigningTicket === ticket.ticket_id}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: theme.spacing.sm,
                                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                      backgroundColor: theme.colors.accent.primary,
                                      color: theme.colors.text.inverse,
                                      fontSize: theme.fontSize.sm,
                                      fontWeight: theme.fontWeight.medium,
                                      border: 'none',
                                      borderRadius: theme.radius.md,
                                      cursor: assigningTicket === ticket.ticket_id ? 'not-allowed' : 'pointer',
                                      opacity: assigningTicket === ticket.ticket_id ? 0.5 : 1,
                                      transition: theme.transitions.fast
                                    }}
                                    onMouseEnter={(e) => {
                                      if (assigningTicket !== ticket.ticket_id) {
                                        e.currentTarget.style.backgroundColor = theme.colors.accent.primaryHover;
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = theme.colors.accent.primary;
                                    }}
                                  >
                                    <UserPlus size={16} />
                                    {assigningTicket === ticket.ticket_id ? 'Assigning...' : 'Assign to Me'}
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination for Unassigned Tickets */}
                {unassignedPagination && unassignedPagination.totalCount > 0 && (
                  <Pagination
                    currentPage={unassignedPagination.page}
                    totalPages={unassignedPagination.totalPages}
                    pageSize={unassignedPagination.limit}
                    totalCount={unassignedPagination.totalCount}
                    onPageChange={handleUnassignedPageChange}
                    onPageSizeChange={handleUnassignedPageSizeChange}
                    loading={loading || refreshing}
                  />
                )}
              </Card>

              {/* My Tickets Section - Drop Target */}
              <Card
                id="my-tickets-section"
                aria-dropeffect={draggingTicketId ? "move" : "none"}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  transition: theme.transitions.normal,
                  border: isDragOverMyTickets
                    ? `2px dashed ${theme.colors.accent.primary}`
                    : `1px solid ${theme.colors.border.light}`,
                  backgroundColor: isDragOverMyTickets
                    ? theme.colors.accent.primaryLight
                    : theme.colors.background.secondary,
                  boxShadow: isDragOverMyTickets
                    ? theme.shadows.md
                    : theme.shadows.sm
                }}
              >
                <div style={{
                  padding: theme.spacing.xl,
                  borderBottom: `1px solid ${theme.colors.border.light}`
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: theme.spacing.lg
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
                      <h2 style={{
                        fontSize: theme.fontSize.xl,
                        fontWeight: theme.fontWeight.semibold,
                        color: theme.colors.text.primary,
                        margin: 0
                      }}>My Tickets</h2>
                      <Badge color="purple">{myTicketsPagination?.totalCount || 0}</Badge>
                      {isDragOverMyTickets && (
                        <span style={{
                          fontSize: theme.fontSize.sm,
                          color: theme.colors.accent.primary,
                          fontWeight: theme.fontWeight.medium
                        }}>
                          Drop to assign
                        </span>
                      )}
                    </div>
                    <p style={{
                      fontSize: theme.fontSize.sm,
                      color: theme.colors.text.tertiary,
                      margin: 0
                    }}>
                      {draggingTicketId ? 'Drop ticket here to assign to yourself' : 'Tickets assigned to you'}
                    </p>
                  </div>

                  {/* Search, Filter, and Sort */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.md
                  }}>
                    <div style={{ flex: 1, position: 'relative', minWidth: '200px' }}>
                      <Search
                        size={16}
                        style={{
                          position: 'absolute',
                          left: theme.spacing.md,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: theme.colors.text.tertiary,
                          pointerEvents: 'none'
                        }}
                        aria-hidden="true"
                      />
                      <input
                        type="text"
                        id="my-tickets-search"
                        aria-label="Search my assigned tickets"
                        placeholder="Search tickets, customer name, or phone"
                        value={myTicketsSearch}
                        onChange={(e) => setMyTicketsSearch(e.target.value)}
                        style={{
                          width: '100%',
                          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                          paddingLeft: `calc(${theme.spacing.md} + 16px + ${theme.spacing.sm})`,
                          backgroundColor: theme.colors.background.tertiary,
                          color: theme.colors.text.primary,
                          border: `1px solid ${theme.colors.border.medium}`,
                          borderRadius: theme.radius.md,
                          fontSize: theme.fontSize.sm,
                          lineHeight: theme.lineHeight.normal,
                          outline: 'none',
                          transition: theme.transitions.fast,
                          height: '38px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <select
                      id="my-tickets-status-filter"
                      aria-label="Filter my tickets by status"
                      value={myTicketsStatusFilter}
                      onChange={(e) => setMyTicketsStatusFilter(e.target.value)}
                      style={{
                        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                        paddingRight: theme.spacing.xl,
                        backgroundColor: theme.colors.background.tertiary,
                        color: theme.colors.text.primary,
                        border: `1px solid ${theme.colors.border.medium}`,
                        borderRadius: theme.radius.md,
                        fontSize: theme.fontSize.sm,
                        fontWeight: theme.fontWeight.medium,
                        cursor: 'pointer',
                        outline: 'none',
                        minWidth: '150px',
                        height: '38px',
                        boxSizing: 'border-box',
                        transition: theme.transitions.fast
                      }}
                    >
                      <option value="all">All Statuses</option>
                      <option value="open">Open</option>
                      <option value="assigned">Assigned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="waiting_customer">Waiting Customer</option>
                      <option value="resolved">Resolved</option>
                    </select>
                    <select
                      id="my-tickets-sort"
                      aria-label="Sort my tickets"
                      value={myTicketsSort}
                      onChange={(e) => setMyTicketsSort(e.target.value)}
                      style={{
                        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                        paddingRight: theme.spacing.xl,
                        backgroundColor: theme.colors.background.tertiary,
                        color: theme.colors.text.primary,
                        border: `1px solid ${theme.colors.border.medium}`,
                        borderRadius: theme.radius.md,
                        fontSize: theme.fontSize.sm,
                        fontWeight: theme.fontWeight.medium,
                        cursor: 'pointer',
                        outline: 'none',
                        minWidth: '180px',
                        height: '38px',
                        boxSizing: 'border-box',
                        transition: theme.transitions.fast
                      }}
                    >
                      <option value="last_activity">Sort by Last Activity</option>
                      <option value="status">Sort by Status</option>
                      <option value="priority">Sort by Priority</option>
                    </select>
                  </div>
                </div>

                {/* My Tickets Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{
                      backgroundColor: theme.colors.background.tertiary,
                      borderBottom: `1px solid ${theme.colors.border.light}`
                    }}>
                      <tr>
                        <th scope="col" style={{
                          padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                          textAlign: 'left',
                          fontSize: theme.fontSize.xs,
                          fontWeight: theme.fontWeight.semibold,
                          color: theme.colors.text.primary,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          minWidth: '100px',
                          width: '100px'
                        }}>
                          Ticket #
                        </th>
                        <th scope="col" style={{
                          padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                          textAlign: 'left',
                          fontSize: theme.fontSize.xs,
                          fontWeight: theme.fontWeight.semibold,
                          color: theme.colors.text.primary,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          minWidth: '300px'
                        }}>
                          Subject
                        </th>
                        <th scope="col" style={{
                          padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                          textAlign: 'left',
                          fontSize: theme.fontSize.xs,
                          fontWeight: theme.fontWeight.semibold,
                          color: theme.colors.text.primary,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Status
                        </th>
                        <th scope="col" style={{
                          padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                          textAlign: 'left',
                          fontSize: theme.fontSize.xs,
                          fontWeight: theme.fontWeight.semibold,
                          color: theme.colors.text.primary,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Priority
                        </th>
                        <th scope="col" style={{
                          padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                          textAlign: 'left',
                          fontSize: theme.fontSize.xs,
                          fontWeight: theme.fontWeight.semibold,
                          color: theme.colors.text.primary,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Customer
                        </th>
                        <th scope="col" style={{
                          padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                          textAlign: 'left',
                          fontSize: theme.fontSize.xs,
                          fontWeight: theme.fontWeight.semibold,
                          color: theme.colors.text.primary,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Last Activity
                        </th>
                        <th scope="col" style={{
                          padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                          textAlign: 'left',
                          fontSize: theme.fontSize.xs,
                          fontWeight: theme.fontWeight.semibold,
                          color: theme.colors.text.primary,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Unread
                        </th>
                      </tr>
                    </thead>
                    <tbody style={{ backgroundColor: theme.colors.background.secondary }}>
                      {loading ? (
                        <>
                          <SkeletonRow />
                          <SkeletonRow />
                          <SkeletonRow />
                        </>
                      ) : filteredMyTickets.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ padding: 0 }}>
                            <div style={{
                              textAlign: 'center',
                              padding: `${theme.spacing['2xl']} ${theme.spacing.lg}`,
                              backgroundColor: theme.colors.background.primary
                            }}>
                              <Ticket size={48} style={{ color: theme.colors.border.medium, margin: '0 auto', marginBottom: theme.spacing.md }} />
                              <p style={{
                                fontSize: theme.fontSize.base,
                                fontWeight: theme.fontWeight.medium,
                                color: theme.colors.text.secondary,
                                marginBottom: theme.spacing.xs
                              }}>
                                No tickets assigned to you
                              </p>
                              <p style={{
                                fontSize: theme.fontSize.sm,
                                color: theme.colors.text.tertiary
                              }}>
                                Assign tickets from the queue above
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredMyTickets.map((ticket, index) => {
                          const statusConfig = getStatusBadge(ticket.status);
                          const priorityConfig = getPriorityBadge(ticket.priority);
                          const StatusIcon = statusConfig.icon;
                          const PriorityIcon = priorityConfig.icon;
                          const hasUnreadComments = ticket.unread_customer_comments > 0;

                          return (
                            <tr
                              key={ticket.ticket_id}
                              onClick={() => handleTicketClick(ticket.ticket_id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleTicketClick(ticket.ticket_id);
                                }
                              }}
                              tabIndex={0}
                              aria-label={`View ticket ${ticket.ticket_number}`}
                              style={{
                                cursor: 'pointer',
                                transition: theme.transitions.fast,
                                backgroundColor: hasUnreadComments ? theme.colors.accent.warningLight : 'transparent',
                                borderBottom: index < filteredMyTickets.length - 1 ? `1px solid ${theme.colors.border.light}` : 'none'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hasUnreadComments ? theme.colors.accent.warningLight : theme.colors.background.hover}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = hasUnreadComments ? theme.colors.accent.warningLight : 'transparent'}
                            >
                              <td style={{
                                padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
                                whiteSpace: 'nowrap',
                                minWidth: '100px',
                                width: '100px'
                              }}>
                                <span style={{
                                  fontSize: theme.fontSize.sm,
                                  fontWeight: theme.fontWeight.bold,
                                  color: theme.colors.accent.info
                                }}>
                                  #{ticket.ticket_number}
                                </span>
                              </td>
                              <td style={{
                                padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
                                minWidth: '300px'
                              }}>
                                <span style={{
                                  fontSize: theme.fontSize.sm,
                                  fontWeight: theme.fontWeight.medium,
                                  color: theme.colors.text.primary
                                }}>{truncate(ticket.subject, 60)}</span>
                              </td>
                              <td style={{
                                padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
                                whiteSpace: 'nowrap'
                              }}>
                                <Badge color={statusConfig.color}>
                                  <StatusIcon style={{ width: '12px', height: '12px', marginRight: theme.spacing.xs }} />
                                  {statusConfig.label}
                                </Badge>
                              </td>
                              <td style={{
                                padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
                                whiteSpace: 'nowrap'
                              }}>
                                <Badge color={priorityConfig.color}>
                                  <PriorityIcon style={{ width: '12px', height: '12px', marginRight: theme.spacing.xs }} />
                                  {priorityConfig.label}
                                </Badge>
                              </td>
                              <td style={{ padding: `${theme.spacing.lg} ${theme.spacing.xl}` }}>
                                <span style={{
                                  fontSize: theme.fontSize.sm,
                                  color: theme.colors.text.primary
                                }}>{ticket.customer_name || 'N/A'}</span>
                              </td>
                              <td style={{
                                padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
                                whiteSpace: 'nowrap',
                                fontSize: theme.fontSize.sm,
                                color: theme.colors.text.secondary
                              }}>
                                {getRelativeTime(ticket.updated_at || ticket.created_at)}
                              </td>
                              <td style={{
                                padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
                                whiteSpace: 'nowrap'
                              }}>
                                {hasUnreadComments && (
                                  <Badge color="orange">
                                    {ticket.unread_customer_comments}
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination for My Tickets */}
                {myTicketsPagination && myTicketsPagination.totalCount > 0 && (
                  <Pagination
                    currentPage={myTicketsPagination.page}
                    totalPages={myTicketsPagination.totalPages}
                    pageSize={myTicketsPagination.limit}
                    totalCount={myTicketsPagination.totalCount}
                    onPageChange={handleMyTicketsPageChange}
                    onPageSizeChange={handleMyTicketsPageSizeChange}
                    loading={loading || refreshing}
                  />
                )}
              </Card>
            </div>
          )}

          {/* Closed Tickets Tab Content */}
          {activeTab === 'closed' && (
            <div role="tabpanel" id="closed-tab-panel" aria-labelledby="closed-tab">
            {/* Loading state announcement for screen readers */}
            {closedLoading && (
              <div role="status" aria-live="polite" style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
                Loading closed tickets...
              </div>
            )}
            <Card>
              <div style={{
                padding: theme.spacing.xl,
                borderBottom: `1px solid ${theme.colors.border.light}`
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: theme.spacing.lg
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
                    <h2 style={{
                      fontSize: theme.fontSize.xl,
                      fontWeight: theme.fontWeight.semibold,
                      color: theme.colors.text.primary,
                      margin: 0
                    }}>Closed Tickets</h2>
                    <Badge color="gray">{closedPagination?.totalCount || 0}</Badge>
                  </div>
                  <p style={{
                    fontSize: theme.fontSize.sm,
                    color: theme.colors.text.tertiary,
                    margin: 0
                  }}>Resolved, closed, and cancelled tickets</p>
                </div>

                {/* Filter Bar */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: theme.spacing.md,
                  alignItems: 'flex-end'
                }}>
                  {/* Search Input */}
                  <div style={{ flex: '1', minWidth: '200px' }}>
                    <label htmlFor="closed-tickets-search" style={{
                      display: 'block',
                      fontSize: theme.fontSize.xs,
                      color: theme.colors.text.secondary,
                      marginBottom: theme.spacing.xs,
                      fontWeight: theme.fontWeight.medium
                    }}>
                      Search
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Search
                        size={16}
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          left: theme.spacing.md,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: theme.colors.text.tertiary,
                          pointerEvents: 'none'
                        }}
                      />
                      <input
                        type="text"
                        id="closed-tickets-search"
                        placeholder="Ticket #, subject, or customer"
                        value={closedSearchInput}
                        onChange={(e) => setClosedSearchInput(e.target.value)}
                        style={{
                          width: '100%',
                          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                          paddingLeft: `calc(${theme.spacing.md} + 16px + ${theme.spacing.sm})`,
                          backgroundColor: theme.colors.background.tertiary,
                          color: theme.colors.text.primary,
                          border: `1px solid ${theme.colors.border.medium}`,
                          borderRadius: theme.radius.md,
                          fontSize: theme.fontSize.sm,
                          lineHeight: theme.lineHeight.normal,
                          outline: 'none',
                          height: '38px',
                          boxSizing: 'border-box',
                          transition: theme.transitions.fast
                        }}
                      />
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div style={{ minWidth: '140px' }}>
                    <label htmlFor="closed-status-filter" style={{
                      display: 'block',
                      fontSize: theme.fontSize.xs,
                      color: theme.colors.text.secondary,
                      marginBottom: theme.spacing.xs,
                      fontWeight: theme.fontWeight.medium
                    }}>
                      Status
                    </label>
                    <select
                      id="closed-status-filter"
                      value={closedStatusFilter}
                      onChange={(e) => {
                        setClosedStatusFilter(e.target.value);
                        setClosedPage(1);
                      }}
                      style={{
                        width: '100%',
                        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                        paddingRight: theme.spacing.xl,
                        backgroundColor: theme.colors.background.tertiary,
                        color: theme.colors.text.primary,
                        border: `1px solid ${theme.colors.border.medium}`,
                        borderRadius: theme.radius.md,
                        fontSize: theme.fontSize.sm,
                        cursor: 'pointer',
                        outline: 'none',
                        height: '38px',
                        boxSizing: 'border-box',
                        transition: theme.transitions.fast
                      }}
                    >
                      <option value="all">All Closed</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  {/* Date From */}
                  <div style={{ minWidth: '150px' }}>
                    <label htmlFor="closed-date-from" style={{
                      display: 'block',
                      fontSize: theme.fontSize.xs,
                      color: theme.colors.text.secondary,
                      marginBottom: theme.spacing.xs,
                      fontWeight: theme.fontWeight.medium
                    }}>
                      Date From
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Calendar
                        size={16}
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          left: theme.spacing.md,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: theme.colors.text.tertiary,
                          pointerEvents: 'none'
                        }}
                      />
                      <input
                        type="date"
                        id="closed-date-from"
                        value={closedDateFrom}
                        onChange={(e) => {
                          setClosedDateFrom(e.target.value);
                          setClosedPage(1);
                        }}
                        style={{
                          width: '100%',
                          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                          paddingLeft: `calc(${theme.spacing.md} + 16px + ${theme.spacing.sm})`,
                          backgroundColor: theme.colors.background.tertiary,
                          color: theme.colors.text.primary,
                          border: `1px solid ${theme.colors.border.medium}`,
                          borderRadius: theme.radius.md,
                          fontSize: theme.fontSize.sm,
                          outline: 'none',
                          height: '38px',
                          boxSizing: 'border-box',
                          transition: theme.transitions.fast
                        }}
                      />
                    </div>
                  </div>

                  {/* Date To */}
                  <div style={{ minWidth: '150px' }}>
                    <label htmlFor="closed-date-to" style={{
                      display: 'block',
                      fontSize: theme.fontSize.xs,
                      color: theme.colors.text.secondary,
                      marginBottom: theme.spacing.xs,
                      fontWeight: theme.fontWeight.medium
                    }}>
                      Date To
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Calendar
                        size={16}
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          left: theme.spacing.md,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: theme.colors.text.tertiary,
                          pointerEvents: 'none'
                        }}
                      />
                      <input
                        type="date"
                        id="closed-date-to"
                        value={closedDateTo}
                        onChange={(e) => {
                          setClosedDateTo(e.target.value);
                          setClosedPage(1);
                        }}
                        style={{
                          width: '100%',
                          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                          paddingLeft: `calc(${theme.spacing.md} + 16px + ${theme.spacing.sm})`,
                          backgroundColor: theme.colors.background.tertiary,
                          color: theme.colors.text.primary,
                          border: `1px solid ${theme.colors.border.medium}`,
                          borderRadius: theme.radius.md,
                          fontSize: theme.fontSize.sm,
                          outline: 'none',
                          height: '38px',
                          boxSizing: 'border-box',
                          transition: theme.transitions.fast
                        }}
                      />
                    </div>
                  </div>

                  {/* Sort By */}
                  <div style={{ minWidth: '150px' }}>
                    <label htmlFor="closed-sort-by" style={{
                      display: 'block',
                      fontSize: theme.fontSize.xs,
                      color: theme.colors.text.secondary,
                      marginBottom: theme.spacing.xs,
                      fontWeight: theme.fontWeight.medium
                    }}>
                      Sort By
                    </label>
                    <select
                      id="closed-sort-by"
                      value={closedSortBy}
                      onChange={(e) => {
                        setClosedSortBy(e.target.value);
                        setClosedPage(1);
                      }}
                      style={{
                        width: '100%',
                        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                        paddingRight: theme.spacing.xl,
                        backgroundColor: theme.colors.background.tertiary,
                        color: theme.colors.text.primary,
                        border: `1px solid ${theme.colors.border.medium}`,
                        borderRadius: theme.radius.md,
                        fontSize: theme.fontSize.sm,
                        cursor: 'pointer',
                        outline: 'none',
                        height: '38px',
                        boxSizing: 'border-box',
                        transition: theme.transitions.fast
                      }}
                    >
                      <option value="closed_date">Closed Date</option>
                      <option value="created_at">Created Date</option>
                      <option value="priority">Priority</option>
                      <option value="ticket_number">Ticket #</option>
                    </select>
                  </div>

                  {/* Clear Filters Button */}
                  {hasActiveClosedFilters && (
                    <button
                      onClick={handleClearClosedFilters}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: theme.spacing.sm,
                        padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                        backgroundColor: 'transparent',
                        border: `1px solid ${theme.colors.border.medium}`,
                        borderRadius: theme.radius.md,
                        color: theme.colors.text.secondary,
                        fontSize: theme.fontSize.sm,
                        fontWeight: theme.fontWeight.medium,
                        cursor: 'pointer',
                        transition: theme.transitions.fast,
                        height: '38px',
                        boxSizing: 'border-box'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme.colors.background.tertiary;
                        e.currentTarget.style.color = theme.colors.text.primary;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = theme.colors.text.secondary;
                      }}
                    >
                      <Filter size={14} />
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>

              {/* Closed Tickets Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{
                    backgroundColor: theme.colors.background.tertiary,
                    borderBottom: `1px solid ${theme.colors.border.light}`
                  }}>
                    <tr>
                      <th scope="col" style={{
                        padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                        textAlign: 'left',
                        fontSize: theme.fontSize.xs,
                        fontWeight: theme.fontWeight.semibold,
                        color: theme.colors.text.primary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        minWidth: '100px',
                        width: '100px'
                      }}>
                        Ticket #
                      </th>
                      <th scope="col" style={{
                        padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                        textAlign: 'left',
                        fontSize: theme.fontSize.xs,
                        fontWeight: theme.fontWeight.semibold,
                        color: theme.colors.text.primary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        minWidth: '220px'
                      }}>
                        Subject
                      </th>
                      <th scope="col" style={{
                        padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                        textAlign: 'left',
                        fontSize: theme.fontSize.xs,
                        fontWeight: theme.fontWeight.semibold,
                        color: theme.colors.text.primary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Status
                      </th>
                      <th scope="col" style={{
                        padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                        textAlign: 'left',
                        fontSize: theme.fontSize.xs,
                        fontWeight: theme.fontWeight.semibold,
                        color: theme.colors.text.primary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Priority
                      </th>
                      <th scope="col" style={{
                        padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                        textAlign: 'left',
                        fontSize: theme.fontSize.xs,
                        fontWeight: theme.fontWeight.semibold,
                        color: theme.colors.text.primary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Customer
                      </th>
                      <th scope="col" style={{
                        padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                        textAlign: 'left',
                        fontSize: theme.fontSize.xs,
                        fontWeight: theme.fontWeight.semibold,
                        color: theme.colors.text.primary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Closed
                      </th>
                      <th scope="col" style={{
                        padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                        textAlign: 'left',
                        fontSize: theme.fontSize.xs,
                        fontWeight: theme.fontWeight.semibold,
                        color: theme.colors.text.primary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        minWidth: '180px'
                      }}>
                        Resolution
                      </th>
                    </tr>
                  </thead>
                  <tbody style={{ backgroundColor: theme.colors.background.secondary }}>
                    {closedLoading ? (
                      <>
                        <ClosedSkeletonRow />
                        <ClosedSkeletonRow />
                        <ClosedSkeletonRow />
                        <ClosedSkeletonRow />
                        <ClosedSkeletonRow />
                      </>
                    ) : closedTickets.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ padding: 0 }}>
                          <div style={{
                            textAlign: 'center',
                            padding: `${theme.spacing['2xl']} ${theme.spacing.lg}`,
                            backgroundColor: theme.colors.background.primary
                          }}>
                            <Archive size={48} style={{ color: theme.colors.border.medium, margin: '0 auto', marginBottom: theme.spacing.md }} />
                            <p style={{
                              fontSize: theme.fontSize.base,
                              fontWeight: theme.fontWeight.medium,
                              color: theme.colors.text.secondary,
                              marginBottom: theme.spacing.xs
                            }}>
                              No closed tickets found
                            </p>
                            <p style={{
                              fontSize: theme.fontSize.sm,
                              color: theme.colors.text.tertiary
                            }}>
                              {hasActiveClosedFilters
                                ? 'Try adjusting your filters to find more tickets'
                                : 'Closed tickets will appear here once resolved'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      closedTickets.map((ticket, index) => {
                        const statusConfig = getStatusBadge(ticket.status);
                        const priorityConfig = getPriorityBadge(ticket.priority);
                        const StatusIcon = statusConfig.icon;
                        const PriorityIcon = priorityConfig.icon;

                        return (
                          <tr
                            key={ticket.ticket_id}
                            onClick={() => handleTicketClick(ticket.ticket_id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleTicketClick(ticket.ticket_id);
                              }
                            }}
                            tabIndex={0}
                            aria-label={`View ticket ${ticket.ticket_number}`}
                            style={{
                              cursor: 'pointer',
                              transition: theme.transitions.fast,
                              borderBottom: index < closedTickets.length - 1 ? `1px solid ${theme.colors.border.light}` : 'none'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.background.hover}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <td style={{
                              padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
                              whiteSpace: 'nowrap',
                              minWidth: '100px',
                              width: '100px'
                            }}>
                              <span style={{
                                fontSize: theme.fontSize.sm,
                                fontWeight: theme.fontWeight.bold,
                                color: theme.colors.accent.info
                              }}>
                                #{ticket.ticket_number}
                              </span>
                            </td>
                            <td style={{
                              padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
                              minWidth: '220px'
                            }}>
                              <span style={{
                                fontSize: theme.fontSize.sm,
                                fontWeight: theme.fontWeight.medium,
                                color: theme.colors.text.primary
                              }}>
                                {truncate(ticket.subject, 50)}
                              </span>
                            </td>
                            <td style={{
                              padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
                              whiteSpace: 'nowrap'
                            }}>
                              <Badge color={statusConfig.color}>
                                <StatusIcon style={{ width: '12px', height: '12px', marginRight: theme.spacing.xs }} />
                                {statusConfig.label}
                              </Badge>
                            </td>
                            <td style={{
                              padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
                              whiteSpace: 'nowrap'
                            }}>
                              <Badge color={priorityConfig.color}>
                                <PriorityIcon style={{ width: '12px', height: '12px', marginRight: theme.spacing.xs }} />
                                {priorityConfig.label}
                              </Badge>
                            </td>
                            <td style={{ padding: `${theme.spacing.lg} ${theme.spacing.xl}` }}>
                              <span style={{
                                fontSize: theme.fontSize.sm,
                                color: theme.colors.text.primary
                              }}>
                                {ticket.customer_name || 'N/A'}
                              </span>
                            </td>
                            <td style={{
                              padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
                              whiteSpace: 'nowrap',
                              fontSize: theme.fontSize.sm,
                              color: theme.colors.text.secondary
                            }}>
                              {getClosedRelativeTime(ticket.closed_date || ticket.updated_at)}
                            </td>
                            <td style={{
                              padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
                              minWidth: '180px'
                            }}>
                              <span style={{
                                fontSize: theme.fontSize.sm,
                                color: theme.colors.text.tertiary
                              }}>
                                {truncate(ticket.resolution_text || ticket.resolution_summary || '-', 40)}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination for Closed Tickets */}
              {closedPagination && closedPagination.totalCount > 0 && (
                <Pagination
                  currentPage={closedPagination.page}
                  totalPages={closedPagination.totalPages}
                  pageSize={closedPagination.limit}
                  totalCount={closedPagination.totalCount}
                  onPageChange={handleClosedPageChange}
                  onPageSizeChange={handleClosedPageSizeChange}
                  loading={closedLoading || refreshing}
                />
              )}
            </Card>
            </div>
          )}
        </div>
      </div>
  );
};

export default TicketDashboard;
