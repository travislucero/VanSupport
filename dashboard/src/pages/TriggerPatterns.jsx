import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import Sidebar from '../components/Sidebar';
import Card from '../components/Card';
import { theme } from '../styles/theme';
import {
  Target,
  Plus,
  Edit,
  Trash2,
  X,
  ExternalLink,
  AlertCircle,
  Search,
  ArrowUp,
  ArrowDown,
  Wrench,
} from 'lucide-react';
import patternValidator from '../../../utils/patternValidator.js';

function TriggerPatterns() {
  const { user, logout, hasRole, isSiteAdmin } = useAuth();
  const [patterns, setPatterns] = useState([]);
  const [sequences, setSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('priority'); // priority, category, created_at
  const [sortOrder, setSortOrder] = useState('asc');
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingPattern, setEditingPattern] = useState(null);
  const [deletingPattern, setDeletingPattern] = useState(null);

  // Form state
  const [patternForm, setPatternForm] = useState({
    category_slug: '',
    pattern: '',
    flags: 'i',
    priority: 100,
    action_type: 'sequence',
    action_key: '',
    entry_step_id: '',
    van_makes: '',
    years: '',
    van_versions: '',
    is_active: true,
  });

  // Pattern validation state
  const [patternValidation, setPatternValidation] = useState({ valid: true, error: null, warning: null });

  useEffect(() => {
    const loadPatterns = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/patterns', {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch patterns');
        }

        const data = await response.json();
        setPatterns(data);
      } catch (err) {
        console.error('Error fetching patterns:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const loadSequences = async () => {
      try {
        const response = await fetch('/api/sequences', {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch sequences');
        }

        const data = await response.json();
        setSequences(data);
      } catch (err) {
        console.error('Error fetching sequences:', err);
      }
    };

    loadPatterns();
    loadSequences();
  }, []);

  const fetchPatterns = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/patterns', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch patterns');
      }

      const data = await response.json();
      setPatterns(data);
    } catch (err) {
      console.error('Error fetching patterns:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSequences = async () => {
    try {
      const response = await fetch('/api/sequences', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sequences');
      }

      const data = await response.json();
      setSequences(data);
    } catch (err) {
      console.error('Error fetching sequences:', err);
    }
  };

  const resetForm = () => {
    setPatternForm({
      category_slug: '',
      pattern: '',
      flags: 'i',
      priority: 100,
      action_type: 'sequence',
      action_key: '',
      entry_step_id: '',
      van_makes: '',
      years: '',
      van_versions: '',
      is_active: true,
    });
    setPatternValidation({ valid: true, error: null, warning: null });
  };

  // Validate pattern whenever it changes
  const validatePattern = (pattern, flags) => {
    if (!pattern) {
      setPatternValidation({ valid: true, error: null, warning: null });
      return;
    }

    try {
      // Test if pattern is valid regex
      new RegExp(pattern, flags);

      // Check for double-escaped sequences using imported validator
      const validation = patternValidator.validatePattern(pattern);
      if (validation.hasDoubleEscaping) {
        setPatternValidation({
          valid: true,
          error: null,
          warning: 'Pattern contains double-escaped sequences (e.g., \\\\b instead of \\b). This may not match as expected in PostgreSQL regex.'
        });
      } else {
        setPatternValidation({ valid: true, error: null, warning: null });
      }
    } catch (e) {
      setPatternValidation({
        valid: false,
        error: `Invalid regex pattern: ${e.message}`,
        warning: null
      });
    }
  };

  // Auto-fix double-escaping issues
  const handleAutoFix = useCallback(() => {
    setPatternForm(prev => {
      const fixedPattern = patternValidator.fixDoubleEscaping(prev.pattern);
      validatePattern(fixedPattern, prev.flags);
      return { ...prev, pattern: fixedPattern };
    });
  }, []);

  const handlePatternChange = useCallback((newPattern) => {
    setPatternForm(prev => {
      validatePattern(newPattern, prev.flags);
      return { ...prev, pattern: newPattern };
    });
  }, []);

  const handleFlagsChange = useCallback((newFlags) => {
    setPatternForm(prev => {
      validatePattern(prev.pattern, newFlags);
      return { ...prev, flags: newFlags };
    });
  }, []);

  const handleFormFieldChange = useCallback((field, value) => {
    setPatternForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const showSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleCreatePattern = async () => {
    // Validate pattern before submitting
    if (!patternValidation.valid) {
      setError('Please fix the pattern validation errors before saving');
      return;
    }

    try {
      const response = await fetch('/api/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...patternForm,
          priority: parseInt(patternForm.priority),
          entry_step_id: patternForm.entry_step_id || null,
          van_makes: patternForm.van_makes ? patternForm.van_makes.split(',').map(v => v.trim()) : null,
          years: patternForm.years ? patternForm.years.split(',').map(v => parseInt(v.trim())) : null,
          van_versions: patternForm.van_versions ? patternForm.van_versions.split(',').map(v => v.trim()) : null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create pattern');
      }

      await fetchPatterns();
      setCreateModalOpen(false);
      resetForm();
      showSuccess('Pattern created successfully');
    } catch (err) {
      console.error('Error creating pattern:', err);
      setError('Failed to create pattern');
    }
  };

  const handleUpdatePattern = async () => {
    // Validate pattern before submitting
    if (!patternValidation.valid) {
      setError('Please fix the pattern validation errors before saving');
      return;
    }

    try {
      const response = await fetch(`/api/patterns/${editingPattern.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...patternForm,
          priority: parseInt(patternForm.priority),
          entry_step_id: patternForm.entry_step_id || null,
          van_makes: patternForm.van_makes ? patternForm.van_makes.split(',').map(v => v.trim()) : null,
          years: patternForm.years ? patternForm.years.split(',').map(v => parseInt(v.trim())) : null,
          van_versions: patternForm.van_versions ? patternForm.van_versions.split(',').map(v => v.trim()) : null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update pattern');
      }

      await fetchPatterns();
      setEditModalOpen(false);
      setEditingPattern(null);
      resetForm();
      showSuccess('Pattern updated successfully');
    } catch (err) {
      console.error('Error updating pattern:', err);
      setError('Failed to update pattern');
    }
  };

  const handleDeletePattern = async () => {
    try {
      const response = await fetch(`/api/patterns/${deletingPattern.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete pattern');
      }

      await fetchPatterns();
      setDeleteModalOpen(false);
      setDeletingPattern(null);
      showSuccess('Pattern deleted successfully');
    } catch (err) {
      console.error('Error deleting pattern:', err);
      setError('Failed to delete pattern');
    }
  };

  const handleToggleActive = async (pattern) => {
    try {
      const response = await fetch(`/api/patterns/${pattern.id}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_active: !pattern.is_active }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle pattern');
      }

      await fetchPatterns();
      showSuccess(`Pattern ${!pattern.is_active ? 'activated' : 'deactivated'} successfully`);
    } catch (err) {
      console.error('Error toggling pattern:', err);
      setError('Failed to toggle pattern');
    }
  };

  const openEditModal = (pattern) => {
    setEditingPattern(pattern);
    const patternValue = pattern.pattern || '';
    const flagsValue = pattern.flags || 'i';

    setPatternForm({
      category_slug: pattern.category_slug || '',
      pattern: patternValue,
      flags: flagsValue,
      priority: pattern.priority || 100,
      action_type: pattern.action_type || 'sequence',
      action_key: pattern.action_key || '',
      entry_step_id: pattern.entry_step_id || '',
      van_makes: pattern.van_makes ? pattern.van_makes.join(', ') : '',
      years: pattern.years ? pattern.years.join(', ') : '',
      van_versions: pattern.van_versions ? pattern.van_versions.join(', ') : '',
      is_active: pattern.is_active,
    });

    // Validate the existing pattern
    validatePattern(patternValue, flagsValue);
    setEditModalOpen(true);
  };

  const openDeleteModal = (pattern) => {
    setDeletingPattern(pattern);
    setDeleteModalOpen(true);
  };

  const getCategoryColor = (category) => {
    const colors = {
      water: '#3b82f6',
      generator: '#f59e0b',
      grooming_equipment: '#8b5cf6',
      electrical: '#eab308',
      plumbing: '#06b6d4',
      hvac: '#ef4444',
    };
    return colors[category] || theme.colors.accent.primary;
  };

  const getPriorityBadgeColor = (priority) => {
    if (priority <= 10) return '#1e3a8a'; // Dark blue
    if (priority <= 50) return '#3b82f6'; // Medium blue
    return '#93c5fd'; // Light blue
  };

  const getSequenceName = (actionKey) => {
    const sequence = sequences.find(s => s.sequence_key === actionKey);
    return sequence?.display_name || actionKey;
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const filteredAndSortedPatterns = useMemo(() => {
    let filtered = [...patterns];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.pattern.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category_slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getSequenceName(p.action_key).toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by active only
    if (showActiveOnly) {
      filtered = filtered.filter(p => p.is_active);
    }

    // Sort
    filtered.sort((a, b) => {
      let compareA, compareB;

      if (sortBy === 'priority') {
        compareA = a.priority;
        compareB = b.priority;
      } else if (sortBy === 'category') {
        compareA = a.category_slug;
        compareB = b.category_slug;
      } else if (sortBy === 'created_at') {
        compareA = new Date(a.created_at);
        compareB = new Date(b.created_at);
      }

      if (sortOrder === 'asc') {
        return compareA > compareB ? 1 : -1;
      } else {
        return compareA < compareB ? 1 : -1;
      }
    });

    return filtered;
  }, [patterns, searchQuery, showActiveOnly, sortBy, sortOrder, sequences]);

  const PatternFormFields = useMemo(() => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.lg }}>
      <div>
        <label style={{
          display: 'block',
          fontSize: theme.fontSize.sm,
          fontWeight: theme.fontWeight.medium,
          color: theme.colors.text.primary,
          marginBottom: theme.spacing.xs,
        }}>
          Priority <span style={{ color: theme.colors.accent.danger }}>*</span>
        </label>
        <input
          key="priority-field"
          type="number"
          value={patternForm.priority}
          onChange={(e) => handleFormFieldChange('priority', e.target.value)}
          style={{
            width: '100%',
            padding: theme.spacing.sm,
            border: `1px solid ${theme.colors.border.medium}`,
            borderRadius: theme.radius.md,
            fontSize: theme.fontSize.sm,
          }}
        />
        <div style={{
          fontSize: theme.fontSize.xs,
          color: theme.colors.text.tertiary,
          marginTop: theme.spacing.xs,
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.xs,
        }}>
          <AlertCircle size={12} />
          Lower number = higher priority (matched first)
        </div>
      </div>

      <div>
        <label style={{
          display: 'block',
          fontSize: theme.fontSize.sm,
          fontWeight: theme.fontWeight.medium,
          color: theme.colors.text.primary,
          marginBottom: theme.spacing.xs,
        }}>
          Category Slug <span style={{ color: theme.colors.accent.danger }}>*</span>
        </label>
        <input
          type="text"
          value={patternForm.category_slug}
          onChange={(e) => handleFormFieldChange('category_slug', e.target.value)}
          placeholder="e.g., water, generator, grooming_equipment"
          style={{
            width: '100%',
            padding: theme.spacing.sm,
            border: `1px solid ${theme.colors.border.medium}`,
            borderRadius: theme.radius.md,
            fontSize: theme.fontSize.sm,
          }}
        />
      </div>

      <div>
        <label style={{
          display: 'block',
          fontSize: theme.fontSize.sm,
          fontWeight: theme.fontWeight.medium,
          color: theme.colors.text.primary,
          marginBottom: theme.spacing.xs,
        }}>
          Pattern <span style={{ color: theme.colors.accent.danger }}>*</span>
        </label>
        <textarea
          key="pattern-field"
          value={patternForm.pattern}
          onChange={(e) => handlePatternChange(e.target.value)}
          placeholder="e.g., (?i)\bdryer\b.*(not|won't).*work"
          rows={3}
          style={{
            width: '100%',
            padding: theme.spacing.sm,
            border: `1px solid ${patternValidation.valid ? theme.colors.border.medium : theme.colors.accent.danger}`,
            borderRadius: theme.radius.md,
            fontSize: theme.fontSize.sm,
            fontFamily: 'monospace',
          }}
        />
        {patternValidation.error && (
          <div style={{
            fontSize: theme.fontSize.xs,
            color: theme.colors.accent.danger,
            marginTop: theme.spacing.xs,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.xs,
          }}>
            <AlertCircle size={12} />
            {patternValidation.error}
          </div>
        )}
        {patternValidation.warning && (
          <div style={{
            marginTop: theme.spacing.xs,
            padding: theme.spacing.sm,
            backgroundColor: theme.colors.accent.warning + '10',
            borderRadius: theme.radius.md,
            border: `1px solid ${theme.colors.accent.warning}40`,
          }}>
            <div style={{
              fontSize: theme.fontSize.xs,
              color: theme.colors.accent.warning,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
              marginBottom: theme.spacing.xs,
            }}>
              <AlertCircle size={12} />
              {patternValidation.warning}
            </div>
            <button
              onClick={handleAutoFix}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                backgroundColor: theme.colors.accent.warning,
                color: '#ffffff',
                border: 'none',
                borderRadius: theme.radius.sm,
                fontSize: theme.fontSize.xs,
                fontWeight: theme.fontWeight.medium,
                cursor: 'pointer',
              }}
            >
              <Wrench size={12} />
              Auto-Fix Pattern
            </button>
          </div>
        )}
        {!patternValidation.error && !patternValidation.warning && (
          <div style={{
            fontSize: theme.fontSize.xs,
            color: theme.colors.text.tertiary,
            marginTop: theme.spacing.xs,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.xs,
          }}>
            <AlertCircle size={12} />
            PostgreSQL regex pattern. Use \b for word boundaries, \d for digits, \s for whitespace.
          </div>
        )}
      </div>

      <div>
        <label style={{
          display: 'block',
          fontSize: theme.fontSize.sm,
          fontWeight: theme.fontWeight.medium,
          color: theme.colors.text.primary,
          marginBottom: theme.spacing.xs,
        }}>
          Regex Flags
        </label>
        <input
          type="text"
          value={patternForm.flags}
          onChange={(e) => handleFlagsChange(e.target.value)}
          placeholder="i"
          style={{
            width: '100%',
            padding: theme.spacing.sm,
            border: `1px solid ${theme.colors.border.medium}`,
            borderRadius: theme.radius.md,
            fontSize: theme.fontSize.sm,
          }}
        />
        <div style={{
          fontSize: theme.fontSize.xs,
          color: theme.colors.text.tertiary,
          marginTop: theme.spacing.xs,
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.xs,
        }}>
          <AlertCircle size={12} />
          PostgreSQL regex flags. Use 'i' for case-insensitive matching.
        </div>
      </div>

      <div>
        <label style={{
          display: 'block',
          fontSize: theme.fontSize.sm,
          fontWeight: theme.fontWeight.medium,
          color: theme.colors.text.primary,
          marginBottom: theme.spacing.xs,
        }}>
          Triggers Sequence <span style={{ color: theme.colors.accent.danger }}>*</span>
        </label>
        <select
          value={patternForm.action_key}
          onChange={(e) => handleFormFieldChange('action_key', e.target.value)}
          style={{
            width: '100%',
            padding: theme.spacing.sm,
            border: `1px solid ${theme.colors.border.medium}`,
            borderRadius: theme.radius.md,
            fontSize: theme.fontSize.sm,
          }}
        >
          <option value="">Select a sequence...</option>
          {sequences.map(seq => (
            <option key={seq.sequence_key} value={seq.sequence_key}>
              {seq.display_name || seq.sequence_key}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label style={{
          display: 'block',
          fontSize: theme.fontSize.sm,
          fontWeight: theme.fontWeight.medium,
          color: theme.colors.text.primary,
          marginBottom: theme.spacing.xs,
        }}>
          Entry Step (Optional)
        </label>
        <input
          type="text"
          value={patternForm.entry_step_id}
          onChange={(e) => handleFormFieldChange('entry_step_id', e.target.value)}
          placeholder="Leave empty to start at step 1"
          style={{
            width: '100%',
            padding: theme.spacing.sm,
            border: `1px solid ${theme.colors.border.medium}`,
            borderRadius: theme.radius.md,
            fontSize: theme.fontSize.sm,
          }}
        />
      </div>

      <div>
        <label style={{
          display: 'block',
          fontSize: theme.fontSize.sm,
          fontWeight: theme.fontWeight.medium,
          color: theme.colors.text.primary,
          marginBottom: theme.spacing.xs,
        }}>
          Van Makes (Optional)
        </label>
        <input
          type="text"
          value={patternForm.van_makes}
          onChange={(e) => handleFormFieldChange('van_makes', e.target.value)}
          placeholder="e.g., Ford, Mercedes, Dodge"
          style={{
            width: '100%',
            padding: theme.spacing.sm,
            border: `1px solid ${theme.colors.border.medium}`,
            borderRadius: theme.radius.md,
            fontSize: theme.fontSize.sm,
          }}
        />
        <div style={{
          fontSize: theme.fontSize.xs,
          color: theme.colors.text.tertiary,
          marginTop: theme.spacing.xs,
        }}>
          Comma-separated list
        </div>
      </div>

      <div>
        <label style={{
          display: 'block',
          fontSize: theme.fontSize.sm,
          fontWeight: theme.fontWeight.medium,
          color: theme.colors.text.primary,
          marginBottom: theme.spacing.xs,
        }}>
          Van Versions (Optional)
        </label>
        <input
          type="text"
          value={patternForm.van_versions}
          onChange={(e) => handleFormFieldChange('van_versions', e.target.value)}
          placeholder="e.g., Transit, Sprinter, ProMaster"
          style={{
            width: '100%',
            padding: theme.spacing.sm,
            border: `1px solid ${theme.colors.border.medium}`,
            borderRadius: theme.radius.md,
            fontSize: theme.fontSize.sm,
          }}
        />
        <div style={{
          fontSize: theme.fontSize.xs,
          color: theme.colors.text.tertiary,
          marginTop: theme.spacing.xs,
        }}>
          Comma-separated list
        </div>
      </div>

      <div>
        <label style={{
          display: 'block',
          fontSize: theme.fontSize.sm,
          fontWeight: theme.fontWeight.medium,
          color: theme.colors.text.primary,
          marginBottom: theme.spacing.xs,
        }}>
          Years (Optional)
        </label>
        <input
          type="text"
          value={patternForm.years}
          onChange={(e) => handleFormFieldChange('years', e.target.value)}
          placeholder="e.g., 2020, 2021, 2022"
          style={{
            width: '100%',
            padding: theme.spacing.sm,
            border: `1px solid ${theme.colors.border.medium}`,
            borderRadius: theme.radius.md,
            fontSize: theme.fontSize.sm,
          }}
        />
        <div style={{
          fontSize: theme.fontSize.xs,
          color: theme.colors.text.tertiary,
          marginTop: theme.spacing.xs,
        }}>
          Comma-separated list of years
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
        <input
          type="checkbox"
          id="is_active"
          checked={patternForm.is_active}
          onChange={(e) => handleFormFieldChange('is_active', e.target.checked)}
          style={{ width: '16px', height: '16px' }}
        />
        <label htmlFor="is_active" style={{
          fontSize: theme.fontSize.sm,
          color: theme.colors.text.primary,
          cursor: 'pointer',
        }}>
          Active
        </label>
      </div>
    </div>
  ), [patternForm, patternValidation, sequences, handlePatternChange, handleFlagsChange, handleAutoFix, handleFormFieldChange]);

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: theme.colors.background.primary }}>
        <Sidebar user={user} onLogout={logout} hasRole={hasRole} isSiteAdmin={isSiteAdmin} />
        <div style={{ marginLeft: '260px', flex: 1, padding: theme.spacing['2xl'] }}>
          <div style={{ textAlign: 'center', padding: theme.spacing['2xl'] }}>
            <p style={{ color: theme.colors.text.secondary }}>Loading patterns...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: theme.colors.background.primary }}>
      <Sidebar user={user} onLogout={logout} hasRole={hasRole} isSiteAdmin={isSiteAdmin} />

      <div style={{ marginLeft: '260px', flex: 1, padding: theme.spacing['2xl'] }}>
        {/* Success Message */}
        {success && (
          <div style={{
            backgroundColor: theme.colors.status.success + '20',
            color: theme.colors.status.success,
            padding: theme.spacing.md,
            borderRadius: theme.radius.md,
            marginBottom: theme.spacing.lg,
            border: `1px solid ${theme.colors.status.success}`,
          }}>
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{
            backgroundColor: theme.colors.accent.danger + '20',
            color: theme.colors.accent.danger,
            padding: theme.spacing.md,
            borderRadius: theme.radius.md,
            marginBottom: theme.spacing.lg,
            border: `1px solid ${theme.colors.accent.danger}`,
          }}>
            {error}
          </div>
        )}

        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: theme.spacing.xl,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md, marginBottom: theme.spacing.xs }}>
              <Target size={32} color={theme.colors.accent.primary} strokeWidth={2} />
              <h1 style={{
                fontSize: theme.fontSize['4xl'],
                fontWeight: theme.fontWeight.bold,
                color: theme.colors.text.primary,
                margin: 0,
              }}>
                Trigger Patterns
              </h1>
            </div>
            <p style={{ color: theme.colors.text.secondary, fontSize: theme.fontSize.base, margin: 0 }}>
              Manage regex patterns that trigger troubleshooting sequences
            </p>
          </div>

          <button
            onClick={() => {
              resetForm();
              setCreateModalOpen(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm,
              padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
              backgroundColor: theme.colors.accent.primary,
              color: '#ffffff',
              border: 'none',
              borderRadius: theme.radius.md,
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.medium,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.accent.secondary}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.colors.accent.primary}
          >
            <Plus size={20} />
            Create New Pattern
          </button>
        </div>

        {/* Search and Filters */}
        <div style={{
          display: 'flex',
          gap: theme.spacing.md,
          marginBottom: theme.spacing.lg,
          flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: '300px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={20} style={{
                position: 'absolute',
                left: theme.spacing.sm,
                top: '50%',
                transform: 'translateY(-50%)',
                color: theme.colors.text.tertiary,
              }} />
              <input
                type="text"
                placeholder="Search patterns, categories, or sequences..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: `${theme.spacing.sm} ${theme.spacing.sm} ${theme.spacing.sm} 40px`,
                  border: `1px solid ${theme.colors.border.medium}`,
                  borderRadius: theme.radius.md,
                  fontSize: theme.fontSize.sm,
                }}
              />
            </div>
          </div>

          <button
            onClick={() => setShowActiveOnly(!showActiveOnly)}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
              backgroundColor: showActiveOnly ? theme.colors.accent.primary : 'transparent',
              color: showActiveOnly ? '#ffffff' : theme.colors.text.secondary,
              border: `1px solid ${showActiveOnly ? theme.colors.accent.primary : theme.colors.border.medium}`,
              borderRadius: theme.radius.md,
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.medium,
              cursor: 'pointer',
            }}
          >
            {showActiveOnly ? 'Show All' : 'Active Only'}
          </button>
        </div>

        {/* Patterns Table */}
        <Card>
          {filteredAndSortedPatterns.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: theme.spacing['2xl'],
              color: theme.colors.text.secondary,
            }}>
              <Target size={48} style={{ marginBottom: theme.spacing.md, opacity: 0.3 }} />
              <p style={{ fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.medium }}>
                No patterns found
              </p>
              <p style={{ fontSize: theme.fontSize.sm }}>
                {searchQuery || showActiveOnly ? 'Try adjusting your filters' : 'Create your first pattern to get started'}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${theme.colors.border.medium}` }}>
                    <th style={{
                      padding: theme.spacing.md,
                      textAlign: 'left',
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.semibold,
                      color: theme.colors.text.secondary,
                      cursor: 'pointer',
                    }} onClick={() => handleSort('priority')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
                        Priority
                        {sortBy === 'priority' && (sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                      </div>
                    </th>
                    <th style={{
                      padding: theme.spacing.md,
                      textAlign: 'left',
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.semibold,
                      color: theme.colors.text.secondary,
                    }}>
                      Pattern
                    </th>
                    <th style={{
                      padding: theme.spacing.md,
                      textAlign: 'left',
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.semibold,
                      color: theme.colors.text.secondary,
                      cursor: 'pointer',
                    }} onClick={() => handleSort('category')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
                        Category
                        {sortBy === 'category' && (sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                      </div>
                    </th>
                    <th style={{
                      padding: theme.spacing.md,
                      textAlign: 'left',
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.semibold,
                      color: theme.colors.text.secondary,
                    }}>
                      Triggers Sequence
                    </th>
                    <th style={{
                      padding: theme.spacing.md,
                      textAlign: 'left',
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.semibold,
                      color: theme.colors.text.secondary,
                    }}>
                      Flags
                    </th>
                    <th style={{
                      padding: theme.spacing.md,
                      textAlign: 'left',
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.semibold,
                      color: theme.colors.text.secondary,
                    }}>
                      Status
                    </th>
                    <th style={{
                      padding: theme.spacing.md,
                      textAlign: 'right',
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.semibold,
                      color: theme.colors.text.secondary,
                    }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedPatterns.map((pattern) => (
                    <tr key={pattern.id} style={{
                      borderBottom: `1px solid ${theme.colors.border.light}`,
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.background.tertiary}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: theme.spacing.md }}>
                        <span style={{
                          display: 'inline-block',
                          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                          backgroundColor: getPriorityBadgeColor(pattern.priority),
                          color: '#ffffff',
                          borderRadius: theme.radius.md,
                          fontSize: theme.fontSize.xs,
                          fontWeight: theme.fontWeight.semibold,
                        }}>
                          {pattern.priority}
                        </span>
                      </td>
                      <td style={{ padding: theme.spacing.md }}>
                        <div style={{
                          fontFamily: 'monospace',
                          fontSize: theme.fontSize.sm,
                          color: theme.colors.text.primary,
                          maxWidth: '300px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }} title={pattern.pattern}>
                          {pattern.pattern}
                        </div>
                      </td>
                      <td style={{ padding: theme.spacing.md }}>
                        <span style={{
                          display: 'inline-block',
                          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                          backgroundColor: getCategoryColor(pattern.category_slug) + '20',
                          color: getCategoryColor(pattern.category_slug),
                          borderRadius: theme.radius.md,
                          fontSize: theme.fontSize.xs,
                          fontWeight: theme.fontWeight.medium,
                        }}>
                          {pattern.category_slug}
                        </span>
                      </td>
                      <td style={{ padding: theme.spacing.md }}>
                        <a
                          href={`/sequences/${pattern.action_key}`}
                          style={{
                            color: theme.colors.accent.primary,
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: theme.spacing.xs,
                            fontSize: theme.fontSize.sm,
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                          onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                        >
                          {getSequenceName(pattern.action_key)}
                          <ExternalLink size={14} />
                        </a>
                      </td>
                      <td style={{ padding: theme.spacing.md }}>
                        <span style={{
                          fontSize: theme.fontSize.xs,
                          color: theme.colors.text.tertiary,
                          fontFamily: 'monospace',
                        }}>
                          {pattern.flags || 'none'}
                        </span>
                      </td>
                      <td style={{ padding: theme.spacing.md }}>
                        <button
                          onClick={() => handleToggleActive(pattern)}
                          style={{
                            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                            backgroundColor: pattern.is_active ? theme.colors.status.success + '20' : theme.colors.text.tertiary + '20',
                            color: pattern.is_active ? theme.colors.status.success : theme.colors.text.tertiary,
                            border: 'none',
                            borderRadius: theme.radius.md,
                            fontSize: theme.fontSize.xs,
                            fontWeight: theme.fontWeight.medium,
                            cursor: 'pointer',
                          }}
                        >
                          {pattern.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td style={{ padding: theme.spacing.md, textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: theme.spacing.xs, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => openEditModal(pattern)}
                            style={{
                              padding: theme.spacing.sm,
                              backgroundColor: 'transparent',
                              color: theme.colors.text.secondary,
                              border: `1px solid ${theme.colors.border.medium}`,
                              borderRadius: theme.radius.md,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Edit pattern"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => openDeleteModal(pattern)}
                            style={{
                              padding: theme.spacing.sm,
                              backgroundColor: 'transparent',
                              color: theme.colors.accent.danger,
                              border: `1px solid ${theme.colors.accent.danger}`,
                              borderRadius: theme.radius.md,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Delete pattern"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Create Pattern Modal */}
        {createModalOpen && (
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
            zIndex: 1000,
          }} onClick={() => setCreateModalOpen(false)}>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: theme.radius.lg,
              width: '90%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflow: 'auto',
            }} onClick={(e) => e.stopPropagation()}>
              <div style={{
                padding: theme.spacing.xl,
                borderBottom: `1px solid ${theme.colors.border.light}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <h2 style={{
                  margin: 0,
                  fontSize: theme.fontSize['2xl'],
                  fontWeight: theme.fontWeight.bold,
                  color: theme.colors.text.primary,
                }}>
                  Create New Pattern
                </h2>
                <button
                  onClick={() => setCreateModalOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: theme.spacing.xs,
                    color: theme.colors.text.secondary,
                  }}
                >
                  <X size={24} />
                </button>
              </div>

              <div style={{ padding: theme.spacing.xl }}>
                {PatternFormFields}

                <div style={{
                  display: 'flex',
                  gap: theme.spacing.md,
                  marginTop: theme.spacing.xl,
                }}>
                  <button
                    onClick={handleCreatePattern}
                    style={{
                      flex: 1,
                      padding: theme.spacing.md,
                      backgroundColor: theme.colors.accent.primary,
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: theme.radius.md,
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.medium,
                      cursor: 'pointer',
                    }}
                  >
                    Create Pattern
                  </button>
                  <button
                    onClick={() => setCreateModalOpen(false)}
                    style={{
                      flex: 1,
                      padding: theme.spacing.md,
                      backgroundColor: 'transparent',
                      color: theme.colors.text.secondary,
                      border: `1px solid ${theme.colors.border.medium}`,
                      borderRadius: theme.radius.md,
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.medium,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Pattern Modal */}
        {editModalOpen && editingPattern && (
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
            zIndex: 1000,
          }} onClick={() => setEditModalOpen(false)}>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: theme.radius.lg,
              width: '90%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflow: 'auto',
            }} onClick={(e) => e.stopPropagation()}>
              <div style={{
                padding: theme.spacing.xl,
                borderBottom: `1px solid ${theme.colors.border.light}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <h2 style={{
                  margin: 0,
                  fontSize: theme.fontSize['2xl'],
                  fontWeight: theme.fontWeight.bold,
                  color: theme.colors.text.primary,
                }}>
                  Edit Pattern
                </h2>
                <button
                  onClick={() => setEditModalOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: theme.spacing.xs,
                    color: theme.colors.text.secondary,
                  }}
                >
                  <X size={24} />
                </button>
              </div>

              <div style={{ padding: theme.spacing.xl }}>
                {PatternFormFields}

                <div style={{
                  display: 'flex',
                  gap: theme.spacing.md,
                  marginTop: theme.spacing.xl,
                }}>
                  <button
                    onClick={handleUpdatePattern}
                    style={{
                      flex: 1,
                      padding: theme.spacing.md,
                      backgroundColor: theme.colors.accent.primary,
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: theme.radius.md,
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.medium,
                      cursor: 'pointer',
                    }}
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setEditModalOpen(false);
                      openDeleteModal(editingPattern);
                    }}
                    style={{
                      padding: theme.spacing.md,
                      backgroundColor: 'transparent',
                      color: theme.colors.accent.danger,
                      border: `1px solid ${theme.colors.accent.danger}`,
                      borderRadius: theme.radius.md,
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.medium,
                      cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setEditModalOpen(false)}
                    style={{
                      flex: 1,
                      padding: theme.spacing.md,
                      backgroundColor: 'transparent',
                      color: theme.colors.text.secondary,
                      border: `1px solid ${theme.colors.border.medium}`,
                      borderRadius: theme.radius.md,
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.medium,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && deletingPattern && (
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
            zIndex: 1000,
          }} onClick={() => setDeleteModalOpen(false)}>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: theme.radius.lg,
              width: '90%',
              maxWidth: '500px',
              padding: theme.spacing.xl,
            }} onClick={(e) => e.stopPropagation()}>
              <h2 style={{
                margin: 0,
                marginBottom: theme.spacing.md,
                fontSize: theme.fontSize.xl,
                fontWeight: theme.fontWeight.bold,
                color: theme.colors.text.primary,
              }}>
                Delete Pattern?
              </h2>

              <p style={{
                margin: 0,
                marginBottom: theme.spacing.lg,
                color: theme.colors.text.secondary,
                fontSize: theme.fontSize.sm,
              }}>
                Are you sure you want to delete the pattern <strong style={{ fontFamily: 'monospace' }}>"{deletingPattern.pattern}"</strong>?
              </p>

              <div style={{
                padding: theme.spacing.md,
                backgroundColor: theme.colors.background.tertiary,
                borderRadius: theme.radius.md,
                marginBottom: theme.spacing.lg,
              }}>
                <p style={{ margin: 0, fontSize: theme.fontSize.sm, color: theme.colors.text.secondary }}>
                  <strong>Triggers:</strong> {getSequenceName(deletingPattern.action_key)}
                </p>
                <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: theme.fontSize.sm, color: theme.colors.text.secondary }}>
                  <strong>Category:</strong> {deletingPattern.category_slug}
                </p>
              </div>

              <p style={{
                margin: 0,
                marginBottom: theme.spacing.xl,
                color: theme.colors.accent.danger,
                fontSize: theme.fontSize.sm,
                fontWeight: theme.fontWeight.medium,
              }}>
                This action cannot be undone.
              </p>

              <div style={{ display: 'flex', gap: theme.spacing.md }}>
                <button
                  onClick={handleDeletePattern}
                  style={{
                    flex: 1,
                    padding: theme.spacing.md,
                    backgroundColor: theme.colors.accent.danger,
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: theme.radius.md,
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    cursor: 'pointer',
                  }}
                >
                  Delete Pattern
                </button>
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: theme.spacing.md,
                    backgroundColor: 'transparent',
                    color: theme.colors.text.secondary,
                    border: `1px solid ${theme.colors.border.medium}`,
                    borderRadius: theme.radius.md,
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TriggerPatterns;
