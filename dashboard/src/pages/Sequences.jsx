import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import Sidebar from '../components/Sidebar';
import Card from '../components/Card';
import Badge from '../components/Badge';
import { theme } from '../styles/theme';
import { List, Plus, Edit, Trash2, ToggleLeft, ToggleRight, Search, Loader } from 'lucide-react';

function Sequences() {
  const { user, logout, hasRole, isSiteAdmin } = useAuth();
  const navigate = useNavigate();

  // Check if user can manage sequences (site_admin, admin, or manager)
  const canManageSequences = isSiteAdmin() || hasRole('admin') || hasRole('manager');

  const [sequences, setSequences] = useState([]);
  const [filteredSequences, setFilteredSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [sequenceToDelete, setSequenceToDelete] = useState(null);

  // Fetch sequences on mount
  useEffect(() => {
    fetchSequences();
  }, []);

  // Filter and sort sequences when data or filters change
  useEffect(() => {
    let filtered = [...sequences];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(seq =>
        seq.display_name?.toLowerCase().includes(term) ||
        seq.sequence_key?.toLowerCase().includes(term) ||
        seq.category?.toLowerCase().includes(term)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.display_name || '').localeCompare(b.display_name || '');
        case 'category':
          return (a.category || '').localeCompare(b.category || '');
        case 'created':
          return new Date(b.created_at) - new Date(a.created_at);
        default:
          return 0;
      }
    });

    setFilteredSequences(filtered);
  }, [sequences, searchTerm, sortBy]);

  const fetchSequences = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sequences', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sequences');
      }

      const data = await response.json();
      setSequences(data);
    } catch (error) {
      console.error('Error fetching sequences:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSequenceActive = async (sequenceKey, currentStatus) => {
    try {
      const response = await fetch(`/api/sequences/${sequenceKey}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle sequence');
      }

      // Refresh sequences
      await fetchSequences();
    } catch (error) {
      console.error('Error toggling sequence:', error);
      alert('Failed to toggle sequence status');
    }
  };

  const handleDeleteClick = (sequence) => {
    setSequenceToDelete(sequence);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!sequenceToDelete) return;

    try {
      const response = await fetch(`/api/sequences/${sequenceToDelete.sequence_key}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete sequence');
      }

      // Refresh sequences
      await fetchSequences();
      setDeleteModalOpen(false);
      setSequenceToDelete(null);
    } catch (error) {
      console.error('Error deleting sequence:', error);
      alert('Failed to delete sequence');
    }
  };

  const getCategoryColor = (category) => {
    const categoryMap = {
      'network': 'primary',
      'hardware': 'warning',
      'software': 'secondary',
      'power': 'danger',
      'connectivity': 'success',
    };
    return categoryMap[category?.toLowerCase()] || 'default';
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: theme.colors.background.primary }}>
      <Sidebar user={user} onLogout={logout} hasRole={hasRole} isSiteAdmin={isSiteAdmin} />

      <div style={{ marginLeft: '260px', flex: 1, padding: theme.spacing['2xl'] }}>
        {/* Header */}
        <div style={{ marginBottom: theme.spacing['2xl'] }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.md }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md, marginBottom: theme.spacing.xs }}>
                <List size={32} color={theme.colors.accent.primary} strokeWidth={2} />
                <h1
                  style={{
                    fontSize: theme.fontSize['4xl'],
                    fontWeight: theme.fontWeight.bold,
                    color: theme.colors.text.primary,
                    margin: 0,
                  }}
                >
                  Sequences
                </h1>
              </div>
              <p style={{ color: theme.colors.text.secondary, fontSize: theme.fontSize.base, margin: 0 }}>
                Manage troubleshooting sequences
              </p>
            </div>

            {/* Create New Button - only for manager+ */}
            {canManageSequences && (
              <button
                onClick={() => navigate('/sequences/create')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.sm,
                  padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                  backgroundColor: theme.colors.accent.primary,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: theme.radius.md,
                  fontSize: theme.fontSize.base,
                  fontWeight: theme.fontWeight.medium,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = theme.colors.accent.primaryHover}
                onMouseLeave={(e) => e.target.style.backgroundColor = theme.colors.accent.primary}
              >
                <Plus size={20} />
                Create New Sequence
              </button>
            )}
          </div>
        </div>

        {/* Search and Filter Controls */}
        <Card style={{ marginBottom: theme.spacing.lg }}>
          <div style={{ display: 'flex', gap: theme.spacing.md, alignItems: 'center' }}>
            {/* Search */}
            <div style={{ flex: 1, position: 'relative' }}>
              <Search
                size={20}
                color={theme.colors.text.tertiary}
                style={{ position: 'absolute', left: theme.spacing.md, top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Search by name, key, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: `${theme.spacing.sm} ${theme.spacing.md} ${theme.spacing.sm} 40px`,
                  border: `1px solid ${theme.colors.border.light}`,
                  borderRadius: theme.radius.md,
                  fontSize: theme.fontSize.base,
                  color: theme.colors.text.primary,
                  backgroundColor: theme.colors.background.primary,
                  outline: 'none',
                }}
              />
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                border: `1px solid ${theme.colors.border.light}`,
                borderRadius: theme.radius.md,
                fontSize: theme.fontSize.base,
                color: theme.colors.text.primary,
                backgroundColor: theme.colors.background.primary,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="name">Sort by Name</option>
              <option value="category">Sort by Category</option>
              <option value="created">Sort by Date</option>
            </select>
          </div>
        </Card>

        {/* Sequences Table */}
        <Card noPadding>
          {loading ? (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: theme.spacing['2xl'],
              gap: theme.spacing.md
            }}>
              <Loader size={24} color={theme.colors.accent.primary} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ color: theme.colors.text.secondary }}>Loading sequences...</span>
            </div>
          ) : filteredSequences.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: theme.spacing['2xl'],
              color: theme.colors.text.secondary
            }}>
              {searchTerm ? (
                <>
                  <p style={{ fontSize: theme.fontSize.lg, marginBottom: theme.spacing.sm }}>No sequences found</p>
                  <p style={{ fontSize: theme.fontSize.sm }}>Try adjusting your search terms</p>
                </>
              ) : (
                <>
                  <p style={{ fontSize: theme.fontSize.lg, marginBottom: theme.spacing.sm }}>No sequences yet</p>
                  <p style={{ fontSize: theme.fontSize.sm }}>Create your first troubleshooting sequence to get started</p>
                </>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: theme.colors.background.tertiary, borderBottom: `1px solid ${theme.colors.border.light}` }}>
                    <th style={{ padding: theme.spacing.md, textAlign: 'left', color: theme.colors.text.primary, fontWeight: theme.fontWeight.semibold, fontSize: theme.fontSize.sm }}>
                      Sequence Name
                    </th>
                    <th style={{ padding: theme.spacing.md, textAlign: 'left', color: theme.colors.text.primary, fontWeight: theme.fontWeight.semibold, fontSize: theme.fontSize.sm }}>
                      Key
                    </th>
                    <th style={{ padding: theme.spacing.md, textAlign: 'left', color: theme.colors.text.primary, fontWeight: theme.fontWeight.semibold, fontSize: theme.fontSize.sm }}>
                      Category
                    </th>
                    <th style={{ padding: theme.spacing.md, textAlign: 'center', color: theme.colors.text.primary, fontWeight: theme.fontWeight.semibold, fontSize: theme.fontSize.sm }}>
                      Steps
                    </th>
                    {canManageSequences && (
                      <th style={{ padding: theme.spacing.md, textAlign: 'center', color: theme.colors.text.primary, fontWeight: theme.fontWeight.semibold, fontSize: theme.fontSize.sm }}>
                        Status
                      </th>
                    )}
                    {canManageSequences && (
                      <th style={{ padding: theme.spacing.md, textAlign: 'center', color: theme.colors.text.primary, fontWeight: theme.fontWeight.semibold, fontSize: theme.fontSize.sm }}>
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredSequences.map((sequence, index) => (
                    <tr
                      key={sequence.sequence_key}
                      style={{
                        borderBottom: index < filteredSequences.length - 1 ? `1px solid ${theme.colors.border.light}` : 'none',
                        cursor: canManageSequences ? 'pointer' : 'default',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => canManageSequences && (e.currentTarget.style.backgroundColor = theme.colors.background.hover)}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      onClick={() => canManageSequences && navigate(`/sequences/${sequence.sequence_key}`)}
                    >
                      <td style={{ padding: theme.spacing.md }}>
                        <div style={{ fontSize: theme.fontSize.base, fontWeight: theme.fontWeight.medium, color: theme.colors.accent.primary }}>
                          {sequence.display_name}
                        </div>
                        {sequence.description && (
                          <div style={{ fontSize: theme.fontSize.sm, color: theme.colors.text.secondary, marginTop: '2px' }}>
                            {sequence.description}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: theme.spacing.md }}>
                        <code style={{
                          fontSize: theme.fontSize.sm,
                          color: theme.colors.text.tertiary,
                          backgroundColor: theme.colors.background.tertiary,
                          padding: '2px 6px',
                          borderRadius: theme.radius.sm,
                          fontFamily: 'monospace'
                        }}>
                          {sequence.sequence_key}
                        </code>
                      </td>
                      <td style={{ padding: theme.spacing.md }}>
                        {sequence.category ? (
                          <Badge variant={getCategoryColor(sequence.category)} size="sm">
                            {sequence.category}
                          </Badge>
                        ) : (
                          <span style={{ color: theme.colors.text.tertiary, fontSize: theme.fontSize.sm }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: theme.spacing.md, textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '32px',
                          height: '32px',
                          backgroundColor: theme.colors.background.tertiary,
                          borderRadius: theme.radius.full,
                          fontSize: theme.fontSize.sm,
                          fontWeight: theme.fontWeight.semibold,
                          color: theme.colors.text.primary
                        }}>
                          {sequence.total_steps || 0}
                        </span>
                      </td>
                      {canManageSequences && (
                        <td style={{ padding: theme.spacing.md, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => toggleSequenceActive(sequence.sequence_key, sequence.is_active)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: theme.spacing.xs,
                              padding: theme.spacing.xs,
                              color: sequence.is_active ? theme.colors.accent.success : theme.colors.text.tertiary,
                              transition: 'color 0.2s',
                            }}
                            title={sequence.is_active ? 'Active - Click to disable' : 'Inactive - Click to enable'}
                          >
                            {sequence.is_active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                          </button>
                        </td>
                      )}
                      {canManageSequences && (
                        <td style={{ padding: theme.spacing.md, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: theme.spacing.sm, justifyContent: 'center' }}>
                            <button
                              onClick={() => navigate(`/sequences/${sequence.sequence_key}`)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: theme.spacing.xs,
                                color: theme.colors.accent.primary,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: theme.radius.sm,
                                transition: 'background-color 0.2s',
                              }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = theme.colors.background.tertiary}
                              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                              title="Edit sequence"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(sequence)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: theme.spacing.xs,
                                color: theme.colors.accent.danger,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: theme.radius.sm,
                                transition: 'background-color 0.2s',
                              }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = theme.colors.background.tertiary}
                              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                              title="Delete sequence"
                            >
                              <Trash2 size={18} />
                            </button>
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
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
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
          }}
          onClick={() => setDeleteModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: theme.colors.background.secondary,
              borderRadius: theme.radius.lg,
              padding: theme.spacing.xl,
              maxWidth: '500px',
              width: '90%',
              boxShadow: theme.shadows.xl,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{
              margin: `0 0 ${theme.spacing.md} 0`,
              fontSize: theme.fontSize['2xl'],
              fontWeight: theme.fontWeight.bold,
              color: theme.colors.text.primary
            }}>
              Delete Sequence
            </h2>
            <p style={{
              margin: `0 0 ${theme.spacing.lg} 0`,
              color: theme.colors.text.secondary,
              fontSize: theme.fontSize.base,
              lineHeight: 1.6
            }}>
              Are you sure you want to delete the sequence "<strong>{sequenceToDelete?.display_name}</strong>"?
              This action cannot be undone and will remove all steps associated with this sequence.
            </p>
            <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteModalOpen(false)}
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                  backgroundColor: theme.colors.background.tertiary,
                  color: theme.colors.text.primary,
                  border: 'none',
                  borderRadius: theme.radius.md,
                  fontSize: theme.fontSize.base,
                  fontWeight: theme.fontWeight.medium,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = theme.colors.background.hover}
                onMouseLeave={(e) => e.target.style.backgroundColor = theme.colors.background.tertiary}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                  backgroundColor: theme.colors.accent.danger,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: theme.radius.md,
                  fontSize: theme.fontSize.base,
                  fontWeight: theme.fontWeight.medium,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#b91c1c'}
                onMouseLeave={(e) => e.target.style.backgroundColor = theme.colors.accent.danger}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

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
  );
}

export default Sequences;
