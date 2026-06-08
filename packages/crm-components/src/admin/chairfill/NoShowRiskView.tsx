import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, ShieldAlert, TrendingUp } from "lucide-react";

import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../primitives/card";
import { useChairFillApi } from "../../hooks/useChairFillApi";
import { useContactsApi } from "../../hooks/useContactsApi";
import { useTeamApi } from "../../hooks/useTeamApi";
import type { ContactDTO, RiskBooking, TeamMember } from "../../types/api";
import {
  NO_SHOW_RISK_SOURCE_LABELS,
  NO_SHOW_RISK_TIER_LABELS,
  labelFor,
} from "../labels";

const RISK_BOOKINGS_KEY = ["chairfill", "risk-bookings"] as const;

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

function staffName(m: TeamMember | undefined): string | undefined {
  if (!m) return undefined;
  return m.displayName?.trim() || m.email?.trim() || undefined;
}

/** A booking row: who, when, with whom — and the risk badge. */
function RiskBookingCard({
  booking,
  contactsById,
  staffById,
}: {
  booking: RiskBooking;
  contactsById: Map<string, ContactDTO>;
  staffById: Map<string, TeamMember>;
}) {
  const risk = booking.noShowRisk;
  const tier = risk?.riskTier ?? null;
  const isHigh = tier === "HIGH";
  const who =
    contactName(
      booking.contactId ? contactsById.get(booking.contactId) : undefined,
    ) ?? "A client";
  const stylist = booking.staffMemberId
    ? staffName(staffById.get(booking.staffMemberId))
    : undefined;
  // P(no-show) is 0..1; show it as a whole-number percent for the staffer.
  const pct =
    typeof risk?.riskScore === "number"
      ? Math.round(risk.riskScore * 100)
      : null;

  return (
    <Card
      data-testid="risk-booking-card"
      data-risk-tier={tier ?? "UNSCORED"}
      className={isHigh ? "border-destructive/50" : undefined}
    >
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle
              className="flex items-center gap-2 text-base"
              data-testid="risk-booking-client"
            >
              {who}
            </CardTitle>
            <span
              className="text-sm text-muted-foreground"
              data-testid="risk-booking-service"
            >
              {booking.serviceMenuItemName?.trim() || "Appointment"}
              {stylist ? ` · with ${stylist}` : ""}
            </span>
          </div>
          <Badge variant={riskBadgeVariant(tier)} data-testid="risk-booking-badge">
            <ShieldAlert className="size-3" />
            {labelFor(NO_SHOW_RISK_TIER_LABELS, tier, "Not scored yet")}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarClock className="size-4" />
          <span data-testid="risk-booking-when">
            {booking.scheduledStart
              ? new Date(booking.scheduledStart).toLocaleString()
              : "Time TBD"}
          </span>
        </p>

        {risk ? (
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="size-3.5" />
            {pct !== null ? (
              <span data-testid="risk-booking-score">
                {pct}% chance of a no-show
              </span>
            ) : null}
            <span aria-hidden>·</span>
            <span data-testid="risk-booking-source">
              {labelFor(NO_SHOW_RISK_SOURCE_LABELS, risk.source)}
            </span>
            {isHigh ? (
              <Badge variant="outline" className="ml-1">
                Consider a deposit
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

export function NoShowRiskView() {
  const api = useChairFillApi();
  const contactsApi = useContactsApi();
  const teamApi = useTeamApi();

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: RISK_BOOKINGS_KEY,
    queryFn: () => api.listRiskBookings(),
  });

  // Resolve contact + stylist names from the directories the admin already
  // loads (the board DTOs carry ids, not name snapshots — the BE contract).
  const { data: contacts } = useQuery({
    queryKey: ["contacts"],
    queryFn: contactsApi.listContacts,
  });
  const { data: team } = useQuery({
    queryKey: ["team"],
    queryFn: teamApi.listTeam,
  });

  const contactsById = useMemo(() => {
    const m = new Map<string, ContactDTO>();
    for (const c of contacts ?? []) if (c.id) m.set(c.id, c);
    return m;
  }, [contacts]);
  const staffById = useMemo(() => {
    const m = new Map<string, TeamMember>();
    for (const s of team ?? []) if (s.id) m.set(s.id, s);
    return m;
  }, [team]);

  const highCount = useMemo(
    () => (data ?? []).filter((b) => b.noShowRisk?.riskTier === "HIGH").length,
    [data],
  );

  return (
    <section className="flex flex-col gap-4" data-testid="no-show-risk-page">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2 text-2xl font-medium">
            <ShieldAlert className="size-6 text-muted-foreground" />
            No-show risk
          </h1>
          <p className="text-sm text-muted-foreground">
            Your upcoming chairs, sorted by who's most likely to miss. The
            riskiest ones are worth a deposit or a confirmation nudge.
          </p>
        </div>
        {highCount > 0 ? (
          <Badge variant="destructive" data-testid="risk-high-count">
            {highCount} high-risk
          </Badge>
        ) : null}
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
            We couldn't load your upcoming bookings.
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
            No upcoming bookings in the next week. New appointments will show up
            here with a risk score after tonight's run.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4" data-testid="risk-list">
          {data.map((b) => (
            <RiskBookingCard
              key={b.id}
              booking={b}
              contactsById={contactsById}
              staffById={staffById}
            />
          ))}
        </div>
      )}
    </section>
  );
}
