import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, Link } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, Pause, Play, XCircle, Zap } from "lucide-react";

import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../primitives/card";
import { useRecurringInvoicesApi } from "../../hooks/useRecurringInvoicesApi";
import type { RecurringInvoiceStatus } from "../../types/api";
import {
  RECURRING_INVOICE_STATUS_LABELS,
  PAYMENT_TERMS_LABELS,
  labelFor,
} from "../labels";

const STATUS_VARIANT: Record<RecurringInvoiceStatus, "default" | "muted" | "outline"> = {
  ACTIVE: "default",
  PAUSED: "muted",
  ENDED: "outline",
};

export function RecurringInvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const api = useRecurringInvoicesApi();

  const { data: ri, isLoading } = useQuery({
    queryKey: ["recurring-invoices", id],
    queryFn: () => api.getRecurringInvoice(id!),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.setRecurringInvoiceStatus(id!, status),
    onSuccess: (updated) => {
      qc.setQueryData(["recurring-invoices", id], updated);
      qc.invalidateQueries({ queryKey: ["recurring-invoices"] });
      toast.success("Status updated.");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Status change failed.");
    },
  });

  const spawnMutation = useMutation({
    mutationFn: () => api.spawnNow(id!),
    onSuccess: (updated) => {
      qc.setQueryData(["recurring-invoices", id], updated);
      qc.invalidateQueries({ queryKey: ["recurring-invoices"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice spawned. Check the Invoices list.");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Spawn failed.");
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!ri) return <p className="text-muted-foreground">Recurring invoice not found.</p>;

  const status = (ri.status ?? "ACTIVE") as RecurringInvoiceStatus;
  const isEnded = status === "ENDED";
  const canPause = status === "ACTIVE";
  const canResume = status === "PAUSED";
  const canEnd = status === "ACTIVE" || status === "PAUSED";

  return (
    <section className="flex flex-col gap-4" data-testid="recurring-invoice-detail">
      <header className="flex items-center gap-3 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/recurring-invoices")}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-medium">
          {ri.templateName ?? ri.id?.slice(0, 8) ?? "Recurring invoice"}
        </h1>
        <Badge
          variant={STATUS_VARIANT[status] ?? "muted"}
          data-testid="recurring-status"
        >
          {labelFor(RECURRING_INVOICE_STATUS_LABELS, status, status)}
        </Badge>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {ri.rrule && (
            <div>
              <span className="text-muted-foreground">Cadence (RRULE):</span>{" "}
              <code className="rounded bg-muted px-1 font-mono text-xs">{ri.rrule}</code>
            </div>
          )}
          {ri.nextRunAt && (
            <div>
              <span className="text-muted-foreground">Next run:</span>{" "}
              <span data-testid="recurring-next-run">{ri.nextRunAt.slice(0, 10)}</span>
            </div>
          )}
          {ri.lastRunAt && (
            <div>
              <span className="text-muted-foreground">Last run:</span>{" "}
              {ri.lastRunAt.slice(0, 10)}
            </div>
          )}
          {ri.seedAt && (
            <div>
              <span className="text-muted-foreground">Start date:</span>{" "}
              {ri.seedAt.slice(0, 10)}
            </div>
          )}
          {ri.endAt && (
            <div>
              <span className="text-muted-foreground">End date:</span>{" "}
              {ri.endAt.slice(0, 10)}
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Currency:</span>{" "}
            {ri.currency ?? "USD"}
          </div>
          {ri.paymentTerms && (
            <div>
              <span className="text-muted-foreground">Payment terms:</span>{" "}
              {labelFor(PAYMENT_TERMS_LABELS, ri.paymentTerms)}
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Auto-finalize:</span>{" "}
            {ri.autoFinalize ? "Yes — spawned invoices are sent automatically" : "No — spawned invoices are drafts"}
          </div>
          {ri.occurrenceCount !== undefined && (
            <div>
              <span className="text-muted-foreground">Occurrences so far:</span>{" "}
              {ri.occurrenceCount}
            </div>
          )}
          {ri.lastSpawnedInvoiceId && (
            <div>
              <span className="text-muted-foreground">Last spawned invoice:</span>{" "}
              <Link
                to={`/invoices/${ri.lastSpawnedInvoiceId}`}
                className="text-primary underline-offset-2 hover:underline"
              >
                View invoice
              </Link>
            </div>
          )}
          {ri.contactId && (
            <div>
              <span className="text-muted-foreground">Contact:</span> {ri.contactId}
            </div>
          )}
          {ri.companyId && (
            <div>
              <span className="text-muted-foreground">Company:</span> {ri.companyId}
            </div>
          )}
        </CardContent>
      </Card>

      {(ri.lineItems ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Line items</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm" data-testid="recurring-line-items">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-1">Description</th>
                  <th className="py-1 text-right">Qty</th>
                  <th className="py-1 text-right">Unit price</th>
                  <th className="py-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {(ri.lineItems ?? []).map((item, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="py-1">{item.description ?? "—"}</td>
                    <td className="py-1 text-right">{item.quantity ?? 0}</td>
                    <td className="py-1 text-right">
                      {(item.unitPrice ?? 0).toFixed(2)}
                    </td>
                    <td className="py-1 text-right">
                      {(item.lineTotal ?? 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {!isEnded && (
        <div className="flex gap-2 flex-wrap">
          {canPause && (
            <Button
              variant="outline"
              onClick={() => statusMutation.mutate("PAUSED")}
              disabled={statusMutation.isPending}
              data-testid="recurring-pause-btn"
            >
              <Pause className="size-4" /> Pause
            </Button>
          )}
          {canResume && (
            <Button
              onClick={() => statusMutation.mutate("ACTIVE")}
              disabled={statusMutation.isPending}
              data-testid="recurring-resume-btn"
            >
              <Play className="size-4" /> Resume
            </Button>
          )}
          {canEnd && (
            <Button
              variant="outline"
              onClick={() => statusMutation.mutate("ENDED")}
              disabled={statusMutation.isPending}
              data-testid="recurring-end-btn"
            >
              <XCircle className="size-4" /> End
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => spawnMutation.mutate()}
            disabled={spawnMutation.isPending}
            data-testid="recurring-spawn-now-btn"
          >
            <Zap className="size-4" /> Spawn invoice now
          </Button>
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="ghost" asChild>
          <Link to="/recurring-invoices">All recurring invoices</Link>
        </Button>
      </div>
    </section>
  );
}
