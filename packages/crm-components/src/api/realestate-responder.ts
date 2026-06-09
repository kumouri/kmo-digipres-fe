import type { CrmClient } from "./client";

// Real Estate "Midnight Responder" (T3) — HAND-WRITTEN client.
//
// The RE-responder BE controllers are @ConditionalOnProperty(kmosf.modules.realestate)-
// gated AND require the responder module, so neither set of routes is in the
// committed openapi.json and the generated client has no methods for them
// (the T1 / AR / proposals precedent). These calls back the responder admin
// panels — the response-latency stats and the tier-routing config:
//
//   - Latency stats  — GET  /realestate/responder/latency-stats[?zoneId=]
//                          (MidnightResponderStatsController @RequestMapping
//                           /realestate/responder → @GetMapping /latency-stats)
//   - Config read    — GET  /realestate/responder/config
//                          (MidnightResponderConfigController @RequestMapping
//                           /realestate/responder/config → @GetMapping)
//   - Config upsert  — PUT  /realestate/responder/config
//                          (same controller → @PutMapping; body is
//                           MidnightResponderConfigDTO — all fields nullable)
//
// Shared nurture campaigns for the tier dropdowns come from the existing
// listNurtureCampaigns() in realestate-nurture.ts → GET /nurture/campaigns.
//
// Both controllers gate: realestate-module-AND-responder-module enabled for the
// tenant + STAFF role. Error codes: 4380 (config not yet created, 404), 4381
// (tier campaign id does not resolve to a tenant campaign, 400).
// The base path /api/v1 is prepended by CrmClient, so these paths are relative.

// ---------------------------------------------------------------------------
// DTOs — mirror the BE records / request bodies exactly
// ---------------------------------------------------------------------------

/**
 * One row per tenant — MidnightResponderConfig. Server-managed fields
 * (id, tenantId, version, createdAt, updatedAt) are read-only; the form
 * upserts via MidnightResponderConfigDTO (all-nullable).
 */
export interface MidnightResponderConfig {
  id: string;
  tenantId: string;
  /** NurtureCampaign id a WARM lead auto-enrolls into; null → WARM routes nowhere. */
  warmCampaignId: string | null;
  /** NurtureCampaign id a COLD lead auto-enrolls into; null → COLD routes nowhere. */
  coldCampaignId: string | null;
  /** When true, a concierge HANDOFF turn also delegates to the E2 responder handoff. */
  delegateHandoffToResponder: boolean;
  /** Business-hours window start (local hour, inclusive) used for the after-hours share. */
  afterHoursStartHour: number;
  /** Business-hours window end (local hour, exclusive) used for the after-hours share. */
  afterHoursEndHour: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * PUT request body — MidnightResponderConfigDTO. All fields nullable; null
 * preserves the existing value (partial upsert). Tier campaign ids are validated
 * against the tenant's campaigns by the BE (4381).
 */
export interface MidnightResponderConfigDTO {
  warmCampaignId: string | null;
  coldCampaignId: string | null;
  delegateHandoffToResponder: boolean | null;
  afterHoursStartHour: number | null;
  afterHoursEndHour: number | null;
}

/**
 * Response-latency stats — MidnightResponderLatencyStats record. Aggregated
 * in-service over the tenant's ConciergeConversation assistant turns. The
 * "<30 s, 24/7" demo headline lives here.
 */
export interface MidnightResponderLatencyStats {
  /** Assistant turns with a recorded received→replied latency. */
  repliedTurns: number;
  /** Median received→replied latency in ms (0 when no timed turns). */
  p50LatencyMs: number;
  /** 95th-percentile received→replied latency in ms. */
  p95LatencyMs: number;
  /** Slowest recorded received→replied latency in ms. */
  maxLatencyMs: number;
  /** Buyer turns received OUTSIDE the configured business-hours window. */
  afterHoursTurns: number;
  /** Buyer turns with a recorded receipt time (the after-hours base). */
  totalBuyerTurns: number;
  /** afterHoursTurns / totalBuyerTurns in [0.0, 1.0]; 0 when none. */
  afterHoursShare: number;
  /** Business-hours window start (local hour, inclusive) used for the share. */
  afterHoursStartHour: number;
  /** Business-hours window end (local hour, exclusive) used for the share. */
  afterHoursEndHour: number;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Aggregated responder-latency stats for the tenant. An optional IANA zone id
 * (e.g. "America/Chicago") sets the local zone for after-hours classification;
 * omit for UTC.
 *
 * Maps to: GET /realestate/responder/latency-stats[?zoneId=<zone>]
 */
export function getResponderLatencyStats(
  client: CrmClient,
  zoneId?: string,
): Promise<MidnightResponderLatencyStats> {
  const qs = zoneId ? `?zoneId=${encodeURIComponent(zoneId)}` : "";
  return client.api<MidnightResponderLatencyStats>(
    `/realestate/responder/latency-stats${qs}`,
  );
}

/**
 * Read the tenant's Midnight Responder config. 404 (errorCode 4380) if no
 * config has been created yet — the caller should render a friendly empty state
 * with an "Initial setup" save form.
 *
 * Maps to: GET /realestate/responder/config
 */
export function getResponderConfig(
  client: CrmClient,
): Promise<MidnightResponderConfig> {
  return client.api<MidnightResponderConfig>("/realestate/responder/config");
}

/**
 * Upsert the tenant's Midnight Responder config (one row per tenant). Null
 * fields preserve existing values. Validates tier campaign ids against the
 * tenant's NurtureCampaigns (4381 if not found).
 *
 * Maps to: PUT /realestate/responder/config  body: MidnightResponderConfigDTO
 */
export function saveResponderConfig(
  client: CrmClient,
  body: MidnightResponderConfigDTO,
): Promise<MidnightResponderConfig> {
  return client.api<MidnightResponderConfig>("/realestate/responder/config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
