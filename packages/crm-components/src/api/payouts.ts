import type { PayoutReport } from "../types/api";
import type { CrmClient } from "./client";

// Admin payout + margin report (Phase J4). The owner/admin reads what they owe
// a contractor (payout = approved hours × cost rate) and the project margin
// (bill − payout), per Timesheet period and year-to-date — the 1099 view. Only
// APPROVED time counts (the J3 gate); these are pure reads, never mutations.

// `from` / `to` are ISO instants (e.g. 2026-01-01T00:00:00.000Z).
export function getPayout(
  client: CrmClient,
  userId: string,
  from: string,
  to: string,
): Promise<PayoutReport> {
  const qs = new URLSearchParams({ userId, from, to });
  return client.api<PayoutReport>(`/reports/payout?${qs.toString()}`);
}

export function getPayoutYtd(
  client: CrmClient,
  userId: string,
  year: number,
): Promise<PayoutReport> {
  const qs = new URLSearchParams({ userId, year: String(year) });
  return client.api<PayoutReport>(`/reports/payout/ytd?${qs.toString()}`);
}
