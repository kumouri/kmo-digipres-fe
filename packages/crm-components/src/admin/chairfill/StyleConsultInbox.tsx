import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ChevronLeft,
  Link2,
  Scissors,
  ShoppingBag,
  Sparkles,
  TrendingUp,
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
import { useStyleConsultApi } from "../../hooks/useStyleConsultApi";
import type {
  StyleConsultInboxCard,
  StyleConsultResponse,
  StyleConsultStatus,
  RetailRecommendation,
} from "../../api/styleconsult";
import {
  STYLE_CONSULT_STATUS_LABELS,
  STYLE_ATTRIBUTE_SOURCE_LABELS,
  labelFor,
} from "../labels";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const STYLE_CONSULT_INBOX_KEY = ["styleconsult", "consults"] as const;
export function styleConsultDetailKey(id: string) {
  return ["styleconsult", "consults", id] as const;
}
export const STYLE_CONSULT_ANALYTICS_KEY = [
  "styleconsult",
  "analytics",
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusBadgeVariant(
  status: StyleConsultStatus,
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

function formatCurrency(amount: number | null): string {
  if (amount == null) return "—";
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function formatMargin(margin: number): string {
  return margin.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

// ---------------------------------------------------------------------------
// Status filter tabs
// ---------------------------------------------------------------------------

const STATUS_FILTERS: { label: string; value: StyleConsultStatus | undefined }[] = [
  { label: "All", value: undefined },
  { label: "New", value: "NEW" },
  { label: "Booked", value: "BOOKED" },
];

// ---------------------------------------------------------------------------
// Retail recommendation row (margin-aware)
// ---------------------------------------------------------------------------

function RetailRecRow({ rec }: { rec: RetailRecommendation }) {
  return (
    <div
      className="flex flex-col gap-1 rounded-md border bg-muted/30 p-3"
      data-testid="retail-rec-row"
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="font-medium text-sm"
          data-testid="retail-rec-name"
        >
          {rec.name}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {rec.price != null && (
            <span
              className="text-sm tabular-nums"
              data-testid="retail-rec-price"
            >
              {formatCurrency(rec.price)}
            </span>
          )}
          <Badge
            variant="secondary"
            className="gap-1 text-xs"
            data-testid="retail-rec-margin"
          >
            <TrendingUp className="size-3" />
            {formatMargin(rec.marginAmount)} margin
          </Badge>
        </div>
      </div>
      {rec.sku && (
        <span className="text-xs text-muted-foreground">SKU: {rec.sku}</span>
      )}
      <p className="text-xs text-muted-foreground" data-testid="retail-rec-rationale">
        {rec.rationale}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Analytics card
// ---------------------------------------------------------------------------

function StyleConsultAnalyticsCard() {
  const api = useStyleConsultApi();
  const { data, isLoading, isError } = useQuery({
    queryKey: STYLE_CONSULT_ANALYTICS_KEY,
    queryFn: () => api.getAnalytics(),
  });

  return (
    <Card data-testid="style-consult-analytics-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <TrendingUp className="size-4" />
          Retail-attach analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground" data-testid="analytics-loading">
            Loading analytics…
          </p>
        ) : isError || !data ? (
          <p className="text-sm text-muted-foreground" data-testid="analytics-error">
            Analytics unavailable — check back shortly.
          </p>
        ) : (
          <div
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6"
            data-testid="analytics-stats"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Consults</span>
              <span
                className="text-xl font-semibold tabular-nums"
                data-testid="analytics-total"
              >
                {data.totalConsults}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">With retail recs</span>
              <span
                className="text-xl font-semibold tabular-nums"
                data-testid="analytics-with-retail"
              >
                {data.consultsWithRetail}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Booked</span>
              <span
                className="text-xl font-semibold tabular-nums"
                data-testid="analytics-booked"
              >
                {data.consultsBooked}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Booked + retail</span>
              <span
                className="text-xl font-semibold tabular-nums"
                data-testid="analytics-booked-retail"
              >
                {data.bookedWithRetail}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Retail attach rate</span>
              <span
                className="text-xl font-semibold tabular-nums"
                data-testid="analytics-attach-rate"
              >
                {formatPercent(data.retailAttachRate)}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Avg retail margin</span>
              <span
                className="text-xl font-semibold tabular-nums"
                data-testid="analytics-avg-margin"
              >
                {formatMargin(data.avgRecommendedRetailMargin)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Token issue panel
// ---------------------------------------------------------------------------

function StyleConsultTokenPanel() {
  const api = useStyleConsultApi();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const widgetUrl = token
    ? `${window.location.origin}/embed-demo?type=style-consult&token=${token}`
    : null;

  async function handleIssue() {
    setLoading(true);
    try {
      const res = await api.issueToken();
      setToken(res.token);
      toast.success("Consult link ready — copy and share with your clients.");
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
    <Card data-testid="token-issue-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Link2 className="size-4" />
          Consult widget link
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Share this link with your clients so they can submit a style consult
          before their appointment. The link is valid for 180 days.
        </p>
        <Button
          size="sm"
          onClick={handleIssue}
          disabled={loading}
          data-testid="token-issue-btn"
          className="w-fit"
        >
          {loading ? "Generating…" : "Generate consult link"}
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
// Consult detail view
// ---------------------------------------------------------------------------

function StyleConsultDetailView({
  card,
  onBack,
}: {
  card: StyleConsultInboxCard;
  onBack: () => void;
}) {
  const api = useStyleConsultApi();

  const {
    data: detail,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<StyleConsultResponse>({
    queryKey: styleConsultDetailKey(card.consultId),
    queryFn: () => api.getConsult(card.consultId),
  });

  return (
    <div className="flex flex-col gap-6" data-testid="style-consult-detail-view">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          data-testid="style-consult-detail-back"
        >
          <ChevronLeft className="size-4" />
          Back to inbox
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h2
            className="text-lg font-medium"
            data-testid="style-consult-detail-title"
          >
            {card.styleCategory ?? "Style consult"}
          </h2>
          {card.contactPhone && (
            <span className="text-sm text-muted-foreground">
              {card.contactPhone}
            </span>
          )}
        </div>
        <Badge
          variant={statusBadgeVariant(card.status)}
          data-testid="style-consult-detail-status"
        >
          {labelFor(STYLE_CONSULT_STATUS_LABELS, card.status)}
        </Badge>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground" data-testid="style-consult-detail-loading">
          Loading consult details…
        </p>
      ) : isError ? (
        <div
          className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
          data-testid="style-consult-detail-error"
        >
          <p className="text-sm text-foreground">
            We couldn&apos;t load this consult.
            {error instanceof Error ? ` ${error.message}` : ""}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            data-testid="style-consult-detail-retry"
          >
            {isRefetching ? "Retrying…" : "Try again"}
          </Button>
        </div>
      ) : detail ? (
        <div className="flex flex-col gap-4">
          {/* Style assessment */}
          <Card data-testid="style-consult-assessment-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Sparkles className="size-4" />
                Style assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                {detail.styleCategory && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Style:</span>
                    <span data-testid="style-consult-category">{detail.styleCategory}</span>
                  </div>
                )}
                {detail.length && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Length:</span>
                    <span data-testid="style-consult-length">{detail.length}</span>
                  </div>
                )}
                {detail.texture && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Texture:</span>
                    <span data-testid="style-consult-texture">{detail.texture}</span>
                  </div>
                )}
                {detail.color && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Color:</span>
                    <span data-testid="style-consult-color">{detail.color}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Source:</span>
                  <span data-testid="style-consult-source">
                    {labelFor(STYLE_ATTRIBUTE_SOURCE_LABELS, detail.attributeSource)}
                  </span>
                </div>
                {detail.attributeSource === "VISION" && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Confidence:</span>
                    <span data-testid="style-consult-confidence">
                      {(detail.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Service recommendations */}
          <Card data-testid="style-consult-service-recs-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Scissors className="size-4" />
                Recommended services
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {/* Stylist-confirm guardrail note */}
              <div
                className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground"
                data-testid="stylist-confirm-note"
              >
                <Sparkles className="size-4 text-primary" />
                Your stylist will confirm all recommendations at the appointment.
              </div>
              {detail.serviceRecommendations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No service recommendations generated.
                </p>
              ) : (
                <div className="flex flex-col gap-2" data-testid="service-recs-list">
                  {detail.serviceRecommendations.map((svc) => (
                    <div
                      key={svc.serviceMenuItemId}
                      className="flex flex-col gap-1 rounded-md border bg-muted/30 p-3"
                      data-testid="service-rec-row"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-sm" data-testid="service-rec-name">
                          {svc.name}
                        </span>
                        {svc.price != null && (
                          <span
                            className="shrink-0 text-sm tabular-nums"
                            data-testid="service-rec-price"
                          >
                            {formatCurrency(svc.price)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground" data-testid="service-rec-rationale">
                        {svc.rationale}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Retail recommendations (margin-aware, highest margin first) */}
          <Card data-testid="style-consult-retail-recs-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <ShoppingBag className="size-4" />
                Retail recommendations
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  (highest margin first)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {detail.retailRecommendations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No retail recommendations generated.
                </p>
              ) : (
                <div className="flex flex-col gap-2" data-testid="retail-recs-list">
                  {detail.retailRecommendations.map((rec) => (
                    <RetailRecRow key={rec.productId} rec={rec} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Booking status */}
          {detail.status === "BOOKED" && detail.bookingId && (
            <div
              className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground"
              data-testid="style-consult-booking-status"
            >
              <Scissors className="size-4 text-primary" />
              Appointment booked — booking #{detail.bookingId.slice(0, 8)}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Consult inbox card (one item in the list)
// ---------------------------------------------------------------------------

function StyleConsultCard({
  card,
  onSelect,
}: {
  card: StyleConsultInboxCard;
  onSelect: (card: StyleConsultInboxCard) => void;
}) {
  return (
    <Card
      data-testid="style-consult-card"
      data-status={card.status}
      className="cursor-pointer transition-colors hover:border-primary/40"
      onClick={() => onSelect(card)}
    >
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Scissors className="size-4 text-muted-foreground" />
              <span data-testid="style-consult-card-category">
                {card.styleCategory ?? "Style consult"}
              </span>
            </CardTitle>
            {card.contactPhone && (
              <span
                className="text-xs text-muted-foreground"
                data-testid="style-consult-card-phone"
              >
                {card.contactPhone}
              </span>
            )}
          </div>

          <Badge
            variant={statusBadgeVariant(card.status)}
            data-testid="style-consult-card-status"
          >
            {labelFor(STYLE_CONSULT_STATUS_LABELS, card.status)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Scissors className="size-3.5 text-muted-foreground" />
            <span
              className="text-muted-foreground"
              data-testid="style-consult-card-service-count"
            >
              {card.serviceCount} service{card.serviceCount !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShoppingBag className="size-3.5 text-muted-foreground" />
            <span
              className="text-muted-foreground"
              data-testid="style-consult-card-retail-count"
            >
              {card.retailCount} retail item{card.retailCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">
          Submitted {new Date(card.createdAt).toLocaleString()}
        </span>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main style-consult inbox (list + detail + analytics + token)
// ---------------------------------------------------------------------------

/**
 * Salon T9 "StyleConsult AI" — the staff consult inbox:
 *
 * 1. Status-filtered inbox list: all prospect style-consult submissions, with
 *    the style category, service count, retail count, and booking status.
 *    Filter tabs narrow by StyleConsultStatus (All / New / Booked).
 *
 * 2. Detail view: on card click, shows the full StyleConsultResponse —
 *    the vision / manual style assessment (category / length / texture / color /
 *    source + confidence), the recommended services + the "stylist will confirm"
 *    guardrail, and the margin-ranked retail recommendations (highest margin
 *    first, each with its margin delta badge).
 *
 * 3. Retail-attach analytics panel: funnel counters (total → retail recs →
 *    booked → booked+retail) + the retail-attach rate + avg recommended margin.
 *
 * 4. Token-issue panel: admin-gated "Generate consult link" that POSTs
 *    /styleconsult/tokens and surfaces the copyable widget URL.
 *
 * Rendered behind RequireNotContractor grouped with the other ChairFill
 * surfaces (the T8 QuoteInbox / T6 ReviewBoostBoard precedent).
 */
export function StyleConsultInbox() {
  const api = useStyleConsultApi();
  const [statusFilter, setStatusFilter] = useState<StyleConsultStatus | undefined>(
    undefined,
  );
  const [selectedCard, setSelectedCard] = useState<StyleConsultInboxCard | null>(
    null,
  );

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<StyleConsultInboxCard[]>({
    queryKey: [...STYLE_CONSULT_INBOX_KEY, statusFilter ?? "ALL"],
    queryFn: () => api.listConsults(statusFilter),
  });

  // If a card is selected, show the detail view.
  if (selectedCard) {
    return (
      <section
        className="flex flex-col gap-6"
        data-testid="style-consult-inbox-page"
      >
        <StyleConsultDetailView
          card={selectedCard}
          onBack={() => setSelectedCard(null)}
        />
      </section>
    );
  }

  return (
    <section
      className="flex flex-col gap-8"
      data-testid="style-consult-inbox-page"
    >
      {/* Header */}
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-medium">
          <Scissors className="size-6 text-muted-foreground" />
          Style consults
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Prospect style-consult submissions — AI-read attributes, recommended
          services, and margin-ranked retail products. Your stylist confirms
          everything at the appointment.
        </p>
      </header>

      {/* Retail-attach analytics */}
      <StyleConsultAnalyticsCard />

      {/* Consult widget token issue */}
      <StyleConsultTokenPanel />

      {/* Status filter tabs */}
      <div
        className="flex flex-wrap gap-2"
        data-testid="style-consult-inbox-filters"
      >
        {STATUS_FILTERS.map(({ label, value }) => (
          <button
            key={label}
            type="button"
            onClick={() => setStatusFilter(value)}
            data-testid={`style-consult-filter-${label.toLowerCase()}`}
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
          data-testid="style-consult-inbox-loading"
        >
          Loading consults…
        </p>
      ) : isError ? (
        <div
          className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
          data-testid="style-consult-inbox-error"
        >
          <p className="text-sm text-foreground">
            We couldn&apos;t load the consult inbox.
            {error instanceof Error ? ` ${error.message}` : ""}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            data-testid="style-consult-inbox-retry"
          >
            {isRefetching ? "Retrying…" : "Try again"}
          </Button>
        </div>
      ) : !data || data.length === 0 ? (
        <div
          className="rounded-md border border-dashed p-8 text-center"
          data-testid="style-consult-inbox-empty"
        >
          <AlertTriangle className="mx-auto mb-2 size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {statusFilter
              ? `No ${labelFor(STYLE_CONSULT_STATUS_LABELS, statusFilter).toLowerCase()} consults yet.`
              : "No style consults yet — new prospect submissions will appear here."}
          </p>
        </div>
      ) : (
        <div
          className="flex flex-col gap-4"
          data-testid="style-consult-inbox-list"
        >
          {data.map((card) => (
            <StyleConsultCard
              key={card.consultId}
              card={card}
              onSelect={setSelectedCard}
            />
          ))}
        </div>
      )}
    </section>
  );
}
