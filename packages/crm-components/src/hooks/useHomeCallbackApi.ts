import { useMemo } from "react";

import * as callbackApi from "../api/home-callback";
import { useCrmClient } from "../provider/CrmProvider";

/**
 * TanStack-Query-friendly wrappers over the hand-written Home Callback client
 * (the T5 "Instant Callback" dispatcher queue + recovery stats + config),
 * bound to the configured CrmClient via useCrmClient().
 *
 * The BE CallbackController is @ConditionalOnProperty-gated for both the
 * home-services AND responder modules, so this is a hand-written client with
 * no generated counterpart (the T4 SwitchboardController / T3
 * MidnightResponderController precedent).
 */
export function useHomeCallbackApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      listQueue: () => callbackApi.listCallbackQueue(client),
      dispatch: (id: string) => callbackApi.dispatchCallback(client, id),
      getRecoveryStats: () => callbackApi.getCallbackRecoveryStats(client),
      getConfig: () => callbackApi.getCallbackConfig(client),
      saveConfig: (body: callbackApi.CallbackConfigRequest) =>
        callbackApi.saveCallbackConfig(client, body),
    }),
    [client],
  );
}
