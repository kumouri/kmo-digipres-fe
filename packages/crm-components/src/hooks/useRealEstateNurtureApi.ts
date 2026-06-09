import { useMemo } from "react";

import * as nurtureApi from "../api/realestate-nurture";
import { useCrmClient } from "../provider/CrmProvider";

/**
 * TanStack-Query-friendly wrappers over the hand-written RE-nurture client (the
 * RE "Database Goldmine" dashboard — campaign list, per-segment funnel ROI, and
 * the segment-and-enroll trigger), bound to the configured CrmClient via
 * useCrmClient(). The BE routes are @ConditionalOnProperty-gated, so this is a
 * hand-written client with no generated counterpart (the Real Estate RE-5b / AR
 * / proposals precedent).
 */
export function useRealEstateNurtureApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      listCampaigns: () => nurtureApi.listNurtureCampaigns(client),
      getAnalytics: (campaignId: string) =>
        nurtureApi.getNurtureAnalytics(client, campaignId),
      segmentAndEnroll: (campaignId: string) =>
        nurtureApi.segmentAndEnroll(client, campaignId),
    }),
    [client],
  );
}
