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
