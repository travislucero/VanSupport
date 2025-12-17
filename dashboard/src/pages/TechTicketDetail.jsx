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
  CheckCircle,
  AlertCircle,
  Send,
  AlertTriangle,
  ArrowUp,
  Minus,
  ArrowDown,
  Wrench,
  X,
  XCircle,
  Truck,
  ChevronDown,
  ChevronUp,
  Image,
  Camera,
  Play
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Card from '../components/Card';
import Badge from '../components/Badge';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { theme } from '../styles/theme';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

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

  // Attachments state
  const [attachments, setAttachments] = useState([]);

  // Lightbox state for viewing full-size images and videos
  const [lightboxImage, setLightboxImage] = useState(null);
  const [lightboxVideo, setLightboxVideo] = useState(null);

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

  // Fetch attachments for the ticket
  const fetchAttachments = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tickets/${uuid}/attachments`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setAttachments(data || []);
        console.log('📎 Attachments fetched:', data?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching attachments:', error);
    }
  }, [uuid]);

  // Helper function to get attachments for a specific comment
  const getCommentAttachments = useCallback((commentId) => {
    return attachments.filter(att => att.comment_id === commentId);
  }, [attachments]);

  // Initial fetch
  useEffect(() => {
    fetchTicket();
    fetchAttachments();
  }, [fetchTicket, fetchAttachments]);

  // Auto-refresh comments every 10 seconds (pause when user is editing)
  useEffect(() => {
    if (isEditing) return;

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

  // Quick status update
  const handleQuickStatusUpdate = async (newStatus) => {
    if (newStatus === ticket.status) {
      showToast('Status unchanged', 'info');
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/tickets/${uuid}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          status: newStatus
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      showToast('Status updated successfully', 'success');
      await fetchTicket();
    } catch (error) {
      console.error('Error updating status:', error);
      showToast('Failed to update status', 'error');
    } finally {
      setUpdating(false);
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
      high: { color: 'red', label: 'High Urgency', pulse: true },
      medium: { color: 'yellow', label: 'Medium Urgency', pulse: false },
      low: { color: 'green', label: 'Low Urgency', pulse: false }
    };
    return configs[urgency] || { color: 'gray', label: urgency, pulse: false };
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

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} onLogout={logout} hasRole={hasRole} />

      <div style={{
        marginLeft: '260px',
        flex: 1,
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }} className="max-w-7xl mx-auto">
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

        {/* Header Section - Redesigned */}
        <Card style={{ marginBottom: '24px' }}>
          <div style={{ padding: theme.spacing.xl }}>
            {/* Back Button */}
            <button
              onClick={() => navigate('/tickets')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.sm,
                color: theme.colors.text.secondary,
                fontSize: theme.fontSize.sm,
                marginBottom: theme.spacing.lg,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = theme.colors.text.primary)}
              onMouseLeave={(e) => (e.currentTarget.style.color = theme.colors.text.secondary)}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Tickets
            </button>

            {/* Title & Subject */}
            <div className="mb-4">
              <h1 style={{
                color: theme.colors.text.primary,
                fontSize: theme.fontSize['3xl'],
                fontWeight: theme.fontWeight.bold,
                marginBottom: theme.spacing.xs
              }}>
                Ticket #{ticket.ticket_number}
              </h1>
              <h2 style={{
                color: theme.colors.text.secondary,
                fontSize: theme.fontSize.xl,
                fontWeight: theme.fontWeight.medium,
                marginBottom: theme.spacing.xs
              }}>
                {ticket.subject}
              </h2>
              {ticket.van_info && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.xs,
                  color: theme.colors.text.tertiary,
                  fontSize: theme.fontSize.sm,
                  marginTop: theme.spacing.xs
                }}>
                  <Truck className="w-4 h-4" />
                  <span>Van: {ticket.van_info}</span>
                </div>
              )}
              <p style={{
                color: theme.colors.text.tertiary,
                fontSize: theme.fontSize.sm,
                marginTop: theme.spacing.xs
              }}>
                Created {formatFullTimestamp(ticket.created_at)}
              </p>
            </div>

            {/* Status, Urgency, Priority Badges - Single Row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.md,
              marginBottom: theme.spacing.lg,
              flexWrap: 'wrap'
            }}>
              <Badge color={statusConfig.color} style={{ fontSize: theme.fontSize.sm }}>
                <StatusIcon className="w-4 h-4 mr-1" />
                {statusConfig.label}
              </Badge>

              {urgencyConfig && (
                <Badge
                  color={urgencyConfig.color}
                  style={{
                    fontSize: theme.fontSize.sm,
                    animation: urgencyConfig.pulse ? 'pulse 2s infinite' : 'none'
                  }}
                >
                  {urgencyConfig.label}
                </Badge>
              )}

              <div style={{ position: 'relative', display: 'inline-block' }}>
                <select
                  value={ticket.priority}
                  onChange={(e) => handlePriorityChange(e.target.value)}
                  disabled={updatingPriority}
                  style={{
                    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                    paddingRight: theme.spacing.xl,
                    backgroundColor: priorityConfig.color === 'red' ? '#fef2f2' :
                                   priorityConfig.color === 'orange' ? '#fff7ed' :
                                   priorityConfig.color === 'blue' ? '#eff6ff' : '#f9fafb',
                    color: priorityConfig.color === 'red' ? '#991b1b' :
                          priorityConfig.color === 'orange' ? '#9a3412' :
                          priorityConfig.color === 'blue' ? '#1e40af' : '#374151',
                    border: `1px solid ${priorityConfig.color === 'red' ? '#fecaca' :
                                         priorityConfig.color === 'orange' ? '#fed7aa' :
                                         priorityConfig.color === 'blue' ? '#bfdbfe' : '#e5e7eb'}`,
                    borderRadius: theme.radius.full,
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    cursor: updatingPriority ? 'not-allowed' : 'pointer',
                    opacity: updatingPriority ? 0.5 : 1,
                    outline: 'none',
                    appearance: 'none'
                  }}
                >
                  <option value="low">Low Priority</option>
                  <option value="normal">Normal Priority</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent Priority</option>
                </select>
                <div style={{
                  position: 'absolute',
                  right: theme.spacing.sm,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none'
                }}>
                  <PriorityIcon className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: theme.spacing.sm,
              flexWrap: 'wrap'
            }}>
              {!ticket.assigned_to && (
                <button
                  onClick={handleAssignToMe}
                  disabled={updating}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.xs,
                    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                    backgroundColor: theme.colors.accent.primary,
                    border: 'none',
                    borderRadius: theme.radius.md,
                    color: '#ffffff',
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    cursor: updating ? 'not-allowed' : 'pointer',
                    opacity: updating ? 0.5 : 1,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => !updating && (e.currentTarget.style.backgroundColor = '#2c5282')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.colors.accent.primary)}
                >
                  <UserCheck className="w-4 h-4" />
                  {updating ? 'Assigning...' : 'Assign to Me'}
                </button>
              )}

              {ticket.status !== 'in_progress' && ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                <button
                  onClick={() => handleQuickStatusUpdate('in_progress')}
                  disabled={updating}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.xs,
                    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                    backgroundColor: '#fbbf24',
                    border: 'none',
                    borderRadius: theme.radius.md,
                    color: '#78350f',
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    cursor: updating ? 'not-allowed' : 'pointer',
                    opacity: updating ? 0.5 : 1,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => !updating && (e.currentTarget.style.backgroundColor = '#f59e0b')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fbbf24')}
                >
                  <Wrench className="w-4 h-4" />
                  Start Work
                </button>
              )}

              {ticket.status === 'in_progress' && (
                <button
                  onClick={() => handleQuickStatusUpdate('waiting_customer')}
                  disabled={updating}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.xs,
                    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                    backgroundColor: '#fb923c',
                    border: 'none',
                    borderRadius: theme.radius.md,
                    color: '#7c2d12',
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    cursor: updating ? 'not-allowed' : 'pointer',
                    opacity: updating ? 0.5 : 1,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => !updating && (e.currentTarget.style.backgroundColor = '#f97316')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fb923c')}
                >
                  <MessageCircle className="w-4 h-4" />
                  Waiting on Customer
                </button>
              )}

              {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                <button
                  onClick={() => handleQuickStatusUpdate('resolved')}
                  disabled={updating}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.xs,
                    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                    backgroundColor: '#10b981',
                    border: 'none',
                    borderRadius: theme.radius.md,
                    color: '#ffffff',
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    cursor: updating ? 'not-allowed' : 'pointer',
                    opacity: updating ? 0.5 : 1,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => !updating && (e.currentTarget.style.backgroundColor = '#059669')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#10b981')}
                >
                  <CheckCircle className="w-4 h-4" />
                  Resolve Ticket
                </button>
              )}

              {ticket.status === 'resolved' && (
                <button
                  onClick={() => handleQuickStatusUpdate('closed')}
                  disabled={updating}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.xs,
                    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                    backgroundColor: theme.colors.text.tertiary,
                    border: 'none',
                    borderRadius: theme.radius.md,
                    color: '#ffffff',
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    cursor: updating ? 'not-allowed' : 'pointer',
                    opacity: updating ? 0.5 : 1,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => !updating && (e.currentTarget.style.backgroundColor = theme.colors.text.secondary)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.colors.text.tertiary)}
                >
                  <X className="w-4 h-4" />
                  Close Ticket
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* Ticket Information - Full Width 3-Column Card */}
        <Card style={{ marginBottom: '24px' }}>
          <div style={{ padding: theme.spacing.lg }}>
            <h3 style={{
              color: theme.colors.text.secondary,
              fontSize: theme.fontSize.xs,
              fontWeight: theme.fontWeight.semibold,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: theme.spacing.lg
            }}>
              Ticket Information
            </h3>

            {/* 3-Column Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: theme.spacing.xl
            }}
            className="lg:grid-cols-3 md:grid-cols-2 grid-cols-1">

              {/* Column 1: Customer */}
              <div>
                <h4 style={{
                  color: theme.colors.text.secondary,
                  fontSize: theme.fontSize.xs,
                  fontWeight: theme.fontWeight.semibold,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: theme.spacing.md
                }}>
                  Customer
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
                    <User className="w-5 h-5" style={{ color: theme.colors.text.tertiary }} />
                    <span style={{ color: theme.colors.text.primary, fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.medium }}>
                      {ticket.customer_name || 'N/A'}
                    </span>
                  </div>
                  {ticket.customer_phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
                      <Phone className="w-5 h-5" style={{ color: theme.colors.text.tertiary }} />
                      <a
                        href={`tel:${ticket.customer_phone}`}
                        style={{
                          color: theme.colors.accent.primary,
                          fontSize: theme.fontSize.sm,
                          textDecoration: 'none'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                        onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                      >
                        {ticket.customer_phone}
                      </a>
                    </div>
                  )}
                  {ticket.customer_email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
                      <Mail className="w-5 h-5" style={{ color: theme.colors.text.tertiary }} />
                      <a
                        href={`mailto:${ticket.customer_email}`}
                        style={{
                          color: theme.colors.accent.primary,
                          fontSize: theme.fontSize.sm,
                          textDecoration: 'none',
                          wordBreak: 'break-all'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                        onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                      >
                        {ticket.customer_email}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Column 2: Van */}
              <div>
                <h4 style={{
                  color: theme.colors.text.secondary,
                  fontSize: theme.fontSize.xs,
                  fontWeight: theme.fontWeight.semibold,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: theme.spacing.md
                }}>
                  Van
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
                  {ticket.van_info ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
                      <Truck className="w-5 h-5" style={{ color: theme.colors.text.tertiary }} />
                      <span style={{ color: theme.colors.text.primary, fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.medium }}>
                        {ticket.van_info}
                      </span>
                    </div>
                  ) : (
                    <span style={{ color: theme.colors.text.tertiary, fontSize: theme.fontSize.sm, fontStyle: 'italic' }}>
                      No van assigned
                    </span>
                  )}
                </div>
              </div>

              {/* Column 3: Assignment */}
              <div>
                <h4 style={{
                  color: theme.colors.text.secondary,
                  fontSize: theme.fontSize.xs,
                  fontWeight: theme.fontWeight.semibold,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: theme.spacing.md
                }}>
                  Assignment
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
                    <UserCheck className="w-5 h-5" style={{ color: theme.colors.text.tertiary }} />
                    <span style={{ color: theme.colors.text.primary, fontSize: theme.fontSize.sm }}>
                      {ticket.assigned_to_name || 'Unassigned'}
                    </span>
                  </div>
                  {ticket.assigned_at && (
                    <div style={{ paddingLeft: '28px' }}>
                      <span style={{ color: theme.colors.text.tertiary, fontSize: theme.fontSize.xs }}>
                        {getRelativeTime(ticket.assigned_at)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Description Card (conditional) */}
        {ticket.description && ticket.description !== ticket.subject && (
          <Card style={{ marginBottom: '24px' }}>
            <div style={{ padding: theme.spacing.lg }}>
              <h3 style={{
                color: theme.colors.text.secondary,
                fontSize: theme.fontSize.xs,
                fontWeight: theme.fontWeight.semibold,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: theme.spacing.md
              }}>
                Description
              </h3>
              <div style={{
                color: theme.colors.text.primary,
                fontSize: theme.fontSize.sm,
                whiteSpace: 'pre-wrap',
                lineHeight: '1.6'
              }}>
                {ticket.description}
              </div>
            </div>
          </Card>
        )}

        {/* Related Info Card (conditional) */}
        {(ticket.category_name || ticket.session_id || ticket.related_ticket_id) && (
          <Card style={{ marginBottom: '24px' }}>
            <div style={{ padding: theme.spacing.lg }}>
              <h3 style={{
                color: theme.colors.text.secondary,
                fontSize: theme.fontSize.xs,
                fontWeight: theme.fontWeight.semibold,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: theme.spacing.md
              }}>
                Related
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
                {ticket.category_name && (
                  <div>
                    <span style={{ color: theme.colors.text.tertiary, fontSize: theme.fontSize.xs }}>Category: </span>
                    <span style={{ color: theme.colors.text.primary, fontSize: theme.fontSize.sm }}>{ticket.category_name}</span>
                  </div>
                )}
                {ticket.session_id && (
                  <div>
                    <span style={{ color: theme.colors.text.tertiary, fontSize: theme.fontSize.xs }}>Session: </span>
                    <a
                      href={`/sessions/${ticket.session_id}`}
                      style={{ color: theme.colors.accent.primary, fontSize: theme.fontSize.sm, textDecoration: 'none' }}
                      onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                      onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                    >
                      View
                    </a>
                  </div>
                )}
                {ticket.related_ticket_id && (
                  <div>
                    <span style={{ color: theme.colors.text.tertiary, fontSize: theme.fontSize.xs }}>Ticket: </span>
                    <a
                      href={`/tickets/${ticket.related_ticket_id}`}
                      style={{ color: theme.colors.accent.primary, fontSize: theme.fontSize.sm, textDecoration: 'none' }}
                      onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                      onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                    >
                      #{ticket.related_ticket_number}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Resolution Card (conditional) */}
        {(ticket.status === 'resolved' || ticket.status === 'closed') && ticket.resolution && (
          <Card style={{ backgroundColor: '#f0fdf4', borderColor: '#86efac', marginBottom: '24px' }}>
            <div style={{ padding: theme.spacing.lg }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
                <CheckCircle className="w-5 h-5" style={{ color: '#059669' }} />
                <h3 style={{
                  color: '#059669',
                  fontSize: theme.fontSize.sm,
                  fontWeight: theme.fontWeight.semibold,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  margin: 0
                }}>
                  Resolution
                </h3>
              </div>
              <div style={{
                color: '#166534',
                fontSize: theme.fontSize.sm,
                whiteSpace: 'pre-wrap',
                marginBottom: theme.spacing.sm,
                lineHeight: '1.6'
              }}>
                {ticket.resolution}
              </div>
              {ticket.resolved_by && (
                <p style={{ color: '#15803d', fontSize: theme.fontSize.xs, margin: 0 }}>
                  Resolved by {ticket.resolved_by} {ticket.resolved_at && ` • ${getRelativeTime(ticket.resolved_at)}`}
                </p>
              )}
            </div>
          </Card>
        )}

        {/* Activity & Comments - Full Width */}
        <Card style={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1
        }}>
              <div style={{ padding: theme.spacing.lg }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.lg }}>
                  <MessageCircle className="w-5 h-5" style={{ color: theme.colors.text.secondary }} />
                  <h3 style={{
                    color: theme.colors.text.secondary,
                    fontSize: theme.fontSize.xs,
                    fontWeight: theme.fontWeight.semibold,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    margin: 0
                  }}>
                    Activity & Comments
                  </h3>
                  <Badge color="blue">{ticket.comments?.length || 0}</Badge>
                </div>

                {/* Comments List */}
                <div style={{
                  maxHeight: '500px',
                  overflowY: 'auto',
                  marginBottom: theme.spacing.lg,
                  paddingRight: theme.spacing.sm
                }}>
                  {ticket.comments && ticket.comments.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
                      {ticket.comments.map((comment) => (
                        <div
                          key={comment.id}
                          style={{
                            padding: theme.spacing.md,
                            borderRadius: theme.radius.lg,
                            backgroundColor: comment.author_type === 'customer' ? '#eff6ff' :
                                           comment.author_type === 'tech' ? '#f9fafb' : '#fef9c3',
                            border: `1px solid ${comment.author_type === 'customer' ? '#dbeafe' :
                                                comment.author_type === 'tech' ? '#e5e7eb' : '#fef08a'}`
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'start', gap: theme.spacing.sm }}>
                            {/* Avatar */}
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: theme.radius.full,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              fontWeight: theme.fontWeight.bold,
                              fontSize: theme.fontSize.sm,
                              backgroundColor: comment.author_type === 'customer' ? '#3b82f6' :
                                             comment.author_type === 'tech' ? '#6b7280' : '#eab308',
                              flexShrink: 0
                            }}>
                              {getAvatarInitial(comment.author_type)}
                            </div>

                            {/* Comment Content */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs, marginBottom: theme.spacing.xs, flexWrap: 'wrap' }}>
                                <span style={{
                                  color: theme.colors.text.primary,
                                  fontSize: theme.fontSize.sm,
                                  fontWeight: theme.fontWeight.semibold
                                }}>
                                  {comment.author_name}
                                </span>
                                <Badge color={
                                  comment.author_type === 'customer' ? 'blue' :
                                  comment.author_type === 'tech' ? 'gray' : 'yellow'
                                } style={{ fontSize: theme.fontSize.xs }}>
                                  {comment.author_type === 'customer' ? 'Customer' :
                                   comment.author_type === 'tech' ? 'Tech' : 'System'}
                                </Badge>
                                {comment.is_resolution && (
                                  <Badge color="green" style={{ fontSize: theme.fontSize.xs }}>
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Resolution
                                  </Badge>
                                )}
                                <span style={{
                                  color: theme.colors.text.tertiary,
                                  fontSize: theme.fontSize.xs
                                }}>
                                  • {getRelativeTime(comment.created_at)}
                                </span>
                              </div>
                              <p style={{
                                color: theme.colors.text.primary,
                                fontSize: theme.fontSize.sm,
                                whiteSpace: 'pre-wrap',
                                lineHeight: '1.6',
                                margin: 0,
                                wordBreak: 'break-word'
                              }}>
                                {comment.comment_text}
                              </p>

                              {/* Attachments for this comment */}
                              {(() => {
                                const commentAttachments = getCommentAttachments(comment.id);
                                if (commentAttachments.length === 0) return null;

                                return (
                                  <div style={{
                                    marginTop: theme.spacing.md,
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: theme.spacing.sm
                                  }}>
                                    {commentAttachments.map((attachment) => {
                                      const isVideo = attachment.mime_type?.startsWith('video/');
                                      const isImage = attachment.mime_type?.startsWith('image/');

                                      return (
                                        <div key={attachment.id} style={{
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: theme.spacing.xs
                                        }}>
                                          {isVideo ? (
                                            <div
                                              onClick={() => setLightboxVideo(attachment.public_url)}
                                              style={{
                                                position: 'relative',
                                                cursor: 'pointer',
                                                borderRadius: theme.radius.md,
                                                overflow: 'hidden',
                                                border: `1px solid ${theme.colors.border.medium}`,
                                                transition: 'transform 0.2s, box-shadow 0.2s'
                                              }}
                                              onMouseOver={(e) => {
                                                e.currentTarget.style.transform = 'scale(1.02)';
                                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                                              }}
                                              onMouseOut={(e) => {
                                                e.currentTarget.style.transform = 'scale(1)';
                                                e.currentTarget.style.boxShadow = 'none';
                                              }}
                                            >
                                              <video
                                                src={attachment.public_url}
                                                style={{
                                                  maxWidth: '300px',
                                                  maxHeight: '200px',
                                                  display: 'block'
                                                }}
                                              />
                                              <div
                                                style={{
                                                  position: 'absolute',
                                                  top: 0,
                                                  left: 0,
                                                  right: 0,
                                                  bottom: 0,
                                                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  transition: 'background-color 0.2s'
                                                }}
                                                onMouseOver={(e) => {
                                                  e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.6)';
                                                }}
                                                onMouseOut={(e) => {
                                                  e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
                                                }}
                                              >
                                                <div
                                                  style={{
                                                    width: '50px',
                                                    height: '50px',
                                                    borderRadius: '50%',
                                                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                                                  }}
                                                >
                                                  <Play size={24} fill={theme.colors.accent.primary} color={theme.colors.accent.primary} />
                                                </div>
                                              </div>
                                            </div>
                                          ) : isImage ? (
                                            <img
                                              src={attachment.public_url}
                                              alt={attachment.original_filename || 'Attachment'}
                                              onClick={() => setLightboxImage(attachment.public_url)}
                                              style={{
                                                maxWidth: '200px',
                                                maxHeight: '150px',
                                                objectFit: 'cover',
                                                borderRadius: theme.radius.md,
                                                border: `1px solid ${theme.colors.border.medium}`,
                                                cursor: 'pointer',
                                                transition: 'transform 0.2s, box-shadow 0.2s'
                                              }}
                                              onMouseOver={(e) => {
                                                e.target.style.transform = 'scale(1.02)';
                                                e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                                              }}
                                              onMouseOut={(e) => {
                                                e.target.style.transform = 'scale(1)';
                                                e.target.style.boxShadow = 'none';
                                              }}
                                            />
                                          ) : (
                                            <a
                                              href={attachment.public_url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              style={{
                                                color: theme.colors.accent.primary,
                                                fontSize: theme.fontSize.xs
                                              }}
                                            >
                                              {attachment.original_filename || 'Download attachment'}
                                            </a>
                                          )}
                                          <span style={{
                                            fontSize: theme.fontSize.xs,
                                            color: theme.colors.text.tertiary,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                          }}>
                                            <Camera size={12} />
                                            {attachment.uploaded_by_type === 'customer' ? 'Photo from customer' : 'Photo from technician'}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={commentsEndRef} />
                    </div>
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      padding: `${theme.spacing.xl} 0`,
                      color: theme.colors.text.tertiary,
                      fontSize: theme.fontSize.sm
                    }}>
                      <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
                      <p style={{ fontStyle: 'italic', margin: 0 }}>No activity yet</p>
                      <p style={{ fontSize: theme.fontSize.xs, marginTop: theme.spacing.xs }}>
                        Be the first to add a comment
                      </p>
                    </div>
                  )}
                </div>

                {/* Add Comment Form */}
                <div style={{
                  paddingTop: theme.spacing.lg,
                  borderTop: `1px solid ${theme.colors.border.medium}`
                }}>
                  <h4 style={{
                    fontWeight: theme.fontWeight.medium,
                    color: theme.colors.text.primary,
                    fontSize: theme.fontSize.sm,
                    marginBottom: theme.spacing.md
                  }}>
                    Add Comment
                  </h4>
                  <form onSubmit={handleAddComment} style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
                    <div>
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onFocus={() => setIsEditing(true)}
                        placeholder="Write a comment..."
                        rows={4}
                        maxLength={2000}
                        required
                        style={{
                          width: '100%',
                          padding: theme.spacing.md,
                          backgroundColor: theme.colors.background.tertiary,
                          color: theme.colors.text.primary,
                          border: `1px solid ${theme.colors.border.medium}`,
                          borderRadius: theme.radius.md,
                          fontSize: theme.fontSize.sm,
                          outline: 'none',
                          resize: 'vertical',
                          fontFamily: 'inherit',
                          lineHeight: '1.6'
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

                    {(ticket.status === 'resolved' || ticket.status === 'in_progress') && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
                        <input
                          type="checkbox"
                          id="isResolution"
                          checked={isResolution}
                          onChange={(e) => setIsResolution(e.target.checked)}
                          style={{
                            width: '16px',
                            height: '16px',
                            cursor: 'pointer'
                          }}
                        />
                        <label
                          htmlFor="isResolution"
                          style={{
                            fontSize: theme.fontSize.sm,
                            color: theme.colors.text.secondary,
                            cursor: 'pointer'
                          }}
                        >
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
                        gap: theme.spacing.xs,
                        padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                        backgroundColor: theme.colors.accent.primary,
                        border: 'none',
                        borderRadius: theme.radius.md,
                        color: '#ffffff',
                        fontSize: theme.fontSize.sm,
                        fontWeight: theme.fontWeight.medium,
                        cursor: (addingComment || commentText.trim().length < 10) ? 'not-allowed' : 'pointer',
                        opacity: (addingComment || commentText.trim().length < 10) ? 0.5 : 1,
                        transition: 'all 0.2s',
                        alignSelf: 'flex-start'
                      }}
                      onMouseEnter={(e) => !(addingComment || commentText.trim().length < 10) && (e.currentTarget.style.backgroundColor = '#2c5282')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.colors.accent.primary)}
                    >
                      <Send className="w-4 h-4" />
                      {addingComment ? 'Adding...' : 'Add Comment'}
                    </button>
                  </form>
                </div>
              </div>
        </Card>

        {/* Status History - Collapsible at Bottom */}
        {ticket.status_history && ticket.status_history.length > 0 && (
          <Card>
            <div style={{ padding: theme.spacing.lg }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
                  <Clock className="w-5 h-5" style={{ color: theme.colors.text.secondary }} />
                  <h3 style={{
                    color: theme.colors.text.secondary,
                    fontSize: theme.fontSize.xs,
                    fontWeight: theme.fontWeight.semibold,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    margin: 0
                  }}>
                    Status History
                  </h3>
                  <Badge color="gray">{ticket.status_history.length}</Badge>
                </div>
                {statusHistoryOpen ? (
                  <ChevronUp className="w-5 h-5" style={{ color: theme.colors.text.tertiary }} />
                ) : (
                  <ChevronDown className="w-5 h-5" style={{ color: theme.colors.text.tertiary }} />
                )}
              </button>

              {statusHistoryOpen && (
                <div style={{
                  marginTop: theme.spacing.lg,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: theme.spacing.md
                }}>
                  {ticket.status_history.map((history, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'start',
                        gap: theme.spacing.md,
                        padding: theme.spacing.md,
                        backgroundColor: theme.colors.background.secondary,
                        borderRadius: theme.radius.lg
                      }}
                    >
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: theme.radius.full,
                        backgroundColor: theme.colors.background.tertiary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Clock className="w-4 h-4" style={{ color: theme.colors.text.tertiary }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: theme.spacing.sm,
                          flexWrap: 'wrap',
                          marginBottom: theme.spacing.xs
                        }}>
                          <Badge color="gray" style={{ fontSize: theme.fontSize.xs }}>
                            {history.from_status}
                          </Badge>
                          <span style={{ color: theme.colors.text.tertiary }}>→</span>
                          <Badge color="blue" style={{ fontSize: theme.fontSize.xs }}>
                            {history.to_status}
                          </Badge>
                        </div>
                        <p style={{
                          color: theme.colors.text.tertiary,
                          fontSize: theme.fontSize.xs,
                          margin: 0
                        }}>
                          By {history.changed_by_name} • {getRelativeTime(history.changed_at)}
                        </p>
                        {history.reason && (
                          <p style={{
                            color: theme.colors.text.secondary,
                            fontSize: theme.fontSize.sm,
                            marginTop: theme.spacing.sm,
                            fontStyle: 'italic'
                          }}>
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

      {/* Lightbox Modal for full-size image viewing */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'pointer'
          }}
        >
          <button
            onClick={() => setLightboxImage(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#ffffff'
            }}
          >
            <X size={24} />
          </button>
          <img
            src={lightboxImage}
            alt="Full size"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: theme.radius.lg
            }}
          />
        </div>
      )}

      {/* Lightbox Modal for full-size video viewing */}
      {lightboxVideo && (
        <div
          onClick={() => setLightboxVideo(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'pointer'
          }}
        >
          <button
            onClick={() => setLightboxVideo(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#ffffff',
              zIndex: 10000
            }}
          >
            <X size={24} />
          </button>
          <video
            src={lightboxVideo}
            controls
            autoPlay
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              borderRadius: theme.radius.lg
            }}
          />
        </div>
      )}
    </div>
  );
};

export default TechTicketDetail;
