import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  BarChart2,
  Calendar,
  CheckCircle2,
  ClipboardList,
  MapPin,
  ShieldAlert,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../primitives/card";
import { useDispatchApi } from "../../hooks/useDispatchApi";
import type {
  DispatchAnalytics,
  DispatchPlan,
  ProposedAssignment,
} from "../../api/dispatch";
import {
  DISPATCH_JOB_VALUE_LABELS,
  DISPATCH_URGENCY_LABELS,
  labelFor,
} from "../labels";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const DISPATCH_PLAN_KEY = (date: string) =>
  ["dispatch", "optimize", date] as const;
export const DISPATCH_ANALYTICS_KEY = (date: string) =>
  ["dispatch", "analytics", date] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function scoreColor(score: number): string {
  if (score >= 0.75) return "text-green-600 dark:text-green-400";
  if (score >= 0.5) return "text-yellow-600 dark:text-yellow-400";
  return "text-muted-foreground";
}

function pct(n: number): string {
  return `${(n * 100).toFixed(0)}%`;
}

// ---------------------------------------------------------------------------
// Urgency badge
// ---------------------------------------------------------------------------

function UrgencyBadge({ urgency }: { urgency: string | null }) {
  if (!urgency) return null;
  const label = labelFor(DISPATCH_URGENCY_LABELS, urgency);
  const cls =
    urgency === "EMERGENCY"
      ? "border-red-500/50 text-red-600 dark:text-red-400"
      : urgency === "URGENT"
        ? "border-yellow-500/50 text-yellow-600 dark:text-yellow-400"
        : "border-input text-muted-foreground";
  return (
    <Badge
      variant="outline"
      className={`text-xs ${cls}`}
      data-testid="dispatch-urgency-badge"
    >
      {urgency === "EMERGENCY" && (
        <ShieldAlert className="mr-1 size-3 shrink-0" />
      )}
      {label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Proposed assignment row
// ---------------------------------------------------------------------------

function AssignmentRow({ a }: { a: ProposedAssignment }) {
  return (
    <tr
      className="border-b last:border-b-0 hover:bg-muted/30"
      data-testid="dispatch-assignment-row"
      data-wo-id={a.workOrderId}
    >
      {/* Job info */}
      <td className="px-3 py-2">
        <div className="flex flex-col gap-0.5">
          <span
            className="text-sm font-medium"
            data-testid="dispatch-wo-title"
          >
            {a.title ?? a.workOrderNumber ?? a.workOrderId.slice(0, 8)}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="text-xs text-muted-foreground"
              data-testid="dispatch-service-type"
            >
              {a.serviceType}
            </span>
            {a.jobValueBand && (
              <Badge
                variant="outline"
                className="text-xs"
                data-testid="dispatch-job-value-badge"
              >
                {labelFor(DISPATCH_JOB_VALUE_LABELS, a.jobValueBand)}
              </Badge>
            )}
          </div>
        </div>
      </td>

      {/* Urgency */}
      <td className="px-3 py-2">
        <UrgencyBadge urgency={a.urgency} />
      </td>

      {/* Assigned tech */}
      <td className="px-3 py-2">
        <div className="flex flex-col gap-0.5">
          <span
            className="text-sm"
            data-testid="dispatch-tech-name"
          >
            {a.assignedTechName ?? "—"}
          </span>
          {/* Skill-matched badge */}
          {a.assignedTechUserId && (
            <Badge
              variant={a.skillMatched ? "secondary" : "outline"}
              className={`w-fit text-xs ${
                a.skillMatched
                  ? "text-green-700 dark:text-green-400"
                  : "text-muted-foreground"
              }`}
              data-testid="dispatch-skill-badge"
            >
              {a.skillMatched ? "Skill matched" : "Skill gap"}
            </Badge>
          )}
        </div>
      </td>

      {/* Fit score */}
      <td className="px-3 py-2 tabular-nums">
        <span
          className={`text-sm font-medium ${scoreColor(a.score)}`}
          data-testid="dispatch-fit-score"
        >
          {pct(a.score)}
        </span>
      </td>

      {/* Rationale */}
      <td className="px-3 py-2 max-w-xs">
        <p
          className="text-xs text-muted-foreground"
          data-testid="dispatch-rationale"
        >
          {a.rationale}
        </p>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Assignments table
// ---------------------------------------------------------------------------

function AssignmentsTable({ assignments }: { assignments: ProposedAssignment[] }) {
  if (assignments.length === 0) {
    return (
      <div
        className="rounded-md border border-dashed p-8 text-center"
        data-testid="dispatch-assignments-empty"
      >
        <ClipboardList className="mx-auto mb-2 size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No assignable jobs for this day.
        </p>
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-md border"
      data-testid="dispatch-assignments-table"
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
            <th className="px-3 py-2 text-left font-medium">Job</th>
            <th className="px-3 py-2 text-left font-medium">Urgency</th>
            <th className="px-3 py-2 text-left font-medium">Technician</th>
            <th className="px-3 py-2 text-left font-medium">Fit</th>
            <th className="px-3 py-2 text-left font-medium">Rationale</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((a) => (
            <AssignmentRow key={a.workOrderId} a={a} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Unassigned section
// ---------------------------------------------------------------------------

function UnassignedSection({ unassigned }: { unassigned: ProposedAssignment[] }) {
  if (unassigned.length === 0) return null;

  return (
    <section
      className="flex flex-col gap-3"
      data-testid="dispatch-unassigned-section"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4 text-yellow-500" />
        <h2 className="text-base font-medium">
          Unassigned ({unassigned.length})
        </h2>
        <p className="text-xs text-muted-foreground">
          — no available technician could be matched
        </p>
      </div>

      <div
        className="flex flex-col gap-2"
        data-testid="dispatch-unassigned-list"
      >
        {unassigned.map((a) => (
          <div
            key={a.workOrderId}
            className="flex flex-col gap-1 rounded-md border border-yellow-500/30 bg-yellow-500/5 px-4 py-3"
            data-testid="dispatch-unassigned-item"
            data-wo-id={a.workOrderId}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="text-sm font-medium"
                data-testid="dispatch-unassigned-title"
              >
                {a.title ?? a.workOrderNumber ?? a.workOrderId.slice(0, 8)}
              </span>
              <UrgencyBadge urgency={a.urgency} />
              {a.jobValueBand && (
                <Badge
                  variant="outline"
                  className="text-xs"
                >
                  {labelFor(DISPATCH_JOB_VALUE_LABELS, a.jobValueBand)}
                </Badge>
              )}
            </div>
            <p
              className="text-xs text-muted-foreground"
              data-testid="dispatch-unassigned-reason"
            >
              {a.unassignedReason ?? "No eligible technician available."}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Analytics card
// ---------------------------------------------------------------------------

function AnalyticsCard({ date }: { date: string }) {
  const api = useDispatchApi();

  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery<DispatchAnalytics>({
    queryKey: DISPATCH_ANALYTICS_KEY(date),
    queryFn: () => api.analytics(date),
    enabled: !!date,
  });

  return (
    <Card data-testid="dispatch-analytics-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart2 className="size-4 text-muted-foreground" />
          Dispatch analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p
            className="text-sm text-muted-foreground"
            data-testid="dispatch-analytics-loading"
          >
            Loading analytics…
          </p>
        ) : isError ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-foreground">
              We couldn&apos;t load the analytics.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              {isRefetching ? "Retrying…" : "Try again"}
            </Button>
          </div>
        ) : data ? (
          <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
            data-testid="dispatch-analytics-stats"
          >
            <StatTile
              label="Total open"
              value={String(data.totalOpen)}
              testId="dispatch-stat-total-open"
            />
            <StatTile
              label="Assigned"
              value={String(data.assigned)}
              testId="dispatch-stat-assigned"
            />
            <StatTile
              label="Unassigned"
              value={String(data.unassigned)}
              testId="dispatch-stat-unassigned"
            />
            <StatTile
              label="Skill-matched"
              value={String(data.skillMatched)}
              testId="dispatch-stat-skill-matched"
            />
            <StatTile
              label="Skill-match rate"
              value={pct(data.skillMatchRate)}
              testId="dispatch-stat-skill-match-rate"
            />
            <StatTile
              label="Avg fit score"
              value={pct(data.avgFitScore)}
              testId="dispatch-stat-avg-fit"
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function StatTile({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xl font-semibold tabular-nums" data-testid={testId}>
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Apply result banner
// ---------------------------------------------------------------------------

function ApplyResultBanner({
  applied,
  skipped,
  onDismiss,
}: {
  applied: number;
  skipped: number;
  onDismiss: () => void;
}) {
  return (
    <div
      className="flex items-start justify-between gap-4 rounded-md border border-green-500/30 bg-green-500/5 px-4 py-3"
      data-testid="dispatch-apply-result"
    >
      <div className="flex items-center gap-2">
        <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
        <p className="text-sm text-foreground">
          {applied > 0
            ? `Plan applied — ${applied} work order${applied !== 1 ? "s" : ""} assigned.`
            : "Plan already applied — all assignments are up to date."}
          {skipped > 0 && (
            <span className="ml-1 text-muted-foreground">
              ({skipped} already at target, skipped)
            </span>
          )}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onDismiss}
        data-testid="dispatch-apply-result-dismiss"
      >
        Dismiss
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main DispatchConsole
// ---------------------------------------------------------------------------

/**
 * Home Services T14 "DispatchIQ" — the dispatcher optimize console:
 *
 * 1. Date picker → GET /dispatch/optimize → shows the AI-proposed tech
 *    assignments (table with urgency / skill-matched badge / fit score /
 *    rationale), and a separate Unassigned section (each with unassignedReason).
 *
 * 2. "Apply plan" button → POST /dispatch/apply (with Idempotency-Key per
 *    @IdempotentRoute) → shows applied/skipped result banner.
 *
 * 3. Dispatch analytics card → GET /dispatch/analytics (total open / assigned /
 *    unassigned / skill-matched / skill-match rate / avg fit).
 *
 * Rendered behind RequireNotContractor grouped with the other Home Services
 * surfaces (the T13 TechCopilotPanel / T11 QuoteCloserSettings precedent).
 */
export function DispatchConsole() {
  const api = useDispatchApi();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState<string>(todayIso());
  const [applyResult, setApplyResult] = useState<{
    applied: number;
    skipped: number;
  } | null>(null);

  // Optimize query — fires whenever selectedDate changes
  const {
    data: plan,
    isLoading: planLoading,
    isError: planError,
    error: planErrorObj,
    refetch: refetchPlan,
    isRefetching: planRefetching,
  } = useQuery<DispatchPlan>({
    queryKey: DISPATCH_PLAN_KEY(selectedDate),
    queryFn: () => api.optimize(selectedDate),
    enabled: !!selectedDate,
  });

  // Apply mutation
  const applyMutation = useMutation({
    mutationFn: () => {
      if (!plan) throw new Error("No plan to apply.");
      const decisions = plan.assignments
        .filter((a) => a.assignedTechUserId)
        .map((a) => ({
          workOrderId: a.workOrderId,
          techUserId: a.assignedTechUserId!,
        }));
      return api.apply({ date: selectedDate, assignments: decisions });
    },
    onSuccess: (result) => {
      setApplyResult(result);
      // Invalidate analytics so it refreshes after apply
      void queryClient.invalidateQueries({
        queryKey: DISPATCH_ANALYTICS_KEY(selectedDate),
      });
      toast.success(
        result.applied > 0
          ? `${result.applied} work order${result.applied !== 1 ? "s" : ""} assigned.`
          : "Plan already applied.",
      );
    },
    onError: () => {
      toast.error("Couldn't apply the plan — please try again.");
    },
  });

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    setApplyResult(null);
  };

  return (
    <section
      className="flex flex-col gap-8"
      data-testid="dispatch-console"
    >
      {/* Header */}
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-medium">
          <Zap className="size-6 text-muted-foreground" />
          Dispatch
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Pick a date to see the AI-proposed tech assignments. Review the
          rationale and fit scores, then apply the plan to commit the
          assignments.
        </p>
      </header>

      {/* Date picker */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="size-4 text-muted-foreground" />
            Optimize for date
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="dispatch-date-picker"
                className="text-sm font-medium"
              >
                Date
              </label>
              <input
                id="dispatch-date-picker"
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                data-testid="dispatch-date-input"
              />
            </div>
            {selectedDate && (
              <p className="text-sm text-muted-foreground pb-1">
                {formatDate(selectedDate)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plan section */}
      {selectedDate && (
        <section className="flex flex-col gap-6" data-testid="dispatch-plan-section">
          {planLoading ? (
            <p
              className="text-sm text-muted-foreground"
              data-testid="dispatch-plan-loading"
            >
              Loading optimize plan…
            </p>
          ) : planError ? (
            <div
              className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
              data-testid="dispatch-plan-error"
            >
              <p className="text-sm text-foreground">
                We couldn&apos;t load the dispatch plan.
                {planErrorObj instanceof Error
                  ? ` ${planErrorObj.message}`
                  : ""}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchPlan()}
                disabled={planRefetching}
              >
                {planRefetching ? "Retrying…" : "Try again"}
              </Button>
            </div>
          ) : plan ? (
            <>
              {/* Summary bar */}
              <div
                className="flex flex-wrap items-center gap-4 rounded-md border bg-muted/30 px-4 py-3"
                data-testid="dispatch-plan-summary"
              >
                <SummaryChip
                  icon={<ClipboardList className="size-3.5" />}
                  label="Open"
                  value={plan.openCount}
                />
                <SummaryChip
                  icon={<Users className="size-3.5" />}
                  label="Assigned"
                  value={plan.assignedCount}
                />
                <SummaryChip
                  icon={<AlertTriangle className="size-3.5 text-yellow-500" />}
                  label="Unassigned"
                  value={plan.unassignedCount}
                />
                <SummaryChip
                  icon={<Activity className="size-3.5 text-green-600 dark:text-green-400" />}
                  label="Skill-match rate"
                  value={pct(plan.skillMatchRate)}
                />
                <SummaryChip
                  icon={<MapPin className="size-3.5" />}
                  label="Avg fit"
                  value={pct(plan.avgFitScore)}
                />
              </div>

              {/* Assignments table */}
              <section className="flex flex-col gap-3">
                <h2 className="flex items-center gap-2 text-base font-medium">
                  <Users className="size-4 text-muted-foreground" />
                  Proposed assignments ({plan.assignedCount})
                </h2>
                <AssignmentsTable assignments={plan.assignments} />
              </section>

              {/* Unassigned section */}
              <UnassignedSection unassigned={plan.unassigned} />

              {/* Apply result */}
              {applyResult && (
                <ApplyResultBanner
                  applied={applyResult.applied}
                  skipped={applyResult.skipped}
                  onDismiss={() => setApplyResult(null)}
                />
              )}

              {/* Apply button */}
              {plan.assignedCount > 0 && (
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => applyMutation.mutate()}
                    disabled={applyMutation.isPending}
                    data-testid="dispatch-apply-btn"
                  >
                    {applyMutation.isPending
                      ? "Applying…"
                      : `Apply plan (${plan.assignedCount} assignment${plan.assignedCount !== 1 ? "s" : ""})`}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Commits the AI-proposed assignments to the dispatch board.
                  </p>
                </div>
              )}
            </>
          ) : null}
        </section>
      )}

      {/* Analytics card — always shown when a date is selected */}
      {selectedDate && <AnalyticsCard date={selectedDate} />}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Small helper chip in the summary bar
// ---------------------------------------------------------------------------

function SummaryChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-1.5 text-sm">
      {icon}
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
