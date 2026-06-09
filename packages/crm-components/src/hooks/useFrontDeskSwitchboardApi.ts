import { useMemo } from "react";

import * as switchboardApi from "../api/frontdesk-switchboard";
import { useCrmClient } from "../provider/CrmProvider";

/**
 * TanStack-Query-friendly wrappers over the hand-written Switchboard client
 * (the T4 "Switchboard AI" admin panels — deflection stats + logistics config),
 * bound to the configured CrmClient via useCrmClient(). The BE routes are
 * @ConditionalOnProperty-gated for both the frontdesk and responder modules, so
 * this is a hand-written client with no generated counterpart (the T3 RE
 * Midnight Responder / T1 / AR / proposals precedent). PHI-free by construction.
 */
export function useFrontDeskSwitchboardApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      getConfig: () => switchboardApi.getSwitchboardConfig(client),
      saveConfig: (body: switchboardApi.SwitchboardConfigRequest) =>
        switchboardApi.saveSwitchboardConfig(client, body),
      getDeflectionStats: () =>
        switchboardApi.getSwitchboardDeflectionStats(client),
    }),
    [client],
  );
}
