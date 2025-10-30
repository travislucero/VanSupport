import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import patternValidator from './utils/patternValidator.js';

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

// Sequence management endpoints (Manager+ access required)

// 1. GET /api/sequences - List all sequences
app.get("/api/sequences", authenticateToken, requireRole(['manager', 'admin']), async (req, res) => {
  try {
    console.log("📋 List Sequences - Fetching all sequences");

    const { data, error } = await supabase.rpc("fn_get_all_sequences", {
      p_include_inactive: true
    });

    if (error) {
      console.error("📋 List Sequences - Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log("📋 List Sequences - Success, returned", data?.length || 0, "sequences");
    res.json(data || []);
  } catch (err) {
    console.error("📋 List Sequences - Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 2. GET /api/sequences/:key - Get sequence details
app.get("/api/sequences/:key", authenticateToken, requireRole(['manager', 'admin']), async (req, res) => {
  try {
    const { key } = req.params;
    console.log("📖 Get Sequence Detail - Fetching sequence:", key);

    const { data, error } = await supabase.rpc("fn_get_sequence_detail", {
      p_sequence_key: key
    });

    if (error) {
      console.error("📖 Get Sequence Detail - Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    // Handle array response from Supabase - return first item
    const sequenceData = Array.isArray(data) ? data[0] : data;

    if (!sequenceData) {
      console.log("📖 Get Sequence Detail - Sequence not found:", key);
      return res.status(404).json({ error: "Sequence not found" });
    }

    // Map sequence_active to is_active if needed
    if (sequenceData.sequence_active !== undefined && sequenceData.is_active === undefined) {
      sequenceData.is_active = sequenceData.sequence_active;
    }

    console.log("📖 Get Sequence Detail - Success");
    res.json(sequenceData);
  } catch (err) {
    console.error("📖 Get Sequence Detail - Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 3. GET /api/sequences/:key/validate - Validate sequence
app.get("/api/sequences/:key/validate", authenticateToken, requireRole(['manager', 'admin']), async (req, res) => {
  try {
    const { key } = req.params;
    console.log("✅ Validate Sequence - Validating:", key);

    const { data, error } = await supabase.rpc("fn_validate_sequence", {
      p_sequence_key: key
    });

    if (error) {
      console.error("✅ Validate Sequence - Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log("✅ Validate Sequence - Validation result:", data);
    res.json(data);
  } catch (err) {
    console.error("✅ Validate Sequence - Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 4. POST /api/sequences - Create new sequence
app.post("/api/sequences", authenticateToken, requireRole(['manager', 'admin']), async (req, res) => {
  try {
    const { key, name, description, category, first_step } = req.body;

    if (!key || !name || !first_step) {
      return res.status(400).json({
        error: "Missing required fields: key, name, and first_step are required"
      });
    }

    if (!first_step.message) {
      return res.status(400).json({
        error: "first_step must include a message"
      });
    }

    console.log("➕ Create Sequence - Creating:", key);

    const { data, error } = await supabase.rpc("fn_create_sequence", {
      p_sequence_key: key,
      p_display_name: name,
      p_description: description || null,
      p_category: category || null,
      p_created_by: req.user.id,
      p_first_step_message: first_step.message,
      p_first_step_url: first_step.doc_url || null,
      p_first_step_title: first_step.doc_title || null
    });

    if (error) {
      console.error("➕ Create Sequence - Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log("➕ Create Sequence - Success");
    res.status(201).json(data);
  } catch (err) {
    console.error("➕ Create Sequence - Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 5. PUT /api/sequences/:key - Update sequence metadata
app.put("/api/sequences/:key", authenticateToken, requireRole(['manager', 'admin']), async (req, res) => {
  try {
    const { key } = req.params;
    const { name, description, category, is_active } = req.body;

    console.log("✏️ Update Sequence Metadata - Updating:", key);

    const { data, error } = await supabase.rpc("fn_update_sequence_metadata", {
      p_key: key,
      p_name: name || null,
      p_desc: description || null,
      p_category: category || null,
      p_is_active: is_active !== undefined ? is_active : null
    });

    if (error) {
      console.error("✏️ Update Sequence Metadata - Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log("✏️ Update Sequence Metadata - Success");
    res.json(data);
  } catch (err) {
    console.error("✏️ Update Sequence Metadata - Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 6. PUT /api/sequences/:key/toggle - Enable/disable sequence
app.put("/api/sequences/:key/toggle", authenticateToken, requireRole(['manager', 'admin']), async (req, res) => {
  try {
    const { key } = req.params;
    const { is_active } = req.body;

    if (is_active === undefined) {
      return res.status(400).json({ error: "is_active is required" });
    }

    console.log("🔄 Toggle Sequence - Setting", key, "to", is_active);

    const { data, error } = await supabase.rpc("fn_toggle_sequence", {
      p_sequence_key: key,
      p_is_active: is_active
    });

    if (error) {
      console.error("🔄 Toggle Sequence - Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log("🔄 Toggle Sequence - Success");
    res.json(data);
  } catch (err) {
    console.error("🔄 Toggle Sequence - Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 7. POST /api/sequences/:key/steps - Add new step
app.post("/api/sequences/:key/steps", authenticateToken, requireRole(['manager', 'admin']), async (req, res) => {
  try {
    const { key } = req.params;
    const { step_num, message, doc_url, doc_title, success_triggers, failure_triggers } = req.body;

    if (step_num === undefined || !message) {
      return res.status(400).json({
        error: "Missing required fields: step_num and message are required"
      });
    }

    console.log("➕ Add Sequence Step - Adding step", step_num, "to", key);

    const { data, error } = await supabase.rpc("fn_add_sequence_step", {
      p_sequence_key: key,
      p_step_num: step_num,
      p_message_template: message,
      p_doc_url: doc_url || null,
      p_doc_title: doc_title || null,
      p_success_triggers: success_triggers || [],
      p_failure_triggers: failure_triggers || []
    });

    if (error) {
      console.error("➕ Add Sequence Step - Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log("➕ Add Sequence Step - Success");
    res.status(201).json(data);
  } catch (err) {
    console.error("➕ Add Sequence Step - Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 8. PUT /api/sequences/:key/steps/:step_num - Update step
app.put("/api/sequences/:key/steps/:step_num", authenticateToken, requireRole(['manager', 'admin']), async (req, res) => {
  try {
    const { key, step_num } = req.params;
    const {
      message,
      doc_url,
      doc_title,
      success_triggers,
      failure_triggers,
      handoff_trigger,
      handoff_sequence_key,
      is_active
    } = req.body;

    console.log("✏️ Update Sequence Step - Updating step", step_num, "in", key);

    const { data, error } = await supabase.rpc("fn_update_sequence_step", {
      p_sequence_key: key,
      p_step_num: parseInt(step_num),
      p_message_template: message || null,
      p_doc_url: doc_url || null,
      p_doc_title: doc_title || null,
      p_success_triggers: success_triggers || null,
      p_failure_triggers: failure_triggers || null,
      p_handoff_trigger: handoff_trigger || null,
      p_handoff_sequence_key: handoff_sequence_key || null,
      p_is_active: is_active !== undefined ? is_active : null
    });

    if (error) {
      console.error("✏️ Update Sequence Step - Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log("✏️ Update Sequence Step - Success");
    res.json(data);
  } catch (err) {
    console.error("✏️ Update Sequence Step - Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 9. DELETE /api/sequences/:key/steps/:step_num - Delete step
app.delete("/api/sequences/:key/steps/:step_num", authenticateToken, requireRole(['manager', 'admin']), async (req, res) => {
  try {
    const { key, step_num } = req.params;

    console.log("🗑️ Delete Sequence Step - Deleting step", step_num, "from", key);

    const { error } = await supabase.rpc("fn_delete_sequence_step", {
      p_sequence_key: key,
      p_step_num: parseInt(step_num)
    });

    if (error) {
      console.error("🗑️ Delete Sequence Step - Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log("🗑️ Delete Sequence Step - Success");
    res.json({ success: true, message: "Step deleted successfully" });
  } catch (err) {
    console.error("🗑️ Delete Sequence Step - Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 10. DELETE /api/sequences/:key - Delete entire sequence
app.delete("/api/sequences/:key", authenticateToken, requireRole(['manager', 'admin']), async (req, res) => {
  try {
    const { key } = req.params;

    console.log("🗑️ Delete Sequence - Deleting sequence:", key);

    const { error } = await supabase.rpc("fn_delete_sequence", {
      p_sequence_key: key
    });

    if (error) {
      console.error("🗑️ Delete Sequence - Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log("🗑️ Delete Sequence - Success");
    res.json({ success: true, message: "Sequence deleted successfully" });
  } catch (err) {
    console.error("🗑️ Delete Sequence - Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Trigger Pattern Management endpoints (Manager+ access required)

// 1. GET /api/patterns - List all trigger patterns
app.get("/api/patterns", authenticateToken, requireRole(['manager', 'admin']), async (req, res) => {
  try {
    const { sequence_key } = req.query;

    console.log("🎯 List Patterns - Fetching patterns", sequence_key ? `for sequence: ${sequence_key}` : "(all)");

    let query = supabase
      .from('topic_patterns')
      .select('*')
      .order('priority', { ascending: true });

    // Filter by sequence if provided
    if (sequence_key) {
      query = query.eq('action_key', sequence_key);
    }

    const { data, error } = await query;

    if (error) {
      console.error("🎯 List Patterns - Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log("🎯 List Patterns - Success, returned", data?.length || 0, "patterns");
    res.json(data || []);
  } catch (err) {
    console.error("🎯 List Patterns - Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 2. GET /api/patterns/:id - Get single pattern
app.get("/api/patterns/:id", authenticateToken, requireRole(['manager', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;

    console.log("🎯 Get Pattern - Fetching pattern:", id);

    const { data, error } = await supabase
      .from('topic_patterns')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log("🎯 Get Pattern - Pattern not found:", id);
        return res.status(404).json({ error: "Pattern not found" });
      }
      console.error("🎯 Get Pattern - Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log("🎯 Get Pattern - Success");
    res.json(data);
  } catch (err) {
    console.error("🎯 Get Pattern - Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 3. POST /api/patterns - Create new pattern
app.post("/api/patterns", authenticateToken, requireRole(['manager', 'admin']), async (req, res) => {
  try {
    const {
      category_slug,
      pattern,
      flags,
      priority,
      action_type,
      action_key,
      entry_step_id,
      van_makes,
      years,
      van_versions
    } = req.body;

    if (!category_slug || !pattern || !action_type || !action_key) {
      return res.status(400).json({
        error: "Missing required fields: category_slug, pattern, action_type, and action_key are required"
      });
    }

    console.log("🎯 Create Pattern - Creating new pattern for category:", category_slug);

    // Validate and auto-fix pattern before saving to database
    let processedPattern = pattern;
    const validation = patternValidator.validatePattern(pattern);
    if (validation.hasDoubleEscaping) {
      console.log("🎯 Create Pattern - Auto-fixing double-escaped pattern");
      console.log("🎯 Create Pattern - Original:", pattern);
      processedPattern = patternValidator.fixDoubleEscaping(pattern);
      console.log("🎯 Create Pattern - Fixed:", processedPattern);
    }
    const preparedPattern = patternValidator.prepareForDatabase(processedPattern);

    const newPattern = {
      category_slug,
      pattern: preparedPattern,
      flags: flags || 'i',
      priority: priority !== undefined ? priority : 100,
      action_type,
      action_key,
      entry_step_id: entry_step_id || null,
      van_makes: van_makes || null,
      years: years || null,
      van_versions: van_versions || null,
      is_active: true
    };

    const { data, error } = await supabase
      .from('topic_patterns')
      .insert(newPattern)
      .select()
      .single();

    if (error) {
      console.error("🎯 Create Pattern - Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log("🎯 Create Pattern - Success, created pattern:", data.id);
    res.status(201).json(data);
  } catch (err) {
    console.error("🎯 Create Pattern - Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 4. PUT /api/patterns/:id - Update pattern
app.put("/api/patterns/:id", authenticateToken, requireRole(['manager', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      category_slug,
      pattern,
      flags,
      priority,
      action_type,
      action_key,
      entry_step_id,
      van_makes,
      years,
      van_versions,
      is_active
    } = req.body;

    console.log("🎯 Update Pattern - Updating pattern:", id);

    const updateData = {
      updated_at: new Date().toISOString()
    };

    // Validate and auto-fix pattern if it's being updated
    if (pattern !== undefined) {
      let processedPattern = pattern;
      const validation = patternValidator.validatePattern(pattern);
      if (validation.hasDoubleEscaping) {
        console.log("🎯 Update Pattern - Auto-fixing double-escaped pattern");
        console.log("🎯 Update Pattern - Original:", pattern);
        processedPattern = patternValidator.fixDoubleEscaping(pattern);
        console.log("🎯 Update Pattern - Fixed:", processedPattern);
      }
      const preparedPattern = patternValidator.prepareForDatabase(processedPattern);
      updateData.pattern = preparedPattern;
    }

    // Only include fields that are provided
    if (category_slug !== undefined) updateData.category_slug = category_slug;
    if (flags !== undefined) updateData.flags = flags;
    if (priority !== undefined) updateData.priority = priority;
    if (action_type !== undefined) updateData.action_type = action_type;
    if (action_key !== undefined) updateData.action_key = action_key;
    if (entry_step_id !== undefined) updateData.entry_step_id = entry_step_id;
    if (van_makes !== undefined) updateData.van_makes = van_makes;
    if (years !== undefined) updateData.years = years;
    if (van_versions !== undefined) updateData.van_versions = van_versions;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from('topic_patterns')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log("🎯 Update Pattern - Pattern not found:", id);
        return res.status(404).json({ error: "Pattern not found" });
      }
      console.error("🎯 Update Pattern - Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log("🎯 Update Pattern - Success");
    res.json(data);
  } catch (err) {
    console.error("🎯 Update Pattern - Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 5. PUT /api/patterns/:id/toggle - Toggle is_active
app.put("/api/patterns/:id/toggle", authenticateToken, requireRole(['manager', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (is_active === undefined) {
      return res.status(400).json({ error: "is_active is required" });
    }

    console.log("🎯 Toggle Pattern - Setting pattern", id, "to", is_active);

    const { data, error } = await supabase
      .from('topic_patterns')
      .update({
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log("🎯 Toggle Pattern - Pattern not found:", id);
        return res.status(404).json({ error: "Pattern not found" });
      }
      console.error("🎯 Toggle Pattern - Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log("🎯 Toggle Pattern - Success");
    res.json(data);
  } catch (err) {
    console.error("🎯 Toggle Pattern - Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 6. DELETE /api/patterns/:id - Delete pattern
app.delete("/api/patterns/:id", authenticateToken, requireRole(['manager', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;

    console.log("🎯 Delete Pattern - Deleting pattern:", id);

    const { error } = await supabase
      .from('topic_patterns')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("🎯 Delete Pattern - Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log("🎯 Delete Pattern - Success");
    res.json({ success: true, message: "Pattern deleted successfully" });
  } catch (err) {
    console.error("🎯 Delete Pattern - Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================================
// TICKETING SYSTEM API ENDPOINTS
// ============================================================================

// PUBLIC ENDPOINTS (No Auth Required)

// 1. GET /api/tickets/public/:uuid - Get ticket detail for customer view
app.get("/api/tickets/public/:uuid", async (req, res) => {
  try {
    const { uuid } = req.params;
    console.log('🎫 Get Public Ticket Detail - Fetching ticket:', uuid, 'for viewer: customer');

    const { data, error } = await supabase.rpc("fn_get_ticket_detail", {
      p_ticket_id: uuid,
      p_viewer_type: 'customer'
    });

    if (error) {
      console.error('🎫 Get Public Ticket Detail - Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Handle array response from Supabase - return first item
    const ticketData = Array.isArray(data) ? data[0] : data;

    if (!ticketData) {
      console.log('🎫 Get Public Ticket Detail - Ticket not found:', uuid);
      return res.status(404).json({ error: "Ticket not found" });
    }

    console.log('🎫 Get Public Ticket Detail - Success, ticket #', ticketData.ticket_number);
    res.json(ticketData);
  } catch (err) {
    console.error('🎫 Get Public Ticket Detail - Error:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 2. POST /api/tickets/public/:uuid/comments - Add customer comment
app.post("/api/tickets/public/:uuid/comments", async (req, res) => {
  try {
    const { uuid } = req.params;
    const { comment_text, author_name } = req.body;

    if (!comment_text || !author_name) {
      return res.status(400).json({
        error: "Missing required fields: comment_text and author_name are required"
      });
    }

    console.log('🎫 Add Customer Comment - Adding comment to ticket:', uuid);

    const { data, error } = await supabase.rpc("fn_add_ticket_comment", {
      p_ticket_id: uuid,
      p_comment_text: comment_text,
      p_author_type: 'customer',
      p_author_user_id: null,
      p_author_name: author_name,
      p_is_resolution: false
    });

    if (error) {
      console.error('🎫 Add Customer Comment - Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('🎫 Add Customer Comment - Success');
    res.status(201).json(data);
  } catch (err) {
    console.error('🎫 Add Customer Comment - Error:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 3. PUT /api/tickets/public/:uuid/resolve - Customer marks ticket resolved
app.put("/api/tickets/public/:uuid/resolve", async (req, res) => {
  try {
    const { uuid } = req.params;
    const { resolution } = req.body;

    if (!resolution) {
      return res.status(400).json({ error: "Resolution text is required" });
    }

    console.log('🎫 Customer Resolve Ticket - Resolving ticket:', uuid);

    // First add the resolution comment
    const { error: commentError } = await supabase.rpc("fn_add_ticket_comment", {
      p_ticket_id: uuid,
      p_comment_text: resolution,
      p_author_type: 'customer',
      p_author_user_id: null,
      p_author_name: 'Customer',
      p_is_resolution: true
    });

    if (commentError) {
      console.error('🎫 Customer Resolve Ticket - Error adding resolution:', commentError);
      return res.status(500).json({ error: commentError.message });
    }

    // Then update status to resolved
    const { data, error } = await supabase.rpc("fn_update_ticket_status", {
      p_ticket_id: uuid,
      p_new_status: 'resolved',
      p_changed_by_type: 'customer',
      p_changed_by_user_id: null,
      p_reason: 'Customer marked as resolved'
    });

    if (error) {
      console.error('🎫 Customer Resolve Ticket - Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('🎫 Customer Resolve Ticket - Success');
    res.json(data);
  } catch (err) {
    console.error('🎫 Customer Resolve Ticket - Error:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 4. POST /api/tickets/public/:uuid/reopen - Reopen closed ticket
app.post("/api/tickets/public/:uuid/reopen", async (req, res) => {
  try {
    const { uuid } = req.params;
    const { reason, reopened_by_name } = req.body;

    if (!reason || !reopened_by_name) {
      return res.status(400).json({
        error: "Missing required fields: reason and reopened_by_name are required"
      });
    }

    console.log('🎫 Reopen Ticket - Reopening ticket:', uuid);

    const { data, error } = await supabase.rpc("fn_reopen_ticket", {
      p_original_ticket_id: uuid,
      p_reason: reason,
      p_reopened_by_name: reopened_by_name
    });

    if (error) {
      console.error('🎫 Reopen Ticket - Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('🎫 Reopen Ticket - Success, new ticket created');
    res.status(201).json(data);
  } catch (err) {
    console.error('🎫 Reopen Ticket - Error:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 5. POST /api/tickets/create - Create new ticket (public or tech)
app.post("/api/tickets/create", async (req, res) => {
  try {
    const {
      phone,
      email,
      owner_name,
      subject,
      issue_summary,
      description,
      priority,
      urgency,
      van_id,
      category_id
    } = req.body;

    if (!subject || !description) {
      return res.status(400).json({
        error: "Missing required fields: subject and description are required"
      });
    }

    console.log('🎫 Create Ticket - Creating new ticket:', subject);

    // Create ticket - RPC returns just the UUID
    const { data: ticketId, error } = await supabase.rpc("fn_create_ticket", {
      p_phone: phone || null,
      p_email: email || null,
      p_owner_name: owner_name || null,
      p_subject: subject,
      p_issue_summary: issue_summary || subject, // Legacy field - fallback to subject if not provided
      p_description: description,
      p_priority: priority || 'normal',
      p_urgency: urgency || null,
      p_van_id: van_id || null,
      p_category_id: category_id || null
    });

    if (error) {
      console.error('🎫 Create Ticket - Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('🎫 Create Ticket - Ticket created with ID:', ticketId);

    // Fetch the full ticket details
    const { data: ticketDetails, error: fetchError } = await supabase
      .from('tickets')
      .select('id, ticket_number, subject, status, priority, urgency, created_at, owner_name, phone, email')
      .eq('id', ticketId)
      .single();

    if (fetchError) {
      console.error('🎫 Create Ticket - Error fetching ticket details:', fetchError);
      return res.status(500).json({ error: fetchError.message });
    }

    // Map id to ticket_id for frontend compatibility
    const ticketResponse = {
      ticket_id: ticketDetails.id,
      ticket_number: ticketDetails.ticket_number,
      subject: ticketDetails.subject,
      status: ticketDetails.status,
      priority: ticketDetails.priority,
      urgency: ticketDetails.urgency,
      created_at: ticketDetails.created_at,
      owner_name: ticketDetails.owner_name,
      phone: ticketDetails.phone,
      email: ticketDetails.email
    };

    console.log('🎫 Create Ticket - Success, ticket #', ticketResponse.ticket_number);

    // Return full ticket object with ticket_id
    res.status(201).json(ticketResponse);
  } catch (err) {
    console.error('🎫 Create Ticket - Error:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// TECH ENDPOINTS (Manager+ Auth Required)

// 6. GET /api/tickets/unassigned - Get unassigned ticket queue
app.get("/api/tickets/unassigned", authenticateToken, requireRole(['manager', 'admin']), async (req, res) => {
  try {
    console.log('🎫 Get Unassigned Tickets - Fetching unassigned queue');

    const { data, error } = await supabase.rpc("fn_get_tech_tickets", {
      p_tech_user_id: null
    });

    if (error) {
      console.error('🎫 Get Unassigned Tickets - Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Sort by priority (urgent first), then created_at
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    const sortedData = (data || []).sort((a, b) => {
      const priorityDiff = (priorityOrder[a.priority] || 999) - (priorityOrder[b.priority] || 999);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.created_at) - new Date(b.created_at);
    });

    console.log('🎫 Get Unassigned Tickets - Success, returned', sortedData.length, 'tickets');
    res.json(sortedData);
  } catch (err) {
    console.error('🎫 Get Unassigned Tickets - Error:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 7. GET /api/tickets/my-tickets - Get current user's assigned tickets
app.get("/api/tickets/my-tickets", authenticateToken, requireRole(['manager', 'admin']), async (req, res) => {
  try {
    console.log('🎫 Get My Tickets - Fetching tickets for user:', req.user.id);

    const { data, error } = await supabase.rpc("fn_get_tech_tickets", {
      p_tech_user_id: req.user.id
    });

    if (error) {
      console.error('🎫 Get My Tickets - Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('🎫 Get My Tickets - Success, returned', (data || []).length, 'tickets');
    res.json(data || []);
  } catch (err) {
    console.error('🎫 Get My Tickets - Error:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 8. GET /api/tickets/:uuid - Get ticket detail for tech view
app.get("/api/tickets/:uuid", authenticateToken, requireRole(['manager', 'admin']), async (req, res) => {
  try {
    const { uuid } = req.params;
    console.log('🎫 Get Tech Ticket Detail - Fetching ticket:', uuid, 'for viewer: tech');

    const { data, error } = await supabase.rpc("fn_get_ticket_detail", {
      p_ticket_id: uuid,
      p_viewer_type: 'tech'
    });

    if (error) {
      console.error('🎫 Get Tech Ticket Detail - Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Handle array response from Supabase - return first item
    const ticketData = Array.isArray(data) ? data[0] : data;

    if (!ticketData) {
      console.log('🎫 Get Tech Ticket Detail - Ticket not found:', uuid);
      return res.status(404).json({ error: "Ticket not found" });
    }

    console.log('🎫 Get Tech Ticket Detail - Success, ticket #', ticketData.ticket_number);
    res.json(ticketData);
  } catch (err) {
    console.error('🎫 Get Tech Ticket Detail - Error:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 9. POST /api/tickets/:uuid/assign - Assign ticket to tech
app.post("/api/tickets/:uuid/assign", authenticateToken, requireRole(['manager', 'admin']), async (req, res) => {
  try {
    const { uuid } = req.params;
    const { tech_user_id } = req.body;

    // Use provided tech_user_id or assign to self if not provided
    const assignToUserId = tech_user_id || req.user.id;

    console.log('🎫 Assign Ticket - Assigning', uuid, 'to user', assignToUserId);

    const { data, error } = await supabase.rpc("fn_assign_ticket", {
      p_ticket_id: uuid,
      p_tech_user_id: assignToUserId,
      p_assigned_by_user_id: req.user.id
    });

    if (error) {
      console.error('🎫 Assign Ticket - Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('🎫 Assign Ticket - Success');
    res.json(data);
  } catch (err) {
    console.error('🎫 Assign Ticket - Error:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 10. PUT /api/tickets/:uuid/status - Update ticket status
app.put("/api/tickets/:uuid/status", authenticateToken, requireRole(['manager', 'admin']), async (req, res) => {
  try {
    const { uuid } = req.params;
    const { status, reason } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const validStatuses = ['open', 'assigned', 'in_progress', 'waiting_customer', 'resolved', 'closed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    console.log('🎫 Update Ticket Status - Updating ticket', uuid, 'to status:', status);

    const { data, error } = await supabase.rpc("fn_update_ticket_status", {
      p_ticket_id: uuid,
      p_new_status: status,
      p_changed_by_type: 'tech',
      p_changed_by_user_id: req.user.id,
      p_reason: reason || null
    });

    if (error) {
      console.error('🎫 Update Ticket Status - Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('🎫 Update Ticket Status - Success');
    res.json(data);
  } catch (err) {
    console.error('🎫 Update Ticket Status - Error:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 11. POST /api/tickets/:uuid/comments - Add tech comment
app.post("/api/tickets/:uuid/comments", authenticateToken, requireRole(['manager', 'admin']), async (req, res) => {
  try {
    const { uuid } = req.params;
    const { comment_text, is_resolution } = req.body;

    if (!comment_text) {
      return res.status(400).json({ error: "comment_text is required" });
    }

    console.log('🎫 Add Tech Comment - Adding comment to ticket:', uuid);

    // Get user full name from database if not in JWT
    let userName = req.user.full_name;
    if (!userName) {
      const { data: userData } = await supabase
        .from("users")
        .select("email")
        .eq("id", req.user.id)
        .single();
      userName = userData?.email || 'Tech User';
    }

    const { data, error } = await supabase.rpc("fn_add_ticket_comment", {
      p_ticket_id: uuid,
      p_comment_text: comment_text,
      p_author_type: 'tech',
      p_author_user_id: req.user.id,
      p_author_name: userName,
      p_is_resolution: is_resolution || false
    });

    if (error) {
      console.error('🎫 Add Tech Comment - Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('🎫 Add Tech Comment - Success');
    res.status(201).json(data);
  } catch (err) {
    console.error('🎫 Add Tech Comment - Error:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 12. PUT /api/tickets/:uuid/priority - Update ticket priority
app.put("/api/tickets/:uuid/priority", authenticateToken, requireRole(['manager', 'admin']), async (req, res) => {
  try {
    const { uuid } = req.params;
    const { priority } = req.body;

    if (!priority) {
      return res.status(400).json({ error: "Priority is required" });
    }

    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`
      });
    }

    console.log('🎫 Update Ticket Priority - Updating ticket', uuid, 'to priority:', priority);

    const { data, error } = await supabase
      .from('tickets')
      .update({
        priority: priority,
        updated_at: new Date().toISOString()
      })
      .eq('id', uuid)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('🎫 Update Ticket Priority - Ticket not found:', uuid);
        return res.status(404).json({ error: "Ticket not found" });
      }
      console.error('🎫 Update Ticket Priority - Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('🎫 Update Ticket Priority - Success');
    res.json(data);
  } catch (err) {
    console.error('🎫 Update Ticket Priority - Error:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ADMIN ENDPOINTS (Admin Only)

// 13. GET /api/tickets/all - Get all tickets (with filters)
app.get("/api/tickets/all", authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { status, priority, assigned_to } = req.query;

    console.log('🎫 Get All Tickets - Fetching with filters:', { status, priority, assigned_to });

    let query = supabase
      .from('tickets')
      .select(`
        *,
        assigned_to_user:users!tickets_assigned_to_fkey(id, email),
        van:vans(id, owner_name, phone)
      `)
      .order('created_at', { ascending: false });

    // Apply filters if provided
    if (status) {
      query = query.eq('status', status);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }
    if (assigned_to) {
      query = query.eq('assigned_to', assigned_to);
    }

    const { data, error } = await query;

    if (error) {
      console.error('🎫 Get All Tickets - Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Flatten the response
    const tickets = (data || []).map(ticket => ({
      ...ticket,
      assigned_to_name: ticket.assigned_to_user?.email || null,
      customer_name: ticket.van?.owner_name || null,
      customer_phone: ticket.van?.phone || null
    }));

    console.log('🎫 Get All Tickets - Success, returned', tickets.length, 'tickets');
    res.json(tickets);
  } catch (err) {
    console.error('�� Get All Tickets - Error:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================================
// END TICKETING SYSTEM API ENDPOINTS
// ============================================================================

// Helper function to format sequence keys nicely (for missing sequences)
function formatSequenceKey(key) {
  if (!key) return 'Unknown';

  // Convert underscores to spaces and capitalize each word
  return key.split('_').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

// Helper function to enrich data with sequence display names
async function enrichWithDisplayNames(data, sequenceKeyField) {
  if (!data || data.length === 0) return data;

  try {
    // Get unique sequence keys
    const sequenceKeys = [...new Set(data.map(item => item[sequenceKeyField]).filter(Boolean))];

    if (sequenceKeys.length === 0) return data;

    console.log(`🔍 Enriching ${sequenceKeys.length} sequences:`, sequenceKeys);

    // Use the existing fn_get_all_sequences which we know works
    const { data: sequences, error: seqError } = await supabase.rpc("fn_get_all_sequences", {
      p_include_inactive: true
    });

    if (seqError) {
      console.error("⚠️ Error fetching sequences:", seqError);
      // Fallback: format all keys nicely
      data.forEach(item => {
        const key = item[sequenceKeyField];
        if (key) {
          item.display_name = formatSequenceKey(key);
        }
      });
      return data;
    }

    // Create a map of key -> display_name
    const displayNameMap = {};
    if (sequences && sequences.length > 0) {
      sequences.forEach(seq => {
        // The function returns sequence_key and sequence_name fields
        const key = seq.sequence_key || seq.key;
        const name = seq.sequence_name || seq.display_name || seq.name;
        if (key && name) {
          displayNameMap[key] = name;
          console.log(`✅ Mapped: ${key} -> ${name}`);
        }
      });
    }

    // Add display_name to each data item with graceful fallback
    data.forEach(item => {
      const key = item[sequenceKeyField];
      if (key) {
        // Use mapped name if exists, otherwise format the key nicely
        item.display_name = displayNameMap[key] || formatSequenceKey(key);

        // Log when we use a fallback for missing sequences
        if (!displayNameMap[key]) {
          console.log(`⚠️ Sequence not found in metadata, using formatted key: ${key} -> ${item.display_name}`);
        }
      }
    });

    return data;
  } catch (err) {
    console.error("⚠️ Error in enrichWithDisplayNames:", err);
    // Fallback: format all keys nicely
    data.forEach(item => {
      const key = item[sequenceKeyField];
      if (key) {
        item.display_name = formatSequenceKey(key);
      }
    });
    return data;
  }
}

// Other dashboard API routes
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

    // Enrich data with display names
    const enrichedData = await enrichWithDisplayNames(data, 'sequence_key');

    res.json(enrichedData);
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

    // Enrich data with display names
    const enrichedData = await enrichWithDisplayNames(data, 'issue_type');

    res.json(enrichedData);
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

    // Enrich data with display names
    const enrichedData = await enrichWithDisplayNames(data, 'sequence_key');

    res.json(enrichedData);
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

    // Enrich data with display names for handoff patterns (has two sequence fields)
    if (data && data.length > 0) {
      try {
        // Get all unique sequence keys from both fields
        const sequenceKeys = [...new Set([
          ...data.map(item => item.from_sequence),
          ...data.map(item => item.to_sequence)
        ].filter(Boolean))];

        console.log(`🔍 Handoff Patterns - Enriching ${sequenceKeys.length} sequences:`, sequenceKeys);

        // Use the existing fn_get_all_sequences which we know works
        const { data: sequences, error: seqError } = await supabase.rpc("fn_get_all_sequences", {
          p_include_inactive: true
        });

        // Create a map of key -> display_name
        const displayNameMap = {};
        if (!seqError && sequences && sequences.length > 0) {
          sequences.forEach(seq => {
            const key = seq.sequence_key || seq.key;
            const name = seq.sequence_name || seq.display_name || seq.name;
            if (key && name) {
              displayNameMap[key] = name;
              console.log(`✅ Handoff - Mapped: ${key} -> ${name}`);
            }
          });
        }

        // Add display names for both from and to sequences with formatted fallback
        data.forEach(item => {
          const fromKey = item.from_sequence;
          const toKey = item.to_sequence;

          // Use mapped name if exists, otherwise format the key nicely
          item.from_sequence_name = displayNameMap[fromKey] || formatSequenceKey(fromKey);
          item.to_sequence_name = displayNameMap[toKey] || formatSequenceKey(toKey);

          // Log when we use a fallback
          if (!displayNameMap[fromKey]) {
            console.log(`⚠️ From sequence not found, using formatted key: ${fromKey} -> ${item.from_sequence_name}`);
          }
          if (!displayNameMap[toKey]) {
            console.log(`⚠️ To sequence not found, using formatted key: ${toKey} -> ${item.to_sequence_name}`);
          }
        });
      } catch (err) {
        console.error("⚠️ Handoff Patterns - Error enriching:", err);
        // Fallback: format all keys nicely
        data.forEach(item => {
          item.from_sequence_name = formatSequenceKey(item.from_sequence);
          item.to_sequence_name = formatSequenceKey(item.to_sequence);
        });
      }
    }

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

// Serve static files from dashboard/dist (MUST come after all API routes)
app.use(express.static(path.join(__dirname, "dashboard", "dist")));

// Fallback middleware: serve index.html for non-API routes (Express 5 compatible)
// This MUST be the last middleware - catches all non-API routes and serves the React app
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'dashboard', 'dist', 'index.html'));
  } else {
    next();
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
