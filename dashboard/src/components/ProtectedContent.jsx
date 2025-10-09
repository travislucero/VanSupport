import { useAuth } from "../hooks/useAuth";

// Render children only if user has required role(s)
export const RequireRole = ({ roles, children, fallback = null }) => {
  const { hasAnyRole } = useAuth();

  if (!hasAnyRole(roles)) {
    return fallback;
  }

  return children;
};

// Render children only if user has required permission(s)
export const RequirePermission = ({ permissions, children, fallback = null }) => {
  const { hasAnyPermission } = useAuth();

  const permissionList = Array.isArray(permissions) ? permissions : [permissions];

  if (!hasAnyPermission(permissionList)) {
    return fallback;
  }

  return children;
};

// Render children only if user has ALL required permissions
export const RequireAllPermissions = ({ permissions, children, fallback = null }) => {
  const { hasAllPermissions } = useAuth();

  if (!hasAllPermissions(permissions)) {
    return fallback;
  }

  return children;
};

// Show different content based on role
export const RoleSwitch = ({ roles, children }) => {
  const { hasRole } = useAuth();

  for (const role of roles) {
    if (hasRole(role.name)) {
      return role.render ? role.render() : children;
    }
  }

  return null;
};
