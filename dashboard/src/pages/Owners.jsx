import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import Sidebar from '../components/Sidebar';
import Card from '../components/Card';
import Pagination from '../components/Pagination';
import { theme } from '../styles/theme';
import {
  User,
  Users,
  Plus,
  Edit,
  Trash2,
  X,
  Search,
  Phone,
  Mail,
  Building,
  Truck,
  AlertTriangle,
} from 'lucide-react';
import {
  validateName,
  validatePhone,
  validateEmail,
  formatPhone,
} from '../utils/validators';

function Owners() {
  const { user, logout, hasRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [pageSize, setPageSize] = useState(parseInt(searchParams.get('limit')) || 25);
  const [pagination, setPagination] = useState(null);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState(null);
  const [deletingOwner, setDeletingOwner] = useState(null);

  // Form state
  const [ownerForm, setOwnerForm] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
  });

  // Validation state
  const [formErrors, setFormErrors] = useState({});

  const fetchOwners = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/owners?page=${currentPage}&limit=${pageSize}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch owners');
      }

      const data = await response.json();
      setOwners(data.owners || []);
      setPagination(data.pagination);

      console.log('👥 Owners fetched:', data.owners?.length || 0, 'Pagination:', data.pagination);
    } catch (err) {
      console.error('Error fetching owners:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize]);

  useEffect(() => {
    fetchOwners();
  }, [fetchOwners]);

  const resetForm = useCallback(() => {
    setOwnerForm({
      name: '',
      company: '',
      phone: '',
      email: '',
    });
    setFormErrors({});
  }, []);

  const validateForm = useCallback(() => {
    const errors = {};

    const nameValidation = validateName(ownerForm.name);
    if (!nameValidation.valid) {
      errors.name = nameValidation.error;
    }

    const phoneValidation = validatePhone(ownerForm.phone);
    if (!phoneValidation.valid) {
      errors.phone = phoneValidation.error;
    }

    const emailValidation = validateEmail(ownerForm.email);
    if (!emailValidation.valid) {
      errors.email = emailValidation.error;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [ownerForm]);

  const handleFormFieldChange = useCallback((field, value) => {
    setOwnerForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const showSuccess = useCallback((message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 3000);
  }, []);

  const handleCreateOwner = useCallback(async () => {
    console.log('🔍 handleCreateOwner called');
    console.log('📝 ownerForm:', ownerForm);

    if (!validateForm()) {
      setError('Please fix validation errors');
      return;
    }

    try {
      // Format phone number before sending
      const phoneValidation = validatePhone(ownerForm.phone);
      const formattedData = {
        ...ownerForm,
        phone: phoneValidation.formatted || ownerForm.phone,
      };

      console.log('🚀 Submitting to API...');
      const response = await fetch('/api/owners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formattedData),
      });

      console.log('📡 Response status:', response.status);
      const data = await response.json();
      console.log('📦 Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create owner');
      }

      await fetchOwners();
      setCreateModalOpen(false);
      resetForm();
      showSuccess('Owner created successfully');
    } catch (err) {
      console.error('💥 Error creating owner:', err);
      setError(err.message);
    }
  }, [ownerForm, validateForm, resetForm, showSuccess]);

  const handleUpdateOwner = useCallback(async () => {
    console.log('🔍 handleUpdateOwner called');
    console.log('📝 editingOwner:', editingOwner);
    console.log('📝 ownerForm:', ownerForm);

    if (!validateForm()) {
      console.log('❌ Validation failed');
      setError('Please fix validation errors');
      return;
    }

    try {
      // Format phone number before sending
      const phoneValidation = validatePhone(ownerForm.phone);
      const formattedData = {
        ...ownerForm,
        phone: phoneValidation.formatted || ownerForm.phone,
      };

      console.log('🚀 Submitting to API...');
      const response = await fetch(`/api/owners/${editingOwner.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formattedData),
      });

      console.log('📡 Response status:', response.status);
      const data = await response.json();
      console.log('📦 Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update owner');
      }

      await fetchOwners();
      setEditModalOpen(false);
      setEditingOwner(null);
      resetForm();
      showSuccess('Owner updated successfully');
    } catch (err) {
      console.error('💥 Error updating owner:', err);
      setError(err.message);
    }
  }, [editingOwner, ownerForm, validateForm, resetForm, showSuccess]);

  const handleDeleteOwner = useCallback(async () => {
    try {
      console.log('🔍 handleDeleteOwner called');
      console.log('📝 deletingOwner:', deletingOwner);

      // First, check if owner has historical data
      console.log('🔍 Checking for dependencies...');
      const checkResponse = await fetch(`/api/owners/${deletingOwner.id}/check-dependencies`, {
        credentials: 'include'
      });

      if (!checkResponse.ok) {
        throw new Error('Failed to check owner dependencies');
      }

      const checkData = await checkResponse.json();
      console.log('📦 Dependency check result:', checkData);

      if (checkData.hasDependencies) {
        const errorMsg = `Cannot delete ${deletingOwner.name}. ${checkData.message}. You cannot delete owners with historical data to maintain system integrity.`;
        console.log('❌ Cannot delete - has dependencies:', errorMsg);

        setError(errorMsg);
        setDeleteModalOpen(false);
        setDeletingOwner(null);
        return;
      }

      // Proceed with deletion if no dependencies
      console.log('🚀 No dependencies found, proceeding with deletion...');
      const response = await fetch(`/api/owners/${deletingOwner.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete owner');
      }

      const data = await response.json();
      console.log('📦 Response data:', data);

      await fetchOwners();
      setDeleteModalOpen(false);
      setDeletingOwner(null);
      showSuccess(`Owner ${deletingOwner.name} deleted successfully!`);
    } catch (err) {
      console.error('💥 Error deleting owner:', err);
      setError(err.message);
    }
  }, [deletingOwner, showSuccess]);

  const openEditModal = useCallback((owner) => {
    setEditingOwner(owner);
    setOwnerForm({
      name: owner.name || '',
      company: owner.company || '',
      phone: owner.phone || '',
      email: owner.email || '',
    });
    setFormErrors({});
    setEditModalOpen(true);
  }, []);

  const openDeleteModal = useCallback((owner) => {
    setDeletingOwner(owner);
    setDeleteModalOpen(true);
  }, []);

  // Pagination handlers
  const handlePageChange = useCallback((newPage) => {
    setCurrentPage(newPage);
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [searchParams, setSearchParams]);

  const handlePageSizeChange = useCallback((newSize) => {
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page
    const params = new URLSearchParams(searchParams);
    params.set('limit', newSize.toString());
    params.set('page', '1');
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  const filteredAndSortedOwners = useMemo(() => {
    let filtered = [...owners];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(o =>
        o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.company && o.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
        o.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort by name
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    return filtered;
  }, [owners, searchQuery]);

  const OwnerFormFields = useMemo(() => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.lg }}>
      <div>
        <label style={{
          display: 'block',
          fontSize: theme.fontSize.sm,
          fontWeight: theme.fontWeight.medium,
          color: theme.colors.text.primary,
          marginBottom: theme.spacing.xs,
        }}>
          Name <span style={{ color: theme.colors.accent.danger }}>*</span>
        </label>
        <input
          type="text"
          value={ownerForm.name}
          onChange={(e) => handleFormFieldChange('name', e.target.value)}
          placeholder="Enter owner name"
          style={{
            width: '100%',
            padding: theme.spacing.sm,
            border: `1px solid ${formErrors.name ? theme.colors.accent.danger : theme.colors.border.medium}`,
            borderRadius: theme.radius.md,
            fontSize: theme.fontSize.sm,
          }}
        />
        {formErrors.name && (
          <div style={{
            fontSize: theme.fontSize.xs,
            color: theme.colors.accent.danger,
            marginTop: theme.spacing.xs,
          }}>
            {formErrors.name}
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
          Company
        </label>
        <input
          type="text"
          value={ownerForm.company}
          onChange={(e) => handleFormFieldChange('company', e.target.value)}
          placeholder="Company name (optional)"
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
          Phone <span style={{ color: theme.colors.accent.danger }}>*</span>
        </label>
        <input
          type="tel"
          value={ownerForm.phone}
          onChange={(e) => handleFormFieldChange('phone', e.target.value)}
          placeholder="(555) 123-4567"
          style={{
            width: '100%',
            padding: theme.spacing.sm,
            border: `1px solid ${formErrors.phone ? theme.colors.accent.danger : theme.colors.border.medium}`,
            borderRadius: theme.radius.md,
            fontSize: theme.fontSize.sm,
          }}
        />
        {formErrors.phone && (
          <div style={{
            fontSize: theme.fontSize.xs,
            color: theme.colors.accent.danger,
            marginTop: theme.spacing.xs,
          }}>
            {formErrors.phone}
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
          Email <span style={{ color: theme.colors.accent.danger }}>*</span>
        </label>
        <input
          type="email"
          value={ownerForm.email}
          onChange={(e) => handleFormFieldChange('email', e.target.value)}
          placeholder="owner@example.com"
          style={{
            width: '100%',
            padding: theme.spacing.sm,
            border: `1px solid ${formErrors.email ? theme.colors.accent.danger : theme.colors.border.medium}`,
            borderRadius: theme.radius.md,
            fontSize: theme.fontSize.sm,
          }}
        />
        {formErrors.email && (
          <div style={{
            fontSize: theme.fontSize.xs,
            color: theme.colors.accent.danger,
            marginTop: theme.spacing.xs,
          }}>
            {formErrors.email}
          </div>
        )}
      </div>
    </div>
  ), [ownerForm, formErrors, handleFormFieldChange]);

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: theme.colors.background.primary }}>
        <Sidebar user={user} onLogout={logout} hasRole={hasRole} />
        <div style={{ marginLeft: '260px', flex: 1, padding: theme.spacing['2xl'] }}>
          <div style={{ textAlign: 'center', padding: theme.spacing['2xl'] }}>
            <p style={{ color: theme.colors.text.secondary }}>Loading owners...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: theme.colors.background.primary }}>
      <Sidebar user={user} onLogout={logout} hasRole={hasRole} />

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
              <Users size={32} color={theme.colors.accent.primary} strokeWidth={2} />
              <h1 style={{
                fontSize: theme.fontSize['4xl'],
                fontWeight: theme.fontWeight.bold,
                color: theme.colors.text.primary,
                margin: 0,
              }}>
                Owners
              </h1>
              {pagination && pagination.totalCount > 0 && (
                <span style={{
                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                  backgroundColor: theme.colors.accent.primary + '20',
                  color: theme.colors.accent.primary,
                  borderRadius: theme.radius.full,
                  fontSize: theme.fontSize.sm,
                  fontWeight: theme.fontWeight.semibold,
                }}>
                  {pagination.totalCount}
                </span>
              )}
            </div>
            <p style={{ color: theme.colors.text.secondary, fontSize: theme.fontSize.base, margin: 0 }}>
              Manage van owners and their contact information
            </p>
          </div>

          {hasRole('admin') && (
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
              Add New Owner
            </button>
          )}
        </div>

        {/* Search Bar */}
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
                placeholder="Search by name, company, phone, or email..."
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
        </div>

        {/* Owners Table */}
        <Card>
          {filteredAndSortedOwners.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: theme.spacing['2xl'],
              color: theme.colors.text.secondary,
            }}>
              <Users size={48} style={{ marginBottom: theme.spacing.md, opacity: 0.3 }} />
              <p style={{ fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.medium }}>
                No owners found
              </p>
              <p style={{ fontSize: theme.fontSize.sm }}>
                {searchQuery ? 'Try adjusting your search' : 'Add your first owner to get started'}
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
                    }}>
                      Name
                    </th>
                    <th style={{
                      padding: theme.spacing.md,
                      textAlign: 'left',
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.semibold,
                      color: theme.colors.text.secondary,
                    }}>
                      Company
                    </th>
                    <th style={{
                      padding: theme.spacing.md,
                      textAlign: 'left',
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.semibold,
                      color: theme.colors.text.secondary,
                    }}>
                      Phone
                    </th>
                    <th style={{
                      padding: theme.spacing.md,
                      textAlign: 'left',
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.semibold,
                      color: theme.colors.text.secondary,
                    }}>
                      Email
                    </th>
                    <th style={{
                      padding: theme.spacing.md,
                      textAlign: 'center',
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.semibold,
                      color: theme.colors.text.secondary,
                    }}>
                      Vans
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
                  {filteredAndSortedOwners.map((owner) => (
                    <tr key={owner.id} style={{
                      borderBottom: `1px solid ${theme.colors.border.light}`,
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.background.tertiary}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: theme.spacing.md }}>
                        <div style={{
                          fontSize: theme.fontSize.sm,
                          fontWeight: theme.fontWeight.semibold,
                          color: theme.colors.text.primary,
                        }}>
                          {owner.name}
                        </div>
                      </td>
                      <td style={{ padding: theme.spacing.md }}>
                        <div style={{
                          fontSize: theme.fontSize.sm,
                          color: theme.colors.text.secondary,
                        }}>
                          {owner.company || '-'}
                        </div>
                      </td>
                      <td style={{ padding: theme.spacing.md }}>
                        <div style={{
                          fontSize: theme.fontSize.sm,
                          color: theme.colors.text.secondary,
                        }}>
                          {owner.phone}
                        </div>
                      </td>
                      <td style={{ padding: theme.spacing.md }}>
                        <div style={{
                          fontSize: theme.fontSize.sm,
                          color: theme.colors.text.secondary,
                        }}>
                          {owner.email}
                        </div>
                      </td>
                      <td style={{ padding: theme.spacing.md, textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                          backgroundColor: owner.van_count > 0 ? theme.colors.accent.primary + '20' : theme.colors.background.tertiary,
                          color: owner.van_count > 0 ? theme.colors.accent.primary : theme.colors.text.tertiary,
                          borderRadius: theme.radius.md,
                          fontSize: theme.fontSize.xs,
                          fontWeight: theme.fontWeight.medium,
                        }}>
                          {owner.van_count || 0}
                        </span>
                      </td>
                      <td style={{ padding: theme.spacing.md, textAlign: 'right' }}>
                        {hasRole('admin') && (
                          <div style={{ display: 'flex', gap: theme.spacing.xs, justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => openEditModal(owner)}
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
                              title="Edit owner"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => openDeleteModal(owner)}
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
                              title="Delete owner"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {pagination && pagination.totalCount > 0 && (
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  pageSize={pagination.limit}
                  totalCount={pagination.totalCount}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                  loading={loading}
                />
              )}
            </div>
          )}
        </Card>

        {/* Create Owner Modal */}
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
                  Add New Owner
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
                {OwnerFormFields}

                <div style={{
                  display: 'flex',
                  gap: theme.spacing.md,
                  marginTop: theme.spacing.xl,
                }}>
                  <button
                    onClick={handleCreateOwner}
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
                    Create Owner
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

        {/* Edit Owner Modal */}
        {editModalOpen && editingOwner && (
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
                  Edit Owner
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
                {OwnerFormFields}

                {editingOwner.van_count > 0 && (
                  <div style={{
                    marginTop: theme.spacing.lg,
                    padding: theme.spacing.md,
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
                    }}>
                      <AlertTriangle size={14} />
                      This owner has {editingOwner.van_count} van(s). Changes will affect all associated vans.
                    </div>
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  gap: theme.spacing.md,
                  marginTop: theme.spacing.xl,
                }}>
                  <button
                    onClick={handleUpdateOwner}
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
        {deleteModalOpen && deletingOwner && (
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
                Delete Owner?
              </h2>

              <p style={{
                margin: 0,
                marginBottom: theme.spacing.lg,
                color: theme.colors.text.secondary,
                fontSize: theme.fontSize.sm,
              }}>
                Are you sure you want to delete <strong>{deletingOwner.name}</strong>?
              </p>

              <div style={{
                padding: theme.spacing.md,
                backgroundColor: theme.colors.background.tertiary,
                borderRadius: theme.radius.md,
                marginBottom: theme.spacing.lg,
              }}>
                <p style={{ margin: 0, fontSize: theme.fontSize.sm, color: theme.colors.text.secondary }}>
                  <strong>Email:</strong> {deletingOwner.email}
                </p>
                <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: theme.fontSize.sm, color: theme.colors.text.secondary }}>
                  <strong>Phone:</strong> {deletingOwner.phone}
                </p>
                {deletingOwner.company && (
                  <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: theme.fontSize.sm, color: theme.colors.text.secondary }}>
                    <strong>Company:</strong> {deletingOwner.company}
                  </p>
                )}
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
                  onClick={handleDeleteOwner}
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
                  Delete Owner
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

export default Owners;
