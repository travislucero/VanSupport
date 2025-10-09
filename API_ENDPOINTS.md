# VanSupport API Endpoints

## Authentication

All endpoints require authentication via JWT token stored in HttpOnly cookie.

## Authorization Levels

### 🔓 Everyone (Any Authenticated User)
Basic analytics endpoints - available to all authenticated users (admin, manager, viewer).

### 🔐 Admin + Manager
Advanced analytics - requires admin or manager role.

### 🔒 Admin Only
Sensitive data - requires admin role.

---

## Endpoint Reference

### Authentication Endpoints

#### POST /api/auth/login
Login and receive JWT token.

**Access:** Public
**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "roles": [{"name": "admin", "description": "..."}],
    "permissions": ["view_dashboard", "view_analytics", ...]
  }
}
```

#### POST /api/auth/logout
Clear authentication cookie.

**Access:** Authenticated
**Response:**
```json
{
  "success": true
}
```

#### GET /api/auth/me
Get current user information.

**Access:** Authenticated
**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "roles": [...],
    "permissions": [...]
  }
}
```

---

## Analytics Endpoints

### 🔓 Everyone (Authenticated)

#### GET /api/dashboard-summary
Get dashboard summary statistics.

**Access:** Any authenticated user
**Query Params:**
- `days` (optional): Number of days (e.g., 7, 30)
- `from` (optional): Start date (ISO format)
- `to` (optional): End date (ISO format)

**Response:**
```json
[{
  "total_calls": 150,
  "completion_rate": 85.5,
  "avg_resolution_minutes": 12.5
}]
```

**Example:**
```bash
curl -X GET 'http://localhost:3000/api/dashboard-summary?days=7' \
  --cookie "token=your-jwt-token"
```

---

#### GET /api/issue-distribution
Get distribution of issues by type.

**Access:** Any authenticated user
**Query Params:** Same as dashboard-summary
**Response:**
```json
[
  {"issue_type": "Technical", "total_count": 45},
  {"issue_type": "Account", "total_count": 30}
]
```

---

#### GET /api/resolution-time-trend
Get resolution time trends over time.

**Access:** Any authenticated user
**Query Params:**
- `days`, `from`, `to` (same as above)
- `interval` (optional): "day", "week", "month" (default: "day")

**Response:**
```json
[
  {"time_bucket": "2025-01-01", "avg_minutes": 15.2},
  {"time_bucket": "2025-01-02", "avg_minutes": 14.8}
]
```

---

#### GET /api/resolution-by-step
Get resolution percentage by troubleshooting step.

**Access:** Any authenticated user
**Query Params:** Same as dashboard-summary
**Response:**
```json
[
  {"sequence_key": "SEQ-001", "step_num": 1, "percentage": 45.5},
  {"sequence_key": "SEQ-001", "step_num": 2, "percentage": 30.2}
]
```

---

#### GET /api/first-contact-resolution
Get first contact resolution rates by sequence.

**Access:** Any authenticated user
**Query Params:** Same as dashboard-summary
**Response:**
```json
[
  {"sequence_key": "SEQ-001", "fcr_rate": 75.5, "total_sessions": 100}
]
```

---

#### GET /api/call-volume-heatmap
Get call volume by day of week and hour.

**Access:** Any authenticated user
**Query Params:** Same as dashboard-summary
**Response:**
```json
[
  {"day_of_week": 0, "hour_of_day": 9, "call_count": 25},
  {"day_of_week": 0, "hour_of_day": 10, "call_count": 35}
]
```

---

### 🔐 Admin + Manager

#### GET /api/van-performance
Get performance metrics by van make/model.

**Access:** Admin or Manager role required
**Query Params:** Same as dashboard-summary
**Response:**
```json
[
  {
    "make": "Ford",
    "version": "Transit",
    "year": 2020,
    "total_issues": 45,
    "avg_resolution_time": 15.5,
    "escalation_rate": 12.3,
    "reliability_score": 87.5
  }
]
```

**Error Response (403):**
```json
{
  "error": "Forbidden: Insufficient permissions",
  "required": ["admin", "manager"],
  "current": ["viewer"]
}
```

---

#### GET /api/handoff-patterns
Get patterns of troubleshooting sequence handoffs.

**Access:** Admin or Manager role required
**Query Params:** None (fetches all data)
**Response:**
```json
[
  {
    "from_sequence": "SEQ-001",
    "to_sequence": "SEQ-002",
    "handoff_count": 15,
    "avg_handoff_count": 2.5
  }
]
```

---

### 🔒 Admin Only

#### GET /api/chronic-problem-vans
Get vans with recurring issues.

**Access:** Admin role required
**Query Params:** Same as dashboard-summary
**Response:**
```json
[
  {
    "van_number": "VAN-123",
    "make": "Ford",
    "version": "Transit",
    "year": 2019,
    "issue_count": 8,
    "most_common_issue": "Engine",
    "issue_frequency": 3,
    "last_issue_date": "2025-01-15T10:30:00Z"
  }
]
```

**Error Response (403):**
```json
{
  "error": "Forbidden: Insufficient permissions",
  "required": ["admin"],
  "current": ["manager"]
}
```

---

## Error Responses

### 401 Unauthorized
No valid authentication token provided.

```json
{
  "error": "Authentication required"
}
```

### 403 Forbidden
User doesn't have required role or permission.

```json
{
  "error": "Forbidden: Insufficient permissions",
  "required": ["admin", "manager"],
  "current": ["viewer"]
}
```

### 500 Internal Server Error
Database or server error.

```json
{
  "error": "Database error message"
}
```

---

## Testing with cURL

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}' \
  -c cookies.txt
```

### Access Protected Endpoint
```bash
# Everyone endpoint (works for all authenticated users)
curl -X GET 'http://localhost:3000/api/dashboard-summary?days=7' \
  -b cookies.txt

# Admin + Manager endpoint (fails for viewers)
curl -X GET 'http://localhost:3000/api/van-performance?days=7' \
  -b cookies.txt

# Admin only endpoint (fails for managers and viewers)
curl -X GET 'http://localhost:3000/api/chronic-problem-vans?days=7' \
  -b cookies.txt
```

---

## Access Control Matrix

| Endpoint | Admin | Manager | Viewer |
|----------|-------|---------|--------|
| /api/dashboard-summary | ✅ | ✅ | ✅ |
| /api/issue-distribution | ✅ | ✅ | ✅ |
| /api/resolution-time-trend | ✅ | ✅ | ✅ |
| /api/resolution-by-step | ✅ | ✅ | ✅ |
| /api/first-contact-resolution | ✅ | ✅ | ✅ |
| /api/call-volume-heatmap | ✅ | ✅ | ✅ |
| /api/van-performance | ✅ | ✅ | ❌ |
| /api/handoff-patterns | ✅ | ✅ | ❌ |
| /api/chronic-problem-vans | ✅ | ❌ | ❌ |

---

## Notes

1. **Cookie-based Authentication**: All requests must include the JWT token cookie set during login.

2. **CORS**: The API is configured to accept credentials from:
   - Development: `http://localhost:5173`
   - Production: Value of `CLIENT_URL` environment variable

3. **Token Expiry**: JWT tokens expire after 24 hours. Users must login again after expiry.

4. **Date Range Parameters**:
   - Use `days` for relative ranges (e.g., `days=7` for last 7 days)
   - Use `from` and `to` for absolute ranges (ISO format: `2025-01-01T00:00:00Z`)

5. **Error Handling**: All endpoints return appropriate HTTP status codes:
   - 200: Success
   - 401: Not authenticated
   - 403: Not authorized (wrong role)
   - 500: Server error

6. **Rate Limiting**: Consider implementing rate limiting in production to prevent abuse.
