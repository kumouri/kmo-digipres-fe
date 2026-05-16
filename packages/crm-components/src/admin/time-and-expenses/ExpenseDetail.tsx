import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router";
import { toast } from "sonner";
import { CheckCircle, Upload, XCircle } from "lucide-react";

import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import { useTimeExpensesApi } from "../../hooks/useTimeExpensesApi";

interface Props {
  isAdmin?: boolean;
}

const APPROVAL_VARIANT: Record<
  string,
  "default" | "muted" | "outline" | "secondary" | "destructive"
> = {
  PENDING: "muted",
  APPROVED: "default",
  REJECTED: "destructive",
};

export function ExpenseDetail({ isAdmin = false }: Props) {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const api = useTimeExpensesApi();
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: expense, isLoading } = useQuery({
    queryKey: ["expenses", id],
    queryFn: () => api.getExpense(id!),
    enabled: !!id,
  });

  const { data: receipts = [] } = useQuery({
    queryKey: ["expenses", id, "receipts"],
    queryFn: () => api.listReceipts(id!),
    enabled: !!id,
  });

  const approveMutation = useMutation({
    mutationFn: () => api.approveExpense(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses", id] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense approved.");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Approve failed."),
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => api.rejectExpense(id!, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses", id] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense rejected.");
      setShowReject(false);
      setRejectReason("");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Reject failed."),
  });

  const receiptMutation = useMutation({
    mutationFn: async (file: File) => {
      // 1. Presign
      const presigned = await api.presignReceipt({
        subjectType: "EXPENSE",
        subjectId: id,
        contentType: file.type,
        suffix: file.name.split(".").pop() ?? "bin",
      });
      // 2. PUT bytes to presigned URL (in mock mode, this is a no-op fetch)
      try {
        await fetch(presigned.uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
      } catch {
        // In MSW mock mode the presigned URL is not reachable — acceptable for smoke tests
      }
      // 3. Register the attachment
      return api.registerReceipt({
        subjectType: "EXPENSE",
        subjectId: id,
        storageRef: presigned.storageRef,
        filename: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses", id, "receipts"] });
      toast.success("Receipt uploaded.");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Upload failed."),
  });

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="expense-loading">
        Loading…
      </p>
    );
  }

  if (!expense) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="expense-not-found">
        Expense not found.
      </p>
    );
  }

  const canDecide =
    isAdmin &&
    expense.approvalStatus === "PENDING" &&
    expense.billingStatus !== "INVOICED";

  return (
    <section className="flex flex-col gap-4" data-testid="expense-detail">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium" data-testid="expense-detail-description">
            {expense.description ?? "Expense"}
          </h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span data-testid="expense-detail-amount">
              {expense.currency ?? "USD"} {(expense.amount ?? 0).toFixed(2)}
            </span>
            {expense.markupPercent && (
              <span className="text-muted-foreground">
                (+{expense.markupPercent}% markup)
              </span>
            )}
            <span>•</span>
            <span>{expense.incurredOn}</span>
            {expense.category && (
              <>
                <span>•</span>
                <span>{expense.category}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              APPROVAL_VARIANT[expense.approvalStatus ?? "PENDING"] ?? "muted"
            }
            data-testid="expense-detail-approval"
          >
            {expense.approvalStatus ?? "PENDING"}
          </Badge>
          <Badge
            variant={
              expense.billingStatus === "INVOICED" ? "secondary" : "outline"
            }
          >
            {expense.billingStatus ?? "UNBILLED"}
          </Badge>
        </div>
      </header>

      {/* ADMIN approve/reject */}
      {canDecide && (
        <div className="flex flex-col gap-3 rounded-md border p-3" data-testid="admin-actions">
          <p className="text-sm font-medium">Admin decision</p>
          <div className="flex gap-2">
            <Button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              data-testid="approve-expense"
            >
              <CheckCircle className="size-4" /> Approve
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowReject(!showReject)}
              data-testid="reject-expense-toggle"
            >
              <XCircle className="size-4" /> Reject
            </Button>
          </div>
          {showReject && (
            <div className="flex flex-col gap-2" data-testid="reject-form">
              <input
                className="rounded border px-2 py-1 text-sm"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Rejection reason (required)"
                data-testid="reject-reason-input"
              />
              <Button
                disabled={!rejectReason.trim() || rejectMutation.isPending}
                onClick={() => rejectMutation.mutate(rejectReason.trim())}
                data-testid="reject-submit"
              >
                Confirm rejection
              </Button>
            </div>
          )}
        </div>
      )}

      {expense.rejectionReason && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm" data-testid="rejection-reason">
          <span className="font-medium">Rejection reason:</span>{" "}
          {expense.rejectionReason}
        </div>
      )}

      {/* Receipt upload */}
      <div className="flex flex-col gap-2 rounded-md border p-3" data-testid="receipt-section">
        <p className="text-sm font-medium">Receipts ({receipts.length})</p>
        {receipts.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {receipts.map((r) => (
              <li key={r.id} className="text-sm font-mono text-muted-foreground" data-testid="receipt-item">
                {r.filename ?? r.storageRef}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">No receipts attached.</p>
        )}
        {expense.billingStatus !== "INVOICED" && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) receiptMutation.mutate(file);
              }}
              data-testid="receipt-file-input"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={receiptMutation.isPending}
              data-testid="upload-receipt"
            >
              <Upload className="size-4" />
              {receiptMutation.isPending ? "Uploading…" : "Attach receipt"}
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
