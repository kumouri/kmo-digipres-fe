import type { GbpReviewReply, PostReplyRequest } from "../types/api";
import type { CrmClient } from "./client";

// Google Business Profile review-reply approval queue.
//
// The backend poller drafts on-brand replies to incoming Google reviews and
// leaves them DRAFTED for the owner to review. These three calls back the
// admin queue: list the drafts, post the (possibly edited) reply to Google,
// or skip it. All three are ADMIN-guarded on the backend.

/** List the replies still waiting on the owner (DRAFTED, most recent first). */
export function listReviewReplies(client: CrmClient): Promise<GbpReviewReply[]> {
  return client.api<GbpReviewReply[]>("/gbp/review-replies");
}

/**
 * Approve & post a drafted reply to Google. Pass the edited reply text to post
 * the owner's wording; omit it to post the draft as-is. Returns the updated
 * record (now POSTED).
 */
export function postReviewReply(
  client: CrmClient,
  id: string,
  reply?: string,
): Promise<GbpReviewReply> {
  const body: PostReplyRequest = reply !== undefined ? { reply } : {};
  return client.api<GbpReviewReply>(`/gbp/review-replies/${id}/post`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Skip a drafted reply — nothing is posted to Google. Returns it as SKIPPED. */
export function skipReviewReply(
  client: CrmClient,
  id: string,
): Promise<GbpReviewReply> {
  return client.api<GbpReviewReply>(`/gbp/review-replies/${id}/skip`, {
    method: "POST",
  });
}
