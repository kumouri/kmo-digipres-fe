import { useMemo } from "react";

import * as dispatchApi from "../api/dispatch";
import type { ApplyRequest } from "../api/dispatch";
import { useCrmClient } from "../provider/CrmProvider";

/**
 * TanStack-Query-friendly wrappers over the hand-written DispatchIQ client
 * (T14 optimize + apply + analytics), bound to the configured CrmClient via
 * useCrmClient().
 *
 * The DispatchController is @ConditionalOnProperty(kmosf.modules.dispatch)-
 * gated, so this is a hand-written client with no generated counterpart (the
 * T13 TechCopilotApi / T11 QuoteCloserApi / T8 QuotingApi precedent).
 *
 * apply() sends an Idempotency-Key header per the @IdempotentRoute contract
 * (the T7 RescheduleBoard / T5 CallbackController precedent).
 */
export function useDispatchApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      /** Propose an optimized schedule — GET /dispatch/optimize?date=<ISO> */
      optimize: (date: string) => dispatchApi.optimizeDispatch(client, date),

      /**
       * Commit reviewed assignment decisions — POST /dispatch/apply.
       * Sends Idempotency-Key per @IdempotentRoute contract.
       */
      apply: (body: ApplyRequest) => dispatchApi.applyDispatch(client, body),

      /** Dispatch analytics for a day — GET /dispatch/analytics?date=<ISO> */
      analytics: (date: string) =>
        dispatchApi.getDispatchAnalytics(client, date),
    }),
    [client],
  );
}
