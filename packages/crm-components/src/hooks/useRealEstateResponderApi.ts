import { useMemo } from "react";

import * as responderApi from "../api/realestate-responder";
import { useCrmClient } from "../provider/CrmProvider";

/**
 * TanStack-Query-friendly wrappers over the hand-written RE-responder client
 * (the T3 "Midnight Responder" admin panels — latency stats + tier-routing
 * config), bound to the configured CrmClient via useCrmClient(). The BE routes
 * are @ConditionalOnProperty-gated for both the realestate and responder
 * modules, so this is a hand-written client with no generated counterpart (the
 * T1 RE NurtureDashboard / AR / proposals precedent).
 */
export function useRealEstateResponderApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      getLatencyStats: (zoneId?: string) =>
        responderApi.getResponderLatencyStats(client, zoneId),
      getConfig: () => responderApi.getResponderConfig(client),
      saveConfig: (body: responderApi.MidnightResponderConfigDTO) =>
        responderApi.saveResponderConfig(client, body),
    }),
    [client],
  );
}
