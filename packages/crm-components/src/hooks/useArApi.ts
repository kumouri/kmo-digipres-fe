import { useMemo } from "react";

import * as arApi from "../api/ar";
import type { RecordPromiseRequest } from "../api/ar";
import { useCrmClient } from "../provider/CrmProvider";

/**
 * TanStack-Query-friendly wrappers over the hand-written AR client (the
 * AR-aging dashboard — aging report, promise-to-pay list/record), bound to the
 * configured CrmClient via useCrmClient(). The BE routes are
 * @ConditionalOnProperty-gated, so this is a hand-written client with no
 * generated counterpart (the ChairFill CF-5 / HS-4 precedent).
 */
export function useArApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      getAgingReport: () => arApi.getAgingReport(client),
      listPromises: (invoiceId: string) =>
        arApi.listPromises(client, invoiceId),
      recordPromiseToPay: (body: RecordPromiseRequest) =>
        arApi.recordPromiseToPay(client, body),
    }),
    [client],
  );
}
