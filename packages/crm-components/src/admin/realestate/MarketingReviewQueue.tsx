import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  Image as ImageIcon,
  Megaphone,
  ShieldAlert,
  SkipForward,
  Sparkles,
} from "lucide-react";

import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../primitives/card";
import { useRealEstateApi } from "../../hooks/useRealEstateApi";
import type { ListingMarketingDraft } from "../../types/api";
import {
  MARKETING_CHANNEL_LABELS,
  MARKETING_DRAFT_STATUS_LABELS,
  labelFor,
} from "../labels";

export const MARKETING_DRAFTS_KEY = [
  "realestate",
  "marketing",
  "drafts",
] as const;

/** Draft status drives the badge weight — DRAFTED needs the agent's eyes. */
function draftStatusVariant(
  status: string | null | undefined,
): "default" | "secondary" | "muted" {
  switch (status) {
    case "APPROVED":
      return "default";
    case "DRAFTED":
      return "secondary";
    case "SKIPPED":
      return "muted";
    default:
      return "secondary";
  }
}

/**
 * One marketing package in the draft→approve queue (the RE-4 Marketing Studio):
 * the generated pieces per channel, the per-photo callouts, the Fair-Housing
 * flags, and — when DRAFTED — the approve / skip actions. Reused on the listing
 * detail (per-listing history) and the tenant-wide review queue. Never
 * auto-publishes: approve only marks it copy-ready.
 */
export function MarketingDraftCard({
  draft,
  extraInvalidateKeys = [],
}: {
  draft: ListingMarketingDraft;
  /** Extra query keys to invalidate after approve/skip (e.g. a listing's list). */
  extraInvalidateKeys?: QueryKey[];
}) {
  const qc = useQueryClient();
  const api = useRealEstateApi();

  const isDrafted = draft.status === "DRAFTED";
  const flags = draft.fairHousingFlags ?? [];
  const flagged = draft.fairHousingFlagged || flags.length > 0;
  const pieces = draft.pieces ?? [];
  const captions = draft.photoCaptions ?? [];

  function invalidate() {
    qc.invalidateQueries({ queryKey: MARKETING_DRAFTS_KEY });
    for (const key of extraInvalidateKeys) qc.invalidateQueries({ queryKey: key });
  }

  const approve = useMutation({
    mutationFn: () => api.approveMarketingDraft(draft.id!),
    onSuccess: () => {
      invalidate();
      toast.success("Approved — it's copy-ready to paste out.");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Couldn't approve the draft."),
  });

  const skip = useMutation({
    mutationFn: () => api.skipMarketingDraft(draft.id!),
    onSuccess: () => {
      invalidate();
      toast.success("Skipped.");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Couldn't skip the draft."),
  });

  const busy = approve.isPending || skip.isPending;

  return (
    <Card data-testid="marketing-draft-card" data-draft-status={draft.status ?? ""}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="size-4 text-muted-foreground" />
            Marketing package
          </CardTitle>
          <div className="flex items-center gap-2">
            {draft.generationDegraded ? (
              <Badge variant="outline" data-testid="marketing-draft-degraded">
                Partial draft
              </Badge>
            ) : null}
            <Badge
              variant={draftStatusVariant(draft.status)}
              data-testid="marketing-draft-status"
            >
              {labelFor(MARKETING_DRAFT_STATUS_LABELS, draft.status, "Needs review")}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Fair-Housing flags — surfaced, never auto-blocking (the agent decides). */}
        {flagged ? (
          <div
            className="flex flex-col gap-2 rounded-md border border-amber-500/50 bg-amber-50 p-3 dark:bg-amber-950/30"
            data-testid="marketing-fair-housing"
          >
            <p className="flex items-center gap-1.5 text-sm font-medium text-amber-800 dark:text-amber-300">
              <ShieldAlert className="size-4" />
              Fair-Housing check: {flags.length}{" "}
              {flags.length === 1 ? "phrase" : "phrases"} to review
            </p>
            <ul className="flex flex-col gap-1.5">
              {flags.map((f, i) => (
                <li
                  key={`${f.term}-${i}`}
                  className="text-xs text-amber-900/90 dark:text-amber-200/90"
                  data-testid="marketing-fair-housing-flag"
                >
                  <span className="font-medium">"{f.term}"</span>
                  {f.channel ? (
                    <span className="text-amber-700 dark:text-amber-400">
                      {" "}
                      in {labelFor(MARKETING_CHANNEL_LABELS, f.channel)}
                    </span>
                  ) : null}
                  {f.snippet?.trim() ? (
                    <span className="text-amber-800/80 dark:text-amber-300/80">
                      {" "}
                      — …{f.snippet}…
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
            data-testid="marketing-fair-housing-clear"
          >
            <CheckCircle2 className="size-3.5 text-emerald-600" />
            No Fair-Housing concerns flagged.
          </p>
        )}

        {/* The generated pieces, one per channel. */}
        {pieces.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">
            No copy came back for this draft.
          </p>
        ) : (
          <div className="flex flex-col gap-3" data-testid="marketing-pieces">
            {pieces.map((piece, i) => (
              <div
                key={`${piece.channel}-${i}`}
                className="flex flex-col gap-1.5"
                data-testid="marketing-piece"
              >
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {labelFor(MARKETING_CHANNEL_LABELS, piece.channel)}
                </span>
                <p className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm text-foreground/90">
                  {piece.text?.trim() || "(empty)"}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Per-photo feature callouts the vision read produced. */}
        {captions.length > 0 ? (
          <div className="flex flex-col gap-1.5" data-testid="marketing-photo-callouts">
            <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <ImageIcon className="size-3.5" />
              Photo callouts
            </span>
            <ul className="flex flex-col gap-1">
              {captions.map((c, i) => (
                <li
                  key={`${c.photoId}-${i}`}
                  className="text-xs text-muted-foreground"
                >
                  {c.caption?.trim() || "(no caption)"}
                  {c.features && c.features.length > 0 ? (
                    <span className="text-muted-foreground/80">
                      {" "}
                      · {c.features.join(", ")}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>

      {isDrafted ? (
        <CardFooter className="flex flex-wrap gap-2">
          <Button
            onClick={() => approve.mutate()}
            disabled={busy}
            data-testid="marketing-draft-approve"
          >
            <Sparkles className="size-4" />
            {approve.isPending ? "Approving…" : "Approve"}
          </Button>
          <Button
            variant="outline"
            onClick={() => skip.mutate()}
            disabled={busy}
            data-testid="marketing-draft-skip"
          >
            <SkipForward className="size-4" />
            {skip.isPending ? "Skipping…" : "Skip"}
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}

/**
 * Real Estate Concierge (RE-5b) — the marketing review queue. The tenant's
 * DRAFTED marketing packages awaiting an agent's approve / skip (the
 * review-replies draft→approve posture — never auto-published).
 */
export function MarketingReviewQueue() {
  const api = useRealEstateApi();
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: MARKETING_DRAFTS_KEY,
    queryFn: api.listDraftedMarketing,
  });

  return (
    <section className="flex flex-col gap-4" data-testid="marketing-review-page">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2 text-2xl font-medium">
            <Megaphone className="size-6 text-muted-foreground" />
            Marketing review
          </h1>
          <p className="text-sm text-muted-foreground">
            Drafted marketing packages waiting on you. Review the copy and the
            Fair-Housing check, then approve it for paste-out or skip it. Nothing
            is ever auto-published.
          </p>
        </div>
        {data && data.length > 0 ? (
          <Badge variant="secondary" data-testid="marketing-review-count">
            {data.length} waiting
          </Badge>
        ) : null}
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground" data-testid="marketing-review-loading">
          Loading…
        </p>
      ) : isError ? (
        <div
          className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
          data-testid="marketing-review-error"
        >
          <p className="text-sm text-foreground">
            We couldn't load the marketing review queue.
            {error instanceof Error ? ` ${error.message}` : ""}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            data-testid="marketing-review-retry"
          >
            {isRefetching ? "Retrying…" : "Try again"}
          </Button>
        </div>
      ) : !data || data.length === 0 ? (
        <div
          className="rounded-md border border-dashed p-8 text-center"
          data-testid="marketing-review-empty"
        >
          <p className="text-sm text-muted-foreground">
            Nothing to review right now. Generate marketing from a listing and the
            draft will land here for your approval.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4" data-testid="marketing-review-list">
          {data.map((draft) => (
            <MarketingDraftCard key={draft.id} draft={draft} />
          ))}
        </div>
      )}
    </section>
  );
}
