import { useMemo } from "react";

import * as reviewBoostApi from "../api/salon-reviewboost";
import { useCrmClient } from "../provider/CrmProvider";

/**
 * TanStack-Query-friendly wrappers over the hand-written Salon ReviewBoost
 * client (the T6 "ReviewBoost" admin board — insights + config read), bound
 * to the configured CrmClient via useCrmClient(). The BE routes are
 * @ConditionalOnProperty-gated for both the chairfill and salon-spa modules,
 * so this is a hand-written client with no generated counterpart (the T4
 * SwitchboardPanel / T3 MidnightResponder / T5 Callback precedent).
 *
 * Both endpoints are read-only; there is no write/mutation method here.
 */
export function useSalonReviewBoostApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      getInsights: () => reviewBoostApi.getSalonReviewBoard(client),
      getConfig: () => reviewBoostApi.getReviewBoostConfig(client),
    }),
    [client],
  );
}
