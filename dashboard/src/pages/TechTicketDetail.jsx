import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Ticket,
  ArrowLeft,
  User,
  Phone,
  Mail,
  UserCheck,
  Clock,
  MessageCircle,
  Edit,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  Send,
  AlertTriangle,
  ArrowUp,
  Minus,
  ArrowDown,
  Wrench,
  X,
  XCircle
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Card from '../components/Card';
import Badge from '../components/Badge';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { theme } from '../styles/theme';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Auto-refresh interval for comments (10 seconds)
const COMMENT_REFRESH_INTERVAL = 10000;

const TechTicketDetail = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, logout, hasRole } = useAuth();
  const commentsEndRef = useRef(null);

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [statusHistoryOpen, setStatusHistoryOpen] = useState(false);

  // Status update state
  const [selectedStatus, setSelectedStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Comment state
  const [commentText, setCommentText] = useState('');
  const [isResolution, setIsResolution] = useState(false);
  const [addingComment, setAddingComment] = useState(false);

  // Priority update state
  const [updatingPriority, setUpdatingPriority] = useState(false);

  // New comments detection
  const [hasNewComments, setHasNewComments] = useState(false);
  const [lastCommentCount, setLastCommentCount] = useState(0);

  // Track if user is actively editing to pause auto-refresh
  const [isEditing, setIsEditing] = useState(false);

  // Fetch ticket detail
  const fetchTicket = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/tickets/${uuid}`, {
        credentials: 'include'
      });

      if (response.status === 404) {
        showToast('Ticket not found', 'error');
        navigate('/tickets');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch ticket');
      }

      const data = await response.json();
      setTicket(data);
      setSelectedStatus(data.status);

      // Check for new comments
      const currentCommentCount = data.comments?.length || 0;
      if (silent && lastCommentCount > 0 && currentCommentCount > lastCommentCount) {
        setHasNewComments(true);
      }
      setLastCommentCount(currentCommentCount);
    } catch (error) {
      console.error('Error fetching ticket:', error);
      showToast('Failed to load ticket', 'error');
    } finally {
      setLoading(false);
    }
  }, [uuid, navigate, showToast, lastCommentCount]);

  // Initial fetch
  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  // Auto-refresh comments every 10 seconds (pause when user is editing)
  useEffect(() => {
    if (isEditing) return; // Don't refresh while editing

    const interval = setInterval(() => {
      fetchTicket(true);
    }, COMMENT_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchTicket, isEditing]);

  // Mark tech comments as read when viewing
  useEffect(() => {
    if (ticket?.id) {
      fetch(`${API_BASE_URL}/api/tickets/${ticket.id}/mark-read`, {
        method: 'POST',
        credentials: 'include'
      }).catch(err => console.error('Error marking comments read:', err));
    }
  }, [ticket?.id]);

  // Scroll to new comments
  const scrollToNewComments = () => {
    setHasNewComments(false);
    fetchTicket();
    setTimeout(() => {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Update priority
  const handlePriorityChange = async (newPriority) => {
    if (newPriority === ticket.priority) return;

    setUpdatingPriority(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/tickets/${uuid}/priority`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ priority: newPriority })
      });

      if (!response.ok) {
        throw new Error('Failed to update priority');
      }

      showToast('Priority updated successfully', 'success');
      await fetchTicket();
    } catch (error) {
      console.error('Error updating priority:', error);
      showToast('Failed to update priority', 'error');
    } finally {
      setUpdatingPriority(false);
    }
  };

  // Update status
  const handleStatusUpdate = async () => {
    if (selectedStatus === ticket.status) {
      showToast('Status unchanged', 'info');
      setIsEditing(false);
      return;
    }

    setUpdatingStatus(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/tickets/${uuid}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          status: selectedStatus,
          reason: statusReason || undefined
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      showToast('Status updated successfully', 'success');
      setStatusReason('');
      setIsEditing(false);
      await fetchTicket();
    } catch (error) {
      console.error('Error updating status:', error);
      showToast('Failed to update status', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Add comment
  const handleAddComment = async (e) => {
    e.preventDefault();

    if (!commentText.trim() || commentText.trim().length < 10) {
      showToast('Comment must be at least 10 characters', 'error');
      return;
    }

    setAddingComment(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/tickets/${uuid}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          comment_text: commentText,
          is_resolution: isResolution
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      showToast('Comment added successfully', 'success');
      setCommentText('');
      setIsResolution(false);
      setIsEditing(false);
      await fetchTicket();

      // Scroll to new comment
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Error adding comment:', error);
      showToast('Failed to add comment', 'error');
    } finally {
      setAddingComment(false);
    }
  };

  // Assign ticket to self
  const handleAssignToMe = async () => {
    setUpdating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/tickets/${uuid}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error('Failed to assign ticket');
      }

      showToast('Ticket assigned to you', 'success');
      await fetchTicket();
    } catch (error) {
      console.error('Error assigning ticket:', error);
      showToast('Failed to assign ticket', 'error');
    } finally {
      setUpdating(false);
    }
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
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Format full timestamp
  const formatFullTimestamp = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Get avatar initial
  const getAvatarInitial = (authorType) => {
    const initials = {
      customer: 'C',
      tech: 'T',
      system: 'S'
    };
    return initials[authorType] || '?';
  };

  // Get comment background color
  const getCommentBackground = (authorType) => {
    const backgrounds = {
      customer: 'bg-blue-50',
      tech: 'bg-gray-50',
      system: 'bg-yellow-50'
    };
    return backgrounds[authorType] || 'bg-gray-50';
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar user={user} onLogout={logout} hasRole={hasRole} />
        <div style={{ marginLeft: '260px', flex: 1, padding: '2rem' }}>
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar user={user} onLogout={logout} hasRole={hasRole} />
        <div style={{ marginLeft: '260px', flex: 1, padding: '2rem' }} className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Ticket Not Found</h2>
            <p className="text-gray-500 mb-6">The ticket you're looking for doesn't exist.</p>
            <button
              onClick={() => navigate('/tickets')}
              className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2c5282] transition-colors"
            >
              Back to Tickets
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusBadge(ticket.status);
  const priorityConfig = getPriorityBadge(ticket.priority);
  const urgencyConfig = getUrgencyBadge(ticket.urgency);
  const StatusIcon = statusConfig.icon;
  const PriorityIcon = priorityConfig.icon;

  const statusChanged = selectedStatus !== ticket.status;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} onLogout={logout} hasRole={hasRole} />

      <div style={{ marginLeft: '260px', flex: 1, padding: '2rem' }} className="max-w-7xl mx-auto">
          {/* New Comments Banner */}
          {hasNewComments && (
            <div className="mb-4 p-4 bg-blue-100 border border-blue-300 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-600" />
                <span className="text-blue-900 font-medium">New comments available</span>
              </div>
              <button
                onClick={scrollToNewComments}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                View New Comments
              </button>
            </div>
          )}

          {/* Header Section */}
          <Card className="mb-6">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <button
                    onClick={() => navigate('/tickets')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#6b7280',
                      fontSize: '0.875rem',
                      marginBottom: '16px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#111827')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#6b7280')}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Tickets
                  </button>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-[#1e3a5f] rounded-lg">
                      <Ticket className="w-5 h-5 text-white" />
                    </div>
                    <h1 style={{ color: '#111827', fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
                      Ticket #{ticket.ticket_number}
                    </h1>
                  </div>
                  <h2 style={{ color: '#374151', fontSize: '1.25rem', marginTop: '8px', marginBottom: '8px' }}>
                    {ticket.subject}
                  </h2>
                  <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '4px' }}>
                    Created {formatFullTimestamp(ticket.created_at)}
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="text-right">
                    <Badge color={statusConfig.color} className="mb-3">
                      <StatusIcon className="w-4 h-4 mr-1" />
                      {statusConfig.label}
                    </Badge>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: theme.fontSize.xs,
                        color: theme.colors.text.secondary,
                        marginBottom: theme.spacing.xs
                      }}>
                        Priority
                      </label>
                      <select
                        value={ticket.priority}
                        onChange={(e) => handlePriorityChange(e.target.value)}
                        disabled={updatingPriority}
                        style={{
                          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                          backgroundColor: theme.colors.background.tertiary,
                          color: theme.colors.text.primary,
                          border: `1px solid ${theme.colors.border.medium}`,
                          borderRadius: theme.radius.md,
                          fontSize: theme.fontSize.sm,
                          fontWeight: theme.fontWeight.medium,
                          cursor: updatingPriority ? 'not-allowed' : 'pointer',
                          opacity: updatingPriority ? 0.5 : 1,
                          outline: 'none'
                        }}
                      >
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Metadata Section */}
          <Card className="mb-6">
            <div className="p-6">
              <h3 style={{ color: '#111827', fontSize: '1.125rem', fontWeight: '600', marginBottom: '16px' }}>
                Ticket Information
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Customer Info */}
                <div>
                  <h4 style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: '500', marginBottom: '12px', textTransform: 'uppercase' }}>
                    Customer Information
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5" style={{ color: '#9ca3af' }} />
                      <span style={{ color: '#111827', fontSize: '0.875rem' }}>
                        {ticket.customer_name || 'N/A'}
                      </span>
                    </div>
                    {ticket.customer_phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5" style={{ color: '#9ca3af' }} />
                        <a
                          href={`tel:${ticket.customer_phone}`}
                          style={{ color: '#1e3a5f', fontSize: '0.875rem', textDecoration: 'none' }}
                          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                        >
                          {ticket.customer_phone}
                        </a>
                      </div>
                    )}
                    {ticket.customer_email && (
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5" style={{ color: '#9ca3af' }} />
                        <a
                          href={`mailto:${ticket.customer_email}`}
                          style={{ color: '#1e3a5f', fontSize: '0.875rem', textDecoration: 'none' }}
                          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                        >
                          {ticket.customer_email}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Assignment Info */}
                <div>
                  <h4 style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: '500', marginBottom: '12px', textTransform: 'uppercase' }}>
                    Assignment & Status
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <UserCheck className="w-5 h-5" style={{ color: '#9ca3af' }} />
                        <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Assigned to:</span>
                      </div>
                      <span style={{ color: '#111827', fontSize: '0.875rem', fontWeight: '500' }}>
                        {ticket.assigned_to_name || 'Unassigned'}
                      </span>
                    </div>
                    {ticket.assigned_at && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Clock className="w-5 h-5" style={{ color: '#9ca3af' }} />
                          <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Assigned at:</span>
                        </div>
                        <span style={{ color: '#111827', fontSize: '0.875rem' }}>
                          {getRelativeTime(ticket.assigned_at)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Status:</span>
                      <Badge color={statusConfig.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Priority:</span>
                      <Badge color={priorityConfig.color}>
                        <PriorityIcon className="w-3 h-3 mr-1" />
                        {priorityConfig.label}
                      </Badge>
                    </div>
                    {urgencyConfig && (
                      <div className="flex items-center justify-between">
                        <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Urgency:</span>
                        <Badge color={urgencyConfig.color}>{urgencyConfig.label}</Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Related Info */}
              {(ticket.van_info || ticket.category_name || ticket.session_id || ticket.related_ticket_id) && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: '500', marginBottom: '12px', textTransform: 'uppercase' }}>
                    Related Information
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    {ticket.van_info && (
                      <div>
                        <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Van: </span>
                        <span style={{ color: '#111827', fontSize: '0.875rem' }}>{ticket.van_info}</span>
                      </div>
                    )}
                    {ticket.category_name && (
                      <div>
                        <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Category: </span>
                        <span style={{ color: '#111827', fontSize: '0.875rem' }}>{ticket.category_name}</span>
                      </div>
                    )}
                    {ticket.session_id && (
                      <div>
                        <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Sequence Session: </span>
                        <a
                          href={`/sessions/${ticket.session_id}`}
                          style={{ color: '#1e3a5f', fontSize: '0.875rem', textDecoration: 'none' }}
                          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                        >
                          View Session
                        </a>
                      </div>
                    )}
                    {ticket.related_ticket_id && (
                      <div>
                        <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Related Ticket: </span>
                        <a
                          href={`/tickets/${ticket.related_ticket_id}`}
                          style={{ color: '#1e3a5f', fontSize: '0.875rem', textDecoration: 'none' }}
                          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                        >
                          #{ticket.related_ticket_number}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Assign to Me button if unassigned */}
              {!ticket.assigned_to && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={handleAssignToMe}
                    disabled={updating}
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
                      cursor: updating ? 'not-allowed' : 'pointer',
                      opacity: updating ? 0.5 : 1,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => !updating && (e.currentTarget.style.backgroundColor = '#2c5282')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1e3a5f')}
                  >
                    <UserCheck className="w-4 h-4" />
                    {updating ? 'Assigning...' : 'Assign to Me'}
                  </button>
                </div>
              )}
            </div>
          </Card>

          {/* Status Management Section */}
          <Card className="mb-6">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Edit className="w-5 h-5" style={{ color: '#374151' }} />
                <h3 style={{ color: '#111827', fontSize: '1.125rem', fontWeight: '600', margin: 0 }}>
                  Update Status
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    color: theme.colors.text.secondary,
                    marginBottom: theme.spacing.sm
                  }}>
                    Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => {
                      setIsEditing(true);
                      setSelectedStatus(e.target.value);
                    }}
                    style={{
                      width: '100%',
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
                    <option value="open">Open</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_customer">Waiting Customer</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {statusChanged && (
                  <>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: theme.fontSize.sm,
                        fontWeight: theme.fontWeight.medium,
                        color: theme.colors.text.secondary,
                        marginBottom: theme.spacing.sm
                      }}>
                        Reason for status change (optional)
                      </label>
                      <textarea
                        value={statusReason}
                        onChange={(e) => setStatusReason(e.target.value)}
                        onFocus={() => setIsEditing(true)}
                        maxLength={500}
                        rows={3}
                        placeholder="Explain why the status is changing..."
                        style={{
                          width: '100%',
                          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                          backgroundColor: theme.colors.background.tertiary,
                          color: theme.colors.text.primary,
                          border: `1px solid ${theme.colors.border.medium}`,
                          borderRadius: theme.radius.md,
                          fontSize: theme.fontSize.sm,
                          outline: 'none',
                          resize: 'none'
                        }}
                      />
                      <p style={{
                        fontSize: theme.fontSize.xs,
                        color: theme.colors.text.tertiary,
                        marginTop: theme.spacing.xs
                      }}>
                        {statusReason.length}/500 characters
                      </p>
                    </div>

                    <button
                      onClick={handleStatusUpdate}
                      disabled={updatingStatus}
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
                        cursor: updatingStatus ? 'not-allowed' : 'pointer',
                        opacity: updatingStatus ? 0.5 : 1,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => !updatingStatus && (e.currentTarget.style.backgroundColor = '#2c5282')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1e3a5f')}
                    >
                      <CheckCircle className="w-4 h-4" />
                      {updatingStatus ? 'Updating...' : 'Update Status'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </Card>

          {/* Description Section */}
          <Card className="mb-6">
            <div className="p-6">
              <h3 style={{ color: '#111827', fontSize: '1.125rem', fontWeight: '600', marginBottom: '16px' }}>
                Description
              </h3>
              {ticket.description ? (
                <div style={{ color: '#374151', fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
                  {ticket.description}
                </div>
              ) : (
                <p style={{ color: '#6b7280', fontSize: '0.875rem', fontStyle: 'italic' }}>
                  No description provided
                </p>
              )}
            </div>
          </Card>

          {/* Resolution Section */}
          {(ticket.status === 'resolved' || ticket.status === 'closed') && ticket.resolution && (
            <Card className="mb-6">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-5 h-5" style={{ color: '#059669' }} />
                  <h3 style={{ color: '#111827', fontSize: '1.125rem', fontWeight: '600', margin: 0 }}>
                    Resolution
                  </h3>
                </div>
                <div style={{ color: '#374151', fontSize: '0.875rem', whiteSpace: 'pre-wrap', marginBottom: '12px' }}>
                  {ticket.resolution}
                </div>
                {ticket.resolved_by && (
                  <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                    Resolved by {ticket.resolved_by} {ticket.resolved_at && `on ${formatFullTimestamp(ticket.resolved_at)}`}
                  </p>
                )}
              </div>
            </Card>
          )}

          {/* Comments Timeline Section */}
          <Card className="mb-6">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <MessageCircle className="w-5 h-5" style={{ color: '#374151' }} />
                <h3 style={{ color: '#111827', fontSize: '1.125rem', fontWeight: '600', margin: 0 }}>
                  Activity Timeline
                </h3>
                <Badge color="blue">{ticket.comments?.length || 0}</Badge>
              </div>

              {/* Comments List */}
              <div className="space-y-4 mb-6">
                {ticket.comments && ticket.comments.length > 0 ? (
                  ticket.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className={`p-4 rounded-lg ${getCommentBackground(comment.author_type)} border border-gray-200`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                          comment.author_type === 'customer' ? 'bg-blue-500' :
                          comment.author_type === 'tech' ? 'bg-gray-500' :
                          'bg-yellow-500'
                        }`}>
                          {getAvatarInitial(comment.author_type)}
                        </div>

                        {/* Comment Content */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span style={{ color: '#111827', fontSize: '0.875rem', fontWeight: '600' }}>
                              {comment.author_name}
                            </span>
                            <Badge color={
                              comment.author_type === 'customer' ? 'blue' :
                              comment.author_type === 'tech' ? 'gray' :
                              'yellow'
                            }>
                              {comment.author_type === 'customer' ? 'Customer' :
                               comment.author_type === 'tech' ? 'Tech' :
                               'System'}
                            </Badge>
                            {comment.is_resolution && (
                              <Badge color="green">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Resolution
                              </Badge>
                            )}
                          </div>
                          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '8px' }}>
                            {getRelativeTime(comment.created_at)}
                          </p>
                          <p style={{ color: '#374151', fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
                            {comment.comment_text}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#6b7280', fontSize: '0.875rem', textAlign: 'center', padding: '32px 0', fontStyle: 'italic' }}>
                    No comments yet
                  </p>
                )}
                <div ref={commentsEndRef} />
              </div>

              {/* Add Comment Form */}
              <div className="pt-6 border-t border-gray-200">
                <h4 style={{
                  fontWeight: theme.fontWeight.medium,
                  color: theme.colors.text.primary,
                  marginBottom: theme.spacing.md
                }}>
                  Add a Comment
                </h4>
                <form onSubmit={handleAddComment} className="space-y-3">
                  <div>
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onFocus={() => setIsEditing(true)}
                      placeholder="Add a comment..."
                      rows={4}
                      maxLength={2000}
                      required
                      style={{
                        width: '100%',
                        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                        backgroundColor: theme.colors.background.tertiary,
                        color: theme.colors.text.primary,
                        border: `1px solid ${theme.colors.border.medium}`,
                        borderRadius: theme.radius.md,
                        fontSize: theme.fontSize.sm,
                        outline: 'none',
                        resize: 'none'
                      }}
                    />
                    <p style={{
                      fontSize: theme.fontSize.xs,
                      color: theme.colors.text.tertiary,
                      marginTop: theme.spacing.xs
                    }}>
                      {commentText.length}/2000 characters (minimum 10)
                    </p>
                  </div>

                  {(selectedStatus === 'resolved' || ticket.status === 'resolved') && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isResolution"
                        checked={isResolution}
                        onChange={(e) => setIsResolution(e.target.checked)}
                        className="w-4 h-4 text-[#1e3a5f] border-gray-300 rounded focus:ring-[#1e3a5f]"
                      />
                      <label htmlFor="isResolution" style={{
                        fontSize: theme.fontSize.sm,
                        color: theme.colors.text.secondary
                      }}>
                        This is the resolution
                      </label>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={addingComment || commentText.trim().length < 10}
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
                      cursor: (addingComment || commentText.trim().length < 10) ? 'not-allowed' : 'pointer',
                      opacity: (addingComment || commentText.trim().length < 10) ? 0.5 : 1,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => !(addingComment || commentText.trim().length < 10) && (e.currentTarget.style.backgroundColor = '#2c5282')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1e3a5f')}
                  >
                    <Send className="w-4 h-4" />
                    {addingComment ? 'Adding...' : 'Add Comment'}
                  </button>
                </form>
              </div>
            </div>
          </Card>

          {/* Status History Section */}
          {ticket.status_history && ticket.status_history.length > 0 && (
            <Card>
              <div className="p-6">
                <button
                  onClick={() => setStatusHistoryOpen(!statusHistoryOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" style={{ color: '#374151' }} />
                    <h3 style={{ color: '#111827', fontSize: '1.125rem', fontWeight: '600', margin: 0 }}>
                      Status History
                    </h3>
                    <Badge color="gray">{ticket.status_history.length}</Badge>
                  </div>
                  {statusHistoryOpen ? (
                    <ChevronUp className="w-5 h-5" style={{ color: '#6b7280' }} />
                  ) : (
                    <ChevronDown className="w-5 h-5" style={{ color: '#6b7280' }} />
                  )}
                </button>

                {statusHistoryOpen && (
                  <div className="mt-6 space-y-3">
                    {ticket.status_history.map((history, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-1">
                          <Clock className="w-4 h-4" style={{ color: '#6b7280' }} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span style={{ color: '#111827', fontSize: '0.875rem', fontWeight: '500' }}>
                              {history.from_status}
                            </span>
                            <ArrowUp className="w-4 h-4" style={{ color: '#9ca3af', transform: 'rotate(90deg)' }} />
                            <span style={{ color: '#111827', fontSize: '0.875rem', fontWeight: '500' }}>
                              {history.to_status}
                            </span>
                          </div>
                          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '4px' }}>
                            By {history.changed_by_name} • {getRelativeTime(history.changed_at)}
                          </p>
                          {history.reason && (
                            <p style={{ color: '#374151', fontSize: '0.875rem', marginTop: '8px', fontStyle: 'italic' }}>
                              "{history.reason}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}
      </div>
    </div>
  );
};

export default TechTicketDetail;
