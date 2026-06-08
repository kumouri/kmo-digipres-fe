import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarClock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../primitives/card";
import { useFrontDeskApi } from "../../hooks/useFrontDeskApi";
import { useContactsApi } from "../../hooks/useContactsApi";
import type { Appointment, ContactDTO } from "../../types/api";
import {
  NO_SHOW_RISK_SOURCE_LABELS,
  NO_SHOW_RISK_TIER_LABELS,
  VISIT_TYPE_BUCKET_LABELS,
  labelFor,
} from "../labels";

export const RISK_APPOINTMENTS_KEY = ["frontdesk", "risk-appointments"] as const;

/** Tier drives the badge weight — a HIGH no-show risk should read red. */
function riskBadgeVariant(
  tier: string | null | undefined,
): "destructive" | "default" | "secondary" | "muted" {
  switch (tier) {
    case "HIGH":
      return "destructive";
    case "MEDIUM":
      return "default";
    case "LOW":
      return "secondary";
    default:
      return "muted";
  }
}

function contactName(c: ContactDTO | undefined): string | undefined {
  if (!c) return undefined;
  return (
    c.displayName?.trim() ||
    `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() ||
    c.emails?.[0] ||
    undefined
  );
}

/** Whole-hours lead time until the appointment, for the "how soon" logistics line. */
function leadTimeText(scheduledStart: string | null | undefined): string | null {
  if (!scheduledStart) return null;
  const ms = new Date(scheduledStart).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  const hours = Math.round(ms / (60 * 60 * 1000));
  if (hours <= 0) return "Soon";
  if (hours < 48) return `In ~${hours} ${hours === 1 ? "hour" : "hours"}`;
  const days = Math.round(hours / 24);
  return `In ~${days} ${days === 1 ? "day" : "days"}`;
}

/**
 * One appointment row — who, when, the logistics metadata, and the risk badge.
 * PHI-free by construction: it shows the visit-type BUCKET, the lead time, and
 * whether insurance is pending — never a clinical field (none exists to show).
 */
function RiskAppointmentCard({
  appt,
  contactsById,
}: {
  appt: Appointment;
  contactsById: Map<string, ContactDTO>;
}) {
  const risk = appt.noShowRisk;
  const tier = risk?.riskTier ?? null;
  const isHigh = tier === "HIGH";
  const who =
    contactName(appt.contactId ? contactsById.get(appt.contactId) : undefined) ??
    "A patient";
  const leadTime = leadTimeText(appt.scheduledStart);
  // P(no-show) is 0..1; show it as a whole-number percent for the staffer.
  const pct =
    typeof risk?.riskScore === "number"
      ? Math.round(risk.riskScore * 100)
      : null;

  return (
    <Card
      data-testid="risk-appointment-card"
      data-risk-tier={tier ?? "UNSCORED"}
      className={isHigh ? "border-destructive/50" : undefined}
    >
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle
              className="flex items-center gap-2 text-base"
              data-testid="risk-appointment-patient"
            >
              {who}
            </CardTitle>
            <span
              className="text-sm text-muted-foreground"
              data-testid="risk-appointment-visit-type"
            >
              {labelFor(VISIT_TYPE_BUCKET_LABELS, appt.visitTypeBucket, "Visit")}
            </span>
          </div>
          <Badge variant={riskBadgeVariant(tier)} data-testid="risk-appointment-badge">
            <ShieldAlert className="size-3" />
            {labelFor(NO_SHOW_RISK_TIER_LABELS, tier, "Not scored yet")}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarClock className="size-4" />
            <span data-testid="risk-appointment-when">
              {appt.scheduledStart
                ? new Date(appt.scheduledStart).toLocaleString()
                : "Time TBD"}
            </span>
          </span>
          {leadTime ? (
            <span data-testid="risk-appointment-lead-time">{leadTime}</span>
          ) : null}
        </p>

        {appt.insuranceVerificationPending ? (
          <Badge
            variant="outline"
            className="w-fit gap-1"
            data-testid="risk-appointment-insurance"
          >
            <ShieldCheck className="size-3" />
            Insurance pending
          </Badge>
        ) : null}

        {risk ? (
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="size-3.5" />
            {pct !== null ? (
              <span data-testid="risk-appointment-score">
                {pct}% chance of a no-show
              </span>
            ) : null}
            <span aria-hidden>·</span>
            <span data-testid="risk-appointment-source">
              {labelFor(NO_SHOW_RISK_SOURCE_LABELS, risk.source)}
            </span>
            {isHigh ? (
              <Badge variant="outline" className="ml-1">
                Worth a reminder call
              </Badge>
            ) : null}
          </p>
        ) : (
          <p className="text-xs italic text-muted-foreground">
            No risk score yet — it'll appear after tonight's run.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * FrontDesk IQ (FD-5b) — the risk-sorted day view. Tomorrow's appointments,
 * sorted by no-show risk (HIGH → LOW). Each row shows only scheduling logistics
 * (visit-type bucket, lead time, insurance-pending) — never a clinical field,
 * because nothing clinical exists on the appointment (the PHI-free headline).
 */
export function RiskDayView() {
  const api = useFrontDeskApi();
  const contactsApi = useContactsApi();
  const qc = useQueryClient();

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: RISK_APPOINTMENTS_KEY,
    queryFn: () => api.listAppointmentsByRisk(),
  });

  // Resolve patient names from the directory the admin already loads (the BE
  // rows carry a contactId, not a name snapshot — and never a clinical field).
  const { data: contacts } = useQuery({
    queryKey: ["contacts"],
    queryFn: contactsApi.listContacts,
  });
  const contactsById = useMemo(() => {
    const m = new Map<string, ContactDTO>();
    for (const c of contacts ?? []) if (c.id) m.set(c.id, c);
    return m;
  }, [contacts]);

  const retrain = useMutation({
    mutationFn: () => api.retrainNoShowRisk(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RISK_APPOINTMENTS_KEY });
      toast.success("Re-scoring your upcoming appointments — refresh in a moment.");
    },
    onError: (e) =>
      toast.error(
        e instanceof Error ? e.message : "Couldn't start a re-score.",
      ),
  });

  const highCount = useMemo(
    () => (data ?? []).filter((a) => a.noShowRisk?.riskTier === "HIGH").length,
    [data],
  );

  return (
    <section className="flex flex-col gap-4" data-testid="risk-day-page">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2 text-2xl font-medium">
            <ShieldAlert className="size-6 text-muted-foreground" />
            Tomorrow's risk
          </h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Your upcoming appointments, sorted by who's most likely to miss. We
            only ever look at scheduling logistics — never anything clinical.
            The riskiest ones are worth a confirmation call.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {highCount > 0 ? (
            <Badge variant="destructive" data-testid="risk-high-count">
              {highCount} high-risk
            </Badge>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => retrain.mutate()}
            disabled={retrain.isPending}
            data-testid="risk-retrain"
          >
            <RefreshCw className="size-4" />
            {retrain.isPending ? "Re-scoring…" : "Re-score"}
          </Button>
        </div>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground" data-testid="risk-loading">
          Loading…
        </p>
      ) : isError ? (
        <div
          className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
          data-testid="risk-error"
        >
          <p className="text-sm text-foreground">
            We couldn't load your upcoming appointments.
            {error instanceof Error ? ` ${error.message}` : ""}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            data-testid="risk-retry"
          >
            {isRefetching ? "Retrying…" : "Try again"}
          </Button>
        </div>
      ) : !data || data.length === 0 ? (
        <div
          className="rounded-md border border-dashed p-8 text-center"
          data-testid="risk-empty"
        >
          <p className="text-sm text-muted-foreground">
            No upcoming appointments. New ones show up here with a risk score
            after tonight's run.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4" data-testid="risk-list">
          {data.map((a) => (
            <RiskAppointmentCard
              key={a.id}
              appt={a}
              contactsById={contactsById}
            />
          ))}
        </div>
      )}
    </section>
  );
}
