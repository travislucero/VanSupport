-- VanSupport Role-Based Access Control (RBAC) Setup
-- Run this in your Supabase SQL Editor

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL CHECK (name IN ('admin', 'manager', 'viewer')),
  description TEXT,
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_roles junction table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  UNIQUE(user_id, role_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- Create updated_at trigger for roles
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default roles with permissions
INSERT INTO roles (name, description, permissions) VALUES
  ('admin', 'Full system access with all permissions',
   '["view_dashboard", "view_analytics", "manage_users", "manage_roles", "view_reports", "export_data", "manage_settings"]'::jsonb),
  ('manager', 'Can view all analytics and export data',
   '["view_dashboard", "view_analytics", "view_reports", "export_data"]'::jsonb),
  ('viewer', 'Read-only access to dashboard',
   '["view_dashboard"]'::jsonb)
ON CONFLICT (name) DO UPDATE SET
  permissions = EXCLUDED.permissions,
  description = EXCLUDED.description;

-- Update existing users table to remove the old 'role' column if migrating
-- ALTER TABLE users DROP COLUMN IF EXISTS role;

-- Example: Assign roles to existing users
-- Replace the user IDs and role names with your actual data

-- Assign admin role to a user
-- INSERT INTO user_roles (user_id, role_id)
-- SELECT
--   u.id,
--   r.id
-- FROM users u
-- CROSS JOIN roles r
-- WHERE u.email = 'admin@example.com'
--   AND r.name = 'admin'
-- ON CONFLICT DO NOTHING;

-- Assign manager role to a user
-- INSERT INTO user_roles (user_id, role_id)
-- SELECT
--   u.id,
--   r.id
-- FROM users u
-- CROSS JOIN roles r
-- WHERE u.email = 'manager@example.com'
--   AND r.name = 'manager'
-- ON CONFLICT DO NOTHING;

-- Create a helpful view for querying user roles and permissions
CREATE OR REPLACE VIEW user_roles_view AS
SELECT
  u.id as user_id,
  u.email,
  u.last_login,
  r.id as role_id,
  r.name as role_name,
  r.description as role_description,
  r.permissions,
  ur.assigned_at
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id;

-- Create a function to get user permissions (aggregated from all roles)
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_permissions JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(DISTINCT perm), '[]'::jsonb)
  INTO v_permissions
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  CROSS JOIN LATERAL jsonb_array_elements_text(r.permissions) AS perm
  WHERE ur.user_id = p_user_id;

  RETURN v_permissions;
END;
$$ LANGUAGE plpgsql;

-- Create a function to check if user has a specific permission
CREATE OR REPLACE FUNCTION user_has_permission(p_user_id UUID, p_permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id
      AND r.permissions ? p_permission
  ) INTO v_has_permission;

  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get all user roles
CREATE OR REPLACE FUNCTION get_user_roles(p_user_id UUID)
RETURNS TABLE(role_name TEXT, role_description TEXT, permissions JSONB) AS $$
BEGIN
  RETURN QUERY
  SELECT r.name, r.description, r.permissions
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;
