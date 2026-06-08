/**
 * api.ts — generated-type alias shim
 *
 * Types for the 4 existing resource areas (Contacts, Companies, Deals,
 * Activities) are intentionally narrow hand-written interfaces that the
 * existing call sites compile cleanly against. The generated `openapi.ts`
 * makes all fields optional (OpenAPI 3.0 semantics), which would break ~15
 * existing files. The shim exposes the same narrow shapes plus re-exports the
 * new Phase B types directly from the generated file.
 *
 * Run `npm run gen:api` to refresh `openapi.ts` from the committed backend spec.
 * Add new Phase B type aliases at the bottom of this file (pattern: Phase B area).
 */

import type { components } from "./openapi";

// Re-export the generated module root so consumers can access raw generated
// types when needed without knowing the internal file location.
export type { components };

// --- Auth -------------------------------------------------------------------

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  userId: string;
  tenantId: string;
  // Human business name (BE Tenant.displayName). Optional: a token whose
  // tenant has no displayName comes back without it.
  tenantName?: string;
  email: string;
  displayName: string;
  roles: string[];
}

export type UserStatus = "ACTIVE" | "DISABLED";

export interface User {
  id: string;
  tenantId: string;
  // Human business name of the owning tenant (BE Tenant.displayName,
  // non-persisted projection on /auth/me). Optional: absent when the
  // tenant has no displayName.
  tenantName?: string;
  email: string;
  displayName: string;
  roles: string[];
  status: UserStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// --- Contacts ---------------------------------------------------------------

export type ContactType = "PERSON" | "ORG";

export interface PhoneNumber {
  number: string;
  label: string;
}

export interface PostalAddress {
  street: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  label: string;
}

export interface ContactDTO {
  id?: string;
  type?: ContactType;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  companyId?: string;
  emails?: string[];
  phones?: PhoneNumber[];
  addresses?: PostalAddress[];
  tags?: string[];
  ownerId?: string;
  customFields?: Record<string, unknown>;
}

// --- Companies --------------------------------------------------------------

export interface CompanyDTO {
  id?: string;
  name?: string;
  website?: string;
  industry?: string;
  addresses?: PostalAddress[];
  tags?: string[];
  ownerId?: string;
  customFields?: Record<string, unknown>;
}

// --- Deals ------------------------------------------------------------------

export type PipelineStage =
  | "NEW"
  | "QUALIFIED"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "WON"
  | "LOST";

export const PIPELINE_STAGES: PipelineStage[] = [
  "NEW",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
];

export interface DealDTO {
  id?: string;
  title?: string;
  stage?: PipelineStage;
  value?: number;
  currency?: string;
  expectedCloseDate?: string;
  primaryContactId?: string;
  companyId?: string;
  ownerId?: string;
  lostReason?: string;
  customFields?: Record<string, unknown>;
}

export interface MoveStageRequest {
  stage: PipelineStage;
  lostReason?: string;
}

// --- Activities -------------------------------------------------------------

export type ActivityType = "NOTE" | "EMAIL" | "CALL" | "MEETING" | "TASK";
export type ActivityDirection = "INBOUND" | "OUTBOUND" | "INTERNAL";
export type SubjectType = "CONTACT" | "COMPANY" | "DEAL" | "WORK_ORDER";

export interface ActivityDTO {
  id?: string;
  type?: ActivityType;
  direction?: ActivityDirection;
  subjectType?: SubjectType;
  subjectId?: string;
  summary?: string;
  body?: string;
  occurredAt?: string;
  dueAt?: string;
  completedAt?: string;
  ownerId?: string;
  payload?: Record<string, unknown>;
  customFields?: Record<string, unknown>;
}

export const ACTIVITY_TYPES: ActivityType[] = ["NOTE", "EMAIL", "CALL", "MEETING", "TASK"];
export const ACTIVITY_DIRECTIONS: ActivityDirection[] = ["INBOUND", "OUTBOUND", "INTERNAL"];
export const SUBJECT_TYPES: SubjectType[] = ["CONTACT", "COMPANY", "DEAL", "WORK_ORDER"];

// --- Communication ----------------------------------------------------------

export interface SingleEmailCommunicationDTO {
  to: string;
  from: string;
  subject: string;
  body: string;
}

// --- Public booking ---------------------------------------------------------

/** Public-facing projection of a BookingLink (mirrors BookingPublicView.java). */
export interface BookingPublicView {
  slug: string;
  title: string;
  description?: string;
  durationMinutes: number;
  timezone: string;
  /** ISO-8601 instants of bookable starts in the requested window. */
  availableSlots: string[];
}

/** Payload for POST /public/booking/{slug}/book (mirrors BookSlotRequest.java). */
export interface BookSlotRequest {
  /** ISO-8601 instant of the chosen slot's start. */
  slotStart: string;
  attendeeEmail: string;
  attendeeName: string;
  notes?: string;
}

/** Subset of Meeting returned by POST .../book. */
export interface BookedMeeting {
  id: string;
  tenantId: string;
  name?: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
}

// =============================================================================
// Phase B — new area types aliased from the generated openapi.ts
// =============================================================================

// --- Quotes -----------------------------------------------------------------

export type Quote = components["schemas"]["Quote"];
export type LineItem = components["schemas"]["LineItem"];
export type QuoteStatus = "DRAFT" | "SENT" | "ACCEPTED" | "DECLINED" | "EXPIRED";

// --- Invoices ---------------------------------------------------------------

export type Invoice = components["schemas"]["Invoice"];
export type Payment = components["schemas"]["Payment"];
export type InvoiceStatus = "DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "VOIDED" | "OVERDUE";

// --- Tickets ----------------------------------------------------------------

export type Ticket = components["schemas"]["Ticket"];
export type TicketComment = components["schemas"]["TicketComment"];
export type SlaPolicy = components["schemas"]["SlaPolicy"];
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

// --- Knowledge Base ---------------------------------------------------------

export type KnowledgeBaseArticle = components["schemas"]["KnowledgeBaseArticle"];

// --- Inbox ------------------------------------------------------------------

export type InboxThread = components["schemas"]["InboxThread"];
export type InboxMessage = components["schemas"]["InboxMessage"];
export type InboxStatus = "OPEN" | "CLAIMED" | "CLOSED";

// --- Field Definitions ------------------------------------------------------

export type FieldDefinition = components["schemas"]["FieldDefinition"];
export type FieldDefinitionType = "TEXT" | "NUMBER" | "DATE" | "BOOL" | "ENUM" | "LOOKUP";
export type FieldEntityType = "CONTACT" | "COMPANY" | "DEAL" | "TICKET";

// --- Audit ------------------------------------------------------------------

export type AuditEventDTO = components["schemas"]["AuditEventDTO"];
export type FieldDiff = components["schemas"]["FieldDiff"];

// --- Reports / Dashboards ---------------------------------------------------

export type SavedReport = components["schemas"]["SavedReport"];
export type Dashboard = components["schemas"]["Dashboard"];
export type DashboardItem = components["schemas"]["DashboardItem"];

// --- AI assist --------------------------------------------------------------

export type AskAiRequest = components["schemas"]["AskAiRequest"];
export type AskResult = components["schemas"]["AskResult"];
export type AiSummary = components["schemas"]["AiSummary"];
export type AiDraft = components["schemas"]["AiDraft"];
export type Citation = components["schemas"]["Citation"];
export type SummarizeBody = components["schemas"]["SummarizeBody"];
export type DraftReplyBody = components["schemas"]["DraftReplyBody"];

// =============================================================================
// Phase C — Projects / Milestones / Tasks (generated aliases + value constants)
// =============================================================================

// --- Projects ----------------------------------------------------------------

export type Project = components["schemas"]["Project"];
export type Milestone = components["schemas"]["Milestone"];
export type Task = components["schemas"]["Task"];

export type ProjectStatus = "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
export type MilestoneStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export const PROJECT_STATUSES: ProjectStatus[] = [
  "PLANNING",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
];

export const MILESTONE_STATUSES: MilestoneStatus[] = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
];

export const TASK_STATUSES: TaskStatus[] = [
  "TODO",
  "IN_PROGRESS",
  "BLOCKED",
  "DONE",
];

export const TASK_PRIORITIES: TaskPriority[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
];

// =============================================================================
// Phase D — Time & Expenses (generated aliases + value constants)
// =============================================================================

// --- Time Entries ------------------------------------------------------------

export type TimeEntry = components["schemas"]["TimeEntry"];
export type Expense = components["schemas"]["Expense"];

export type TimeEntrySource = "TIMER" | "MANUAL";
export type BillingStatus = "UNBILLED" | "INVOICED";
export type ExpenseApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export const TIME_ENTRY_SOURCES: TimeEntrySource[] = ["TIMER", "MANUAL"];

export const BILLING_STATUSES: BillingStatus[] = ["UNBILLED", "INVOICED"];

export const EXPENSE_APPROVAL_STATUSES: ExpenseApprovalStatus[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
];

// =============================================================================
// Phase F — Contracts / ContractTemplates (generated aliases + value constants)
// =============================================================================

// --- Contracts ---------------------------------------------------------------

export type Contract = components["schemas"]["Contract"];
export type ContractTemplate = components["schemas"]["ContractTemplate"];

export type ContractStatus = "DRAFT" | "SENT" | "SIGNED" | "VOIDED";
export type ContractKind = "SOW" | "MSA" | "NDA" | "GENERIC";

export const CONTRACT_STATUSES: ContractStatus[] = ["DRAFT", "SENT", "SIGNED", "VOIDED"];
export const CONTRACT_KINDS: ContractKind[] = ["SOW", "MSA", "NDA", "GENERIC"];

// =============================================================================
// Phase E — Recurring Invoices + Stripe Checkout (generated aliases + value constants)
// =============================================================================

// --- Recurring Invoices ------------------------------------------------------

export type RecurringInvoice = components["schemas"]["RecurringInvoice"];
export type CheckoutResult = components["schemas"]["CheckoutResult"];

export type RecurringInvoiceStatus = "ACTIVE" | "PAUSED" | "ENDED";
export type PaymentTerms =
  | "DUE_ON_RECEIPT"
  | "NET_7"
  | "NET_15"
  | "NET_30"
  | "NET_45"
  | "NET_60";

export const RECURRING_INVOICE_STATUSES: RecurringInvoiceStatus[] = [
  "ACTIVE",
  "PAUSED",
  "ENDED",
];

export const PAYMENT_TERMS: PaymentTerms[] = [
  "DUE_ON_RECEIPT",
  "NET_7",
  "NET_15",
  "NET_30",
  "NET_45",
  "NET_60",
];

// =============================================================================
// Contractor / time-management Phase 1 — Team + Project Assignments
// =============================================================================

// --- Team members ------------------------------------------------------------

export type TeamMember = components["schemas"]["TeamMemberView"];
export type TeamMemberRequest = components["schemas"]["TeamMemberRequest"];

// Roles a team member can hold. ADMIN is the owner; CONTRACTOR implies STAFF
// (a contractor is a STAFF user with the CONTRACTOR role added on the BE).
export type UserRole = "ADMIN" | "STAFF" | "CONTRACTOR";

// The two roles selectable when inviting a teammate. ADMIN (owner) is granted
// out-of-band, never from this form.
export const ASSIGNABLE_USER_ROLES: UserRole[] = ["STAFF", "CONTRACTOR"];

export type UserAccountStatus = "ACTIVE" | "INVITED" | "DISABLED";

export const USER_ACCOUNT_STATUSES: UserAccountStatus[] = [
  "ACTIVE",
  "INVITED",
  "DISABLED",
];

// --- Project assignments -----------------------------------------------------

export type ProjectAssignment = components["schemas"]["ProjectAssignment"];

// =============================================================================
// Contractor / time-management Phase 3 — Timesheets (submit / approve)
// =============================================================================

// Admin-facing full record (GET /timesheets, approve/reject return this);
// contractor-facing trimmed projection (GET /me/contractor/timesheets).
export type Timesheet = components["schemas"]["Timesheet"];
export type TimesheetView = components["schemas"]["TimesheetView"];

// A timesheet period's lifecycle: OPEN → SUBMITTED → APPROVED, or
// SUBMITTED → REJECTED ("Sent back") → OPEN (reopen) / SUBMITTED (resubmit).
export type TimesheetStatus = "OPEN" | "SUBMITTED" | "APPROVED" | "REJECTED";

export const TIMESHEET_STATUSES: TimesheetStatus[] = [
  "OPEN",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
];

// =============================================================================
// Contractor / time-management Phase 4 — Payout & margin report
// =============================================================================

// The 1099 payout + margin rollup an ADMIN reads for a contractor: what is owed
// (payout = approved hours × cost rate), what was billed (bill = approved hours
// × bill rate), and the margin (bill − payout), per Timesheet period and as a
// window total / year-to-date. `hasUnratedEntries` flags approved hours with no
// cost rate set — they count toward hours but contribute 0 to the amount owed.
export type PayoutReport = components["schemas"]["PayoutReport"];
export type PayoutPeriodLine = components["schemas"]["PayoutPeriodLine"];

// =============================================================================
// GBP review-reply automation — review-reply approval queue (generated aliases)
// =============================================================================

// A Google Business Profile review the platform drafted an on-brand reply for.
// The owner reviews → edits → approves & posts (or skips) each DRAFTED reply.
export type GbpReviewReply = components["schemas"]["GbpReviewReply"];
export type PostReplyRequest = components["schemas"]["PostReplyRequest"];

// Lifecycle: a poller drafts DRAFTED; the owner moves it to POSTED (posted to
// Google) or SKIPPED. The queue lists DRAFTED only.
export type GbpReviewReplyStatus = "DRAFTED" | "POSTED" | "SKIPPED";

export const GBP_REVIEW_REPLY_STATUSES: GbpReviewReplyStatus[] = [
  "DRAFTED",
  "POSTED",
  "SKIPPED",
];

// =============================================================================
// Home Services — "Front Desk That Never Sleeps" — Missed-Call Inbox (HS-4)
// =============================================================================
//
// HAND-WRITTEN types (not generated aliases). The Home Services BE endpoints
// are gated behind @ConditionalOnProperty(kmosf.modules.home-services), so they
// are ABSENT from the committed openapi.json and the generated openapi.ts has no
// shape for them. These mirror the BE contracts by hand:
//   - MissedCallInboxItemDTO  (module/homeservices/controller/dto)
//   - the WorkOrder fields the Schedule / Dismiss PUTs touch
// Keep these in sync with the BE by hand if those DTOs change.

/**
 * One card in the Missed-Call Inbox: a voicemail-sourced DRAFT WorkOrder a
 * dispatcher triages. Mirrors the BE `MissedCallInboxItemDTO` field-for-field.
 * Caller name + service address are not separate columns — they ride in
 * `notes` (the BE stamps the symptom, address, and raw transcript there); the
 * card surfaces them from that text. Equipment-nameplate reads (HS-2) likewise
 * land in `notes`.
 */
export interface MissedCallInboxItem {
  /** The WorkOrder id (the Schedule / Dismiss actions target this). */
  id: string;
  /** Server-assigned `YYYY-MM-NNNN` work-order number. */
  workOrderNumber?: string | null;
  /** The trade discipline (= WorkOrder.serviceType), e.g. "HVAC". */
  trade?: string | null;
  /** Routing urgency stamped at intake: EMERGENCY | URGENT | ROUTINE | UNTRIAGED. */
  urgency?: string | null;
  /** Coarse $-band hint, if any: SMALL | MEDIUM | LARGE. */
  jobValueBand?: string | null;
  /** WorkOrder title, `"<TRADE> — <URGENCY>"`. */
  title?: string | null;
  /** Symptom + service address + raw transcript (newline-delimited). */
  notes?: string | null;
  /** Originating Twilio CallSid (the voicemail-origin marker). */
  callSid?: string | null;
  /** When the DRAFT was created (newest-first ordering key). ISO-8601. */
  createdAt?: string | null;
}

/** Trade disciplines the multi-trade triage emits (BE `Trade` enum wire values). */
export type HomeServicesTrade =
  | "HVAC"
  | "PLUMBING"
  | "ELECTRICAL"
  | "ROOFING"
  | "PEST"
  | "GENERAL";

/** Routing urgency. UNTRIAGED is the BE's label when the AI couldn't classify. */
export type HomeServicesUrgency =
  | "EMERGENCY"
  | "URGENT"
  | "ROUTINE"
  | "UNTRIAGED";

/**
 * The partial WorkOrder body the Missed-Call Inbox PUTs to `/work-orders/{id}`.
 * `WorkOrderService.update` is a sparse patch (only non-null fields apply), so
 * Schedule sends `{ status, scheduledStart, technicianUserId }` to promote the
 * DRAFT onto the dated dispatch board, and Dismiss sends `{ status: "CANCELLED" }`
 * to retire it (recoverable — the record is kept, not deleted).
 */
export interface WorkOrderPatch {
  status?: WorkOrderStatus;
  /** ISO-8601 instant. */
  scheduledStart?: string;
  /** ISO-8601 instant. */
  scheduledEnd?: string;
  technicianUserId?: string;
}

/** WorkOrder lifecycle (BE `WorkOrderStatus`). Inbox cards are DRAFT. */
export type WorkOrderStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "EN_ROUTE"
  | "ON_SITE"
  | "COMPLETED"
  | "CANCELLED";

/**
 * The WorkOrder the Schedule / Dismiss PUTs return. Hand-written (field-service
 * is not otherwise surfaced in the admin, so there is no generated alias). Only
 * the fields the inbox reads back are typed precisely; the rest are loose.
 */
export interface WorkOrder {
  id: string;
  workOrderNumber?: string | null;
  title?: string | null;
  status?: WorkOrderStatus;
  serviceType?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  technicianUserId?: string | null;
  notes?: string | null;
  customFields?: Record<string, unknown> | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

// =============================================================================
// ChairFill — salon flagship FE surfaces (CF-5)
// =============================================================================
//
// HAND-WRITTEN types (not generated aliases). Every ChairFill BE controller is
// @ConditionalOnProperty(kmosf.modules.chairfill)-gated, so the endpoints are
// ABSENT from the committed openapi.json and the generated openapi.ts has no
// shape for them (the Home-Services HS-4 precedent). These mirror the BE
// contracts on `main` by hand:
//   - NoShowRisk          (module/chairfill/model/NoShowRisk.java)
//   - Booking risk slice  (module/salonspa/model/Booking.java + the noShowRisk embed)
//   - WaitlistBoardDTO    (module/chairfill/controller/dto/*)
//   - the /chairfill/reviews/draft request body (SalonReviewReplyController)
// Keep these in sync with the BE by hand if those DTOs change.
//
// The salon review-reply draft itself lands in the SAME GbpReviewReply queue
// NMM uses (see GbpReviewReply above), so the review inbox reuses the existing
// review-replies surface — only the paste-in action is ChairFill-specific.

/** No-show risk tier (BE `NoShowRiskTier`). Thresholds: ≥0.6 HIGH, ≥0.35 MEDIUM. */
export type NoShowRiskTier = "LOW" | "MEDIUM" | "HIGH";

export const NO_SHOW_RISK_TIERS: NoShowRiskTier[] = ["LOW", "MEDIUM", "HIGH"];

/**
 * Derived no-show risk stamped on an upcoming salon booking by the nightly
 * CF-1 scorer. Mirrors the BE `record NoShowRisk`. `riskScore` is P(no-show) in
 * [0,1]; `riskTier` is the {@link NoShowRiskTier} name; `source` is MODEL |
 * RULES_FALLBACK | INSUFFICIENT_DATA.
 */
export interface NoShowRisk {
  /** P(no-show) in [0,1] — a HIGH score means likely to no-show. */
  riskScore: number;
  /** LOW | MEDIUM | HIGH (the tier name). */
  riskTier: string;
  /** MODEL | RULES_FALLBACK | INSUFFICIENT_DATA. */
  source: string;
  /** When the score was computed. ISO-8601. */
  computedAt?: string | null;
}

/** Where a no-show score came from (BE `NoShowRisk.SOURCE_*`). */
export type NoShowRiskSource =
  | "MODEL"
  | "RULES_FALLBACK"
  | "INSUFFICIENT_DATA";

/** Salon booking lifecycle (BE `BookingStatus`). */
export type BookingStatus =
  | "PENDING_DEPOSIT"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

/**
 * One upcoming salon booking row on the no-show risk view, as returned by
 * `GET /chairfill/risk/bookings?from&to` (the BE returns the full salon
 * `Booking`, sorted highest-risk first). Only the fields the risk view reads
 * are typed precisely; the booking carries a denormalized `serviceMenuItemName`
 * (so no menu join is needed) and `contactId` (resolved to a name view-side
 * against the contacts the page already loads). `noShowRisk` is nullable: a
 * booking scored before the first run, or one with no usable history, may have
 * no stamped risk.
 */
export interface RiskBooking {
  id: string;
  contactId?: string | null;
  staffMemberId?: string | null;
  serviceMenuItemId?: string | null;
  /** Snapshot of the service name at booking time (denormalized). */
  serviceMenuItemName?: string | null;
  /** Appointment start. ISO-8601. */
  scheduledStart?: string | null;
  /** Appointment end. ISO-8601. */
  scheduledEnd?: string | null;
  status?: BookingStatus | string | null;
  depositRequired?: boolean | null;
  depositPaid?: boolean | null;
  notes?: string | null;
  /** The CF-1 no-show-risk stamp (nullable — see above). */
  noShowRisk?: NoShowRisk | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/** Gap-fill offer lifecycle (BE `WaitlistOffer.Status`). */
export type WaitlistOfferStatus =
  | "OFFERED"
  | "CLAIMED"
  | "SUPERSEDED"
  | "EXPIRED";

export const WAITLIST_OFFER_STATUSES: WaitlistOfferStatus[] = [
  "OFFERED",
  "CLAIMED",
  "SUPERSEDED",
  "EXPIRED",
];

/**
 * One OPEN waitlist row on the CF-5 waitlist board. Mirrors the BE
 * `WaitlistBoardEntryDTO` (CF-5a). A lean projection of an OPEN WaitlistEntry:
 * who is waiting and for what. `contactId` / `preferredStaffMemberId` are
 * resolved to names board-side; `serviceMenuItemId` null means "any service".
 */
export interface WaitlistBoardEntry {
  id: string;
  contactId?: string | null;
  /** The requested service filter, or null = any service. */
  serviceMenuItemId?: string | null;
  /** The requested stylist filter, or null = any stylist. */
  preferredStaffMemberId?: string | null;
  /** Lower bound the client will accept, or null. ISO-8601. */
  earliestStart?: string | null;
  /** Upper bound the client will accept, or null. ISO-8601. */
  latestStart?: string | null;
  /** Only SMS-opted-in entries are offered. */
  smsOptIn?: boolean | null;
  /** The client's free-form note, nullable. */
  notes?: string | null;
  /** When the client joined the waitlist (newest-first ordering key). ISO-8601. */
  createdAt?: string | null;
}

/**
 * One recent gap-fill offer on the CF-5 waitlist board. Mirrors the BE
 * `WaitlistOfferDTO` (CF-5a): who was offered which freed slot, at what rank,
 * and where the offer stands. `contactPhone` + `serviceMenuItemName` are
 * denormalized at offer time (render directly); `contactId` / `staffMemberId`
 * resolve to names board-side.
 */
export interface WaitlistOffer {
  id: string;
  freedBookingId?: string | null;
  waitlistEntryId?: string | null;
  contactId?: string | null;
  /** The phone the offer was texted at (denormalized). */
  contactPhone?: string | null;
  staffMemberId?: string | null;
  serviceMenuItemId?: string | null;
  /** The service name snapshotted at offer time (denormalized). */
  serviceMenuItemName?: string | null;
  /** The freed slot window start. ISO-8601. */
  slotStart?: string | null;
  /** The freed slot window end. ISO-8601. */
  slotEnd?: string | null;
  /** 0-based rank in the ranked batch (0 = best, most-likely-to-show). */
  rank?: number | null;
  /** OFFERED | CLAIMED | SUPERSEDED | EXPIRED. */
  status?: WaitlistOfferStatus | string | null;
  /** When the offer SMS was sent (newest-first ordering key). ISO-8601. */
  sentAt?: string | null;
  /** After this the offer can no longer be claimed. ISO-8601. */
  expiresAt?: string | null;
  createdAt?: string | null;
}

/**
 * The one-shot waitlist-board envelope from `GET /chairfill/waitlist/board`:
 * OPEN entries + recent offers (both newest-first). Mirrors the BE
 * `WaitlistBoardDTO` (CF-5a). Named `…DTO` (not `WaitlistBoard`) to avoid a
 * clash with the `WaitlistBoard` admin view component of the same concept.
 */
export interface WaitlistBoardDTO {
  openEntries: WaitlistBoardEntry[];
  recentOffers: WaitlistOffer[];
}

/**
 * The paste-in review body the review inbox POSTs to `/chairfill/reviews/draft`
 * (BE `SalonReviewReplyController.PasteInReviewRequest`). Only `comment` (the
 * review text) is required; everything else is optional. The BE drafts an
 * on-brand salon reply and queues it DRAFTED in the same GbpReviewReply queue
 * the review inbox lists — so a successful draft returns a {@link GbpReviewReply}.
 */
export interface PasteInReviewRequest {
  /** An optional stable id (e.g. a real GBP review id, if known). */
  externalReviewId?: string;
  /** The star rating 1..5. */
  rating?: number;
  /** The review text — required (4240 if blank). */
  comment: string;
  /** The reviewer's display name. */
  reviewerName?: string;
  /** When the review was left. ISO-8601 (defaults to now). */
  createTime?: string;
}

// =============================================================================
// Real Estate Concierge — flagship FE surfaces (RE-5b)
// =============================================================================
//
// HAND-WRITTEN types (not generated aliases). Every Real Estate BE controller is
// @ConditionalOnProperty(kmosf.modules.realestate)-gated, so the endpoints are
// ABSENT from the committed openapi.json and the generated openapi.ts has no
// shape for them (the ChairFill CF-5b / Home-Services HS-4 precedent). These
// mirror the BE contracts on `main` by hand:
//   - Listing               (module/realestate/model/Listing.java)
//   - ListingDisclosure      (module/realestate/model/ListingDisclosure.java)
//   - ListingPhoto           (module/realestate/model/ListingPhoto.java)
//   - ListingMarketingDraft  (module/realestate/model/ListingMarketingDraft.java)
//   - ConciergeConversationSummaryDTO / DetailDTO (…/controller/dto/*)
// Keep these in sync with the BE by hand if those DTOs change.

/** Listing sale lifecycle (BE `Listing.ListingStatus`). */
export type ListingStatus = "ACTIVE" | "PENDING" | "SOLD";

export const LISTING_STATUSES: ListingStatus[] = ["ACTIVE", "PENDING", "SOLD"];

/**
 * One real-estate listing an agent has loaded into the console (BE `Listing`).
 * The PoC runs entirely on agent-uploaded data — no live MLS/IDX feed — so
 * `source` defaults to "AGENT_UPLOAD" and `externalId` is reserved. `trackedPhone`
 * (E.164) is the Twilio number buyers text (the inbound-SMS correlation key).
 */
export interface Listing {
  id?: string;
  tenantId?: string | null;
  addressLine?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  /** Optional MLS number (agent-entered; reserved for future IDX matching). */
  mlsNumber?: string | null;
  price?: number | null;
  beds?: number | null;
  /** Bathrooms (can be a half, e.g. 2.5). */
  baths?: number | null;
  sqft?: number | null;
  status?: ListingStatus | string | null;
  /** The listing agent's contact (handoff routing / display). Nullable. */
  agentContactId?: string | null;
  /** The listing agent's user id (the owner-user the hot-handoff notifies). */
  ownerUserId?: string | null;
  /** The tracked Twilio SMS number buyers text (E.164). Unique per tenant. */
  trackedPhone?: string | null;
  /** Provenance: "AGENT_UPLOAD" (default) or "IDX" (reserved). */
  source?: string | null;
  externalId?: string | null;
  customFields?: Record<string, unknown> | null;
  version?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/** Disclosure category (BE `DisclosureType`); anything unknown maps to GENERAL. */
export type DisclosureType =
  | "ROOF"
  | "FOUNDATION"
  | "BASEMENT"
  | "SYSTEMS_HVAC"
  | "ELECTRICAL"
  | "PLUMBING"
  | "WATER"
  | "PEST"
  | "LEAD_PAINT"
  | "FLOOD"
  | "HOA"
  | "GENERAL";

export const DISCLOSURE_TYPES: DisclosureType[] = [
  "ROOF",
  "FOUNDATION",
  "BASEMENT",
  "SYSTEMS_HVAC",
  "ELECTRICAL",
  "PLUMBING",
  "WATER",
  "PEST",
  "LEAD_PAINT",
  "FLOOD",
  "HOA",
  "GENERAL",
];

/**
 * One typed disclosure line/section for a listing (BE `ListingDisclosure`). The
 * `text` is THE grounding corpus the concierge RAG-answers from; `indexedAt` is
 * stamped after a successful embed (null until indexed). `sourceDocAttachmentId`
 * optionally references the original uploaded document.
 */
export interface ListingDisclosure {
  id?: string;
  tenantId?: string | null;
  listingId?: string | null;
  disclosureType?: DisclosureType | string | null;
  /** The disclosure line/section — the embedded grounding text. */
  text?: string | null;
  sourceDocAttachmentId?: string | null;
  /** When the text was last embedded into the vector index; null if not yet. */
  indexedAt?: string | null;
  version?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/**
 * The agent disclosure request body (BE `ListingDisclosureController.DisclosureRequest`).
 * `text` is required on create (4253 if blank); an unknown/blank `disclosureType`
 * maps to GENERAL.
 */
export interface DisclosureRequest {
  disclosureType?: string;
  text: string;
  sourceDocAttachmentId?: string;
}

/**
 * A photo an agent has uploaded for a listing (BE `ListingPhoto`). The bytes live
 * in object storage; this row is the per-listing pointer (and links a generic
 * LISTING Attachment). The marketing studio vision-reads these at generate time.
 */
export interface ListingPhoto {
  id?: string;
  tenantId?: string | null;
  listingId?: string | null;
  /** The generic Attachment (subjectType="LISTING") this photo registers as. */
  attachmentId?: string | null;
  /** Object-storage key the bytes were stored under. */
  storageRef?: string | null;
  filename?: string | null;
  contentType?: string | null;
  sizeBytes?: number | null;
  version?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/** Marketing surface a piece is drafted for (BE `MarketingChannel`). */
export type MarketingChannel =
  | "MLS_REMARKS"
  | "INSTAGRAM"
  | "FACEBOOK"
  | "X"
  | "EMAIL_BLAST";

export const MARKETING_CHANNELS: MarketingChannel[] = [
  "MLS_REMARKS",
  "INSTAGRAM",
  "FACEBOOK",
  "X",
  "EMAIL_BLAST",
];

/** Marketing draft lifecycle (BE `ListingMarketingDraft.Status`). */
export type ListingMarketingDraftStatus = "DRAFTED" | "APPROVED" | "SKIPPED";

/** One generated marketing piece for a channel (BE `GeneratedPiece`). */
export interface MarketingGeneratedPiece {
  channel?: MarketingChannel | string | null;
  /** The drafted copy (may be blank if generation degraded for this piece). */
  text?: string | null;
}

/** One listing photo's vision-read feature callout (BE `PhotoCaption`). */
export interface MarketingPhotoCaption {
  photoId?: string | null;
  /** The one-line caption the vision model produced (nullable). */
  caption?: string | null;
  /** Discrete features the vision model called out. */
  features?: string[] | null;
}

/** One Fair-Housing lint hit (BE `FairHousingFlag`). */
export interface FairHousingFlag {
  /** The matched banned term/phrase. */
  term?: string | null;
  /** The channel whose copy the term appeared in. */
  channel?: MarketingChannel | string | null;
  /** A short snippet of the surrounding copy for context. */
  snippet?: string | null;
}

/**
 * One Claude-drafted marketing package for a listing, parked in a draft→approve
 * queue so it is NEVER auto-published (BE `ListingMarketingDraft`, the GBP
 * draft→approve posture). Generation produces a DRAFTED draft (MLS remarks +
 * social captions + email + per-photo callouts + a deterministic Fair-Housing
 * lint); a staff approve flips it APPROVED (copy-ready, paste-out), a skip
 * discards it (SKIPPED).
 */
export interface ListingMarketingDraft {
  id?: string;
  tenantId?: string | null;
  listingId?: string | null;
  /** One piece per channel (MLS remarks + social captions + email). */
  pieces?: MarketingGeneratedPiece[] | null;
  /** Per-photo feature callouts (empty if no photos / all failed). */
  photoCaptions?: MarketingPhotoCaption[] | null;
  /** Deterministic Fair-Housing lint flags across the copy (empty = none). */
  fairHousingFlags?: FairHousingFlag[] | null;
  /** Convenience: true iff `fairHousingFlags` is non-empty. */
  fairHousingFlagged?: boolean | null;
  /** True iff generation degraded (a partial/empty package was saved DRAFTED). */
  generationDegraded?: boolean | null;
  status?: ListingMarketingDraftStatus | string | null;
  approvedAt?: string | null;
  approvedByUserId?: string | null;
  version?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/** A buyer's lead tier (BE Contact `leadScore.tier`). HOT/WARM/COLD; null = unscored. */
export type LeadTier = "HOT" | "WARM" | "COLD";

/** Concierge conversation lifecycle (BE `ConversationState`). */
export type ConversationState =
  | "ASKING"
  | "QUALIFYING"
  | "OFFERING_SLOTS"
  | "BOOKED"
  | "HANDED_OFF"
  | "OPTED_OUT";

/** A turn's author (BE `ConciergeTurn.Role`). */
export type ConciergeTurnRole = "BUYER" | "ASSISTANT";

/** Buyer buy/sell intent (BE `BuyerQualification.Intent`). */
export type BuyerIntent = "BUY" | "SELL";

/**
 * One row in the staff-facing concierge conversation list (BE
 * `ConciergeConversationSummaryDTO`, `GET /realestate/conversations`). A lean
 * projection: which listing, which buyer, the thread state, how warm the lead is
 * (`leadTier`, HOT/WARM/COLD — null when unscored / no contact), turn count, and
 * when it last moved. Ids resolve to names against the collections the FE loads.
 */
export interface ConciergeConversationSummary {
  id?: string;
  listingId?: string | null;
  /** The buyer Contact, or null until RE-2 resolves/creates it. */
  contactId?: string | null;
  /** The materialized concierge Deal, or null until RE-2 materializes it. */
  dealId?: string | null;
  state?: ConversationState | string | null;
  /** HOT/WARM/COLD, or null when unscored / no contact. */
  leadTier?: LeadTier | string | null;
  turnCount?: number | null;
  /** Whether the buyer texted STOP (TCPA opt-out). */
  optedOut?: boolean | null;
  /** When the thread last moved (newest-first ordering key). ISO-8601. */
  lastActivityAt?: string | null;
}

/**
 * One cited disclosure surfaced on an assistant turn (BE
 * `ConciergeConversationDetailDTO.CitationDTO`). The citation viewer renders
 * "Answered from: {disclosureType} — '{contentPreview}'" with the score.
 */
export interface ConciergeCitation {
  /** The cited ListingDisclosure id. */
  disclosureId?: string | null;
  disclosureType?: DisclosureType | string | null;
  /** The disclosure text preview (≤500 chars). */
  contentPreview?: string | null;
  /** The vector similarity score. */
  score?: number | null;
}

/**
 * One turn of the transcript (BE `ConciergeConversationDetailDTO.TurnDTO`). A
 * BUYER turn carries the question (empty citations); an ASSISTANT turn carries
 * the grounded answer (with its citations) or the handoff line (`handoff=true`,
 * empty citations).
 */
export interface ConciergeTurn {
  role?: ConciergeTurnRole | string | null;
  body?: string | null;
  at?: string | null;
  /** True on the assistant turn that handed off to the agent. */
  handoff?: boolean | null;
  citations?: ConciergeCitation[] | null;
}

/**
 * The accumulated buyer qualification (BE
 * `ConciergeConversationDetailDTO.QualificationDTO`). Every field is best-effort /
 * nullable; fields accumulate turn-to-turn and feed the materialized Deal.
 */
export interface BuyerQualification {
  /** The buyer's budget / target price (USD), or null until revealed. */
  budget?: number | null;
  timeline?: string | null;
  financing?: string | null;
  /** True when the buyer indicated pre-approval; null when unknown. */
  preApproved?: boolean | null;
  intent?: BuyerIntent | string | null;
  /** True once a Deal has been materialized from the qualification. */
  dealMaterialized?: boolean | null;
}

/**
 * One concierge conversation's full detail (BE
 * `ConciergeConversationDetailDTO`, `GET /realestate/conversations/{id}`),
 * backing the transcript + citation viewer + lead panel: the ordered turn
 * transcript (each assistant turn carrying its grounding citations), the
 * accumulated qualification, and the linked dealId + resolved leadTier.
 */
export interface ConciergeConversationDetail {
  id?: string;
  listingId?: string | null;
  contactId?: string | null;
  dealId?: string | null;
  /** The booked showing Meeting, or null until RE-3 books one. */
  meetingId?: string | null;
  /** The buyer's E.164 phone (the correlation key) — agent context. */
  buyerPhone?: string | null;
  state?: ConversationState | string | null;
  leadTier?: LeadTier | string | null;
  optedOut?: boolean | null;
  /** The accumulated buyer qualification, or null until RE-2 extracts any. */
  qualification?: BuyerQualification | null;
  /** The transcript, oldest first, each assistant turn carrying its citations. */
  turns?: ConciergeTurn[] | null;
  lastInboundAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

// =============================================================================
// FrontDesk IQ — Health Practices flagship FE surfaces (FD-5b)
// =============================================================================
//
// HAND-WRITTEN types (not generated aliases). Every FrontDesk IQ BE controller
// is @ConditionalOnProperty(kmosf.modules.frontdesk)-gated, so the endpoints are
// ABSENT from the committed openapi.json and the generated openapi.ts has no
// shape for them (the Real Estate RE-5b / ChairFill CF-5b / Home-Services HS-4
// precedent). These mirror the BE contracts on `main` by hand:
//   - Appointment            (module/frontdesk/model/Appointment.java)
//   - RecallDueDTO           (…/controller/dto/RecallDueDTO.java)
//   - CallbackInboxItemDTO   (…/controller/dto/CallbackInboxItemDTO.java)
//   - DraftedReply           (reviews/FrontDeskReviewReplyService.DraftedReply)
//   - HipaaFlag              (reviews/HipaaReplyLint.HipaaFlag)
//   - FrontDeskScoringJob    (model/FrontDeskScoringJob.java)
// Keep these in sync with the BE by hand if those DTOs change. The headline is
// PHI-free by construction: nothing clinical exists on any of these shapes —
// only scheduling logistics (visit-type bucket, lead time, insurance-pending,
// recall timing, an intent bucket — never a diagnosis/procedure/transcript).

/** Appointment scheduling lifecycle (BE `AppointmentStatus`). Carries no clinical meaning. */
export type AppointmentStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "COMPLETED"
  | "NO_SHOW"
  | "CANCELLED";

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "SCHEDULED",
  "CONFIRMED",
  "COMPLETED",
  "NO_SHOW",
  "CANCELLED",
];

/**
 * The scheduling category of an appointment (BE `VisitTypeBucket`). A closed
 * logistics enum chosen by front-desk staff — NOT a diagnosis or procedure
 * (fence F1). Consumed only as a model ordinal; never rendered into outbound
 * patient copy. An unknown wire value maps to OTHER.
 */
export type VisitTypeBucket =
  | "NEW_PATIENT"
  | "RECALL"
  | "FOLLOW_UP"
  | "HYGIENE"
  | "ANNUAL_WELLNESS"
  | "OTHER";

export const VISIT_TYPE_BUCKETS: VisitTypeBucket[] = [
  "NEW_PATIENT",
  "RECALL",
  "FOLLOW_UP",
  "HYGIENE",
  "ANNUAL_WELLNESS",
  "OTHER",
];

/**
 * A thin, PHI-free appointment for a health practice (BE `Appointment`). The
 * headline boundary is enforced by what this shape physically cannot hold:
 * every field is scheduling-logistics metadata — there is deliberately NO
 * diagnosis / procedure / chief-complaint / provider-name / clinical-note
 * field (fence F1). `contactId` / `providerId` are opaque ids, never names.
 * `noShowRisk` is the nightly stamp (null until scored / for terminal rows).
 */
export interface Appointment {
  id?: string;
  tenantId?: string | null;
  /** The patient/contact this appointment is for (a CRM Contact id — logistics only). */
  contactId?: string | null;
  /** Opaque staff/provider reference — never rendered into patient copy (fence F3). */
  providerId?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  status?: AppointmentStatus | string | null;
  /** New-patient / recall / follow-up / hygiene / annual-wellness / other (logistics, not clinical). */
  visitTypeBucket?: VisitTypeBucket | string | null;
  /** Whether insurance verification is still outstanding — a no-show correlate, pure logistics. */
  insuranceVerificationPending?: boolean | null;
  /** The contact's most-recent prior-visit timestamp (recall cadence) — a metadata timestamp, not a reason. */
  lastVisitAt?: string | null;
  /** How many confirmations/reminders have already been sent (an engagement proxy). */
  reminderCount?: number | null;
  /** The nightly no-show-risk stamp (nullable — see `NoShowRisk`). */
  noShowRisk?: NoShowRisk | null;
  /** Cal.com booking uid for a live-sync deployment (null for seeded/CSV-imported rows). */
  calComBookingUid?: string | null;
  version?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/** No-show-risk retrain job status (BE `FrontDeskScoringJob.JobStatus`). */
export type FrontDeskScoringJobStatus = "PENDING" | "RUNNING" | "DONE" | "FAILED";

/**
 * A manual/scheduled no-show-risk retrain run (BE `FrontDeskScoringJob`),
 * returned by `POST /frontdesk/risk/retrain` so the caller can poll for
 * completion without blocking the HTTP response.
 */
export interface FrontDeskScoringJob {
  id?: string;
  tenantId?: string | null;
  status?: FrontDeskScoringJobStatus | string | null;
  /** How many upcoming appointments were stamped with a NoShowRisk on this run. */
  appointmentsScored?: number | null;
  errorMessage?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
}

/**
 * One recall-due patient on the recall board (BE `RecallDueDTO`,
 * `GET /frontdesk/recall`). PHI-free: a lapsed patient keyed off a metadata
 * timestamp (last visit), never a reason for return (fence F1/F3). `name` is the
 * one cross-collection enrichment (the resolved Contact's display name —
 * best-effort, null when the contact is no longer materialized).
 */
export interface RecallDueDTO {
  /** The lapsed patient (resolve to the chart-side record board-side). */
  contactId?: string | null;
  /** The contact's display name, or null when not resolvable. */
  name?: string | null;
  /** The most-recent prior-visit timestamp — a metadata timestamp, never a clinical reason. ISO-8601. */
  lastVisitAt?: string | null;
  /** Whole days between `lastVisitAt` and now (the recall-overdue sort key). */
  daysSinceLastVisit?: number | null;
  /** Whether the nightly recall sweep already nudged this contact this period (avoid a double-nudge). */
  nudgedThisPeriod?: boolean | null;
}

/**
 * The logistics routing bucket of an after-hours voicemail callback (the BE's
 * extracted `intentBucket`). NEVER a diagnosis — a coarse, closed routing
 * category. An unknown/missing value reads as "Needs a callback".
 */
export type CallbackIntentBucket =
  | "SCHEDULING"
  | "BILLING"
  | "PRESCRIPTION_REFILL_REQUEST"
  | "GENERAL_CALLBACK"
  | "OTHER";

/**
 * One after-hours voicemail callback on the callback inbox (BE
 * `CallbackInboxItemDTO`, `GET /frontdesk/callbacks`). The marquee fence — F2:
 * this shape is <strong>logistics-only</strong> and has NO `body` / `transcript`
 * / `recordingUrl` field, so the callback inbox can never surface the spoken
 * words. The UI shows the intent bucket; there is no transcript to render.
 */
export interface CallbackInboxItemDTO {
  /** The callback Activity id. */
  activityId?: string | null;
  /** The caller's Contact (resolve board-side), or null. */
  contactId?: string | null;
  /** The caller's name as extracted (logistics only), or null. */
  callerName?: string | null;
  /** The number to call back (extracted callback number, else the Twilio caller-ID). */
  callbackPhone?: string | null;
  /** The logistics routing bucket — never a diagnosis. */
  intentBucket?: CallbackIntentBucket | string | null;
  /** Whether the caller asked to be called back. */
  callbackRequested?: boolean | null;
  /** When the callback was logged (newest-first). ISO-8601. */
  receivedAt?: string | null;
}

/** Whether a HIPAA-lint flag is a patient-status confirmation or a clinical term (BE `HipaaFlag.Category`). */
export type HipaaFlagCategory = "PATIENT_STATUS" | "CLINICAL";

/**
 * One flagged HIPAA-risk term found in a drafted public review reply (BE
 * `HipaaReplyLint.HipaaFlag`). The deterministic lint surfaces residual
 * patient-status-confirmation phrases or clinical terms to the staffer who
 * approves the reply — it does not block, only flags (the F4 backstop).
 */
export interface HipaaFlag {
  /** PATIENT_STATUS (confirms the reviewer was a patient) or CLINICAL (names care). */
  category?: HipaaFlagCategory | string | null;
  /** The matched banned term/phrase (lower-case). */
  term?: string | null;
  /** A short window of the original (case-preserved) draft around the match, for the staffer. */
  snippet?: string | null;
}

/**
 * A queued FrontDesk review-reply draft + its deterministic HIPAA-lint flags
 * (BE `FrontDeskReviewReplyService.DraftedReply`, the shape returned by
 * `POST /frontdesk/reviews/draft`, `GET /frontdesk/reviews`, and approve/skip).
 * The signature demo: a staffer pastes a public review, the BE drafts a
 * HIPAA-safe reply (never confirming patient status / naming a procedure), runs
 * the lint, and parks it DRAFTED; the staffer approves (copy-ready) or skips.
 * The `reply` is a standard `GbpReviewReply`; `hipaaFlags` is re-computed on
 * read (empty = clean).
 */
export interface DraftedReply {
  /** The persisted DRAFTED review-reply row. */
  reply?: GbpReviewReply | null;
  /** The patient-status / clinical-term flags found in the drafted reply (empty = clean). */
  hipaaFlags?: HipaaFlag[] | null;
}
