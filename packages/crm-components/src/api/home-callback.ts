import type { CrmClient } from "./client";

// Home Services T5 "Instant Callback" — HAND-WRITTEN client.
//
// The CallbackController is @ConditionalOnProperty(kmosf.modules.home-services)-
// gated AND requires the responder module, so all routes are ABSENT from the
// committed openapi.json and the generated client has no methods for them
// (the T4 SwitchboardController / T3 MidnightResponderController precedent).
//
// These calls back the T5 "Instant Callback" dispatcher surface:
//
//   - Ranked queue      — GET  /home-services/callbacks
//                             → CallbackCardDTO[] (highest revenueScore first)
//   - Dispatch a card   — POST /home-services/callbacks/{id}/dispatch
//                             (@IdempotentRoute → Idempotency-Key REQUIRED per call)
//                             → CallbackCardDTO (status = DISPATCHED)
//   - Recovery stats    — GET  /home-services/callbacks/recovery-stats
//                             → CallbackRecoveryStats
//   - Config read       — GET  /home-services/callbacks/config
//                             (ADMIN; 4401/404 if not yet configured)
//   - Config upsert     — PUT  /home-services/callbacks/config
//                             (ADMIN; body CallbackController.ConfigRequest)
//                             → CallbackConfig
//
// Queue + dispatch + recovery-stats are staff-accessible (home-services auth
// chain, like DispatchBoardController / MissedCallInboxController). Config
// CRUD is ADMIN-gated. Error codes: 4400 (not found, 404), 4401 (config not
// found, 404), 4402 (not REQUESTED state, 409), 4403 (invalid config, 400).

// ---------------------------------------------------------------------------
// DTOs — mirror the BE records exactly
// ---------------------------------------------------------------------------

/**
 * One card in the dispatcher's revenue-ranked callback queue.
 * Maps to: CallbackCardDTO (module/homeservices/callback/dto/CallbackCardDTO.java)
 *
 * Fields (all 14, in declaration order):
 *   id, contactId, fromPhone, mode, requestedWindowText, requestedAt,
 *   status, summaryLine, urgency, jobValueBand, revenueScore,
 *   workOrderId, callSid, createdAt
 */
export interface CallbackCardDTO {
  /** The CallbackRequest id. */
  id: string;
  /** The caller's Contact id (nullable). */
  contactId: string | null;
  /** The caller's phone in E.164 format. */
  fromPhone: string;
  /** IMMEDIATE | SCHEDULED */
  mode: string | null;
  /** The caller's raw window phrase, e.g. "after 3pm". */
  requestedWindowText: string | null;
  /** Best-effort parsed window instant (ISO string, nullable). */
  requestedAt: string | null;
  /** REQUESTED | DISPATCHED | COMPLETED | CANCELLED */
  status: string;
  /** AI one-line summary from the voicemail (nullable). */
  summaryLine: string | null;
  /** Routing urgency: EMERGENCY | URGENT | ROUTINE (nullable). */
  urgency: string | null;
  /** Coarse job-value band: SMALL | MEDIUM | LARGE (nullable). */
  jobValueBand: string | null;
  /** Deterministic rank score — the queue is ordered descending by this. */
  revenueScore: number;
  /** The DRAFT WorkOrder the voicemail intake created (nullable). */
  workOrderId: string | null;
  /** The originating voicemail CallSid (nullable). */
  callSid: string | null;
  /** When the callback was requested (ISO string). */
  createdAt: string;
}

/**
 * The missed-call → callback recovery funnel read.
 * Maps to: CallbackRecoveryStats (dto/CallbackRecoveryStats.java)
 */
export interface CallbackRecoveryStats {
  /** Callback opt-in SMS sent (OFFERED stage). */
  offered: number;
  /** Callers who replied opting in (ACCEPTED stage). */
  accepted: number;
  /** Callbacks a dispatcher claimed (DISPATCHED stage). */
  dispatched: number;
  /** accepted / offered (0.0 when none offered). */
  acceptanceRate: number;
  /** dispatched / accepted (0.0 when none accepted). */
  dispatchRate: number;
}

/**
 * Per-tenant callback copy book — CallbackConfig.
 * Maps to: CallbackConfig (module/homeservices/callback/CallbackConfig.java)
 */
export interface CallbackConfig {
  id: string;
  tenantId: string;
  /** The opt-in SMS texted to a caller after a home-services voicemail. */
  offerMessage: string | null;
  /** The confirmation reply for an immediate callback. */
  immediateConfirmMessage: string | null;
  /** The confirmation reply for a scheduled callback. */
  scheduledConfirmMessage: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * PUT request body — CallbackController.ConfigRequest.
 * All fields nullable; a blank field falls back to CallbackCopy defaults at send time.
 */
export interface CallbackConfigRequest {
  offerMessage: string | null;
  immediateConfirmMessage: string | null;
  scheduledConfirmMessage: string | null;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * The revenue-ranked open callback queue (REQUESTED, highest revenueScore first).
 *
 * Maps to: GET /home-services/callbacks
 * Controller: CallbackController @GetMapping (method queue())
 */
export function listCallbackQueue(
  client: CrmClient,
): Promise<CallbackCardDTO[]> {
  return client.api<CallbackCardDTO[]>("/home-services/callbacks");
}

/**
 * Mark a callback DISPATCHED. The route is @IdempotentRoute — the caller MUST
 * supply an Idempotency-Key header. A fresh UUID is minted per call so retries
 * can safely re-dispatch (the @IdempotentRoute replays the same 200 on
 * duplicate keys — the proposals/segment-and-enroll precedent).
 *
 * Errors: 4400/404 (not found); 4402/409 (not in REQUESTED state).
 *
 * Maps to: POST /home-services/callbacks/{id}/dispatch
 * Controller: CallbackController @PostMapping("/{id}/dispatch") @IdempotentRoute
 */
export function dispatchCallback(
  client: CrmClient,
  id: string,
): Promise<CallbackCardDTO> {
  return client.api<CallbackCardDTO>(
    `/home-services/callbacks/${encodeURIComponent(id)}/dispatch`,
    {
      method: "POST",
      headers: { "Idempotency-Key": crypto.randomUUID() },
    },
  );
}

/**
 * The missed-call → callback recovery funnel stats.
 *
 * Maps to: GET /home-services/callbacks/recovery-stats
 * Controller: CallbackController @GetMapping("/recovery-stats") (method recoveryStats())
 */
export function getCallbackRecoveryStats(
  client: CrmClient,
): Promise<CallbackRecoveryStats> {
  return client.api<CallbackRecoveryStats>(
    "/home-services/callbacks/recovery-stats",
  );
}

/**
 * Read the tenant's callback copy book. 404 (errorCode 4401) if no config has
 * been created yet — the caller should render a friendly empty state.
 *
 * Maps to: GET /home-services/callbacks/config
 * Controller: CallbackController @GetMapping("/config") ADMIN-gated (method getConfig())
 */
export function getCallbackConfig(
  client: CrmClient,
): Promise<CallbackConfig> {
  return client.api<CallbackConfig>("/home-services/callbacks/config");
}

/**
 * Upsert the tenant's callback copy book (one row per tenant).
 *
 * Maps to: PUT /home-services/callbacks/config  body: CallbackController.ConfigRequest
 * Controller: CallbackController @PutMapping("/config") ADMIN-gated (method upsertConfig())
 */
export function saveCallbackConfig(
  client: CrmClient,
  body: CallbackConfigRequest,
): Promise<CallbackConfig> {
  return client.api<CallbackConfig>("/home-services/callbacks/config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
