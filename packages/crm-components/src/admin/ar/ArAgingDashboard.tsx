import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  DollarSign,
} from "lucide-react";

import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../primitives/card";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "../../primitives/dialog";
import { Input } from "../../primitives/input";
import { Label } from "../../primitives/label";
import { Textarea } from "../../primitives/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../primitives/select";
import { useArApi } from "../../hooks/useArApi";
import { useInvoicesApi } from "../../hooks/useInvoicesApi";
import type { ArAgingBucket, ArAgingBucketLabel, PromiseToPay } from "../../api/ar";
import {
  AR_AGING_BUCKET_LABELS,
  PROMISE_TO_PAY_STATUS_LABELS,
  labelFor,
} from "../labels";
import { ApiError } from "../../api/client";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const AGING_REPORT_KEY = ["ar", "aging"] as const;
const promisesKey = (invoiceId: string) =>
  ["ar", "promises", invoiceId] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** The CURRENT bucket is included in the report but is not "past due". */
const PAST_DUE_BUCKETS: ArAgingBucketLabel[] = [
  "D1_7",
  "D8_14",
  "D15_30",
  "D30_PLUS",
];

function isPastDue(label: ArAgingBucketLabel): boolean {
  return PAST_DUE_BUCKETS.includes(label);
}

/** Badge weight: buckets further past-due show increasingly loud colours. */
function bucketBadgeVariant(
  label: ArAgingBucketLabel,
): "destructive" | "default" | "secondary" | "muted" {
  switch (label) {
    case "D30_PLUS":
      return "destructive";
    case "D15_30":
      return "default";
    case "D8_14":
      return "secondary";
    case "D1_7":
      return "secondary";
    default:
      return "muted";
  }
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// KPI card — one per aging bucket
// ---------------------------------------------------------------------------

function AgingBucketCard({
  bucket,
  currency,
}: {
  bucket: ArAgingBucket;
  currency: string;
}) {
  const pastDue = isPastDue(bucket.label);
  const variant = bucketBadgeVariant(bucket.label);

  return (
    <Card
      data-testid="ar-aging-bucket-card"
      data-bucket={bucket.label}
      className={
        pastDue && bucket.totalBalance > 0
          ? "border-destructive/30"
          : undefined
      }
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {labelFor(AR_AGING_BUCKET_LABELS, bucket.label)}
          </CardTitle>
          {bucket.count > 0 ? (
            <Badge variant={variant} data-testid="ar-bucket-count-badge">
              {bucket.count} {bucket.count === 1 ? "invoice" : "invoices"}
            </Badge>
          ) : (
            <Badge variant="muted" data-testid="ar-bucket-count-badge">
              None
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p
          className="text-2xl font-semibold tabular-nums"
          data-testid="ar-bucket-total"
        >
          {formatCurrency(bucket.totalBalance, currency)}
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Promise list — the promises on file for the selected invoice
// ---------------------------------------------------------------------------

function PromiseStatusBadge({ status }: { status: string }) {
  const variant =
    status === "KEPT"
      ? "default"
      : status === "BROKEN"
        ? "destructive"
        : status === "CANCELLED"
          ? "muted"
          : "secondary"; // ACTIVE
  return (
    <Badge variant={variant} data-testid="promise-status-badge">
      {labelFor(PROMISE_TO_PAY_STATUS_LABELS, status)}
    </Badge>
  );
}

function PromiseRow({ promise }: { promise: PromiseToPay }) {
  return (
    <Card data-testid="promise-row">
      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium" data-testid="promise-date">
            <CalendarClock className="mr-1 inline size-3.5 text-muted-foreground" />
            Pay by {promise.promisedDate}
          </p>
          {promise.promisedAmount != null ? (
            <p className="text-xs text-muted-foreground" data-testid="promise-amount">
              Amount: {promise.promisedAmount.toLocaleString()}
            </p>
          ) : null}
          {promise.note?.trim() ? (
            <p
              className="text-xs italic text-muted-foreground"
              data-testid="promise-note"
            >
              "{promise.note}"
            </p>
          ) : null}
        </div>
        <PromiseStatusBadge status={promise.status} />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Record-promise dialog
// ---------------------------------------------------------------------------

interface RecordPromiseDialogProps {
  /** Pre-selected invoice ID (from the invoice picker). */
  invoiceId: string;
  onSuccess: () => void;
}

function RecordPromiseDialog({
  invoiceId,
  onSuccess,
}: RecordPromiseDialogProps) {
  const [open, setOpen] = useState(false);
  const [promisedDate, setPromisedDate] = useState("");
  const [promisedAmount, setPromisedAmount] = useState("");
  const [note, setNote] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const api = useArApi();
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      api.recordPromiseToPay({
        invoiceId,
        promisedDate,
        promisedAmount: promisedAmount ? parseFloat(promisedAmount) : undefined,
        note: note.trim() || undefined,
      }),
    onSuccess: (created) => {
      // Optimistically update the promises list for this invoice.
      queryClient.setQueryData(
        promisesKey(invoiceId),
        (old: PromiseToPay[] | undefined) => [created, ...(old ?? [])],
      );
      setOpen(false);
      setPromisedDate("");
      setPromisedAmount("");
      setNote("");
      setFieldError(null);
      onSuccess();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        // 4601: invoice not found; 4602: invalid date/amount
        if (err.status === 404) {
          setFieldError("That invoice couldn't be found. Double-check the ID.");
        } else if (err.status === 400) {
          setFieldError(
            "The date or amount looks off — check the format and try again.",
          );
        } else {
          setFieldError(`Something went wrong (${err.status}).`);
        }
      } else {
        setFieldError("Couldn't record the promise — please try again.");
      }
    },
  });

  const canSubmit =
    !!invoiceId.trim() && !!promisedDate && !isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          size="sm"
          data-testid="promise-dialog-open"
        >
          <CheckCircle2 className="size-4" />
          Record a promise to pay
        </Button>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-[420px]"
        data-testid="promise-dialog"
      >
        <DialogTitle>Record a promise to pay</DialogTitle>
        <p className="text-sm text-muted-foreground">
          Log a customer's commitment to pay an invoice on a specific date.
          You can add an amount and a note for context.
        </p>

        <div className="mt-2 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="promise-invoice-id-display">Invoice</Label>
            <Input
              id="promise-invoice-id-display"
              value={invoiceId}
              readOnly
              className="bg-muted"
              data-testid="promise-invoice-id"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="promise-date">
              Pay-by date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="promise-date"
              type="date"
              value={promisedDate}
              onChange={(e) => setPromisedDate(e.target.value)}
              data-testid="promise-date-input"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="promise-amount">Amount (optional)</Label>
            <Input
              id="promise-amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="Leave blank to match the full invoice"
              value={promisedAmount}
              onChange={(e) => setPromisedAmount(e.target.value)}
              data-testid="promise-amount-input"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="promise-note">Note (optional)</Label>
            <Textarea
              id="promise-note"
              placeholder={'E.g. “Called 2026-06-09, customer will pay Friday.”'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              data-testid="promise-note-input"
            />
          </div>

          {fieldError ? (
            <p
              className="text-sm text-destructive"
              data-testid="promise-field-error"
            >
              {fieldError}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setOpen(false);
                setFieldError(null);
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => mutate()}
              disabled={!canSubmit}
              data-testid="promise-submit"
            >
              {isPending ? "Saving…" : "Save promise"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function ArAgingDashboard() {
  const api = useArApi();
  const invoicesApi = useInvoicesApi();

  // Invoices list for the invoice picker.
  const { data: invoicesList } = useQuery({
    queryKey: ["invoices"],
    queryFn: invoicesApi.listInvoices,
  });

  // Selected invoice ID (for the promise panel + dialog).
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");

  // AR-aging report — the headline.
  const {
    data: report,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: AGING_REPORT_KEY,
    queryFn: () => api.getAgingReport(),
  });

  // Promises for the selected invoice.
  const { data: promises, isLoading: promisesLoading } = useQuery({
    queryKey: promisesKey(selectedInvoiceId),
    queryFn: () => api.listPromises(selectedInvoiceId),
    enabled: !!selectedInvoiceId,
  });

  const currency = report?.primaryCurrency ?? "USD";

  // Past-due invoices from the invoice list for the selector.
  const pastDueInvoices = (invoicesList ?? []).filter(
    (inv) => inv.status === "OVERDUE" || inv.status === "SENT",
  );

  return (
    <section className="flex flex-col gap-6" data-testid="ar-aging-page">
      {/* Header */}
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2 text-2xl font-medium">
            <DollarSign className="size-6 text-muted-foreground" />
            AR aging
          </h1>
          <p className="text-sm text-muted-foreground">
            Here's what's owed and how long it's been outstanding. The buckets
            show you exactly where your cash is sitting.
          </p>
        </div>
        {report && report.grandTotalPastDue > 0 ? (
          <Badge variant="destructive" data-testid="ar-grand-total-badge">
            <AlertCircle className="size-3" />
            {formatCurrency(report.grandTotalPastDue, currency)} past due
          </Badge>
        ) : null}
      </header>

      {/* Aging buckets */}
      {isLoading ? (
        <p
          className="text-sm text-muted-foreground"
          data-testid="ar-aging-loading"
        >
          Loading…
        </p>
      ) : isError ? (
        <div
          className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
          data-testid="ar-aging-error"
        >
          <p className="text-sm text-foreground">
            Couldn't load the aging report.
            {error instanceof Error ? ` ${error.message}` : ""}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            data-testid="ar-aging-retry"
          >
            {isRefetching ? "Retrying…" : "Try again"}
          </Button>
        </div>
      ) : report ? (
        <div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
          data-testid="ar-aging-buckets"
        >
          {report.buckets.map((bucket) => (
            <AgingBucketCard
              key={bucket.label}
              bucket={bucket}
              currency={currency}
            />
          ))}
        </div>
      ) : null}

      {/* Promise-to-pay section */}
      <div className="flex flex-col gap-4" data-testid="ar-promises-section">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Promises to pay
            </h2>
          </div>
          {selectedInvoiceId ? (
            <RecordPromiseDialog
              invoiceId={selectedInvoiceId}
              onSuccess={() => {/* query already invalidated via setQueryData */}}
            />
          ) : null}
        </div>

        {/* Invoice selector */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ar-invoice-selector" className="text-sm">
            Select an invoice to view or record promises
          </Label>
          {pastDueInvoices.length > 0 ? (
            <Select
              value={selectedInvoiceId}
              onValueChange={setSelectedInvoiceId}
            >
              <SelectTrigger
                id="ar-invoice-selector"
                className="max-w-sm"
                data-testid="ar-invoice-select"
              >
                <SelectValue placeholder="Choose an invoice…" />
              </SelectTrigger>
              <SelectContent>
                {pastDueInvoices.map((inv) => (
                  <SelectItem
                    key={inv.id}
                    value={inv.id ?? ""}
                    data-testid="ar-invoice-option"
                  >
                    {inv.invoiceNumber
                      ? `#${inv.invoiceNumber}`
                      : inv.id?.slice(0, 8)}{" "}
                    {inv.total != null
                      ? `· ${formatCurrency(inv.total, currency)}`
                      : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            // Fallback: plain text input (no invoices returned, or list still loading)
            <Input
              id="ar-invoice-selector"
              placeholder="Invoice ID"
              value={selectedInvoiceId}
              onChange={(e) => setSelectedInvoiceId(e.target.value)}
              className="max-w-sm"
              data-testid="ar-invoice-id-input"
            />
          )}
        </div>

        {/* Promises list */}
        {selectedInvoiceId ? (
          promisesLoading ? (
            <p
              className="text-sm text-muted-foreground"
              data-testid="promises-loading"
            >
              Loading promises…
            </p>
          ) : !promises || promises.length === 0 ? (
            <div
              className="rounded-md border border-dashed p-6 text-center"
              data-testid="promises-empty"
            >
              <p className="text-sm text-muted-foreground">
                No promises on file for this invoice yet. Use the button above
                to record one.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2" data-testid="promises-list">
              {promises.map((p) => (
                <PromiseRow key={p.id} promise={p} />
              ))}
            </div>
          )
        ) : (
          <div
            className="rounded-md border border-dashed p-6 text-center"
            data-testid="promises-no-selection"
          >
            <p className="text-sm text-muted-foreground">
              Pick an invoice above to see its promises to pay.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
