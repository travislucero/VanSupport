import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors({ credentials: true, origin: process.env.NODE_ENV === "production" ? process.env.CLIENT_URL : "http://localhost:5173" }));
app.use(express.json());
app.use(cookieParser());
const port = process.env.PORT || 3000;

// JWT Secret (should be in .env file)
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// 1. Create the Supabase client using your environment variables
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// 2. Authentication middleware
const authenticateToken = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
};

// Role-based authorization middleware
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Check if user has any of the allowed roles
    const userRoles = req.user.roles || [];
    const userRoleNames = userRoles.map(role => role.name);

    const hasRequiredRole = allowedRoles.some(role =>
      userRoleNames.includes(role)
    );

    if (!hasRequiredRole) {
      return res.status(403).json({
        error: "Forbidden: Insufficient permissions",
        required: allowedRoles,
        current: userRoleNames
      });
    }

    next();
  };
};

// Permission-based authorization middleware
const requirePermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const userPermissions = req.user.permissions || [];

    if (!userPermissions.includes(requiredPermission)) {
      return res.status(403).json({
        error: "Forbidden: Missing required permission",
        required: requiredPermission,
        current: userPermissions
      });
    }

    next();
  };
};

// 3. Authentication endpoints
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // Query the users table
    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .limit(1);

    if (error) {
      console.error("Database error:", error);
      return res.status(500).json({ error: "Database error" });
    }

    if (!users || users.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Fetch user roles and permissions using the view
    const { data: userRoles, error: rolesError } = await supabase
      .from("user_roles_view")
      .select("role_name, role_description, permissions")
      .eq("user_id", user.id);

    if (rolesError) {
      console.error("Error fetching user roles:", rolesError);
      return res.status(500).json({ error: "Error fetching user roles" });
    }

    // Aggregate all permissions from all roles
    const allPermissions = new Set();
    const roles = [];

    if (userRoles && userRoles.length > 0) {
      userRoles.forEach(roleInfo => {
        if (roleInfo.role_name) {
          roles.push({
            name: roleInfo.role_name,
            description: roleInfo.role_description
          });

          // Add permissions from this role
          if (roleInfo.permissions && Array.isArray(roleInfo.permissions)) {
            roleInfo.permissions.forEach(perm => allPermissions.add(perm));
          }
        }
      });
    }

    const permissions = Array.from(allPermissions);

    // Update last_login
    await supabase
      .from("users")
      .update({ last_login: new Date().toISOString() })
      .eq("id", user.id);

    // Create JWT token with roles and permissions
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        roles: roles,
        permissions: permissions
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        roles: roles,
        permissions: permissions,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ success: true });
});

app.get("/api/auth/me", authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Admin user management endpoints
// Get all users with their roles
app.get("/api/admin/users", authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from("user_roles_view")
      .select("user_id, email, last_login, role_name, role_description");

    if (error) {
      console.error("Error fetching users:", error);
      return res.status(500).json({ error: error.message });
    }

    // Group roles by user
    const userMap = {};
    users.forEach(row => {
      if (!userMap[row.user_id]) {
        userMap[row.user_id] = {
          id: row.user_id,
          email: row.email,
          last_login: row.last_login,
          roles: []
        };
      }
      if (row.role_name) {
        userMap[row.user_id].roles.push({
          name: row.role_name,
          description: row.role_description
        });
      }
    });

    const userList = Object.values(userMap);
    res.json(userList);
  } catch (err) {
    console.error("Error in /api/admin/users:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create new user
app.post("/api/admin/users", authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { email, password, roles } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const { data: user, error: userError } = await supabase
      .from("users")
      .insert({ email, password_hash })
      .select()
      .single();

    if (userError) {
      console.error("Error creating user:", userError);
      return res.status(500).json({ error: userError.message });
    }

    // Assign roles
    if (roles && roles.length > 0) {
      for (const roleName of roles) {
        const { data: role } = await supabase
          .from("roles")
          .select("id")
          .eq("name", roleName)
          .single();

        if (role) {
          await supabase
            .from("user_roles")
            .insert({ user_id: user.id, role_id: role.id });
        }
      }
    }

    res.json({ success: true, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update user roles
app.put("/api/admin/users/:userId/roles", authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    const { roles } = req.body;

    // Delete existing roles
    await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    // Add new roles
    if (roles && roles.length > 0) {
      for (const roleName of roles) {
        const { data: role } = await supabase
          .from("roles")
          .select("id")
          .eq("name", roleName)
          .single();

        if (role) {
          await supabase
            .from("user_roles")
            .insert({ user_id: userId, role_id: role.id });
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error updating user roles:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Reset user password
app.put("/api/admin/users/:userId/password", authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { error } = await supabase
      .from("users")
      .update({ password_hash })
      .eq("id", userId);

    if (error) {
      console.error("Error resetting password:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error resetting password:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete user
app.delete("/api/admin/users/:userId", authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if trying to delete self
    if (userId === req.user.id) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    // Delete user (cascade will delete user_roles)
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", userId);

    if (error) {
      console.error("Error deleting user:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get available roles
app.get("/api/admin/roles", authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { data: roles, error } = await supabase
      .from("roles")
      .select("id, name, description")
      .order("name");

    if (error) {
      console.error("Error fetching roles:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json(roles);
  } catch (err) {
    console.error("Error fetching roles:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 4. Serve static files from dashboard/dist
app.use(express.static(path.join(__dirname, "dashboard", "dist")));

// 5. Protected API routes examples
// Use authenticateToken for any authenticated user
// Use requireRole(['admin', 'manager']) for role-based access
// Use requirePermission('view_analytics') for permission-based access

// Example: Protect route for admins only
// app.get("/api/admin/users", authenticateToken, requireRole(['admin']), async (req, res) => {
//   // Only admins can access this
// });

// Example: Protect route for admins and managers
// app.get("/api/reports", authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
//   // Admins and managers can access this
// });

// Example: Protect route by permission
// app.get("/api/export", authenticateToken, requirePermission('export_data'), async (req, res) => {
//   // Anyone with export_data permission can access this
// });

// 6. API routes (must come before catch-all route)
app.get("/test-supabase", async (req, res) => {
  // Try to pull just one row from session_events
  const { data, error } = await supabase
    .from("session_events")
    .select("*")
    .limit(1);

  if (error) {
    console.error("Supabase error:", error.message);
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

app.get("/api/session-events", async (req, res) => {
  const { data, error } = await supabase
    .from("session_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get("/api/resolution-by-step", authenticateToken, async (req, res) => {
  try {
    const { days, from, to } = req.query;

    let params = {};

    if (days) {
      params = {
        p_start_date: new Date(
          Date.now() - days * 24 * 60 * 60 * 1000
        ).toISOString(),
        p_end_date: new Date().toISOString(),
      };
    } else if (from && to) {
      params = { p_start_date: from, p_end_date: to };
    }

    const { data, error } = await supabase.rpc(
      "get_resolution_by_step",
      params
    );

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/dashboard-summary", authenticateToken, async (req, res) => {
  try {
    const { days, from, to } = req.query;

    let params = {};

    if (days) {
      params = {
        p_start_date: new Date(
          Date.now() - days * 24 * 60 * 60 * 1000
        ).toISOString(),
        p_end_date: new Date().toISOString(),
      };
    } else if (from && to) {
      params = { p_start_date: from, p_end_date: to };
    }

    const { data, error } = await supabase.rpc(
      "get_dashboard_summary",
      params
    );

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/issue-distribution", authenticateToken, async (req, res) => {
  try {
    const { days, from, to } = req.query;

    let params = {};

    if (days) {
      params = {
        p_start_date: new Date(
          Date.now() - days * 24 * 60 * 60 * 1000
        ).toISOString(),
        p_end_date: new Date().toISOString(),
      };
    } else if (from && to) {
      params = { p_start_date: from, p_end_date: to };
    }

    const { data, error } = await supabase.rpc(
      "get_issue_distribution",
      params
    );

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/resolution-time-trend", authenticateToken, async (req, res) => {
  try {
    const { days, from, to, interval = "day" } = req.query;

    let params = {};

    if (days) {
      params = {
        p_start_date: new Date(
          Date.now() - days * 24 * 60 * 60 * 1000
        ).toISOString(),
        p_end_date: new Date().toISOString(),
        p_interval: interval,
      };
    } else if (from && to) {
      params = {
        p_start_date: from,
        p_end_date: to,
        p_interval: interval,
      };
    }

    console.log("📉 Resolution Time Trend - Request params:", { days, from, to, interval });
    console.log("📉 Resolution Time Trend - Supabase params:", params);

    const { data, error } = await supabase.rpc(
      "get_resolution_time_trend",
      params
    );

    if (error) {
      console.error("📉 Resolution Time Trend - Supabase error:", error);
      throw error;
    }

    console.log("📉 Resolution Time Trend - Data returned:", data);
    console.log("📉 Resolution Time Trend - Row count:", data?.length || 0);

    res.json(data);
  } catch (err) {
    console.error("📉 Resolution Time Trend - Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/first-contact-resolution", authenticateToken, async (req, res) => {
  try {
    const { days, from, to } = req.query;

    let params = {};

    if (days) {
      params = {
        p_start_date: new Date(
          Date.now() - days * 24 * 60 * 60 * 1000
        ).toISOString(),
        p_end_date: new Date().toISOString(),
      };
    } else if (from && to) {
      params = {
        p_start_date: from,
        p_end_date: to,
      };
    }

    console.log("📊 First Contact Resolution - Request params:", { days, from, to });
    console.log("📊 First Contact Resolution - Supabase params:", params);

    const { data, error } = await supabase.rpc(
      "get_first_contact_resolution",
      params
    );

    if (error) {
      console.error("📊 First Contact Resolution - Supabase error:", error);
      throw error;
    }

    console.log("📊 First Contact Resolution - Data returned:", data);
    console.log("📊 First Contact Resolution - Row count:", data?.length || 0);

    res.json(data);
  } catch (err) {
    console.error("📊 First Contact Resolution - Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/van-performance", authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { days, from, to } = req.query;

    let params = {};

    if (days) {
      params = {
        p_start_date: new Date(
          Date.now() - days * 24 * 60 * 60 * 1000
        ).toISOString(),
        p_end_date: new Date().toISOString(),
      };
    } else if (from && to) {
      params = {
        p_start_date: from,
        p_end_date: to,
      };
    }

    console.log("🚐 Van Performance - Request params:", { days, from, to });
    console.log("🚐 Van Performance - Supabase params:", params);

    const { data, error } = await supabase.rpc(
      "get_van_performance",
      params
    );

    if (error) {
      console.error("🚐 Van Performance - Supabase error:", error);
      throw error;
    }

    console.log("🚐 Van Performance - Data returned:", data);
    console.log("🚐 Van Performance - Row count:", data?.length || 0);

    res.json(data);
  } catch (err) {
    console.error("🚐 Van Performance - Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/chronic-problem-vans", authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { days, from, to } = req.query;

    let params = {};

    if (days) {
      params = {
        p_start_date: new Date(
          Date.now() - days * 24 * 60 * 60 * 1000
        ).toISOString(),
        p_end_date: new Date().toISOString(),
      };
    } else if (from && to) {
      params = {
        p_start_date: from,
        p_end_date: to,
      };
    }

    console.log("⚠️ Chronic Problem Vans - Request params:", { days, from, to });
    console.log("⚠️ Chronic Problem Vans - Supabase params:", params);

    const { data, error } = await supabase.rpc(
      "get_chronic_problem_vans",
      params
    );

    if (error) {
      console.error("⚠️ Chronic Problem Vans - Supabase error:", error);
      throw error;
    }

    console.log("⚠️ Chronic Problem Vans - Data returned:", data);
    console.log("⚠️ Chronic Problem Vans - Row count:", data?.length || 0);

    res.json(data);
  } catch (err) {
    console.error("⚠️ Chronic Problem Vans - Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/handoff-patterns", authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    console.log("🔄 Handoff Patterns - Calling function without parameters (may not accept date filters)");

    // Try calling without parameters first - the function may not accept date filters
    const { data, error } = await supabase.rpc("get_handoff_patterns");

    if (error) {
      console.error("🔄 Handoff Patterns - Supabase error:", error);
      console.error("🔄 Handoff Patterns - Full error details:", JSON.stringify(error, null, 2));
      throw error;
    }

    console.log("🔄 Handoff Patterns - Data returned:", data);
    console.log("🔄 Handoff Patterns - Row count:", data?.length || 0);

    res.json(data);
  } catch (err) {
    console.error("🔄 Handoff Patterns - Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/call-volume-heatmap", authenticateToken, async (req, res) => {
  try {
    const { days, from, to } = req.query;

    let params = {};

    if (days) {
      params = {
        p_start_date: new Date(
          Date.now() - days * 24 * 60 * 60 * 1000
        ).toISOString(),
        p_end_date: new Date().toISOString(),
      };
    } else if (from && to) {
      params = {
        p_start_date: from,
        p_end_date: to,
      };
    }

    console.log("🔥 Call Volume Heatmap - Request params:", { days, from, to });
    console.log("🔥 Call Volume Heatmap - Supabase params:", params);

    const { data, error } = await supabase.rpc(
      "get_call_volume_heatmap",
      params
    );

    if (error) {
      console.error("🔥 Call Volume Heatmap - Supabase error:", error);
      throw error;
    }

    console.log("🔥 Call Volume Heatmap - Data returned:", data);
    console.log("🔥 Call Volume Heatmap - Row count:", data?.length || 0);

    res.json(data);
  } catch (err) {
    console.error("🔥 Call Volume Heatmap - Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Fallback middleware: serve index.html for non-API routes (Express 5 compatible)
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'dashboard', 'dist', 'index.html'));
  } else {
    next();
  }
});

// 4. Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
