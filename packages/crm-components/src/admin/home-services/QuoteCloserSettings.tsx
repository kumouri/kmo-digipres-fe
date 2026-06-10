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
  BarChart2,
  CheckCircle2,
  Clock,
  MessageCircle,
  RefreshCw,
  Settings2,
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
import { useQuoteCloserApi } from "../../hooks/useQuoteCloserApi";
import type {
  QuoteCloserAnalytics,
  QuoteCloserConfigDTO,
} from "../../api/quote-closer";
import { ApiError } from "../../api/client";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const QUOTE_CLOSER_CONFIG_KEY = ["quoting", "quote-closer", "config"] as const;
export const QUOTE_CLOSER_ANALYTICS_KEY = ["quoting", "quote-closer", "analytics"] as const;

// ---------------------------------------------------------------------------
// Form schema
// ---------------------------------------------------------------------------

const configSchema = z.object({
  unacceptedWindowHours: z
    .number({ invalid_type_error: "Enter a whole number of hours." })
    .int("Must be a whole number.")
    .min(1, "Must be at least 1 hour.")
    .max(720, "Maximum 720 hours (30 days)."),
  financingNudgeCopy: z
    .string()
    .max(500, "Keep the nudge copy under 500 characters."),
  cadenceEnabled: z.boolean(),
});

type ConfigForm = z.infer<typeof configSchema>;

/** Map a DTO into the form's shape. */
function dtoToForm(dto: QuoteCloserConfigDTO | null): ConfigForm {
  return {
    unacceptedWindowHours: dto?.unacceptedWindowHours ?? 48,
    financingNudgeCopy: "",
    cadenceEnabled: dto?.unacceptedWindowHours != null && dto.unacceptedWindowHours > 0,
  };
}

/** Map the form back to the DTO the API accepts. */
function formToDto(form: ConfigForm): QuoteCloserConfigDTO {
  return {
    campaignId: null, // campaignId is not edited here; preserve null (BE partial-upsert keeps existing)
    unacceptedWindowHours: form.cadenceEnabled ? form.unacceptedWindowHours : null,
  };
}

// ---------------------------------------------------------------------------
// Recovery funnel analytics panel
// ---------------------------------------------------------------------------

function fmtPct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

interface FunnelStatProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  highlight?: boolean;
  testId: string;
}

function FunnelStat({ label, value, icon, highlight, testId }: FunnelStatProps) {
  return (
    <div
      className={[
        "flex flex-col gap-1 rounded-lg border p-4",
        highlight
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-background",
      ].join(" ")}
      data-testid={testId}
    >
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <span className="text-2xl font-semibold tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );
}

function RecoveryFunnelPanel() {
  const api = useQuoteCloserApi();

  const {
    data: analytics,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery<QuoteCloserAnalytics>({
    queryKey: QUOTE_CLOSER_ANALYTICS_KEY,
    queryFn: () => api.getAnalytics(),
  });

  return (
    <Card data-testid="quote-closer-analytics-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart2 className="size-4 text-muted-foreground" />
          Recovery funnel
        </CardTitle>
        <CardDescription>
          How many un-accepted quotes the follow-up cadence touched, and how
          many turned into booked jobs. The recovery rate is what you earned
          back from quotes that would have gone cold.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p
            className="text-sm text-muted-foreground"
            data-testid="quote-closer-analytics-loading"
          >
            Loading recovery funnel…
          </p>
        ) : isError ? (
          <div
            className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
            data-testid="quote-closer-analytics-error"
          >
            <p className="text-sm text-foreground">
              We couldn&apos;t load the recovery funnel.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              data-testid="quote-closer-analytics-retry"
            >
              {isRefetching ? "Retrying…" : "Try again"}
            </Button>
          </div>
        ) : analytics ? (
          <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5"
            data-testid="quote-closer-funnel-grid"
          >
            <FunnelStat
              label="Quotes sent"
              value={analytics.quotesSent}
              icon={<MessageCircle className="size-3.5" />}
              testId="funnel-quotes-sent"
            />
            <FunnelStat
              label="Followed up"
              value={analytics.followedUp}
              icon={<RefreshCw className="size-3.5" />}
              testId="funnel-followed-up"
            />
            <FunnelStat
              label="Recovered"
              value={analytics.recovered}
              icon={<CheckCircle2 className="size-3.5" />}
              testId="funnel-recovered"
            />
            <FunnelStat
              label="Review requested"
              value={analytics.reviewRequested}
              icon={<TrendingUp className="size-3.5" />}
              testId="funnel-review-requested"
            />
            <FunnelStat
              label="Recovery rate"
              value={fmtPct(analytics.recoveryRate)}
              icon={<TrendingUp className="size-3.5" />}
              highlight
              testId="funnel-recovery-rate"
            />
          </div>
        ) : (
          <div
            className="rounded-md border border-dashed p-4 text-sm text-muted-foreground"
            data-testid="quote-closer-analytics-empty"
          >
            No recovery data yet — the funnel fills up as quotes are sent and
            followed up by the cadence.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Config card — follow-up window + cadence toggle + financing-nudge copy
// ---------------------------------------------------------------------------

function QuoteCloserConfigCard({
  initial,
}: {
  initial: QuoteCloserConfigDTO | null;
}) {
  const api = useQuoteCloserApi();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<ConfigForm>({
    resolver: zodResolver(configSchema),
    defaultValues: dtoToForm(initial),
  });

  const cadenceEnabled = watch("cadenceEnabled");

  // Sync if the server data arrives after mount
  useEffect(() => {
    reset(dtoToForm(initial));
  }, [initial, reset]);

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (form: ConfigForm) => api.saveConfig(formToDto(form)),
    onSuccess: (saved) => {
      toast.success("Follow-up settings saved.");
      reset(dtoToForm(saved));
      queryClient.invalidateQueries({ queryKey: QUOTE_CLOSER_CONFIG_KEY });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 400) {
        toast.error("Couldn't save — check the settings and try again.");
      } else {
        toast.error("Couldn't save the follow-up settings. Please try again.");
      }
    },
  });

  return (
    <Card data-testid="quote-closer-config-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings2 className="size-4 text-muted-foreground" />
          Follow-up settings
        </CardTitle>
        <CardDescription>
          Control how long a quote can sit un-accepted before the nurture
          cadence kicks in, and fine-tune the financing nudge copy sent to
          homeowners whose quote includes a replace recommendation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit((values) => save(values))}
          className="flex flex-col gap-6"
          data-testid="quote-closer-config-form"
        >
          {/* Cadence enable toggle */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <input
                id="cadence-enabled"
                type="checkbox"
                {...register("cadenceEnabled")}
                className="size-4 accent-primary"
                data-testid="cadence-enabled-toggle"
              />
              <label
                htmlFor="cadence-enabled"
                className="flex items-center gap-2 text-sm font-medium"
              >
                Enable follow-up cadence
              </label>
            </div>
            <p className="ml-7 text-xs text-muted-foreground">
              When on, un-accepted quotes are enrolled in a nurture campaign
              after the window below. When off, no follow-up messages are sent.
            </p>
          </div>

          {/* Follow-up window */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="unaccepted-window-hours"
              className="flex items-center gap-1.5 text-sm font-medium"
            >
              <Clock className="size-4 text-muted-foreground" />
              Follow-up window (hours)
            </label>
            <p className="text-xs text-muted-foreground">
              How long a quote may sit un-accepted before the first follow-up
              message is sent. Default is 48 hours (2 days).
            </p>
            <input
              id="unaccepted-window-hours"
              type="number"
              min={1}
              max={720}
              disabled={!cadenceEnabled}
              {...register("unacceptedWindowHours", { valueAsNumber: true })}
              className="w-32 rounded-md border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="unaccepted-window-hours-input"
            />
            {errors.unacceptedWindowHours && (
              <p
                className="text-xs text-destructive"
                data-testid="unaccepted-window-hours-error"
              >
                {errors.unacceptedWindowHours.message}
              </p>
            )}
          </div>

          {/* Financing nudge copy */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="financing-nudge-copy"
              className="flex items-center gap-1.5 text-sm font-medium"
            >
              <MessageCircle className="size-4 text-muted-foreground" />
              Financing nudge copy (optional)
            </label>
            <p className="text-xs text-muted-foreground">
              Extra copy appended to the follow-up message when the quote
              recommends a replacement and financing is available. Leave blank
              to use the default message.
            </p>
            <textarea
              id="financing-nudge-copy"
              rows={3}
              disabled={!cadenceEnabled}
              {...register("financingNudgeCopy")}
              placeholder="Ask us about flexible financing options — many homeowners qualify with no money down."
              className="rounded-md border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="financing-nudge-copy-input"
            />
            {errors.financingNudgeCopy && (
              <p
                className="text-xs text-destructive"
                data-testid="financing-nudge-copy-error"
              >
                {errors.financingNudgeCopy.message}
              </p>
            )}
          </div>

          {/* Save */}
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={saving || !isDirty}
              data-testid="quote-closer-config-save-btn"
            >
              <CheckCircle2 className="size-4" />
              {saving ? "Saving…" : "Save settings"}
            </Button>
            {!isDirty && !saving && initial !== null && (
              <span
                className="text-xs text-muted-foreground"
                data-testid="quote-closer-config-saved-note"
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
// Main export — QuoteCloser settings page
// ---------------------------------------------------------------------------

/**
 * Home Services T11 "QuoteCloser" — the admin settings surface:
 *
 * 1. Config card — edit the per-tenant follow-up config:
 *    - Cadence enable/disable toggle
 *    - Follow-up window (unacceptedWindowHours)
 *    - Financing-nudge copy textarea
 *    GET /quoting/quote-closer/config; PUT /quoting/quote-closer/config.
 *    4470/404 renders a friendly empty state so the admin can do initial setup.
 *
 * 2. Recovery funnel analytics panel — read-only funnel counters:
 *    quotes sent → followed-up → recovered → review-requested + recovery rate.
 *    GET /quoting/quote-closer/analytics.
 *
 * Rendered behind RequireNotContractor grouped with the other Home Services
 * surfaces (the T8 PriceBookConfig / T5 CallbackQueue precedent). The config
 * endpoints are ADMIN-gated (RoleGuard.requireRole("ADMIN"), 1800); analytics
 * is staff-accessible.
 */
export function QuoteCloserSettings() {
  const api = useQuoteCloserApi();

  const {
    data: config,
    isLoading,
    isError,
    error: configError,
    refetch,
    isRefetching,
  } = useQuery<QuoteCloserConfigDTO | null>({
    queryKey: QUOTE_CLOSER_CONFIG_KEY,
    queryFn: async () => {
      try {
        return await api.getConfig();
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          return null; // 4470 — not configured yet
        }
        throw err;
      }
    },
  });

  return (
    <section
      className="flex flex-col gap-8"
      data-testid="quote-closer-settings-page"
    >
      {/* Header */}
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-medium">
          <RefreshCw className="size-6 text-muted-foreground" />
          Quote follow-up
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Configure the follow-up cadence that nudges homeowners whose quotes
          are still sitting un-accepted, and review the recovery funnel to see
          how many jobs you&apos;re winning back.
        </p>
      </header>

      {/* Config card */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Follow-up settings
        </h2>
        {isLoading ? (
          <p
            className="text-sm text-muted-foreground"
            data-testid="quote-closer-config-loading"
          >
            Loading follow-up settings…
          </p>
        ) : isError &&
          !(configError instanceof ApiError && configError.status === 404) ? (
          <div
            className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
            data-testid="quote-closer-config-error"
          >
            <p className="text-sm text-foreground">
              We couldn&apos;t load the follow-up settings.
              {configError instanceof Error ? ` ${configError.message}` : ""}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              data-testid="quote-closer-config-retry"
            >
              {isRefetching ? "Retrying…" : "Try again"}
            </Button>
          </div>
        ) : (
          <>
            {config === null && (
              <div
                className="rounded-md border border-dashed p-4 text-sm text-muted-foreground"
                data-testid="quote-closer-config-empty-state"
              >
                No follow-up settings yet — fill in the form below to enable
                the QuoteCloser cadence for this tenant.
              </div>
            )}
            <QuoteCloserConfigCard initial={config ?? null} />
          </>
        )}
      </div>

      {/* Recovery funnel analytics */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Recovery funnel
        </h2>
        <RecoveryFunnelPanel />
      </div>
    </section>
  );
}
