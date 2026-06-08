import type {
  GbpReviewReply,
  PasteInReviewRequest,
  RiskBooking,
  WaitlistBoardDTO,
  WaitlistBoardEntry,
  WaitlistOffer,
} from "../types/api";
import type { CrmClient } from "./client";

// ChairFill — salon flagship (CF-5) — HAND-WRITTEN client.
//
// Every ChairFill BE controller is @ConditionalOnProperty(kmosf.modules.chairfill)
// -gated, so the endpoints are ABSENT from the committed openapi.json and the
// generated client has no methods for them (the Home-Services HS-4 precedent).
// These calls back the three CF-5 admin surfaces:
//   - No-show risk view  — GET /chairfill/risk/bookings?from&to
//   - Waitlist board      — GET /chairfill/waitlist/board (+ /entries, /offers)
//   - Review paste-in     — POST /chairfill/reviews/draft (lands in the shared
//                           GbpReviewReply queue the review inbox already lists)
//
// All are STAFF-authenticated + chairfill-module-gated on the BE.

/**
 * Upcoming bookings in the window with their no-show risk, sorted highest-risk
 * first (the BE sorts; unscored bookings sort last). `from`/`to` are ISO-8601
 * instants. Defaults to a 7-day window starting now when omitted.
 */
export function listRiskBookings(
  client: CrmClient,
  range?: { from?: string; to?: string },
): Promise<RiskBooking[]> {
  const now = new Date();
  const from = range?.from ?? now.toISOString();
  const to =
    range?.to ??
    new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const qs = new URLSearchParams({ from, to }).toString();
  return client.api<RiskBooking[]>(`/chairfill/risk/bookings?${qs}`);
}

/**
 * The one-shot board envelope: OPEN waitlist entries + recent offers (newest
 * first). `offerLimit` caps the recent-offers slice (BE default 50).
 */
export function getWaitlistBoard(
  client: CrmClient,
  offerLimit?: number,
): Promise<WaitlistBoardDTO> {
  const path =
    offerLimit && offerLimit > 0
      ? `/chairfill/waitlist/board?offerLimit=${offerLimit}`
      : "/chairfill/waitlist/board";
  return client.api<WaitlistBoardDTO>(path);
}

/** Just the OPEN waitlist entries, newest join first (incremental refresh). */
export function listWaitlistEntries(
  client: CrmClient,
): Promise<WaitlistBoardEntry[]> {
  return client.api<WaitlistBoardEntry[]>("/chairfill/waitlist/entries");
}

/** Just the recent offers (all statuses), newest sent first, capped by `limit`. */
export function listWaitlistOffers(
  client: CrmClient,
  limit?: number,
): Promise<WaitlistOffer[]> {
  const path =
    limit && limit > 0
      ? `/chairfill/waitlist/offers?limit=${limit}`
      : "/chairfill/waitlist/offers";
  return client.api<WaitlistOffer[]>(path);
}

/**
 * Draft an on-brand salon reply for a pasted-in review. The BE RAG-grounds it
 * in the salon's past approved replies and queues it DRAFTED in the same
 * GbpReviewReply queue the review inbox lists (never auto-posted). Returns the
 * queued reply. The BE 400s (errorCode 4240) if the comment is blank.
 */
export function draftSalonReviewReply(
  client: CrmClient,
  body: PasteInReviewRequest,
): Promise<GbpReviewReply> {
  return client.api<GbpReviewReply>("/chairfill/reviews/draft", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
