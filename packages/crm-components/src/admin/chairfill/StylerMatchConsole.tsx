import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  ChevronLeft,
  Link2,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../primitives/card";
import { useStylerMatchApi } from "../../hooks/useStylerMatchApi";
import type {
  RankedMatch,
  StylerMatchResponse,
  StylerMatchAnalytics,
  StylerMatchStatus,
} from "../../api/stylermatch";
import { STYLER_MATCH_STATUS_LABELS, labelFor } from "../labels";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const STYLER_MATCH_LIST_KEY = ["stylermatch", "matches"] as const;
export function stylerMatchDetailKey(id: string) {
  return ["stylermatch", "matches", id] as const;
}
export const STYLER_MATCH_ANALYTICS_KEY = [
  "stylermatch",
  "analytics",
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusBadgeVariant(
  status: StylerMatchStatus,
): "default" | "secondary" | "muted" | "destructive" | "outline" {
  switch (status) {
    case "NEW":
      return "default";
    case "BOOKED":
      return "secondary";
    default:
      return "muted";
  }
}

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function formatScore(score: number): string {
  return `${(score * 100).toFixed(0)}`;
}

// ---------------------------------------------------------------------------
// Status filter tabs
// ---------------------------------------------------------------------------

const STATUS_FILTERS: { label: string; value: StylerMatchStatus | undefined }[] = [
  { label: "All", value: undefined },
  { label: "New", value: "NEW" },
  { label: "Booked", value: "BOOKED" },
];

// ---------------------------------------------------------------------------
// Ranked match row (score + rationale + certified/penalty flag)
// ---------------------------------------------------------------------------

function RankedMatchRow({
  match,
  rank,
  onBook,
  booking,
}: {
  match: RankedMatch;
  rank: number;
  onBook?: () => void;
  booking?: boolean;
}) {
  const isTopRank = rank === 1;
  const notCertified = !match.eligibleForRequestedService;

  return (
    <div
      className="flex flex-col gap-2 rounded-md border bg-muted/20 p-4"
      data-testid="ranked-match-row"
      data-rank={rank}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        {/* Rank badge + name */}
        <div className="flex items-center gap-2">
          <span
            className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
            data-testid="ranked-match-rank"
          >
            {rank}
          </span>
          <span
            className="font-medium text-sm"
            data-testid="ranked-match-name"
          >
            {match.displayName}
          </span>
        </div>

        {/* Score + not-certified badge */}
        <div className="flex shrink-0 items-center gap-2">
          <Badge
            variant="outline"
            className="gap-1 text-xs tabular-nums"
            data-testid="ranked-match-score"
          >
            <TrendingUp className="size-3" />
            {formatScore(match.score)}% match
          </Badge>
          {notCertified && (
            <Badge
              variant="destructive"
              className="gap-1 text-xs"
              data-testid="ranked-match-not-certified"
            >
              <ShieldAlert className="size-3" />
              Not certified
            </Badge>
          )}
        </div>
      </div>

      {/* Rationale */}
      <p
        className="text-xs text-muted-foreground"
        data-testid="ranked-match-rationale"
      >
        {match.rationale}
      </p>

      {/* Score breakdown */}
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
        <span data-testid="ranked-match-specialty">
          Specialty fit: {formatScore(match.specialtyFit)}%
        </span>
        <span data-testid="ranked-match-availability">
          Availability: {formatScore(match.availability)}%
        </span>
        {match.preference > 0 && (
          <span data-testid="ranked-match-preference">
            Preference: {formatScore(match.preference)}%
          </span>
        )}
      </div>

      {/* Book top match button — only on rank 1 */}
      {isTopRank && onBook && (
        <Button
          size="sm"
          className="mt-1 w-fit"
          onClick={onBook}
          disabled={booking}
          data-testid="book-top-match-btn"
        >
          {booking ? "Booking…" : "Book top match"}
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Analytics card (accept-rate by rank funnel)
// ---------------------------------------------------------------------------

function StylerMatchAnalyticsCard() {
  const api = useStylerMatchApi();
  const { data, isLoading, isError } = useQuery<StylerMatchAnalytics>({
    queryKey: STYLER_MATCH_ANALYTICS_KEY,
    queryFn: () => api.getAnalytics(),
  });

  return (
    <Card data-testid="styler-match-analytics-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <TrendingUp className="size-4" />
          Match accept-rate analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p
            className="text-sm text-muted-foreground"
            data-testid="analytics-loading"
          >
            Loading analytics…
          </p>
        ) : isError || !data ? (
          <p
            className="text-sm text-muted-foreground"
            data-testid="analytics-error"
          >
            Analytics unavailable — check back shortly.
          </p>
        ) : (
          <div
            className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-4"
            data-testid="analytics-stats"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Total matches</span>
              <span
                className="text-xl font-semibold tabular-nums"
                data-testid="analytics-total"
              >
                {data.totalMatches}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Booked</span>
              <span
                className="text-xl font-semibold tabular-nums"
                data-testid="analytics-booked"
              >
                {data.matchesBooked}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Booking rate</span>
              <span
                className="text-xl font-semibold tabular-nums"
                data-testid="analytics-booking-rate"
              >
                {formatPercent(data.bookingRate)}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Rank-1 accept</span>
              <span
                className="text-xl font-semibold tabular-nums"
                data-testid="analytics-top1-rate"
              >
                {formatPercent(data.top1AcceptRate)}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Rank-1 booked</span>
              <span
                className="text-xl font-semibold tabular-nums"
                data-testid="analytics-top1-booked"
              >
                {data.top1BookedCount}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Rank-2 booked</span>
              <span
                className="text-xl font-semibold tabular-nums"
                data-testid="analytics-top2-booked"
              >
                {data.top2BookedCount}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Rank 3+ booked</span>
              <span
                className="text-xl font-semibold tabular-nums"
                data-testid="analytics-top3plus-booked"
              >
                {data.top3PlusBookedCount}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Avg top score</span>
              <span
                className="text-xl font-semibold tabular-nums"
                data-testid="analytics-avg-score"
              >
                {formatScore(data.avgTopScore)}%
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Token issue panel ("copy match widget link")
// ---------------------------------------------------------------------------

function StylerMatchTokenPanel({
  onTokenIssued,
}: {
  onTokenIssued?: (token: string) => void;
}) {
  const api = useStylerMatchApi();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const widgetUrl = token
    ? `${window.location.origin}/embed-demo?type=styler-match&token=${token}`
    : null;

  async function handleIssue() {
    setLoading(true);
    try {
      const res = await api.issueToken();
      setToken(res.token);
      onTokenIssued?.(res.token);
      toast.success("Match widget link ready — copy and embed on your site.");
    } catch {
      toast.error("Couldn't generate the link — please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!widgetUrl) return;
    await navigator.clipboard.writeText(widgetUrl);
    toast.success("Link copied to clipboard.");
  }

  return (
    <Card data-testid="styler-match-token-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Link2 className="size-4" />
          Stylist match widget link
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Embed this link on your booking page or Instagram bio so clients can
          submit a stylist-match request before their appointment. The link is
          valid for 180 days.
        </p>
        <Button
          size="sm"
          onClick={handleIssue}
          disabled={loading}
          data-testid="token-issue-btn"
          className="w-fit"
        >
          {loading ? "Generating…" : "Copy match widget link"}
        </Button>
        {widgetUrl && (
          <div className="flex flex-col gap-2" data-testid="token-result-section">
            <p
              className="break-all rounded-md border bg-muted px-3 py-2 text-xs font-mono"
              data-testid="token-widget-url"
            >
              {widgetUrl}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              data-testid="token-copy-btn"
              className="w-fit"
            >
              Copy link
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Create match form
// ---------------------------------------------------------------------------

const createMatchSchema = z.object({
  styleCategory: z.string().min(1, "Style category is required"),
  serviceMenuItemId: z.string().optional(),
  length: z.string().optional(),
  texture: z.string().optional(),
  color: z.string().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

type CreateMatchForm = z.infer<typeof createMatchSchema>;

function CreateMatchFormCard({
  onResult,
}: {
  onResult: (result: StylerMatchResponse) => void;
}) {
  const api = useStylerMatchApi();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateMatchForm>({
    resolver: zodResolver(createMatchSchema),
  });

  async function onSubmit(data: CreateMatchForm) {
    setSubmitting(true);
    try {
      const result = await api.createMatch({
        styleCategory: data.styleCategory,
        serviceMenuItemId: data.serviceMenuItemId || null,
        length: data.length || null,
        texture: data.texture || null,
        color: data.color || null,
        name: data.name || null,
        phone: data.phone || null,
        notes: data.notes || null,
      });
      reset();
      toast.success("Match request submitted — ranked stylists ready.");
      onResult(result);
    } catch {
      toast.error("Couldn't create the match — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card data-testid="create-match-form-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Users className="size-4" />
          New stylist match request
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          data-testid="create-match-form"
        >
          {/* Style category (required) */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="styleCategory"
              className="text-sm font-medium"
            >
              Style category <span className="text-destructive">*</span>
            </label>
            <input
              id="styleCategory"
              {...register("styleCategory")}
              placeholder="e.g. Curly / wavy, Straight / sleek"
              className="rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              data-testid="create-match-style-category"
            />
            {errors.styleCategory && (
              <p className="text-xs text-destructive">
                {errors.styleCategory.message}
              </p>
            )}
          </div>

          {/* Optional attribute row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="length" className="text-sm font-medium">
                Hair length
              </label>
              <input
                id="length"
                {...register("length")}
                placeholder="e.g. Long, Short"
                className="rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                data-testid="create-match-length"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="texture" className="text-sm font-medium">
                Hair texture
              </label>
              <input
                id="texture"
                {...register("texture")}
                placeholder="e.g. Wavy, Fine"
                className="rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                data-testid="create-match-texture"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="color" className="text-sm font-medium">
                Hair color
              </label>
              <input
                id="color"
                {...register("color")}
                placeholder="e.g. Platinum, Auburn"
                className="rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                data-testid="create-match-color"
              />
            </div>
          </div>

          {/* Client info row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="name" className="text-sm font-medium">
                Client name
              </label>
              <input
                id="name"
                {...register("name")}
                placeholder="e.g. Jordan Smith"
                className="rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                data-testid="create-match-name"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="phone" className="text-sm font-medium">
                Client phone
              </label>
              <input
                id="phone"
                {...register("phone")}
                placeholder="+1 555 0123"
                className="rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                data-testid="create-match-phone"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1">
            <label htmlFor="notes" className="text-sm font-medium">
              Notes
            </label>
            <textarea
              id="notes"
              {...register("notes")}
              rows={2}
              placeholder="Any additional context for the match…"
              className="rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              data-testid="create-match-notes"
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-fit"
            data-testid="create-match-submit-btn"
          >
            {submitting ? "Finding best stylists…" : "Find best stylists"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Match result view (ranked stylists + book-top-match)
// ---------------------------------------------------------------------------

function MatchResultView({
  result,
  onBack,
  currentToken,
}: {
  result: StylerMatchResponse;
  onBack: () => void;
  currentToken: string | null;
}) {
  const api = useStylerMatchApi();
  const queryClient = useQueryClient();
  const [booking, setBooking] = useState(false);
  const [bookedResult, setBookedResult] = useState<StylerMatchResponse | null>(
    result.status === "BOOKED" ? result : null,
  );

  const displayResult = bookedResult ?? result;

  async function handleBookTopMatch() {
    if (!currentToken) {
      toast.error(
        "No match widget token — generate one in the token panel first.",
      );
      return;
    }
    setBooking(true);
    try {
      const booked = await api.bookTopMatch(currentToken, result.matchId);
      setBookedResult(booked);
      // Invalidate the match list so the BOOKED status is reflected.
      await queryClient.invalidateQueries({ queryKey: STYLER_MATCH_LIST_KEY });
      toast.success("Top stylist booked — the client will receive a booking link.");
    } catch {
      toast.error("Booking failed — please try again or choose a different stylist.");
    } finally {
      setBooking(false);
    }
  }

  return (
    <div
      className="flex flex-col gap-6"
      data-testid="match-result-view"
    >
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          data-testid="match-result-back"
        >
          <ChevronLeft className="size-4" />
          Back to matches
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h2
            className="text-lg font-medium"
            data-testid="match-result-title"
          >
            {displayResult.styleCategory ?? "Stylist match"}
          </h2>
          <span className="text-sm text-muted-foreground">
            Confidence: {formatPercent(displayResult.confidence)}
          </span>
        </div>
        <Badge
          variant={statusBadgeVariant(displayResult.status)}
          data-testid="match-result-status"
        >
          {labelFor(STYLER_MATCH_STATUS_LABELS, displayResult.status)}
        </Badge>
      </div>

      {/* Stylist-confirm guardrail note */}
      <div
        className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground"
        data-testid="stylist-confirm-note"
      >
        <Sparkles className="size-4 text-primary" />
        This is a suggested match — your salon will confirm all bookings.
      </div>

      {/* Booked confirmation */}
      {displayResult.status === "BOOKED" && displayResult.bookingId && (
        <div
          className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground"
          data-testid="match-booked-status"
        >
          <CheckCircle2 className="size-4 text-primary" />
          Booked — booking #{displayResult.bookingId.slice(0, 8)} · Rank{" "}
          {displayResult.selectedRank ?? 1} stylist confirmed.
        </div>
      )}

      {/* Ranked stylist list */}
      <div className="flex flex-col gap-3">
        <h3
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
        >
          <Award className="size-4" />
          Ranked stylists{" "}
          <span className="font-normal">
            ({displayResult.rankedMatches.length} matches, best fit first)
          </span>
        </h3>
        {displayResult.rankedMatches.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No stylists could be ranked for this request.
          </p>
        ) : (
          <div
            className="flex flex-col gap-3"
            data-testid="ranked-matches-list"
          >
            {displayResult.rankedMatches.map((match, idx) => (
              <RankedMatchRow
                key={match.staffMemberId}
                match={match}
                rank={idx + 1}
                onBook={
                  idx === 0 && displayResult.status === "NEW"
                    ? handleBookTopMatch
                    : undefined
                }
                booking={booking}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Match inbox card (one item in the list)
// ---------------------------------------------------------------------------

function StylerMatchCard({
  match,
  onSelect,
}: {
  match: StylerMatchResponse;
  onSelect: (m: StylerMatchResponse) => void;
}) {
  const topMatch = match.rankedMatches[0];

  return (
    <Card
      data-testid="styler-match-card"
      data-status={match.status}
      className="cursor-pointer transition-colors hover:border-primary/40"
      onClick={() => onSelect(match)}
    >
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4 text-muted-foreground" />
              <span data-testid="styler-match-card-category">
                {match.styleCategory ?? "Stylist match"}
              </span>
            </CardTitle>
            {topMatch && (
              <span
                className="text-xs text-muted-foreground"
                data-testid="styler-match-card-top-stylist"
              >
                Top match: {topMatch.displayName}
              </span>
            )}
          </div>

          <Badge
            variant={statusBadgeVariant(match.status)}
            data-testid="styler-match-card-status"
          >
            {labelFor(STYLER_MATCH_STATUS_LABELS, match.status)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Award className="size-3.5 text-muted-foreground" />
            <span
              className="text-muted-foreground"
              data-testid="styler-match-card-count"
            >
              {match.rankedMatches.length} stylist
              {match.rankedMatches.length !== 1 ? "s" : ""} ranked
            </span>
          </div>
          {topMatch && (
            <div className="flex items-center gap-1.5">
              <TrendingUp className="size-3.5 text-muted-foreground" />
              <span
                className="text-muted-foreground"
                data-testid="styler-match-card-top-score"
              >
                {formatScore(topMatch.score)}% top score
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main StylerMatch console (create + list + detail + analytics + token)
// ---------------------------------------------------------------------------

/**
 * Salon T12 "StylerMatch" — the staff stylist-match console:
 *
 * 1. Create-match form: service + style attributes (category / length / texture /
 *    color) + optional client info → POST /stylermatch/matches → ranked
 *    stylist results with rationale, score breakdown, and "not certified" badge.
 *
 * 2. Ranked result view: on create or inbox-card click, shows the full
 *    StylerMatchResponse — each ranked stylist with rationale + per-component
 *    score + the "not certified" penalty badge — plus a "Book top match" action
 *    that POSTs the public accept endpoint.
 *
 * 3. Match inbox list: all match submissions, newest first. Status-filter tabs
 *    (All / New / Booked). Each card shows the style category, top-ranked
 *    stylist name, rank count, and top score.
 *
 * 4. Accept-rate analytics panel: funnel counters (total → booked → rank-1/2/3+)
 *    + booking rate + rank-1 accept rate + avg top score.
 *
 * 5. Token-issue panel: admin-gated "Copy match widget link" that POSTs
 *    /stylermatch/tokens and surfaces the copyable widget URL.
 *
 * Rendered behind RequireNotContractor grouped with the other ChairFill
 * surfaces (the T9 StyleConsultInbox / T6 ReviewBoostBoard precedent).
 */
export function StylerMatchConsole() {
  const api = useStylerMatchApi();
  const [statusFilter, setStatusFilter] = useState<StylerMatchStatus | undefined>(
    undefined,
  );
  const [selectedMatch, setSelectedMatch] = useState<StylerMatchResponse | null>(
    null,
  );
  // The last issued token — needed for "book top match".
  const [widgetToken, setWidgetToken] = useState<string | null>(null);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<StylerMatchResponse[]>({
    queryKey: [...STYLER_MATCH_LIST_KEY, statusFilter ?? "ALL"],
    queryFn: () => api.listMatches(statusFilter),
  });

  function handleCreateResult(result: StylerMatchResponse) {
    setSelectedMatch(result);
  }

  // If a match is selected, show the detail / result view.
  if (selectedMatch) {
    return (
      <section
        className="flex flex-col gap-6"
        data-testid="styler-match-console-page"
      >
        <MatchResultView
          result={selectedMatch}
          onBack={() => setSelectedMatch(null)}
          currentToken={widgetToken}
        />
      </section>
    );
  }

  return (
    <section
      className="flex flex-col gap-8"
      data-testid="styler-match-console-page"
    >
      {/* Header */}
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-medium">
          <Users className="size-6 text-muted-foreground" />
          Stylist match
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Find the best-fit stylist for a client based on their style
          preferences. Ranked by specialty fit, availability, and past
          preference — your salon confirms every booking.
        </p>
      </header>

      {/* Create match form */}
      <CreateMatchFormCard onResult={handleCreateResult} />

      {/* Accept-rate analytics */}
      <StylerMatchAnalyticsCard />

      {/* Token issue panel */}
      <StylerMatchTokenPanel onTokenIssued={(token) => setWidgetToken(token)} />

      {/* Status filter tabs */}
      <div
        className="flex flex-wrap gap-2"
        data-testid="styler-match-inbox-filters"
      >
        {STATUS_FILTERS.map(({ label, value }) => (
          <button
            key={label}
            type="button"
            onClick={() => setStatusFilter(value)}
            data-testid={`styler-match-filter-${label.toLowerCase()}`}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <p
          className="text-sm text-muted-foreground"
          data-testid="styler-match-inbox-loading"
        >
          Loading matches…
        </p>
      ) : isError ? (
        <div
          className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
          data-testid="styler-match-inbox-error"
        >
          <p className="text-sm text-foreground">
            We couldn&apos;t load the match inbox.
            {error instanceof Error ? ` ${error.message}` : ""}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            data-testid="styler-match-inbox-retry"
          >
            {isRefetching ? "Retrying…" : "Try again"}
          </Button>
        </div>
      ) : !data || data.length === 0 ? (
        <div
          className="rounded-md border border-dashed p-8 text-center"
          data-testid="styler-match-inbox-empty"
        >
          <AlertTriangle className="mx-auto mb-2 size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {statusFilter
              ? `No ${labelFor(STYLER_MATCH_STATUS_LABELS, statusFilter).toLowerCase()} matches yet.`
              : "No stylist match requests yet — use the form above to create one."}
          </p>
        </div>
      ) : (
        <div
          className="flex flex-col gap-4"
          data-testid="styler-match-inbox-list"
        >
          {data.map((match) => (
            <StylerMatchCard
              key={match.matchId}
              match={match}
              onSelect={setSelectedMatch}
            />
          ))}
        </div>
      )}
    </section>
  );
}
