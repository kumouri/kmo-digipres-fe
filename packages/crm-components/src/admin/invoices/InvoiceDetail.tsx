import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, Link } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, Link2 } from "lucide-react";

import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../primitives/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../primitives/dialog";
import { useInvoicesApi } from "../../hooks/useInvoicesApi";
import type { CheckoutResult, InvoiceStatus, Payment } from "../../types/api";
import { INVOICE_STATUS_LABELS, humanize, labelFor } from "../labels";

const VALID_TRANSITIONS: Record<string, InvoiceStatus[]> = {
  DRAFT: ["SENT"],
  SENT: ["VOIDED"],
  PARTIALLY_PAID: ["VOIDED"],
  PAID: [],
  VOIDED: [],
  OVERDUE: ["VOIDED"],
};

export function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const invoicesApi = useInvoicesApi();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoices", id],
    queryFn: () => invoicesApi.getInvoice(id!),
    enabled: !!id,
  });

  const { data: payments } = useQuery({
    queryKey: ["invoices", id, "payments"],
    queryFn: () => invoicesApi.listPayments(id!),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (target: string) => invoicesApi.changeInvoiceStatus(id!, target),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices", id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice status updated.");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Status change failed.");
    },
  });

  const stripeMutation = useMutation({
    mutationFn: () => invoicesApi.createStripeCheckout(id!),
    onSuccess: (result) => {
      setCheckoutResult(result);
      toast.success("Payment link generated.");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to generate payment link.");
    },
  });

  const paymentMutation = useMutation({
    mutationFn: (body: Payment) => invoicesApi.recordPayment(id!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices", id] });
      qc.invalidateQueries({ queryKey: ["invoices", id, "payments"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Payment recorded.");
      setPaymentOpen(false);
      setPayAmount("");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Payment failed.");
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!invoice) return <p className="text-muted-foreground">Invoice not found.</p>;

  const transitions = VALID_TRANSITIONS[invoice.status ?? "DRAFT"] ?? [];

  return (
    <section className="flex flex-col gap-4" data-testid="invoice-detail">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/invoices")}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-medium">
          Invoice {invoice.invoiceNumber ?? invoice.id?.slice(0, 8)}
        </h1>
        <Badge variant="muted">
          {labelFor(INVOICE_STATUS_LABELS, invoice.status, "Draft")}
        </Badge>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Total:</span>{" "}
            {invoice.currency ?? "USD"} {invoice.total?.toFixed(2) ?? "0.00"}
          </div>
          <div data-testid="invoice-balance">
            <span className="text-muted-foreground">Balance:</span>{" "}
            {invoice.currency ?? "USD"} {invoice.balance?.toFixed(2) ?? "0.00"}
          </div>
          {invoice.dueAt && (
            <div>
              <span className="text-muted-foreground">Due:</span> {invoice.dueAt}
            </div>
          )}
        </CardContent>
      </Card>

      {(payments ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm" data-testid="invoice-payments">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-1">Date</th>
                  <th className="py-1 text-right">Amount</th>
                  <th className="py-1">Method</th>
                </tr>
              </thead>
              <tbody>
                {(payments ?? []).map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="py-1">{p.paidAt ?? "—"}</td>
                    <td className="py-1 text-right">
                      {p.currency ?? "USD"} {p.amount?.toFixed(2) ?? "0.00"}
                    </td>
                    <td className="py-1">{p.method ? humanize(p.method) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 flex-wrap">
        {transitions.map((target) => (
          <Button
            key={target}
            variant="outline"
            onClick={() => statusMutation.mutate(target)}
            disabled={statusMutation.isPending}
            data-testid={`invoice-status-${target.toLowerCase()}`}
          >
            Mark as {labelFor(INVOICE_STATUS_LABELS, target).toLowerCase()}
          </Button>
        ))}

        {["SENT", "PARTIALLY_PAID", "OVERDUE"].includes(invoice.status ?? "") && (
          <Button
            onClick={() => setPaymentOpen(true)}
            data-testid="record-payment"
          >
            Record payment
          </Button>
        )}

        {["SENT", "PARTIALLY_PAID", "OVERDUE"].includes(invoice.status ?? "") && (
          <Button
            variant="outline"
            onClick={() => stripeMutation.mutate()}
            disabled={stripeMutation.isPending}
            data-testid="invoice-stripe-checkout-btn"
          >
            <Link2 className="size-4" /> Generate payment link
          </Button>
        )}
      </div>

      {checkoutResult?.url && (
        <Card>
          <CardHeader>
            <CardTitle>Payment link</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <p className="text-muted-foreground">
              Share this Stripe-hosted link with your client to collect payment.
            </p>
            <div className="flex items-center gap-2">
              <code
                className="flex-1 rounded bg-muted px-2 py-1 text-xs break-all"
                data-testid="invoice-checkout-url"
              >
                {checkoutResult.url}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void navigator.clipboard.writeText(checkoutResult.url ?? "");
                  toast.success("Link copied to clipboard.");
                }}
              >
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium">
              Amount
              <input
                type="number"
                min="0"
                step="0.01"
                className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                data-testid="payment-amount-input"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPaymentOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={!payAmount || paymentMutation.isPending}
                onClick={() =>
                  paymentMutation.mutate({
                    invoiceId: id,
                    amount: parseFloat(payAmount),
                    currency: invoice.currency ?? "USD",
                    paidAt: new Date().toISOString(),
                    method: "OTHER",
                  })
                }
                data-testid="payment-submit"
              >
                Record
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex gap-2">
        <Button variant="ghost" asChild>
          <Link to="/invoices">All invoices</Link>
        </Button>
      </div>
    </section>
  );
}
