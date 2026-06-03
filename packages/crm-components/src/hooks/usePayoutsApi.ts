import { useMemo } from "react";

import * as payoutsApi from "../api/payouts";
import { useCrmClient } from "../provider/CrmProvider";

// TanStack-friendly wrappers over the admin /reports/payout fetchers, bound to
// the configured CrmClient. Used by the team member's Payout tab.
export function usePayoutsApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      getPayout: (userId: string, from: string, to: string) =>
        payoutsApi.getPayout(client, userId, from, to),
      getPayoutYtd: (userId: string, year: number) =>
        payoutsApi.getPayoutYtd(client, userId, year),
    }),
    [client],
  );
}
