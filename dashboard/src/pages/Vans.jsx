import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import Sidebar from '../components/Sidebar';
import Card from '../components/Card';
import Pagination from '../components/Pagination';
import { theme } from '../styles/theme';
import {
  Truck,
  Plus,
  Edit,
  Trash2,
  X,
  Search,
  Filter,
  AlertCircle,
  User,
  Phone,
} from 'lucide-react';
import {
  validateVanNumber,
  validateMake,
  validateYear,
  validateVIN,
  validateVersion,
} from '../utils/validators';

function Vans() {
  const { user, logout, hasRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [vans, setVans] = useState([]);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [filterMake, setFilterMake] = useState('');
  const [filterYearFrom, setFilterYearFrom] = useState('');
  const [filterYearTo, setFilterYearTo] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [pageSize, setPageSize] = useState(parseInt(searchParams.get('limit')) || 25);
  const [pagination, setPagination] = useState(null);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingVan, setEditingVan] = useState(null);
  const [deletingVan, setDeletingVan] = useState(null);

  // Form state
  const [vanForm, setVanForm] = useState({
    van_number: '',
    make: '',
    version: '',
    year: new Date().getFullYear(),
    vin: '',
    owner_id: '',
  });

  // Validation state
  const [formErrors, setFormErrors] = useState({});

  // Debounce search query (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      // Reset to page 1 when search query changes
      if (searchQuery !== debouncedSearchQuery) {
        setCurrentPage(1);
        const params = new URLSearchParams(searchParams);
        params.set('page', '1');
        setSearchParams(params);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchVans = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Build query string with search parameter
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });

      if (debouncedSearchQuery && debouncedSearchQuery.trim() !== '') {
        params.append('search', debouncedSearchQuery.trim());
      }

      const response = await fetch(`/api/vans?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch vans');
      }

      const data = await response.json();
      setVans(data.vans || []);
      setPagination(data.pagination);

      console.log('🚐 Vans fetched:', data.vans?.length || 0, 'Pagination:', data.pagination);
    } catch (err) {
      console.error('Error fetching vans:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearchQuery]);

  const fetchOwners = useCallback(async () => {
    try {
      const response = await fetch('/api/owners?limit=100', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch owners');
      }

      const data = await response.json();
      setOwners(data.owners || data);
    } catch (err) {
      console.error('Error fetching owners:', err);
    }
  }, []);

  useEffect(() => {
    fetchVans();
    fetchOwners();
  }, [fetchVans, fetchOwners]);

  const resetForm = useCallback(() => {
    setVanForm({
      van_number: '',
      make: '',
      version: '',
      year: new Date().getFullYear(),
      vin: '',
      owner_id: '',
    });
    setFormErrors({});
  }, []);

  const validateForm = useCallback(() => {
    const errors = {};

    const vanNumberValidation = validateVanNumber(vanForm.van_number);
    if (!vanNumberValidation.valid) {
      errors.van_number = vanNumberValidation.error;
    }

    const makeValidation = validateMake(vanForm.make);
    if (!makeValidation.valid) {
      errors.make = makeValidation.error;
    }

    const versionValidation = validateVersion(vanForm.version);
    if (!versionValidation.valid) {
      errors.version = versionValidation.error;
    }

    const yearValidation = validateYear(vanForm.year);
    if (!yearValidation.valid) {
      errors.year = yearValidation.error;
    }

    if (vanForm.vin) {
      const vinValidation = validateVIN(vanForm.vin);
      if (!vinValidation.valid) {
        errors.vin = vinValidation.error;
      }
    }

    if (!vanForm.owner_id) {
      errors.owner_id = 'Owner is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [vanForm]);

  const handleFormFieldChange = useCallback((field, value) => {
    setVanForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const showSuccess = useCallback((message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 3000);
  }, []);

  const handleCreateVan = useCallback(async () => {
    console.log('🔍 handleCreateVan called');
    console.log('📝 vanForm:', vanForm);

    if (!validateForm()) {
      setError('Please fix validation errors');
      return;
    }

    try {
      console.log('🚀 Submitting to API...');
      const response = await fetch('/api/vans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(vanForm),
      });

      console.log('📡 Response status:', response.status);
      const data = await response.json();
      console.log('📦 Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create van');
      }

      await fetchVans();
      setCreateModalOpen(false);
      resetForm();
      showSuccess('Van created successfully');
    } catch (err) {
      console.error('💥 Error creating van:', err);
      setError(err.message);
    }
  }, [vanForm, validateForm, resetForm, showSuccess]);

  const handleUpdateVan = useCallback(async () => {
    console.log('🔍 handleUpdateVan called');
    console.log('📝 editingVan:', editingVan);
    console.log('📝 vanForm:', vanForm);

    if (!validateForm()) {
      console.log('❌ Validation failed');
      setError('Please fix validation errors');
      return;
    }

    try {
      console.log('🚀 Submitting to API...');
      const response = await fetch(`/api/vans/${editingVan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(vanForm),
      });

      console.log('📡 Response status:', response.status);
      const data = await response.json();
      console.log('📦 Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update van');
      }

      await fetchVans();
      setEditModalOpen(false);
      setEditingVan(null);
      resetForm();
      showSuccess('Van updated successfully');
    } catch (err) {
      console.error('💥 Error updating van:', err);
      setError(err.message);
    }
  }, [editingVan, vanForm, validateForm, resetForm, showSuccess]);

  const handleDeleteVan = useCallback(async () => {
    try {
      console.log('🔍 handleDeleteVan called');
      console.log('📝 deletingVan:', deletingVan);

      // First, check if van has historical data
      console.log('🔍 Checking for dependencies...');
      const checkResponse = await fetch(`/api/vans/${deletingVan.id}/check-dependencies`, {
        credentials: 'include'
      });

      if (!checkResponse.ok) {
        throw new Error('Failed to check van dependencies');
      }

      const checkData = await checkResponse.json();
      console.log('📦 Dependency check result:', checkData);

      if (checkData.hasDependencies) {
        const errorMsg = `Cannot delete van ${deletingVan.van_number}. ${checkData.message}. You cannot delete vans with historical data to maintain analytics integrity.`;
        console.log('❌ Cannot delete - has dependencies:', errorMsg);

        setError(errorMsg);
        setDeleteModalOpen(false);
        setDeletingVan(null);
        return;
      }

      // Proceed with deletion if no dependencies
      console.log('🚀 No dependencies found, proceeding with deletion...');
      const response = await fetch(`/api/vans/${deletingVan.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete van');
      }

      const data = await response.json();
      console.log('📦 Response data:', data);

      await fetchVans();
      setDeleteModalOpen(false);
      setDeletingVan(null);
      showSuccess(`Van ${deletingVan.van_number} deleted successfully!`);
    } catch (err) {
      console.error('💥 Error deleting van:', err);
      setError(err.message);
    }
  }, [deletingVan, showSuccess]);

  const openEditModal = useCallback((van) => {
    setEditingVan(van);
    setVanForm({
      van_number: van.van_number || '',
      make: van.make || '',
      version: van.version || '',
      year: van.year || new Date().getFullYear(),
      vin: van.vin || '',
      owner_id: van.owner_id || '',
    });
    setFormErrors({});
    setEditModalOpen(true);
  }, []);

  const openDeleteModal = useCallback((van) => {
    setDeletingVan(van);
    setDeleteModalOpen(true);
  }, []);

  // Pagination handlers
  const handlePageChange = useCallback((newPage) => {
    setCurrentPage(newPage);
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [searchParams, setSearchParams]);

  const handlePageSizeChange = useCallback((newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams);
    params.set('limit', newSize.toString());
    params.set('page', '1');
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  // Client-side filtering for make and year (these are not sent to backend)
  const filteredVans = useMemo(() => {
    let filtered = [...vans];

    // Filter by make (client-side only)
    if (filterMake) {
      filtered = filtered.filter(v => v.make === filterMake);
    }

    // Filter by year range (client-side only)
    if (filterYearFrom) {
      filtered = filtered.filter(v => v.year >= parseInt(filterYearFrom));
    }
    if (filterYearTo) {
      filtered = filtered.filter(v => v.year <= parseInt(filterYearTo));
    }

    return filtered;
  }, [vans, filterMake, filterYearFrom, filterYearTo]);

  const VanFormFields = useMemo(() => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.lg }}>
      <div>
        <label style={{
          display: 'block',
          fontSize: theme.fontSize.sm,
          fontWeight: theme.fontWeight.medium,
          color: theme.colors.text.primary,
          marginBottom: theme.spacing.xs,
        }}>
          Van Number <span style={{ color: theme.colors.accent.danger }}>*</span>
        </label>
        <input
          type="text"
          value={vanForm.van_number}
          onChange={(e) => handleFormFieldChange('van_number', e.target.value.toUpperCase())}
          placeholder="e.g., VAN001"
          style={{
            width: '100%',
            padding: theme.spacing.sm,
            border: `1px solid ${formErrors.van_number ? theme.colors.accent.danger : theme.colors.border.medium}`,
            borderRadius: theme.radius.md,
            fontSize: theme.fontSize.sm,
            textTransform: 'uppercase',
          }}
        />
        {formErrors.van_number && (
          <div style={{
            fontSize: theme.fontSize.xs,
            color: theme.colors.accent.danger,
            marginTop: theme.spacing.xs,
          }}>
            {formErrors.van_number}
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
          Make <span style={{ color: theme.colors.accent.danger }}>*</span>
        </label>
        <select
          value={vanForm.make}
          onChange={(e) => handleFormFieldChange('make', e.target.value)}
          style={{
            width: '100%',
            padding: theme.spacing.sm,
            border: `1px solid ${formErrors.make ? theme.colors.accent.danger : theme.colors.border.medium}`,
            borderRadius: theme.radius.md,
            fontSize: theme.fontSize.sm,
          }}
        >
          <option value="">Select make...</option>
          <option value="Ford">Ford</option>
          <option value="Mercedes">Mercedes</option>
        </select>
        {formErrors.make && (
          <div style={{
            fontSize: theme.fontSize.xs,
            color: theme.colors.accent.danger,
            marginTop: theme.spacing.xs,
          }}>
            {formErrors.make}
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
          Version <span style={{ color: theme.colors.accent.danger }}>*</span>
        </label>
        <select
          value={vanForm.version}
          onChange={(e) => handleFormFieldChange('version', e.target.value)}
          style={{
            width: '100%',
            padding: theme.spacing.sm,
            border: `1px solid ${formErrors.version ? theme.colors.accent.danger : theme.colors.border.medium}`,
            borderRadius: theme.radius.md,
            fontSize: theme.fontSize.sm,
          }}
        >
          <option value="">Select version...</option>
          <option value="3000">3000</option>
          <option value="4000">4000</option>
        </select>
        {formErrors.version && (
          <div style={{
            fontSize: theme.fontSize.xs,
            color: theme.colors.accent.danger,
            marginTop: theme.spacing.xs,
          }}>
            {formErrors.version}
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
          Year <span style={{ color: theme.colors.accent.danger }}>*</span>
        </label>
        <input
          type="number"
          value={vanForm.year}
          onChange={(e) => handleFormFieldChange('year', e.target.value)}
          min="2000"
          max={new Date().getFullYear() + 1}
          style={{
            width: '100%',
            padding: theme.spacing.sm,
            border: `1px solid ${formErrors.year ? theme.colors.accent.danger : theme.colors.border.medium}`,
            borderRadius: theme.radius.md,
            fontSize: theme.fontSize.sm,
          }}
        />
        {formErrors.year && (
          <div style={{
            fontSize: theme.fontSize.xs,
            color: theme.colors.accent.danger,
            marginTop: theme.spacing.xs,
          }}>
            {formErrors.year}
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
          VIN (Optional)
        </label>
        <input
          type="text"
          value={vanForm.vin}
          onChange={(e) => handleFormFieldChange('vin', e.target.value.toUpperCase())}
          placeholder="17-character VIN"
          maxLength={17}
          style={{
            width: '100%',
            padding: theme.spacing.sm,
            border: `1px solid ${formErrors.vin ? theme.colors.accent.danger : theme.colors.border.medium}`,
            borderRadius: theme.radius.md,
            fontSize: theme.fontSize.sm,
            fontFamily: 'monospace',
            textTransform: 'uppercase',
          }}
        />
        {formErrors.vin && (
          <div style={{
            fontSize: theme.fontSize.xs,
            color: theme.colors.accent.danger,
            marginTop: theme.spacing.xs,
          }}>
            {formErrors.vin}
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
          Owner <span style={{ color: theme.colors.accent.danger }}>*</span>
        </label>
        <select
          value={vanForm.owner_id}
          onChange={(e) => handleFormFieldChange('owner_id', e.target.value)}
          style={{
            width: '100%',
            padding: theme.spacing.sm,
            border: `1px solid ${formErrors.owner_id ? theme.colors.accent.danger : theme.colors.border.medium}`,
            borderRadius: theme.radius.md,
            fontSize: theme.fontSize.sm,
          }}
        >
          <option value="">Select owner...</option>
          {owners.map(owner => (
            <option key={owner.id} value={owner.id}>
              {owner.name} - {owner.phone}
            </option>
          ))}
        </select>
        {formErrors.owner_id && (
          <div style={{
            fontSize: theme.fontSize.xs,
            color: theme.colors.accent.danger,
            marginTop: theme.spacing.xs,
          }}>
            {formErrors.owner_id}
          </div>
        )}
      </div>
    </div>
  ), [vanForm, formErrors, owners, handleFormFieldChange]);

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: theme.colors.background.primary }}>
        <Sidebar user={user} onLogout={logout} hasRole={hasRole} />
        <div style={{ marginLeft: '260px', flex: 1, padding: theme.spacing['2xl'] }}>
          <div style={{ textAlign: 'center', padding: theme.spacing['2xl'] }}>
            <p style={{ color: theme.colors.text.secondary }}>Loading vans...</p>
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
              <Truck size={32} color={theme.colors.accent.primary} strokeWidth={2} />
              <h1 style={{
                fontSize: theme.fontSize['4xl'],
                fontWeight: theme.fontWeight.bold,
                color: theme.colors.text.primary,
                margin: 0,
              }}>
                Vans
              </h1>
              {pagination && pagination.totalCount > 0 && (
                <span style={{
                  backgroundColor: theme.colors.accent.primary,
                  color: '#ffffff',
                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                  borderRadius: theme.radius.full,
                  fontSize: theme.fontSize.sm,
                  fontWeight: theme.fontWeight.medium,
                }}>
                  {pagination.totalCount}
                </span>
              )}
            </div>
            <p style={{ color: theme.colors.text.secondary, fontSize: theme.fontSize.base, margin: 0 }}>
              Manage mobile grooming vans and their owners
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
              Add New Van
            </button>
          )}
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
                placeholder="Search by van number, make, or owner..."
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

          <select
            value={filterMake}
            onChange={(e) => setFilterMake(e.target.value)}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
              border: `1px solid ${theme.colors.border.medium}`,
              borderRadius: theme.radius.md,
              fontSize: theme.fontSize.sm,
            }}
          >
            <option value="">All Makes</option>
            <option value="Ford">Ford</option>
            <option value="Mercedes">Mercedes</option>
          </select>

          <input
            type="number"
            placeholder="Year from"
            value={filterYearFrom}
            onChange={(e) => setFilterYearFrom(e.target.value)}
            style={{
              padding: `${theme.spacing.sm}`,
              border: `1px solid ${theme.colors.border.medium}`,
              borderRadius: theme.radius.md,
              fontSize: theme.fontSize.sm,
              width: '120px',
            }}
          />

          <input
            type="number"
            placeholder="Year to"
            value={filterYearTo}
            onChange={(e) => setFilterYearTo(e.target.value)}
            style={{
              padding: `${theme.spacing.sm}`,
              border: `1px solid ${theme.colors.border.medium}`,
              borderRadius: theme.radius.md,
              fontSize: theme.fontSize.sm,
              width: '120px',
            }}
          />
        </div>

        {/* Vans Table */}
        <Card>
          {filteredVans.length === 0 && !loading ? (
            <div style={{
              textAlign: 'center',
              padding: theme.spacing['2xl'],
              color: theme.colors.text.secondary,
            }}>
              <Truck size={48} style={{ marginBottom: theme.spacing.md, opacity: 0.3 }} />
              <p style={{ fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.medium }}>
                No vans found
              </p>
              <p style={{ fontSize: theme.fontSize.sm }}>
                {searchQuery || filterMake || filterYearFrom || filterYearTo ? 'Try adjusting your filters' : 'Add your first van to get started'}
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
                      Van Number
                    </th>
                    <th style={{
                      padding: theme.spacing.md,
                      textAlign: 'left',
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.semibold,
                      color: theme.colors.text.secondary,
                    }}>
                      Make
                    </th>
                    <th style={{
                      padding: theme.spacing.md,
                      textAlign: 'left',
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.semibold,
                      color: theme.colors.text.secondary,
                    }}>
                      Version
                    </th>
                    <th style={{
                      padding: theme.spacing.md,
                      textAlign: 'left',
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.semibold,
                      color: theme.colors.text.secondary,
                    }}>
                      Year
                    </th>
                    <th style={{
                      padding: theme.spacing.md,
                      textAlign: 'left',
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.semibold,
                      color: theme.colors.text.secondary,
                    }}>
                      Owner
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
                  {filteredVans.map((van) => (
                    <tr key={van.id} style={{
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
                          {van.van_number}
                        </div>
                      </td>
                      <td style={{ padding: theme.spacing.md }}>
                        <span style={{
                          display: 'inline-block',
                          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                          backgroundColor: theme.colors.accent.primary + '20',
                          color: theme.colors.accent.primary,
                          borderRadius: theme.radius.md,
                          fontSize: theme.fontSize.xs,
                          fontWeight: theme.fontWeight.medium,
                        }}>
                          {van.make}
                        </span>
                      </td>
                      <td style={{ padding: theme.spacing.md, color: theme.colors.text.secondary, fontSize: theme.fontSize.sm }}>
                        {van.version || '-'}
                      </td>
                      <td style={{ padding: theme.spacing.md, color: theme.colors.text.secondary, fontSize: theme.fontSize.sm }}>
                        {van.year}
                      </td>
                      <td style={{ padding: theme.spacing.md }}>
                        {van.owner ? (
                          <div>
                            <div style={{
                              fontSize: theme.fontSize.sm,
                              color: theme.colors.text.primary,
                              fontWeight: theme.fontWeight.medium,
                            }}>
                              {van.owner.name}
                            </div>
                            <div style={{
                              fontSize: theme.fontSize.xs,
                              color: theme.colors.text.tertiary,
                            }}>
                              {van.owner.phone}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: theme.colors.text.tertiary }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: theme.spacing.md, textAlign: 'right' }}>
                        {hasRole('admin') && (
                          <div style={{ display: 'flex', gap: theme.spacing.xs, justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => openEditModal(van)}
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
                              title="Edit van"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => openDeleteModal(van)}
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
                              title="Delete van"
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

        {/* Create Van Modal */}
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
                  Add New Van
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
                {VanFormFields}

                <div style={{
                  display: 'flex',
                  gap: theme.spacing.md,
                  marginTop: theme.spacing.xl,
                }}>
                  <button
                    onClick={handleCreateVan}
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
                    Create Van
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

        {/* Edit Van Modal */}
        {editModalOpen && editingVan && (
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
                  Edit Van
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
                {VanFormFields}

                <div style={{
                  display: 'flex',
                  gap: theme.spacing.md,
                  marginTop: theme.spacing.xl,
                }}>
                  <button
                    onClick={handleUpdateVan}
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
        {deleteModalOpen && deletingVan && (
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
                Delete Van?
              </h2>

              <p style={{
                margin: 0,
                marginBottom: theme.spacing.lg,
                color: theme.colors.text.secondary,
                fontSize: theme.fontSize.sm,
              }}>
                Are you sure you want to delete van <strong>{deletingVan.van_number}</strong>?
              </p>

              <div style={{
                padding: theme.spacing.md,
                backgroundColor: theme.colors.background.tertiary,
                borderRadius: theme.radius.md,
                marginBottom: theme.spacing.lg,
              }}>
                <p style={{ margin: 0, fontSize: theme.fontSize.sm, color: theme.colors.text.secondary }}>
                  <strong>Make:</strong> {deletingVan.make} {deletingVan.version}
                </p>
                <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: theme.fontSize.sm, color: theme.colors.text.secondary }}>
                  <strong>Year:</strong> {deletingVan.year}
                </p>
                <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: theme.fontSize.sm, color: theme.colors.text.secondary }}>
                  <strong>Owner:</strong> {deletingVan.owner?.name}
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
                  onClick={handleDeleteVan}
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
                  Delete Van
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

export default Vans;
