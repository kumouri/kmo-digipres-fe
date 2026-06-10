import { useMemo } from "react";

import * as stylerMatchApi from "../api/stylermatch";
import type { StylerMatchStatus, StylerMatchRequestBody } from "../api/stylermatch";
import { useCrmClient } from "../provider/CrmProvider";

/**
 * TanStack-Query-friendly wrappers over the hand-written StylerMatch client
 * (T12 match inbox + create + analytics + token-issue + book), bound to the
 * configured CrmClient via useCrmClient().
 *
 * The BE StylerMatchController and StylerMatchTokenController are
 * @ConditionalOnProperty(kmosf.modules.chairfill)-gated, so this is a
 * hand-written client with no generated counterpart (the T9 StyleConsult /
 * T8 QuoteNow / T5 Callback precedent).
 */
export function useStylerMatchApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      createMatch: (body: StylerMatchRequestBody) =>
        stylerMatchApi.createStylerMatch(client, body),
      listMatches: (status?: StylerMatchStatus) =>
        stylerMatchApi.listStylerMatches(client, status),
      getMatch: (id: string) => stylerMatchApi.getStylerMatch(client, id),
      getAnalytics: () => stylerMatchApi.getStylerMatchAnalytics(client),
      issueToken: () => stylerMatchApi.issueStylerMatchToken(client),
      bookTopMatch: (token: string, matchId: string, staffMemberId?: string | null) =>
        stylerMatchApi.bookTopStylerMatch(client, token, matchId, staffMemberId),
    }),
    [client],
  );
}
