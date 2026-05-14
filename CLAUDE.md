# CLAUDE.md

Guidance for Claude Code (and future me) when working in `kmo-digipres-fe`.

## Repository Overview

This is the **internal admin UI** for [`kmo-digipres-be`](../kmo-digipres-be/),
the KMOSF CRM backend. Single-page React app served by Vite. Talks to the
backend exclusively over its `/api` REST surface using a JWT issued by
`POST /auth/login`.

The "digipres" / `com.kumouri` naming is historical and shared with the
backend. Treat any such references as synonyms for the KMOSF CRM, not a
separate product.

For end-user docs (how to run it, env vars, tenant bootstrap), see
[`README.md`](README.md). This file is for the engineering conventions.

## Plan-driven development

The current build-out follows a single plan, `init-kmo-digipres-fe`, stored at
`C:\Users\willa\.claude\plans\init-kmo-digipres-fe-as-the-declarative-candle.md`.
It is split into six phases — one PR per phase, scope as documented there:

1. `init-kmo-digipres-fe-phase-1-scaffold` — Vite/React/TS/Tailwind, Router, Playwright
2. `init-kmo-digipres-fe-phase-2-auth` — Login, JWT, protected shell, `/auth/me`
3. `init-kmo-digipres-fe-phase-3-contacts` — Contacts CRUD + timeline
4. `init-kmo-digipres-fe-phase-4-companies` — Companies CRUD
5. `init-kmo-digipres-fe-phase-5-deals` — Deals CRUD + kanban
6. `init-kmo-digipres-fe-phase-6-activities-email` — Activities CRUD + email composer

After phase 6, switch to `feat/<desc>` or `fix/<desc>` for unplanned work and
spin up a new `<plan-slug>` for any larger initiative. See the workspace
[`CLAUDE.md`](../../CLAUDE.md) for the full convention.

## Stack

- **Vite 6** · **React 18** · **TypeScript 5** (full strict — `noUnusedLocals`,
  `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`)
- **Tailwind 4** via `@tailwindcss/vite` (no `tailwind.config.js`; tokens in
  [`src/styles/globals.css`](src/styles/globals.css) via `@theme`)
- **shadcn-style primitives** in [`src/app/components/ui/`](src/app/components/ui/) —
  Radix UI under the hood, composed with CVA + `cn()` (clsx + tailwind-merge)
- **React Router 7** (data router via `createBrowserRouter`)
- **TanStack Query 5** owns server state
- **react-hook-form + zod + @hookform/resolvers** for forms
- **Playwright + MSW** for smoke tests; no live backend required in CI
- **sonner** for toasts, **lucide-react** for icons
- **Node 22** pinned in `.nvmrc`

Path alias: `@/` → `./src/app`. Use it for cross-cutting imports
(`@/components/ui/button`, `@/api/contacts`, etc.); relative imports are fine
within a single feature folder.

## Folder layout

```
src/
├── main.tsx
├── styles/globals.css
└── app/
    ├── App.tsx                  # QueryClientProvider + RouterProvider + Toaster
    ├── router.tsx               # createBrowserRouter([...routes])
    ├── api/                     # client.ts + one file per backend resource
    ├── auth/                    # AuthProvider, useAuth, ProtectedRoute (phase 2)
    ├── components/
    │   ├── AppShell.tsx         # sidebar + topnav (phase 2)
    │   ├── UserMenu.tsx         # (phase 2)
    │   ├── DataTable.tsx        # (phase 3)
    │   └── ui/                  # shadcn primitives
    ├── pages/                   # one folder per resource (phase 3+)
    └── types/api.ts             # TS mirror of backend DTOs

tests/
├── smoke.spec.ts                # Playwright suite — mirrors AuthSmokeIT.java
└── mocks/handlers.ts            # MSW handlers, grow per phase
```

## Working with the backend

The backend is the **source of truth for DTO shapes**. When the backend's
`model/request/*DTO.java` files change, update [`src/app/types/api.ts`](src/app/types/api.ts)
to match — field names, types, optionality. Don't infer types from runtime
responses; read the Java.

Endpoints rooted at `http://localhost:8080/api` (CORS pre-configured for
`localhost:5173`). JWT goes in `Authorization: Bearer <token>`. The 12-hour
TTL means session loss on a long break is normal — `/auth/me` validates on
mount, and a `401` from any call broadcasts a `kmosf:unauthorized` window
event that forces logout.

### Behavioral spec

The closest thing to a contract test for what the frontend must do is the
backend's Spring integration tests:

- [`AuthSmokeIT.java`](../kmo-digipres-be/src/test/java/com/kumouri/kmodigipresbe/auth/AuthSmokeIT.java)
  — unauthed `GET /contacts` returns 401, login returns a JWT, the JWT unlocks
  `/contacts` and `/auth/me`, wrong password returns 401.
- [`TenantIsolationIT.java`](../kmo-digipres-be/src/test/java/com/kumouri/kmodigipresbe/tenancy/TenantIsolationIT.java)
  — tenant A cannot read tenant B's data; cannot save into a foreign tenant.

The Playwright smoke suite should mirror those flows where they apply to the
UI. Tenant isolation isn't directly testable from the FE (we only ever have
one JWT in flight) but the principle informs the MSW handlers: never let
mocked endpoints return cross-tenant data.

## Conventions

- **TanStack Query keys:** `[resource]` for collections, `[resource, id]` for
  detail, `[resource, id, "sub"]` for nested (e.g. `["contacts", id, "timeline"]`).
  Invalidate the smallest key that covers the change.
- **Mutations** generally invalidate the relevant list query and any detail
  query they touched. Pipeline `moveDealStage` uses optimistic updates via
  `onMutate` / `onError` rollback (phase 5).
- **Forms** are `react-hook-form` + `zod`. Co-locate the schema with the form
  component; use `@hookform/resolvers/zod`. Submit handlers call API functions
  directly; surface errors with `toast.error(error.message)` from sonner.
- **Error handling:** the backend has no error envelope yet — exceptions
  bubble as 500s. The API client throws `ApiError(status, message)`. UI
  layers should catch and toast; don't try to interpret 5xx bodies.
- **No drag-and-drop in phase 5.** Pipeline uses explicit move buttons; revisit
  DnD in a polish pass.
- **No pagination/server-side filtering yet.** Backend returns `Flux<DTO>`
  unbounded. Revisit when any list crosses ~500 rows.
- **MSW only loads when `VITE_USE_MOCKS=true`.** Production builds skip it
  entirely. The Playwright `webServer.env` sets it to `true` automatically.
- **Lint:** `tsc --noEmit` covers correctness. No ESLint/Prettier yet — add
  one when the codebase has real friction without it, not before.

## Out of scope (for the init plan)

- Tenant bootstrap UI — README documents the curl invocation, no in-app flow.
- Dark mode — phase 1 ships light only. Reintroduce `next-themes` once the
  surface area is stable.
- Cloudflare/Wrangler deploy pipeline — the sibling `kmosf-homepage` repo uses
  one, but admin UIs likely deploy behind auth on a different surface and
  haven't picked a target yet.
- A response-envelope ergonomic layer over the backend's bare 500s — wait until
  the backend lands a `@ControllerAdvice`.
