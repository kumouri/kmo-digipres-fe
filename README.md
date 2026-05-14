# kmo-digipres-fe

Internal admin UI for [`kmo-digipres-be`](../kmo-digipres-be/), the KMOSF CRM
backend. Single-page React app, Vite-built, Tailwind-styled.

> Naming note: "digipres" / `com.kumouri` references in the backend are
> historical — this is the KMOSF CRM, not a separate product. See the backend
> [`CLAUDE.md`](../kmo-digipres-be/CLAUDE.md) for the full story.

## Status

The `init-kmo-digipres-fe` plan (phases 1–6) has shipped the admin SPA. The
repo is now an **npm workspace** with two packages:

| Package                  | Path                          | Purpose                                                   |
| ------------------------ | ----------------------------- | --------------------------------------------------------- |
| `@kmosf/crm-admin`       | `packages/admin/`             | The admin SPA (existing UI: login, contacts, deals, etc.) |
| `@kmosf/crm-components`  | `packages/crm-components/`    | Reusable CRM-backed React components (in build-out)       |

The library build-out follows the plan `crm-components-library-init`
(see `C:\Users\willa\.claude\plans\research-standard-components-that-resilient-nova.md`).
Phase 1 — workspace migration — is the current shipping state. The library
is a skeleton; phases 2–4 will lift primitives, admin views, and add public
widgets.

## Stack

- **Vite 6** · **React 18** · **TypeScript 5** (full strict)
- **Tailwind 4** via `@tailwindcss/vite` — tokens live in
  [`packages/admin/src/styles/globals.css`](packages/admin/src/styles/globals.css)
  under `@theme`; no `tailwind.config.js`
- **shadcn-style primitives** in
  [`packages/admin/src/app/components/ui/`](packages/admin/src/app/components/ui/)
  (Radix + CVA + `cn()`) — to be lifted to `@kmosf/crm-components` in phase 2
- **React Router 7** (data router)
- **TanStack Query 5** for server state (`useQuery` / `useMutation`)
- **react-hook-form + zod** for forms
- **Playwright** for smoke tests at the workspace root; **MSW** mocks the
  backend in test mode
- **sonner** for toasts, **lucide-react** for icons
- **npm workspaces** (npm 9+); single root `package-lock.json`; the library
  builds via Vite library mode with `vite-plugin-dts`

Path alias inside `@kmosf/crm-admin`: `@/` → `./src/app` (resolves relative
to `packages/admin/`).

## Local development

All commands run from the **workspace root** unless noted. The root scripts
proxy to `@kmosf/crm-admin`.

```powershell
nvm use            # Node 22 (see .nvmrc)
npm install        # installs all workspaces
cp packages/admin/.env.example packages/admin/.env
npm run dev        # http://localhost:5173 (admin SPA)
```

Run typecheck and build before pushing:

```powershell
npm run typecheck  # runs typecheck across all workspaces
npm run build      # builds @kmosf/crm-admin
npm run verify     # typecheck + build
```

Build just the library:

```powershell
npm run build -w @kmosf/crm-components
```

## Running against the real backend

```powershell
# In a sibling clone of kmo-digipres-be (one-time: have Mongo running locally):
./gradlew bootRun
# Then in this repo:
$env:VITE_USE_MOCKS="false"
npm run dev
```

### Bootstrapping a tenant (one-time)

The backend gates tenant creation behind an `X-Bootstrap-Token` admin header
(see `kmosf.bootstrap.token` in
[`application.properties`](../kmo-digipres-be/src/main/resources/application.properties)).
There is no UI for this — invoke `POST /api/tenants` directly:

```powershell
curl -X POST http://localhost:8080/api/tenants `
  -H "Content-Type: application/json" `
  -H "X-Bootstrap-Token: $env:KMOSF_BOOTSTRAP_TOKEN" `
  -d '{
    "tenantSlug": "kmosf",
    "tenantDisplayName": "KMOSF",
    "adminEmail": "admin@kmosolutionsfoundry.com",
    "adminPassword": "<pick-a-strong-one>",
    "adminDisplayName": "Ceryce Armstrong"
  }'
```

Then log in with those credentials at `/login` (phase 2 onward).

## Smoke tests

Playwright + MSW. Tests run against the dev server with `VITE_USE_MOCKS=true`,
so no backend is required.

```powershell
npm run test:smoke:install   # one-time: install Chromium
npm run test:smoke           # headless
npm run test:smoke:ui        # interactive UI
npm run test:smoke:report    # view last HTML report
```

The smoke suite mirrors the backend's Java integration tests —
[`AuthSmokeIT.java`](../kmo-digipres-be/src/test/java/com/kumouri/kmodigipresbe/auth/AuthSmokeIT.java)
and
[`TenantIsolationIT.java`](../kmo-digipres-be/src/test/java/com/kumouri/kmodigipresbe/tenancy/TenantIsolationIT.java)
— so behavioral coverage stays aligned across the two repos.

## Environment variables

| Name                | Default                          | Used for                                   |
| ------------------- | -------------------------------- | ------------------------------------------ |
| `VITE_API_BASE_URL` | `http://localhost:8080/api`      | Base URL for all backend calls             |
| `VITE_USE_MOCKS`    | `false` (`true` under Playwright) | Bootstraps the MSW worker on app startup   |

## Branching

This repo follows the KMOSF workspace conventions documented in the parent
[`CLAUDE.md`](../../CLAUDE.md). The current active plan is
`crm-components-library-init`; phase branches are named
`crm-components-library-init-phase-N-<desc>`, one PR per phase, with the
plan file referenced in each PR description.
