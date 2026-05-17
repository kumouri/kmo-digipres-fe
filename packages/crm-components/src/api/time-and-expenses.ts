import type {
  TimeEntry,
  Expense,
  Invoice,
} from "../types/api";
import type { components } from "../types/openapi";
import type { CrmClient } from "./client";

type InvoiceFromTimeRequest = components["schemas"]["InvoiceFromTimeRequest"];
type InvoiceFromExpensesRequest = components["schemas"]["InvoiceFromExpensesRequest"];
type Attachment = components["schemas"]["Attachment"];
type PresignRequest = components["schemas"]["PresignRequest"];
type PresignResponse = { uploadUrl: string; storageRef: string };

// --- Time Entries ------------------------------------------------------------

export function listTimeEntries(client: CrmClient): Promise<TimeEntry[]> {
  return client.api<TimeEntry[]>("/time-entries");
}

export function listTimeEntriesByUser(
  client: CrmClient,
  userId: string,
): Promise<TimeEntry[]> {
  return client.api<TimeEntry[]>(`/time-entries/by-user/${userId}`);
}

export function listWeeklyTimeEntries(
  client: CrmClient,
  userId: string,
  from: string,
  to: string,
): Promise<TimeEntry[]> {
  return client.api<TimeEntry[]>(
    `/time-entries/weekly?userId=${encodeURIComponent(userId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
}

export function getTimeEntry(
  client: CrmClient,
  id: string,
): Promise<TimeEntry> {
  return client.api<TimeEntry>(`/time-entries/${id}`);
}

export function createTimeEntry(
  client: CrmClient,
  body: TimeEntry,
): Promise<TimeEntry> {
  return client.api<TimeEntry>("/time-entries", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateTimeEntry(
  client: CrmClient,
  id: string,
  body: TimeEntry,
): Promise<TimeEntry> {
  return client.api<TimeEntry>(`/time-entries/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteTimeEntry(
  client: CrmClient,
  id: string,
): Promise<void> {
  return client.api<void>(`/time-entries/${id}`, { method: "DELETE" });
}

// --- Timer -------------------------------------------------------------------

export function startTimer(
  client: CrmClient,
  body: TimeEntry,
): Promise<TimeEntry> {
  return client.api<TimeEntry>("/time-entries/timer/start", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function stopTimer(
  client: CrmClient,
  userId: string,
  endedAt?: string,
  zoneId?: string,
): Promise<TimeEntry[]> {
  const params = new URLSearchParams({ userId });
  if (endedAt) params.set("endedAt", endedAt);
  if (zoneId) params.set("zoneId", zoneId);
  return client.api<TimeEntry[]>(
    `/time-entries/timer/stop?${params.toString()}`,
    { method: "POST" },
  );
}

export function getRunningTimer(
  client: CrmClient,
  userId: string,
): Promise<TimeEntry | null> {
  // No running timer comes back as 204 (mock) / empty body (BE), which
  // CrmClient resolves to `undefined`. `.catch` only handles rejections, so
  // coerce the resolved no-content value to `null` — TanStack Query forbids
  // `undefined` query data.
  return client
    .api<TimeEntry | null>(
      `/time-entries/timer/running?userId=${encodeURIComponent(userId)}`,
    )
    .then((entry) => entry ?? null)
    .catch(() => null);
}

// --- Invoice from time -------------------------------------------------------

export function createInvoiceFromTime(
  client: CrmClient,
  body: InvoiceFromTimeRequest,
): Promise<Invoice> {
  return client.api<Invoice>("/time-entries/invoice-from-time", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// --- Expenses ----------------------------------------------------------------

export function listExpenses(client: CrmClient): Promise<Expense[]> {
  return client.api<Expense[]>("/expenses");
}

export function getExpense(client: CrmClient, id: string): Promise<Expense> {
  return client.api<Expense>(`/expenses/${id}`);
}

export function createExpense(
  client: CrmClient,
  body: Expense,
): Promise<Expense> {
  return client.api<Expense>("/expenses", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateExpense(
  client: CrmClient,
  id: string,
  body: Expense,
): Promise<Expense> {
  return client.api<Expense>(`/expenses/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteExpense(
  client: CrmClient,
  id: string,
): Promise<void> {
  return client.api<void>(`/expenses/${id}`, { method: "DELETE" });
}

export function approveExpense(
  client: CrmClient,
  id: string,
): Promise<Expense> {
  return client.api<Expense>(`/expenses/${id}/approve`, { method: "POST" });
}

export function rejectExpense(
  client: CrmClient,
  id: string,
  reason: string,
): Promise<Expense> {
  return client.api<Expense>(
    `/expenses/${id}/reject?reason=${encodeURIComponent(reason)}`,
    { method: "POST" },
  );
}

// --- Invoice from expenses ---------------------------------------------------

export function createInvoiceFromExpenses(
  client: CrmClient,
  body: InvoiceFromExpensesRequest,
): Promise<Invoice> {
  return client.api<Invoice>("/expenses/invoice-from-expenses", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// --- Receipt attachment (reuses existing /attachments endpoints) --------------

export function presignReceipt(
  client: CrmClient,
  req: PresignRequest,
): Promise<PresignResponse> {
  return client.api<PresignResponse>("/attachments/presign", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export function registerReceipt(
  client: CrmClient,
  attachment: Attachment,
): Promise<Attachment> {
  return client.api<Attachment>("/attachments", {
    method: "POST",
    body: JSON.stringify(attachment),
  });
}

export function listReceipts(
  client: CrmClient,
  expenseId: string,
): Promise<Attachment[]> {
  return client.api<Attachment[]>(
    `/attachments?subjectType=EXPENSE&subjectId=${encodeURIComponent(expenseId)}`,
  );
}
