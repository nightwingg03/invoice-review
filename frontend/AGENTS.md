# Frontend AGENTS.md

Developer reference for the `frontend/` package.

## Stack

| Tool | Version | Role |
|---|---|---|
| Vite | 8 | Build tool + dev server |
| React | 19 | UI framework |
| TypeScript | 6 (strict) | Type safety |
| Tailwind CSS | 4 | Utility-first styling |
| React Router | 7 | Client-side routing |
| pnpm | 11 | Package manager |

## Preferred conventions

### API client

All HTTP calls go through `src/lib/api.ts`. **Never call `fetch` directly from a component.**

```ts
import { listDocuments } from '../lib/api'
```

Types for all shapes live in `src/lib/types.ts` — keep them in sync with the FastAPI schemas in `backend/app/documents/schemas.py`.

The base URL is resolved once in `src/lib/env.ts` from `VITE_API_BASE_URL`. Local dev uses `http://localhost:8000`. Container builds set it to `/` for same-origin fetches.

### Component rules

- **No business logic in components.** Components call API functions and display results.
- Use Tailwind utility classes directly — no CSS modules, no `style` props.
- Prefer `className` over inline styles for everything.
- Use the `StatusBadge` component for all status displays.

### File layout

```
src/
  lib/           ← env, types, api (no React)
  components/    ← shared presentational components
  pages/         ← one file per route
  App.tsx        ← route definitions only
  main.tsx       ← React root + BrowserRouter
  index.css      ← Tailwind import + base styles
```

### Routing

Three routes, all wrapped in `<Layout>`:

| Path | Component |
|---|---|
| `/` | `UploadPage` |
| `/documents` | `DocumentsPage` |
| `/documents/:id` | `DocumentDetailPage` |

### Dev server

From the repo root:

```bash
npm run dev          # starts API (port 8000) + UI (port 5173) together
```

Or individually:

```bash
# Frontend only
cd frontend && pnpm dev

# Backend only (from repo root)
uv run --project backend python -m uvicorn app.main:app --reload --app-dir backend
```

### TypeScript

Strict mode is enabled. Never use `any` — use `unknown` and narrow with type guards.
