import { useMemo } from "react";

import * as proposalsApi from "../api/proposals";
import type { ProposalDraftRequest } from "../api/proposals";
import { useCrmClient } from "../provider/CrmProvider";

/**
 * TanStack-Query-friendly wrappers over the hand-written Proposals client
 * (the SOW Studio — draft, fetch, PDF URL), bound to the configured
 * CrmClient via useCrmClient(). The BE routes are
 * @ConditionalOnProperty-gated, so this is a hand-written client with no
 * generated counterpart (the AR / ChairFill / FrontDesk-IQ precedent).
 */
export function useProposalsApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      draftProposal: (req: ProposalDraftRequest) =>
        proposalsApi.draftProposal(client, req),
      getProposal: (id: string) => proposalsApi.getProposal(client, id),
      getProposalPdfUrl: (id: string) =>
        proposalsApi.getProposalPdfUrl(client, id),
    }),
    [client],
  );
}
