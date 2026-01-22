import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  ArrowDown,
  Loader2,
  ChevronDown,
  Search,
  X
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
    owner_id: '', // Selected owner UUID for filtering vans
    van_id: '',   // Selected van UUID
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

  // Owners, Vans, and Categories state for dropdowns
  const [owners, setOwners] = useState([]);
  const [vans, setVans] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingOwners, setLoadingOwners] = useState(true);
  const [loadingVans, setLoadingVans] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Owner dropdown search state
  const [ownerSearchQuery, setOwnerSearchQuery] = useState('');
  const [ownerDropdownOpen, setOwnerDropdownOpen] = useState(false);

  // Van dropdown search state
  const [vanSearchQuery, setVanSearchQuery] = useState('');
  const [vanDropdownOpen, setVanDropdownOpen] = useState(false);

  // Refs for click-outside detection and positioning
  const ownerDropdownRef = useRef(null);
  const ownerTriggerRef = useRef(null);
  const vanDropdownRef = useRef(null);
  const vanTriggerRef = useRef(null);

  // State for dropdown positions (for fixed positioning)
  const [ownerDropdownPosition, setOwnerDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [vanDropdownPosition, setVanDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  // Ref for success modal focus management
  const successModalRef = useRef(null);

  /**
   * Close owner dropdown when clicking outside.
   * Checks both the trigger ref and the portal-rendered dropdown.
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is inside the trigger element
      const isInsideTrigger = ownerDropdownRef.current && ownerDropdownRef.current.contains(event.target);
      // Check if click is inside the portal-rendered dropdown (by id)
      const dropdownElement = document.getElementById('owner-listbox');
      const isInsideDropdown = dropdownElement && dropdownElement.contains(event.target);

      if (!isInsideTrigger && !isInsideDropdown) {
        setOwnerDropdownOpen(false);
      }
    };

    if (ownerDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ownerDropdownOpen]);

  /**
   * Close van dropdown when clicking outside.
   * Checks both the trigger ref and the portal-rendered dropdown.
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is inside the trigger element
      const isInsideTrigger = vanDropdownRef.current && vanDropdownRef.current.contains(event.target);
      // Check if click is inside the portal-rendered dropdown (by id)
      const dropdownElement = document.getElementById('van-listbox');
      const isInsideDropdown = dropdownElement && dropdownElement.contains(event.target);

      if (!isInsideTrigger && !isInsideDropdown) {
        setVanDropdownOpen(false);
      }
    };

    if (vanDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [vanDropdownOpen]);

  /**
   * Focus success modal when it opens for accessibility.
   */
  useEffect(() => {
    if (showSuccess && successModalRef.current) {
      successModalRef.current.focus();
    }
  }, [showSuccess]);

  /**
   * Fetch all owners on component mount.
   * Uses a high limit to get all owners for the dropdown.
   */
  const fetchOwners = useCallback(async (signal) => {
    setLoadingOwners(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/owners?limit=100`, {
        credentials: 'include',
        signal
      });
      if (!response.ok) {
        throw new Error('Failed to fetch owners');
      }
      const data = await response.json();
      setOwners(data.owners || []);
    } catch (error) {
      if (error.name === 'AbortError') return;
      showToast('Failed to load owners', 'error');
    } finally {
      setLoadingOwners(false);
    }
  }, [showToast]);

  // Ref to track current owner fetch to prevent race conditions
  const currentOwnerFetchRef = useRef(null);

  /**
   * Fetch vans for a specific owner.
   * Called when an owner is selected to get their associated vans.
   * Uses a ref to track the current fetch and prevent race conditions.
   */
  const fetchVansForOwner = useCallback(async (ownerId) => {
    if (!ownerId) {
      setVans([]);
      return;
    }

    // Track this fetch to prevent race conditions
    const fetchId = ownerId;
    currentOwnerFetchRef.current = fetchId;

    setLoadingVans(true);
    setVans([]); // Clear previous vans immediately

    try {
      const response = await fetch(`${API_BASE_URL}/api/vans?owner_id=${ownerId}&limit=100`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch vans');
      }
      const data = await response.json();

      // Only update state if this is still the current fetch (prevents race conditions)
      if (currentOwnerFetchRef.current === fetchId) {
        setVans(data.vans || []);
      }
    } catch (error) {
      if (currentOwnerFetchRef.current === fetchId) {
        showToast('Failed to load vans', 'error');
      }
    } finally {
      if (currentOwnerFetchRef.current === fetchId) {
        setLoadingVans(false);
      }
    }
  }, [showToast]);

  /**
   * Fetch categories on component mount.
   */
  const fetchCategories = useCallback(async (signal) => {
    setLoadingCategories(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/categories`, {
        credentials: 'include',
        signal
      });
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      if (error.name === 'AbortError') return;
      // Don't show toast for categories - it's optional
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  // Fetch owners and categories on component mount with AbortController
  // Vans are fetched when an owner is selected
  useEffect(() => {
    const controller = new AbortController();
    fetchOwners(controller.signal);
    fetchCategories(controller.signal);
    return () => controller.abort();
  }, [fetchOwners, fetchCategories]);

  /**
   * Get filtered vans for the selected owner.
   * The vans are already filtered by owner_id from the API,
   * so this just returns the vans array (or empty if no owner selected).
   */
  const filteredVans = useMemo(() => {
    if (!formData.owner_id) {
      return [];
    }
    // Vans are already filtered by owner_id from the API
    return vans;
  }, [vans, formData.owner_id, loadingVans]);

  /**
   * Further filter vans by search query for the searchable dropdown.
   * Searches by van_number, make, and year.
   */
  const searchFilteredVans = useMemo(() => {
    if (!vanSearchQuery.trim()) {
      return filteredVans;
    }
    const query = vanSearchQuery.toLowerCase();
    return filteredVans.filter(van => {
      const vanNumber = (van.van_number || '').toLowerCase();
      const make = (van.make || '').toLowerCase();
      const year = String(van.year || '');
      return vanNumber.includes(query) || make.includes(query) || year.includes(query);
    });
  }, [filteredVans, vanSearchQuery]);

  /**
   * Get the currently selected van object for display purposes.
   */
  const selectedVan = useMemo(() => {
    if (!formData.van_id) return null;
    return vans.find(v => v.id === formData.van_id) || null;
  }, [vans, formData.van_id]);

  /**
   * Get the currently selected owner object for display and auto-populate.
   */
  const selectedOwner = useMemo(() => {
    if (!formData.owner_id) return null;
    return owners.find(o => o.id === formData.owner_id) || null;
  }, [owners, formData.owner_id]);

  /**
   * Filter owners by search query for the searchable dropdown.
   * Searches by name, company, phone, and email.
   */
  const searchFilteredOwners = useMemo(() => {
    if (!ownerSearchQuery.trim()) {
      return owners;
    }
    const query = ownerSearchQuery.toLowerCase();
    return owners.filter(owner => {
      const name = (owner.name || '').toLowerCase();
      const company = (owner.company || '').toLowerCase();
      const phone = (owner.phone || '').toLowerCase();
      const email = (owner.email || '').toLowerCase();
      return name.includes(query) || company.includes(query) || phone.includes(query) || email.includes(query);
    });
  }, [owners, ownerSearchQuery]);

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

  /**
   * Calculate and set dropdown position for fixed positioning.
   */
  const updateOwnerDropdownPosition = useCallback(() => {
    if (ownerTriggerRef.current) {
      const rect = ownerTriggerRef.current.getBoundingClientRect();
      setOwnerDropdownPosition({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
  }, []);

  const updateVanDropdownPosition = useCallback(() => {
    if (vanTriggerRef.current) {
      const rect = vanTriggerRef.current.getBoundingClientRect();
      setVanDropdownPosition({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
  }, []);

  /**
   * Handle opening owner dropdown with position calculation.
   */
  const handleOwnerDropdownToggle = () => {
    if (!ownerDropdownOpen) {
      updateOwnerDropdownPosition();
    }
    setOwnerDropdownOpen(!ownerDropdownOpen);
  };

  /**
   * Handle opening van dropdown with position calculation.
   */
  const handleVanDropdownToggle = () => {
    if (!vanDropdownOpen) {
      updateVanDropdownPosition();
    }
    setVanDropdownOpen(!vanDropdownOpen);
  };

  /**
   * Handle owner selection from the searchable dropdown.
   * Fetches vans for the selected owner.
   */
  const handleOwnerSelect = (ownerId) => {
    const owner = owners.find(o => o.id === ownerId);

    setFormData(prev => ({
      ...prev,
      owner_id: ownerId,
      owner_name: owner?.name || '',
      phone: owner?.phone || '',
      email: owner?.email || '',
      van_id: '' // Clear van selection when owner changes
    }));
    setOwnerSearchQuery('');
    setOwnerDropdownOpen(false);
    setVanSearchQuery(''); // Reset van search
    setVanDropdownOpen(false); // Close van dropdown

    // Fetch vans for this owner
    fetchVansForOwner(ownerId);

    // Clear owner error if present
    if (errors.owner_name) {
      setErrors(prev => ({
        ...prev,
        owner_name: null
      }));
    }
  };

  /**
   * Clear the owner selection and vans.
   */
  const handleClearOwner = () => {
    setFormData(prev => ({
      ...prev,
      owner_id: '',
      owner_name: '',
      phone: '',
      email: '',
      van_id: ''
    }));
    setOwnerSearchQuery('');
    setVanSearchQuery('');
    setVans([]); // Clear vans since no owner is selected
  };

  /**
   * Handle van selection from the custom searchable dropdown.
   */
  const handleVanSelect = (vanId) => {
    setFormData(prev => ({
      ...prev,
      van_id: vanId
    }));
    setVanSearchQuery('');
    setVanDropdownOpen(false);

    // Clear error for van_id if present
    if (errors.van_id) {
      setErrors(prev => ({
        ...prev,
        van_id: null
      }));
    }
  };

  /**
   * Clear the van selection.
   */
  const handleClearVan = () => {
    setFormData(prev => ({
      ...prev,
      van_id: ''
    }));
    setVanSearchQuery('');
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    // Owner selection (customer)
    if (!formData.owner_id) {
      newErrors.owner_name = 'Please select a customer';
    }

    // Phone number - should be auto-filled from owner
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required - please select a customer';
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
          owner_id: formData.owner_id || null,  // Owner UUID from dropdown
          van_id: formData.van_id || null,  // Van UUID from dropdown
          category_id: formData.category_id || null  // Category from dropdown
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create ticket');
      }

      const newTicket = await response.json();

      // Extract ticket data correctly - use ticket_id not id
      const ticketState = {
        id: newTicket.ticket_id,           // For navigation
        number: newTicket.ticket_number,   // For display
        uuid: newTicket.ticket_id          // For public link
      };

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

  // Copy link to clipboard with error handling
  const handleCopyLink = async () => {
    if (createdTicket) {
      const link = `${window.location.origin}/ticket/${createdTicket.uuid}`;
      try {
        await navigator.clipboard.writeText(link);
        setLinkCopied(true);
        showToast('Link copied to clipboard!', 'success');
        setTimeout(() => setLinkCopied(false), 3000);
      } catch (err) {
        showToast('Failed to copy link to clipboard', 'error');
      }
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
      owner_id: '',
      van_id: '',
      category_id: ''
    });
    setOwnerSearchQuery('');
    setOwnerDropdownOpen(false);
    setErrors({});
    setVanSearchQuery('');
    setVanDropdownOpen(false);
    setVans([]); // Clear vans since no owner is selected
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
                    {/* Customer Name - Searchable dropdown from owners */}
                    <div>
                      <label
                        id="owner_id-label"
                        style={{
                          display: 'block',
                          fontSize: theme.fontSize.sm,
                          fontWeight: theme.fontWeight.medium,
                          color: theme.colors.text.secondary,
                          marginBottom: theme.spacing.xs
                        }}
                      >
                        Customer Name <span aria-hidden="true" style={{ color: '#dc2626' }}>*</span>
                        <span className="sr-only">(required)</span>
                      </label>

                      {/* Owner searchable dropdown */}
                      <div ref={ownerDropdownRef} style={{ position: 'relative' }}>
                        <User aria-hidden="true" style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '16px',
                          height: '16px',
                          color: '#9ca3af',
                          pointerEvents: 'none',
                          zIndex: 1
                        }} />

                        {/* Loading state */}
                        {loadingOwners ? (
                          <div
                            aria-live="polite"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                              paddingLeft: '40px',
                              backgroundColor: theme.colors.background.tertiary,
                              border: `1px solid ${theme.colors.border.medium}`,
                              borderRadius: theme.radius.md,
                              color: theme.colors.text.tertiary,
                              fontSize: theme.fontSize.sm
                            }}
                          >
                            <Loader2 aria-hidden="true" size={16} style={{ animation: 'spin 1s linear infinite' }} />
                            Loading customers...
                          </div>
                        ) : (
                          <>
                            {/* Selected value display / dropdown trigger */}
                            <div
                              ref={ownerTriggerRef}
                              role="combobox"
                              aria-expanded={ownerDropdownOpen}
                              aria-haspopup="listbox"
                              aria-controls="owner-listbox"
                              aria-labelledby="owner_id-label"
                              aria-required="true"
                              aria-invalid={!!errors.owner_name}
                              aria-describedby={errors.owner_name ? 'owner_id-error' : undefined}
                              tabIndex={0}
                              onClick={handleOwnerDropdownToggle}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleOwnerDropdownToggle();
                                } else if (e.key === 'Escape') {
                                  setOwnerDropdownOpen(false);
                                }
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                paddingLeft: '40px',
                                backgroundColor: theme.colors.background.tertiary,
                                border: `1px solid ${errors.owner_name ? '#dc2626' : ownerDropdownOpen ? '#1e3a5f' : theme.colors.border.medium}`,
                                borderRadius: theme.radius.md,
                                fontSize: theme.fontSize.sm,
                                cursor: 'pointer',
                                minHeight: '40px',
                                outline: 'none'
                              }}
                            >
                              {selectedOwner ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                  <span style={{ color: theme.colors.text.primary }}>
                                    {selectedOwner.name}{selectedOwner.company ? ` (${selectedOwner.company})` : ''}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleClearOwner();
                                    }}
                                    aria-label="Clear customer selection"
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      padding: '2px 6px',
                                      cursor: 'pointer',
                                      color: '#6b7280',
                                      display: 'flex',
                                      alignItems: 'center'
                                    }}
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <span style={{ color: theme.colors.text.tertiary }}>
                                  Select a customer...
                                </span>
                              )}
                              <ChevronDown
                                aria-hidden="true"
                                size={16}
                                style={{
                                  color: '#9ca3af',
                                  transform: ownerDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.2s',
                                  flexShrink: 0
                                }}
                              />
                            </div>

                            {/* Dropdown panel - rendered via Portal to escape all overflow constraints */}
                            {ownerDropdownOpen && createPortal(
                              <div
                                id="owner-listbox"
                                role="listbox"
                                aria-labelledby="owner_id-label"
                                style={{
                                  position: 'fixed',
                                  top: ownerDropdownPosition.top,
                                  left: ownerDropdownPosition.left,
                                  width: ownerDropdownPosition.width,
                                  backgroundColor: 'white',
                                  border: '1px solid #1e3a5f',
                                  borderRadius: theme.radius.md,
                                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                  zIndex: 9999,
                                  maxHeight: '300px',
                                  overflow: 'hidden',
                                  display: 'flex',
                                  flexDirection: 'column'
                                }}
                              >
                                {/* Search input */}
                                <div style={{
                                  padding: '8px',
                                  borderBottom: `1px solid ${theme.colors.border.light}`
                                }}>
                                  <div style={{ position: 'relative' }}>
                                    <Search size={14} style={{
                                      position: 'absolute',
                                      left: '8px',
                                      top: '50%',
                                      transform: 'translateY(-50%)',
                                      color: '#9ca3af'
                                    }} />
                                    <input
                                      type="text"
                                      value={ownerSearchQuery}
                                      onChange={(e) => setOwnerSearchQuery(e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      placeholder="Search customers..."
                                      aria-label="Search customers"
                                      style={{
                                        width: '100%',
                                        padding: '6px 8px 6px 28px',
                                        border: `1px solid ${theme.colors.border.medium}`,
                                        borderRadius: '4px',
                                        fontSize: '0.8125rem',
                                        outline: 'none'
                                      }}
                                      autoFocus
                                    />
                                  </div>
                                </div>

                                {/* Options list */}
                                <div style={{
                                  overflowY: 'auto',
                                  maxHeight: '220px'
                                }}>
                                  {searchFilteredOwners.length === 0 ? (
                                    <div style={{
                                      padding: '12px',
                                      textAlign: 'center',
                                      color: theme.colors.text.tertiary,
                                      fontSize: theme.fontSize.sm
                                    }}>
                                      {ownerSearchQuery ? 'No customers match your search' : 'No customers available'}
                                    </div>
                                  ) : (
                                    searchFilteredOwners.map(owner => (
                                      <div
                                        key={owner.id}
                                        role="option"
                                        aria-selected={formData.owner_id === owner.id}
                                        onClick={() => handleOwnerSelect(owner.id)}
                                        style={{
                                          padding: '10px 12px',
                                          cursor: 'pointer',
                                          backgroundColor: formData.owner_id === owner.id ? '#eff6ff' : 'transparent',
                                          borderBottom: `1px solid ${theme.colors.border.light}`,
                                          transition: 'background-color 0.15s'
                                        }}
                                        onMouseEnter={(e) => {
                                          if (formData.owner_id !== owner.id) {
                                            e.currentTarget.style.backgroundColor = '#f9fafb';
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          if (formData.owner_id !== owner.id) {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                          }
                                        }}
                                      >
                                        <div style={{
                                          fontWeight: '500',
                                          color: theme.colors.text.primary,
                                          fontSize: theme.fontSize.sm
                                        }}>
                                          {owner.name}{owner.company ? ` (${owner.company})` : ''}
                                        </div>
                                        <div style={{
                                          color: theme.colors.text.tertiary,
                                          fontSize: '0.75rem',
                                          marginTop: '2px'
                                        }}>
                                          {owner.phone}{owner.email ? ` • ${owner.email}` : ''}
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>,
                              document.body
                            )}
                          </>
                        )}
                      </div>
                      {errors.owner_name && (
                        <p id="owner_id-error" role="alert" style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '4px' }}>
                          {errors.owner_name}
                        </p>
                      )}
                    </div>

                    {/* Phone Number - Auto-populated, read-only when owner selected */}
                    <div>
                      <label
                        htmlFor="phone"
                        style={{
                          display: 'block',
                          fontSize: theme.fontSize.sm,
                          fontWeight: theme.fontWeight.medium,
                          color: theme.colors.text.secondary,
                          marginBottom: theme.spacing.xs
                        }}
                      >
                        Phone Number <span aria-hidden="true" style={{ color: '#dc2626' }}>*</span>
                        <span className="sr-only">(required)</span>
                        {selectedOwner && formData.phone && (
                          <span style={{ color: '#6b7280', fontWeight: 'normal', marginLeft: '8px', fontSize: '0.75rem' }}>
                            (pre-filled, can edit)
                          </span>
                        )}
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Phone aria-hidden="true" style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '16px',
                          height: '16px',
                          color: '#9ca3af'
                        }} />
                        <input
                          id="phone"
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          aria-required="true"
                          aria-invalid={!!errors.phone}
                          aria-describedby={errors.phone ? 'phone-error' : undefined}
                          placeholder="Enter phone number"
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
                        <p id="phone-error" role="alert" style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '4px' }}>
                          {errors.phone}
                        </p>
                      )}
                    </div>

                    {/* Email - Auto-populated, read-only when owner selected */}
                    <div>
                      <label
                        htmlFor="email"
                        style={{
                          display: 'block',
                          fontSize: theme.fontSize.sm,
                          fontWeight: theme.fontWeight.medium,
                          color: theme.colors.text.secondary,
                          marginBottom: theme.spacing.xs
                        }}
                      >
                        Email <span style={{ color: '#6b7280', fontWeight: 'normal' }}>(optional)</span>
                        {selectedOwner && formData.email && (
                          <span style={{ color: '#6b7280', fontWeight: 'normal', marginLeft: '8px', fontSize: '0.75rem' }}>
                            (pre-filled, can edit)
                          </span>
                        )}
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Mail aria-hidden="true" style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '16px',
                          height: '16px',
                          color: '#9ca3af'
                        }} />
                        <input
                          id="email"
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          aria-invalid={!!errors.email}
                          aria-describedby={errors.email ? 'email-error' : undefined}
                          placeholder="Enter email address"
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
                        <p id="email-error" role="alert" style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '4px' }}>
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
                    {/* Van Selection - Filtered by owner selected in Customer Information */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: theme.fontSize.sm,
                        fontWeight: theme.fontWeight.medium,
                        color: theme.colors.text.secondary,
                        marginBottom: theme.spacing.xs
                      }}>
                        Van <span style={{ color: '#6b7280', fontWeight: 'normal' }}>(optional)</span>
                      </label>

                      {/* Van dropdown with search */}
                      <div ref={vanDropdownRef} style={{ position: 'relative' }}>
                        <Truck style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '16px',
                          height: '16px',
                          color: '#9ca3af',
                          pointerEvents: 'none',
                          zIndex: 1
                        }} />

                        {/* Loading state */}
                        {loadingVans && formData.owner_id ? (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                            paddingLeft: '40px',
                            backgroundColor: theme.colors.background.tertiary,
                            border: `1px solid ${theme.colors.border.medium}`,
                            borderRadius: theme.radius.md,
                            color: theme.colors.text.tertiary,
                            fontSize: theme.fontSize.sm
                          }}>
                            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                            Loading vans...
                          </div>
                        ) : !formData.owner_id ? (
                          /* Disabled state when no customer selected */
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                            paddingLeft: '40px',
                            backgroundColor: '#f3f4f6',
                            border: `1px solid ${theme.colors.border.medium}`,
                            borderRadius: theme.radius.md,
                            color: theme.colors.text.tertiary,
                            fontSize: theme.fontSize.sm,
                            cursor: 'not-allowed'
                          }}>
                            <span>Select a customer first</span>
                            <ChevronDown size={16} style={{ color: '#9ca3af' }} />
                          </div>
                        ) : (
                          /* Active dropdown */
                          <>
                            {/* Selected value display / search input */}
                            <div
                              ref={vanTriggerRef}
                              onClick={handleVanDropdownToggle}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                paddingLeft: '40px',
                                backgroundColor: theme.colors.background.tertiary,
                                border: `1px solid ${vanDropdownOpen ? '#1e3a5f' : theme.colors.border.medium}`,
                                borderRadius: theme.radius.md,
                                fontSize: theme.fontSize.sm,
                                cursor: 'pointer',
                                minHeight: '40px'
                              }}
                            >
                              {selectedVan ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                  <span style={{ color: theme.colors.text.primary }}>
                                    {selectedVan.van_number} - {selectedVan.make} {selectedVan.version} ({selectedVan.year})
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleClearVan();
                                    }}
                                    aria-label="Clear van selection"
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      padding: '2px 6px',
                                      cursor: 'pointer',
                                      color: '#6b7280',
                                      display: 'flex',
                                      alignItems: 'center'
                                    }}
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <span style={{ color: theme.colors.text.tertiary }}>
                                  {filteredVans.length === 0 ? 'No vans for this owner' : 'Select a van...'}
                                </span>
                              )}
                              <ChevronDown
                                size={16}
                                style={{
                                  color: '#9ca3af',
                                  transform: vanDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.2s'
                                }}
                              />
                            </div>

                            {/* Dropdown panel - rendered via Portal to escape all overflow constraints */}
                            {vanDropdownOpen && filteredVans.length > 0 && createPortal(
                              <div
                                id="van-listbox"
                                role="listbox"
                                aria-label="Select a van"
                                style={{
                                  position: 'fixed',
                                  top: vanDropdownPosition.top,
                                  left: vanDropdownPosition.left,
                                  width: vanDropdownPosition.width,
                                  backgroundColor: 'white',
                                  border: '1px solid #1e3a5f',
                                  borderRadius: theme.radius.md,
                                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                  zIndex: 9999,
                                  maxHeight: '280px',
                                  overflow: 'hidden',
                                  display: 'flex',
                                  flexDirection: 'column'
                                }}>
                                {/* Search input inside dropdown */}
                                <div style={{
                                  padding: '8px',
                                  borderBottom: `1px solid ${theme.colors.border.light}`
                                }}>
                                  <div style={{ position: 'relative' }}>
                                    <Search size={14} style={{
                                      position: 'absolute',
                                      left: '8px',
                                      top: '50%',
                                      transform: 'translateY(-50%)',
                                      color: '#9ca3af'
                                    }} />
                                    <input
                                      type="text"
                                      value={vanSearchQuery}
                                      onChange={(e) => setVanSearchQuery(e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      placeholder="Search vans..."
                                      aria-label="Search vans"
                                      style={{
                                        width: '100%',
                                        padding: '6px 8px 6px 28px',
                                        border: `1px solid ${theme.colors.border.medium}`,
                                        borderRadius: '4px',
                                        fontSize: '0.8125rem',
                                        outline: 'none'
                                      }}
                                      autoFocus
                                    />
                                  </div>
                                </div>

                                {/* Options list */}
                                <div style={{
                                  overflowY: 'auto',
                                  maxHeight: '220px'
                                }}>
                                  {searchFilteredVans.length === 0 ? (
                                    <div style={{
                                      padding: '12px',
                                      textAlign: 'center',
                                      color: theme.colors.text.tertiary,
                                      fontSize: theme.fontSize.sm
                                    }}>
                                      No vans match your search
                                    </div>
                                  ) : (
                                    searchFilteredVans.map(van => (
                                      <div
                                        key={van.id}
                                        onClick={() => handleVanSelect(van.id)}
                                        style={{
                                          padding: '10px 12px',
                                          cursor: 'pointer',
                                          backgroundColor: formData.van_id === van.id ? '#eff6ff' : 'transparent',
                                          borderBottom: `1px solid ${theme.colors.border.light}`,
                                          transition: 'background-color 0.15s'
                                        }}
                                        onMouseEnter={(e) => {
                                          if (formData.van_id !== van.id) {
                                            e.currentTarget.style.backgroundColor = '#f9fafb';
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          if (formData.van_id !== van.id) {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                          }
                                        }}
                                      >
                                        <div style={{
                                          fontWeight: '500',
                                          color: theme.colors.text.primary,
                                          fontSize: theme.fontSize.sm
                                        }}>
                                          {van.van_number}
                                        </div>
                                        <div style={{
                                          color: theme.colors.text.tertiary,
                                          fontSize: '0.75rem',
                                          marginTop: '2px'
                                        }}>
                                          {van.make} {van.version} - {van.year}
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>,
                              document.body
                            )}
                          </>
                        )}
                      </div>

                      {/* Helper text */}
                      <p style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '4px' }}>
                        {!formData.owner_id
                          ? 'Select a customer in Customer Information to see available vans'
                          : filteredVans.length === 0
                            ? 'This customer has no registered vans'
                            : `${filteredVans.length} van${filteredVans.length !== 1 ? 's' : ''} available for this customer`
                        }
                      </p>
                    </div>

                    {/* Category - Dropdown from categories */}
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
                          color: '#9ca3af',
                          pointerEvents: 'none',
                          zIndex: 1
                        }} />
                        {loadingCategories ? (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                            paddingLeft: '40px',
                            backgroundColor: theme.colors.background.tertiary,
                            border: `1px solid ${theme.colors.border.medium}`,
                            borderRadius: theme.radius.md,
                            color: theme.colors.text.tertiary,
                            fontSize: theme.fontSize.sm
                          }}>
                            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                            Loading categories...
                          </div>
                        ) : (
                          <select
                            name="category_id"
                            value={formData.category_id}
                            onChange={handleChange}
                            style={{
                              width: '100%',
                              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                              paddingLeft: '40px',
                              backgroundColor: theme.colors.background.tertiary,
                              color: formData.category_id ? theme.colors.text.primary : theme.colors.text.tertiary,
                              border: `1px solid ${theme.colors.border.medium}`,
                              borderRadius: theme.radius.md,
                              fontSize: theme.fontSize.sm,
                              outline: 'none',
                              cursor: 'pointer',
                              appearance: 'none',
                              WebkitAppearance: 'none',
                              MozAppearance: 'none'
                            }}
                          >
                            <option value="">Select a category...</option>
                            {categories.map(cat => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        )}
                        <ChevronDown style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '16px',
                          height: '16px',
                          color: '#9ca3af',
                          pointerEvents: 'none'
                        }} />
                      </div>
                      {categories.length === 0 && !loadingCategories && (
                        <p style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '4px' }}>
                          No categories available
                        </p>
                      )}
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
                      <label
                        htmlFor="subject"
                        style={{
                          display: 'block',
                          fontSize: theme.fontSize.sm,
                          fontWeight: theme.fontWeight.medium,
                          color: theme.colors.text.secondary,
                          marginBottom: theme.spacing.xs
                        }}
                      >
                        Subject <span aria-hidden="true" style={{ color: '#dc2626' }}>*</span>
                        <span className="sr-only">(required)</span>
                      </label>
                      <input
                        id="subject"
                        type="text"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder="Brief description of the issue"
                        maxLength={200}
                        required
                        aria-required="true"
                        aria-invalid={!!errors.subject}
                        aria-describedby={errors.subject ? 'subject-error' : 'subject-hint'}
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
                          <p id="subject-error" role="alert" style={{ color: '#dc2626', fontSize: '0.75rem' }}>
                            {errors.subject}
                          </p>
                        ) : (
                          <p id="subject-hint" style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                            {formData.subject.length}/200 characters
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label
                        htmlFor="description"
                        style={{
                          display: 'block',
                          fontSize: theme.fontSize.sm,
                          fontWeight: theme.fontWeight.medium,
                          color: theme.colors.text.secondary,
                          marginBottom: theme.spacing.xs
                        }}
                      >
                        Description <span aria-hidden="true" style={{ color: '#dc2626' }}>*</span>
                        <span className="sr-only">(required)</span>
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Describe the issue in detail..."
                        rows={6}
                        maxLength={2000}
                        required
                        aria-required="true"
                        aria-invalid={!!errors.description}
                        aria-describedby={errors.description ? 'description-error' : 'description-hint'}
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
                          <p id="description-error" role="alert" style={{ color: '#dc2626', fontSize: '0.75rem' }}>
                            {errors.description}
                          </p>
                        ) : (
                          <p id="description-hint" style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                            {formData.description.length}/2000 characters (minimum 20)
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Priority */}
                    <div>
                      <label
                        htmlFor="priority"
                        style={{
                          display: 'block',
                          fontSize: theme.fontSize.sm,
                          fontWeight: theme.fontWeight.medium,
                          color: theme.colors.text.secondary,
                          marginBottom: theme.spacing.xs
                        }}
                      >
                        Priority <span aria-hidden="true" style={{ color: '#dc2626' }}>*</span>
                        <span className="sr-only">(required)</span>
                      </label>
                      <select
                        id="priority"
                        name="priority"
                        value={formData.priority}
                        onChange={handleChange}
                        required
                        aria-required="true"
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
                      <label
                        htmlFor="urgency"
                        style={{
                          display: 'block',
                          fontSize: theme.fontSize.sm,
                          fontWeight: theme.fontWeight.medium,
                          color: theme.colors.text.secondary,
                          marginBottom: theme.spacing.xs
                        }}
                      >
                        Urgency <span style={{ color: '#6b7280', fontWeight: 'normal' }}>(optional)</span>
                      </label>
                      <select
                        id="urgency"
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
          <div
            ref={successModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="success-modal-title"
            tabIndex={-1}
            style={{
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
              zIndex: 1000,
              outline: 'none'
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                handleCreateAnother();
              }
            }}
          >
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
                  <h2 id="success-modal-title" style={{ color: '#111827', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px' }}>
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
