import type { CrmClient } from "./client";

// Health "Switchboard AI" (T4) — HAND-WRITTEN client.
//
// The Switchboard BE controllers are @ConditionalOnProperty(kmosf.modules.frontdesk)-
// gated AND require the responder module, so neither set of routes is in the
// committed openapi.json and the generated client has no methods for them
// (the T1 / AR / T3 / proposals precedent). These calls back the switchboard admin
// panels — the logistics config card and the deflection-analytics read:
//
//   - Config read    — GET /frontdesk/switchboard/config
//                         (SwitchboardController @RequestMapping /frontdesk/switchboard
//                          → @GetMapping /config; 4391/404 if not yet configured)
//   - Config upsert  — PUT /frontdesk/switchboard/config
//                         (same controller → @PutMapping /config; body is
//                          SwitchboardController.ConfigRequest)
//   - Deflection stats — GET /frontdesk/switchboard/deflection-stats
//                         (same controller → @GetMapping /deflection-stats;
//                          SwitchboardDeflectionStats { logistics, tripwire,
//                          handoff, total, deflectionRate })
//
// Both controllers gate: frontdesk-AND-responder-module-enabled for the
// tenant + ADMIN role. Error codes: 4391 (config not yet created, 404),
// 4392 (invalid config, 400).
// The base path /api/v1 is prepended by CrmClient, so these paths are relative.
//
// PHI-free by construction: SwitchboardConfig holds only logistics answers
// (hours, location, booking/reschedule instructions, form links) — no patient
// names, diagnoses, or clinical detail ever appear in any field.

// ---------------------------------------------------------------------------
// DTOs — mirror the BE records / request bodies exactly
// ---------------------------------------------------------------------------

/**
 * Per-tenant switchboard logistics answer book — SwitchboardConfig. Server-managed
 * fields (id, tenantId, version, createdAt, updatedAt) are read-only; the form
 * upserts via SwitchboardConfigRequest (all optional).
 *
 * Generic / PHI-free content only: no patient names, procedures, providers, or
 * diagnoses ever belong in these fields. Only logistics: hours, location, links.
 */
export interface SwitchboardConfig {
  id: string;
  tenantId: string;
  /** Free-text office hours, e.g. "Mon–Thu 8am–5pm, Fri 8am–2pm". */
  hoursText: string | null;
  /** Free-text location / address / directions. */
  locationText: string | null;
  /** Whether the practice is accepting new patients. */
  acceptingNewPatients: boolean;
  /** Optional override copy for the accepting-new-patients answer. */
  acceptingNewPatientsText: string | null;
  /** How a patient books a new appointment (phone number / link / instruction). */
  bookingInstructions: string | null;
  /** How a patient reschedules or cancels. */
  rescheduleInstructions: string | null;
  /** A link to the new-patient intake / registration forms. */
  intakeFormUrl: string | null;
  /** A link where a patient can leave a review. */
  reviewLinkUrl: string | null;
  /** Optional per-intent fully-rendered answer overrides (keyed by intent name). */
  answerOverrides: Record<string, string>;
  /** The safe reply for a clinical-tripwire message. Generic/PHI-free only. */
  safeTripwireReply: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * PUT request body — SwitchboardController.ConfigRequest. Mirrors the BE record
 * exactly. All fields are optional (nullable); null/absent fields receive default
 * values on create or preserve existing values on update.
 */
export interface SwitchboardConfigRequest {
  hoursText: string | null;
  locationText: string | null;
  acceptingNewPatients: boolean | null;
  acceptingNewPatientsText: string | null;
  bookingInstructions: string | null;
  rescheduleInstructions: string | null;
  intakeFormUrl: string | null;
  reviewLinkUrl: string | null;
  answerOverrides: Record<string, string> | null;
  safeTripwireReply: string | null;
}

/**
 * PHI-free deflection analytics — SwitchboardDeflectionStats record. Counters
 * only: logistics-handled, clinical-tripwire, unmatched-handoff, total, and
 * the fraction the AI resolved without a staff escalation.
 *
 * @see SwitchboardController @GetMapping /deflection-stats
 */
export interface SwitchboardDeflectionStats {
  /** Messages answered by the logistics handler (front-desk overflow handled). */
  logistics: number;
  /** Clinical/symptom messages handed off by the tripwire (no transcript kept). */
  tripwire: number;
  /** Unmatched/UNKNOWN messages handed off to staff by the default handoff. */
  handoff: number;
  /** logistics + tripwire + handoff. */
  total: number;
  /** Fraction of all messages the AI resolved without a staff handoff (logistics / total). */
  deflectionRate: number;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Read the tenant's Switchboard logistics config. 404 (errorCode 4391) if no
 * config has been created yet — the caller should render a friendly empty state
 * with an "Initial setup" save form.
 *
 * Maps to: GET /frontdesk/switchboard/config
 * Controller: SwitchboardController @GetMapping /config
 */
export function getSwitchboardConfig(
  client: CrmClient,
): Promise<SwitchboardConfig> {
  return client.api<SwitchboardConfig>("/frontdesk/switchboard/config");
}

/**
 * Upsert the tenant's Switchboard logistics config (one row per tenant). Null
 * fields receive defaults on create or preserve existing values on update.
 *
 * Maps to: PUT /frontdesk/switchboard/config  body: SwitchboardController.ConfigRequest
 * Controller: SwitchboardController @PutMapping /config
 */
export function saveSwitchboardConfig(
  client: CrmClient,
  body: SwitchboardConfigRequest,
): Promise<SwitchboardConfig> {
  return client.api<SwitchboardConfig>("/frontdesk/switchboard/config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * The PHI-free deflection analytics: how many messages the AI resolved
 * vs. tripwire-handed-off vs. unmatched-handoff, plus the overall rate.
 *
 * Maps to: GET /frontdesk/switchboard/deflection-stats
 * Controller: SwitchboardController @GetMapping /deflection-stats
 */
export function getSwitchboardDeflectionStats(
  client: CrmClient,
): Promise<SwitchboardDeflectionStats> {
  return client.api<SwitchboardDeflectionStats>(
    "/frontdesk/switchboard/deflection-stats",
  );
}
