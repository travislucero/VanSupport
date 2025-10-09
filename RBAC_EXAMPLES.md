# RBAC Implementation Examples

## Backend Examples

### Example 1: Admin-Only User Management Endpoint

```javascript
// Get all users (admin only)
app.get("/api/admin/users",
  authenticateToken,
  requireRole(['admin']),
  async (req, res) => {
    const { data, error } = await supabase
      .from("users")
      .select("id, email, created_at, last_login");

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  }
);

// Create new user (admin only)
app.post("/api/admin/users",
  authenticateToken,
  requireRole(['admin']),
  async (req, res) => {
    const { email, password, roles } = req.body;

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const { data: user, error } = await supabase
      .from("users")
      .insert({ email, password_hash })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Assign roles
    if (roles && roles.length > 0) {
      for (const roleName of roles) {
        await supabase.rpc('assign_role_to_user', {
          p_user_id: user.id,
          p_role_name: roleName
        });
      }
    }

    res.json({ success: true, user });
  }
);
```

### Example 2: Export Endpoint (Permission-Based)

```javascript
// Export data - requires export_data permission
app.get("/api/export/analytics",
  authenticateToken,
  requirePermission('export_data'),
  async (req, res) => {
    const { format = 'json' } = req.query;

    // Fetch analytics data
    const { data, error } = await supabase
      .from("session_events")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (format === 'csv') {
      // Convert to CSV
      const csv = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=analytics.csv');
      return res.send(csv);
    }

    res.json(data);
  }
);
```

### Example 3: Multi-Role Endpoint

```javascript
// Reports endpoint - admins and managers
app.get("/api/reports/summary",
  authenticateToken,
  requireRole(['admin', 'manager']),
  async (req, res) => {
    const { start_date, end_date } = req.query;

    const { data, error } = await supabase.rpc('get_dashboard_summary', {
      p_start_date: start_date,
      p_end_date: end_date
    });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Admins get extra details
    if (req.user.roles.some(r => r.name === 'admin')) {
      data.detailed_breakdown = await getDetailedBreakdown();
    }

    res.json(data);
  }
);
```

### Example 4: Conditional Response Based on Role

```javascript
app.get("/api/dashboard-data",
  authenticateToken,
  async (req, res) => {
    const userPermissions = req.user.permissions || [];

    const response = {
      basic_stats: await getBasicStats()
    };

    // Add analytics if user has permission
    if (userPermissions.includes('view_analytics')) {
      response.analytics = await getAnalytics();
    }

    // Add detailed reports if user has permission
    if (userPermissions.includes('view_reports')) {
      response.reports = await getReports();
    }

    // Add user management data for admins
    if (userPermissions.includes('manage_users')) {
      response.user_stats = await getUserStats();
    }

    res.json(response);
  }
);
```

## Frontend Examples

### Example 1: Conditional UI Rendering

```javascript
import { useAuth } from './hooks/useAuth.jsx';
import { RequireRole, RequirePermission } from './components/ProtectedContent';

function Dashboard() {
  const { user, hasRole, hasPermission } = useAuth();

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      <p>Welcome, {user?.email}</p>

      {/* Always visible to authenticated users */}
      <BasicStats />

      {/* Visible to users with view_analytics permission */}
      <RequirePermission permissions="view_analytics">
        <AnalyticsSection />
      </RequirePermission>

      {/* Visible only to admins */}
      <RequireRole roles={['admin']}>
        <AdminPanel />
      </RequireRole>

      {/* Visible to admins and managers */}
      <RequireRole roles={['admin', 'manager']}>
        <ReportsSection />
      </RequireRole>

      {/* Conditional button rendering */}
      {hasPermission('export_data') && (
        <button onClick={handleExport}>
          Export Data
        </button>
      )}
    </div>
  );
}
```

### Example 2: Navigation Menu with Role-Based Items

```javascript
import { useAuth } from './hooks/useAuth.jsx';

function NavigationMenu() {
  const { hasRole, hasPermission } = useAuth();

  const menuItems = [
    { label: 'Dashboard', path: '/', show: true },
    { label: 'Analytics', path: '/analytics', show: hasPermission('view_analytics') },
    { label: 'Reports', path: '/reports', show: hasPermission('view_reports') },
    { label: 'Export', path: '/export', show: hasPermission('export_data') },
    { label: 'Users', path: '/users', show: hasPermission('manage_users') },
    { label: 'Settings', path: '/settings', show: hasRole('admin') },
  ];

  return (
    <nav>
      <ul>
        {menuItems
          .filter(item => item.show)
          .map(item => (
            <li key={item.path}>
              <a href={item.path}>{item.label}</a>
            </li>
          ))}
      </ul>
    </nav>
  );
}
```

### Example 3: Role-Specific Dashboard Views

```javascript
import { useAuth } from './hooks/useAuth.jsx';

function DashboardContent() {
  const { hasRole } = useAuth();

  if (hasRole('admin')) {
    return <AdminDashboard />;
  }

  if (hasRole('manager')) {
    return <ManagerDashboard />;
  }

  if (hasRole('viewer')) {
    return <ViewerDashboard />;
  }

  return <div>No role assigned</div>;
}

function AdminDashboard() {
  return (
    <div>
      <h2>Admin Dashboard</h2>
      <UserManagement />
      <SystemSettings />
      <FullAnalytics />
      <DataExport />
    </div>
  );
}

function ManagerDashboard() {
  return (
    <div>
      <h2>Manager Dashboard</h2>
      <Analytics />
      <Reports />
      <DataExport />
    </div>
  );
}

function ViewerDashboard() {
  return (
    <div>
      <h2>Dashboard</h2>
      <BasicStats />
      <ReadOnlyCharts />
    </div>
  );
}
```

### Example 4: Permission-Based Form Fields

```javascript
import { useAuth } from './hooks/useAuth.jsx';

function UserForm({ user, onSubmit }) {
  const { hasPermission } = useAuth();
  const [formData, setFormData] = useState(user);

  return (
    <form onSubmit={onSubmit}>
      <input
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({...formData, email: e.target.value})}
      />

      {/* Only users with manage_roles permission can edit roles */}
      {hasPermission('manage_roles') && (
        <div>
          <label>Roles:</label>
          <RoleSelector
            value={formData.roles}
            onChange={(roles) => setFormData({...formData, roles})}
          />
        </div>
      )}

      {/* Only admins can deactivate users */}
      {hasPermission('manage_users') && (
        <div>
          <label>
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) => setFormData({...formData, active: e.target.checked})}
            />
            Active
          </label>
        </div>
      )}

      <button type="submit">Save</button>
    </form>
  );
}
```

### Example 5: Protected Actions with Fallback

```javascript
import { RequirePermission } from './components/ProtectedContent';

function DataTable({ data }) {
  return (
    <div>
      <table>
        {/* table content */}
      </table>

      <div className="actions">
        <RequirePermission
          permissions="export_data"
          fallback={
            <span className="disabled-text">
              Export requires manager or admin role
            </span>
          }
        >
          <button onClick={handleExport}>
            Export to CSV
          </button>
        </RequirePermission>

        <RequirePermission
          permissions="manage_users"
          fallback={null}
        >
          <button onClick={handleDelete}>
            Delete Selected
          </button>
        </RequirePermission>
      </div>
    </div>
  );
}
```

### Example 6: Dynamic API Calls Based on Permissions

```javascript
import { useAuth } from './hooks/useAuth.jsx';
import { useEffect, useState } from 'react';

function AnalyticsPage() {
  const { hasPermission, user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      // Build query params based on permissions
      const params = new URLSearchParams();

      if (hasPermission('view_analytics')) {
        params.append('include_analytics', 'true');
      }

      if (hasPermission('view_reports')) {
        params.append('include_reports', 'true');
      }

      if (hasPermission('manage_users')) {
        params.append('include_user_stats', 'true');
      }

      const response = await fetch(
        `/api/dashboard-data?${params.toString()}`,
        { credentials: 'include' }
      );

      const result = await response.json();
      setData(result);
    };

    fetchData();
  }, [user, hasPermission]);

  if (!data) return <div>Loading...</div>;

  return (
    <div>
      {/* Always show basic stats */}
      <BasicStatsCard data={data.basic_stats} />

      {/* Conditionally show based on what was fetched */}
      {data.analytics && <AnalyticsCard data={data.analytics} />}
      {data.reports && <ReportsCard data={data.reports} />}
      {data.user_stats && <UserStatsCard data={data.user_stats} />}
    </div>
  );
}
```

### Example 7: Role Badge Component

```javascript
import { useAuth } from './hooks/useAuth.jsx';

function RoleBadge() {
  const { user } = useAuth();

  if (!user?.roles || user.roles.length === 0) {
    return null;
  }

  const getRoleColor = (roleName) => {
    switch (roleName) {
      case 'admin':
        return '#ef4444'; // red
      case 'manager':
        return '#f59e0b'; // orange
      case 'viewer':
        return '#3b82f6'; // blue
      default:
        return '#6b7280'; // gray
    }
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      {user.roles.map(role => (
        <span
          key={role.name}
          style={{
            padding: '0.25rem 0.5rem',
            backgroundColor: getRoleColor(role.name),
            color: 'white',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            textTransform: 'uppercase',
          }}
        >
          {role.name}
        </span>
      ))}
    </div>
  );
}

// Usage in header
function AppHeader() {
  const { user, logout } = useAuth();

  return (
    <header>
      <h1>VanSupport</h1>
      <div>
        <span>{user?.email}</span>
        <RoleBadge />
        <button onClick={logout}>Logout</button>
      </div>
    </header>
  );
}
```

## Testing Examples

### Test Backend Authorization

```javascript
// test-rbac.js
import fetch from 'node-fetch';

async function testRBAC() {
  // Login as different users
  const adminToken = await login('admin@test.com', 'password');
  const managerToken = await login('manager@test.com', 'password');
  const viewerToken = await login('viewer@test.com', 'password');

  // Test admin-only endpoint
  console.log('Admin access:', await testEndpoint('/api/admin/users', adminToken)); // Should work
  console.log('Manager access:', await testEndpoint('/api/admin/users', managerToken)); // Should fail
  console.log('Viewer access:', await testEndpoint('/api/admin/users', viewerToken)); // Should fail

  // Test export endpoint
  console.log('Admin export:', await testEndpoint('/api/export/analytics', adminToken)); // Should work
  console.log('Manager export:', await testEndpoint('/api/export/analytics', managerToken)); // Should work
  console.log('Viewer export:', await testEndpoint('/api/export/analytics', viewerToken)); // Should fail
}

async function login(email, password) {
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const cookies = response.headers.get('set-cookie');
  return cookies;
}

async function testEndpoint(path, token) {
  const response = await fetch(`http://localhost:3000${path}`, {
    headers: { Cookie: token },
  });

  return {
    status: response.status,
    ok: response.ok,
  };
}

testRBAC();
```

This comprehensive set of examples demonstrates how to implement role-based access control throughout your application!
