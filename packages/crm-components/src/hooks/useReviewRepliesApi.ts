import { useMemo } from "react";

import * as reviewRepliesApi from "../api/gbp-review-replies";
import { useCrmClient } from "../provider/CrmProvider";

export function useReviewRepliesApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      listReviewReplies: () => reviewRepliesApi.listReviewReplies(client),
      postReviewReply: (id: string, reply?: string) =>
        reviewRepliesApi.postReviewReply(client, id, reply),
      skipReviewReply: (id: string) =>
        reviewRepliesApi.skipReviewReply(client, id),
    }),
    [client],
  );
}
