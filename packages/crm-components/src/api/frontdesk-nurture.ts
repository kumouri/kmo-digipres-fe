import type { CrmClient } from "./client";

// Health "RevenueRevive" — dormant-patient reactivation funnel (T2) —
// HAND-WRITTEN client.
//
// The FrontDesk-nurture BE controller (FrontDeskNurtureController) is
// @ConditionalOnProperty(kmosf.modules.frontdesk.enabled)-gated AND the shared
// NurtureCampaignController is nurture-module-gated, so neither set of routes
// is in the committed openapi.json and the generated client has no methods for
// them (the RE T1 / AR / proposals precedent). These calls back the per-segment
// ROI funnel dashboard:
//   - Campaign list           — GET  /nurture/campaigns
//                               (the shared E1 campaign CRUD controller)
//   - Per-segment funnel ROI  — GET  /frontdesk/nurture/campaigns/{id}/analytics
//   - Segment & enroll        — POST /frontdesk/nurture/campaigns/{id}/segment-and-enroll
//                               (@IdempotentRoute → Idempotency-Key minted per call)
//
// All are ADMIN-authenticated + frontdesk-AND-nurture-module-gated on the BE.
// The base path /api/v1 is prepended by the CrmClient's baseUrl, so the paths
// here are /frontdesk/... and /nurture/... (matching the other hand-written
// modules). Shared nurture error codes: 4301 (campaign not found),
// 4302 (inactive — segment/enroll refused), 4303 (no segment definitions).
//
// PHI-free by design: no patient names, clinical records, or diagnostic data
// cross this boundary — only logistics signals (recency, contact frequency).
// The same DormancyBucket/NurtureEnrollmentStatus/SegmentationResult types from
// the RE T1 client are reused here because the underlying shared E1 nurture
// engine is vertical-agnostic; only the base-path prefix differs.

// ---------------------------------------------------------------------------
// DTOs — mirror the shared BE records exactly (same engine as T1)
// ---------------------------------------------------------------------------

/**
 * Vertical-agnostic dormancy tier (DormancyBucket). A = the most-recently-active
 * dormant cohort … D = the longest-dormant / coldest. The day-window that maps a
 * contact into a bucket lives on the campaign's segment definitions, never here.
 */
export type FdDormancyBucket = "A" | "B" | "C" | "D";

export const FD_DORMANCY_BUCKETS: FdDormancyBucket[] = ["A", "B", "C", "D"];

/**
 * Lifecycle of one contact's enrollment (NurtureEnrollmentStatus). The funnel
 * reads these: ENROLLED/ACTIVE are in-flight; REPLIED → BOOKED is the happy
 * path; OPTED_OUT/COMPLETED/EXITED are terminal.
 */
export type FdNurtureEnrollmentStatus =
  | "ENROLLED"
  | "ACTIVE"
  | "REPLIED"
  | "BOOKED"
  | "EXITED"
  | "OPTED_OUT"
  | "COMPLETED";

/**
 * Per-segment (bucket) counts — NurtureAnalyticsService.NurtureSegmentCounts.
 * total is the sum of the seven status counts.
 */
export interface FdNurtureSegmentCounts {
  total: number;
  enrolled: number;
  active: number;
  replied: number;
  booked: number;
  optedOut: number;
  completed: number;
  exited: number;
}

/**
 * Per-campaign funnel — NurtureAnalyticsService.NurtureCampaignAnalytics. The
 * top-level fields are the campaign-wide totals; perBucket is the same breakdown
 * keyed by FdDormancyBucket ("A".."D"). `sent` is the total cadence touches
 * delivered (send-log rows across the campaign's enrollments).
 */
export interface FdNurtureCampaignAnalytics {
  campaignId: string;
  name: string;
  total: number;
  enrolled: number;
  active: number;
  replied: number;
  booked: number;
  optedOut: number;
  completed: number;
  exited: number;
  sent: number;
  /** Per-dormancy-segment breakdown; only buckets with ≥1 enrollment appear. */
  perBucket: Partial<Record<FdDormancyBucket, FdNurtureSegmentCounts>>;
}

/**
 * Per-run segmentation counts — NurtureSegmentationService.SegmentationResult.
 * Returned by segment-and-enroll: how many contacts were examined, fell into a
 * segment, were freshly enrolled, skipped for sms-opt-out, or already enrolled.
 */
export interface FdSegmentationResult {
  campaignId: string;
  evaluated: number;
  matched: number;
  enrolled: number;
  skippedOptedOut: number;
  alreadyEnrolled: number;
}

/**
 * One nurture campaign definition (NurtureCampaign). The dashboard only needs
 * the identity + active flag + the segment day-windows for display; the full
 * cadence steps are not surfaced here (campaign authoring stays on the shared
 * nurture CRUD surface, out of scope for this dashboard).
 */
export interface FdNurtureSegmentDefinition {
  bucket: FdDormancyBucket;
  minDaysSinceLastActivity: number;
  maxDaysSinceLastActivity: number | null;
  minLifetimeValue: number | null;
  maxLifetimeValue: number | null;
}

export interface FdNurtureCampaign {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  active: boolean;
  segments: FdNurtureSegmentDefinition[];
  maxTouchesPerContactPerWindow: number;
  createdAt?: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * List the tenant's health nurture campaigns via the FrontDesk-namespaced
 * campaign list endpoint. Both the shared E1 NurtureCampaignController
 * (/nurture/campaigns) and this FD-namespaced variant (/frontdesk/nurture/campaigns)
 * return the same NurtureCampaign shape; using the FD-prefixed path ensures the
 * mock can serve only health campaigns to this dashboard (in production, the
 * per-tenant module-guard achieves the same isolation).
 */
export function listFdNurtureCampaigns(
  client: CrmClient,
): Promise<FdNurtureCampaign[]> {
  return client.api<FdNurtureCampaign[]>("/frontdesk/nurture/campaigns");
}

/**
 * The per-campaign + per-segment funnel ROI for the dashboard. 404 (errorCode
 * 4301) if the campaign isn't found for this tenant.
 */
export function getFdNurtureAnalytics(
  client: CrmClient,
  campaignId: string,
): Promise<FdNurtureCampaignAnalytics> {
  return client.api<FdNurtureCampaignAnalytics>(
    `/frontdesk/nurture/campaigns/${encodeURIComponent(campaignId)}/analytics`,
  );
}

/**
 * Trigger segmentation + enrollment for the health nurture campaign; returns the
 * per-run counts. A fresh Idempotency-Key is minted per call so a deliberate
 * re-run enrolls newly-dormant contacts (the @IdempotentRoute replays the same
 * body on a duplicate key — the proposals / project-assignments precedent).
 * 409 (errorCode 4302) if the campaign is inactive; 400 (4303) if it has no
 * segment definitions.
 *
 * PHI-free: the BE segments on logistics-only signals (recency / visit value);
 * no clinical data crosses this call.
 */
export function fdSegmentAndEnroll(
  client: CrmClient,
  campaignId: string,
): Promise<FdSegmentationResult> {
  return client.api<FdSegmentationResult>(
    `/frontdesk/nurture/campaigns/${encodeURIComponent(campaignId)}/segment-and-enroll`,
    {
      method: "POST",
      headers: { "Idempotency-Key": crypto.randomUUID() },
    },
  );
}
