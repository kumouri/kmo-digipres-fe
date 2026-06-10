import type { CrmClient } from "./client";

// Home Services T8 "QuoteNow" — HAND-WRITTEN client.
//
// The QuoteInboxController, PriceBookController, and QuoteIntakeTokenController
// are @ConditionalOnProperty(kmosf.modules.quoting)-gated, so all routes are
// ABSENT from the committed openapi.json and the generated client has no methods
// for them (the T5 CallbackController / T4 SwitchboardController precedent).
//
// These calls back the T8 "QuoteNow" office surfaces:
//
//   - Quote inbox list    — GET  /quoting/quotes[?status=<QuoteStatus>]
//                               → QuoteInboxCard[] (newest first)
//   - Quote detail        — GET  /quoting/quotes/{id}
//                               → QuoteResponse (4435 if absent)
//   - Price book read     — GET  /quoting/price-book
//                               (ADMIN; 4431/404 if not yet configured)
//                               → PriceBook
//   - Price book upsert   — PUT  /quoting/price-book
//                               (ADMIN; body PriceBook) → PriceBook
//   - Issue widget token  — POST /quoting/tokens
//                               (ADMIN) → Map<String,String> {"token":"…"}
//
// The public homeowner intake routes (POST /public/integrations/quoting/{token}/quote
// + …/accept) are NOT part of this admin surface — the token-issue button just
// surfaces the resulting widget URL/link for staff to share or embed.
//
// Error codes: 4431 (price book not found, 404), 4435 (quote not found, 404).

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/**
 * QuoteStatus — the lifecycle of a submitted quote request.
 * Maps to: QuoteStatus (module/quoting/model/QuoteStatus.java)
 */
export type QuoteStatus = "NEW" | "ACCEPTED" | "BOOKED" | "DECLINED";

/**
 * Recommendation — the repair-vs-replace verdict.
 * Maps to: Recommendation (module/quoting/model/Recommendation.java)
 */
export type Recommendation = "REPAIR" | "REPLACE" | "DIAGNOSTIC_VISIT";

/**
 * AttributeSource — whether attributes were typed manually or read from a photo.
 * Maps to: AttributeSource (module/quoting/model/AttributeSource.java)
 */
export type AttributeSource = "MANUAL" | "VISION";

/**
 * JobKind — whether a price-book line prices a REPAIR or a REPLACE.
 * Maps to: JobKind (module/quoting/model/JobKind.java)
 */
export type JobKind = "REPAIR" | "REPLACE";

// ---------------------------------------------------------------------------
// DTOs — mirror the BE records exactly
// ---------------------------------------------------------------------------

/**
 * One row in the office quote-inbox list.
 * Maps to: QuoteInboxCard (module/quoting/controller/dto/QuoteInboxCard.java)
 *
 * Fields (all 11, in declaration order):
 *   quoteId, contactId, contactPhone, equipmentType,
 *   low, high, currency, recommendation, diagnosticOnly,
 *   status, createdAt
 */
export interface QuoteInboxCard {
  /** The QuoteRequest id. */
  quoteId: string;
  /** The homeowner Contact id (nullable). */
  contactId: string | null;
  /** The homeowner phone (nullable). */
  contactPhone: string | null;
  /** The equipment type (typed or vision-read), nullable. */
  equipmentType: string | null;
  /** The low end of the price estimate (nullable — no range if null). */
  low: number | null;
  /** The high end of the price estimate (nullable). */
  high: number | null;
  /** ISO-4217 currency code (nullable). */
  currency: string | null;
  /** REPAIR / REPLACE / DIAGNOSTIC_VISIT (nullable when not yet reasoned). */
  recommendation: Recommendation | null;
  /** True when this is a flat diagnostic-visit fee (no priceable match). */
  diagnosticOnly: boolean;
  /** NEW / ACCEPTED / BOOKED / DECLINED */
  status: QuoteStatus;
  /** When the homeowner submitted (ISO string). */
  createdAt: string;
}

/**
 * Full detail for a single quote — shown in the inbox detail view.
 * Maps to: QuoteResponse (module/quoting/controller/dto/QuoteResponse.java)
 *
 * Fields (all 13, in declaration order):
 *   quoteId, low, high, currency, basis, estimateDisclaimer,
 *   diagnosticOnly, recommendation, recommendationRationale,
 *   financingAvailable, equipmentType, attributeSource, confidence
 */
export interface QuoteResponse {
  /** The persisted QuoteRequest id. */
  quoteId: string;
  /** The low end of the estimate (nullable). */
  low: number | null;
  /** The high end of the estimate (nullable). */
  high: number | null;
  /** ISO-4217 currency code (nullable). */
  currency: string | null;
  /** Which price-book line / job kind produced the range (nullable). */
  basis: string | null;
  /** The mandatory "estimate; final price after on-site inspection" copy. */
  estimateDisclaimer: string | null;
  /** True when this is a flat diagnostic-visit fee. */
  diagnosticOnly: boolean;
  /** REPAIR / REPLACE / DIAGNOSTIC_VISIT (nullable). */
  recommendation: Recommendation | null;
  /** The explained "why" — always non-blank when recommendation is set. */
  recommendationRationale: string | null;
  /** True on the REPLACE path — the moment to offer financing. */
  financingAvailable: boolean;
  /** The equipment type used (typed or vision-read), nullable. */
  equipmentType: string | null;
  /** MANUAL or VISION — how the attributes were read. */
  attributeSource: AttributeSource | null;
  /** Vision-read confidence in [0,1] (1.0 for manual). */
  confidence: number;
}

/**
 * One priced line in a price book — equipment × job-kind band.
 * Maps to: PriceBookLineItem (module/quoting/model/PriceBookLineItem.java)
 *
 * Fields (all 9, in declaration order):
 *   equipmentType, jobKind, low, high, typicalLifespanYears,
 *   agePerYearPct, ageMaxPct, severeFailurePct, severeFailureKeywords
 */
export interface PriceBookLineItem {
  /** The unit class this line prices (e.g. "condenser", "furnace"). */
  equipmentType: string;
  /** REPAIR or REPLACE */
  jobKind: JobKind;
  /** Base low end of the band. */
  low: number;
  /** Base high end of the band. */
  high: number;
  /** Typical lifespan in years (repair-vs-replace age threshold), nullable. */
  typicalLifespanYears: number | null;
  /** Per-year-of-age band adjustment, percent (default 0). */
  agePerYearPct: number;
  /** Cap on the cumulative age adjustment, percent (default 0 = uncapped). */
  ageMaxPct: number;
  /** Additive band bump (percent) when a severe failure keyword matches (default 0). */
  severeFailurePct: number;
  /** Lowercase substrings marking a severe failure (nullable). */
  severeFailureKeywords: string[] | null;
}

/**
 * The tenant's price book — the calibrated source the instant-quote synthesis
 * draws its ranges from. One book per tenant.
 * Maps to: PriceBook (module/quoting/model/PriceBook.java)
 *
 * Fields (all 9 non-internal, in declaration order):
 *   id, tenantId, name, currency, lineItems,
 *   diagnosticVisitLow, diagnosticVisitHigh, version, createdAt, updatedAt
 */
export interface PriceBook {
  /** The PriceBook document id (nullable on a new book being upserted). */
  id: string | null;
  /** The tenant this book belongs to. */
  tenantId: string | null;
  /** Human label for the book (e.g. "Comfort Air HVAC — 2026 price book"), optional. */
  name: string | null;
  /** ISO-4217 currency code (default "USD"). */
  currency: string;
  /** The priced (equipment × repair/replace) bands. */
  lineItems: PriceBookLineItem[];
  /** Flat diagnostic-visit fee low (the fallback when nothing priceable matches). */
  diagnosticVisitLow: number;
  /** Flat diagnostic-visit fee high. */
  diagnosticVisitHigh: number;
  /** Optimistic-lock version (nullable on new). */
  version: number | null;
  /** When the book was first created (ISO string, nullable). */
  createdAt: string | null;
  /** When the book was last saved (ISO string, nullable). */
  updatedAt: string | null;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * The office quote-inbox list, newest first.
 * Optional status filter limits to a single lifecycle stage.
 *
 * Maps to: GET /quoting/quotes[?status=<QuoteStatus>]
 * Controller: QuoteInboxController @GetMapping (method list())
 */
export function listQuotes(
  client: CrmClient,
  status?: QuoteStatus,
): Promise<QuoteInboxCard[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return client.api<QuoteInboxCard[]>(`/quoting/quotes${qs}`);
}

/**
 * Full detail for a single quote (4435/404 if not found).
 *
 * Maps to: GET /quoting/quotes/{id}
 * Controller: QuoteInboxController @GetMapping("/{id}") (method detail())
 */
export function getQuote(
  client: CrmClient,
  id: string,
): Promise<QuoteResponse> {
  return client.api<QuoteResponse>(
    `/quoting/quotes/${encodeURIComponent(id)}`,
  );
}

/**
 * Read the tenant's price book.
 * 404 (errorCode 4431) if no book has been created yet — render a friendly
 * "not configured" empty state so the admin can do initial setup.
 *
 * Maps to: GET /quoting/price-book
 * Controller: PriceBookController @GetMapping (ADMIN-gated, method get())
 */
export function getPriceBook(client: CrmClient): Promise<PriceBook> {
  return client.api<PriceBook>("/quoting/price-book");
}

/**
 * Upsert the tenant's price book (one row per tenant).
 *
 * Maps to: PUT /quoting/price-book  body: PriceBook
 * Controller: PriceBookController @PutMapping (ADMIN-gated, method upsert())
 */
export function savePriceBook(
  client: CrmClient,
  body: PriceBook,
): Promise<PriceBook> {
  return client.api<PriceBook>("/quoting/price-book", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Issue a homeowner-widget intake token (180-day TTL).
 * The token goes into the embed snippet / truck/yard-sign QR; staff copy the
 * resulting widget URL and share it with homeowners.
 *
 * Returns: {"token": "<jwt>"} — the caller builds the widget URL as
 *   <base>/embed-demo?type=quote-intake&token=<token>  (or the public intake URL).
 *
 * Maps to: POST /quoting/tokens
 * Controller: QuoteIntakeTokenController @PostMapping (ADMIN-gated, method issue())
 */
export function issueQuoteToken(
  client: CrmClient,
): Promise<{ token: string }> {
  return client.api<{ token: string }>("/quoting/tokens", {
    method: "POST",
  });
}
