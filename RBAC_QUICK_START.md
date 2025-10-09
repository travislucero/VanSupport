# RBAC Quick Start Guide

## 1. Run Database Setup

```bash
# In Supabase SQL Editor:
# Execute: setup_roles_system.sql
```

## 2. Assign Roles to Users

```sql
-- Make user an admin
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email = 'your-email@example.com' AND r.name = 'admin';
```

## 3. Backend: Protect Routes

```javascript
// Require specific role
app.get("/api/admin-only",
  authenticateToken,
  requireRole(['admin']),
  (req, res) => { /* ... */ }
);

// Require specific permission
app.get("/api/export",
  authenticateToken,
  requirePermission('export_data'),
  (req, res) => { /* ... */ }
);
```

## 4. Frontend: Use Auth Hook

```javascript
import { useAuth } from './hooks/useAuth.jsx';

function MyComponent() {
  const { user, hasRole, hasPermission } = useAuth();

  return (
    <div>
      {hasRole('admin') && <AdminButton />}
      {hasPermission('export_data') && <ExportButton />}
    </div>
  );
}
```

## 5. Frontend: Protected Components

```javascript
import { RequireRole, RequirePermission } from './components/ProtectedContent';

function Dashboard() {
  return (
    <div>
      <RequireRole roles={['admin', 'manager']}>
        <ReportsSection />
      </RequireRole>

      <RequirePermission permissions="export_data">
        <ExportButton />
      </RequirePermission>
    </div>
  );
}
```

## Available Roles

| Role    | Permissions                                                                 |
|---------|-----------------------------------------------------------------------------|
| admin   | view_dashboard, view_analytics, manage_users, manage_roles, view_reports, export_data, manage_settings |
| manager | view_dashboard, view_analytics, view_reports, export_data                  |
| viewer  | view_dashboard                                                              |

## Common Tasks

### Check what roles/permissions a user has:
```sql
SELECT * FROM user_roles_view WHERE email = 'user@example.com';
```

### Add a permission to a role:
```sql
UPDATE roles
SET permissions = permissions || '["new_permission"]'::jsonb
WHERE name = 'manager';
```

### Give user multiple roles:
```sql
INSERT INTO user_roles (user_id, role_id) VALUES
  ((SELECT id FROM users WHERE email = 'user@example.com'),
   (SELECT id FROM roles WHERE name = 'admin')),
  ((SELECT id FROM users WHERE email = 'user@example.com'),
   (SELECT id FROM roles WHERE name = 'manager'));
```

## Testing

1. Create test users with different roles
2. Login and check JWT token contains roles/permissions
3. Test protected routes return 403 when unauthorized
4. Test frontend components hide/show based on permissions

## Reference

- Full documentation: [RBAC_GUIDE.md](RBAC_GUIDE.md)
- Database setup: [setup_roles_system.sql](setup_roles_system.sql)
- Backend middleware: [server.js](server.js) (lines 29-92)
- Frontend hook: [dashboard/src/hooks/useAuth.jsx](dashboard/src/hooks/useAuth.jsx)
