import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpDown,
  CheckCircle2,
  Link2,
  MessageSquare,
  MinusCircle,
  SmilePlus,
  Star,
  TrendingUp,
  XCircle,
} from "lucide-react";

import { Button } from "../../primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../primitives/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../primitives/table";
import { useSalonReviewBoostApi } from "../../hooks/useSalonReviewBoostApi";
import type { StylistReviewStats } from "../../api/salon-reviewboost";
import {
  REVIEW_BOOST_FLAG_LABELS,
  REVIEW_BOOST_FLAG_OFF,
  REVIEW_BOOST_FLAG_ON,
} from "../labels";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const REVIEW_BOOST_INSIGHTS_KEY = [
  "salon",
  "reviewboost",
  "insights",
] as const;

export const REVIEW_BOOST_CONFIG_KEY = [
  "salon",
  "reviewboost",
  "config",
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pct(rate: number): string {
  return `${(rate * 100).toFixed(0)}%`;
}

// ---------------------------------------------------------------------------
// Headline stat card
// ---------------------------------------------------------------------------

function ReviewStat({
  icon: Icon,
  label,
  value,
  testid,
  highlight,
}: {
  icon: typeof Star;
  label: string;
  value: string;
  testid: string;
  highlight?: boolean;
}) {
  return (
    <Card
      data-testid={testid}
      className={highlight ? "border-primary/40" : undefined}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon className="size-4" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">
          <span data-testid={`${testid}-value`}>{value}</span>
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Sentiment badge
// ---------------------------------------------------------------------------

function SentimentBreakdown({
  positive,
  neutral,
  negative,
  unclassified,
}: {
  positive: number;
  neutral: number;
  negative: number;
  unclassified: number;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-3 text-sm"
      data-testid="sentiment-breakdown"
    >
      <span className="flex items-center gap-1 text-green-700 dark:text-green-400">
        <SmilePlus className="size-4" />
        <span data-testid="sentiment-positive">{positive.toLocaleString()}</span>
        <span className="text-muted-foreground">positive</span>
      </span>
      <span className="flex items-center gap-1 text-yellow-700 dark:text-yellow-400">
        <MinusCircle className="size-4" />
        <span data-testid="sentiment-neutral">{neutral.toLocaleString()}</span>
        <span className="text-muted-foreground">neutral</span>
      </span>
      <span className="flex items-center gap-1 text-red-700 dark:text-red-400">
        <XCircle className="size-4" />
        <span data-testid="sentiment-negative">{negative.toLocaleString()}</span>
        <span className="text-muted-foreground">negative</span>
      </span>
      {unclassified > 0 && (
        <span className="text-muted-foreground">
          {unclassified.toLocaleString()} unclassified
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-stylist table
// ---------------------------------------------------------------------------

type SortField = "displayName" | "requestsSent" | "requestsResponded" | "responseRate";

function StylistTable({ stylists }: { stylists: StylistReviewStats[] }) {
  const [sortField, setSortField] = useState<SortField>("requestsSent");
  const [sortAsc, setSortAsc] = useState(false);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortField(field);
      setSortAsc(field === "displayName");
    }
  }

  const sorted = [...stylists].sort((a, b) => {
    const mul = sortAsc ? 1 : -1;
    if (sortField === "displayName") {
      return mul * a.displayName.localeCompare(b.displayName);
    }
    return mul * (a[sortField] - b[sortField]);
  });

  function SortBtn({ field, label }: { field: SortField; label: string }) {
    return (
      <button
        type="button"
        onClick={() => toggleSort(field)}
        className="flex items-center gap-1 hover:text-foreground"
      >
        {label}
        <ArrowUpDown className="size-3.5 opacity-50" />
      </button>
    );
  }

  if (stylists.length === 0) {
    return (
      <div
        className="rounded-md border border-dashed p-6 text-center"
        data-testid="stylist-table-empty"
      >
        <p className="text-sm text-muted-foreground">
          No stylist data yet — review requests will appear here once the
          first booking completes.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="stylist-table" className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <SortBtn field="displayName" label="Stylist" />
            </TableHead>
            <TableHead className="text-right">
              <SortBtn field="requestsSent" label="Requests sent" />
            </TableHead>
            <TableHead className="text-right">
              <SortBtn field="requestsResponded" label="Responded" />
            </TableHead>
            <TableHead className="text-right">
              <SortBtn field="responseRate" label="Response rate" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((s) => (
            <TableRow key={s.staffMemberId} data-testid="stylist-row">
              <TableCell className="font-medium" data-testid="stylist-name">
                {s.displayName}
              </TableCell>
              <TableCell
                className="text-right tabular-nums"
                data-testid="stylist-requests-sent"
              >
                {s.requestsSent.toLocaleString()}
              </TableCell>
              <TableCell
                className="text-right tabular-nums"
                data-testid="stylist-responded"
              >
                {s.requestsResponded.toLocaleString()}
              </TableCell>
              <TableCell
                className="text-right tabular-nums"
                data-testid="stylist-response-rate"
              >
                {s.requestsSent === 0 ? "—" : pct(s.responseRate)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Headline stats + sentiment panel
// ---------------------------------------------------------------------------

function InsightsPanel() {
  const api = useSalonReviewBoostApi();

  const {
    data: board,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: REVIEW_BOOST_INSIGHTS_KEY,
    queryFn: () => api.getInsights(),
  });

  if (isLoading) {
    return (
      <p
        className="text-sm text-muted-foreground"
        data-testid="review-boost-insights-loading"
      >
        Loading review data…
      </p>
    );
  }

  if (isError) {
    return (
      <div
        className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
        data-testid="review-boost-insights-error"
      >
        <p className="text-sm text-foreground">
          We couldn't load the review data.
          {error instanceof Error ? ` ${error.message}` : ""}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
          data-testid="review-boost-insights-retry"
        >
          {isRefetching ? "Retrying…" : "Try again"}
        </Button>
      </div>
    );
  }

  if (!board) return null;

  const noReviews = board.reviewCount === 0;

  return (
    <div
      className="flex flex-col gap-6"
      data-testid="review-boost-insights-panel"
    >
      {/* Headline stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReviewStat
          icon={Star}
          label="Total reviews"
          value={board.reviewCount.toLocaleString()}
          testid="review-boost-stat-count"
          highlight
        />
        <ReviewStat
          icon={Star}
          label="Average rating"
          value={noReviews ? "—" : board.averageRating.toFixed(1)}
          testid="review-boost-stat-avg"
          highlight
        />
        <ReviewStat
          icon={MessageSquare}
          label="Requests sent"
          value={board.totalRequestsSent.toLocaleString()}
          testid="review-boost-stat-sent"
        />
        <ReviewStat
          icon={TrendingUp}
          label="Response rate"
          value={
            board.totalRequestsSent === 0
              ? "—"
              : pct(board.overallResponseRate)
          }
          testid="review-boost-stat-rate"
        />
      </div>

      {/* Sentiment breakdown */}
      {noReviews ? (
        <div
          className="rounded-md border border-dashed p-6 text-center"
          data-testid="review-boost-no-reviews"
        >
          <p className="text-sm text-muted-foreground">
            No reviews yet. Once your first review is ingested the sentiment
            breakdown and per-stylist data will appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Sentiment
          </p>
          <SentimentBreakdown
            positive={board.positiveCount}
            neutral={board.neutralCount}
            negative={board.negativeCount}
            unclassified={board.unclassifiedCount}
          />
        </div>
      )}

      {/* Per-stylist table */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Per-stylist request funnel
          </h2>
          <p className="text-xs text-muted-foreground">
            Click column headers to sort.
          </p>
        </div>
        <StylistTable stylists={board.stylists} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Config status card (read-only)
// ---------------------------------------------------------------------------

function ConfigStatusCard() {
  const api = useSalonReviewBoostApi();

  const {
    data: config,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: REVIEW_BOOST_CONFIG_KEY,
    queryFn: () => api.getConfig(),
  });

  if (isLoading) {
    return (
      <p
        className="text-sm text-muted-foreground"
        data-testid="review-boost-config-loading"
      >
        Loading config…
      </p>
    );
  }

  if (isError) {
    return (
      <div
        className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
        data-testid="review-boost-config-error"
      >
        <p className="text-sm text-foreground">
          We couldn't load the ReviewBoost config.
          {error instanceof Error ? ` ${error.message}` : ""}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
          data-testid="review-boost-config-retry"
        >
          {isRefetching ? "Retrying…" : "Try again"}
        </Button>
      </div>
    );
  }

  if (!config) return null;

  return (
    <Card data-testid="review-boost-config-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="size-4 text-muted-foreground" />
          ReviewBoost wiring
        </CardTitle>
        <CardDescription>
          These flags are controlled via your go-live configuration and
          deployment settings — contact your administrator to enable them.
          This card shows the current effective state at a glance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {/* Review link */}
          <div
            className="flex items-center justify-between rounded-md border p-3"
            data-testid="review-boost-config-review-link"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">Google review link</span>
              {config.reviewLinkConfigured && config.reviewLink ? (
                <a
                  href={config.reviewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-xs text-primary hover:underline"
                  data-testid="review-boost-config-review-link-url"
                >
                  {config.reviewLink}
                </a>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Not configured — requests cannot be sent until this is set.
                </span>
              )}
            </div>
            {config.reviewLinkConfigured ? (
              <CheckCircle2
                className="ml-4 size-5 shrink-0 text-green-600"
                data-testid="review-boost-config-link-ok"
              />
            ) : (
              <XCircle
                className="ml-4 size-5 shrink-0 text-destructive"
                data-testid="review-boost-config-link-missing"
              />
            )}
          </div>

          {/* Feature flags */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Feature flags
            </p>
            <div className="flex flex-col divide-y rounded-md border">
              {(
                [
                  "senderEnabled",
                  "sentimentRefineEnabled",
                  "negativeAlertEnabled",
                ] as const
              ).map((key) => {
                const on = config[key];
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between px-3 py-2"
                    data-testid={`review-boost-flag-${key}`}
                  >
                    <span className="text-sm">
                      {REVIEW_BOOST_FLAG_LABELS[key]}
                    </span>
                    <span
                      className={
                        on
                          ? "text-xs font-medium text-green-700 dark:text-green-400"
                          : "text-xs text-muted-foreground"
                      }
                      data-testid={`review-boost-flag-${key}-value`}
                    >
                      {on ? REVIEW_BOOST_FLAG_ON : REVIEW_BOOST_FLAG_OFF}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

/**
 * Salon "ReviewBoost" (T6) admin board — two sections:
 *
 * 1. Insights panel: headline review stats (count / avg rating / requests sent /
 *    response rate), a sentiment breakdown (positive / neutral / negative /
 *    unclassified), and a per-stylist request-funnel table (sortable by name,
 *    requests sent, responded, response rate). Zero-reviews empty state.
 *
 * 2. Config status card: read-only display of whether the Google review link is
 *    configured and whether the three default-OFF flags are enabled. A hint
 *    points to go-live config for enabling.
 *
 * Rendered behind RequireNotContractor alongside the other ChairFill surfaces
 * (the T4 SwitchboardPanel / T5 CallbackQueue precedent). Both BE endpoints are
 * ADMIN + chairfill-AND-salon-spa-module-gated; there is NO write endpoint.
 */
export function ReviewBoostBoard() {
  return (
    <section
      className="flex flex-col gap-8"
      data-testid="review-boost-board-page"
    >
      {/* Header */}
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-medium">
          <Star className="size-6 text-muted-foreground" />
          ReviewBoost
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Your salon's review health at a glance — how many reviews you have,
          how your team is driving requests, and whether the automated sender
          is wired up and ready.
        </p>
      </header>

      {/* Headline stats + per-stylist table */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Review insights
        </h2>
        <InsightsPanel />
      </div>

      {/* Config status */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Feature status
        </h2>
        <ConfigStatusCard />
      </div>
    </section>
  );
}
