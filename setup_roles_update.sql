-- =============================================
-- VanSupport Role System Update
-- =============================================
-- This script updates the role-based access control system:
-- 1. Adds site_admin role (full unrestricted access)
-- 2. Handles viewer -> technician migration
-- 3. Updates permissions for all roles
-- =============================================

-- Step 1: If both viewer and technician exist, migrate viewer users to technician and delete viewer
DO $$
DECLARE
    viewer_role_id UUID;
    technician_role_id UUID;
BEGIN
    -- Get role IDs
    SELECT id INTO viewer_role_id FROM roles WHERE name = 'viewer';
    SELECT id INTO technician_role_id FROM roles WHERE name = 'technician';

    -- If both exist, migrate users from viewer to technician
    IF viewer_role_id IS NOT NULL AND technician_role_id IS NOT NULL THEN
        -- Update user_roles to point to technician instead of viewer
        UPDATE user_roles
        SET role_id = technician_role_id
        WHERE role_id = viewer_role_id
        AND NOT EXISTS (
            SELECT 1 FROM user_roles ur2
            WHERE ur2.user_id = user_roles.user_id
            AND ur2.role_id = technician_role_id
        );

        -- Delete any duplicate entries (user already had technician)
        DELETE FROM user_roles WHERE role_id = viewer_role_id;

        -- Delete the viewer role
        DELETE FROM roles WHERE id = viewer_role_id;

        RAISE NOTICE 'Migrated users from viewer to technician role';
    END IF;

    -- If only viewer exists (no technician), rename it
    IF viewer_role_id IS NOT NULL AND technician_role_id IS NULL THEN
        UPDATE roles
        SET name = 'technician',
            description = 'Field technician with view-only access to operational data',
            permissions = '["view_tickets", "view_sequences", "view_vans", "view_owners", "view_active_sequences"]'::jsonb
        WHERE id = viewer_role_id;

        RAISE NOTICE 'Renamed viewer role to technician';
    END IF;
END $$;

-- Step 2: Update technician role permissions (if it exists)
UPDATE roles
SET description = 'Field technician with view-only access to operational data',
    permissions = '["view_tickets", "view_sequences", "view_vans", "view_owners", "view_active_sequences"]'::jsonb
WHERE name = 'technician';

-- Step 3: Update admin role permissions
UPDATE roles
SET description = 'Administrator with full access except site admin management',
    permissions = '["view_dashboard", "view_analytics", "manage_tickets", "manage_sequences", "manage_patterns", "manage_vans", "manage_owners", "manage_users"]'::jsonb
WHERE name = 'admin';

-- Step 4: Update manager role permissions (no patterns, no users)
UPDATE roles
SET description = 'Manager with operational access to tickets, sequences, vans, and owners',
    permissions = '["view_dashboard", "view_analytics", "manage_tickets", "manage_sequences", "manage_vans", "manage_owners"]'::jsonb
WHERE name = 'manager';

-- Step 5: Insert site_admin role if it doesn't exist
INSERT INTO roles (name, description, permissions)
VALUES (
    'site_admin',
    'Super administrator with full unrestricted access to all system features',
    '["*"]'::jsonb
)
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description,
    permissions = EXCLUDED.permissions;

-- Step 6: Create technician role if it still doesn't exist
INSERT INTO roles (name, description, permissions)
VALUES (
    'technician',
    'Field technician with view-only access to operational data',
    '["view_tickets", "view_sequences", "view_vans", "view_owners", "view_active_sequences"]'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- Step 7: Update the check constraint on roles table
-- First drop the old constraint if it exists
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_name_check;

-- Add new constraint with all valid role names
ALTER TABLE roles ADD CONSTRAINT roles_name_check
CHECK (name IN ('site_admin', 'admin', 'manager', 'technician'));

-- =============================================
-- Verification Query - Run this to verify the update
-- =============================================
SELECT id, name, description, permissions FROM roles ORDER BY
  CASE name
    WHEN 'site_admin' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'manager' THEN 3
    WHEN 'technician' THEN 4
  END;
