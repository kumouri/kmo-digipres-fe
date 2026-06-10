import { useMemo } from "react";

import * as rescheduleApi from "../api/reschedule";
import { useCrmClient } from "../provider/CrmProvider";

/**
 * TanStack-Query-friendly wrappers over the hand-written RescheduleFlow client
 * (the T7 "RescheduleFlow" admin panel — health waitlist board + fill-funnel
 * stats), bound to the configured CrmClient via useCrmClient(). The BE routes
 * are @ConditionalOnProperty-gated for both the frontdesk and waitlist modules,
 * so this is a hand-written client with no generated counterpart (the T4
 * SwitchboardPanel / T5 CallbackQueue precedent). PHI-free by construction.
 */
export function useRescheduleApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      listWaitlist: () => rescheduleApi.listWaitlist(client),
      joinWaitlist: (
        body: rescheduleApi.WaitlistJoinRequest,
        idempotencyKey: string,
      ) => rescheduleApi.joinWaitlist(client, body, idempotencyKey),
      getFillStats: () => rescheduleApi.getRescheduleFillStats(client),
    }),
    [client],
  );
}
