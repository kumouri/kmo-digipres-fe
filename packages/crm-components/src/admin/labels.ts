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
