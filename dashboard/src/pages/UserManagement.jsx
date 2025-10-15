import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth.jsx";
import Sidebar from "../components/Sidebar";
import Card from "../components/Card";
import Badge from "../components/Badge";
import { theme } from "../styles/theme";
import { Users, UserPlus, Edit, Key, Trash2 } from "lucide-react";

function UserManagement() {
  const { user, hasRole, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

  // Redirect if not admin
  if (!hasRole('admin')) {
    return (
      <div style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: theme.colors.background.primary
      }}>
        <Sidebar user={user} onLogout={logout} hasRole={hasRole} />
        <div style={{ marginLeft: '260px', flex: 1, padding: theme.spacing['2xl'] }}>
          <Card>
            <div style={{ textAlign: 'center', padding: theme.spacing['2xl'] }}>
              <h1 style={{ color: theme.colors.text.primary }}>Access Denied</h1>
              <p style={{ color: theme.colors.text.secondary }}>
                You do not have permission to access this page.
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/users`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/roles`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch roles");
      }

      const data = await response.json();
      setRoles(data);
    } catch (err) {
      console.error("Error fetching roles:", err);
    }
  };

  const handleCreateUser = async (userData) => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create user");
      }

      setSuccess("User created successfully!");
      setShowCreateModal(false);
      fetchUsers();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(""), 5000);
    }
  };

  const handleUpdateRoles = async (userId, newRoles) => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/users/${userId}/roles`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ roles: newRoles }),
      });

      if (!response.ok) {
        throw new Error("Failed to update roles");
      }

      setSuccess("Roles updated successfully!");
      setShowEditModal(false);
      fetchUsers();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(""), 5000);
    }
  };

  const handleResetPassword = async (userId, newPassword) => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/users/${userId}/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ password: newPassword }),
      });

      if (!response.ok) {
        throw new Error("Failed to reset password");
      }

      setSuccess("Password reset successfully!");
      setShowPasswordModal(false);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(""), 5000);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete user");
      }

      setSuccess("User deleted successfully!");
      fetchUsers();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(""), 5000);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: theme.colors.background.primary
      }}>
        <Sidebar user={user} onLogout={logout} hasRole={hasRole} />
        <div style={{
          marginLeft: '260px',
          flex: 1,
          padding: theme.spacing['2xl'],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <p style={{ color: theme.colors.text.primary, fontSize: theme.fontSize['2xl'] }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: theme.colors.background.primary
    }}>
      <Sidebar user={user} onLogout={logout} hasRole={hasRole} />

      <div style={{ marginLeft: '260px', flex: 1, padding: theme.spacing['2xl'] }}>
        {/* Header */}
        <div style={{ marginBottom: theme.spacing['2xl'] }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.md,
            marginBottom: theme.spacing.xs
          }}>
            <Users size={32} color={theme.colors.accent.primary} strokeWidth={2} />
            <h1
              style={{
                fontSize: theme.fontSize['4xl'],
                fontWeight: theme.fontWeight.bold,
                color: theme.colors.text.primary,
                margin: 0,
              }}
            >
              User Management
            </h1>
          </div>
          <p style={{
            color: theme.colors.text.secondary,
            fontSize: theme.fontSize.base,
            margin: 0,
            marginBottom: theme.spacing.lg,
          }}>
            Manage users and their role assignments
          </p>

          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: theme.spacing.sm,
              padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
              backgroundColor: theme.colors.accent.primary,
              color: '#ffffff',
              border: 'none',
              borderRadius: theme.radius.md,
              cursor: 'pointer',
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.semibold,
              transition: 'all 0.2s',
              boxShadow: theme.shadows.sm,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.accent.primaryHover;
              e.currentTarget.style.boxShadow = theme.shadows.md;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.accent.primary;
              e.currentTarget.style.boxShadow = theme.shadows.sm;
            }}
          >
            <UserPlus size={16} />
            Create User
          </button>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div style={{
            padding: theme.spacing.md,
            marginBottom: theme.spacing.lg,
            backgroundColor: `${theme.colors.accent.success}15`,
            border: `1px solid ${theme.colors.accent.success}`,
            borderRadius: theme.radius.md,
            color: theme.colors.accent.success,
            fontSize: theme.fontSize.sm,
            fontWeight: theme.fontWeight.medium,
          }}>
            ✓ {success}
          </div>
        )}

        {error && (
          <div style={{
            padding: theme.spacing.md,
            marginBottom: theme.spacing.lg,
            backgroundColor: `${theme.colors.accent.danger}15`,
            border: `1px solid ${theme.colors.accent.danger}`,
            borderRadius: theme.radius.md,
            color: theme.colors.accent.danger,
            fontSize: theme.fontSize.sm,
            fontWeight: theme.fontWeight.medium,
          }}>
            ⚠ {error}
          </div>
        )}

        {/* Users Table */}
        <Card title="All Users" description={`${users.length} total users`} noPadding>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{
                  backgroundColor: theme.colors.background.tertiary,
                  borderBottom: `2px solid ${theme.colors.border.light}`
                }}>
                  <th style={{
                    padding: theme.spacing.md,
                    textAlign: 'left',
                    color: theme.colors.text.primary,
                    fontWeight: theme.fontWeight.semibold,
                    fontSize: theme.fontSize.sm,
                  }}>
                    Email
                  </th>
                  <th style={{
                    padding: theme.spacing.md,
                    textAlign: 'left',
                    color: theme.colors.text.primary,
                    fontWeight: theme.fontWeight.semibold,
                    fontSize: theme.fontSize.sm,
                  }}>
                    Roles
                  </th>
                  <th style={{
                    padding: theme.spacing.md,
                    textAlign: 'left',
                    color: theme.colors.text.primary,
                    fontWeight: theme.fontWeight.semibold,
                    fontSize: theme.fontSize.sm,
                  }}>
                    Last Login
                  </th>
                  <th style={{
                    padding: theme.spacing.md,
                    textAlign: 'center',
                    color: theme.colors.text.primary,
                    fontWeight: theme.fontWeight.semibold,
                    fontSize: theme.fontSize.sm,
                  }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr
                    key={user.id}
                    style={{
                      borderBottom: `1px solid ${theme.colors.border.light}`,
                    }}
                  >
                    <td style={{ padding: theme.spacing.md, color: theme.colors.text.primary }}>
                      {user.email}
                    </td>
                    <td style={{ padding: theme.spacing.md }}>
                      {user.roles.length > 0 ? (
                        <div style={{ display: 'flex', gap: theme.spacing.xs, flexWrap: 'wrap' }}>
                          {user.roles.map((role) => {
                            const variant = role.name === 'admin' ? 'danger' :
                                          role.name === 'manager' ? 'warning' :
                                          role.name === 'viewer' ? 'success' : 'default';
                            return (
                              <Badge key={role.name} variant={variant} size="sm">
                                {role.name}
                              </Badge>
                            );
                          })}
                        </div>
                      ) : (
                        <span style={{ color: theme.colors.text.tertiary, fontSize: theme.fontSize.sm }}>
                          No roles
                        </span>
                      )}
                    </td>
                    <td style={{
                      padding: theme.spacing.md,
                      color: theme.colors.text.secondary,
                      fontSize: theme.fontSize.sm,
                    }}>
                      {user.last_login ? new Date(user.last_login).toLocaleString() : "Never"}
                    </td>
                    <td style={{ padding: theme.spacing.md, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: theme.spacing.xs, justifyContent: 'center' }}>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowEditModal(true);
                          }}
                          style={{
                            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                            backgroundColor: theme.colors.accent.primary,
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: theme.radius.sm,
                            cursor: 'pointer',
                            fontSize: theme.fontSize.xs,
                            fontWeight: theme.fontWeight.medium,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = theme.colors.accent.primaryHover;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = theme.colors.accent.primary;
                          }}
                          title="Edit Roles"
                        >
                          <Edit size={14} />
                          Roles
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowPasswordModal(true);
                          }}
                          style={{
                            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                            backgroundColor: theme.colors.accent.warning,
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: theme.radius.sm,
                            cursor: 'pointer',
                            fontSize: theme.fontSize.xs,
                            fontWeight: theme.fontWeight.medium,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '0.9';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '1';
                          }}
                          title="Reset Password"
                        >
                          <Key size={14} />
                          Password
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          style={{
                            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                            backgroundColor: theme.colors.accent.danger,
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: theme.radius.sm,
                            cursor: 'pointer',
                            fontSize: theme.fontSize.xs,
                            fontWeight: theme.fontWeight.medium,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '0.9';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '1';
                          }}
                          title="Delete User"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          roles={roles}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateUser}
        />
      )}

      {/* Edit Roles Modal */}
      {showEditModal && selectedUser && (
        <EditRolesModal
          user={selectedUser}
          roles={roles}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          onUpdate={handleUpdateRoles}
        />
      )}

      {/* Reset Password Modal */}
      {showPasswordModal && selectedUser && (
        <ResetPasswordModal
          user={selectedUser}
          onClose={() => {
            setShowPasswordModal(false);
            setSelectedUser(null);
          }}
          onReset={handleResetPassword}
        />
      )}
    </div>
  );
}

// Create User Modal Component
function CreateUserModal({ roles, onClose, onCreate }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRoles, setSelectedRoles] = useState([]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate({ email, password, roles: selectedRoles });
  };

  const toggleRole = (roleName) => {
    setSelectedRoles(prev =>
      prev.includes(roleName)
        ? prev.filter(r => r !== roleName)
        : [...prev, roleName]
    );
  };

  return (
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
        backgroundColor: theme.colors.background.secondary,
        padding: theme.spacing['2xl'],
        borderRadius: theme.radius.xl,
        border: `1px solid ${theme.colors.border.light}`,
        boxShadow: theme.shadows.xl,
        maxWidth: '500px',
        width: '100%',
        margin: theme.spacing.lg,
      }}>
        <h2 style={{
          marginTop: 0,
          marginBottom: theme.spacing.lg,
          color: theme.colors.text.primary,
          fontSize: theme.fontSize['2xl'],
          fontWeight: theme.fontWeight.bold,
        }}>
          Create New User
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: theme.spacing.lg }}>
            <label style={{
              display: 'block',
              marginBottom: theme.spacing.sm,
              color: theme.colors.text.primary,
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.medium,
            }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                backgroundColor: theme.colors.background.tertiary,
                color: theme.colors.text.primary,
                border: `1px solid ${theme.colors.border.medium}`,
                borderRadius: theme.radius.md,
                fontSize: theme.fontSize.base,
                outline: 'none',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = theme.colors.accent.primary;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = theme.colors.border.medium;
              }}
            />
          </div>

          <div style={{ marginBottom: theme.spacing.lg }}>
            <label style={{
              display: 'block',
              marginBottom: theme.spacing.sm,
              color: theme.colors.text.primary,
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.medium,
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              style={{
                width: '100%',
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                backgroundColor: theme.colors.background.tertiary,
                color: theme.colors.text.primary,
                border: `1px solid ${theme.colors.border.medium}`,
                borderRadius: theme.radius.md,
                fontSize: theme.fontSize.base,
                outline: 'none',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = theme.colors.accent.primary;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = theme.colors.border.medium;
              }}
            />
          </div>

          <div style={{ marginBottom: theme.spacing.xl }}>
            <label style={{
              display: 'block',
              marginBottom: theme.spacing.sm,
              color: theme.colors.text.primary,
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.medium,
            }}>
              Assign Roles
            </label>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.sm,
              padding: theme.spacing.md,
              backgroundColor: theme.colors.background.tertiary,
              borderRadius: theme.radius.md,
            }}>
              {roles.map((role) => (
                <label
                  key={role.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.sm,
                    color: theme.colors.text.primary,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role.name)}
                    onChange={() => toggleRole(role.name)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: theme.fontWeight.medium }}>{role.name}</span>
                  <span style={{
                    color: theme.colors.text.tertiary,
                    fontSize: theme.fontSize.sm
                  }}>
                    - {role.description}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                backgroundColor: 'transparent',
                color: theme.colors.text.secondary,
                border: `1px solid ${theme.colors.border.medium}`,
                borderRadius: theme.radius.md,
                cursor: 'pointer',
                fontSize: theme.fontSize.sm,
                fontWeight: theme.fontWeight.medium,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.background.tertiary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                backgroundColor: theme.colors.accent.primary,
                color: '#ffffff',
                border: 'none',
                borderRadius: theme.radius.md,
                cursor: 'pointer',
                fontSize: theme.fontSize.sm,
                fontWeight: theme.fontWeight.semibold,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.accent.primaryHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.accent.primary;
              }}
            >
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Roles Modal Component
function EditRolesModal({ user, roles, onClose, onUpdate }) {
  const [selectedRoles, setSelectedRoles] = useState(
    user.roles.map(r => r.name)
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate(user.id, selectedRoles);
  };

  const toggleRole = (roleName) => {
    setSelectedRoles(prev =>
      prev.includes(roleName)
        ? prev.filter(r => r !== roleName)
        : [...prev, roleName]
    );
  };

  return (
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
        backgroundColor: theme.colors.background.secondary,
        padding: theme.spacing['2xl'],
        borderRadius: theme.radius.xl,
        border: `1px solid ${theme.colors.border.light}`,
        boxShadow: theme.shadows.xl,
        maxWidth: '500px',
        width: '100%',
        margin: theme.spacing.lg,
      }}>
        <h2 style={{
          marginTop: 0,
          marginBottom: theme.spacing.xs,
          color: theme.colors.text.primary,
          fontSize: theme.fontSize['2xl'],
          fontWeight: theme.fontWeight.bold,
        }}>
          Edit User Roles
        </h2>
        <p style={{
          marginTop: 0,
          marginBottom: theme.spacing.lg,
          color: theme.colors.text.secondary,
          fontSize: theme.fontSize.sm,
        }}>
          {user.email}
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: theme.spacing.xl }}>
            <label style={{
              display: 'block',
              marginBottom: theme.spacing.sm,
              color: theme.colors.text.primary,
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.medium,
            }}>
              Assigned Roles
            </label>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.sm,
              padding: theme.spacing.md,
              backgroundColor: theme.colors.background.tertiary,
              borderRadius: theme.radius.md,
            }}>
              {roles.map((role) => (
                <label
                  key={role.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.sm,
                    color: theme.colors.text.primary,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role.name)}
                    onChange={() => toggleRole(role.name)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: theme.fontWeight.medium }}>{role.name}</span>
                  <span style={{
                    color: theme.colors.text.tertiary,
                    fontSize: theme.fontSize.sm
                  }}>
                    - {role.description}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                backgroundColor: 'transparent',
                color: theme.colors.text.secondary,
                border: `1px solid ${theme.colors.border.medium}`,
                borderRadius: theme.radius.md,
                cursor: 'pointer',
                fontSize: theme.fontSize.sm,
                fontWeight: theme.fontWeight.medium,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.background.tertiary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                backgroundColor: theme.colors.accent.primary,
                color: '#ffffff',
                border: 'none',
                borderRadius: theme.radius.md,
                cursor: 'pointer',
                fontSize: theme.fontSize.sm,
                fontWeight: theme.fontWeight.semibold,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.accent.primaryHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.accent.primary;
              }}
            >
              Update Roles
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Reset Password Modal Component
function ResetPasswordModal({ user, onClose, onReset }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    onReset(user.id, password);
  };

  return (
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
        backgroundColor: theme.colors.background.secondary,
        padding: theme.spacing['2xl'],
        borderRadius: theme.radius.xl,
        border: `1px solid ${theme.colors.border.light}`,
        boxShadow: theme.shadows.xl,
        maxWidth: '500px',
        width: '100%',
        margin: theme.spacing.lg,
      }}>
        <h2 style={{
          marginTop: 0,
          marginBottom: theme.spacing.xs,
          color: theme.colors.text.primary,
          fontSize: theme.fontSize['2xl'],
          fontWeight: theme.fontWeight.bold,
        }}>
          Reset Password
        </h2>
        <p style={{
          marginTop: 0,
          marginBottom: theme.spacing.lg,
          color: theme.colors.text.secondary,
          fontSize: theme.fontSize.sm,
        }}>
          {user.email}
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: theme.spacing.lg }}>
            <label style={{
              display: 'block',
              marginBottom: theme.spacing.sm,
              color: theme.colors.text.primary,
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.medium,
            }}>
              New Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              required
              minLength={8}
              style={{
                width: '100%',
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                backgroundColor: theme.colors.background.tertiary,
                color: theme.colors.text.primary,
                border: `1px solid ${theme.colors.border.medium}`,
                borderRadius: theme.radius.md,
                fontSize: theme.fontSize.base,
                outline: 'none',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = theme.colors.accent.primary;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = theme.colors.border.medium;
              }}
            />
          </div>

          <div style={{ marginBottom: theme.spacing.lg }}>
            <label style={{
              display: 'block',
              marginBottom: theme.spacing.sm,
              color: theme.colors.text.primary,
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.medium,
            }}>
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError("");
              }}
              required
              minLength={8}
              style={{
                width: '100%',
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                backgroundColor: theme.colors.background.tertiary,
                color: theme.colors.text.primary,
                border: `1px solid ${theme.colors.border.medium}`,
                borderRadius: theme.radius.md,
                fontSize: theme.fontSize.base,
                outline: 'none',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = theme.colors.accent.primary;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = theme.colors.border.medium;
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: theme.spacing.sm,
              marginBottom: theme.spacing.lg,
              backgroundColor: `${theme.colors.accent.danger}15`,
              border: `1px solid ${theme.colors.accent.danger}`,
              borderRadius: theme.radius.md,
              color: theme.colors.accent.danger,
              fontSize: theme.fontSize.sm,
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                backgroundColor: 'transparent',
                color: theme.colors.text.secondary,
                border: `1px solid ${theme.colors.border.medium}`,
                borderRadius: theme.radius.md,
                cursor: 'pointer',
                fontSize: theme.fontSize.sm,
                fontWeight: theme.fontWeight.medium,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.background.tertiary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                backgroundColor: theme.colors.accent.warning,
                color: '#ffffff',
                border: 'none',
                borderRadius: theme.radius.md,
                cursor: 'pointer',
                fontSize: theme.fontSize.sm,
                fontWeight: theme.fontWeight.semibold,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              Reset Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UserManagement;
