# Alexandria — School Library Management System

A full-stack library management system for schools with role-based access (librarian + student), book inventory, loans/transactions, reservations, fines, and ISBN barcode scanning.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at /api)
- `pnpm --filter @workspace/library-app run dev` — run the frontend (proxied at /)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — session signing key

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + express-session
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite, TanStack Query, shadcn/ui, wouter, recharts

## Where things live

- `lib/db/src/schema/` — Drizzle table definitions (books, students, loans, reservations, fines)
- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth for all endpoints)
- `lib/api-client-react/src/generated/` — Generated React Query hooks (do NOT edit by hand)
- `artifacts/api-server/src/routes/` — Express route handlers (books, students, loans, reservations, fines, dashboard, auth)
- `artifacts/api-server/src/lib/serialize.ts` — `serializeDates()` helper; MUST be called on every DB result before Zod parsing
- `artifacts/library-app/src/pages/` — Frontend pages
- `artifacts/library-app/src/lib/auth-context.tsx` — React auth context (useAuth hook)
- `artifacts/library-app/src/hooks/use-debounce.ts` — Debounce hook for search bars

## Architecture decisions

- **Date serialization**: All DB results run through `serializeDates()` (JSON.parse/stringify) before Zod parsing. Drizzle returns `Date` objects; Zod schemas expect ISO strings. This must be applied in every route handler.
- **Empty strings → null**: Optional fields (phone, description, publisher) are coerced to `null` when empty before DB insert.
- **Session auth**: express-session with `SESSION_SECRET` env var. Librarian: username/password. Student: studentId lookup (no separate password — studentId IS the credential).
- **Contract-first**: OpenAPI spec → Orval codegen → typed hooks. Never hand-edit generated files. Run `pnpm --filter @workspace/api-spec run codegen` after spec changes.
- **Search debounce**: All search bars use `useDebounce(search, 300)` to avoid flooding the API on every keystroke.

## Product

- **Librarian role**: Dashboard with stats/charts, Book Inventory (CRUD), Student Roster (CRUD), Transaction Details (loans/returns), Reservations management, Fines tracking, Student Catalog view, ISBN Barcode Scanner (QR/camera)
- **Student role**: Book Catalog (search/reserve), My Account (borrowed books with due dates, fines, reservation history)
- **Login**: `/login` page with Librarian tab (username + password) and Student tab (student ID). Default librarian: `librarian` / `library123`. Students log in with their student ID (e.g. `STU001`).

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always call `serializeDates()` on DB results before Zod `.parse()` in every route handler.
- Do NOT run `pnpm dev` at workspace root — use `restart_workflow` instead.
- Student login uses the `studentId` field (e.g. `STU001`, `STU008`) NOT their name or email.
- Generated hooks are in `lib/api-client-react/src/generated/` — re-run codegen after OpenAPI spec changes.
- `pnpm --filter @workspace/api-spec run codegen` deletes and recreates generated files; this causes brief HMR errors in Vite that resolve on their own.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
