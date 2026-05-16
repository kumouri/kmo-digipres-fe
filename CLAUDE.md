# CLAUDE.md — kmo-digipres-fe

Guidance for Claude Code when working in `kmo-digipres-fe`.

## Repository Overview

This is the **internal admin UI** for [`kmo-digipres-be`](../kmo-digipres-be/), the KMOSF CRM backend. Single-page React app served by Vite. Talks to the backend exclusively over its **`/api/v1`** REST surface (base path set in Phase A; OpenAPI published, `GET /api/v1/auth/discovery` reports the auth mode) using a JWT issued by `POST /api/v1/auth/login`.

The "digipres" / `com.kumouri` naming is historical and shared with the backend. Treat any such references as synonyms for the KMOSF CRM, not a separate product.

For end-user docs (how to run it, env vars, tenant bootstrap), see [`README.md`](README.md). This file is for the engineering conventions.

## On-demand reference files

For the history of what shipped in each build phase, read `.claude/phase-history.md`.
When navigating or adding packages/files, read `.claude/structure.md`.
When writing API calls or understanding FE–BE contracts, read `.claude/backend-integration.md`.
When writing components, queries, forms, or handling errors, read `.claude/conventions.md`.
For what is explicitly out of scope for the current init plan, read `.claude/scope-boundaries.md`.

## Phase C: Projects / Milestones / Tasks (SHIPPED)

Phase C adds the project-delivery vertical on top of the Phase B baseline:

| Area | Route | API surface |
|---|---|---|
| Projects | `/projects`, `/projects/:id` | GET/POST/PUT/DELETE /projects; POST /projects/:id/status; POST /projects/from-deal/:dealId (Deal→Project, idempotent 201/200) |
| Milestones (sub) | Detail tabs | GET/POST /milestones/by-project/:id; GET/PUT/DELETE /milestones/:id; POST /milestones/:id/transition?status=COMPLETED (spawns DRAFT invoice if triggersInvoiceOnComplete=true) |
| Tasks (kanban) | Detail Tasks tab | GET/POST /tasks/by-project/:id; PUT/DELETE /tasks/:id; POST /tasks/:id/status?target= |
| Deal → Project | DealDetail (WON only) | "Convert to Project" button → POST /projects/from-deal/:dealId |

**New value constants** in `types/api.ts`:
- `PROJECT_STATUSES`: `["PLANNING","ACTIVE","ON_HOLD","COMPLETED","CANCELLED"]`
- `MILESTONE_STATUSES`: `["PENDING","IN_PROGRESS","COMPLETED"]`
- `TASK_STATUSES`: `["TODO","IN_PROGRESS","BLOCKED","DONE"]` — the kanban columns
- `TASK_PRIORITIES`: `["LOW","MEDIUM","HIGH","URGENT"]`

**Smoke test count after Phase C**: 60 Phase-B specs + 6 new `projects.spec.ts` = 66 total. (Environment note: port-5173 collision with another dev server on the dev machine causes all specs to fail locally; pre-existing on `main`. CI runs on a clean server; no conflict expected there.)

**Type generation** (unchanged): `npm run gen:api` copies updated BE spec → vendored `openapi/openapi.json` → regenerates `types/openapi.ts`; `npm run gen:api:check` exits 0. Run after any BE spec update.

## Phase B: FE feature parity (SHIPPED)

Phase B shipped the following 9 new admin areas on top of the Phase A baseline (Contacts, Companies, Deals, Activities):

| Area | Route | API surface |
|---|---|---|
| Quotes | `/quotes`, `/quotes/:id` | GET/POST/PUT/DELETE /quotes; POST /quotes/:id/status; GET /quotes/:id/pdf |
| Invoices | `/invoices`, `/invoices/:id` | CRUD; POST /invoices/from-quote/:quoteId; POST /invoices/:id/status; GET/POST /invoices/:id/payments |
| Tickets | `/tickets`, `/tickets/:id` | CRUD; POST /tickets/:id/transition; GET/POST /tickets/:id/comments |
| Knowledge Base | `/knowledge-base`, `/knowledge-base/:id` | CRUD; POST /knowledge-base/articles/:id/publish; POST /knowledge-base/search |
| Inbox | `/inbox`, `/inbox/:id` | GET /inbox/threads; GET/POST /inbox/threads/:id/messages; POST /inbox/threads/:id/claim |
| Field Definitions | `/field-definitions`, `/field-definitions/:id` | CRUD /admin/field-definitions |
| Audit Log | `/audit` | GET /audit; GET /audit/by-actor/:userId |
| Reports + Dashboards | `/reports`, `/reports/:id`, `/dashboards`, `/dashboards/:id` | CRUD /reports/saved; POST /reports/saved/:id/run; CRUD /reports/dashboards |
| AI-assist | AskAiDialog in header | POST /ai/ask; POST /ai/summarize-timeline; POST /ai/draft-reply |

**Type generation**: OpenAPI types are now generated via `npm run gen:api` from the vendored spec at `packages/crm-components/openapi/openapi.json`. Types live in `packages/crm-components/src/types/openapi.ts` (auto-generated, do not edit) and are re-exported via alias shims in `packages/crm-components/src/types/api.ts`. Run `npm run gen:api:check` to detect drift between the vendored spec and generated types (used in CI).

**Base URL**: `/api/v1` (set in `packages/admin/src/app/api/client.ts` line 12; MSW handlers use same constant in `handlers.ts`).

**Remaining deferred (Tier-2)**: Stripe / Portal auth / Sequences / GDPR compliance (DSR, consent, retention) / Automation / Webhooks / Home-services / QuickBooks / Restaurant / Salon-Spa / Square POS / portal-authenticated components (PortalProfile, PortalInvoices, PortalActivities, SupportTicketForm). Deferred until a client engagement pulls them into scope.

When adding new resource pages, derive `types/api.ts` types from the generated `openapi.ts` aliases (`components["schemas"]["X"]`), not from runtime responses. Use hand-written narrow interfaces only when generated types are too permissive for strict call sites.

For unplanned fixes outside any plan, use `feat/<desc>` or `fix/<desc>`. See the workspace [`CLAUDE.md`](../../CLAUDE.md) for the full convention.

## Stack

- **Vite 6** · **React 18** · **TypeScript 5** (full strict — `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`)
- **Tailwind 4** via `@tailwindcss/vite` (no `tailwind.config.js`; tokens in `packages/admin/src/styles/globals.css` via `@theme`)
- **shadcn-style primitives** in `packages/admin/src/app/components/ui/` — Radix UI under the hood, composed with CVA + `cn()` (clsx + tailwind-merge)
- **React Router 7** (data router via `createBrowserRouter`)
- **TanStack Query 5** owns server state
- **react-hook-form + zod + @hookform/resolvers** for forms
- **Playwright + MSW** for smoke tests at the workspace root; no live backend required in CI
- **sonner** for toasts, **lucide-react** for icons
- **npm workspaces** (npm 9+) — single root `package-lock.json`; root scripts proxy to `@kmosf/crm-admin` for `dev` / `build` / `typecheck`
- **Node 22** pinned in `.nvmrc`

Path alias **inside `@kmosf/crm-admin`**: `@/` → `./src/app`. The library does not use a path alias; relative imports within `packages/crm-components/src/` are fine.
