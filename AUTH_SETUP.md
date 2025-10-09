# Authentication Setup Guide

## Overview
The VanSupport Dashboard now includes login/logout functionality with JWT-based authentication.

## Features Implemented
✅ Login page with email/password authentication
✅ JWT token-based sessions (24-hour expiry)
✅ HttpOnly cookies for secure token storage
✅ Password verification using bcrypt
✅ Protected dashboard routes
✅ Logout functionality
✅ Updates `last_login` timestamp on successful login

## Database Requirements

### Users Table
Ensure you have a `users` table in Supabase with the following structure:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Creating Admin Users
Users can only be created by admins. Use the following SQL to create a user:

```sql
-- Example: Create an admin user
-- First, hash your password using bcrypt with cost factor 10
-- You can use an online bcrypt generator or Node.js

INSERT INTO users (email, password_hash, role)
VALUES (
  'admin@example.com',
  '$2b$10$YourBcryptHashHere',
  'admin'
);
```

### Hashing Passwords
To generate a bcrypt hash for a password, use this Node.js script:

```javascript
const bcrypt = require('bcrypt');

const password = 'your-password-here';
const hash = bcrypt.hashSync(password, 10);
console.log(hash);
```

Or use an online bcrypt generator with cost factor 10.

## Environment Variables

Add the following to your `.env` file:

```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

⚠️ **IMPORTANT**: Change the JWT_SECRET to a long, random string in production!

## API Endpoints

### POST /api/auth/login
Authenticates a user and returns a JWT token in an HttpOnly cookie.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "admin"
  }
}
```

**Response (Error):**
```json
{
  "error": "Invalid credentials"
}
```

### POST /api/auth/logout
Logs out the user by clearing the authentication cookie.

**Response:**
```json
{
  "success": true
}
```

### GET /api/auth/me
Returns the currently authenticated user (requires valid JWT token).

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "admin"
  }
}
```

## Frontend Components

### Login.jsx
- Clean login form with email and password fields
- Error handling and loading states
- Matches dashboard dark theme

### App.jsx Updates
- Authentication check on mount
- Redirects to login if not authenticated
- Logout button in dashboard header
- Displays user email in header

## Security Features

1. **HttpOnly Cookies**: Tokens stored in HttpOnly cookies (not accessible to JavaScript)
2. **bcrypt Password Hashing**: Passwords hashed with bcrypt cost factor 10
3. **JWT Expiration**: Tokens expire after 24 hours
4. **CSRF Protection**: SameSite cookie policy set to 'strict'
5. **Secure Flag**: Cookies marked as secure in production (HTTPS only)

## Protecting Additional Routes

To protect API routes, add the `authenticateToken` middleware:

```javascript
// Example: Protect an analytics endpoint
app.get("/api/session-events", authenticateToken, async (req, res) => {
  // Route is now protected - only authenticated users can access
  // User info available in req.user
  const { data, error } = await supabase
    .from("session_events")
    .select("*");

  res.json(data);
});
```

## Testing the Setup

1. **Start the server:**
   ```bash
   npm start
   ```

2. **Create a test user in Supabase:**
   ```sql
   INSERT INTO users (email, password_hash, role)
   VALUES (
     'test@example.com',
     '$2b$10$examplehash',
     'user'
   );
   ```

3. **Navigate to the dashboard:**
   - Visit `http://localhost:3000`
   - You should see the login page
   - Enter credentials and login
   - Dashboard should load after successful authentication

4. **Test logout:**
   - Click the "Logout" button in the header
   - Should redirect to login page

## Production Deployment

Before deploying to production:

1. ✅ Change `JWT_SECRET` to a strong, random string
2. ✅ Set `NODE_ENV=production`
3. ✅ Configure `CLIENT_URL` for CORS
4. ✅ Ensure HTTPS is enabled
5. ✅ Review and enable route protection on all sensitive endpoints

## Troubleshooting

### Login fails with "Invalid credentials"
- Verify the user exists in the `users` table
- Ensure the password hash was generated with bcrypt cost factor 10
- Check the email is correct (case-sensitive)

### Cookie not being set
- Ensure CORS is configured with `credentials: true`
- Check that frontend is sending requests with `credentials: "include"`
- Verify domain matches in development/production

### Token expires immediately
- Check server clock is correct
- Verify JWT_SECRET is consistent across restarts
- Look for errors in server logs

## Next Steps

Consider implementing:
- [ ] Password reset functionality
- [ ] Email verification
- [ ] Rate limiting for login attempts
- [ ] Session management (revoke tokens)
- [ ] Two-factor authentication
- [ ] Role-based access control for different dashboard sections
