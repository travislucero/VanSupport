import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Sparkles,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Link2,
  Video,
  FileText,
  Wrench,
  Tag,
  RefreshCw,
  Package,
  DollarSign,
} from 'lucide-react';
import { theme } from '../styles/theme';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Inject skeleton animation styles once at module level
const SKELETON_STYLES_ID = 'convert-sequence-modal-animations';
if (typeof document !== 'undefined' && !document.getElementById(SKELETON_STYLES_ID)) {
  const style = document.createElement('style');
  style.id = SKELETON_STYLES_ID;
  style.textContent = `
    @keyframes skeleton-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes skeleton-shimmer {
      0% { opacity: 0.4; }
      50% { opacity: 0.7; }
      100% { opacity: 0.4; }
    }
    @media (prefers-reduced-motion: reduce) {
      .skeleton-shimmer {
        animation: none !important;
        opacity: 0.5 !important;
      }
      .skeleton-spin {
        animation: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}

const CATEGORIES = ['Electrical', 'Plumbing', 'HVAC', 'Appliances', 'Mechanical', 'Other'];
const URL_CATEGORIES = [
  { value: 'tool', label: 'Tool', icon: Wrench },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'documentation', label: 'Documentation', icon: FileText },
];

// URL validation helper - prevents javascript: protocol XSS
const isValidUrl = (urlString) => {
  try {
    const url = new URL(urlString);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
};

const ConvertToSequenceModal = ({ ticketId, ticketNumber, onClose, onSuccess }) => {
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Generated data state
  const [sequenceData, setSequenceData] = useState({
    sequence_name: '',
    description: '',
    category: 'Other',
    keywords: [],
    steps: [],
    urls: [],
    tools: [],
    parts: [],
  });

  // Step expansion state
  const [expandedSteps, setExpandedSteps] = useState({});

  // Active status toggle
  const [createAsActive, setCreateAsActive] = useState(false);

  // New keyword input
  const [newKeyword, setNewKeyword] = useState('');

  // Abort controller ref for cleanup
  const abortControllerRef = useRef(null);

  // Mobile detection for responsive layout
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch AI-generated data - extracted as callback for retry functionality
  const fetchGeneratedSequence = useCallback(async () => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      // Minimum loading time for better UX feedback
      const minLoadingTime = new Promise((resolve) => setTimeout(resolve, 800));

      const fetchPromise = fetch(
        `${API_BASE_URL}/api/tickets/${ticketId}/generate-sequence`,
        {
          method: 'POST',
          credentials: 'include',
          signal: abortControllerRef.current.signal,
        }
      );

      // Wait for both the API call and minimum time
      const [response] = await Promise.all([fetchPromise, minLoadingTime]);

      if (!response.ok) {
        let errorMessage = 'Failed to generate sequence';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setSequenceData({
        sequence_name: data.sequence_name || '',
        description: data.description || '',
        category: data.category || 'Other',
        keywords: data.keywords || [],
        steps: data.steps || [],
        urls: data.urls || [],
        tools: (data.tools || []).map((t) => ({
          tool_name: t.tool_name || '',
          tool_description: t.tool_description || '',
          tool_link: t.tool_link || '',
          is_required: t.is_required !== false,
          step_num: t.step_num || null,
        })),
        parts: (data.parts || []).map((p) => ({
          part_name: p.part_name || '',
          part_number: p.part_number || '',
          part_description: p.part_description || '',
          part_link: p.part_link || '',
          estimated_price: p.estimated_price != null ? String(p.estimated_price) : '',
          is_required: p.is_required !== false,
          step_num: p.step_num || null,
        })),
      });

      // Expand first step by default
      if (data.steps?.length > 0) {
        setExpandedSteps({ 1: true });
      }
      setLoading(false);
    } catch (err) {
      // Ignore abort errors - don't set loading false, let the new request handle it
      if (err.name === 'AbortError') {
        return;
      }
      console.error('Error generating sequence:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [ticketId]);

  // Fetch on mount and cleanup on unmount
  useEffect(() => {
    fetchGeneratedSequence();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (saveAbortControllerRef.current) {
        saveAbortControllerRef.current.abort();
      }
    };
  }, [fetchGeneratedSequence]);

  // Focus management
  useEffect(() => {
    if (!loading) {
      closeButtonRef.current?.focus();
    }
  }, [loading]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Generate sequence key from name
  const generateSequenceKey = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .substring(0, 50);
  };

  // Validate sequence key matches server-side requirements
  const isValidSequenceKey = (key) => /^[a-z0-9-]{1,50}$/.test(key) && key.length > 0;

  // Save abort controller ref
  const saveAbortControllerRef = useRef(null);

  // Handle save with abort support
  const handleSave = async () => {
    // Cancel any existing save request
    if (saveAbortControllerRef.current) {
      saveAbortControllerRef.current.abort();
    }
    saveAbortControllerRef.current = new AbortController();

    try {
      setSaving(true);
      setError(null); // Clear previous errors

      const sequenceKey = generateSequenceKey(sequenceData.sequence_name);

      // Client-side validation
      if (!isValidSequenceKey(sequenceKey)) {
        throw new Error('Invalid sequence name. Please use letters, numbers, and hyphens only.');
      }

      const payload = {
        ticket_id: ticketId,
        sequence_key: sequenceKey,
        display_name: sequenceData.sequence_name,
        description: sequenceData.description,
        category: sequenceData.category,
        is_active: createAsActive,
        steps: sequenceData.steps,
        urls: sequenceData.urls,
        keywords: sequenceData.keywords,
        tools: sequenceData.tools,
        parts: sequenceData.parts,
      };

      const response = await fetch(`${API_BASE_URL}/api/sequences/from-ticket`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: saveAbortControllerRef.current.signal,
      });

      if (!response.ok) {
        let errorMessage = 'Failed to create sequence';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      onSuccess(sequenceKey);
    } catch (err) {
      // Ignore abort errors
      if (err.name === 'AbortError') return;
      console.error('Error saving sequence:', err);
      setError(err.message);
      setSaving(false);
    }
  };

  // Step handlers
  const toggleStep = (stepNum) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [stepNum]: !prev[stepNum],
    }));
  };

  const updateStep = (stepNum, field, value) => {
    setSequenceData((prev) => ({
      ...prev,
      steps: prev.steps.map((step) =>
        step.step_num === stepNum ? { ...step, [field]: value } : step
      ),
    }));
  };

  const addTrigger = (stepNum, type, trigger) => {
    if (!trigger.trim()) return;
    setSequenceData((prev) => ({
      ...prev,
      steps: prev.steps.map((step) => {
        if (step.step_num === stepNum) {
          const field = type === 'success' ? 'success_triggers' : 'failure_triggers';
          return {
            ...step,
            [field]: [...(step[field] || []), trigger.trim()],
          };
        }
        return step;
      }),
    }));
  };

  const removeTrigger = (stepNum, type, index) => {
    setSequenceData((prev) => ({
      ...prev,
      steps: prev.steps.map((step) => {
        if (step.step_num === stepNum) {
          const field = type === 'success' ? 'success_triggers' : 'failure_triggers';
          return {
            ...step,
            [field]: step[field].filter((_, i) => i !== index),
          };
        }
        return step;
      }),
    }));
  };

  const addStep = () => {
    const newStepNum = sequenceData.steps.length + 1;
    setSequenceData((prev) => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          step_num: newStepNum,
          message_template: '',
          success_triggers: [],
          failure_triggers: [],
        },
      ],
    }));
    setExpandedSteps((prev) => ({ ...prev, [newStepNum]: true }));
  };

  const removeStep = (stepNum) => {
    setSequenceData((prev) => ({
      ...prev,
      steps: prev.steps
        .filter((step) => step.step_num !== stepNum)
        .map((step, index) => ({ ...step, step_num: index + 1 })),
    }));
  };

  // URL handlers
  const updateUrl = (index, field, value) => {
    setSequenceData((prev) => ({
      ...prev,
      urls: prev.urls.map((url, i) => (i === index ? { ...url, [field]: value } : url)),
    }));
  };

  const removeUrl = (index) => {
    setSequenceData((prev) => ({
      ...prev,
      urls: prev.urls.filter((_, i) => i !== index),
    }));
  };

  // Keyword handlers
  const addKeyword = () => {
    if (!newKeyword.trim()) return;
    setSequenceData((prev) => ({
      ...prev,
      keywords: [...prev.keywords, newKeyword.trim()],
    }));
    setNewKeyword('');
  };

  const removeKeyword = (index) => {
    setSequenceData((prev) => ({
      ...prev,
      keywords: prev.keywords.filter((_, i) => i !== index),
    }));
  };

  // Tool handlers
  const addTool = () => {
    setSequenceData((prev) => ({
      ...prev,
      tools: [
        ...prev.tools,
        {
          tool_name: '',
          tool_description: '',
          tool_link: '',
          is_required: true,
          step_num: null,
        },
      ],
    }));
  };

  const updateTool = (index, field, value) => {
    setSequenceData((prev) => ({
      ...prev,
      tools: prev.tools.map((tool, i) => (i === index ? { ...tool, [field]: value } : tool)),
    }));
  };

  const removeTool = (index) => {
    setSequenceData((prev) => ({
      ...prev,
      tools: prev.tools.filter((_, i) => i !== index),
    }));
  };

  // Part handlers
  const addPart = () => {
    setSequenceData((prev) => ({
      ...prev,
      parts: [
        ...prev.parts,
        {
          part_name: '',
          part_number: '',
          part_description: '',
          part_link: '',
          estimated_price: '',
          is_required: true,
          step_num: null,
        },
      ],
    }));
  };

  const updatePart = (index, field, value) => {
    setSequenceData((prev) => ({
      ...prev,
      parts: prev.parts.map((part, i) => (i === index ? { ...part, [field]: value } : part)),
    }));
  };

  const removePart = (index) => {
    setSequenceData((prev) => ({
      ...prev,
      parts: prev.parts.filter((_, i) => i !== index),
    }));
  };

  // Trigger input component
  const TriggerInput = ({ stepNum, type, triggers }) => {
    const [inputValue, setInputValue] = useState('');
    const isSuccess = type === 'success';

    return (
      <div style={{ marginBottom: theme.spacing.md }}>
        <label
          style={{
            display: 'block',
            fontSize: theme.fontSize.xs,
            fontWeight: theme.fontWeight.semibold,
            color: isSuccess ? theme.colors.accent.success : theme.colors.accent.danger,
            marginBottom: theme.spacing.xs,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {isSuccess ? 'Success Triggers' : 'Failure Triggers'}
        </label>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: theme.spacing.xs,
            marginBottom: theme.spacing.sm,
          }}
        >
          {triggers?.map((trigger, i) => (
            <span
              key={i}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                backgroundColor: isSuccess
                  ? theme.colors.accent.successLight
                  : theme.colors.accent.dangerLight,
                color: isSuccess ? theme.colors.accent.success : theme.colors.accent.danger,
                borderRadius: theme.radius.full,
                fontSize: theme.fontSize.xs,
                fontWeight: theme.fontWeight.medium,
              }}
            >
              {trigger}
              <button
                type="button"
                onClick={() => removeTrigger(stepNum, type, i)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label={`Remove ${trigger}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: theme.spacing.sm }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTrigger(stepNum, type, inputValue);
                setInputValue('');
              }
            }}
            placeholder={`Add ${type} trigger...`}
            style={{
              flex: 1,
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              borderRadius: theme.radius.md,
              border: `1px solid ${theme.colors.border.medium}`,
              fontSize: theme.fontSize.sm,
              backgroundColor: theme.colors.background.secondary,
              color: theme.colors.text.primary,
            }}
          />
          <button
            type="button"
            onClick={() => {
              addTrigger(stepNum, type, inputValue);
              setInputValue('');
            }}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              borderRadius: theme.radius.md,
              border: 'none',
              backgroundColor: isSuccess
                ? theme.colors.accent.success
                : theme.colors.accent.danger,
              color: theme.colors.text.inverse,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.medium,
            }}
          >
            <Plus size={14} />
            Add
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      onClick={onClose}
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
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="convert-sequence-title"
        style={{
          backgroundColor: theme.colors.background.secondary,
          borderRadius: isMobile ? 0 : theme.radius.xl,
          maxWidth: isMobile ? '100%' : '900px',
          width: '100%',
          maxHeight: isMobile ? '100vh' : '90vh',
          height: isMobile ? '100vh' : 'auto',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: theme.shadows['2xl'],
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: theme.spacing.xl,
            borderBottom: `1px solid ${theme.colors.border.light}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: theme.radius.lg,
                backgroundColor: `${theme.colors.chart.purple}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={22} style={{ color: theme.colors.chart.purple }} />
            </div>
            <div>
              <h2
                id="convert-sequence-title"
                style={{
                  color: theme.colors.text.primary,
                  fontSize: theme.fontSize.xl,
                  fontWeight: theme.fontWeight.semibold,
                  margin: 0,
                }}
              >
                Convert to Sequence
              </h2>
              <p
                style={{
                  color: theme.colors.text.tertiary,
                  fontSize: theme.fontSize.sm,
                  margin: 0,
                }}
              >
                Ticket #{ticketNumber}
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'none',
              border: 'none',
              padding: theme.spacing.sm,
              cursor: 'pointer',
              borderRadius: theme.radius.md,
              color: theme.colors.text.tertiary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Modal Content */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: theme.spacing.xl,
          }}
        >
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xl }}>
              {/* Screen reader announcement */}
              <div
                role="status"
                aria-live="polite"
                style={{
                  position: 'absolute',
                  width: '1px',
                  height: '1px',
                  padding: 0,
                  margin: '-1px',
                  overflow: 'hidden',
                  clip: 'rect(0, 0, 0, 0)',
                  whiteSpace: 'nowrap',
                  border: 0,
                }}
              >
                Analyzing ticket with AI. Please wait while we generate sequence steps.
              </div>

              {/* Loading Header */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: theme.spacing.lg,
                  gap: theme.spacing.md,
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: theme.radius.full,
                    backgroundColor: `${theme.colors.chart.purple}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Loader2
                    size={32}
                    className="skeleton-spin"
                    style={{
                      color: theme.colors.chart.purple,
                      animation: 'skeleton-spin 1s linear infinite',
                    }}
                  />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p
                    style={{
                      color: theme.colors.text.primary,
                      fontSize: theme.fontSize.lg,
                      fontWeight: theme.fontWeight.semibold,
                      margin: 0,
                      marginBottom: theme.spacing.xs,
                    }}
                  >
                    Analyzing ticket with AI
                  </p>
                  <p
                    style={{
                      color: theme.colors.text.tertiary,
                      fontSize: theme.fontSize.sm,
                      margin: 0,
                    }}
                  >
                    Generating sequence steps, keywords, and resources...
                  </p>
                </div>
              </div>

              {/* Skeleton Loaders - hidden from screen readers */}
              <div aria-hidden="true">
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: theme.spacing.lg,
                    marginBottom: theme.spacing.xl,
                  }}
                >
                  {/* Sequence Name Skeleton */}
                  <div>
                    <div
                      className="skeleton-shimmer"
                      style={{
                        height: '14px',
                        width: '100px',
                        backgroundColor: theme.colors.border.light,
                        borderRadius: theme.radius.sm,
                        marginBottom: theme.spacing.sm,
                        animation: 'skeleton-shimmer 1.5s infinite',
                      }}
                    />
                    <div
                      className="skeleton-shimmer"
                      style={{
                        height: '40px',
                        backgroundColor: theme.colors.border.light,
                        borderRadius: theme.radius.md,
                        animation: 'skeleton-shimmer 1.5s infinite',
                      }}
                    />
                  </div>
                  {/* Category Skeleton */}
                  <div>
                    <div
                      className="skeleton-shimmer"
                      style={{
                        height: '14px',
                        width: '70px',
                        backgroundColor: theme.colors.border.light,
                        borderRadius: theme.radius.sm,
                        marginBottom: theme.spacing.sm,
                        animation: 'skeleton-shimmer 1.5s infinite',
                      }}
                    />
                    <div
                      className="skeleton-shimmer"
                      style={{
                        height: '40px',
                        backgroundColor: theme.colors.border.light,
                        borderRadius: theme.radius.md,
                        animation: 'skeleton-shimmer 1.5s infinite',
                      }}
                    />
                  </div>
                </div>

                {/* Description Skeleton */}
                <div style={{ marginBottom: theme.spacing.xl }}>
                  <div
                    className="skeleton-shimmer"
                    style={{
                      height: '14px',
                      width: '80px',
                      backgroundColor: theme.colors.border.light,
                      borderRadius: theme.radius.sm,
                      marginBottom: theme.spacing.sm,
                      animation: 'skeleton-shimmer 1.5s infinite',
                    }}
                  />
                  <div
                    className="skeleton-shimmer"
                    style={{
                      height: '80px',
                      backgroundColor: theme.colors.border.light,
                      borderRadius: theme.radius.md,
                      animation: 'skeleton-shimmer 1.5s infinite',
                    }}
                  />
                </div>

                {/* Keywords Skeleton */}
                <div style={{ marginBottom: theme.spacing.xl }}>
                  <div
                    className="skeleton-shimmer"
                    style={{
                      height: '14px',
                      width: '70px',
                      backgroundColor: theme.colors.border.light,
                      borderRadius: theme.radius.sm,
                      marginBottom: theme.spacing.sm,
                      animation: 'skeleton-shimmer 1.5s infinite',
                    }}
                  />
                  <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
                    {[80, 60, 90, 55].map((width, i) => (
                      <div
                        key={i}
                        className="skeleton-shimmer"
                        style={{
                          height: '28px',
                          width: `${width}px`,
                          backgroundColor: theme.colors.border.light,
                          borderRadius: theme.radius.full,
                          animation: 'skeleton-shimmer 1.5s infinite',
                          animationDelay: `${i * 0.1}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Steps Skeleton */}
                <div>
                  <div
                    className="skeleton-shimmer"
                    style={{
                      height: '14px',
                      width: '50px',
                      backgroundColor: theme.colors.border.light,
                      borderRadius: theme.radius.sm,
                      marginBottom: theme.spacing.md,
                      animation: 'skeleton-shimmer 1.5s infinite',
                    }}
                  />
                  {[48, 56, 52].map((height, i) => (
                    <div
                      key={i}
                      className="skeleton-shimmer"
                      style={{
                        height: `${height}px`,
                        backgroundColor: theme.colors.border.light,
                        borderRadius: theme.radius.lg,
                        marginBottom: theme.spacing.md,
                        animation: 'skeleton-shimmer 1.5s infinite',
                        animationDelay: `${i * 0.15}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : error && !sequenceData.sequence_name ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: theme.spacing['4xl'],
                gap: theme.spacing.lg,
              }}
            >
              <AlertCircle size={48} style={{ color: theme.colors.accent.danger }} />
              <p style={{ color: theme.colors.accent.danger, fontSize: theme.fontSize.base, textAlign: 'center' }}>
                {error}
              </p>
              <div style={{ display: 'flex', gap: theme.spacing.md }}>
                <button
                  onClick={onClose}
                  style={{
                    padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
                    borderRadius: theme.radius.md,
                    border: `1px solid ${theme.colors.border.medium}`,
                    backgroundColor: theme.colors.background.secondary,
                    color: theme.colors.text.secondary,
                    cursor: 'pointer',
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                  }}
                >
                  Close
                </button>
                <button
                  onClick={fetchGeneratedSequence}
                  style={{
                    padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
                    borderRadius: theme.radius.md,
                    border: 'none',
                    backgroundColor: theme.colors.accent.primary,
                    color: theme.colors.text.inverse,
                    cursor: 'pointer',
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.sm,
                  }}
                >
                  <RefreshCw size={16} />
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xl }}>
              {/* Error banner if present */}
              {error && (
                <div
                  style={{
                    padding: theme.spacing.md,
                    backgroundColor: theme.colors.accent.dangerLight,
                    borderRadius: theme.radius.md,
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.sm,
                  }}
                >
                  <AlertCircle size={18} style={{ color: theme.colors.accent.danger }} />
                  <span style={{ color: theme.colors.accent.danger, fontSize: theme.fontSize.sm }}>
                    {error}
                  </span>
                </div>
              )}

              {/* Basic Info */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: theme.spacing.lg,
                }}
              >
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.medium,
                      color: theme.colors.text.secondary,
                      marginBottom: theme.spacing.sm,
                    }}
                  >
                    Sequence Name *
                  </label>
                  <input
                    type="text"
                    value={sequenceData.sequence_name}
                    onChange={(e) =>
                      setSequenceData((prev) => ({ ...prev, sequence_name: e.target.value }))
                    }
                    style={{
                      width: '100%',
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      borderRadius: theme.radius.md,
                      border: `1px solid ${theme.colors.border.medium}`,
                      fontSize: theme.fontSize.base,
                      backgroundColor: theme.colors.background.secondary,
                      color: theme.colors.text.primary,
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.medium,
                      color: theme.colors.text.secondary,
                      marginBottom: theme.spacing.sm,
                    }}
                  >
                    Category
                  </label>
                  <select
                    value={sequenceData.category}
                    onChange={(e) =>
                      setSequenceData((prev) => ({ ...prev, category: e.target.value }))
                    }
                    style={{
                      width: '100%',
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      borderRadius: theme.radius.md,
                      border: `1px solid ${theme.colors.border.medium}`,
                      fontSize: theme.fontSize.base,
                      backgroundColor: theme.colors.background.secondary,
                      color: theme.colors.text.primary,
                      cursor: 'pointer',
                    }}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    color: theme.colors.text.secondary,
                    marginBottom: theme.spacing.sm,
                  }}
                >
                  Description
                </label>
                <textarea
                  value={sequenceData.description}
                  onChange={(e) =>
                    setSequenceData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={3}
                  style={{
                    width: '100%',
                    padding: theme.spacing.md,
                    borderRadius: theme.radius.md,
                    border: `1px solid ${theme.colors.border.medium}`,
                    fontSize: theme.fontSize.base,
                    backgroundColor: theme.colors.background.secondary,
                    color: theme.colors.text.primary,
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Keywords */}
              <div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.sm,
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    color: theme.colors.text.secondary,
                    marginBottom: theme.spacing.sm,
                  }}
                >
                  <Tag size={16} />
                  Keywords
                </label>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: theme.spacing.sm,
                    marginBottom: theme.spacing.sm,
                  }}
                >
                  {sequenceData.keywords.map((keyword, i) => (
                    <span
                      key={i}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: theme.spacing.xs,
                        padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                        backgroundColor: theme.colors.accent.primaryLight,
                        color: theme.colors.accent.primary,
                        borderRadius: theme.radius.full,
                        fontSize: theme.fontSize.sm,
                        fontWeight: theme.fontWeight.medium,
                      }}
                    >
                      {keyword}
                      <button
                        type="button"
                        onClick={() => removeKeyword(i)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          color: 'inherit',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        aria-label={`Remove ${keyword}`}
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: theme.spacing.sm }}>
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addKeyword();
                      }
                    }}
                    placeholder="Add keyword..."
                    style={{
                      flex: 1,
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      borderRadius: theme.radius.md,
                      border: `1px solid ${theme.colors.border.medium}`,
                      fontSize: theme.fontSize.sm,
                      backgroundColor: theme.colors.background.secondary,
                      color: theme.colors.text.primary,
                    }}
                  />
                  <button
                    type="button"
                    onClick={addKeyword}
                    style={{
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      borderRadius: theme.radius.md,
                      border: 'none',
                      backgroundColor: theme.colors.accent.primary,
                      color: theme.colors.text.inverse,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing.xs,
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.medium,
                    }}
                  >
                    <Plus size={14} />
                    Add
                  </button>
                </div>
              </div>

              {/* Steps */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: theme.spacing.md,
                  }}
                >
                  <label
                    style={{
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.semibold,
                      color: theme.colors.text.primary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Steps ({sequenceData.steps.length})
                  </label>
                  <button
                    type="button"
                    onClick={addStep}
                    style={{
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      borderRadius: theme.radius.md,
                      border: 'none',
                      backgroundColor: theme.colors.accent.primary,
                      color: theme.colors.text.inverse,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing.xs,
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.medium,
                    }}
                  >
                    <Plus size={14} />
                    Add Step
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
                  {sequenceData.steps.map((step) => (
                    <div
                      key={step.step_num}
                      style={{
                        border: `1px solid ${theme.colors.border.light}`,
                        borderRadius: theme.radius.lg,
                        backgroundColor: theme.colors.background.tertiary,
                        overflow: 'hidden',
                      }}
                    >
                      {/* Step Header - keyboard accessible */}
                      <div
                        role="button"
                        tabIndex={0}
                        aria-expanded={expandedSteps[step.step_num]}
                        aria-controls={`step-content-${step.step_num}`}
                        onClick={() => toggleStep(step.step_num)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleStep(step.step_num);
                          }
                        }}
                        style={{
                          padding: theme.spacing.md,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          backgroundColor: theme.colors.background.secondary,
                          outline: 'none',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.boxShadow = theme.shadows.focus;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
                          <span
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: theme.radius.full,
                              backgroundColor: theme.colors.accent.primary,
                              color: theme.colors.text.inverse,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: theme.fontSize.sm,
                              fontWeight: theme.fontWeight.semibold,
                            }}
                          >
                            {step.step_num}
                          </span>
                          <span
                            style={{
                              color: theme.colors.text.primary,
                              fontSize: theme.fontSize.sm,
                              fontWeight: theme.fontWeight.medium,
                              maxWidth: '400px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {step.message_template?.substring(0, 60) || 'New step...'}
                            {step.message_template?.length > 60 ? '...' : ''}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
                          {sequenceData.steps.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeStep(step.step_num);
                              }}
                              style={{
                                padding: theme.spacing.sm,
                                borderRadius: theme.radius.md,
                                border: 'none',
                                backgroundColor: 'transparent',
                                color: theme.colors.accent.danger,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                              aria-label={`Remove step ${step.step_num}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                          {expandedSteps[step.step_num] ? (
                            <ChevronUp size={20} style={{ color: theme.colors.text.tertiary }} />
                          ) : (
                            <ChevronDown size={20} style={{ color: theme.colors.text.tertiary }} />
                          )}
                        </div>
                      </div>

                      {/* Step Content */}
                      {expandedSteps[step.step_num] && (
                        <div id={`step-content-${step.step_num}`} style={{ padding: theme.spacing.lg }}>
                          <div style={{ marginBottom: theme.spacing.lg }}>
                            <label
                              style={{
                                display: 'block',
                                fontSize: theme.fontSize.sm,
                                fontWeight: theme.fontWeight.medium,
                                color: theme.colors.text.secondary,
                                marginBottom: theme.spacing.sm,
                              }}
                            >
                              Message
                            </label>
                            <textarea
                              value={step.message_template}
                              onChange={(e) =>
                                updateStep(step.step_num, 'message_template', e.target.value)
                              }
                              rows={4}
                              style={{
                                width: '100%',
                                padding: theme.spacing.md,
                                borderRadius: theme.radius.md,
                                border: `1px solid ${theme.colors.border.medium}`,
                                fontSize: theme.fontSize.sm,
                                backgroundColor: theme.colors.background.secondary,
                                color: theme.colors.text.primary,
                                resize: 'vertical',
                                fontFamily: 'inherit',
                              }}
                            />
                          </div>

                          <TriggerInput
                            stepNum={step.step_num}
                            type="success"
                            triggers={step.success_triggers}
                          />

                          <TriggerInput
                            stepNum={step.step_num}
                            type="failure"
                            triggers={step.failure_triggers}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tools */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: theme.spacing.md,
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing.sm,
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.semibold,
                      color: theme.colors.text.primary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    <Wrench size={16} />
                    Tools ({sequenceData.tools.length})
                  </label>
                  <button
                    type="button"
                    onClick={addTool}
                    style={{
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      borderRadius: theme.radius.md,
                      border: 'none',
                      backgroundColor: theme.colors.accent.primary,
                      color: theme.colors.text.inverse,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing.xs,
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.medium,
                    }}
                  >
                    <Plus size={14} />
                    Add Tool
                  </button>
                </div>

                {sequenceData.tools.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
                    {sequenceData.tools.map((tool, i) => (
                      <div
                        key={i}
                        style={{
                          padding: theme.spacing.md,
                          backgroundColor: theme.colors.background.tertiary,
                          borderRadius: theme.radius.md,
                          border: `1px solid ${theme.colors.border.light}`,
                        }}
                      >
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                            gap: theme.spacing.md,
                            marginBottom: theme.spacing.md,
                          }}
                        >
                          <div>
                            <label
                              style={{
                                display: 'block',
                                fontSize: theme.fontSize.xs,
                                fontWeight: theme.fontWeight.medium,
                                color: theme.colors.text.tertiary,
                                marginBottom: theme.spacing.xs,
                              }}
                            >
                              Tool Name *
                            </label>
                            <input
                              type="text"
                              value={tool.tool_name}
                              onChange={(e) => updateTool(i, 'tool_name', e.target.value)}
                              placeholder="e.g. Multimeter"
                              style={{
                                width: '100%',
                                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                borderRadius: theme.radius.md,
                                border: `1px solid ${theme.colors.border.medium}`,
                                fontSize: theme.fontSize.sm,
                                backgroundColor: theme.colors.background.secondary,
                                color: theme.colors.text.primary,
                              }}
                            />
                          </div>
                          <div>
                            <label
                              style={{
                                display: 'block',
                                fontSize: theme.fontSize.xs,
                                fontWeight: theme.fontWeight.medium,
                                color: theme.colors.text.tertiary,
                                marginBottom: theme.spacing.xs,
                              }}
                            >
                              Link
                            </label>
                            <input
                              type="text"
                              value={tool.tool_link}
                              onChange={(e) => updateTool(i, 'tool_link', e.target.value)}
                              placeholder="https://..."
                              style={{
                                width: '100%',
                                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                borderRadius: theme.radius.md,
                                border: `1px solid ${theme.colors.border.medium}`,
                                fontSize: theme.fontSize.sm,
                                backgroundColor: theme.colors.background.secondary,
                                color: theme.colors.text.primary,
                              }}
                            />
                          </div>
                        </div>
                        <div style={{ marginBottom: theme.spacing.md }}>
                          <label
                            style={{
                              display: 'block',
                              fontSize: theme.fontSize.xs,
                              fontWeight: theme.fontWeight.medium,
                              color: theme.colors.text.tertiary,
                              marginBottom: theme.spacing.xs,
                            }}
                          >
                            Description
                          </label>
                          <input
                            type="text"
                            value={tool.tool_description}
                            onChange={(e) => updateTool(i, 'tool_description', e.target.value)}
                            placeholder="Brief description..."
                            style={{
                              width: '100%',
                              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                              borderRadius: theme.radius.md,
                              border: `1px solid ${theme.colors.border.medium}`,
                              fontSize: theme.fontSize.sm,
                              backgroundColor: theme.colors.background.secondary,
                              color: theme.colors.text.primary,
                            }}
                          />
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.lg }}>
                            <label
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: theme.spacing.xs,
                                fontSize: theme.fontSize.sm,
                                color: theme.colors.text.secondary,
                                cursor: 'pointer',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={tool.is_required}
                                onChange={(e) => updateTool(i, 'is_required', e.target.checked)}
                                style={{
                                  width: '16px',
                                  height: '16px',
                                  cursor: 'pointer',
                                  accentColor: theme.colors.accent.primary,
                                }}
                              />
                              Required
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
                              <label
                                style={{
                                  fontSize: theme.fontSize.xs,
                                  color: theme.colors.text.tertiary,
                                }}
                              >
                                Step:
                              </label>
                              <select
                                value={tool.step_num || ''}
                                onChange={(e) =>
                                  updateTool(i, 'step_num', e.target.value ? parseInt(e.target.value) : null)
                                }
                                style={{
                                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                                  borderRadius: theme.radius.sm,
                                  border: `1px solid ${theme.colors.border.medium}`,
                                  fontSize: theme.fontSize.xs,
                                  backgroundColor: theme.colors.background.secondary,
                                  color: theme.colors.text.primary,
                                  cursor: 'pointer',
                                }}
                              >
                                <option value="">All Steps</option>
                                {sequenceData.steps.map((s) => (
                                  <option key={s.step_num} value={s.step_num}>
                                    Step {s.step_num}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeTool(i)}
                            style={{
                              padding: theme.spacing.sm,
                              borderRadius: theme.radius.md,
                              border: 'none',
                              backgroundColor: 'transparent',
                              color: theme.colors.accent.danger,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            aria-label={`Remove tool ${tool.tool_name || i + 1}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Parts */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: theme.spacing.md,
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing.sm,
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.semibold,
                      color: theme.colors.text.primary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    <Package size={16} />
                    Parts ({sequenceData.parts.length})
                  </label>
                  <button
                    type="button"
                    onClick={addPart}
                    style={{
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      borderRadius: theme.radius.md,
                      border: 'none',
                      backgroundColor: theme.colors.accent.primary,
                      color: theme.colors.text.inverse,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing.xs,
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.medium,
                    }}
                  >
                    <Plus size={14} />
                    Add Part
                  </button>
                </div>

                {sequenceData.parts.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
                    {sequenceData.parts.map((part, i) => (
                      <div
                        key={i}
                        style={{
                          padding: theme.spacing.md,
                          backgroundColor: theme.colors.background.tertiary,
                          borderRadius: theme.radius.md,
                          border: `1px solid ${theme.colors.border.light}`,
                        }}
                      >
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                            gap: theme.spacing.md,
                            marginBottom: theme.spacing.md,
                          }}
                        >
                          <div>
                            <label
                              style={{
                                display: 'block',
                                fontSize: theme.fontSize.xs,
                                fontWeight: theme.fontWeight.medium,
                                color: theme.colors.text.tertiary,
                                marginBottom: theme.spacing.xs,
                              }}
                            >
                              Part Name *
                            </label>
                            <input
                              type="text"
                              value={part.part_name}
                              onChange={(e) => updatePart(i, 'part_name', e.target.value)}
                              placeholder="e.g. 30A Fuse"
                              style={{
                                width: '100%',
                                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                borderRadius: theme.radius.md,
                                border: `1px solid ${theme.colors.border.medium}`,
                                fontSize: theme.fontSize.sm,
                                backgroundColor: theme.colors.background.secondary,
                                color: theme.colors.text.primary,
                              }}
                            />
                          </div>
                          <div>
                            <label
                              style={{
                                display: 'block',
                                fontSize: theme.fontSize.xs,
                                fontWeight: theme.fontWeight.medium,
                                color: theme.colors.text.tertiary,
                                marginBottom: theme.spacing.xs,
                              }}
                            >
                              Part Number
                            </label>
                            <input
                              type="text"
                              value={part.part_number}
                              onChange={(e) => updatePart(i, 'part_number', e.target.value)}
                              placeholder="e.g. ABC-123"
                              style={{
                                width: '100%',
                                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                borderRadius: theme.radius.md,
                                border: `1px solid ${theme.colors.border.medium}`,
                                fontSize: theme.fontSize.sm,
                                backgroundColor: theme.colors.background.secondary,
                                color: theme.colors.text.primary,
                              }}
                            />
                          </div>
                        </div>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                            gap: theme.spacing.md,
                            marginBottom: theme.spacing.md,
                          }}
                        >
                          <div>
                            <label
                              style={{
                                display: 'block',
                                fontSize: theme.fontSize.xs,
                                fontWeight: theme.fontWeight.medium,
                                color: theme.colors.text.tertiary,
                                marginBottom: theme.spacing.xs,
                              }}
                            >
                              Buy Link
                            </label>
                            <input
                              type="text"
                              value={part.part_link}
                              onChange={(e) => updatePart(i, 'part_link', e.target.value)}
                              placeholder="https://..."
                              style={{
                                width: '100%',
                                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                borderRadius: theme.radius.md,
                                border: `1px solid ${theme.colors.border.medium}`,
                                fontSize: theme.fontSize.sm,
                                backgroundColor: theme.colors.background.secondary,
                                color: theme.colors.text.primary,
                              }}
                            />
                          </div>
                          <div>
                            <label
                              style={{
                                display: 'block',
                                fontSize: theme.fontSize.xs,
                                fontWeight: theme.fontWeight.medium,
                                color: theme.colors.text.tertiary,
                                marginBottom: theme.spacing.xs,
                              }}
                            >
                              Estimated Price ($)
                            </label>
                            <div style={{ position: 'relative' }}>
                              <DollarSign
                                size={14}
                                style={{
                                  position: 'absolute',
                                  left: theme.spacing.sm,
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  color: theme.colors.text.tertiary,
                                }}
                              />
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={part.estimated_price}
                                onChange={(e) => updatePart(i, 'estimated_price', e.target.value)}
                                placeholder="0.00"
                                style={{
                                  width: '100%',
                                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                  paddingLeft: '28px',
                                  borderRadius: theme.radius.md,
                                  border: `1px solid ${theme.colors.border.medium}`,
                                  fontSize: theme.fontSize.sm,
                                  backgroundColor: theme.colors.background.secondary,
                                  color: theme.colors.text.primary,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        <div style={{ marginBottom: theme.spacing.md }}>
                          <label
                            style={{
                              display: 'block',
                              fontSize: theme.fontSize.xs,
                              fontWeight: theme.fontWeight.medium,
                              color: theme.colors.text.tertiary,
                              marginBottom: theme.spacing.xs,
                            }}
                          >
                            Description
                          </label>
                          <input
                            type="text"
                            value={part.part_description}
                            onChange={(e) => updatePart(i, 'part_description', e.target.value)}
                            placeholder="Brief description..."
                            style={{
                              width: '100%',
                              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                              borderRadius: theme.radius.md,
                              border: `1px solid ${theme.colors.border.medium}`,
                              fontSize: theme.fontSize.sm,
                              backgroundColor: theme.colors.background.secondary,
                              color: theme.colors.text.primary,
                            }}
                          />
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.lg }}>
                            <label
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: theme.spacing.xs,
                                fontSize: theme.fontSize.sm,
                                color: theme.colors.text.secondary,
                                cursor: 'pointer',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={part.is_required}
                                onChange={(e) => updatePart(i, 'is_required', e.target.checked)}
                                style={{
                                  width: '16px',
                                  height: '16px',
                                  cursor: 'pointer',
                                  accentColor: theme.colors.accent.primary,
                                }}
                              />
                              Required
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
                              <label
                                style={{
                                  fontSize: theme.fontSize.xs,
                                  color: theme.colors.text.tertiary,
                                }}
                              >
                                Step:
                              </label>
                              <select
                                value={part.step_num || ''}
                                onChange={(e) =>
                                  updatePart(i, 'step_num', e.target.value ? parseInt(e.target.value) : null)
                                }
                                style={{
                                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                                  borderRadius: theme.radius.sm,
                                  border: `1px solid ${theme.colors.border.medium}`,
                                  fontSize: theme.fontSize.xs,
                                  backgroundColor: theme.colors.background.secondary,
                                  color: theme.colors.text.primary,
                                  cursor: 'pointer',
                                }}
                              >
                                <option value="">All Steps</option>
                                {sequenceData.steps.map((s) => (
                                  <option key={s.step_num} value={s.step_num}>
                                    Step {s.step_num}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removePart(i)}
                            style={{
                              padding: theme.spacing.sm,
                              borderRadius: theme.radius.md,
                              border: 'none',
                              backgroundColor: 'transparent',
                              color: theme.colors.accent.danger,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            aria-label={`Remove part ${part.part_name || i + 1}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* URLs */}
              {sequenceData.urls.length > 0 && (
                <div>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing.sm,
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.semibold,
                      color: theme.colors.text.primary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: theme.spacing.md,
                    }}
                  >
                    <Link2 size={16} />
                    Extracted URLs ({sequenceData.urls.length})
                  </label>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
                    {sequenceData.urls.map((url, i) => (
                      <div
                        key={i}
                        style={{
                          padding: theme.spacing.md,
                          backgroundColor: theme.colors.background.tertiary,
                          borderRadius: theme.radius.md,
                          display: 'grid',
                          gridTemplateColumns: isMobile ? '1fr' : '1fr minmax(120px, 150px) auto',
                          gap: theme.spacing.md,
                          alignItems: isMobile ? 'stretch' : 'center',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <input
                            type="text"
                            value={url.title}
                            onChange={(e) => updateUrl(i, 'title', e.target.value)}
                            placeholder="Title"
                            style={{
                              width: '100%',
                              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                              borderRadius: theme.radius.md,
                              border: `1px solid ${theme.colors.border.medium}`,
                              fontSize: theme.fontSize.sm,
                              backgroundColor: theme.colors.background.secondary,
                              color: theme.colors.text.primary,
                              marginBottom: theme.spacing.xs,
                            }}
                          />
                          {isValidUrl(url.url) ? (
                            <a
                              href={url.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: theme.colors.accent.primary,
                                fontSize: theme.fontSize.xs,
                                textDecoration: 'none',
                                wordBreak: 'break-all',
                              }}
                            >
                              {url.url}
                            </a>
                          ) : (
                            <span style={{
                              color: theme.colors.text.tertiary,
                              fontSize: theme.fontSize.xs,
                              wordBreak: 'break-all',
                            }}>
                              {url.url} <span style={{ color: theme.colors.accent.warning }}>(invalid URL)</span>
                            </span>
                          )}
                        </div>
                        <select
                          value={url.category}
                          onChange={(e) => updateUrl(i, 'category', e.target.value)}
                          style={{
                            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                            borderRadius: theme.radius.md,
                            border: `1px solid ${theme.colors.border.medium}`,
                            fontSize: theme.fontSize.sm,
                            backgroundColor: theme.colors.background.secondary,
                            color: theme.colors.text.primary,
                            cursor: 'pointer',
                            width: isMobile ? '100%' : 'auto',
                          }}
                        >
                          {URL_CATEGORIES.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeUrl(i)}
                          style={{
                            padding: theme.spacing.sm,
                            borderRadius: theme.radius.md,
                            alignSelf: isMobile ? 'flex-end' : 'center',
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: theme.colors.accent.danger,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          aria-label="Remove URL"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {!loading && !error && (
          <div
            style={{
              padding: theme.spacing.xl,
              borderTop: `1px solid ${theme.colors.border.light}`,
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'stretch' : 'center',
              justifyContent: 'space-between',
              gap: isMobile ? theme.spacing.lg : 0,
              backgroundColor: theme.colors.background.secondary,
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.sm,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={createAsActive}
                onChange={(e) => setCreateAsActive(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                  accentColor: theme.colors.accent.primary,
                }}
              />
              <span
                style={{
                  fontSize: theme.fontSize.sm,
                  color: theme.colors.text.secondary,
                }}
              >
                Create as Active
              </span>
            </label>

            <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: isMobile ? 'stretch' : 'flex-end' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
                  borderRadius: theme.radius.md,
                  border: `1px solid ${theme.colors.border.medium}`,
                  backgroundColor: theme.colors.background.secondary,
                  color: theme.colors.text.secondary,
                  cursor: 'pointer',
                  fontSize: theme.fontSize.sm,
                  fontWeight: theme.fontWeight.medium,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !sequenceData.sequence_name || sequenceData.steps.length === 0}
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
                  borderRadius: theme.radius.md,
                  border: 'none',
                  backgroundColor: theme.colors.chart.purple,
                  color: theme.colors.text.inverse,
                  cursor:
                    saving || !sequenceData.sequence_name || sequenceData.steps.length === 0
                      ? 'not-allowed'
                      : 'pointer',
                  opacity:
                    saving || !sequenceData.sequence_name || sequenceData.steps.length === 0
                      ? 0.5
                      : 1,
                  fontSize: theme.fontSize.sm,
                  fontWeight: theme.fontWeight.medium,
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.sm,
                }}
              >
                {saving ? (
                  <>
                    <Loader2
                      size={16}
                      style={{ animation: 'spin 1s linear infinite' }}
                    />
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Create Sequence
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConvertToSequenceModal;
