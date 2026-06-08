import { useMemo } from "react";

import * as homeServicesApi from "../api/home-services";
import { useCrmClient } from "../provider/CrmProvider";

/**
 * TanStack-Query-friendly wrappers over the hand-written Home Services client
 * (the Missed-Call Inbox + the Schedule / Dismiss work-order actions), bound to
 * the configured CrmClient via useCrmClient().
 */
export function useHomeServicesApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      listMissedCallInbox: () =>
        homeServicesApi.listMissedCallInbox(client),
      scheduleWorkOrder: (
        id: string,
        input: { scheduledStart: string; technicianUserId: string },
      ) => homeServicesApi.scheduleWorkOrder(client, id, input),
      dismissWorkOrder: (id: string) =>
        homeServicesApi.dismissWorkOrder(client, id),
    }),
    [client],
  );
}
