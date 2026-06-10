import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ChevronLeft,
  ClipboardList,
  Cpu,
  DollarSign,
  Wrench,
} from "lucide-react";

import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../primitives/card";
import { useQuotingApi } from "../../hooks/useQuotingApi";
import type { QuoteInboxCard, QuoteResponse, QuoteStatus } from "../../api/quoting";
import {
  QUOTE_NOW_STATUS_LABELS,
  QUOTE_NOW_RECOMMENDATION_LABELS,
  labelFor,
} from "../labels";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const QUOTE_INBOX_KEY = ["quoting", "quotes"] as const;
export function quoteDetailKey(id: string) {
  return ["quoting", "quotes", id] as const;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusBadgeVariant(
  status: QuoteStatus,
): "default" | "secondary" | "muted" | "destructive" | "outline" {
  switch (status) {
    case "NEW":
      return "default";
    case "ACCEPTED":
      return "secondary";
    case "BOOKED":
      return "secondary";
    case "DECLINED":
      return "destructive";
    default:
      return "muted";
  }
}

function recommendationBadgeVariant(
  rec: string | null | undefined,
): "default" | "secondary" | "muted" | "destructive" | "outline" {
  switch (rec) {
    case "REPAIR":
      return "secondary";
    case "REPLACE":
      return "default";
    case "DIAGNOSTIC_VISIT":
      return "muted";
    default:
      return "muted";
  }
}

/** Format a price range as "$X – $Y" or a single value. */
function formatRange(
  low: number | null,
  high: number | null,
  currency: string | null,
): string {
  if (low == null && high == null) return "—";
  const fmt = (n: number) =>
    n.toLocaleString("en-US", {
      style: "currency",
      currency: currency ?? "USD",
      maximumFractionDigits: 0,
    });
  if (low != null && high != null) return `${fmt(low)} – ${fmt(high)}`;
  if (low != null) return fmt(low);
  return fmt(high!);
}

// ---------------------------------------------------------------------------
// Status filter tabs
// ---------------------------------------------------------------------------

const STATUS_FILTERS: { label: string; value: QuoteStatus | undefined }[] = [
  { label: "All", value: undefined },
  { label: "New", value: "NEW" },
  { label: "Accepted", value: "ACCEPTED" },
  { label: "Booked", value: "BOOKED" },
  { label: "Declined", value: "DECLINED" },
];

// ---------------------------------------------------------------------------
// Quote detail view
// ---------------------------------------------------------------------------

function QuoteDetailView({
  card,
  onBack,
}: {
  card: QuoteInboxCard;
  onBack: () => void;
}) {
  const api = useQuotingApi();

  const {
    data: detail,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<QuoteResponse>({
    queryKey: quoteDetailKey(card.quoteId),
    queryFn: () => api.getQuote(card.quoteId),
  });

  return (
    <div className="flex flex-col gap-6" data-testid="quote-detail-view">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          data-testid="quote-detail-back"
        >
          <ChevronLeft className="size-4" />
          Back to inbox
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h2
            className="text-lg font-medium"
            data-testid="quote-detail-title"
          >
            {card.equipmentType ?? "Equipment quote"}
          </h2>
          {card.contactPhone && (
            <span className="text-sm text-muted-foreground">
              {card.contactPhone}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={statusBadgeVariant(card.status)}
            data-testid="quote-detail-status"
          >
            {labelFor(QUOTE_NOW_STATUS_LABELS, card.status)}
          </Badge>
        </div>
      </div>

      {isLoading ? (
        <p
          className="text-sm text-muted-foreground"
          data-testid="quote-detail-loading"
        >
          Loading quote details…
        </p>
      ) : isError ? (
        <div
          className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
          data-testid="quote-detail-error"
        >
          <p className="text-sm text-foreground">
            We couldn&apos;t load this quote.
            {error instanceof Error ? ` ${error.message}` : ""}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            data-testid="quote-detail-retry"
          >
            {isRefetching ? "Retrying…" : "Try again"}
          </Button>
        </div>
      ) : detail ? (
        <div className="flex flex-col gap-4">
          {/* Price range */}
          <Card data-testid="quote-detail-range-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <DollarSign className="size-4" />
                Price estimate
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <p
                className="text-2xl font-semibold tabular-nums"
                data-testid="quote-detail-range"
              >
                {formatRange(detail.low, detail.high, detail.currency)}
              </p>
              {detail.estimateDisclaimer && (
                <p
                  className="text-xs text-muted-foreground"
                  data-testid="quote-detail-disclaimer"
                >
                  {detail.estimateDisclaimer}
                </p>
              )}
              {!detail.estimateDisclaimer && (
                <p
                  className="text-xs text-muted-foreground"
                  data-testid="quote-detail-disclaimer"
                >
                  This is an estimate — the final price is confirmed after an
                  on-site inspection.
                </p>
              )}
              {detail.basis && (
                <span className="text-xs text-muted-foreground">
                  Basis: {detail.basis}
                </span>
              )}
            </CardContent>
          </Card>

          {/* Repair vs. Replace recommendation */}
          <Card data-testid="quote-detail-rvr-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Wrench className="size-4" />
                Repair vs. Replace
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {detail.recommendation ? (
                <>
                  <Badge
                    variant={recommendationBadgeVariant(detail.recommendation)}
                    className="w-fit"
                    data-testid="quote-detail-recommendation"
                  >
                    {labelFor(
                      QUOTE_NOW_RECOMMENDATION_LABELS,
                      detail.recommendation,
                    )}
                  </Badge>
                  {detail.recommendationRationale && (
                    <p
                      className="text-sm text-foreground"
                      data-testid="quote-detail-rationale"
                    >
                      {detail.recommendationRationale}
                    </p>
                  )}
                  {detail.recommendation === "REPLACE" &&
                    detail.financingAvailable && (
                      <div
                        className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground"
                        data-testid="quote-detail-financing"
                      >
                        <DollarSign className="size-4 text-primary" />
                        Financing options available — mention this when you
                        follow up.
                      </div>
                    )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No recommendation available — a diagnostic visit may be
                  needed.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Equipment attributes */}
          <Card data-testid="quote-detail-attrs-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Cpu className="size-4" />
                Equipment attributes
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Type:</span>
                  <span data-testid="quote-detail-equipment-type">
                    {detail.equipmentType ?? "—"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Source:</span>
                  <span data-testid="quote-detail-attribute-source">
                    {detail.attributeSource === "VISION"
                      ? "Photo (AI vision)"
                      : detail.attributeSource === "MANUAL"
                        ? "Homeowner-typed"
                        : "—"}
                  </span>
                </div>
                {detail.attributeSource === "VISION" && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Confidence:</span>
                    <span data-testid="quote-detail-confidence">
                      {(detail.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quote inbox card (one item in the list)
// ---------------------------------------------------------------------------

function QuoteCard({
  card,
  onSelect,
}: {
  card: QuoteInboxCard;
  onSelect: (card: QuoteInboxCard) => void;
}) {
  return (
    <Card
      data-testid="quote-inbox-card"
      data-status={card.status}
      className="cursor-pointer transition-colors hover:border-primary/40"
      onClick={() => onSelect(card)}
    >
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="size-4 text-muted-foreground" />
              <span data-testid="quote-card-equipment">
                {card.equipmentType ?? "Equipment quote"}
              </span>
            </CardTitle>
            {card.contactPhone && (
              <span
                className="text-xs text-muted-foreground"
                data-testid="quote-card-phone"
              >
                {card.contactPhone}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {card.recommendation && (
              <Badge
                variant={recommendationBadgeVariant(card.recommendation)}
                data-testid="quote-card-recommendation"
              >
                {labelFor(QUOTE_NOW_RECOMMENDATION_LABELS, card.recommendation)}
              </Badge>
            )}
            <Badge
              variant={statusBadgeVariant(card.status)}
              data-testid="quote-card-status"
            >
              {labelFor(QUOTE_NOW_STATUS_LABELS, card.status)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        <div
          className="text-lg font-semibold tabular-nums"
          data-testid="quote-card-range"
        >
          {formatRange(card.low, card.high, card.currency)}
        </div>
        {card.diagnosticOnly && (
          <span className="text-xs text-muted-foreground">
            Diagnostic visit — on-site assessment required
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          Submitted {new Date(card.createdAt).toLocaleString()}
        </span>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main quote inbox list + detail
// ---------------------------------------------------------------------------

/**
 * Home Services T8 "QuoteNow" — the office quote-inbox:
 *
 * 1. Status-filtered inbox list: all homeowner quote submissions, with the price
 *    RANGE, the repair-vs-replace recommendation badge, and the accept status.
 *    Filter tabs narrow by QuoteStatus (All / New / Accepted / Booked / Declined).
 *
 * 2. Detail view: on card click, shows the full QuoteResponse — price range
 *    low–high, the mandatory estimate disclaimer, the repair-vs-replace
 *    recommendation + rationale + financing flag, and the equipment attributes
 *    (type + source + vision confidence).
 *
 * Rendered behind RequireNotContractor grouped with the other Home Services
 * surfaces (the T5 CallbackQueue / T4 SwitchboardPanel precedent).
 */
export function QuoteInbox() {
  const api = useQuotingApi();
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | undefined>(
    undefined,
  );
  const [selectedCard, setSelectedCard] = useState<QuoteInboxCard | null>(
    null,
  );

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<QuoteInboxCard[]>({
    queryKey: [...QUOTE_INBOX_KEY, statusFilter ?? "ALL"],
    queryFn: () => api.listQuotes(statusFilter),
  });

  // If a card is selected, show the detail view.
  if (selectedCard) {
    return (
      <section
        className="flex flex-col gap-6"
        data-testid="quote-inbox-page"
      >
        <QuoteDetailView
          card={selectedCard}
          onBack={() => setSelectedCard(null)}
        />
      </section>
    );
  }

  return (
    <section
      className="flex flex-col gap-8"
      data-testid="quote-inbox-page"
    >
      {/* Header */}
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-medium">
          <ClipboardList className="size-6 text-muted-foreground" />
          Instant quotes
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Homeowner quote requests — equipment type, price range, and the
          repair-vs-replace recommendation. Click any row to see the full
          details and estimate disclaimer.
        </p>
      </header>

      {/* Status filter tabs */}
      <div
        className="flex flex-wrap gap-2"
        data-testid="quote-inbox-filters"
      >
        {STATUS_FILTERS.map(({ label, value }) => (
          <button
            key={label}
            type="button"
            onClick={() => setStatusFilter(value)}
            data-testid={`quote-filter-${label.toLowerCase()}`}
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
          data-testid="quote-inbox-loading"
        >
          Loading quotes…
        </p>
      ) : isError ? (
        <div
          className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
          data-testid="quote-inbox-error"
        >
          <p className="text-sm text-foreground">
            We couldn&apos;t load the quote inbox.
            {error instanceof Error ? ` ${error.message}` : ""}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            data-testid="quote-inbox-retry"
          >
            {isRefetching ? "Retrying…" : "Try again"}
          </Button>
        </div>
      ) : !data || data.length === 0 ? (
        <div
          className="rounded-md border border-dashed p-8 text-center"
          data-testid="quote-inbox-empty"
        >
          <AlertTriangle className="mx-auto mb-2 size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {statusFilter
              ? `No ${labelFor(QUOTE_NOW_STATUS_LABELS, statusFilter).toLowerCase()} quotes yet.`
              : "No quote requests yet — new homeowner submissions will appear here."}
          </p>
        </div>
      ) : (
        <div
          className="flex flex-col gap-4"
          data-testid="quote-inbox-list"
        >
          {data.map((card) => (
            <QuoteCard
              key={card.quoteId}
              card={card}
              onSelect={setSelectedCard}
            />
          ))}
        </div>
      )}
    </section>
  );
}
