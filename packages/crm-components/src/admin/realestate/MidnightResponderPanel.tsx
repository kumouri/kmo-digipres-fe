import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Activity,
  CheckCircle2,
  Clock,
  Moon,
  Settings2,
  Zap,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../primitives/select";
import { useRealEstateResponderApi } from "../../hooks/useRealEstateResponderApi";
import { useRealEstateNurtureApi } from "../../hooks/useRealEstateNurtureApi";
import type { MidnightResponderConfig } from "../../api/realestate-responder";
import type { NurtureCampaign } from "../../api/realestate-nurture";
import { ApiError } from "../../api/client";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const RESPONDER_STATS_KEY = [
  "realestate",
  "responder",
  "latency-stats",
] as const;
export const RESPONDER_CONFIG_KEY = [
  "realestate",
  "responder",
  "config",
] as const;

// ---------------------------------------------------------------------------
// Config form schema + helpers
// ---------------------------------------------------------------------------

const configSchema = z.object({
  warmCampaignId: z.string().nullable(),
  coldCampaignId: z.string().nullable(),
  delegateHandoffToResponder: z.boolean(),
  afterHoursStartHour: z
    .number({ coerce: true })
    .int()
    .min(0)
    .max(23),
  afterHoursEndHour: z
    .number({ coerce: true })
    .int()
    .min(0)
    .max(23),
});

type ConfigFormValues = z.infer<typeof configSchema>;

function configToFormValues(
  config: MidnightResponderConfig | null,
): ConfigFormValues {
  return {
    warmCampaignId: config?.warmCampaignId ?? null,
    coldCampaignId: config?.coldCampaignId ?? null,
    delegateHandoffToResponder: config?.delegateHandoffToResponder ?? false,
    afterHoursStartHour: config?.afterHoursStartHour ?? 8,
    afterHoursEndHour: config?.afterHoursEndHour ?? 18,
  };
}

// ---------------------------------------------------------------------------
// Latency stat card
// ---------------------------------------------------------------------------

function LatencyStat({
  icon: Icon,
  label,
  value,
  unit,
  testid,
  highlight,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  unit: string;
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
          <span className="ml-1 text-base font-normal text-muted-foreground">
            {unit}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Latency stats panel
// ---------------------------------------------------------------------------

function LatencyStatsPanel() {
  const api = useRealEstateResponderApi();

  const {
    data: stats,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: RESPONDER_STATS_KEY,
    queryFn: () => api.getLatencyStats(),
  });

  if (isLoading) {
    return (
      <p
        className="text-sm text-muted-foreground"
        data-testid="responder-stats-loading"
      >
        Loading response stats…
      </p>
    );
  }

  if (isError) {
    return (
      <div
        className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
        data-testid="responder-stats-error"
      >
        <p className="text-sm text-foreground">
          We couldn't load the response stats.
          {error instanceof Error ? ` ${error.message}` : ""}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
          data-testid="responder-stats-retry"
        >
          {isRefetching ? "Retrying…" : "Try again"}
        </Button>
      </div>
    );
  }

  if (!stats) return null;

  const p50Sec = (stats.p50LatencyMs / 1000).toFixed(1);
  const p95Sec = (stats.p95LatencyMs / 1000).toFixed(1);
  const maxSec = (stats.maxLatencyMs / 1000).toFixed(1);
  const afterHoursPct = (stats.afterHoursShare * 100).toFixed(0);

  const noData = stats.repliedTurns === 0 && stats.totalBuyerTurns === 0;

  return (
    <div className="flex flex-col gap-4" data-testid="responder-stats-panel">
      {noData ? (
        <div
          className="rounded-md border border-dashed p-6 text-center"
          data-testid="responder-stats-no-data"
        >
          <p className="text-sm text-muted-foreground">
            No buyer conversations recorded yet. Stats will appear once the
            responder starts handling messages.
          </p>
        </div>
      ) : (
        <div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          data-testid="responder-stats-grid"
        >
          <LatencyStat
            icon={Zap}
            label="Median reply time"
            value={p50Sec}
            unit="s"
            testid="responder-p50"
            highlight
          />
          <LatencyStat
            icon={Activity}
            label="95th percentile"
            value={p95Sec}
            unit="s"
            testid="responder-p95"
          />
          <LatencyStat
            icon={Clock}
            label="Slowest reply"
            value={maxSec}
            unit="s"
            testid="responder-max"
          />
          <LatencyStat
            icon={Moon}
            label="After-hours replies"
            value={afterHoursPct}
            unit="%"
            testid="responder-after-hours"
            highlight
          />
        </div>
      )}

      {!noData && (
        <p
          className="text-xs text-muted-foreground"
          data-testid="responder-stats-footer"
        >
          Based on {stats.repliedTurns.toLocaleString()} timed{" "}
          {stats.repliedTurns === 1 ? "reply" : "replies"} ·{" "}
          after-hours window{" "}
          {stats.afterHoursStartHour}:00–{stats.afterHoursEndHour}:00{" "}
          (outside = after-hours) ·{" "}
          {stats.afterHoursTurns.toLocaleString()} of{" "}
          {stats.totalBuyerTurns.toLocaleString()} buyer messages received
          after hours
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tier-routing config card
// ---------------------------------------------------------------------------

function TierRoutingCard({
  config,
  campaigns,
  onSaved,
}: {
  config: MidnightResponderConfig | null;
  campaigns: NurtureCampaign[];
  onSaved: () => void;
}) {
  const api = useRealEstateResponderApi();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { isDirty },
  } = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema),
    defaultValues: configToFormValues(config),
  });

  // Keep the form in sync if config loads after first render.
  useEffect(() => {
    reset(configToFormValues(config));
  }, [config, reset]);

  const warmCampaignId = watch("warmCampaignId");
  const coldCampaignId = watch("coldCampaignId");
  const delegateHandoff = watch("delegateHandoffToResponder");

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (values: ConfigFormValues) =>
      api.saveConfig({
        warmCampaignId: values.warmCampaignId,
        coldCampaignId: values.coldCampaignId,
        delegateHandoffToResponder: values.delegateHandoffToResponder,
        afterHoursStartHour: values.afterHoursStartHour,
        afterHoursEndHour: values.afterHoursEndHour,
      }),
    onSuccess: (saved) => {
      toast.success("Midnight Responder settings saved.");
      reset(configToFormValues(saved));
      // Invalidate stats — after-hours window may have changed.
      queryClient.invalidateQueries({ queryKey: RESPONDER_STATS_KEY });
      queryClient.invalidateQueries({ queryKey: RESPONDER_CONFIG_KEY });
      onSaved();
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 400) {
        toast.error(
          "One of the selected campaigns wasn't found. Refresh the page and try again.",
        );
      } else if (err instanceof ApiError) {
        toast.error(`Couldn't save settings (${err.status}).`);
      } else {
        toast.error("Couldn't save settings. Please try again.");
      }
    },
  });

  const NONE_VALUE = "__none__";

  function campaignIdOrNull(v: string): string | null {
    return v === NONE_VALUE ? null : v;
  }

  return (
    <Card data-testid="responder-config-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings2 className="size-4 text-muted-foreground" />
          Tier routing
        </CardTitle>
        <CardDescription>
          When a buyer's engagement score is known, route them straight into the
          right nurture campaign — warm leads into your follow-up sequence, and
          long-dormant leads into a longer-term cadence.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit((v) => save(v))}
          className="flex flex-col gap-6"
          data-testid="responder-config-form"
        >
          {/* Campaign pickers */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Warm */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="warm-campaign-select"
                className="text-sm font-medium"
              >
                Warm leads campaign
              </label>
              <p className="text-xs text-muted-foreground">
                Buyers who showed recent interest — send them your active
                follow-up sequence.
              </p>
              <Select
                value={warmCampaignId ?? NONE_VALUE}
                onValueChange={(v) =>
                  setValue("warmCampaignId", campaignIdOrNull(v), {
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger
                  id="warm-campaign-select"
                  data-testid="warm-campaign-select"
                >
                  <SelectValue placeholder="No campaign selected" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>
                    None — don't enroll warm leads
                  </SelectItem>
                  {campaigns.map((c) => (
                    <SelectItem
                      key={c.id}
                      value={c.id}
                      data-testid="warm-campaign-option"
                    >
                      {c.name}
                      {!c.active ? " (paused)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cold */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="cold-campaign-select"
                className="text-sm font-medium"
              >
                Long-dormant leads campaign
              </label>
              <p className="text-xs text-muted-foreground">
                Buyers who went quiet a while ago — a longer, gentler cadence
                keeps you top of mind.
              </p>
              <Select
                value={coldCampaignId ?? NONE_VALUE}
                onValueChange={(v) =>
                  setValue("coldCampaignId", campaignIdOrNull(v), {
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger
                  id="cold-campaign-select"
                  data-testid="cold-campaign-select"
                >
                  <SelectValue placeholder="No campaign selected" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>
                    None — don't enroll long-dormant leads
                  </SelectItem>
                  {campaigns.map((c) => (
                    <SelectItem
                      key={c.id}
                      value={c.id}
                      data-testid="cold-campaign-option"
                    >
                      {c.name}
                      {!c.active ? " (paused)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* After-hours window */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Business-hours window</span>
            <p className="text-xs text-muted-foreground">
              Messages received <em>outside</em> this window count as
              after-hours — the "answered while you slept" stat.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="start-hour"
                  className="text-sm text-muted-foreground"
                >
                  Open (hour)
                </label>
                <input
                  id="start-hour"
                  type="number"
                  min={0}
                  max={23}
                  className="w-20 rounded-md border bg-background px-3 py-1.5 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  data-testid="start-hour-input"
                  {...register("afterHoursStartHour", { valueAsNumber: true })}
                />
              </div>
              <span className="text-sm text-muted-foreground">–</span>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="end-hour"
                  className="text-sm text-muted-foreground"
                >
                  Close (hour)
                </label>
                <input
                  id="end-hour"
                  type="number"
                  min={0}
                  max={23}
                  className="w-20 rounded-md border bg-background px-3 py-1.5 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  data-testid="end-hour-input"
                  {...register("afterHoursEndHour", { valueAsNumber: true })}
                />
              </div>
            </div>
          </div>

          {/* Delegate handoff toggle */}
          <label
            className="flex cursor-pointer items-start gap-3"
            data-testid="delegate-handoff-label"
          >
            <input
              type="checkbox"
              className="mt-0.5 size-4 cursor-pointer rounded border"
              data-testid="delegate-handoff-checkbox"
              checked={delegateHandoff}
              onChange={(e) =>
                setValue(
                  "delegateHandoffToResponder",
                  e.target.checked,
                  { shouldDirty: true },
                )
              }
            />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">
                Hand off unanswered questions to the shared responder
              </span>
              <span className="text-xs text-muted-foreground">
                When the concierge can't ground an answer, forward it to the E2
                responder for a staff notify + generic reply instead of leaving
                the buyer waiting.
              </span>
            </span>
          </label>

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={saving || !isDirty}
              data-testid="responder-config-save-btn"
            >
              <CheckCircle2 className="size-4" />
              {saving ? "Saving…" : "Save settings"}
            </Button>
            {!isDirty && !saving && config !== null && (
              <span
                className="text-xs text-muted-foreground"
                data-testid="responder-config-saved-note"
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
// Main page
// ---------------------------------------------------------------------------

/**
 * Real Estate "Midnight Responder" (T3) admin panel — two sections:
 *
 * 1. Response-latency stats: the "<30 s, 24/7" headline — p50/p95/max
 *    received→replied latency + after-hours coverage share.
 *
 * 2. Tier-routing config card: map WARM / COLD buyer leads to nurture
 *    campaigns, set the business-hours window for the after-hours stat, and
 *    optionally delegate ungrounded-answer handoffs to the E2 responder.
 *
 * The panel renders behind RequireNotContractor alongside the other RE surfaces
 * (the T1 NurtureDashboard precedent). 404 (4380) on the config read renders a
 * friendly "not configured yet" empty state — the same form minus existing
 * values so the agent can do initial setup.
 */
export function MidnightResponderPanel() {
  const api = useRealEstateResponderApi();
  const nurtureApi = useRealEstateNurtureApi();

  // Config — 404/4380 is the "not configured yet" path, not an error.
  const {
    data: config,
    isLoading: configLoading,
    isError: configIsError,
    error: configError,
    refetch: refetchConfig,
    isRefetching: configRefetching,
  } = useQuery({
    queryKey: RESPONDER_CONFIG_KEY,
    queryFn: async () => {
      try {
        return await api.getConfig();
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          return null; // 4380 — not configured yet
        }
        throw err;
      }
    },
  });

  // Campaign list for the pickers (shared /nurture/campaigns).
  const {
    data: campaigns,
    isLoading: campaignsLoading,
  } = useQuery({
    queryKey: ["realestate", "nurture", "campaigns"],
    queryFn: () => nurtureApi.listCampaigns(),
  });

  function handleSaved() {
    // Nothing extra needed — the mutation invalidates the keys.
  }

  return (
    <section
      className="flex flex-col gap-8"
      data-testid="midnight-responder-page"
    >
      {/* Header */}
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-medium">
          <Moon className="size-6 text-muted-foreground" />
          Midnight Responder
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Your AI concierge answers buyer questions around the clock — in under
          30 seconds, even at 2 a.m. Here's how fast it's been, and where it
          routes leads after qualifying them.
        </p>
      </header>

      {/* Latency stats */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Response speed
        </h2>
        <LatencyStatsPanel />
      </div>

      {/* Config card */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Lead routing
        </h2>
        {configLoading || campaignsLoading ? (
          <p
            className="text-sm text-muted-foreground"
            data-testid="responder-config-loading"
          >
            Loading settings…
          </p>
        ) : configIsError &&
          !(configError instanceof ApiError && configError.status === 404) ? (
          <div
            className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
            data-testid="responder-config-error"
          >
            <p className="text-sm text-foreground">
              We couldn't load the routing settings.
              {configError instanceof Error
                ? ` ${configError.message}`
                : ""}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchConfig()}
              disabled={configRefetching}
              data-testid="responder-config-retry"
            >
              {configRefetching ? "Retrying…" : "Try again"}
            </Button>
          </div>
        ) : (
          <>
            {config === null && (
              <div
                className="rounded-md border border-dashed p-4 text-sm text-muted-foreground"
                data-testid="responder-config-empty-state"
              >
                No routing has been set up yet. Fill in the form below to get
                started — warm and long-dormant leads will be routed
                automatically once you save.
              </div>
            )}
            <TierRoutingCard
              config={config ?? null}
              campaigns={campaigns ?? []}
              onSaved={handleSaved}
            />
          </>
        )}
      </div>
    </section>
  );
}
