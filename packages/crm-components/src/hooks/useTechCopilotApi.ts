import { useMemo } from "react";

import * as techCopilotApi from "../api/tech-copilot";
import type { TechDocRequest } from "../api/tech-copilot";
import { useCrmClient } from "../provider/CrmProvider";

/**
 * TanStack-Query-friendly wrappers over the hand-written Tech Copilot client
 * (T13 ask + query history + feedback + TechDoc CRUD), bound to the configured
 * CrmClient via useCrmClient().
 *
 * Both the TechCopilotController and TechDocController are
 * @ConditionalOnProperty(kmosf.modules.techcopilot)-gated, so this is a
 * hand-written client with no generated counterpart (the T11 QuoteCloserApi /
 * T8 QuotingApi / T5 CallbackController precedent).
 */
export function useTechCopilotApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      /** Ask a question — POST /techcopilot/ask */
      ask: (question: string, equipmentType?: string | null) =>
        techCopilotApi.askCopilot(client, question, equipmentType),

      /** List recent Q&A history — GET /techcopilot/queries */
      listQueries: () => techCopilotApi.listQueries(client),

      /** Submit usefulness feedback — POST /techcopilot/queries/{id}/feedback */
      submitFeedback: (queryId: string, helpful: boolean) =>
        techCopilotApi.submitFeedback(client, queryId, helpful),

      /** Create a TechDoc — POST /techcopilot/docs */
      createDoc: (body: TechDocRequest) =>
        techCopilotApi.createDoc(client, body),

      /** List all TechDocs — GET /techcopilot/docs */
      listDocs: () => techCopilotApi.listDocs(client),

      /** Get a single TechDoc — GET /techcopilot/docs/{id} */
      getDoc: (id: string) => techCopilotApi.getDoc(client, id),

      /** Update a TechDoc — PUT /techcopilot/docs/{id} */
      updateDoc: (id: string, body: TechDocRequest) =>
        techCopilotApi.updateDoc(client, id, body),
    }),
    [client],
  );
}
