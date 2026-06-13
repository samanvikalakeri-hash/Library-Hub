---
name: Date serialization rule
description: Why and how serializeDates() must be applied in every API route handler before Zod parsing.
---

# Date serialization in route handlers

## The rule
Every route handler must call `serializeDates(result)` on the Drizzle query result BEFORE passing it to any Zod `.parse()` call.

```typescript
import { serializeDates } from "../lib/serialize";
const raw = await db.select()...;
const parsed = BookSchema.parse(serializeDates(raw));
```

`serializeDates` is a JSON.parse(JSON.stringify(...)) round-trip located at `artifacts/api-server/src/lib/serialize.ts`.

**Why:** Drizzle ORM returns JavaScript `Date` objects for `timestamp` columns (`createdAt`, `checkedOutAt`, `dueDate`, etc.). The Orval-generated Zod schemas expect `string` for these fields (ISO 8601). Passing a `Date` object directly to Zod causes a ZodError and a 500 response.

**How to apply:** Apply to every route that reads from the DB and validates with Zod — GET, POST, PATCH all affected.
