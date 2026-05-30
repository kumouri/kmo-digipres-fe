# CLAUDE.md — kmo-digipres-fe

Guidance for Claude Code when working in `kmo-digipres-fe`.

## Repository Overview

This is the **admin UI** for [`kmo-digipres-be`](../kmo-digipres-be/), the KMOSF CRM backend — now used by **external tenant administrators** (non-technical business owners), not just KMOSF staff (see "Tenant-admin polish" below). Single-page React app served by Vite. Talks to the backend exclusively over its **`/api/v1`** REST surface (base path set in Phase A; OpenAPI published, `GET /api/v1/auth/discovery` reports the auth mode) using a JWT issued by `POST /api/v1/auth/login`.

The "digipres" / `com.kumouri` naming is historical and shared with the backend. Treat any such references as synonyms for the KMOSF CRM, not a separate product.

For end-user docs (how to run it, env vars, tenant bootstrap), see [`README.md`](README.md). This file is for the engineering conventions.

## On-demand reference files

For the history of what shipped in each build phase, read `.claude/phase-history.md`.
When navigating or adding packages/files, read `.claude/structure.md`.
When writing API calls or understanding FE–BE contracts, read `.claude/backend-integration.md`.
When writing components, queries, forms, or handling errors, read `.claude/conventions.md`.
For what is explicitly out of scope for the current init plan, read `.claude/scope-boundaries.md`.

## Tenant-admin polish (SHIPPED 2026-05-17)

Six-PR program (#23–#27, #29) making the UI tenant-admin-ready. Plan: `~/.claude/plans/now-that-the-kmo-digipres-fe-functional-turtle.md`.

- **Brand:** every user-visible string is "KMO Solutions Foundry" (never "KMO Digipres"/"KMOSF"/repo names); warm-operational copy per the workspace brand-voice guidelines. Login/Dashboard/AppShell/UserMenu de-jargoned.
- **Theme:** class-based light/dark with a no-flash inline script in `packages/admin/index.html`; hand-rolled `app/components/ThemeProvider.tsx` + `ThemeToggle.tsx` (no `next-themes` — deliberate, the homepage's proven pattern). **`packages/admin/src/styles/globals.css` is a vendored copy of the canonical homepage token system (`repos/kmosf-homepage/src/styles/globals.css`)** — separate repos, no shared package; re-sync manually on brand changes (the file's header comment pins the source; same vendoring discipline as the OpenAPI spec).
- **RBAC nav:** `app/auth/roles.ts` (`hasRole`/`isAdmin`) is the single source of truth, reused by the nav filter, the `app/auth/RequireAdmin.tsx` route guard, and the ExpenseDetail check. `NavItem.adminOnly` gates **Field Definitions + Audit Log** only (Reports/Dashboards deliberately ungated). Admin-only routes are grouped under `<RequireAdmin>` (redirects non-admins to `/`).
- **Mobile nav:** `AppShell` has a shared `NavList` (role-filtered) + a `< md` hamburger opening a left slide-over built from the existing Radix `Dialog` primitive (no new dep). Desktop sidebar unchanged.
- **Empty states:** list `emptyMessage`s use a consistent warm "No X yet — <action>." pattern.
- **Mocks/tests:** `SMOKE_STAFF_USER` + token added; `/auth/me` resolves the user from the bearer token. Smoke suite is **84 specs**.
- **Deferred fast-follow:** showing the real tenant *business name* needs a small `kmo-digipres-be` change — add `tenantName` (= `Tenant.displayName`) to `/auth/me` + `LoginResponse`, regen `docs/api/openapi.json`, then FE `npm run gen:api` + expose on `AuthContextValue` + render in `AppShell`. The interim only removed the raw-UUID leak. (Two console-hygiene fixes — timer-query, UserMenu forwardRef — shipped separately in #28.)

## Admin copy & jargon pass (SHIPPED 2026-05-29)

Follow-on to the tenant-admin polish — the deferred **Phase-5a content/voice work**: made every admin surface read like a finished product for a non-technical tenant admin (brand-voice §3.2 warm-operational). Owner-collaborative; voice patterns approved by the owner before implementation. Six domain-scoped PRs, merge-commits, all CI-green: **#32** Core CRM (Contacts/Companies/Activities) · **#33** Billing (Quotes/Invoices) · **#34** Service hub (Tickets/KB/Inbox) · **#35** Projects/Tasks · **#36** Time & Expenses · **#37** Insights & admin (Reports/Dashboards/Field-Defs/Audit/Ask-AI).

- **What changed (user-visible JSX copy only):** dropped "tenant"/"your tenant"/"CRM data" from section helper sentences; replaced developer-note dialog descriptions ("Persisted via `POST /api/…`", "Saves via `PUT …`") with warm one-liners; **"entity" / "CRM entities" → "record"**; de-jargoned "SLA"/"Op"/"Payload"/"(D9)"/"(ISO datetime)" and similar leaks; added the missing Timesheet helper.
- **Status/enum labels — shared display-only map:** `packages/crm-components/src/admin/labels.ts` (`humanize()` + `labelFor()` + per-domain `Record`s). Renders friendly labels for raw enums (`QUALIFIED`→"Qualified", `UNBILLED`→"Not billed", inbox `OPEN`→"Unassigned", `TODO`→"To do", `BOOL`→"Yes / No"). Status-transition buttons read "Mark as <label>". **Display-only — never changes enum values, the API contract, query params, or `data-testid`s.** When a new backend enum surfaces, extend this map rather than printing `RAW_CAPS`.
- **Out of scope (left intact):** empty-state `emptyMessage`s (already standardized); `com.kumouri`/`digipres` identifiers; code comments; `data-testid`s. Smoke stayed **84 specs** (a handful of assertions that keyed on humanized status text were updated in lockstep — e.g. `toContainText("UPDATE")` → `"Updated"`).
- **Known follow-up (data, not copy):** the Activities "Subject" column still shows a raw `subjectId` UUID after the (now-humanized) record type — resolving it to the linked record's name needs a lookup, deferred.

## Phase F: Contracts (SHIPPED 2026-05-30)

Admin UI for the backend contracts vertical (BE Phase F). PR **#40**; smoke 84→101.

| Area | Route | API surface |
|---|---|---|
| Contracts | `/contracts`, `/contracts/:id` | GET/POST/PUT/DELETE /contracts; POST /contracts/:id/send (DRAFT→SENT via Documenso, idempotent); POST /contracts/:id/status (e.g. VOID); GET /contracts/:id/pdf; POST /contracts/quotes/:quoteId/spawn-contract |
| Contract Templates (admin-only, `<RequireAdmin>`) | `/contract-templates`, `/contract-templates/:id` | CRUD /contract-templates — Mustache `bodyTemplate` (plain textarea editor); `kind` MSA/SOW/NDA/OTHER; one active per (tenant, kind) |

- **New value constants** in `types/api.ts`: `CONTRACT_STATUSES` `["DRAFT","SENT","SIGNED","VOIDED"]`, `CONTRACT_KINDS` `["MSA","SOW","NDA","OTHER"]`.
- Lifecycle DRAFT→SENT→SIGNED (SIGNED only via the Documenso webhook, immutable in UI); DRAFT|SENT→VOIDED. Status badge carries `data-testid="contract-status"` (assert via `toHaveText`, not `getByText` — avoids strict-mode collision with "Sent at:" + the success toast).
- **Also healed a pre-existing `main` type-drift** the spec re-sync surfaced: `ActivityDTO` no longer carries `subjectName`; `ActivitiesList.tsx` + the mock store now use `subjectId` (resolves the type half of the "Subject column shows raw id" follow-up; the human-name lookup is still deferred).

## Phase E: Recurring Invoices + Stripe Checkout (SHIPPED 2026-05-30)

Admin UI for the backend recurring-billing + Stripe money-rails vertical (BE Phase E). PR **#41**; smoke 101→116.

| Area | Route | API surface |
|---|---|---|
| Recurring Invoices | `/recurring-invoices`, `/recurring-invoices/:id` | GET/POST/PUT/DELETE /recurring-invoices; POST /recurring-invoices/:id/status (pause/resume/end); POST /recurring-invoices/:id/spawn-now |
| Stripe Checkout | "Generate payment link" on `InvoiceDetail` | POST /invoices/:id/stripe-checkout → copyable Checkout URL |

- **New value constants** in `types/api.ts`: `RECURRING_INVOICE_STATUSES`, `PAYMENT_TERMS`; labels in `admin/labels.ts`.
- Cadence is an RFC-5545 RRULE string (plain text field + hint). Status badge `data-testid="recurring-status"`. Stripe-checkout button `data-testid="invoice-stripe-checkout-btn"`, URL `data-testid="invoice-checkout-url"` (additive on the existing Invoices feature).

## Phase D: Time & Expenses (SHIPPED)

Phase D adds the time-tracking and expense-management vertical:

| Area | Route | API surface |
|---|---|---|
| Timesheet | `/timesheet` | GET /time-entries/weekly?userId=&from=&to=; POST /time-entries; PUT/DELETE /time-entries/:id; POST /time-entries/invoice-from-time |
| Timer widget | Shell header (all routes) | GET /time-entries/timer/running?userId=; POST /time-entries/timer/start; POST /time-entries/timer/stop |
| Expenses | `/expenses`, `/expenses/:id` | CRUD /expenses; POST /expenses/:id/approve; POST /expenses/:id/reject; POST /expenses/invoice-from-expenses |
| Receipt upload | ExpenseDetail | POST /attachments/presign → PUT presigned URL → POST /attachments; GET /attachments?subjectType=EXPENSE&subjectId= |

**New value constants** in `types/api.ts`:
- `TIME_ENTRY_SOURCES`: `["TIMER","MANUAL"]`
- `BILLING_STATUSES`: `["UNBILLED","INVOICED"]`
- `EXPENSE_APPROVAL_STATUSES`: `["PENDING","APPROVED","REJECTED"]`

**Split session rendering**: Time entries that span midnight share a `splitGroupId`. `TimesheetPage` groups them as one logical row (`data-testid="split-group"`) with per-day segments (`data-testid="split-segment"`).

**TimerWidget**: Mounted in the `AppShell` header; persists across route changes. Live elapsed display via client-side `setInterval`; polling the running timer every 30 s. Start/stop invalidates `["timer","running"]` and `["time-entries"]` query keys.

**Receipt upload flow**: FE orchestrates presign → browser PUT to presigned URL → POST /attachments register. No server-side proxy.

**Smoke test count after Phase D**: 66 Phase-C specs + 11 new `time-and-expenses.spec.ts` = 77 total.

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

**Smoke test count after Phase C**: 60 Phase-B specs + 6 new `projects.spec.ts` = 66 total. (Environment note: the local smoke server runs on port 5273 — relocated from Vite's default 5173 because sibling-repo dev servers, e.g. `demo-sites`, squat 5173–5175. CI uses `reuseExistingServer:false`, so it always starts its own server on the configured port; unaffected.)

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

**Remaining deferred (Tier-2)**: Portal auth / Sequences / GDPR compliance (DSR, consent, retention) / Automation / Webhooks / Home-services / QuickBooks / Restaurant / Salon-Spa / Square POS / portal-authenticated components (PortalProfile, PortalInvoices, PortalActivities, SupportTicketForm). Deferred until a client engagement pulls them into scope. (Admin **Stripe Checkout** link generation + **recurring invoices** shipped in Phase E; admin **contracts/templates** in Phase F. The client-facing portal payment surface is still deferred under "portal-authenticated components".)

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
