# User Management Guide

## Overview

The VanSupport Dashboard includes a complete user management system accessible only to administrators. Admins can create, edit, and delete users, assign roles, and reset passwords.

## Access

**URL:** `/admin/users`

**Required Role:** Admin

The "Manage Users" link appears in the dashboard header for admin users only.

## Features

### 1. View All Users

The main page displays a table with all users showing:
- **Email**: User's email address
- **Roles**: Color-coded role badges
  - Admin (red)
  - Manager (orange)
  - Viewer (blue)
- **Last Login**: Timestamp of last successful login
- **Actions**: Buttons for edit, reset password, and delete

### 2. Create New User

Click the "+ Create User" button to open the create user modal.

**Fields:**
- **Email** (required): User's email address
- **Password** (required, min 8 characters): Initial password
- **Roles** (optional): Select one or more roles
  - Admin: Full system access
  - Manager: Advanced analytics access
  - Viewer: Basic dashboard access

**Example:**
```
Email: manager@example.com
Password: SecurePass123!
Roles: ☑ manager
```

**API Endpoint:** `POST /api/admin/users`

### 3. Edit User Roles

Click "Edit Roles" on any user to modify their role assignments.

**Features:**
- Select/deselect multiple roles
- Changes take effect immediately
- User must logout and login again to see new permissions

**API Endpoint:** `PUT /api/admin/users/:userId/roles`

### 4. Reset User Password

Click "Reset Password" to change a user's password.

**Fields:**
- New Password (min 8 characters)
- Confirm Password

**Security:**
- Passwords are hashed with bcrypt before storage
- User will need to use new password on next login

**API Endpoint:** `PUT /api/admin/users/:userId/password`

### 5. Delete User

Click "Delete" to permanently remove a user.

**Safety Features:**
- Confirmation dialog required
- Cannot delete your own account
- Cascading delete removes user_roles automatically

**API Endpoint:** `DELETE /api/admin/users/:userId`

## API Endpoints

All endpoints require admin authentication.

### GET /api/admin/users
List all users with their roles.

**Response:**
```json
[
  {
    "id": "uuid",
    "email": "user@example.com",
    "last_login": "2025-01-15T10:30:00Z",
    "roles": [
      {
        "name": "admin",
        "description": "Full system access with all permissions"
      }
    ]
  }
]
```

### POST /api/admin/users
Create a new user.

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "SecurePass123!",
  "roles": ["viewer", "manager"]
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "new-uuid",
    "email": "newuser@example.com"
  }
}
```

### PUT /api/admin/users/:userId/roles
Update user roles.

**Request:**
```json
{
  "roles": ["admin"]
}
```

**Response:**
```json
{
  "success": true
}
```

### PUT /api/admin/users/:userId/password
Reset user password.

**Request:**
```json
{
  "password": "NewSecurePass456!"
}
```

**Response:**
```json
{
  "success": true
}
```

### DELETE /api/admin/users/:userId
Delete a user.

**Response:**
```json
{
  "success": true
}
```

### GET /api/admin/roles
Get available roles.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "admin",
    "description": "Full system access with all permissions"
  }
]
```

## User Workflow Examples

### Creating a New Manager

1. Click "+ Create User"
2. Enter email: `manager@company.com`
3. Enter strong password
4. Check "manager" role
5. Click "Create User"
6. Success message appears
7. New user appears in table
8. Send credentials to new user via secure channel

### Promoting Viewer to Manager

1. Find user in table
2. Click "Edit Roles"
3. Check "manager" (leave "viewer" checked if desired)
4. Click "Update Roles"
5. User will have manager access on next login

### Resetting Forgotten Password

1. User contacts admin
2. Admin finds user in table
3. Click "Reset Password"
4. Enter new temporary password
5. Confirm password
6. Click "Reset Password"
7. Securely send new password to user
8. Advise user to change password after first login

### Revoking Access

1. Find user in table
2. Click "Delete"
3. Confirm deletion
4. User is immediately removed
5. User can no longer login

## Security Considerations

### Password Requirements

- Minimum 8 characters
- No complexity requirements (consider adding)
- Hashed with bcrypt (cost factor 10)
- Never stored in plain text

### Access Control

- Only admins can access `/admin/users`
- All API endpoints protected with `requireRole(['admin'])`
- Non-admins get 403 Forbidden
- Frontend hides "Manage Users" link from non-admins

### Self-Protection

- Admins cannot delete their own account
- Prevents accidental lockout
- At least one admin should always exist

### Audit Trail

Consider implementing:
- Log all user management actions
- Track who created/modified/deleted users
- Record password resets
- Monitor for suspicious activity

## Best Practices

### User Creation

1. **Use Strong Passwords**: Generate random passwords or use a password manager
2. **Principle of Least Privilege**: Start with viewer role, upgrade as needed
3. **Secure Distribution**: Send credentials via secure channel (encrypted email, password manager)
4. **Require Password Change**: Ask users to change initial password

### Role Assignment

1. **Minimize Admins**: Only assign admin role to trusted users
2. **Regular Reviews**: Periodically review user roles
3. **Remove Unused Accounts**: Delete accounts for departed users
4. **Multiple Roles**: Users can have multiple roles if needed

### Password Management

1. **Rotate Regularly**: Encourage users to change passwords periodically
2. **Reset on Compromise**: Immediately reset if account compromised
3. **Secure Storage**: Never store passwords in plain text
4. **Temporary Passwords**: Use temporary passwords for resets

## Troubleshooting

### "Access Denied" Message

**Problem:** User sees "You do not have permission to access this page"

**Solution:** User is not an admin. Verify user has admin role in database:
```sql
SELECT * FROM user_roles_view WHERE email = 'user@example.com';
```

### User Not Appearing in List

**Problem:** Newly created user doesn't appear in list

**Solution:**
1. Check browser console for errors
2. Refresh page
3. Verify user created in database
4. Check API response in Network tab

### Cannot Delete User

**Problem:** Delete button doesn't work or shows error

**Solution:**
1. Check if trying to delete self (not allowed)
2. Verify admin permissions
3. Check server logs for database errors
4. Ensure user_roles foreign key cascade is configured

### Role Changes Not Taking Effect

**Problem:** User doesn't see new features after role change

**Solution:**
1. User must logout and login again
2. Old JWT token contains old roles
3. Tokens expire after 24 hours
4. Clear browser cookies if needed

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### User Roles Table
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);
```

## Future Enhancements

Consider adding:
- [ ] Bulk user import (CSV)
- [ ] User deactivation (soft delete)
- [ ] Account lockout after failed login attempts
- [ ] Password expiry policies
- [ ] Two-factor authentication
- [ ] Email verification for new users
- [ ] Self-service password reset
- [ ] Activity logs per user
- [ ] User search and filtering
- [ ] Export user list
- [ ] Custom role creation
- [ ] Permission granularity

## Screenshots Reference

### Main User Management Page
- Table with all users
- Color-coded role badges
- Action buttons (Edit, Reset, Delete)
- "+ Create User" button in header

### Create User Modal
- Email input field
- Password input field
- Role checkboxes with descriptions
- Cancel and Create buttons

### Edit Roles Modal
- User email header
- Role checkboxes (pre-selected)
- Cancel and Update buttons

### Reset Password Modal
- User email header
- New password field
- Confirm password field
- Password mismatch validation
- Cancel and Reset buttons

## Quick Reference

| Action | Endpoint | Method | Required Role |
|--------|----------|--------|---------------|
| List Users | /api/admin/users | GET | admin |
| Create User | /api/admin/users | POST | admin |
| Update Roles | /api/admin/users/:id/roles | PUT | admin |
| Reset Password | /api/admin/users/:id/password | PUT | admin |
| Delete User | /api/admin/users/:id | DELETE | admin |
| Get Roles | /api/admin/roles | GET | admin |

## Summary

The user management system provides admins with complete control over user accounts and access levels. With proper use of roles and regular review, you can maintain secure access to the VanSupport Dashboard while ensuring users have appropriate permissions for their needs.
