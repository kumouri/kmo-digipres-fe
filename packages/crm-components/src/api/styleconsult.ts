import type { CrmClient } from "./client";

// Salon T9 "StyleConsult AI" — HAND-WRITTEN client.
//
// The StyleConsultController, StyleConsultTokenController are
// @ConditionalOnProperty(kmosf.modules.chairfill)-gated, so all routes are
// ABSENT from the committed openapi.json and the generated client has no
// methods for them (the T8 QuoteNow / T5 CallbackController precedent).
//
// These calls back the T9 "StyleConsult AI" office surfaces:
//
//   - Consult inbox list   — GET  /styleconsult/consults
//                                 → StyleConsultInboxCard[] (newest first)
//   - Consult detail       — GET  /styleconsult/consults/{id}
//                                 → StyleConsultResponse (4455 if absent)
//   - Analytics            — GET  /styleconsult/analytics
//                                 → StyleConsultAnalytics (retail-attach funnel)
//   - Issue widget token   — POST /styleconsult/tokens
//                                 (ADMIN) → {"token":"…"}
//
// The public prospect intake routes (POST /public/integrations/styleconsult/{token}/consult
// + …/accept) are NOT part of this admin surface — the token-issue button just
// surfaces the resulting widget URL/link for staff to share or embed.
//
// Error codes: 4455 (consult not found, 404).

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/**
 * StyleConsultStatus — the lifecycle of a submitted style consult.
 * Maps to: StyleConsultStatus (module/styleconsult/model/StyleConsultStatus.java)
 */
export type StyleConsultStatus = "NEW" | "BOOKED";

/**
 * StyleAttributeSource — whether attributes were read via photo or typed manually.
 * Maps to: StyleAttributeSource (module/styleconsult/model/StyleAttributeSource.java)
 */
export type StyleAttributeSource = "VISION" | "MANUAL";

// ---------------------------------------------------------------------------
// DTOs — mirror the BE records exactly
// ---------------------------------------------------------------------------

/**
 * One row in the office style-consult inbox list.
 * Maps to: StyleConsultInboxCard (module/styleconsult/controller/dto/StyleConsultInboxCard.java)
 *
 * Fields (all 8, in declaration order):
 *   consultId, contactId, contactPhone, styleCategory,
 *   serviceCount, retailCount, status, createdAt
 */
export interface StyleConsultInboxCard {
  /** The StyleConsult id (the detail endpoint takes it). */
  consultId: string;
  /** The prospect Contact id (nullable). */
  contactId: string | null;
  /** The prospect phone (nullable). */
  contactPhone: string | null;
  /** The read/typed style category (nullable). */
  styleCategory: string | null;
  /** How many services were recommended. */
  serviceCount: number;
  /** How many retail products were recommended (margin-ranked). */
  retailCount: number;
  /** NEW / BOOKED */
  status: StyleConsultStatus;
  /** When the prospect submitted (ISO string). */
  createdAt: string;
}

/**
 * One recommended salon service, embedded on a consult response.
 * Maps to: ServiceRecommendation (module/styleconsult/model/ServiceRecommendation.java)
 *
 * Fields (all 4, in declaration order):
 *   serviceMenuItemId, name, price, rationale
 */
export interface ServiceRecommendation {
  /** The stable ServiceMenuItem id (the accept path books it). */
  serviceMenuItemId: string;
  /** The service name snapshot. */
  name: string;
  /** The menu price snapshot (nullable). */
  price: number | null;
  /** Why this service was suggested (always includes the stylist-confirm note). */
  rationale: string;
}

/**
 * One recommended retail product, embedded on a consult response.
 * Ranked by margin (highest-margin first).
 * Maps to: RetailRecommendation (module/styleconsult/model/RetailRecommendation.java)
 *
 * Fields (all 7, in declaration order):
 *   productId, sku, name, price, cost, marginAmount, rationale
 */
export interface RetailRecommendation {
  /** The catalog Product id. */
  productId: string;
  /** The product SKU snapshot (nullable). */
  sku: string | null;
  /** The product name snapshot. */
  name: string;
  /** The retail unit price snapshot (nullable). */
  price: number | null;
  /** The unit cost snapshot (nullable — null ⇒ unknown, ranked last). */
  cost: number | null;
  /** price − cost (the ranking key; 0 when cost is null). */
  marginAmount: number;
  /** Why this product was suggested (always includes the stylist-confirm note). */
  rationale: string;
}

/**
 * Full detail for a single style consult — shown in the inbox detail view.
 * Maps to: StyleConsultResponse (module/styleconsult/controller/dto/StyleConsultResponse.java)
 *
 * Fields (all 11, in declaration order):
 *   consultId, styleCategory, length, texture, color,
 *   attributeSource, confidence, serviceRecommendations,
 *   retailRecommendations, status, bookingId
 */
export interface StyleConsultResponse {
  /** The persisted StyleConsult id. */
  consultId: string;
  /** The read/typed style category, nullable. */
  styleCategory: string | null;
  /** The read/typed length, nullable. */
  length: string | null;
  /** The read/typed texture, nullable. */
  texture: string | null;
  /** The read/typed color, nullable. */
  color: string | null;
  /** MANUAL or VISION — how the style attributes were read. */
  attributeSource: StyleAttributeSource | null;
  /** Vision-read confidence in [0,1] (1.0 for manual). */
  confidence: number;
  /** The recommended salon services (always includes the stylist-confirm note). */
  serviceRecommendations: ServiceRecommendation[];
  /** The margin-ranked retail products (highest margin first). */
  retailRecommendations: RetailRecommendation[];
  /** NEW or BOOKED */
  status: StyleConsultStatus;
  /** The salon Booking created on accept (null until booked). */
  bookingId: string | null;
}

/**
 * The retail-attach analytics funnel for a tenant's style consults.
 * Maps to: StyleConsultAnalytics (module/styleconsult/controller/dto/StyleConsultAnalytics.java)
 *
 * Fields (all 7, in declaration order):
 *   totalConsults, consultsWithRetail, consultsBooked,
 *   bookedWithRetail, retailAttachRate, bookingRate,
 *   avgRecommendedRetailMargin
 */
export interface StyleConsultAnalytics {
  /** All consults submitted. */
  totalConsults: number;
  /** Consults that produced ≥1 retail recommendation. */
  consultsWithRetail: number;
  /** Consults that converted to a booking. */
  consultsBooked: number;
  /** Booked consults that had ≥1 retail recommendation. */
  bookedWithRetail: number;
  /** bookedWithRetail / consultsBooked in [0,1] (0 if none booked). */
  retailAttachRate: number;
  /** consultsBooked / totalConsults in [0,1] (0 if none). */
  bookingRate: number;
  /** Mean marginAmount across all recommended retail items. */
  avgRecommendedRetailMargin: number;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * The office style-consult inbox list, newest first.
 * Optional status filter limits to a single lifecycle stage.
 *
 * Maps to: GET /styleconsult/consults[?status=<StyleConsultStatus>]
 * Controller: StyleConsultController @GetMapping("/consults") (method list())
 */
export function listConsults(
  client: CrmClient,
  status?: StyleConsultStatus,
): Promise<StyleConsultInboxCard[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return client.api<StyleConsultInboxCard[]>(`/styleconsult/consults${qs}`);
}

/**
 * Full detail for a single style consult (4455/404 if not found).
 *
 * Maps to: GET /styleconsult/consults/{id}
 * Controller: StyleConsultController @GetMapping("/consults/{id}") (method detail())
 */
export function getConsult(
  client: CrmClient,
  id: string,
): Promise<StyleConsultResponse> {
  return client.api<StyleConsultResponse>(
    `/styleconsult/consults/${encodeURIComponent(id)}`,
  );
}

/**
 * Retail-attach analytics funnel for the tenant's style consults.
 *
 * Maps to: GET /styleconsult/analytics
 * Controller: StyleConsultController @GetMapping("/analytics") (method analytics())
 */
export function getStyleConsultAnalytics(
  client: CrmClient,
): Promise<StyleConsultAnalytics> {
  return client.api<StyleConsultAnalytics>("/styleconsult/analytics");
}

/**
 * Issue a prospect-widget intake token (180-day TTL, ADMIN-gated).
 * The token goes into the salon's website widget snippet / Instagram-bio QR;
 * the public StyleConsultIntakeController accepts submissions and resolves the
 * tenant from the token.
 *
 * Returns: {"token": "<jwt>"} — the caller builds the widget URL as
 *   <base>/embed-demo?type=style-consult&token=<token>  (or the public intake URL).
 *
 * Maps to: POST /styleconsult/tokens
 * Controller: StyleConsultTokenController @PostMapping (ADMIN-gated, method issue())
 */
export function issueStyleConsultToken(
  client: CrmClient,
): Promise<{ token: string }> {
  return client.api<{ token: string }>("/styleconsult/tokens", {
    method: "POST",
  });
}
