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
  GitBranch,
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

// Fix #1: TriggerInput extracted outside the component, receives addTrigger/removeTrigger as props
const TriggerInput = ({ stepNum, type, triggers, addTrigger, removeTrigger, label }) => {
  const [inputValue, setInputValue] = useState('');
  const isSuccess = type === 'success';
  const displayLabel = label || (isSuccess ? 'Success Triggers' : 'Failure Triggers');

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
        {displayLabel}
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
    sequence_type: 'troubleshooting',
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

  // Available sequences for handoff dropdown
  const [allSequences, setAllSequences] = useState([]);

  // Abort controller ref for cleanup
  const abortControllerRef = useRef(null);

  // Mobile detection for responsive layout
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Fix #11: Debounced resize handler
  useEffect(() => {
    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setIsMobile(window.innerWidth < 768), 150);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  // Fix #10: Lock body scroll when modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Fetch all sequences for handoff dropdown
  useEffect(() => {
    const fetchSequences = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/sequences`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setAllSequences(data || []);
        }
      } catch {
        // Non-critical - handoff dropdown just won't be populated
      }
    };
    fetchSequences();
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
        urls: (data.urls || []).map((u) => ({
          _id: crypto.randomUUID(),
          url: u.url || '',
          title: u.title || '',
          category: u.category || 'documentation',
        })),
        // Fix #7: Add stable _id to each tool from AI response
        tools: (data.tools || []).map((t) => ({
          _id: crypto.randomUUID(),
          tool_name: t.tool_name || '',
          tool_description: t.tool_description || '',
          tool_link: t.tool_link || '',
          is_required: t.is_required !== false,
          step_num: t.step_num || null,
        })),
        // Fix #7: Add stable _id to each part from AI response
        parts: (data.parts || []).map((p) => ({
          _id: crypto.randomUUID(),
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
      if (e.key === 'Escape' && !saving) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, saving]);

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

  // Common styles
  const inputStyle = {
    width: '100%',
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderRadius: theme.radius.md,
    border: `1px solid ${theme.colors.border.medium}`,
    fontSize: theme.fontSize.sm,
    backgroundColor: theme.colors.background.secondary,
    color: theme.colors.text.primary,
  };

  const labelStyle = {
    display: 'block',
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.tertiary,
    marginBottom: theme.spacing.xs,
  };

  const fieldLabelStyle = {
    display: 'block',
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  };

  const sectionHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const addButtonStyle = {
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
  };

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

      // Fix #6: Validate URL fields before saving
      const validateUrls = (items, linkField) => {
        for (const item of items) {
          if (item[linkField] && item[linkField].trim() && !isValidUrl(item[linkField].trim())) {
            throw new Error('Invalid URL detected. Only http/https URLs are allowed.');
          }
        }
      };
      try {
        validateUrls(sequenceData.tools, 'tool_link');
        validateUrls(sequenceData.parts, 'part_link');
        validateUrls(sequenceData.urls, 'url');
        sequenceData.steps.forEach((step) => {
          if (step.doc_url && step.doc_url.trim() && !isValidUrl(step.doc_url.trim())) {
            throw new Error('Invalid document URL. Only http/https URLs are allowed.');
          }
        });
      } catch (validationErr) {
        setError(validationErr.message);
        setSaving(false);
        return;
      }

      const payload = {
        ticket_id: ticketId,
        sequence_key: sequenceKey,
        display_name: sequenceData.sequence_name,
        description: sequenceData.description,
        category: sequenceData.category,
        sequence_type: sequenceData.sequence_type,
        is_active: createAsActive,
        steps: sequenceData.steps,
        urls: sequenceData.urls.map(({ _id, ...rest }) => rest),
        keywords: sequenceData.keywords,
        tools: sequenceData.tools
          .filter((t) => t.tool_name && t.tool_name.trim())
          .map(({ _id, ...rest }) => rest),
        parts: sequenceData.parts
          .filter((p) => p.part_name && p.part_name.trim())
          .map(({ _id, estimated_price, ...rest }) => ({
            ...rest,
            estimated_price: estimated_price ? parseFloat(estimated_price) : null,
          })),
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

      // Fix #12: Remove unused result variable
      await response.json();
      // Fix #8: Reset saving state before calling onSuccess
      setSaving(false);
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

  // Fix #4: removeStep now updates tool/part step_num references and expandedSteps
  const removeStep = (stepNum) => {
    setSequenceData((prev) => {
      const newSteps = prev.steps
        .filter((step) => step.step_num !== stepNum)
        .map((step, index) => ({ ...step, step_num: index + 1 }));

      // Update tool/part step_num references
      const updateStepRef = (item) => {
        if (item.step_num === null) return item;
        if (item.step_num === stepNum) return { ...item, step_num: null };
        if (item.step_num > stepNum) return { ...item, step_num: item.step_num - 1 };
        return item;
      };

      return {
        ...prev,
        steps: newSteps,
        tools: prev.tools.map(updateStepRef),
        parts: prev.parts.map(updateStepRef),
      };
    });
    // Rebuild expandedSteps for renumbered steps
    setExpandedSteps((prev) => {
      const newExpanded = {};
      Object.entries(prev).forEach(([key, val]) => {
        const num = parseInt(key);
        if (num < stepNum) newExpanded[num] = val;
        else if (num > stepNum) newExpanded[num - 1] = val;
      });
      return newExpanded;
    });
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

  const addUrl = () => {
    setSequenceData((prev) => ({
      ...prev,
      urls: [...prev.urls, { _id: crypto.randomUUID(), url: '', title: '', category: 'documentation' }],
    }));
  };

  // Fix #13: Prevent duplicate keywords (case-insensitive check)
  const addKeyword = () => {
    if (!newKeyword.trim()) return;
    const trimmed = newKeyword.trim();
    if (sequenceData.keywords.some((k) => k.toLowerCase() === trimmed.toLowerCase())) return;
    setSequenceData((prev) => ({
      ...prev,
      keywords: [...prev.keywords, trimmed],
    }));
    setNewKeyword('');
  };

  const removeKeyword = (index) => {
    setSequenceData((prev) => ({
      ...prev,
      keywords: prev.keywords.filter((_, i) => i !== index),
    }));
  };

  // Fix #7: Tool handlers with stable IDs
  const addTool = () => {
    setSequenceData((prev) => ({
      ...prev,
      tools: [
        ...prev.tools,
        {
          _id: crypto.randomUUID(),
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

  // Fix #7: Part handlers with stable IDs
  const addPart = () => {
    setSequenceData((prev) => ({
      ...prev,
      parts: [
        ...prev.parts,
        {
          _id: crypto.randomUUID(),
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

  return (
    <div
      onClick={saving ? undefined : onClose}
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
            onClick={saving ? undefined : onClose}
            disabled={saving}
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
              {/* Fix #9: Error banner with role="alert" */}
              {error && (
                <div
                  role="alert"
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
                    style={fieldLabelStyle}
                  >
                    Sequence Name *
                  </label>
                  <input
                    type="text"
                    value={sequenceData.sequence_name}
                    onChange={(e) =>
                      setSequenceData((prev) => ({ ...prev, sequence_name: e.target.value }))
                    }
                    style={{ ...inputStyle, fontSize: theme.fontSize.base }}
                  />
                  {sequenceData.sequence_name && (
                    <p style={{
                      fontSize: theme.fontSize.xs,
                      color: isValidSequenceKey(generateSequenceKey(sequenceData.sequence_name))
                        ? theme.colors.text.tertiary
                        : theme.colors.accent.danger,
                      margin: 0,
                      marginTop: theme.spacing.xs,
                    }}>
                      Key: {generateSequenceKey(sequenceData.sequence_name) || '(invalid characters)'}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    style={fieldLabelStyle}
                  >
                    Category
                  </label>
                  <select
                    value={sequenceData.category}
                    onChange={(e) =>
                      setSequenceData((prev) => ({ ...prev, category: e.target.value }))
                    }
                    style={{ ...inputStyle, fontSize: theme.fontSize.base, cursor: 'pointer' }}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    style={fieldLabelStyle}
                  >
                    Sequence Type
                  </label>
                  <select
                    value={sequenceData.sequence_type}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setSequenceData((prev) => ({
                        ...prev,
                        sequence_type: newType,
                        // Clear success_triggers from all steps when switching to linear
                        ...(newType === 'linear' ? {
                          steps: prev.steps.map(step => ({ ...step, success_triggers: [] })),
                        } : {}),
                      }));
                    }}
                    style={{ ...inputStyle, fontSize: theme.fontSize.base, cursor: 'pointer' }}
                  >
                    <option value="troubleshooting">Troubleshooting</option>
                    <option value="linear">Linear</option>
                  </select>
                  <p style={{
                    margin: 0,
                    marginTop: theme.spacing.xs,
                    fontSize: theme.fontSize.xs,
                    color: theme.colors.text.tertiary,
                  }}>
                    Troubleshooting: step-by-step issue diagnosis. Linear: walkthrough guide (e.g., onboarding).
                  </p>
                </div>
              </div>

              <div>
                <label
                  style={fieldLabelStyle}
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
                    ...inputStyle,
                    fontSize: theme.fontSize.base,
                    padding: theme.spacing.md,
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
                    style={{ ...inputStyle, flex: 1, width: 'auto' }}
                  />
                  <button
                    type="button"
                    onClick={addKeyword}
                    style={addButtonStyle}
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
                  <label style={sectionHeaderStyle}>
                    Steps ({sequenceData.steps.length})
                  </label>
                  <button
                    type="button"
                    onClick={addStep}
                    style={addButtonStyle}
                  >
                    <Plus size={14} />
                    Add Step
                  </button>
                </div>

                {/* Linear sequence info banner */}
                {sequenceData.sequence_type === 'linear' && (
                  <div
                    style={{
                      padding: theme.spacing.md,
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: theme.radius.md,
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing.sm,
                      marginBottom: theme.spacing.md,
                    }}
                  >
                    <AlertCircle size={18} color="#3b82f6" style={{ flexShrink: 0 }} />
                    <span style={{ color: '#1e40af', fontSize: theme.fontSize.sm }}>
                      Linear sequences auto-advance on any customer response. You only need escalation triggers.
                    </span>
                  </div>
                )}

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
                              style={fieldLabelStyle}
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
                                ...inputStyle,
                                padding: theme.spacing.md,
                                resize: 'vertical',
                                fontFamily: 'inherit',
                              }}
                            />
                          </div>

                          {/* Fix #1: Pass addTrigger and removeTrigger as props */}
                          {sequenceData.sequence_type !== 'linear' && (
                            <TriggerInput
                              stepNum={step.step_num}
                              type="success"
                              triggers={step.success_triggers}
                              addTrigger={addTrigger}
                              removeTrigger={removeTrigger}
                            />
                          )}

                          <TriggerInput
                            stepNum={step.step_num}
                            type="failure"
                            triggers={step.failure_triggers}
                            addTrigger={addTrigger}
                            removeTrigger={removeTrigger}
                            label={sequenceData.sequence_type === 'linear' ? 'Escalation Triggers' : undefined}
                          />

                          {/* Document URL and Title */}
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                              gap: theme.spacing.md,
                              marginBottom: theme.spacing.md,
                            }}
                          >
                            <div>
                              <label style={{ ...labelStyle, color: theme.colors.text.secondary }}>
                                Document URL
                              </label>
                              <input
                                type="text"
                                value={step.doc_url || ''}
                                onChange={(e) => updateStep(step.step_num, 'doc_url', e.target.value)}
                                placeholder="https://..."
                                style={inputStyle}
                              />
                            </div>
                            <div>
                              <label style={{ ...labelStyle, color: theme.colors.text.secondary }}>
                                Document Title
                              </label>
                              <input
                                type="text"
                                value={step.doc_title || ''}
                                onChange={(e) => updateStep(step.step_num, 'doc_title', e.target.value)}
                                placeholder="Reference doc title"
                                style={inputStyle}
                              />
                            </div>
                          </div>

                          {/* Fix #3: Handoff Configuration with proper state management */}
                          <div
                            style={{
                              padding: theme.spacing.md,
                              backgroundColor: theme.colors.background.secondary,
                              borderRadius: theme.radius.md,
                              border: `1px solid ${theme.colors.border.light}`,
                            }}
                          >
                            <label
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: theme.spacing.sm,
                                cursor: 'pointer',
                                marginBottom: step.handoff_trigger !== undefined && step.handoff_trigger !== null ? theme.spacing.md : 0,
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={step.handoff_trigger !== null && step.handoff_trigger !== undefined}
                                onChange={(e) => {
                                  setSequenceData((prev) => ({
                                    ...prev,
                                    steps: prev.steps.map((s) =>
                                      s.step_num === step.step_num
                                        ? {
                                            ...s,
                                            handoff_trigger: e.target.checked ? '' : null,
                                            handoff_sequence_key: e.target.checked ? '' : null,
                                          }
                                        : s
                                    ),
                                  }));
                                }}
                                style={{
                                  width: '16px',
                                  height: '16px',
                                  cursor: 'pointer',
                                  accentColor: theme.colors.accent.warning,
                                }}
                              />
                              <GitBranch size={16} style={{ color: theme.colors.accent.warning }} />
                              <span
                                style={{
                                  fontSize: theme.fontSize.sm,
                                  fontWeight: theme.fontWeight.medium,
                                  color: theme.colors.text.secondary,
                                }}
                              >
                                Configure Handoff
                              </span>
                            </label>
                            {step.handoff_trigger !== null && step.handoff_trigger !== undefined && (
                              <>
                              <p style={{ fontSize: theme.fontSize.xs, color: theme.colors.text.tertiary, margin: `0 0 ${theme.spacing.sm} 0` }}>
                                When the customer responds with the trigger word, the conversation will switch to the target sequence.
                              </p>
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                                  gap: theme.spacing.md,
                                }}
                              >
                                <div>
                                  <label style={labelStyle}>
                                    Trigger Word
                                  </label>
                                  <input
                                    type="text"
                                    value={step.handoff_trigger || ''}
                                    onChange={(e) => updateStep(step.step_num, 'handoff_trigger', e.target.value)}
                                    placeholder="e.g. yes, ready"
                                    style={{ ...inputStyle, backgroundColor: theme.colors.background.tertiary }}
                                  />
                                </div>
                                <div>
                                  <label style={labelStyle}>
                                    Target Sequence
                                  </label>
                                  <select
                                    value={step.handoff_sequence_key || ''}
                                    onChange={(e) => updateStep(step.step_num, 'handoff_sequence_key', e.target.value)}
                                    style={{ ...inputStyle, backgroundColor: theme.colors.background.tertiary, cursor: 'pointer' }}
                                  >
                                    <option value="">Select a sequence...</option>
                                    {allSequences.map((seq) => (
                                      <option key={seq.sequence_key} value={seq.sequence_key}>
                                        {seq.display_name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tools */}
              <div style={{
                borderTop: `1px solid ${theme.colors.border.light}`,
                paddingTop: theme.spacing.xl,
              }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: theme.spacing.md,
                  }}
                >
                  <label style={sectionHeaderStyle}>
                    <Wrench size={16} />
                    Tools ({sequenceData.tools.length})
                  </label>
                  <button
                    type="button"
                    onClick={addTool}
                    style={addButtonStyle}
                  >
                    <Plus size={14} />
                    Add Tool
                  </button>
                </div>

                {sequenceData.tools.length === 0 && (
                  <div style={{
                    padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
                    textAlign: 'center',
                    backgroundColor: theme.colors.background.tertiary,
                    borderRadius: theme.radius.md,
                    border: `1px dashed ${theme.colors.border.medium}`,
                  }}>
                    <Wrench size={20} style={{ color: theme.colors.text.tertiary, marginBottom: theme.spacing.xs }} />
                    <p style={{
                      color: theme.colors.text.tertiary,
                      fontSize: theme.fontSize.sm,
                      margin: 0,
                    }}>
                      No tools added. Click &quot;Add Tool&quot; to specify tools needed for this sequence.
                    </p>
                  </div>
                )}

                {sequenceData.tools.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
                    {/* Fix #7: Use tool._id as React key instead of index */}
                    {sequenceData.tools.map((tool, i) => (
                      <div
                        key={tool._id}
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
                            <label style={labelStyle}>
                              Tool Name *
                            </label>
                            <input
                              type="text"
                              value={tool.tool_name}
                              onChange={(e) => updateTool(i, 'tool_name', e.target.value)}
                              placeholder="e.g. Multimeter"
                              style={inputStyle}
                            />
                          </div>
                          <div>
                            <label style={labelStyle}>
                              Link
                            </label>
                            <input
                              type="text"
                              value={tool.tool_link}
                              onChange={(e) => updateTool(i, 'tool_link', e.target.value)}
                              placeholder="https://..."
                              style={inputStyle}
                            />
                          </div>
                        </div>
                        <div style={{ marginBottom: theme.spacing.md }}>
                          <label style={labelStyle}>
                            Description
                          </label>
                          <input
                            type="text"
                            value={tool.tool_description}
                            onChange={(e) => updateTool(i, 'tool_description', e.target.value)}
                            placeholder="Brief description..."
                            style={inputStyle}
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
                                    Step {s.step_num}: {(s.message_template || '').substring(0, 25)}{(s.message_template || '').length > 25 ? '...' : ''}
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
              <div style={{
                borderTop: `1px solid ${theme.colors.border.light}`,
                paddingTop: theme.spacing.xl,
              }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: theme.spacing.md,
                  }}
                >
                  <label style={sectionHeaderStyle}>
                    <Package size={16} />
                    Parts ({sequenceData.parts.length})
                  </label>
                  <button
                    type="button"
                    onClick={addPart}
                    style={addButtonStyle}
                  >
                    <Plus size={14} />
                    Add Part
                  </button>
                </div>

                {sequenceData.parts.length === 0 && (
                  <div style={{
                    padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
                    textAlign: 'center',
                    backgroundColor: theme.colors.background.tertiary,
                    borderRadius: theme.radius.md,
                    border: `1px dashed ${theme.colors.border.medium}`,
                  }}>
                    <Package size={20} style={{ color: theme.colors.text.tertiary, marginBottom: theme.spacing.xs }} />
                    <p style={{
                      color: theme.colors.text.tertiary,
                      fontSize: theme.fontSize.sm,
                      margin: 0,
                    }}>
                      No parts added. Click &quot;Add Part&quot; to specify parts or materials needed.
                    </p>
                  </div>
                )}

                {sequenceData.parts.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
                    {/* Fix #7: Use part._id as React key instead of index */}
                    {sequenceData.parts.map((part, i) => (
                      <div
                        key={part._id}
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
                            <label style={labelStyle}>
                              Part Name *
                            </label>
                            <input
                              type="text"
                              value={part.part_name}
                              onChange={(e) => updatePart(i, 'part_name', e.target.value)}
                              placeholder="e.g. 30A Fuse"
                              style={inputStyle}
                            />
                          </div>
                          <div>
                            <label style={labelStyle}>
                              Part Number
                            </label>
                            <input
                              type="text"
                              value={part.part_number}
                              onChange={(e) => updatePart(i, 'part_number', e.target.value)}
                              placeholder="e.g. ABC-123"
                              style={inputStyle}
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
                            <label style={labelStyle}>
                              Buy Link
                            </label>
                            <input
                              type="text"
                              value={part.part_link}
                              onChange={(e) => updatePart(i, 'part_link', e.target.value)}
                              placeholder="https://..."
                              style={inputStyle}
                            />
                          </div>
                          <div>
                            <label style={labelStyle}>
                              Estimated Price
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
                                style={{ ...inputStyle, paddingLeft: '28px' }}
                              />
                            </div>
                          </div>
                        </div>
                        <div style={{ marginBottom: theme.spacing.md }}>
                          <label style={labelStyle}>
                            Description
                          </label>
                          <input
                            type="text"
                            value={part.part_description}
                            onChange={(e) => updatePart(i, 'part_description', e.target.value)}
                            placeholder="Brief description..."
                            style={inputStyle}
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
                                    Step {s.step_num}: {(s.message_template || '').substring(0, 25)}{(s.message_template || '').length > 25 ? '...' : ''}
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
              <div style={{
                borderTop: `1px solid ${theme.colors.border.light}`,
                paddingTop: theme.spacing.xl,
              }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: theme.spacing.md,
                  }}
                >
                  <label style={sectionHeaderStyle}>
                    <Link2 size={16} />
                    URLs ({sequenceData.urls.length})
                  </label>
                  <button
                    type="button"
                    onClick={addUrl}
                    style={addButtonStyle}
                  >
                    <Plus size={14} />
                    Add URL
                  </button>
                </div>

                {sequenceData.urls.length === 0 && (
                  <div style={{
                    padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
                    textAlign: 'center',
                    backgroundColor: theme.colors.background.tertiary,
                    borderRadius: theme.radius.md,
                    border: `1px dashed ${theme.colors.border.medium}`,
                  }}>
                    <Link2 size={20} style={{ color: theme.colors.text.tertiary, marginBottom: theme.spacing.xs }} />
                    <p style={{ color: theme.colors.text.tertiary, fontSize: theme.fontSize.sm, margin: 0 }}>
                      No reference URLs. Click &quot;Add URL&quot; to add documentation or video links.
                    </p>
                  </div>
                )}

                {sequenceData.urls.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
                    {sequenceData.urls.map((url, i) => (
                      <div
                        key={url._id}
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
                            style={{ ...inputStyle, marginBottom: theme.spacing.xs }}
                          />
                          <input
                            type="text"
                            value={url.url}
                            onChange={(e) => updateUrl(i, 'url', e.target.value)}
                            placeholder="https://..."
                            style={{ ...inputStyle, marginBottom: theme.spacing.xs }}
                          />
                          {url.url && !isValidUrl(url.url) && (
                            <span style={{ color: theme.colors.accent.warning, fontSize: theme.fontSize.xs }}>
                              URL must start with http:// or https://
                            </span>
                          )}
                        </div>
                        <select
                          value={url.category}
                          onChange={(e) => updateUrl(i, 'category', e.target.value)}
                          style={{ ...inputStyle, cursor: 'pointer', width: isMobile ? '100%' : 'auto' }}
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
                )}
              </div>
            </div>
          )}
        </div>

        {/* Fix #2: Modal Footer - visible when there's data to work with (save errors vs initial load errors) */}
        {!loading && (!error || sequenceData.sequence_name) && (
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

            <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={saving ? undefined : onClose}
                disabled={saving}
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
                  borderRadius: theme.radius.md,
                  border: `1px solid ${theme.colors.border.medium}`,
                  backgroundColor: theme.colors.background.secondary,
                  color: theme.colors.text.secondary,
                  cursor: 'pointer',
                  fontSize: theme.fontSize.sm,
                  fontWeight: theme.fontWeight.medium,
                  flex: isMobile ? 1 : undefined,
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
                  justifyContent: 'center',
                  gap: theme.spacing.sm,
                  flex: isMobile ? 1 : undefined,
                }}
              >
                {saving ? (
                  <>
                    {/* Fix #5: Use correct keyframe name */}
                    <Loader2
                      size={16}
                      style={{ animation: 'skeleton-spin 1s linear infinite' }}
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
