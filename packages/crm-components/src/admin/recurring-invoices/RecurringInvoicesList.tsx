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
import { useRecurringInvoicesApi } from "../../hooks/useRecurringInvoicesApi";
import type { RecurringInvoice, RecurringInvoiceStatus } from "../../types/api";
import { RECURRING_INVOICE_STATUS_LABELS, labelFor } from "../labels";

const STATUS_VARIANT: Record<RecurringInvoiceStatus, "default" | "muted" | "outline"> = {
  ACTIVE: "default",
  PAUSED: "muted",
  ENDED: "outline",
};

const columns: Column<RecurringInvoice>[] = [
  {
    key: "templateName",
    header: "Name",
    cell: (r) => (
      <span className="font-medium" data-testid="recurring-row-name">
        {r.templateName ?? <span className="text-muted-foreground">Untitled</span>}
      </span>
    ),
  },
  {
    key: "rrule",
    header: "Cadence",
    cell: (r) => (
      <span className="font-mono text-xs text-muted-foreground">
        {r.rrule ?? "—"}
      </span>
    ),
  },
  {
    key: "nextRunAt",
    header: "Next run",
    cell: (r) => r.nextRunAt ? r.nextRunAt.slice(0, 10) : "—",
  },
  {
    key: "status",
    header: "Status",
    cell: (r) => {
      const s = (r.status ?? "ACTIVE") as RecurringInvoiceStatus;
      return (
        <Badge variant={STATUS_VARIANT[s] ?? "muted"}>
          {labelFor(RECURRING_INVOICE_STATUS_LABELS, s, s)}
        </Badge>
      );
    },
  },
];

export function RecurringInvoicesList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const api = useRecurringInvoicesApi();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRrule, setNewRrule] = useState("FREQ=MONTHLY;BYMONTHDAY=1");
  const [newSeedAt, setNewSeedAt] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["recurring-invoices"],
    queryFn: api.listRecurringInvoices,
  });

  const createMutation = useMutation({
    mutationFn: api.createRecurringInvoice,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["recurring-invoices"] });
      toast.success("Recurring invoice created.");
      setCreateOpen(false);
      if (created.id) navigate(`/recurring-invoices/${created.id}`);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Create failed.");
    },
  });

  function handleCreate() {
    createMutation.mutate({
      templateName: newName || undefined,
      rrule: newRrule || undefined,
      seedAt: newSeedAt || undefined,
      status: "ACTIVE",
      currency: "USD",
    });
  }

  return (
    <section className="flex flex-col gap-4" data-testid="recurring-invoices-page">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium">Recurring Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Automated invoice cadences managed by KMO Solutions Foundry.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} data-testid="new-recurring-invoice">
          <Plus /> New recurring invoice
        </Button>
      </header>

      <DataTable
        columns={columns}
        rows={data}
        rowKey={(r) => r.id ?? Math.random().toString()}
        isLoading={isLoading}
        emptyMessage="No recurring invoices yet — create one to get started."
        onRowClick={(r) => r.id && navigate(`/recurring-invoices/${r.id}`)}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New recurring invoice</DialogTitle>
            <DialogDescription>
              Set up an automated invoice cadence.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium">
              Name (optional)
              <input
                className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                value={newName}
                placeholder="e.g. Monthly retainer"
                onChange={(e) => setNewName(e.target.value)}
                data-testid="recurring-name-input"
              />
            </label>
            <label className="text-sm font-medium">
              Cadence (RRULE)
              <input
                className="mt-1 block w-full rounded border px-2 py-1 text-sm font-mono"
                value={newRrule}
                placeholder="FREQ=MONTHLY;BYMONTHDAY=1"
                onChange={(e) => setNewRrule(e.target.value)}
                data-testid="recurring-rrule-input"
              />
              <span className="mt-1 block text-xs text-muted-foreground">
                RFC-5545 RRULE string. Example: FREQ=MONTHLY;BYMONTHDAY=1
              </span>
            </label>
            <label className="text-sm font-medium">
              Start date (optional)
              <input
                type="date"
                className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                value={newSeedAt ? newSeedAt.slice(0, 10) : ""}
                onChange={(e) =>
                  setNewSeedAt(e.target.value ? `${e.target.value}T00:00:00Z` : "")
                }
                data-testid="recurring-seedat-input"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={createMutation.isPending}
                onClick={handleCreate}
                data-testid="create-recurring-submit"
              >
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
