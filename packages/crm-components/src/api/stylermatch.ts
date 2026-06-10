import type { CrmClient } from "./client";

// Salon T12 "StylerMatch" — HAND-WRITTEN client.
//
// The StylerMatchController and StylerMatchTokenController are
// @ConditionalOnProperty(kmosf.modules.chairfill)-gated, so all routes are
// ABSENT from the committed openapi.json and the generated client has no
// methods for them (the T9 StyleConsultController precedent).
//
// These calls back the T12 "StylerMatch" office surfaces:
//
//   - Create a match   — POST /stylermatch/matches
//                            body: StylerMatchRequestBody
//                            → StylerMatchResponse (201)
//   - Matches list     — GET  /stylermatch/matches[?status=]
//                            → StylerMatchResponse[] (newest first)
//   - Match detail     — GET  /stylermatch/matches/{id}
//                            → StylerMatchResponse (4485 if absent)
//   - Analytics        — GET  /stylermatch/analytics
//                            → StylerMatchAnalytics (accept-rate by rank funnel)
//   - Issue token      — POST /stylermatch/tokens
//                            (ADMIN) → {"token":"…"} (201, 180-day TTL)
//
//   - Book top match   — POST /public/integrations/stylermatch/{token}/matches/{matchId}/accept
//                            ?staffMemberId= (optional — default = rank-1)
//                            → StylerMatchResponse (client-side accept = booking)
//
// The public intake route (POST /public/integrations/stylermatch/{token}/match)
// is NOT part of this admin surface — the token-issue button surfaces the
// widget URL/link for staff to share.
//
// Error codes: 4485 (match not found, 404); 4480 (wrong token type, 401);
//              4481 (empty request body, 400); 4483 (no rankable stylist, 422).

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/**
 * StylerMatchStatus — the lifecycle of a match submission.
 * Maps to: StylerMatchStatus (module/stylermatch/model/StylerMatchStatus.java)
 */
export type StylerMatchStatus = "NEW" | "BOOKED";

// ---------------------------------------------------------------------------
// DTOs — mirror the BE records exactly
// ---------------------------------------------------------------------------

/**
 * One ranked stylist match embedded in a StylerMatchResponse.
 * Maps to: RankedMatch (module/stylermatch/model/RankedMatch.java)
 *
 * Fields (all 9, in declaration order):
 *   staffMemberId, displayName, score, confidence, rationale,
 *   specialtyFit, availability, preference, eligibleForRequestedService
 */
export interface RankedMatch {
  /** The matched StaffMember id. */
  staffMemberId: string;
  /** The stylist's name snapshot. */
  displayName: string;
  /** The composite match score in [0,1] (the sort key, descending). */
  score: number;
  /** How many scoring signals were available, in [0,1]. */
  confidence: number;
  /** The human-readable why (always includes the "salon will confirm" note). */
  rationale: string;
  /** The specialty/style-fit component in [0,1]. */
  specialtyFit: number;
  /** The slot-availability component in [0,1] (0.5 neutral when no slot). */
  availability: number;
  /** The past-/explicit-preference component in [0,1] (0 when none). */
  preference: number;
  /**
   * HARD eligibility result for the requested service.
   * true when no service was requested, or the stylist is certified/eligible-for-all.
   * false = not certified for this service (heavily penalized; booking step re-validates).
   */
  eligibleForRequestedService: boolean;
}

/**
 * The staff create + inbox detail response.
 * Maps to: StylerMatchResponse (module/stylermatch/controller/dto/StylerMatchResponse.java)
 *
 * Fields (all 12, in declaration order):
 *   matchId, serviceMenuItemId, serviceMenuItemName, styleCategory,
 *   slotStart, slotEnd, confidence, rankedMatches, status,
 *   selectedStaffMemberId, selectedRank, bookingId
 */
export interface StylerMatchResponse {
  /** The persisted StylerMatch id (the accept endpoint takes it). */
  matchId: string;
  /** The requested service id, nullable. */
  serviceMenuItemId: string | null;
  /** The requested service name snapshot, nullable. */
  serviceMenuItemName: string | null;
  /** The requested style category, nullable. */
  styleCategory: string | null;
  /** The requested slot start, nullable (ISO string). */
  slotStart: string | null;
  /** The requested slot end, nullable (ISO string). */
  slotEnd: string | null;
  /** The match confidence in [0,1]. */
  confidence: number;
  /** The ranked stylists, best-fit first. */
  rankedMatches: RankedMatch[];
  /** NEW or BOOKED */
  status: StylerMatchStatus;
  /** The stylist booked on accept (null until booked). */
  selectedStaffMemberId: string | null;
  /** The 1-based rank that was booked (null until booked). */
  selectedRank: number | null;
  /** The salon Booking created on accept (null until booked). */
  bookingId: string | null;
}

/**
 * The match funnel analytics (accept-rate by rank).
 * Maps to: StylerMatchAnalytics (module/stylermatch/controller/dto/StylerMatchAnalytics.java)
 *
 * Fields (all 8, in declaration order):
 *   totalMatches, matchesBooked, bookingRate, top1BookedCount,
 *   top2BookedCount, top3PlusBookedCount, top1AcceptRate, avgTopScore
 */
export interface StylerMatchAnalytics {
  /** All matches submitted. */
  totalMatches: number;
  /** Matches that converted to a booking. */
  matchesBooked: number;
  /** matchesBooked / totalMatches in [0,1] (0 if none). */
  bookingRate: number;
  /** Booked matches where the client picked the rank-1 stylist. */
  top1BookedCount: number;
  /** Booked matches where the client picked the rank-2 stylist. */
  top2BookedCount: number;
  /** Booked matches where the client picked a rank-3-or-lower stylist. */
  top3PlusBookedCount: number;
  /** top1BookedCount / matchesBooked in [0,1] (the ranking-quality signal). */
  top1AcceptRate: number;
  /** Mean rank-1 composite score across all matches. */
  avgTopScore: number;
}

/**
 * Request body for creating a new styler match from the staff desk.
 * Maps to: StylerMatchRequestBody (module/stylermatch/controller/dto/StylerMatchRequestBody.java)
 *
 * Fields (all 13, in declaration order):
 *   serviceMenuItemId, styleCategory, length, texture, color,
 *   preferredStaffMemberId, contactId, slotStart, slotEnd,
 *   name, phone, email, notes
 */
export interface StylerMatchRequestBody {
  /** The requested service id (hard eligibility + booking). */
  serviceMenuItemId?: string | null;
  /** The desired look / style category (primary specialty-fit signal). */
  styleCategory?: string | null;
  /** Requested/own hair length. */
  length?: string | null;
  /** Requested/own hair texture. */
  texture?: string | null;
  /** Requested/own hair color. */
  color?: string | null;
  /** Explicit preferred stylist id (largest preference bump). */
  preferredStaffMemberId?: string | null;
  /** An existing contact id (staff desk path). */
  contactId?: string | null;
  /** The start of the requested slot (ISO string). */
  slotStart?: string | null;
  /** The end of the requested slot (ISO string). */
  slotEnd?: string | null;
  /** The client's name (find-or-create). */
  name?: string | null;
  /** The client's phone — E.164 (find-or-create + SMS booking link). */
  phone?: string | null;
  /** The client's email (find-or-create). */
  email?: string | null;
  /** Free-text note. */
  notes?: string | null;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Create a new styler match from the staff desk (201).
 * Returns the ranked StylerMatchResponse immediately.
 *
 * Maps to: POST /stylermatch/matches
 * Controller: StylerMatchController @PostMapping("/matches") (method create())
 */
export function createStylerMatch(
  client: CrmClient,
  body: StylerMatchRequestBody,
): Promise<StylerMatchResponse> {
  return client.api<StylerMatchResponse>("/stylermatch/matches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * The staff matches inbox list, newest first.
 * Optional status filter limits to a single lifecycle stage.
 *
 * Maps to: GET /stylermatch/matches[?status=<StylerMatchStatus>]
 * Controller: StylerMatchController @GetMapping("/matches") (method list())
 */
export function listStylerMatches(
  client: CrmClient,
  status?: StylerMatchStatus,
): Promise<StylerMatchResponse[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return client.api<StylerMatchResponse[]>(`/stylermatch/matches${qs}`);
}

/**
 * Full detail for a single styler match (4485/404 if not found).
 *
 * Maps to: GET /stylermatch/matches/{id}
 * Controller: StylerMatchController @GetMapping("/matches/{id}") (method detail())
 */
export function getStylerMatch(
  client: CrmClient,
  id: string,
): Promise<StylerMatchResponse> {
  return client.api<StylerMatchResponse>(
    `/stylermatch/matches/${encodeURIComponent(id)}`,
  );
}

/**
 * Accept-rate-by-rank funnel analytics for the tenant's matches.
 *
 * Maps to: GET /stylermatch/analytics
 * Controller: StylerMatchController @GetMapping("/analytics") (method analytics())
 */
export function getStylerMatchAnalytics(
  client: CrmClient,
): Promise<StylerMatchAnalytics> {
  return client.api<StylerMatchAnalytics>("/stylermatch/analytics");
}

/**
 * Issue a match widget token (180-day TTL, ADMIN-gated).
 * The token goes into the salon's website widget snippet / QR code; the public
 * StylerMatchIntakeController accepts submissions and resolves the tenant from the token.
 *
 * Returns: {"token": "<jwt>"} — the caller builds the widget URL as
 *   <base>/embed-demo?type=styler-match&token=<token>  (or the public intake URL).
 *
 * Maps to: POST /stylermatch/tokens
 * Controller: StylerMatchTokenController @PostMapping (ADMIN-gated, method issue())
 */
export function issueStylerMatchToken(
  client: CrmClient,
): Promise<{ token: string }> {
  return client.api<{ token: string }>("/stylermatch/tokens", {
    method: "POST",
  });
}

/**
 * Book (accept) the top-ranked stylist on a match.
 * Uses the public token-based accept endpoint — the admin desk passes the
 * current widget token + the match id to trigger the booking.
 * An optional staffMemberId chooses a non-top-ranked stylist (default = rank 1).
 *
 * Maps to: POST /public/integrations/stylermatch/{token}/matches/{matchId}/accept
 *          ?staffMemberId=<uuid>  (optional)
 * Controller: StylerMatchAcceptController @PostMapping("/{token}/matches/{matchId}/accept")
 */
export function bookTopStylerMatch(
  _client: CrmClient,
  token: string,
  matchId: string,
  staffMemberId?: string | null,
): Promise<StylerMatchResponse> {
  const qs = staffMemberId
    ? `?staffMemberId=${encodeURIComponent(staffMemberId)}`
    : "";
  // This hits the public (non-/api/v1) path. We use the raw fetch so the
  // CRM client's /api/v1 base prefix is not applied.
  return fetch(
    `/public/integrations/stylermatch/${encodeURIComponent(token)}/matches/${encodeURIComponent(matchId)}/accept${qs}`,
    { method: "POST" },
  ).then(async (res) => {
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `HTTP ${res.status}`);
    }
    return res.json() as Promise<StylerMatchResponse>;
  });
}
