import type {
  MissedCallInboxItem,
  WorkOrder,
  WorkOrderPatch,
} from "../types/api";
import type { CrmClient } from "./client";

// Home Services — "Front Desk That Never Sleeps" — Missed-Call Inbox (HS-4).
//
// A HAND-WRITTEN client. The Home Services BE endpoints are gated behind
// @ConditionalOnProperty(kmosf.modules.home-services) and so are ABSENT from the
// committed openapi.json — the generated client has no methods for them. These
// three calls back the admin triage queue:
//   - list the voicemail-sourced DRAFT WorkOrders (GET /home-services/missed-call-inbox)
//   - Schedule one  (PUT /work-orders/{id} → status SCHEDULED + start + tech)
//   - Dismiss one   (PUT /work-orders/{id} → status CANCELLED)
//
// Dismiss is a soft status transition (CANCELLED), not a hard DELETE: the inbox
// lists DRAFT only, so a CANCELLED order drops off the queue exactly like a
// scheduled one, but the record is kept (a misclicked dismissal of a real lead
// is recoverable, and it matches the soft-transition pattern quotes/tickets/
// projects already use). Both list + work-order routes are staff-authenticated
// on the BE.

/**
 * List the tenant's voicemail-sourced DRAFT work orders awaiting triage,
 * newest first (the BE filters to DRAFTs whose `customFields.callSid` is set).
 */
export function listMissedCallInbox(
  client: CrmClient,
): Promise<MissedCallInboxItem[]> {
  return client.api<MissedCallInboxItem[]>("/home-services/missed-call-inbox");
}

/**
 * Schedule a missed-call lead: assign a technician + a start time and flip the
 * DRAFT to SCHEDULED, which promotes it onto the dated dispatch board (and off
 * this inbox). Returns the updated WorkOrder.
 */
export function scheduleWorkOrder(
  client: CrmClient,
  id: string,
  input: { scheduledStart: string; technicianUserId: string },
): Promise<WorkOrder> {
  const body: WorkOrderPatch = {
    status: "SCHEDULED",
    scheduledStart: input.scheduledStart,
    technicianUserId: input.technicianUserId,
  };
  return client.api<WorkOrder>(`/work-orders/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

/**
 * Dismiss a missed-call lead: retire the DRAFT by moving it to CANCELLED. The
 * record is kept (recoverable), it just drops off the inbox. Returns the
 * updated WorkOrder.
 */
export function dismissWorkOrder(
  client: CrmClient,
  id: string,
): Promise<WorkOrder> {
  const body: WorkOrderPatch = { status: "CANCELLED" };
  return client.api<WorkOrder>(`/work-orders/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}
