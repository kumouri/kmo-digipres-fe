import type { CrmClient } from "./client";
import type { AskAiRequest, AskResult, AiSummary, AiDraft, SummarizeBody, DraftReplyBody } from "../types/api";

export function askAi(client: CrmClient, body: AskAiRequest): Promise<AskResult> {
  return client.api<AskResult>("/ai/ask", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function summarizeTimeline(client: CrmClient, body: SummarizeBody): Promise<AiSummary> {
  return client.api<AiSummary>("/ai/summarize-timeline", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function draftReply(client: CrmClient, body: DraftReplyBody): Promise<AiDraft> {
  return client.api<AiDraft>("/ai/draft-reply", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
