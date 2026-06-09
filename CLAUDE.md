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

## Review replies — GBP review-reply admin queue (SHIPPED 2026-06-02)

Admin UI for the backend's **Google Business Profile review-reply automation** (BE-shipped, BE-only until this). The BE poller drafts on-brand replies to new Google reviews and leaves them `DRAFTED`; this **admin-only** queue lets the owner review → edit → approve & post (or skip) each one. PR **#46**; branch `feat/gbp-review-replies-admin`; smoke 116→122.

| Area | Route | API surface |
|---|---|---|
| Review replies (admin-only, `<RequireAdmin>`) | `/review-replies` | GET /gbp/review-replies (DRAFTED only); POST /gbp/review-replies/:id/post (optional `{reply}` edit → POSTED); POST /gbp/review-replies/:id/skip (→ SKIPPED) |

- **Card queue, not a DataTable** — each row needs an inline editable `Textarea` (pre-filled with the AI draft) + Approve & post / Skip actions, so `ReviewRepliesList.tsx` renders `Card`s directly. Reviewer name + 5-star rating (`lucide` `Star`, filled to `rating`) + the review comment + the editable reply. Loading / empty ("No review replies waiting") / error-with-retry states.
- **Admin-only** because the BE endpoints are ADMIN-guarded (`RoleGuard.requireRole("ADMIN")`, `1800`): route under `<RequireAdmin>`, nav `adminOnly: true` (`MessageSquare` icon).
- **New generated types** (regen from BE spec): `GbpReviewReply`, `PostReplyRequest`. Aliases + `GBP_REVIEW_REPLY_STATUSES` in `types/api.ts`; `REVIEW_REPLY_STATUS_LABELS` in `admin/labels.ts` (`DRAFTED`→"Needs review"). API fetchers `api/gbp-review-replies.ts` + hook `useReviewRepliesApi`.
- **MSW**: `gbpReviewReplyStore` (store.ts) seeds two DRAFTED replies (a 5★ + a needs-care 2★); `post`/`skip` enforce the BE's 4032 (not found) / 4033 (not DRAFTED) status semantics. The list returns DRAFTED only, so a posted/skipped card leaves the queue. Spec: `tests/review-replies.spec.ts` (6).
- **Deferred (separate, Google-approval-gated human step):** the live Google OAuth connect flow that activates the poller for a tenant — out of scope here, as in the BE.

## Home Services "Instant Callback" — revenue-ranked dispatcher queue + recovery stats (T5, SHIPPED)

Admin UI for the backend T5 **Instant Callback** — the dispatcher surface on the Home Services console: a **revenue-ranked callback queue** (one-click Dispatch per card), a **recovery-stats panel** (offered/accepted/dispatched + two conversion rates), and a **config card** (the per-tenant SMS copy book). Branch `home-instant-callback-fe`; smoke +12 specs (230→242).

| Area | Route | API surface |
|---|---|---|
| Callback queue (`<RequireNotContractor>`) | `/callback-queue` | GET /home-services/callbacks → `CallbackCardDTO[]` (ranked queue, highest revenueScore first); POST /home-services/callbacks/{id}/dispatch (`@IdempotentRoute` → `Idempotency-Key` minted per call) → `CallbackCardDTO`; GET /home-services/callbacks/recovery-stats → `CallbackRecoveryStats{offered,accepted,dispatched,acceptanceRate,dispatchRate}`; GET /home-services/callbacks/config → `CallbackConfig` (4401/404 if none → empty state); PUT /home-services/callbacks/config body `CallbackController.ConfigRequest{offerMessage,immediateConfirmMessage,scheduledConfirmMessage}` → `CallbackConfig` |

- **Hand-written client** `api/home-callback.ts` + hook `useHomeCallbackApi` — the CallbackController is `@ConditionalOnProperty(home-services)`-gated AND requires the responder module, so all routes are **absent from `openapi.json`** (the T4 SwitchboardController precedent). `CallbackCardDTO` typed field-by-field (all 14 fields: id, contactId, fromPhone, mode, requestedWindowText, requestedAt, status, summaryLine, urgency, jobValueBand, revenueScore, workOrderId, callSid, createdAt). `gen:api:check` stays green (hand-written, no regen). Dispatch sends `Idempotency-Key: crypto.randomUUID()` per call (the proposals/segment-and-enroll precedent).
- **Component** `admin/home-services/CallbackQueue.tsx` — three sections: (1) `RankedQueueSection` (TanStack Query → `CallbackCard`s sorted high→low by `revenueScore`; each shows phone/urgency badge/job-value band/revenue score band/summary line + a "Dispatch" button that triggers the idempotent POST; dispatched card leaves the queue on refetch); (2) `RecoveryStatsPanel` (5 stat cards: offered/accepted/dispatched/acceptance-rate/dispatch-rate; no-data empty state); (3) `CallbackConfigCard` (react-hook-form + zod; 3 textarea fields for offer/immediate-confirm/scheduled-confirm; PUT on save; 4401/404 → friendly empty-state banner). Route: `/callback-queue`.
- **Route guard:** behind `RequireNotContractor` grouped with the other Home Services surfaces (the T4 SwitchboardPanel precedent). The queue/dispatch/recovery-stats endpoints are STAFF-gated; config CRUD is ADMIN-gated.
- **New labels** in `admin/labels.ts`: `CALLBACK_STATUS_LABELS` (REQUESTED→"Waiting", DISPATCHED→"Dispatched", etc.), `CALLBACK_MODE_LABELS` (IMMEDIATE→"Call me now", SCHEDULED→"Call me later").
- **MSW**: `callbackStore` (store.ts) seeds 3 ranked callback cards (score 95/62/28, EMERGENCY/URGENT/ROUTINE, LARGE/MEDIUM/SMALL — ordering visible) + realistic recovery stats (150 offered / 105 accepted / 82 dispatched) + a seeded config row. `dispatch()` transitions card REQUESTED→DISPATCHED, increments the dispatched counter, returns REQUESTED-only queue (dispatched card leaves); `clearConfig()` exercises the 4401 empty-state path; `resetCards()` restores card state for test isolation. Spec: `tests/home-callback.spec.ts` (12).
- **Nav item:** `Zap` icon, `hideForContractor: true`, inserted after "Missed Calls" in `AppShell.tsx` NAV_ITEMS.
- **Out of scope:** per-tenant module enablement, Twilio/A2P 10DLC go-live config (tracked in go-live-requirements.md).

## Health "Switchboard AI" — logistics config card + call-deflection stats (T4, SHIPPED)

Admin UI for the backend T4 **Switchboard AI** — two panels on the FrontDesk console: a **call-deflection stats panel** (PHI-free counters: logistics-handled / clinical-tripwire / unmatched-handoff / deflection-rate) and a **logistics config card** (the per-tenant answer book: hours, location, booking/reschedule instructions, intake-form link, review link, clinical tripwire reply). Branch `health-switchboard-ai-fe`; smoke +10 specs (220→230).

| Area | Route | API surface |
|---|---|---|
| Switchboard AI (`<RequireNotContractor>`) | `/switchboard` | GET /frontdesk/switchboard/config → `SwitchboardConfig` (4391/404 if not yet configured); PUT /frontdesk/switchboard/config body `SwitchboardController.ConfigRequest{hoursText,locationText,acceptingNewPatients,acceptingNewPatientsText,bookingInstructions,rescheduleInstructions,intakeFormUrl,reviewLinkUrl,answerOverrides,safeTripwireReply}` → `SwitchboardConfig`; GET /frontdesk/switchboard/deflection-stats → `SwitchboardDeflectionStats{logistics,tripwire,handoff,total,deflectionRate}`. |

- **Hand-written client** `api/frontdesk-switchboard.ts` + hook `useFrontDeskSwitchboardApi` — the SwitchboardController is `@ConditionalOnProperty(frontdesk)`-gated AND requires the responder module, so all routes are **absent from `openapi.json`** (the T3 Midnight Responder / T2 RevenueRevive precedent). DTOs: `SwitchboardConfig` (full config row), `SwitchboardConfigRequest` (upsert request — all fields nullable), `SwitchboardDeflectionStats` (5-field PHI-free counter record). `gen:api:check` stays green (hand-written, no regen).
- **Component** `admin/frontdesk/SwitchboardPanel.tsx` — two sections: (1) `DeflectionStatsPanel` (TanStack Query → 4 stat cards: logistics/tripwire/handoff/rate; no-data empty state); (2) `LogisticsConfigCard` (react-hook-form + zod; text inputs for hours/location/booking/reschedule/intake-form/review-link; accepting-new-patients checkbox; safeTripwireReply textarea; PUT on save). 404/4391 on config GET renders a friendly "not configured yet" banner above the blank form.
- **Route guard:** behind `RequireNotContractor` grouped with the other FrontDesk IQ surfaces (the T2 RevenueReviveDashboard precedent). The BE endpoints are ADMIN-guarded (`RoleGuard.requireRole("ADMIN")`, 1800).
- **PHI-free by construction:** config fields hold only logistics answers (hours, location, booking links) — no patient names, diagnoses, or clinical data. The clinical tripwire reply is validated to stay generic by the BE.
- **MSW**: `switchboardStore` (store.ts) seeds a config row (hours/location/booking/reschedule/intake/review links) + realistic deflection stats (312 logistics / 47 tripwire / 28 handoff / ~81% rate). `saveConfig` mirrors BE upsert logic. `clearConfig()` exercises the 4391 empty-state path. Spec: `tests/health-switchboard.spec.ts` (10).
- **Nav item:** `PhoneCall` icon, `hideForContractor: true`, inserted after "Revenue revive" in `AppShell.tsx` NAV_ITEMS.
- **Out of scope:** per-tenant module enablement, Twilio / A2P 10DLC go-live config (tracked in go-live-requirements.md), `answerOverrides` per-intent override UI (the map is passed-through as null/empty; advanced override authoring is deferred).

## Real Estate "Midnight Responder" — response-latency stats + tier routing (T3, SHIPPED)

Admin UI for the backend T3 **Midnight Responder** — two panels on the RE console: a **response-latency stats panel** (the "<30 s, 24/7" headline: p50/p95/max received→replied latency + after-hours coverage share) and a **tier-routing config card** (WARM/COLD lead → nurture-campaign mapping, business-hours window, delegate-handoff flag). Branch `re-midnight-responder-fe`; smoke +8 specs (212→220).

| Area | Route | API surface |
|---|---|---|
| Midnight Responder (`<RequireNotContractor>`) | `/midnight-responder` | GET /realestate/responder/latency-stats[?zoneId=] → `MidnightResponderLatencyStats`; GET /realestate/responder/config → `MidnightResponderConfig` (4380/404 if not yet configured); PUT /realestate/responder/config body `MidnightResponderConfigDTO{warmCampaignId,coldCampaignId,delegateHandoffToResponder,afterHoursStartHour,afterHoursEndHour}` (all nullable, partial-upsert) → `MidnightResponderConfig`. Campaign dropdowns use the shared GET /nurture/campaigns (via `useRealEstateNurtureApi.listCampaigns()` — same as T1). |

- **Hand-written client** `api/realestate-responder.ts` + hook `useRealEstateResponderApi` — the RE-responder BE controllers are `@ConditionalOnProperty(realestate)`-gated AND require the responder module, so both are **absent from `openapi.json`** (the T1 / AR / proposals precedent). DTOs: `MidnightResponderConfig` (full config row), `MidnightResponderConfigDTO` (all-nullable upsert request), `MidnightResponderLatencyStats` (9-field latency + after-hours record). `gen:api:check` stays green (hand-written, no regen).
- **Component** `admin/realestate/MidnightResponderPanel.tsx` — two sections: (1) `LatencyStatsPanel` (TanStack Query → 4 stat cards: p50/p95/max/after-hours; no-data empty state); (2) `TierRoutingCard` (react-hook-form + zod; campaign pickers for WARM + COLD via shared nurture campaign list; business-hours start/end number inputs; delegate-handoff checkbox; partial-upsert PUT on save). 404/4380 on config GET renders a friendly "not configured yet" banner above the blank form (same form, no existing values).
- **Route guard:** behind `RequireNotContractor` grouped with the other RE surfaces (the T1 NurtureDashboard precedent). The BE endpoints are STAFF-guarded (`RoleGuard.requireRole("STAFF")`, 1800).
- **MSW**: `midnightResponderStore` (store.ts) seeds a config row + realistic latency stats (p50 18.2 s, p95 27.9 s, max 44.1 s, 42% after-hours). `saveConfig` applies the BE partial-upsert logic (null fields preserve prior values). `clearConfig()` + Playwright `context.route()` interception exercises the 4380 empty-state path. Spec: `tests/re-midnight-responder.spec.ts` (8).
- **Labels** in `admin/labels.ts`: `RESPONDER_LEAD_TIER_LABELS` (WARM → "Warm leads", COLD → "Long-dormant leads"). Fair-housing-neutral: tier labels describe routing logistics, not buyer characteristics.
- **Nav item:** `MoonStar` icon, `hideForContractor: true`, inserted after "Database goldmine" in `AppShell.tsx` NAV_ITEMS.
- **Out of scope:** the live Twilio / A2P 10DLC go-live config (tracked in go-live-requirements.md), per-tenant module enablement.

## Health "RevenueRevive" — dormant-patient reactivation funnel (T2, SHIPPED)

Admin UI for the backend FD-nurture **funnel ROI dashboard** (`FrontDeskNurtureController`, a thin frontdesk-namespaced facade over the shared E1 nurture engine — the health twin of T1). Pick a reactivation campaign, **segment-and-enroll** lapsed patients, then watch the per-segment funnel fill as cadences fire and replies turn into booked appointments. Branch `health-revenuerevive-fe`; smoke 205→212.

| Area | Route | API surface |
|---|---|---|
| Revenue revive (`<RequireNotContractor>`) | `/revenue-revive` | GET /frontdesk/nurture/campaigns (FD-namespaced campaign list — returns only health campaigns in mock); GET /frontdesk/nurture/campaigns/:id/analytics (per-segment funnel ROI); POST /frontdesk/nurture/campaigns/:id/segment-and-enroll (`@IdempotentRoute` → `Idempotency-Key` minted per call → `FdSegmentationResult` counts) |

- **Hand-written client** `api/frontdesk-nurture.ts` + hook `useFrontDeskNurtureApi` — the FD-nurture routes are `@ConditionalOnProperty(frontdesk)`-gated AND nurture-gated, so both are **absent from `openapi.json`** (the T1 precedent). DTOs mirror the BE shared engine records: `FdNurtureCampaignAnalytics` (campaign-wide totals + `perBucket: Partial<Record<FdDormancyBucket,FdNurtureSegmentCounts>>`), `FdSegmentationResult`, `FdNurtureCampaign`. `gen:api:check` stays green (hand-written, no regen). Campaign list uses `/frontdesk/nurture/campaigns` (not the shared `/nurture/campaigns`) so the mock returns only health campaigns.
- **Component** `admin/frontdesk/RevenueReviveDashboard.tsx` — mirrors `NurtureDashboard.tsx` with health-specific copy (appointments not showings, patients not leads) and `HeartPulse` icon. Per-dormancy-tier rows reuse `DORMANCY_BUCKET_LABELS` (same A–D tiers). Grouped with the FrontDesk IQ surfaces in the nav.
- **Route guard:** behind `RequireNotContractor` (grouped with the other FrontDesk IQ surfaces — the T1 / AR-FE precedent). The BE endpoints are ADMIN-guarded (`RoleGuard.requireRole("ADMIN")`, 1800).
- **PHI-free by design:** no patient names, diagnoses, procedures, or clinical data on any DTO — only logistics signals (days since last visit, contact frequency).
- **MSW**: `frontDeskNurtureStore` (store.ts) seeds an active "Lapsed-patient reactivation" campaign (A–D segments) mid-run (88 enrolled, 10 replied, 3 booked, 172 sent) + a paused "Annual wellness reminders" campaign. `segmentAndEnroll` enrolls 5 fresh patients AND advances one reply→booking; the paused campaign returns **4302** (inactive → 409). Spec: `tests/frontdesk-nurture.spec.ts` (7).
- **Labels** in `admin/labels.ts`: `FD_NURTURE_ENROLLMENT_STATUS_LABELS` (BOOKED→"Appointment booked"). Reuses existing `DORMANCY_BUCKET_LABELS` (A–D) unchanged.
- **Out of scope:** campaign authoring stays on the shared nurture CRUD surface.

## Real Estate "Database Goldmine" — dormant-lead nurture dashboard (T1, SHIPPED)

Admin UI for the backend RE-nurture **funnel ROI dashboard** (BE PR #112 — `RealEstateNurtureController`, a thin RE-namespaced facade over the shared E1 nurture engine). Pick a reactivation campaign, **segment-and-enroll** the dormant contacts, then watch the per-segment funnel fill as cadences fire and replies turn into booked showings. Branch `re-database-goldmine-fe`; smoke 198→205.

| Area | Route | API surface |
|---|---|---|
| Database goldmine (`<RequireNotContractor>`) | `/database-goldmine` | GET /nurture/campaigns (shared E1 CRUD — campaign picker); GET /realestate/nurture/campaigns/:id/analytics (per-segment funnel ROI); POST /realestate/nurture/campaigns/:id/segment-and-enroll (`@IdempotentRoute` → `Idempotency-Key` minted per call → `SegmentationResult` counts) |

- **Hand-written client** `api/realestate-nurture.ts` + hook `useRealEstateNurtureApi` — the RE-nurture routes are `@ConditionalOnProperty(realestate)`-gated AND the shared nurture CRUD is nurture-gated, so both are **absent from `openapi.json`** (the RE-5b / AR / proposals precedent). DTOs mirror the BE records exactly: `NurtureCampaignAnalytics` (campaign-wide totals + `perBucket: Partial<Record<DormancyBucket,NurtureSegmentCounts>>`), `SegmentationResult`, `NurtureCampaign`. `DormancyBucket` = `"A".."D"`; `NurtureEnrollmentStatus` = ENROLLED/ACTIVE/REPLIED/BOOKED/EXITED/OPTED_OUT/COMPLETED. `gen:api:check` stays green (hand-written, no regen).
- **Component** `admin/realestate/NurtureDashboard.tsx` — headline funnel cards (Enrolled / Touches sent / Replied / Showings booked / Re-engaged), a **reply→booking** outcome view, and a per-dormancy-tier row (A–D) each with an enrolled → being-nudged → replied → booked mini-funnel + the seeded day-window. Sits next to the RE-5b concierge surfaces (Listings/Concierge/Marketing review) in the nav (`Database` icon).
- **Route guard:** behind `RequireNotContractor` (the AR-FE precedent — grouped with the other RE surfaces). NB the **BE endpoints are ADMIN-guarded** (`RoleGuard.requireRole("ADMIN")`, 1800), so a non-admin staffer reaches the page but the calls 1800; acceptable per the directive (matches the precedent placement). Tighten to `<RequireAdmin>` if owner-only is wanted.
- **MSW**: `realEstateNurtureStore` (store.ts) seeds an active "Past-buyer reactivation" campaign (A–D segments) mid-run (100 enrolled, 8 replied, 3 booked, 188 sent) + a paused "Open-house no-shows" campaign. `segmentAndEnroll` enrolls 5 fresh leads AND advances one reply→booking so the funnel **visibly moves** on the trigger (the 60-second demo beat); the paused campaign returns BE **4302** (inactive → 409) and analytics on an unknown campaign returns **4301** (404). Spec: `tests/re-nurture.spec.ts` (7).
- **Labels** in `admin/labels.ts`: `DORMANCY_BUCKET_LABELS` (A→"Recently dormant" … D→"Coldest leads"), `NURTURE_ENROLLMENT_STATUS_LABELS` (BOOKED→"Showing booked"). Index exports `NurtureDashboard`, `useRealEstateNurtureApi`, and the DTO types.
- **Out of scope:** campaign **authoring** (the day-windows + cadence steps) stays on the shared nurture CRUD surface — this dashboard is read + the one segment-and-enroll trigger.

## Contractor & time management — admin UI (SHIPPED 2026-06-03)

Admin UI for the backend **contractor / time-management vertical (BE Phase J1–J4)** — onboarding a 1099 teammate end to end: a staff/contractor directory, project assignment with bill/cost rates, a **scoped Contractor experience**, submit→approve timesheets, and a payout/margin (1099) report. Four FE PRs off four BE PRs: **#43** (J1) · **#44** (J2) · **#45** (J3) · **#47** (J4); branches `contractor-time-mgmt-phase-{1,2,3,4}-fe`; smoke +15 across the four phases.

| Area | Route | API surface |
|---|---|---|
| Team directory (admin-only, `<RequireAdmin>`) | `/team`, `/team/:id` | GET/POST/PUT /team; POST /team/:id/disable — invite Staff/Contractor + default bill/cost rates; `TeamMemberView` (no `passwordHash`). Detail tabs: Details / Projects / Timesheets / **Payout** |
| Project assignment (admin) | "Team" tab on `/projects/:id` | GET/POST/PUT/DELETE /projects/:projectId/assignments (idempotent POST w/ `Idempotency-Key`; per-assignment bill/cost overrides; soft-delete) |
| Contractor self-surface (scoped) | `/projects`, `/timesheet`, `/expenses` | GET /me/contractor/projects[/:id][/tasks][/client]; /me/contractor/time[/weekly] + timer; /me/contractor/expenses; /me/contractor/timesheets (+submit/reopen) |
| Timesheet approvals (admin-only, `<RequireAdmin>`) | `/timesheets` | GET /timesheets?status=; POST /timesheets/:id/approve; POST /timesheets/:id/reject (`?reason=`) |

- **Contractor role + gating (J1):** `app/auth/roles.ts` adds `isContractor(roles)` = `CONTRACTOR && !ADMIN` (the owner is never scoped down) + `hasAnyRole`. New `RequireNotContractor` guard wraps every non-contractor route group in `router.tsx` (deep-link → redirect to `/`); `AppShell` `NavItem` gains `hideForContractor`/`contractorLabel` so a contractor's sidebar is exactly **Dashboard · My Projects · My Timesheet · My Expenses** (+ the self-scoped timer widget). Admin/staff nav byte-unchanged.
- **Role-aware data fetching (J2):** the BE denies a CONTRACTOR token (4135) on the broad staff readers, so the shared My Projects/Timesheet/Expenses pages fetch from `/me/contractor/**` when `isContractor` — an `isContractor` prop fed from the route wrappers (the `ExpenseDetailRoute`-passes-`isAdmin` pattern) selects the hook; **contractor query keys are namespaced `["contractor", …]`** so the two role views never collide in the TanStack cache. `ProjectDetail` for a contractor shows a **read-only client card** (`/client`) in place of the admin Team tab and hides Delete + manage tabs. `api/contractor.ts` + `useContractorApi`.
- **Timesheet submit/approve (J3):** `TimesheetPage` (contractor) gains a per-week status badge, **Submit for approval** (OPEN/REJECTED→SUBMITTED), read-only gating when SUBMITTED/APPROVED, and a sent-back note panel + **Reopen**. New admin `/timesheets` (`TimesheetApprovals`) DataTable + inline Approve / Send-back (required note), mirroring the expense decision block. `api/timesheets.ts` + `useTimesheetsApi`; `TIMESHEET_STATUS_LABELS` (REJECTED → "Sent back").
- **Payout & margin (J4):** the **Payout** tab on Team detail (`PayoutSummary`) — a YTD "Paid this year" card (the owe figure) + a per-period `DataTable` (Approved hours / Cost = what you owe / Bill / Margin / Margin %), with an unrated-cost note. `api/payouts.ts` + `usePayoutsApi`; `/reports/payout[/ytd]`.
- **New labels** in `admin/labels.ts`: `ROLE_LABELS` (ADMIN→"Owner", CONTRACTOR→"Contractor"), `USER_STATUS_LABELS`, `TIMESHEET_STATUS_LABELS`. **New `types/api.ts` aliases:** `TeamMember`/`TeamMemberRequest`/`ProjectAssignment`/`Timesheet`/`TimesheetView`/`PayoutReport`/`PayoutPeriodLine`.
- **CSS note:** J4 added an explicit `@source "../../../crm-components/src"` to `packages/admin/src/styles/globals.css` (above the vendored token block) — pins Tailwind-4 content detection across the monorepo so the Dialog `position:fixed` + `max-h` clamp emit deterministically (fixed a latent invite-Dialog scroll-containment flake the new files surfaced; doesn't affect the homepage re-sync discipline).

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
