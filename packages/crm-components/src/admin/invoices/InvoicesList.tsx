import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import { DataTable, type Column } from "../../components/DataTable";
import { useInvoicesApi } from "../../hooks/useInvoicesApi";
import type { Invoice } from "../../types/api";
import { INVOICE_STATUS_LABELS, labelFor } from "../labels";

const STATUS_VARIANT: Record<string, "default" | "muted" | "outline"> = {
  DRAFT: "muted",
  SENT: "default",
  PARTIAL: "default",
  PAID: "default",
  VOID: "outline",
  OVERDUE: "outline",
};

const columns: Column<Invoice>[] = [
  {
    key: "invoiceNumber",
    header: "Invoice #",
    cell: (inv) => (
      <span className="font-medium" data-testid="invoice-row-number">
        {inv.invoiceNumber ?? "—"}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (inv) => (
      <Badge variant={STATUS_VARIANT[inv.status ?? "DRAFT"] ?? "muted"}>
        {labelFor(INVOICE_STATUS_LABELS, inv.status, "Draft")}
      </Badge>
    ),
  },
  {
    key: "total",
    header: "Total",
    cell: (inv) => (
      <span>
        {inv.currency ?? "USD"} {inv.total?.toFixed(2) ?? "0.00"}
      </span>
    ),
  },
  {
    key: "balance",
    header: "Balance",
    cell: (inv) => (
      <span className={inv.balance ? "text-destructive font-medium" : ""}>
        {inv.currency ?? "USD"} {inv.balance?.toFixed(2) ?? "0.00"}
      </span>
    ),
  },
  {
    key: "dueAt",
    header: "Due",
    cell: (inv) => inv.dueAt ?? <span className="text-muted-foreground">—</span>,
  },
];

export function InvoicesList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const invoicesApi = useInvoicesApi();

  const { data, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: invoicesApi.listInvoices,
  });

  const createMutation = useMutation({
    mutationFn: invoicesApi.createInvoice,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice created.");
      if (created.id) navigate(`/invoices/${created.id}`);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Create failed.");
    },
  });

  return (
    <section className="flex flex-col gap-4" data-testid="invoices-page">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Bills you've sent to clients, and what's been paid.
          </p>
        </div>
        <Button
          onClick={() =>
            createMutation.mutate({ currency: "USD", status: "DRAFT", lineItems: [] })
          }
          disabled={createMutation.isPending}
          data-testid="new-invoice"
        >
          New invoice
        </Button>
      </header>

      <DataTable
        columns={columns}
        rows={data}
        rowKey={(r) => r.id ?? r.invoiceNumber ?? Math.random().toString()}
        isLoading={isLoading}
        emptyMessage="No invoices yet — create one to bill a customer."
        onRowClick={(r) => r.id && navigate(`/invoices/${r.id}`)}
      />
    </section>
  );
}
