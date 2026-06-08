import { useQuery } from "@tanstack/react-query";
import { Phone, PhoneCall, PhoneIncoming, ShieldCheck } from "lucide-react";

import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../primitives/card";
import { useFrontDeskApi } from "../../hooks/useFrontDeskApi";
import type { CallbackInboxItemDTO } from "../../types/api";
import { CALLBACK_INTENT_BUCKET_LABELS, labelFor } from "../labels";

export const CALLBACKS_KEY = ["frontdesk", "callbacks"] as const;

/**
 * One after-hours voicemail callback — caller, callback number, the routing
 * bucket, and when it came in.
 *
 * THE MARQUEE FENCE — F2: this card has NO transcript. The BE deliberately
 * never stores the spoken words for a health practice (a patient saying "I need
 * my insulin refilled" must not land in a queryable record), and the DTO it
 * sends has no body/transcript/recording field — so there is literally nothing
 * clinical to render here. We show only the logistics needed to return the call.
 */
function CallbackCard({ item }: { item: CallbackInboxItemDTO }) {
  const who = item.callerName?.trim() || "Unknown caller";
  return (
    <Card data-testid="callback-card" data-intent={item.intentBucket ?? "OTHER"}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle
              className="flex items-center gap-2 text-base"
              data-testid="callback-card-caller"
            >
              <PhoneIncoming className="size-4 text-muted-foreground" />
              {who}
            </CardTitle>
            {item.callbackPhone?.trim() ? (
              <a
                href={`tel:${item.callbackPhone.replace(/\s+/g, "")}`}
                className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                data-testid="callback-card-phone"
              >
                <Phone className="size-3.5" />
                {item.callbackPhone}
              </a>
            ) : null}
          </div>
          <Badge variant="secondary" data-testid="callback-card-intent">
            {labelFor(
              CALLBACK_INTENT_BUCKET_LABELS,
              item.intentBucket,
              "Needs a callback",
            )}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {item.callbackRequested ? (
            <Badge variant="outline" className="gap-1" data-testid="callback-card-requested">
              <PhoneCall className="size-3" />
              Asked for a callback
            </Badge>
          ) : null}
          {item.receivedAt ? (
            <span data-testid="callback-card-received">
              {new Date(item.receivedAt).toLocaleString()}
            </span>
          ) : null}
        </div>

        {/*
          Fence F2 made visible: there is no transcript field on the row, and we
          deliberately never render one. The staffer returns the call; the spoken
          words never left the patient's voicemail.
        */}
        <p
          className="flex items-center gap-1.5 text-xs italic text-muted-foreground"
          data-testid="callback-card-no-transcript"
        >
          <ShieldCheck className="size-3.5" />
          No transcript stored — return the call to hear the details.
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * FrontDesk IQ (FD-5b) — the callback inbox. After-hours voicemail callbacks,
 * newest first, each showing only the logistics a front desk needs to return
 * the call: caller name, callback number, the intent bucket, and when it came
 * in. NO transcript is ever shown (fence F2) — for a health practice the spoken
 * words are deliberately never stored.
 */
export function CallbackInbox() {
  const api = useFrontDeskApi();

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: CALLBACKS_KEY,
    queryFn: api.listCallbacks,
  });

  return (
    <section className="flex flex-col gap-4" data-testid="callback-inbox-page">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2 text-2xl font-medium">
            <PhoneIncoming className="size-6 text-muted-foreground" />
            Callback inbox
          </h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            After-hours voicemails, sorted into who to call back and why. We
            never store the recording or a transcript — just enough to return
            the call.
          </p>
        </div>
        {data && data.length > 0 ? (
          <Badge variant="secondary" data-testid="callback-count">
            {data.length} to call back
          </Badge>
        ) : null}
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground" data-testid="callback-loading">
          Loading…
        </p>
      ) : isError ? (
        <div
          className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
          data-testid="callback-error"
        >
          <p className="text-sm text-foreground">
            We couldn't load your callback inbox.
            {error instanceof Error ? ` ${error.message}` : ""}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            data-testid="callback-retry"
          >
            {isRefetching ? "Retrying…" : "Try again"}
          </Button>
        </div>
      ) : !data || data.length === 0 ? (
        <div
          className="rounded-md border border-dashed p-8 text-center"
          data-testid="callback-empty"
        >
          <p className="text-sm text-muted-foreground">
            Inbox zero. After-hours voicemails will land here, sorted by why the
            caller phoned.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3" data-testid="callback-list">
          {data.map((item) => (
            <CallbackCard key={item.activityId} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
