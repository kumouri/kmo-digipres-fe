import type {
  ConciergeConversationDetail,
  ConciergeConversationSummary,
  DisclosureRequest,
  Listing,
  ListingDisclosure,
  ListingMarketingDraft,
  ListingPhoto,
} from "../types/api";
import type { CrmClient } from "./client";

// Real Estate Concierge — flagship (RE-5b) — HAND-WRITTEN client.
//
// Every Real Estate BE controller is @ConditionalOnProperty(kmosf.modules.realestate)
// -gated, so the endpoints are ABSENT from the committed openapi.json and the
// generated client has no methods for them (the ChairFill CF-5b / Home-Services
// HS-4 precedent). These calls back the four RE-5b admin surfaces:
//   - Listing console      — GET/POST/PUT /realestate/listings(/{id})
//                            + disclosures + photos + generate marketing
//   - Concierge inbox      — GET /realestate/conversations(?listingId) (+ /{id})
//   - Lead pipeline        — the same conversation list, grouped by leadTier
//   - Marketing review     — GET /realestate/marketing/drafts + approve / skip
//
// All are STAFF-authenticated + realestate-module-gated on the BE. The base path
// /api/v1 is prepended by the CrmClient's baseUrl, so the paths here are
// /realestate/... (matching the other hand-written modules).

// ── Listings ─────────────────────────────────────────────────────────────────

/** Every listing for the tenant. */
export function listListings(client: CrmClient): Promise<Listing[]> {
  return client.api<Listing[]>("/realestate/listings");
}

/** One listing by id (4253 if missing / not owned). */
export function getListing(client: CrmClient, id: string): Promise<Listing> {
  return client.api<Listing>(`/realestate/listings/${id}`);
}

/** Create a listing. Returns the persisted listing. */
export function createListing(
  client: CrmClient,
  body: Listing,
): Promise<Listing> {
  return client.api<Listing>("/realestate/listings", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Update a listing (full replace of editable fields). Returns the updated listing. */
export function updateListing(
  client: CrmClient,
  id: string,
  body: Listing,
): Promise<Listing> {
  return client.api<Listing>(`/realestate/listings/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

// ── Disclosures (the RAG grounding corpus) ────────────────────────────────────

/** A listing's disclosures. */
export function listDisclosures(
  client: CrmClient,
  listingId: string,
): Promise<ListingDisclosure[]> {
  return client.api<ListingDisclosure[]>(
    `/realestate/listings/${listingId}/disclosures`,
  );
}

/**
 * Add a disclosure to a listing. Creating it triggers the disclosure-text
 * indexing (the grounding corpus). The BE 400s (errorCode 4253) if the text is
 * blank. Returns the created disclosure.
 */
export function createDisclosure(
  client: CrmClient,
  listingId: string,
  body: DisclosureRequest,
): Promise<ListingDisclosure> {
  return client.api<ListingDisclosure>(
    `/realestate/listings/${listingId}/disclosures`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

/** Update a disclosure (re-indexes the text). Returns the updated disclosure. */
export function updateDisclosure(
  client: CrmClient,
  listingId: string,
  id: string,
  body: DisclosureRequest,
): Promise<ListingDisclosure> {
  return client.api<ListingDisclosure>(
    `/realestate/listings/${listingId}/disclosures/${id}`,
    { method: "PUT", body: JSON.stringify(body) },
  );
}

// ── Marketing — photos, generate, draft queue ────────────────────────────────

/** A listing's uploaded photos (oldest-first). */
export function listPhotos(
  client: CrmClient,
  listingId: string,
): Promise<ListingPhoto[]> {
  return client.api<ListingPhoto[]>(
    `/realestate/listings/${listingId}/marketing/photos`,
  );
}

/**
 * Upload a listing photo as multipart/form-data (the BE's `image` part name).
 * The CrmClient lets a FormData body through without forcing a JSON Content-Type,
 * so the browser sets the multipart boundary. Returns the created photo.
 */
export function uploadPhoto(
  client: CrmClient,
  listingId: string,
  file: File,
): Promise<ListingPhoto> {
  const form = new FormData();
  form.append("image", file, file.name);
  return client.api<ListingPhoto>(
    `/realestate/listings/${listingId}/marketing/photos`,
    { method: "POST", body: form },
  );
}

/**
 * One-click generate: vision-captions the listing photos + drafts MLS remarks /
 * social captions / email blast + runs the Fair-Housing lint, persisting a
 * DRAFTED draft (never auto-published). Best-effort: a generation failure yields
 * a partial/empty DRAFTED draft + a degraded flag, never an error. Returns the
 * new draft.
 */
export function generateMarketing(
  client: CrmClient,
  listingId: string,
): Promise<ListingMarketingDraft> {
  return client.api<ListingMarketingDraft>(
    `/realestate/listings/${listingId}/marketing/generate`,
    { method: "POST" },
  );
}

/** A listing's marketing drafts (history), most-recent first. */
export function listListingMarketingDrafts(
  client: CrmClient,
  listingId: string,
): Promise<ListingMarketingDraft[]> {
  return client.api<ListingMarketingDraft[]>(
    `/realestate/listings/${listingId}/marketing/drafts`,
  );
}

/** The tenant's DRAFTED marketing drafts — the review queue, most-recent first. */
export function listDraftedMarketing(
  client: CrmClient,
): Promise<ListingMarketingDraft[]> {
  return client.api<ListingMarketingDraft[]>("/realestate/marketing/drafts");
}

/**
 * Approve a DRAFTED draft → APPROVED (copy-ready, paste-out — the actual
 * MLS/social posting is out of scope). Returns the updated draft.
 */
export function approveMarketingDraft(
  client: CrmClient,
  id: string,
): Promise<ListingMarketingDraft> {
  return client.api<ListingMarketingDraft>(
    `/realestate/marketing/drafts/${id}/approve`,
    { method: "POST" },
  );
}

/** Skip a DRAFTED draft (discard) → SKIPPED. Returns the updated draft. */
export function skipMarketingDraft(
  client: CrmClient,
  id: string,
): Promise<ListingMarketingDraft> {
  return client.api<ListingMarketingDraft>(
    `/realestate/marketing/drafts/${id}/skip`,
    { method: "POST" },
  );
}

// ── Concierge conversations (the inbox + lead pipeline + transcript) ──────────

/**
 * The concierge conversation list, newest activity first. `listingId` optionally
 * narrows to a single listing's threads (else the tenant's full list). Group by
 * `leadTier` for the lead pipeline.
 */
export function listConversations(
  client: CrmClient,
  listingId?: string,
): Promise<ConciergeConversationSummary[]> {
  const path = listingId
    ? `/realestate/conversations?listingId=${encodeURIComponent(listingId)}`
    : "/realestate/conversations";
  return client.api<ConciergeConversationSummary[]>(path);
}

/**
 * One conversation's full detail — the transcript (each assistant turn's
 * citations), the buyer qualification, the linked dealId + leadTier. 4270/404 on
 * a missing / not-owned conversation.
 */
export function getConversation(
  client: CrmClient,
  id: string,
): Promise<ConciergeConversationDetail> {
  return client.api<ConciergeConversationDetail>(
    `/realestate/conversations/${id}`,
  );
}
