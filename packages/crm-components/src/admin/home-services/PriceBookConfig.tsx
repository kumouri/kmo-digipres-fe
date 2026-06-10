import { useEffect, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  BookOpen,
  CheckCircle2,
  Copy,
  ExternalLink,
  Link2,
  Plus,
  Settings2,
  Trash2,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../primitives/card";
import { useQuotingApi } from "../../hooks/useQuotingApi";
import type { PriceBook, PriceBookLineItem, JobKind } from "../../api/quoting";
import { ApiError } from "../../api/client";

// ---------------------------------------------------------------------------
// Query key
// ---------------------------------------------------------------------------

export const PRICE_BOOK_KEY = ["quoting", "price-book"] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyLineItem(): PriceBookLineItem {
  return {
    equipmentType: "",
    jobKind: "REPAIR",
    low: 0,
    high: 0,
    typicalLifespanYears: null,
    agePerYearPct: 0,
    ageMaxPct: 0,
    severeFailurePct: 0,
    severeFailureKeywords: null,
  };
}

/** Format as $X or $X – $Y */
function fmtRange(low: number, high: number, currency = "USD"): string {
  const fmt = (n: number) =>
    n.toLocaleString("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    });
  return low === high ? fmt(low) : `${fmt(low)} – ${fmt(high)}`;
}

// ---------------------------------------------------------------------------
// Token issue + widget URL panel
// ---------------------------------------------------------------------------

/**
 * "Copy homeowner widget link" — issues a POST /quoting/tokens and surfaces the
 * resulting widget URL for staff to share or embed as a QR code.
 *
 * The widget URL is the public intake embed:
 *   <base>/embed-demo?type=quote-intake&token=<token>
 * Staff paste it into yard signs, truck wraps, or email blasts.
 */
function TokenIssuePanel() {
  const api = useQuotingApi();
  const [token, setToken] = useState<string | null>(null);

  const baseUrl = window.location.origin;
  const widgetUrl = token
    ? `${baseUrl}/embed-demo?type=quote-intake&token=${encodeURIComponent(token)}`
    : null;

  const { mutate: issue, isPending: issuing } = useMutation({
    mutationFn: () => api.issueQuoteToken(),
    onSuccess: (result) => {
      setToken(result.token);
      toast.success("Widget link ready — copy it below and share with homeowners.");
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        toast.error(`Couldn't issue a link (${err.status}). Try again.`);
      } else {
        toast.error("Couldn't issue a widget link. Please try again.");
      }
    },
  });

  const copyUrl = async () => {
    if (!widgetUrl) return;
    try {
      await navigator.clipboard.writeText(widgetUrl);
      toast.success("Link copied to clipboard.");
    } catch {
      toast.error("Couldn't copy — select and copy the link manually.");
    }
  };

  return (
    <Card data-testid="token-issue-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="size-4 text-muted-foreground" />
          Homeowner quote link
        </CardTitle>
        <CardDescription>
          Generate a link (or QR code) homeowners use to submit a quote request
          from your website, truck wrap, or yard sign. Each link is tied to your
          account and valid for 180 days.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => issue()}
          disabled={issuing}
          data-testid="token-issue-btn"
        >
          <ExternalLink className="size-4" />
          {issuing ? "Generating…" : "Generate quote link"}
        </Button>

        {widgetUrl && (
          <div
            className="flex flex-col gap-2"
            data-testid="token-result-section"
          >
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
              <span
                className="min-w-0 flex-1 truncate font-mono text-xs"
                data-testid="token-widget-url"
              >
                {widgetUrl}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={copyUrl}
                data-testid="token-copy-btn"
              >
                <Copy className="size-4" />
                Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this link with homeowners. The link expires in 180 days —
              generate a fresh one at any time.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Price book line-item editor (inline row)
// ---------------------------------------------------------------------------

function LineItemRow({
  item,
  index,
  onChange,
  onRemove,
}: {
  item: PriceBookLineItem;
  index: number;
  onChange: (i: number, updated: PriceBookLineItem) => void;
  onRemove: (i: number) => void;
}) {
  function set<K extends keyof PriceBookLineItem>(
    key: K,
    value: PriceBookLineItem[K],
  ) {
    onChange(index, { ...item, [key]: value });
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-md border p-4"
      data-testid="price-book-line-item"
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-1 flex-col gap-1 min-w-[140px]">
          <label className="text-xs font-medium text-muted-foreground">
            Equipment type
          </label>
          <input
            type="text"
            value={item.equipmentType}
            onChange={(e) => set("equipmentType", e.target.value)}
            placeholder="condenser, furnace, water heater…"
            className="rounded-md border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="line-item-equipment-type"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">
            Job kind
          </label>
          <select
            value={item.jobKind}
            onChange={(e) => set("jobKind", e.target.value as JobKind)}
            className="rounded-md border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="line-item-job-kind"
          >
            <option value="REPAIR">Repair</option>
            <option value="REPLACE">Replace</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">
            Low ($)
          </label>
          <input
            type="number"
            min={0}
            value={item.low}
            onChange={(e) => set("low", Number(e.target.value))}
            className="w-24 rounded-md border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="line-item-low"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">
            High ($)
          </label>
          <input
            type="number"
            min={0}
            value={item.high}
            onChange={(e) => set("high", Number(e.target.value))}
            className="w-24 rounded-md border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="line-item-high"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">
            Lifespan (yrs)
          </label>
          <input
            type="number"
            min={0}
            value={item.typicalLifespanYears ?? ""}
            placeholder="—"
            onChange={(e) =>
              set(
                "typicalLifespanYears",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
            className="w-20 rounded-md border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="line-item-lifespan"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(index)}
          data-testid="line-item-remove"
          aria-label="Remove line item"
        >
          <Trash2 className="size-4 text-muted-foreground" />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs font-mono">
          {fmtRange(item.low, item.high)}
        </Badge>
        {item.jobKind === "REPAIR" ? (
          <Badge variant="secondary" className="text-xs">
            Repair
          </Badge>
        ) : (
          <Badge variant="default" className="text-xs">
            Replace
          </Badge>
        )}
        {item.typicalLifespanYears && (
          <span className="text-xs text-muted-foreground">
            {item.typicalLifespanYears} yr lifespan
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Price book editor card
// ---------------------------------------------------------------------------

function PriceBookEditor({
  initial,
  onSaved,
}: {
  initial: PriceBook | null;
  onSaved: () => void;
}) {
  const api = useQuotingApi();
  const queryClient = useQueryClient();

  const emptyBook: PriceBook = {
    id: null,
    tenantId: null,
    name: null,
    currency: "USD",
    lineItems: [],
    diagnosticVisitLow: 89,
    diagnosticVisitHigh: 149,
    version: null,
    createdAt: null,
    updatedAt: null,
  };

  const [book, setBook] = useState<PriceBook>(initial ?? emptyBook);
  const [isDirty, setIsDirty] = useState(false);

  // Sync if the server data arrives after mount
  useEffect(() => {
    if (initial) {
      setBook(initial);
      setIsDirty(false);
    }
  }, [initial]);

  function updateBook(patch: Partial<PriceBook>) {
    setBook((prev) => ({ ...prev, ...patch }));
    setIsDirty(true);
  }

  function addLine() {
    setBook((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, emptyLineItem()],
    }));
    setIsDirty(true);
  }

  function updateLine(i: number, updated: PriceBookLineItem) {
    setBook((prev) => {
      const items = prev.lineItems.map((l, idx) => (idx === i ? updated : l));
      return { ...prev, lineItems: items };
    });
    setIsDirty(true);
  }

  function removeLine(i: number) {
    setBook((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, idx) => idx !== i),
    }));
    setIsDirty(true);
  }

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => api.savePriceBook(book),
    onSuccess: (saved) => {
      toast.success("Price book saved.");
      setBook(saved);
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: PRICE_BOOK_KEY });
      onSaved();
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 400) {
        toast.error("Couldn't save — check the line items and try again.");
      } else {
        toast.error("Couldn't save the price book. Please try again.");
      }
    },
  });

  return (
    <Card data-testid="price-book-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings2 className="size-4 text-muted-foreground" />
          Price book
        </CardTitle>
        <CardDescription>
          The calibrated price ranges the instant-quote engine draws from. Keep
          these current — the quoted range is only as accurate as this book.
          Paired with the mandatory "estimate" disclaimer, accurate bands are
          what make instant quoting safe.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="flex flex-col gap-6"
          data-testid="price-book-form"
        >
          {/* Book name */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="book-name"
              className="flex items-center gap-1.5 text-sm font-medium"
            >
              <BookOpen className="size-4 text-muted-foreground" />
              Book name (optional)
            </label>
            <input
              id="book-name"
              type="text"
              value={book.name ?? ""}
              onChange={(e) =>
                updateBook({ name: e.target.value || null })
              }
              placeholder="Comfort Air HVAC — 2026 price book"
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-testid="price-book-name"
            />
          </div>

          {/* Diagnostic visit fee */}
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <Wrench className="size-4 text-muted-foreground" />
              Diagnostic visit fee (fallback)
            </span>
            <p className="text-xs text-muted-foreground">
              Used when no equipment type matches — so a quote is always
              produced, never a blank response.
            </p>
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Low ($)</label>
                <input
                  type="number"
                  min={0}
                  value={book.diagnosticVisitLow}
                  onChange={(e) =>
                    updateBook({ diagnosticVisitLow: Number(e.target.value) })
                  }
                  className="w-24 rounded-md border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  data-testid="diag-visit-low"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">High ($)</label>
                <input
                  type="number"
                  min={0}
                  value={book.diagnosticVisitHigh}
                  onChange={(e) =>
                    updateBook({ diagnosticVisitHigh: Number(e.target.value) })
                  }
                  className="w-24 rounded-md border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  data-testid="diag-visit-high"
                />
              </div>
              <div className="self-end pb-1">
                <Badge variant="outline" className="text-xs font-mono">
                  {fmtRange(book.diagnosticVisitLow, book.diagnosticVisitHigh)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">Equipment lines</span>
              {book.lineItems.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {book.lineItems.length} line
                  {book.lineItems.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {book.lineItems.length === 0 ? (
              <div
                className="rounded-md border border-dashed p-6 text-center"
                data-testid="price-book-empty-lines"
              >
                <p className="text-sm text-muted-foreground">
                  No lines yet. Add an equipment type to get started — for
                  example: condenser (Repair) $400–$800 and condenser (Replace)
                  $3,500–$6,000.
                </p>
              </div>
            ) : (
              <div
                className="flex flex-col gap-3"
                data-testid="price-book-lines"
              >
                {book.lineItems.map((item, i) => (
                  <LineItemRow
                    key={i}
                    item={item}
                    index={i}
                    onChange={updateLine}
                    onRemove={removeLine}
                  />
                ))}
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLine}
              data-testid="price-book-add-line"
            >
              <Plus className="size-4" />
              Add line item
            </Button>
          </div>

          {/* Save */}
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={saving || !isDirty}
              data-testid="price-book-save-btn"
            >
              <CheckCircle2 className="size-4" />
              {saving ? "Saving…" : "Save price book"}
            </Button>
            {!isDirty && !saving && initial !== null && (
              <span
                className="text-xs text-muted-foreground"
                data-testid="price-book-saved-note"
              >
                Price book is up to date.
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main export — price book config + token issue
// ---------------------------------------------------------------------------

/**
 * Home Services T8 "QuoteNow" — the admin config surface:
 *
 * 1. Price book config card — view and edit the per-tenant price book (line items
 *    with equipment type × repair/replace bands, diagnostic visit fee fallback).
 *    GET /quoting/price-book; PUT /quoting/price-book. 4431/404 renders a
 *    friendly empty state so the admin can do initial setup.
 *
 * 2. Homeowner widget link — issue a POST /quoting/tokens and surface the
 *    resulting widget URL/token for staff to share or embed as a QR code.
 *
 * Rendered behind RequireNotContractor grouped with the other Home Services
 * surfaces (the T5 CallbackQueue / T4 SwitchboardPanel precedent). The BE
 * endpoints are ADMIN-gated (RoleGuard.requireRole("ADMIN"), 1800).
 */
export function PriceBookConfig() {
  const api = useQuotingApi();

  const {
    data: priceBook,
    isLoading,
    isError,
    error: pbError,
    refetch,
    isRefetching,
  } = useQuery<PriceBook | null>({
    queryKey: PRICE_BOOK_KEY,
    queryFn: async () => {
      try {
        return await api.getPriceBook();
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          return null; // 4431 — not configured yet
        }
        throw err;
      }
    },
  });

  return (
    <section
      className="flex flex-col gap-8"
      data-testid="price-book-config-page"
    >
      {/* Header */}
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-medium">
          <Settings2 className="size-6 text-muted-foreground" />
          QuoteNow settings
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Configure the price book the instant-quote engine uses, and generate
          the homeowner intake link to embed on your website or print on
          marketing materials.
        </p>
      </header>

      {/* Price book */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Price book
        </h2>
        {isLoading ? (
          <p
            className="text-sm text-muted-foreground"
            data-testid="price-book-loading"
          >
            Loading price book…
          </p>
        ) : isError &&
          !(pbError instanceof ApiError && pbError.status === 404) ? (
          <div
            className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
            data-testid="price-book-error"
          >
            <p className="text-sm text-foreground">
              We couldn&apos;t load the price book.
              {pbError instanceof Error ? ` ${pbError.message}` : ""}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              data-testid="price-book-retry"
            >
              {isRefetching ? "Retrying…" : "Try again"}
            </Button>
          </div>
        ) : (
          <>
            {priceBook === null && (
              <div
                className="rounded-md border border-dashed p-4 text-sm text-muted-foreground"
                data-testid="price-book-empty-state"
              >
                No price book yet. Fill in the form below to set your first
                equipment ranges — the engine needs at least a diagnostic visit
                fee to produce any quote.
              </div>
            )}
            <PriceBookEditor
              initial={priceBook ?? null}
              onSaved={() => {
                /* mutation handles invalidation */
              }}
            />
          </>
        )}
      </div>

      {/* Token / widget link */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Homeowner intake link
        </h2>
        <TokenIssuePanel />
      </div>
    </section>
  );
}
