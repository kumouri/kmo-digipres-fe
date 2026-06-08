import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, Link } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, FileText, FileCheck, FilePlus2 } from "lucide-react";

import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../primitives/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../primitives/dialog";
import { useQuotesApi } from "../../hooks/useQuotesApi";
import { useInvoicesApi } from "../../hooks/useInvoicesApi";
import { useContractsApi } from "../../hooks/useContractsApi";
import { useContractTemplatesApi } from "../../hooks/useContractTemplatesApi";
import type { QuoteStatus } from "../../types/api";
import { QUOTE_STATUS_LABELS, labelFor } from "../labels";
import { QuoteForm, quoteToFormValues, formValuesToQuote } from "./QuoteForm";
import type { QuoteFormValues } from "./QuoteForm";

const VALID_TRANSITIONS: Record<string, QuoteStatus[]> = {
  DRAFT: ["SENT"],
  SENT: ["ACCEPTED", "DECLINED"],
  ACCEPTED: [],
  DECLINED: [],
  EXPIRED: [],
};

export function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const quotesApi = useQuotesApi();
  const invoicesApi = useInvoicesApi();
  const contractsApi = useContractsApi();
  const contractTemplatesApi = useContractTemplatesApi();
  const [editOpen, setEditOpen] = useState(false);
  const [spawnContractOpen, setSpawnContractOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const { data: quote, isLoading } = useQuery({
    queryKey: ["quotes", id],
    queryFn: () => quotesApi.getQuote(id!),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (target: string) => quotesApi.changeQuoteStatus(id!, target),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotes", id] });
      qc.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Quote status updated.");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Status change failed.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (body: QuoteFormValues) =>
      quotesApi.updateQuote(id!, formValuesToQuote(body, quote)),
    onSuccess: (updated) => {
      qc.setQueryData(["quotes", id], updated);
      qc.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Quote saved.");
      setEditOpen(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    },
  });

  const convertMutation = useMutation({
    mutationFn: () => invoicesApi.createInvoiceFromQuote(id!),
    onSuccess: (invoice) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice created from quote.");
      if (invoice.id) navigate(`/invoices/${invoice.id}`);
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to create invoice.",
      );
    },
  });

  const { data: allTemplates } = useQuery({
    queryKey: ["contract-templates"],
    queryFn: contractTemplatesApi.listContractTemplates,
  });

  const sowTemplates = (allTemplates ?? []).filter(
    (t) => t.kind === "SOW" && t.active !== false,
  );

  const spawnContractMutation = useMutation({
    mutationFn: () => contractsApi.spawnContractFromQuote(id!, selectedTemplateId),
    onSuccess: (contract) => {
      qc.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Contract created from quote.");
      setSpawnContractOpen(false);
      if (contract.id) navigate(`/contracts/${contract.id}`);
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to generate contract.",
      );
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!quote) return <p className="text-muted-foreground">Quote not found.</p>;

  const transitions = VALID_TRANSITIONS[quote.status ?? "DRAFT"] ?? [];
  const isAccepted = quote.status === "ACCEPTED";

  return (
    <section className="flex flex-col gap-4" data-testid="quote-detail">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/quotes")}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-medium">
          Quote {quote.quoteNumber ?? quote.id?.slice(0, 8)}
        </h1>
        <Badge variant="muted">
          {labelFor(QUOTE_STATUS_LABELS, quote.status, "Draft")}
        </Badge>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Currency:</span>{" "}
            {quote.currency ?? "USD"}
          </div>
          <div>
            <span className="text-muted-foreground">Total:</span>{" "}
            {quote.currency ?? "USD"} {quote.total?.toFixed(2) ?? "0.00"}
          </div>
          {quote.expiresAt && (
            <div>
              <span className="text-muted-foreground">Expires:</span>{" "}
              {quote.expiresAt}
            </div>
          )}
          {quote.notes && (
            <div>
              <span className="text-muted-foreground">Notes:</span> {quote.notes}
            </div>
          )}
        </CardContent>
      </Card>

      {(quote.lineItems ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm" data-testid="quote-line-items">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-1">Description</th>
                  <th className="py-1 text-right">Qty</th>
                  <th className="py-1 text-right">Unit Price</th>
                  <th className="py-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {(quote.lineItems ?? []).map((li, i) => (
                  <tr key={i} className="border-b" data-testid={`quote-line-item-row-${i}`}>
                    <td className="py-1">{li.description ?? li.sku ?? "—"}</td>
                    <td className="py-1 text-right">{li.quantity ?? 1}</td>
                    <td className="py-1 text-right">
                      {li.unitPrice?.toFixed(2) ?? "0.00"}
                    </td>
                    <td className="py-1 text-right" data-testid={`quote-line-item-total-${i}`}>
                      {li.lineTotal?.toFixed(2) ?? "0.00"}
                    </td>
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
            data-testid={`quote-status-${target.toLowerCase()}`}
          >
            Mark as {labelFor(QUOTE_STATUS_LABELS, target).toLowerCase()}
          </Button>
        ))}

        <Button
          variant="outline"
          onClick={() => setEditOpen(true)}
          data-testid="quote-edit-btn"
        >
          Edit
        </Button>

        <Button
          variant="outline"
          asChild
          data-testid="quote-pdf-link"
        >
          <a
            href={`/api/v1/quotes/${id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FileText className="size-4" /> Download PDF
          </a>
        </Button>

        {isAccepted && (
          <Button
            onClick={() => convertMutation.mutate()}
            disabled={convertMutation.isPending}
            data-testid="quote-convert-to-invoice-btn"
          >
            <FileCheck className="size-4" />
            {convertMutation.isPending ? "Creating…" : "Create invoice from quote"}
          </Button>
        )}

        {isAccepted && (
          <Button
            variant="outline"
            onClick={() => {
              setSelectedTemplateId(sowTemplates[0]?.id ?? "");
              setSpawnContractOpen(true);
            }}
            data-testid="quote-generate-contract-btn"
          >
            <FilePlus2 className="size-4" />
            Generate SOW contract
          </Button>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit quote</DialogTitle>
            <DialogDescription>
              Update this quote's details and line items.
            </DialogDescription>
          </DialogHeader>
          {quote && (
            <QuoteForm
              defaultValues={quoteToFormValues(quote)}
              onSubmit={(values) => updateMutation.mutate(values)}
              submitLabel="Save quote"
              isSubmitting={updateMutation.isPending}
              onCancel={() => setEditOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <div className="flex gap-2">
        <Button variant="ghost" asChild>
          <Link to="/quotes">All quotes</Link>
        </Button>
      </div>

      <Dialog open={spawnContractOpen} onOpenChange={setSpawnContractOpen} data-testid="quote-spawn-contract-dialog">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate SOW contract</DialogTitle>
            <DialogDescription>
              Choose a Statement of Work template to generate a DRAFT contract from this quote.
            </DialogDescription>
          </DialogHeader>
          {sowTemplates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Create an active SOW template first before generating a contract.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium">
                SOW template
                <select
                  className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  data-testid="quote-spawn-contract-template-select"
                >
                  {sowTemplates.map((t) =>
                    t.id ? (
                      <option key={t.id} value={t.id}>
                        {t.name ?? t.kind ?? t.id}
                      </option>
                    ) : null,
                  )}
                </select>
              </label>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSpawnContractOpen(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={spawnContractMutation.isPending || !selectedTemplateId}
                  onClick={() => spawnContractMutation.mutate()}
                  data-testid="quote-spawn-contract-confirm"
                >
                  {spawnContractMutation.isPending ? "Generating…" : "Generate contract"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
