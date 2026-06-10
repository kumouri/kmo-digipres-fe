import type { CrmClient } from "./client";

// Home Services T11 "QuoteCloser" — HAND-WRITTEN client.
//
// Both the QuoteCloserController and QuoteCloserConfigController are
// @ConditionalOnProperty(kmosf.modules.quoting.enabled)-gated AND require
// the nurture module, so all routes are ABSENT from the committed
// openapi.json and the generated client has no methods for them
// (the T8 QuoteInboxController / T5 CallbackController precedent).
//
// These calls back the T11 "QuoteCloser" settings + recovery funnel:
//
//   - Config read   — GET  /quoting/quote-closer/config
//                         (ADMIN; 4470/404 if not yet configured)
//                         → QuoteCloserConfigDTO
//   - Config upsert — PUT  /quoting/quote-closer/config
//                         (ADMIN; body QuoteCloserConfigDTO)
//                         → QuoteCloserConfigDTO
//   - Analytics     — GET  /quoting/quote-closer/analytics
//                         → QuoteCloserAnalytics
//
// Config endpoints are ADMIN-gated (RoleGuard.requireRole("ADMIN"), 1800).
// Analytics is staff-accessible (no extra RoleGuard beyond the auth chain).
// Error codes: 4470 (config not found, 404), 4471 (invalid campaignId, 400).
//
// Controller mappings (confirmed source):
//   QuoteCloserConfigController @RequestMapping("/quoting/quote-closer/config")
//     @GetMapping          → GET  /quoting/quote-closer/config
//     @PutMapping          → PUT  /quoting/quote-closer/config
//   QuoteCloserController @RequestMapping("/quoting/quote-closer")
//     @GetMapping("/analytics") → GET  /quoting/quote-closer/analytics

// ---------------------------------------------------------------------------
// DTOs — mirror the BE records exactly
// ---------------------------------------------------------------------------

/**
 * The per-tenant QuoteCloser config — upsert request body + read projection.
 * Drops server-managed fields (id / tenantId / version / timestamps).
 *
 * Maps to: QuoteCloserConfigDTO
 * (module/quoting/closer/QuoteCloserConfigDTO.java)
 *
 * Fields (all 2, in declaration order):
 *   campaignId, unacceptedWindowHours
 */
export interface QuoteCloserConfigDTO {
  /**
   * The NurtureCampaign a NEW (un-accepted) quote's contact auto-enrolls into.
   * null ⇒ the enrollment job routes nowhere for this tenant.
   */
  campaignId: string | null;
  /**
   * How long a NEW quote may sit unaccepted before the cadence enrolls it (hours).
   * Defaults to QuoteCloserConfig.DEFAULT_UNACCEPTED_WINDOW_HOURS (48) on create.
   */
  unacceptedWindowHours: number | null;
}

/**
 * The abandonment + recovery funnel for the tenant. The analytics read payload.
 *
 * Maps to: QuoteCloserAnalytics
 * (module/quoting/closer/QuoteCloserAnalytics.java)
 *
 * Fields (all 5, in declaration order):
 *   quotesSent, followedUp, recovered, reviewRequested, recoveryRate
 */
export interface QuoteCloserAnalytics {
  /** Total QuoteRequests submitted for the tenant (the funnel top). */
  quotesSent: number;
  /** Quotes whose contact was enrolled in the QuoteCloser nurture campaign. */
  followedUp: number;
  /** Followed-up quotes that were then ACCEPTED / BOOKED (recovered after nudge). */
  recovered: number;
  /** Won quotes for which a post-job review request was created (E3 review leg). */
  reviewRequested: number;
  /** recovered / followedUp (scale-2 HALF_UP; 0 when nothing was followed up). */
  recoveryRate: number;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Read the tenant's QuoteCloser config.
 * 404 (errorCode 4470) if no config has been created yet — caller renders a
 * friendly empty state so the admin can do initial setup.
 *
 * Maps to: GET /quoting/quote-closer/config
 * Controller: QuoteCloserConfigController @GetMapping (method get())
 * Guard: ADMIN (RoleGuard.requireRole("ADMIN"), 1800)
 */
export function getQuoteCloserConfig(
  client: CrmClient,
): Promise<QuoteCloserConfigDTO> {
  return client.api<QuoteCloserConfigDTO>("/quoting/quote-closer/config");
}

/**
 * Upsert the tenant's QuoteCloser config (one row per tenant).
 * All fields are nullable — a null field preserves the prior value on update.
 * The campaignId (if non-null) must resolve to one of the tenant's
 * NurtureCampaigns (4471/400 otherwise).
 *
 * Maps to: PUT /quoting/quote-closer/config  body: QuoteCloserConfigDTO
 * Controller: QuoteCloserConfigController @PutMapping (method upsert())
 * Guard: ADMIN (RoleGuard.requireRole("ADMIN"), 1800)
 */
export function saveQuoteCloserConfig(
  client: CrmClient,
  body: QuoteCloserConfigDTO,
): Promise<QuoteCloserConfigDTO> {
  return client.api<QuoteCloserConfigDTO>("/quoting/quote-closer/config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * The quote abandonment + recovery funnel analytics.
 * quotes sent → followed-up → recovered → review-requested + recovery rate.
 *
 * Maps to: GET /quoting/quote-closer/analytics
 * Controller: QuoteCloserController @GetMapping("/analytics") (method analytics())
 * Guard: staff-accessible (authenticated chain — the QuoteInboxController precedent)
 */
export function getQuoteCloserAnalytics(
  client: CrmClient,
): Promise<QuoteCloserAnalytics> {
  return client.api<QuoteCloserAnalytics>("/quoting/quote-closer/analytics");
}
