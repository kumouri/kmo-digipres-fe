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

## The backend is significantly further ahead

The backend has Quote / Invoice / Stripe / Portal auth / Inbox / Sequences / Reports / Service Hub / Knowledge Base / AI assist / RAG + AskAI / Lead scoring v2 / GDPR compliance (DSR, consent, retention) / Automation / Webhooks / Home-services / QuickBooks / Restaurant / Salon-Spa / Square POS with no FE counterparts yet. FE feature parity is planned as "Phase B" in the back-office ultraplan (`C:\Users\willa\.claude\plans\ultraplan-research-back-office-iridescent-wilkes.md`).

When adding new resource pages, derive `types/api.ts` types from the backend's DTO classes, not from runtime responses. Tier-2 portal-authenticated components (PortalProfile, PortalInvoices, PortalActivities, SupportTicketForm) are deferred until a client engagement pulls them into scope.

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
