import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  PartyPopper
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Card from '../components/Card';
import Badge from '../components/Badge';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { theme } from '../styles/theme';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Auto-refresh interval (30 seconds)
const AUTO_REFRESH_INTERVAL = 30000;

const TicketDashboard = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, logout, hasRole } = useAuth();

  const [unassignedTickets, setUnassignedTickets] = useState([]);
  const [myTickets, setMyTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigningTicket, setAssigningTicket] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filters and search
  const [unassignedSearch, setUnassignedSearch] = useState('');
  const [unassignedSort, setUnassignedSort] = useState('priority');
  const [myTicketsSearch, setMyTicketsSearch] = useState('');
  const [myTicketsSort, setMyTicketsSort] = useState('last_activity');
  const [myTicketsStatusFilter, setMyTicketsStatusFilter] = useState('all');

  // Fetch tickets
  const fetchTickets = useCallback(async (showRefreshingState = false) => {
    try {
      if (showRefreshingState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [unassignedRes, myTicketsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/tickets/unassigned`, {
          credentials: 'include'
        }),
        fetch(`${API_BASE_URL}/api/tickets/my-tickets`, {
          credentials: 'include'
        })
      ]);

      if (!unassignedRes.ok || !myTicketsRes.ok) {
        throw new Error('Failed to fetch tickets');
      }

      const unassignedData = await unassignedRes.json();
      const myTicketsData = await myTicketsRes.json();

      console.log('=== UNASSIGNED TICKETS DATA ===');
      console.log('Count:', unassignedData.length);
      if (unassignedData.length > 0) {
        console.log('First ticket:', unassignedData[0]);
        console.log('Available fields:', Object.keys(unassignedData[0]));
      }

      console.log('=== MY TICKETS DATA ===');
      console.log('Count:', myTicketsData.length);
      if (myTicketsData.length > 0) {
        console.log('First ticket:', myTicketsData[0]);
        console.log('Available fields:', Object.keys(myTicketsData[0]));
      }

      setUnassignedTickets(unassignedData);
      setMyTickets(myTicketsData);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      showToast('Failed to load tickets', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  // Initial fetch
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTickets(true);
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchTickets]);

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
    fetchTickets(true);
  };

  // Navigate to ticket detail
  const handleTicketClick = (ticketId) => {
    navigate(`/tickets/${ticketId}`);
  };

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

  // Skeleton loader
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

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#f9fafb' }}>
      <Sidebar user={user} onLogout={logout} hasRole={hasRole} />

      <div style={{ marginLeft: '260px', flex: 1, padding: '2rem', position: 'relative', zIndex: 1 }}>
        {/* Page Header */}
        <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#1e3a5f] rounded-lg">
                  <Ticket className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold" style={{ color: '#111827' }}>Support Tickets</h1>
                  <p className="mt-1" style={{ color: '#6b7280' }}>Manage and track customer support tickets</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    backgroundColor: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    color: '#374151',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: refreshing ? 'not-allowed' : 'pointer',
                    opacity: refreshing ? 0.5 : 1,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => !refreshing && (e.currentTarget.style.backgroundColor = '#f9fafb')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
                >
                  <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                  Refresh
                </button>

                <button
                  onClick={() => navigate('/tickets/new')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    backgroundColor: '#1e3a5f',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2c5282')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1e3a5f')}
                >
                  <Plus size={18} />
                  Create New Ticket
                </button>
              </div>
            </div>
          </div>

          {/* Unassigned Queue Section */}
          <Card className="mb-8">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold" style={{ color: '#111827' }}>Unassigned Tickets</h2>
                  <Badge color="blue">{filteredUnassigned.length}</Badge>
                </div>
                <p className="text-sm" style={{ color: '#6b7280' }}>Tickets waiting for assignment</p>
              </div>

              {/* Search and Sort */}
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: theme.colors.text.tertiary }} />
                  <input
                    type="text"
                    placeholder="Search tickets, customer name, or phone"
                    value={unassignedSearch}
                    onChange={(e) => setUnassignedSearch(e.target.value)}
                    style={{
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      paddingLeft: '2.5rem',
                      backgroundColor: theme.colors.background.tertiary,
                      color: theme.colors.text.primary,
                      border: `1px solid ${theme.colors.border.medium}`,
                      borderRadius: theme.radius.md,
                      fontSize: theme.fontSize.sm,
                      outline: 'none',
                      width: '100%'
                    }}
                  />
                </div>
                <select
                  value={unassignedSort}
                  onChange={(e) => setUnassignedSort(e.target.value)}
                  style={{
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    backgroundColor: theme.colors.background.tertiary,
                    color: theme.colors.text.primary,
                    border: `1px solid ${theme.colors.border.medium}`,
                    borderRadius: theme.radius.md,
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="priority">Sort by Priority</option>
                  <option value="created">Sort by Created Date</option>
                  <option value="customer">Sort by Customer Name</option>
                </select>
              </div>
            </div>

            {/* Unassigned Tickets Table */}
            <div className="overflow-x-auto">
              <table className="w-full" style={{ tableLayout: 'auto', width: '100%' }}>
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider" style={{ minWidth: '100px', width: '100px', color: '#111827' }}>
                      Ticket #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider" style={{ minWidth: '300px', color: '#111827' }}>
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider" style={{ color: '#111827' }}>
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider" style={{ color: '#111827' }}>
                      Urgency
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider" style={{ color: '#111827' }}>
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider" style={{ color: '#111827' }}>
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider" style={{ color: '#111827' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <>
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                    </>
                  ) : filteredUnassigned.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <PartyPopper className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No unassigned tickets</p>
                        <p className="text-sm text-gray-400 mt-1">All tickets are assigned!</p>
                      </td>
                    </tr>
                  ) : (
                    filteredUnassigned.map((ticket) => {
                      const priorityConfig = getPriorityBadge(ticket.priority);
                      const urgencyConfig = getUrgencyBadge(ticket.urgency);
                      const PriorityIcon = priorityConfig.icon;
                      const hasUnreadComments = ticket.unread_customer_comments > 0;

                      return (
                        <tr
                          key={ticket.ticket_id}
                          onClick={() => handleTicketClick(ticket.ticket_id)}
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap" style={{ minWidth: '100px', width: '100px' }}>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-blue-600" style={{ color: '#2563eb' }}>
                                #{ticket.ticket_number}
                              </span>
                              {hasUnreadComments && (
                                <span className="w-2 h-2 bg-orange-500 rounded-full" title="Unread customer comments"></span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4" style={{ minWidth: '300px' }}>
                            <span className="text-sm text-gray-900 font-medium" style={{ color: '#111827' }}>{truncate(ticket.subject, 60)}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge color={priorityConfig.color}>
                              <PriorityIcon className="w-3 h-3 mr-1" />
                              {priorityConfig.label}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {urgencyConfig ? (
                              <Badge color={urgencyConfig.color}>{urgencyConfig.label}</Badge>
                            ) : (
                              <span className="text-gray-400 text-sm">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              <div className="text-gray-900 font-medium" style={{ color: '#111827' }}>{ticket.customer_name || 'N/A'}</div>
                              <div className="text-gray-600" style={{ color: '#4b5563' }}>{ticket.customer_phone || 'No phone'}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700" style={{ color: '#374151' }}>
                            {getRelativeTime(ticket.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleAssignToMe(ticket.ticket_id, ticket.ticket_number)}
                              disabled={assigningTicket === ticket.ticket_id}
                              className="px-3 py-1.5 bg-[#1e3a5f] text-white text-sm rounded-lg hover:bg-[#2c5282] transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <UserPlus className="w-4 h-4" />
                              {assigningTicket === ticket.ticket_id ? 'Assigning...' : 'Assign to Me'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* My Tickets Section */}
          <Card>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold" style={{ color: '#111827' }}>My Tickets</h2>
                  <Badge color="purple">{filteredMyTickets.length}</Badge>
                </div>
                <p className="text-sm" style={{ color: '#6b7280' }}>Tickets assigned to you</p>
              </div>

              {/* Search, Filter, and Sort */}
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: theme.colors.text.tertiary }} />
                  <input
                    type="text"
                    placeholder="Search tickets, customer name, or phone"
                    value={myTicketsSearch}
                    onChange={(e) => setMyTicketsSearch(e.target.value)}
                    style={{
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      paddingLeft: '2.5rem',
                      backgroundColor: theme.colors.background.tertiary,
                      color: theme.colors.text.primary,
                      border: `1px solid ${theme.colors.border.medium}`,
                      borderRadius: theme.radius.md,
                      fontSize: theme.fontSize.sm,
                      outline: 'none',
                      width: '100%'
                    }}
                  />
                </div>
                <select
                  value={myTicketsStatusFilter}
                  onChange={(e) => setMyTicketsStatusFilter(e.target.value)}
                  style={{
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    backgroundColor: theme.colors.background.tertiary,
                    color: theme.colors.text.primary,
                    border: `1px solid ${theme.colors.border.medium}`,
                    borderRadius: theme.radius.md,
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    cursor: 'pointer',
                    outline: 'none'
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
                  value={myTicketsSort}
                  onChange={(e) => setMyTicketsSort(e.target.value)}
                  style={{
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    backgroundColor: theme.colors.background.tertiary,
                    color: theme.colors.text.primary,
                    border: `1px solid ${theme.colors.border.medium}`,
                    borderRadius: theme.radius.md,
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="last_activity">Sort by Last Activity</option>
                  <option value="status">Sort by Status</option>
                  <option value="priority">Sort by Priority</option>
                </select>
              </div>
            </div>

            {/* My Tickets Table */}
            <div className="overflow-x-auto">
              <table className="w-full" style={{ tableLayout: 'auto', width: '100%' }}>
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider" style={{ minWidth: '100px', width: '100px', color: '#111827' }}>
                      Ticket #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider" style={{ minWidth: '300px', color: '#111827' }}>
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider" style={{ color: '#111827' }}>
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider" style={{ color: '#111827' }}>
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider" style={{ color: '#111827' }}>
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider" style={{ color: '#111827' }}>
                      Last Activity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider" style={{ color: '#111827' }}>
                      Unread
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
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
                          backgroundColor: theme.colors.background.primary,
                          borderRadius: theme.radius.lg
                        }}>
                          <Ticket className="w-12 h-12 mx-auto mb-3" style={{ color: theme.colors.border.medium }} />
                          <p style={{
                            fontSize: theme.fontSize.lg,
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
                    filteredMyTickets.map((ticket) => {
                      const statusConfig = getStatusBadge(ticket.status);
                      const priorityConfig = getPriorityBadge(ticket.priority);
                      const StatusIcon = statusConfig.icon;
                      const PriorityIcon = priorityConfig.icon;
                      const hasUnreadComments = ticket.unread_customer_comments > 0;

                      return (
                        <tr
                          key={ticket.ticket_id}
                          onClick={() => handleTicketClick(ticket.ticket_id)}
                          className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                            hasUnreadComments ? 'bg-yellow-50' : ''
                          }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap" style={{ minWidth: '100px', width: '100px' }}>
                            <span className="text-sm font-bold text-blue-600" style={{ color: '#2563eb' }}>
                              #{ticket.ticket_number}
                            </span>
                          </td>
                          <td className="px-6 py-4" style={{ minWidth: '300px' }}>
                            <span className="text-sm text-gray-900 font-medium" style={{ color: '#111827' }}>{truncate(ticket.subject, 60)}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge color={statusConfig.color}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge color={priorityConfig.color}>
                              <PriorityIcon className="w-3 h-3 mr-1" />
                              {priorityConfig.label}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-gray-900" style={{ color: '#111827' }}>{ticket.customer_name || 'N/A'}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700" style={{ color: '#374151' }}>
                            {getRelativeTime(ticket.updated_at || ticket.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
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
          </Card>
        </div>
      </div>
  );
};

export default TicketDashboard;
