# kmo-digipres-fe

Internal admin UI for [`kmo-digipres-be`](../kmo-digipres-be/), the KMOSF CRM
backend. Single-page React app, Vite-built, Tailwind-styled.

> Naming note: "digipres" / `com.kumouri` references in the backend are
> historical — this is the KMOSF CRM, not a separate product. See the backend
> [`CLAUDE.md`](../kmo-digipres-be/CLAUDE.md) for the full story.

## Status

This repo is being built out under the plan
`init-kmo-digipres-fe` (see
`C:\Users\willa\.claude\plans\init-kmo-digipres-fe-as-the-declarative-candle.md`).
Phase 1 — scaffold — is the current shipping state: empty admin shell with
no auth, no resource pages.

| Phase | Branch suffix                | What lands                                   |
| ----- | ---------------------------- | -------------------------------------------- |
| 1     | `-phase-1-scaffold`          | Vite/React/TS/Tailwind, Router, Playwright   |
| 2     | `-phase-2-auth`              | Login, JWT, protected shell, /auth/me        |
| 3     | `-phase-3-contacts`          | Contacts CRUD + timeline                     |
| 4     | `-phase-4-companies`         | Companies CRUD                               |
| 5     | `-phase-5-deals`             | Deals CRUD + kanban pipeline                 |
| 6     | `-phase-6-activities-email`  | Activities CRUD + send-email composer        |

## Stack

- **Vite 6** · **React 18** · **TypeScript 5** (full strict)
- **Tailwind 4** via `@tailwindcss/vite` — tokens live in
  [`src/styles/globals.css`](src/styles/globals.css) under `@theme`; no
  `tailwind.config.js`
- **shadcn-style primitives** in [`src/app/components/ui/`](src/app/components/ui/)
  (Radix + CVA + `cn()`)
- **React Router 7** (data router)
- **TanStack Query 5** for server state (`useQuery` / `useMutation`)
- **react-hook-form + zod** for forms
- **Playwright** for smoke tests; **MSW** mocks the backend in test mode
- **sonner** for toasts, **lucide-react** for icons

Path alias: `@/` → `./src/app`.

## Local development

```powershell
nvm use            # Node 22 (see .nvmrc)
npm install
cp .env.example .env
npm run dev        # http://localhost:5173
```

Run typecheck and build before pushing:

```powershell
npm run verify     # typecheck + build
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
[`CLAUDE.md`](../../CLAUDE.md). For the current init plan, work on
`init-kmo-digipres-fe-phase-N-<desc>` branches, one PR per phase, and reference
the plan file in each PR description.
