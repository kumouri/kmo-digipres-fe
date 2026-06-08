import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { Flame, Home, MessageSquare, Snowflake, Sun, User } from "lucide-react";

import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../primitives/card";
import { useRealEstateApi } from "../../hooks/useRealEstateApi";
import { useContactsApi } from "../../hooks/useContactsApi";
import type {
  ConciergeConversationSummary,
  ContactDTO,
  Listing,
} from "../../types/api";
import {
  CONVERSATION_STATE_LABELS,
  LEAD_TIER_LABELS,
  labelFor,
} from "../labels";
import { LISTINGS_KEY, listingAddress } from "./ListingConsole";

export const CONVERSATIONS_KEY = ["realestate", "conversations"] as const;

// The lead pipeline columns, hottest first. "UNSCORED" is the synthetic bucket
// for a buyer with no contact / no score yet.
const TIER_ORDER = ["HOT", "WARM", "COLD", "UNSCORED"] as const;
type TierBucket = (typeof TIER_ORDER)[number];

const TIER_ICON: Record<TierBucket, typeof Flame> = {
  HOT: Flame,
  WARM: Sun,
  COLD: Snowflake,
  UNSCORED: User,
};

function tierBadgeVariant(
  tier: string | null | undefined,
): "destructive" | "default" | "secondary" | "muted" {
  switch (tier) {
    case "HOT":
      return "destructive";
    case "WARM":
      return "default";
    case "COLD":
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

function ConversationCard({
  convo,
  contactsById,
  listingsById,
}: {
  convo: ConciergeConversationSummary;
  contactsById: Map<string, ContactDTO>;
  listingsById: Map<string, Listing>;
}) {
  const navigate = useNavigate();
  const who =
    contactName(
      convo.contactId ? contactsById.get(convo.contactId) : undefined,
    ) ?? "An unknown buyer";
  const listing = convo.listingId
    ? listingsById.get(convo.listingId)
    : undefined;

  return (
    <Card
      data-testid="conversation-card"
      data-lead-tier={convo.leadTier ?? "UNSCORED"}
      className="cursor-pointer transition-colors hover:border-primary/50"
      onClick={() => convo.id && navigate(`/concierge/${convo.id}`)}
    >
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle
            className="flex items-center gap-2 text-base"
            data-testid="conversation-card-buyer"
          >
            <User className="size-4 text-muted-foreground" />
            {who}
          </CardTitle>
          <Badge
            variant={tierBadgeVariant(convo.leadTier)}
            data-testid="conversation-card-tier"
          >
            {convo.leadTier
              ? labelFor(LEAD_TIER_LABELS, convo.leadTier)
              : "Unscored"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5 text-sm text-muted-foreground">
        {listing ? (
          <span className="flex items-center gap-1.5" data-testid="conversation-card-listing">
            <Home className="size-3.5" />
            {listingAddress(listing)}
          </span>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="outline" data-testid="conversation-card-state">
            {labelFor(CONVERSATION_STATE_LABELS, convo.state, "Answering questions")}
          </Badge>
          <span className="flex items-center gap-1">
            <MessageSquare className="size-3" />
            {convo.turnCount ?? 0} {convo.turnCount === 1 ? "message" : "messages"}
          </span>
          {convo.optedOut ? (
            <Badge variant="muted">Opted out</Badge>
          ) : null}
          {convo.lastActivityAt ? (
            <span>{new Date(convo.lastActivityAt).toLocaleString()}</span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Real Estate Concierge (RE-5b) — the concierge inbox + lead pipeline. Every
 * conversation the concierge has handled, grouped into HOT / WARM / COLD /
 * Unscored columns by the buyer's lead tier (the "pipeline"). Each card links to
 * the transcript + citation viewer.
 */
export function ConciergeInbox() {
  const api = useRealEstateApi();
  const contactsApi = useContactsApi();

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: CONVERSATIONS_KEY,
    queryFn: () => api.listConversations(),
  });

  // Resolve buyer + listing names from the collections the admin already loads
  // (the summary DTOs carry ids, not name snapshots — the BE contract).
  const { data: contacts } = useQuery({
    queryKey: ["contacts"],
    queryFn: contactsApi.listContacts,
  });
  const { data: listings } = useQuery({
    queryKey: LISTINGS_KEY,
    queryFn: api.listListings,
  });

  const contactsById = useMemo(() => {
    const m = new Map<string, ContactDTO>();
    for (const c of contacts ?? []) if (c.id) m.set(c.id, c);
    return m;
  }, [contacts]);
  const listingsById = useMemo(() => {
    const m = new Map<string, Listing>();
    for (const l of listings ?? []) if (l.id) m.set(l.id, l);
    return m;
  }, [listings]);

  // Group by lead tier — the pipeline. Within a column, newest activity first
  // (the list already arrives newest-first from the BE).
  const byTier = useMemo(() => {
    const groups: Record<TierBucket, ConciergeConversationSummary[]> = {
      HOT: [],
      WARM: [],
      COLD: [],
      UNSCORED: [],
    };
    for (const c of data ?? []) {
      const tier = (c.leadTier ?? "UNSCORED") as TierBucket;
      (groups[tier] ?? groups.UNSCORED).push(c);
    }
    return groups;
  }, [data]);

  const hotCount = byTier.HOT.length;

  return (
    <section className="flex flex-col gap-4" data-testid="concierge-inbox-page">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2 text-2xl font-medium">
            <MessageSquare className="size-6 text-muted-foreground" />
            Concierge inbox
          </h1>
          <p className="text-sm text-muted-foreground">
            Every buyer the concierge has texted with, grouped by how warm the
            lead is. Open one to see the full conversation, what it answered, and
            the disclosures it cited.
          </p>
        </div>
        {hotCount > 0 ? (
          <Badge variant="destructive" data-testid="concierge-hot-count">
            {hotCount} hot {hotCount === 1 ? "lead" : "leads"}
          </Badge>
        ) : null}
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground" data-testid="concierge-loading">
          Loading…
        </p>
      ) : isError ? (
        <div
          className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
          data-testid="concierge-error"
        >
          <p className="text-sm text-foreground">
            We couldn't load the concierge inbox.
            {error instanceof Error ? ` ${error.message}` : ""}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            data-testid="concierge-retry"
          >
            {isRefetching ? "Retrying…" : "Try again"}
          </Button>
        </div>
      ) : !data || data.length === 0 ? (
        <div
          className="rounded-md border border-dashed p-8 text-center"
          data-testid="concierge-empty"
        >
          <p className="text-sm text-muted-foreground">
            No conversations yet. When a buyer texts a listing's number, the
            concierge's thread shows up here.
          </p>
        </div>
      ) : (
        <div
          className="grid gap-6 md:grid-cols-2 xl:grid-cols-4"
          data-testid="lead-pipeline"
        >
          {TIER_ORDER.map((tier) => {
            const items = byTier[tier];
            const Icon = TIER_ICON[tier];
            return (
              <div
                key={tier}
                className="flex flex-col gap-3"
                data-testid="pipeline-column"
                data-tier={tier}
              >
                <div className="flex items-center gap-2">
                  <Icon className="size-4 text-muted-foreground" />
                  <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                    {tier === "UNSCORED"
                      ? "Unscored"
                      : labelFor(LEAD_TIER_LABELS, tier)}
                  </h2>
                  {items.length > 0 ? (
                    <Badge variant="muted" data-testid="pipeline-column-count">
                      {items.length}
                    </Badge>
                  ) : null}
                </div>
                {items.length === 0 ? (
                  <div className="rounded-md border border-dashed p-4 text-center">
                    <p className="text-xs text-muted-foreground">None</p>
                  </div>
                ) : (
                  items.map((c) => (
                    <ConversationCard
                      key={c.id}
                      convo={c}
                      contactsById={contactsById}
                      listingsById={listingsById}
                    />
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
