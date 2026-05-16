import type { Quote, LineItem } from "../types/api";
import type { CrmClient } from "./client";

export function listQuotes(client: CrmClient): Promise<Quote[]> {
  return client.api<Quote[]>("/quotes");
}

export function getQuote(client: CrmClient, id: string): Promise<Quote> {
  return client.api<Quote>(`/quotes/${id}`);
}

export function createQuote(client: CrmClient, body: Quote): Promise<Quote> {
  return client.api<Quote>("/quotes", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateQuote(client: CrmClient, id: string, body: Quote): Promise<Quote> {
  return client.api<Quote>(`/quotes/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteQuote(client: CrmClient, id: string): Promise<void> {
  return client.api<void>(`/quotes/${id}`, { method: "DELETE" });
}

export function changeQuoteStatus(
  client: CrmClient,
  id: string,
  target: string,
): Promise<Quote> {
  return client.api<Quote>(`/quotes/${id}/status?target=${encodeURIComponent(target)}`, {
    method: "POST",
  });
}

export function getQuotePdfUrl(_client: CrmClient, id: string): string {
  // Returns a URL string — the caller opens it in a new tab.
  // Uses the same base URL the client was configured with.
  return `/quotes/${id}/pdf`;
}

export { type LineItem };
