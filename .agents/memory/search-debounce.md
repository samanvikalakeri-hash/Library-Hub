---
name: Search debounce pattern
description: How search bars are wired to avoid flooding the API on each keystroke.
---

# Search debounce pattern

## Implementation
`artifacts/library-app/src/hooks/use-debounce.ts` — simple `useEffect` + `setTimeout` debounce hook.

## Usage in pages
```typescript
const [search, setSearch] = useState("");
const debouncedSearch = useDebounce(search, 300);
const { data } = useListBooks({ search: debouncedSearch });
```

The raw `search` state drives the input value (instant). The `debouncedSearch` (300ms delayed) is passed to the API hook, triggering a refetch only after the user pauses typing.

**Why:** TanStack Query treats any param change as a new query key and fetches immediately. Without debounce, each keystroke sends a new API request.

**How to apply:** Any page with a live search input should use this pattern — books, students, catalog pages all follow it.
