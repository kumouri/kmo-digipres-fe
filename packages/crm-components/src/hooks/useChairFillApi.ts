import { useMemo } from "react";

import * as chairFillApi from "../api/chairfill";
import { useCrmClient } from "../provider/CrmProvider";
import type { PasteInReviewRequest } from "../types/api";

/**
 * TanStack-Query-friendly wrappers over the hand-written ChairFill client (the
 * salon flagship CF-5 surfaces — no-show risk view, waitlist board, and the
 * review paste-in), bound to the configured CrmClient via useCrmClient(). The
 * BE routes are @ConditionalOnProperty-gated, so this is a hand-written client
 * with no generated counterpart (the Home-Services HS-4 precedent).
 */
export function useChairFillApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      listRiskBookings: (range?: { from?: string; to?: string }) =>
        chairFillApi.listRiskBookings(client, range),
      getWaitlistBoard: (offerLimit?: number) =>
        chairFillApi.getWaitlistBoard(client, offerLimit),
      listWaitlistEntries: () => chairFillApi.listWaitlistEntries(client),
      listWaitlistOffers: (limit?: number) =>
        chairFillApi.listWaitlistOffers(client, limit),
      draftSalonReviewReply: (body: PasteInReviewRequest) =>
        chairFillApi.draftSalonReviewReply(client, body),
    }),
    [client],
  );
}
