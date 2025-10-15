import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ticket,
  User,
  Phone,
  Mail,
  Truck,
  Tag,
  ArrowLeft,
  Plus,
  Copy,
  CheckCircle,
  AlertTriangle,
  ArrowUp,
  Minus,
  ArrowDown
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Card from '../components/Card';
import Badge from '../components/Badge';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { theme } from '../styles/theme';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const CreateTicket = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, logout, hasRole } = useAuth();

  // Form state
  const [formData, setFormData] = useState({
    owner_name: '',
    phone: '',
    email: '',
    subject: '',
    description: '',
    priority: 'normal',
    urgency: 'medium',
    van_id: '',
    category_id: ''
  });

  // Validation errors
  const [errors, setErrors] = useState({});

  // Submission state
  const [submitting, setSubmitting] = useState(false);

  // Success modal state
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdTicket, setCreatedTicket] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    // Owner name (customer name)
    if (!formData.owner_name.trim()) {
      newErrors.owner_name = 'Customer name is required';
    } else if (formData.owner_name.trim().length < 2) {
      newErrors.owner_name = 'Customer name must be at least 2 characters';
    }

    // Phone number
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format';
    }

    // Email (optional but validate if provided)
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Invalid email format';
      }
    }

    // Subject
    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    } else if (formData.subject.trim().length < 5) {
      newErrors.subject = 'Subject must be at least 5 characters';
    } else if (formData.subject.length > 200) {
      newErrors.subject = 'Subject must be less than 200 characters';
    }

    // Description
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 20) {
      newErrors.description = 'Description must be at least 20 characters';
    } else if (formData.description.length > 2000) {
      newErrors.description = 'Description must be less than 2000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('Please fix the errors in the form', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/tickets/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          owner_name: formData.owner_name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || null,
          subject: formData.subject.trim(),
          issue_summary: formData.subject.trim(), // Legacy field - use subject as summary
          description: formData.description.trim(),
          priority: formData.priority,
          urgency: formData.urgency || null,
          van_id: null,  // TODO: Add dropdown with actual UUID values from lookup table
          category_id: null  // TODO: Add dropdown with actual UUID values from lookup table
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create ticket');
      }

      const newTicket = await response.json();

      // Debug: Log the API response
      console.log('🎫 Created ticket response:', newTicket);
      console.log('🎫 Ticket ID:', newTicket.ticket_id);
      console.log('🎫 Ticket Number:', newTicket.ticket_number);

      // Extract ticket data correctly - use ticket_id not id
      const ticketState = {
        id: newTicket.ticket_id,           // For navigation
        number: newTicket.ticket_number,   // For display
        uuid: newTicket.ticket_id          // For public link
      };

      console.log('🎫 Setting state:', ticketState);
      setCreatedTicket(ticketState);
      setShowSuccess(true);
      showToast(`Ticket #${newTicket.ticket_number} created successfully!`, 'success');
    } catch (error) {
      console.error('Error creating ticket:', error);
      showToast(error.message || 'Failed to create ticket', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Copy link to clipboard
  const handleCopyLink = () => {
    if (createdTicket) {
      const link = `${window.location.origin}/ticket/${createdTicket.uuid}`;
      navigator.clipboard.writeText(link);
      setLinkCopied(true);
      showToast('Link copied to clipboard!', 'success');
      setTimeout(() => setLinkCopied(false), 3000);
    }
  };

  // Create another ticket
  const handleCreateAnother = () => {
    setShowSuccess(false);
    setCreatedTicket(null);
    setLinkCopied(false);
    setFormData({
      owner_name: '',
      phone: '',
      email: '',
      subject: '',
      description: '',
      priority: 'normal',
      urgency: 'medium',
      van_id: '',
      category_id: ''
    });
    setErrors({});
  };

  // Get priority badge config
  const getPriorityBadge = (priority) => {
    const configs = {
      urgent: { color: 'red', icon: AlertTriangle, label: 'Urgent' },
      high: { color: 'orange', icon: ArrowUp, label: 'High' },
      normal: { color: 'blue', icon: Minus, label: 'Normal' },
      low: { color: 'gray', icon: ArrowDown, label: 'Low' }
    };
    return configs[priority] || configs.normal;
  };

  const priorityConfig = getPriorityBadge(formData.priority);
  const PriorityIcon = priorityConfig.icon;

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#f9fafb' }}>
      <Sidebar user={user} onLogout={logout} hasRole={hasRole} />

      <div style={{ marginLeft: '260px', flex: 1, padding: '2rem' }}>
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/tickets')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#6b7280',
              fontSize: '0.875rem',
              marginBottom: '16px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#111827')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#6b7280')}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Tickets
          </button>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#1e3a5f] rounded-lg">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 style={{ color: '#111827', fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '4px' }}>
                Create New Ticket
              </h1>
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Create a support ticket for a customer
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Customer Information */}
              <Card>
                <div className="p-6">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                    <User style={{ width: '20px', height: '20px', color: '#1e3a5f' }} />
                    <h2 style={{ color: '#111827', fontSize: '1.125rem', fontWeight: '600', margin: 0 }}>
                      Customer Information
                    </h2>
                  </div>

                  <div className="space-y-4">
                    {/* Customer Name */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: theme.fontSize.sm,
                        fontWeight: theme.fontWeight.medium,
                        color: theme.colors.text.secondary,
                        marginBottom: theme.spacing.xs
                      }}>
                        Customer Name <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input
                        type="text"
                        name="owner_name"
                        value={formData.owner_name}
                        onChange={handleChange}
                        placeholder="Enter customer name"
                        required
                        style={{
                          width: '100%',
                          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                          backgroundColor: theme.colors.background.tertiary,
                          color: theme.colors.text.primary,
                          border: `1px solid ${errors.owner_name ? '#dc2626' : theme.colors.border.medium}`,
                          borderRadius: theme.radius.md,
                          fontSize: theme.fontSize.sm,
                          outline: 'none'
                        }}
                      />
                      {errors.owner_name && (
                        <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '4px' }}>
                          {errors.owner_name}
                        </p>
                      )}
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: theme.fontSize.sm,
                        fontWeight: theme.fontWeight.medium,
                        color: theme.colors.text.secondary,
                        marginBottom: theme.spacing.xs
                      }}>
                        Phone Number <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Phone style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '16px',
                          height: '16px',
                          color: '#9ca3af'
                        }} />
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="+1 555 555 1234"
                          required
                          style={{
                            width: '100%',
                            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                            paddingLeft: '40px',
                            backgroundColor: theme.colors.background.tertiary,
                            color: theme.colors.text.primary,
                            border: `1px solid ${errors.phone ? '#dc2626' : theme.colors.border.medium}`,
                            borderRadius: theme.radius.md,
                            fontSize: theme.fontSize.sm,
                            outline: 'none'
                          }}
                        />
                      </div>
                      {errors.phone && (
                        <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '4px' }}>
                          {errors.phone}
                        </p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: theme.fontSize.sm,
                        fontWeight: theme.fontWeight.medium,
                        color: theme.colors.text.secondary,
                        marginBottom: theme.spacing.xs
                      }}>
                        Email <span style={{ color: '#6b7280', fontWeight: 'normal' }}>(optional)</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Mail style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '16px',
                          height: '16px',
                          color: '#9ca3af'
                        }} />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="customer@example.com"
                          style={{
                            width: '100%',
                            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                            paddingLeft: '40px',
                            backgroundColor: theme.colors.background.tertiary,
                            color: theme.colors.text.primary,
                            border: `1px solid ${errors.email ? '#dc2626' : theme.colors.border.medium}`,
                            borderRadius: theme.radius.md,
                            fontSize: theme.fontSize.sm,
                            outline: 'none'
                          }}
                        />
                      </div>
                      {errors.email && (
                        <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '4px' }}>
                          {errors.email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Van Information */}
              <Card>
                <div className="p-6">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                    <Truck style={{ width: '20px', height: '20px', color: '#1e3a5f' }} />
                    <h2 style={{ color: '#111827', fontSize: '1.125rem', fontWeight: '600', margin: 0 }}>
                      Van Information
                    </h2>
                  </div>

                  <div className="space-y-4">
                    {/* Van Info */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: theme.fontSize.sm,
                        fontWeight: theme.fontWeight.medium,
                        color: theme.colors.text.secondary,
                        marginBottom: theme.spacing.xs
                      }}>
                        Van Number/ID <span style={{ color: '#6b7280', fontWeight: 'normal' }}>(optional)</span>
                      </label>
                      <input
                        type="text"
                        name="van_id"
                        value={formData.van_id}
                        onChange={handleChange}
                        placeholder="e.g., VAN-123 or Ford Transit 2020"
                        style={{
                          width: '100%',
                          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                          backgroundColor: theme.colors.background.tertiary,
                          color: theme.colors.text.primary,
                          border: `1px solid ${theme.colors.border.medium}`,
                          borderRadius: theme.radius.md,
                          fontSize: theme.fontSize.sm,
                          outline: 'none'
                        }}
                      />
                      <p style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '4px' }}>
                        Link this ticket to a specific van
                      </p>
                    </div>

                    {/* Category */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: theme.fontSize.sm,
                        fontWeight: theme.fontWeight.medium,
                        color: theme.colors.text.secondary,
                        marginBottom: theme.spacing.xs
                      }}>
                        Category <span style={{ color: '#6b7280', fontWeight: 'normal' }}>(optional)</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Tag style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '16px',
                          height: '16px',
                          color: '#9ca3af'
                        }} />
                        <input
                          type="text"
                          name="category_id"
                          value={formData.category_id}
                          onChange={handleChange}
                          placeholder="e.g., Electrical, Plumbing, Mechanical"
                          style={{
                            width: '100%',
                            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                            paddingLeft: '40px',
                            backgroundColor: theme.colors.background.tertiary,
                            color: theme.colors.text.primary,
                            border: `1px solid ${theme.colors.border.medium}`,
                            borderRadius: theme.radius.md,
                            fontSize: theme.fontSize.sm,
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Ticket Details */}
              <Card>
                <div className="p-6">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                    <Ticket style={{ width: '20px', height: '20px', color: '#1e3a5f' }} />
                    <h2 style={{ color: '#111827', fontSize: '1.125rem', fontWeight: '600', margin: 0 }}>
                      Ticket Details
                    </h2>
                  </div>

                  <div className="space-y-4">
                    {/* Subject */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: theme.fontSize.sm,
                        fontWeight: theme.fontWeight.medium,
                        color: theme.colors.text.secondary,
                        marginBottom: theme.spacing.xs
                      }}>
                        Subject <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input
                        type="text"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder="Brief description of the issue"
                        maxLength={200}
                        required
                        style={{
                          width: '100%',
                          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                          backgroundColor: theme.colors.background.tertiary,
                          color: theme.colors.text.primary,
                          border: `1px solid ${errors.subject ? '#dc2626' : theme.colors.border.medium}`,
                          borderRadius: theme.radius.md,
                          fontSize: theme.fontSize.sm,
                          outline: 'none'
                        }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                        {errors.subject ? (
                          <p style={{ color: '#dc2626', fontSize: '0.75rem' }}>
                            {errors.subject}
                          </p>
                        ) : (
                          <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                            {formData.subject.length}/200 characters
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: theme.fontSize.sm,
                        fontWeight: theme.fontWeight.medium,
                        color: theme.colors.text.secondary,
                        marginBottom: theme.spacing.xs
                      }}>
                        Description <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Describe the issue in detail..."
                        rows={6}
                        maxLength={2000}
                        required
                        style={{
                          width: '100%',
                          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                          backgroundColor: theme.colors.background.tertiary,
                          color: theme.colors.text.primary,
                          border: `1px solid ${errors.description ? '#dc2626' : theme.colors.border.medium}`,
                          borderRadius: theme.radius.md,
                          fontSize: theme.fontSize.sm,
                          outline: 'none',
                          resize: 'vertical'
                        }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                        {errors.description ? (
                          <p style={{ color: '#dc2626', fontSize: '0.75rem' }}>
                            {errors.description}
                          </p>
                        ) : (
                          <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                            {formData.description.length}/2000 characters (minimum 20)
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Priority */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: theme.fontSize.sm,
                        fontWeight: theme.fontWeight.medium,
                        color: theme.colors.text.secondary,
                        marginBottom: theme.spacing.xs
                      }}>
                        Priority <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <select
                        name="priority"
                        value={formData.priority}
                        onChange={handleChange}
                        required
                        style={{
                          width: '100%',
                          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                          backgroundColor: theme.colors.background.tertiary,
                          color: theme.colors.text.primary,
                          border: `1px solid ${theme.colors.border.medium}`,
                          borderRadius: theme.radius.md,
                          fontSize: theme.fontSize.sm,
                          fontWeight: theme.fontWeight.medium,
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      >
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                      <div style={{ marginTop: '8px' }}>
                        <Badge color={priorityConfig.color}>
                          <PriorityIcon className="w-3 h-3 mr-1" />
                          {priorityConfig.label}
                        </Badge>
                      </div>
                    </div>

                    {/* Urgency */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: theme.fontSize.sm,
                        fontWeight: theme.fontWeight.medium,
                        color: theme.colors.text.secondary,
                        marginBottom: theme.spacing.xs
                      }}>
                        Urgency <span style={{ color: '#6b7280', fontWeight: 'normal' }}>(optional)</span>
                      </label>
                      <select
                        name="urgency"
                        value={formData.urgency}
                        onChange={handleChange}
                        style={{
                          width: '100%',
                          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                          backgroundColor: theme.colors.background.tertiary,
                          color: theme.colors.text.primary,
                          border: `1px solid ${theme.colors.border.medium}`,
                          borderRadius: theme.radius.md,
                          fontSize: theme.fontSize.sm,
                          fontWeight: theme.fontWeight.medium,
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Submit Button */}
          <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => navigate('/tickets')}
              style={{
                padding: '12px 20px',
                backgroundColor: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                color: '#374151',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                backgroundColor: '#1e3a5f',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.5 : 1,
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => !submitting && (e.currentTarget.style.backgroundColor = '#2c5282')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1e3a5f')}
            >
              <Plus size={18} />
              {submitting ? 'Creating Ticket...' : 'Create Ticket'}
            </button>
          </div>
        </form>

        {/* Success Modal */}
        {showSuccess && createdTicket && (
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
            <Card style={{ maxWidth: '600px', width: '100%' }}>
              <div className="p-8">
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: '#d1fae5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px'
                  }}>
                    <CheckCircle style={{ width: '32px', height: '32px', color: '#059669' }} />
                  </div>
                  <h2 style={{ color: '#111827', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px' }}>
                    Ticket #{createdTicket.number} Created!
                  </h2>
                  <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                    The support ticket has been created successfully
                  </p>
                </div>

                {/* Shareable Link */}
                <div style={{
                  padding: '16px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  marginBottom: '24px'
                }}>
                  <label style={{
                    display: 'block',
                    color: '#374151',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    marginBottom: '8px'
                  }}>
                    Customer Link (share with customer)
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={`${window.location.origin}/ticket/${createdTicket.uuid}`}
                      readOnly
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        backgroundColor: 'white',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        color: '#111827'
                      }}
                    />
                    <button
                      onClick={handleCopyLink}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '10px 16px',
                        backgroundColor: linkCopied ? '#059669' : '#1e3a5f',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'white',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s'
                      }}
                    >
                      {linkCopied ? (
                        <>
                          <CheckCircle size={16} />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={16} />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => navigate(`/tickets/${createdTicket.id}`)}
                    style={{
                      flex: 1,
                      padding: '12px 20px',
                      backgroundColor: '#1e3a5f',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2c5282')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1e3a5f')}
                  >
                    View Ticket
                  </button>
                  <button
                    onClick={handleCreateAnother}
                    style={{
                      flex: 1,
                      padding: '12px 20px',
                      backgroundColor: 'white',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      color: '#374151',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
                  >
                    Create Another
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

export default CreateTicket;
