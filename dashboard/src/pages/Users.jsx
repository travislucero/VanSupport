import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import Sidebar from '../components/Sidebar';
import Card from '../components/Card';
import { theme } from '../styles/theme';
import {
  Users as UsersIcon,
  Plus,
  Edit,
  Trash2,
  X,
  Search,
  Mail,
  Phone,
  Shield,
  AlertTriangle,
  User,
  Key,
} from 'lucide-react';
import {
  validateEmail,
  validateName,
  validatePhone,
  formatPhone,
} from '../utils/validators';

function Users() {
  const { user, logout, hasPermission, hasRole } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'inactive'

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deactivatingUser, setDeactivatingUser] = useState(null);
  const [resettingUser, setResettingUser] = useState(null);

  // Password reset state
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Form state
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role_name: '',
  });

  // Validation state
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('📋 Fetching users...');
      const response = await fetch('/api/users', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      console.log('📦 Users data:', data);
      setUsers(data);
    } catch (err) {
      console.error('💥 Error fetching users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      console.log('🔐 Fetching roles...');
      const response = await fetch('/api/roles', {
        credentials: 'include',
      });

      if (!response.ok) {
        // If roles endpoint doesn't exist, use default roles
        setRoles([
          { name: 'admin', description: 'Full system access' },
          { name: 'manager', description: 'Management access' },
          { name: 'technician', description: 'Technical access' },
          { name: 'viewer', description: 'Read-only access' },
        ]);
        return;
      }

      const data = await response.json();
      console.log('📦 Roles data:', data);
      setRoles(data);
    } catch (err) {
      console.error('💥 Error fetching roles:', err);
      // Fallback to default roles
      setRoles([
        { name: 'admin', description: 'Full system access' },
        { name: 'manager', description: 'Management access' },
        { name: 'technician', description: 'Technical access' },
        { name: 'viewer', description: 'Read-only access' },
      ]);
    }
  };

  const resetForm = useCallback(() => {
    setUserForm({
      email: '',
      password: '',
      full_name: '',
      phone: '',
      role_name: '',
    });
    setFormErrors({});
  }, []);

  const validateForm = useCallback((isEdit = false) => {
    const errors = {};

    const emailValidation = validateEmail(userForm.email);
    if (!emailValidation.valid) {
      errors.email = emailValidation.error;
    }

    // Password only required for new users
    if (!isEdit && !userForm.password) {
      errors.password = 'Password is required';
    }
    if (!isEdit && userForm.password && userForm.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (userForm.full_name) {
      const nameValidation = validateName(userForm.full_name);
      if (!nameValidation.valid) {
        errors.full_name = nameValidation.error;
      }
    }

    if (userForm.phone) {
      const phoneValidation = validatePhone(userForm.phone);
      if (!phoneValidation.valid) {
        errors.phone = phoneValidation.error;
      }
    }

    if (!userForm.role_name) {
      errors.role_name = 'Role is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [userForm]);

  const handleFormFieldChange = useCallback((field, value) => {
    setUserForm(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    setFormErrors(prev => ({ ...prev, [field]: '' }));
  }, []);

  const showSuccess = useCallback((message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 3000);
  }, []);

  const handleCreateUser = useCallback(async () => {
    console.log('🔍 handleCreateUser called');
    console.log('📝 userForm:', userForm);

    if (!validateForm(false)) {
      setError('Please fix validation errors');
      setTimeout(() => setError(''), 5000);
      return;
    }

    // Show warning for admin role assignment
    if (userForm.role_name === 'admin') {
      const confirmed = window.confirm(
        '⚠️ You are creating an admin user with full system access. Are you sure?'
      );
      if (!confirmed) {
        console.log('❌ Admin user creation cancelled by user');
        return;
      }
    }

    try {
      console.log('🚀 Submitting to API...');
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(userForm),
      });

      console.log('📡 Response status:', response.status);
      const data = await response.json();
      console.log('📦 Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      await fetchUsers();
      setCreateModalOpen(false);
      resetForm();
      showSuccess('User created successfully');
    } catch (err) {
      console.error('💥 Error creating user:', err);
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    }
  }, [userForm, validateForm, resetForm, showSuccess]);

  const handleUpdateUser = useCallback(async () => {
    console.log('🔍 handleUpdateUser called');
    console.log('📝 editingUser:', editingUser);
    console.log('📝 userForm:', userForm);

    if (!validateForm(true)) {
      console.log('❌ Validation failed');
      setError('Please fix validation errors');
      setTimeout(() => setError(''), 5000);
      return;
    }

    // Check if trying to edit own role
    if (editingUser.id === user.id && userForm.role_name !== editingUser.role?.name) {
      setError('Cannot modify your own role');
      setTimeout(() => setError(''), 5000);
      return;
    }

    // Show warning for admin role assignment
    if (userForm.role_name === 'admin' && editingUser.role?.name !== 'admin') {
      const confirmed = window.confirm(
        '⚠️ You are assigning admin role with full system access. Are you sure?'
      );
      if (!confirmed) {
        console.log('❌ Admin role assignment cancelled by user');
        return;
      }
    }

    try {
      console.log('🚀 Submitting to API...');
      // Don't send password for updates
      const { password, ...updateData } = userForm;

      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updateData),
      });

      console.log('📡 Response status:', response.status);
      const data = await response.json();
      console.log('📦 Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user');
      }

      await fetchUsers();
      setEditModalOpen(false);
      setEditingUser(null);
      resetForm();
      showSuccess('User updated successfully');
    } catch (err) {
      console.error('💥 Error updating user:', err);
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    }
  }, [editingUser, userForm, validateForm, resetForm, showSuccess, user]);

  const handleDeactivateUser = useCallback(async () => {
    try {
      console.log('🔍 handleDeactivateUser called');
      console.log('📝 deactivatingUser:', deactivatingUser);

      // Check if trying to deactivate self
      if (deactivatingUser.id === user.id) {
        setError('Cannot deactivate your own account');
        setTimeout(() => setError(''), 5000);
        setDeactivateModalOpen(false);
        setDeactivatingUser(null);
        return;
      }

      console.log('🚀 Sending deactivation request...');
      const response = await fetch(`/api/users/${deactivatingUser.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to deactivate user');
      }

      const data = await response.json();
      console.log('📦 Response data:', data);

      await fetchUsers();
      setDeactivateModalOpen(false);
      setDeactivatingUser(null);
      showSuccess(`User ${deactivatingUser.email} deactivated successfully!`);
    } catch (err) {
      console.error('💥 Error deactivating user:', err);
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    }
  }, [deactivatingUser, showSuccess, user]);

  const openEditModal = useCallback((userToEdit) => {
    setEditingUser(userToEdit);
    setUserForm({
      email: userToEdit.email || '',
      password: '', // Never populate password
      full_name: userToEdit.full_name || '',
      phone: userToEdit.phone || '',
      role_name: userToEdit.role?.name || '',
    });
    setFormErrors({});
    setEditModalOpen(true);
  }, []);

  const openDeactivateModal = useCallback((userToDeactivate) => {
    setDeactivatingUser(userToDeactivate);
    setDeactivateModalOpen(true);
  }, []);

  const openPasswordModal = useCallback((userToReset) => {
    setResettingUser(userToReset);
    setNewPassword('');
    setPasswordError('');
    setPasswordModalOpen(true);
  }, []);

  const handleResetPassword = useCallback(async () => {
    try {
      console.log('🔑 handleResetPassword called');
      console.log('📝 resettingUser:', resettingUser);

      setPasswordError('');

      // Validation
      if (!newPassword || newPassword.length < 6) {
        setPasswordError('Password must be at least 6 characters');
        return;
      }

      console.log('🚀 Sending password reset request...');
      const response = await fetch(`/api/users/${resettingUser.id}/reset-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ new_password: newPassword })
      });

      console.log('📡 Response status:', response.status);
      const data = await response.json();
      console.log('📦 Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      showSuccess(`Password reset successfully for ${resettingUser.email}`);
      setPasswordModalOpen(false);
      setResettingUser(null);
      setNewPassword('');
      setPasswordError('');

    } catch (err) {
      console.error('💥 Error resetting password:', err);
      setPasswordError(err.message || 'Failed to reset password');
    }
  }, [resettingUser, newPassword, showSuccess]);

  const formatLastLogin = useCallback((lastLogin) => {
    if (!lastLogin) return 'Never';

    const date = new Date(lastLogin);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }, []);

  const filteredAndSortedUsers = useMemo(() => {
    let filtered = [...users];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(u =>
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.full_name && u.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.phone && u.phone.includes(searchQuery))
      );
    }

    // Filter by role
    if (filterRole) {
      filtered = filtered.filter(u => u.role?.name === filterRole);
    }

    // Filter by status
    if (filterStatus === 'active') {
      filtered = filtered.filter(u => u.is_active);
    } else if (filterStatus === 'inactive') {
      filtered = filtered.filter(u => !u.is_active);
    }

    return filtered;
  }, [users, searchQuery, filterRole, filterStatus]);

  const UserFormFields = useMemo(() => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.lg }}>
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
          value={userForm.email}
          onChange={(e) => handleFormFieldChange('email', e.target.value)}
          placeholder="user@example.com"
          disabled={!!editingUser} // Can't change email when editing
          style={{
            width: '100%',
            padding: theme.spacing.md,
            fontSize: theme.fontSize.sm,
            border: `1px solid ${formErrors.email ? theme.colors.accent.danger : theme.colors.border.light}`,
            borderRadius: theme.radius.md,
            backgroundColor: editingUser ? theme.colors.background.secondary : theme.colors.background.primary,
            color: theme.colors.text.primary,
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
        />
        {formErrors.email && (
          <p style={{ color: theme.colors.accent.danger, fontSize: theme.fontSize.xs, marginTop: theme.spacing.xs }}>
            {formErrors.email}
          </p>
        )}
      </div>

      {!editingUser && (
        <div>
          <label style={{
            display: 'block',
            fontSize: theme.fontSize.sm,
            fontWeight: theme.fontWeight.medium,
            color: theme.colors.text.primary,
            marginBottom: theme.spacing.xs,
          }}>
            Password <span style={{ color: theme.colors.accent.danger }}>*</span>
          </label>
          <input
            type="password"
            value={userForm.password}
            onChange={(e) => handleFormFieldChange('password', e.target.value)}
            placeholder="Minimum 6 characters"
            style={{
              width: '100%',
              padding: theme.spacing.md,
              fontSize: theme.fontSize.sm,
              border: `1px solid ${formErrors.password ? theme.colors.accent.danger : theme.colors.border.light}`,
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.background.primary,
              color: theme.colors.text.primary,
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
          />
          {formErrors.password && (
            <p style={{ color: theme.colors.accent.danger, fontSize: theme.fontSize.xs, marginTop: theme.spacing.xs }}>
              {formErrors.password}
            </p>
          )}
        </div>
      )}

      <div>
        <label style={{
          display: 'block',
          fontSize: theme.fontSize.sm,
          fontWeight: theme.fontWeight.medium,
          color: theme.colors.text.primary,
          marginBottom: theme.spacing.xs,
        }}>
          Full Name
        </label>
        <input
          type="text"
          value={userForm.full_name}
          onChange={(e) => handleFormFieldChange('full_name', e.target.value)}
          placeholder="John Doe"
          style={{
            width: '100%',
            padding: theme.spacing.md,
            fontSize: theme.fontSize.sm,
            border: `1px solid ${formErrors.full_name ? theme.colors.accent.danger : theme.colors.border.light}`,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.background.primary,
            color: theme.colors.text.primary,
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
        />
        {formErrors.full_name && (
          <p style={{ color: theme.colors.accent.danger, fontSize: theme.fontSize.xs, marginTop: theme.spacing.xs }}>
            {formErrors.full_name}
          </p>
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
          Phone
        </label>
        <input
          type="tel"
          value={userForm.phone}
          onChange={(e) => handleFormFieldChange('phone', formatPhone(e.target.value))}
          placeholder="(555) 123-4567"
          style={{
            width: '100%',
            padding: theme.spacing.md,
            fontSize: theme.fontSize.sm,
            border: `1px solid ${formErrors.phone ? theme.colors.accent.danger : theme.colors.border.light}`,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.background.primary,
            color: theme.colors.text.primary,
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
        />
        {formErrors.phone && (
          <p style={{ color: theme.colors.accent.danger, fontSize: theme.fontSize.xs, marginTop: theme.spacing.xs }}>
            {formErrors.phone}
          </p>
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
          Role <span style={{ color: theme.colors.accent.danger }}>*</span>
        </label>
        <select
          value={userForm.role_name}
          onChange={(e) => handleFormFieldChange('role_name', e.target.value)}
          disabled={editingUser && editingUser.id === user.id} // Can't change own role
          style={{
            width: '100%',
            padding: theme.spacing.md,
            fontSize: theme.fontSize.sm,
            border: `1px solid ${formErrors.role_name ? theme.colors.accent.danger : theme.colors.border.light}`,
            borderRadius: theme.radius.md,
            backgroundColor: (editingUser && editingUser.id === user.id) ? theme.colors.background.secondary : theme.colors.background.primary,
            color: theme.colors.text.primary,
            outline: 'none',
            cursor: (editingUser && editingUser.id === user.id) ? 'not-allowed' : 'pointer',
          }}
        >
          <option value="">Select role...</option>
          {roles.map(role => (
            <option key={role.name} value={role.name}>
              {role.name.charAt(0).toUpperCase() + role.name.slice(1)} - {role.description}
            </option>
          ))}
        </select>
        {formErrors.role_name && (
          <p style={{ color: theme.colors.accent.danger, fontSize: theme.fontSize.xs, marginTop: theme.spacing.xs }}>
            {formErrors.role_name}
          </p>
        )}
        {editingUser && editingUser.id === user.id && (
          <p style={{ color: theme.colors.text.secondary, fontSize: theme.fontSize.xs, marginTop: theme.spacing.xs }}>
            ℹ️ You cannot change your own role
          </p>
        )}
      </div>
    </div>
  ), [userForm, formErrors, handleFormFieldChange, roles, editingUser, user]);

  const canManageUsers = hasPermission('manage_users');

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: theme.colors.background.primary,
    }}>
      <Sidebar user={user} onLogout={logout} hasRole={hasRole} />

      <main style={{
        flex: 1,
        padding: theme.spacing.xl,
        marginLeft: '240px',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing.xl,
        }}>
          <div>
            <h1 style={{
              fontSize: theme.fontSize['2xl'],
              fontWeight: theme.fontWeight.bold,
              color: theme.colors.text.primary,
              margin: 0,
              marginBottom: theme.spacing.xs,
            }}>
              User Management
            </h1>
            <p style={{
              fontSize: theme.fontSize.sm,
              color: theme.colors.text.secondary,
              margin: 0,
            }}>
              Manage system users and role assignments
            </p>
          </div>

          {canManageUsers && (
            <button
              onClick={() => {
                resetForm();
                setCreateModalOpen(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.sm,
                padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                backgroundColor: theme.colors.accent.primary,
                color: 'white',
                border: 'none',
                borderRadius: theme.radius.md,
                fontSize: theme.fontSize.sm,
                fontWeight: theme.fontWeight.medium,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = theme.colors.accent.primaryDark;
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = theme.colors.accent.primary;
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <Plus size={16} />
              Add User
            </button>
          )}
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div style={{
            padding: theme.spacing.md,
            backgroundColor: theme.colors.accent.dangerLight,
            border: `1px solid ${theme.colors.accent.danger}`,
            borderRadius: theme.radius.md,
            marginBottom: theme.spacing.lg,
            color: theme.colors.accent.danger,
            fontSize: theme.fontSize.sm,
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            padding: theme.spacing.md,
            backgroundColor: theme.colors.accent.successLight,
            border: `1px solid ${theme.colors.accent.success}`,
            borderRadius: theme.radius.md,
            marginBottom: theme.spacing.lg,
            color: theme.colors.accent.success,
            fontSize: theme.fontSize.sm,
          }}>
            {success}
          </div>
        )}

        {/* Search and Filter Controls */}
        <Card style={{ marginBottom: theme.spacing.lg }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr',
            gap: theme.spacing.md,
          }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: theme.spacing.md,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: theme.colors.text.secondary,
                }}
              />
              <input
                type="text"
                placeholder="Search by email, name, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  paddingLeft: '36px',
                  fontSize: theme.fontSize.sm,
                  border: `1px solid ${theme.colors.border.light}`,
                  borderRadius: theme.radius.md,
                  backgroundColor: theme.colors.background.primary,
                  color: theme.colors.text.primary,
                  outline: 'none',
                }}
              />
            </div>

            {/* Filter by Role */}
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                fontSize: theme.fontSize.sm,
                border: `1px solid ${theme.colors.border.light}`,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.background.primary,
                color: theme.colors.text.primary,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">All Roles</option>
              {roles.map(role => (
                <option key={role.name} value={role.name}>
                  {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                </option>
              ))}
            </select>

            {/* Filter by Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                fontSize: theme.fontSize.sm,
                border: `1px solid ${theme.colors.border.light}`,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.background.primary,
                color: theme.colors.text.primary,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </Card>

        {/* Users Table */}
        <Card>
          {loading ? (
            <div style={{
              textAlign: 'center',
              padding: theme.spacing.xl,
              color: theme.colors.text.secondary,
            }}>
              Loading users...
            </div>
          ) : filteredAndSortedUsers.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: theme.spacing.xl,
              color: theme.colors.text.secondary,
            }}>
              <UsersIcon size={48} style={{ marginBottom: theme.spacing.md, opacity: 0.5 }} />
              <p>No users found</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
              }}>
                <thead>
                  <tr style={{
                    borderBottom: `1px solid ${theme.colors.border.light}`,
                  }}>
                    <th style={{
                      padding: theme.spacing.md,
                      textAlign: 'left',
                      fontSize: theme.fontSize.xs,
                      fontWeight: theme.fontWeight.semibold,
                      color: theme.colors.text.secondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      Email
                    </th>
                    <th style={{
                      padding: theme.spacing.md,
                      textAlign: 'left',
                      fontSize: theme.fontSize.xs,
                      fontWeight: theme.fontWeight.semibold,
                      color: theme.colors.text.secondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      Name
                    </th>
                    <th style={{
                      padding: theme.spacing.md,
                      textAlign: 'left',
                      fontSize: theme.fontSize.xs,
                      fontWeight: theme.fontWeight.semibold,
                      color: theme.colors.text.secondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      Phone
                    </th>
                    <th style={{
                      padding: theme.spacing.md,
                      textAlign: 'left',
                      fontSize: theme.fontSize.xs,
                      fontWeight: theme.fontWeight.semibold,
                      color: theme.colors.text.secondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      Role
                    </th>
                    <th style={{
                      padding: theme.spacing.md,
                      textAlign: 'left',
                      fontSize: theme.fontSize.xs,
                      fontWeight: theme.fontWeight.semibold,
                      color: theme.colors.text.secondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      Last Login
                    </th>
                    <th style={{
                      padding: theme.spacing.md,
                      textAlign: 'left',
                      fontSize: theme.fontSize.xs,
                      fontWeight: theme.fontWeight.semibold,
                      color: theme.colors.text.secondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      Status
                    </th>
                    {canManageUsers && (
                      <th style={{
                        padding: theme.spacing.md,
                        textAlign: 'right',
                        fontSize: theme.fontSize.xs,
                        fontWeight: theme.fontWeight.semibold,
                        color: theme.colors.text.secondary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedUsers.map((u) => (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: `1px solid ${theme.colors.border.light}`,
                        opacity: u.is_active ? 1 : 0.5,
                        backgroundColor: !u.is_active ? theme.colors.background.secondary : 'transparent',
                      }}
                    >
                      <td style={{
                        padding: theme.spacing.md,
                        fontSize: theme.fontSize.sm,
                        color: theme.colors.text.primary,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
                          <Mail size={14} style={{ color: theme.colors.text.secondary }} />
                          {u.email}
                          {u.id === user.id && (
                            <span style={{
                              fontSize: theme.fontSize.xs,
                              padding: '2px 6px',
                              backgroundColor: theme.colors.accent.primaryLight,
                              color: theme.colors.accent.primary,
                              borderRadius: theme.radius.sm,
                            }}>
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{
                        padding: theme.spacing.md,
                        fontSize: theme.fontSize.sm,
                        color: theme.colors.text.primary,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
                          <User size={14} style={{ color: theme.colors.text.secondary }} />
                          {u.full_name || '-'}
                        </div>
                      </td>
                      <td style={{
                        padding: theme.spacing.md,
                        fontSize: theme.fontSize.sm,
                        color: theme.colors.text.primary,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
                          <Phone size={14} style={{ color: theme.colors.text.secondary }} />
                          {u.phone || '-'}
                        </div>
                      </td>
                      <td style={{
                        padding: theme.spacing.md,
                        fontSize: theme.fontSize.sm,
                        color: theme.colors.text.primary,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
                          <Shield size={14} style={{ color: theme.colors.text.secondary }} />
                          <span style={{
                            padding: '4px 8px',
                            backgroundColor: u.role?.name === 'admin' ? theme.colors.accent.dangerLight : theme.colors.accent.primaryLight,
                            color: u.role?.name === 'admin' ? theme.colors.accent.danger : theme.colors.accent.primary,
                            borderRadius: theme.radius.sm,
                            fontSize: theme.fontSize.xs,
                            fontWeight: theme.fontWeight.medium,
                          }}>
                            {u.role?.name ? u.role.name.charAt(0).toUpperCase() + u.role.name.slice(1) : 'No Role'}
                          </span>
                        </div>
                      </td>
                      <td style={{
                        padding: theme.spacing.md,
                        fontSize: theme.fontSize.sm,
                        color: theme.colors.text.secondary,
                      }}>
                        {formatLastLogin(u.last_login)}
                      </td>
                      <td style={{
                        padding: theme.spacing.md,
                        fontSize: theme.fontSize.sm,
                        color: theme.colors.text.primary,
                      }}>
                        <span style={{
                          padding: '4px 8px',
                          backgroundColor: u.is_active ? theme.colors.accent.successLight : theme.colors.background.secondary,
                          color: u.is_active ? theme.colors.accent.success : theme.colors.text.secondary,
                          borderRadius: theme.radius.sm,
                          fontSize: theme.fontSize.xs,
                          fontWeight: theme.fontWeight.medium,
                        }}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {canManageUsers && (
                        <td style={{
                          padding: theme.spacing.md,
                          fontSize: theme.fontSize.sm,
                          textAlign: 'right',
                        }}>
                          <div style={{ display: 'flex', gap: theme.spacing.sm, justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => openEditModal(u)}
                              style={{
                                padding: theme.spacing.sm,
                                backgroundColor: 'transparent',
                                border: `1px solid ${theme.colors.border.light}`,
                                borderRadius: theme.radius.sm,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                color: theme.colors.text.secondary,
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.borderColor = theme.colors.accent.primary;
                                e.target.style.color = theme.colors.accent.primary;
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.borderColor = theme.colors.border.light;
                                e.target.style.color = theme.colors.text.secondary;
                              }}
                            >
                              <Edit size={14} />
                            </button>
                            {u.id !== user.id && (
                              <button
                                onClick={() => openPasswordModal(u)}
                                style={{
                                  padding: theme.spacing.sm,
                                  backgroundColor: 'transparent',
                                  border: `1px solid ${theme.colors.border.light}`,
                                  borderRadius: theme.radius.sm,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  color: theme.colors.text.secondary,
                                  transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.borderColor = theme.colors.accent.warning;
                                  e.target.style.color = theme.colors.accent.warning;
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.borderColor = theme.colors.border.light;
                                  e.target.style.color = theme.colors.text.secondary;
                                }}
                                title="Reset password"
                              >
                                <Key size={14} />
                              </button>
                            )}
                            {u.is_active && u.id !== user.id && (
                              <button
                                onClick={() => openDeactivateModal(u)}
                                style={{
                                  padding: theme.spacing.sm,
                                  backgroundColor: 'transparent',
                                  border: `1px solid ${theme.colors.border.light}`,
                                  borderRadius: theme.radius.sm,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  color: theme.colors.text.secondary,
                                  transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.borderColor = theme.colors.accent.danger;
                                  e.target.style.color = theme.colors.accent.danger;
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.borderColor = theme.colors.border.light;
                                  e.target.style.color = theme.colors.text.secondary;
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Create User Modal */}
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
          }}>
            <div style={{
              backgroundColor: theme.colors.background.primary,
              borderRadius: theme.radius.lg,
              padding: theme.spacing.xl,
              width: '90%',
              maxWidth: '500px',
              maxHeight: '90vh',
              overflow: 'auto',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: theme.spacing.lg,
              }}>
                <h2 style={{
                  fontSize: theme.fontSize.xl,
                  fontWeight: theme.fontWeight.semibold,
                  color: theme.colors.text.primary,
                  margin: 0,
                }}>
                  Create New User
                </h2>
                <button
                  onClick={() => {
                    setCreateModalOpen(false);
                    resetForm();
                  }}
                  style={{
                    padding: theme.spacing.xs,
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: theme.colors.text.secondary,
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {UserFormFields}

              <div style={{
                display: 'flex',
                gap: theme.spacing.md,
                marginTop: theme.spacing.xl,
              }}>
                <button
                  onClick={handleCreateUser}
                  style={{
                    flex: 1,
                    padding: theme.spacing.md,
                    backgroundColor: theme.colors.accent.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: theme.radius.md,
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    cursor: 'pointer',
                  }}
                >
                  Create User
                </button>
                <button
                  onClick={() => {
                    setCreateModalOpen(false);
                    resetForm();
                  }}
                  style={{
                    flex: 1,
                    padding: theme.spacing.md,
                    backgroundColor: 'transparent',
                    color: theme.colors.text.secondary,
                    border: `1px solid ${theme.colors.border.light}`,
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

        {/* Edit User Modal */}
        {editModalOpen && editingUser && (
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
          }}>
            <div style={{
              backgroundColor: theme.colors.background.primary,
              borderRadius: theme.radius.lg,
              padding: theme.spacing.xl,
              width: '90%',
              maxWidth: '500px',
              maxHeight: '90vh',
              overflow: 'auto',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: theme.spacing.lg,
              }}>
                <h2 style={{
                  fontSize: theme.fontSize.xl,
                  fontWeight: theme.fontWeight.semibold,
                  color: theme.colors.text.primary,
                  margin: 0,
                }}>
                  Edit User
                </h2>
                <button
                  onClick={() => {
                    setEditModalOpen(false);
                    setEditingUser(null);
                    resetForm();
                  }}
                  style={{
                    padding: theme.spacing.xs,
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: theme.colors.text.secondary,
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {UserFormFields}

              <div style={{
                display: 'flex',
                gap: theme.spacing.md,
                marginTop: theme.spacing.xl,
              }}>
                <button
                  onClick={handleUpdateUser}
                  style={{
                    flex: 1,
                    padding: theme.spacing.md,
                    backgroundColor: theme.colors.accent.primary,
                    color: 'white',
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
                    setEditingUser(null);
                    resetForm();
                  }}
                  style={{
                    flex: 1,
                    padding: theme.spacing.md,
                    backgroundColor: 'transparent',
                    color: theme.colors.text.secondary,
                    border: `1px solid ${theme.colors.border.light}`,
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

        {/* Deactivate User Modal */}
        {deactivateModalOpen && deactivatingUser && (
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
          }}>
            <div style={{
              backgroundColor: theme.colors.background.primary,
              borderRadius: theme.radius.lg,
              padding: theme.spacing.xl,
              width: '90%',
              maxWidth: '400px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: theme.spacing.md,
                marginBottom: theme.spacing.lg,
              }}>
                <AlertTriangle size={24} style={{ color: theme.colors.accent.warning, flexShrink: 0 }} />
                <div>
                  <h2 style={{
                    fontSize: theme.fontSize.xl,
                    fontWeight: theme.fontWeight.semibold,
                    color: theme.colors.text.primary,
                    margin: 0,
                    marginBottom: theme.spacing.sm,
                  }}>
                    Deactivate User
                  </h2>
                  <p style={{
                    fontSize: theme.fontSize.sm,
                    color: theme.colors.text.secondary,
                    margin: 0,
                  }}>
                    Are you sure you want to deactivate user <strong>{deactivatingUser.email}</strong>?
                    They will no longer be able to access the system.
                  </p>
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: theme.spacing.md,
              }}>
                <button
                  onClick={handleDeactivateUser}
                  style={{
                    flex: 1,
                    padding: theme.spacing.md,
                    backgroundColor: theme.colors.accent.danger,
                    color: 'white',
                    border: 'none',
                    borderRadius: theme.radius.md,
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    cursor: 'pointer',
                  }}
                >
                  Deactivate
                </button>
                <button
                  onClick={() => {
                    setDeactivateModalOpen(false);
                    setDeactivatingUser(null);
                  }}
                  style={{
                    flex: 1,
                    padding: theme.spacing.md,
                    backgroundColor: 'transparent',
                    color: theme.colors.text.secondary,
                    border: `1px solid ${theme.colors.border.light}`,
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

        {/* Reset Password Modal */}
        {passwordModalOpen && resettingUser && (
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
          }}>
            <div style={{
              backgroundColor: theme.colors.background.primary,
              borderRadius: theme.radius.lg,
              padding: theme.spacing.xl,
              width: '90%',
              maxWidth: '400px',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: theme.spacing.lg,
              }}>
                <h2 style={{
                  fontSize: theme.fontSize.xl,
                  fontWeight: theme.fontWeight.semibold,
                  color: theme.colors.text.primary,
                  margin: 0,
                }}>
                  Reset Password
                </h2>
                <button
                  onClick={() => {
                    setPasswordModalOpen(false);
                    setResettingUser(null);
                    setNewPassword('');
                    setPasswordError('');
                  }}
                  style={{
                    padding: theme.spacing.xs,
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: theme.colors.text.secondary,
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ marginBottom: theme.spacing.lg }}>
                <p style={{
                  fontSize: theme.fontSize.sm,
                  color: theme.colors.text.secondary,
                  marginBottom: theme.spacing.lg,
                }}>
                  Reset password for <strong>{resettingUser.email}</strong>
                </p>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    color: theme.colors.text.primary,
                    marginBottom: theme.spacing.xs,
                  }}>
                    New Password <span style={{ color: theme.colors.accent.danger }}>*</span>
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 characters)"
                    style={{
                      width: '100%',
                      padding: theme.spacing.md,
                      fontSize: theme.fontSize.sm,
                      border: `1px solid ${passwordError ? theme.colors.accent.danger : theme.colors.border.light}`,
                      borderRadius: theme.radius.md,
                      backgroundColor: theme.colors.background.primary,
                      color: theme.colors.text.primary,
                      outline: 'none',
                    }}
                  />
                  {passwordError && (
                    <p style={{
                      color: theme.colors.accent.danger,
                      fontSize: theme.fontSize.xs,
                      marginTop: theme.spacing.xs,
                    }}>
                      {passwordError}
                    </p>
                  )}
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: theme.spacing.md,
                marginBottom: theme.spacing.md,
              }}>
                <button
                  onClick={handleResetPassword}
                  disabled={!newPassword}
                  style={{
                    flex: 1,
                    padding: theme.spacing.md,
                    backgroundColor: !newPassword ? theme.colors.background.secondary : theme.colors.accent.warning,
                    color: !newPassword ? theme.colors.text.secondary : 'white',
                    border: 'none',
                    borderRadius: theme.radius.md,
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    cursor: !newPassword ? 'not-allowed' : 'pointer',
                    opacity: !newPassword ? 0.5 : 1,
                  }}
                >
                  Reset Password
                </button>
                <button
                  onClick={() => {
                    setPasswordModalOpen(false);
                    setResettingUser(null);
                    setNewPassword('');
                    setPasswordError('');
                  }}
                  style={{
                    flex: 1,
                    padding: theme.spacing.md,
                    backgroundColor: 'transparent',
                    color: theme.colors.text.secondary,
                    border: `1px solid ${theme.colors.border.light}`,
                    borderRadius: theme.radius.md,
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: theme.spacing.xs,
                padding: theme.spacing.sm,
                backgroundColor: theme.colors.background.secondary,
                borderRadius: theme.radius.sm,
              }}>
                <AlertTriangle size={14} style={{ color: theme.colors.text.secondary, flexShrink: 0, marginTop: '2px' }} />
                <p style={{
                  fontSize: theme.fontSize.xs,
                  color: theme.colors.text.secondary,
                  margin: 0,
                }}>
                  The user will need to use this new password on their next login.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Users;
