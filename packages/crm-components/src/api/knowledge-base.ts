import type { KnowledgeBaseArticle } from "../types/api";
import type { CrmClient } from "./client";

export function listArticles(client: CrmClient): Promise<KnowledgeBaseArticle[]> {
  return client.api<KnowledgeBaseArticle[]>("/knowledge-base/articles");
}

export function getArticle(client: CrmClient, id: string): Promise<KnowledgeBaseArticle> {
  return client.api<KnowledgeBaseArticle>(`/knowledge-base/articles/${id}`);
}

export function createArticle(
  client: CrmClient,
  body: KnowledgeBaseArticle,
): Promise<KnowledgeBaseArticle> {
  return client.api<KnowledgeBaseArticle>("/knowledge-base/articles", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateArticle(
  client: CrmClient,
  id: string,
  body: KnowledgeBaseArticle,
): Promise<KnowledgeBaseArticle> {
  return client.api<KnowledgeBaseArticle>(`/knowledge-base/articles/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteArticle(client: CrmClient, id: string): Promise<void> {
  return client.api<void>(`/knowledge-base/articles/${id}`, { method: "DELETE" });
}

export function publishArticle(
  client: CrmClient,
  id: string,
): Promise<KnowledgeBaseArticle> {
  return client.api<KnowledgeBaseArticle>(`/knowledge-base/articles/${id}/publish`, {
    method: "POST",
  });
}

export function searchArticles(
  client: CrmClient,
  query: string,
): Promise<KnowledgeBaseArticle[]> {
  return client.api<KnowledgeBaseArticle[]>("/knowledge-base/search", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}
