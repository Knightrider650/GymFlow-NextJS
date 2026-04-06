# Security & Data Isolation

## Authentication & Authorization

### Admin-Only Registration
- **No Self-Registration**: Users cannot self-register through the UI
- **Admin-Controlled Access**: Only gym administrators can create user accounts
- **Credentials**: Admins provide credentials directly to users

### Login Flow
- Users log in with email and password (credentials provided by admin)
- JWT tokens (accessToken & refreshToken) are issued upon successful login
- Tokens are stored in localStorage and sent with every API request
- Invalid or expired tokens trigger automatic logout

## Data Isolation

### Gym-Level Data Separation
Each user is associated with a specific gym. Data isolation is enforced at multiple levels:

#### 1. **Backend API Level** (Primary)
- All API endpoints filter data by the authenticated user's gym
- Users can only access their gym's data:
  - Members in their gym
  - Attendance records for their gym
  - Billing/invoices for their gym
  - Staff assigned to their gym
  - Inventory for their gym
  - Classes offered by their gym

#### 2. **Frontend Level** (Secondary)
- API client includes authentication token with all requests
- Users are automatically redirected to login if tokens expire
- UI components display data filtered by the API response

### API Request Flow
```
1. User logs in → Backend validates credentials
2. Backend checks user's gym association
3. User receives JWT token (contains basic user info)
4. All subsequent requests include Authorization header: `Bearer {token}`
5. Backend verifies token and filters data by user's gym
6. Frontend displays only the data returned by the API
```

## Key Security Measures

### Token Management
- Access tokens are short-lived (configurable)
- Refresh tokens are used to obtain new access tokens
- Tokens are automatically refreshed on 401 responses
- Logout clears all tokens from localStorage

### Data Access Control
```
User A (Gym: GymX) → Can see: GymX members, GymX staff, GymX billing
User B (Gym: GymY) → Can see: GymY members, GymY staff, GymY billing
User A cannot access User B's data (enforced by backend)
User B cannot access User A's data (enforced by backend)
```

### Frontend Authentication Guards
- Protected routes require valid authentication
- Unauthenticated users are redirected to login
- Session data is validated on app startup (`checkAuth`)

## API Integration Points

All data fetches include implicit gym filtering:

```typescript
// Members - only for user's gym
fetchMembers() → GET /api/members (returns user's gym members)

// Attendance - only for user's gym
fetchAttendance() → GET /api/attendance (returns user's gym's attendance)

// Billing - only for user's gym
fetchInvoices() → GET /api/billing (returns user's gym's invoices)

// Staff - only for user's gym
fetchStaff() → GET /api/staff (returns user's gym's staff)

// Inventory - only for user's gym
fetchInventory() → GET /api/inventory (returns user's gym's inventory)

// Classes - only for user's gym
fetchClasses() → GET /api/classes (returns user's gym's classes)
```

## Environment Configuration

API base URL is configured in `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

The backend should implement gym-based access control for all endpoints.

## User Roles

Supported user roles (defined in backend):
- **admin**: Full access to gym management, staff management, and analytics
- **staff**: Access to member management, attendance, and basic operations
- **trainer**: Access to classes, member scheduling, and training records

## Important Notes

1. **Data isolation is enforced on the backend** - Never trust the frontend to enforce security
2. **User's gym must be verified on every API request** - Backend must validate token and gym association
3. **No user can modify gym data they don't belong to** - API must check gym association before allowing modifications
4. **Cross-gym data querying is not possible** - Even with manual URL manipulation, the backend must reject cross-gym requests

## Testing Data Isolation

To test data isolation:
1. Create two separate gym accounts
2. Log in as User A (Gym X)
3. Verify User A can only see Gym X data
4. Log in as User B (Gym Y)
5. Verify User B can only see Gym Y data
6. Attempt to access User A's data as User B (should fail in browser/API)
7. Check network tab to verify API is returning correct filtered data
