import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  XCircle,
  Camera,
  Upload,
  Image,
  Loader2,
  Video,
  Play
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

  // Success/error messages
  const [successMessage, setSuccessMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);

  // Attachments state
  const [attachments, setAttachments] = useState([]);

  // Lightbox state for viewing full-size images and videos
  const [lightboxImage, setLightboxImage] = useState(null);
  const [lightboxVideo, setLightboxVideo] = useState(null);

  // File upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadAuthorName, setUploadAuthorName] = useState('');
  const fileInputRef = useRef(null);
  const successTimeoutRef = useRef(null);

  // Compute object URL for file preview (triggers re-render when selectedFile changes)
  const objectUrl = useMemo(() => {
    if (selectedFile) return URL.createObjectURL(selectedFile);
    return null;
  }, [selectedFile]);

  // Clean up object URL when it changes or on unmount
  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

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

  // Fetch attachments for the ticket
  const fetchAttachments = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tickets/${uuid}/attachments`);

      if (response.ok) {
        const data = await response.json();
        setAttachments(data || []);
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
    clearTimeout(successTimeoutRef.current);
    successTimeoutRef.current = setTimeout(() => setSuccessMessage(''), 5000);
  };

  // Clean up success timeout on unmount
  useEffect(() => {
    return () => clearTimeout(successTimeoutRef.current);
  }, []);

  // Add comment
  const handleAddComment = async (e) => {
    e.preventDefault();

    if (!commentText.trim() || commentText.trim().length < 10) {
      setStatusMessage({ type: 'error', text: 'Comment must be at least 10 characters' });
      return;
    }

    if (!authorName.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter your name' });
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
      setStatusMessage({ type: 'error', text: 'Failed to add comment. Please try again.' });
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
      setStatusMessage({ type: 'error', text: 'Failed to mark ticket as resolved. Please try again.' });
    } finally {
      setResolving(false);
    }
  };

  // Reopen ticket
  const handleReopen = async () => {
    if (!reopenReason.trim()) {
      setStatusMessage({ type: 'error', text: 'Please provide a reason for reopening' });
      return;
    }

    if (!reopenName.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter your name' });
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
      setStatusMessage({ type: 'error', text: 'Failed to reopen ticket. Please try again.' });
    } finally {
      setReopening(false);
    }
  };

  // File upload handlers
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'];
  const allAllowedTypes = [...allowedImageTypes, ...allowedVideoTypes];

  const isVideoFile = (file) => allowedVideoTypes.includes(file?.type);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!allAllowedTypes.includes(file.type)) {
      setUploadError('Invalid file type. Only JPEG, PNG, GIF, WebP images and MP4, MOV, WebM videos are allowed.');
      setSelectedFile(null);
      return;
    }

    // Validate file size (50MB for videos, 10MB for images)
    const maxSize = isVideoFile(file) ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    const maxSizeLabel = isVideoFile(file) ? '50MB' : '10MB';
    if (file.size > maxSize) {
      setUploadError(`File size exceeds ${maxSizeLabel} limit.`);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setUploadError('Please select a file first');
      return;
    }

    if (!uploadAuthorName.trim()) {
      setUploadError('Please enter your name');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('author_name', uploadAuthorName.trim());

      // Use XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();

      const uploadPromise = new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.error || 'Upload failed'));
            } catch {
              reject(new Error('Upload failed'));
            }
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        xhr.open('POST', `${API_BASE_URL}/api/tickets/public/${uuid}/attachments`);
        xhr.send(formData);
      });

      await uploadPromise;

      showSuccess('Photo uploaded successfully!');
      setSelectedFile(null);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Refresh ticket and attachments
      await Promise.all([fetchTicket(), fetchAttachments()]);

      // Scroll to new comment
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Error uploading file:', err);
      setUploadError(err.message || 'Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setUploadError(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

        {/* Status Message (error/info) */}
        {statusMessage && (
          <div style={{
            padding: '16px',
            backgroundColor: statusMessage.type === 'error' ? '#fef2f2' : '#d1fae5',
            border: `1px solid ${statusMessage.type === 'error' ? '#fecaca' : '#6ee7b7'}`,
            borderRadius: '8px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            {statusMessage.type === 'error'
              ? <XCircle style={{ width: '20px', height: '20px', color: '#dc2626', flexShrink: 0 }} />
              : <CheckCircle style={{ width: '20px', height: '20px', color: '#059669', flexShrink: 0 }} />
            }
            <span style={{
              color: statusMessage.type === 'error' ? '#991b1b' : '#065f46',
              fontSize: '0.875rem',
              fontWeight: '500',
              flex: 1
            }}>
              {statusMessage.text}
            </span>
            <button
              onClick={() => setStatusMessage(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: statusMessage.type === 'error' ? '#991b1b' : '#065f46',
                flexShrink: 0
              }}
            >
              <X size={16} />
            </button>
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

                        {/* Attachments for this comment */}
                        {(() => {
                          const commentAttachments = getCommentAttachments(comment.id);
                          if (commentAttachments.length === 0) return null;

                          return (
                            <div style={{
                              marginTop: '12px',
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '8px'
                            }}>
                              {commentAttachments.map((attachment) => {
                                const isVideo = attachment.mime_type?.startsWith('video/');
                                const isImage = attachment.mime_type?.startsWith('image/');

                                return (
                                  <div key={attachment.id} style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px'
                                  }}>
                                    {isVideo ? (
                                      <div
                                        onClick={() => setLightboxVideo(attachment.public_url)}
                                        style={{
                                          position: 'relative',
                                          cursor: 'pointer',
                                          maxWidth: '300px',
                                          maxHeight: '200px',
                                          borderRadius: '8px',
                                          overflow: 'hidden',
                                          border: '1px solid #e5e7eb',
                                          backgroundColor: '#000'
                                        }}
                                      >
                                        <video
                                          src={attachment.public_url}
                                          style={{
                                            width: '100%',
                                            height: '100%',
                                            maxHeight: '200px',
                                            objectFit: 'cover'
                                          }}
                                        />
                                        <div style={{
                                          position: 'absolute',
                                          top: '50%',
                                          left: '50%',
                                          transform: 'translate(-50%, -50%)',
                                          backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                          borderRadius: '50%',
                                          width: '48px',
                                          height: '48px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          transition: 'transform 0.2s, background-color 0.2s'
                                        }}
                                        onMouseOver={(e) => {
                                          e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.1)';
                                          e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.8)';
                                        }}
                                        onMouseOut={(e) => {
                                          e.currentTarget.style.transform = 'translate(-50%, -50%)';
                                          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
                                        }}
                                        >
                                          <Play size={24} style={{ color: 'white', marginLeft: '3px' }} />
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
                                          borderRadius: '8px',
                                          border: '1px solid #e5e7eb',
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
                                          color: '#3b82f6',
                                          fontSize: '0.75rem'
                                        }}
                                      >
                                        {attachment.original_filename || 'Download attachment'}
                                      </a>
                                    )}
                                    <span style={{
                                      fontSize: '0.75rem',
                                      color: '#6b7280',
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

              {/* Photo Upload Section */}
              <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
                <h4 style={{ color: '#111827', fontSize: '1rem', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Camera size={18} />
                  Upload Photo or Video
                </h4>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '16px' }}>
                  Share photos or videos related to your issue. Images: JPEG, PNG, GIF, WebP (max 10MB). Videos: MP4, MOV, WebM (max 50MB)
                </p>

                {/* Your Name for Upload */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: '500', marginBottom: '8px' }}>
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={uploadAuthorName}
                    onChange={(e) => setUploadAuthorName(e.target.value)}
                    placeholder="Enter your name"
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

                {/* File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  id="photo-upload"
                />

                {/* Upload Area */}
                {!selectedFile ? (
                  <label
                    htmlFor="photo-upload"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '32px',
                      border: '2px dashed #d1d5db',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      backgroundColor: '#fafafa'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.backgroundColor = '#f0f9ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#d1d5db';
                      e.currentTarget.style.backgroundColor = '#fafafa';
                    }}
                  >
                    <Upload size={32} style={{ color: '#9ca3af', marginBottom: '12px' }} />
                    <span style={{ color: '#374151', fontSize: '0.875rem', fontWeight: '500' }}>
                      Click to select a photo or video
                    </span>
                    <span style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '4px' }}>
                      or drag and drop
                    </span>
                  </label>
                ) : (
                  <div style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '16px',
                    backgroundColor: '#fafafa'
                  }}>
                    {/* Preview */}
                    <div style={{ display: 'flex', alignItems: 'start', gap: '16px', marginBottom: '16px' }}>
                      {isVideoFile(selectedFile) ? (
                        <div style={{
                          width: '120px',
                          height: '100px',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          overflow: 'hidden',
                          position: 'relative',
                          backgroundColor: '#000'
                        }}>
                          <video
                            src={objectUrl}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                          <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            backgroundColor: 'rgba(0, 0, 0, 0.6)',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Play size={16} style={{ color: 'white', marginLeft: '2px' }} />
                          </div>
                        </div>
                      ) : (
                        <img
                          src={objectUrl}
                          alt="Preview"
                          style={{
                            width: '100px',
                            height: '100px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb'
                          }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <p style={{ color: '#111827', fontSize: '0.875rem', fontWeight: '500', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {isVideoFile(selectedFile) && <Video size={14} style={{ color: '#6b7280' }} />}
                          {selectedFile.name}
                        </p>
                        <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <button
                          type="button"
                          onClick={clearSelectedFile}
                          style={{
                            marginTop: '8px',
                            padding: '4px 8px',
                            backgroundColor: 'transparent',
                            border: '1px solid #ef4444',
                            borderRadius: '4px',
                            color: '#ef4444',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <X size={12} />
                          Remove
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {uploading && (
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{
                          height: '8px',
                          backgroundColor: '#e5e7eb',
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${uploadProgress}%`,
                            backgroundColor: '#3b82f6',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                        <p style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '4px', textAlign: 'center' }}>
                          Uploading... {uploadProgress}%
                        </p>
                      </div>
                    )}

                    {/* Upload Button */}
                    <button
                      type="button"
                      onClick={handleFileUpload}
                      disabled={uploading || !uploadAuthorName.trim()}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '12px 20px',
                        backgroundColor: '#10b981',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        cursor: (uploading || !uploadAuthorName.trim()) ? 'not-allowed' : 'pointer',
                        opacity: (uploading || !uploadAuthorName.trim()) ? 0.5 : 1,
                        transition: 'all 0.2s'
                      }}
                    >
                      {uploading ? (
                        <>
                          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload size={18} />
                          Upload Photo
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Error Message */}
                {uploadError && (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    color: '#dc2626',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <XCircle size={16} />
                    {uploadError}
                  </div>
                )}
              </div>
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
              borderRadius: '8px'
            }}
          />
        </div>
      )}

      {/* Video Lightbox Modal */}
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
              borderRadius: '8px'
            }}
          />
        </div>
      )}
    </div>
  );
};

export default PublicTicket;
