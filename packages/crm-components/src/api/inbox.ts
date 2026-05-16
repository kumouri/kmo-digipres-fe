import type { InboxThread, InboxMessage } from "../types/api";
import type { CrmClient } from "./client";

export function listThreads(client: CrmClient): Promise<InboxThread[]> {
  return client.api<InboxThread[]>("/inbox/threads");
}

export function getThread(client: CrmClient, id: string): Promise<InboxThread> {
  return client.api<InboxThread>(`/inbox/threads/${id}`);
}

export function claimThread(client: CrmClient, id: string): Promise<InboxThread> {
  return client.api<InboxThread>(`/inbox/threads/${id}/claim`, {
    method: "POST",
  });
}

export function listMessages(
  client: CrmClient,
  threadId: string,
): Promise<InboxMessage[]> {
  return client.api<InboxMessage[]>(`/inbox/threads/${threadId}/messages`);
}

export function replyToThread(
  client: CrmClient,
  threadId: string,
  body: string,
): Promise<InboxMessage> {
  return client.api<InboxMessage>(`/inbox/threads/${threadId}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}
