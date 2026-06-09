import type { CrmClient } from "./client";

// Real Estate "Database Goldmine" — dormant-lead nurture dashboard (T1) —
// HAND-WRITTEN client.
//
// The RE-nurture BE controller (RealEstateNurtureController) is
// @ConditionalOnProperty(kmosf.modules.realestate)-gated AND the shared
// NurtureCampaignController is nurture-module-gated, so neither set of routes
// is in the committed openapi.json and the generated client has no methods for
// them (the Real Estate RE-5b / AR / proposals precedent). These calls back the
// per-segment ROI funnel dashboard:
//   - Campaign list           — GET  /nurture/campaigns
//                               (the shared E1 campaign CRUD controller)
//   - Per-segment funnel ROI  — GET  /realestate/nurture/campaigns/{id}/analytics
//   - Segment & enroll        — POST /realestate/nurture/campaigns/{id}/segment-and-enroll
//                               (@IdempotentRoute → Idempotency-Key minted per call)
//
// All are ADMIN-authenticated + realestate-AND-nurture-module-gated on the BE.
// The base path /api/v1 is prepended by the CrmClient's baseUrl, so the paths
// here are /realestate/... and /nurture/... (matching the other hand-written
// modules). Shared nurture error codes: 4301 (campaign not found),
// 4302 (inactive — segment/enroll refused), 4303 (no segment definitions).

// ---------------------------------------------------------------------------
// DTOs — match the BE records exactly
// ---------------------------------------------------------------------------

/**
 * Vertical-agnostic dormancy tier (DormancyBucket). A = the most-recently-active
 * dormant cohort … D = the longest-dormant / coldest. The day-window that maps a
 * contact into a bucket lives on the campaign's segment definitions, never here.
 */
export type DormancyBucket = "A" | "B" | "C" | "D";

export const DORMANCY_BUCKETS: DormancyBucket[] = ["A", "B", "C", "D"];

/**
 * Lifecycle of one contact's enrollment (NurtureEnrollmentStatus). The funnel
 * reads these: ENROLLED/ACTIVE are in-flight; REPLIED → BOOKED is the happy
 * path; OPTED_OUT/COMPLETED/EXITED are terminal.
 */
export type NurtureEnrollmentStatus =
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
export interface NurtureSegmentCounts {
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
 * keyed by DormancyBucket ("A".."D"). `sent` is the total cadence touches
 * delivered (send-log rows across the campaign's enrollments).
 */
export interface NurtureCampaignAnalytics {
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
  perBucket: Partial<Record<DormancyBucket, NurtureSegmentCounts>>;
}

/**
 * Per-run segmentation counts — NurtureSegmentationService.SegmentationResult.
 * Returned by segment-and-enroll: how many contacts were examined, fell into a
 * segment, were freshly enrolled, skipped for sms-opt-out, or already enrolled.
 */
export interface SegmentationResult {
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
export interface NurtureSegmentDefinition {
  bucket: DormancyBucket;
  minDaysSinceLastActivity: number;
  maxDaysSinceLastActivity: number | null;
  minLifetimeValue: number | null;
  maxLifetimeValue: number | null;
}

export interface NurtureCampaign {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  active: boolean;
  segments: NurtureSegmentDefinition[];
  maxTouchesPerContactPerWindow: number;
  createdAt?: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * List the tenant's nurture campaigns (the shared E1 CRUD controller). The
 * dashboard groups the RE reactivation campaign(s) here; the agent picks one to
 * see its funnel + trigger segment-and-enroll.
 */
export function listNurtureCampaigns(
  client: CrmClient,
): Promise<NurtureCampaign[]> {
  return client.api<NurtureCampaign[]>("/nurture/campaigns");
}

/**
 * The per-campaign + per-segment funnel ROI for the dashboard. 404 (errorCode
 * 4301) if the campaign isn't found for this tenant.
 */
export function getNurtureAnalytics(
  client: CrmClient,
  campaignId: string,
): Promise<NurtureCampaignAnalytics> {
  return client.api<NurtureCampaignAnalytics>(
    `/realestate/nurture/campaigns/${encodeURIComponent(campaignId)}/analytics`,
  );
}

/**
 * Trigger segmentation + enrollment for the RE nurture campaign; returns the
 * per-run counts. A fresh Idempotency-Key is minted per call so a deliberate
 * re-run enrolls newly-dormant contacts (the @IdempotentRoute replays the same
 * body on a duplicate key — the proposals / project-assignments precedent).
 * 409 (errorCode 4302) if the campaign is inactive; 400 (4303) if it has no
 * segment definitions.
 */
export function segmentAndEnroll(
  client: CrmClient,
  campaignId: string,
): Promise<SegmentationResult> {
  return client.api<SegmentationResult>(
    `/realestate/nurture/campaigns/${encodeURIComponent(campaignId)}/segment-and-enroll`,
    {
      method: "POST",
      headers: { "Idempotency-Key": crypto.randomUUID() },
    },
  );
}
