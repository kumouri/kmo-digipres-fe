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

`init-kmo-digipres-fe` (six phases, scaffold → auth → contacts → companies →
deals → activities+email) is complete. The repo is now driven by the
`crm-components-library-init` plan, stored at
`C:\Users\willa\.claude\plans\research-standard-components-that-resilient-nova.md`.
It converts this repo into an npm workspace and extracts a reusable CRM
component library. Phases — one PR per phase:

1. `crm-components-library-init-phase-1-workspace-migration` — split into
   `packages/admin` (existing SPA) + `packages/crm-components` (skeleton)
2. `crm-components-library-init-phase-2-primitives-and-api-client` — lift
   shadcn primitives, `types/api.ts`, and the DI-friendly `createCrmClient`
   into the library
3. `crm-components-library-init-phase-3-admin-views` — lift the contact /
   company / deal / activity page components, decouple from `useNavigate` /
   `useAuth`
4. `crm-components-library-init-phase-4-public-widgets` — `<BookingWidget>`,
   `<PublicContactForm>` (latter gated on Phase 5)
5. `feat/public-contacts-endpoint` (in `kmo-digipres-be`, dispatched by
   sub-agent) — `POST /public/{tenantSlug}/contacts` unlocking
   `<PublicContactForm>`

Tier-2 portal-authenticated components (PortalProfile, PortalInvoices,
PortalActivities, NewsletterSignup, SupportTicketForm) are tracked in the
plan but deferred until a client engagement pulls them into scope.

For unplanned fixes outside any plan, use `feat/<desc>` or `fix/<desc>`.
See the workspace [`CLAUDE.md`](../../CLAUDE.md) for the full convention.

## Stack

- **Vite 6** · **React 18** · **TypeScript 5** (full strict — `noUnusedLocals`,
  `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`)
- **Tailwind 4** via `@tailwindcss/vite` (no `tailwind.config.js`; tokens in
  [`packages/admin/src/styles/globals.css`](packages/admin/src/styles/globals.css)
  via `@theme`)
- **shadcn-style primitives** in
  [`packages/admin/src/app/components/ui/`](packages/admin/src/app/components/ui/)
  — Radix UI under the hood, composed with CVA + `cn()` (clsx + tailwind-merge).
  Slated to move to `packages/crm-components/src/primitives/` in phase 2.
- **React Router 7** (data router via `createBrowserRouter`)
- **TanStack Query 5** owns server state
- **react-hook-form + zod + @hookform/resolvers** for forms
- **Playwright + MSW** for smoke tests at the workspace root; no live backend
  required in CI
- **sonner** for toasts, **lucide-react** for icons
- **npm workspaces** (npm 9+) — single root `package-lock.json`; root scripts
  proxy to `@kmosf/crm-admin` for `dev` / `build` / `typecheck`. Library
  build uses Vite library mode + `vite-plugin-dts`.
- **Node 22** pinned in `.nvmrc`

Path alias **inside `@kmosf/crm-admin`**: `@/` → `./src/app`. Use it for
cross-cutting imports within the admin SPA (`@/components/ui/button`,
`@/api/contacts`, etc.). The library does not use a path alias; relative
imports within `packages/crm-components/src/` are fine.

## Folder layout

```
.                                  # workspace root
├── package.json                   # workspace metadata + proxy scripts
├── package-lock.json              # single root lockfile (npm workspaces)
├── playwright.config.ts           # webServer points at @kmosf/crm-admin
├── tests/
│   └── smoke.spec.ts              # Playwright suite — mirrors AuthSmokeIT.java
└── packages/
    ├── admin/                     # @kmosf/crm-admin (the existing SPA)
    │   ├── package.json
    │   ├── vite.config.ts
    │   ├── tsconfig.{json,app.json,node.json}
    │   ├── index.html
    │   ├── .env.example
    │   ├── public/
    │   │   └── mockServiceWorker.js
    │   └── src/
    │       ├── main.tsx
    │       ├── styles/globals.css
    │       ├── mocks/             # MSW handlers + browser worker
    │       └── app/
    │           ├── App.tsx        # QueryClientProvider + RouterProvider
    │           ├── router.tsx
    │           ├── api/           # client.ts + per-resource fetchers
    │           ├── auth/          # AuthProvider, useAuth, ProtectedRoute
    │           ├── components/    # AppShell, UserMenu, DataTable, ui/
    │           ├── pages/         # one folder per resource
    │           └── types/api.ts   # TS mirror of backend DTOs (moves in phase 2)
    └── crm-components/            # @kmosf/crm-components (library)
        ├── package.json           # exports ./src/index.ts; vite-lib build target
        ├── vite.config.ts         # library mode + vite-plugin-dts
        ├── tsconfig.json
        └── src/
            └── index.ts           # currently empty; populated in phases 2–4
```

## Working with the backend

The backend is the **source of truth for DTO shapes**. When the backend's
`model/request/*DTO.java` files change, update
[`packages/admin/src/app/types/api.ts`](packages/admin/src/app/types/api.ts)
to match — field names, types, optionality. Don't infer types from runtime
responses; read the Java. (Phase 2 moves this file to
`packages/crm-components/src/types/api.ts`; this CLAUDE.md will update then.)

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
