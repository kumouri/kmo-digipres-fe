import type { CrmClient } from "./client";

// Real Estate Concierge (T10 — Listing Prep Studio) — HAND-WRITTEN client.
//
// Every Real Estate BE controller is @ConditionalOnProperty(kmosf.modules.realestate)
// -gated, so the endpoints are ABSENT from the committed openapi.json and the
// generated client has no methods for them (the RE-5b / ChairFill / Home-Services
// precedent). No Idempotency-Key on generate (the BE controller has no
// @IdempotentRoute). These calls back the T10 Listing Prep Studio admin surface.
//
// Endpoint mapping (controller: module/realestate/listingprep/controller/ListingPrepController.java):
//   POST /realestate/listings/{listingId}/prep/generate  → ListingPrepPack (DRAFTED)
//   GET  /realestate/listings/{listingId}/prep/packs     → ListingPrepPack[] (history)
//   GET  /realestate/prep/packs                          → ListingPrepPack[] (DRAFTED queue)
//   GET  /realestate/prep/packs/{id}                     → ListingPrepPack
//   POST /realestate/prep/packs/{id}/approve             → ListingPrepPack (APPROVED)
//   POST /realestate/prep/packs/{id}/skip                → ListingPrepPack (SKIPPED)
//
// All are STAFF-authenticated + realestate-module-gated on the BE. The base
// path /api/v1 is prepended by the CrmClient's baseUrl.

// ── DTOs (field-by-field from module/realestate/listingprep/model/ListingPrepPack.java) ──

export type PrepPackStatus = "DRAFTED" | "APPROVED" | "SKIPPED";

/**
 * One dated post in the 4-week social calendar (SocialPost inner class).
 * postDate is a LocalDate string (YYYY-MM-DD).
 */
export interface SocialPost {
  /** Calendar date (YYYY-MM-DD) for this post. */
  postDate: string;
  /** Week index 1–4. */
  weekIndex: number;
  /** Days from the start date (0–27). */
  dayOffset: number;
  /** Social channel: INSTAGRAM | FACEBOOK | X */
  channel: string;
  /** Post copy — the safe substitute when fairHousingSafe is false. */
  copy: string;
  /** False when the Fair-Housing lint held the original copy and substituted this. */
  fairHousingSafe: boolean;
  /** Why the post was held (matched term), null when fairHousingSafe. */
  heldReason: string | null;
}

/**
 * One listing photo's reused RE-4 vision-read feature callout (PhotoNote inner class).
 */
export interface PhotoNote {
  photoId: string;
  caption: string | null;
  features: string[];
}

/**
 * One Fair-Housing lint hit from the T10 ListingPrepPack (FairHousingFlag inner class).
 * surface: "DESCRIPTION", "EMAIL", or "CALENDAR week N"
 * Distinct from the RE-4 FairHousingFlag (which uses `channel` not `surface`).
 */
export interface PrepFairHousingFlag {
  term: string;
  surface: string;
  snippet: string;
}

/**
 * A full listing prep pack (ListingPrepPack model, all fields mirrored).
 */
export interface ListingPrepPack {
  id: string;
  tenantId: string;
  listingId: string;
  /** MLS public remarks (blank if degraded). */
  mlsDescription: string;
  /** Email campaign body (blank if degraded). */
  emailCampaign: string;
  /** The 4-week social calendar (empty if degraded). */
  socialCalendar: SocialPost[];
  /** Per-photo vision callouts (empty if no photos / all failed). */
  photoCaptions: PhotoNote[];
  /** Fair-Housing lint flags across description, calendar, email. */
  fairHousingFlags: PrepFairHousingFlag[];
  /** true iff fairHousingFlags is non-empty. */
  fairHousingFlagged: boolean;
  /** How many calendar posts were held + safe-substituted. */
  calendarHeldCount: number;
  /** true iff generation degraded (best-effort partial pack). */
  generationDegraded: boolean;
  status: PrepPackStatus;
  approvedAt: string | null;
  approvedByUserId: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/** Optional generate request body (both fields nullable). */
export interface ListingPrepGenerateRequest {
  /** Calendar start date (YYYY-MM-DD). Null → BE defaults to next Monday. */
  startDate?: string | null;
  /** Posts per week. Null → BE uses configured default. */
  postsPerWeek?: number | null;
}

// ── API functions ─────────────────────────────────────────────────────────────

/**
 * POST /realestate/listings/{listingId}/prep/generate
 * Generate a prep pack (DRAFTED). Optional startDate + postsPerWeek.
 * No Idempotency-Key (the BE has no @IdempotentRoute here).
 */
export function generatePrepPack(
  client: CrmClient,
  listingId: string,
  body?: ListingPrepGenerateRequest,
): Promise<ListingPrepPack> {
  return client.api<ListingPrepPack>(
    `/realestate/listings/${listingId}/prep/generate`,
    {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    },
  );
}

/**
 * GET /realestate/listings/{listingId}/prep/packs
 * Lists a listing's prep packs (history), most-recent first.
 */
export function listPacksForListing(
  client: CrmClient,
  listingId: string,
): Promise<ListingPrepPack[]> {
  return client.api<ListingPrepPack[]>(
    `/realestate/listings/${listingId}/prep/packs`,
  );
}

/**
 * GET /realestate/prep/packs
 * The tenant's DRAFTED prep packs (the review queue), most-recent first.
 */
export function listDraftedPacks(
  client: CrmClient,
): Promise<ListingPrepPack[]> {
  return client.api<ListingPrepPack[]>("/realestate/prep/packs");
}

/**
 * GET /realestate/prep/packs/{id}
 * A single prep pack, tenant-scoped. 4460 if not found.
 */
export function getPrepPack(
  client: CrmClient,
  id: string,
): Promise<ListingPrepPack> {
  return client.api<ListingPrepPack>(`/realestate/prep/packs/${id}`);
}

/**
 * POST /realestate/prep/packs/{id}/approve
 * Approve a DRAFTED pack → APPROVED. 4460 not-found; 4461/409 if not DRAFTED.
 */
export function approvePrepPack(
  client: CrmClient,
  id: string,
): Promise<ListingPrepPack> {
  return client.api<ListingPrepPack>(
    `/realestate/prep/packs/${id}/approve`,
    { method: "POST" },
  );
}

/**
 * POST /realestate/prep/packs/{id}/skip
 * Skip a DRAFTED pack → SKIPPED. 4460 not-found; 4461/409 if not DRAFTED.
 */
export function skipPrepPack(
  client: CrmClient,
  id: string,
): Promise<ListingPrepPack> {
  return client.api<ListingPrepPack>(
    `/realestate/prep/packs/${id}/skip`,
    { method: "POST" },
  );
}
