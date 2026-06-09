import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CheckCircle2,
  Link2,
  MapPin,
  MessageCircleQuestion,
  PhoneCall,
  Settings2,
  ShieldCheck,
  Voicemail,
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
import { useFrontDeskSwitchboardApi } from "../../hooks/useFrontDeskSwitchboardApi";
import type { SwitchboardConfig } from "../../api/frontdesk-switchboard";
import { ApiError } from "../../api/client";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const SWITCHBOARD_CONFIG_KEY = [
  "frontdesk",
  "switchboard",
  "config",
] as const;
export const SWITCHBOARD_STATS_KEY = [
  "frontdesk",
  "switchboard",
  "deflection-stats",
] as const;

// ---------------------------------------------------------------------------
// Config form schema + helpers
// ---------------------------------------------------------------------------

const configSchema = z.object({
  hoursText: z.string().nullable(),
  locationText: z.string().nullable(),
  acceptingNewPatients: z.boolean(),
  acceptingNewPatientsText: z.string().nullable(),
  bookingInstructions: z.string().nullable(),
  rescheduleInstructions: z.string().nullable(),
  intakeFormUrl: z.string().nullable(),
  reviewLinkUrl: z.string().nullable(),
  safeTripwireReply: z.string().nullable(),
});

type ConfigFormValues = z.infer<typeof configSchema>;

function configToFormValues(config: SwitchboardConfig | null): ConfigFormValues {
  return {
    hoursText: config?.hoursText ?? null,
    locationText: config?.locationText ?? null,
    acceptingNewPatients: config?.acceptingNewPatients ?? true,
    acceptingNewPatientsText: config?.acceptingNewPatientsText ?? null,
    bookingInstructions: config?.bookingInstructions ?? null,
    rescheduleInstructions: config?.rescheduleInstructions ?? null,
    intakeFormUrl: config?.intakeFormUrl ?? null,
    reviewLinkUrl: config?.reviewLinkUrl ?? null,
    safeTripwireReply: config?.safeTripwireReply ?? null,
  };
}

function nullIfBlank(v: string | null): string | null {
  if (v === null) return null;
  const trimmed = v.trim();
  return trimmed.length === 0 ? null : trimmed;
}

// ---------------------------------------------------------------------------
// Deflection stat card
// ---------------------------------------------------------------------------

function DeflectionStat({
  icon: Icon,
  label,
  value,
  testid,
  highlight,
}: {
  icon: typeof PhoneCall;
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
// Deflection stats panel
// ---------------------------------------------------------------------------

function DeflectionStatsPanel() {
  const api = useFrontDeskSwitchboardApi();

  const {
    data: stats,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: SWITCHBOARD_STATS_KEY,
    queryFn: () => api.getDeflectionStats(),
  });

  if (isLoading) {
    return (
      <p
        className="text-sm text-muted-foreground"
        data-testid="switchboard-stats-loading"
      >
        Loading deflection stats…
      </p>
    );
  }

  if (isError) {
    return (
      <div
        className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
        data-testid="switchboard-stats-error"
      >
        <p className="text-sm text-foreground">
          We couldn't load the deflection stats.
          {error instanceof Error ? ` ${error.message}` : ""}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
          data-testid="switchboard-stats-retry"
        >
          {isRefetching ? "Retrying…" : "Try again"}
        </Button>
      </div>
    );
  }

  if (!stats) return null;

  const noData = stats.total === 0;
  const deflectionPct = (stats.deflectionRate * 100).toFixed(0);

  return (
    <div className="flex flex-col gap-4" data-testid="switchboard-stats-panel">
      {noData ? (
        <div
          className="rounded-md border border-dashed p-6 text-center"
          data-testid="switchboard-stats-no-data"
        >
          <p className="text-sm text-muted-foreground">
            No patient messages handled yet. Deflection stats will appear once
            the switchboard starts routing calls.
          </p>
        </div>
      ) : (
        <div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          data-testid="switchboard-stats-grid"
        >
          <DeflectionStat
            icon={PhoneCall}
            label="Logistics handled"
            value={stats.logistics.toLocaleString()}
            testid="switchboard-stat-logistics"
            highlight
          />
          <DeflectionStat
            icon={ShieldCheck}
            label="Clinical tripwire"
            value={stats.tripwire.toLocaleString()}
            testid="switchboard-stat-tripwire"
          />
          <DeflectionStat
            icon={Voicemail}
            label="Handed off to staff"
            value={stats.handoff.toLocaleString()}
            testid="switchboard-stat-handoff"
          />
          <DeflectionStat
            icon={MessageCircleQuestion}
            label="Deflection rate"
            value={`${deflectionPct}%`}
            testid="switchboard-stat-rate"
            highlight
          />
        </div>
      )}

      {!noData && (
        <p
          className="text-xs text-muted-foreground"
          data-testid="switchboard-stats-footer"
        >
          {stats.total.toLocaleString()} total messages ·{" "}
          {stats.logistics.toLocaleString()} answered by the switchboard ·{" "}
          {stats.tripwire.toLocaleString()} clinical tripwire ·{" "}
          {stats.handoff.toLocaleString()} handed off to staff
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Logistics config card
// ---------------------------------------------------------------------------

function LogisticsConfigCard({
  config,
  onSaved,
}: {
  config: SwitchboardConfig | null;
  onSaved: () => void;
}) {
  const api = useFrontDeskSwitchboardApi();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { isDirty },
  } = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema),
    defaultValues: configToFormValues(config),
  });

  // Keep the form in sync if config loads after first render.
  useEffect(() => {
    reset(configToFormValues(config));
  }, [config, reset]);

  const acceptingNewPatients = watch("acceptingNewPatients");

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (values: ConfigFormValues) =>
      api.saveConfig({
        hoursText: nullIfBlank(values.hoursText),
        locationText: nullIfBlank(values.locationText),
        acceptingNewPatients: values.acceptingNewPatients,
        acceptingNewPatientsText: nullIfBlank(values.acceptingNewPatientsText),
        bookingInstructions: nullIfBlank(values.bookingInstructions),
        rescheduleInstructions: nullIfBlank(values.rescheduleInstructions),
        intakeFormUrl: nullIfBlank(values.intakeFormUrl),
        reviewLinkUrl: nullIfBlank(values.reviewLinkUrl),
        answerOverrides: null,
        safeTripwireReply: nullIfBlank(values.safeTripwireReply),
      }),
    onSuccess: (saved) => {
      toast.success("Switchboard settings saved.");
      reset(configToFormValues(saved));
      queryClient.invalidateQueries({ queryKey: SWITCHBOARD_CONFIG_KEY });
      queryClient.invalidateQueries({ queryKey: SWITCHBOARD_STATS_KEY });
      onSaved();
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 400) {
        toast.error(
          "One or more fields couldn't be saved. Check the form and try again.",
        );
      } else if (err instanceof ApiError) {
        toast.error(`Couldn't save settings (${err.status}).`);
      } else {
        toast.error("Couldn't save settings. Please try again.");
      }
    },
  });

  return (
    <Card data-testid="switchboard-config-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings2 className="size-4 text-muted-foreground" />
          Front-desk logistics
        </CardTitle>
        <CardDescription>
          These answers power the switchboard's automated replies. Keep all
          content generic — no patient names, diagnoses, or clinical detail
          ever belongs here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit((v) => save(v))}
          className="flex flex-col gap-6"
          data-testid="switchboard-config-form"
        >
          {/* Hours + Location */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="hours-text"
                className="flex items-center gap-1.5 text-sm font-medium"
              >
                <MessageCircleQuestion className="size-4 text-muted-foreground" />
                Office hours
              </label>
              <p className="text-xs text-muted-foreground">
                e.g. "Mon–Thu 8am–5pm, Fri 8am–2pm". Texted back for "when are
                you open?" questions.
              </p>
              <textarea
                id="hours-text"
                rows={2}
                placeholder="Mon–Thu 8am–5pm, Fri 8am–2pm"
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                data-testid="hours-text-input"
                {...register("hoursText")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="location-text"
                className="flex items-center gap-1.5 text-sm font-medium"
              >
                <MapPin className="size-4 text-muted-foreground" />
                Location &amp; directions
              </label>
              <p className="text-xs text-muted-foreground">
                Address, parking, or directions. Texted back for "where are
                you?" questions.
              </p>
              <textarea
                id="location-text"
                rows={2}
                placeholder="123 Main St, Suite 200 — parking in the rear"
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                data-testid="location-text-input"
                {...register("locationText")}
              />
            </div>
          </div>

          {/* Accepting new patients */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">New patients</span>
            <label
              className="flex cursor-pointer items-start gap-3"
              data-testid="accepting-new-patients-label"
            >
              <input
                type="checkbox"
                className="mt-0.5 size-4 cursor-pointer rounded border"
                data-testid="accepting-new-patients-checkbox"
                checked={acceptingNewPatients}
                onChange={(e) =>
                  setValue("acceptingNewPatients", e.target.checked, {
                    shouldDirty: true,
                  })
                }
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">
                  Currently accepting new patients
                </span>
                <span className="text-xs text-muted-foreground">
                  When checked, the switchboard confirms availability. When
                  unchecked, it lets callers know you're not taking new patients
                  right now.
                </span>
              </span>
            </label>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="accepting-new-patients-text"
                className="text-sm text-muted-foreground"
              >
                Override copy (optional)
              </label>
              <input
                id="accepting-new-patients-text"
                type="text"
                placeholder="Leave blank to use the default reply"
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-testid="accepting-new-patients-text-input"
                {...register("acceptingNewPatientsText")}
              />
            </div>
          </div>

          {/* Booking + Reschedule instructions */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="booking-instructions"
                className="flex items-center gap-1.5 text-sm font-medium"
              >
                <PhoneCall className="size-4 text-muted-foreground" />
                How to book an appointment
              </label>
              <p className="text-xs text-muted-foreground">
                Phone number, booking link, or instruction. Texted back for
                booking requests.
              </p>
              <textarea
                id="booking-instructions"
                rows={2}
                placeholder="Call us at (555) 867-5309 or visit our website"
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                data-testid="booking-instructions-input"
                {...register("bookingInstructions")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="reschedule-instructions"
                className="flex items-center gap-1.5 text-sm font-medium"
              >
                <PhoneCall className="size-4 text-muted-foreground" />
                How to reschedule or cancel
              </label>
              <p className="text-xs text-muted-foreground">
                Phone number, portal link, or instruction. Texted back for
                reschedule/cancel requests.
              </p>
              <textarea
                id="reschedule-instructions"
                rows={2}
                placeholder="Call us at (555) 867-5309 or log in to the patient portal"
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                data-testid="reschedule-instructions-input"
                {...register("rescheduleInstructions")}
              />
            </div>
          </div>

          {/* Intake form URL + Review link URL */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="intake-form-url"
                className="flex items-center gap-1.5 text-sm font-medium"
              >
                <Link2 className="size-4 text-muted-foreground" />
                New-patient intake form link
              </label>
              <p className="text-xs text-muted-foreground">
                URL to your new-patient registration / intake forms.
              </p>
              <input
                id="intake-form-url"
                type="text"
                placeholder="https://your-practice.com/intake"
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-testid="intake-form-url-input"
                {...register("intakeFormUrl")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="review-link-url"
                className="flex items-center gap-1.5 text-sm font-medium"
              >
                <Link2 className="size-4 text-muted-foreground" />
                Review link
              </label>
              <p className="text-xs text-muted-foreground">
                URL where patients can leave a review (Google, Healthgrades,
                etc.).
              </p>
              <input
                id="review-link-url"
                type="text"
                placeholder="https://g.page/your-practice/review"
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-testid="review-link-url-input"
              />
            </div>
          </div>

          {/* Safe tripwire reply */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="safe-tripwire-reply"
              className="flex items-center gap-1.5 text-sm font-medium"
            >
              <ShieldCheck className="size-4 text-muted-foreground" />
              Clinical tripwire reply
            </label>
            <p className="text-xs text-muted-foreground">
              The message sent when a patient texts a symptom or clinical
              question. Must stay generic — never reference a condition or
              treatment. Leave blank to use the default.
            </p>
            <textarea
              id="safe-tripwire-reply"
              rows={2}
              placeholder="For urgent concerns, please call our office directly or dial 911 in an emergency."
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              data-testid="safe-tripwire-reply-input"
              {...register("safeTripwireReply")}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={saving || !isDirty}
              data-testid="switchboard-config-save-btn"
            >
              <CheckCircle2 className="size-4" />
              {saving ? "Saving…" : "Save settings"}
            </Button>
            {!isDirty && !saving && config !== null && (
              <span
                className="text-xs text-muted-foreground"
                data-testid="switchboard-config-saved-note"
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
 * Health "Switchboard AI" (T4) admin panel — two sections:
 *
 * 1. Call-deflection stats: PHI-free counters for logistics-handled, clinical-
 *    tripwire, and unmatched-handoff messages plus the overall deflection rate.
 *
 * 2. Logistics config card: the per-tenant answer book the switchboard reads
 *    to reply to front-desk questions — hours, location, booking/reschedule
 *    instructions, intake form and review links, and the clinical tripwire reply.
 *    Generic / PHI-free content only: no patient names, diagnoses, or clinical
 *    detail ever belongs in these fields.
 *
 * The panel renders behind RequireNotContractor alongside the other FrontDesk IQ
 * surfaces (the T2 RevenueReviveDashboard precedent). 404 (4391) on the config
 * read renders a friendly "not configured yet" empty state — the same form minus
 * existing values so the admin can do initial setup.
 */
export function SwitchboardPanel() {
  const api = useFrontDeskSwitchboardApi();

  // Config — 404/4391 is the "not configured yet" path, not an error.
  const {
    data: config,
    isLoading: configLoading,
    isError: configIsError,
    error: configError,
    refetch: refetchConfig,
    isRefetching: configRefetching,
  } = useQuery({
    queryKey: SWITCHBOARD_CONFIG_KEY,
    queryFn: async () => {
      try {
        return await api.getConfig();
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          return null; // 4391 — not configured yet
        }
        throw err;
      }
    },
  });

  function handleSaved() {
    // Nothing extra needed — the mutation invalidates the keys.
  }

  return (
    <section
      className="flex flex-col gap-8"
      data-testid="switchboard-panel-page"
    >
      {/* Header */}
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-medium">
          <PhoneCall className="size-6 text-muted-foreground" />
          Switchboard AI
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Your AI front desk answers patient logistics questions around the
          clock — office hours, location, booking, and more. Here's how it's
          been handling calls, and the answer book it reads from.
        </p>
      </header>

      {/* Deflection stats */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Call deflection
        </h2>
        <DeflectionStatsPanel />
      </div>

      {/* Config card */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Logistics answer book
        </h2>
        {configLoading ? (
          <p
            className="text-sm text-muted-foreground"
            data-testid="switchboard-config-loading"
          >
            Loading settings…
          </p>
        ) : configIsError &&
          !(configError instanceof ApiError && configError.status === 404) ? (
          <div
            className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
            data-testid="switchboard-config-error"
          >
            <p className="text-sm text-foreground">
              We couldn't load the logistics settings.
              {configError instanceof Error
                ? ` ${configError.message}`
                : ""}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchConfig()}
              disabled={configRefetching}
              data-testid="switchboard-config-retry"
            >
              {configRefetching ? "Retrying…" : "Try again"}
            </Button>
          </div>
        ) : (
          <>
            {config === null && (
              <div
                className="rounded-md border border-dashed p-4 text-sm text-muted-foreground"
                data-testid="switchboard-config-empty-state"
              >
                The switchboard hasn't been configured yet. Fill in the form
                below to get started — the AI will answer front-desk questions
                using these logistics details as soon as you save.
              </div>
            )}
            <LogisticsConfigCard
              config={config ?? null}
              onSaved={handleSaved}
            />
          </>
        )}
      </div>
    </section>
  );
}
