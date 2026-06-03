import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../primitives/card";
import { Skeleton } from "../../primitives/skeleton";
import { DataTable, type Column } from "../../components/DataTable";
import { usePayoutsApi } from "../../hooks/usePayoutsApi";
import type { PayoutPeriodLine } from "../../types/api";

// Money is always shown as a plain dollar figure (the ExpenseDetail convention).
function money(n: number | undefined): string {
  return `$${(n ?? 0).toFixed(2)}`;
}

function hours(n: number | undefined): string {
  return (n ?? 0).toFixed(2);
}

// Margin %, guarded against a zero (or missing) bill — an unbilled period reads
// "—" rather than dividing by zero.
function marginPct(margin: number | undefined, bill: number | undefined): string {
  if (!bill) return "—";
  return `${((margin ?? 0) / bill * 100).toFixed(0)}%`;
}

// A named period reads as its date range; the ungrouped bucket (null start/end)
// is approved time not tied to a submitted week.
function periodLabel(line: PayoutPeriodLine): string {
  if (!line.periodStart && !line.periodEnd) return "Unassigned period";
  return `${line.periodStart ?? "—"} – ${line.periodEnd ?? "—"}`;
}

const columns: Column<PayoutPeriodLine>[] = [
  {
    key: "period",
    header: "Period",
    cell: (line) => <span className="font-medium">{periodLabel(line)}</span>,
  },
  {
    key: "hours",
    header: "Approved hours",
    cell: (line) => hours(line.hours),
  },
  {
    key: "payout",
    header: "Cost (what you owe)",
    cell: (line) => money(line.payout),
  },
  {
    key: "bill",
    header: "Bill",
    cell: (line) => money(line.bill),
  },
  {
    key: "margin",
    header: "Margin",
    cell: (line) => money(line.margin),
  },
  {
    key: "marginPct",
    header: "Margin %",
    cell: (line) => marginPct(line.margin, line.bill),
  },
];

/**
 * The Payout tab body for a team member: a year-to-date "what you owe" headline
 * plus a per-period breakdown of approved time, cost, bill, and margin. Only
 * approved hours count (the timesheet-approval gate). Read-only.
 */
export function PayoutSummary({ userId }: { userId: string }) {
  const payoutsApi = usePayoutsApi();
  // Pin the year + window once per mount so the query keys stay stable — a
  // fresh `new Date()` on every render would churn the key and never settle.
  const { year, yearStartIso, nowIso } = useMemo(() => {
    const y = new Date().getFullYear();
    return {
      year: y,
      // Current-year window for the period breakdown: Jan 1 → now (ISO instants).
      yearStartIso: new Date(Date.UTC(y, 0, 1)).toISOString(),
      nowIso: new Date().toISOString(),
    };
  }, []);

  const ytdQuery = useQuery({
    queryKey: ["payouts", userId, "ytd", year],
    queryFn: () => payoutsApi.getPayoutYtd(userId, year),
  });

  const periodsQuery = useQuery({
    queryKey: ["payouts", userId, "periods", yearStartIso, nowIso],
    queryFn: () => payoutsApi.getPayout(userId, yearStartIso, nowIso),
  });

  const ytd = ytdQuery.data;
  const periods = periodsQuery.data?.periods ?? [];
  const hasUnrated =
    ytd?.hasUnratedEntries || periodsQuery.data?.hasUnratedEntries;

  return (
    <div className="flex flex-col gap-4">
      <Card data-testid="payout-ytd">
        <CardHeader>
          <CardTitle>Paid this year</CardTitle>
          <CardDescription>
            What you owe this teammate for approved time so far in {year}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ytdQuery.isLoading ? (
            <Skeleton className="h-10 w-40" />
          ) : (
            <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
              <div className="flex flex-col">
                <span className="text-3xl font-medium" data-testid="payout-total">
                  {money(ytd?.payout)}
                </span>
                <span className="text-xs text-muted-foreground">
                  Amount owed
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-medium">{hours(ytd?.totalHours)}</span>
                <span className="text-xs text-muted-foreground">
                  Approved hours
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-medium">{money(ytd?.margin)}</span>
                <span className="text-xs text-muted-foreground">Margin</span>
              </div>
            </div>
          )}
          {hasUnrated ? (
            <p
              className="mt-3 text-xs text-muted-foreground"
              data-testid="payout-unrated-note"
            >
              Some approved hours have no cost rate set — not included in the
              amount owed.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        rows={periods}
        rowKey={(line) =>
          `${line.periodStart ?? "none"}:${line.periodEnd ?? "none"}`
        }
        isLoading={periodsQuery.isLoading}
        emptyMessage="No approved time yet."
        data-testid="payout-table"
      />
    </div>
  );
}
