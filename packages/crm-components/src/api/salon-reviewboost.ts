import type { CrmClient } from "./client";

// Salon "ReviewBoost" (T6) — HAND-WRITTEN client.
//
// The ReviewBoostController is @ConditionalOnProperty(kmosf.modules.chairfill)-
// gated AND requires @ConditionalOnBean(SalonBookingService), so neither set of
// routes is in the committed openapi.json and the generated client has no methods
// for them (the T4 SwitchboardController / T3 MidnightResponderController /
// T5 CallbackController precedent). These calls back the ReviewBoost admin board:
//
//   - Insights board  — GET /chairfill/reviewboost/insights
//                         (ReviewBoostController @RequestMapping /chairfill/reviewboost
//                          → @GetMapping /insights;
//                          SalonReviewBoardDTO { reviewCount, averageRating,
//                          positiveCount, neutralCount, negativeCount,
//                          unclassifiedCount, totalRequestsSent,
//                          totalRequestsResponded, overallResponseRate,
//                          stylists: StylistReviewStatsDTO[] })
//
//   - Config read     — GET /chairfill/reviewboost/config
//                         (same controller → @GetMapping /config;
//                          ReviewBoostConfigDTO { reviewLinkConfigured, reviewLink,
//                          senderEnabled, sentimentRefineEnabled, negativeAlertEnabled })
//
// Both endpoints are ADMIN + chairfill-AND-salon-spa-module-gated.
// There is NO write/PUT endpoint — ReviewBoost is a READ-ONLY surface (T6 mints
// no config model; the five flag fields reflect already-shipped feature flags
// and the existing Twilio IntegrationConnection.config["reviewLink"]).
// Error band 4410-4419 is RESERVED; no dedicated code minted at this read tier.
//
// The base path /api/v1 is prepended by CrmClient, so these paths are relative.

// ---------------------------------------------------------------------------
// DTOs — mirror the BE records exactly (field-by-field)
// ---------------------------------------------------------------------------

/**
 * Per-stylist review-request funnel stats — StylistReviewStatsDTO record.
 * The genuinely entity-attributable part: each salon post-visit review-request
 * is stamped with the stylist who did the booking.
 *
 * @see ReviewBoostController @GetMapping /insights (inside SalonReviewBoardDTO.stylists)
 */
export interface StylistReviewStats {
  /** The stylist's StaffMember id. */
  staffMemberId: string;
  /** The stylist's display name (from StaffMember). */
  displayName: string;
  /** Review requests SENT attributed to this stylist. */
  requestsSent: number;
  /**
   * The bounded response proxy for this stylist — min(tenantReviewCount,
   * requestsSent), never > sent (GBP reviews are not request-correlated).
   */
  requestsResponded: number;
  /** requestsResponded / requestsSent (0.0 when none sent), scale-2. */
  responseRate: number;
}

/**
 * Salon review insights board — SalonReviewBoardDTO record. Two blocks:
 *  1. Review-content header: tenant-level GBP review count + rating + sentiment.
 *  2. Per-stylist request funnel: one row per active StaffMember.
 *
 * @see ReviewBoostController @GetMapping /insights
 */
export interface SalonReviewBoard {
  /** Ingested reviews (tenant-level). */
  reviewCount: number;
  /** Mean star rating over rated reviews (0.0 if none), scale-2. */
  averageRating: number;
  /** Reviews classified POSITIVE. */
  positiveCount: number;
  /** Reviews classified NEUTRAL. */
  neutralCount: number;
  /** Reviews classified NEGATIVE. */
  negativeCount: number;
  /** Reviews with no stored sentiment yet. */
  unclassifiedCount: number;
  /** Review requests SENT across the whole tenant. */
  totalRequestsSent: number;
  /** The bounded response proxy across the tenant. */
  totalRequestsResponded: number;
  /** Tenant responded / sent (0.0 when none), scale-2. */
  overallResponseRate: number;
  /** Per-stylist funnel rows, one per active StaffMember. */
  stylists: StylistReviewStats[];
}

/**
 * ReviewBoost wiring read-back — ReviewBoostConfigDTO record. Pure read;
 * no write endpoint exists. Reflects already-shipped flags so the dashboard
 * can show whether the feature is actually wired up.
 *
 * @see ReviewBoostController @GetMapping /config
 */
export interface ReviewBoostConfig {
  /** Whether a non-blank Google review link is set for this tenant. */
  reviewLinkConfigured: boolean;
  /** The configured link, or null if none (never fabricated). */
  reviewLink: string | null;
  /**
   * The effective kmosf.modules.review-engine.sender-enabled flag
   * (DEFAULT-OFF; the no-incentive request SMS only goes out when opted in).
   */
  senderEnabled: boolean;
  /**
   * The effective kmosf.review-engine.ai-refine-enabled flag
   * (DEFAULT-OFF; rating-based sentiment is always computed, AI refine is opt-in).
   */
  sentimentRefineEnabled: boolean;
  /**
   * The effective kmosf.review-engine.negative-alert-enabled flag
   * (DEFAULT-OFF; the manager alert on a negative review).
   */
  negativeAlertEnabled: boolean;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * The per-stylist review insights board — tenant-wide review-content header
 * plus one stylist funnel row per active StaffMember.
 *
 * Maps to: GET /chairfill/reviewboost/insights
 * Controller: ReviewBoostController @GetMapping /insights
 */
export function getSalonReviewBoard(client: CrmClient): Promise<SalonReviewBoard> {
  return client.api<SalonReviewBoard>("/chairfill/reviewboost/insights");
}

/**
 * The ReviewBoost wiring read-back — review link configured? + the effective
 * default-OFF sender / sentiment-refine / negative-alert flags. Read-only.
 *
 * Maps to: GET /chairfill/reviewboost/config
 * Controller: ReviewBoostController @GetMapping /config
 */
export function getReviewBoostConfig(client: CrmClient): Promise<ReviewBoostConfig> {
  return client.api<ReviewBoostConfig>("/chairfill/reviewboost/config");
}
