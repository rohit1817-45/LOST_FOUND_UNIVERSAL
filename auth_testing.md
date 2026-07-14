# Auth-Gated App Testing Playbook (ULFN)

The app supports TWO auth flows that must both be tested:
1. **JWT email/password** — POST `/api/auth/register`, POST `/api/auth/login` → returns `{ token, user }`. Send `Authorization: Bearer <token>` on subsequent requests.
2. **Emergent Google OAuth** — user clicks "Continue with Google" → redirects to `https://auth.emergentagent.com/?redirect=<origin>/auth/callback` → returns with `#session_id=...` → frontend POSTs to `/api/auth/oauth/session` (with credentials) → backend calls Emergent to fetch profile, creates/loads user, sets httpOnly `session_token` cookie.

## Test User Setup (bypass for testing agent)

For automated testing the testing agent can create a session directly in Mongo:

```bash
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  role: 'user',
  auth_provider: 'test',
  picture: 'https://via.placeholder.com/150',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Testing Bypass (email/password)
The app also supports simple JWT email/password. Test accounts (seeded on backend startup):
- `demo@ulfn.app` / `Demo1234!` — role: user
- `ngo@ulfn.app` / `Demo1234!` — role: ngo (approved)
- `police@ulfn.app` / `Demo1234!` — role: police (approved)
- `admin@ulfn.app` / `Demo1234!` — role: admin

Testing agent should prefer these credentials for a stable flow.

## Endpoints to verify

```bash
# Email/password login
curl -X POST "$BACKEND_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@ulfn.app","password":"Demo1234!"}'

# Get self using Bearer token
curl "$BACKEND_URL/api/auth/me" -H "Authorization: Bearer $TOKEN"

# List cases
curl "$BACKEND_URL/api/cases?limit=10"
```

## Success indicators
- `/api/auth/me` returns user data with `user_id`, `email`, `role`
- Protected endpoints accept both cookie `session_token` and `Authorization: Bearer <jwt>`
- Role-restricted endpoints return 403 for wrong roles
