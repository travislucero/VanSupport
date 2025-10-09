import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth.jsx";

function UserManagement() {
  const { hasRole, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const API_BASE = import.meta.env.DEV
    ? "http://localhost:3000"
    : "https://vansupport.onrender.com";

  // Redirect if not admin
  if (!hasRole('admin')) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#f1f5f9" }}>
        <h1>Access Denied</h1>
        <p>You do not have permission to access this page.</p>
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
      <div style={{ padding: "2rem", color: "#f1f5f9", backgroundColor: "#1e293b", minHeight: "100vh" }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", backgroundColor: "#1e293b", minHeight: "100vh", color: "#f1f5f9" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ margin: 0, marginBottom: "0.5rem" }}>User Management</h1>
          <p style={{ margin: 0, color: "#94a3b8" }}>Manage users and their roles</p>
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#2563eb",
              color: "#f1f5f9",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            + Create User
          </button>
          <a
            href="/"
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#475569",
              color: "#f1f5f9",
              border: "none",
              borderRadius: "4px",
              textDecoration: "none",
              fontWeight: "500",
              display: "inline-block",
            }}
          >
            Back to Dashboard
          </a>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div style={{
          padding: "1rem",
          marginBottom: "1rem",
          backgroundColor: "#166534",
          border: "1px solid #22c55e",
          borderRadius: "4px",
          color: "#bbf7d0",
        }}>
          {success}
        </div>
      )}

      {error && (
        <div style={{
          padding: "1rem",
          marginBottom: "1rem",
          backgroundColor: "#7f1d1d",
          border: "1px solid #ef4444",
          borderRadius: "4px",
          color: "#fecaca",
        }}>
          {error}
        </div>
      )}

      {/* Users Table */}
      <div style={{
        backgroundColor: "#334155",
        borderRadius: "8px",
        border: "1px solid #475569",
        overflow: "hidden",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#1e293b", borderBottom: "2px solid #475569" }}>
              <th style={{ padding: "1rem", textAlign: "left", fontWeight: "bold" }}>Email</th>
              <th style={{ padding: "1rem", textAlign: "left", fontWeight: "bold" }}>Roles</th>
              <th style={{ padding: "1rem", textAlign: "left", fontWeight: "bold" }}>Last Login</th>
              <th style={{ padding: "1rem", textAlign: "center", fontWeight: "bold" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, index) => (
              <tr
                key={user.id}
                style={{
                  backgroundColor: index % 2 === 0 ? "#334155" : "#1e293b",
                  borderBottom: "1px solid #475569",
                }}
              >
                <td style={{ padding: "1rem" }}>{user.email}</td>
                <td style={{ padding: "1rem" }}>
                  {user.roles.length > 0 ? (
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      {user.roles.map((role) => (
                        <span
                          key={role.name}
                          style={{
                            padding: "0.25rem 0.5rem",
                            backgroundColor: role.name === 'admin' ? '#ef4444' : role.name === 'manager' ? '#f59e0b' : '#3b82f6',
                            borderRadius: "4px",
                            fontSize: "0.75rem",
                            fontWeight: "bold",
                            textTransform: "uppercase",
                          }}
                        >
                          {role.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: "#94a3b8" }}>No roles</span>
                  )}
                </td>
                <td style={{ padding: "1rem", color: "#94a3b8" }}>
                  {user.last_login ? new Date(user.last_login).toLocaleString() : "Never"}
                </td>
                <td style={{ padding: "1rem", textAlign: "center" }}>
                  <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowEditModal(true);
                      }}
                      style={{
                        padding: "0.5rem 1rem",
                        backgroundColor: "#2563eb",
                        color: "#f1f5f9",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                      }}
                    >
                      Edit Roles
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowPasswordModal(true);
                      }}
                      style={{
                        padding: "0.5rem 1rem",
                        backgroundColor: "#f59e0b",
                        color: "#f1f5f9",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                      }}
                    >
                      Reset Password
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      style={{
                        padding: "0.5rem 1rem",
                        backgroundColor: "#ef4444",
                        color: "#f1f5f9",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: "#334155",
        padding: "2rem",
        borderRadius: "8px",
        border: "1px solid #475569",
        maxWidth: "500px",
        width: "100%",
      }}>
        <h2 style={{ marginTop: 0, color: "#f1f5f9" }}>Create New User</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", color: "#f1f5f9" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.75rem",
                backgroundColor: "#1e293b",
                color: "#f1f5f9",
                border: "1px solid #475569",
                borderRadius: "4px",
              }}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", color: "#f1f5f9" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              style={{
                width: "100%",
                padding: "0.75rem",
                backgroundColor: "#1e293b",
                color: "#f1f5f9",
                border: "1px solid #475569",
                borderRadius: "4px",
              }}
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", color: "#f1f5f9" }}>
              Roles
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {roles.map((role) => (
                <label key={role.name} style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#f1f5f9" }}>
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role.name)}
                    onChange={() => toggleRole(role.name)}
                  />
                  <span style={{ fontWeight: "500" }}>{role.name}</span>
                  <span style={{ color: "#94a3b8", fontSize: "0.875rem" }}>- {role.description}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#475569",
                color: "#f1f5f9",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#2563eb",
                color: "#f1f5f9",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
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
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: "#334155",
        padding: "2rem",
        borderRadius: "8px",
        border: "1px solid #475569",
        maxWidth: "500px",
        width: "100%",
      }}>
        <h2 style={{ marginTop: 0, color: "#f1f5f9" }}>Edit Roles: {user.email}</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", color: "#f1f5f9" }}>
              Roles
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {roles.map((role) => (
                <label key={role.name} style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#f1f5f9" }}>
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role.name)}
                    onChange={() => toggleRole(role.name)}
                  />
                  <span style={{ fontWeight: "500" }}>{role.name}</span>
                  <span style={{ color: "#94a3b8", fontSize: "0.875rem" }}>- {role.description}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#475569",
                color: "#f1f5f9",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#2563eb",
                color: "#f1f5f9",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
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
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: "#334155",
        padding: "2rem",
        borderRadius: "8px",
        border: "1px solid #475569",
        maxWidth: "500px",
        width: "100%",
      }}>
        <h2 style={{ marginTop: 0, color: "#f1f5f9" }}>Reset Password: {user.email}</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", color: "#f1f5f9" }}>
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
                width: "100%",
                padding: "0.75rem",
                backgroundColor: "#1e293b",
                color: "#f1f5f9",
                border: "1px solid #475569",
                borderRadius: "4px",
              }}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", color: "#f1f5f9" }}>
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
                width: "100%",
                padding: "0.75rem",
                backgroundColor: "#1e293b",
                color: "#f1f5f9",
                border: "1px solid #475569",
                borderRadius: "4px",
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: "0.75rem",
              marginBottom: "1rem",
              backgroundColor: "#7f1d1d",
              border: "1px solid #ef4444",
              borderRadius: "4px",
              color: "#fecaca",
              fontSize: "0.875rem",
            }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#475569",
                color: "#f1f5f9",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#f59e0b",
                color: "#f1f5f9",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
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
