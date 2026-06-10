import type { CrmClient } from "./client";

// Health "RescheduleFlow" (T7) — HAND-WRITTEN client.
//
// The RescheduleController is @ConditionalOnProperty(kmosf.modules.frontdesk)-
// gated AND requires the waitlist module, so none of its routes appear in the
// committed openapi.json (the T4 SwitchboardController / T5 CallbackController
// precedent). These calls back the RescheduleBoard admin panel — the waitlist
// join form, the waitlist table, and the fill-funnel stats:
//
//   - Join waitlist    — POST /frontdesk/reschedule/waitlist @IdempotentRoute
//                           (body: WaitlistJoinRequest; 4421 if no contactId;
//                            sends Idempotency-Key header per the T5 dispatch
//                            precedent). Returns WaitlistEntry (201).
//   - List waitlist    — GET  /frontdesk/reschedule/waitlist
//                           → WaitlistEntry[] (newest first)
//   - Fill stats       — GET  /frontdesk/reschedule/fill-stats
//                           → RescheduleFillStats{cancellations,offers,claims,
//                              filled,fillRate}
//
// Controller gate: frontdesk-AND-waitlist-module-enabled for the tenant + ADMIN
// role (1800 otherwise; 1130/1132 if a module is off). The base path /api/v1 is
// prepended by CrmClient, so these paths are relative.
//
// PHI-free by construction (fence F1): WaitlistEntry carries only logistics-only
// preferences (provider + earliest/latest window + show-likelihood signals
// priorNoShowCount/priorVisitCount/lastVisitAt). No clinical field is accepted
// or surfaced. slotType is the fixed token "health-appt" (never a procedure).

// ---------------------------------------------------------------------------
// DTOs — mirror the BE records / request bodies exactly
// ---------------------------------------------------------------------------

/**
 * WaitlistEntry status enum (WaitlistEntry.Status on the BE).
 * OPEN = waiting; FULFILLED = won a freed slot; CANCELLED = staff-cancelled.
 */
export type WaitlistEntryStatus = "OPEN" | "FULFILLED" | "CANCELLED";

/**
 * Generic waitlist entry (com.kumouri.kmodigipresbe.model.waitlist.WaitlistEntry).
 *
 * PHI-free: no clinical fields. slotType is the fixed logistics token
 * "health-appt". Show-likelihood signals (priorNoShowCount / priorVisitCount /
 * lastVisitAt) are logistics counters — never a diagnosis or procedure.
 *
 * Server-managed fields (tenantId, version, createdAt, updatedAt) are
 * read-only; the join form writes via WaitlistJoinRequest.
 */
export interface WaitlistEntry {
  id: string;
  tenantId: string;
  /** The waitlisted patient (contact record ID). */
  contactId: string;
  /** Fixed logistics token — always "health-appt" for the health RescheduleFlow. */
  slotType: string;
  /** Optional — only match a freed slot with this provider (clinician ID). null = any. */
  providerId: string | null;
  /** Optional lower bound on the acceptable slot start (ISO string). null = no lower bound. */
  earliestStart: string | null;
  /** Optional upper bound on the acceptable slot start (ISO string). null = no upper bound. */
  latestStart: string | null;
  /** SMS consent — only true entries are ever offered a freed slot (TCPA). */
  smsOptIn: boolean;
  /** OPEN → FULFILLED (slot claimed) | CANCELLED (staff-cancelled). */
  status: WaitlistEntryStatus;
  /** Optional free-form scheduling note (e.g. "any afternoon works"). NOT clinical. */
  notes: string | null;
  /** Prior no-shows for this patient as known to staff. 0 = none/unknown. */
  priorNoShowCount: number;
  /** Prior completed visits for this patient. 0 = cold start. */
  priorVisitCount: number;
  /** Last visit timestamp (ISO string). null = never/unknown (cold start). */
  lastVisitAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * POST body — RescheduleController.WaitlistJoinRequest on the BE.
 * All fields except contactId are optional. Logistics-only — no clinical field.
 *
 * @param contactId    required — the patient/contact joining the waitlist
 * @param providerId   optional — only match a freed slot with this provider
 * @param earliestStart optional lower bound on an acceptable slot start
 * @param latestStart  optional upper bound on an acceptable slot start
 * @param smsOptIn     SMS consent (default true — the waitlist join IS the opt-in)
 * @param notes        optional free-form scheduling note — NOT clinical
 * @param priorNoShowCount optional show-likelihood signal — prior no-shows
 * @param priorVisitCount  optional show-likelihood signal — prior completed visits
 * @param lastVisitAt  optional show-likelihood signal — last visit timestamp
 */
export interface WaitlistJoinRequest {
  contactId: string;
  providerId: string | null;
  earliestStart: string | null;
  latestStart: string | null;
  smsOptIn: boolean | null;
  notes: string | null;
  priorNoShowCount: number | null;
  priorVisitCount: number | null;
  lastVisitAt: string | null;
}

/**
 * PHI-free fill-funnel analytics (RescheduleFillStats record on the BE).
 * Counters only: the four stages of a gap-fill run + the derived fill rate.
 *
 * @see RescheduleController @GetMapping /fill-stats
 */
export interface RescheduleFillStats {
  /** Cancelled appointments that kicked off a gap-fill cycle. */
  cancellations: number;
  /** Gap-fills that issued at least one ranked offer SMS. */
  offers: number;
  /** Inbound YES replies that atomically claimed a freed slot. */
  claims: number;
  /** Winning claims that materialized a real replacement appointment. */
  filled: number;
  /** filled / cancellations; 0.0 when cancellations == 0 (scale-4 HALF_UP on the BE). */
  fillRate: number;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Join the health waitlist (logistics-only prefs). Sends an Idempotency-Key
 * header (minted by the caller, per the T5 dispatch / segment-and-enroll
 * precedent) so repeat submissions from a double-click are idempotent.
 *
 * Maps to: POST /frontdesk/reschedule/waitlist  @IdempotentRoute  ADMIN
 * Controller: RescheduleController @PostMapping /waitlist
 * Response: 201 WaitlistEntry; 4421/400 if body has no contactId.
 */
export function joinWaitlist(
  client: CrmClient,
  body: WaitlistJoinRequest,
  idempotencyKey: string,
): Promise<WaitlistEntry> {
  return client.api<WaitlistEntry>("/frontdesk/reschedule/waitlist", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(body),
  });
}

/**
 * The tenant's health waitlist entries, newest join first.
 *
 * Maps to: GET /frontdesk/reschedule/waitlist  ADMIN
 * Controller: RescheduleController @GetMapping /waitlist
 */
export function listWaitlist(client: CrmClient): Promise<WaitlistEntry[]> {
  return client.api<WaitlistEntry[]>("/frontdesk/reschedule/waitlist");
}

/**
 * The PHI-free fill-funnel analytics:
 * cancellations → offers → claims → filled + the fill rate.
 *
 * Maps to: GET /frontdesk/reschedule/fill-stats  ADMIN
 * Controller: RescheduleController @GetMapping /fill-stats
 */
export function getRescheduleFillStats(
  client: CrmClient,
): Promise<RescheduleFillStats> {
  return client.api<RescheduleFillStats>("/frontdesk/reschedule/fill-stats");
}
