import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";

import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../primitives/dialog";
import { DataTable, type Column } from "../../components/DataTable";
import { useKnowledgeBaseApi } from "../../hooks/useKnowledgeBaseApi";
import type { KnowledgeBaseArticle } from "../../types/api";

const columns: Column<KnowledgeBaseArticle>[] = [
  {
    key: "title",
    header: "Title",
    cell: (a) => (
      <span className="font-medium" data-testid="kb-article-title">
        {a.title ?? "—"}
      </span>
    ),
  },
  {
    key: "publishedAt",
    header: "Status",
    cell: (a) =>
      a.publishedAt ? (
        <Badge variant="default">Published</Badge>
      ) : (
        <Badge variant="muted">Draft</Badge>
      ),
  },
  {
    key: "tags",
    header: "Tags",
    cell: (a) =>
      (a.tags ?? []).length > 0 ? (
        <div className="flex gap-1 flex-wrap">
          {(a.tags ?? []).map((t) => (
            <Badge key={t} variant="outline">
              {t}
            </Badge>
          ))}
        </div>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
];

export function KnowledgeBaseList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const kbApi = useKnowledgeBaseApi();
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["knowledge-base"],
    queryFn: kbApi.listArticles,
  });

  const { data: searchResults, refetch: runSearch } = useQuery({
    queryKey: ["knowledge-base", "search", searchQuery],
    queryFn: () => kbApi.searchArticles(searchQuery),
    enabled: false,
  });

  const createMutation = useMutation({
    mutationFn: kbApi.createArticle,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["knowledge-base"] });
      toast.success("Article created.");
      setCreateOpen(false);
      if (created.id) navigate(`/knowledge-base/${created.id}`);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Create failed.");
    },
  });

  const displayData = searchResults ?? data;

  return (
    <section className="flex flex-col gap-4" data-testid="kb-page">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium">Knowledge Base</h1>
          <p className="text-sm text-muted-foreground">
            Help articles and internal documentation.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} data-testid="new-kb-article">
          <Plus /> New article
        </Button>
      </header>

      <div className="flex gap-2">
        <input
          className="flex-1 rounded border px-2 py-1 text-sm"
          placeholder="Search articles…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-testid="kb-search-input"
        />
        <Button variant="outline" onClick={() => runSearch()} data-testid="kb-search-btn">
          <Search className="size-4" /> Search
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={displayData}
        rowKey={(r) => r.id ?? r.slug ?? Math.random().toString()}
        isLoading={isLoading}
        emptyMessage="No articles yet."
        onRowClick={(r) => r.id && navigate(`/knowledge-base/${r.id}`)}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New article</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium">
              Title *
              <input
                className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                data-testid="kb-title-input"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={!newTitle.trim() || createMutation.isPending}
                onClick={() =>
                  createMutation.mutate({
                    title: newTitle,
                    body: "",
                    tags: [],
                  })
                }
                data-testid="create-kb-article-submit"
              >
                Create article
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
