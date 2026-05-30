import type { RecurringInvoice } from "../types/api";
import type { CrmClient } from "./client";

export function listRecurringInvoices(client: CrmClient): Promise<RecurringInvoice[]> {
  return client.api<RecurringInvoice[]>("/recurring-invoices");
}

export function getRecurringInvoice(
  client: CrmClient,
  id: string,
): Promise<RecurringInvoice> {
  return client.api<RecurringInvoice>(`/recurring-invoices/${id}`);
}

export function createRecurringInvoice(
  client: CrmClient,
  body: RecurringInvoice,
): Promise<RecurringInvoice> {
  return client.api<RecurringInvoice>("/recurring-invoices", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateRecurringInvoice(
  client: CrmClient,
  id: string,
  body: RecurringInvoice,
): Promise<RecurringInvoice> {
  return client.api<RecurringInvoice>(`/recurring-invoices/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteRecurringInvoice(
  client: CrmClient,
  id: string,
): Promise<void> {
  return client.api<void>(`/recurring-invoices/${id}`, { method: "DELETE" });
}

export function setRecurringInvoiceStatus(
  client: CrmClient,
  id: string,
  status: string,
): Promise<RecurringInvoice> {
  return client.api<RecurringInvoice>(
    `/recurring-invoices/${id}/status?status=${encodeURIComponent(status)}`,
    { method: "POST" },
  );
}

export function spawnNow(
  client: CrmClient,
  id: string,
): Promise<RecurringInvoice> {
  return client.api<RecurringInvoice>(`/recurring-invoices/${id}/spawn-now`, {
    method: "POST",
  });
}
