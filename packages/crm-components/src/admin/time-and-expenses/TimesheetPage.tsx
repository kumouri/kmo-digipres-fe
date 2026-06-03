import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle, Clock, FileText, Plus, RotateCcw } from "lucide-react";

import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../primitives/dialog";
import { useContractorApi } from "../../hooks/useContractorApi";
import { useTimeExpensesApi } from "../../hooks/useTimeExpensesApi";
import type { TimeEntry, TimesheetView } from "../../types/api";
import {
  BILLING_STATUS_LABELS,
  TIMESHEET_STATUS_LABELS,
  labelFor,
} from "../labels";

// Badge tone per timesheet period status: SUBMITTED awaits a decision (muted),
// APPROVED is done (default), REJECTED needs another look (destructive).
const TIMESHEET_STATUS_VARIANT: Record<
  string,
  "default" | "muted" | "outline" | "secondary" | "destructive"
> = {
  OPEN: "outline",
  SUBMITTED: "muted",
  APPROVED: "default",
  REJECTED: "destructive",
};

interface Props {
  userId: string;
  /**
   * When true, the signed-in user is a scoped-down contractor: the weekly read
   * + manual log hit /me/contractor/time* instead of the staff /time-entries
   * surface (which denies a CONTRACTOR token, 4135), and the staff-only
   * "Invoice unbilled" action is hidden. Defaults to false (staff/admin).
   */
  isContractor?: boolean;
}

/**
 * Returns the ISO week containing the given date: [Mon, Tue, ..., Sun] as ISO strings.
 * The boundary is always local calendar day (browser zone).
 */
function getWeekDays(anchorDate: Date): Date[] {
  const days: Date[] = [];
  const d = new Date(anchorDate);
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const diff = (day === 0 ? -6 : 1 - day); // shift so Mon is day 0
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fmtDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

/** Group entries by splitGroupId, returning logical sessions. */
function groupEntries(entries: TimeEntry[]): Array<{
  groupId: string | null;
  entries: TimeEntry[];
  totalSeconds: number;
  description: string;
  billable: boolean;
  billingStatus: string;
}> {
  const grouped = new Map<string, TimeEntry[]>();
  const singleKey = (e: TimeEntry) =>
    e.splitGroupId ?? `single-${e.id ?? Math.random()}`;

  for (const entry of entries) {
    const key = singleKey(entry);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(entry);
  }

  return Array.from(grouped.entries()).map(([_key, grpEntries]) => ({
    groupId: grpEntries[0].splitGroupId ?? null,
    entries: grpEntries.sort(
      (a, b) =>
        new Date(a.startedAt ?? "").getTime() -
        new Date(b.startedAt ?? "").getTime(),
    ),
    totalSeconds: grpEntries.reduce(
      (s, e) => s + (e.durationSeconds ?? 0),
      0,
    ),
    description: grpEntries[0].description ?? "(no description)",
    billable: grpEntries[0].billable ?? true,
    billingStatus: grpEntries[0].billingStatus ?? "UNBILLED",
  }));
}

export function TimesheetPage({ userId, isContractor = false }: Props) {
  const qc = useQueryClient();
  const staffApi = useTimeExpensesApi();
  const contractorApi = useContractorApi();
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [addOpen, setAddOpen] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [defaultRate, setDefaultRate] = useState("100");

  const weekDays = getWeekDays(anchorDate);
  const from = weekDays[0].toISOString();
  const to = new Date(weekDays[6].getTime() + 86400000).toISOString(); // exclusive end

  // Contractors are denied the staff /time-entries readers (4135) — their
  // weekly read + manual log go through /me/contractor/time*. The query key is
  // namespaced so contractor + staff data never collide in the cache, and the
  // timer (in TimerWidget) invalidates the matching family on start/stop.
  const timeKeyRoot = isContractor ? ["contractor", "time"] : ["time-entries"];

  const { data: entries = [], isLoading } = useQuery({
    queryKey: [...timeKeyRoot, userId, "weekly", fmtDate(weekDays[0])],
    queryFn: () =>
      isContractor
        ? contractorApi.listWeeklyTime(from, to)
        : staffApi.listWeeklyTimeEntries(userId, from, to),
  });

  // Contractor-only: load the contractor's own timesheet periods so we can show
  // the visible week's submit/approval state. Match by periodStart === the
  // visible week's Monday (fmtDate(weekDays[0])). Staff/admin never fetch this.
  const { data: timesheets = [] } = useQuery({
    queryKey: ["contractor", "timesheets"],
    queryFn: () => contractorApi.listTimesheets(),
    enabled: isContractor,
  });
  const weekStart = fmtDate(weekDays[0]);
  const weekTimesheet: TimesheetView | undefined = timesheets.find(
    (t) => t.periodStart === weekStart,
  );
  const tsStatus = weekTimesheet?.status;
  // SUBMITTED + APPROVED periods are locked: no logging / timer edits until the
  // period is reopened (or sent back). OPEN/REJECTED/none stay editable.
  const periodLocked = tsStatus === "SUBMITTED" || tsStatus === "APPROVED";

  const submitTimesheetMutation = useMutation({
    mutationFn: (id: string) => contractorApi.submitTimesheet(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contractor", "timesheets"] });
      qc.invalidateQueries({ queryKey: ["contractor", "time-entries"] });
      qc.invalidateQueries({ queryKey: ["contractor", "time"] });
      toast.success("Timesheet submitted for approval.");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Submit failed."),
  });

  const reopenTimesheetMutation = useMutation({
    mutationFn: (id: string) => contractorApi.reopenTimesheet(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contractor", "timesheets"] });
      qc.invalidateQueries({ queryKey: ["contractor", "time-entries"] });
      qc.invalidateQueries({ queryKey: ["contractor", "time"] });
      toast.success("Timesheet reopened — you can edit it again.");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Reopen failed."),
  });

  const createMutation = useMutation({
    mutationFn: (body: TimeEntry) =>
      isContractor ? contractorApi.logTime(body) : staffApi.createTimeEntry(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: timeKeyRoot });
      toast.success("Time entry logged.");
      setAddOpen(false);
      setNewDesc("");
      setNewStart("");
      setNewEnd("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Log failed."),
  });

  const invoiceMutation = useMutation({
    mutationFn: () =>
      staffApi.createInvoiceFromTime({
        defaultRateAmount: parseFloat(defaultRate) || 0,
      }),
    onSuccess: (inv) => {
      qc.invalidateQueries({ queryKey: ["time-entries"] });
      toast.success(
        `Draft invoice created — ID ${inv.id?.slice(0, 8) ?? "?"}`,
        { duration: 8000 },
      );
      setInvoiceOpen(false);
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Invoice failed."),
  });

  const sessions = groupEntries(entries.filter((e) => e.endedAt != null));
  const unbilledCount = entries.filter(
    (e) => e.billable && e.billingStatus === "UNBILLED" && e.endedAt != null,
  ).length;

  const prevWeek = () => {
    const d = new Date(anchorDate);
    d.setDate(d.getDate() - 7);
    setAnchorDate(d);
  };
  const nextWeek = () => {
    const d = new Date(anchorDate);
    d.setDate(d.getDate() + 7);
    setAnchorDate(d);
  };

  return (
    <section className="flex flex-col gap-4" data-testid="timesheet-page">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium">Timesheet</h1>
          <p className="text-sm text-muted-foreground">
            Log the hours you work each week — start a timer or enter time by
            hand.
          </p>
          <p className="text-xs text-muted-foreground">
            {fmtDate(weekDays[0])} — {fmtDate(weekDays[6])}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isContractor && weekTimesheet && (
            <Badge
              variant={TIMESHEET_STATUS_VARIANT[tsStatus ?? "OPEN"] ?? "outline"}
              data-testid="timesheet-status"
            >
              {labelFor(TIMESHEET_STATUS_LABELS, tsStatus, "Open")}
            </Badge>
          )}
          <Button variant="outline" onClick={prevWeek} data-testid="prev-week">
            ← Prev
          </Button>
          <Button variant="outline" onClick={nextWeek} data-testid="next-week">
            Next →
          </Button>
          {!periodLocked && (
            <Button onClick={() => setAddOpen(true)} data-testid="log-time">
              <Plus /> Log time
            </Button>
          )}
          {/* Contractor: submit the visible week for approval (OPEN or sent-back). */}
          {isContractor &&
            weekTimesheet &&
            (tsStatus === "OPEN" || tsStatus === "REJECTED") && (
              <Button
                onClick={() =>
                  weekTimesheet.id &&
                  submitTimesheetMutation.mutate(weekTimesheet.id)
                }
                disabled={submitTimesheetMutation.isPending}
                data-testid="submit-timesheet"
              >
                <CheckCircle className="size-4" /> Submit for approval
              </Button>
            )}
          {/* Contractor: reopen a sent-back week to edit before resubmitting. */}
          {isContractor && weekTimesheet && tsStatus === "REJECTED" && (
            <Button
              variant="outline"
              onClick={() =>
                weekTimesheet.id &&
                reopenTimesheetMutation.mutate(weekTimesheet.id)
              }
              disabled={reopenTimesheetMutation.isPending}
              data-testid="reopen-timesheet"
            >
              <RotateCcw className="size-4" /> Reopen
            </Button>
          )}
          {!isContractor && unbilledCount > 0 && (
            <Button
              variant="outline"
              onClick={() => setInvoiceOpen(true)}
              data-testid="invoice-unbilled"
            >
              <FileText className="size-4" /> Invoice unbilled ({unbilledCount})
            </Button>
          )}
        </div>
      </header>

      {/* Contractor: a sent-back week shows the reviewer's note (why it came
          back) so they know what to fix before resubmitting. */}
      {isContractor && tsStatus === "REJECTED" && weekTimesheet?.note && (
        <div
          className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm"
          data-testid="timesheet-sendback-note"
        >
          <span className="font-medium">Sent back:</span> {weekTimesheet.note}
        </div>
      )}

      {/* 7-column week grid */}
      <div
        className="grid grid-cols-7 gap-1 border rounded-md overflow-hidden"
        data-testid="week-grid"
      >
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className="border-r last:border-r-0 p-2 flex flex-col gap-1 min-h-24"
          >
            <span className="text-xs font-medium text-muted-foreground">
              {day.toLocaleDateString("en-US", { weekday: "short" })}{" "}
              {day.getDate()}
            </span>
          </div>
        ))}
      </div>

      {/* Session list */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground" data-testid="timesheet-loading">
          Loading…
        </p>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="timesheet-empty">
          No time entries this week. Log some time!
        </p>
      ) : (
        <ul className="flex flex-col gap-2" data-testid="timesheet-sessions">
          {sessions.map((session) => (
            <li
              key={session.groupId ?? session.entries[0]?.id}
              className="rounded-md border p-3 flex flex-col gap-1"
              data-testid="session-row"
              data-split={session.groupId ? "true" : "false"}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium" data-testid="session-description">
                  {session.description}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant={session.billingStatus === "INVOICED" ? "secondary" : "outline"}>
                    {labelFor(BILLING_STATUS_LABELS, session.billingStatus, "Not billed")}
                  </Badge>
                  <span className="text-sm font-mono" data-testid="session-duration">
                    {fmtDuration(session.totalSeconds)}
                  </span>
                </div>
              </div>
              {session.groupId && (
                <div
                  className="text-xs text-muted-foreground pl-2 border-l-2 border-amber-400"
                  data-testid="split-group"
                >
                  Split session — {session.entries.length} day segments:
                  {session.entries.map((seg) => (
                    <span
                      key={seg.id}
                      className="ml-2 font-mono"
                      data-testid="split-segment"
                    >
                      {seg.startedAt?.slice(0, 10)} ({fmtDuration(seg.durationSeconds ?? 0)})
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Log time dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log time</DialogTitle>
            <DialogDescription>
              Add a time entry by hand — enter when you started and finished.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium">
              Description
              <input
                className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="What did you work on?"
                data-testid="time-entry-desc"
              />
            </label>
            <label className="text-sm font-medium">
              Start time
              <input
                className="mt-1 block w-full rounded border px-2 py-1 text-sm font-mono"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                placeholder="2026-05-12T09:00:00Z"
                data-testid="time-entry-start"
              />
            </label>
            <label className="text-sm font-medium">
              End time
              <input
                className="mt-1 block w-full rounded border px-2 py-1 text-sm font-mono"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                placeholder="2026-05-12T10:30:00Z"
                data-testid="time-entry-end"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={
                  !newStart.trim() ||
                  !newEnd.trim() ||
                  createMutation.isPending
                }
                onClick={() => {
                  createMutation.mutate({
                    userId,
                    description: newDesc.trim() || undefined,
                    startedAt: newStart.trim(),
                    endedAt: newEnd.trim(),
                    source: "MANUAL",
                    billable: true,
                  });
                }}
                data-testid="log-time-submit"
              >
                Log entry
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice unbilled time dialog */}
      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invoice unbilled time</DialogTitle>
            <DialogDescription>
              Creates a draft invoice from this week's unbilled time. It won't
              be sent automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium">
              Default hourly rate ($)
              <input
                className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                type="number"
                value={defaultRate}
                onChange={(e) => setDefaultRate(e.target.value)}
                data-testid="invoice-rate"
              />
            </label>
            <p className="text-xs text-muted-foreground">
              Entries with a per-entry rate use that rate. Others fall back to this default.
              {unbilledCount} unbilled entries will be invoiced.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setInvoiceOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={invoiceMutation.isPending}
                onClick={() => invoiceMutation.mutate()}
                data-testid="invoice-submit"
              >
                <Clock className="size-4" /> Create draft invoice
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
