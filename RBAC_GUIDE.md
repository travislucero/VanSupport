# Role-Based Access Control (RBAC) Guide

## Overview
The VanSupport Dashboard now includes a complete Role-Based Access Control (RBAC) system with roles, permissions, and both backend and frontend authorization.

## System Architecture

### Database Schema
- **`roles`** table: Defines available roles (admin, manager, viewer)
- **`user_roles`** table: Many-to-many junction table linking users to roles
- **`user_roles_view`**: Convenient view for querying user roles and permissions
- **Functions**: Helper functions for permission checking

### Roles & Permissions

#### Admin Role
- **Permissions**: Full system access
  - `view_dashboard`
  - `view_analytics`
  - `manage_users`
  - `manage_roles`
  - `view_reports`
  - `export_data`
  - `manage_settings`

#### Manager Role
- **Permissions**: View and export capabilities
  - `view_dashboard`
  - `view_analytics`
  - `view_reports`
  - `export_data`

#### Viewer Role
- **Permissions**: Read-only access
  - `view_dashboard`

## Setup Instructions

### 1. Database Setup

Run the SQL migration script:

```bash
# In Supabase SQL Editor, run:
setup_roles_system.sql
```

This will:
- Create `roles` and `user_roles` tables
- Insert default roles with permissions
- Create helper views and functions
- Set up indexes for performance

### 2. Assign Roles to Users

```sql
-- Assign admin role to a user
INSERT INTO user_roles (user_id, role_id)
SELECT
  u.id,
  r.id
FROM users u
CROSS JOIN roles r
WHERE u.email = 'admin@example.com'
  AND r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Assign manager role
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
CROSS JOIN roles r
WHERE u.email = 'manager@example.com' AND r.name = 'manager';

-- Assign viewer role
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
CROSS JOIN roles r
WHERE u.email = 'viewer@example.com' AND r.name = 'viewer';
```

### 3. User Can Have Multiple Roles

Users can have multiple roles, and permissions are aggregated:

```sql
-- Give user both manager and viewer roles
INSERT INTO user_roles (user_id, role_id)
VALUES
  ((SELECT id FROM users WHERE email = 'user@example.com'),
   (SELECT id FROM roles WHERE name = 'manager')),
  ((SELECT id FROM users WHERE email = 'user@example.com'),
   (SELECT id FROM roles WHERE name = 'viewer'));
```

## Backend Implementation

### Authentication Middleware

#### `authenticateToken`
Verifies JWT token and sets `req.user`:

```javascript
app.get("/api/protected", authenticateToken, (req, res) => {
  // req.user contains { id, email, roles, permissions }
  res.json({ user: req.user });
});
```

#### `requireRole(allowedRoles)`
Restricts access to users with specific roles:

```javascript
// Only admins can access
app.get("/api/admin/users",
  authenticateToken,
  requireRole(['admin']),
  async (req, res) => {
    // Handler code
  }
);

// Admins and managers can access
app.get("/api/reports",
  authenticateToken,
  requireRole(['admin', 'manager']),
  async (req, res) => {
    // Handler code
  }
);
```

#### `requirePermission(permission)`
Restricts access based on specific permissions:

```javascript
// Anyone with export_data permission
app.get("/api/export",
  authenticateToken,
  requirePermission('export_data'),
  async (req, res) => {
    // Handler code
  }
);

// Anyone with manage_users permission
app.post("/api/users",
  authenticateToken,
  requirePermission('manage_users'),
  async (req, res) => {
    // Handler code
  }
);
```

### JWT Token Structure

Tokens now include roles and permissions:

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "roles": [
    {
      "name": "admin",
      "description": "Full system access with all permissions"
    }
  ],
  "permissions": [
    "view_dashboard",
    "view_analytics",
    "manage_users",
    "manage_roles",
    "view_reports",
    "export_data",
    "manage_settings"
  ]
}
```

## Frontend Implementation

### useAuth Hook

The `useAuth` hook provides authentication and authorization utilities:

```javascript
import { useAuth } from './hooks/useAuth.jsx';

function MyComponent() {
  const {
    user,              // Current user object
    isAuthenticated,   // Boolean
    authLoading,       // Boolean
    login,             // Function(email, password)
    logout,            // Function()

    // Role checking
    getRoles,          // Get all role names
    hasRole,           // Check single role
    hasAnyRole,        // Check if user has any of the roles
    hasAllRoles,       // Check if user has all roles

    // Permission checking
    getPermissions,    // Get all permissions
    hasPermission,     // Check single permission
    hasAnyPermission,  // Check if user has any permission
    hasAllPermissions  // Check if user has all permissions
  } = useAuth();

  return <div>...</div>;
}
```

### Protected Content Components

Use these components to conditionally render content:

#### RequireRole

```javascript
import { RequireRole } from './components/ProtectedContent';

function Dashboard() {
  return (
    <div>
      <RequireRole roles={['admin']}>
        <AdminPanel />
      </RequireRole>

      <RequireRole
        roles={['admin', 'manager']}
        fallback={<div>You need manager access</div>}
      >
        <ReportsSection />
      </RequireRole>
    </div>
  );
}
```

#### RequirePermission

```javascript
import { RequirePermission } from './components/ProtectedContent';

function Toolbar() {
  return (
    <div>
      <RequirePermission permissions="export_data">
        <ExportButton />
      </RequirePermission>

      <RequirePermission
        permissions={['manage_users']}
        fallback={<span>No permission</span>}
      >
        <UserManagementButton />
      </RequirePermission>
    </div>
  );
}
```

#### RequireAllPermissions

```javascript
import { RequireAllPermissions } from './components/ProtectedContent';

function SettingsPage() {
  return (
    <RequireAllPermissions
      permissions={['manage_settings', 'manage_users']}
    >
      <AdvancedSettings />
    </RequireAllPermissions>
  );
}
```

### Using useAuth Directly

```javascript
function MyComponent() {
  const { hasRole, hasPermission } = useAuth();

  if (hasRole('admin')) {
    return <AdminView />;
  }

  if (hasPermission('export_data')) {
    return (
      <div>
        <DataView />
        <ExportButton />
      </div>
    );
  }

  return <ReadOnlyView />;
}
```

## User Information Display

The dashboard header now shows user email and assigned roles:

```
user@example.com
admin, manager
[Logout Button]
```

## Testing the RBAC System

### 1. Create Test Users

```sql
-- Create users with bcrypt hashed passwords
INSERT INTO users (email, password_hash) VALUES
  ('admin@test.com', '$2b$10$...'),
  ('manager@test.com', '$2b$10$...'),
  ('viewer@test.com', '$2b$10$...');

-- Assign roles
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email = 'admin@test.com' AND r.name = 'admin';

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email = 'manager@test.com' AND r.name = 'manager';

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email = 'viewer@test.com' AND r.name = 'viewer';
```

### 2. Test Login & Roles

1. Login as admin → Should see all roles and permissions
2. Login as manager → Should see manager role with limited permissions
3. Login as viewer → Should see viewer role with minimal permissions

### 3. Protect a Route

```javascript
// Backend: Protect analytics endpoints
app.get("/api/analytics",
  authenticateToken,
  requirePermission('view_analytics'),
  async (req, res) => {
    // Only users with view_analytics permission can access
    res.json({ data: "analytics data" });
  }
);
```

### 4. Test Frontend Authorization

```javascript
function Dashboard() {
  const { hasPermission } = useAuth();

  return (
    <div>
      <h1>Dashboard</h1>

      {hasPermission('view_analytics') && (
        <AnalyticsSection />
      )}

      {hasPermission('export_data') && (
        <ExportButton />
      )}
    </div>
  );
}
```

## Database Helper Functions

### get_user_permissions(user_id)
Returns all permissions for a user (aggregated from all roles):

```sql
SELECT get_user_permissions('user-uuid-here');
-- Returns: ["view_dashboard", "view_analytics", "export_data"]
```

### user_has_permission(user_id, permission)
Check if user has a specific permission:

```sql
SELECT user_has_permission('user-uuid-here', 'manage_users');
-- Returns: true or false
```

### get_user_roles(user_id)
Get all roles for a user:

```sql
SELECT * FROM get_user_roles('user-uuid-here');
-- Returns: role_name, role_description, permissions
```

## Adding New Permissions

To add new permissions to a role:

```sql
UPDATE roles
SET permissions = permissions || '["new_permission"]'::jsonb
WHERE name = 'admin';
```

To remove a permission:

```sql
UPDATE roles
SET permissions = permissions - 'permission_to_remove'
WHERE name = 'manager';
```

## Security Best Practices

1. **Always validate on backend**: Frontend checks are for UX only
2. **Use permission-based checks**: More flexible than role-based
3. **Principle of least privilege**: Give users minimum required permissions
4. **Audit trail**: Log permission changes and access attempts
5. **Token expiry**: JWT tokens expire after 24 hours
6. **Secure cookies**: HttpOnly, Secure (in production), SameSite

## Troubleshooting

### User has no roles after login
- Check `user_roles` table for user entries
- Verify role assignment query ran successfully
- Check JWT token payload includes roles

### Permission denied errors
- Verify user has the required permission in their role
- Check middleware order (authenticateToken before requireRole/requirePermission)
- Look for typos in permission names

### Roles not showing in UI
- Check browser console for errors
- Verify JWT token includes roles array
- Ensure useAuth hook is within AuthProvider

## Migration from Old System

If you had a simple `role` column in the users table:

```sql
-- Migrate existing roles to new system
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = u.role
WHERE u.role IS NOT NULL
ON CONFLICT DO NOTHING;

-- After migration is verified, you can drop the old column
-- ALTER TABLE users DROP COLUMN role;
```

## Next Steps

Consider implementing:
- [ ] Role management UI for admins
- [ ] Permission management UI
- [ ] Audit logging for permission checks
- [ ] Time-based role assignments (expire roles after certain date)
- [ ] Role hierarchies (admin inherits manager permissions)
- [ ] Custom permissions per user (override role permissions)
