# Frontend Role-Based Access Control

## Overview

The VanSupport Dashboard dynamically shows or hides features based on the user's assigned roles. This provides a better user experience by:
- Not displaying features the user cannot access
- Avoiding failed API calls for unauthorized endpoints
- Creating role-specific dashboard experiences

## Role-Based Visibility

### 🔓 Visible to Everyone (All Authenticated Users)

These features are visible to all users (admin, manager, viewer):

- **Dashboard Summary Cards**
  - Total Calls
  - Completion Rate
  - Average Resolution Time

- **Issue Distribution** (Pie Chart)
- **Resolution Time Trend** (Line Chart)
- **First Contact Resolution Rate** (Bar Chart)
- **Call Volume Heatmap**
- **Resolution by Step** (Bar Chart with Sequence Selector)

### 🔐 Admin + Manager Only

These advanced analytics require admin or manager role:

- **Van Performance Table**
  - Shows performance metrics by van make/model/year
  - Includes reliability scores and escalation rates

- **Handoff Patterns Table**
  - Shows troubleshooting sequence handoff patterns
  - Helps identify common escalation paths

### 🔒 Admin Only

Sensitive data requiring admin role:

- **Chronic Problem Vans Table**
  - Identifies vans with recurring issues
  - Shows issue frequency and patterns
  - Critical for fleet management decisions

## Implementation Details

### Conditional Data Fetching

The dashboard intelligently fetches only the data the user can access:

```javascript
// Everyone gets these endpoints
const fetchPromises = [
  fetch('/api/dashboard-summary'),
  fetch('/api/issue-distribution'),
  fetch('/api/resolution-time-trend'),
  fetch('/api/first-contact-resolution'),
  fetch('/api/call-volume-heatmap'),
  fetch('/api/resolution-by-step'),
];

// Add admin+manager endpoints
if (hasRole('admin') || hasRole('manager')) {
  fetchPromises.push(
    fetch('/api/van-performance'),
    fetch('/api/handoff-patterns')
  );
}

// Add admin-only endpoints
if (hasRole('admin')) {
  fetchPromises.push(
    fetch('/api/chronic-problem-vans')
  );
}
```

### Conditional Rendering

Components are wrapped with role checks:

```javascript
{/* Only admins and managers see Van Performance */}
{(hasRole('admin') || hasRole('manager')) && (
  <div style={{ marginBottom: "2rem" }}>
    <h2>Van Performance</h2>
    <VanPerformanceTable data={vanPerformance} />
  </div>
)}

{/* Only admins see Chronic Problem Vans */}
{hasRole('admin') && (
  <div style={{ marginBottom: "2rem" }}>
    <h2>Chronic Problem Vans</h2>
    <ChronicProblemVansTable data={chronicProblemVans} />
  </div>
)}
```

## User Experience by Role

### Viewer Dashboard

**Visible Components:**
- ✅ Dashboard Summary (3 cards)
- ✅ Issue Distribution Chart
- ✅ Resolution Time Trend Chart
- ✅ First Contact Resolution Chart
- ✅ Call Volume Heatmap
- ✅ Resolution by Step Chart
- ❌ Van Performance Table
- ❌ Handoff Patterns Table
- ❌ Chronic Problem Vans Table

**User sees:** Basic analytics for viewing support metrics.

---

### Manager Dashboard

**Visible Components:**
- ✅ Dashboard Summary (3 cards)
- ✅ Issue Distribution Chart
- ✅ Resolution Time Trend Chart
- ✅ First Contact Resolution Chart
- ✅ Call Volume Heatmap
- ✅ Resolution by Step Chart
- ✅ **Van Performance Table**
- ✅ **Handoff Patterns Table**
- ❌ Chronic Problem Vans Table

**User sees:** All analytics plus advanced fleet performance insights.

---

### Admin Dashboard

**Visible Components:**
- ✅ Dashboard Summary (3 cards)
- ✅ Issue Distribution Chart
- ✅ Resolution Time Trend Chart
- ✅ First Contact Resolution Chart
- ✅ Call Volume Heatmap
- ✅ Resolution by Step Chart
- ✅ Van Performance Table
- ✅ Handoff Patterns Table
- ✅ **Chronic Problem Vans Table**

**User sees:** Complete dashboard with all features including sensitive fleet data.

## Benefits

### 1. Improved Performance
- Fewer API calls (only fetches authorized data)
- Faster page loads for users with limited access
- Reduced server load

### 2. Better UX
- Clean interface showing only relevant features
- No confusing 403 errors
- Role-appropriate dashboard layout

### 3. Enhanced Security
- No data leakage through UI
- Clear visual indication of access levels
- Prevents unauthorized access attempts

### 4. Graceful Degradation
- Dashboard works perfectly for all role levels
- Each role sees a complete, polished experience
- No broken or missing sections

## Testing Role-Based UI

### Test as Viewer

1. Login with viewer credentials
2. Verify you see:
   - Basic charts and summary cards
   - ✅ All "everyone" features
3. Verify you DON'T see:
   - ❌ Van Performance table
   - ❌ Handoff Patterns table
   - ❌ Chronic Problem Vans table

### Test as Manager

1. Login with manager credentials
2. Verify you see:
   - ✅ All "everyone" features
   - ✅ Van Performance table
   - ✅ Handoff Patterns table
3. Verify you DON'T see:
   - ❌ Chronic Problem Vans table

### Test as Admin

1. Login with admin credentials
2. Verify you see:
   - ✅ ALL features including Chronic Problem Vans

## Code Reference

### Files Modified

- **[App.jsx](dashboard/src/App.jsx)**: Main dashboard component
  - Lines 58-162: Conditional data fetching
  - Lines 648-811: Van Performance (admin+manager)
  - Lines 814-1009: Chronic Problem Vans (admin)
  - Lines 1012-1177: Handoff Patterns (admin+manager)

### Using the useAuth Hook

```javascript
import { useAuth } from './hooks/useAuth.jsx';

function MyComponent() {
  const { hasRole, hasAnyRole } = useAuth();

  return (
    <div>
      {/* Check single role */}
      {hasRole('admin') && <AdminOnlyFeature />}

      {/* Check multiple roles */}
      {hasAnyRole(['admin', 'manager']) && <AdvancedFeature />}
    </div>
  );
}
```

## Future Enhancements

Consider adding:
- [ ] Loading skeletons for role-specific sections
- [ ] Tooltips explaining why features are hidden
- [ ] Role upgrade prompts for limited users
- [ ] Analytics on feature usage by role
- [ ] Custom dashboard layouts per role
- [ ] Exportable permission matrices

## Troubleshooting

### Feature Not Showing Up

**Problem:** A user with correct role doesn't see expected features.

**Check:**
1. User roles in database: `SELECT * FROM user_roles_view WHERE email = 'user@example.com'`
2. JWT token contains roles: Check browser DevTools → Application → Cookies
3. `hasRole` function working: Add `console.log(user?.roles)` in component
4. Conditional rendering logic correct: Check App.jsx around the feature

### Feature Showing When It Shouldn't

**Problem:** User without role sees restricted feature.

**Check:**
1. Conditional rendering wraps entire feature block
2. No duplicate feature renders without role check
3. User actually doesn't have the role (check database)
4. Browser cache cleared (old code cached)

### API 403 Errors Still Happening

**Problem:** Getting 403 Forbidden despite conditional fetching.

**Check:**
1. Role check in fetch logic matches component rendering
2. User's JWT token is current (not expired)
3. Backend role requirements match frontend checks
4. No hardcoded API calls bypassing conditional logic

## Summary

The frontend now provides a seamless, role-appropriate experience:
- **Viewers** see essential analytics
- **Managers** see advanced fleet insights
- **Admins** see everything including sensitive data

No failed API calls, no broken features, just a clean dashboard tailored to each user's access level!
