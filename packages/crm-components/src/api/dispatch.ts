import type { CrmClient } from "./client";

// Home Services T14 "DispatchIQ" — HAND-WRITTEN client.
//
// The DispatchController is @ConditionalOnProperty(kmosf.modules.dispatch)-
// gated, so all routes are ABSENT from the committed openapi.json and the
// generated client has no methods for them (the T13 TechCopilotController /
// T11 QuoteCloserController / T8 PriceBookController precedent).
//
// These calls back the T14 "DispatchIQ" optimizer/apply/analytics surfaces:
//
//   - Optimize plan    — GET  /dispatch/optimize?date=<ISO date>
//                             → DispatchPlan (4521/400 if date missing)
//   - Apply plan       — POST /dispatch/apply
//                             (@IdempotentRoute → Idempotency-Key REQUIRED)
//                             body: ApplyRequest → ApplyResponse
//   - Analytics        — GET  /dispatch/analytics?date=<ISO date>
//                             → DispatchAnalytics (4521/400 if date missing)
//
// All three routes are STAFF-gated (RoleGuard.requireRole("STAFF")).
// Error codes: 4521 (missing date, 400), 4522 (empty assignments list, 400).

// ---------------------------------------------------------------------------
// DTOs — mirror the BE records exactly
// ---------------------------------------------------------------------------

/**
 * One proposed assignment in the dispatcher's daily optimize plan.
 * Maps to: ProposedAssignment (module/dispatch/model/ProposedAssignment.java)
 *
 * Fields (all 19, in declaration order):
 *   workOrderId, workOrderNumber, title, serviceType, urgency,
 *   jobValueBand, scheduledStart, jobSiteId,
 *   assignedTechUserId, assignedTechName,
 *   score, confidence, skillFit, availability, proximity, priority,
 *   skillMatched, rationale, unassignedReason
 */
export interface ProposedAssignment {
  /** The open work order being dispatched (UUID string). */
  workOrderId: string;
  /** The human-readable WO number snapshot (nullable on legacy work orders). */
  workOrderNumber: string | null;
  /** The work order's title/label snapshot (nullable). */
  title: string | null;
  /** The free-form skill the job needs (WorkOrder.serviceType). */
  serviceType: string;
  /** The urgency signal from customFields.urgency (nullable). EMERGENCY | URGENT | ROUTINE. */
  urgency: string | null;
  /** The value band from customFields.jobValueBand (nullable). SMALL | MEDIUM | LARGE. */
  jobValueBand: string | null;
  /** The work order's scheduled start (ISO instant string, nullable). */
  scheduledStart: string | null;
  /** The work order's job site id (UUID string, nullable). */
  jobSiteId: string | null;
  /** The proposed technician's user id (UUID string, or null when unassignable). */
  assignedTechUserId: string | null;
  /** The proposed technician's display-name snapshot (nullable). */
  assignedTechName: string | null;
  /** The composite fit score in [0,1] (0 when unassigned). */
  score: number;
  /** How many signals were available to score on, in [0,1]. */
  confidence: number;
  /** The skill-match component in [0,1]. */
  skillFit: number;
  /** The load-balance/availability component in [0,1]. */
  availability: number;
  /** The travel/proximity component in [0,1]. */
  proximity: number;
  /** The urgency/value priority component in [0,1]. */
  priority: number;
  /** Whether the assigned tech's skills cover the job's service type. */
  skillMatched: boolean;
  /** The human-readable why (always non-blank). */
  rationale: string;
  /** Why no tech was assigned (null when assignedTechUserId is non-null). */
  unassignedReason: string | null;
}

/**
 * The optimizer's proposed dispatch schedule for a day.
 * Maps to: DispatchPlan (module/dispatch/model/DispatchPlan.java)
 *
 * Fields (all 8, in declaration order):
 *   date, assignments, unassigned, openCount, assignedCount,
 *   unassignedCount, skillMatchRate, avgFitScore
 */
export interface DispatchPlan {
  /** The UTC day this plan covers (ISO date string, e.g. "2026-06-10"). */
  date: string;
  /** The proposed (work order → tech) assignments, priority-first. */
  assignments: ProposedAssignment[];
  /** The open work orders the optimizer could not staff (with reasons). */
  unassigned: ProposedAssignment[];
  /** Total open work orders considered. */
  openCount: number;
  /** How many were assigned (assignments.length). */
  assignedCount: number;
  /** How many could not be staffed (unassigned.length). */
  unassignedCount: number;
  /** Fraction of assigned WOs whose tech's skills matched the service type. */
  skillMatchRate: number;
  /** Mean composite fit score across the assigned WOs (0 when none). */
  avgFitScore: number;
}

/**
 * One assignment decision in the POST /dispatch/apply request body.
 * Maps to: ApplyRequest.Decision (module/dispatch/controller/dto/ApplyRequest.java)
 */
export interface ApplyDecision {
  /** The open work order to (re)assign (UUID string). */
  workOrderId: string;
  /** The technician to assign it to (UUID string; null clears the assignment). */
  techUserId: string | null;
}

/**
 * The POST /dispatch/apply request body.
 * Maps to: ApplyRequest (module/dispatch/controller/dto/ApplyRequest.java)
 *
 * Fields (all 2, in declaration order): date, assignments
 */
export interface ApplyRequest {
  /** The UTC day the assignments are for (ISO date string). */
  date: string;
  /** The (work order → technician) decisions to commit. */
  assignments: ApplyDecision[];
}

/**
 * The POST /dispatch/apply response.
 * Maps to: ApplyResponse (module/dispatch/controller/dto/ApplyResponse.java)
 *
 * Fields (all 2, in declaration order): applied, skipped
 *
 * A re-apply of the same decisions returns applied=0 — the idempotency proof.
 */
export interface ApplyResponse {
  /** How many work orders were (re)assigned this call. */
  applied: number;
  /** How many were already at their target tech (no-op — the idempotency signal). */
  skipped: number;
}

/**
 * The dispatch analytics for a day.
 * Maps to: DispatchAnalytics (module/dispatch/model/DispatchAnalytics.java)
 *
 * Fields (all 7, in declaration order):
 *   date, totalOpen, assigned, unassigned, skillMatched,
 *   skillMatchRate, avgFitScore
 */
export interface DispatchAnalytics {
  /** The UTC day (ISO date string). */
  date: string;
  /** Total open work orders for the day. */
  totalOpen: number;
  /** How many the optimizer could staff. */
  assigned: number;
  /** How many it could not staff. */
  unassigned: number;
  /** How many assigned WOs went to a skill-matched tech. */
  skillMatched: number;
  /** skillMatched / assigned in [0,1] (0 when none assigned). */
  skillMatchRate: number;
  /** Mean composite fit across the assigned WOs in [0,1] (0 when none). */
  avgFitScore: number;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * GET /dispatch/optimize?date=<ISO date>
 * Proposes an optimized assignment schedule for the given day.
 * Returns a DispatchPlan with assignments[] + unassigned[] + summary stats.
 * Error: 4521/400 if date is missing.
 *
 * Maps to: DispatchController @GetMapping("/optimize") (method optimize())
 */
export function optimizeDispatch(
  client: CrmClient,
  date: string,
): Promise<DispatchPlan> {
  const url = `/dispatch/optimize?date=${encodeURIComponent(date)}`;
  return client.api<DispatchPlan>(url);
}

/**
 * POST /dispatch/apply — commit a reviewed set of assignment decisions.
 *
 * The route is @IdempotentRoute — the caller MUST supply an Idempotency-Key
 * header. A fresh UUID is minted per call so retries safely replay (the
 * @IdempotentRoute replays the same 200 on duplicate keys — the T7
 * RescheduleBoard / T5 CallbackController precedent). A re-apply of the same
 * decisions returns applied=0 (every WO already at target).
 *
 * Error: 4522/400 if assignments list is empty.
 *
 * Maps to: DispatchController @PostMapping("/apply") @IdempotentRoute (method apply())
 */
export function applyDispatch(
  client: CrmClient,
  body: ApplyRequest,
): Promise<ApplyResponse> {
  return client.api<ApplyResponse>("/dispatch/apply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify(body),
  });
}

/**
 * GET /dispatch/analytics?date=<ISO date>
 * Returns dispatch analytics for the given day.
 * Error: 4521/400 if date is missing.
 *
 * Maps to: DispatchController @GetMapping("/analytics") (method analytics())
 */
export function getDispatchAnalytics(
  client: CrmClient,
  date: string,
): Promise<DispatchAnalytics> {
  const url = `/dispatch/analytics?date=${encodeURIComponent(date)}`;
  return client.api<DispatchAnalytics>(url);
}
