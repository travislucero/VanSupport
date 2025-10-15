import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Ticket,
  User,
  Phone,
  Mail,
  MessageCircle,
  CheckCircle,
  RotateCcw,
  Clock,
  AlertTriangle,
  ArrowUp,
  Minus,
  ArrowDown,
  Wrench,
  UserCheck,
  X,
  XCircle
} from 'lucide-react';
import Card from '../components/Card';
import Badge from '../components/Badge';
import { theme } from '../styles/theme';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Auto-refresh interval (10 seconds)
const COMMENT_REFRESH_INTERVAL = 10000;

const PublicTicket = () => {
  const { uuid } = useParams();
  const commentsEndRef = useRef(null);

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Comment form state
  const [commentText, setCommentText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [addingComment, setAddingComment] = useState(false);

  // Resolve/Reopen state
  const [showResolveConfirm, setShowResolveConfirm] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [reopenName, setReopenName] = useState('');
  const [reopening, setReopening] = useState(false);

  // Success messages
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch ticket data
  const fetchTicket = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/tickets/public/${uuid}`);

      if (response.status === 404) {
        setError('Ticket not found');
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch ticket');
      }

      const data = await response.json();
      setTicket(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching ticket:', err);
      setError('Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }, [uuid]);

  // Initial fetch
  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  // Auto-refresh comments
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTicket(true);
    }, COMMENT_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchTicket]);

  // Show success message temporarily
  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  // Add comment
  const handleAddComment = async (e) => {
    e.preventDefault();

    if (!commentText.trim() || commentText.trim().length < 10) {
      alert('Comment must be at least 10 characters');
      return;
    }

    if (!authorName.trim()) {
      alert('Please enter your name');
      return;
    }

    setAddingComment(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/tickets/public/${uuid}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          comment_text: commentText,
          author_name: authorName
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      showSuccess('Comment added successfully!');
      setCommentText('');
      await fetchTicket();

      // Scroll to new comment
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Error adding comment:', err);
      alert('Failed to add comment. Please try again.');
    } finally {
      setAddingComment(false);
    }
  };

  // Mark as resolved
  const handleMarkResolved = async () => {
    setResolving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/tickets/public/${uuid}/resolve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resolution: 'Customer marked as resolved'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to resolve ticket');
      }

      showSuccess('Ticket marked as resolved!');
      setShowResolveConfirm(false);
      await fetchTicket();
    } catch (err) {
      console.error('Error resolving ticket:', err);
      alert('Failed to mark ticket as resolved. Please try again.');
    } finally {
      setResolving(false);
    }
  };

  // Reopen ticket
  const handleReopen = async () => {
    if (!reopenReason.trim()) {
      alert('Please provide a reason for reopening');
      return;
    }

    if (!reopenName.trim()) {
      alert('Please enter your name');
      return;
    }

    setReopening(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/tickets/public/${uuid}/reopen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: reopenReason,
          reopened_by_name: reopenName
        })
      });

      if (!response.ok) {
        throw new Error('Failed to reopen ticket');
      }

      const data = await response.json();
      showSuccess('Ticket reopened successfully! A new ticket has been created.');
      setShowReopenModal(false);
      setReopenReason('');
      setReopenName('');

      // Optionally redirect to new ticket
      if (data.new_ticket_id) {
        setTimeout(() => {
          window.location.href = `/ticket/${data.new_ticket_id}`;
        }, 2000);
      }
    } catch (err) {
      console.error('Error reopening ticket:', err);
      alert('Failed to reopen ticket. Please try again.');
    } finally {
      setReopening(false);
    }
  };

  // Get status badge config
  const getStatusBadge = (status) => {
    const configs = {
      open: { color: 'blue', icon: Clock, label: 'Open' },
      assigned: { color: 'purple', icon: UserCheck, label: 'Assigned' },
      in_progress: { color: 'yellow', icon: Wrench, label: 'In Progress' },
      waiting_customer: { color: 'orange', icon: MessageCircle, label: 'Waiting for You' },
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

  // Get comment background
  const getCommentBackground = (authorType) => {
    const backgrounds = {
      customer: 'bg-blue-50',
      tech: 'bg-gray-50',
      system: 'bg-yellow-50'
    };
    return backgrounds[authorType] || 'bg-gray-50';
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

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: theme.colors.background.primary, padding: '2rem' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div className="animate-pulse space-y-6">
            <div style={{ height: '100px', backgroundColor: '#e5e7eb', borderRadius: '8px' }}></div>
            <div style={{ height: '300px', backgroundColor: '#e5e7eb', borderRadius: '8px' }}></div>
            <div style={{ height: '400px', backgroundColor: '#e5e7eb', borderRadius: '8px' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: theme.colors.background.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '500px' }}>
          <Ticket style={{ width: '64px', height: '64px', color: '#d1d5db', margin: '0 auto 16px' }} />
          <h1 style={{ color: '#111827', fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '12px' }}>
            Ticket Not Found
          </h1>
          <p style={{ color: '#6b7280', fontSize: '1rem', marginBottom: '24px' }}>
            {error || 'The ticket you\'re looking for doesn\'t exist or the link is invalid.'}
          </p>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Please check the link and try again, or contact support if you need assistance.
          </p>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusBadge(ticket.status);
  const priorityConfig = getPriorityBadge(ticket.priority);
  const urgencyConfig = getUrgencyBadge(ticket.urgency);
  const StatusIcon = statusConfig.icon;
  const PriorityIcon = priorityConfig.icon;

  const canResolve = ['open', 'assigned', 'in_progress', 'waiting_customer'].includes(ticket.status);
  const canReopen = ticket.status === 'closed';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: theme.colors.background.primary, padding: '1rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Success Message */}
        {successMessage && (
          <div style={{
            padding: '16px',
            backgroundColor: '#d1fae5',
            border: '1px solid #6ee7b7',
            borderRadius: '8px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <CheckCircle style={{ width: '20px', height: '20px', color: '#059669' }} />
            <span style={{ color: '#065f46', fontSize: '0.875rem', fontWeight: '500' }}>
              {successMessage}
            </span>
          </div>
        )}

        {/* Header with Branding */}
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 24px',
            backgroundColor: '#1e3a5f',
            borderRadius: '12px',
            marginBottom: '24px'
          }}>
            <Ticket style={{ width: '32px', height: '32px', color: 'white' }} />
            <h1 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
              MAX Support
            </h1>
          </div>
        </div>

        {/* Ticket Header Card */}
        <Card className="mb-6">
          <div className="p-6">
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h2 style={{ color: '#111827', fontSize: '2rem', fontWeight: 'bold', marginBottom: '12px' }}>
                Ticket #{ticket.ticket_number}
              </h2>
              <Badge color={statusConfig.color} style={{ fontSize: '1rem', padding: '8px 16px' }}>
                <StatusIcon className="w-5 h-5 mr-2" />
                {statusConfig.label}
              </Badge>
            </div>
            <h3 style={{ color: '#374151', fontSize: '1.25rem', fontWeight: '600', textAlign: 'center', marginTop: '16px' }}>
              {ticket.subject}
            </h3>
          </div>
        </Card>

        {/* Ticket Information */}
        <Card className="mb-6">
          <div className="p-6">
            <h3 style={{ color: '#111827', fontSize: '1.125rem', fontWeight: '600', marginBottom: '20px' }}>
              Ticket Information
            </h3>

            <div className="space-y-4">
              {/* Customer Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <User style={{ width: '20px', height: '20px', color: '#9ca3af' }} />
                <span style={{ color: '#6b7280', fontSize: '0.875rem', minWidth: '100px' }}>Customer:</span>
                <span style={{ color: '#111827', fontSize: '0.875rem', fontWeight: '500' }}>
                  {ticket.customer_name || 'N/A'}
                </span>
              </div>

              {ticket.customer_phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Phone style={{ width: '20px', height: '20px', color: '#9ca3af' }} />
                  <span style={{ color: '#6b7280', fontSize: '0.875rem', minWidth: '100px' }}>Phone:</span>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Mail style={{ width: '20px', height: '20px', color: '#9ca3af' }} />
                  <span style={{ color: '#6b7280', fontSize: '0.875rem', minWidth: '100px' }}>Email:</span>
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

              {ticket.van_info && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Ticket style={{ width: '20px', height: '20px', color: '#9ca3af' }} />
                  <span style={{ color: '#6b7280', fontSize: '0.875rem', minWidth: '100px' }}>Van:</span>
                  <span style={{ color: '#111827', fontSize: '0.875rem' }}>{ticket.van_info}</span>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ color: '#6b7280', fontSize: '0.875rem', minWidth: '100px' }}>Priority:</span>
                <Badge color={priorityConfig.color}>
                  <PriorityIcon className="w-3 h-3 mr-1" />
                  {priorityConfig.label}
                </Badge>
                {urgencyConfig && (
                  <>
                    <span style={{ color: '#6b7280', fontSize: '0.875rem', marginLeft: '16px' }}>Urgency:</span>
                    <Badge color={urgencyConfig.color}>{urgencyConfig.label}</Badge>
                  </>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Clock style={{ width: '20px', height: '20px', color: '#9ca3af' }} />
                <span style={{ color: '#6b7280', fontSize: '0.875rem', minWidth: '100px' }}>Created:</span>
                <span style={{ color: '#111827', fontSize: '0.875rem' }}>
                  {new Date(ticket.created_at).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Description */}
            {ticket.description && (
              <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
                <h4 style={{ color: '#111827', fontSize: '0.875rem', fontWeight: '600', marginBottom: '12px' }}>
                  Description
                </h4>
                <p style={{ color: '#374151', fontSize: '0.875rem', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                  {ticket.description}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {canResolve && (
            <button
              onClick={() => setShowResolveConfirm(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                backgroundColor: '#059669',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#047857')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#059669')}
            >
              <CheckCircle size={18} />
              Mark as Resolved
            </button>
          )}

          {canReopen && (
            <button
              onClick={() => setShowReopenModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                backgroundColor: '#ea580c',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#c2410c')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ea580c')}
            >
              <RotateCcw size={18} />
              Reopen Ticket
            </button>
          )}
        </div>

        {/* Resolve Confirmation Modal */}
        {showResolveConfirm && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 1000
          }}>
            <Card style={{ maxWidth: '400px', width: '100%' }}>
              <div className="p-6">
                <h3 style={{ color: '#111827', fontSize: '1.125rem', fontWeight: '600', marginBottom: '12px' }}>
                  Mark as Resolved?
                </h3>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '24px' }}>
                  Are you sure this issue has been resolved? This will notify our support team.
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={handleMarkResolved}
                    disabled={resolving}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      backgroundColor: '#059669',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: resolving ? 'not-allowed' : 'pointer',
                      opacity: resolving ? 0.5 : 1
                    }}
                  >
                    {resolving ? 'Resolving...' : 'Yes, Resolve'}
                  </button>
                  <button
                    onClick={() => setShowResolveConfirm(false)}
                    disabled={resolving}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      backgroundColor: 'white',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      color: '#374151',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Reopen Modal */}
        {showReopenModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 1000
          }}>
            <Card style={{ maxWidth: '500px', width: '100%' }}>
              <div className="p-6">
                <h3 style={{ color: '#111827', fontSize: '1.125rem', fontWeight: '600', marginBottom: '12px' }}>
                  Reopen Ticket
                </h3>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '16px' }}>
                  Please tell us why you're reopening this ticket.
                </p>
                <div className="space-y-4">
                  <div>
                    <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: '500', marginBottom: '8px' }}>
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={reopenName}
                      onChange={(e) => setReopenName(e.target.value)}
                      placeholder="Enter your name"
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        backgroundColor: theme.colors.background.tertiary,
                        color: theme.colors.text.primary,
                        border: `1px solid ${theme.colors.border.medium}`,
                        borderRadius: theme.radius.md,
                        fontSize: '0.875rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: '500', marginBottom: '8px' }}>
                      Reason for Reopening
                    </label>
                    <textarea
                      value={reopenReason}
                      onChange={(e) => setReopenReason(e.target.value)}
                      placeholder="Explain why you need to reopen this ticket..."
                      rows={4}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        backgroundColor: theme.colors.background.tertiary,
                        color: theme.colors.text.primary,
                        border: `1px solid ${theme.colors.border.medium}`,
                        borderRadius: theme.radius.md,
                        fontSize: '0.875rem',
                        outline: 'none',
                        resize: 'none'
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button
                    onClick={handleReopen}
                    disabled={reopening}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      backgroundColor: '#ea580c',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: reopening ? 'not-allowed' : 'pointer',
                      opacity: reopening ? 0.5 : 1
                    }}
                  >
                    {reopening ? 'Reopening...' : 'Reopen Ticket'}
                  </button>
                  <button
                    onClick={() => {
                      setShowReopenModal(false);
                      setReopenReason('');
                      setReopenName('');
                    }}
                    disabled={reopening}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      backgroundColor: 'white',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      color: '#374151',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Comments Timeline */}
        <Card className="mb-6">
          <div className="p-6">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <MessageCircle style={{ width: '20px', height: '20px', color: '#374151' }} />
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
                    <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                      {/* Avatar */}
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        flexShrink: 0,
                        backgroundColor: comment.author_type === 'customer' ? '#3b82f6' :
                                       comment.author_type === 'tech' ? '#6b7280' : '#eab308'
                      }}>
                        {getAvatarInitial(comment.author_type)}
                      </div>

                      {/* Comment Content */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <span style={{ color: '#111827', fontSize: '0.875rem', fontWeight: '600' }}>
                            {comment.author_name}
                          </span>
                          <Badge color={
                            comment.author_type === 'customer' ? 'blue' :
                            comment.author_type === 'tech' ? 'gray' : 'yellow'
                          }>
                            {comment.author_type === 'customer' ? 'Customer' :
                             comment.author_type === 'tech' ? 'Support' : 'System'}
                          </Badge>
                          {comment.is_resolution && (
                            <Badge color="green">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Resolution
                            </Badge>
                          )}
                        </div>
                        <p style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '8px' }}>
                          {getRelativeTime(comment.created_at)}
                        </p>
                        <p style={{ color: '#374151', fontSize: '0.875rem', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                          {comment.comment_text}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: '#6b7280', fontSize: '0.875rem', textAlign: 'center', padding: '32px 0', fontStyle: 'italic' }}>
                  No comments yet. Be the first to add one!
                </p>
              )}
              <div ref={commentsEndRef} />
            </div>

            {/* Add Comment Form */}
            <div style={{ paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
              <h4 style={{ color: '#111827', fontSize: '1rem', fontWeight: '600', marginBottom: '16px' }}>
                Add a Comment
              </h4>
              <form onSubmit={handleAddComment} className="space-y-4">
                <div>
                  <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: '500', marginBottom: '8px' }}>
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Enter your name"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: theme.colors.background.tertiary,
                      color: theme.colors.text.primary,
                      border: `1px solid ${theme.colors.border.medium}`,
                      borderRadius: theme.radius.md,
                      fontSize: '0.875rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: '500', marginBottom: '8px' }}>
                    Comment
                  </label>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    rows={4}
                    maxLength={2000}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: theme.colors.background.tertiary,
                      color: theme.colors.text.primary,
                      border: `1px solid ${theme.colors.border.medium}`,
                      borderRadius: theme.radius.md,
                      fontSize: '0.875rem',
                      outline: 'none',
                      resize: 'none'
                    }}
                  />
                  <p style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '4px' }}>
                    {commentText.length}/2000 characters (minimum 10)
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={addingComment || commentText.trim().length < 10 || !authorName.trim()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    backgroundColor: '#1e3a5f',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: (addingComment || commentText.trim().length < 10 || !authorName.trim()) ? 'not-allowed' : 'pointer',
                    opacity: (addingComment || commentText.trim().length < 10 || !authorName.trim()) ? 0.5 : 1,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!addingComment && commentText.trim().length >= 10 && authorName.trim()) {
                      e.currentTarget.style.backgroundColor = '#2c5282';
                    }
                  }}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1e3a5f')}
                >
                  <MessageCircle size={18} />
                  {addingComment ? 'Adding Comment...' : 'Add Comment'}
                </button>
              </form>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div style={{ textAlign: 'center', paddingTop: '24px', paddingBottom: '24px', borderTop: '1px solid #e5e7eb' }}>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Need help? Contact MAX Support at <a href="mailto:support@maxsupport.com" style={{ color: '#1e3a5f', textDecoration: 'none' }}>support@maxsupport.com</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicTicket;
