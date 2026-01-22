import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
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
  Camera,
  Play,
  Lightbulb,
  ExternalLink,
  FileText,
  Link2
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Card from '../components/Card';
import Badge from '../components/Badge';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { theme } from '../styles/theme';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Reusable button styles generator for consistency
const getButtonStyles = (variant, disabled = false) => {
  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    borderRadius: theme.radius.md,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: `all ${theme.transitions.fast}`,
    border: 'none',
    whiteSpace: 'nowrap',
  };

  const variants = {
    primary: {
      backgroundColor: theme.colors.accent.primary,
      color: theme.colors.text.inverse,
    },
    success: {
      backgroundColor: theme.colors.accent.success,
      color: theme.colors.text.inverse,
    },
    warning: {
      backgroundColor: theme.colors.accent.warning,
      color: theme.colors.text.inverse,
    },
    danger: {
      backgroundColor: theme.colors.accent.danger,
      color: theme.colors.text.inverse,
    },
    secondary: {
      backgroundColor: theme.colors.background.tertiary,
      color: theme.colors.text.secondary,
      border: `1px solid ${theme.colors.border.medium}`,
    },
    ghost: {
      backgroundColor: 'transparent',
      color: theme.colors.text.secondary,
    },
    purple: {
      backgroundColor: theme.colors.chart.purple,
      color: theme.colors.text.inverse,
    },
  };

  return { ...baseStyles, ...variants[variant] };
};

// Section header component for consistent styling
const SectionHeader = ({ icon: Icon, title, badge, action }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
      {Icon && <Icon size={18} style={{ color: theme.colors.text.tertiary }} />}
      <h3 style={{
        color: theme.colors.text.primary,
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.semibold,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        margin: 0,
      }}>
        {title}
      </h3>
      {badge !== undefined && (
        <Badge variant="primary" size="sm" soft>
          {badge}
        </Badge>
      )}
    </div>
    {action}
  </div>
);

// Info row component for displaying label-value pairs
const InfoRow = ({ icon: Icon, label, value, href, isEmail }) => {
  const content = href ? (
    <a
      href={href}
      style={{
        color: theme.colors.accent.primary,
        fontSize: theme.fontSize.sm,
        textDecoration: 'none',
        wordBreak: isEmail ? 'break-all' : 'normal',
        transition: `color ${theme.transitions.fast}`,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
      onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
    >
      {value}
    </a>
  ) : (
    <span style={{
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.medium,
    }}>
      {value}
    </span>
  );

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing.sm,
      padding: `${theme.spacing.sm} 0`,
    }}>
      <Icon size={18} style={{ color: theme.colors.text.tertiary, flexShrink: 0 }} />
      {label && (
        <span style={{
          color: theme.colors.text.tertiary,
          fontSize: theme.fontSize.xs,
          minWidth: '60px',
        }}>
          {label}:
        </span>
      )}
      {content}
    </div>
  );
};

// Auto-refresh interval for comments (10 seconds)
const COMMENT_REFRESH_INTERVAL = 10000;

// CSS keyframes for the resolution checkbox shine effect
// Creates a subtle pulsing glow that draws attention without being annoying
const shineKeyframes = `
@keyframes resolutionShine {
  0% {
    background-position: -200% center;
    box-shadow: 0 0 0 0 rgba(5, 150, 105, 0);
  }
  15% {
    box-shadow: 0 0 12px 2px rgba(5, 150, 105, 0.4);
  }
  30% {
    background-position: 200% center;
    box-shadow: 0 0 8px 1px rgba(5, 150, 105, 0.3);
  }
  50% {
    box-shadow: 0 0 0 0 rgba(5, 150, 105, 0);
  }
  65% {
    box-shadow: 0 0 10px 2px rgba(5, 150, 105, 0.35);
  }
  80% {
    box-shadow: 0 0 6px 1px rgba(5, 150, 105, 0.2);
  }
  100% {
    background-position: -200% center;
    box-shadow: 0 0 0 0 rgba(5, 150, 105, 0);
  }
}
`;

// Inject keyframes into document head if not already present
if (typeof document !== 'undefined') {
  const styleId = 'resolution-shine-keyframes';
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = shineKeyframes;
    document.head.appendChild(styleEl);
  }
}

const TechTicketDetail = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, logout, hasRole } = useAuth();
  const commentsEndRef = useRef(null);
  const commentFormRef = useRef(null);
  const similarModalTriggerRef = useRef(null);
  const similarModalCloseRef = useRef(null);
  const resolveModalTriggerRef = useRef(null);
  const resolveModalCloseRef = useRef(null);
  const lightboxTriggerRef = useRef(null);
  const lightboxCloseRef = useRef(null);

  // Ref for tracking last comment count to avoid stale closures in fetchTicket
  const lastCommentCountRef = useRef(0);

  // Ref to track mounted state for safe setTimeout callbacks
  const isMountedRef = useRef(true);

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
  // Combined into single state object for cleaner state management
  const [lightboxMedia, setLightboxMedia] = useState({ type: null, url: null });

  // Similar tickets state
  const [showSimilarModal, setShowSimilarModal] = useState(false);
  const [similarTickets, setSimilarTickets] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [highlightResolution, setHighlightResolution] = useState(false);

  // Resolution modal state
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionText, setResolutionText] = useState('');
  const [skipResolution, setSkipResolution] = useState(false);
  const [submittingResolution, setSubmittingResolution] = useState(false);
  const [resolutionCommentPosted, setResolutionCommentPosted] = useState(false);


  // Mobile detection state for responsive modals
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Fetch ticket detail
  // Uses lastCommentCountRef to avoid stale closure issues - the ref is always current
  // while avoiding unnecessary callback recreation when comment count changes
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

      // Check for new comments using ref to avoid stale closure
      const currentCommentCount = data.comments?.length || 0;
      if (silent && lastCommentCountRef.current > 0 && currentCommentCount > lastCommentCountRef.current) {
        setHasNewComments(true);
      }
      // Update both ref (for comparison logic) and state (for display if needed)
      lastCommentCountRef.current = currentCommentCount;
      setLastCommentCount(currentCommentCount);
    } catch (error) {
      console.error('Error fetching ticket:', error);
      showToast('Failed to load ticket', 'error');
    } finally {
      setLoading(false);
    }
  }, [uuid, navigate, showToast]);

  // Fetch attachments for the ticket
  const fetchAttachments = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tickets/${uuid}/attachments`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setAttachments(data || []);
      }
    } catch (error) {
      console.error('Error fetching attachments:', error);
    }
  }, [uuid]);

  // Pre-compute attachments by comment ID using Map for O(1) lookups
  // This replaces the O(n*m) filter approach with O(n) preprocessing + O(1) access
  const attachmentsByCommentId = useMemo(() => {
    const map = new Map();
    attachments.forEach(att => {
      if (!map.has(att.comment_id)) {
        map.set(att.comment_id, []);
      }
      map.get(att.comment_id).push(att);
    });
    return map;
  }, [attachments]);

  // Fetch similar tickets
  const fetchSimilarTickets = useCallback(async () => {
    setLoadingSimilar(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/tickets/${uuid}/similar?limit=5`, {
        credentials: 'include'
      });

      if (!response.ok) {
        // Provide specific error messages based on HTTP status
        if (response.status === 403) {
          showToast('You do not have permission to view similar tickets', 'error');
          return;
        }
        if (response.status === 404) {
          showToast('Ticket not found', 'error');
          return;
        }
        throw new Error(`Failed to fetch similar tickets: ${response.status}`);
      }

      const data = await response.json();
      setSimilarTickets(data);
      setShowSimilarModal(true);
    } catch (error) {
      console.error('Error fetching similar tickets:', error);
      showToast('Failed to load similar tickets', 'error');
    } finally {
      setLoadingSimilar(false);
    }
  }, [uuid, showToast]);

  // Handle using a similar ticket's resolution
  // Uses isMountedRef to prevent state updates after unmount (memory leak prevention)
  const handleUseSolution = useCallback((resolution) => {
    // Copy resolution text to comment textarea
    setCommentText(resolution);
    // Auto-check the "Mark as Resolution" checkbox
    setIsResolution(true);
    // Close the similar tickets modal
    setShowSimilarModal(false);
    // Trigger the highlight animation
    setHighlightResolution(true);
    // Stop the animation after 3 seconds (check if mounted before updating state)
    setTimeout(() => {
      if (isMountedRef.current) {
        setHighlightResolution(false);
      }
    }, 3000);
    // Scroll to the comment form after a brief delay to allow modal to close
    setTimeout(() => {
      if (isMountedRef.current) {
        commentFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
    // Show feedback toast
    showToast('Resolution copied - review and submit when ready', 'success');
  }, [showToast]);

  // Cleanup: mark component as unmounted to prevent state updates from pending timeouts
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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

  // Close modals on Escape key press
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        // Don't close resolve modal if submission is in progress
        if (showResolveModal && !submittingResolution) {
          setShowResolveModal(false);
          // Return focus to trigger button when modal closes via Escape
          resolveModalTriggerRef.current?.focus();
        }
        if (showSimilarModal) {
          setShowSimilarModal(false);
          // Return focus to trigger button when modal closes via Escape
          similarModalTriggerRef.current?.focus();
        }
        if (lightboxMedia.type) {
          setLightboxMedia({ type: null, url: null });
          // Return focus to trigger element when lightbox closes via Escape
          lightboxTriggerRef.current?.focus();
        }
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showResolveModal, showSimilarModal, lightboxMedia.type, submittingResolution]);

  // Similar Tickets Modal: Auto-focus close button and trap focus within modal
  useEffect(() => {
    if (!showSimilarModal) return;

    // Auto-focus the close button when modal opens
    similarModalCloseRef.current?.focus();

    // Focus trap: keep focus within the modal
    const handleFocusTrap = (e) => {
      if (e.key !== 'Tab') return;

      const modal = document.getElementById('similar-tickets-modal');
      if (!modal) return;

      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener('keydown', handleFocusTrap);
    return () => document.removeEventListener('keydown', handleFocusTrap);
  }, [showSimilarModal]);

  // Resolve Modal: Auto-focus close button and trap focus within modal
  useEffect(() => {
    if (!showResolveModal) return;

    // Auto-focus the close button when modal opens
    resolveModalCloseRef.current?.focus();

    // Focus trap: keep focus within the modal
    const handleFocusTrap = (e) => {
      if (e.key !== 'Tab') return;

      const modal = document.getElementById('resolve-modal');
      if (!modal) return;

      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener('keydown', handleFocusTrap);
    return () => document.removeEventListener('keydown', handleFocusTrap);
  }, [showResolveModal]);

  // Lightbox Modal: Auto-focus close button and trap focus within modal
  useEffect(() => {
    if (!lightboxMedia.type) return;

    // Auto-focus the close button when lightbox opens
    lightboxCloseRef.current?.focus();

    // Focus trap: keep focus within the lightbox
    const handleFocusTrap = (e) => {
      if (e.key !== 'Tab') return;

      const modal = document.getElementById('lightbox-modal');
      if (!modal) return;

      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), video'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener('keydown', handleFocusTrap);
    return () => document.removeEventListener('keydown', handleFocusTrap);
  }, [lightboxMedia.type]);

  // Track window resize for responsive modal styling
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scroll to new comments
  const scrollToNewComments = () => {
    setHasNewComments(false);
    fetchTicket();
    setTimeout(() => {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Update priority
  const handlePriorityChange = useCallback(async (newPriority) => {
    if (newPriority === ticket?.priority) return;

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
  }, [ticket?.priority, uuid, showToast, fetchTicket]);

  // Quick status update
  const handleQuickStatusUpdate = useCallback(async (newStatus) => {
    if (newStatus === ticket?.status) {
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
  }, [ticket?.status, uuid, showToast, fetchTicket]);

  // Add comment
  const handleAddComment = useCallback(async (e) => {
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

      // If marked as resolution, also update ticket status to resolved
      if (isResolution && ticket?.status !== 'resolved') {
        try {
          const statusResponse = await fetch(`${API_BASE_URL}/api/tickets/${uuid}/status`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
              status: 'resolved',
              reason: 'Resolution comment added'
            })
          });

          if (!statusResponse.ok) {
            // Comment was added but status update failed - still show partial success
            console.error('Failed to update ticket status to resolved');
            showToast('Resolution added but failed to update ticket status', 'warning');
          } else {
            showToast('Resolution added and ticket resolved', 'success');
          }
        } catch (statusError) {
          console.error('Error updating ticket status:', statusError);
          showToast('Resolution added but failed to update ticket status', 'warning');
        }
      } else {
        showToast('Comment added successfully', 'success');
      }

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
  }, [commentText, isResolution, ticket?.status, uuid, showToast, fetchTicket]);

  // Assign ticket to self
  const handleAssignToMe = useCallback(async () => {
    setUpdating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/tickets/${uuid}/assign-to-me`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        // Provide specific error messages based on HTTP status
        let errorMessage;
        switch (response.status) {
          case 403:
            errorMessage = 'You do not have permission to assign this ticket';
            break;
          case 404:
            errorMessage = 'Ticket not found. It may have been deleted.';
            break;
          case 409:
            errorMessage = 'This ticket has already been assigned to someone else';
            break;
          default:
            errorMessage = 'Failed to assign ticket. Please try again.';
        }
        throw new Error(errorMessage);
      }

      showToast('Ticket assigned to you', 'success');
      await fetchTicket();
    } catch (error) {
      console.error('Error assigning ticket:', error);
      showToast(error.message || 'Failed to assign ticket', 'error');
    } finally {
      setUpdating(false);
    }
  }, [uuid, showToast, fetchTicket]);

  // Handle resolve ticket button click
  // Shows modal if no resolution exists, otherwise resolves directly
  const handleResolveClick = useCallback(() => {
    const hasResolution = ticket?.resolution || ticket?.comments?.some(c => c.is_resolution);
    if (!hasResolution) {
      // Show modal to collect resolution
      setResolutionText('');
      setSkipResolution(false);
      setResolutionCommentPosted(false);
      setShowResolveModal(true);
    } else {
      // Resolution already exists, resolve directly
      handleQuickStatusUpdate('resolved');
    }
  }, [ticket?.resolution, ticket?.comments, handleQuickStatusUpdate]);

  // Submit resolution from modal
  const handleSubmitResolution = useCallback(async () => {
    setSubmittingResolution(true);
    try {
      // If resolution text provided and not skipping, add resolution comment first
      // Track if comment was already posted to prevent duplicates on retry
      if (resolutionText.trim() && !skipResolution && !resolutionCommentPosted) {
        const commentResponse = await fetch(`${API_BASE_URL}/api/tickets/${uuid}/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            comment_text: resolutionText,
            is_resolution: true
          })
        });

        if (!commentResponse.ok) {
          throw new Error('Failed to add resolution comment');
        }
        // Mark comment as posted to prevent duplicates if status update fails
        setResolutionCommentPosted(true);
      }

      // Update status to resolved
      const statusResponse = await fetch(`${API_BASE_URL}/api/tickets/${uuid}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          status: 'resolved'
        })
      });

      if (!statusResponse.ok) {
        throw new Error('Failed to update status');
      }

      showToast('Ticket resolved successfully', 'success');
      setShowResolveModal(false);
      setResolutionText('');
      setSkipResolution(false);
      setResolutionCommentPosted(false);
      await fetchTicket();
    } catch (error) {
      console.error('Error resolving ticket:', error);
      // Provide more specific error message if comment posted but status failed
      if (resolutionCommentPosted && error.message === 'Failed to update status') {
        showToast('Resolution comment saved. Failed to update status - please try again.', 'error');
      } else {
        showToast(error.message || 'Failed to resolve ticket', 'error');
      }
    } finally {
      setSubmittingResolution(false);
    }
  }, [resolutionText, skipResolution, resolutionCommentPosted, uuid, showToast, fetchTicket]);

  // Get status badge config using Badge component variants
  const getStatusBadge = (status) => {
    const configs = {
      open: { variant: 'info', icon: Clock, label: 'Open' },
      assigned: { variant: 'secondary', icon: UserCheck, label: 'Assigned' },
      in_progress: { variant: 'warning', icon: Wrench, label: 'In Progress' },
      waiting_customer: { variant: 'warning', icon: MessageCircle, label: 'Waiting on Customer' },
      resolved: { variant: 'success', icon: CheckCircle, label: 'Resolved' },
      closed: { variant: 'default', icon: X, label: 'Closed' },
      cancelled: { variant: 'danger', icon: XCircle, label: 'Cancelled' }
    };
    return configs[status] || { variant: 'default', icon: Clock, label: status };
  };

  // Get priority badge config
  const getPriorityBadge = (priority) => {
    const configs = {
      urgent: { variant: 'danger', icon: AlertTriangle, label: 'Urgent' },
      high: { variant: 'warning', icon: ArrowUp, label: 'High' },
      normal: { variant: 'info', icon: Minus, label: 'Normal' },
      low: { variant: 'default', icon: ArrowDown, label: 'Low' }
    };
    return configs[priority] || { variant: 'default', icon: Minus, label: priority };
  };

  // Get urgency badge config
  const getUrgencyBadge = (urgency) => {
    if (!urgency) return null;
    const configs = {
      high: { variant: 'danger', label: 'High Urgency', pulse: true },
      medium: { variant: 'warning', label: 'Medium Urgency', pulse: false },
      low: { variant: 'success', label: 'Low Urgency', pulse: false }
    };
    return configs[urgency] || { variant: 'default', label: urgency, pulse: false };
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

  // Common page wrapper styles - responsive to mobile
  const pageStyles = {
    wrapper: {
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: theme.colors.background.page,
    },
    main: {
      marginLeft: isMobile ? 0 : '260px',
      flex: 1,
      padding: isMobile ? theme.spacing.lg : theme.spacing['2xl'],
      maxWidth: '1400px',
    },
  };

  if (loading) {
    return (
      <div style={pageStyles.wrapper}>
        <Sidebar user={user} onLogout={logout} hasRole={hasRole} />
        <div style={pageStyles.main}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xl }}>
            {/* Skeleton header */}
            <div style={{
              height: '180px',
              backgroundColor: theme.colors.background.tertiary,
              borderRadius: theme.radius.xl,
              animation: 'pulse 2s ease-in-out infinite',
            }} />
            {/* Skeleton info card */}
            <div style={{
              height: '120px',
              backgroundColor: theme.colors.background.tertiary,
              borderRadius: theme.radius.xl,
              animation: 'pulse 2s ease-in-out infinite',
              animationDelay: '0.1s',
            }} />
            {/* Skeleton comments */}
            <div style={{
              height: '400px',
              backgroundColor: theme.colors.background.tertiary,
              borderRadius: theme.radius.xl,
              animation: 'pulse 2s ease-in-out infinite',
              animationDelay: '0.2s',
            }} />
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div style={pageStyles.wrapper}>
        <Sidebar user={user} onLogout={logout} hasRole={hasRole} />
        <div style={{
          ...pageStyles.main,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: theme.radius.full,
              backgroundColor: theme.colors.background.tertiary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              marginBottom: theme.spacing.xl,
            }}>
              <AlertCircle size={40} style={{ color: theme.colors.text.tertiary }} />
            </div>
            <h2 style={{
              fontSize: theme.fontSize['2xl'],
              fontWeight: theme.fontWeight.bold,
              color: theme.colors.text.primary,
              marginBottom: theme.spacing.sm,
            }}>
              Ticket Not Found
            </h2>
            <p style={{
              color: theme.colors.text.tertiary,
              fontSize: theme.fontSize.base,
              marginBottom: theme.spacing.xl,
              lineHeight: theme.lineHeight.relaxed,
            }}>
              The ticket you are looking for does not exist or you do not have permission to view it.
            </p>
            <button
              onClick={() => navigate('/tickets')}
              style={getButtonStyles('primary')}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.colors.accent.primaryHover)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.colors.accent.primary)}
            >
              <ArrowLeft size={16} />
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

  // Main content styles - responsive to mobile
  const styles = {
    page: {
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: theme.colors.background.page,
    },
    main: {
      marginLeft: isMobile ? 0 : '260px',
      flex: 1,
      padding: isMobile ? theme.spacing.lg : theme.spacing['2xl'],
      display: 'flex',
      flexDirection: 'column',
      gap: isMobile ? theme.spacing.lg : theme.spacing.xl,
      maxWidth: '1400px',
    },
    newCommentsBanner: {
      padding: isMobile ? theme.spacing.md : theme.spacing.lg,
      backgroundColor: theme.colors.accent.primaryLight,
      border: `1px solid ${theme.colors.accent.primary}20`,
      borderRadius: theme.radius.lg,
      display: 'flex',
      alignItems: isMobile ? 'flex-start' : 'center',
      justifyContent: 'space-between',
      flexDirection: isMobile ? 'column' : 'row',
      gap: theme.spacing.md,
    },
  };

  return (
    <div style={styles.page}>
      <Sidebar user={user} onLogout={logout} hasRole={hasRole} />

      <div style={styles.main}>
        {/* New Comments Banner */}
        {hasNewComments && (
          <div style={styles.newCommentsBanner}>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
              <MessageCircle size={20} style={{ color: theme.colors.accent.primary }} />
              <span style={{
                color: theme.colors.accent.primary,
                fontWeight: theme.fontWeight.medium,
                fontSize: theme.fontSize.sm,
              }}>
                New comments available
              </span>
            </div>
            <button
              onClick={scrollToNewComments}
              style={getButtonStyles('primary')}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.colors.accent.primaryHover)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.colors.accent.primary)}
            >
              View New Comments
            </button>
          </div>
        )}

        {/* Header Section - Redesigned */}
        <Card>
          <div style={{ padding: theme.spacing.xl }}>
            {/* Back Button */}
            <button
              onClick={() => navigate('/tickets')}
              style={{
                ...getButtonStyles('ghost'),
                padding: `${theme.spacing.xs} 0`,
                marginBottom: theme.spacing.lg,
                gap: theme.spacing.xs,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = theme.colors.text.primary)}
              onMouseLeave={(e) => (e.currentTarget.style.color = theme.colors.text.secondary)}
            >
              <ArrowLeft size={16} />
              Back to Tickets
            </button>

            {/* Title & Subject */}
            <div style={{ marginBottom: theme.spacing.xl }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: theme.spacing.md,
                marginBottom: theme.spacing.sm,
              }}>
                <h1 style={{
                  color: theme.colors.text.primary,
                  fontSize: theme.fontSize['2xl'],
                  fontWeight: theme.fontWeight.bold,
                  margin: 0,
                  lineHeight: theme.lineHeight.tight,
                }}>
                  Ticket #{ticket.ticket_number}
                </h1>
                {/* Status badges inline with title */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.sm,
                  flexWrap: 'wrap',
                }}>
                  <Badge variant={statusConfig.variant} size="md" icon={<StatusIcon />}>
                    {statusConfig.label}
                  </Badge>
                  {urgencyConfig && (
                    <Badge
                      variant={urgencyConfig.variant}
                      size="md"
                      style={{
                        animation: urgencyConfig.pulse ? 'pulse 2s infinite' : 'none',
                      }}
                    >
                      {urgencyConfig.label}
                    </Badge>
                  )}
                </div>
              </div>

              <h2 style={{
                color: theme.colors.text.secondary,
                fontSize: theme.fontSize.lg,
                fontWeight: theme.fontWeight.medium,
                margin: 0,
                marginBottom: theme.spacing.md,
                lineHeight: theme.lineHeight.normal,
              }}>
                {ticket.subject}
              </h2>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.lg,
                flexWrap: 'wrap',
              }}>
                {ticket.van_info && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.xs,
                    color: theme.colors.text.tertiary,
                    fontSize: theme.fontSize.sm,
                  }}>
                    <Truck size={14} />
                    <span>{ticket.van_info}</span>
                  </div>
                )}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.xs,
                  color: theme.colors.text.tertiary,
                  fontSize: theme.fontSize.sm,
                }}>
                  <Clock size={14} />
                  <span>Created {formatFullTimestamp(ticket.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Priority Selector and Actions Row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: theme.spacing.md,
              paddingTop: theme.spacing.lg,
              borderTop: `1px solid ${theme.colors.border.light}`,
            }}>
              {/* Priority dropdown */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.sm,
              }}>
                <span style={{
                  color: theme.colors.text.tertiary,
                  fontSize: theme.fontSize.sm,
                  fontWeight: theme.fontWeight.medium,
                }}>
                  Priority:
                </span>
                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                  <select
                    aria-label="Priority"
                    value={ticket.priority}
                    onChange={(e) => handlePriorityChange(e.target.value)}
                    disabled={updatingPriority}
                    style={{
                      padding: `${theme.spacing.xs} ${theme.spacing['2xl']} ${theme.spacing.xs} ${theme.spacing.md}`,
                      backgroundColor: theme.colors.background.secondary,
                      color: theme.colors.text.primary,
                      border: `1px solid ${theme.colors.border.medium}`,
                      borderRadius: theme.radius.md,
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.medium,
                      cursor: updatingPriority ? 'not-allowed' : 'pointer',
                      opacity: updatingPriority ? 0.5 : 1,
                      outline: 'none',
                      appearance: 'none',
                      transition: `all ${theme.transitions.fast}`,
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = theme.colors.border.focus)}
                    onBlur={(e) => (e.currentTarget.style.borderColor = theme.colors.border.medium)}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  <div style={{
                    position: 'absolute',
                    right: theme.spacing.sm,
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                  }}>
                    <PriorityIcon size={14} style={{
                      color: priorityConfig.variant === 'danger' ? theme.colors.accent.danger :
                             priorityConfig.variant === 'warning' ? theme.colors.accent.warning :
                             priorityConfig.variant === 'info' ? theme.colors.accent.info :
                             theme.colors.text.tertiary
                    }} />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: theme.spacing.sm,
                flexWrap: 'wrap',
              }}>
                {(!ticket.assigned_to_name || ticket.assigned_to_name !== user?.email) && (
                  <button
                    onClick={handleAssignToMe}
                    disabled={updating}
                    style={getButtonStyles('primary', updating)}
                    onMouseEnter={(e) => !updating && (e.currentTarget.style.backgroundColor = theme.colors.accent.primaryHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.colors.accent.primary)}
                  >
                    <UserCheck size={16} />
                    {updating ? 'Assigning...' : (ticket.assigned_to_name ? 'Reassign to Me' : 'Assign to Me')}
                  </button>
                )}

                {ticket.status !== 'in_progress' && ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                  <button
                    onClick={() => handleQuickStatusUpdate('in_progress')}
                    disabled={updating}
                    style={getButtonStyles('warning', updating)}
                    onMouseEnter={(e) => !updating && (e.currentTarget.style.opacity = '0.9')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = updating ? '0.5' : '1')}
                  >
                    <Wrench size={16} />
                    Start Work
                  </button>
                )}

                {ticket.status === 'in_progress' && (
                  <button
                    onClick={() => handleQuickStatusUpdate('waiting_customer')}
                    disabled={updating}
                    style={{
                      ...getButtonStyles('secondary', updating),
                      backgroundColor: theme.colors.accent.warningLight,
                      color: theme.colors.accent.warning,
                      border: `1px solid ${theme.colors.accent.warning}40`,
                    }}
                    onMouseEnter={(e) => !updating && (e.currentTarget.style.backgroundColor = theme.colors.accent.warning) && (e.currentTarget.style.color = theme.colors.text.inverse)}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = theme.colors.accent.warningLight;
                      e.currentTarget.style.color = theme.colors.accent.warning;
                    }}
                  >
                    <MessageCircle size={16} />
                    Waiting on Customer
                  </button>
                )}

                {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                  <button
                    ref={resolveModalTriggerRef}
                    onClick={handleResolveClick}
                    disabled={updating}
                    style={getButtonStyles('success', updating)}
                    onMouseEnter={(e) => !updating && (e.currentTarget.style.backgroundColor = theme.colors.accent.successHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.colors.accent.success)}
                  >
                    <CheckCircle size={16} aria-hidden="true" />
                    Resolve Ticket
                  </button>
                )}

                {ticket.status === 'resolved' && (
                  <button
                    onClick={() => handleQuickStatusUpdate('closed')}
                    disabled={updating}
                    style={{
                      ...getButtonStyles('secondary', updating),
                    }}
                    onMouseEnter={(e) => !updating && (e.currentTarget.style.backgroundColor = theme.colors.background.hover)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.colors.background.tertiary)}
                  >
                    <X size={16} />
                    Close Ticket
                  </button>
                )}

                {/* Similar Tickets Button */}
                <button
                  ref={similarModalTriggerRef}
                  onClick={fetchSimilarTickets}
                  disabled={loadingSimilar}
                  style={getButtonStyles('purple', loadingSimilar)}
                  onMouseEnter={(e) => !loadingSimilar && (e.currentTarget.style.opacity = '0.9')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = loadingSimilar ? '0.5' : '1')}
                >
                  <Lightbulb size={16} aria-hidden="true" />
                  <span aria-live="polite">
                    {loadingSimilar ? 'Searching...' : 'Suggest Solutions'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Ticket Information - Full Width 3-Column Card */}
        <Card>
          <div style={{ padding: theme.spacing.xl }}>
            <SectionHeader icon={User} title="Ticket Details" />

            {/* 3-Column Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: theme.spacing.xl,
            }}>

              {/* Column 1: Customer */}
              <div style={{
                padding: theme.spacing.lg,
                backgroundColor: theme.colors.background.tertiary,
                borderRadius: theme.radius.lg,
              }}>
                <h4 style={{
                  color: theme.colors.text.tertiary,
                  fontSize: theme.fontSize.xs,
                  fontWeight: theme.fontWeight.semibold,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: theme.spacing.md,
                }}>
                  Customer
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
                  <InfoRow icon={User} value={ticket.customer_name || 'N/A'} />
                  {ticket.customer_phone && (
                    <InfoRow icon={Phone} value={ticket.customer_phone} href={`tel:${ticket.customer_phone}`} />
                  )}
                  {ticket.customer_email && (
                    <InfoRow icon={Mail} value={ticket.customer_email} href={`mailto:${ticket.customer_email}`} isEmail />
                  )}
                </div>
              </div>

              {/* Column 2: Van */}
              <div style={{
                padding: theme.spacing.lg,
                backgroundColor: theme.colors.background.tertiary,
                borderRadius: theme.radius.lg,
              }}>
                <h4 style={{
                  color: theme.colors.text.tertiary,
                  fontSize: theme.fontSize.xs,
                  fontWeight: theme.fontWeight.semibold,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: theme.spacing.md,
                }}>
                  Vehicle
                </h4>
                {ticket.van_info ? (
                  <InfoRow icon={Truck} value={ticket.van_info} />
                ) : (
                  <span style={{
                    color: theme.colors.text.tertiary,
                    fontSize: theme.fontSize.sm,
                    fontStyle: 'italic',
                  }}>
                    No vehicle assigned
                  </span>
                )}
              </div>

              {/* Column 3: Assignment */}
              <div style={{
                padding: theme.spacing.lg,
                backgroundColor: theme.colors.background.tertiary,
                borderRadius: theme.radius.lg,
              }}>
                <h4 style={{
                  color: theme.colors.text.tertiary,
                  fontSize: theme.fontSize.xs,
                  fontWeight: theme.fontWeight.semibold,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: theme.spacing.md,
                }}>
                  Assigned To
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: theme.radius.full,
                    backgroundColor: ticket.assigned_to_name ? theme.colors.accent.primaryLight : theme.colors.background.hover,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <UserCheck size={16} style={{
                      color: ticket.assigned_to_name ? theme.colors.accent.primary : theme.colors.text.tertiary,
                    }} />
                  </div>
                  <div>
                    <div style={{
                      color: theme.colors.text.primary,
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.medium,
                    }}>
                      {ticket.assigned_to_name || 'Unassigned'}
                    </div>
                    {ticket.assigned_at && (
                      <div style={{
                        color: theme.colors.text.tertiary,
                        fontSize: theme.fontSize.xs,
                      }}>
                        {getRelativeTime(ticket.assigned_at)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Description Card (conditional) */}
        {ticket.description && ticket.description !== ticket.subject && (
          <Card>
            <div style={{ padding: theme.spacing.xl }}>
              <SectionHeader icon={FileText} title="Description" />
              <div style={{
                color: theme.colors.text.primary,
                fontSize: theme.fontSize.sm,
                whiteSpace: 'pre-wrap',
                lineHeight: theme.lineHeight.relaxed,
                backgroundColor: theme.colors.background.tertiary,
                padding: theme.spacing.lg,
                borderRadius: theme.radius.lg,
                borderLeft: `3px solid ${theme.colors.accent.primary}`,
              }}>
                {ticket.description}
              </div>
            </div>
          </Card>
        )}

        {/* Related Info Card (conditional) */}
        {(ticket.category_name || ticket.session_id || ticket.related_ticket_id) && (
          <Card>
            <div style={{ padding: theme.spacing.xl }}>
              <SectionHeader icon={Link2} title="Related" />
              <div style={{
                display: 'flex',
                gap: theme.spacing.lg,
                flexWrap: 'wrap',
              }}>
                {ticket.category_name && (
                  <Badge variant="primary" size="md" soft>
                    {ticket.category_name}
                  </Badge>
                )}
                {ticket.session_id && (
                  <a
                    href={`/sessions/${ticket.session_id}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: theme.spacing.xs,
                      color: theme.colors.accent.primary,
                      fontSize: theme.fontSize.sm,
                      textDecoration: 'none',
                      padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                      backgroundColor: theme.colors.accent.primaryLight,
                      borderRadius: theme.radius.md,
                      transition: `all ${theme.transitions.fast}`,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.colors.accent.primaryMuted)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.colors.accent.primaryLight)}
                  >
                    <ExternalLink size={14} />
                    View Session
                  </a>
                )}
                {ticket.related_ticket_id && (
                  <a
                    href={`/tickets/${ticket.related_ticket_id}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: theme.spacing.xs,
                      color: theme.colors.accent.primary,
                      fontSize: theme.fontSize.sm,
                      textDecoration: 'none',
                      padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                      backgroundColor: theme.colors.accent.primaryLight,
                      borderRadius: theme.radius.md,
                      transition: `all ${theme.transitions.fast}`,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.colors.accent.primaryMuted)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.colors.accent.primaryLight)}
                  >
                    <ExternalLink size={14} />
                    Related Ticket #{ticket.related_ticket_number}
                  </a>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Resolution Card (conditional) */}
        {(ticket.status === 'resolved' || ticket.status === 'closed') && ticket.resolution && (
          <Card style={{
            backgroundColor: theme.colors.accent.successLight,
            border: `1px solid ${theme.colors.accent.success}30`,
          }}>
            <div style={{ padding: theme.spacing.xl }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.sm,
                marginBottom: theme.spacing.lg,
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: theme.radius.full,
                  backgroundColor: theme.colors.accent.success,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <CheckCircle size={20} style={{ color: theme.colors.text.inverse }} />
                </div>
                <div>
                  <h3 style={{
                    color: theme.colors.accent.success,
                    fontSize: theme.fontSize.base,
                    fontWeight: theme.fontWeight.semibold,
                    margin: 0,
                  }}>
                    Resolution
                  </h3>
                  {ticket.resolved_by && (
                    <p style={{
                      color: theme.colors.accent.success,
                      fontSize: theme.fontSize.xs,
                      margin: 0,
                      opacity: 0.8,
                    }}>
                      by {ticket.resolved_by} {ticket.resolved_at && ` - ${getRelativeTime(ticket.resolved_at)}`}
                    </p>
                  )}
                </div>
              </div>
              <div style={{
                color: theme.colors.text.primary,
                fontSize: theme.fontSize.sm,
                whiteSpace: 'pre-wrap',
                lineHeight: theme.lineHeight.relaxed,
                padding: theme.spacing.lg,
                backgroundColor: theme.colors.background.secondary,
                borderRadius: theme.radius.lg,
                borderLeft: `3px solid ${theme.colors.accent.success}`,
              }}>
                {ticket.resolution}
              </div>
            </div>
          </Card>
        )}

        {/* Activity & Comments - Full Width */}
        <Card style={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
        }}>
          <div style={{ padding: theme.spacing.xl }}>
            <SectionHeader
              icon={MessageCircle}
              title="Activity & Comments"
              badge={ticket.comments?.length || 0}
            />

            {/* Comments List */}
            <div style={{
              maxHeight: '600px',
              overflowY: 'auto',
              marginBottom: theme.spacing.xl,
              paddingRight: theme.spacing.sm,
            }}>
              {ticket.comments && ticket.comments.length > 0 ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: theme.spacing.md,
                }}>
                  {ticket.comments.map((comment) => {
                    const isCustomer = comment.author_type === 'customer';
                    const isTech = comment.author_type === 'tech';
                    const isSystem = comment.author_type === 'system';

                    return (
                      <div
                        key={comment.id}
                        style={{
                          padding: theme.spacing.lg,
                          borderRadius: theme.radius.lg,
                          backgroundColor: isCustomer
                            ? theme.colors.accent.primaryLight
                            : isTech
                            ? theme.colors.background.secondary
                            : theme.colors.accent.warningLight,
                          border: `1px solid ${
                            isCustomer
                              ? `${theme.colors.accent.primary}20`
                              : isTech
                              ? theme.colors.border.light
                              : `${theme.colors.accent.warning}30`
                          }`,
                          transition: `all ${theme.transitions.fast}`,
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: theme.spacing.md,
                        }}>
                          {/* Avatar */}
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: theme.radius.full,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: theme.colors.text.inverse,
                            fontWeight: theme.fontWeight.bold,
                            fontSize: theme.fontSize.sm,
                            backgroundColor: isCustomer
                              ? theme.colors.accent.info
                              : isTech
                              ? theme.colors.accent.primary
                              : theme.colors.accent.warning,
                            flexShrink: 0,
                          }}>
                            {getAvatarInitial(comment.author_type)}
                          </div>

                          {/* Comment Content */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: theme.spacing.sm,
                              marginBottom: theme.spacing.sm,
                              flexWrap: 'wrap',
                            }}>
                              <span style={{
                                color: theme.colors.text.primary,
                                fontSize: theme.fontSize.sm,
                                fontWeight: theme.fontWeight.semibold,
                              }}>
                                {comment.author_name}
                              </span>
                              <Badge
                                variant={
                                  isCustomer ? 'info' : isTech ? 'primary' : 'warning'
                                }
                                size="sm"
                                soft
                              >
                                {isCustomer ? 'Customer' : isTech ? 'Tech' : 'System'}
                              </Badge>
                              {comment.is_resolution && (
                                <Badge variant="success" size="sm" icon={<CheckCircle />}>
                                  Resolution
                                </Badge>
                              )}
                              <span style={{
                                color: theme.colors.text.tertiary,
                                fontSize: theme.fontSize.xs,
                              }}>
                                {getRelativeTime(comment.created_at)}
                              </span>
                            </div>
                            <p style={{
                              color: theme.colors.text.primary,
                              fontSize: theme.fontSize.sm,
                              whiteSpace: 'pre-wrap',
                              lineHeight: theme.lineHeight.relaxed,
                              margin: 0,
                              wordBreak: 'break-word',
                            }}>
                              {comment.comment_text}
                            </p>

                            {/* Attachments for this comment */}
                            {(() => {
                              const commentAttachments = attachmentsByCommentId.get(comment.id) || [];
                              if (commentAttachments.length === 0) return null;

                              return (
                                <div style={{
                                  marginTop: theme.spacing.md,
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: theme.spacing.sm,
                                }}>
                                  {commentAttachments.map((attachment) => {
                                    const isVideo = attachment.mime_type?.startsWith('video/');
                                    const isImage = attachment.mime_type?.startsWith('image/');

                                    return (
                                      <div key={attachment.id} style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: theme.spacing.xs,
                                      }}>
                                        {isVideo ? (
                                          <div
                                            role="button"
                                            tabIndex={0}
                                            aria-label={`Play video: ${attachment.original_filename || 'Video attachment'}`}
                                            onClick={(e) => {
                                              lightboxTriggerRef.current = e.currentTarget;
                                              setLightboxMedia({ type: 'video', url: attachment.public_url });
                                            }}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                lightboxTriggerRef.current = e.currentTarget;
                                                setLightboxMedia({ type: 'video', url: attachment.public_url });
                                              }
                                            }}
                                            style={{
                                              position: 'relative',
                                              cursor: 'pointer',
                                              borderRadius: theme.radius.md,
                                              overflow: 'hidden',
                                              border: `1px solid ${theme.colors.border.medium}`,
                                              transition: `all ${theme.transitions.fast}`,
                                            }}
                                            onMouseOver={(e) => {
                                              e.currentTarget.style.transform = 'scale(1.02)';
                                              e.currentTarget.style.boxShadow = theme.shadows.md;
                                            }}
                                            onMouseOut={(e) => {
                                              e.currentTarget.style.transform = 'scale(1)';
                                              e.currentTarget.style.boxShadow = 'none';
                                            }}
                                          >
                                            <video
                                              src={attachment.public_url}
                                              aria-hidden="true"
                                              style={{
                                                maxWidth: '280px',
                                                maxHeight: '180px',
                                                display: 'block',
                                              }}
                                            />
                                            <div
                                              style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                bottom: 0,
                                                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: `background-color ${theme.transitions.fast}`,
                                              }}
                                            >
                                              <div
                                                style={{
                                                  width: '48px',
                                                  height: '48px',
                                                  borderRadius: theme.radius.full,
                                                  backgroundColor: theme.colors.background.secondary,
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  boxShadow: theme.shadows.md,
                                                }}
                                              >
                                                <Play size={20} fill={theme.colors.accent.primary} color={theme.colors.accent.primary} />
                                              </div>
                                            </div>
                                          </div>
                                        ) : isImage ? (
                                          <img
                                            src={attachment.public_url}
                                            alt={attachment.original_filename || 'Attachment'}
                                            role="button"
                                            tabIndex={0}
                                            onClick={(e) => {
                                              lightboxTriggerRef.current = e.currentTarget;
                                              setLightboxMedia({ type: 'image', url: attachment.public_url });
                                            }}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                lightboxTriggerRef.current = e.currentTarget;
                                                setLightboxMedia({ type: 'image', url: attachment.public_url });
                                              }
                                            }}
                                            style={{
                                              maxWidth: '180px',
                                              maxHeight: '140px',
                                              objectFit: 'cover',
                                              borderRadius: theme.radius.md,
                                              border: `1px solid ${theme.colors.border.medium}`,
                                              cursor: 'pointer',
                                              transition: `all ${theme.transitions.fast}`,
                                            }}
                                            onMouseOver={(e) => {
                                              e.target.style.transform = 'scale(1.02)';
                                              e.target.style.boxShadow = theme.shadows.md;
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
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: theme.spacing.xs,
                                              color: theme.colors.accent.primary,
                                              fontSize: theme.fontSize.sm,
                                              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                              backgroundColor: theme.colors.accent.primaryLight,
                                              borderRadius: theme.radius.md,
                                              textDecoration: 'none',
                                            }}
                                          >
                                            <ExternalLink size={14} />
                                            {attachment.original_filename || 'Download attachment'}
                                          </a>
                                        )}
                                        <span style={{
                                          fontSize: theme.fontSize.xs,
                                          color: theme.colors.text.tertiary,
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: theme.spacing.xs,
                                        }}>
                                          <Camera size={12} />
                                          {attachment.uploaded_by_type === 'customer' ? 'From customer' : 'From technician'}
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
                    );
                  })}
                  <div ref={commentsEndRef} />
                </div>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: theme.spacing['3xl'],
                  color: theme.colors.text.tertiary,
                }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: theme.radius.full,
                    backgroundColor: theme.colors.background.tertiary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto',
                    marginBottom: theme.spacing.lg,
                  }}>
                    <MessageCircle size={28} style={{ opacity: 0.4 }} />
                  </div>
                  <p style={{
                    fontSize: theme.fontSize.base,
                    fontWeight: theme.fontWeight.medium,
                    color: theme.colors.text.secondary,
                    margin: 0,
                    marginBottom: theme.spacing.xs,
                  }}>
                    No activity yet
                  </p>
                  <p style={{
                    fontSize: theme.fontSize.sm,
                    margin: 0,
                  }}>
                    Be the first to add a comment
                  </p>
                </div>
              )}
            </div>

            {/* Add Comment Form */}
            <div
              ref={commentFormRef}
              style={{
                paddingTop: theme.spacing.xl,
                borderTop: `1px solid ${theme.colors.border.light}`,
              }}
            >
              <label
                htmlFor="comment-textarea"
                style={{
                  display: 'block',
                  fontWeight: theme.fontWeight.semibold,
                  color: theme.colors.text.primary,
                  fontSize: theme.fontSize.sm,
                  marginBottom: theme.spacing.md,
                }}
              >
                Add Comment
              </label>
              <form onSubmit={handleAddComment} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: theme.spacing.lg,
              }}>
                <div>
                  <textarea
                    id="comment-textarea"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onFocus={() => setIsEditing(true)}
                    placeholder="Write a comment..."
                    rows={4}
                    maxLength={2000}
                    required
                    style={{
                      width: '100%',
                      padding: theme.spacing.lg,
                      backgroundColor: theme.colors.background.secondary,
                      color: theme.colors.text.primary,
                      border: `1px solid ${theme.colors.border.medium}`,
                      borderRadius: theme.radius.lg,
                      fontSize: theme.fontSize.sm,
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      lineHeight: theme.lineHeight.relaxed,
                      transition: `border-color ${theme.transitions.fast}`,
                      boxSizing: 'border-box',
                    }}
                    onFocusCapture={(e) => (e.currentTarget.style.borderColor = theme.colors.border.focus)}
                    onBlur={(e) => (e.currentTarget.style.borderColor = theme.colors.border.medium)}
                  />
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: theme.spacing.sm,
                  }}>
                    <p style={{
                      fontSize: theme.fontSize.xs,
                      color: commentText.length < 10 ? theme.colors.text.tertiary : theme.colors.accent.success,
                      margin: 0,
                    }}>
                      {commentText.length < 10
                        ? `${10 - commentText.length} more characters needed`
                        : 'Ready to submit'}
                    </p>
                    <p style={{
                      fontSize: theme.fontSize.xs,
                      color: theme.colors.text.tertiary,
                      margin: 0,
                    }}>
                      {commentText.length}/2000
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setIsResolution(!isResolution)}
                  role="checkbox"
                  aria-checked={isResolution}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      setIsResolution(!isResolution);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.md,
                    padding: theme.spacing.lg,
                    backgroundColor: isResolution ? theme.colors.accent.successLight : theme.colors.background.secondary,
                    border: `2px solid ${isResolution ? theme.colors.accent.success : theme.colors.border.light}`,
                    borderRadius: theme.radius.lg,
                    cursor: 'pointer',
                    transition: `all ${theme.transitions.fast}`,
                    animation: highlightResolution ? 'resolutionShine 1.2s ease-in-out 2' : 'none',
                    backgroundImage: highlightResolution
                      ? `linear-gradient(90deg, transparent 0%, rgba(5, 150, 105, 0.15) 25%, rgba(5, 150, 105, 0.3) 50%, rgba(5, 150, 105, 0.15) 75%, transparent 100%)`
                      : 'none',
                    backgroundSize: highlightResolution ? '200% 100%' : 'auto',
                    transform: highlightResolution ? 'scale(1.01)' : 'scale(1)',
                  }}
                >
                  <div style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: theme.radius.sm,
                    border: `2px solid ${isResolution ? theme.colors.accent.success : theme.colors.border.medium}`,
                    backgroundColor: isResolution ? theme.colors.accent.success : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: `all ${theme.transitions.fast}`,
                  }}>
                    {isResolution && (
                      <CheckCircle size={14} style={{ color: theme.colors.text.inverse }} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.semibold,
                      color: isResolution ? theme.colors.accent.success : theme.colors.text.primary,
                      marginBottom: theme.spacing.xs,
                    }}>
                      Mark as Resolution
                    </div>
                    <div style={{
                      fontSize: theme.fontSize.xs,
                      color: isResolution ? theme.colors.accent.success : theme.colors.text.tertiary,
                      lineHeight: theme.lineHeight.normal,
                    }}>
                      This comment will be saved as the official resolution for this ticket
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={addingComment || commentText.trim().length < 10}
                  style={{
                    ...getButtonStyles('primary', addingComment || commentText.trim().length < 10),
                    alignSelf: 'flex-start',
                    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                  }}
                  onMouseEnter={(e) => !(addingComment || commentText.trim().length < 10) && (e.currentTarget.style.backgroundColor = theme.colors.accent.primaryHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.colors.accent.primary)}
                >
                  <Send size={16} />
                  {addingComment ? 'Adding...' : 'Add Comment'}
                </button>
              </form>
            </div>
          </div>
        </Card>

        {/* Status History - Collapsible at Bottom */}
        {ticket.status_history && ticket.status_history.length > 0 && (
          <Card>
            <div style={{ padding: theme.spacing.xl }}>
              <button
                onClick={() => setStatusHistoryOpen(!statusHistoryOpen)}
                aria-expanded={statusHistoryOpen}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
                  <Clock size={18} style={{ color: theme.colors.text.tertiary }} />
                  <h3 style={{
                    color: theme.colors.text.primary,
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.semibold,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    margin: 0,
                  }}>
                    Status History
                  </h3>
                  <Badge variant="default" size="sm">
                    {ticket.status_history.length}
                  </Badge>
                </div>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: theme.radius.md,
                  backgroundColor: theme.colors.background.tertiary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: `transform ${theme.transitions.fast}`,
                  transform: statusHistoryOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}>
                  <ChevronDown size={16} style={{ color: theme.colors.text.tertiary }} />
                </div>
              </button>

              {statusHistoryOpen && (
                <div style={{
                  marginTop: theme.spacing.xl,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: theme.spacing.sm,
                }}>
                  {ticket.status_history.map((history, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: theme.spacing.md,
                        padding: theme.spacing.lg,
                        backgroundColor: theme.colors.background.tertiary,
                        borderRadius: theme.radius.lg,
                        borderLeft: `3px solid ${theme.colors.border.medium}`,
                      }}
                    >
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: theme.radius.full,
                        backgroundColor: theme.colors.background.secondary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Clock size={14} style={{ color: theme.colors.text.tertiary }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: theme.spacing.sm,
                          flexWrap: 'wrap',
                          marginBottom: theme.spacing.sm,
                        }}>
                          <Badge variant="default" size="sm">
                            {history.from_status}
                          </Badge>
                          <span style={{
                            color: theme.colors.text.tertiary,
                            fontSize: theme.fontSize.lg,
                          }}>
                            &rarr;
                          </span>
                          <Badge variant="primary" size="sm" soft>
                            {history.to_status}
                          </Badge>
                        </div>
                        <p style={{
                          color: theme.colors.text.tertiary,
                          fontSize: theme.fontSize.xs,
                          margin: 0,
                        }}>
                          by {history.changed_by_name} - {getRelativeTime(history.changed_at)}
                        </p>
                        {history.reason && (
                          <p style={{
                            color: theme.colors.text.secondary,
                            fontSize: theme.fontSize.sm,
                            fontStyle: 'italic',
                            margin: 0,
                            marginTop: theme.spacing.sm,
                            padding: theme.spacing.sm,
                            backgroundColor: theme.colors.background.secondary,
                            borderRadius: theme.radius.md,
                          }}>
                            &ldquo;{history.reason}&rdquo;
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

      {/* Lightbox Modal for full-size media viewing (images and videos) */}
      {lightboxMedia.type && (
        <div
          id="lightbox-modal"
          onClick={() => {
            setLightboxMedia({ type: null, url: null });
            lightboxTriggerRef.current?.focus();
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Media viewer"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: theme.zIndex.modal + 10,
            cursor: 'pointer',
          }}
        >
          <button
            ref={lightboxCloseRef}
            onClick={() => {
              setLightboxMedia({ type: null, url: null });
              lightboxTriggerRef.current?.focus();
            }}
            aria-label="Close media viewer"
            style={{
              position: 'absolute',
              top: theme.spacing.xl,
              right: theme.spacing.xl,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: `1px solid rgba(255, 255, 255, 0.2)`,
              borderRadius: theme.radius.full,
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: theme.colors.text.inverse,
              transition: `all ${theme.transitions.fast}`,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')}
          >
            <X size={20} />
          </button>
          {lightboxMedia.type === 'image' ? (
            <img
              src={lightboxMedia.url}
              alt="Full size"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '90vw',
                maxHeight: '90vh',
                objectFit: 'contain',
                borderRadius: theme.radius.lg,
                boxShadow: theme.shadows['2xl'],
              }}
            />
          ) : (
            <video
              src={lightboxMedia.url}
              controls
              autoPlay
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '90vw',
                maxHeight: '90vh',
                borderRadius: theme.radius.lg,
                boxShadow: theme.shadows['2xl'],
              }}
            />
          )}
        </div>
      )}

      {/* Similar Tickets Modal */}
      {showSimilarModal && (
        <div
          onClick={() => {
            setShowSimilarModal(false);
            similarModalTriggerRef.current?.focus();
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: theme.zIndex.modal,
            padding: isMobile ? 0 : theme.spacing.xl,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            id="similar-tickets-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="similar-tickets-title"
            style={{
              backgroundColor: theme.colors.background.secondary,
              borderRadius: isMobile ? 0 : theme.radius.xl,
              maxWidth: isMobile ? '100%' : '900px',
              width: '100%',
              maxHeight: isMobile ? '100vh' : '85vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: theme.shadows['2xl'],
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: theme.spacing.xl,
              borderBottom: `1px solid ${theme.colors.border.light}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: theme.colors.background.secondary,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: theme.radius.lg,
                  backgroundColor: `${theme.colors.chart.purple}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Lightbulb size={22} style={{ color: theme.colors.chart.purple }} aria-hidden="true" />
                </div>
                <div>
                  <h2
                    id="similar-tickets-title"
                    style={{
                      fontSize: theme.fontSize.lg,
                      fontWeight: theme.fontWeight.bold,
                      color: theme.colors.text.primary,
                      margin: 0,
                    }}
                  >
                    Suggested Solutions
                  </h2>
                  <p style={{
                    fontSize: theme.fontSize.sm,
                    color: theme.colors.text.tertiary,
                    margin: 0,
                  }}>
                    Similar resolved tickets that may help
                  </p>
                </div>
              </div>
              <button
                ref={similarModalCloseRef}
                onClick={() => {
                  setShowSimilarModal(false);
                  similarModalTriggerRef.current?.focus();
                }}
                aria-label="Close similar tickets modal"
                style={{
                  backgroundColor: theme.colors.background.tertiary,
                  border: 'none',
                  cursor: 'pointer',
                  color: theme.colors.text.secondary,
                  padding: theme.spacing.sm,
                  borderRadius: theme.radius.md,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: `all ${theme.transitions.fast}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.background.hover;
                  e.currentTarget.style.color = theme.colors.text.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.background.tertiary;
                  e.currentTarget.style.color = theme.colors.text.secondary;
                }}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{
              padding: theme.spacing.xl,
              overflowY: 'auto',
              flex: 1,
              backgroundColor: theme.colors.background.tertiary,
            }}>
              {similarTickets.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: theme.spacing['3xl'],
                  color: theme.colors.text.tertiary,
                }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: theme.radius.full,
                    backgroundColor: theme.colors.background.secondary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto',
                    marginBottom: theme.spacing.xl,
                  }}>
                    <Lightbulb size={36} style={{ opacity: 0.3 }} aria-hidden="true" />
                  </div>
                  <p style={{
                    fontSize: theme.fontSize.lg,
                    fontWeight: theme.fontWeight.medium,
                    color: theme.colors.text.secondary,
                    marginBottom: theme.spacing.sm,
                  }}>
                    No similar tickets found
                  </p>
                  <p style={{ fontSize: theme.fontSize.sm, margin: 0 }}>
                    There are no resolved tickets similar to this one.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.lg }}>
                  {similarTickets.map((similarTicket) => (
                    <div
                      key={similarTicket.id}
                      style={{
                        padding: theme.spacing.xl,
                        backgroundColor: theme.colors.background.secondary,
                        borderRadius: theme.radius.xl,
                        border: `1px solid ${theme.colors.border.light}`,
                        boxShadow: theme.shadows.sm,
                      }}
                    >
                      {/* Ticket Header */}
                      <div style={{ marginBottom: theme.spacing.lg }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: theme.spacing.md,
                          marginBottom: theme.spacing.sm,
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: theme.spacing.sm,
                              marginBottom: theme.spacing.xs,
                            }}>
                              <span
                                style={{
                                  fontSize: theme.fontSize.base,
                                  fontWeight: theme.fontWeight.bold,
                                  color: theme.colors.accent.primary,
                                }}
                              >
                                #{similarTicket.ticket_number}
                              </span>
                              <Badge variant="success" size="sm" icon={<CheckCircle />}>
                                Resolved
                              </Badge>
                              {similarTicket.category_name && (
                                <Badge variant="primary" size="sm" soft>
                                  {similarTicket.category_name}
                                </Badge>
                              )}
                            </div>
                            <h3 style={{
                              fontSize: theme.fontSize.base,
                              fontWeight: theme.fontWeight.semibold,
                              color: theme.colors.text.primary,
                              margin: 0,
                              lineHeight: theme.lineHeight.normal,
                            }}>
                              {similarTicket.subject}
                            </h3>
                          </div>
                          <button
                            onClick={() => {
                              setShowSimilarModal(false);
                              navigate(`/tickets/${similarTicket.id}`);
                            }}
                            aria-label={`View full details for ticket #${similarTicket.ticket_number}`}
                            style={{
                              ...getButtonStyles('secondary'),
                              padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                              fontSize: theme.fontSize.xs,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = theme.colors.accent.primary;
                              e.currentTarget.style.color = theme.colors.text.inverse;
                              e.currentTarget.style.borderColor = theme.colors.accent.primary;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = theme.colors.background.tertiary;
                              e.currentTarget.style.color = theme.colors.text.secondary;
                              e.currentTarget.style.borderColor = theme.colors.border.medium;
                            }}
                          >
                            <ExternalLink size={12} aria-hidden="true" />
                            View
                          </button>
                        </div>
                      </div>

                      {/* Description */}
                      {similarTicket.description && (
                        <div style={{
                          marginBottom: theme.spacing.lg,
                          padding: theme.spacing.lg,
                          backgroundColor: theme.colors.background.tertiary,
                          borderRadius: theme.radius.lg,
                          borderLeft: `3px solid ${theme.colors.border.medium}`,
                        }}>
                          <h4 style={{
                            fontSize: theme.fontSize.xs,
                            fontWeight: theme.fontWeight.semibold,
                            color: theme.colors.text.tertiary,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: theme.spacing.sm,
                          }}>
                            Original Issue
                          </h4>
                          <p style={{
                            fontSize: theme.fontSize.sm,
                            color: theme.colors.text.primary,
                            whiteSpace: 'pre-wrap',
                            lineHeight: theme.lineHeight.relaxed,
                            margin: 0,
                          }}>
                            {similarTicket.description.length > 400
                              ? similarTicket.description.substring(0, 400) + '...'
                              : similarTicket.description}
                          </p>
                        </div>
                      )}

                      {/* Resolution */}
                      {similarTicket.resolution ? (
                        <div style={{
                          padding: theme.spacing.lg,
                          backgroundColor: theme.colors.accent.successLight,
                          borderRadius: theme.radius.lg,
                          borderLeft: `3px solid ${theme.colors.accent.success}`,
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: theme.spacing.xs,
                            marginBottom: theme.spacing.sm,
                          }}>
                            <CheckCircle size={16} style={{ color: theme.colors.accent.success }} aria-hidden="true" />
                            <h4 style={{
                              fontSize: theme.fontSize.xs,
                              fontWeight: theme.fontWeight.semibold,
                              color: theme.colors.accent.success,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              margin: 0,
                            }}>
                              Resolution
                            </h4>
                          </div>
                          <p style={{
                            fontSize: theme.fontSize.sm,
                            color: theme.colors.text.primary,
                            whiteSpace: 'pre-wrap',
                            lineHeight: theme.lineHeight.relaxed,
                            margin: 0,
                            marginBottom: theme.spacing.lg,
                          }}>
                            {similarTicket.resolution}
                          </p>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingTop: theme.spacing.md,
                            borderTop: `1px solid ${theme.colors.accent.success}30`,
                          }}>
                            {similarTicket.resolved_at && (
                              <p style={{
                                fontSize: theme.fontSize.xs,
                                color: theme.colors.accent.success,
                                margin: 0,
                              }}>
                                Resolved {getRelativeTime(similarTicket.resolved_at)}
                              </p>
                            )}
                            <button
                              onClick={() => {
                                handleUseSolution(similarTicket.resolution);
                              }}
                              aria-label={`Use resolution from ticket #${similarTicket.ticket_number}`}
                              style={getButtonStyles('success')}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = theme.colors.accent.successHover;
                                e.currentTarget.style.transform = 'translateY(-1px)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = theme.colors.accent.success;
                                e.currentTarget.style.transform = 'translateY(0)';
                              }}
                            >
                              <CheckCircle size={14} aria-hidden="true" />
                              Use This Solution
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{
                          padding: theme.spacing.lg,
                          backgroundColor: theme.colors.background.tertiary,
                          borderRadius: theme.radius.lg,
                          borderLeft: `3px solid ${theme.colors.border.medium}`,
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: theme.spacing.xs,
                            marginBottom: theme.spacing.sm,
                          }}>
                            <AlertCircle size={16} style={{ color: theme.colors.text.tertiary }} aria-hidden="true" />
                            <h4 style={{
                              fontSize: theme.fontSize.xs,
                              fontWeight: theme.fontWeight.semibold,
                              color: theme.colors.text.tertiary,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              margin: 0,
                            }}>
                              Resolution
                            </h4>
                          </div>
                          <p style={{
                            fontSize: theme.fontSize.sm,
                            color: theme.colors.text.tertiary,
                            fontStyle: 'italic',
                            margin: 0,
                          }}>
                            No resolution recorded for this ticket.
                          </p>
                          {similarTicket.resolved_at && (
                            <p style={{
                              fontSize: theme.fontSize.xs,
                              color: theme.colors.text.tertiary,
                              margin: 0,
                              marginTop: theme.spacing.sm,
                            }}>
                              Closed {getRelativeTime(similarTicket.resolved_at)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Resolution Modal */}
      {showResolveModal && (
        <div
          onClick={() => {
            if (!submittingResolution) {
              setShowResolveModal(false);
              resolveModalTriggerRef.current?.focus();
            }
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: theme.zIndex.modal,
            padding: theme.spacing.xl,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            id="resolve-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="resolve-modal-title"
            style={{
              backgroundColor: theme.colors.background.secondary,
              borderRadius: theme.radius.xl,
              maxWidth: '520px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: theme.shadows['2xl'],
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: theme.spacing.xl,
              borderBottom: `1px solid ${theme.colors.border.light}`,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.md,
              }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: theme.radius.lg,
                  backgroundColor: theme.colors.accent.successLight,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <CheckCircle size={22} style={{ color: theme.colors.accent.success }} aria-hidden="true" />
                </div>
                <div>
                  <h2
                    id="resolve-modal-title"
                    style={{
                      fontSize: theme.fontSize.lg,
                      fontWeight: theme.fontWeight.bold,
                      color: theme.colors.text.primary,
                      margin: 0,
                    }}
                  >
                    Resolve Ticket
                  </h2>
                  <p style={{
                    fontSize: theme.fontSize.sm,
                    color: theme.colors.text.tertiary,
                    margin: 0,
                  }}>
                    Document how you resolved this issue
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: theme.spacing.xl }}>
              <div style={{ marginBottom: theme.spacing.lg }}>
                <label
                  htmlFor="resolution-textarea"
                  style={{
                    display: 'block',
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    color: theme.colors.text.primary,
                    marginBottom: theme.spacing.sm,
                  }}
                >
                  Resolution Details
                </label>
                <textarea
                  id="resolution-textarea"
                  value={resolutionText}
                  onChange={(e) => setResolutionText(e.target.value)}
                  placeholder="Describe the steps you took to resolve this ticket..."
                  aria-describedby="resolution-char-count"
                  rows={5}
                  maxLength={2000}
                  disabled={skipResolution || submittingResolution}
                  style={{
                    width: '100%',
                    padding: theme.spacing.lg,
                    backgroundColor: skipResolution ? theme.colors.background.hover : theme.colors.background.secondary,
                    color: theme.colors.text.primary,
                    border: `1px solid ${theme.colors.border.medium}`,
                    borderRadius: theme.radius.lg,
                    fontSize: theme.fontSize.sm,
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    lineHeight: theme.lineHeight.relaxed,
                    opacity: skipResolution ? 0.5 : 1,
                    cursor: skipResolution ? 'not-allowed' : 'text',
                    transition: `border-color ${theme.transitions.fast}`,
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => !skipResolution && (e.currentTarget.style.borderColor = theme.colors.border.focus)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = theme.colors.border.medium)}
                />
                <p
                  id="resolution-char-count"
                  style={{
                    fontSize: theme.fontSize.xs,
                    color: theme.colors.text.tertiary,
                    marginTop: theme.spacing.sm,
                    marginBottom: 0,
                    textAlign: 'right',
                  }}
                >
                  {resolutionText.length}/2000
                </p>
              </div>

              {/* Skip checkbox */}
              <div
                role="checkbox"
                aria-checked={skipResolution}
                aria-label="Skip writing a resolution"
                tabIndex={submittingResolution ? -1 : 0}
                onClick={() => !submittingResolution && setSkipResolution(!skipResolution)}
                onKeyDown={(e) => {
                  if ((e.key === ' ' || e.key === 'Enter') && !submittingResolution) {
                    e.preventDefault();
                    setSkipResolution(!skipResolution);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.md,
                  padding: theme.spacing.lg,
                  backgroundColor: skipResolution ? theme.colors.background.tertiary : theme.colors.background.secondary,
                  border: `1px solid ${skipResolution ? theme.colors.accent.primary : theme.colors.border.light}`,
                  borderRadius: theme.radius.lg,
                  cursor: submittingResolution ? 'not-allowed' : 'pointer',
                  transition: `all ${theme.transitions.fast}`,
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: theme.radius.sm,
                    border: `2px solid ${skipResolution ? theme.colors.accent.primary : theme.colors.border.medium}`,
                    backgroundColor: skipResolution ? theme.colors.accent.primary : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: `all ${theme.transitions.fast}`,
                  }}
                >
                  {skipResolution && (
                    <CheckCircle size={12} style={{ color: theme.colors.text.inverse }} />
                  )}
                </div>
                <span style={{
                  fontSize: theme.fontSize.sm,
                  color: skipResolution ? theme.colors.text.primary : theme.colors.text.secondary,
                }}>
                  Resolve without adding resolution notes
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: theme.spacing.xl,
              borderTop: `1px solid ${theme.colors.border.light}`,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: theme.spacing.md,
              backgroundColor: theme.colors.background.tertiary,
            }}>
              <button
                ref={resolveModalCloseRef}
                onClick={() => {
                  setShowResolveModal(false);
                  resolveModalTriggerRef.current?.focus();
                }}
                disabled={submittingResolution}
                style={getButtonStyles('secondary', submittingResolution)}
                onMouseEnter={(e) => !submittingResolution && (e.currentTarget.style.backgroundColor = theme.colors.background.hover)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.colors.background.tertiary)}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitResolution}
                disabled={submittingResolution || (!skipResolution && resolutionText.trim().length === 0)}
                style={getButtonStyles('success', submittingResolution || (!skipResolution && resolutionText.trim().length === 0))}
                onMouseEnter={(e) => !(submittingResolution || (!skipResolution && resolutionText.trim().length === 0)) && (e.currentTarget.style.backgroundColor = theme.colors.accent.successHover)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.colors.accent.success)}
              >
                <CheckCircle size={16} />
                {submittingResolution ? 'Resolving...' : 'Resolve Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechTicketDetail;
