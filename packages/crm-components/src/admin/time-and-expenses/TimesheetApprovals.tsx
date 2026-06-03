import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle, XCircle } from "lucide-react";

import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import { DataTable, type Column } from "../../components/DataTable";
import { useTimesheetsApi } from "../../hooks/useTimesheetsApi";
import { useTeamApi } from "../../hooks/useTeamApi";
import type { Timesheet } from "../../types/api";
import { TIMESHEET_STATUS_LABELS, labelFor } from "../labels";

const STATUS_VARIANT: Record<
  string,
  "default" | "muted" | "outline" | "secondary" | "destructive"
> = {
  OPEN: "outline",
  SUBMITTED: "muted",
  APPROVED: "default",
  REJECTED: "destructive",
};

/**
 * Admin Timesheets — the owner reviews timesheets teammates have submitted for
 * approval, then approves or sends them back with a note. Mirrors the
 * ExpenseDetail decision block (approve + send-back-with-required-note), in a
 * DataTable: clicking a submitted row expands an inline decision panel.
 *
 * Lists GET /timesheets?status=SUBMITTED. Only SUBMITTED rows are decidable.
 */
export function TimesheetApprovals() {
  const qc = useQueryClient();
  const api = useTimesheetsApi();
  const teamApi = useTeamApi();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sendbackNote, setSendbackNote] = useState("");
  const [showSendback, setShowSendback] = useState(false);

  const { data: timesheets = [], isLoading } = useQuery({
    queryKey: ["timesheets", "SUBMITTED"],
    queryFn: () => api.listByStatus("SUBMITTED"),
  });

  // Resolve userId → a teammate's name for the Person column (GET /team).
  const { data: team = [] } = useQuery({
    queryKey: ["team"],
    queryFn: () => teamApi.listTeam(),
  });
  const nameFor = (userId: string | undefined): string => {
    if (!userId) return "—";
    const member = team.find((m) => m.id === userId);
    return member?.displayName ?? `${userId.slice(0, 8)}…`;
  };

  const resetDecision = () => {
    setSelectedId(null);
    setShowSendback(false);
    setSendbackNote("");
  };

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timesheets"] });
      toast.success("Timesheet approved.");
      resetDecision();
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Approve failed."),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.reject(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timesheets"] });
      toast.success("Timesheet sent back.");
      resetDecision();
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Send back failed."),
  });

  const columns: Column<Timesheet>[] = [
    {
      key: "person",
      header: "Person",
      cell: (t) => (
        <span data-testid="timesheet-person">{nameFor(t.userId)}</span>
      ),
    },
    {
      key: "period",
      header: "Period",
      cell: (t) => (
        <span className="font-mono text-sm" data-testid="timesheet-period">
          {t.periodStart ?? "—"} — {t.periodEnd ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (t) => (
        <Badge
          variant={STATUS_VARIANT[t.status ?? "SUBMITTED"] ?? "muted"}
          data-testid="timesheet-row-status"
        >
          {labelFor(TIMESHEET_STATUS_LABELS, t.status, "Submitted")}
        </Badge>
      ),
    },
  ];

  const selected = timesheets.find((t) => t.id === selectedId);
  const canDecide = !!selected && selected.status === "SUBMITTED";

  return (
    <section className="flex flex-col gap-4" data-testid="timesheet-approvals">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium">Timesheets</h1>
        <p className="text-sm text-muted-foreground">
          Review the timesheets your teammates submitted — approve them or send
          one back with a note.
        </p>
      </header>

      <DataTable
        columns={columns}
        rows={timesheets}
        rowKey={(t) => t.id ?? Math.random().toString()}
        isLoading={isLoading}
        emptyMessage="No timesheets waiting for review — you're all caught up."
        onRowClick={(t) => {
          if (t.status !== "SUBMITTED") return;
          setSelectedId(t.id ?? null);
          setShowSendback(false);
          setSendbackNote("");
        }}
        data-testid="timesheet-approvals-table"
      />

      {/* Inline decision panel for the selected (SUBMITTED) row — mirrors the
          ExpenseDetail approve / send-back block. */}
      {canDecide && selected && (
        <div
          className="flex flex-col gap-3 rounded-md border p-3"
          data-testid="timesheet-decision"
        >
          <p className="text-sm font-medium">
            Review {nameFor(selected.userId)}'s timesheet
            <span className="ml-2 font-normal text-muted-foreground">
              {selected.periodStart} — {selected.periodEnd}
            </span>
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => selected.id && approveMutation.mutate(selected.id)}
              disabled={approveMutation.isPending}
              data-testid="approve-timesheet"
            >
              <CheckCircle className="size-4" /> Approve
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowSendback(!showSendback)}
              data-testid="reject-timesheet-toggle"
            >
              <XCircle className="size-4" /> Send back
            </Button>
          </div>
          {showSendback && (
            <div className="flex flex-col gap-2" data-testid="sendback-form">
              <input
                className="rounded border px-2 py-1 text-sm"
                value={sendbackNote}
                onChange={(e) => setSendbackNote(e.target.value)}
                placeholder="What needs another look? (required)"
                data-testid="sendback-note"
              />
              <Button
                disabled={!sendbackNote.trim() || rejectMutation.isPending}
                onClick={() =>
                  selected.id &&
                  rejectMutation.mutate({
                    id: selected.id,
                    reason: sendbackNote.trim(),
                  })
                }
                data-testid="sendback-submit"
              >
                Send back to teammate
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
