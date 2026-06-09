import { useEffect } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CheckCircle2,
  MessageSquare,
  Phone,
  PhoneIncoming,
  Settings2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../primitives/card";
import { useHomeCallbackApi } from "../../hooks/useHomeCallbackApi";
import type {
  CallbackCardDTO,
  CallbackConfig,
  CallbackRecoveryStats,
} from "../../api/home-callback";
import { ApiError } from "../../api/client";
import {
  CALLBACK_MODE_LABELS,
  CALLBACK_STATUS_LABELS,
  JOB_VALUE_BAND_LABELS,
  URGENCY_LABELS,
  labelFor,
} from "../labels";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const CALLBACK_QUEUE_KEY = ["home-services", "callbacks", "queue"] as const;
export const CALLBACK_RECOVERY_STATS_KEY = [
  "home-services",
  "callbacks",
  "recovery-stats",
] as const;
export const CALLBACK_CONFIG_KEY = [
  "home-services",
  "callbacks",
  "config",
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Urgency drives the badge's visual weight. */
function urgencyBadgeVariant(
  urgency: string | null | undefined,
): "destructive" | "default" | "secondary" | "muted" {
  switch (urgency) {
    case "EMERGENCY":
      return "destructive";
    case "URGENT":
      return "default";
    case "ROUTINE":
      return "secondary";
    default:
      return "muted";
  }
}

/** Revenue score band: show a $ indicator so a dispatcher sees the value instantly. */
function revenueScoreBand(score: number): string {
  if (score >= 80) return "$$$";
  if (score >= 50) return "$$";
  return "$";
}

// ---------------------------------------------------------------------------
// Config form schema
// ---------------------------------------------------------------------------

const configSchema = z.object({
  offerMessage: z.string().nullable(),
  immediateConfirmMessage: z.string().nullable(),
  scheduledConfirmMessage: z.string().nullable(),
});

type ConfigFormValues = z.infer<typeof configSchema>;

function configToFormValues(config: CallbackConfig | null): ConfigFormValues {
  return {
    offerMessage: config?.offerMessage ?? null,
    immediateConfirmMessage: config?.immediateConfirmMessage ?? null,
    scheduledConfirmMessage: config?.scheduledConfirmMessage ?? null,
  };
}

function nullIfBlank(v: string | null): string | null {
  if (v === null) return null;
  const trimmed = v.trim();
  return trimmed.length === 0 ? null : trimmed;
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function RecoveryStat({
  icon: Icon,
  label,
  value,
  testid,
  highlight,
}: {
  icon: typeof Phone;
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
// Recovery stats panel
// ---------------------------------------------------------------------------

function RecoveryStatsPanel() {
  const api = useHomeCallbackApi();

  const {
    data: stats,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<CallbackRecoveryStats>({
    queryKey: CALLBACK_RECOVERY_STATS_KEY,
    queryFn: () => api.getRecoveryStats(),
  });

  if (isLoading) {
    return (
      <p
        className="text-sm text-muted-foreground"
        data-testid="callback-recovery-stats-loading"
      >
        Loading recovery stats…
      </p>
    );
  }

  if (isError) {
    return (
      <div
        className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
        data-testid="callback-recovery-stats-error"
      >
        <p className="text-sm text-foreground">
          We couldn't load the recovery stats.
          {error instanceof Error ? ` ${error.message}` : ""}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
          data-testid="callback-recovery-stats-retry"
        >
          {isRefetching ? "Retrying…" : "Try again"}
        </Button>
      </div>
    );
  }

  if (!stats) return null;

  const noData = stats.offered === 0;
  const acceptancePct = (stats.acceptanceRate * 100).toFixed(0);
  const dispatchPct = (stats.dispatchRate * 100).toFixed(0);

  return (
    <div className="flex flex-col gap-4" data-testid="callback-recovery-stats-panel">
      {noData ? (
        <div
          className="rounded-md border border-dashed p-6 text-center"
          data-testid="callback-recovery-stats-no-data"
        >
          <p className="text-sm text-muted-foreground">
            No callback offers sent yet. Recovery stats will appear once the
            system starts offering callbacks to after-hours callers.
          </p>
        </div>
      ) : (
        <div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          data-testid="callback-recovery-stats-grid"
        >
          <RecoveryStat
            icon={Phone}
            label="Offered"
            value={stats.offered.toLocaleString()}
            testid="callback-stat-offered"
          />
          <RecoveryStat
            icon={CheckCircle2}
            label="Accepted"
            value={stats.accepted.toLocaleString()}
            testid="callback-stat-accepted"
          />
          <RecoveryStat
            icon={PhoneIncoming}
            label="Dispatched"
            value={stats.dispatched.toLocaleString()}
            testid="callback-stat-dispatched"
            highlight
          />
          <RecoveryStat
            icon={TrendingUp}
            label="Acceptance rate"
            value={`${acceptancePct}%`}
            testid="callback-stat-acceptance-rate"
          />
          <RecoveryStat
            icon={TrendingUp}
            label="Dispatch rate"
            value={`${dispatchPct}%`}
            testid="callback-stat-dispatch-rate"
            highlight
          />
        </div>
      )}

      {!noData && (
        <p
          className="text-xs text-muted-foreground"
          data-testid="callback-recovery-stats-footer"
        >
          {stats.offered.toLocaleString()} offered ·{" "}
          {stats.accepted.toLocaleString()} accepted ({acceptancePct}%) ·{" "}
          {stats.dispatched.toLocaleString()} dispatched ({dispatchPct}%)
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Config card
// ---------------------------------------------------------------------------

function CallbackConfigCard({
  config,
  onSaved,
}: {
  config: CallbackConfig | null;
  onSaved: () => void;
}) {
  const api = useHomeCallbackApi();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema),
    defaultValues: configToFormValues(config),
  });

  useEffect(() => {
    reset(configToFormValues(config));
  }, [config, reset]);

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (values: ConfigFormValues) =>
      api.saveConfig({
        offerMessage: nullIfBlank(values.offerMessage),
        immediateConfirmMessage: nullIfBlank(values.immediateConfirmMessage),
        scheduledConfirmMessage: nullIfBlank(values.scheduledConfirmMessage),
      }),
    onSuccess: (saved) => {
      toast.success("Callback settings saved.");
      reset(configToFormValues(saved));
      queryClient.invalidateQueries({ queryKey: CALLBACK_CONFIG_KEY });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 400) {
        toast.error("One or more fields couldn't be saved. Check the form and try again.");
      } else if (err instanceof ApiError) {
        toast.error(`Couldn't save settings (${err.status}).`);
      } else {
        toast.error("Couldn't save settings. Please try again.");
      }
    },
    onSettled: onSaved,
  });

  return (
    <Card data-testid="callback-config-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings2 className="size-4 text-muted-foreground" />
          Callback message copy
        </CardTitle>
        <CardDescription>
          The SMS messages the system sends to callers. Leave any field blank to
          use the default copy — you only need to fill these in to customize.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit((v) => save(v))}
          className="flex flex-col gap-6"
          data-testid="callback-config-form"
        >
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="offer-message"
              className="flex items-center gap-1.5 text-sm font-medium"
            >
              <MessageSquare className="size-4 text-muted-foreground" />
              Opt-in offer message
            </label>
            <p className="text-xs text-muted-foreground">
              Sent to the caller right after their voicemail. Invites them to
              request a callback. Leave blank to use the default.
            </p>
            <textarea
              id="offer-message"
              rows={2}
              placeholder="We saw you called — would you like us to call you back? Reply YES for now or tell us a time that works."
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              data-testid="offer-message-input"
              {...register("offerMessage")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="immediate-confirm"
              className="flex items-center gap-1.5 text-sm font-medium"
            >
              <PhoneIncoming className="size-4 text-muted-foreground" />
              Immediate callback confirmation
            </label>
            <p className="text-xs text-muted-foreground">
              Sent when a caller asks for a call right now. Leave blank to use
              the default.
            </p>
            <textarea
              id="immediate-confirm"
              rows={2}
              placeholder="Got it — someone will call you back shortly."
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              data-testid="immediate-confirm-input"
              {...register("immediateConfirmMessage")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="scheduled-confirm"
              className="flex items-center gap-1.5 text-sm font-medium"
            >
              <PhoneIncoming className="size-4 text-muted-foreground" />
              Scheduled callback confirmation
            </label>
            <p className="text-xs text-muted-foreground">
              Sent when a caller names a time window. Leave blank to use the
              default.
            </p>
            <textarea
              id="scheduled-confirm"
              rows={2}
              placeholder="Noted — we'll call you back during that window."
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              data-testid="scheduled-confirm-input"
              {...register("scheduledConfirmMessage")}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={saving || !isDirty}
              data-testid="callback-config-save-btn"
            >
              <CheckCircle2 className="size-4" />
              {saving ? "Saving…" : "Save settings"}
            </Button>
            {!isDirty && !saving && config !== null && (
              <span
                className="text-xs text-muted-foreground"
                data-testid="callback-config-saved-note"
              >
                Settings are up to date.
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Callback card (one item in the ranked queue)
// ---------------------------------------------------------------------------

function CallbackCard({ card }: { card: CallbackCardDTO }) {
  const qc = useQueryClient();
  const api = useHomeCallbackApi();
  const isDispatched = card.status === "DISPATCHED";

  const dispatch = useMutation({
    mutationFn: () => api.dispatch(card.id),
    onSuccess: (updated) => {
      // Optimistically update the queue card immediately.
      qc.setQueryData<CallbackCardDTO[]>(CALLBACK_QUEUE_KEY, (prev) =>
        prev
          ? prev.map((c) => (c.id === updated.id ? updated : c))
          : prev,
      );
      qc.invalidateQueries({ queryKey: CALLBACK_QUEUE_KEY });
      qc.invalidateQueries({ queryKey: CALLBACK_RECOVERY_STATS_KEY });
      toast.success("Callback dispatched — it's claimed in your queue.");
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        toast.error(
          "This callback has already been dispatched — refreshing the queue.",
        );
        qc.invalidateQueries({ queryKey: CALLBACK_QUEUE_KEY });
      } else {
        toast.error(
          err instanceof Error
            ? err.message
            : "Couldn't dispatch this callback.",
        );
      }
    },
  });

  const scoreBand = revenueScoreBand(card.revenueScore);

  return (
    <Card
      data-testid="callback-card"
      data-urgency={card.urgency ?? "UNTRIAGED"}
      data-status={card.status}
      data-revenue-score={card.revenueScore}
      className={card.urgency === "EMERGENCY" ? "border-destructive/50" : undefined}
    >
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <PhoneIncoming className="size-4 text-muted-foreground" />
              <span data-testid="callback-phone">{card.fromPhone}</span>
            </CardTitle>
            {card.mode && (
              <span className="text-xs text-muted-foreground">
                {labelFor(CALLBACK_MODE_LABELS, card.mode)}
                {card.requestedWindowText
                  ? ` · ${card.requestedWindowText}`
                  : null}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {card.urgency && (
              <Badge
                variant={urgencyBadgeVariant(card.urgency)}
                data-testid="callback-urgency"
              >
                {labelFor(URGENCY_LABELS, card.urgency, "Needs triage")}
              </Badge>
            )}
            {card.jobValueBand && (
              <Badge variant="muted" data-testid="callback-value-band">
                {labelFor(JOB_VALUE_BAND_LABELS, card.jobValueBand)}
              </Badge>
            )}
            <Badge
              variant={isDispatched ? "secondary" : "outline"}
              data-testid="callback-status"
            >
              {labelFor(CALLBACK_STATUS_LABELS, card.status)}
            </Badge>
            <Badge
              variant="outline"
              className="font-mono tabular-nums"
              data-testid="callback-revenue-score"
            >
              {scoreBand}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {card.summaryLine ? (
          <p
            className="text-sm text-foreground"
            data-testid="callback-summary"
          >
            {card.summaryLine}
          </p>
        ) : (
          <p className="text-sm italic text-muted-foreground">
            No summary available — check the voicemail for details.
          </p>
        )}

        {card.createdAt && (
          <span className="text-xs text-muted-foreground">
            Requested {new Date(card.createdAt).toLocaleString()}
          </span>
        )}
      </CardContent>

      <div className="flex items-center gap-2 px-6 pb-6">
        <Button
          onClick={() => dispatch.mutate()}
          disabled={dispatch.isPending || isDispatched}
          data-testid="callback-dispatch-btn"
        >
          <Phone className="size-4" />
          {dispatch.isPending
            ? "Dispatching…"
            : isDispatched
              ? "Dispatched"
              : "Dispatch"}
        </Button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Ranked callback queue section
// ---------------------------------------------------------------------------

function RankedQueueSection() {
  const api = useHomeCallbackApi();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<CallbackCardDTO[]>({
    queryKey: CALLBACK_QUEUE_KEY,
    queryFn: () => api.listQueue(),
  });

  const pendingCount = (data ?? []).filter((c) => c.status === "REQUESTED").length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Revenue-ranked queue
        </span>
        {pendingCount > 0 && (
          <Badge variant="secondary" data-testid="callback-queue-count">
            {pendingCount} waiting
          </Badge>
        )}
      </div>

      {isLoading ? (
        <p
          className="text-sm text-muted-foreground"
          data-testid="callback-queue-loading"
        >
          Loading callbacks…
        </p>
      ) : isError ? (
        <div
          className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
          data-testid="callback-queue-error"
        >
          <p className="text-sm text-foreground">
            We couldn't load the callback queue.
            {error instanceof Error ? ` ${error.message}` : ""}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            data-testid="callback-queue-retry"
          >
            {isRefetching ? "Retrying…" : "Try again"}
          </Button>
        </div>
      ) : !data || data.length === 0 ? (
        <div
          className="rounded-md border border-dashed p-8 text-center"
          data-testid="callback-queue-empty"
        >
          <p className="text-sm text-muted-foreground">
            Queue is clear. New callback requests from after-hours callers will
            appear here, ranked by revenue potential.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4" data-testid="callback-queue-list">
          {data.map((card) => (
            <CallbackCard key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

/**
 * Home Services T5 "Instant Callback" — the dispatcher's surface:
 *
 * 1. Revenue-ranked callback queue: open REQUESTED callbacks sorted by
 *    revenueScore (highest = highest value job first). Each card shows the
 *    phone, urgency badge, job-value band, AI summary, and a one-click
 *    Dispatch button that transitions the card to DISPATCHED and updates the
 *    recovery stats.
 *
 * 2. Recovery stats panel: the missed-call → callback funnel counters
 *    (offered / accepted / dispatched + the two conversion rates).
 *
 * 3. Config card (ADMIN): the per-tenant SMS copy book — the opt-in offer
 *    message and the immediate/scheduled confirmation replies. 4401/404 on
 *    the config GET renders a friendly "not yet configured" empty state above
 *    the blank form so the admin can do initial setup.
 *
 * Rendered behind RequireNotContractor grouped with the other Home Services
 * surfaces (the T4 SwitchboardPanel / T2 RevenueReviveDashboard precedent).
 */
export function CallbackQueue() {
  const api = useHomeCallbackApi();

  // Config — 4401/404 is the "not configured yet" path, not an error.
  const {
    data: config,
    isLoading: configLoading,
    isError: configIsError,
    error: configError,
    refetch: refetchConfig,
    isRefetching: configRefetching,
  } = useQuery<CallbackConfig | null>({
    queryKey: CALLBACK_CONFIG_KEY,
    queryFn: async () => {
      try {
        return await api.getConfig();
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          return null; // 4401 — not configured yet
        }
        throw err;
      }
    },
  });

  return (
    <section
      className="flex flex-col gap-8"
      data-testid="callback-queue-page"
    >
      {/* Header */}
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-medium">
          <PhoneIncoming className="size-6 text-muted-foreground" />
          Callback Queue
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          After-hours callers who asked for a callback, ranked by revenue
          potential. Highest-value jobs are at the top — dispatch down the list.
        </p>
      </header>

      {/* Ranked queue */}
      <RankedQueueSection />

      {/* Recovery stats */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Recovery funnel
        </h2>
        <RecoveryStatsPanel />
      </div>

      {/* Config card */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Message copy
        </h2>
        {configLoading ? (
          <p
            className="text-sm text-muted-foreground"
            data-testid="callback-config-loading"
          >
            Loading settings…
          </p>
        ) : configIsError &&
          !(configError instanceof ApiError && configError.status === 404) ? (
          <div
            className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
            data-testid="callback-config-error"
          >
            <p className="text-sm text-foreground">
              We couldn't load the message settings.
              {configError instanceof Error
                ? ` ${configError.message}`
                : ""}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchConfig()}
              disabled={configRefetching}
              data-testid="callback-config-retry"
            >
              {configRefetching ? "Retrying…" : "Try again"}
            </Button>
          </div>
        ) : (
          <>
            {config === null && (
              <div
                className="rounded-md border border-dashed p-4 text-sm text-muted-foreground"
                data-testid="callback-config-empty-state"
              >
                The callback messages haven't been customized yet. Fill in the
                form below to override the defaults — the system works right
                away with the built-in copy if you skip this.
              </div>
            )}
            <CallbackConfigCard
              config={config ?? null}
              onSaved={() => {
                /* mutation handles invalidation */
              }}
            />
          </>
        )}
      </div>
    </section>
  );
}
