import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import patternValidator from "./utils/patternValidator.js";
import multer from "multer";
import { BlobServiceClient } from "@azure/storage-blob";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(
  cors({
    credentials: true,
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.CLIENT_URL
        : "http://localhost:5173",
  })
);
app.use(express.json());
app.use(cookieParser());
const port = process.env.PORT || 3000;

// JWT Secret (should be in .env file)
const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

// 1. Create the Supabase client using your environment variables
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Admin client for admin operations (user creation with elevated privileges)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Azure Blob Storage configuration
const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const AZURE_STORAGE_SAS_TOKEN = process.env.AZURE_STORAGE_SAS_TOKEN;
const AZURE_CONTAINER_NAME = "ticket-attachments";

// Create Azure Blob Service Client
const blobServiceClient = new BlobServiceClient(
  `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net?${AZURE_STORAGE_SAS_TOKEN}`
);
const containerClient = blobServiceClient.getContainerClient(AZURE_CONTAINER_NAME);

// OpenAI client configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Multer configuration for file uploads (memory storage for Azure upload)
const allowedImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const allowedVideoTypes = ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"];
const allowedMimeTypes = [...allowedImageTypes, ...allowedVideoTypes];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for videos
  },
  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, GIF, WebP images and MP4, MOV, WebM videos are allowed."));
    }
  },
});

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

// Helper function to check if user is a site admin (bypasses all access checks)
const isSiteAdmin = (user) => {
  if (!user || !user.roles) return false;
  return user.roles.some((role) => role.name === "site_admin");
};

// Role-based authorization middleware
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Site admin bypasses all role checks
    if (isSiteAdmin(req.user)) {
      return next();
    }

    // Check if user has any of the allowed roles
    const userRoles = req.user.roles || [];
    const userRoleNames = userRoles.map((role) => role.name);

    const hasRequiredRole = allowedRoles.some((role) =>
      userRoleNames.includes(role)
    );

    if (!hasRequiredRole) {
      return res.status(403).json({
        error: "Forbidden: Insufficient permissions",
        required: allowedRoles,
        current: userRoleNames,
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

    // Site admin bypasses all permission checks
    if (isSiteAdmin(req.user)) {
      return next();
    }

    const userPermissions = req.user.permissions || [];

    if (!userPermissions.includes(requiredPermission)) {
      return res.status(403).json({
        error: "Forbidden: Missing required permission",
        required: requiredPermission,
        current: userPermissions,
      });
    }

    next();
  };
};

// UUID validation regex and middleware
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validateUuid = (req, res, next) => {
  const { uuid } = req.params;
  if (!uuid || !UUID_REGEX.test(uuid)) {
    return res.status(400).json({ error: "Invalid UUID format" });
  }
  next();
};

// Similarity scoring constants
const SIMILARITY_SCORES = {
  EXACT_CATEGORY_MATCH: 30,
  SINGLE_WORD_MATCH: 2,
  PHRASE_MATCH: 10
};
const MAX_TICKETS_TO_SEARCH = 100;

// Helper function to trigger comment notification webhook
const triggerCommentNotification = async (ticketId, commentId) => {
  try {
    const webhookUrl =
      process.env.N8N_COMMENT_NOTIFICATION_WEBHOOK ||
      "https://n8n-xsrq.onrender.com/webhook/ticket-comment-notification";

    console.log(
      "🔔 Triggering comment notification webhook for ticket:",
      ticketId,
      "comment:",
      commentId
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ticket_id: ticketId,
        comment_id: commentId,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      console.log("✅ Comment notification webhook triggered successfully");
    } else {
      console.error(
        "⚠️ Comment notification webhook returned non-OK status:",
        response.status
      );
    }
  } catch (err) {
    // Don't fail the request if webhook fails
    if (err.name === "AbortError") {
      console.error("⚠️ Comment notification webhook timeout after 10 seconds");
    } else {
      console.error("⚠️ Comment notification webhook failed:", err.message);
    }
  }
};

// 3. Authentication endpoints
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    console.log("🔐 Login attempt for:", email);

    // Authenticate with Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      console.log("❌ Authentication failed:", authError.message);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    console.log("✅ Authentication successful");

    // Get user details from users table with roles
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select(
        `
        id,
        email,
        full_name,
        phone,
        is_active,
        user_roles (
          role_id,
          roles (
            id,
            name,
            description,
            permissions
          )
        )
      `
      )
      .eq("id", authData.user.id)
      .single();

    if (userError) {
      console.error("Error fetching user data:", userError);
      return res.status(500).json({ error: "Error fetching user data" });
    }

    // Check if user is active
    if (!userData.is_active) {
      console.log("❌ Account is deactivated:", email);
      return res.status(403).json({ error: "Account is deactivated" });
    }

    // Format roles and permissions
    const roles = [];
    const allPermissions = new Set();

    if (userData.user_roles && userData.user_roles.length > 0) {
      userData.user_roles.forEach((userRole) => {
        if (userRole.roles) {
          roles.push({
            name: userRole.roles.name,
            description: userRole.roles.description,
          });

          // Add permissions from this role
          if (
            userRole.roles.permissions &&
            Array.isArray(userRole.roles.permissions)
          ) {
            userRole.roles.permissions.forEach((perm) =>
              allPermissions.add(perm)
            );
          }
        }
      });
    }

    const permissions = Array.from(allPermissions);

    // Update last_login
    await supabase
      .from("users")
      .update({ last_login: new Date().toISOString() })
      .eq("id", userData.id);

    // Create JWT token with roles and permissions
    const token = jwt.sign(
      {
        id: userData.id,
        email: userData.email,
        roles: roles,
        permissions: permissions,
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

    console.log("✅ Login successful for:", email);

    res.json({
      success: true,
      user: {
        id: userData.id,
        email: userData.email,
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
app.get(
  "/api/admin/users",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
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
      users.forEach((row) => {
        if (!userMap[row.user_id]) {
          userMap[row.user_id] = {
            id: row.user_id,
            email: row.email,
            last_login: row.last_login,
            roles: [],
          };
        }
        if (row.role_name) {
          userMap[row.user_id].roles.push({
            name: row.role_name,
            description: row.role_description,
          });
        }
      });

      const userList = Object.values(userMap);
      res.json(userList);
    } catch (err) {
      console.error("Error in /api/admin/users:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Create new user
app.post(
  "/api/admin/users",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { email, password, roles } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ error: "Email and password are required" });
      }

      // Only site_admin can create users with site_admin role
      if (roles && roles.includes("site_admin") && !isSiteAdmin(req.user)) {
        return res
          .status(403)
          .json({ error: "Only site administrators can assign the site_admin role" });
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
  }
);

// Update user roles
app.put(
  "/api/admin/users/:userId/roles",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { roles } = req.body;

      // Only site_admin can assign site_admin role
      if (roles && roles.includes("site_admin") && !isSiteAdmin(req.user)) {
        return res
          .status(403)
          .json({ error: "Only site administrators can assign the site_admin role" });
      }

      // Check if target user is a site_admin - only site_admin can modify site_admin users
      const { data: targetUserRoles } = await supabase
        .from("user_roles")
        .select("roles(name)")
        .eq("user_id", userId);

      const targetIsSiteAdmin = targetUserRoles?.some(
        (ur) => ur.roles?.name === "site_admin"
      );

      if (targetIsSiteAdmin && !isSiteAdmin(req.user)) {
        return res
          .status(403)
          .json({ error: "Only site administrators can modify another site administrator's roles" });
      }

      // Delete existing roles
      await supabase.from("user_roles").delete().eq("user_id", userId);

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
  }
);

// Reset user password
app.put(
  "/api/admin/users/:userId/password",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
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
  }
);

// Delete user
app.delete(
  "/api/admin/users/:userId",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { userId } = req.params;

      // Check if trying to delete self
      if (userId === req.user.id) {
        return res
          .status(400)
          .json({ error: "Cannot delete your own account" });
      }

      // Check if target user is a site_admin - only site_admin can delete site_admin users
      const { data: targetUserRoles } = await supabase
        .from("user_roles")
        .select("roles(name)")
        .eq("user_id", userId);

      const targetIsSiteAdmin = targetUserRoles?.some(
        (ur) => ur.roles?.name === "site_admin"
      );

      if (targetIsSiteAdmin && !isSiteAdmin(req.user)) {
        return res
          .status(403)
          .json({ error: "Only site administrators can delete another site administrator" });
      }

      // Delete user (cascade will delete user_roles)
      const { error } = await supabase.from("users").delete().eq("id", userId);

      if (error) {
        console.error("Error deleting user:", error);
        return res.status(500).json({ error: error.message });
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting user:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Get available roles
app.get(
  "/api/admin/roles",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { data: roles, error } = await supabase
        .from("roles")
        .select("id, name, description")
        .order("name");

      if (error) {
        console.error("Error fetching roles:", error);
        return res.status(500).json({ error: error.message });
      }

      // Filter out site_admin role for non-site_admin users
      const filteredRoles = isSiteAdmin(req.user)
        ? roles
        : roles.filter((role) => role.name !== "site_admin");

      res.json(filteredRoles);
    } catch (err) {
      console.error("Error fetching roles:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Sequence management endpoints

// 1. GET /api/sequences - List all sequences (technician can view)
app.get(
  "/api/sequences",
  authenticateToken,
  requireRole(["technician", "manager", "admin"]),
  async (req, res) => {
    try {
      console.log("📋 List Sequences - Fetching all sequences");

      const { data, error } = await supabase.rpc("fn_get_all_sequences", {
        p_include_inactive: true,
      });

      if (error) {
        console.error("📋 List Sequences - Supabase error:", error);
        return res.status(500).json({ error: error.message });
      }

      console.log(
        "📋 List Sequences - Success, returned",
        data?.length || 0,
        "sequences"
      );
      res.json(data || []);
    } catch (err) {
      console.error("📋 List Sequences - Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Active Sequences endpoints
// IMPORTANT: These must be defined BEFORE /api/sequences/:key to avoid route conflicts

// GET /api/sequences/active - Get all active SMS troubleshooting sequences (technician can view)
app.get(
  "/api/sequences/active",
  authenticateToken,
  requireRole(["technician", "manager", "admin"]),
  async (req, res) => {
    try {
      console.log("📱 Get Active Sequences - Fetching active sequences");

      const { data, error } = await supabase.rpc("fn_get_active_sequences");

      if (error) {
        console.error("📱 Get Active Sequences - Supabase error:", error);
        return res.status(500).json({ error: error.message });
      }

      console.log(
        "📱 Get Active Sequences - Success, returned",
        data?.length || 0,
        "active sequences"
      );
      res.json(data || []);
    } catch (err) {
      console.error("📱 Get Active Sequences - Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// POST /api/sequences/:id/close - Close an active sequence
app.post(
  "/api/sequences/:id/close",
  authenticateToken,
  requireRole(["manager", "admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status, createTicket, closedBy } = req.body;

      console.log(
        "📱 Close Sequence - Closing sequence:",
        id,
        "status:",
        status || "closed",
        "createTicket:",
        createTicket || false
      );

      const { data, error } = await supabase.rpc("fn_close_sequence", {
        p_sequence_session_id: id,
        p_status: status || "closed",
        p_create_ticket: createTicket || false,
        p_closed_by: closedBy || req.user?.email || "system",
      });

      if (error) {
        console.error("📱 Close Sequence - Supabase error:", error);
        return res.status(500).json({ error: error.message });
      }

      // Handle array response from Supabase - return first item
      const result = Array.isArray(data) ? data[0] : data;

      if (!result?.success) {
        console.log("📱 Close Sequence - Failed:", result?.message);
        return res.status(400).json({
          success: false,
          message: result?.message || "Failed to close sequence",
        });
      }

      console.log(
        "📱 Close Sequence - Success",
        result.ticket_id ? `ticket created: ${result.ticket_number}` : ""
      );
      res.json({
        success: true,
        message: result.message,
        ticketId: result.ticket_id,
        ticketNumber: result.ticket_number,
      });
    } catch (err) {
      console.error("📱 Close Sequence - Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// GET /api/sequences/:sessionId/messages - Get SMS messages for a sequence session
app.get(
  "/api/sequences/:sessionId/messages",
  authenticateToken,
  requireRole(["manager", "admin"]),
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      console.log("📱 Get Sequence Messages - Fetching messages for session:", sessionId);

      const { data, error } = await supabase
        .from("sms_messages")
        .select("id, from_phone, to_phone, message_body, direction, created_at")
        .eq("sequence_session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("📱 Get Sequence Messages - Supabase error:", error);
        return res.status(500).json({ error: error.message });
      }

      console.log(
        "📱 Get Sequence Messages - Success, returned",
        data?.length || 0,
        "messages"
      );
      res.json(data || []);
    } catch (err) {
      console.error("📱 Get Sequence Messages - Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// 2. GET /api/sequences/:key - Get sequence details
app.get(
  "/api/sequences/:key",
  authenticateToken,
  requireRole(["manager", "admin"]),
  async (req, res) => {
    try {
      const { key } = req.params;
      console.log("📖 Get Sequence Detail - Fetching sequence:", key);

      const { data, error } = await supabase.rpc("fn_get_sequence_detail", {
        p_sequence_key: key,
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
      if (
        sequenceData.sequence_active !== undefined &&
        sequenceData.is_active === undefined
      ) {
        sequenceData.is_active = sequenceData.sequence_active;
      }

      console.log("📖 Get Sequence Detail - Success");
      res.json(sequenceData);
    } catch (err) {
      console.error("📖 Get Sequence Detail - Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// 3. GET /api/sequences/:key/validate - Validate sequence
app.get(
  "/api/sequences/:key/validate",
  authenticateToken,
  requireRole(["manager", "admin"]),
  async (req, res) => {
    try {
      const { key } = req.params;
      console.log("✅ Validate Sequence - Validating:", key);

      const { data, error } = await supabase.rpc("fn_validate_sequence", {
        p_sequence_key: key,
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
  }
);

// 4. POST /api/sequences - Create new sequence
app.post(
  "/api/sequences",
  authenticateToken,
  requireRole(["manager", "admin"]),
  async (req, res) => {
    try {
      const { key, name, description, category, first_step } = req.body;

      if (!key || !name || !first_step) {
        return res.status(400).json({
          error:
            "Missing required fields: key, name, and first_step are required",
        });
      }

      if (!first_step.message) {
        return res.status(400).json({
          error: "first_step must include a message",
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
        p_first_step_title: first_step.doc_title || null,
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
  }
);

// 5. PUT /api/sequences/:key - Update sequence metadata
app.put(
  "/api/sequences/:key",
  authenticateToken,
  requireRole(["manager", "admin"]),
  async (req, res) => {
    try {
      const { key } = req.params;
      const { name, description, category, is_active } = req.body;

      console.log("✏️ Update Sequence Metadata - Updating:", key);

      const { data, error } = await supabase.rpc(
        "fn_update_sequence_metadata",
        {
          p_key: key,
          p_name: name || null,
          p_desc: description || null,
          p_category: category || null,
          p_is_active: is_active !== undefined ? is_active : null,
        }
      );

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
  }
);

// 6. PUT /api/sequences/:key/toggle - Enable/disable sequence
app.put(
  "/api/sequences/:key/toggle",
  authenticateToken,
  requireRole(["manager", "admin"]),
  async (req, res) => {
    try {
      const { key } = req.params;
      const { is_active } = req.body;

      if (is_active === undefined) {
        return res.status(400).json({ error: "is_active is required" });
      }

      console.log("🔄 Toggle Sequence - Setting", key, "to", is_active);

      const { data, error } = await supabase.rpc("fn_toggle_sequence", {
        p_sequence_key: key,
        p_is_active: is_active,
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
  }
);

// 7. POST /api/sequences/:key/steps - Add new step
app.post(
  "/api/sequences/:key/steps",
  authenticateToken,
  requireRole(["manager", "admin"]),
  async (req, res) => {
    try {
      const { key } = req.params;
      const {
        step_num,
        message,
        doc_url,
        doc_title,
        success_triggers,
        failure_triggers,
      } = req.body;

      if (step_num === undefined || !message) {
        return res.status(400).json({
          error: "Missing required fields: step_num and message are required",
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
        p_failure_triggers: failure_triggers || [],
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
  }
);

// 8. PUT /api/sequences/:key/steps/:step_num - Update step
app.put(
  "/api/sequences/:key/steps/:step_num",
  authenticateToken,
  requireRole(["manager", "admin"]),
  async (req, res) => {
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
        is_active,
      } = req.body;

      console.log(
        "✏️ Update Sequence Step - Updating step",
        step_num,
        "in",
        key
      );

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
        p_is_active: is_active !== undefined ? is_active : null,
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
  }
);

// 9. DELETE /api/sequences/:key/steps/:step_num - Delete step
app.delete(
  "/api/sequences/:key/steps/:step_num",
  authenticateToken,
  requireRole(["manager", "admin"]),
  async (req, res) => {
    try {
      const { key, step_num } = req.params;

      console.log(
        "🗑️ Delete Sequence Step - Deleting step",
        step_num,
        "from",
        key
      );

      const { error } = await supabase.rpc("fn_delete_sequence_step", {
        p_sequence_key: key,
        p_step_num: parseInt(step_num),
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
  }
);

// 10. DELETE /api/sequences/:key - Delete entire sequence
app.delete(
  "/api/sequences/:key",
  authenticateToken,
  requireRole(["manager", "admin"]),
  async (req, res) => {
    try {
      const { key } = req.params;

      console.log("🗑️ Delete Sequence - Deleting sequence:", key);

      const { error } = await supabase.rpc("fn_delete_sequence", {
        p_sequence_key: key,
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
  }
);

// Sequence Supplies endpoints (Tools and Parts)

// 1. GET /api/sequences/:key/supplies - Get supplies for a sequence (PUBLIC - no auth)
app.get("/api/sequences/:key/supplies", async (req, res) => {
  try {
    const { key } = req.params;
    console.log("🔧 Get Sequence Supplies - Fetching for sequence:", key);

    const { data, error } = await supabase.rpc("fn_get_sequence_supplies", {
      p_sequence_key: key,
    });

    if (error) {
      console.error("🔧 Get Sequence Supplies - Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    // Handle array response from Supabase - return first item
    const suppliesData = Array.isArray(data) ? data[0] : data;

    if (!suppliesData) {
      console.log("🔧 Get Sequence Supplies - Sequence not found:", key);
      return res.status(404).json({ error: "Sequence not found" });
    }

    console.log(
      "🔧 Get Sequence Supplies - Success, tools:",
      suppliesData.tools?.length || 0,
      "parts:",
      suppliesData.parts?.length || 0
    );
    res.json(suppliesData);
  } catch (err) {
    console.error("🔧 Get Sequence Supplies - Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 2. POST /api/sequences/:key/tools - Add a tool to a sequence (Admin)
app.post(
  "/api/sequences/:key/tools",
  authenticateToken,
  requireRole(["manager", "admin"]),
  async (req, res) => {
    try {
      const { key } = req.params;
      const { tool_name, tool_description, tool_link, is_required, sort_order, step_num } =
        req.body;

      if (!tool_name) {
        return res.status(400).json({ error: "Tool name is required" });
      }

      console.log("🔧 Add Sequence Tool - Adding tool to sequence:", key, step_num ? `step ${step_num}` : "(all steps)");

      const { data, error } = await supabase.rpc("fn_add_sequence_tool", {
        p_sequence_key: key,
        p_tool_name: tool_name,
        p_tool_description: tool_description || null,
        p_tool_link: tool_link || null,
        p_is_required: is_required ?? true,
        p_sort_order: sort_order ?? 0,
        p_step_num: step_num || null,
      });

      if (error) {
        console.error("🔧 Add Sequence Tool - Supabase error:", error);
        return res.status(500).json({ error: error.message });
      }

      console.log("🔧 Add Sequence Tool - Success");
      res.status(201).json(data);
    } catch (err) {
      console.error("🔧 Add Sequence Tool - Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// 3. PUT /api/sequences/tools/:toolId - Update a tool (Admin)
app.put(
  "/api/sequences/tools/:toolId",
  authenticateToken,
  requireRole(["manager", "admin"]),
  async (req, res) => {
    try {
      const { toolId } = req.params;
      const { tool_name, tool_description, tool_link, is_required, sort_order, step_num } =
        req.body;

      if (!tool_name) {
        return res.status(400).json({ error: "Tool name is required" });
      }

      console.log("🔧 Update Sequence Tool - Updating tool:", toolId);

      const { data, error } = await supabase.rpc("fn_update_sequence_tool", {
        p_tool_id: toolId,
        p_tool_name: tool_name,
        p_tool_description: tool_description || null,
        p_tool_link: tool_link || null,
        p_is_required: is_required ?? true,
        p_sort_order: sort_order ?? 0,
        p_step_num: step_num || null,
      });

      if (error) {
        console.error("🔧 Update Sequence Tool - Supabase error:", error);
        return res.status(500).json({ error: error.message });
      }

      console.log("🔧 Update Sequence Tool - Success");
      res.json(data);
    } catch (err) {
      console.error("🔧 Update Sequence Tool - Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// 4. DELETE /api/sequences/tools/:toolId - Delete a tool (Admin)
app.delete(
  "/api/sequences/tools/:toolId",
  authenticateToken,
  requireRole(["manager", "admin"]),
  async (req, res) => {
    try {
      const { toolId } = req.params;

      console.log("🔧 Delete Sequence Tool - Deleting tool:", toolId);

      const { error } = await supabase.rpc("fn_delete_sequence_tool", {
        p_tool_id: toolId,
      });

      if (error) {
        console.error("🔧 Delete Sequence Tool - Supabase error:", error);
        return res.status(500).json({ error: error.message });
      }

      console.log("🔧 Delete Sequence Tool - Success");
      res.json({ success: true, message: "Tool deleted successfully" });
    } catch (err) {
      console.error("🔧 Delete Sequence Tool - Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// 5. POST /api/sequences/:key/parts - Add a part to a sequence (Admin)
app.post(
  "/api/sequences/:key/parts",
  authenticateToken,
  requireRole(["manager", "admin"]),
  async (req, res) => {
    try {
      const { key } = req.params;
      const {
        part_name,
        part_number,
        part_description,
        part_link,
        estimated_price,
        is_required,
        sort_order,
        step_num,
      } = req.body;

      if (!part_name) {
        return res.status(400).json({ error: "Part name is required" });
      }

      console.log("🔩 Add Sequence Part - Adding part to sequence:", key, step_num ? `step ${step_num}` : "(all steps)");

      const { data, error } = await supabase.rpc("fn_add_sequence_part", {
        p_sequence_key: key,
        p_part_name: part_name,
        p_part_number: part_number || null,
        p_part_description: part_description || null,
        p_part_link: part_link || null,
        p_estimated_price: estimated_price || null,
        p_is_required: is_required ?? true,
        p_sort_order: sort_order ?? 0,
        p_step_num: step_num || null,
      });

      if (error) {
        console.error("🔩 Add Sequence Part - Supabase error:", error);
        return res.status(500).json({ error: error.message });
      }

      console.log("🔩 Add Sequence Part - Success");
      res.status(201).json(data);
    } catch (err) {
      console.error("🔩 Add Sequence Part - Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// 6. PUT /api/sequences/parts/:partId - Update a part (Admin)
app.put(
  "/api/sequences/parts/:partId",
  authenticateToken,
  requireRole(["manager", "admin"]),
  async (req, res) => {
    try {
      const { partId } = req.params;
      const {
        part_name,
        part_number,
        part_description,
        part_link,
        estimated_price,
        is_required,
        sort_order,
        step_num,
      } = req.body;

      if (!part_name) {
        return res.status(400).json({ error: "Part name is required" });
      }

      console.log("🔩 Update Sequence Part - Updating part:", partId);

      const { data, error } = await supabase.rpc("fn_update_sequence_part", {
        p_part_id: partId,
        p_part_name: part_name,
        p_part_number: part_number || null,
        p_part_description: part_description || null,
        p_part_link: part_link || null,
        p_estimated_price: estimated_price || null,
        p_is_required: is_required ?? true,
        p_sort_order: sort_order ?? 0,
        p_step_num: step_num || null,
      });

      if (error) {
        console.error("🔩 Update Sequence Part - Supabase error:", error);
        return res.status(500).json({ error: error.message });
      }

      console.log("🔩 Update Sequence Part - Success");
      res.json(data);
    } catch (err) {
      console.error("🔩 Update Sequence Part - Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// 7. DELETE /api/sequences/parts/:partId - Delete a part (Admin)
app.delete(
  "/api/sequences/parts/:partId",
  authenticateToken,
  requireRole(["manager", "admin"]),
  async (req, res) => {
    try {
      const { partId } = req.params;

      console.log("🔩 Delete Sequence Part - Deleting part:", partId);

      const { error } = await supabase.rpc("fn_delete_sequence_part", {
        p_part_id: partId,
      });

      if (error) {
        console.error("🔩 Delete Sequence Part - Supabase error:", error);
        return res.status(500).json({ error: error.message });
      }

      console.log("🔩 Delete Sequence Part - Success");
      res.json({ success: true, message: "Part deleted successfully" });
    } catch (err) {
      console.error("🔩 Delete Sequence Part - Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Categories endpoint for ticket creation dropdown
// GET /api/categories - List unique categories from topic_patterns
app.get(
  "/api/categories",
  authenticateToken,
  async (req, res) => {
    try {
      console.log("📂 Categories - Fetching unique categories");

      const { data, error } = await supabase
        .from("topic_patterns")
        .select("category_slug")
        .not("category_slug", "is", null);

      if (error) {
        console.error("📂 Categories - Supabase error:", error);
        return res.status(500).json({ error: error.message });
      }

      // Extract unique category slugs and format them
      const uniqueCategories = [...new Set(data.map(p => p.category_slug))]
        .filter(Boolean)
        .sort()
        .map(slug => ({
          id: slug,
          name: slug.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ')
        }));

      console.log("📂 Categories - Success, returned", uniqueCategories.length, "categories");
      res.json({ categories: uniqueCategories });
    } catch (err) {
      console.error("📂 Categories - Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Trigger Pattern Management endpoints (Admin only)

// 1. GET /api/patterns - List all trigger patterns
app.get(
  "/api/patterns",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { sequence_key } = req.query;

      console.log(
        "🎯 List Patterns - Fetching patterns",
        sequence_key ? `for sequence: ${sequence_key}` : "(all)"
      );

      let query = supabase
        .from("topic_patterns")
        .select("*")
        .order("priority", { ascending: true });

      // Filter by sequence if provided
      if (sequence_key) {
        query = query.eq("action_key", sequence_key);
      }

      const { data, error } = await query;

      if (error) {
        console.error("🎯 List Patterns - Supabase error:", error);
        return res.status(500).json({ error: error.message });
      }

      console.log(
        "🎯 List Patterns - Success, returned",
        data?.length || 0,
        "patterns"
      );
      res.json(data || []);
    } catch (err) {
      console.error("🎯 List Patterns - Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// 2. GET /api/patterns/:id - Get single pattern
app.get(
  "/api/patterns/:id",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      console.log("🎯 Get Pattern - Fetching pattern:", id);

      const { data, error } = await supabase
        .from("topic_patterns")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
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
  }
);

// 3. POST /api/patterns - Create new pattern
app.post(
  "/api/patterns",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
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
        van_versions,
      } = req.body;

      if (!category_slug || !pattern || !action_type || !action_key) {
        return res.status(400).json({
          error:
            "Missing required fields: category_slug, pattern, action_type, and action_key are required",
        });
      }

      console.log(
        "🎯 Create Pattern - Creating new pattern for category:",
        category_slug
      );

      // Validate and auto-fix pattern before saving to database
      let processedPattern = pattern;
      const validation = patternValidator.validatePattern(pattern);
      if (validation.hasDoubleEscaping) {
        console.log("🎯 Create Pattern - Auto-fixing double-escaped pattern");
        console.log("🎯 Create Pattern - Original:", pattern);
        processedPattern = patternValidator.fixDoubleEscaping(pattern);
        console.log("🎯 Create Pattern - Fixed:", processedPattern);
      }
      const preparedPattern =
        patternValidator.prepareForDatabase(processedPattern);

      const newPattern = {
        category_slug,
        pattern: preparedPattern,
        flags: flags || "i",
        priority: priority !== undefined ? priority : 100,
        action_type,
        action_key,
        entry_step_id: entry_step_id || null,
        van_makes: van_makes || null,
        years: years || null,
        van_versions: van_versions || null,
        is_active: true,
      };

      const { data, error } = await supabase
        .from("topic_patterns")
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
  }
);

// 4. PUT /api/patterns/:id - Update pattern
app.put(
  "/api/patterns/:id",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
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
        is_active,
      } = req.body;

      console.log("🎯 Update Pattern - Updating pattern:", id);

      const updateData = {
        updated_at: new Date().toISOString(),
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
        const preparedPattern =
          patternValidator.prepareForDatabase(processedPattern);
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
        .from("topic_patterns")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") {
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
  }
);

// 5. PUT /api/patterns/:id/toggle - Toggle is_active
app.put(
  "/api/patterns/:id/toggle",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { is_active } = req.body;

      if (is_active === undefined) {
        return res.status(400).json({ error: "is_active is required" });
      }

      console.log("🎯 Toggle Pattern - Setting pattern", id, "to", is_active);

      const { data, error } = await supabase
        .from("topic_patterns")
        .update({
          is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") {
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
  }
);

// 6. DELETE /api/patterns/:id - Delete pattern
app.delete(
  "/api/patterns/:id",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      console.log("🎯 Delete Pattern - Deleting pattern:", id);

      const { error } = await supabase
        .from("topic_patterns")
        .delete()
        .eq("id", id);

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
  }
);

// ============================================================================
// TICKETING SYSTEM API ENDPOINTS
// ============================================================================

// PUBLIC ENDPOINTS (No Auth Required)

// 1. GET /api/tickets/public/:uuid - Get ticket detail for customer view
app.get("/api/tickets/public/:uuid", validateUuid, async (req, res) => {
  try {
    const { uuid } = req.params;
    console.log(
      "🎫 Get Public Ticket Detail - Fetching ticket:",
      uuid,
      "for viewer: customer"
    );

    const { data, error } = await supabase.rpc("fn_get_ticket_detail", {
      p_ticket_id: uuid,
      p_viewer_type: "customer",
    });

    if (error) {
      console.error("🎫 Get Public Ticket Detail - Supabase error:", error);
      return res.status(500).json({ error: "Unable to process request" });
    }

    // Handle array response from Supabase - return first item
    const ticketData = Array.isArray(data) ? data[0] : data;

    if (!ticketData) {
      console.log("🎫 Get Public Ticket Detail - Ticket not found:", uuid);
      return res.status(404).json({ error: "Ticket not found" });
    }

    console.log(
      "🎫 Get Public Ticket Detail - Success, ticket #",
      ticketData.ticket_number
    );
    res.json(ticketData);
  } catch (err) {
    console.error("🎫 Get Public Ticket Detail - Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 2. POST /api/tickets/public/:uuid/comments - Add customer comment
app.post("/api/tickets/public/:uuid/comments", validateUuid, async (req, res) => {
  try {
    const { uuid } = req.params;
    const { comment_text, author_name } = req.body;

    if (!comment_text || !author_name) {
      return res.status(400).json({
        error:
          "Missing required fields: comment_text and author_name are required",
      });
    }

    console.log("🎫 Add Customer Comment - Adding comment to ticket:", uuid);

    const { data, error } = await supabase.rpc("fn_add_ticket_comment", {
      p_ticket_id: uuid,
      p_comment_text: comment_text,
      p_author_type: "customer",
      p_author_user_id: null,
      p_author_name: author_name,
      p_is_resolution: false,
    });

    if (error) {
      console.error("🎫 Add Customer Comment - Supabase error:", error);
      return res.status(500).json({ error: "Unable to process request" });
    }

    console.log("🎫 Add Customer Comment - Success");

    // Trigger notification webhook asynchronously (fire and forget)
    // Only trigger for customer comments (not system comments)
    if (data) {
      triggerCommentNotification(uuid, data).catch((err) => {
        console.error("⚠️ Error in comment notification webhook:", err);
      });
    }

    res.status(201).json(data);
  } catch (err) {
    console.error("🎫 Add Customer Comment - Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 3. PUT /api/tickets/public/:uuid/resolve - Customer marks ticket resolved
app.put("/api/tickets/public/:uuid/resolve", validateUuid, async (req, res) => {
  try {
    const { uuid } = req.params;
    const { resolution } = req.body;

    if (!resolution) {
      return res.status(400).json({ error: "Resolution text is required" });
    }

    console.log("🎫 Customer Resolve Ticket - Resolving ticket:", uuid);

    // First add the resolution comment
    const { error: commentError } = await supabase.rpc(
      "fn_add_ticket_comment",
      {
        p_ticket_id: uuid,
        p_comment_text: resolution,
        p_author_type: "customer",
        p_author_user_id: null,
        p_author_name: "Customer",
        p_is_resolution: true,
      }
    );

    if (commentError) {
      console.error(
        "🎫 Customer Resolve Ticket - Error adding resolution:",
        commentError
      );
      return res.status(500).json({ error: "Unable to process request" });
    }

    // Then update status to resolved
    const { data, error } = await supabase.rpc("fn_update_ticket_status", {
      p_ticket_id: uuid,
      p_new_status: "resolved",
      p_changed_by_type: "customer",
      p_changed_by_user_id: null,
      p_reason: "Customer marked as resolved",
    });

    if (error) {
      console.error("🎫 Customer Resolve Ticket - Supabase error:", error);
      return res.status(500).json({ error: "Unable to process request" });
    }

    console.log("🎫 Customer Resolve Ticket - Success");
    res.json(data);
  } catch (err) {
    console.error("🎫 Customer Resolve Ticket - Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 4. POST /api/tickets/public/:uuid/reopen - Reopen closed ticket
app.post("/api/tickets/public/:uuid/reopen", validateUuid, async (req, res) => {
  try {
    const { uuid } = req.params;
    const { reason, reopened_by_name } = req.body;

    if (!reason || !reopened_by_name) {
      return res.status(400).json({
        error:
          "Missing required fields: reason and reopened_by_name are required",
      });
    }

    console.log("🎫 Reopen Ticket - Reopening ticket:", uuid);

    const { data, error } = await supabase.rpc("fn_reopen_ticket", {
      p_original_ticket_id: uuid,
      p_reason: reason,
      p_reopened_by_name: reopened_by_name,
    });

    if (error) {
      console.error("🎫 Reopen Ticket - Supabase error:", error);
      return res.status(500).json({ error: "Unable to process request" });
    }

    console.log("🎫 Reopen Ticket - Success, new ticket created");
    res.status(201).json(data);
  } catch (err) {
    console.error("🎫 Reopen Ticket - Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 4b. POST /api/tickets/public/:uuid/attachments - Upload image attachment (public)
app.post(
  "/api/tickets/public/:uuid/attachments",
  validateUuid,
  upload.single("file"),
  async (req, res) => {
    try {
      const { uuid } = req.params;
      const { author_name } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      if (!author_name || !author_name.trim()) {
        return res.status(400).json({ error: "Author name is required" });
      }

      console.log("📎 Public Upload - Uploading attachment for ticket:", uuid);
      console.log("📎 File details:", {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      });

      // First verify the ticket exists
      const { data: ticketData, error: ticketError } = await supabase.rpc(
        "fn_get_ticket_detail",
        {
          p_ticket_id: uuid,
          p_viewer_type: "customer",
        }
      );

      if (ticketError || !ticketData) {
        console.error("📎 Public Upload - Ticket not found:", ticketError);
        return res.status(404).json({ error: "Ticket not found" });
      }

      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const extension = file.originalname.split(".").pop().toLowerCase();
      const blobName = `${uuid}/${timestamp}.${extension}`;

      // Upload to Azure Blob Storage
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      await blockBlobClient.uploadData(file.buffer, {
        blobHTTPHeaders: {
          blobContentType: file.mimetype,
        },
      });

      // Construct the public URL (with SAS token for access)
      const publicUrl = `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${AZURE_CONTAINER_NAME}/${blobName}?${AZURE_STORAGE_SAS_TOKEN}`;

      console.log("📎 Public Upload - File uploaded to Azure:", blobName);

      // First, create a comment for this attachment
      const { data: commentData, error: commentError } = await supabase.rpc(
        "fn_add_ticket_comment",
        {
          p_ticket_id: uuid,
          p_comment_text: `Photo uploaded`,
          p_author_type: "customer",
          p_author_user_id: null,
          p_author_name: author_name.trim(),
          p_is_resolution: false,
        }
      );

      if (commentError) {
        console.error("📎 Public Upload - Error creating comment:", commentError);
        return res.status(500).json({ error: "Failed to create comment for attachment" });
      }

      console.log("📎 Public Upload - Comment created with ID:", commentData);

      // Insert attachment record into the database
      const { data: attachmentData, error: attachmentError } = await supabase
        .from("ticket_attachments")
        .insert({
          ticket_id: uuid,
          comment_id: commentData,
          original_filename: file.originalname,
          mime_type: file.mimetype,
          storage_path: blobName,
          public_url: publicUrl,
          uploaded_by_type: "customer",
          uploaded_by_user_id: null,
          source: "web",
        })
        .select()
        .single();

      if (attachmentError) {
        console.error("📎 Public Upload - DB insert error:", attachmentError);
        return res.status(500).json({ error: "Failed to save attachment record" });
      }

      console.log("📎 Public Upload - Attachment record created:", attachmentData.id);

      // Trigger notification webhook asynchronously (fire and forget)
      if (commentData) {
        triggerCommentNotification(uuid, commentData).catch((err) => {
          console.error("⚠️ Error in comment notification webhook:", err);
        });
      }

      res.status(201).json({
        success: true,
        attachment: attachmentData,
        comment_id: commentData,
      });
    } catch (err) {
      console.error("📎 Public Upload - Error:", err);
      if (err.message && err.message.includes("Invalid file type")) {
        return res.status(400).json({ error: err.message });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

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
      category_id,
    } = req.body;

    // Comprehensive server-side validation
    const validationErrors = [];

    // Required fields
    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      validationErrors.push("Subject is required");
    } else if (subject.trim().length < 5) {
      validationErrors.push("Subject must be at least 5 characters");
    } else if (subject.length > 200) {
      validationErrors.push("Subject must be less than 200 characters");
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      validationErrors.push("Description is required");
    } else if (description.trim().length < 20) {
      validationErrors.push("Description must be at least 20 characters");
    } else if (description.length > 2000) {
      validationErrors.push("Description must be less than 2000 characters");
    }

    // Email validation (optional but must be valid if provided)
    if (email && typeof email === 'string' && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        validationErrors.push("Invalid email format");
      }
    }

    // Phone validation (if provided, must be valid format)
    if (phone && typeof phone === 'string' && phone.trim()) {
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      if (!phoneRegex.test(phone.trim())) {
        validationErrors.push("Invalid phone number format");
      }
    }

    // Priority validation (must be a valid enum value)
    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    if (priority && !validPriorities.includes(priority)) {
      validationErrors.push("Invalid priority value. Must be: low, normal, high, or urgent");
    }

    // Urgency validation (must be a valid enum value)
    const validUrgencies = ['low', 'medium', 'high'];
    if (urgency && !validUrgencies.includes(urgency)) {
      validationErrors.push("Invalid urgency value. Must be: low, medium, or high");
    }

    // UUID validation for van_id and category_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (van_id && !uuidRegex.test(van_id)) {
      validationErrors.push("Invalid van_id format");
    }

    // Return all validation errors
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: validationErrors.length === 1 ? validationErrors[0] : "Validation failed",
        errors: validationErrors,
      });
    }

    console.log("🎫 Create Ticket - Creating new ticket:", subject.trim());

    // Create ticket - RPC returns just the UUID
    const { data: ticketId, error } = await supabase.rpc("fn_create_ticket", {
      p_phone: phone || null,
      p_email: email || null,
      p_owner_name: owner_name || null,
      p_subject: subject,
      p_issue_summary: issue_summary || subject, // Legacy field - fallback to subject if not provided
      p_description: description,
      p_priority: priority || "normal",
      p_urgency: urgency || null,
      p_van_id: van_id || null,
      p_category_id: category_id || null,
    });

    if (error) {
      console.error("🎫 Create Ticket - Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log("🎫 Create Ticket - Ticket created with ID:", ticketId);

    // Fetch the full ticket details
    const { data: ticketDetails, error: fetchError } = await supabase
      .from("tickets")
      .select(
        "id, ticket_number, subject, status, priority, urgency, created_at, owner_name, phone, email"
      )
      .eq("id", ticketId)
      .single();

    if (fetchError) {
      console.error(
        "🎫 Create Ticket - Error fetching ticket details:",
        fetchError
      );
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
      email: ticketDetails.email,
    };

    console.log(
      "🎫 Create Ticket - Success, ticket #",
      ticketResponse.ticket_number
    );

    // --- Broadcast notification to opted-in users ---
    try {
      const { data: optedInUsers } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("notify_new_tickets", true)
        .eq("is_active", true);

      if (optedInUsers && optedInUsers.length > 0) {
        const notifications = optedInUsers.map((u) => ({
          ticket_id: ticketId,
          notification_type: "new_ticket_broadcast",
          recipient_type: "user",
          recipient_user_id: u.id,
          message_body: `New ticket #${ticketDetails.ticket_number}: ${ticketDetails.subject || ticketDetails.issue_summary}`,
          metadata: {
            ticket_number: ticketDetails.ticket_number,
            subject: ticketDetails.subject || ticketDetails.issue_summary,
            priority: ticketDetails.priority,
            urgency: ticketDetails.urgency,
            owner_name: ticketDetails.owner_name,
          },
        }));

        await supabaseAdmin.from("ticket_notifications").insert(notifications);
      }
    } catch (broadcastErr) {
      console.error("Broadcast notification error:", broadcastErr);
    }

    // Return full ticket object with ticket_id
    res.status(201).json(ticketResponse);
  } catch (err) {
    console.error("🎫 Create Ticket - Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// TECH ENDPOINTS

// 6. GET /api/tickets/unassigned - Get unassigned ticket queue (technician can view)
app.get(
  "/api/tickets/unassigned",
  authenticateToken,
  requireRole(["technician", "manager", "admin"]),
  async (req, res) => {
    try {
      // Parse pagination parameters
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 25;

      // Validate pagination parameters
      const validLimits = [10, 25, 50, 100];
      const pageSize = validLimits.includes(limit) ? limit : 25;
      const currentPage = page > 0 ? page : 1;

      console.log(
        "🎫 Get Unassigned Tickets - Fetching page",
        currentPage,
        "with limit",
        pageSize
      );

      const { data, error } = await supabase.rpc("fn_get_tech_tickets", {
        p_tech_user_id: null,
      });

      if (error) {
        console.error("🎫 Get Unassigned Tickets - Supabase error:", error);
        return res.status(500).json({ error: error.message });
      }

      // Sort by priority (urgent first), then created_at
      const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
      const sortedData = (data || []).sort((a, b) => {
        const priorityDiff =
          (priorityOrder[a.priority] || 999) -
          (priorityOrder[b.priority] || 999);
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(a.created_at) - new Date(b.created_at);
      });

      // Apply pagination
      const totalCount = sortedData.length;
      const totalPages = Math.ceil(totalCount / pageSize);
      const offset = (currentPage - 1) * pageSize;
      const paginatedData = sortedData.slice(offset, offset + pageSize);

      // Build pagination metadata
      const pagination = {
        page: currentPage,
        limit: pageSize,
        totalCount: totalCount,
        totalPages: totalPages,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
      };

      console.log(
        "🎫 Get Unassigned Tickets - Success, page",
        currentPage,
        "of",
        totalPages,
        "(",
        paginatedData.length,
        "tickets)"
      );

      res.json({
        tickets: paginatedData,
        pagination: pagination,
      });
    } catch (err) {
      console.error("🎫 Get Unassigned Tickets - Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// 7. GET /api/tickets/my-tickets - Get current user's assigned tickets (technician can view)
app.get(
  "/api/tickets/my-tickets",
  authenticateToken,
  requireRole(["technician", "manager", "admin"]),
  async (req, res) => {
    try {
      // Parse pagination parameters
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 25;

      // Validate pagination parameters
      const validLimits = [10, 25, 50, 100];
      const pageSize = validLimits.includes(limit) ? limit : 25;
      const currentPage = page > 0 ? page : 1;

      console.log(
        "🎫 Get My Tickets - Fetching tickets for user:",
        req.user.id,
        "- page",
        currentPage,
        "with limit",
        pageSize
      );

      const { data, error } = await supabase.rpc("fn_get_tech_tickets", {
        p_tech_user_id: req.user.id,
      });

      if (error) {
        console.error("🎫 Get My Tickets - Supabase error:", error);
        return res.status(500).json({ error: error.message });
      }

      // Apply pagination
      const allTickets = data || [];
      const totalCount = allTickets.length;
      const totalPages = Math.ceil(totalCount / pageSize);
      const offset = (currentPage - 1) * pageSize;
      const paginatedData = allTickets.slice(offset, offset + pageSize);

      // Build pagination metadata
      const pagination = {
        page: currentPage,
        limit: pageSize,
        totalCount: totalCount,
        totalPages: totalPages,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
      };

      console.log(
        "🎫 Get My Tickets - Success, page",
        currentPage,
        "of",
        totalPages,
        "(",
        paginatedData.length,
        "tickets)"
      );

      res.json({
        tickets: paginatedData,
        pagination: pagination,
      });
    } catch (err) {
      console.error("🎫 Get My Tickets - Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// 7b. GET /api/tickets/closed - Get closed/resolved/cancelled tickets with filtering and pagination (technician can view)
app.get(
  "/api/tickets/closed",
  authenticateToken,
  requireRole(["technician", "manager", "admin"]),
  async (req, res) => {
    try {
      // Parse query parameters with defaults
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 25;
      const status = req.query.status || "all";
      const search = req.query.search || "";
      const dateFrom = req.query.dateFrom || null;
      const dateTo = req.query.dateTo || null;
      const sortBy = req.query.sortBy || "closed_date";
      const sortOrder = req.query.sortOrder || "desc";

      // Validate pagination parameters
      const validLimits = [10, 25, 50, 100];
      const pageSize = validLimits.includes(limit) ? limit : 25;
      const currentPage = page > 0 ? page : 1;

      // Validate status filter
      const validStatuses = ["resolved", "closed", "cancelled", "all"];
      const statusFilter = validStatuses.includes(status) ? status : "all";

      // Validate date parameters
      const isValidDate = (dateStr) => {
        if (!dateStr) return true; // null/empty is valid (no filter)
        const dateRegex = /^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/;
        if (!dateRegex.test(dateStr)) return false;
        const date = new Date(dateStr);
        return !isNaN(date.getTime());
      };

      if (dateFrom && !isValidDate(dateFrom)) {
        return res.status(400).json({ error: "Invalid dateFrom format. Use YYYY-MM-DD." });
      }
      if (dateTo && !isValidDate(dateTo)) {
        return res.status(400).json({ error: "Invalid dateTo format. Use YYYY-MM-DD." });
      }

      // Validate sort order
      const isAscending = sortOrder.toLowerCase() === "asc";

      // Map sortBy to actual database field
      const sortFieldMap = {
        closed_date: "resolved_at",
        created_date: "created_at",
        ticket_number: "ticket_number",
        subject: "subject",
        status: "status",
        priority: "priority",
        created_at: "created_at",
      };
      const sortField = sortFieldMap[sortBy] || "resolved_at";

      if (process.env.NODE_ENV !== "production") {
        console.log("Get Closed Tickets - Fetching with params:", {
          page: currentPage,
          limit: pageSize,
          status: statusFilter,
          search: search || "(none)",
          dateFrom: dateFrom || "(none)",
          dateTo: dateTo || "(none)",
          sortBy: sortField,
          sortOrder: isAscending ? "asc" : "desc",
        });
      }

      // Build the base query with joins for customer info
      let query = supabase
        .from("tickets")
        .select(
          `
          id,
          ticket_number,
          subject,
          description,
          status,
          priority,
          urgency,
          created_at,
          updated_at,
          resolved_at,
          resolved_by,
          resolution,
          owner_name,
          phone,
          email,
          assigned_to,
          assigned_to_user:users!tickets_assigned_to_fkey(id, email),
          van:vans(id, vin, year, make, van_number)
        `,
          { count: "exact" }
        );

      // Filter by closed statuses
      if (statusFilter === "all") {
        query = query.in("status", ["resolved", "closed", "cancelled"]);
      } else {
        query = query.eq("status", statusFilter);
      }

      // Apply date range filters on resolved_at
      if (dateFrom) {
        query = query.gte("resolved_at", dateFrom);
      }
      if (dateTo) {
        // Add time to include the entire end date
        const dateToEnd = dateTo.includes("T") ? dateTo : `${dateTo}T23:59:59.999Z`;
        query = query.lte("resolved_at", dateToEnd);
      }

      // Apply search filter at database level using .or()
      if (search && search.trim()) {
        const searchPattern = `%${search.trim()}%`;
        query = query.or(`ticket_number.ilike.${searchPattern},subject.ilike.${searchPattern},owner_name.ilike.${searchPattern}`);
      }

      // Apply sorting
      query = query.order(sortField, { ascending: isAscending, nullsFirst: false });

      // Apply pagination at database level BEFORE fetching
      const offset = (currentPage - 1) * pageSize;
      query = query.range(offset, offset + pageSize - 1);

      // Execute the query - data contains only the paginated results, count has the total
      const { data, error, count } = await query;

      if (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Get Closed Tickets - Supabase error:", error);
        }
        return res.status(500).json({ error: "Unable to process request" });
      }

      // Transform and flatten the data
      // Map id to ticket_id for frontend compatibility
      const tickets = (data || []).map((ticket) => ({
        ...ticket,
        ticket_id: ticket.id, // Frontend expects ticket_id, not id
        assigned_to_name: ticket.assigned_to_user?.email || null,
        customer_name: ticket.owner_name || null,
        customer_phone: ticket.phone || null,
        closed_date: ticket.resolved_at,
      }));

      // Calculate pagination metadata using the exact count from database
      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / pageSize);

      // Build pagination metadata
      const pagination = {
        page: currentPage,
        limit: pageSize,
        totalCount: totalCount,
        totalPages: totalPages,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
      };

      if (process.env.NODE_ENV !== "production") {
        console.log(
          "Get Closed Tickets - Success, page",
          currentPage,
          "of",
          totalPages,
          "(",
          tickets.length,
          "of",
          totalCount,
          "tickets)"
        );
      }

      res.json({
        tickets: tickets,
        pagination: pagination,
      });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Get Closed Tickets - Error:", err);
      }
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// 8. GET /api/tickets/:uuid - Get ticket detail for tech view (technician can view)
app.get(
  "/api/tickets/:uuid",
  authenticateToken,
  requireRole(["technician", "manager", "admin"]),
  validateUuid,
  async (req, res) => {
    try {
      const { uuid } = req.params;
      console.log(
        "🎫 Get Tech Ticket Detail - Fetching ticket:",
        uuid,
        "for viewer: tech"
      );

      // Use RPC function to get complete ticket data including comments and status_history
      const { data, error } = await supabase.rpc("fn_get_ticket_detail", {
        p_ticket_id: uuid,
        p_viewer_type: "tech",
      });

      if (error) {
        console.error("🎫 Get Tech Ticket Detail - Supabase error:", error);
        return res.status(500).json({ error: "Unable to process request" });
      }

      // Handle array response from RPC
      const ticketData = Array.isArray(data) ? data[0] : data;

      console.log("🎫 DEBUG - Raw RPC response fields:", Object.keys(ticketData || {}));
      console.log("🎫 DEBUG - assigned_to:", ticketData?.assigned_to);
      console.log("🎫 DEBUG - assigned_to_name:", ticketData?.assigned_to_name);
      console.log("🎫 DEBUG - assigned_to_user:", ticketData?.assigned_to_user);

      if (!ticketData) {
        console.log("🎫 Get Tech Ticket Detail - Ticket not found:", uuid);
        return res.status(404).json({ error: "Ticket not found" });
      }

      // Transform the response to include flattened assignment information
      // Handle multiple possible formats from RPC: assigned_to_name, assigned_to_user object, or just assigned_to UUID
      const transformedTicket = {
        ...ticketData,
        assigned_to_name: ticketData.assigned_to_name || ticketData.assigned_to_user?.email || null,
        customer_name: ticketData.customer_name || ticketData.van?.owner_name || null,
        customer_phone: ticketData.customer_phone || ticketData.van?.phone || null,
      };

      console.log(
        "🎫 Get Tech Ticket Detail - Success, ticket #",
        transformedTicket.ticket_number
      );
      res.json(transformedTicket);
    } catch (err) {
      console.error("🎫 Get Tech Ticket Detail - Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// 9. POST /api/tickets/:uuid/assign - Assign ticket to tech
app.post(
  "/api/tickets/:uuid/assign",
  authenticateToken,
  requireRole(["manager", "admin"]),
  validateUuid,
  async (req, res) => {
    try {
      const { uuid } = req.params;
      const { tech_user_id } = req.body;

      // Use provided tech_user_id or assign to self if not provided
      const assignToUserId = tech_user_id || req.user.id;

      console.log(
        "🎫 Assign Ticket - Assigning",
        uuid,
        "to user",
        assignToUserId
      );

      const { data, error } = await supabase.rpc("fn_assign_ticket", {
        p_ticket_id: uuid,
        p_tech_user_id: assignToUserId,
        p_assigned_by_user_id: req.user.id,
      });

      if (error) {
        console.error("🎫 Assign Ticket - Supabase error:", error);
        return res.status(500).json({ error: "Unable to process request" });
      }

      console.log("🎫 Assign Ticket - Success");
      res.json(data);
    } catch (err) {
      console.error("🎫 Assign Ticket - Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// 9b. POST /api/tickets/:uuid/assign-to-me - Self-assign ticket (manager/admin only)
app.post(
  "/api/tickets/:uuid/assign-to-me",
  authenticateToken,
  requireRole(["manager", "admin"]),
  validateUuid,
  async (req, res) => {
    try {
      const { uuid } = req.params;
      // Security: Always use the authenticated user's ID, ignore any body data
      const assignToUserId = req.user.id;

      console.log(
        "🎫 Assign To Me - User",
        assignToUserId,
        "self-assigning ticket",
        uuid
      );

      const { data, error } = await supabase.rpc("fn_assign_ticket", {
        p_ticket_id: uuid,
        p_tech_user_id: assignToUserId,
        p_assigned_by_user_id: assignToUserId,
      });

      if (error) {
        console.error("🎫 Assign To Me - Supabase error:", error);
        // Check for specific error conditions
        if (error.message && error.message.includes("not found")) {
          return res.status(404).json({ error: "Ticket not found" });
        }
        if (error.message && error.message.includes("already assigned")) {
          return res.status(409).json({ error: "Ticket already assigned" });
        }
        return res.status(500).json({ error: "Unable to process request" });
      }

      console.log("🎫 Assign To Me - Success for ticket", uuid);
      res.json(data);
    } catch (err) {
      console.error("🎫 Assign To Me - Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// 10. PUT /api/tickets/:uuid/status - Update ticket status
app.put(
  "/api/tickets/:uuid/status",
  authenticateToken,
  requireRole(["manager", "admin"]),
  validateUuid,
  async (req, res) => {
    try {
      const { uuid } = req.params;
      const { status, reason } = req.body;

      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }

      const validStatuses = [
        "open",
        "assigned",
        "in_progress",
        "waiting_customer",
        "resolved",
        "closed",
        "cancelled",
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        });
      }

      console.log(
        "🎫 Update Ticket Status - Updating ticket",
        uuid,
        "to status:",
        status
      );

      const { data, error } = await supabase.rpc("fn_update_ticket_status", {
        p_ticket_id: uuid,
        p_new_status: status,
        p_changed_by_type: "tech",
        p_changed_by_user_id: req.user.id,
        p_reason: reason || null,
      });

      if (error) {
        console.error("🎫 Update Ticket Status - Supabase error:", error);
        return res.status(500).json({ error: "Unable to process request" });
      }

      console.log("🎫 Update Ticket Status - Success");
      res.json(data);
    } catch (err) {
      console.error("🎫 Update Ticket Status - Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// 11. POST /api/tickets/:uuid/comments - Add tech comment (technician can comment)
app.post(
  "/api/tickets/:uuid/comments",
  authenticateToken,
  requireRole(["technician", "manager", "admin"]),
  validateUuid,
  async (req, res) => {
    try {
      const { uuid } = req.params;
      const { comment_text, is_resolution } = req.body;

      if (!comment_text) {
        return res.status(400).json({ error: "comment_text is required" });
      }

      console.log("🎫 Add Tech Comment - Adding comment to ticket:", uuid);

      // Get user full name from database if not in JWT
      let userName = req.user.full_name;
      if (!userName) {
        const { data: userData } = await supabase
          .from("users")
          .select("email")
          .eq("id", req.user.id)
          .single();
        userName = userData?.email || "Tech User";
      }

      const { data, error } = await supabase.rpc("fn_add_ticket_comment", {
        p_ticket_id: uuid,
        p_comment_text: comment_text,
        p_author_type: "tech",
        p_author_user_id: req.user.id,
        p_author_name: userName,
        p_is_resolution: is_resolution || false,
      });

      if (error) {
        console.error("🎫 Add Tech Comment - Supabase error:", error);
        return res.status(500).json({ error: "Unable to process request" });
      }

      // If this is a resolution comment, also update the ticket's resolution field
      // This ensures the resolution text is available for the similar tickets feature
      if (is_resolution) {
        const { error: updateError } = await supabase
          .from("tickets")
          .update({ resolution: comment_text })
          .eq("id", uuid);

        if (updateError) {
          console.error("🎫 Add Tech Comment - Failed to update ticket resolution field:", updateError);
          // Don't fail the request - the comment was added successfully
        } else {
          console.log("🎫 Add Tech Comment - Also updated ticket.resolution field");
        }
      }

      console.log("🎫 Add Tech Comment - Success");

      // Trigger notification webhook asynchronously (fire and forget)
      // Only trigger for tech comments (not system comments)
      if (data) {
        triggerCommentNotification(uuid, data).catch((err) => {
          console.error("⚠️ Error in comment notification webhook:", err);
        });
      }

      res.status(201).json(data);
    } catch (err) {
      console.error("🎫 Add Tech Comment - Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// 12. GET /api/tickets/:uuid/attachments - Get ticket attachments (technician can view)
app.get(
  "/api/tickets/:uuid/attachments",
  authenticateToken,
  requireRole(["technician", "manager", "admin"]),
  validateUuid,
  async (req, res) => {
    try {
      const { uuid } = req.params;

      console.log("📎 Get Ticket Attachments - Fetching for ticket:", uuid);

      // Use the database function to get attachments
      const { data, error } = await supabase.rpc("fn_get_ticket_attachments", {
        p_ticket_id: uuid,
      });

      if (error) {
        console.error("📎 Get Ticket Attachments - Supabase error:", error);
        return res.status(500).json({ error: "Unable to process request" });
      }

      console.log("📎 Get Ticket Attachments - Success, found:", data?.length || 0, "attachments");
      res.json(data || []);
    } catch (err) {
      console.error("📎 Get Ticket Attachments - Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// 13. PUT /api/tickets/:uuid/priority - Update ticket priority
app.put(
  "/api/tickets/:uuid/priority",
  authenticateToken,
  requireRole(["manager", "admin"]),
  validateUuid,
  async (req, res) => {
    try {
      const { uuid } = req.params;
      const { priority } = req.body;

      if (!priority) {
        return res.status(400).json({ error: "Priority is required" });
      }

      const validPriorities = ["low", "normal", "high", "urgent"];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({
          error: `Invalid priority. Must be one of: ${validPriorities.join(", ")}`,
        });
      }

      console.log(
        "🎫 Update Ticket Priority - Updating ticket",
        uuid,
        "to priority:",
        priority
      );

      const { data, error } = await supabase
        .from("tickets")
        .update({
          priority: priority,
          updated_at: new Date().toISOString(),
        })
        .eq("id", uuid)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          console.log("🎫 Update Ticket Priority - Ticket not found:", uuid);
          return res.status(404).json({ error: "Ticket not found" });
        }
        console.error("🎫 Update Ticket Priority - Supabase error:", error);
        return res.status(500).json({ error: "Unable to process request" });
      }

      console.log("🎫 Update Ticket Priority - Success");
      res.json(data);
    } catch (err) {
      console.error("🎫 Update Ticket Priority - Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// 14. GET /api/tickets/:uuid/similar - Find similar resolved tickets (technician can view)
app.get(
  "/api/tickets/:uuid/similar",
  authenticateToken,
  requireRole(["technician", "manager", "admin"]),
  validateUuid,
  async (req, res) => {
    try {
      const { uuid } = req.params;
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 5, 1), 20);

      // First, get the current ticket's details
      const { data: currentTicket, error: currentError } = await supabase
        .from("tickets")
        .select("subject, description, issue_summary")
        .eq("id", uuid)
        .single();

      if (currentError) {
        console.error("Find Similar Tickets - Error fetching current ticket:", currentError);
        return res.status(500).json({ error: "Unable to process request" });
      }

      if (!currentTicket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      // Extract keywords from current ticket for searching
      const searchText = [
        currentTicket.subject,
        currentTicket.description,
        currentTicket.issue_summary
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      // Get all resolved/closed tickets (resolution is optional)
      // Include both "resolved" and "closed" statuses as both indicate handled tickets
      const { data: resolvedTickets, error: resolvedError } = await supabase
        .from("tickets")
        .select(`
          id,
          ticket_number,
          subject,
          description,
          issue_summary,
          resolution,
          resolved_at,
          resolved_by,
          priority,
          status
        `)
        .in("status", ["resolved", "closed"])
        .neq("id", uuid)
        .order("resolved_at", { ascending: false })
        .limit(MAX_TICKETS_TO_SEARCH);

      if (resolvedError) {
        console.error("Find Similar Tickets - Error fetching resolved tickets:", resolvedError);
        return res.status(500).json({ error: "Unable to process request" });
      }

      if (!resolvedTickets || resolvedTickets.length === 0) {
        return res.json([]);
      }

      // Extract words from search text (remove common words) - do this once before the loop
      const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'is', 'was', 'are', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'of', 'with', 'from', 'by', 'about', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'it', 'its', 'this', 'that', 'these', 'those'];
      const words = searchText
        .split(/\W+/)
        .filter(word => word.length > 3 && !commonWords.includes(word));

      // Calculate similarity scores for each resolved ticket
      const scoredTickets = resolvedTickets.map((ticket) => {
        const ticketText = [
          ticket.subject,
          ticket.description,
          ticket.issue_summary
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        // Simple keyword-based similarity scoring
        let score = 0;

        // Count matching words
        words.forEach(word => {
          if (ticketText.includes(word)) {
            score += SIMILARITY_SCORES.SINGLE_WORD_MATCH;
          }
        });

        // Check for phrase matches (2-3 word sequences)
        const phrases = [];
        for (let i = 0; i < words.length - 1; i++) {
          phrases.push(words[i] + " " + words[i + 1]);
        }
        phrases.forEach(phrase => {
          if (ticketText.includes(phrase)) {
            score += SIMILARITY_SCORES.PHRASE_MATCH;
          }
        });

        return {
          ...ticket,
          similarity_score: score
        };
      });

      // Sort by similarity score and take top matches
      const similarTickets = scoredTickets
        .filter(ticket => ticket.similarity_score > 0)
        .sort((a, b) => b.similarity_score - a.similarity_score)
        .slice(0, limit)
        .map(({ similarity_score, ...ticket }) => ticket); // Remove score from response

      res.json(similarTickets);
    } catch (err) {
      console.error("Find Similar Tickets - Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// 15. POST /api/tickets/:uuid/mark-read - Mark customer comments as read by tech (technician can mark read)
app.post(
  "/api/tickets/:uuid/mark-read",
  authenticateToken,
  requireRole(["technician", "manager", "admin"]),
  validateUuid,
  async (req, res) => {
    try {
      const { uuid } = req.params;

      console.log(
        "🎫 Mark Comments Read - Marking ticket",
        uuid,
        "as read by user",
        req.user.id
      );

      // Update the tech_comments_read_at timestamp on the ticket
      // This marks all current customer comments as read by the technician
      const { data, error } = await supabase
        .from("tickets")
        .update({
          tech_comments_read_at: new Date().toISOString(),
        })
        .eq("id", uuid)
        .select("id")
        .single();

      if (error) {
        // Check if it's a not found error
        if (error.code === "PGRST116") {
          console.log("🎫 Mark Comments Read - Ticket not found:", uuid);
          return res.status(404).json({ error: "Ticket not found" });
        }
        console.error("🎫 Mark Comments Read - Supabase error:", error);
        return res.status(500).json({ error: "Unable to process request" });
      }

      console.log("🎫 Mark Comments Read - Success");
      res.json({ success: true });
    } catch (err) {
      console.error("🎫 Mark Comments Read - Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// AI SEQUENCE GENERATION ENDPOINTS

// 15b. POST /api/tickets/:uuid/generate-sequence - Generate sequence from ticket using AI
app.post(
  "/api/tickets/:uuid/generate-sequence",
  authenticateToken,
  requireRole(["manager", "admin"]),
  validateUuid,
  async (req, res) => {
    try {
      const { uuid } = req.params;
      console.log("🤖 Generate Sequence - Processing ticket:", uuid);

      // Fetch ticket with all comments
      const { data, error } = await supabase.rpc("fn_get_ticket_detail", {
        p_ticket_id: uuid,
        p_viewer_type: "tech",
      });

      if (error) {
        console.error("🤖 Generate Sequence - Supabase error:", error);
        return res.status(500).json({ error: "Unable to fetch ticket data" });
      }

      const ticketData = Array.isArray(data) ? data[0] : data;

      if (!ticketData) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      // Check ticket status
      if (!["resolved", "closed"].includes(ticketData.status)) {
        return res.status(400).json({
          error: "Only resolved or closed tickets can be converted to sequences",
        });
      }

      // Build comments string for the prompt
      const comments = ticketData.comments || [];
      const commentsText = comments
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .map((c) => {
          const authorType = c.is_internal ? "Tech (Internal)" : c.author_type === "tech" ? "Tech" : "Customer";
          const timestamp = new Date(c.created_at).toLocaleString();
          return `[${timestamp}] ${authorType}: ${c.message}`;
        })
        .join("\n");

      // Build the AI prompt with improved structure
      const systemMessage = `You are an expert technical support analyst who creates reusable troubleshooting sequences from resolved support tickets. Your sequences guide customers through self-service troubleshooting via an automated system. Extract only the steps that actually worked, written as clear customer-facing instructions. Always respond with valid JSON.`;

      const prompt = `Generate a troubleshooting sequence JSON from this resolved support ticket.

TICKET:
Subject: ${ticketData.subject}
Description: ${ticketData.description || "[none]"}
Category: ${ticketData.category || "[unspecified]"}

CONVERSATION:
${commentsText || "[no comments]"}

REQUIRED JSON STRUCTURE:
{
  "sequence_name": "string, max 60 chars, descriptive title",
  "description": "string, 1-2 sentences explaining what this sequence resolves",
  "category": "Electrical|Plumbing|HVAC|Appliances|Mechanical|Other",
  "keywords": ["3-8 searchable terms from ticket content"],
  "steps": [{
    "step_num": 1,
    "message_template": "Direct instruction to customer",
    "success_triggers": ["3-5 step-specific success phrases"],
    "failure_triggers": ["3-5 step-specific failure phrases"]
  }],
  "urls": [{"url": "exact URL from ticket", "category": "tool|video|documentation", "title": "descriptive title"}],
  "tools": [{"tool_name": "name of the tool", "tool_description": "brief description or usage context", "tool_link": "URL if mentioned", "is_required": true, "step_num": null}],
  "parts": [{"part_name": "name of the part", "part_number": "manufacturer part number if mentioned", "part_description": "brief description", "part_link": "purchase URL if mentioned", "estimated_price": null, "is_required": true, "step_num": null}]
}

EXTRACTION RULES:
1. Include only steps that contributed to resolution (omit failed attempts)
2. Write message_templates as direct, actionable customer instructions
3. Success/failure triggers must be STEP-SPECIFIC, not generic - relate to what this step accomplishes
4. Include 3-7 steps representing the logical troubleshooting flow. Each step should be ONE discrete action the customer can verify completed
5. Return urls as empty array [] if none found in ticket
6. NEVER include customer PII, credentials, or internal system references
7. For category, choose exactly ONE from: Electrical, Plumbing, HVAC, Appliances, Mechanical, Other
8. Extract ALL tools mentioned in the conversation (multimeter, screwdriver, wrench, etc.). Set step_num to the step number where the tool is needed, or null if it applies to all steps. Set is_required to true if the tool is essential for the repair
9. Extract ALL parts/supplies mentioned in the conversation (fuses, connectors, wires, filters, etc.). Include part_number if a specific model/SKU is mentioned. Set estimated_price if a price is discussed. Set step_num to the step where the part is needed, or null if general
10. Return tools and parts as empty arrays [] if none are mentioned in the ticket

EXAMPLE OUTPUT (abbreviated):
{
  "sequence_name": "Troubleshooting RV Water Heater Pilot Light",
  "description": "Steps to diagnose and relight a propane water heater pilot light that won't stay lit.",
  "category": "Appliances",
  "keywords": ["water heater", "pilot light", "propane", "no hot water"],
  "steps": [
    {"step_num": 1, "message_template": "Locate the gas control valve on the water heater...", "success_triggers": ["found it", "see it", "yes"], "failure_triggers": ["cant find", "where is it", "no valve"]},
    {"step_num": 2, "message_template": "Turn the knob to the OFF position and wait 5 minutes...", "success_triggers": ["done", "waited", "ok"], "failure_triggers": ["stuck", "won't turn", "broken knob"]}
  ],
  "urls": [],
  "tools": [{"tool_name": "Long-reach lighter", "tool_description": "For relighting the pilot", "tool_link": "", "is_required": true, "step_num": 3}],
  "parts": [{"part_name": "Thermocouple", "part_number": "", "part_description": "Replacement if pilot won't stay lit after cleaning", "part_link": "", "estimated_price": 15, "is_required": false, "step_num": null}]
}`;

      console.log("🤖 Generate Sequence - Calling OpenAI API...");

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3, // Lower temperature for more consistent structured output
        max_tokens: 3000,
      });

      const responseText = completion.choices[0].message.content;
      console.log("🤖 Generate Sequence - AI response received");

      let aiResponse;
      try {
        aiResponse = JSON.parse(responseText);
      } catch (parseError) {
        console.error("🤖 Generate Sequence - JSON parse error:", parseError);
        return res.status(500).json({ error: "Failed to parse AI response" });
      }

      // Validate AI response structure
      if (!aiResponse.sequence_name || typeof aiResponse.sequence_name !== "string") {
        console.error("🤖 Generate Sequence - Invalid response: missing sequence_name");
        return res.status(500).json({ error: "AI generated invalid response. Please try again." });
      }
      if (!Array.isArray(aiResponse.steps) || aiResponse.steps.length === 0) {
        console.error("🤖 Generate Sequence - Invalid response: missing or empty steps");
        return res.status(500).json({ error: "AI generated invalid response. Please try again." });
      }
      // Validate step structure
      for (const step of aiResponse.steps) {
        if (typeof step.step_num !== "number" || !step.message_template) {
          console.error("🤖 Generate Sequence - Invalid response: malformed step data");
          return res.status(500).json({ error: "AI generated invalid response. Please try again." });
        }
        // Ensure triggers are arrays
        step.success_triggers = Array.isArray(step.success_triggers) ? step.success_triggers : [];
        step.failure_triggers = Array.isArray(step.failure_triggers) ? step.failure_triggers : [];
      }
      // Ensure urls is an array
      aiResponse.urls = Array.isArray(aiResponse.urls) ? aiResponse.urls : [];
      // Ensure keywords is an array
      aiResponse.keywords = Array.isArray(aiResponse.keywords) ? aiResponse.keywords : [];
      // Ensure tools is an array with valid structure
      aiResponse.tools = Array.isArray(aiResponse.tools)
        ? aiResponse.tools.filter((t) => t && typeof t.tool_name === "string" && t.tool_name.trim())
        : [];
      // Ensure parts is an array with valid structure
      aiResponse.parts = Array.isArray(aiResponse.parts)
        ? aiResponse.parts.filter((p) => p && typeof p.part_name === "string" && p.part_name.trim())
        : [];

      // Return the AI-generated data along with ticket reference
      res.json({
        ticket_id: uuid,
        ticket_number: ticketData.ticket_number,
        ...aiResponse,
      });
    } catch (err) {
      console.error("🤖 Generate Sequence - Error:", err);

      // Handle specific OpenAI errors
      if (err.code === "insufficient_quota" || err.message?.includes("quota")) {
        return res.status(503).json({ error: "AI service quota exceeded. Please try again later." });
      }
      if (err.status === 429 || err.code === "rate_limit_exceeded") {
        return res.status(429).json({ error: "Too many requests. Please wait a moment and try again." });
      }
      if (err.status === 401 || err.code === "invalid_api_key") {
        console.error("🤖 OpenAI API key issue");
        return res.status(503).json({ error: "AI service temporarily unavailable." });
      }
      if (err.code === "content_filter" || err.message?.includes("content policy")) {
        return res.status(400).json({ error: "Unable to process this ticket content. Please try a different ticket." });
      }

      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Sequence key validation regex (lowercase alphanumeric with hyphens, max 50 chars)
const SEQUENCE_KEY_REGEX = /^[a-z0-9-]{1,50}$/;

// Valid sequence categories
const VALID_CATEGORIES = ['Electrical', 'Plumbing', 'HVAC', 'Appliances', 'Mechanical', 'Other'];

// 15c. POST /api/sequences/from-ticket - Create sequence from AI-generated data
app.post(
  "/api/sequences/from-ticket",
  authenticateToken,
  requireRole(["manager", "admin"]),
  async (req, res) => {
    try {
      const {
        ticket_id,
        sequence_key,
        display_name,
        description,
        category,
        is_active,
        steps,
        urls,
        keywords,
        tools,
        parts,
      } = req.body;

      console.log("🔧 Create Sequence from Ticket - Creating:", sequence_key);

      // Validate required fields
      if (!sequence_key || !display_name || !steps || steps.length === 0) {
        return res.status(400).json({
          error: "Missing required fields: sequence_key, display_name, and at least one step are required",
        });
      }

      // Server-side validation for sequence_key format
      if (!SEQUENCE_KEY_REGEX.test(sequence_key)) {
        return res.status(400).json({
          error: "Invalid sequence_key format. Must be lowercase alphanumeric with hyphens only, max 50 chars.",
        });
      }

      // Validate category if provided
      if (category && !VALID_CATEGORIES.includes(category)) {
        return res.status(400).json({
          error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
        });
      }

      // Validate display_name length
      if (display_name.length > 100) {
        return res.status(400).json({
          error: "Sequence name too long (max 100 characters)",
        });
      }

      // Check for duplicate sequence_key
      const { data: existingSequence } = await supabase
        .from("sequences")
        .select("sequence_key")
        .eq("sequence_key", sequence_key)
        .single();

      if (existingSequence) {
        return res.status(409).json({
          error: "A sequence with this key already exists. Please modify the sequence name.",
        });
      }

      // Create the sequence using existing function
      const firstStep = steps[0];
      const { data: sequenceData, error: sequenceError } = await supabase.rpc(
        "fn_create_sequence",
        {
          p_sequence_key: sequence_key,
          p_display_name: display_name,
          p_description: description || null,
          p_category: category || null,
          p_created_by: req.user.id,
          p_first_step_message: firstStep.message_template,
          p_first_step_url: firstStep.doc_url || null,
          p_first_step_title: firstStep.doc_title || null,
        }
      );

      if (sequenceError) {
        console.error("🔧 Create Sequence from Ticket - Create error:", sequenceError);
        return res.status(500).json({ error: sequenceError.message });
      }

      console.log("🔧 Create Sequence from Ticket - Sequence created, adding remaining steps...");

      // Track failed steps for reporting
      const failedSteps = [];

      // Add remaining steps (skip first as it was created with the sequence)
      for (let i = 1; i < steps.length; i++) {
        const step = steps[i];
        const { error: stepError } = await supabase.rpc("fn_add_sequence_step", {
          p_sequence_key: sequence_key,
          p_step_num: step.step_num,
          p_message_template: step.message_template,
          p_doc_url: step.doc_url || null,
          p_doc_title: step.doc_title || null,
          p_success_triggers: step.success_triggers || [],
          p_failure_triggers: step.failure_triggers || [],
        });

        if (stepError) {
          console.error(`🔧 Create Sequence from Ticket - Step ${i + 1} error:`, stepError);
          failedSteps.push(i + 1);
        }
      }

      // Update first step with triggers if provided
      if (firstStep.success_triggers?.length || firstStep.failure_triggers?.length) {
        await supabase.rpc("fn_update_sequence_step", {
          p_sequence_key: sequence_key,
          p_step_num: 1,
          p_message_template: firstStep.message_template,
          p_doc_url: firstStep.doc_url || null,
          p_doc_title: firstStep.doc_title || null,
          p_success_triggers: firstStep.success_triggers || [],
          p_failure_triggers: firstStep.failure_triggers || [],
        });
      }

      // Add tools from URLs where category is "tool"
      const toolUrls = (urls || []).filter((u) => u.category === "tool");
      for (const tool of toolUrls) {
        await supabase.rpc("fn_add_sequence_tool", {
          p_sequence_key: sequence_key,
          p_tool_name: tool.title || "Tool",
          p_tool_description: null,
          p_tool_link: tool.url,
          p_is_required: false,
          p_sort_order: 0,
          p_step_num: null,
        });
      }

      // Add explicit tools from the tools array
      if (tools && Array.isArray(tools) && tools.length > 0) {
        console.log("🔧 Create Sequence from Ticket - Adding tools:", tools.length);
        for (let i = 0; i < tools.length; i++) {
          const tool = tools[i];
          if (!tool.tool_name || !tool.tool_name.trim()) continue;

          const toolLink = tool.tool_link && tool.tool_link.trim() ? tool.tool_link.trim() : null;
          // Validate tool link if provided
          if (toolLink) {
            try {
              const parsed = new URL(toolLink);
              if (!["http:", "https:"].includes(parsed.protocol)) continue;
            } catch {
              // Skip invalid URLs - don't add the link but still add the tool
            }
          }

          const { error: toolError } = await supabase.rpc("fn_add_sequence_tool", {
            p_sequence_key: sequence_key,
            p_tool_name: tool.tool_name.trim().substring(0, 200),
            p_tool_description: tool.tool_description?.trim() || null,
            p_tool_link: toolLink,
            p_is_required: tool.is_required !== false,
            p_sort_order: i,
            p_step_num: tool.step_num || null,
          });

          if (toolError) {
            console.error(`🔧 Create Sequence from Ticket - Tool "${tool.tool_name}" error:`, toolError);
          }
        }
      }

      // Add parts from the parts array
      if (parts && Array.isArray(parts) && parts.length > 0) {
        console.log("🔧 Create Sequence from Ticket - Adding parts:", parts.length);
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          if (!part.part_name || !part.part_name.trim()) continue;

          const partLink = part.part_link && part.part_link.trim() ? part.part_link.trim() : null;
          // Validate part link if provided
          if (partLink) {
            try {
              const parsed = new URL(partLink);
              if (!["http:", "https:"].includes(parsed.protocol)) continue;
            } catch {
              // Skip invalid URLs - don't add the link but still add the part
            }
          }

          const estimatedPrice = part.estimated_price
            ? parseFloat(part.estimated_price)
            : null;

          const { error: partError } = await supabase.rpc("fn_add_sequence_part", {
            p_sequence_key: sequence_key,
            p_part_name: part.part_name.trim().substring(0, 200),
            p_part_number: part.part_number?.trim() || null,
            p_part_description: part.part_description?.trim() || null,
            p_part_link: partLink,
            p_estimated_price: isNaN(estimatedPrice) ? null : estimatedPrice,
            p_is_required: part.is_required !== false,
            p_sort_order: i,
            p_step_num: part.step_num || null,
          });

          if (partError) {
            console.error(`🔧 Create Sequence from Ticket - Part "${part.part_name}" error:`, partError);
          }
        }
      }

      // Update sequence active status if specified
      if (is_active !== undefined) {
        await supabase
          .from("sequences")
          .update({ is_active: is_active })
          .eq("sequence_key", sequence_key);
      }

      // Create trigger patterns from keywords
      const createdPatterns = [];
      const MAX_KEYWORDS = 20;
      const MAX_KEYWORD_LENGTH = 100;
      const BASE_KEYWORD_PRIORITY = 100;
      // Allow alphanumeric, spaces, hyphens, apostrophes, and common punctuation
      const SAFE_KEYWORD_PATTERN = /^[\w\s\-'.,&/]+$/;

      if (keywords && Array.isArray(keywords) && keywords.length > 0) {
        // Limit keywords to prevent DoS
        const limitedKeywords = keywords.slice(0, MAX_KEYWORDS);
        console.log("🔧 Create Sequence from Ticket - Creating trigger patterns from keywords:", limitedKeywords.length);

        // Map category to category_slug for patterns
        const categorySlugMap = {
          'Electrical': 'electrical',
          'Plumbing': 'plumbing',
          'HVAC': 'hvac',
          'Appliances': 'appliances',
          'Mechanical': 'mechanical',
          'Other': 'general',
        };
        const categorySlug = categorySlugMap[category] || 'general';

        for (let i = 0; i < limitedKeywords.length; i++) {
          const keyword = limitedKeywords[i];
          if (!keyword || typeof keyword !== 'string') continue;

          const trimmedKeyword = keyword.trim();

          // Validate keyword length and characters
          if (!trimmedKeyword ||
              trimmedKeyword.length > MAX_KEYWORD_LENGTH ||
              !SAFE_KEYWORD_PATTERN.test(trimmedKeyword)) {
            console.log(`🔧 Create Sequence from Ticket - Skipping invalid keyword: "${trimmedKeyword?.substring(0, 20)}..."`);
            continue;
          }

          // Create a safe regex pattern - escape all regex special characters
          // Using a comprehensive escape for PostgreSQL regex compatibility
          const escapedKeyword = trimmedKeyword
            .replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');

          // Use word boundaries for whole-word matching
          const patternRegex = `\\b${escapedKeyword}\\b`;

          const newPattern = {
            category_slug: categorySlug,
            pattern: patternRegex,
            flags: 'i',
            priority: BASE_KEYWORD_PRIORITY + i,
            action_type: 'sequence',
            action_key: sequence_key,
            entry_step_id: null,
            van_makes: null,
            years: null,
            van_versions: null,
            is_active: is_active !== undefined ? is_active : false,
          };

          const { data: patternData, error: patternError } = await supabase
            .from("topic_patterns")
            .insert(newPattern)
            .select()
            .single();

          if (patternError) {
            console.error(`🔧 Create Sequence from Ticket - Pattern "${trimmedKeyword}" error:`, patternError);
          } else {
            createdPatterns.push(patternData.id);
          }
        }
        console.log(`🔧 Create Sequence from Ticket - Created ${createdPatterns.length} trigger patterns`);
      }

      // Link sequence to source ticket (optional - add reference)
      if (ticket_id) {
        console.log("🔧 Create Sequence from Ticket - Linked to ticket:", ticket_id);
      }

      console.log("🔧 Create Sequence from Ticket - Success", failedSteps.length > 0 ? `with ${failedSteps.length} failed steps` : "");
      res.status(201).json({
        success: true,
        sequence_key: sequence_key,
        message: failedSteps.length > 0
          ? `Sequence created with ${failedSteps.length} step(s) that failed to save`
          : "Sequence created successfully",
        failedSteps: failedSteps.length > 0 ? failedSteps : undefined,
      });
    } catch (err) {
      console.error("🔧 Create Sequence from Ticket - Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ADMIN ENDPOINTS (Admin Only)

// 16. GET /api/tickets/all - Get all tickets (with filters)
app.get(
  "/api/tickets/all",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { status, priority, assigned_to } = req.query;

      console.log("🎫 Get All Tickets - Fetching with filters:", {
        status,
        priority,
        assigned_to,
      });

      let query = supabase
        .from("tickets")
        .select(
          `
        *,
        assigned_to_user:users!tickets_assigned_to_fkey(id, email),
        van:vans(id, owner_name, phone)
      `
        )
        .order("created_at", { ascending: false });

      // Apply filters if provided
      if (status) {
        query = query.eq("status", status);
      }
      if (priority) {
        query = query.eq("priority", priority);
      }
      if (assigned_to) {
        query = query.eq("assigned_to", assigned_to);
      }

      const { data, error } = await query;

      if (error) {
        console.error("🎫 Get All Tickets - Supabase error:", error);
        return res.status(500).json({ error: error.message });
      }

      // Flatten the response
      const tickets = (data || []).map((ticket) => ({
        ...ticket,
        assigned_to_name: ticket.assigned_to_user?.email || null,
        customer_name: ticket.van?.owner_name || null,
        customer_phone: ticket.van?.phone || null,
      }));

      console.log(
        "🎫 Get All Tickets - Success, returned",
        tickets.length,
        "tickets"
      );
      res.json(tickets);
    } catch (err) {
      console.error("�� Get All Tickets - Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ============================================================================
// END TICKETING SYSTEM API ENDPOINTS
// ============================================================================

// Helper function to format sequence keys nicely (for missing sequences)
function formatSequenceKey(key) {
  if (!key) return "Unknown";

  // Convert underscores to spaces and capitalize each word
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

// Helper function to enrich data with sequence display names
async function enrichWithDisplayNames(data, sequenceKeyField) {
  if (!data || data.length === 0) return data;

  try {
    // Get unique sequence keys
    const sequenceKeys = [
      ...new Set(data.map((item) => item[sequenceKeyField]).filter(Boolean)),
    ];

    if (sequenceKeys.length === 0) return data;

    console.log(`🔍 Enriching ${sequenceKeys.length} sequences:`, sequenceKeys);

    // Use the existing fn_get_all_sequences which we know works
    const { data: sequences, error: seqError } = await supabase.rpc(
      "fn_get_all_sequences",
      {
        p_include_inactive: true,
      }
    );

    if (seqError) {
      console.error("⚠️ Error fetching sequences:", seqError);
      // Fallback: format all keys nicely
      data.forEach((item) => {
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
      sequences.forEach((seq) => {
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
    data.forEach((item) => {
      const key = item[sequenceKeyField];
      if (key) {
        // Use mapped name if exists, otherwise format the key nicely
        item.display_name = displayNameMap[key] || formatSequenceKey(key);

        // Log when we use a fallback for missing sequences
        if (!displayNameMap[key]) {
          console.log(
            `⚠️ Sequence not found in metadata, using formatted key: ${key} -> ${item.display_name}`
          );
        }
      }
    });

    return data;
  } catch (err) {
    console.error("⚠️ Error in enrichWithDisplayNames:", err);
    // Fallback: format all keys nicely
    data.forEach((item) => {
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
    const enrichedData = await enrichWithDisplayNames(data, "sequence_key");

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

    const { data, error } = await supabase.rpc("get_dashboard_summary", params);

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
    const enrichedData = await enrichWithDisplayNames(data, "issue_type");

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

    console.log("📉 Resolution Time Trend - Request params:", {
      days,
      from,
      to,
      interval,
    });
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

app.get(
  "/api/first-contact-resolution",
  authenticateToken,
  async (req, res) => {
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

      console.log("📊 First Contact Resolution - Request params:", {
        days,
        from,
        to,
      });
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
      console.log(
        "📊 First Contact Resolution - Row count:",
        data?.length || 0
      );

      // Enrich data with display names
      const enrichedData = await enrichWithDisplayNames(data, "sequence_key");

      res.json(enrichedData);
    } catch (err) {
      console.error("📊 First Contact Resolution - Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  }
);

app.get(
  "/api/van-performance",
  authenticateToken,
  requireRole(["admin", "manager"]),
  async (req, res) => {
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

      const { data, error } = await supabase.rpc("get_van_performance", params);

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
  }
);

app.get(
  "/api/chronic-problem-vans",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
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

      console.log("⚠️ Chronic Problem Vans - Request params:", {
        days,
        from,
        to,
      });
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
  }
);

app.get(
  "/api/handoff-patterns",
  authenticateToken,
  requireRole(["admin", "manager"]),
  async (req, res) => {
    try {
      console.log(
        "🔄 Handoff Patterns - Calling function without parameters (may not accept date filters)"
      );

      // Try calling without parameters first - the function may not accept date filters
      const { data, error } = await supabase.rpc("get_handoff_patterns");

      if (error) {
        console.error("🔄 Handoff Patterns - Supabase error:", error);
        console.error(
          "🔄 Handoff Patterns - Full error details:",
          JSON.stringify(error, null, 2)
        );
        throw error;
      }

      console.log("🔄 Handoff Patterns - Data returned:", data);
      console.log("🔄 Handoff Patterns - Row count:", data?.length || 0);

      // Enrich data with display names for handoff patterns (has two sequence fields)
      if (data && data.length > 0) {
        try {
          // Get all unique sequence keys from both fields
          const sequenceKeys = [
            ...new Set(
              [
                ...data.map((item) => item.from_sequence),
                ...data.map((item) => item.to_sequence),
              ].filter(Boolean)
            ),
          ];

          console.log(
            `🔍 Handoff Patterns - Enriching ${sequenceKeys.length} sequences:`,
            sequenceKeys
          );

          // Use the existing fn_get_all_sequences which we know works
          const { data: sequences, error: seqError } = await supabase.rpc(
            "fn_get_all_sequences",
            {
              p_include_inactive: true,
            }
          );

          // Create a map of key -> display_name
          const displayNameMap = {};
          if (!seqError && sequences && sequences.length > 0) {
            sequences.forEach((seq) => {
              const key = seq.sequence_key || seq.key;
              const name = seq.sequence_name || seq.display_name || seq.name;
              if (key && name) {
                displayNameMap[key] = name;
                console.log(`✅ Handoff - Mapped: ${key} -> ${name}`);
              }
            });
          }

          // Add display names for both from and to sequences with formatted fallback
          data.forEach((item) => {
            const fromKey = item.from_sequence;
            const toKey = item.to_sequence;

            // Use mapped name if exists, otherwise format the key nicely
            item.from_sequence_name =
              displayNameMap[fromKey] || formatSequenceKey(fromKey);
            item.to_sequence_name =
              displayNameMap[toKey] || formatSequenceKey(toKey);

            // Log when we use a fallback
            if (!displayNameMap[fromKey]) {
              console.log(
                `⚠️ From sequence not found, using formatted key: ${fromKey} -> ${item.from_sequence_name}`
              );
            }
            if (!displayNameMap[toKey]) {
              console.log(
                `⚠️ To sequence not found, using formatted key: ${toKey} -> ${item.to_sequence_name}`
              );
            }
          });
        } catch (err) {
          console.error("⚠️ Handoff Patterns - Error enriching:", err);
          // Fallback: format all keys nicely
          data.forEach((item) => {
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
  }
);

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

// ===== VAN MANAGEMENT ENDPOINTS =====

// GET /api/vans - List all vans with owner info (supports search and owner_id filter)
app.get("/api/vans", authenticateToken, async (req, res) => {
  try {
    // Parse pagination and search parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const searchQuery = req.query.search || '';
    const ownerIdFilter = req.query.owner_id || null;

    // Validate pagination parameters
    const validLimits = [10, 25, 50, 100];
    const pageSize = validLimits.includes(limit) ? limit : 25;
    const currentPage = page > 0 ? page : 1;

    console.log(
      "🚐 Get Vans - Fetching page",
      currentPage,
      "with limit",
      pageSize,
      searchQuery ? `and search: "${searchQuery}"` : '',
      ownerIdFilter ? `filtered by owner_id: ${ownerIdFilter}` : ''
    );

    // Build the query with owner join
    let query = supabase
      .from("vans")
      .select(
        `
        *,
        owner:owners!vans_owner_id_fkey (
          id,
          name,
          phone,
          email,
          company
        )
      `
      );

    // Apply owner_id filter at database level if provided
    if (ownerIdFilter) {
      query = query.eq("owner_id", ownerIdFilter);
    }

    query = query.order("van_number", { ascending: true });

    const { data, error } = await query;

    if (error) throw error;

    let filteredVans = data || [];

    // Apply search filtering in memory (searches across all fields including owner name)
    if (searchQuery && searchQuery.trim() !== '') {
      const searchLower = searchQuery.trim().toLowerCase();
      filteredVans = filteredVans.filter(van => {
        // Check van fields
        const matchedByVan =
          van.van_number?.toLowerCase().includes(searchLower) ||
          van.make?.toLowerCase().includes(searchLower) ||
          van.version?.toLowerCase().includes(searchLower) ||
          van.year?.toString().includes(searchQuery.trim()) ||
          van.vin?.toLowerCase().includes(searchLower);

        // Check owner name
        const matchedByOwner = van.owner?.name?.toLowerCase().includes(searchLower);

        return matchedByVan || matchedByOwner;
      });
    }

    // Apply pagination
    const totalCount = filteredVans.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const offset = (currentPage - 1) * pageSize;
    const paginatedData = filteredVans.slice(offset, offset + pageSize);

    // Build pagination metadata
    const pagination = {
      page: currentPage,
      limit: pageSize,
      totalCount: totalCount,
      totalPages: totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    };

    console.log(
      "🚐 Get Vans - Success, page",
      currentPage,
      "of",
      totalPages,
      "(",
      paginatedData.length,
      "vans)",
      searchQuery ? `matching "${searchQuery}"` : ''
    );

    res.json({
      vans: paginatedData,
      pagination: pagination,
    });
  } catch (err) {
    console.error("Error fetching vans:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vans/:id - Get single van with owner details
app.get("/api/vans/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("vans")
      .select(
        `
        *,
        owner:owners!vans_owner_id_fkey (
          id,
          name,
          phone,
          email,
          company
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Van not found" });
      }
      throw error;
    }

    res.json(data);
  } catch (err) {
    console.error("Error fetching van:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vans - Create new van
app.post(
  "/api/vans",
  authenticateToken,
  requirePermission("manage_vans"),
  async (req, res) => {
    try {
      const { van_number, make, version, year, vin, owner_id } = req.body;

      // Validation
      if (!van_number || !make || !year || !owner_id) {
        return res.status(400).json({
          error: "Missing required fields: van_number, make, year, owner_id",
        });
      }

      // Auto-uppercase van_number and vin
      const vanData = {
        van_number: van_number.toUpperCase(),
        make,
        version: version || null,
        year: parseInt(year),
        vin: vin ? vin.toUpperCase() : null,
        owner_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("vans")
        .insert(vanData)
        .select(
          `
        *,
        owner:owners!vans_owner_id_fkey (
          id,
          name,
          phone,
          email,
          company
        )
      `
        )
        .single();

      if (error) {
        // Check for unique constraint violations
        if (error.code === "23505") {
          if (error.message.includes("van_number")) {
            return res.status(409).json({ error: "Van number already exists" });
          }
          if (error.message.includes("vin")) {
            return res.status(409).json({ error: "VIN already exists" });
          }
        }
        throw error;
      }

      res.status(201).json(data);
    } catch (err) {
      console.error("Error creating van:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// PUT /api/vans/:id - Update van
app.put(
  "/api/vans/:id",
  authenticateToken,
  requirePermission("manage_vans"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { van_number, make, version, year, vin, owner_id } = req.body;

      // Validation
      if (!van_number || !make || !year || !owner_id) {
        return res.status(400).json({
          error: "Missing required fields: van_number, make, year, owner_id",
        });
      }

      // Auto-uppercase van_number and vin
      const vanData = {
        van_number: van_number.toUpperCase(),
        make,
        version: version || null,
        year: parseInt(year),
        vin: vin ? vin.toUpperCase() : null,
        owner_id,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("vans")
        .update(vanData)
        .eq("id", id)
        .select(
          `
        *,
        owner:owners!vans_owner_id_fkey (
          id,
          name,
          phone,
          email,
          company
        )
      `
        )
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return res.status(404).json({ error: "Van not found" });
        }
        // Check for unique constraint violations
        if (error.code === "23505") {
          if (error.message.includes("van_number")) {
            return res.status(409).json({ error: "Van number already exists" });
          }
          if (error.message.includes("vin")) {
            return res.status(409).json({ error: "VIN already exists" });
          }
        }
        throw error;
      }

      res.json(data);
    } catch (err) {
      console.error("Error updating van:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// GET /api/vans/:id/check-dependencies - Check if van can be deleted
app.get(
  "/api/vans/:id/check-dependencies",
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      console.log(`🔍 Checking dependencies for van ${id}`);

      // Check for sequence_sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from("sequence_sessions")
        .select("id", { count: "exact" })
        .eq("van_id", id);

      if (sessionsError && sessionsError.code !== "PGRST116") {
        console.error("Error checking sequence_sessions:", sessionsError);
        throw sessionsError;
      }

      // Check for tickets
      const { data: tickets, error: ticketsError } = await supabase
        .from("tickets")
        .select("id", { count: "exact" })
        .eq("van_id", id);

      if (ticketsError && ticketsError.code !== "PGRST116") {
        console.error("Error checking tickets:", ticketsError);
        throw ticketsError;
      }

      const sessionCount = sessions?.length || 0;
      const ticketCount = tickets?.length || 0;
      const hasDependencies = sessionCount > 0 || ticketCount > 0;

      console.log(
        `📊 Van ${id} dependencies: ${sessionCount} sessions, ${ticketCount} tickets`
      );

      res.json({
        hasDependencies,
        sessionCount,
        ticketCount,
        message: hasDependencies
          ? `This van has ${sessionCount} support session(s) and ${ticketCount} ticket(s) in history`
          : "Van can be safely deleted",
      });
    } catch (err) {
      console.error("Error checking van dependencies:", err);
      res.status(500).json({ error: "Failed to check dependencies" });
    }
  }
);

// DELETE /api/vans/:id - Delete van
app.delete(
  "/api/vans/:id",
  authenticateToken,
  requirePermission("manage_vans"),
  async (req, res) => {
    try {
      const { id } = req.params;

      console.log(`🗑️ Attempting to delete van ${id}`);

      // Check for dependencies before deletion
      const { data: sessions } = await supabase
        .from("sequence_sessions")
        .select("id", { count: "exact" })
        .eq("van_id", id);

      const { data: tickets } = await supabase
        .from("tickets")
        .select("id", { count: "exact" })
        .eq("van_id", id);

      const sessionCount = sessions?.length || 0;
      const ticketCount = tickets?.length || 0;

      if (sessionCount > 0 || ticketCount > 0) {
        console.log(
          `❌ Cannot delete van ${id}: has ${sessionCount} sessions and ${ticketCount} tickets`
        );
        return res.status(400).json({
          error: `Cannot delete van with historical data. This van has ${sessionCount} support session(s) and ${ticketCount} ticket(s).`,
          hasDependencies: true,
          sessionCount,
          ticketCount,
        });
      }

      // Proceed with deletion if no dependencies
      const { error } = await supabase.from("vans").delete().eq("id", id);

      if (error) {
        if (error.code === "PGRST116") {
          return res.status(404).json({ error: "Van not found" });
        }
        throw error;
      }

      console.log(`✅ Van ${id} deleted successfully`);

      res.json({
        success: true,
        message: "Van deleted successfully",
      });
    } catch (err) {
      console.error("Error deleting van:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ===== OWNER MANAGEMENT ENDPOINTS =====

// GET /api/owners - List all owners with van counts (supports search)
app.get("/api/owners", authenticateToken, async (req, res) => {
  try {
    // Parse pagination and search parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const searchQuery = req.query.search || '';

    // Validate pagination parameters
    const validLimits = [10, 25, 50, 100];
    const pageSize = validLimits.includes(limit) ? limit : 25;
    const currentPage = page > 0 ? page : 1;

    console.log(
      "👥 Get Owners - Fetching page",
      currentPage,
      "with limit",
      pageSize,
      searchQuery ? `and search: "${searchQuery}"` : ''
    );

    // Build the query
    let query = supabase
      .from("owners")
      .select(
        `
        *,
        vans (id)
      `,
        { count: 'exact' }
      );

    // Apply search filters if search query exists
    if (searchQuery && searchQuery.trim() !== '') {
      const searchTerm = `%${searchQuery.trim()}%`;

      // Use OR filter to search across multiple fields
      // Note: Supabase doesn't support ILIKE with OR directly, so we need to use a different approach
      // We'll fetch all data and filter in memory for now, but ideally this should be done with a database function
      query = query.or(
        `name.ilike.${searchTerm},company.ilike.${searchTerm},phone.ilike.${searchTerm},email.ilike.${searchTerm}`
      );
    }

    // Add ordering
    query = query.order("name", { ascending: true });

    // Execute query
    const { data, error, count } = await query;

    if (error) throw error;

    // Transform the data to include van_count
    const ownersWithCount = data.map((owner) => ({
      ...owner,
      van_count: owner.vans ? owner.vans.length : 0,
      vans: undefined, // Remove the nested vans array from response
    }));

    // Apply pagination
    const totalCount = count || ownersWithCount.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const offset = (currentPage - 1) * pageSize;
    const paginatedData = ownersWithCount.slice(offset, offset + pageSize);

    // Build pagination metadata
    const pagination = {
      page: currentPage,
      limit: pageSize,
      totalCount: totalCount,
      totalPages: totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    };

    console.log(
      "👥 Get Owners - Success, page",
      currentPage,
      "of",
      totalPages,
      "(",
      paginatedData.length,
      "owners)",
      searchQuery ? `matching "${searchQuery}"` : ''
    );

    res.json({
      owners: paginatedData,
      pagination: pagination,
    });
  } catch (err) {
    console.error("Error fetching owners:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/owners/:id - Get single owner with their vans
app.get("/api/owners/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("owners")
      .select(
        `
        *,
        vans (*)
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Owner not found" });
      }
      throw error;
    }

    res.json(data);
  } catch (err) {
    console.error("Error fetching owner:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/owners - Create new owner
app.post(
  "/api/owners",
  authenticateToken,
  requirePermission("manage_owners"),
  async (req, res) => {
    try {
      const { name, company, phone, email } = req.body;

      // Validation
      if (!name || !phone || !email) {
        return res.status(400).json({
          error: "Missing required fields: name, phone, email",
        });
      }

      const ownerData = {
        name,
        company: company || null,
        phone,
        email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("owners")
        .insert(ownerData)
        .select()
        .single();

      if (error) {
        // Check for unique constraint violations
        if (error.code === "23505") {
          if (error.message.includes("phone")) {
            return res
              .status(409)
              .json({ error: "Phone number already exists" });
          }
          if (error.message.includes("email")) {
            return res.status(409).json({ error: "Email already exists" });
          }
        }
        throw error;
      }

      res.status(201).json(data);
    } catch (err) {
      console.error("Error creating owner:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// PUT /api/owners/:id - Update owner
app.put(
  "/api/owners/:id",
  authenticateToken,
  requirePermission("manage_owners"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, company, phone, email } = req.body;

      // Validation
      if (!name || !phone || !email) {
        return res.status(400).json({
          error: "Missing required fields: name, phone, email",
        });
      }

      const ownerData = {
        name,
        company: company || null,
        phone,
        email,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("owners")
        .update(ownerData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return res.status(404).json({ error: "Owner not found" });
        }
        // Check for unique constraint violations
        if (error.code === "23505") {
          if (error.message.includes("phone")) {
            return res
              .status(409)
              .json({ error: "Phone number already exists" });
          }
          if (error.message.includes("email")) {
            return res.status(409).json({ error: "Email already exists" });
          }
        }
        throw error;
      }

      res.json(data);
    } catch (err) {
      console.error("Error updating owner:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// GET /api/owners/:id/check-dependencies - Check if owner can be deleted
app.get(
  "/api/owners/:id/check-dependencies",
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      console.log(`🔍 Checking dependencies for owner ${id}`);

      // Check for vans
      const { data: vans, error: vansError } = await supabase
        .from("vans")
        .select("id", { count: "exact" })
        .eq("owner_id", id);

      if (vansError && vansError.code !== "PGRST116") {
        console.error("Error checking vans:", vansError);
        throw vansError;
      }

      // Check for tickets
      const { data: tickets, error: ticketsError } = await supabase
        .from("tickets")
        .select("id", { count: "exact" })
        .eq("owner_id", id);

      if (ticketsError && ticketsError.code !== "PGRST116") {
        console.error("Error checking tickets:", ticketsError);
        throw ticketsError;
      }

      // Check for sessions (NOT sequence_sessions - that doesn't have owner_id)
      const { data: sessions, error: sessionsError } = await supabase
        .from("sessions")
        .select("id", { count: "exact" })
        .eq("owner_id", id);

      if (sessionsError && sessionsError.code !== "PGRST116") {
        console.error("Error checking sessions:", sessionsError);
        throw sessionsError;
      }

      const vanCount = vans?.length || 0;
      const ticketCount = tickets?.length || 0;
      const sessionCount = sessions?.length || 0;
      const hasDependencies =
        vanCount > 0 || ticketCount > 0 || sessionCount > 0;

      console.log(
        `📊 Owner ${id} dependencies: ${vanCount} vans, ${sessionCount} sessions, ${ticketCount} tickets`
      );

      // Build user-friendly message
      const parts = [];
      if (vanCount > 0) parts.push(`${vanCount} van(s)`);
      if (sessionCount > 0) parts.push(`${sessionCount} support session(s)`);
      if (ticketCount > 0) parts.push(`${ticketCount} ticket(s)`);

      res.json({
        hasDependencies,
        vanCount,
        sessionCount,
        ticketCount,
        message: hasDependencies
          ? `This owner has ${parts.join(", ")} in the system`
          : "Owner can be safely deleted",
      });
    } catch (err) {
      console.error("Error checking owner dependencies:", err);
      res.status(500).json({ error: "Failed to check dependencies" });
    }
  }
);

// DELETE /api/owners/:id - Delete owner (with cascade check)
app.delete(
  "/api/owners/:id",
  authenticateToken,
  requirePermission("manage_owners"),
  async (req, res) => {
    try {
      const { id } = req.params;

      console.log(`🗑️ Attempting to delete owner ${id}`);

      // Check for dependencies before deletion
      const { data: vans } = await supabase
        .from("vans")
        .select("id", { count: "exact" })
        .eq("owner_id", id);

      const { data: tickets } = await supabase
        .from("tickets")
        .select("id", { count: "exact" })
        .eq("owner_id", id);

      const { data: sessions } = await supabase
        .from("sequence_sessions")
        .select("id", { count: "exact" })
        .eq("owner_id", id);

      const vanCount = vans?.length || 0;
      const ticketCount = tickets?.length || 0;
      const sessionCount = sessions?.length || 0;

      if (vanCount > 0 || ticketCount > 0 || sessionCount > 0) {
        console.log(
          `❌ Cannot delete owner ${id}: has ${vanCount} vans, ${sessionCount} sessions, ${ticketCount} tickets`
        );

        // Build user-friendly message
        const parts = [];
        if (vanCount > 0) parts.push(`${vanCount} van(s)`);
        if (sessionCount > 0) parts.push(`${sessionCount} support session(s)`);
        if (ticketCount > 0) parts.push(`${ticketCount} ticket(s)`);

        return res.status(400).json({
          error: `Cannot delete owner with existing data. This owner has ${parts.join(", ")} in the system.`,
          hasDependencies: true,
          vanCount,
          sessionCount,
          ticketCount,
        });
      }

      // Proceed with deletion if no dependencies
      const { error } = await supabase.from("owners").delete().eq("id", id);

      if (error) {
        if (error.code === "PGRST116") {
          return res.status(404).json({ error: "Owner not found" });
        }
        throw error;
      }

      console.log(`✅ Owner ${id} deleted successfully`);

      res.json({
        success: true,
        message: "Owner deleted successfully",
      });
    } catch (err) {
      console.error("Error deleting owner:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ==================== USER MANAGEMENT ENDPOINTS ====================

// GET /api/users - List all users with their roles
app.get(
  "/api/users",
  authenticateToken,
  requirePermission("manage_users"),
  async (req, res) => {
    try {
      console.log("📋 Fetching all users");

      const { data, error } = await supabase
        .from("users")
        .select(
          `
        id,
        email,
        full_name,
        phone,
        is_active,
        notify_new_tickets,
        created_at,
        last_login,
        user_roles (
          role_id,
          roles (
            id,
            name,
            description,
            permissions
          )
        )
      `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Format the response to be cleaner
      const formattedUsers = data.map((user) => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        is_active: user.is_active,
        notify_new_tickets: user.notify_new_tickets || false,
        created_at: user.created_at,
        last_login: user.last_login,
        role: user.user_roles?.[0]?.roles || null,
      }));

      res.json(formattedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  }
);

// GET /api/roles - Get all available roles for user creation/editing
app.get(
  "/api/roles",
  authenticateToken,
  requirePermission("manage_users"),
  async (req, res) => {
    try {
      console.log("📋 Fetching all roles");

      const { data, error } = await supabase
        .from("roles")
        .select("id, name, description, permissions")
        .order("name");

      if (error) throw error;

      console.log(`✅ Found ${data.length} roles`);
      res.json(data);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  }
);

// POST /api/users - Create new user
app.post(
  "/api/users",
  authenticateToken,
  requirePermission("manage_users"),
  async (req, res) => {
    try {
      const { email, password, full_name, phone, role_name } = req.body;
      console.log("👤 Creating new user:", email);

      // Validation
      if (!email || !password || !role_name) {
        return res.status(400).json({
          error: "Email, password, and role are required",
        });
      }

      // Check if role exists
      const { data: roleData, error: roleError } = await supabase
        .from("roles")
        .select("id, name, permissions")
        .eq("name", role_name)
        .single();

      if (roleError || !roleData) {
        return res.status(400).json({ error: "Invalid role specified" });
      }

      // Security: Only site_admin can create site_admin users
      if (role_name === "site_admin" && !isSiteAdmin(req.user)) {
        return res.status(403).json({
          error: "Only site administrators can create site_admin users",
        });
      }

      // Security: Only site_admin or users with manage_roles permission can create admin users
      if (
        role_name === "admin" &&
        !isSiteAdmin(req.user) &&
        !req.user.permissions.includes("manage_roles")
      ) {
        return res.status(403).json({
          error: "Only admins can create admin users",
        });
      }

      // Create user in Supabase Auth (using admin client with service role key)
      const { data: authData, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

      if (authError) throw authError;

      // Create user record in users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .insert({
          id: authData.user.id,
          email,
          full_name,
          phone,
          is_active: true,
        })
        .select()
        .single();

      if (userError) throw userError;

      // Assign role to user
      const { error: roleAssignError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role_id: roleData.id,
        });

      if (roleAssignError) throw roleAssignError;

      console.log("✅ User created successfully:", email);

      res.json({
        success: true,
        user: {
          id: userData.id,
          email: userData.email,
          full_name: userData.full_name,
          phone: userData.phone,
          role: roleData,
        },
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({
        error: error.message || "Failed to create user",
      });
    }
  }
);

// PUT /api/users/:id - Update user (change role, name, etc)
app.put(
  "/api/users/:id",
  authenticateToken,
  requirePermission("manage_users"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { full_name, phone, role_name, is_active, notify_new_tickets } = req.body;
      console.log("✏️ Updating user:", id);

      // Security: Prevent users from modifying their own role
      if (id === req.user.id && role_name) {
        return res.status(403).json({
          error: "Cannot modify your own role",
        });
      }

      // Security: Check if target user is a site_admin - only site_admin can modify site_admin users
      const { data: targetUserRoles } = await supabase
        .from("user_roles")
        .select("roles(name)")
        .eq("user_id", id);

      const targetIsSiteAdmin = targetUserRoles?.some(
        (ur) => ur.roles?.name === "site_admin"
      );

      if (targetIsSiteAdmin && !isSiteAdmin(req.user)) {
        return res.status(403).json({
          error: "Only site administrators can modify another site administrator",
        });
      }

      // If changing role
      if (role_name) {
        // Security: Only site_admin can assign site_admin role
        if (role_name === "site_admin" && !isSiteAdmin(req.user)) {
          return res.status(403).json({
            error: "Only site administrators can assign the site_admin role",
          });
        }

        // Check if role exists
        const { data: roleData, error: roleError } = await supabase
          .from("roles")
          .select("id, name")
          .eq("name", role_name)
          .single();

        if (roleError || !roleData) {
          return res.status(400).json({ error: "Invalid role specified" });
        }

        // Security: Only site_admin or users with manage_roles permission can assign admin role
        if (
          role_name === "admin" &&
          !isSiteAdmin(req.user) &&
          !req.user.permissions.includes("manage_roles")
        ) {
          return res.status(403).json({
            error: "Only admins can assign admin role",
          });
        }

        // Delete old role assignment
        await supabase.from("user_roles").delete().eq("user_id", id);

        // Create new role assignment
        const { error: roleAssignError } = await supabase
          .from("user_roles")
          .insert({
            user_id: id,
            role_id: roleData.id,
          });

        if (roleAssignError) throw roleAssignError;
      }

      // Update user info
      const updateData = {};
      if (full_name !== undefined) updateData.full_name = full_name;
      if (phone !== undefined) updateData.phone = phone;
      if (is_active !== undefined) updateData.is_active = is_active;
      if (notify_new_tickets !== undefined) updateData.notify_new_tickets = notify_new_tickets;

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from("users")
          .update(updateData)
          .eq("id", id);

        if (updateError) throw updateError;
      }

      console.log("✅ User updated successfully:", id);
      res.json({ success: true, message: "User updated successfully" });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  }
);

// Toggle notification preference for a user
app.patch(
  "/api/users/:id/notify-new-tickets",
  authenticateToken,
  requirePermission("manage_users"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { notify_new_tickets } = req.body;

      if (typeof notify_new_tickets !== 'boolean') {
        return res.status(400).json({ error: "notify_new_tickets must be a boolean" });
      }

      const { error } = await supabaseAdmin
        .from("users")
        .update({ notify_new_tickets })
        .eq("id", id);

      if (error) throw error;
      res.json({ success: true, notify_new_tickets });
    } catch (err) {
      console.error("Error updating notification preference:", err);
      res.status(500).json({ error: "Failed to update notification preference" });
    }
  }
);

// DELETE /api/users/:id - Deactivate user (soft delete)
app.delete(
  "/api/users/:id",
  authenticateToken,
  requirePermission("manage_users"),
  async (req, res) => {
    try {
      const { id } = req.params;
      console.log("🗑️ Deactivating user:", id);

      // Security: Cannot delete yourself
      if (id === req.user.id) {
        return res.status(403).json({
          error: "Cannot deactivate your own account",
        });
      }

      // Security: Check if target user is a site_admin - only site_admin can deactivate site_admin users
      const { data: targetUserRoles } = await supabase
        .from("user_roles")
        .select("roles(name)")
        .eq("user_id", id);

      const targetIsSiteAdmin = targetUserRoles?.some(
        (ur) => ur.roles?.name === "site_admin"
      );

      if (targetIsSiteAdmin && !isSiteAdmin(req.user)) {
        return res.status(403).json({
          error: "Only site administrators can deactivate another site administrator",
        });
      }

      // Soft delete - just mark as inactive
      const { error } = await supabase
        .from("users")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;

      console.log("✅ User deactivated:", id);
      res.json({ success: true, message: "User deactivated successfully" });
    } catch (error) {
      console.error("Error deactivating user:", error);
      res.status(500).json({ error: "Failed to deactivate user" });
    }
  }
);

// PUT /api/users/:id/reset-password - Reset user password (admin only)
app.put(
  "/api/users/:id/reset-password",
  authenticateToken,
  requirePermission("manage_users"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { new_password } = req.body;
      console.log("🔑 Resetting password for user:", id);

      // Validation
      if (!new_password || new_password.length < 6) {
        return res.status(400).json({
          error: "Password must be at least 6 characters",
        });
      }

      // Security: Cannot reset own password through this endpoint
      if (id === req.user.id) {
        return res.status(403).json({
          error: "Use the profile settings to change your own password",
        });
      }

      // Security: Check if target user is a site_admin - only site_admin can reset site_admin passwords
      const { data: targetUserRoles } = await supabase
        .from("user_roles")
        .select("roles(name)")
        .eq("user_id", id);

      const targetIsSiteAdmin = targetUserRoles?.some(
        (ur) => ur.roles?.name === "site_admin"
      );

      if (targetIsSiteAdmin && !isSiteAdmin(req.user)) {
        return res.status(403).json({
          error: "Only site administrators can reset another site administrator's password",
        });
      }

      // Update password using Supabase Admin
      const { error: updateError } =
        await supabaseAdmin.auth.admin.updateUserById(id, {
          password: new_password,
        });

      if (updateError) throw updateError;

      console.log("✅ Password reset successfully for user:", id);
      res.json({
        success: true,
        message: "Password reset successfully",
      });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({
        error: error.message || "Failed to reset password",
      });
    }
  }
);

// ===== Notification Endpoints =====

// Get unread notifications for current user
app.get(
  "/api/notifications/unread",
  authenticateToken,
  async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from("ticket_notifications")
        .select("id, ticket_id, notification_type, message_body, metadata, created_at")
        .eq("recipient_user_id", req.user.id)
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      res.json(data || []);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  }
);

// Mark single notification as read
app.post(
  "/api/notifications/:id/read",
  authenticateToken,
  async (req, res) => {
    try {
      const { error } = await supabaseAdmin
        .from("ticket_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", req.params.id)
        .eq("recipient_user_id", req.user.id);

      if (error) throw error;
      res.json({ success: true });
    } catch (err) {
      console.error("Error marking notification as read:", err);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  }
);

// Mark all notifications as read
app.post(
  "/api/notifications/read-all",
  authenticateToken,
  async (req, res) => {
    try {
      const { error } = await supabaseAdmin
        .from("ticket_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("recipient_user_id", req.user.id)
        .is("read_at", null);

      if (error) throw error;
      res.json({ success: true });
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
      res.status(500).json({ error: "Failed to mark notifications as read" });
    }
  }
);

// Serve static files from dashboard/dist (MUST come after all API routes)
app.use(express.static(path.join(__dirname, "dashboard", "dist")));

// Fallback middleware: serve index.html for non-API routes (Express 5 compatible)
// This MUST be the last middleware - catches all non-API routes and serves the React app
app.use((req, res, next) => {
  if (!req.path.startsWith("/api")) {
    res.sendFile(path.join(__dirname, "dashboard", "dist", "index.html"));
  } else {
    next();
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
