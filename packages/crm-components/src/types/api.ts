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
