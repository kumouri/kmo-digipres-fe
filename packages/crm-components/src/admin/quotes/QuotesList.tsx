import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../primitives/dialog";
import { DataTable, type Column } from "../../components/DataTable";
import { useQuotesApi } from "../../hooks/useQuotesApi";
import type { Quote } from "../../types/api";
import { QUOTE_STATUS_LABELS, labelFor } from "../labels";
import { QuoteForm, quoteToFormValues, formValuesToQuote } from "./QuoteForm";
import type { QuoteFormValues } from "./QuoteForm";

const STATUS_VARIANT: Record<string, "default" | "muted" | "outline"> = {
  DRAFT: "muted",
  SENT: "default",
  ACCEPTED: "default",
  DECLINED: "outline",
  EXPIRED: "outline",
};

const columns: Column<Quote>[] = [
  {
    key: "quoteNumber",
    header: "Quote #",
    cell: (q) => (
      <span className="font-medium" data-testid="quote-row-number">
        {q.quoteNumber ?? "—"}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (q) => (
      <Badge variant={STATUS_VARIANT[q.status ?? "DRAFT"] ?? "muted"}>
        {labelFor(QUOTE_STATUS_LABELS, q.status, "Draft")}
      </Badge>
    ),
  },
  {
    key: "total",
    header: "Total",
    cell: (q) => (
      <span>
        {q.currency ?? "USD"} {q.total?.toFixed(2) ?? "0.00"}
      </span>
    ),
  },
  {
    key: "expiresAt",
    header: "Expires",
    cell: (q) => q.expiresAt ?? <span className="text-muted-foreground">—</span>,
  },
];

export function QuotesList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const quotesApi = useQuotesApi();
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["quotes"],
    queryFn: quotesApi.listQuotes,
  });

  const createMutation = useMutation({
    mutationFn: (body: Quote) => quotesApi.createQuote(body),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Quote created.");
      setCreateOpen(false);
      if (created.id) navigate(`/quotes/${created.id}`);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Create failed.");
    },
  });

  function handleCreate(values: QuoteFormValues) {
    createMutation.mutate(
      formValuesToQuote(values, { status: "DRAFT" }),
    );
  }

  return (
    <section className="flex flex-col gap-4" data-testid="quotes-page">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium">Quotes</h1>
          <p className="text-sm text-muted-foreground">
            Price quotes and proposals you've sent to clients.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} data-testid="new-quote">
          <Plus /> New quote
        </Button>
      </header>

      <DataTable
        columns={columns}
        rows={data}
        rowKey={(r) => r.id ?? r.quoteNumber ?? Math.random().toString()}
        isLoading={isLoading}
        emptyMessage="No quotes yet — create one to get started."
        onRowClick={(r) => r.id && navigate(`/quotes/${r.id}`)}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New quote</DialogTitle>
            <DialogDescription>
              Start a new quote. You can add line items and send it once it's
              ready.
            </DialogDescription>
          </DialogHeader>
          <QuoteForm
            defaultValues={quoteToFormValues(undefined)}
            onSubmit={handleCreate}
            submitLabel="Create quote"
            isSubmitting={createMutation.isPending}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}
