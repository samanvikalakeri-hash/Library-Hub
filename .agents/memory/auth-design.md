---
name: Auth design
description: How session-based auth works for librarian and student roles in Alexandria.
---

# Authentication design

## Approach
express-session with SESSION_SECRET env var (already provisioned). No bcrypt — student login uses their studentId as the sole credential.

## Librarian login
- Username: `librarian` (or `LIBRARIAN_USERNAME` env var)
- Password: `library123` (or `LIBRARIAN_PASSWORD` env var)
- Session: `{ userId: "librarian-1", role: "librarian", name: "Head Librarian" }`

## Student login
- Credential: `studentId` field (e.g. `STU001`, `STU008`) — looked up in the `students` table
- No separate users/passwords table — the student record IS the account
- Session: `{ userId: "student-<id>", role: "student", name: student.name, studentRecordId: student.id }`

## Frontend auth context
`artifacts/library-app/src/lib/auth-context.tsx` — `AuthProvider` wraps the app, fetches `/api/auth/me` on mount to restore session. `useAuth()` hook exposes `{ user, loading, login, logout }`.

**Why:** Keeps the demo simple without a separate users table or password hashing. Easy for a school librarian to manage.

**How to apply:** Student role shows limited sidebar (Book Catalog, My Account). Librarian gets full access. Unknown/unauthenticated users are redirected to `/login`.
