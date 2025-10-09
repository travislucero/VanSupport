import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const API_BASE = import.meta.env.DEV
    ? "http://localhost:3000"
    : "https://vansupport.onrender.com";

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/auth/me`, {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      setUser(data.user);
      setIsAuthenticated(true);
      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout error:", err);
    }
    setUser(null);
    setIsAuthenticated(false);
  };

  // Get all role names
  const getRoles = () => {
    if (!user || !user.roles) return [];
    return user.roles.map(role => role.name);
  };

  // Check if user has a specific role
  const hasRole = (roleName) => {
    if (!user || !user.roles) return false;
    return user.roles.some(role => role.name === roleName);
  };

  // Check if user has any of the specified roles
  const hasAnyRole = (roleNames) => {
    if (!user || !user.roles) return false;
    const userRoleNames = user.roles.map(role => role.name);
    return roleNames.some(roleName => userRoleNames.includes(roleName));
  };

  // Check if user has all of the specified roles
  const hasAllRoles = (roleNames) => {
    if (!user || !user.roles) return false;
    const userRoleNames = user.roles.map(role => role.name);
    return roleNames.every(roleName => userRoleNames.includes(roleName));
  };

  // Get all permissions
  const getPermissions = () => {
    if (!user || !user.permissions) return [];
    return user.permissions;
  };

  // Check if user has a specific permission
  const hasPermission = (permission) => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  };

  // Check if user has any of the specified permissions
  const hasAnyPermission = (permissions) => {
    if (!user || !user.permissions) return false;
    return permissions.some(permission => user.permissions.includes(permission));
  };

  // Check if user has all of the specified permissions
  const hasAllPermissions = (permissions) => {
    if (!user || !user.permissions) return false;
    return permissions.every(permission => user.permissions.includes(permission));
  };

  const value = {
    user,
    isAuthenticated,
    authLoading,
    login,
    logout,
    getRoles,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    getPermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
