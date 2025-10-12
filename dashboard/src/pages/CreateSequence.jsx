import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import Sidebar from '../components/Sidebar';
import Card from '../components/Card';
import Badge from '../components/Badge';
import { theme } from '../styles/theme';
import { Plus, FileText, AlertCircle, X, Loader } from 'lucide-react';

function CreateSequence() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    sequenceKey: '',
    displayName: '',
    description: '',
    category: '',
    messageTemplate: '',
    docUrl: '',
    docTitle: '',
    successTriggers: '',
    failureTriggers: '',
  });

  // UI state
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [loading, setLoading] = useState(false);

  // Parse comma-separated triggers into array of badges
  const parseTriggers = (value) => {
    return value
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
  };

  const successTriggerList = parseTriggers(formData.successTriggers);
  const failureTriggerList = parseTriggers(formData.failureTriggers);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    if (globalError) {
      setGlobalError('');
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate sequence key
    if (!formData.sequenceKey) {
      newErrors.sequenceKey = 'Sequence key is required';
    } else if (!/^[a-z0-9_]+$/.test(formData.sequenceKey)) {
      newErrors.sequenceKey = 'Sequence key must be lowercase with underscores only';
    }

    // Validate display name
    if (!formData.displayName) {
      newErrors.displayName = 'Display name is required';
    }

    // Validate description
    if (!formData.description) {
      newErrors.description = 'Description is required';
    }

    // Validate category
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    // Validate message template
    if (!formData.messageTemplate) {
      newErrors.messageTemplate = 'Message template is required';
    }

    // Validate document URL
    if (!formData.docUrl) {
      newErrors.docUrl = 'Document URL is required';
    } else if (!/^https?:\/\/.+/.test(formData.docUrl)) {
      newErrors.docUrl = 'Please enter a valid URL starting with http:// or https://';
    }

    // Validate document title
    if (!formData.docTitle) {
      newErrors.docTitle = 'Document title is required';
    }

    // Validate success triggers
    if (successTriggerList.length === 0) {
      newErrors.successTriggers = 'At least one success trigger is required';
    }

    // Validate failure triggers
    if (failureTriggerList.length === 0) {
      newErrors.failureTriggers = 'At least one failure trigger is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      setGlobalError('Please fix the errors below before submitting');
      return;
    }

    setLoading(true);
    setGlobalError('');

    try {
      const response = await fetch('/api/sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          key: formData.sequenceKey,
          name: formData.displayName,
          description: formData.description,
          category: formData.category,
          first_step: {
            message: formData.messageTemplate,
            doc_url: formData.docUrl,
            doc_title: formData.docTitle,
            success_triggers: successTriggerList,
            failure_triggers: failureTriggerList,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create sequence');
      }

      const data = await response.json();

      // Success - redirect to the new sequence detail page
      navigate(`/sequences/${formData.sequenceKey}`);
    } catch (error) {
      console.error('Error creating sequence:', error);
      setGlobalError(error.message || 'Failed to create sequence. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/sequences');
  };

  const removeTrigger = (field, triggerToRemove) => {
    const currentTriggers = parseTriggers(formData[field]);
    const updatedTriggers = currentTriggers.filter(t => t !== triggerToRemove);
    handleInputChange(field, updatedTriggers.join(', '));
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: theme.colors.background.primary }}>
      <Sidebar user={user} onLogout={logout} hasRole={hasRole} />

      <div style={{ marginLeft: '260px', flex: 1, padding: theme.spacing['2xl'] }}>
        {/* Header */}
        <div style={{ marginBottom: theme.spacing['2xl'] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md, marginBottom: theme.spacing.xs }}>
            <Plus size={32} color={theme.colors.accent.primary} strokeWidth={2} />
            <h1
              style={{
                fontSize: theme.fontSize['4xl'],
                fontWeight: theme.fontWeight.bold,
                color: theme.colors.text.primary,
                margin: 0,
              }}
            >
              Create New Sequence
            </h1>
          </div>
          <p style={{ color: theme.colors.text.secondary, fontSize: theme.fontSize.base, margin: 0 }}>
            Define a new troubleshooting sequence with its first step
          </p>
        </div>

        {/* Global Error Message */}
        {globalError && (
          <div
            style={{
              marginBottom: theme.spacing.lg,
              padding: theme.spacing.md,
              backgroundColor: '#fee2e2',
              border: `1px solid ${theme.colors.accent.danger}`,
              borderRadius: theme.radius.md,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm,
            }}
          >
            <AlertCircle size={20} color={theme.colors.accent.danger} />
            <span style={{ color: theme.colors.accent.danger, fontSize: theme.fontSize.base }}>
              {globalError}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Section 1: Sequence Metadata */}
          <Card title="Sequence Metadata" style={{ marginBottom: theme.spacing.lg }}>
            <div style={{ display: 'grid', gap: theme.spacing.lg }}>
              {/* Sequence Key */}
              <div>
                <label
                  htmlFor="sequenceKey"
                  style={{
                    display: 'block',
                    marginBottom: theme.spacing.xs,
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    color: theme.colors.text.primary,
                  }}
                >
                  Sequence Key <span style={{ color: theme.colors.accent.danger }}>*</span>
                </label>
                <input
                  id="sequenceKey"
                  type="text"
                  value={formData.sequenceKey}
                  onChange={(e) => handleInputChange('sequenceKey', e.target.value)}
                  placeholder="dryer_no_power"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    border: `1px solid ${errors.sequenceKey ? theme.colors.accent.danger : theme.colors.border.light}`,
                    borderRadius: theme.radius.md,
                    fontSize: theme.fontSize.base,
                    color: theme.colors.text.primary,
                    backgroundColor: loading ? theme.colors.background.tertiary : theme.colors.background.primary,
                    outline: 'none',
                    fontFamily: 'monospace',
                  }}
                  onFocus={(e) => !errors.sequenceKey && (e.target.style.borderColor = theme.colors.accent.primary)}
                  onBlur={(e) => (e.target.style.borderColor = errors.sequenceKey ? theme.colors.accent.danger : theme.colors.border.light)}
                />
                {errors.sequenceKey ? (
                  <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: theme.fontSize.sm, color: theme.colors.accent.danger }}>
                    {errors.sequenceKey}
                  </p>
                ) : (
                  <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: theme.fontSize.sm, color: theme.colors.text.tertiary }}>
                    Lowercase letters, numbers, and underscores only (e.g., dryer_no_power)
                  </p>
                )}
              </div>

              {/* Display Name */}
              <div>
                <label
                  htmlFor="displayName"
                  style={{
                    display: 'block',
                    marginBottom: theme.spacing.xs,
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    color: theme.colors.text.primary,
                  }}
                >
                  Display Name <span style={{ color: theme.colors.accent.danger }}>*</span>
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  placeholder="Dryer - No Power"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    border: `1px solid ${errors.displayName ? theme.colors.accent.danger : theme.colors.border.light}`,
                    borderRadius: theme.radius.md,
                    fontSize: theme.fontSize.base,
                    color: theme.colors.text.primary,
                    backgroundColor: loading ? theme.colors.background.tertiary : theme.colors.background.primary,
                    outline: 'none',
                  }}
                  onFocus={(e) => !errors.displayName && (e.target.style.borderColor = theme.colors.accent.primary)}
                  onBlur={(e) => (e.target.style.borderColor = errors.displayName ? theme.colors.accent.danger : theme.colors.border.light)}
                />
                {errors.displayName && (
                  <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: theme.fontSize.sm, color: theme.colors.accent.danger }}>
                    {errors.displayName}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  style={{
                    display: 'block',
                    marginBottom: theme.spacing.xs,
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    color: theme.colors.text.primary,
                  }}
                >
                  Description <span style={{ color: theme.colors.accent.danger }}>*</span>
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Troubleshooting steps for dryers with no power"
                  rows={3}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    border: `1px solid ${errors.description ? theme.colors.accent.danger : theme.colors.border.light}`,
                    borderRadius: theme.radius.md,
                    fontSize: theme.fontSize.base,
                    color: theme.colors.text.primary,
                    backgroundColor: loading ? theme.colors.background.tertiary : theme.colors.background.primary,
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                  onFocus={(e) => !errors.description && (e.target.style.borderColor = theme.colors.accent.primary)}
                  onBlur={(e) => (e.target.style.borderColor = errors.description ? theme.colors.accent.danger : theme.colors.border.light)}
                />
                {errors.description && (
                  <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: theme.fontSize.sm, color: theme.colors.accent.danger }}>
                    {errors.description}
                  </p>
                )}
              </div>

              {/* Category */}
              <div>
                <label
                  htmlFor="category"
                  style={{
                    display: 'block',
                    marginBottom: theme.spacing.xs,
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    color: theme.colors.text.primary,
                  }}
                >
                  Category <span style={{ color: theme.colors.accent.danger }}>*</span>
                </label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    border: `1px solid ${errors.category ? theme.colors.accent.danger : theme.colors.border.light}`,
                    borderRadius: theme.radius.md,
                    fontSize: theme.fontSize.base,
                    color: formData.category ? theme.colors.text.primary : theme.colors.text.tertiary,
                    backgroundColor: loading ? theme.colors.background.tertiary : theme.colors.background.primary,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                  onFocus={(e) => !errors.category && (e.target.style.borderColor = theme.colors.accent.primary)}
                  onBlur={(e) => (e.target.style.borderColor = errors.category ? theme.colors.accent.danger : theme.colors.border.light)}
                >
                  <option value="">Select a category...</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Plumbing">Plumbing</option>
                  <option value="HVAC">HVAC</option>
                  <option value="Appliances">Appliances</option>
                  <option value="Mechanical">Mechanical</option>
                  <option value="Other">Other</option>
                </select>
                {errors.category && (
                  <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: theme.fontSize.sm, color: theme.colors.accent.danger }}>
                    {errors.category}
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Section 2: First Step */}
          <Card title="First Step" style={{ marginBottom: theme.spacing.lg }}>
            <div style={{ display: 'grid', gap: theme.spacing.lg }}>
              {/* Message Template */}
              <div>
                <label
                  htmlFor="messageTemplate"
                  style={{
                    display: 'block',
                    marginBottom: theme.spacing.xs,
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    color: theme.colors.text.primary,
                  }}
                >
                  Message Template <span style={{ color: theme.colors.accent.danger }}>*</span>
                </label>
                <textarea
                  id="messageTemplate"
                  value={formData.messageTemplate}
                  onChange={(e) => handleInputChange('messageTemplate', e.target.value)}
                  placeholder="Let's check the power. First, verify the outlet: {url}"
                  rows={4}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    border: `1px solid ${errors.messageTemplate ? theme.colors.accent.danger : theme.colors.border.light}`,
                    borderRadius: theme.radius.md,
                    fontSize: theme.fontSize.base,
                    color: theme.colors.text.primary,
                    backgroundColor: loading ? theme.colors.background.tertiary : theme.colors.background.primary,
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                  onFocus={(e) => !errors.messageTemplate && (e.target.style.borderColor = theme.colors.accent.primary)}
                  onBlur={(e) => (e.target.style.borderColor = errors.messageTemplate ? theme.colors.accent.danger : theme.colors.border.light)}
                />
                {errors.messageTemplate ? (
                  <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: theme.fontSize.sm, color: theme.colors.accent.danger }}>
                    {errors.messageTemplate}
                  </p>
                ) : (
                  <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: theme.fontSize.sm, color: theme.colors.text.tertiary }}>
                    Use {'{url}'} placeholder for the document link
                  </p>
                )}
              </div>

              {/* Document URL */}
              <div>
                <label
                  htmlFor="docUrl"
                  style={{
                    display: 'block',
                    marginBottom: theme.spacing.xs,
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    color: theme.colors.text.primary,
                  }}
                >
                  Document URL <span style={{ color: theme.colors.accent.danger }}>*</span>
                </label>
                <input
                  id="docUrl"
                  type="url"
                  value={formData.docUrl}
                  onChange={(e) => handleInputChange('docUrl', e.target.value)}
                  placeholder="https://docs.example.com/dryer-power"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    border: `1px solid ${errors.docUrl ? theme.colors.accent.danger : theme.colors.border.light}`,
                    borderRadius: theme.radius.md,
                    fontSize: theme.fontSize.base,
                    color: theme.colors.text.primary,
                    backgroundColor: loading ? theme.colors.background.tertiary : theme.colors.background.primary,
                    outline: 'none',
                  }}
                  onFocus={(e) => !errors.docUrl && (e.target.style.borderColor = theme.colors.accent.primary)}
                  onBlur={(e) => (e.target.style.borderColor = errors.docUrl ? theme.colors.accent.danger : theme.colors.border.light)}
                />
                {errors.docUrl && (
                  <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: theme.fontSize.sm, color: theme.colors.accent.danger }}>
                    {errors.docUrl}
                  </p>
                )}
              </div>

              {/* Document Title */}
              <div>
                <label
                  htmlFor="docTitle"
                  style={{
                    display: 'block',
                    marginBottom: theme.spacing.xs,
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    color: theme.colors.text.primary,
                  }}
                >
                  Document Title <span style={{ color: theme.colors.accent.danger }}>*</span>
                </label>
                <input
                  id="docTitle"
                  type="text"
                  value={formData.docTitle}
                  onChange={(e) => handleInputChange('docTitle', e.target.value)}
                  placeholder="Check Power Outlet"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    border: `1px solid ${errors.docTitle ? theme.colors.accent.danger : theme.colors.border.light}`,
                    borderRadius: theme.radius.md,
                    fontSize: theme.fontSize.base,
                    color: theme.colors.text.primary,
                    backgroundColor: loading ? theme.colors.background.tertiary : theme.colors.background.primary,
                    outline: 'none',
                  }}
                  onFocus={(e) => !errors.docTitle && (e.target.style.borderColor = theme.colors.accent.primary)}
                  onBlur={(e) => (e.target.style.borderColor = errors.docTitle ? theme.colors.accent.danger : theme.colors.border.light)}
                />
                {errors.docTitle && (
                  <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: theme.fontSize.sm, color: theme.colors.accent.danger }}>
                    {errors.docTitle}
                  </p>
                )}
              </div>

              {/* Success Triggers */}
              <div>
                <label
                  htmlFor="successTriggers"
                  style={{
                    display: 'block',
                    marginBottom: theme.spacing.xs,
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    color: theme.colors.text.primary,
                  }}
                >
                  Success Triggers <span style={{ color: theme.colors.accent.danger }}>*</span>
                </label>
                <input
                  id="successTriggers"
                  type="text"
                  value={formData.successTriggers}
                  onChange={(e) => handleInputChange('successTriggers', e.target.value)}
                  placeholder="FIXED, YES, WORKING, DONE"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    border: `1px solid ${errors.successTriggers ? theme.colors.accent.danger : theme.colors.border.light}`,
                    borderRadius: theme.radius.md,
                    fontSize: theme.fontSize.base,
                    color: theme.colors.text.primary,
                    backgroundColor: loading ? theme.colors.background.tertiary : theme.colors.background.primary,
                    outline: 'none',
                  }}
                  onFocus={(e) => !errors.successTriggers && (e.target.style.borderColor = theme.colors.accent.primary)}
                  onBlur={(e) => (e.target.style.borderColor = errors.successTriggers ? theme.colors.accent.danger : theme.colors.border.light)}
                />
                {errors.successTriggers ? (
                  <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: theme.fontSize.sm, color: theme.colors.accent.danger }}>
                    {errors.successTriggers}
                  </p>
                ) : (
                  <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: theme.fontSize.sm, color: theme.colors.text.tertiary }}>
                    Comma-separated responses meaning 'problem fixed'
                  </p>
                )}
                {/* Success Trigger Badges */}
                {successTriggerList.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.xs, marginTop: theme.spacing.sm }}>
                    {successTriggerList.map((trigger, index) => (
                      <span
                        key={index}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: theme.spacing.xs,
                          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                          backgroundColor: theme.colors.accent.success,
                          color: '#ffffff',
                          borderRadius: theme.radius.full,
                          fontSize: theme.fontSize.sm,
                          fontWeight: theme.fontWeight.medium,
                        }}
                      >
                        {trigger}
                        <button
                          type="button"
                          onClick={() => removeTrigger('successTriggers', trigger)}
                          disabled={loading}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            color: '#ffffff',
                          }}
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Failure Triggers */}
              <div>
                <label
                  htmlFor="failureTriggers"
                  style={{
                    display: 'block',
                    marginBottom: theme.spacing.xs,
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    color: theme.colors.text.primary,
                  }}
                >
                  Failure Triggers <span style={{ color: theme.colors.accent.danger }}>*</span>
                </label>
                <input
                  id="failureTriggers"
                  type="text"
                  value={formData.failureTriggers}
                  onChange={(e) => handleInputChange('failureTriggers', e.target.value)}
                  placeholder="NO, STILL BROKEN, NOT WORKING, HELP"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    border: `1px solid ${errors.failureTriggers ? theme.colors.accent.danger : theme.colors.border.light}`,
                    borderRadius: theme.radius.md,
                    fontSize: theme.fontSize.base,
                    color: theme.colors.text.primary,
                    backgroundColor: loading ? theme.colors.background.tertiary : theme.colors.background.primary,
                    outline: 'none',
                  }}
                  onFocus={(e) => !errors.failureTriggers && (e.target.style.borderColor = theme.colors.accent.primary)}
                  onBlur={(e) => (e.target.style.borderColor = errors.failureTriggers ? theme.colors.accent.danger : theme.colors.border.light)}
                />
                {errors.failureTriggers ? (
                  <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: theme.fontSize.sm, color: theme.colors.accent.danger }}>
                    {errors.failureTriggers}
                  </p>
                ) : (
                  <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: theme.fontSize.sm, color: theme.colors.text.tertiary }}>
                    Comma-separated responses meaning 'still broken'
                  </p>
                )}
                {/* Failure Trigger Badges */}
                {failureTriggerList.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.xs, marginTop: theme.spacing.sm }}>
                    {failureTriggerList.map((trigger, index) => (
                      <span
                        key={index}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: theme.spacing.xs,
                          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                          backgroundColor: theme.colors.accent.danger,
                          color: '#ffffff',
                          borderRadius: theme.radius.full,
                          fontSize: theme.fontSize.sm,
                          fontWeight: theme.fontWeight.medium,
                        }}
                      >
                        {trigger}
                        <button
                          type="button"
                          onClick={() => removeTrigger('failureTriggers', trigger)}
                          disabled={loading}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            color: '#ffffff',
                          }}
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              style={{
                padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                backgroundColor: theme.colors.background.tertiary,
                color: theme.colors.text.primary,
                border: 'none',
                borderRadius: theme.radius.md,
                fontSize: theme.fontSize.base,
                fontWeight: theme.fontWeight.medium,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
                opacity: loading ? 0.6 : 1,
              }}
              onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = theme.colors.background.hover)}
              onMouseLeave={(e) => (e.target.style.backgroundColor = theme.colors.background.tertiary)}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.sm,
                padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                backgroundColor: theme.colors.accent.primary,
                color: '#ffffff',
                border: 'none',
                borderRadius: theme.radius.md,
                fontSize: theme.fontSize.base,
                fontWeight: theme.fontWeight.medium,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
                opacity: loading ? 0.8 : 1,
              }}
              onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = theme.colors.accent.primaryHover)}
              onMouseLeave={(e) => (e.target.style.backgroundColor = theme.colors.accent.primary)}
            >
              {loading ? (
                <>
                  <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={20} />
                  Create Sequence
                </>
              )}
            </button>
          </div>
        </form>

        {/* Add keyframe animation for loading spinner */}
        <style>
          {`
            @keyframes spin {
              from {
                transform: rotate(0deg);
              }
              to {
                transform: rotate(360deg);
              }
            }
          `}
        </style>
      </div>
    </div>
  );
}

export default CreateSequence;
