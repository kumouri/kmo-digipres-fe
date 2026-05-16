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
        {q.status ?? "DRAFT"}
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
  const [newCurrency, setNewCurrency] = useState("USD");

  const { data, isLoading } = useQuery({
    queryKey: ["quotes"],
    queryFn: quotesApi.listQuotes,
  });

  const createMutation = useMutation({
    mutationFn: quotesApi.createQuote,
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

  return (
    <section className="flex flex-col gap-4" data-testid="quotes-page">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium">Quotes</h1>
          <p className="text-sm text-muted-foreground">
            Sales quotes and proposals for your tenant.
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
              Create a new quote via <code>POST /api/v1/quotes</code>.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium">
              Currency
              <input
                className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                value={newCurrency}
                onChange={(e) => setNewCurrency(e.target.value)}
                data-testid="quote-currency-input"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={createMutation.isPending}
                onClick={() =>
                  createMutation.mutate({
                    currency: newCurrency,
                    status: "DRAFT",
                    lineItems: [],
                  })
                }
                data-testid="create-quote-submit"
              >
                Create quote
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
