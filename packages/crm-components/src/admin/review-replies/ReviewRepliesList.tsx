import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send, SkipForward, Star } from "lucide-react";

import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../primitives/card";
import { Textarea } from "../../primitives/textarea";
import { useReviewRepliesApi } from "../../hooks/useReviewRepliesApi";
import type { GbpReviewReply } from "../../types/api";

const REVIEW_REPLIES_KEY = ["review-replies"] as const;

/** Five stars, filled up to `rating` (clamped 0–5). */
function StarRating({ rating }: { rating: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span
      className="flex items-center gap-0.5"
      aria-label={`${filled} out of 5 stars`}
      data-testid="review-rating"
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={
            i < filled
              ? "size-4 fill-amber-400 text-amber-400"
              : "size-4 text-muted-foreground/40"
          }
          aria-hidden
        />
      ))}
    </span>
  );
}

function ReviewReplyCard({ reply }: { reply: GbpReviewReply }) {
  const qc = useQueryClient();
  const api = useReviewRepliesApi();

  // Pre-fill the editor with the AI draft. The owner edits in place; the edited
  // text is what gets posted. A reply that was ledgered without a draft (the AI
  // step failed upstream) starts empty so the owner can write one.
  const [draft, setDraft] = useState(reply.draftedReply ?? "");

  const postMutation = useMutation({
    mutationFn: () => api.postReviewReply(reply.id!, draft),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REVIEW_REPLIES_KEY });
      toast.success("Reply posted to Google.");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Couldn't post the reply."),
  });

  const skipMutation = useMutation({
    mutationFn: () => api.skipReviewReply(reply.id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REVIEW_REPLIES_KEY });
      toast.success("Reply skipped.");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Couldn't skip the reply."),
  });

  const busy = postMutation.isPending || skipMutation.isPending;

  return (
    <Card data-testid="review-reply-card">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle
            className="text-base"
            data-testid="review-reply-reviewer"
          >
            {reply.reviewerName?.trim() || "A Google reviewer"}
          </CardTitle>
          <div className="flex items-center gap-3">
            <StarRating rating={reply.rating ?? 0} />
            {reply.reviewCreateTime ? (
              <span className="text-xs text-muted-foreground">
                {new Date(reply.reviewCreateTime).toLocaleDateString()}
              </span>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* The customer's review */}
        {reply.comment?.trim() ? (
          <blockquote
            className="border-l-2 border-muted pl-3 text-sm text-foreground/90"
            data-testid="review-reply-comment"
          >
            {reply.comment}
          </blockquote>
        ) : (
          <p className="text-sm italic text-muted-foreground">
            This reviewer left a rating but no written comment.
          </p>
        )}

        {/* The editable AI-drafted reply */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`reply-${reply.id}`}
            className="text-sm font-medium"
          >
            Your reply
          </label>
          <Textarea
            id={`reply-${reply.id}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={busy}
            rows={4}
            placeholder="Write a reply to this reviewer…"
            data-testid="review-reply-textarea"
          />
          <p className="text-xs text-muted-foreground">
            We drafted this for you. Edit it however you like before posting.
          </p>
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2">
        <Button
          onClick={() => postMutation.mutate()}
          disabled={busy || !draft.trim()}
          data-testid="review-reply-post"
        >
          <Send className="size-4" />
          {postMutation.isPending ? "Posting…" : "Approve & post"}
        </Button>
        <Button
          variant="outline"
          onClick={() => skipMutation.mutate()}
          disabled={busy}
          data-testid="review-reply-skip"
        >
          <SkipForward className="size-4" />
          {skipMutation.isPending ? "Skipping…" : "Skip"}
        </Button>
      </CardFooter>
    </Card>
  );
}

export function ReviewRepliesList() {
  const api = useReviewRepliesApi();

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: REVIEW_REPLIES_KEY,
    queryFn: api.listReviewReplies,
  });

  return (
    <section className="flex flex-col gap-4" data-testid="review-replies-page">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium">Review replies</h1>
          <p className="text-sm text-muted-foreground">
            New Google reviews with a reply we drafted for you. Edit each one,
            then post it or skip it.
          </p>
        </div>
        {data && data.length > 0 ? (
          <Badge variant="secondary" data-testid="review-replies-count">
            {data.length} waiting
          </Badge>
        ) : null}
      </header>

      {isLoading ? (
        <p
          className="text-sm text-muted-foreground"
          data-testid="review-replies-loading"
        >
          Loading…
        </p>
      ) : isError ? (
        <div
          className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
          data-testid="review-replies-error"
        >
          <p className="text-sm text-foreground">
            We couldn't load your review replies.
            {error instanceof Error ? ` ${error.message}` : ""}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            data-testid="review-replies-retry"
          >
            {isRefetching ? "Retrying…" : "Try again"}
          </Button>
        </div>
      ) : !data || data.length === 0 ? (
        <div
          className="rounded-md border border-dashed p-8 text-center"
          data-testid="review-replies-empty"
        >
          <p className="text-sm text-muted-foreground">
            No review replies waiting — new Google reviews will show up here for
            your approval.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4" data-testid="review-replies-list">
          {data.map((reply) => (
            <ReviewReplyCard key={reply.id} reply={reply} />
          ))}
        </div>
      )}
    </section>
  );
}
