import { useMemo } from "react";
import * as kbApi from "../api/knowledge-base";
import { useCrmClient } from "../provider/CrmProvider";
import type { KnowledgeBaseArticle } from "../types/api";

export function useKnowledgeBaseApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      listArticles: () => kbApi.listArticles(client),
      getArticle: (id: string) => kbApi.getArticle(client, id),
      createArticle: (body: KnowledgeBaseArticle) => kbApi.createArticle(client, body),
      updateArticle: (id: string, body: KnowledgeBaseArticle) =>
        kbApi.updateArticle(client, id, body),
      deleteArticle: (id: string) => kbApi.deleteArticle(client, id),
      publishArticle: (id: string) => kbApi.publishArticle(client, id),
      searchArticles: (query: string) => kbApi.searchArticles(client, query),
    }),
    [client],
  );
}
