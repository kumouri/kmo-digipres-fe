import type { CrmClient } from "./client";

// AR — Accounts Receivable / Collections module — HAND-WRITTEN client.
//
// Every AR BE controller is @ConditionalOnProperty(kmosf.modules.ar)
// -gated, so the endpoints are ABSENT from the committed openapi.json and the
// generated client has no methods for them (the ChairFill CF-5 / HS-4 precedent).
// These calls back the AR-aging dashboard surface:
//   - Aging report   — GET /ar/aging
//   - Promises list  — GET /ar/promises?invoiceId=...
//   - Record promise — POST /ar/promises
//
// All are STAFF-authenticated + ar-module-gated on the BE.

// ---------------------------------------------------------------------------
// DTOs — match the BE exactly (error bands 4601–4602)
// ---------------------------------------------------------------------------

export type ArAgingBucketLabel =
  | "CURRENT"
  | "D1_7"
  | "D8_14"
  | "D15_30"
  | "D30_PLUS";

export interface ArAgingBucket {
  label: ArAgingBucketLabel;
  count: number;
  totalBalance: number;
}

export interface ArAgingReport {
  buckets: ArAgingBucket[];
  grandTotalPastDue: number;
  primaryCurrency: string;
}

export type PromiseToPayStatus = "ACTIVE" | "KEPT" | "BROKEN" | "CANCELLED";

export interface PromiseToPay {
  id: string;
  invoiceId: string;
  contactId?: string;
  promisedAmount?: number;
  promisedDate: string; // YYYY-MM-DD
  status: PromiseToPayStatus;
  note?: string;
  createdAt: string;
}

export interface RecordPromiseRequest {
  invoiceId: string;
  promisedDate: string; // YYYY-MM-DD
  promisedAmount?: number;
  note?: string;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * The AR-aging report: outstanding balance bucketed by days-past-due, plus the
 * grand total of all past-due buckets. The CURRENT bucket is included but not
 * counted in grandTotalPastDue.
 */
export function getAgingReport(client: CrmClient): Promise<ArAgingReport> {
  return client.api<ArAgingReport>("/ar/aging");
}

/**
 * Record a customer's promise to pay a specific invoice. The BE 404s (4601) if
 * the invoice doesn't exist; 400s (4602) on invalid date/amount.
 */
export function recordPromiseToPay(
  client: CrmClient,
  body: RecordPromiseRequest,
): Promise<PromiseToPay> {
  return client.api<PromiseToPay>("/ar/promises", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * List the promises to pay recorded against a specific invoice, newest first.
 */
export function listPromises(
  client: CrmClient,
  invoiceId: string,
): Promise<PromiseToPay[]> {
  return client.api<PromiseToPay[]>(
    `/ar/promises?invoiceId=${encodeURIComponent(invoiceId)}`,
  );
}
