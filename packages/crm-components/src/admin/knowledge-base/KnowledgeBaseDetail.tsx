import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, Link } from "react-router";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../primitives/card";
import { useKnowledgeBaseApi } from "../../hooks/useKnowledgeBaseApi";

export function KnowledgeBaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const kbApi = useKnowledgeBaseApi();

  const { data: article, isLoading } = useQuery({
    queryKey: ["knowledge-base", id],
    queryFn: () => kbApi.getArticle(id!),
    enabled: !!id,
  });

  const publishMutation = useMutation({
    mutationFn: () => kbApi.publishArticle(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["knowledge-base", id] });
      qc.invalidateQueries({ queryKey: ["knowledge-base"] });
      toast.success("Article published.");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Publish failed.");
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!article) return <p className="text-muted-foreground">Article not found.</p>;

  return (
    <section className="flex flex-col gap-4" data-testid="kb-article-detail">
      <header className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/knowledge-base")}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-medium">{article.title ?? "—"}</h1>
        {article.publishedAt ? (
          <Badge variant="default">Published</Badge>
        ) : (
          <Badge variant="muted">Draft</Badge>
        )}
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
        </CardHeader>
        <CardContent className="text-sm whitespace-pre-wrap">
          {article.body || <span className="text-muted-foreground">(empty)</span>}
        </CardContent>
      </Card>

      {!article.publishedAt && (
        <Button
          onClick={() => publishMutation.mutate()}
          disabled={publishMutation.isPending}
          data-testid="publish-article-btn"
        >
          Publish article
        </Button>
      )}

      <Button variant="ghost" asChild>
        <Link to="/knowledge-base">All articles</Link>
      </Button>
    </section>
  );
}
