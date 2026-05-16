import { useMemo } from "react";
import * as quotesApi from "../api/quotes";
import { useCrmClient } from "../provider/CrmProvider";
import type { Quote } from "../types/api";

export function useQuotesApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      listQuotes: () => quotesApi.listQuotes(client),
      getQuote: (id: string) => quotesApi.getQuote(client, id),
      createQuote: (body: Quote) => quotesApi.createQuote(client, body),
      updateQuote: (id: string, body: Quote) => quotesApi.updateQuote(client, id, body),
      deleteQuote: (id: string) => quotesApi.deleteQuote(client, id),
      changeQuoteStatus: (id: string, target: string) =>
        quotesApi.changeQuoteStatus(client, id, target),
    }),
    [client],
  );
}
