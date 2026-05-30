import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { FileText, Plus } from "lucide-react";

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
import { useTimeExpensesApi } from "../../hooks/useTimeExpensesApi";
import type { Expense } from "../../types/api";
import { BILLING_STATUS_LABELS, EXPENSE_APPROVAL_LABELS, labelFor } from "../labels";

const APPROVAL_VARIANT: Record<
  string,
  "default" | "muted" | "outline" | "secondary" | "destructive"
> = {
  PENDING: "muted",
  APPROVED: "default",
  REJECTED: "destructive",
};

const BILLING_VARIANT: Record<
  string,
  "default" | "muted" | "outline" | "secondary" | "destructive"
> = {
  UNBILLED: "outline",
  INVOICED: "secondary",
};

interface Props {
  userId: string;
}

const columns: Column<Expense>[] = [
  {
    key: "description",
    header: "Description",
    cell: (e) => (
      <span data-testid="expense-description">{e.description ?? "—"}</span>
    ),
  },
  {
    key: "category",
    header: "Category",
    cell: (e) => e.category ?? <span className="text-muted-foreground">—</span>,
  },
  {
    key: "amount",
    header: "Amount",
    cell: (e) => (
      <span className="font-mono" data-testid="expense-amount">
        {e.currency ?? "USD"} {(e.amount ?? 0).toFixed(2)}
      </span>
    ),
  },
  {
    key: "incurredOn",
    header: "Date",
    cell: (e) =>
      e.incurredOn ?? <span className="text-muted-foreground">—</span>,
  },
  {
    key: "approvalStatus",
    header: "Approval",
    cell: (e) => (
      <Badge
        variant={
          APPROVAL_VARIANT[e.approvalStatus ?? "PENDING"] ?? "muted"
        }
        data-testid="expense-approval-badge"
      >
        {labelFor(EXPENSE_APPROVAL_LABELS, e.approvalStatus, "Pending")}
      </Badge>
    ),
  },
  {
    key: "billingStatus",
    header: "Billing",
    cell: (e) => (
      <Badge
        variant={BILLING_VARIANT[e.billingStatus ?? "UNBILLED"] ?? "outline"}
      >
        {labelFor(BILLING_STATUS_LABELS, e.billingStatus, "Not billed")}
      </Badge>
    ),
  },
];

export function ExpensesList({ userId }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const api = useTimeExpensesApi();
  const [createOpen, setCreateOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [defaultMarkup, setDefaultMarkup] = useState("15");

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: api.listExpenses,
  });

  const approvedUnbilled = expenses.filter(
    (e) =>
      e.approvalStatus === "APPROVED" &&
      e.billable &&
      e.billingStatus === "UNBILLED",
  );

  const createMutation = useMutation({
    mutationFn: api.createExpense,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense submitted.");
      setCreateOpen(false);
      setNewDesc("");
      setNewAmount("");
      setNewDate("");
      setNewCategory("");
      if (created.id) navigate(`/expenses/${created.id}`);
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Submit failed."),
  });

  const invoiceMutation = useMutation({
    mutationFn: () =>
      api.createInvoiceFromExpenses({
        defaultMarkupPercent: parseFloat(defaultMarkup) || 0,
      }),
    onSuccess: (inv) => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success(
        `Draft invoice created — ID ${inv.id?.slice(0, 8) ?? "?"}`,
        { duration: 8000 },
      );
      setInvoiceOpen(false);
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Invoice failed."),
  });

  void userId; // future: filter by userId if needed

  return (
    <section className="flex flex-col gap-4" data-testid="expenses-page">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium">Expenses</h1>
          <p className="text-sm text-muted-foreground">
            Submit expenses and follow them through approval and billing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCreateOpen(true)}
            data-testid="new-expense"
          >
            <Plus /> New expense
          </Button>
          {approvedUnbilled.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setInvoiceOpen(true)}
              data-testid="invoice-expenses"
            >
              <FileText className="size-4" /> Invoice approved (
              {approvedUnbilled.length})
            </Button>
          )}
        </div>
      </header>

      <DataTable
        columns={columns}
        rows={expenses}
        rowKey={(e) => e.id ?? Math.random().toString()}
        isLoading={isLoading}
        emptyMessage="No expenses yet — submit one to get started."
        onRowClick={(e) => e.id && navigate(`/expenses/${e.id}`)}
      />

      {/* New expense dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit expense</DialogTitle>
            <DialogDescription>
              Submit an expense for approval. You can attach a receipt on the
              next screen.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium">
              Description
              <input
                className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="e.g. Client lunch"
                data-testid="expense-desc-input"
              />
            </label>
            <label className="text-sm font-medium">
              Category
              <input
                className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Meals, travel, software…"
                data-testid="expense-category-input"
              />
            </label>
            <label className="text-sm font-medium">
              Amount ($)
              <input
                className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                type="number"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="0.00"
                data-testid="expense-amount-input"
              />
            </label>
            <label className="text-sm font-medium">
              Date incurred
              <input
                className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                data-testid="expense-date-input"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={
                  !newDesc.trim() ||
                  !newAmount ||
                  !newDate ||
                  createMutation.isPending
                }
                onClick={() => {
                  createMutation.mutate({
                    userId,
                    description: newDesc.trim(),
                    category: newCategory.trim() || undefined,
                    amount: parseFloat(newAmount) || 0,
                    currency: "USD",
                    incurredOn: newDate,
                    billable: true,
                  });
                }}
                data-testid="submit-expense"
              >
                Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice approved expenses dialog */}
      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invoice approved expenses</DialogTitle>
            <DialogDescription>
              Bundle your approved expenses into a new draft invoice, with
              markup applied.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium">
              Default markup %
              <input
                className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                type="number"
                value={defaultMarkup}
                onChange={(e) => setDefaultMarkup(e.target.value)}
                data-testid="invoice-markup"
              />
            </label>
            <p className="text-xs text-muted-foreground">
              {approvedUnbilled.length} approved unbilled expenses will be
              invoiced with{" "}
              <strong>{defaultMarkup}% markup</strong> (or their per-expense
              markup if set).
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setInvoiceOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={invoiceMutation.isPending}
                onClick={() => invoiceMutation.mutate()}
                data-testid="invoice-expenses-submit"
              >
                Create draft invoice
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
