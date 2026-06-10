import { useMemo } from "react";

import * as quotingApi from "../api/quoting";
import type { QuoteStatus } from "../api/quoting";
import { useCrmClient } from "../provider/CrmProvider";

/**
 * TanStack-Query-friendly wrappers over the hand-written QuoteNow client
 * (T8 quote inbox + price-book config + token-issue), bound to the configured
 * CrmClient via useCrmClient().
 *
 * The BE QuoteInboxController, PriceBookController, and QuoteIntakeTokenController
 * are @ConditionalOnProperty(kmosf.modules.quoting)-gated, so this is a
 * hand-written client with no generated counterpart (the T5 CallbackController /
 * T4 SwitchboardController precedent).
 */
export function useQuotingApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      listQuotes: (status?: QuoteStatus) =>
        quotingApi.listQuotes(client, status),
      getQuote: (id: string) => quotingApi.getQuote(client, id),
      getPriceBook: () => quotingApi.getPriceBook(client),
      savePriceBook: (body: quotingApi.PriceBook) =>
        quotingApi.savePriceBook(client, body),
      issueQuoteToken: () => quotingApi.issueQuoteToken(client),
    }),
    [client],
  );
}
