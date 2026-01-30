import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  RefreshCw,
  Clock,
  Phone,
  Truck,
  User,
  ChevronDown,
  ChevronUp,
  X,
  Ticket,
  AlertCircle,
  CheckCircle,
  Loader2,
  Play,
  Pause,
  Filter,
  ArrowUpDown,
  Copy,
  MessageCircle
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Card from '../components/Card';
import Badge from '../components/Badge';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { theme } from '../styles/theme';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Auto-refresh interval (30 seconds)
const AUTO_REFRESH_INTERVAL = 30000;

// Status thresholds in minutes
const STATUS_THRESHOLDS = {
  active: 5,    // < 5 minutes = green (actively engaged)
  waiting: 30,  // 5-30 minutes = yellow (waiting)
  // > 30 minutes = red (may need attention)
};

// Sort options
const SORT_OPTIONS = [
  { value: 'recent', label: 'Most Recent Activity' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'longest_wait', label: 'Longest Wait' },
  { value: 'step', label: 'By Step Number' },
  { value: 'van', label: 'By Van Number' },
];

const ActiveSequences = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, logout, hasRole, isSiteAdmin } = useAuth();

  const [sequences, setSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedSequences, setExpandedSequences] = useState(new Set());
  const [closingSequence, setClosingSequence] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Filter and sort state
  const [filterSequenceType, setFilterSequenceType] = useState('all');
  const [filterSeqType, setFilterSeqType] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  // Messages state
  const [messagesExpanded, setMessagesExpanded] = useState(new Set());
  const [messagesCache, setMessagesCache] = useState({});
  const [loadingMessages, setLoadingMessages] = useState(new Set());

  // Fetch active sequences
  const fetchSequences = useCallback(async (showRefreshingState = false) => {
    try {
      if (showRefreshingState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(`${API_BASE_URL}/api/sequences/active`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch active sequences');
      }

      const data = await response.json();
      setSequences(data || []);
    } catch (error) {
      console.error('Error fetching active sequences:', error);
      showToast('Failed to load active sequences', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  // Initial fetch
  useEffect(() => {
    fetchSequences();
  }, [fetchSequences]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchSequences(true);
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchSequences, autoRefresh]);

  // Get unique sequence types for filter dropdown
  const sequenceTypes = useMemo(() => {
    const types = new Set();
    sequences.forEach(s => {
      if (s.sequence_name) types.add(s.sequence_name);
      else if (s.sequence_key) types.add(s.sequence_key);
    });
    return Array.from(types).sort();
  }, [sequences]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const total = sequences.length;
    const needsAttention = sequences.filter(s => (s.minutes_since_last_interaction || 0) > STATUS_THRESHOLDS.waiting).length;
    const avgTime = total > 0
      ? Math.round(sequences.reduce((sum, s) => sum + (s.minutes_since_last_interaction || 0), 0) / total)
      : 0;
    return { total, needsAttention, avgTime };
  }, [sequences]);

  // Filter and sort sequences
  const filteredAndSortedSequences = useMemo(() => {
    let result = [...sequences];

    // Apply sequence name filter
    if (filterSequenceType !== 'all') {
      result = result.filter(s =>
        (s.sequence_name === filterSequenceType) || (s.sequence_key === filterSequenceType)
      );
    }

    // Apply sequence type filter (linear/troubleshooting)
    if (filterSeqType !== 'all') {
      result = result.filter(s => (s.sequence_type || 'troubleshooting') === filterSeqType);
    }

    // Apply sort
    switch (sortBy) {
      case 'recent':
        result.sort((a, b) => new Date(b.last_interaction || 0) - new Date(a.last_interaction || 0));
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.last_interaction || 0) - new Date(b.last_interaction || 0));
        break;
      case 'longest_wait':
        result.sort((a, b) => (b.minutes_since_last_interaction || 0) - (a.minutes_since_last_interaction || 0));
        break;
      case 'step':
        result.sort((a, b) => (b.current_step || 0) - (a.current_step || 0));
        break;
      case 'van':
        result.sort((a, b) => {
          const vanA = a.van_number || '';
          const vanB = b.van_number || '';
          return vanA.toString().localeCompare(vanB.toString(), undefined, { numeric: true });
        });
        break;
      default:
        break;
    }

    return result;
  }, [sequences, filterSequenceType, filterSeqType, sortBy]);

  // Get status based on minutes since last interaction
  const getStatus = (minutesSinceLastInteraction) => {
    if (minutesSinceLastInteraction < STATUS_THRESHOLDS.active) {
      return { label: 'Active', color: 'green', dotColor: theme.colors.accent.success };
    } else if (minutesSinceLastInteraction < STATUS_THRESHOLDS.waiting) {
      return { label: 'Waiting', color: 'yellow', dotColor: theme.colors.accent.warning };
    } else {
      return { label: 'Needs Attention', color: 'red', dotColor: theme.colors.accent.danger };
    }
  };

  // Format time ago
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m ago`;
    return `${diffDays}d ${diffHours % 24}h ago`;
  };

  // Toggle expanded state for a sequence
  const toggleExpanded = (sequenceId) => {
    setExpandedSequences(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sequenceId)) {
        newSet.delete(sequenceId);
      } else {
        newSet.add(sequenceId);
      }
      return newSet;
    });
  };

  // Fetch messages for a sequence
  const fetchMessages = async (sequenceId) => {
    if (messagesCache[sequenceId]) return; // Already cached

    setLoadingMessages(prev => new Set(prev).add(sequenceId));

    try {
      const response = await fetch(`${API_BASE_URL}/api/sequences/${sequenceId}/messages`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      setMessagesCache(prev => ({ ...prev, [sequenceId]: data || [] }));
    } catch (error) {
      console.error('Error fetching messages:', error);
      showToast('Failed to load messages', 'error');
    } finally {
      setLoadingMessages(prev => {
        const newSet = new Set(prev);
        newSet.delete(sequenceId);
        return newSet;
      });
    }
  };

  // Toggle messages view
  const toggleMessages = (sequenceId, e) => {
    e.stopPropagation();
    setMessagesExpanded(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sequenceId)) {
        newSet.delete(sequenceId);
      } else {
        newSet.add(sequenceId);
        // Fetch messages if not cached
        if (!messagesCache[sequenceId]) {
          fetchMessages(sequenceId);
        }
      }
      return newSet;
    });
  };

  // Copy phone number to clipboard
  const copyPhoneNumber = (phone, e) => {
    e.stopPropagation();
    const cleaned = phone.replace(/\D/g, '');
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(cleaned).then(() => {
        showToast('Phone number copied!', 'success');
      }).catch(() => {
        showToast('Failed to copy phone number', 'error');
      });
    } else {
      showToast('Clipboard not available in this browser', 'error');
    }
  };

  // Close sequence handler
  const handleCloseSequence = async (sequence, createTicket = false) => {
    setClosingSequence(sequence.id);
    setConfirmDialog(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/sequences/${sequence.id}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          status: 'closed',
          createTicket,
          closedBy: user?.email || 'tech'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to close sequence');
      }

      const result = await response.json();

      if (result.success) {
        if (createTicket && result.ticketNumber) {
          showToast(`Sequence closed. Ticket #${result.ticketNumber} created.`, 'success');
        } else {
          showToast('Sequence closed successfully', 'success');
        }
        // Remove from local state
        setSequences(prev => prev.filter(s => s.id !== sequence.id));
      } else {
        showToast(result.message || 'Failed to close sequence', 'error');
      }
    } catch (error) {
      console.error('Error closing sequence:', error);
      showToast('Failed to close sequence', 'error');
    } finally {
      setClosingSequence(null);
    }
  };

  // Show confirmation dialog
  const showConfirmDialog = (sequence, createTicket) => {
    setConfirmDialog({
      sequence,
      createTicket,
      title: createTicket ? 'Close & Create Ticket' : 'Close Sequence',
      message: createTicket
        ? `Close this sequence and create a support ticket for ${sequence.phone_number}?`
        : `Close this sequence for ${sequence.phone_number}? This cannot be undone.`
    });
  };

  // Format phone number
  const formatPhone = (phone) => {
    if (!phone) return 'Unknown';
    // Basic US phone formatting
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  // Format message timestamp
  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Loading state
  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: theme.colors.background.primary }}>
        <Sidebar user={user} onLogout={logout} hasRole={hasRole} isSiteAdmin={isSiteAdmin} />
        <div style={{ flex: 1, marginLeft: '260px', padding: theme.spacing.xl }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <Loader2 size={48} style={{ color: theme.colors.accent.primary, animation: 'spin 1s linear infinite' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: theme.colors.background.primary }}>
      <Sidebar user={user} onLogout={logout} hasRole={hasRole} isSiteAdmin={isSiteAdmin} />

      <div style={{ flex: 1, marginLeft: '260px', padding: theme.spacing.xl }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing.lg
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
            <MessageSquare size={28} style={{ color: theme.colors.accent.primary }} />
            <h1 style={{
              margin: 0,
              fontSize: theme.fontSize['2xl'],
              fontWeight: theme.fontWeight.bold,
              color: theme.colors.text.primary
            }}>
              Active Sequences
            </h1>
            <Badge color="blue">{sequences.length}</Badge>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                backgroundColor: autoRefresh ? theme.colors.accent.primary : 'transparent',
                color: autoRefresh ? '#fff' : theme.colors.text.secondary,
                border: `1px solid ${autoRefresh ? theme.colors.accent.primary : theme.colors.border.medium}`,
                borderRadius: theme.radius.md,
                cursor: 'pointer',
                fontSize: theme.fontSize.sm,
                fontWeight: theme.fontWeight.medium,
                transition: 'all 0.2s'
              }}
              title={autoRefresh ? 'Auto-refresh enabled (30s)' : 'Auto-refresh disabled'}
            >
              {autoRefresh ? <Play size={16} /> : <Pause size={16} />}
              Auto-refresh
            </button>

            {/* Manual refresh button */}
            <button
              onClick={() => fetchSequences(true)}
              disabled={refreshing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                backgroundColor: theme.colors.background.secondary,
                color: theme.colors.text.primary,
                border: `1px solid ${theme.colors.border.medium}`,
                borderRadius: theme.radius.md,
                cursor: refreshing ? 'not-allowed' : 'pointer',
                fontSize: theme.fontSize.sm,
                fontWeight: theme.fontWeight.medium,
                opacity: refreshing ? 0.6 : 1,
                transition: 'all 0.2s'
              }}
            >
              <RefreshCw size={16} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              Refresh
            </button>
          </div>
        </div>

        {/* Summary Stats Banner */}
        <Card style={{ marginBottom: theme.spacing.lg }}>
          <div style={{
            padding: theme.spacing.md,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing.xl
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
              <MessageSquare size={18} style={{ color: theme.colors.accent.primary }} />
              <span style={{ color: theme.colors.text.primary, fontWeight: theme.fontWeight.semibold }}>
                {summaryStats.total} active
              </span>
            </div>
            <div style={{ width: '1px', height: '20px', backgroundColor: theme.colors.border.light }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
              <AlertCircle size={18} style={{ color: summaryStats.needsAttention > 0 ? theme.colors.accent.danger : theme.colors.text.tertiary }} />
              <span style={{
                color: summaryStats.needsAttention > 0 ? theme.colors.accent.danger : theme.colors.text.secondary,
                fontWeight: summaryStats.needsAttention > 0 ? theme.fontWeight.semibold : theme.fontWeight.normal
              }}>
                {summaryStats.needsAttention} waiting &gt;30min
              </span>
            </div>
            <div style={{ width: '1px', height: '20px', backgroundColor: theme.colors.border.light }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
              <Clock size={18} style={{ color: theme.colors.text.tertiary }} />
              <span style={{ color: theme.colors.text.secondary }}>
                Avg time: {summaryStats.avgTime} min
              </span>
            </div>
          </div>
        </Card>

        {/* Filter and Sort Controls */}
        <div style={{
          display: 'flex',
          gap: theme.spacing.md,
          marginBottom: theme.spacing.lg,
          alignItems: 'center'
        }}>
          {/* Filter by sequence type */}
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
            <Filter size={16} style={{ color: theme.colors.text.tertiary }} />
            <select
              value={filterSequenceType}
              onChange={(e) => setFilterSequenceType(e.target.value)}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                backgroundColor: theme.colors.background.secondary,
                color: theme.colors.text.primary,
                border: `1px solid ${theme.colors.border.medium}`,
                borderRadius: theme.radius.md,
                fontSize: theme.fontSize.sm,
                cursor: 'pointer',
                minWidth: '180px'
              }}
            >
              <option value="all">All Sequences</option>
              {sequenceTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Filter by sequence type (linear/troubleshooting) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
            <select
              value={filterSeqType}
              onChange={(e) => setFilterSeqType(e.target.value)}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                backgroundColor: theme.colors.background.secondary,
                color: theme.colors.text.primary,
                border: `1px solid ${theme.colors.border.medium}`,
                borderRadius: theme.radius.md,
                fontSize: theme.fontSize.sm,
                cursor: 'pointer',
                minWidth: '180px'
              }}
            >
              <option value="all">All Types</option>
              <option value="troubleshooting">Troubleshooting</option>
              <option value="linear">Linear</option>
            </select>
          </div>

          {/* Sort dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
            <ArrowUpDown size={16} style={{ color: theme.colors.text.tertiary }} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                backgroundColor: theme.colors.background.secondary,
                color: theme.colors.text.primary,
                border: `1px solid ${theme.colors.border.medium}`,
                borderRadius: theme.radius.md,
                fontSize: theme.fontSize.sm,
                cursor: 'pointer',
                minWidth: '180px'
              }}
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {/* Show filtered count if filter is active */}
          {(filterSequenceType !== 'all' || filterSeqType !== 'all') && (
            <span style={{ color: theme.colors.text.tertiary, fontSize: theme.fontSize.sm }}>
              Showing {filteredAndSortedSequences.length} of {sequences.length}
            </span>
          )}
        </div>

        {/* Empty state */}
        {filteredAndSortedSequences.length === 0 && (
          <Card>
            <div style={{
              padding: theme.spacing['2xl'],
              textAlign: 'center',
              color: theme.colors.text.secondary
            }}>
              <CheckCircle size={48} style={{ color: theme.colors.accent.success, marginBottom: theme.spacing.md }} />
              <h3 style={{
                margin: 0,
                marginBottom: theme.spacing.sm,
                color: theme.colors.text.primary,
                fontSize: theme.fontSize.lg
              }}>
                {filterSequenceType !== 'all' ? 'No Matching Sequences' : 'No Active Sequences'}
              </h3>
              <p style={{ margin: 0, fontSize: theme.fontSize.sm }}>
                {filterSequenceType !== 'all'
                  ? 'No sequences match the selected filter.'
                  : 'There are no customers currently going through troubleshooting sequences.'}
              </p>
            </div>
          </Card>
        )}

        {/* Sequence list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
          {filteredAndSortedSequences.map((sequence) => {
            const status = getStatus(sequence.minutes_since_last_interaction || 0);
            const isExpanded = expandedSequences.has(sequence.id);
            const isClosing = closingSequence === sequence.id;
            const isMessagesExpanded = messagesExpanded.has(sequence.id);
            const isLoadingMessages = loadingMessages.has(sequence.id);
            const messages = messagesCache[sequence.id] || [];

            return (
              <Card key={sequence.id} style={{ opacity: isClosing ? 0.6 : 1 }}>
                <div style={{ padding: theme.spacing.lg }}>
                  {/* Main row */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.lg,
                    cursor: 'pointer'
                  }}
                    onClick={() => toggleExpanded(sequence.id)}
                  >
                    {/* Status indicator */}
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: status.dotColor,
                      flexShrink: 0
                    }} />

                    {/* Customer info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, marginBottom: '4px' }}>
                        <Phone size={14} style={{ color: theme.colors.text.tertiary }} />
                        <button
                          onClick={(e) => copyPhoneNumber(sequence.phone_number, e)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: theme.spacing.xs,
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            color: theme.colors.text.primary,
                            fontWeight: theme.fontWeight.semibold,
                            fontSize: theme.fontSize.base
                          }}
                          title="Click to copy phone number"
                        >
                          {formatPhone(sequence.phone_number)}
                          <Copy size={12} style={{ color: theme.colors.text.tertiary }} />
                        </button>
                        {sequence.owner_name && (
                          <span style={{ color: theme.colors.text.secondary, fontSize: theme.fontSize.sm }}>
                            ({sequence.owner_name})
                          </span>
                        )}
                      </div>

                      {/* Van info */}
                      {sequence.van_number && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
                          <Truck size={14} style={{ color: theme.colors.text.tertiary }} />
                          <span style={{ color: theme.colors.text.secondary, fontSize: theme.fontSize.sm }}>
                            Van #{sequence.van_number}
                            {sequence.van_make && ` - ${sequence.van_make}`}
                            {sequence.van_version && ` ${sequence.van_version}`}
                            {sequence.van_year && ` ${sequence.van_year}`}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Sequence info */}
                    <div style={{ textAlign: 'center', minWidth: '150px' }}>
                      <div style={{
                        color: theme.colors.text.primary,
                        fontWeight: theme.fontWeight.medium,
                        fontSize: theme.fontSize.sm
                      }}>
                        {sequence.sequence_name || sequence.sequence_key}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xs, marginTop: '2px' }}>
                        <Badge
                          variant={(sequence.sequence_type || 'troubleshooting') === 'linear' ? 'info' : 'warning'}
                          soft
                          size="sm"
                        >
                          {(sequence.sequence_type || 'troubleshooting') === 'linear' ? 'Linear' : 'Troubleshooting'}
                        </Badge>
                        <span style={{ color: theme.colors.text.tertiary, fontSize: theme.fontSize.xs }}>
                          Step {sequence.current_step}
                        </span>
                      </div>
                    </div>

                    {/* Time info */}
                    <div style={{ textAlign: 'right', minWidth: '120px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs, justifyContent: 'flex-end' }}>
                        <Clock size={14} style={{ color: theme.colors.text.tertiary }} />
                        <span style={{ color: theme.colors.text.secondary, fontSize: theme.fontSize.sm }}>
                          {formatTimeAgo(sequence.last_interaction)}
                        </span>
                      </div>
                      <Badge color={status.color} size="sm" style={{ marginTop: '4px' }}>
                        {status.label}
                      </Badge>
                    </div>

                    {/* Expand indicator */}
                    <div style={{ flexShrink: 0 }}>
                      {isExpanded ? (
                        <ChevronUp size={20} style={{ color: theme.colors.text.tertiary }} />
                      ) : (
                        <ChevronDown size={20} style={{ color: theme.colors.text.tertiary }} />
                      )}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div style={{
                      marginTop: theme.spacing.lg,
                      paddingTop: theme.spacing.lg,
                      borderTop: `1px solid ${theme.colors.border.light}`
                    }}>
                      {/* Details grid */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: theme.spacing.md,
                        marginBottom: theme.spacing.lg
                      }}>
                        {sequence.sequence_description && (
                          <div>
                            <div style={{ color: theme.colors.text.tertiary, fontSize: theme.fontSize.xs, marginBottom: '4px' }}>
                              Description
                            </div>
                            <div style={{ color: theme.colors.text.secondary, fontSize: theme.fontSize.sm }}>
                              {sequence.sequence_description}
                            </div>
                          </div>
                        )}

                        <div>
                          <div style={{ color: theme.colors.text.tertiary, fontSize: theme.fontSize.xs, marginBottom: '4px' }}>
                            Started
                          </div>
                          <div style={{ color: theme.colors.text.secondary, fontSize: theme.fontSize.sm }}>
                            {sequence.started_at ? new Date(sequence.started_at).toLocaleString() : 'N/A'}
                          </div>
                        </div>

                        <div>
                          <div style={{ color: theme.colors.text.tertiary, fontSize: theme.fontSize.xs, marginBottom: '4px' }}>
                            Last Interaction
                          </div>
                          <div style={{ color: theme.colors.text.secondary, fontSize: theme.fontSize.sm }}>
                            {sequence.last_interaction ? new Date(sequence.last_interaction).toLocaleString() : 'N/A'}
                          </div>
                        </div>

                        <div>
                          <div style={{ color: theme.colors.text.tertiary, fontSize: theme.fontSize.xs, marginBottom: '4px' }}>
                            Handoff Count
                          </div>
                          <div style={{ color: theme.colors.text.secondary, fontSize: theme.fontSize.sm }}>
                            {sequence.handoff_count || 0}
                          </div>
                        </div>

                        {sequence.owner_phone && (
                          <div>
                            <div style={{ color: theme.colors.text.tertiary, fontSize: theme.fontSize.xs, marginBottom: '4px' }}>
                              Owner Phone
                            </div>
                            <div style={{ color: theme.colors.text.secondary, fontSize: theme.fontSize.sm }}>
                              {formatPhone(sequence.owner_phone)}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* View Messages Toggle */}
                      <div style={{ marginBottom: theme.spacing.lg }}>
                        <button
                          onClick={(e) => toggleMessages(sequence.id, e)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: theme.spacing.xs,
                            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                            backgroundColor: isMessagesExpanded ? theme.colors.background.tertiary : 'transparent',
                            color: theme.colors.text.secondary,
                            border: `1px solid ${theme.colors.border.medium}`,
                            borderRadius: theme.radius.md,
                            cursor: 'pointer',
                            fontSize: theme.fontSize.sm,
                            fontWeight: theme.fontWeight.medium,
                            transition: 'all 0.2s'
                          }}
                        >
                          <MessageCircle size={16} />
                          {isMessagesExpanded ? 'Hide Messages' : 'View Messages'}
                          {isMessagesExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>

                        {/* Messages Section */}
                        {isMessagesExpanded && (
                          <div style={{
                            marginTop: theme.spacing.md,
                            padding: theme.spacing.md,
                            backgroundColor: theme.colors.background.tertiary,
                            borderRadius: theme.radius.md,
                            maxHeight: '400px',
                            overflowY: 'auto'
                          }}>
                            {isLoadingMessages ? (
                              <div style={{ display: 'flex', justifyContent: 'center', padding: theme.spacing.lg }}>
                                <Loader2 size={24} style={{ color: theme.colors.accent.primary, animation: 'spin 1s linear infinite' }} />
                              </div>
                            ) : messages.length === 0 ? (
                              <div style={{ textAlign: 'center', color: theme.colors.text.tertiary, padding: theme.spacing.lg }}>
                                No messages found
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
                                {messages.map((msg) => {
                                  const isOutbound = msg.direction === 'outbound';
                                  return (
                                    <div
                                      key={msg.id}
                                      style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: isOutbound ? 'flex-start' : 'flex-end'
                                      }}
                                    >
                                      <div style={{
                                        maxWidth: '80%',
                                        padding: theme.spacing.sm,
                                        borderRadius: theme.radius.md,
                                        backgroundColor: isOutbound ? theme.colors.background.secondary : theme.colors.accent.primary,
                                        color: isOutbound ? theme.colors.text.primary : '#fff',
                                        fontSize: theme.fontSize.sm,
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word'
                                      }}>
                                        {msg.message_body}
                                      </div>
                                      <div style={{
                                        fontSize: theme.fontSize.xs,
                                        color: theme.colors.text.tertiary,
                                        marginTop: '2px'
                                      }}>
                                        {formatMessageTime(msg.created_at)}
                                        {isOutbound ? ' (System)' : ' (Customer)'}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: theme.spacing.sm, justifyContent: 'flex-end' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            showConfirmDialog(sequence, false);
                          }}
                          disabled={isClosing}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: theme.spacing.xs,
                            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                            backgroundColor: 'transparent',
                            color: theme.colors.text.secondary,
                            border: `1px solid ${theme.colors.border.medium}`,
                            borderRadius: theme.radius.md,
                            cursor: isClosing ? 'not-allowed' : 'pointer',
                            fontSize: theme.fontSize.sm,
                            fontWeight: theme.fontWeight.medium,
                            transition: 'all 0.2s'
                          }}
                        >
                          <X size={16} />
                          Close Sequence
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            showConfirmDialog(sequence, true);
                          }}
                          disabled={isClosing}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: theme.spacing.xs,
                            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                            backgroundColor: theme.colors.accent.primary,
                            color: '#fff',
                            border: 'none',
                            borderRadius: theme.radius.md,
                            cursor: isClosing ? 'not-allowed' : 'pointer',
                            fontSize: theme.fontSize.sm,
                            fontWeight: theme.fontWeight.medium,
                            transition: 'all 0.2s'
                          }}
                        >
                          {isClosing ? (
                            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                          ) : (
                            <Ticket size={16} />
                          )}
                          Close & Create Ticket
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Confirmation Dialog */}
        {confirmDialog && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <Card style={{ width: '400px', maxWidth: '90vw' }}>
              <div style={{ padding: theme.spacing.xl }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md, marginBottom: theme.spacing.lg }}>
                  <AlertCircle size={24} style={{ color: theme.colors.accent.warning }} />
                  <h3 style={{
                    margin: 0,
                    fontSize: theme.fontSize.lg,
                    fontWeight: theme.fontWeight.semibold,
                    color: theme.colors.text.primary
                  }}>
                    {confirmDialog.title}
                  </h3>
                </div>

                <p style={{
                  margin: 0,
                  marginBottom: theme.spacing.xl,
                  color: theme.colors.text.secondary,
                  fontSize: theme.fontSize.sm
                }}>
                  {confirmDialog.message}
                </p>

                <div style={{ display: 'flex', gap: theme.spacing.sm, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setConfirmDialog(null)}
                    style={{
                      padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                      backgroundColor: 'transparent',
                      color: theme.colors.text.secondary,
                      border: `1px solid ${theme.colors.border.medium}`,
                      borderRadius: theme.radius.md,
                      cursor: 'pointer',
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.medium
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    onClick={() => handleCloseSequence(confirmDialog.sequence, confirmDialog.createTicket)}
                    style={{
                      padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                      backgroundColor: confirmDialog.createTicket ? theme.colors.accent.primary : theme.colors.accent.danger,
                      color: '#fff',
                      border: 'none',
                      borderRadius: theme.radius.md,
                      cursor: 'pointer',
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.medium
                    }}
                  >
                    {confirmDialog.createTicket ? 'Create Ticket' : 'Close'}
                  </button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveSequences;
