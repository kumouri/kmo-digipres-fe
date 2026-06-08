import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  Bot,
  FileText,
  Home,
  PhoneForwarded,
  Quote,
  Target,
  User,
} from "lucide-react";

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
import { useDealsApi } from "../../hooks/useDealsApi";
import type {
  ConciergeCitation,
  ConciergeTurn,
  ContactDTO,
  DealDTO,
} from "../../types/api";
import {
  BUYER_INTENT_LABELS,
  CONVERSATION_STATE_LABELS,
  DISCLOSURE_TYPE_LABELS,
  LEAD_TIER_LABELS,
  labelFor,
} from "../labels";

function conversationKey(id: string) {
  return ["realestate", "conversation", id] as const;
}

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

function budgetText(budget: number | null | undefined): string | null {
  if (budget == null) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(budget);
}

// ── Citation viewer ──────────────────────────────────────────────────────────

/**
 * The proof-of-grounding under an assistant answer: each cited disclosure with
 * its type, a text preview, and the match score — "Answered from: {type} — '…'".
 */
function CitationList({ citations }: { citations: ConciergeCitation[] }) {
  return (
    <div className="mt-2 flex flex-col gap-1.5" data-testid="citation-list">
      <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <Quote className="size-3" />
        Answered from
      </span>
      {citations.map((c, i) => {
        const pct =
          typeof c.score === "number" ? Math.round(c.score * 100) : null;
        return (
          <div
            key={`${c.disclosureId}-${i}`}
            className="flex flex-col gap-0.5 rounded-md border border-emerald-500/30 bg-emerald-50/60 px-2.5 py-1.5 dark:bg-emerald-950/20"
            data-testid="citation"
          >
            <div className="flex items-center justify-between gap-2">
              <Badge variant="secondary" data-testid="citation-type">
                <FileText className="size-3" />
                {labelFor(DISCLOSURE_TYPE_LABELS, c.disclosureType, "General")}
              </Badge>
              {pct !== null ? (
                <span
                  className="text-xs text-muted-foreground"
                  data-testid="citation-score"
                >
                  {pct}% match
                </span>
              ) : null}
            </div>
            {c.contentPreview?.trim() ? (
              <p
                className="text-xs text-foreground/80"
                data-testid="citation-preview"
              >
                "{c.contentPreview}"
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// ── Transcript ───────────────────────────────────────────────────────────────

function TurnBubble({ turn }: { turn: ConciergeTurn }) {
  const isBuyer = turn.role === "BUYER";
  const citations = turn.citations ?? [];

  return (
    <div
      className={`flex ${isBuyer ? "justify-start" : "justify-end"}`}
      data-testid="transcript-turn"
      data-role={turn.role ?? ""}
    >
      <div
        className={`flex max-w-[85%] flex-col gap-1 rounded-lg border p-3 ${
          isBuyer
            ? "bg-muted/40"
            : turn.handoff
              ? "border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/20"
              : "bg-primary/5"
        }`}
      >
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {isBuyer ? (
            <>
              <User className="size-3" />
              Buyer
            </>
          ) : (
            <>
              <Bot className="size-3" />
              Concierge
              {turn.handoff ? (
                <Badge variant="outline" className="ml-1" data-testid="turn-handoff">
                  <PhoneForwarded className="size-3" />
                  Handed to you
                </Badge>
              ) : null}
            </>
          )}
          {turn.at ? (
            <span className="ml-auto font-normal">
              {new Date(turn.at).toLocaleString()}
            </span>
          ) : null}
        </span>
        <p className="whitespace-pre-wrap text-sm text-foreground/90" data-testid="turn-body">
          {turn.body?.trim() || "(no message)"}
        </p>
        {!isBuyer && citations.length > 0 ? (
          <CitationList citations={citations} />
        ) : null}
      </div>
    </div>
  );
}

// ── Side panels ──────────────────────────────────────────────────────────────

function QualificationPanel({
  detail,
  buyer,
  deal,
}: {
  detail: import("../../types/api").ConciergeConversationDetail;
  buyer: ContactDTO | undefined;
  deal: DealDTO | undefined;
}) {
  const q = detail.qualification;
  const who = contactName(buyer);

  return (
    <Card data-testid="qualification-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="size-4 text-muted-foreground" />
          Buyer
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          {who ? (
            buyer?.id ? (
              <Link
                to={`/contacts/${buyer.id}`}
                className="font-medium text-foreground hover:underline"
                data-testid="qualification-buyer-link"
              >
                {who}
              </Link>
            ) : (
              <span className="font-medium text-foreground">{who}</span>
            )
          ) : (
            <span className="text-muted-foreground">Unknown buyer</span>
          )}
          <Badge
            variant={tierBadgeVariant(detail.leadTier)}
            data-testid="qualification-tier"
          >
            {detail.leadTier
              ? `${labelFor(LEAD_TIER_LABELS, detail.leadTier)} lead`
              : "Unscored"}
          </Badge>
        </div>

        {detail.buyerPhone?.trim() ? (
          <div className="text-xs text-muted-foreground" data-testid="qualification-phone">
            Texting from {detail.buyerPhone}
          </div>
        ) : null}

        {q ? (
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2" data-testid="qualification-fields">
            {q.intent ? (
              <div className="flex flex-col">
                <dt className="text-xs text-muted-foreground">Looking to</dt>
                <dd>{labelFor(BUYER_INTENT_LABELS, q.intent)}</dd>
              </div>
            ) : null}
            {budgetText(q.budget) ? (
              <div className="flex flex-col">
                <dt className="text-xs text-muted-foreground">Budget</dt>
                <dd data-testid="qualification-budget">{budgetText(q.budget)}</dd>
              </div>
            ) : null}
            {q.timeline?.trim() ? (
              <div className="flex flex-col">
                <dt className="text-xs text-muted-foreground">Timeline</dt>
                <dd>{q.timeline}</dd>
              </div>
            ) : null}
            {q.financing?.trim() ? (
              <div className="flex flex-col">
                <dt className="text-xs text-muted-foreground">Financing</dt>
                <dd>{q.financing}</dd>
              </div>
            ) : null}
            {q.preApproved != null ? (
              <div className="flex flex-col">
                <dt className="text-xs text-muted-foreground">Pre-approved</dt>
                <dd>{q.preApproved ? "Yes" : "Not yet"}</dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="text-xs italic text-muted-foreground">
            No qualification details captured yet.
          </p>
        )}

        {deal ? (
          <div className="flex flex-col gap-1 border-t pt-3" data-testid="qualification-deal">
            <span className="text-xs text-muted-foreground">Linked deal</span>
            <Link
              to={`/deals/${deal.id}`}
              className="font-medium text-foreground hover:underline"
              data-testid="qualification-deal-link"
            >
              {deal.title?.trim() || "Untitled deal"}
            </Link>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              {deal.stage ? <Badge variant="outline">{deal.stage}</Badge> : null}
              {deal.value != null
                ? new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: deal.currency || "USD",
                    maximumFractionDigits: 0,
                  }).format(deal.value)
                : null}
            </span>
          </div>
        ) : detail.dealId ? (
          <div className="border-t pt-3 text-xs text-muted-foreground">
            A deal has been created for this buyer.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * Real Estate Concierge (RE-5b) — one conversation's full detail: the transcript
 * with an inline citation viewer (each assistant answer shows the disclosures it
 * grounded in, with match scores), the buyer's accumulated qualification, the
 * lead tier, and the linked deal.
 */
export function ConciergeTranscript() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const api = useRealEstateApi();
  const contactsApi = useContactsApi();
  const dealsApi = useDealsApi();

  const { data: detail, isLoading, isError, error } = useQuery({
    queryKey: conversationKey(id ?? ""),
    queryFn: () => api.getConversation(id!),
    enabled: !!id,
  });

  const { data: contacts } = useQuery({
    queryKey: ["contacts"],
    queryFn: contactsApi.listContacts,
  });
  const { data: deals } = useQuery({
    queryKey: ["deals"],
    queryFn: dealsApi.listDeals,
  });

  const buyer = useMemo(() => {
    if (!detail?.contactId) return undefined;
    return (contacts ?? []).find((c) => c.id === detail.contactId);
  }, [contacts, detail?.contactId]);
  const deal = useMemo(() => {
    if (!detail?.dealId) return undefined;
    return (deals ?? []).find((d) => d.id === detail.dealId);
  }, [deals, detail?.dealId]);

  if (!id) return null;

  const turns = detail?.turns ?? [];

  return (
    <section className="flex flex-col gap-4" data-testid="conversation-detail-page">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/concierge")}
          data-testid="conversation-detail-back"
        >
          <ArrowLeft className="size-4" />
          Concierge inbox
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground" data-testid="conversation-detail-loading">
          Loading…
        </p>
      ) : isError || !detail ? (
        <div
          className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
          data-testid="conversation-detail-error"
        >
          <p className="text-sm text-foreground">
            We couldn't load this conversation.
            {error instanceof Error ? ` ${error.message}` : ""}
          </p>
          <Link to="/concierge">
            <Button variant="outline" size="sm">
              Back to inbox
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          {/* Transcript + citations */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" data-testid="conversation-detail-state">
                {labelFor(
                  CONVERSATION_STATE_LABELS,
                  detail.state,
                  "Answering questions",
                )}
              </Badge>
              {detail.listingId ? (
                <Link
                  to={`/listings/${detail.listingId}`}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:underline"
                  data-testid="conversation-detail-listing-link"
                >
                  <Home className="size-3" />
                  View listing
                </Link>
              ) : null}
            </div>

            <Card data-testid="transcript">
              <CardContent className="flex flex-col gap-3 pt-4">
                {turns.length === 0 ? (
                  <p className="text-sm italic text-muted-foreground">
                    No messages in this conversation yet.
                  </p>
                ) : (
                  turns.map((t, i) => <TurnBubble key={i} turn={t} />)
                )}
              </CardContent>
            </Card>
          </div>

          {/* Buyer / qualification / deal panel */}
          <QualificationPanel detail={detail} buyer={buyer} deal={deal} />
        </div>
      )}
    </section>
  );
}
