import type { Timesheet, TimesheetStatus } from "../types/api";
import type { CrmClient } from "./client";

// Admin timesheet-approvals surface. The owner/admin reviews timesheets that
// teammates have submitted for approval: list by status, read one, approve, or
// send back with a required note. A scoped-down contractor never reaches these
// — they use /me/contractor/timesheets (see api/contractor.ts) instead.

export function listTimesheetsByStatus(
  client: CrmClient,
  status: TimesheetStatus = "SUBMITTED",
): Promise<Timesheet[]> {
  return client.api<Timesheet[]>(
    `/timesheets?status=${encodeURIComponent(status)}`,
  );
}

export function getTimesheet(
  client: CrmClient,
  id: string,
): Promise<Timesheet> {
  return client.api<Timesheet>(`/timesheets/${id}`);
}

export function approveTimesheet(
  client: CrmClient,
  id: string,
): Promise<Timesheet> {
  return client.api<Timesheet>(`/timesheets/${id}/approve`, { method: "POST" });
}

// `reason` is a required query param on the BE (POST /timesheets/{id}/reject?reason=).
export function rejectTimesheet(
  client: CrmClient,
  id: string,
  reason: string,
): Promise<Timesheet> {
  return client.api<Timesheet>(
    `/timesheets/${id}/reject?reason=${encodeURIComponent(reason)}`,
    { method: "POST" },
  );
}
