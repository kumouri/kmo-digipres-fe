import { useMemo } from "react";
import * as aiApi from "../api/ai";
import { useCrmClient } from "../provider/CrmProvider";
import type { AskAiRequest, SummarizeBody, DraftReplyBody } from "../types/api";

export function useAiApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      askAi: (body: AskAiRequest) => aiApi.askAi(client, body),
      summarizeTimeline: (body: SummarizeBody) => aiApi.summarizeTimeline(client, body),
      draftReply: (body: DraftReplyBody) => aiApi.draftReply(client, body),
    }),
    [client],
  );
}
