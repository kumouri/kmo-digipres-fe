import { useMemo } from "react";

import * as styleConsultApi from "../api/styleconsult";
import type { StyleConsultStatus } from "../api/styleconsult";
import { useCrmClient } from "../provider/CrmProvider";

/**
 * TanStack-Query-friendly wrappers over the hand-written StyleConsult AI client
 * (T9 consult inbox + analytics + token-issue), bound to the configured
 * CrmClient via useCrmClient().
 *
 * The BE StyleConsultController and StyleConsultTokenController are
 * @ConditionalOnProperty(kmosf.modules.chairfill)-gated, so this is a
 * hand-written client with no generated counterpart (the T8 QuoteNow /
 * T5 CallbackController / T4 SwitchboardController precedent).
 */
export function useStyleConsultApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      listConsults: (status?: StyleConsultStatus) =>
        styleConsultApi.listConsults(client, status),
      getConsult: (id: string) => styleConsultApi.getConsult(client, id),
      getAnalytics: () => styleConsultApi.getStyleConsultAnalytics(client),
      issueToken: () => styleConsultApi.issueStyleConsultToken(client),
    }),
    [client],
  );
}
