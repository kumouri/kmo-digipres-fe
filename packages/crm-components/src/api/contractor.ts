import type { TimeEntry, Expense, TimesheetView } from "../types/api";
import type { components } from "../types/openapi";
import type { CrmClient } from "./client";

// Contractor self-service surface. A CONTRACTOR token is DENIED on the broad
// staff readers (GET /projects, /time-entries/weekly, /expenses, …) — so the
// scoped-down "My Projects / My Timesheet / My Expenses" pages call these
// `/me/contractor/**` endpoints instead. Everything here is implicitly scoped
// to the caller (their assigned projects, their own time, their own expenses);
// there are no userId params.

export type ContractorProjectView =
  components["schemas"]["ContractorProjectView"];
export type ContractorTaskView = components["schemas"]["ContractorTaskView"];
export type ContractorClientView =
  components["schemas"]["ContractorClientView"];

// --- Projects ----------------------------------------------------------------

export function listContractorProjects(
  client: CrmClient,
): Promise<ContractorProjectView[]> {
  return client.api<ContractorProjectView[]>("/me/contractor/projects");
}

export function getContractorProject(
  client: CrmClient,
  id: string,
): Promise<ContractorProjectView> {
  return client.api<ContractorProjectView>(
    `/me/contractor/projects/${id}`,
  );
}

export function listContractorProjectTasks(
  client: CrmClient,
  id: string,
): Promise<ContractorTaskView[]> {
  return client.api<ContractorTaskView[]>(
    `/me/contractor/projects/${id}/tasks`,
  );
}

export function getContractorProjectClient(
  client: CrmClient,
  id: string,
): Promise<ContractorClientView> {
  return client.api<ContractorClientView>(
    `/me/contractor/projects/${id}/client`,
  );
}

// --- Time --------------------------------------------------------------------

export function listContractorTime(
  client: CrmClient,
): Promise<TimeEntry[]> {
  return client.api<TimeEntry[]>("/me/contractor/time");
}

export function listContractorWeeklyTime(
  client: CrmClient,
  from: string,
  to: string,
): Promise<TimeEntry[]> {
  return client.api<TimeEntry[]>(
    `/me/contractor/time/weekly?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
}

export function logContractorTime(
  client: CrmClient,
  body: TimeEntry,
): Promise<TimeEntry> {
  return client.api<TimeEntry>("/me/contractor/time", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateContractorTime(
  client: CrmClient,
  id: string,
  body: TimeEntry,
): Promise<TimeEntry> {
  return client.api<TimeEntry>(`/me/contractor/time/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function startContractorTimer(
  client: CrmClient,
  body: TimeEntry,
): Promise<TimeEntry> {
  return client.api<TimeEntry>("/me/contractor/time/timer/start", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function stopContractorTimer(
  client: CrmClient,
  endedAt?: string,
  zoneId?: string,
): Promise<TimeEntry[]> {
  const params = new URLSearchParams();
  if (endedAt) params.set("endedAt", endedAt);
  if (zoneId) params.set("zoneId", zoneId);
  const qs = params.toString();
  return client.api<TimeEntry[]>(
    `/me/contractor/time/timer/stop${qs ? `?${qs}` : ""}`,
    { method: "POST" },
  );
}

// --- Timesheets (own periods: submit for approval / reopen) -------------------

export function listContractorTimesheets(
  client: CrmClient,
): Promise<TimesheetView[]> {
  return client.api<TimesheetView[]>("/me/contractor/timesheets");
}

export function getContractorTimesheet(
  client: CrmClient,
  id: string,
): Promise<TimesheetView> {
  return client.api<TimesheetView>(`/me/contractor/timesheets/${id}`);
}

// OPEN | REJECTED → SUBMITTED.
export function submitContractorTimesheet(
  client: CrmClient,
  id: string,
): Promise<TimesheetView> {
  return client.api<TimesheetView>(`/me/contractor/timesheets/${id}/submit`, {
    method: "POST",
  });
}

// REJECTED → OPEN (so a sent-back period can be edited before resubmitting).
export function reopenContractorTimesheet(
  client: CrmClient,
  id: string,
): Promise<TimesheetView> {
  return client.api<TimesheetView>(`/me/contractor/timesheets/${id}/reopen`, {
    method: "POST",
  });
}

// --- Expenses ----------------------------------------------------------------

export function listContractorExpenses(
  client: CrmClient,
): Promise<Expense[]> {
  return client.api<Expense[]>("/me/contractor/expenses");
}

export function submitContractorExpense(
  client: CrmClient,
  body: Expense,
): Promise<Expense> {
  return client.api<Expense>("/me/contractor/expenses", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
