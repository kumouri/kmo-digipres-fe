// User-facing labels for raw status / enum values.
//
// DISPLAY ONLY. These map the backend's raw enum values (RAW_CAPS,
// SNAKE_CASE) to friendly, non-technical labels for tenant administrators
// (brand-voice §3.2 warm-operational). They must never change the underlying
// enum values, the API contract, query params, or data-testids — only what a
// person reads on screen.
//
// Pattern: each domain exports a Record<RawValue, Label>; render with
// labelFor(MAP, value). Unmapped values fall back to humanize() so a brand-new
// backend enum still reads cleanly instead of leaking RAW_CAPS. Later admin
// areas extend this file with their own maps (deal stages, statuses, etc.).

/** "IN_PROGRESS" -> "In progress"; "EMAIL" -> "Email". */
export function humanize(value: string): string {
  const spaced = value.replace(/_/g, " ").trim().toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Friendly label for a raw enum value. Unmapped values are humanized;
 * null/undefined returns `fallback`.
 */
export function labelFor(
  map: Record<string, string>,
  value: string | null | undefined,
  fallback = "—",
): string {
  if (!value) return fallback;
  return map[value] ?? humanize(value);
}

// --- Activities -------------------------------------------------------------

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  NOTE: "Note",
  EMAIL: "Email",
  CALL: "Call",
  MEETING: "Meeting",
  TASK: "Task",
};

export const ACTIVITY_DIRECTION_LABELS: Record<string, string> = {
  INBOUND: "Inbound",
  OUTBOUND: "Outbound",
  INTERNAL: "Internal",
};

export const SUBJECT_TYPE_LABELS: Record<string, string> = {
  CONTACT: "Contact",
  COMPANY: "Company",
  DEAL: "Deal",
  WORK_ORDER: "Work order",
};

// --- Quotes -----------------------------------------------------------------

export const QUOTE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  EXPIRED: "Expired",
};

// --- Invoices ---------------------------------------------------------------

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  VOIDED: "Voided",
  OVERDUE: "Overdue",
};

// --- Tickets ----------------------------------------------------------------

export const TICKET_STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  OPEN: "Open",
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const TICKET_PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

// --- Inbox ------------------------------------------------------------------
// "Open"/"Unclaimed" both mean nobody's taken it yet — show "Unassigned".

export const INBOX_STATUS_LABELS: Record<string, string> = {
  OPEN: "Unassigned",
  UNCLAIMED: "Unassigned",
  CLAIMED: "Assigned",
  CLOSED: "Closed",
};

// --- Projects / Milestones / Tasks ------------------------------------------

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  PLANNING: "Planning",
  ACTIVE: "Active",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const MILESTONE_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  DONE: "Done",
};

export const TASK_PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

// --- Time & Expenses --------------------------------------------------------

export const EXPENSE_APPROVAL_LABELS: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const BILLING_STATUS_LABELS: Record<string, string> = {
  UNBILLED: "Not billed",
  INVOICED: "Invoiced",
};

// Timesheet period lifecycle. "Sent back" reads gentler + clearer than the raw
// "Rejected" for a teammate whose week needs another look (brand-voice §3.2).
export const TIMESHEET_STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  REJECTED: "Sent back",
};

// --- Records (audit / reports / field definitions) --------------------------
// The CRM "entity types" a record can be — shown to users as plain record
// names ("entity" is engineer jargon for a non-technical admin).

export const RECORD_TYPE_LABELS: Record<string, string> = {
  CONTACT: "Contact",
  COMPANY: "Company",
  DEAL: "Deal",
  TICKET: "Ticket",
  INVOICE: "Invoice",
  QUOTE: "Quote",
  KB_ARTICLE: "Knowledge base article",
  WORK_ORDER: "Work order",
};

export const AUDIT_OP_LABELS: Record<string, string> = {
  CREATE: "Created",
  UPDATE: "Updated",
  DELETE: "Deleted",
};

export const FIELD_TYPE_LABELS: Record<string, string> = {
  TEXT: "Text",
  NUMBER: "Number",
  DATE: "Date",
  BOOL: "Yes / No",
  ENUM: "Choice",
  LOOKUP: "Lookup",
};

// --- Team / Roles -----------------------------------------------------------
// "Owner" reads warmer than "Admin" for the account owner; contractors and
// staff are shown by their plain role name.

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Owner",
  STAFF: "Staff",
  CONTRACTOR: "Contractor",
};

// Account lifecycle: a teammate invited without a password is INVITED until
// they set one; "Deactivated" reads gentler than the raw "Disabled".
export const USER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  INVITED: "Invited",
  DISABLED: "Deactivated",
};

// --- Recurring Invoices ------------------------------------------------------

export const RECURRING_INVOICE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  PAUSED: "Paused",
  ENDED: "Ended",
};

export const PAYMENT_TERMS_LABELS: Record<string, string> = {
  DUE_ON_RECEIPT: "Due on receipt",
  NET_7: "Net 7",
  NET_15: "Net 15",
  NET_30: "Net 30",
  NET_45: "Net 45",
  NET_60: "Net 60",
};

// --- Review replies (Google Business Profile) -------------------------------
// A drafted reply is waiting on the owner — "Needs review" reads clearer than
// the raw "Drafted" for someone deciding whether to post it (brand-voice §3.2).

export const REVIEW_REPLY_STATUS_LABELS: Record<string, string> = {
  DRAFTED: "Needs review",
  POSTED: "Posted",
  SKIPPED: "Skipped",
};

// --- Home Services — Missed-Call Inbox --------------------------------------
// Trade discipline a triaged voicemail needs. "General" is the catch-all when
// the AI couldn't pin a specific trade (a lead is never dropped).

export const TRADE_LABELS: Record<string, string> = {
  HVAC: "HVAC",
  PLUMBING: "Plumbing",
  ELECTRICAL: "Electrical",
  ROOFING: "Roofing",
  PEST: "Pest control",
  GENERAL: "General",
};

// Routing urgency the triage stamps. "Untriaged" reads clearer than a blank
// for a lead the AI couldn't classify — it still needs a human's eyes.
export const URGENCY_LABELS: Record<string, string> = {
  EMERGENCY: "Emergency",
  URGENT: "Urgent",
  ROUTINE: "Routine",
  UNTRIAGED: "Needs triage",
};

// Coarse job-value hint. Plain words instead of the raw band names so a
// dispatcher reads the size at a glance.
export const JOB_VALUE_BAND_LABELS: Record<string, string> = {
  SMALL: "Small job",
  MEDIUM: "Medium job",
  LARGE: "Large job",
};

// --- Home Services T5 "Instant Callback" — callback queue labels ------------
// The status of a callback request. Plain present-tense words a dispatcher
// reads at a glance when working through the ranked queue.
export const CALLBACK_STATUS_LABELS: Record<string, string> = {
  REQUESTED: "Waiting",
  DISPATCHED: "Dispatched",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

// Callback mode: did the caller want immediate or scheduled?
export const CALLBACK_MODE_LABELS: Record<string, string> = {
  IMMEDIATE: "Call me now",
  SCHEDULED: "Call me later",
};

// --- ChairFill — no-show risk + waitlist (salon flagship) -------------------
// How likely a client is to miss their appointment. Plain words so a front-desk
// staffer reads the risk at a glance and knows whether to ask for a deposit.

export const NO_SHOW_RISK_TIER_LABELS: Record<string, string> = {
  HIGH: "High risk",
  MEDIUM: "Some risk",
  LOW: "Low risk",
};

// Where the score came from. "Learned from your history" reads warmer + clearer
// than the raw "MODEL"; a brand-new client with no history is "Not enough
// history yet" (and is never punished with a deposit on zero evidence).
export const NO_SHOW_RISK_SOURCE_LABELS: Record<string, string> = {
  MODEL: "Learned from your history",
  RULES_FALLBACK: "Early estimate",
  INSUFFICIENT_DATA: "Not enough history yet",
};

// A gap-fill offer's status. Plain, present-tense words a staffer can scan: an
// OFFERED slot is still out for a reply; CLAIMED means someone grabbed it;
// SUPERSEDED means a faster YES won it; EXPIRED means the window closed.
export const WAITLIST_OFFER_STATUS_LABELS: Record<string, string> = {
  OFFERED: "Waiting on reply",
  CLAIMED: "Claimed",
  SUPERSEDED: "Filled by someone else",
  EXPIRED: "Expired",
};

// --- Real Estate Concierge (RE-5b flagship) ---------------------------------

// A listing's sale status. Plain words an agent scans on the console.
export const LISTING_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  PENDING: "Pending",
  SOLD: "Sold",
};

// The disclosure category — surfaced verbatim in a citation ("Answered from:
// {type} — …"). Friendly versions of the raw enum so a citation reads cleanly.
export const DISCLOSURE_TYPE_LABELS: Record<string, string> = {
  ROOF: "Roof",
  FOUNDATION: "Foundation",
  BASEMENT: "Basement",
  SYSTEMS_HVAC: "Heating & cooling",
  ELECTRICAL: "Electrical",
  PLUMBING: "Plumbing",
  WATER: "Water",
  PEST: "Pest",
  LEAD_PAINT: "Lead paint",
  FLOOD: "Flood",
  HOA: "HOA",
  GENERAL: "General",
};

// How warm a buyer lead is, read off the buyer's lead score. Plain words an
// agent uses to triage the pipeline; an unscored buyer is "Unscored".
export const LEAD_TIER_LABELS: Record<string, string> = {
  HOT: "Hot",
  WARM: "Warm",
  COLD: "Cold",
};

// The concierge conversation's state. "Asking" reads clearer than the raw enum
// for an agent skimming the inbox; "Handed off" / "Opted out" stay explicit.
export const CONVERSATION_STATE_LABELS: Record<string, string> = {
  ASKING: "Answering questions",
  QUALIFYING: "Qualifying",
  OFFERING_SLOTS: "Offering showings",
  BOOKED: "Showing booked",
  HANDED_OFF: "Handed to you",
  OPTED_OUT: "Opted out",
};

// Which marketing surface a drafted piece is for. The platform names read as
// people say them (MLS remarks, the social platforms, an email blast).
export const MARKETING_CHANNEL_LABELS: Record<string, string> = {
  MLS_REMARKS: "MLS remarks",
  INSTAGRAM: "Instagram caption",
  FACEBOOK: "Facebook post",
  X: "X post",
  EMAIL_BLAST: "Email blast",
};

// The marketing draft's review status. A DRAFTED package is waiting on the agent
// — "Needs review" reads clearer than the raw "Drafted" (the review-replies
// posture); "Approved" means copy-ready (paste-out, never auto-posted).
export const MARKETING_DRAFT_STATUS_LABELS: Record<string, string> = {
  DRAFTED: "Needs review",
  APPROVED: "Approved",
  SKIPPED: "Skipped",
};

// The buyer's buy/sell intent on the qualification panel.
export const BUYER_INTENT_LABELS: Record<string, string> = {
  BUY: "Buying",
  SELL: "Selling",
};

// --- Real Estate "Database Goldmine" — dormant-lead nurture (T1) -------------
// Dormancy tiers (DormancyBucket A..D) are internal codes; the agent reads them
// as warmth bands — A is the freshest dormant cohort, D the coldest. The exact
// day-windows live on the campaign, so the label stays a plain band name.
export const DORMANCY_BUCKET_LABELS: Record<string, string> = {
  A: "Recently dormant",
  B: "Cooling off",
  C: "Long dormant",
  D: "Coldest leads",
};

// One enrolled contact's place in the funnel (NurtureEnrollmentStatus). Plain
// words an agent scans: ENROLLED/ACTIVE are still being nudged; REPLIED → BOOKED
// is the win; the rest closed out.
export const NURTURE_ENROLLMENT_STATUS_LABELS: Record<string, string> = {
  ENROLLED: "Just enrolled",
  ACTIVE: "Being nudged",
  REPLIED: "Replied",
  BOOKED: "Showing booked",
  EXITED: "Exited",
  OPTED_OUT: "Opted out",
  COMPLETED: "Ran its course",
};

// --- AR — Accounts Receivable / Collections module --------------------------
// Aging bucket labels. The raw bucket names are internal codes; a plain-English
// range ("8–14 days past due") reads at a glance for an office manager or owner.
// CURRENT means nothing is owed yet — show it as such.

export const AR_AGING_BUCKET_LABELS: Record<string, string> = {
  CURRENT: "Not yet due",
  D1_7: "1–7 days past due",
  D8_14: "8–14 days past due",
  D15_30: "15–30 days past due",
  D30_PLUS: "30+ days past due",
};

// A customer's promise-to-pay status. Plain verbs an owner can scan: ACTIVE is
// still outstanding ("Promised"); KEPT means they paid ("Paid"); BROKEN means
// they missed it ("Missed"); CANCELLED means the promise was withdrawn.
export const PROMISE_TO_PAY_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Promised",
  KEPT: "Paid",
  BROKEN: "Missed",
  CANCELLED: "Cancelled",
};

// --- Proposals / SOW Studio -------------------------------------------------
// The four narrative sections of an AI-drafted SOW. Plain words a business
// owner scans before sending a proposal — not engineering jargon.

export const PROPOSAL_SECTION_LABELS: Record<string, string> = {
  scope: "Scope of work",
  deliverables: "Deliverables",
  assumptions: "Assumptions",
  timeline: "Timeline",
};

// --- FrontDesk IQ — Health Practices flagship (FD-5b) -----------------------
// PHI-free by construction. None of these are clinical — they're scheduling
// logistics a front desk reads at a glance. (Risk tier + source reuse the
// ChairFill NO_SHOW_RISK_* maps; the review-reply status reuses
// REVIEW_REPLY_STATUS_LABELS — a DRAFTED reply reads as "Needs review".)

// The appointment's scheduling category. A logistics bucket front-desk staff
// pick — never a diagnosis or procedure. Plain words for the day view.
export const VISIT_TYPE_BUCKET_LABELS: Record<string, string> = {
  NEW_PATIENT: "New patient",
  RECALL: "Recall / recare",
  FOLLOW_UP: "Follow-up",
  HYGIENE: "Hygiene",
  ANNUAL_WELLNESS: "Annual wellness",
  OTHER: "Other",
};

// The appointment's scheduling status (logistics lifecycle, no clinical meaning).
// "Missed" reads gentler + clearer than the raw "No-show" for a past appointment.
export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Scheduled",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  NO_SHOW: "Missed",
  CANCELLED: "Cancelled",
};

// The logistics routing bucket of an after-hours voicemail callback. NEVER a
// diagnosis — a coarse reason-to-route a staffer scans before calling back.
// An unknown/blank bucket reads as "Needs a callback" (a lead is never dropped).
export const CALLBACK_INTENT_BUCKET_LABELS: Record<string, string> = {
  SCHEDULING: "Scheduling",
  BILLING: "Billing",
  PRESCRIPTION_REFILL_REQUEST: "Prescription refill",
  GENERAL_CALLBACK: "General callback",
  OTHER: "Needs a callback",
};

// What a HIPAA-lint flag caught on a drafted public reply. Plain words so a
// staffer understands why the line was flagged before approving the reply.
export const HIPAA_FLAG_CATEGORY_LABELS: Record<string, string> = {
  PATIENT_STATUS: "Confirms patient status",
  CLINICAL: "Names care",
};

// --- Home Services "QuoteNow" (T8) — office quote-inbox + price book --------
// Plain labels for the instant-quote office surfaces. The homeowner sees the
// same estimates directly in the intake widget; these labels are the
// dispatcher's read surface so they scan quickly without decoding acronyms.

// The lifecycle of a submitted homeowner quote request.
// NEW = just arrived; ACCEPTED = homeowner accepted the estimate;
// BOOKED = visit confirmed on calendar; DECLINED = homeowner declined.
export const QUOTE_NOW_STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  ACCEPTED: "Accepted",
  BOOKED: "Booked",
  DECLINED: "Declined",
};

// The AI's repair-vs-replace verdict. Plain action words — a dispatcher reads
// these at a glance and knows what to lead with on the follow-up call.
export const QUOTE_NOW_RECOMMENDATION_LABELS: Record<string, string> = {
  REPAIR: "Repair recommended",
  REPLACE: "Replace recommended",
  DIAGNOSTIC_VISIT: "Diagnostic visit needed",
};

// --- Health "RevenueRevive" — dormant-patient reactivation funnel (T2) ------
// PHI-free by design: these labels are logistics-only — no clinical status,
// diagnosis, or procedure names. The enrolled patient's place in the funnel
// (FdNurtureEnrollmentStatus) is the same logistics lifecycle as T1; shared
// DORMANCY_BUCKET_LABELS (A–D) are reused unchanged (same engine, same tiers).
// A front desk manager reads these at a glance in the reactivation dashboard.

// One enrolled contact's lifecycle in the reactivation funnel. Plain words so
// a practice manager scans the funnel without needing to decode acronyms.
export const FD_NURTURE_ENROLLMENT_STATUS_LABELS: Record<string, string> = {
  ENROLLED: "Just enrolled",
  ACTIVE: "Being reached",
  REPLIED: "Replied",
  BOOKED: "Appointment booked",
  EXITED: "Exited",
  OPTED_OUT: "Opted out",
  COMPLETED: "Ran its course",
};

// --- Real Estate "Midnight Responder" — response-latency + tier routing (T3) -
// Fair-housing-neutral: these labels describe routing logistics, never buyer
// characteristics. Lead tiers (HOT/WARM/COLD) are the responder engine's
// engagement-signal scores, not personal attributes.

// How a buyer lead is routed after the responder scores it. Plain words an
// agent reads at a glance — "Warm nurture campaign" vs "Long-term nurture".
// HOT is handled by the RE-2 handoff service, so it is not configurable here.
export const RESPONDER_LEAD_TIER_LABELS: Record<string, string> = {
  WARM: "Warm leads",
  COLD: "Long-dormant leads",
};

// --- Salon "ReviewBoost" (T6) — per-stylist review insights board ------------
// Copy for the ReviewBoost board: config flag status display so the salon
// manager knows at a glance whether the feature is actually wired up.
// Plain, non-technical labels — a front-desk manager, not an engineer, reads these.

// --- Health "RescheduleFlow" (T7) — waitlist board + fill-rate stats ---------
// PHI-free by construction. These labels cover the logistics lifecycle of a
// health waitlist entry — never a clinical status or procedure name.

/**
 * The generic WaitlistEntry's lifecycle (WaitlistEntry.Status on the BE):
 * OPEN = waiting for an offer; FULFILLED = patient claimed a freed slot;
 * CANCELLED = staff removed the entry.
 */
export const WAITLIST_ENTRY_STATUS_LABELS: Record<string, string> = {
  OPEN: "Waiting",
  FULFILLED: "Slot filled",
  CANCELLED: "Removed",
};

// --- Salon "StyleConsult AI" (T9) — style-consult inbox labels ---------------
// Plain labels for the style-consult office surfaces. A salon coordinator reads
// these at a glance to triage the prospect queue.

// The lifecycle of a submitted prospect style consult. NEW = just arrived with
// AI recommendations; BOOKED = prospect accepted and a booking was created.
export const STYLE_CONSULT_STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  BOOKED: "Booked",
};

// Where the style attributes came from. "Inspiration photo" reads warmer than
// the raw "VISION" enum for a non-technical salon coordinator.
export const STYLE_ATTRIBUTE_SOURCE_LABELS: Record<string, string> = {
  VISION: "Inspiration photo (AI)",
  MANUAL: "Client-typed",
};

// --- Real Estate "Listing Prep Studio" (T10) ---------------------------------
// Labels for the prep-pack lifecycle and the social calendar. An agent reads
// these at a glance in the Listing Prep queue — "Needs review" reads clearer
// than the raw "DRAFTED" (the review-replies / marketing-draft posture).

// The prep pack's review lifecycle. A DRAFTED pack is waiting on the agent;
// APPROVED means copy-ready (paste-out — no auto-posting); SKIPPED is terminal.
export const PREP_PACK_STATUS_LABELS: Record<string, string> = {
  DRAFTED: "Needs review",
  APPROVED: "Approved",
  SKIPPED: "Skipped",
};

// Social channel labels for calendar posts. The same values as RE-4
// MARKETING_CHANNEL_LABELS but scoped to the channels the social calendar uses
// (INSTAGRAM / FACEBOOK / X — not MLS_REMARKS or EMAIL_BLAST which are
// separate fields on the pack).
export const PREP_SOCIAL_CHANNEL_LABELS: Record<string, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  X: "X",
};

/** Short label for a boolean ReviewBoost flag when it is ON. */
export const REVIEW_BOOST_FLAG_ON = "On";

/** Short label for a boolean ReviewBoost flag when it is OFF (default). */
export const REVIEW_BOOST_FLAG_OFF = "Off (default)";

/** Human-readable names for each ReviewBoostConfig flag. */
export const REVIEW_BOOST_FLAG_LABELS: Record<string, string> = {
  senderEnabled: "Auto-send review requests",
  sentimentRefineEnabled: "AI sentiment refinement",
  negativeAlertEnabled: "Negative review alerts",
};

// --- Home Services T11 "QuoteCloser" — follow-up settings + recovery funnel -
// Analytics funnel step labels. Plain present-tense words a staff member reads
// at a glance on the recovery funnel panel.
export const QUOTE_CLOSER_FUNNEL_LABELS: Record<string, string> = {
  quotesSent: "Quotes sent",
  followedUp: "Followed up",
  recovered: "Recovered",
  reviewRequested: "Review requested",
};

// --- Salon T12 "StylerMatch" — stylist-match console labels ------------------
// Labels for the styler-match office surfaces. A salon coordinator reads these
// at a glance to triage the match queue and interpret ranked results.

// The lifecycle of a submitted stylist match. NEW = ranked board ready;
// BOOKED = a ranked stylist was accepted and a real Booking was created.
export const STYLER_MATCH_STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  BOOKED: "Booked",
};
