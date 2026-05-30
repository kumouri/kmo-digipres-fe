import type { Invoice, Payment, CheckoutResult } from "../types/api";
import type { CrmClient } from "./client";

export function listInvoices(client: CrmClient): Promise<Invoice[]> {
  return client.api<Invoice[]>("/invoices");
}

export function getInvoice(client: CrmClient, id: string): Promise<Invoice> {
  return client.api<Invoice>(`/invoices/${id}`);
}

export function createInvoice(client: CrmClient, body: Invoice): Promise<Invoice> {
  return client.api<Invoice>("/invoices", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function createInvoiceFromQuote(
  client: CrmClient,
  quoteId: string,
): Promise<Invoice> {
  return client.api<Invoice>(`/invoices/from-quote/${quoteId}`, {
    method: "POST",
  });
}

export function deleteInvoice(client: CrmClient, id: string): Promise<void> {
  return client.api<void>(`/invoices/${id}`, { method: "DELETE" });
}

export function changeInvoiceStatus(
  client: CrmClient,
  id: string,
  target: string,
): Promise<Invoice> {
  return client.api<Invoice>(
    `/invoices/${id}/status?target=${encodeURIComponent(target)}`,
    { method: "POST" },
  );
}

export function listPayments(client: CrmClient, invoiceId: string): Promise<Payment[]> {
  return client.api<Payment[]>(`/invoices/${invoiceId}/payments`);
}

export function recordPayment(
  client: CrmClient,
  invoiceId: string,
  body: Payment,
): Promise<Payment> {
  return client.api<Payment>(`/invoices/${invoiceId}/payments`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function createStripeCheckout(
  client: CrmClient,
  invoiceId: string,
): Promise<CheckoutResult> {
  return client.api<CheckoutResult>(`/invoices/${invoiceId}/stripe-checkout`, {
    method: "POST",
  });
}
