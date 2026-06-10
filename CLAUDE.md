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

## Home Services "DispatchIQ" — dispatcher optimize console (T14, SHIPPED)

Admin UI for the backend T14 **DispatchIQ** — the final flagship tool (completes the 4-vertical AI demo set): a **date picker** → AI-proposed tech assignments (urgency badge / skill-matched badge / fit score / rationale table) + a separate **Unassigned** section (each with its `unassignedReason`) → **Apply plan** button (commits decisions + `Idempotency-Key` per `@IdempotentRoute`) → applied/skipped result banner + a **dispatch analytics** card (total open / assigned / unassigned / skill-matched / skill-match rate / avg fit). Branch `home-dispatchiq-fe`; smoke +16 specs (362→378).

| Area | Route | API surface |
|---|---|---|
| Dispatch console (`<RequireNotContractor>`) | `/dispatch` | GET /dispatch/optimize?date=<ISO> → `DispatchPlan{date, assignments[], unassigned[], openCount, assignedCount, unassignedCount, skillMatchRate, avgFitScore}`; POST /dispatch/apply (`@IdempotentRoute` → `Idempotency-Key` REQUIRED) body `ApplyRequest{date, assignments[{workOrderId,techUserId}]}` → `ApplyResponse{applied, skipped}`; GET /dispatch/analytics?date=<ISO> → `DispatchAnalytics{date, totalOpen, assigned, unassigned, skillMatched, skillMatchRate, avgFitScore}` |

- **Hand-written client** `api/dispatch.ts` + hook `useDispatchApi` — the `DispatchController` is `@ConditionalOnProperty(kmosf.modules.dispatch)`-gated, so all routes are **absent from `openapi.json`** (the T13 TechCopilotController precedent). All 19 fields of `ProposedAssignment` typed field-by-field from `module/dispatch/model/ProposedAssignment.java`; all 8 fields of `DispatchPlan`; all 2 fields of each DTO. `gen:api:check` stays green (hand-written, no regen). `applyDispatch()` sends `Idempotency-Key: crypto.randomUUID()` per call (the T7 RescheduleBoard / T5 CallbackController precedent).
- **Component** `admin/home-services/DispatchConsole.tsx` — three sections: (1) date picker (`<input type="date">`) + optimize query → summary bar (open/assigned/unassigned/skill-match-rate/avg-fit) + `AssignmentsTable` (urgency badge + job-value badge + tech name + skill-matched/skill-gap badge + fit score % + rationale) + `UnassignedSection` (each item: title + urgency + unassignedReason); (2) "Apply plan" button (mutation → `@IdempotentRoute` POST with `Idempotency-Key`; result banner applied/skipped; re-apply shows "already applied"); (3) `AnalyticsCard` (TanStack Query → 6 stat tiles: total open / assigned / unassigned / skill-matched / skill-match rate / avg fit score). Route: `/dispatch`.
- **Route guard:** behind `RequireNotContractor` grouped with the other Home Services surfaces (the T13 TechCopilotPanel precedent). The BE endpoints are STAFF-gated (`RoleGuard.requireRole("STAFF")`).
- **New labels** in `admin/labels.ts`: `DISPATCH_URGENCY_LABELS` (EMERGENCY/URGENT/ROUTINE), `DISPATCH_JOB_VALUE_LABELS` (LARGE→"High value", MEDIUM→"Mid value", SMALL→"Low value").
- **MSW**: `dispatchStore` (store.ts) seeds 3 assigned WOs (HVAC EMERGENCY score 0.91 skillMatched=true + AC ROUTINE score 0.74 skillMatched=true + Plumbing URGENT score 0.68 skillMatched=false nearest-general-tech) + 1 unassigned (Boiler inspection — "no available tech has the Boiler skill"). `apply()` is idempotent (first call: applied=3 skipped=0; re-apply: applied=0 skipped=3). `analytics()` returns consistent stats (4 open / 3 assigned / 1 unassigned / 2 skill-matched / 66.7% / 0.777 avg). Test-control `POST /dispatch/test-reset`. Spec: `tests/dispatch.spec.ts` (16).
- **Nav item:** `Route` icon "Dispatch" (`/dispatch`), `hideForContractor: true`, inserted after "Tech copilot" in `AppShell.tsx` NAV_ITEMS. Label "Dispatch" has no substring collision with any existing nav label ("Callback queue", "Job estimates", "Estimate settings", "Quote follow-up", "Tech copilot", "Missed Calls", etc.).
- **Out of scope:** per-tenant module enablement, go-live config (tracked in go-live-requirements.md). T14 is the final flagship tool — the 4-vertical AI demo set (Home Services, ChairFill, Real Estate, FrontDesk IQ) is complete.

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

## Salon "ReviewBoost" — per-stylist review insights board + config status card (T6, SHIPPED)

Admin UI for the backend T6 **ReviewBoost** — the salon's review-health companion to the CF-5 review inbox: a **per-stylist review-insights board** (headline review stats / sentiment breakdown / sortable per-stylist request-funnel table) + a **config status card** (read-only display of the ReviewBoost wiring flags). Branch `salon-reviewboost-fe`; smoke +10 specs.

| Area | Route | API surface |
|---|---|---|
| ReviewBoost board (`<RequireNotContractor>`) | `/review-boost` | GET /chairfill/reviewboost/insights → `SalonReviewBoardDTO` (reviewCount, averageRating, positiveCount, neutralCount, negativeCount, unclassifiedCount, totalRequestsSent, totalRequestsResponded, overallResponseRate, stylists: StylistReviewStatsDTO[]); GET /chairfill/reviewboost/config → `ReviewBoostConfigDTO` (reviewLinkConfigured, reviewLink, senderEnabled, sentimentRefineEnabled, negativeAlertEnabled) |

- **Hand-written client** `api/salon-reviewboost.ts` + hook `useSalonReviewBoostApi` — the ReviewBoostController is `@ConditionalOnProperty(chairfill)`-gated AND requires `@ConditionalOnBean(SalonBookingService)`, so all routes are **absent from `openapi.json`** (the T4 SwitchboardController precedent). Both endpoints are **read-only** — there is NO write/PUT endpoint; T6 mints no config model. `gen:api:check` stays green (hand-written, no regen).
- **Component** `admin/chairfill/ReviewBoostBoard.tsx` — two sections: (1) `InsightsPanel` (TanStack Query → 4 headline stat cards: count/avg/sent/rate; sentiment breakdown pos/neu/neg/unclassified; sortable `StylistTable` per stylist: requests-sent / responded / response-rate; zero-reviews empty state); (2) `ConfigStatusCard` (read-only: review link configured? green check or red X; three flag rows: senderEnabled / sentimentRefineEnabled / negativeAlertEnabled — each shows "On" or "Off (default)"; hint to enable via go-live config). Route: `/review-boost`.
- **Route guard:** behind `RequireNotContractor` grouped with the other ChairFill/salon surfaces (the T4 SwitchboardPanel precedent). The BE endpoints are ADMIN-gated (`RoleGuard.requireRole("ADMIN")`, 1800).
- **New labels** in `admin/labels.ts`: `REVIEW_BOOST_FLAG_LABELS` (human names for the three flags), `REVIEW_BOOST_FLAG_ON`, `REVIEW_BOOST_FLAG_OFF`.
- **MSW**: `reviewBoostStore` (store.ts) seeds a board with 3 stylists (Mia Torres 28 req / Jordan Kim 14 req / Alex Rivera 3 req — uneven counts so rows differ) + 18 tenant reviews (14 positive / 3 neutral / 1 negative, avg 4.6) + a config row (review link set, all flags off). Spec: `tests/salon-reviewboost.spec.ts` (10).
- **Nav item:** `Star` icon, `hideForContractor: true`, inserted after "Salon reviews" in `AppShell.tsx` NAV_ITEMS.
- **Out of scope:** per-tenant module enablement, Twilio + A2P 10DLC go-live config (tracked in go-live-requirements.md). No config-save UI — T6 is a pure read surface.

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

## Health "RescheduleFlow" — waitlist board + fill-rate stats (T7, SHIPPED)

Admin UI for the backend T7 **RescheduleFlow** — the staff console for the health appointment waitlist + the gap-fill funnel analytics: a **fill-rate stats panel** (cancellations → offers → claims → filled + fill rate) + a **waitlist table** (each waiting patient: provider preference, availability window, SMS opt-in, lifecycle status) + an **add-to-waitlist form** (POST with `Idempotency-Key`). Branch `health-rescheduleflow-fe`; smoke +10 specs.

| Area | Route | API surface |
|---|---|---|
| Reschedule board (`<RequireNotContractor>`) | `/reschedule-waitlist` | POST /frontdesk/reschedule/waitlist (`@IdempotentRoute` → `Idempotency-Key` minted per call) → `WaitlistEntry` (201; 4421/400 if no contactId); GET /frontdesk/reschedule/waitlist → `WaitlistEntry[]`; GET /frontdesk/reschedule/fill-stats → `RescheduleFillStats{cancellations,offers,claims,filled,fillRate}` |

- **Hand-written client** `api/reschedule.ts` + hook `useRescheduleApi` — the RescheduleController is `@ConditionalOnProperty(frontdesk)`-gated AND requires the waitlist module, so all routes are **absent from `openapi.json`** (the T4 SwitchboardController / T5 CallbackController precedent). DTOs typed field-by-field from the BE records: `WaitlistEntry` (18 fields mirroring `model/waitlist/WaitlistEntry`), `WaitlistJoinRequest` (logistics-only; no clinical field), `RescheduleFillStats` (5-field counters). The POST sends `Idempotency-Key: crypto.randomUUID()` per submission (the T5 dispatch / segment-and-enroll precedent). `gen:api:check` stays green (hand-written, no regen).
- **Component** `admin/frontdesk/RescheduleBoard.tsx` — three sections: (1) `FillStatsPanel` (TanStack Query → 5 stat cards: cancellations / offers / claims / filled / fill-rate; no-data empty state); (2) `WaitlistTableSection` (TanStack Query → table rows per entry; OPEN/FULFILLED/CANCELLED status badge; empty-state banner); (3) `AddToWaitlistCard` (react-hook-form + zod; contact ID required; provider, window, SMS-opt-in, notes optional; POST on submit with minted Idempotency-Key). Route: `/reschedule-waitlist`.
- **Route guard:** behind `RequireNotContractor` grouped with the other FrontDesk IQ surfaces (the T4 SwitchboardPanel precedent). The BE endpoints are ADMIN-guarded (`RoleGuard.requireRole("ADMIN")`, 1800).
- **PHI-free by construction (fence F1):** all fields are scheduling logistics — provider + time window + show-likelihood signals (priorNoShowCount / priorVisitCount / lastVisitAt). No diagnosis, procedure, or clinical detail is accepted or surfaced. `slotType` is the fixed logistics token "health-appt" (never a procedure).
- **New labels** in `admin/labels.ts`: `WAITLIST_ENTRY_STATUS_LABELS` (OPEN→"Waiting", FULFILLED→"Slot filled", CANCELLED→"Removed").
- **MSW**: `rescheduleStore` (store.ts) seeds 3 waitlist entries (Ada OPEN/any-provider, Brook OPEN/specific-provider+window, Casey FULFILLED — all three states visible) + seeded fill stats (48 cancellations / 41 offers / 38 claims / 32 filled / ~67% fill rate). `joinWaitlist` is idempotent (Idempotency-Key cache); `reset()` restores seed state. Spec: `tests/reschedule.spec.ts` (10).
- **Nav item:** `CalendarCheck` icon, `hideForContractor: true`, inserted after "Switchboard AI" in `AppShell.tsx` NAV_ITEMS.
- **Out of scope:** per-tenant module enablement, Twilio + A2P 10DLC go-live config (tracked in go-live-requirements.md).

## Real Estate "Listing Prep Studio" — MLS + 4-week social calendar + email + Fair-Housing review (T10, SHIPPED)

Admin UI for the backend T10 **Listing Prep Studio** — per-listing one-click prep pack generation (MLS description + 4-week dated social calendar + email campaign) + Fair-Housing lint panel + Approve / Skip queue. Branch `realestate-listing-prep-fe`; smoke +13 specs (300→313).

| Area | Route | API surface |
|---|---|---|
| Listing Prep Studio (`<RequireNotContractor>`) | `/listing-prep-studio` | POST /realestate/listings/{listingId}/prep/generate (body `{startDate?,postsPerWeek?}`) → `ListingPrepPack` (DRAFTED, no @IdempotentRoute); GET /realestate/listings/{listingId}/prep/packs → `ListingPrepPack[]` (history); GET /realestate/prep/packs → `ListingPrepPack[]` (DRAFTED queue); GET /realestate/prep/packs/{id}; POST /realestate/prep/packs/{id}/approve → APPROVED; POST /realestate/prep/packs/{id}/skip → SKIPPED |

- **Hand-written client** `api/listing-prep.ts` + hook `useListingPrepApi` — the BE `ListingPrepController` is `@ConditionalOnProperty(kmosf.modules.realestate)`-gated, so all routes are **absent from `openapi.json`** (the RE-5b precedent). Types typed field-by-field from `module/realestate/listingprep/model/ListingPrepPack.java`: `ListingPrepPack` (all 15 fields), `SocialPost` (7 fields — postDate LocalDate string, weekIndex 1–4, dayOffset, channel, copy, fairHousingSafe, heldReason), `PhotoNote`, `PrepFairHousingFlag` (term + **surface** + snippet — distinct name from the RE-4 `FairHousingFlag` which uses `channel`). No Idempotency-Key on generate (no `@IdempotentRoute`). `gen:api:check` stays green.
- **Component** `admin/realestate/ListingPrepStudio.tsx` — three sections: (1) Listing picker (buttons from the seeded listing list; selecting a listing opens the generate form + per-listing pack history); (2) `GenerateForm` (optional start date + posts/week → POST generate → new `PrepPackCard`); (3) DRAFTED queue (all DRAFTED packs across listings). `PrepPackCard` renders: status badge + degraded badge, `FairHousingPanel` (held-count notice + per-flag term/surface/snippet, or green "No concerns"), MLS description, `SocialCalendarView` (4 week groups, each post shows date/channel badge/copy; held/auto-corrected posts carry an "Auto-corrected" badge), email campaign, photo callouts, Approve/Skip buttons when DRAFTED.
- **Route guard:** behind `RequireNotContractor` grouped with the other RE surfaces. BE endpoints are STAFF-gated (`RoleGuard.requireRole("STAFF")`).
- **New labels** in `admin/labels.ts`: `PREP_PACK_STATUS_LABELS` (DRAFTED→"Needs review", APPROVED→"Approved", SKIPPED→"Skipped"), `PREP_SOCIAL_CHANNEL_LABELS` (INSTAGRAM/FACEBOOK/X).
- **MSW**: `listingPrepStore` (store.ts) seeds two packs for `RE_LISTING_ID`: (1) DRAFTED with full 9-post 4-week social calendar (1 held post in week 3 — `fairHousingSafe=false`, heldReason "perfect for families"), 2 Fair-Housing flags (on DESCRIPTION + CALENDAR week 3 surfaces), realistic MLS description + email campaign + 2 photo callouts; (2) APPROVED history pack. `generate()` mints a new DRAFTED pack; `approve()`/`skip()` enforce DRAFTED-only transitions (null→4461/409, undefined→4460/404). `reset()` restores seed state. Test-control `POST /realestate/prep/packs/test-reset`. Spec: `tests/listing-prep.spec.ts` (13).
- **Nav item:** `CalendarDays` icon "Listing prep" (`/listing-prep-studio`), `hideForContractor: true`, inserted after "Marketing review" in `AppShell.tsx` NAV_ITEMS. Label chosen to avoid Playwright partial-match collision with "Listings" (/listings) and "Marketing review" (/marketing-review).
- **Out of scope:** per-tenant module enablement, go-live config (tracked in go-live-requirements.md). No auto-publish endpoint exists — approval only marks the pack copy-ready (paste-out posture, matching RE-4).

## Salon "StylerMatch" — staff stylist-match console (T12, SHIPPED)

Admin UI for the backend T12 **StylerMatch** — the staff console on the salon (ChairFill) surfaces: a **create-match form** (service + style attributes → ranked best-fit stylists with rationale + score + "not certified" penalty badge), a **Book-top-match action**, a **status-filtered match inbox**, an **accept-rate-by-rank analytics card**, and a **"Copy match widget link" token-issue panel**. Branch `salon-stylermatch-fe`; smoke +17 specs (328→345).

| Area | Route | API surface |
|---|---|---|
| Stylist match (`<RequireNotContractor>`) | `/styler-match` | POST /stylermatch/matches (body `StylerMatchRequestBody`) → `StylerMatchResponse` (201); GET /stylermatch/matches[?status=] → `StylerMatchResponse[]`; GET /stylermatch/matches/{id} → `StylerMatchResponse` (4485 if absent); GET /stylermatch/analytics → `StylerMatchAnalytics`; POST /stylermatch/tokens → `{token}` (201, 180-day TTL, ADMIN-gated); POST /public/integrations/stylermatch/{token}/matches/{matchId}/accept → `StylerMatchResponse` (book top match) |

- **Hand-written client** `api/stylermatch.ts` + hook `useStylerMatchApi` — the StylerMatchController and StylerMatchTokenController are `@ConditionalOnProperty(kmosf.modules.chairfill)`-gated, so all routes are **absent from `openapi.json`** (the T9 StyleConsultController precedent). All types typed field-by-field from BE records (`StylerMatchResponse` 12 fields, `RankedMatch` 9 fields, `StylerMatchAnalytics` 8 fields, `StylerMatchRequestBody` 13 fields). `gen:api:check` stays green (hand-written, no regen). `bookTopStylerMatch` uses raw `fetch` (not the CRM client) because the accept endpoint is `/public/integrations/...` — outside the `/api/v1` base path.
- **Component** `admin/chairfill/StylerMatchConsole.tsx` — five sections: (1) `CreateMatchFormCard` (react-hook-form + zod; style category required; optional length/texture/color/name/phone/notes → POST /stylermatch/matches → transitions to `MatchResultView`); (2) `MatchResultView` (ranked stylists each with rationale + score badge + "Not certified" `destructive` badge where `eligibleForRequestedService=false`; "Book top match" button on rank-1 row when NEW → POST accept endpoint); (3) `StylerMatchAnalyticsCard` (TanStack Query → 8 stat cards: total / booked / booking rate / rank-1 accept / rank-1 count / rank-2 count / rank-3+ count / avg top score); (4) `StylerMatchTokenPanel` (POST /stylermatch/tokens + copy widget URL + surfaces token to parent for book action); (5) Status-filtered inbox list (`StylerMatchCard`s). Route: `/styler-match`.
- **Route guard:** behind `RequireNotContractor` grouped with the other ChairFill/salon surfaces (the T9 StyleConsultInbox precedent). BE endpoints staff-accessible (no extra RoleGuard on create/list/detail/analytics; ADMIN-gated on token-issue).
- **New labels** in `admin/labels.ts`: `STYLER_MATCH_STATUS_LABELS` (NEW→"New", BOOKED→"Booked").
- **Nav item:** `Users` icon "Stylist match" (`/styler-match`), `hideForContractor: true`, inserted after "Style consults" in `AppShell.tsx` NAV_ITEMS. Label is "Stylist match" — distinct from "Style consults" (/style-consults); no substring collision.
- **MSW**: `stylerMatchStore` (store.ts) seeds 3 matches (Jordan NEW/curly: rank-1 Mia Torres certified 0.92 + rank-2 Alex Rivera NOT-certified 0.53; Casey NEW/straight: rank-1 Jordan Kim certified 0.87; Riley BOOKED/wavy: already accepted rank-1 Mia, bookingId set) + analytics (42 total / 31 booked / 28 rank-1 / 2 rank-2 / 1 rank-3+, ~90% rank-1 accept rate) + token + book-top-match (transitions NEW→BOOKED, idempotent re-confirm on already-booked). Public accept handler at `/public/integrations/stylermatch/:token/matches/:matchId/accept` (no auth check — the public path). Test-control `POST /stylermatch/matches/test-reset`. Spec: `tests/stylermatch.spec.ts` (17).
- **Out of scope:** per-tenant module enablement, Twilio + A2P 10DLC go-live config (tracked in go-live-requirements.md), homeowner-facing match widget UI (the token endpoint surfaces the link to share).

## Salon "StyleConsult AI" — consult inbox + analytics + token (T9, SHIPPED)

Admin UI for the backend T9 **StyleConsult AI** — the staff consult-inbox surface on the salon (ChairFill) console: a **status-filtered consult inbox** (each consult shows the AI-read style category, service count, retail count, and booking status), a **detail view** (vision / manual style assessment, recommended services + the "stylist will confirm" guardrail, margin-ranked retail recommendations), a **retail-attach analytics card**, and a **"Generate consult link" token-issue panel**. Branch `salon-styleconsult-fe`; smoke +15 specs (285→300).

| Area | Route | API surface |
|---|---|---|
| Style consults (`<RequireNotContractor>`) | `/style-consults` | GET /styleconsult/consults[?status=] → `StyleConsultInboxCard[]`; GET /styleconsult/consults/{id} → `StyleConsultResponse` (4455 if absent); GET /styleconsult/analytics → `StyleConsultAnalytics`; POST /styleconsult/tokens → `{token}` (201, 180-day TTL, ADMIN-gated) |

- **Hand-written client** `api/styleconsult.ts` + hook `useStyleConsultApi` — the StyleConsultController and StyleConsultTokenController are `@ConditionalOnProperty(kmosf.modules.chairfill)`-gated, so all routes are **absent from `openapi.json`** (the T8 QuoteNow / T6 ReviewBoostController precedent). All types typed field-by-field from BE records. `gen:api:check` stays green (hand-written, no regen).
- **Component** `admin/chairfill/StyleConsultInbox.tsx` — three sections: (1) `StyleConsultAnalyticsCard` (TanStack Query → 6 stat cards: total / with-retail / booked / booked+retail / retail-attach rate / avg retail margin); (2) `StyleConsultTokenPanel` (POST /styleconsult/tokens + copy consult widget URL); (3) Status-filtered inbox list + `StyleConsultDetailView` (assessment card: category/length/texture/color/source/confidence; service recs list with the "stylist will confirm" guardrail banner; retail recs list ordered highest-margin-first, each carrying a margin badge). Route: `/style-consults`.
- **Route guard:** behind `RequireNotContractor` grouped with the other ChairFill/salon surfaces (the T6 ReviewBoostBoard / T8 QuoteInbox precedent). The BE endpoints are staff-accessible (no extra RoleGuard on list/detail/analytics; ADMIN-gated on token-issue).
- **New labels** in `admin/labels.ts`: `STYLE_CONSULT_STATUS_LABELS` (NEW→"New", BOOKED→"Booked"), `STYLE_ATTRIBUTE_SOURCE_LABELS` (VISION→"Inspiration photo (AI)", MANUAL→"Client-typed").
- **Nav item:** `Scissors` icon "Style consults" (`/style-consults`), `hideForContractor: true`, inserted after "ReviewBoost" in `AppShell.tsx` NAV_ITEMS. Label chosen to avoid Playwright partial-match collision with any existing nav label.
- **MSW**: `styleConsultStore` (store.ts) seeds 3 consults (Brianna NEW/VISION curly 2-service 3-retail; Chloe NEW/MANUAL straight 1-service 2-retail; Devon BOOKED wavy 1-service 1-retail) + retail ordered high→mid→low margin so ordering is visible in smoke + analytics (28 total / 21 with-retail / 12 booked / 10 booked+retail, ~83% attach rate) + token endpoint. Test-control `POST /styleconsult/consults/test-reset`. Spec: `tests/styleconsult.spec.ts` (15).
- **Out of scope:** per-tenant module enablement, Twilio + A2P 10DLC go-live config (tracked in go-live-requirements.md), homeowner-facing intake widget UI (the token endpoint surfaces the link to share).

## Home Services "Tech Copilot" — grounded equipment Q&A + corpus manager (T13, SHIPPED)

Admin UI for the backend T13 **Tech Copilot** — a RAG-grounded Q&A assistant for home-services technicians: submit a question (with optional equipment-type hint) and get a cited answer drawn from the tenant's uploaded manuals, or a "not in your docs" handoff when no corpus match exists; manage the manual corpus (add/edit docs); browse Q&A history with thumbs-up/down feedback. Branch `home-tech-copilot-fe`; smoke +17 specs (345→362).

| Area | Route | API surface |
|---|---|---|
| Tech copilot (`<RequireNotContractor>`) | `/tech-copilot` | POST /techcopilot/ask `{question,equipmentType?}` → `AskResponse{answer,handoff,citations,queryId}`; GET /techcopilot/queries → `TechQuery[]`; POST /techcopilot/queries/{id}/feedback `{helpful}` → 204; POST /techcopilot/docs `TechDocRequest` → `TechDoc` (201); GET /techcopilot/docs → `TechDoc[]`; GET /techcopilot/docs/{id} → `TechDoc`; PUT /techcopilot/docs/{id} `TechDocRequest` → `TechDoc` |

- **Hand-written client** `api/tech-copilot.ts` + hook `useTechCopilotApi` — the TechCopilotController is `@ConditionalOnProperty(kmosf.modules.home-services.enabled)`-gated, so all routes are **absent from `openapi.json`** (the T4 SwitchboardController precedent). Types: `EquipmentType` (9-value union: FURNACE/AC/HEAT_PUMP/BOILER/WATER_HEATER/THERMOSTAT/DUCTLESS_MINI_SPLIT/REFRIGERATION/GENERAL), `Citation` (docId/docTitle/equipmentType/contentPreview/score), `AskResponse` (answer/handoff/citations/queryId), `TechQuery` (11 fields), `TechQueryCitation` (5 fields), `TechDoc` (11 fields), `TechDocRequest` (title/equipmentType/source/text). All typed field-by-field from the BE Java records. `gen:api:check` stays green.
- **Component** `admin/home-services/TechCopilotPanel.tsx` — three tabs: (1) **Ask** (`AskPanel`): react-hook-form ask form with question + optional equipment type select; mutation on submit; renders `tc-answer-card` with `tc-answer-text` + citation chips (`CitationChip` expandable to show `contentPreview`) or `tc-handoff-banner` when `handoff=true`; `tc-feedback-row` with thumbs-up/down that collapses to `tc-feedback-sent` after a click; (2) **Manual library** (`DocsManagerPanel`): TanStack Query for corpus; `tc-add-doc-btn` opens an inline add-doc card; each `tc-doc-card` shows title + equipment type with a `tc-doc-edit-btn`; react-hook-form `DocForm` (zod: title required, text required, equipmentType + source optional); save → toast + dismiss; (3) **Recent questions** (`QueryHistoryPanel`): TanStack Query for query history; each `tc-query-card` shows question + grounded/handoff badge + answer excerpt + `tc-query-feedback-row` thumbs-up/down. Route: `/tech-copilot`.
- **Route guard:** behind `RequireNotContractor` grouped with the other Home Services surfaces (the T11 QuoteCloser precedent).
- **New labels** in `admin/labels.ts`: `EQUIPMENT_TYPE_LABELS` (FURNACE→"Furnace", AC→"Air conditioner", HEAT_PUMP→"Heat pump", BOILER→"Boiler", WATER_HEATER→"Water heater", THERMOSTAT→"Thermostat", DUCTLESS_MINI_SPLIT→"Ductless mini-split", REFRIGERATION→"Refrigeration", GENERAL→"General").
- **MSW**: `techCopilotStore` (store.ts) seeds 2 `TechDoc`s (Carrier 58STA Furnace manual / Bradford White water heater spec) + 2 `TechQuery`s (igniter resistance — grounded with 1 citation, `handoff=false`; commercial ice machine refrigerant — no match, `handoff=true`). `ask()` does keyword matching: furnace/igniter/resistance/58sta → grounded furnace; water heater/element/anode/bradford → grounded water-heater; else → handoff. `reset()` restores seed state; test-control at `POST /techcopilot/test-reset`. Error codes: 4490 (not found), 4491 (blank title/text), 4494 (blank question), 4495 (helpful null). Spec: `tests/tech-copilot.spec.ts` (17).
- **Nav item:** `BotMessageSquare` icon "Tech copilot" (`/tech-copilot`), `hideForContractor: true`, inserted after "Quote follow-up" in `AppShell.tsx` NAV_ITEMS. Label "Tech copilot" has no substring collision with any existing nav label.
- **Out of scope:** per-tenant module enablement, OpenAI embeddings / real RAG pipeline, Twilio/A2P go-live config (tracked in go-live-requirements.md).

## Home Services "QuoteCloser" — follow-up config + recovery funnel (T11, SHIPPED)

Admin UI for the backend T11 **QuoteCloser** — per-tenant follow-up configuration + the quote abandonment + recovery funnel analytics. Branch `home-quotecloser-fe`; smoke +15 specs (313→328).

| Area | Route | API surface |
|---|---|---|
| Quote follow-up (`<RequireNotContractor>`) | `/quote-follow-up` | GET /quoting/quote-closer/config → `QuoteCloserConfigDTO` (4470/404 if none); PUT /quoting/quote-closer/config body `QuoteCloserConfigDTO` → `QuoteCloserConfigDTO` (ADMIN); GET /quoting/quote-closer/analytics → `QuoteCloserAnalytics` (staff-accessible) |

- **Hand-written client** `api/quote-closer.ts` + hook `useQuoteCloserApi` — both the `QuoteCloserConfigController` and `QuoteCloserController` are `@ConditionalOnProperty(kmosf.modules.quoting.enabled)`-gated AND require the nurture module, so all routes are **absent from `openapi.json`** (the T8 PriceBookController / T5 CallbackController precedent). DTOs typed field-by-field from the BE records: `QuoteCloserConfigDTO` (campaignId, unacceptedWindowHours — both nullable for partial upsert), `QuoteCloserAnalytics` (quotesSent, followedUp, recovered, reviewRequested, recoveryRate). `gen:api:check` stays green (hand-written, no regen).
- **Component** `admin/home-services/QuoteCloserSettings.tsx` — two sections: (1) `QuoteCloserConfigCard` (react-hook-form + zod; cadence enable toggle; follow-up window input in hours — disabled when cadence is off; financing-nudge copy textarea; PUT on save; 4470/404 → friendly empty-state banner + blank form for initial setup); (2) `RecoveryFunnelPanel` (TanStack Query → 5 stat cards: quotes sent / followed up / recovered / review requested / recovery rate; no-data empty state). Route: `/quote-follow-up`.
- **Route guard:** behind `RequireNotContractor` grouped with the other Home Services surfaces (the T8 PriceBookConfig / T5 CallbackQueue precedent). Config endpoints are ADMIN-gated; analytics is staff-accessible.
- **New labels** in `admin/labels.ts`: `QUOTE_CLOSER_FUNNEL_LABELS` (human names for the five funnel steps).
- **Nav item:** `MailCheck` icon "Quote follow-up" (`/quote-follow-up`), `hideForContractor: true`, inserted after "Estimate settings" in `AppShell.tsx` NAV_ITEMS. Label chosen to avoid Playwright partial-match collision with existing "Quotes" (/quotes), "Job estimates" (/instant-quotes), and "Estimate settings" (/quote-settings).
- **MSW**: `quoteCloserStore` (store.ts) seeds a config row (48-hour window, campaign linked, cadence on) + realistic analytics (120 sent / 84 followed-up / 31 recovered / 27 review-requested / ~36.9% recovery rate). `saveConfig` mirrors BE partial-upsert logic (null fields preserve prior values). `clearConfig()` exercises the 4470 empty-state path. `resetConfig()` restores seed state. Test-control `POST /quoting/quote-closer/test-clear-config` + `POST /quoting/quote-closer/test-reset-config`. Spec: `tests/quote-closer.spec.ts` (15).
- **Out of scope:** per-tenant module enablement, campaign-picker UI for `campaignId` (the nurture campaign list is not surfaced here — campaignId is preserved by the BE partial-upsert; wiring a campaign-picker dropdown deferred to a future pass once a shared campaign-list component is available), Twilio + A2P 10DLC go-live config (tracked in go-live-requirements.md).

## Home Services "QuoteNow" — quote inbox + price-book config (T8, SHIPPED)

Admin UI for the backend T8 **QuoteNow** — staff quote-inbox + admin price-book configuration surfaces for the home-services vertical. Branch `home-quotenow-fe`; smoke +19 specs (285 total).

| Area | Route | API surface |
|---|---|---|
| Quote inbox (`<RequireNotContractor>`) | `/instant-quotes` | GET /quoting/quotes[?status=] → `QuoteInboxCard[]`; GET /quoting/quotes/:id → `QuoteResponse` (4435 if absent) |
| Price-book config (`<RequireNotContractor>`) | `/quote-settings` | GET /quoting/price-book → `PriceBook` (4431 if none); PUT /quoting/price-book → `PriceBook`; POST /quoting/tokens → `{token}` (201, 180-day TTL) — ADMIN-gated |

- **Hand-written client** `api/quoting.ts` + hook `useQuotingApi` — all routes are `@ConditionalOnProperty(home-services)`-gated and **absent from `openapi.json`** (the T4/T5 precedent). Types: `QuoteStatus` (NEW/ACCEPTED/BOOKED/DECLINED), `Recommendation` (REPAIR/REPLACE/DIAGNOSTIC_VISIT), `AttributeSource` (MANUAL/VISION), `JobKind` (REPAIR/REPLACE), `QuoteInboxCard` (11 fields), `QuoteResponse` (13 fields), `PriceBookLineItem`, `PriceBook`. `gen:api:check` stays green (hand-written, no regen).
- **QuoteInbox** (`admin/home-services/QuoteInbox.tsx`) — status-filter tabs (All / New / Accepted / Booked / Declined), card list with equipment type + price range + recommendation badge, detail view with: price range, mandatory `estimateDisclaimer`, recommendation + rationale, financing flag (REPLACE only), equipment attributes (type / source / confidence).
- **PriceBookConfig** (`admin/home-services/PriceBookConfig.tsx`) — two sections: (1) `PriceBookEditor` (nested `useState` for complex structure — per-line-item fields: equipmentType, jobKind, low/high, typicalLifespanYears, agePerYearPct, ageMaxPct, severeFailurePct, severeFailureKeywords; diagnostic visit low/high fee; book name; save with toast); (2) `TokenIssuePanel` (POST /quoting/tokens + copy homeowner widget URL). Config is ADMIN-gated via the BE; both routes use `RequireNotContractor`.
- **Nav items:** `ClipboardList` icon "Job estimates" (`/instant-quotes`) + `Settings2` icon "Estimate settings" (`/quote-settings`); both `hideForContractor: true`. Labels chosen specifically to avoid Playwright partial-match collision with the existing "Quotes" nav item.
- **New labels** in `admin/labels.ts`: `QUOTE_NOW_STATUS_LABELS` (NEW→"New", ACCEPTED→"Accepted", BOOKED→"Booked", DECLINED→"Declined"), `QUOTE_NOW_RECOMMENDATION_LABELS` (REPAIR→"Repair recommended", REPLACE→"Replace recommended", DIAGNOSTIC_VISIT→"Diagnostic visit needed").
- **MSW**: `quotingStore` (store.ts) seeds 3 quotes (condenser REPAIR/NEW via VISION 87%, furnace REPLACE/NEW via MANUAL w/ `financingAvailable=true`, AC diagnostic ACCEPTED via VISION 31%) + seeded price book ("Comfort Air HVAC — 2026 price book", 2 line items) + token endpoint. Test-control `POST /quoting/price-book/test-clear` + `POST /quoting/quotes/test-reset`. Spec: `tests/quoting.spec.ts` (19).
- **Out of scope:** per-tenant module enablement, Twilio + A2P 10DLC go-live config (tracked in go-live-requirements.md), homeowner-facing widget UI (separate FE surface).

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
