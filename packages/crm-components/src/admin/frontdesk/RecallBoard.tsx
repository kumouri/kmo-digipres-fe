import { useQuery } from "@tanstack/react-query";
import { BellRing, CalendarClock, CheckCircle2, UserRound } from "lucide-react";

import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../primitives/card";
import { useFrontDeskApi } from "../../hooks/useFrontDeskApi";
import type { RecallDueDTO } from "../../types/api";

export const RECALL_KEY = ["frontdesk", "recall"] as const;

/** Overdue weight — the longer since the last visit, the louder the card. */
function overdueBadgeVariant(
  days: number | null | undefined,
): "destructive" | "default" | "secondary" {
  if ((days ?? 0) >= 365) return "destructive";
  if ((days ?? 0) >= 270) return "default";
  return "secondary";
}

/** "240 days ago" → a friendly months/years line for the recall card. */
function lastVisitText(days: number | null | undefined): string {
  const d = days ?? 0;
  if (d <= 0) return "Recently";
  if (d < 60) return `${d} days ago`;
  const months = Math.round(d / 30);
  if (months < 18) return `${months} months ago`;
  const years = Math.round(d / 365);
  return `${years} ${years === 1 ? "year" : "years"} ago`;
}

/** One recall-due patient — who, when they last came in, and whether we've nudged them. */
function RecallCard({ item }: { item: RecallDueDTO }) {
  const who = item.name?.trim() || "A patient";
  return (
    <Card data-testid="recall-card" data-nudged={item.nudgedThisPeriod ? "yes" : "no"}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle
            className="flex items-center gap-2 text-base"
            data-testid="recall-card-patient"
          >
            <UserRound className="size-4 text-muted-foreground" />
            {who}
          </CardTitle>
          <Badge
            variant={overdueBadgeVariant(item.daysSinceLastVisit)}
            data-testid="recall-card-overdue"
          >
            {item.daysSinceLastVisit ?? 0} days overdue
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5" data-testid="recall-card-last-visit">
          <CalendarClock className="size-4" />
          Last in {lastVisitText(item.daysSinceLastVisit)}
          {item.lastVisitAt
            ? ` (${new Date(item.lastVisitAt).toLocaleDateString()})`
            : ""}
        </span>
        {item.nudgedThisPeriod ? (
          <Badge variant="outline" className="gap-1" data-testid="recall-card-nudged">
            <CheckCircle2 className="size-3" />
            Nudged this week
          </Badge>
        ) : (
          <Badge variant="muted" className="gap-1" data-testid="recall-card-not-nudged">
            <BellRing className="size-3" />
            Not yet nudged
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * FrontDesk IQ (FD-5b) — the recall board. Lapsed patients due for recall/recare
 * (last visit older than the recall window, no upcoming appointment), most
 * overdue first, each showing when they were last in and whether the nightly
 * sweep already nudged them this week. PHI-free: keyed off a last-visit
 * timestamp, never a reason for return.
 */
export function RecallBoard() {
  const api = useFrontDeskApi();

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: RECALL_KEY,
    queryFn: api.listRecallDue,
  });

  return (
    <section className="flex flex-col gap-4" data-testid="recall-board-page">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2 text-2xl font-medium">
            <BellRing className="size-6 text-muted-foreground" />
            Recall board
          </h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Patients who are due to come back in and don't have an upcoming
            appointment. Most overdue first — give them a nudge.
          </p>
        </div>
        {data && data.length > 0 ? (
          <Badge variant="secondary" data-testid="recall-count">
            {data.length} due
          </Badge>
        ) : null}
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground" data-testid="recall-loading">
          Loading…
        </p>
      ) : isError ? (
        <div
          className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
          data-testid="recall-error"
        >
          <p className="text-sm text-foreground">
            We couldn't load the recall board.
            {error instanceof Error ? ` ${error.message}` : ""}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            data-testid="recall-retry"
          >
            {isRefetching ? "Retrying…" : "Try again"}
          </Button>
        </div>
      ) : !data || data.length === 0 ? (
        <div
          className="rounded-md border border-dashed p-8 text-center"
          data-testid="recall-empty"
        >
          <p className="text-sm text-muted-foreground">
            No one's overdue for a recall right now. Lapsed patients will show up
            here for a nudge.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3" data-testid="recall-list">
          {data.map((item) => (
            <RecallCard key={item.contactId ?? item.lastVisitAt} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
