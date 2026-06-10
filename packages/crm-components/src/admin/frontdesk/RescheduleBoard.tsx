import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CalendarCheck,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  ListPlus,
  MessageSquare,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "../../primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../primitives/card";
import { Badge } from "../../primitives/badge";
import { useRescheduleApi } from "../../hooks/useRescheduleApi";
import type {
  RescheduleFillStats,
  WaitlistEntry,
} from "../../api/reschedule";
import { ApiError } from "../../api/client";
import { WAITLIST_ENTRY_STATUS_LABELS, labelFor } from "../labels";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const RESCHEDULE_WAITLIST_KEY = [
  "frontdesk",
  "reschedule",
  "waitlist",
] as const;
export const RESCHEDULE_FILL_STATS_KEY = [
  "frontdesk",
  "reschedule",
  "fill-stats",
] as const;

// ---------------------------------------------------------------------------
// Join-waitlist form schema
// ---------------------------------------------------------------------------

const joinSchema = z.object({
  contactId: z.string().trim().min(1, "Contact ID is required"),
  providerId: z.string().trim().nullable(),
  earliestStart: z.string().nullable(),
  latestStart: z.string().nullable(),
  smsOptIn: z.boolean(),
  notes: z.string().trim().nullable(),
  priorNoShowCount: z.number().int().min(0).nullable(),
  priorVisitCount: z.number().int().min(0).nullable(),
});

type JoinFormValues = z.infer<typeof joinSchema>;

function nullIfBlank(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

// ---------------------------------------------------------------------------
// Fill-funnel stat card
// ---------------------------------------------------------------------------

function FillStat({
  icon: Icon,
  label,
  value,
  testid,
  highlight,
}: {
  icon: typeof CalendarRange;
  label: string;
  value: string;
  testid: string;
  highlight?: boolean;
}) {
  return (
    <Card
      data-testid={testid}
      className={highlight ? "border-primary/40" : undefined}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon className="size-4" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">
          <span data-testid={`${testid}-value`}>{value}</span>
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Fill-rate stats panel
// ---------------------------------------------------------------------------

function FillStatsPanel() {
  const api = useRescheduleApi();

  const {
    data: stats,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<RescheduleFillStats>({
    queryKey: RESCHEDULE_FILL_STATS_KEY,
    queryFn: () => api.getFillStats(),
  });

  if (isLoading) {
    return (
      <p
        className="text-sm text-muted-foreground"
        data-testid="reschedule-stats-loading"
      >
        Loading fill-rate stats…
      </p>
    );
  }

  if (isError) {
    return (
      <div
        className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
        data-testid="reschedule-stats-error"
      >
        <p className="text-sm text-foreground">
          We couldn't load the fill-rate stats.
          {error instanceof Error ? ` ${error.message}` : ""}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
          data-testid="reschedule-stats-retry"
        >
          {isRefetching ? "Retrying…" : "Try again"}
        </Button>
      </div>
    );
  }

  if (!stats) return null;

  const noData = stats.cancellations === 0;
  const fillRatePct = (stats.fillRate * 100).toFixed(0);

  return (
    <div className="flex flex-col gap-4" data-testid="reschedule-stats-panel">
      {noData ? (
        <div
          className="rounded-md border border-dashed p-6 text-center"
          data-testid="reschedule-stats-no-data"
        >
          <p className="text-sm text-muted-foreground">
            No cancellations tracked yet. Fill-rate stats will appear once the
            gap-fill engine starts running.
          </p>
        </div>
      ) : (
        <div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          data-testid="reschedule-stats-grid"
        >
          <FillStat
            icon={CalendarRange}
            label="Cancellations"
            value={stats.cancellations.toLocaleString()}
            testid="reschedule-stat-cancellations"
          />
          <FillStat
            icon={MessageSquare}
            label="Offers sent"
            value={stats.offers.toLocaleString()}
            testid="reschedule-stat-offers"
          />
          <FillStat
            icon={CheckCircle2}
            label="Claims"
            value={stats.claims.toLocaleString()}
            testid="reschedule-stat-claims"
          />
          <FillStat
            icon={CalendarCheck}
            label="Slots filled"
            value={stats.filled.toLocaleString()}
            testid="reschedule-stat-filled"
            highlight
          />
        </div>
      )}

      {!noData && (
        <>
          <Card
            data-testid="reschedule-stat-fill-rate"
            className="border-primary/40"
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <TrendingUp className="size-4" />
                Fill rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">
                <span data-testid="reschedule-stat-fill-rate-value">
                  {fillRatePct}%
                </span>
              </p>
            </CardContent>
          </Card>

          <p
            className="text-xs text-muted-foreground"
            data-testid="reschedule-stats-footer"
          >
            {stats.cancellations.toLocaleString()} cancellations ·{" "}
            {stats.offers.toLocaleString()} offers sent ·{" "}
            {stats.claims.toLocaleString()} claimed ·{" "}
            {stats.filled.toLocaleString()} slots filled ({fillRatePct}% fill
            rate)
          </p>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Waitlist table — one row per waiting patient
// ---------------------------------------------------------------------------

function WaitlistRow({ entry }: { entry: WaitlistEntry }) {
  const statusLabel = labelFor(WAITLIST_ENTRY_STATUS_LABELS, entry.status);

  return (
    <tr
      data-testid="waitlist-row"
      data-status={entry.status}
      className="border-b last:border-0"
    >
      <td className="py-3 pr-4 text-sm font-mono text-muted-foreground">
        <span data-testid="waitlist-row-contact">
          {entry.contactId.slice(0, 8)}…
        </span>
      </td>
      <td className="py-3 pr-4 text-sm text-muted-foreground">
        {entry.providerId ? (
          <span data-testid="waitlist-row-provider">
            {entry.providerId.slice(0, 8)}…
          </span>
        ) : (
          <span className="italic text-muted-foreground/60">Any provider</span>
        )}
      </td>
      <td className="py-3 pr-4 text-sm">
        {entry.earliestStart || entry.latestStart ? (
          <span data-testid="waitlist-row-window">
            {entry.earliestStart
              ? new Date(entry.earliestStart).toLocaleDateString()
              : "—"}{" "}
            →{" "}
            {entry.latestStart
              ? new Date(entry.latestStart).toLocaleDateString()
              : "—"}
          </span>
        ) : (
          <span className="italic text-muted-foreground/60">Open window</span>
        )}
      </td>
      <td className="py-3 pr-4 text-sm">
        <Badge
          variant={entry.smsOptIn ? "secondary" : "muted"}
          data-testid="waitlist-row-sms-opt-in"
        >
          {entry.smsOptIn ? "SMS on" : "SMS off"}
        </Badge>
      </td>
      <td className="py-3 text-sm">
        <Badge
          variant={
            entry.status === "OPEN"
              ? "default"
              : entry.status === "FULFILLED"
                ? "secondary"
                : "muted"
          }
          data-testid="waitlist-row-status"
        >
          {statusLabel}
        </Badge>
      </td>
    </tr>
  );
}

function WaitlistTableSection() {
  const api = useRescheduleApi();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<WaitlistEntry[]>({
    queryKey: RESCHEDULE_WAITLIST_KEY,
    queryFn: () => api.listWaitlist(),
  });

  const openCount = (data ?? []).filter((e) => e.status === "OPEN").length;

  return (
    <div className="flex flex-col gap-4" data-testid="reschedule-waitlist-section">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Waiting patients
        </span>
        {openCount > 0 && (
          <Badge variant="secondary" data-testid="reschedule-waitlist-count">
            {openCount} waiting
          </Badge>
        )}
      </div>

      {isLoading ? (
        <p
          className="text-sm text-muted-foreground"
          data-testid="reschedule-waitlist-loading"
        >
          Loading waitlist…
        </p>
      ) : isError ? (
        <div
          className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
          data-testid="reschedule-waitlist-error"
        >
          <p className="text-sm text-foreground">
            We couldn't load the waitlist.
            {error instanceof Error ? ` ${error.message}` : ""}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            data-testid="reschedule-waitlist-retry"
          >
            {isRefetching ? "Retrying…" : "Try again"}
          </Button>
        </div>
      ) : !data || data.length === 0 ? (
        <div
          className="rounded-md border border-dashed p-8 text-center"
          data-testid="reschedule-waitlist-empty"
        >
          <p className="text-sm text-muted-foreground">
            The waitlist is clear. Patients added here will be offered the next
            available slot when one opens up.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table
            className="w-full"
            data-testid="reschedule-waitlist-table"
          >
            <thead>
              <tr className="border-b bg-muted/30 text-left text-xs font-medium text-muted-foreground">
                <th className="py-2 pr-4 pl-3">Patient</th>
                <th className="py-2 pr-4">Provider</th>
                <th className="py-2 pr-4">Availability window</th>
                <th className="py-2 pr-4">SMS</th>
                <th className="py-2 pr-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y px-3">
              {data.map((entry) => (
                <WaitlistRow key={entry.id} entry={entry} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add-to-waitlist form card
// ---------------------------------------------------------------------------

function AddToWaitlistCard() {
  const api = useRescheduleApi();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isDirty, errors },
  } = useForm<JoinFormValues>({
    resolver: zodResolver(joinSchema),
    defaultValues: {
      contactId: "",
      providerId: null,
      earliestStart: null,
      latestStart: null,
      smsOptIn: true,
      notes: null,
      priorNoShowCount: null,
      priorVisitCount: null,
    },
  });

  const smsOptIn = watch("smsOptIn");

  const { mutate: join, isPending: joining } = useMutation({
    mutationFn: (values: JoinFormValues) => {
      const idempotencyKey = crypto.randomUUID();
      return api.joinWaitlist(
        {
          contactId: values.contactId.trim(),
          providerId: nullIfBlank(values.providerId),
          earliestStart: nullIfBlank(values.earliestStart),
          latestStart: nullIfBlank(values.latestStart),
          smsOptIn: values.smsOptIn,
          notes: nullIfBlank(values.notes),
          priorNoShowCount: values.priorNoShowCount ?? null,
          priorVisitCount: values.priorVisitCount ?? null,
          lastVisitAt: null,
        },
        idempotencyKey,
      );
    },
    onSuccess: () => {
      toast.success("Patient added to the waitlist.");
      reset();
      queryClient.invalidateQueries({ queryKey: RESCHEDULE_WAITLIST_KEY });
      queryClient.invalidateQueries({ queryKey: RESCHEDULE_FILL_STATS_KEY });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 400) {
        toast.error("Couldn't add to the waitlist — check the form and try again.");
      } else if (err instanceof ApiError) {
        toast.error(`Couldn't add to the waitlist (${err.status}).`);
      } else {
        toast.error("Couldn't add to the waitlist. Please try again.");
      }
    },
  });

  return (
    <Card data-testid="reschedule-join-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ListPlus className="size-4 text-muted-foreground" />
          Add a patient to the waitlist
        </CardTitle>
        <CardDescription>
          When an appointment slot opens up, the system will text this patient
          an offer. All fields are logistics-only — no clinical detail belongs
          here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit((v) => join(v))}
          className="flex flex-col gap-6"
          data-testid="reschedule-join-form"
        >
          {/* Contact ID */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="waitlist-contact-id"
              className="flex items-center gap-1.5 text-sm font-medium"
            >
              <ClipboardList className="size-4 text-muted-foreground" />
              Contact ID
              <span className="text-destructive">*</span>
            </label>
            <p className="text-xs text-muted-foreground">
              The patient's CRM contact record ID (UUID). Required.
            </p>
            <input
              id="waitlist-contact-id"
              type="text"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-testid="waitlist-contact-id-input"
              {...register("contactId")}
            />
            {errors.contactId && (
              <p className="text-xs text-destructive">
                {errors.contactId.message}
              </p>
            )}
          </div>

          {/* Provider ID */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="waitlist-provider-id"
              className="text-sm font-medium"
            >
              Provider (optional)
            </label>
            <p className="text-xs text-muted-foreground">
              Leave blank to match any available provider.
            </p>
            <input
              id="waitlist-provider-id"
              type="text"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-testid="waitlist-provider-id-input"
              {...register("providerId")}
            />
          </div>

          {/* Availability window */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="waitlist-earliest-start"
                className="flex items-center gap-1.5 text-sm font-medium"
              >
                <CalendarRange className="size-4 text-muted-foreground" />
                Earliest acceptable date (optional)
              </label>
              <input
                id="waitlist-earliest-start"
                type="datetime-local"
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-testid="waitlist-earliest-start-input"
                {...register("earliestStart")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="waitlist-latest-start"
                className="flex items-center gap-1.5 text-sm font-medium"
              >
                <CalendarRange className="size-4 text-muted-foreground" />
                Latest acceptable date (optional)
              </label>
              <input
                id="waitlist-latest-start"
                type="datetime-local"
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-testid="waitlist-latest-start-input"
                {...register("latestStart")}
              />
            </div>
          </div>

          {/* SMS opt-in */}
          <div className="flex flex-col gap-2">
            <label
              className="flex cursor-pointer items-start gap-3"
              data-testid="waitlist-sms-opt-in-label"
            >
              <input
                type="checkbox"
                className="mt-0.5 size-4 cursor-pointer rounded border"
                data-testid="waitlist-sms-opt-in-checkbox"
                checked={smsOptIn}
                onChange={(e) =>
                  setValue("smsOptIn", e.target.checked, {
                    shouldDirty: true,
                  })
                }
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">SMS consent</span>
                <span className="text-xs text-muted-foreground">
                  The patient has agreed to receive a text offer when a slot
                  opens. Required to receive the offer.
                </span>
              </span>
            </label>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="waitlist-notes"
              className="flex items-center gap-1.5 text-sm font-medium"
            >
              <MessageSquare className="size-4 text-muted-foreground" />
              Scheduling note (optional)
            </label>
            <p className="text-xs text-muted-foreground">
              E.g. "Any afternoon works." Keep this to scheduling logistics — no
              clinical detail.
            </p>
            <textarea
              id="waitlist-notes"
              rows={2}
              placeholder="Any afternoon works for this patient."
              className="w-full resize-none rounded-md border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-testid="waitlist-notes-input"
              {...register("notes")}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={joining || !isDirty}
              data-testid="reschedule-join-btn"
            >
              <ListPlus className="size-4" />
              {joining ? "Adding…" : "Add to waitlist"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

/**
 * Health "RescheduleFlow" (T7) admin board — two sections:
 *
 * 1. Fill-rate stats panel: PHI-free counters for the gap-fill funnel
 *    (cancellations → offers sent → claims → slots filled + fill rate).
 *
 * 2. Waitlist table: each waiting patient with provider preference,
 *    availability window, SMS opt-in status, and lifecycle status.
 *
 * 3. Add-to-waitlist form: POST /frontdesk/reschedule/waitlist with an
 *    Idempotency-Key header (per the T5 dispatch precedent). Logistics-only
 *    fields — no clinical content accepted.
 *
 * PHI-free by construction (fence F1): all fields are scheduling logistics
 * (provider + time window + show-likelihood signals). No diagnosis, procedure,
 * or clinical detail is accepted or surfaced.
 *
 * Rendered behind RequireNotContractor alongside the other FrontDesk IQ surfaces
 * (the T4 SwitchboardPanel / T2 RevenueReviveDashboard precedent). The BE
 * endpoints are ADMIN-guarded (RoleGuard.requireRole("ADMIN"), 1800).
 */
export function RescheduleBoard() {
  return (
    <section
      className="flex flex-col gap-8"
      data-testid="reschedule-board-page"
    >
      {/* Header */}
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-medium">
          <CalendarCheck className="size-6 text-muted-foreground" />
          Reschedule Waitlist
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Patients waiting for an earlier slot. When a cancellation opens up, the
          system ranks the list and texts the best match an offer automatically.
          All data here is scheduling logistics only.
        </p>
      </header>

      {/* Fill-rate stats */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Fill-rate funnel
        </h2>
        <FillStatsPanel />
      </div>

      {/* Waitlist */}
      <WaitlistTableSection />

      {/* Add to waitlist */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Add to waitlist
        </h2>
        <AddToWaitlistCard />
      </div>
    </section>
  );
}
