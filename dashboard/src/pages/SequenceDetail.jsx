import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import Sidebar from '../components/Sidebar';
import Card from '../components/Card';
import Badge from '../components/Badge';
import { theme } from '../styles/theme';
import {
  Edit2,
  Trash2,
  Plus,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  ExternalLink,
  X,
  Loader,
  Save,
  ToggleLeft,
  ToggleRight,
  GitBranch,
  Target,
  Wrench,
  Package,
  ShoppingCart,
  Link as LinkIcon,
  Circle,
  DollarSign,
  AlertCircle,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Helper function to format external URLs
const formatExternalUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `https://${url}`;
};

// Helper Components
function Modal({ children, onClose, title }) {
  return (
    <div
      style={{
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
        padding: theme.spacing.lg,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: theme.colors.background.secondary,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.xl,
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: theme.shadows.xl,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg }}>
          <h2 style={{ margin: 0, fontSize: theme.fontSize['2xl'], fontWeight: theme.fontWeight.bold, color: theme.colors.text.primary }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: theme.spacing.xs,
              color: theme.colors.text.tertiary,
            }}
          >
            <X size={24} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, required, type = 'text', value, onChange, helpText, options, disabled }) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          marginBottom: theme.spacing.xs,
          fontSize: theme.fontSize.sm,
          fontWeight: theme.fontWeight.medium,
          color: theme.colors.text.primary,
        }}
      >
        {label} {required && <span style={{ color: theme.colors.accent.danger }}>*</span>}
      </label>
      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={onChange}
          disabled={disabled}
          rows={4}
          style={{
            width: '100%',
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            border: `1px solid ${theme.colors.border.light}`,
            borderRadius: theme.radius.md,
            fontSize: theme.fontSize.base,
            color: theme.colors.text.primary,
            backgroundColor: disabled ? theme.colors.background.tertiary : theme.colors.background.primary,
            outline: 'none',
            resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />
      ) : type === 'select' ? (
        <select
          value={value}
          onChange={onChange}
          disabled={disabled}
          style={{
            width: '100%',
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            border: `1px solid ${theme.colors.border.light}`,
            borderRadius: theme.radius.md,
            fontSize: theme.fontSize.base,
            color: theme.colors.text.primary,
            backgroundColor: disabled ? theme.colors.background.tertiary : theme.colors.background.primary,
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          {options?.map((opt, i) => (
            <option key={i} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={onChange}
          disabled={disabled}
          style={{
            width: '100%',
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            border: `1px solid ${theme.colors.border.light}`,
            borderRadius: theme.radius.md,
            fontSize: theme.fontSize.base,
            color: theme.colors.text.primary,
            backgroundColor: disabled ? theme.colors.background.tertiary : theme.colors.background.primary,
            outline: 'none',
          }}
        />
      )}
      {helpText && (
        <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: theme.fontSize.sm, color: theme.colors.text.tertiary }}>
          {helpText}
        </p>
      )}
    </div>
  );
}

// StepModal Component
function StepModal({
  isEdit,
  stepForm,
  allSequences,
  onClose,
  onSubmit,
  handleStepNumChange,
  handleMessageChange,
  handleDocUrlChange,
  handleDocTitleChange,
  handleSuccessTriggersChange,
  handleFailureTriggersChange,
  handleHasHandoffChange,
  handleHandoffTriggerChange,
  handleHandoffSequenceChange,
  handleIsActiveChange,
  sequenceType,
}) {
  const isLinear = sequenceType === 'linear';

  return (
    <Modal
      onClose={onClose}
      title={isEdit ? 'Edit Step' : 'Add Step'}
    >
      <div style={{ display: 'grid', gap: theme.spacing.lg }}>
        {/* Linear sequence info banner */}
        {isLinear && (
          <div
            style={{
              padding: theme.spacing.md,
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: theme.radius.md,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm,
            }}
          >
            <AlertCircle size={18} color="#3b82f6" />
            <span style={{ color: '#1e40af', fontSize: theme.fontSize.sm }}>
              Linear sequences auto-advance on any customer response. You only need escalation triggers.
            </span>
          </div>
        )}

        <FormField
          label="Step Number"
          required
          type="number"
          value={stepForm.stepNum}
          onChange={handleStepNumChange}
          disabled={isEdit}
          helpText={isEdit ? 'Step number cannot be changed' : 'Enter the step number for this step'}
        />
        <FormField
          label="Message Template"
          required
          type="textarea"
          value={stepForm.message}
          onChange={handleMessageChange}
          helpText="Use {url} placeholder for the document link"
        />
        <FormField
          label="Document URL"
          required
          value={stepForm.docUrl}
          onChange={handleDocUrlChange}
        />
        <FormField
          label="Document Title"
          required
          value={stepForm.docTitle}
          onChange={handleDocTitleChange}
        />
        {!isLinear && (
          <FormField
            label="Success Triggers"
            required
            value={stepForm.successTriggers}
            onChange={handleSuccessTriggersChange}
            helpText="Comma-separated responses meaning 'problem fixed'"
          />
        )}
        <FormField
          label={isLinear ? 'Escalation Triggers' : 'Failure Triggers'}
          required={!isLinear}
          value={stepForm.failureTriggers}
          onChange={handleFailureTriggersChange}
          helpText={isLinear
            ? 'Optional keywords like HELP or STUCK that trigger escalation to a technician'
            : "Comma-separated responses meaning 'still broken'"}
        />

        {/* Handoff Configuration */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={stepForm.hasHandoff}
              onChange={handleHasHandoffChange}
            />
            <span style={{ fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.medium, color: theme.colors.text.primary }}>
              Configure Handoff
            </span>
          </label>
        </div>

        {stepForm.hasHandoff && (
          <>
            <FormField
              label="Handoff Trigger Word"
              value={stepForm.handoffTrigger}
              onChange={handleHandoffTriggerChange}
              helpText="Trigger word to handoff to another sequence"
            />
            <FormField
              label="Target Sequence"
              type="select"
              value={stepForm.handoffSequenceKey}
              onChange={handleHandoffSequenceChange}
              options={[
                { value: '', label: 'Select a sequence...' },
                ...allSequences.map(seq => ({ value: seq.sequence_key, label: seq.display_name })),
              ]}
            />
          </>
        )}

        {isEdit && (
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={stepForm.isActive}
                onChange={handleIsActiveChange}
              />
              <span style={{ fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.medium, color: theme.colors.text.primary }}>
                Active
              </span>
            </label>
          </div>
        )}

        <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
              backgroundColor: theme.colors.background.tertiary,
              color: theme.colors.text.primary,
              border: 'none',
              borderRadius: theme.radius.md,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
              backgroundColor: theme.colors.accent.primary,
              color: '#ffffff',
              border: 'none',
              borderRadius: theme.radius.md,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
            }}
          >
            {isEdit ? <Save size={16} /> : <Plus size={16} />}
            {isEdit ? 'Save Changes' : 'Add Step'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// SuppliesList Component for displaying tools and parts
function SuppliesList({ tools, parts, onEditTool, onDeleteTool, onEditPart, onDeletePart, theme }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
      {/* Tools */}
      {tools.length > 0 && (
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.xs,
            marginBottom: theme.spacing.sm,
          }}>
            <Wrench size={14} color={theme.colors.text.tertiary} />
            <span style={{ fontSize: theme.fontSize.xs, color: theme.colors.text.tertiary, textTransform: 'uppercase', fontWeight: theme.fontWeight.semibold }}>
              Tools ({tools.length})
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
            {tools.map((tool) => (
              <div
                key={tool.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  padding: theme.spacing.md,
                  backgroundColor: theme.colors.background.tertiary,
                  borderRadius: theme.radius.md,
                  border: `1px solid ${theme.colors.border.light}`,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.xs }}>
                    <span style={{ fontWeight: theme.fontWeight.medium, color: theme.colors.text.primary }}>
                      {tool.tool_name}
                    </span>
                    {tool.is_required ? (
                      <Badge variant="danger" size="sm">Required</Badge>
                    ) : (
                      <Badge variant="secondary" size="sm">Optional</Badge>
                    )}
                  </div>
                  {tool.tool_description && (
                    <p style={{ margin: 0, fontSize: theme.fontSize.sm, color: theme.colors.text.secondary }}>
                      {tool.tool_description}
                    </p>
                  )}
                  {tool.tool_link && (
                    <a
                      href={formatExternalUrl(tool.tool_link)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: theme.spacing.xs,
                        marginTop: theme.spacing.xs,
                        fontSize: theme.fontSize.sm,
                        color: theme.colors.accent.primary,
                      }}
                    >
                      <LinkIcon size={12} />
                      View Link
                    </a>
                  )}
                </div>
                <div style={{ display: 'flex', gap: theme.spacing.xs }}>
                  <button
                    onClick={() => onEditTool(tool)}
                    style={{
                      padding: theme.spacing.xs,
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderRadius: theme.radius.sm,
                      cursor: 'pointer',
                      color: theme.colors.text.tertiary,
                    }}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => onDeleteTool(tool)}
                    style={{
                      padding: theme.spacing.xs,
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderRadius: theme.radius.sm,
                      cursor: 'pointer',
                      color: theme.colors.accent.danger,
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Parts */}
      {parts.length > 0 && (
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.xs,
            marginBottom: theme.spacing.sm,
          }}>
            <Package size={14} color={theme.colors.text.tertiary} />
            <span style={{ fontSize: theme.fontSize.xs, color: theme.colors.text.tertiary, textTransform: 'uppercase', fontWeight: theme.fontWeight.semibold }}>
              Parts ({parts.length})
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
            {parts.map((part) => (
              <div
                key={part.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  padding: theme.spacing.md,
                  backgroundColor: theme.colors.background.tertiary,
                  borderRadius: theme.radius.md,
                  border: `1px solid ${theme.colors.border.light}`,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.xs }}>
                    <span style={{ fontWeight: theme.fontWeight.medium, color: theme.colors.text.primary }}>
                      {part.part_name}
                    </span>
                    {part.is_required ? (
                      <Badge variant="danger" size="sm">Required</Badge>
                    ) : (
                      <Badge variant="secondary" size="sm">Optional</Badge>
                    )}
                    {part.part_number && (
                      <Badge variant="default" size="sm">#{part.part_number}</Badge>
                    )}
                  </div>
                  {part.part_description && (
                    <p style={{ margin: 0, fontSize: theme.fontSize.sm, color: theme.colors.text.secondary }}>
                      {part.part_description}
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md, marginTop: theme.spacing.xs }}>
                    {part.estimated_price && (
                      <span style={{ fontSize: theme.fontSize.sm, color: theme.colors.accent.success, fontWeight: theme.fontWeight.medium }}>
                        ~${Number(part.estimated_price).toFixed(2)}
                      </span>
                    )}
                    {part.part_link && (
                      <a
                        href={formatExternalUrl(part.part_link)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: theme.spacing.xs,
                          fontSize: theme.fontSize.sm,
                          color: theme.colors.accent.success,
                        }}
                      >
                        <ShoppingCart size={12} />
                        Buy
                      </a>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: theme.spacing.xs }}>
                  <button
                    onClick={() => onEditPart(part)}
                    style={{
                      padding: theme.spacing.xs,
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderRadius: theme.radius.sm,
                      cursor: 'pointer',
                      color: theme.colors.text.tertiary,
                    }}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => onDeletePart(part)}
                    style={{
                      padding: theme.spacing.xs,
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderRadius: theme.radius.sm,
                      cursor: 'pointer',
                      color: theme.colors.accent.danger,
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Compact inline supplies component for step cards
function StepSuppliesInline({ stepNum, tools, parts, onAddTool, onAddPart, onEditTool, onDeleteTool, onEditPart, onDeletePart, theme, isGeneral = false, sequenceKey }) {
  const [expanded, setExpanded] = useState(false);
  const totalCount = tools.length + parts.length;

  if (totalCount === 0 && !isGeneral) {
    // Show add buttons even when empty for step-specific
    return (
      <div style={{
        marginTop: theme.spacing.md,
        paddingTop: theme.spacing.md,
        borderTop: `1px solid ${theme.colors.border.light}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
          <Wrench size={14} color={theme.colors.text.tertiary} />
          <span style={{ fontSize: theme.fontSize.xs, color: theme.colors.text.tertiary }}>No supplies for this step</span>
          <button
            onClick={() => onAddTool(stepNum)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              backgroundColor: 'transparent',
              border: `1px solid ${theme.colors.border.light}`,
              borderRadius: theme.radius.sm,
              cursor: 'pointer',
              fontSize: theme.fontSize.xs,
              color: theme.colors.accent.primary,
            }}
          >
            <Plus size={12} />
            Tool
          </button>
          <button
            onClick={() => onAddPart(stepNum)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              backgroundColor: 'transparent',
              border: `1px solid ${theme.colors.border.light}`,
              borderRadius: theme.radius.sm,
              cursor: 'pointer',
              fontSize: theme.fontSize.xs,
              color: theme.colors.accent.success,
            }}
          >
            <Plus size={12} />
            Part
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      marginTop: theme.spacing.md,
      paddingTop: theme.spacing.md,
      borderTop: `1px solid ${theme.colors.border.light}`,
    }}>
      {/* Header row with toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: totalCount > 0 ? 'pointer' : 'default',
        }}
        onClick={() => totalCount > 0 && setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
          <Wrench size={14} color={theme.colors.text.tertiary} />
          <span style={{ fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.medium, color: theme.colors.text.secondary }}>
            {isGeneral ? 'General Supplies' : 'Supplies'}
          </span>
          {totalCount > 0 && (
            <Badge variant={isGeneral ? 'primary' : 'secondary'} size="sm">{totalCount}</Badge>
          )}
          {totalCount > 0 && (
            expanded ? <ChevronUp size={14} color={theme.colors.text.tertiary} /> : <ChevronDown size={14} color={theme.colors.text.tertiary} />
          )}
        </div>
        <div style={{ display: 'flex', gap: theme.spacing.xs, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
          {sequenceKey && (
            <a
              href={`/supplies/${sequenceKey}${stepNum ? `?step=${stepNum}` : ''}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                fontSize: theme.fontSize.xs,
                color: theme.colors.text.tertiary,
                textDecoration: 'none',
              }}
              title={stepNum ? `Preview Step ${stepNum} supplies` : "Preview public supplies page"}
            >
              <ExternalLink size={12} />
            </a>
          )}
          <button
            onClick={() => onAddTool(stepNum)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              backgroundColor: 'transparent',
              border: `1px solid ${theme.colors.border.light}`,
              borderRadius: theme.radius.sm,
              cursor: 'pointer',
              fontSize: theme.fontSize.xs,
              color: theme.colors.accent.primary,
            }}
          >
            <Plus size={12} />
            Tool
          </button>
          <button
            onClick={() => onAddPart(stepNum)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              backgroundColor: 'transparent',
              border: `1px solid ${theme.colors.border.light}`,
              borderRadius: theme.radius.sm,
              cursor: 'pointer',
              fontSize: theme.fontSize.xs,
              color: theme.colors.accent.success,
            }}
          >
            <Plus size={12} />
            Part
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && totalCount > 0 && (
        <div style={{ marginTop: theme.spacing.md }}>
          {/* Tools */}
          {tools.length > 0 && (
            <div style={{ marginBottom: parts.length > 0 ? theme.spacing.md : 0 }}>
              <div style={{ fontSize: theme.fontSize.xs, color: theme.colors.text.tertiary, marginBottom: theme.spacing.xs, textTransform: 'uppercase' }}>
                Tools ({tools.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
                {tools.map((tool) => (
                  <div
                    key={tool.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: theme.spacing.sm,
                      backgroundColor: theme.colors.background.primary,
                      borderRadius: theme.radius.sm,
                      border: `1px solid ${theme.colors.border.light}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, flex: 1 }}>
                      <span style={{ fontSize: theme.fontSize.sm, color: theme.colors.text.primary }}>{tool.tool_name}</span>
                      {tool.is_required && <Badge variant="danger" size="sm">Required</Badge>}
                      {tool.tool_link && (
                        <a href={formatExternalUrl(tool.tool_link)} target="_blank" rel="noopener noreferrer" style={{ color: theme.colors.accent.primary }}>
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => onEditTool(tool)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: theme.colors.text.tertiary }}>
                        <Edit2 size={12} />
                      </button>
                      <button onClick={() => onDeleteTool(tool)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: theme.colors.accent.danger }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Parts */}
          {parts.length > 0 && (
            <div>
              <div style={{ fontSize: theme.fontSize.xs, color: theme.colors.text.tertiary, marginBottom: theme.spacing.xs, textTransform: 'uppercase' }}>
                Parts ({parts.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
                {parts.map((part) => (
                  <div
                    key={part.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: theme.spacing.sm,
                      backgroundColor: theme.colors.background.primary,
                      borderRadius: theme.radius.sm,
                      border: `1px solid ${theme.colors.border.light}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, flex: 1 }}>
                      <span style={{ fontSize: theme.fontSize.sm, color: theme.colors.text.primary }}>{part.part_name}</span>
                      {part.is_required && <Badge variant="danger" size="sm">Required</Badge>}
                      {part.part_number && <Badge variant="default" size="sm">#{part.part_number}</Badge>}
                      {part.estimated_price && (
                        <span style={{ fontSize: theme.fontSize.xs, color: theme.colors.accent.success }}>
                          ~${Number(part.estimated_price).toFixed(2)}
                        </span>
                      )}
                      {part.part_link && (
                        <a href={formatExternalUrl(part.part_link)} target="_blank" rel="noopener noreferrer" style={{ color: theme.colors.accent.success }}>
                          <ShoppingCart size={12} />
                        </a>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => onEditPart(part)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: theme.colors.text.tertiary }}>
                        <Edit2 size={12} />
                      </button>
                      <button onClick={() => onDeletePart(part)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: theme.colors.accent.danger }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SequenceDetail() {
  const { key } = useParams();
  const { user, logout, hasRole, isSiteAdmin } = useAuth();
  const navigate = useNavigate();

  // Data state
  const [sequence, setSequence] = useState(null);
  const [allSequences, setAllSequences] = useState([]);
  const [triggerPatterns, setTriggerPatterns] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Timeout ref for success message cleanup
  const successTimeoutRef = useRef(null);

  // Clean up success timeout on unmount
  useEffect(() => {
    return () => clearTimeout(successTimeoutRef.current);
  }, []);

  // Modal state
  const [editMetadataOpen, setEditMetadataOpen] = useState(false);
  const [addStepOpen, setAddStepOpen] = useState(false);
  const [editStepOpen, setEditStepOpen] = useState(false);
  const [deleteStepOpen, setDeleteStepOpen] = useState(false);
  const [deleteSequenceOpen, setDeleteSequenceOpen] = useState(false);
  const [validating, setValidating] = useState(false);

  // Edit state
  const [editingStep, setEditingStep] = useState(null);
  const [deletingStep, setDeletingStep] = useState(null);
  const [metadataForm, setMetadataForm] = useState({
    displayName: '',
    description: '',
    category: '',
    sequenceType: 'troubleshooting',
  });
  const [stepForm, setStepForm] = useState({
    stepNum: '',
    message: '',
    docUrl: '',
    docTitle: '',
    successTriggers: '',
    failureTriggers: '',
    hasHandoff: false,
    handoffTrigger: '',
    handoffSequenceKey: '',
    isActive: true,
  });

  // Supplies state
  const [supplies, setSupplies] = useState({ tools: [], parts: [] });
  const [suppliesLoading, setSuppliesLoading] = useState(false);
  const [addToolOpen, setAddToolOpen] = useState(false);
  const [editToolOpen, setEditToolOpen] = useState(false);
  const [deleteToolOpen, setDeleteToolOpen] = useState(false);
  const [addPartOpen, setAddPartOpen] = useState(false);
  const [editPartOpen, setEditPartOpen] = useState(false);
  const [deletePartOpen, setDeletePartOpen] = useState(false);
  const [editingTool, setEditingTool] = useState(null);
  const [editingPart, setEditingPart] = useState(null);
  const [deletingTool, setDeletingTool] = useState(null);
  const [deletingPart, setDeletingPart] = useState(null);
  const [toolForm, setToolForm] = useState({
    tool_name: '',
    tool_description: '',
    tool_link: '',
    is_required: true,
    sort_order: 0,
    step_num: null,
  });
  const [partForm, setPartForm] = useState({
    part_name: '',
    part_number: '',
    part_description: '',
    part_link: '',
    estimated_price: '',
    is_required: true,
    sort_order: 0,
    step_num: null,
  });

  // Fetch sequence details
  useEffect(() => {
    const loadSequenceDetail = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`${API_BASE_URL}/api/sequences/${key}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Sequence not found');
          }
          throw new Error('Failed to fetch sequence details');
        }

        const data = await response.json();
        setSequence(data);
        setMetadataForm({
          displayName: data.display_name || '',
          description: data.description || '',
          category: data.category || '',
          sequenceType: data.sequence_type || 'troubleshooting',
        });
      } catch (err) {
        console.error('Error fetching sequence:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const loadAllSequences = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/sequences`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setAllSequences(data.filter(seq => seq.sequence_key !== key));
        }
      } catch (err) {
        console.error('Error fetching sequences:', err);
      }
    };

    const loadTriggerPatterns = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/patterns?sequence_key=${key}`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setTriggerPatterns(data);
        }
      } catch (err) {
        console.error('Error fetching trigger patterns:', err);
      }
    };

    const loadSupplies = async () => {
      setSuppliesLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/sequences/${key}/supplies`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setSupplies({
            tools: data.tools || [],
            parts: data.parts || [],
          });
        }
      } catch (err) {
        console.error('Error fetching supplies:', err);
      } finally {
        setSuppliesLoading(false);
      }
    };

    loadSequenceDetail();
    loadAllSequences();
    loadTriggerPatterns();
    loadSupplies();
  }, [key]);

  const fetchSequenceDetail = async (skipLoadingState = false) => {
    if (!skipLoadingState) {
      setLoading(true);
    }
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/sequences/${key}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Sequence not found');
        }
        throw new Error('Failed to fetch sequence details');
      }

      const data = await response.json();
      setSequence(data);
      setMetadataForm({
        displayName: data.display_name || '',
        description: data.description || '',
        category: data.category || '',
        sequenceType: data.sequence_type || 'troubleshooting',
      });
    } catch (err) {
      console.error('Error fetching sequence:', err);
      setError(err.message);
    } finally {
      if (!skipLoadingState) {
        setLoading(false);
      }
    }
  };

  const fetchAllSequences = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sequences`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setAllSequences(data.filter(seq => seq.sequence_key !== key));
      }
    } catch (err) {
      console.error('Error fetching sequences:', err);
    }
  };

  const fetchTriggerPatterns = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/patterns?sequence_key=${key}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setTriggerPatterns(data);
      }
    } catch (err) {
      console.error('Error fetching trigger patterns:', err);
    }
  };

  const fetchSupplies = async () => {
    setSuppliesLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/sequences/${key}/supplies`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSupplies({
          tools: data.tools || [],
          parts: data.parts || [],
        });
      }
    } catch (err) {
      console.error('Error fetching supplies:', err);
    } finally {
      setSuppliesLoading(false);
    }
  };

  // Tool CRUD operations
  const resetToolForm = () => {
    setToolForm({
      tool_name: '',
      tool_description: '',
      tool_link: '',
      is_required: true,
      sort_order: supplies.tools.length,
      step_num: null,
    });
  };

  const openAddTool = (stepNum = null) => {
    resetToolForm();
    setToolForm(prev => ({ ...prev, step_num: stepNum }));
    setAddToolOpen(true);
  };

  const openEditTool = (tool) => {
    setEditingTool(tool);
    setToolForm({
      tool_name: tool.tool_name || '',
      tool_description: tool.tool_description || '',
      tool_link: tool.tool_link || '',
      is_required: tool.is_required ?? true,
      sort_order: tool.sort_order || 0,
      step_num: tool.step_num || null,
    });
    setEditToolOpen(true);
  };

  const openDeleteTool = (tool) => {
    setDeletingTool(tool);
    setDeleteToolOpen(true);
  };

  const addTool = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sequences/${key}/tools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(toolForm),
      });

      if (!response.ok) {
        throw new Error('Failed to add tool');
      }

      await fetchSupplies();
      setAddToolOpen(false);
      resetToolForm();
      showSuccess('Tool added successfully');
    } catch (err) {
      console.error('Error adding tool:', err);
      setError('Failed to add tool');
    }
  };

  const updateTool = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sequences/tools/${editingTool.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(toolForm),
      });

      if (!response.ok) {
        throw new Error('Failed to update tool');
      }

      await fetchSupplies();
      setEditToolOpen(false);
      setEditingTool(null);
      showSuccess('Tool updated successfully');
    } catch (err) {
      console.error('Error updating tool:', err);
      setError('Failed to update tool');
    }
  };

  const deleteTool = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sequences/tools/${deletingTool.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete tool');
      }

      await fetchSupplies();
      setDeleteToolOpen(false);
      setDeletingTool(null);
      showSuccess('Tool deleted successfully');
    } catch (err) {
      console.error('Error deleting tool:', err);
      setError('Failed to delete tool');
    }
  };

  // Part CRUD operations
  const resetPartForm = () => {
    setPartForm({
      part_name: '',
      part_number: '',
      part_description: '',
      part_link: '',
      estimated_price: '',
      is_required: true,
      sort_order: supplies.parts.length,
      step_num: null,
    });
  };

  const openAddPart = (stepNum = null) => {
    resetPartForm();
    setPartForm(prev => ({ ...prev, step_num: stepNum }));
    setAddPartOpen(true);
  };

  const openEditPart = (part) => {
    setEditingPart(part);
    setPartForm({
      part_name: part.part_name || '',
      part_number: part.part_number || '',
      part_description: part.part_description || '',
      part_link: part.part_link || '',
      estimated_price: part.estimated_price || '',
      is_required: part.is_required ?? true,
      sort_order: part.sort_order || 0,
      step_num: part.step_num || null,
    });
    setEditPartOpen(true);
  };

  const openDeletePart = (part) => {
    setDeletingPart(part);
    setDeletePartOpen(true);
  };

  const addPart = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sequences/${key}/parts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...partForm,
          estimated_price: partForm.estimated_price ? parseFloat(partForm.estimated_price) : null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add part');
      }

      await fetchSupplies();
      setAddPartOpen(false);
      resetPartForm();
      showSuccess('Part added successfully');
    } catch (err) {
      console.error('Error adding part:', err);
      setError('Failed to add part');
    }
  };

  const updatePart = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sequences/parts/${editingPart.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...partForm,
          estimated_price: partForm.estimated_price ? parseFloat(partForm.estimated_price) : null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update part');
      }

      await fetchSupplies();
      setEditPartOpen(false);
      setEditingPart(null);
      showSuccess('Part updated successfully');
    } catch (err) {
      console.error('Error updating part:', err);
      setError('Failed to update part');
    }
  };

  const deletePart = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sequences/parts/${deletingPart.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete part');
      }

      await fetchSupplies();
      setDeletePartOpen(false);
      setDeletingPart(null);
      showSuccess('Part deleted successfully');
    } catch (err) {
      console.error('Error deleting part:', err);
      setError('Failed to delete part');
    }
  };

  const validateSequence = async () => {
    setValidating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/sequences/${key}/validate`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to validate sequence');
      }

      const data = await response.json();

      if (data.errors && data.errors.length > 0) {
        setValidationErrors(data.errors);
        setError('Validation found issues with this sequence');
      } else {
        setValidationErrors([]);
        showSuccess('Sequence validated - no errors found');
      }
    } catch (err) {
      console.error('Error validating sequence:', err);
      setError('Failed to validate sequence');
    } finally {
      setValidating(false);
    }
  };

  const toggleSequenceActive = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sequences/${key}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_active: !sequence.is_active }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle sequence status');
      }

      await fetchSequenceDetail(true);
      showSuccess(`Sequence ${!sequence.is_active ? 'activated' : 'deactivated'} successfully`);
    } catch (err) {
      console.error('Error toggling sequence:', err);
      setError('Failed to toggle sequence status');
    }
  };

  const updateMetadata = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sequences/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: metadataForm.displayName,
          description: metadataForm.description,
          category: metadataForm.category,
          sequence_type: metadataForm.sequenceType,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update sequence metadata');
      }

      await fetchSequenceDetail(true);
      setEditMetadataOpen(false);
      showSuccess('Sequence updated successfully');
    } catch (err) {
      console.error('Error updating metadata:', err);
      setError('Failed to update sequence');
    }
  };

  const addStep = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sequences/${key}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          step_num: parseInt(stepForm.stepNum),
          message: stepForm.message,
          doc_url: stepForm.docUrl,
          doc_title: stepForm.docTitle,
          success_triggers: parseTriggers(stepForm.successTriggers),
          failure_triggers: parseTriggers(stepForm.failureTriggers),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add step');
      }

      // If handoff is configured, update the step
      if (stepForm.hasHandoff && stepForm.handoffTrigger && stepForm.handoffSequenceKey) {
        await updateStepHandoff(parseInt(stepForm.stepNum));
      }

      await fetchSequenceDetail(true);
      setAddStepOpen(false);
      resetStepForm();
      showSuccess('Step added successfully');
    } catch (err) {
      console.error('Error adding step:', err);
      setError('Failed to add step');
    }
  };

  const updateStep = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sequences/${key}/steps/${editingStep.step_num}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: stepForm.message,
          doc_url: stepForm.docUrl,
          doc_title: stepForm.docTitle,
          success_triggers: parseTriggers(stepForm.successTriggers),
          failure_triggers: parseTriggers(stepForm.failureTriggers),
          handoff_trigger: stepForm.hasHandoff ? stepForm.handoffTrigger : null,
          handoff_sequence_key: stepForm.hasHandoff ? stepForm.handoffSequenceKey : null,
          is_active: stepForm.isActive,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update step');
      }

      await fetchSequenceDetail(true);
      setEditStepOpen(false);
      setEditingStep(null);
      resetStepForm();
      showSuccess('Step updated successfully');
    } catch (err) {
      console.error('Error updating step:', err);
      setError('Failed to update step');
    }
  };

  const updateStepHandoff = async (stepNum) => {
    await fetch(`${API_BASE_URL}/api/sequences/${key}/steps/${stepNum}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        handoff_trigger: stepForm.handoffTrigger,
        handoff_sequence_key: stepForm.handoffSequenceKey,
      }),
    });
  };

  const deleteStep = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sequences/${key}/steps/${deletingStep.step_num}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete step');
      }

      await fetchSequenceDetail(true);
      setDeleteStepOpen(false);
      setDeletingStep(null);
      showSuccess('Step deleted successfully');
    } catch (err) {
      console.error('Error deleting step:', err);
      setError('Failed to delete step');
    }
  };

  const deleteSequence = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sequences/${key}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete sequence');
      }

      navigate('/sequences');
    } catch (err) {
      console.error('Error deleting sequence:', err);
      setError('Failed to delete sequence');
    }
  };

  const moveStep = async (step, direction) => {
    const steps = sequence.steps || [];
    const currentIndex = steps.findIndex(s => s.step_num === step.step_num);

    if (direction === 'up' && currentIndex > 0) {
      const targetStep = steps[currentIndex - 1];
      await swapSteps(step, targetStep);
    } else if (direction === 'down' && currentIndex < steps.length - 1) {
      const targetStep = steps[currentIndex + 1];
      await swapSteps(step, targetStep);
    }
  };

  const swapSteps = async (step1, step2) => {
    try {
      // Swap content by updating step1's position with step2's content
      const response1 = await fetch(`${API_BASE_URL}/api/sequences/${key}/steps/${step1.step_num}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: step2.message_template,
          doc_url: step2.doc_url,
          doc_title: step2.doc_title,
          success_triggers: step2.success_triggers,
          failure_triggers: step2.failure_triggers,
          handoff_trigger: step2.handoff_trigger,
          handoff_sequence_key: step2.handoff_sequence_key,
          is_active: step2.is_active,
        }),
      });

      if (!response1.ok) {
        throw new Error('Failed to update first step');
      }

      // Update step2's position with step1's content
      const response2 = await fetch(`${API_BASE_URL}/api/sequences/${key}/steps/${step2.step_num}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: step1.message_template,
          doc_url: step1.doc_url,
          doc_title: step1.doc_title,
          success_triggers: step1.success_triggers,
          failure_triggers: step1.failure_triggers,
          handoff_trigger: step1.handoff_trigger,
          handoff_sequence_key: step1.handoff_sequence_key,
          is_active: step1.is_active,
        }),
      });

      if (!response2.ok) {
        throw new Error('Failed to update second step');
      }

      // Refetch with skipLoadingState to prevent UI flash
      await fetchSequenceDetail(true);
      showSuccess('Steps reordered successfully');
    } catch (err) {
      console.error('Error swapping steps:', err);
      setError('Failed to reorder steps');
    }
  };

  const toggleStepActive = async (step) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sequences/${key}/steps/${step.step_num}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_active: !step.is_active }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle step status');
      }

      await fetchSequenceDetail(true);
      showSuccess(`Step ${!step.is_active ? 'activated' : 'deactivated'} successfully`);
    } catch (err) {
      console.error('Error toggling step:', err);
      setError('Failed to toggle step status');
    }
  };

  const parseTriggers = (value) => {
    return value
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    clearTimeout(successTimeoutRef.current);
    successTimeoutRef.current = setTimeout(() => setSuccessMessage(''), 3000);
  };

  const resetStepForm = () => {
    const nextStepNum = sequence?.steps?.length ? Math.max(...sequence.steps.map(s => s.step_num)) + 1 : 1;
    setStepForm({
      stepNum: nextStepNum.toString(),
      message: '',
      docUrl: '',
      docTitle: '',
      successTriggers: '',
      failureTriggers: '',
      hasHandoff: false,
      handoffTrigger: '',
      handoffSequenceKey: '',
      isActive: true,
    });
  };

  const openEditStep = (step) => {
    setEditingStep(step);
    setStepForm({
      stepNum: step.step_num.toString(),
      message: step.message_template || '',
      docUrl: step.doc_url || '',
      docTitle: step.doc_title || '',
      successTriggers: (step.success_triggers || []).join(', '),
      failureTriggers: (step.failure_triggers || []).join(', '),
      hasHandoff: !!step.handoff_trigger,
      handoffTrigger: step.handoff_trigger || '',
      handoffSequenceKey: step.handoff_sequence_key || '',
      isActive: step.is_active !== false,
    });
    setEditStepOpen(true);
  };

  const openAddStep = () => {
    resetStepForm();
    setAddStepOpen(true);
  };

  const getCategoryColor = (category) => {
    const categoryMap = {
      'electrical': 'primary',
      'plumbing': 'warning',
      'hvac': 'secondary',
      'appliances': 'success',
      'mechanical': 'danger',
    };
    return categoryMap[category?.toLowerCase()] || 'default';
  };

  const getPriorityBadgeColor = (priority) => {
    if (priority <= 10) return '#1e3a8a'; // Dark blue
    if (priority <= 50) return '#3b82f6'; // Medium blue
    return '#93c5fd'; // Light blue
  };

  const getPatternCategoryColor = (category) => {
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

  // Memoize handlers to prevent recreation on every render
  const handleStepNumChange = useCallback((e) => setStepForm(prev => ({ ...prev, stepNum: e.target.value })), []);
  const handleMessageChange = useCallback((e) => setStepForm(prev => ({ ...prev, message: e.target.value })), []);
  const handleDocUrlChange = useCallback((e) => setStepForm(prev => ({ ...prev, docUrl: e.target.value })), []);
  const handleDocTitleChange = useCallback((e) => setStepForm(prev => ({ ...prev, docTitle: e.target.value })), []);
  const handleSuccessTriggersChange = useCallback((e) => setStepForm(prev => ({ ...prev, successTriggers: e.target.value })), []);
  const handleFailureTriggersChange = useCallback((e) => setStepForm(prev => ({ ...prev, failureTriggers: e.target.value })), []);
  const handleHandoffTriggerChange = useCallback((e) => setStepForm(prev => ({ ...prev, handoffTrigger: e.target.value })), []);
  const handleHandoffSequenceChange = useCallback((e) => setStepForm(prev => ({ ...prev, handoffSequenceKey: e.target.value })), []);
  const handleHasHandoffChange = useCallback((e) => setStepForm(prev => ({ ...prev, hasHandoff: e.target.checked })), []);
  const handleIsActiveChange = useCallback((e) => setStepForm(prev => ({ ...prev, isActive: e.target.checked })), []);

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: theme.colors.background.primary }}>
        <Sidebar user={user} onLogout={logout} hasRole={hasRole} isSiteAdmin={isSiteAdmin} />
        <div style={{ marginLeft: '260px', flex: 1, padding: theme.spacing['2xl'], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
            <Loader size={24} color={theme.colors.accent.primary} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ color: theme.colors.text.secondary }}>Loading sequence...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error && !sequence) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: theme.colors.background.primary }}>
        <Sidebar user={user} onLogout={logout} hasRole={hasRole} isSiteAdmin={isSiteAdmin} />
        <div style={{ marginLeft: '260px', flex: 1, padding: theme.spacing['2xl'] }}>
          <div
            style={{
              padding: theme.spacing.xl,
              backgroundColor: '#fee2e2',
              border: `1px solid ${theme.colors.accent.danger}`,
              borderRadius: theme.radius.md,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.md,
            }}
          >
            <AlertTriangle size={24} color={theme.colors.accent.danger} />
            <div>
              <h2 style={{ margin: 0, color: theme.colors.accent.danger, fontSize: theme.fontSize.xl }}>
                {error}
              </h2>
              <button
                onClick={() => navigate('/sequences')}
                style={{
                  marginTop: theme.spacing.md,
                  padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                  backgroundColor: theme.colors.accent.primary,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: theme.radius.md,
                  cursor: 'pointer',
                }}
              >
                Back to Sequences
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const steps = sequence?.steps || [];
  const sortedSteps = [...steps].sort((a, b) => a.step_num - b.step_num);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: theme.colors.background.primary }}>
      <Sidebar user={user} onLogout={logout} hasRole={hasRole} isSiteAdmin={isSiteAdmin} />

      <div style={{ marginLeft: '260px', flex: 1, padding: theme.spacing['2xl'] }}>
        {/* Success Message */}
        {successMessage && (
          <div
            style={{
              marginBottom: theme.spacing.lg,
              padding: theme.spacing.md,
              backgroundColor: '#d1fae5',
              border: `1px solid ${theme.colors.accent.success}`,
              borderRadius: theme.radius.md,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm,
            }}
          >
            <CheckCircle size={20} color={theme.colors.accent.success} />
            <span style={{ color: theme.colors.accent.success, fontSize: theme.fontSize.base }}>
              {successMessage}
            </span>
          </div>
        )}

        {/* Error Message */}
        {error && sequence && (
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
            <AlertTriangle size={20} color={theme.colors.accent.danger} />
            <span style={{ color: theme.colors.accent.danger, fontSize: theme.fontSize.base }}>
              {error}
            </span>
          </div>
        )}

        {/* Back Button */}
        <button
          onClick={() => navigate('/sequences')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.xs,
            marginBottom: theme.spacing.lg,
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            backgroundColor: 'transparent',
            color: theme.colors.accent.primary,
            border: 'none',
            cursor: 'pointer',
            fontSize: theme.fontSize.base,
            fontWeight: theme.fontWeight.medium,
          }}
        >
          <ArrowLeft size={20} />
          Back to Sequences
        </button>

        {/* Header Card */}
        <Card style={{ marginBottom: theme.spacing.lg }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: theme.spacing.lg }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md, marginBottom: theme.spacing.sm }}>
                <h1
                  style={{
                    fontSize: theme.fontSize['4xl'],
                    fontWeight: theme.fontWeight.bold,
                    color: theme.colors.text.primary,
                    margin: 0,
                  }}
                >
                  {sequence?.display_name}
                </h1>
                <button
                  type="button"
                  onClick={() => setEditMetadataOpen(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: theme.spacing.xs,
                    color: theme.colors.accent.primary,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Edit sequence metadata"
                >
                  <Edit2 size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
                {sequence?.category && (
                  <Badge variant={getCategoryColor(sequence.category)}>
                    {sequence.category}
                  </Badge>
                )}
                <Badge
                  variant={(sequence?.sequence_type || 'troubleshooting') === 'linear' ? 'info' : 'warning'}
                  soft
                >
                  {(sequence?.sequence_type || 'troubleshooting') === 'linear' ? 'Linear' : 'Troubleshooting'}
                </Badge>
                <button
                  onClick={toggleSequenceActive}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: theme.spacing.xs,
                    padding: theme.spacing.xs,
                    color: sequence?.is_active ? theme.colors.accent.success : theme.colors.text.tertiary,
                  }}
                  title={sequence?.is_active ? 'Active - Click to disable' : 'Inactive - Click to enable'}
                >
                  {sequence?.is_active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                  <span style={{ fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.medium }}>
                    {sequence?.is_active ? 'Active' : 'Inactive'}
                  </span>
                </button>
              </div>

              <p style={{ color: theme.colors.text.secondary, fontSize: theme.fontSize.base, marginBottom: theme.spacing.md }}>
                {sequence?.description}
              </p>

              <div style={{ display: 'flex', gap: theme.spacing.lg, fontSize: theme.fontSize.sm, color: theme.colors.text.tertiary }}>
                <span>Created: {sequence?.created_at ? new Date(sequence.created_at).toLocaleDateString() : 'N/A'}</span>
                <span>Updated: {sequence?.updated_at ? new Date(sequence.updated_at).toLocaleDateString() : 'N/A'}</span>
                <span>Steps: {sortedSteps.length}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
              <button
                onClick={validateSequence}
                disabled={validating}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.xs,
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  backgroundColor: theme.colors.accent.info,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: theme.radius.md,
                  fontSize: theme.fontSize.sm,
                  fontWeight: theme.fontWeight.medium,
                  cursor: validating ? 'not-allowed' : 'pointer',
                  opacity: validating ? 0.7 : 1,
                }}
              >
                {validating ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={16} />}
                Validate Sequence
              </button>
              <button
                onClick={() => setDeleteSequenceOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.xs,
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  backgroundColor: theme.colors.accent.danger,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: theme.radius.md,
                  fontSize: theme.fontSize.sm,
                  fontWeight: theme.fontWeight.medium,
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={16} />
                Delete Sequence
              </button>
            </div>
          </div>
        </Card>

        {/* Trigger Patterns Card */}
        <Card style={{ marginBottom: theme.spacing.lg }}>
          <div style={{ marginBottom: theme.spacing.lg }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.xs }}>
              <Target size={20} color={theme.colors.accent.primary} />
              <h2 style={{
                margin: 0,
                fontSize: theme.fontSize.xl,
                fontWeight: theme.fontWeight.semibold,
                color: theme.colors.text.primary,
              }}>
                Trigger Patterns
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: theme.fontSize.sm, color: theme.colors.text.secondary }}>
              Patterns that trigger this sequence
            </p>
          </div>

          {triggerPatterns.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: theme.spacing.xl,
              color: theme.colors.text.secondary,
              backgroundColor: theme.colors.background.tertiary,
              borderRadius: theme.radius.md,
            }}>
              <Target size={32} style={{ marginBottom: theme.spacing.sm, opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: theme.fontSize.sm }}>
                No trigger patterns configured for this sequence
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
              {triggerPatterns.map((pattern) => (
                <div
                  key={pattern.id}
                  style={{
                    padding: theme.spacing.md,
                    backgroundColor: theme.colors.background.tertiary,
                    borderRadius: theme.radius.md,
                    border: `1px solid ${theme.colors.border.light}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: theme.spacing.md }}>
                    <span style={{
                      display: 'inline-block',
                      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                      backgroundColor: getPriorityBadgeColor(pattern.priority),
                      color: '#ffffff',
                      borderRadius: theme.radius.md,
                      fontSize: theme.fontSize.xs,
                      fontWeight: theme.fontWeight.semibold,
                      flexShrink: 0,
                    }}>
                      {pattern.priority}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontFamily: 'monospace',
                        fontSize: theme.fontSize.sm,
                        color: theme.colors.text.primary,
                        marginBottom: theme.spacing.xs,
                        wordBreak: 'break-all',
                      }}>
                        {pattern.pattern}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                          backgroundColor: getPatternCategoryColor(pattern.category_slug) + '20',
                          color: getPatternCategoryColor(pattern.category_slug),
                          borderRadius: theme.radius.md,
                          fontSize: theme.fontSize.xs,
                          fontWeight: theme.fontWeight.medium,
                        }}>
                          {pattern.category_slug}
                        </span>
                        <span style={{ fontSize: theme.fontSize.xs, color: theme.colors.text.tertiary }}>
                          |
                        </span>
                        <span style={{
                          fontSize: theme.fontSize.xs,
                          color: pattern.is_active ? theme.colors.status.success : theme.colors.text.tertiary,
                          fontWeight: theme.fontWeight.medium,
                        }}>
                          {pattern.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {pattern.flags && (
                          <>
                            <span style={{ fontSize: theme.fontSize.xs, color: theme.colors.text.tertiary }}>
                              |
                            </span>
                            <span style={{
                              fontSize: theme.fontSize.xs,
                              color: theme.colors.text.tertiary,
                              fontFamily: 'monospace',
                            }}>
                              flags: {pattern.flags}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Link
            to="/patterns"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
              marginTop: theme.spacing.lg,
              color: theme.colors.accent.primary,
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.medium,
              textDecoration: 'none',
            }}
          >
            <ArrowRight size={16} />
            Manage All Patterns
          </Link>
        </Card>

        {/* Validation Errors Card */}
        {validationErrors.length > 0 && (
          <Card style={{ marginBottom: theme.spacing.lg, backgroundColor: '#fff7ed', border: `1px solid ${theme.colors.accent.warning}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: theme.spacing.md }}>
              <AlertTriangle size={24} color={theme.colors.accent.warning} />
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: `0 0 ${theme.spacing.md} 0`, color: theme.colors.accent.warning, fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.semibold }}>
                  Validation Errors
                </h3>
                <ul style={{ margin: 0, paddingLeft: theme.spacing.lg, color: theme.colors.text.primary }}>
                  {validationErrors.map((error, index) => (
                    <li key={index} style={{ marginBottom: theme.spacing.xs }}>
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        )}

        {/* Steps Card */}
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
                <span>Troubleshooting Steps</span>
                <Badge variant="primary" size="sm">{sortedSteps.length}</Badge>
              </div>
              <a
                href={`/supplies/${key}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.xs,
                  color: theme.colors.accent.primary,
                  fontSize: theme.fontSize.sm,
                  fontWeight: theme.fontWeight.medium,
                  textDecoration: 'none',
                }}
              >
                <ExternalLink size={14} />
                Preview Supplies Page
              </a>
            </div>
          }
          style={{ marginBottom: theme.spacing.lg }}
        >
          {/* General Supplies Section */}
          {(() => {
            const generalTools = supplies.tools.filter(t => !t.step_num);
            const generalParts = supplies.parts.filter(p => !p.step_num);
            const hasGeneral = generalTools.length > 0 || generalParts.length > 0;

            return (
              <div style={{
                marginBottom: theme.spacing.lg,
                padding: theme.spacing.md,
                backgroundColor: theme.colors.background.tertiary,
                borderRadius: theme.radius.md,
                border: `1px solid ${theme.colors.accent.primary}33`,
              }}>
                <StepSuppliesInline
                  stepNum={null}
                  tools={generalTools}
                  parts={generalParts}
                  onAddTool={openAddTool}
                  onAddPart={openAddPart}
                  onEditTool={openEditTool}
                  onDeleteTool={openDeleteTool}
                  onEditPart={openEditPart}
                  onDeletePart={openDeletePart}
                  theme={theme}
                  isGeneral={true}
                  sequenceKey={key}
                />
                <div style={{
                  marginTop: theme.spacing.sm,
                  padding: theme.spacing.sm,
                  backgroundColor: theme.colors.background.primary,
                  borderRadius: theme.radius.sm,
                  fontSize: theme.fontSize.xs,
                  color: theme.colors.text.tertiary,
                  fontFamily: 'monospace',
                }}>
                  Public URL: {window.location.origin}/supplies/{key}
                </div>
              </div>
            );
          })()}

          {sortedSteps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: theme.spacing['2xl'], color: theme.colors.text.secondary }}>
              <p style={{ fontSize: theme.fontSize.lg, marginBottom: theme.spacing.md }}>No steps yet</p>
              <p style={{ fontSize: theme.fontSize.sm }}>Add your first troubleshooting step to get started</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.lg }}>
              {sortedSteps.map((step, index) => (
                <div
                  key={step.step_num}
                  style={{
                    padding: theme.spacing.lg,
                    backgroundColor: theme.colors.background.tertiary,
                    borderRadius: theme.radius.md,
                    border: `1px solid ${theme.colors.border.light}`,
                    opacity: step.is_active === false ? 0.6 : 1,
                  }}
                >
                  <div style={{ display: 'flex', gap: theme.spacing.lg }}>
                    {/* Step Number */}
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: theme.radius.full,
                        backgroundColor: theme.colors.accent.primary,
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: theme.fontSize.xl,
                        fontWeight: theme.fontWeight.bold,
                        flexShrink: 0,
                      }}
                    >
                      {step.step_num}
                    </div>

                    {/* Step Content */}
                    <div style={{ flex: 1 }}>
                      {/* Message */}
                      <p style={{ margin: `0 0 ${theme.spacing.md} 0`, color: theme.colors.text.primary, fontSize: theme.fontSize.base, lineHeight: 1.6 }}>
                        {step.message_template}
                      </p>

                      {/* Document Link */}
                      {step.doc_url && (
                        <a
                          href={step.doc_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: theme.spacing.xs,
                            color: theme.colors.accent.primary,
                            fontSize: theme.fontSize.sm,
                            fontWeight: theme.fontWeight.medium,
                            textDecoration: 'none',
                            marginBottom: theme.spacing.md,
                          }}
                        >
                          {step.doc_title || 'View Document'}
                          <ExternalLink size={14} />
                        </a>
                      )}

                      {/* Triggers */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
                        {/* Success Triggers — or Auto-advance badge for linear */}
                        {(sequence?.sequence_type || 'troubleshooting') === 'linear' ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.xs, alignItems: 'center' }}>
                            <Badge variant="info" size="sm">Auto-advance</Badge>
                          </div>
                        ) : (
                          step.success_triggers && step.success_triggers.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.xs, alignItems: 'center' }}>
                              <span style={{ fontSize: theme.fontSize.xs, color: theme.colors.text.tertiary, fontWeight: theme.fontWeight.medium }}>
                                Success:
                              </span>
                              {step.success_triggers.slice(0, 3).map((trigger, i) => (
                                <Badge key={i} variant="success" size="sm">{trigger}</Badge>
                              ))}
                              {step.success_triggers.length > 3 && (
                                <span style={{ fontSize: theme.fontSize.xs, color: theme.colors.text.tertiary }}>
                                  +{step.success_triggers.length - 3} more
                                </span>
                              )}
                            </div>
                          )
                        )}

                        {/* Failure / Escalation Triggers */}
                        {step.failure_triggers && step.failure_triggers.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.xs, alignItems: 'center' }}>
                            <span style={{ fontSize: theme.fontSize.xs, color: theme.colors.text.tertiary, fontWeight: theme.fontWeight.medium }}>
                              {(sequence?.sequence_type || 'troubleshooting') === 'linear' ? 'Escalation:' : 'Failure:'}
                            </span>
                            {step.failure_triggers.slice(0, 3).map((trigger, i) => (
                              <Badge key={i} variant="danger" size="sm">{trigger}</Badge>
                            ))}
                            {step.failure_triggers.length > 3 && (
                              <span style={{ fontSize: theme.fontSize.xs, color: theme.colors.text.tertiary }}>
                                +{step.failure_triggers.length - 3} more
                              </span>
                            )}
                          </div>
                        )}

                        {/* Handoff */}
                        {step.handoff_trigger && step.handoff_sequence_key && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.xs }}>
                            <GitBranch size={16} color={theme.colors.accent.warning} />
                            <Badge variant="warning" size="sm">
                              If "{step.handoff_trigger}" → {step.handoff_sequence_key}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs, alignItems: 'flex-end' }}>
                      <div style={{ display: 'flex', gap: theme.spacing.xs }}>
                        <button
                          onClick={() => toggleStepActive(step)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: theme.spacing.xs,
                            color: step.is_active === false ? theme.colors.text.tertiary : theme.colors.accent.success,
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title={step.is_active === false ? 'Activate step' : 'Deactivate step'}
                        >
                          {step.is_active === false ? <ToggleLeft size={20} /> : <ToggleRight size={20} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditStep(step)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: theme.spacing.xs,
                            color: theme.colors.accent.primary,
                          }}
                          title="Edit step"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingStep(step);
                            setDeleteStepOpen(true);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: theme.spacing.xs,
                            color: theme.colors.accent.danger,
                          }}
                          title="Delete step"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: theme.spacing.xs, marginTop: theme.spacing.sm }}>
                        <button
                          onClick={() => moveStep(step, 'up')}
                          disabled={index === 0}
                          style={{
                            background: 'none',
                            border: `1px solid ${theme.colors.border.medium}`,
                            borderRadius: theme.radius.sm,
                            cursor: index === 0 ? 'not-allowed' : 'pointer',
                            padding: theme.spacing.xs,
                            color: index === 0 ? theme.colors.text.tertiary : theme.colors.accent.primary,
                            opacity: index === 0 ? 0.5 : 1,
                          }}
                          title="Move up"
                        >
                          <ChevronUp size={18} />
                        </button>
                        <button
                          onClick={() => moveStep(step, 'down')}
                          disabled={index === sortedSteps.length - 1}
                          style={{
                            background: 'none',
                            border: `1px solid ${theme.colors.border.medium}`,
                            borderRadius: theme.radius.sm,
                            cursor: index === sortedSteps.length - 1 ? 'not-allowed' : 'pointer',
                            padding: theme.spacing.xs,
                            color: index === sortedSteps.length - 1 ? theme.colors.text.tertiary : theme.colors.accent.primary,
                            opacity: index === sortedSteps.length - 1 ? 0.5 : 1,
                          }}
                          title="Move down"
                        >
                          <ChevronDown size={18} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Step Supplies Inline */}
                  <StepSuppliesInline
                    stepNum={step.step_num}
                    tools={supplies.tools.filter(t => t.step_num === step.step_num)}
                    parts={supplies.parts.filter(p => p.step_num === step.step_num)}
                    onAddTool={openAddTool}
                    onAddPart={openAddPart}
                    onEditTool={openEditTool}
                    onDeleteTool={openDeleteTool}
                    onEditPart={openEditPart}
                    onDeletePart={openDeletePart}
                    theme={theme}
                    sequenceKey={key}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Add Step Button */}
          <button
            onClick={openAddStep}
            style={{
              width: '100%',
              marginTop: theme.spacing.lg,
              padding: theme.spacing.lg,
              backgroundColor: 'transparent',
              border: `2px dashed ${theme.colors.border.medium}`,
              borderRadius: theme.radius.md,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: theme.spacing.sm,
              color: theme.colors.accent.primary,
              fontSize: theme.fontSize.base,
              fontWeight: theme.fontWeight.medium,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = theme.colors.background.tertiary;
              e.target.style.borderColor = theme.colors.accent.primary;
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.borderColor = theme.colors.border.medium;
            }}
          >
            <Plus size={20} />
            Add Step
          </button>
        </Card>

        {/* Edit Metadata Modal */}
        {editMetadataOpen && <EditMetadataModal />}

        {/* Add Step Modal */}
        {addStepOpen && (
          <StepModal
            isEdit={false}
            stepForm={stepForm}
            allSequences={allSequences}
            onClose={() => setAddStepOpen(false)}
            onSubmit={addStep}
            handleStepNumChange={handleStepNumChange}
            handleMessageChange={handleMessageChange}
            handleDocUrlChange={handleDocUrlChange}
            handleDocTitleChange={handleDocTitleChange}
            handleSuccessTriggersChange={handleSuccessTriggersChange}
            handleFailureTriggersChange={handleFailureTriggersChange}
            handleHasHandoffChange={handleHasHandoffChange}
            handleHandoffTriggerChange={handleHandoffTriggerChange}
            handleHandoffSequenceChange={handleHandoffSequenceChange}
            handleIsActiveChange={handleIsActiveChange}
            sequenceType={sequence?.sequence_type || 'troubleshooting'}
          />
        )}

        {/* Edit Step Modal */}
        {editStepOpen && (
          <StepModal
            isEdit={true}
            stepForm={stepForm}
            allSequences={allSequences}
            onClose={() => setEditStepOpen(false)}
            onSubmit={updateStep}
            handleStepNumChange={handleStepNumChange}
            handleMessageChange={handleMessageChange}
            handleDocUrlChange={handleDocUrlChange}
            handleDocTitleChange={handleDocTitleChange}
            handleSuccessTriggersChange={handleSuccessTriggersChange}
            handleFailureTriggersChange={handleFailureTriggersChange}
            handleHasHandoffChange={handleHasHandoffChange}
            handleHandoffTriggerChange={handleHandoffTriggerChange}
            handleHandoffSequenceChange={handleHandoffSequenceChange}
            handleIsActiveChange={handleIsActiveChange}
            sequenceType={sequence?.sequence_type || 'troubleshooting'}
          />
        )}

        {/* Delete Step Modal */}
        {deleteStepOpen && <DeleteStepModal />}

        {/* Delete Sequence Modal */}
        {deleteSequenceOpen && <DeleteSequenceModal />}

        {/* Tool Modals */}
        {addToolOpen && (
          <Modal onClose={() => setAddToolOpen(false)} title="Add Tool">
            <div style={{ display: 'grid', gap: theme.spacing.lg }}>
              <FormField
                label="Tool Name"
                required
                value={toolForm.tool_name}
                onChange={(e) => setToolForm({ ...toolForm, tool_name: e.target.value })}
              />
              <FormField
                label="Description"
                type="textarea"
                value={toolForm.tool_description}
                onChange={(e) => setToolForm({ ...toolForm, tool_description: e.target.value })}
              />
              <FormField
                label="Link (optional)"
                value={toolForm.tool_link}
                onChange={(e) => setToolForm({ ...toolForm, tool_link: e.target.value })}
                helpText="e.g., https://amazon.com/dp/... or www.example.com"
              />
              <FormField
                label="Required"
                type="select"
                value={toolForm.is_required ? 'true' : 'false'}
                onChange={(e) => setToolForm({ ...toolForm, is_required: e.target.value === 'true' })}
                options={[
                  { value: 'true', label: 'Yes - Required' },
                  { value: 'false', label: 'No - Optional' },
                ]}
              />
              <FormField
                label="Sort Order"
                type="number"
                value={toolForm.sort_order}
                onChange={(e) => setToolForm({ ...toolForm, sort_order: parseInt(e.target.value) || 0 })}
                helpText="Lower numbers appear first"
              />
              {/* Show step indicator or dropdown */}
              {toolForm.step_num !== null ? (
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: theme.spacing.xs,
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    color: theme.colors.text.primary,
                  }}>
                    Applies To
                  </label>
                  <div style={{
                    padding: theme.spacing.sm,
                    backgroundColor: theme.colors.background.tertiary,
                    borderRadius: theme.radius.md,
                    border: `1px solid ${theme.colors.border.light}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.sm,
                  }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: theme.radius.full,
                      backgroundColor: theme.colors.accent.primary,
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: theme.fontSize.xs,
                      fontWeight: theme.fontWeight.bold,
                    }}>
                      {toolForm.step_num}
                    </div>
                    <span style={{ fontSize: theme.fontSize.sm, color: theme.colors.text.primary }}>
                      Step {toolForm.step_num}
                    </span>
                  </div>
                </div>
              ) : (
                <FormField
                  label="Applies To Step"
                  type="select"
                  value=""
                  onChange={(e) => setToolForm({ ...toolForm, step_num: e.target.value === '' ? null : parseInt(e.target.value) })}
                  options={[
                    { value: '', label: 'All Steps (General)' },
                    ...sortedSteps.map(s => ({ value: s.step_num.toString(), label: `Step ${s.step_num}` })),
                  ]}
                  helpText="Which step this tool is needed for"
                />
              )}
              <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setAddToolOpen(false)}
                  style={{
                    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                    backgroundColor: theme.colors.background.tertiary,
                    color: theme.colors.text.primary,
                    border: 'none',
                    borderRadius: theme.radius.md,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={addTool}
                  disabled={!toolForm.tool_name}
                  style={{
                    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                    backgroundColor: theme.colors.accent.primary,
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: theme.radius.md,
                    cursor: toolForm.tool_name ? 'pointer' : 'not-allowed',
                    opacity: toolForm.tool_name ? 1 : 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.xs,
                  }}
                >
                  <Plus size={16} />
                  Add Tool
                </button>
              </div>
            </div>
          </Modal>
        )}

        {editToolOpen && (
          <Modal onClose={() => setEditToolOpen(false)} title="Edit Tool">
            <div style={{ display: 'grid', gap: theme.spacing.lg }}>
              <FormField
                label="Tool Name"
                required
                value={toolForm.tool_name}
                onChange={(e) => setToolForm({ ...toolForm, tool_name: e.target.value })}
              />
              <FormField
                label="Description"
                type="textarea"
                value={toolForm.tool_description}
                onChange={(e) => setToolForm({ ...toolForm, tool_description: e.target.value })}
              />
              <FormField
                label="Link (optional)"
                value={toolForm.tool_link}
                onChange={(e) => setToolForm({ ...toolForm, tool_link: e.target.value })}
                helpText="e.g., https://amazon.com/dp/... or www.example.com"
              />
              <FormField
                label="Required"
                type="select"
                value={toolForm.is_required ? 'true' : 'false'}
                onChange={(e) => setToolForm({ ...toolForm, is_required: e.target.value === 'true' })}
                options={[
                  { value: 'true', label: 'Yes - Required' },
                  { value: 'false', label: 'No - Optional' },
                ]}
              />
              <FormField
                label="Sort Order"
                type="number"
                value={toolForm.sort_order}
                onChange={(e) => setToolForm({ ...toolForm, sort_order: parseInt(e.target.value) || 0 })}
                helpText="Lower numbers appear first"
              />
              <FormField
                label="Applies To Step"
                type="select"
                value={toolForm.step_num === null ? '' : toolForm.step_num.toString()}
                onChange={(e) => setToolForm({ ...toolForm, step_num: e.target.value === '' ? null : parseInt(e.target.value) })}
                options={[
                  { value: '', label: 'All Steps' },
                  ...sortedSteps.map(s => ({ value: s.step_num.toString(), label: `Step ${s.step_num}` })),
                ]}
                helpText="Which step this tool is needed for"
              />
              <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setEditToolOpen(false)}
                  style={{
                    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                    backgroundColor: theme.colors.background.tertiary,
                    color: theme.colors.text.primary,
                    border: 'none',
                    borderRadius: theme.radius.md,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={updateTool}
                  disabled={!toolForm.tool_name}
                  style={{
                    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                    backgroundColor: theme.colors.accent.primary,
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: theme.radius.md,
                    cursor: toolForm.tool_name ? 'pointer' : 'not-allowed',
                    opacity: toolForm.tool_name ? 1 : 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.xs,
                  }}
                >
                  <Save size={16} />
                  Save Changes
                </button>
              </div>
            </div>
          </Modal>
        )}

        {deleteToolOpen && deletingTool && (
          <Modal onClose={() => setDeleteToolOpen(false)} title="Delete Tool">
            <div>
              <p style={{ margin: `0 0 ${theme.spacing.lg} 0`, color: theme.colors.text.primary, fontSize: theme.fontSize.base }}>
                Are you sure you want to delete the tool "<strong>{deletingTool.tool_name}</strong>"?
              </p>
              <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setDeleteToolOpen(false)}
                  style={{
                    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                    backgroundColor: theme.colors.background.tertiary,
                    color: theme.colors.text.primary,
                    border: 'none',
                    borderRadius: theme.radius.md,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={deleteTool}
                  style={{
                    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                    backgroundColor: theme.colors.accent.danger,
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: theme.radius.md,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.xs,
                  }}
                >
                  <Trash2 size={16} />
                  Delete Tool
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Part Modals */}
        {addPartOpen && (
          <Modal onClose={() => setAddPartOpen(false)} title="Add Part">
            <div style={{ display: 'grid', gap: theme.spacing.lg }}>
              <FormField
                label="Part Name"
                required
                value={partForm.part_name}
                onChange={(e) => setPartForm({ ...partForm, part_name: e.target.value })}
              />
              <FormField
                label="Part Number"
                value={partForm.part_number}
                onChange={(e) => setPartForm({ ...partForm, part_number: e.target.value })}
                helpText="Manufacturer part number"
              />
              <FormField
                label="Description"
                type="textarea"
                value={partForm.part_description}
                onChange={(e) => setPartForm({ ...partForm, part_description: e.target.value })}
              />
              <FormField
                label="Buy Link (optional)"
                value={partForm.part_link}
                onChange={(e) => setPartForm({ ...partForm, part_link: e.target.value })}
                helpText="e.g., https://amazon.com/dp/... or www.example.com"
              />
              <FormField
                label="Estimated Price"
                type="number"
                value={partForm.estimated_price}
                onChange={(e) => setPartForm({ ...partForm, estimated_price: e.target.value })}
                helpText="Approximate cost in USD"
              />
              <FormField
                label="Required"
                type="select"
                value={partForm.is_required ? 'true' : 'false'}
                onChange={(e) => setPartForm({ ...partForm, is_required: e.target.value === 'true' })}
                options={[
                  { value: 'true', label: 'Yes - Required' },
                  { value: 'false', label: 'No - Optional' },
                ]}
              />
              <FormField
                label="Sort Order"
                type="number"
                value={partForm.sort_order}
                onChange={(e) => setPartForm({ ...partForm, sort_order: parseInt(e.target.value) || 0 })}
                helpText="Lower numbers appear first"
              />
              {/* Show step indicator or dropdown */}
              {partForm.step_num !== null ? (
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: theme.spacing.xs,
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    color: theme.colors.text.primary,
                  }}>
                    Applies To
                  </label>
                  <div style={{
                    padding: theme.spacing.sm,
                    backgroundColor: theme.colors.background.tertiary,
                    borderRadius: theme.radius.md,
                    border: `1px solid ${theme.colors.border.light}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.sm,
                  }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: theme.radius.full,
                      backgroundColor: theme.colors.accent.primary,
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: theme.fontSize.xs,
                      fontWeight: theme.fontWeight.bold,
                    }}>
                      {partForm.step_num}
                    </div>
                    <span style={{ fontSize: theme.fontSize.sm, color: theme.colors.text.primary }}>
                      Step {partForm.step_num}
                    </span>
                  </div>
                </div>
              ) : (
                <FormField
                  label="Applies To Step"
                  type="select"
                  value=""
                  onChange={(e) => setPartForm({ ...partForm, step_num: e.target.value === '' ? null : parseInt(e.target.value) })}
                  options={[
                    { value: '', label: 'All Steps (General)' },
                    ...sortedSteps.map(s => ({ value: s.step_num.toString(), label: `Step ${s.step_num}` })),
                  ]}
                  helpText="Which step this part is needed for"
                />
              )}
              <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setAddPartOpen(false)}
                  style={{
                    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                    backgroundColor: theme.colors.background.tertiary,
                    color: theme.colors.text.primary,
                    border: 'none',
                    borderRadius: theme.radius.md,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={addPart}
                  disabled={!partForm.part_name}
                  style={{
                    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                    backgroundColor: theme.colors.accent.success,
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: theme.radius.md,
                    cursor: partForm.part_name ? 'pointer' : 'not-allowed',
                    opacity: partForm.part_name ? 1 : 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.xs,
                  }}
                >
                  <Plus size={16} />
                  Add Part
                </button>
              </div>
            </div>
          </Modal>
        )}

        {editPartOpen && (
          <Modal onClose={() => setEditPartOpen(false)} title="Edit Part">
            <div style={{ display: 'grid', gap: theme.spacing.lg }}>
              <FormField
                label="Part Name"
                required
                value={partForm.part_name}
                onChange={(e) => setPartForm({ ...partForm, part_name: e.target.value })}
              />
              <FormField
                label="Part Number"
                value={partForm.part_number}
                onChange={(e) => setPartForm({ ...partForm, part_number: e.target.value })}
                helpText="Manufacturer part number"
              />
              <FormField
                label="Description"
                type="textarea"
                value={partForm.part_description}
                onChange={(e) => setPartForm({ ...partForm, part_description: e.target.value })}
              />
              <FormField
                label="Buy Link (optional)"
                value={partForm.part_link}
                onChange={(e) => setPartForm({ ...partForm, part_link: e.target.value })}
                helpText="e.g., https://amazon.com/dp/... or www.example.com"
              />
              <FormField
                label="Estimated Price"
                type="number"
                value={partForm.estimated_price}
                onChange={(e) => setPartForm({ ...partForm, estimated_price: e.target.value })}
                helpText="Approximate cost in USD"
              />
              <FormField
                label="Required"
                type="select"
                value={partForm.is_required ? 'true' : 'false'}
                onChange={(e) => setPartForm({ ...partForm, is_required: e.target.value === 'true' })}
                options={[
                  { value: 'true', label: 'Yes - Required' },
                  { value: 'false', label: 'No - Optional' },
                ]}
              />
              <FormField
                label="Sort Order"
                type="number"
                value={partForm.sort_order}
                onChange={(e) => setPartForm({ ...partForm, sort_order: parseInt(e.target.value) || 0 })}
                helpText="Lower numbers appear first"
              />
              <FormField
                label="Applies To Step"
                type="select"
                value={partForm.step_num === null ? '' : partForm.step_num.toString()}
                onChange={(e) => setPartForm({ ...partForm, step_num: e.target.value === '' ? null : parseInt(e.target.value) })}
                options={[
                  { value: '', label: 'All Steps' },
                  ...sortedSteps.map(s => ({ value: s.step_num.toString(), label: `Step ${s.step_num}` })),
                ]}
                helpText="Which step this part is needed for"
              />
              <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setEditPartOpen(false)}
                  style={{
                    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                    backgroundColor: theme.colors.background.tertiary,
                    color: theme.colors.text.primary,
                    border: 'none',
                    borderRadius: theme.radius.md,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={updatePart}
                  disabled={!partForm.part_name}
                  style={{
                    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                    backgroundColor: theme.colors.accent.success,
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: theme.radius.md,
                    cursor: partForm.part_name ? 'pointer' : 'not-allowed',
                    opacity: partForm.part_name ? 1 : 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.xs,
                  }}
                >
                  <Save size={16} />
                  Save Changes
                </button>
              </div>
            </div>
          </Modal>
        )}

        {deletePartOpen && deletingPart && (
          <Modal onClose={() => setDeletePartOpen(false)} title="Delete Part">
            <div>
              <p style={{ margin: `0 0 ${theme.spacing.lg} 0`, color: theme.colors.text.primary, fontSize: theme.fontSize.base }}>
                Are you sure you want to delete the part "<strong>{deletingPart.part_name}</strong>"?
              </p>
              <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setDeletePartOpen(false)}
                  style={{
                    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                    backgroundColor: theme.colors.background.tertiary,
                    color: theme.colors.text.primary,
                    border: 'none',
                    borderRadius: theme.radius.md,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={deletePart}
                  style={{
                    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                    backgroundColor: theme.colors.accent.danger,
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: theme.radius.md,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.xs,
                  }}
                >
                  <Trash2 size={16} />
                  Delete Part
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Spinner Animation */}
        <style>
          {`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    </div>
  );

  // Modal Components
  function EditMetadataModal() {
    return (
      <Modal onClose={() => setEditMetadataOpen(false)} title="Edit Sequence Metadata">
        <div style={{ display: 'grid', gap: theme.spacing.lg }}>
          <FormField
            label="Display Name"
            required
            value={metadataForm.displayName}
            onChange={(e) => setMetadataForm({ ...metadataForm, displayName: e.target.value })}
          />
          <FormField
            label="Description"
            required
            type="textarea"
            value={metadataForm.description}
            onChange={(e) => setMetadataForm({ ...metadataForm, description: e.target.value })}
          />
          <FormField
            label="Category"
            required
            type="select"
            value={metadataForm.category}
            onChange={(e) => setMetadataForm({ ...metadataForm, category: e.target.value })}
            options={[
              { value: '', label: 'Select a category...' },
              { value: 'Electrical', label: 'Electrical' },
              { value: 'Plumbing', label: 'Plumbing' },
              { value: 'HVAC', label: 'HVAC' },
              { value: 'Appliances', label: 'Appliances' },
              { value: 'Mechanical', label: 'Mechanical' },
              { value: 'Other', label: 'Other' },
            ]}
          />
          <FormField
            label="Sequence Type"
            type="select"
            value={metadataForm.sequenceType}
            onChange={(e) => setMetadataForm({ ...metadataForm, sequenceType: e.target.value })}
            options={[
              { value: 'troubleshooting', label: 'Troubleshooting' },
              { value: 'linear', label: 'Linear' },
            ]}
            helpText="Troubleshooting: step-by-step issue diagnosis. Linear: walkthrough guide (e.g., onboarding)."
          />
          <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setEditMetadataOpen(false)}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                backgroundColor: theme.colors.background.tertiary,
                color: theme.colors.text.primary,
                border: 'none',
                borderRadius: theme.radius.md,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={updateMetadata}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                backgroundColor: theme.colors.accent.primary,
                color: '#ffffff',
                border: 'none',
                borderRadius: theme.radius.md,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
              }}
            >
              <Save size={16} />
              Save Changes
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  function DeleteStepModal() {
    return (
      <Modal onClose={() => setDeleteStepOpen(false)} title="Delete Step">
        <div>
          <p style={{ margin: `0 0 ${theme.spacing.lg} 0`, color: theme.colors.text.primary, fontSize: theme.fontSize.base }}>
            Are you sure you want to delete step {deletingStep?.step_num}? This cannot be undone.
          </p>
          {deletingStep?.message_template && (
            <div
              style={{
                padding: theme.spacing.md,
                backgroundColor: theme.colors.background.tertiary,
                borderRadius: theme.radius.md,
                marginBottom: theme.spacing.lg,
              }}
            >
              <p style={{ margin: 0, color: theme.colors.text.secondary, fontSize: theme.fontSize.sm }}>
                {deletingStep.message_template.substring(0, 100)}
                {deletingStep.message_template.length > 100 ? '...' : ''}
              </p>
            </div>
          )}
          <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setDeleteStepOpen(false)}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                backgroundColor: theme.colors.background.tertiary,
                color: theme.colors.text.primary,
                border: 'none',
                borderRadius: theme.radius.md,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={deleteStep}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                backgroundColor: theme.colors.accent.danger,
                color: '#ffffff',
                border: 'none',
                borderRadius: theme.radius.md,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
              }}
            >
              <Trash2 size={16} />
              Delete Step
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  function DeleteSequenceModal() {
    return (
      <Modal onClose={() => setDeleteSequenceOpen(false)} title="Delete Sequence">
        <div>
          <p style={{ margin: `0 0 ${theme.spacing.md} 0`, color: theme.colors.text.primary, fontSize: theme.fontSize.base }}>
            Are you sure you want to delete the entire sequence "<strong>{sequence?.display_name}</strong>"?
          </p>
          <p style={{ margin: `0 0 ${theme.spacing.lg} 0`, color: theme.colors.text.secondary, fontSize: theme.fontSize.base }}>
            This will delete all {sortedSteps.length} step{sortedSteps.length !== 1 ? 's' : ''}. This action cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setDeleteSequenceOpen(false)}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                backgroundColor: theme.colors.background.tertiary,
                color: theme.colors.text.primary,
                border: 'none',
                borderRadius: theme.radius.md,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={deleteSequence}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                backgroundColor: theme.colors.accent.danger,
                color: '#ffffff',
                border: 'none',
                borderRadius: theme.radius.md,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
              }}
            >
              <Trash2 size={16} />
              Delete Sequence
            </button>
          </div>
        </div>
      </Modal>
    );
  }
}

export default SequenceDetail;
