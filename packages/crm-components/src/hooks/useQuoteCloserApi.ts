import { useMemo } from "react";

import * as quoteCloserApi from "../api/quote-closer";
import { useCrmClient } from "../provider/CrmProvider";

/**
 * TanStack-Query-friendly wrappers over the hand-written QuoteCloser client
 * (T11 config read/upsert + recovery analytics), bound to the configured
 * CrmClient via useCrmClient().
 *
 * Both the QuoteCloserConfigController and QuoteCloserController are
 * @ConditionalOnProperty(kmosf.modules.quoting.enabled)-gated AND require
 * the nurture module, so this is a hand-written client with no generated
 * counterpart (the T8 QuotingApi / T5 CallbackController precedent).
 */
export function useQuoteCloserApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      getConfig: () => quoteCloserApi.getQuoteCloserConfig(client),
      saveConfig: (body: quoteCloserApi.QuoteCloserConfigDTO) =>
        quoteCloserApi.saveQuoteCloserConfig(client, body),
      getAnalytics: () => quoteCloserApi.getQuoteCloserAnalytics(client),
    }),
    [client],
  );
}
