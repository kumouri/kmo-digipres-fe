import type {
  Appointment,
  CallbackInboxItemDTO,
  DraftedReply,
  FrontDeskScoringJob,
  PasteInReviewRequest,
  RecallDueDTO,
} from "../types/api";
import type { CrmClient } from "./client";

// FrontDesk IQ — Health Practices flagship (FD-5b) — HAND-WRITTEN client.
//
// Every FrontDesk IQ BE controller is @ConditionalOnProperty(kmosf.modules.frontdesk)
// -gated, so the endpoints are ABSENT from the committed openapi.json and the
// generated client has no methods for them (the Real Estate RE-5b / ChairFill
// CF-5b / Home-Services HS-4 precedent). These calls back the FD-5 admin
// surfaces:
//   - Risk-sorted day view  — GET /frontdesk/risk/appointments?from&to
//                            (+ POST /frontdesk/risk/retrain)
//   - Recall board          — GET /frontdesk/recall
//   - Callback inbox        — GET /frontdesk/callbacks (logistics only, no transcript)
//   - Review inbox          — POST /frontdesk/reviews/draft, GET /frontdesk/reviews,
//                            POST /frontdesk/reviews/{id}/approve, /{id}/skip
//   - Appointment console   — GET/POST /frontdesk/appointments (+ GET /{id})
//
// All are STAFF-authenticated + frontdesk-module-gated on the BE. The base path
// /api/v1 is prepended by the CrmClient's baseUrl, so the paths here are
// /frontdesk/... (matching the other hand-written modules).

// ── Risk-sorted day view ──────────────────────────────────────────────────────

/**
 * Upcoming appointments in the window with their no-show risk, sorted
 * highest-risk first (the BE sorts; unscored appointments sort last). Each row
 * carries only logistics metadata (visit-type bucket, lead time,
 * insurance-pending) — never a clinical field. `from`/`to` are ISO-8601
 * instants; defaults to tomorrow's full day when omitted.
 */
export function listAppointmentsByRisk(
  client: CrmClient,
  range?: { from?: string; to?: string },
): Promise<Appointment[]> {
  const now = new Date();
  // Default window: from now to 48h out — covers "tomorrow" for the demo.
  const from = range?.from ?? now.toISOString();
  const to =
    range?.to ??
    new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
  const qs = new URLSearchParams({ from, to }).toString();
  return client.api<Appointment[]>(`/frontdesk/risk/appointments?${qs}`);
}

/**
 * Trigger a manual no-show retrain for the current tenant. Returns 202 with the
 * scoring-job record to poll. 409 (errorCode 4275) if a retrain is already
 * running.
 */
export function retrainNoShowRisk(
  client: CrmClient,
): Promise<FrontDeskScoringJob> {
  return client.api<FrontDeskScoringJob>("/frontdesk/risk/retrain", {
    method: "POST",
  });
}

// ── Appointment console (create / list / get) ─────────────────────────────────

/** Every appointment for the tenant. */
export function listAppointments(client: CrmClient): Promise<Appointment[]> {
  return client.api<Appointment[]>("/frontdesk/appointments");
}

/** One appointment by id (4276 if missing / not owned). */
export function getAppointment(
  client: CrmClient,
  id: string,
): Promise<Appointment> {
  return client.api<Appointment>(`/frontdesk/appointments/${id}`);
}

/** Create an appointment. Returns the persisted appointment. */
export function createAppointment(
  client: CrmClient,
  body: Appointment,
): Promise<Appointment> {
  return client.api<Appointment>("/frontdesk/appointments", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Update an appointment (full replace of editable fields). Returns the updated row. */
export function updateAppointment(
  client: CrmClient,
  id: string,
  body: Appointment,
): Promise<Appointment> {
  return client.api<Appointment>(`/frontdesk/appointments/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

// ── Recall board + callback inbox ─────────────────────────────────────────────

/**
 * The recall board — lapsed patients due for recall/recare, most-overdue first.
 * Each row is a lean logistics projection (last-visit timestamp, days-since,
 * nudged-this-period) — no clinical reason for return.
 */
export function listRecallDue(client: CrmClient): Promise<RecallDueDTO[]> {
  return client.api<RecallDueDTO[]>("/frontdesk/recall");
}

/**
 * The callback inbox — after-hours voicemail callbacks, newest first. Each row
 * is logistics-only (caller name, callback phone, intent bucket, received) —
 * there is NO transcript field (fence F2); the UI shows the intent bucket, never
 * the spoken words.
 */
export function listCallbacks(
  client: CrmClient,
): Promise<CallbackInboxItemDTO[]> {
  return client.api<CallbackInboxItemDTO[]>("/frontdesk/callbacks");
}

// ── Review inbox (the signature demo: HIPAA-safe drafts) ──────────────────────

/**
 * Draft a HIPAA-safe reply for a pasted-in review and queue it DRAFTED. The BE
 * drafts a reply that never confirms patient status / names a procedure, runs
 * the deterministic HIPAA lint, and returns the queued draft + its lint flags.
 * The BE 400s (errorCode 4290) if the comment is blank.
 */
export function draftFrontDeskReviewReply(
  client: CrmClient,
  body: PasteInReviewRequest,
): Promise<DraftedReply> {
  return client.api<DraftedReply>("/frontdesk/reviews/draft", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** The tenant's DRAFTED review replies (most-recent first), each with its HIPAA-lint flags. */
export function listFrontDeskDraftedReplies(
  client: CrmClient,
): Promise<DraftedReply[]> {
  return client.api<DraftedReply[]>("/frontdesk/reviews");
}

/**
 * Approve a DRAFTED draft as copy-ready (marks it POSTED — no live Google call;
 * the staffer copies the reply into the GBP console). Returns the updated draft.
 * 4292 not-found, 4291 not-DRAFTED.
 */
export function approveFrontDeskReply(
  client: CrmClient,
  id: string,
): Promise<DraftedReply> {
  return client.api<DraftedReply>(`/frontdesk/reviews/${id}/approve`, {
    method: "POST",
  });
}

/** Skip a DRAFTED draft (marks it SKIPPED — no Google call). 4292 not-found, 4291 not-DRAFTED. */
export function skipFrontDeskReply(
  client: CrmClient,
  id: string,
): Promise<DraftedReply> {
  return client.api<DraftedReply>(`/frontdesk/reviews/${id}/skip`, {
    method: "POST",
  });
}
