import { useMemo } from "react";
import * as inboxApi from "../api/inbox";
import { useCrmClient } from "../provider/CrmProvider";

export function useInboxApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      listThreads: () => inboxApi.listThreads(client),
      getThread: (id: string) => inboxApi.getThread(client, id),
      claimThread: (id: string) => inboxApi.claimThread(client, id),
      listMessages: (threadId: string) => inboxApi.listMessages(client, threadId),
      replyToThread: (threadId: string, body: string) =>
        inboxApi.replyToThread(client, threadId, body),
    }),
    [client],
  );
}
