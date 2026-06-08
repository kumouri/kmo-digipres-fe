import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  Clock3,
  ListChecks,
  Send,
  Users,
} from "lucide-react";

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
import type {
  ContactDTO,
  TeamMember,
  WaitlistBoardEntry,
  WaitlistOffer,
} from "../../types/api";
import { WAITLIST_OFFER_STATUS_LABELS, labelFor } from "../labels";

const WAITLIST_BOARD_KEY = ["chairfill", "waitlist-board"] as const;

/** Offer status drives the badge weight — a live OFFERED slot stands out. */
function offerBadgeVariant(
  status: string | null | undefined,
): "destructive" | "default" | "secondary" | "muted" | "outline" {
  switch (status) {
    case "CLAIMED":
      return "default";
    case "OFFERED":
      return "secondary";
    case "SUPERSEDED":
      return "outline";
    case "EXPIRED":
      return "muted";
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

/** A short, human window like "Tomorrow 2:00 PM – 3:00 PM" / "any time". */
function windowText(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  if (!start && !end) return "any time";
  const fmt = (iso: string) => new Date(iso).toLocaleString();
  if (start && end) return `${fmt(start)} – ${new Date(end).toLocaleTimeString()}`;
  if (start) return `from ${fmt(start)}`;
  return `until ${fmt(end!)}`;
}

// ---------------------------------------------------------------------------
// Waiting column — OPEN entries
// ---------------------------------------------------------------------------

function WaitlistEntryCard({
  entry,
  contactsById,
  staffById,
}: {
  entry: WaitlistBoardEntry;
  contactsById: Map<string, ContactDTO>;
  staffById: Map<string, TeamMember>;
}) {
  const who =
    contactName(
      entry.contactId ? contactsById.get(entry.contactId) : undefined,
    ) ?? "A client";
  const stylist = entry.preferredStaffMemberId
    ? staffName(staffById.get(entry.preferredStaffMemberId))
    : undefined;

  return (
    <Card data-testid="waitlist-entry-card">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-base" data-testid="waitlist-entry-client">
            {who}
          </CardTitle>
          {entry.smsOptIn ? (
            <Badge variant="secondary">Textable</Badge>
          ) : (
            <Badge variant="muted">No texts</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5 text-sm text-muted-foreground">
        <span data-testid="waitlist-entry-service">
          Wants: {entry.serviceMenuItemId ? "a specific service" : "any service"}
          {stylist ? ` · with ${stylist}` : " · any stylist"}
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarClock className="size-3.5" />
          {windowText(entry.earliestStart, entry.latestStart)}
        </span>
        {entry.notes?.trim() ? (
          <blockquote
            className="border-l-2 border-muted pl-3 text-foreground/90"
            data-testid="waitlist-entry-notes"
          >
            {entry.notes}
          </blockquote>
        ) : null}
        {entry.createdAt ? (
          <span className="text-xs">
            Joined {new Date(entry.createdAt).toLocaleDateString()}
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Offers column — recent offers (all statuses)
// ---------------------------------------------------------------------------

function WaitlistOfferRow({
  offer,
  contactsById,
}: {
  offer: WaitlistOffer;
  contactsById: Map<string, ContactDTO>;
}) {
  const who =
    contactName(
      offer.contactId ? contactsById.get(offer.contactId) : undefined,
    ) ??
    offer.contactPhone ??
    "A client";

  return (
    <Card data-testid="waitlist-offer-card" data-offer-status={offer.status ?? ""}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-base" data-testid="waitlist-offer-client">
            {who}
          </CardTitle>
          <Badge
            variant={offerBadgeVariant(offer.status)}
            data-testid="waitlist-offer-status"
          >
            {labelFor(WAITLIST_OFFER_STATUS_LABELS, offer.status, "Offered")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5 text-sm text-muted-foreground">
        <span data-testid="waitlist-offer-slot">
          {offer.serviceMenuItemName?.trim() || "Freed slot"} ·{" "}
          {offer.slotStart
            ? new Date(offer.slotStart).toLocaleString()
            : "time TBD"}
        </span>
        <span className="flex flex-wrap items-center gap-2 text-xs">
          {typeof offer.rank === "number" ? (
            <Badge variant="outline">
              {offer.rank === 0 ? "Top pick" : `Pick #${offer.rank + 1}`}
            </Badge>
          ) : null}
          {offer.sentAt ? (
            <span className="flex items-center gap-1">
              <Send className="size-3" />
              Sent {new Date(offer.sentAt).toLocaleString()}
            </span>
          ) : null}
          {offer.status === "OFFERED" && offer.expiresAt ? (
            <span className="flex items-center gap-1">
              <Clock3 className="size-3" />
              Expires {new Date(offer.expiresAt).toLocaleTimeString()}
            </span>
          ) : null}
        </span>
      </CardContent>
    </Card>
  );
}

export function WaitlistBoard() {
  const api = useChairFillApi();
  const contactsApi = useContactsApi();
  const teamApi = useTeamApi();

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: WAITLIST_BOARD_KEY,
    queryFn: () => api.getWaitlistBoard(),
  });

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

  const entries = data?.openEntries ?? [];
  const offers = data?.recentOffers ?? [];

  return (
    <section className="flex flex-col gap-4" data-testid="waitlist-board-page">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2 text-2xl font-medium">
            <ListChecks className="size-6 text-muted-foreground" />
            Waitlist board
          </h1>
          <p className="text-sm text-muted-foreground">
            Who's waiting for an opening, and the offers we've sent out when a
            chair frees up. The first client to reply YES claims the slot.
          </p>
        </div>
      </header>

      {isLoading ? (
        <p
          className="text-sm text-muted-foreground"
          data-testid="waitlist-loading"
        >
          Loading…
        </p>
      ) : isError ? (
        <div
          className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
          data-testid="waitlist-error"
        >
          <p className="text-sm text-foreground">
            We couldn't load the waitlist board.
            {error instanceof Error ? ` ${error.message}` : ""}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            data-testid="waitlist-retry"
          >
            {isRefetching ? "Retrying…" : "Try again"}
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Waiting */}
          <div className="flex flex-col gap-3" data-testid="waitlist-entries-column">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Waiting
              </h2>
              {entries.length > 0 ? (
                <Badge variant="secondary" data-testid="waitlist-entries-count">
                  {entries.length}
                </Badge>
              ) : null}
            </div>
            {entries.length === 0 ? (
              <div
                className="rounded-md border border-dashed p-6 text-center"
                data-testid="waitlist-entries-empty"
              >
                <p className="text-sm text-muted-foreground">
                  Nobody's on the waitlist right now.
                </p>
              </div>
            ) : (
              entries.map((e) => (
                <WaitlistEntryCard
                  key={e.id}
                  entry={e}
                  contactsById={contactsById}
                  staffById={staffById}
                />
              ))
            )}
          </div>

          {/* Offers */}
          <div className="flex flex-col gap-3" data-testid="waitlist-offers-column">
            <div className="flex items-center gap-2">
              <Send className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Recent offers
              </h2>
              {offers.length > 0 ? (
                <Badge variant="secondary" data-testid="waitlist-offers-count">
                  {offers.length}
                </Badge>
              ) : null}
            </div>
            {offers.length === 0 ? (
              <div
                className="rounded-md border border-dashed p-6 text-center"
                data-testid="waitlist-offers-empty"
              >
                <p className="text-sm text-muted-foreground">
                  No offers sent yet — they'll appear here the moment a chair
                  frees up.
                </p>
              </div>
            ) : (
              offers.map((o) => (
                <WaitlistOfferRow
                  key={o.id}
                  offer={o}
                  contactsById={contactsById}
                />
              ))
            )}
          </div>
        </div>
      )}
    </section>
  );
}
