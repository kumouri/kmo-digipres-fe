import { useMemo } from "react";

import * as fdNurtureApi from "../api/frontdesk-nurture";
import { useCrmClient } from "../provider/CrmProvider";

/**
 * TanStack-Query-friendly wrappers over the hand-written FrontDesk-nurture
 * client (the Health "RevenueRevive" dashboard — campaign list, per-segment
 * funnel ROI, and the segment-and-enroll trigger), bound to the configured
 * CrmClient via useCrmClient(). The BE routes are @ConditionalOnProperty-gated,
 * so this is a hand-written client with no generated counterpart (the T1 RE
 * NurtureDashboard / AR / proposals precedent).
 */
export function useFrontDeskNurtureApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      listCampaigns: () => fdNurtureApi.listFdNurtureCampaigns(client),
      getAnalytics: (campaignId: string) =>
        fdNurtureApi.getFdNurtureAnalytics(client, campaignId),
      segmentAndEnroll: (campaignId: string) =>
        fdNurtureApi.fdSegmentAndEnroll(client, campaignId),
    }),
    [client],
  );
}
