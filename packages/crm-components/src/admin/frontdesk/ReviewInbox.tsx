import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ClipboardCheck,
  ClipboardPaste,
  ShieldAlert,
  ShieldCheck,
  SkipForward,
  Sparkles,
  Star,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../primitives/dialog";
import { Input } from "../../primitives/input";
import { Label } from "../../primitives/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../primitives/select";
import { Textarea } from "../../primitives/textarea";
import { useFrontDeskApi } from "../../hooks/useFrontDeskApi";
import type { DraftedReply, HipaaFlag, PasteInReviewRequest } from "../../types/api";
import { HIPAA_FLAG_CATEGORY_LABELS, labelFor } from "../labels";

export const FRONTDESK_REVIEWS_KEY = ["frontdesk", "reviews"] as const;

const RATING_OPTIONS = ["5", "4", "3", "2", "1"] as const;

/** Five stars, filled up to `rating` (clamped 0–5). */
function StarRating({ rating }: { rating: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span
      className="flex items-center gap-0.5"
      aria-label={`${filled} out of 5 stars`}
      data-testid="frontdesk-review-rating"
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

/**
 * Paste in a Google review and let the AI draft a HIPAA-safe reply. The draft
 * lands in the queue below (DRAFTED) with its HIPAA-lint flags, where a staffer
 * reviews the flags then approves (copy-ready) or skips it — never auto-posted.
 */
function ReviewPasteInDialog() {
  const qc = useQueryClient();
  const api = useFrontDeskApi();
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [rating, setRating] = useState<string>("");

  function reset() {
    setComment("");
    setReviewerName("");
    setRating("");
  }

  const draft = useMutation({
    mutationFn: () => {
      const body: PasteInReviewRequest = { comment: comment.trim() };
      if (reviewerName.trim()) body.reviewerName = reviewerName.trim();
      if (rating) body.rating = Number(rating);
      return api.draftFrontDeskReviewReply(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FRONTDESK_REVIEWS_KEY });
      setOpen(false);
      reset();
      toast.success("Drafted a HIPAA-safe reply — it's in your queue below.");
    },
    onError: (e) =>
      toast.error(
        e instanceof Error ? e.message : "Couldn't draft a reply for that review.",
      ),
  });

  const canSubmit = comment.trim().length > 0 && !draft.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button data-testid="frontdesk-review-paste-in-open">
          <ClipboardPaste className="size-4" />
          Paste in a review
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="frontdesk-review-paste-in-dialog">
        <DialogHeader>
          <DialogTitle>Paste in a review</DialogTitle>
          <DialogDescription>
            Drop in a Google review and we'll draft a reply that's safe to post
            publicly — it never confirms someone was a patient or mentions any
            care. It goes into your queue below; nothing is posted until you
            approve it.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="frontdesk-review-comment">The review</Label>
            <Textarea
              id="frontdesk-review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={draft.isPending}
              rows={5}
              placeholder="Paste the patient's review here…"
              data-testid="frontdesk-review-paste-in-comment"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="frontdesk-review-name">Reviewer name (optional)</Label>
              <Input
                id="frontdesk-review-name"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                disabled={draft.isPending}
                placeholder="e.g. Dana W."
                data-testid="frontdesk-review-paste-in-name"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="frontdesk-review-rating">Stars (optional)</Label>
              <Select
                value={rating}
                onValueChange={setRating}
                disabled={draft.isPending}
              >
                <SelectTrigger
                  id="frontdesk-review-rating"
                  data-testid="frontdesk-review-paste-in-rating"
                >
                  <SelectValue placeholder="No rating" />
                </SelectTrigger>
                <SelectContent>
                  {RATING_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      <span className="flex items-center gap-1">
                        {r}
                        <Star className="size-3.5 fill-amber-400 text-amber-400" />
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={draft.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => draft.mutate()}
            disabled={!canSubmit}
            data-testid="frontdesk-review-paste-in-submit"
          >
            <Sparkles className="size-4" />
            {draft.isPending ? "Drafting…" : "Draft a reply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Flag-category weight: a confirmed-patient-status flag is the sharper HIPAA risk. */
function flagBadgeVariant(
  category: string | null | undefined,
): "destructive" | "default" {
  return category === "PATIENT_STATUS" ? "destructive" : "default";
}

/**
 * The HIPAA-lint panel for a drafted reply. Surfaces every flag the
 * deterministic lint caught (patient-status confirmation or a clinical term) so
 * the staffer reads them before approving — or shows the clean all-clear. The
 * lint never blocks; it informs the human sign-off (fence F4).
 */
function HipaaLintPanel({ flags }: { flags: HipaaFlag[] }) {
  if (flags.length === 0) {
    return (
      <div
        className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/5 px-3 py-2"
        data-testid="frontdesk-review-hipaa-clean"
      >
        <ShieldCheck className="size-4 text-emerald-600" />
        <span className="text-sm text-foreground">
          HIPAA-safe — no patient-status or clinical mentions found.
        </span>
      </div>
    );
  }
  return (
    <div
      className="flex flex-col gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-3"
      data-testid="frontdesk-review-hipaa-flags"
    >
      <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        <ShieldAlert className="size-4 text-destructive" />
        HIPAA check — {flags.length} {flags.length === 1 ? "thing" : "things"} to
        look at before you post
      </p>
      <ul className="flex flex-col gap-1.5">
        {flags.map((flag, i) => (
          <li
            key={`${flag.category}-${flag.term}-${i}`}
            className="flex flex-wrap items-baseline gap-1.5 text-xs text-muted-foreground"
            data-testid="frontdesk-review-hipaa-flag"
          >
            <Badge variant={flagBadgeVariant(flag.category)} className="shrink-0">
              {labelFor(HIPAA_FLAG_CATEGORY_LABELS, flag.category, "Flagged")}
            </Badge>
            {flag.snippet ? (
              <span className="text-foreground/90" data-testid="frontdesk-review-hipaa-snippet">
                “{flag.snippet}”
              </span>
            ) : flag.term ? (
              <span className="text-foreground/90">“{flag.term}”</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One queued draft — the review, the HIPAA-safe reply, the lint flags, approve / skip. */
function DraftedReplyCard({ item }: { item: DraftedReply }) {
  const qc = useQueryClient();
  const api = useFrontDeskApi();
  const reply = item.reply ?? {};
  const flags = item.hipaaFlags ?? [];
  const id = reply.id;

  const approveMutation = useMutation({
    mutationFn: () => api.approveFrontDeskReply(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FRONTDESK_REVIEWS_KEY });
      toast.success("Approved — it's copy-ready to paste into Google.");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Couldn't approve the reply."),
  });

  const skipMutation = useMutation({
    mutationFn: () => api.skipFrontDeskReply(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FRONTDESK_REVIEWS_KEY });
      toast.success("Skipped.");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Couldn't skip the reply."),
  });

  const busy = approveMutation.isPending || skipMutation.isPending;

  return (
    <Card
      data-testid="frontdesk-review-card"
      data-hipaa-flagged={flags.length > 0 ? "yes" : "no"}
    >
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base" data-testid="frontdesk-review-reviewer">
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
        {/* The patient's review */}
        {reply.comment?.trim() ? (
          <blockquote
            className="border-l-2 border-muted pl-3 text-sm text-foreground/90"
            data-testid="frontdesk-review-comment"
          >
            {reply.comment}
          </blockquote>
        ) : (
          <p className="text-sm italic text-muted-foreground">
            This reviewer left a rating but no written comment.
          </p>
        )}

        {/* The HIPAA-safe drafted reply (read-only — copy-ready on approve) */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Drafted reply</span>
          <p
            className="rounded-md border bg-muted/30 p-3 text-sm text-foreground"
            data-testid="frontdesk-review-draft"
          >
            {reply.draftedReply?.trim() ||
              "No draft was generated — write one before you post."}
          </p>
        </div>

        {/* The HIPAA lint result — the headline guardrail, surfaced for the human */}
        <HipaaLintPanel flags={flags} />
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2">
        <Button
          onClick={() => approveMutation.mutate()}
          disabled={busy || !id}
          data-testid="frontdesk-review-approve"
        >
          <ClipboardCheck className="size-4" />
          {approveMutation.isPending ? "Approving…" : "Approve (copy-ready)"}
        </Button>
        <Button
          variant="outline"
          onClick={() => skipMutation.mutate()}
          disabled={busy || !id}
          data-testid="frontdesk-review-skip"
        >
          <SkipForward className="size-4" />
          {skipMutation.isPending ? "Skipping…" : "Skip"}
        </Button>
      </CardFooter>
    </Card>
  );
}

/**
 * FrontDesk IQ (FD-5b) — the review inbox, the flagship's signature demo. A
 * staffer pastes a public review and the BE drafts a HIPAA-safe reply (never
 * confirming patient status, never naming a procedure), runs a deterministic
 * HIPAA lint, and parks it DRAFTED. This surface lists those drafts with their
 * lint flags surfaced, and lets the staffer approve one (copy-ready, to paste
 * into the Google console) or skip it — never auto-posted.
 */
export function ReviewInbox() {
  const api = useFrontDeskApi();

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: FRONTDESK_REVIEWS_KEY,
    queryFn: api.listFrontDeskDraftedReplies,
  });

  return (
    <section className="flex flex-col gap-6" data-testid="frontdesk-review-inbox-page">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-dashed p-4">
        <div className="flex flex-col gap-1">
          <h2 className="flex items-center gap-2 text-base font-medium">
            <Sparkles className="size-4 text-muted-foreground" />
            Got a new review?
          </h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            Paste it in and we'll draft a reply that's safe to post publicly —
            never confirming care or naming a procedure. It lands in the queue
            below with a HIPAA check for you to read before you approve.
          </p>
        </div>
        <ReviewPasteInDialog />
      </div>

      <section className="flex flex-col gap-4">
        <header className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-medium">Review replies</h1>
            <p className="text-sm text-muted-foreground">
              HIPAA-safe drafts waiting for your sign-off. Read the HIPAA check,
              then approve a copy-ready reply or skip it.
            </p>
          </div>
          {data && data.length > 0 ? (
            <Badge variant="secondary" data-testid="frontdesk-review-count">
              {data.length} waiting
            </Badge>
          ) : null}
        </header>

        {isLoading ? (
          <p
            className="text-sm text-muted-foreground"
            data-testid="frontdesk-review-loading"
          >
            Loading…
          </p>
        ) : isError ? (
          <div
            className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
            data-testid="frontdesk-review-error"
          >
            <p className="text-sm text-foreground">
              We couldn't load your review drafts.
              {error instanceof Error ? ` ${error.message}` : ""}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              data-testid="frontdesk-review-retry"
            >
              {isRefetching ? "Retrying…" : "Try again"}
            </Button>
          </div>
        ) : !data || data.length === 0 ? (
          <div
            className="rounded-md border border-dashed p-8 text-center"
            data-testid="frontdesk-review-empty"
          >
            <p className="text-sm text-muted-foreground">
              No drafts waiting. Paste in a review above and we'll draft a
              HIPAA-safe reply for your approval.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4" data-testid="frontdesk-review-list">
            {data.map((item) => (
              <DraftedReplyCard key={item.reply?.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
