import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ClipboardPaste, Sparkles, Star } from "lucide-react";

import { Button } from "../../primitives/button";
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
import { useChairFillApi } from "../../hooks/useChairFillApi";
import type { PasteInReviewRequest } from "../../types/api";
import { ReviewRepliesList } from "../review-replies/ReviewRepliesList";

// The review-replies list keys its query on this — invalidate it after a
// paste-in so the freshly drafted salon reply shows up in the queue.
const REVIEW_REPLIES_KEY = ["review-replies"] as const;

const RATING_OPTIONS = ["5", "4", "3", "2", "1"] as const;

/**
 * Paste in a Google or Yelp review and let the AI draft an on-brand reply. The
 * draft lands in the same review-replies queue below (DRAFTED), where a staffer
 * edits then posts or skips it — it's never auto-posted.
 */
function SalonReviewPasteInDialog() {
  const qc = useQueryClient();
  const api = useChairFillApi();
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
      return api.draftSalonReviewReply(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REVIEW_REPLIES_KEY });
      setOpen(false);
      reset();
      toast.success("Drafted a reply — it's in your queue below for a look.");
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
        <Button data-testid="review-paste-in-open">
          <ClipboardPaste className="size-4" />
          Paste in a review
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="review-paste-in-dialog">
        <DialogHeader>
          <DialogTitle>Paste in a review</DialogTitle>
          <DialogDescription>
            Drop in a Google or Yelp review and we'll draft an on-brand reply for
            you. It goes into your queue below — nothing is posted until you
            approve it.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="paste-review-comment">The review</Label>
            <Textarea
              id="paste-review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={draft.isPending}
              rows={5}
              placeholder="Paste the customer's review here…"
              data-testid="review-paste-in-comment"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="paste-review-name">Reviewer name (optional)</Label>
              <Input
                id="paste-review-name"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                disabled={draft.isPending}
                placeholder="e.g. Dana W."
                data-testid="review-paste-in-name"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="paste-review-rating">Stars (optional)</Label>
              <Select
                value={rating}
                onValueChange={setRating}
                disabled={draft.isPending}
              >
                <SelectTrigger
                  id="paste-review-rating"
                  data-testid="review-paste-in-rating"
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
            data-testid="review-paste-in-submit"
          >
            <Sparkles className="size-4" />
            {draft.isPending ? "Drafting…" : "Draft a reply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * ChairFill review inbox (CF-5). The salon's AI review-reply queue: the same
 * DRAFTED replies the {@link ReviewRepliesList} shows (salon paste-in drafts
 * land in the SAME GbpReviewReply queue NMM uses), plus a paste-in action so a
 * staffer can drop in a Google/Yelp review and get an on-brand draft into the
 * queue without waiting on a live Google connection.
 */
export function SalonReviewInbox() {
  return (
    <section className="flex flex-col gap-6" data-testid="salon-review-inbox-page">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-dashed p-4">
        <div className="flex flex-col gap-1">
          <h2 className="flex items-center gap-2 text-base font-medium">
            <Sparkles className="size-4 text-muted-foreground" />
            Got a new review?
          </h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            Paste it in and we'll draft a reply in your salon's voice. It lands
            in the queue below for you to edit and approve.
          </p>
        </div>
        <SalonReviewPasteInDialog />
      </div>

      <ReviewRepliesList />
    </section>
  );
}
