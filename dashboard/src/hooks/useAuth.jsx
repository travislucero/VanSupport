import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    const controller = new AbortController();

    const checkAuth = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/auth/me`, {
          credentials: "include",
          signal: controller.signal,
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
        if (err.name === "AbortError") return;
        console.error("Auth check failed:", err);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        if (!controller.signal.aborted) {
          setAuthLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      controller.abort();
    };
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        let errorMessage = "Login failed";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Response body was not valid JSON (e.g. 502 HTML or 500 plaintext)
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setUser(data.user);
      setIsAuthenticated(true);
      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  const logout = useCallback(async () => {
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
  }, []);

  // Get all role names
  const getRoles = useCallback(() => {
    if (!user || !user.roles) return [];
    return user.roles.map(role => role.name);
  }, [user]);

  // Check if user has a specific role
  const hasRole = useCallback((roleName) => {
    if (!user || !user.roles) return false;
    return user.roles.some(role => role.name === roleName);
  }, [user]);

  // Check if user has any of the specified roles
  const hasAnyRole = useCallback((roleNames) => {
    if (!user || !user.roles) return false;
    const userRoleNames = user.roles.map(role => role.name);
    return roleNames.some(roleName => userRoleNames.includes(roleName));
  }, [user]);

  // Check if user has all of the specified roles
  const hasAllRoles = useCallback((roleNames) => {
    if (!user || !user.roles) return false;
    const userRoleNames = user.roles.map(role => role.name);
    return roleNames.every(roleName => userRoleNames.includes(roleName));
  }, [user]);

  // Get all permissions
  const getPermissions = useCallback(() => {
    if (!user || !user.permissions) return [];
    return user.permissions;
  }, [user]);

  // Check if user has a specific permission
  const hasPermission = useCallback((permission) => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  }, [user]);

  // Check if user has any of the specified permissions
  const hasAnyPermission = useCallback((permissions) => {
    if (!user || !user.permissions) return false;
    return permissions.some(permission => user.permissions.includes(permission));
  }, [user]);

  // Check if user has all of the specified permissions
  const hasAllPermissions = useCallback((permissions) => {
    if (!user || !user.permissions) return false;
    return permissions.every(permission => user.permissions.includes(permission));
  }, [user]);

  // Check if user is a site admin (has full unrestricted access)
  const isSiteAdmin = useCallback(() => {
    if (!user || !user.roles) return false;
    return user.roles.some(role => role.name === 'site_admin');
  }, [user]);

  const value = useMemo(() => ({
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
    isSiteAdmin,
  }), [
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
    isSiteAdmin,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
