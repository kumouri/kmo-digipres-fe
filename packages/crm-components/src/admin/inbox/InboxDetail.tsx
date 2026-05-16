import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, Link } from "react-router";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../primitives/card";
import { Textarea } from "../../primitives/textarea";
import { useInboxApi } from "../../hooks/useInboxApi";

export function InboxDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const inboxApi = useInboxApi();
  const [replyText, setReplyText] = useState("");

  const { data: thread, isLoading } = useQuery({
    queryKey: ["inbox", id],
    queryFn: () => inboxApi.getThread(id!),
    enabled: !!id,
  });

  const { data: messages } = useQuery({
    queryKey: ["inbox", id, "messages"],
    queryFn: () => inboxApi.listMessages(id!),
    enabled: !!id,
  });

  const claimMutation = useMutation({
    mutationFn: () => inboxApi.claimThread(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox", id] });
      qc.invalidateQueries({ queryKey: ["inbox"] });
      toast.success("Thread claimed.");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Claim failed.");
    },
  });

  const replyMutation = useMutation({
    mutationFn: (body: string) => inboxApi.replyToThread(id!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox", id, "messages"] });
      toast.success("Reply sent.");
      setReplyText("");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Reply failed.");
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!thread) return <p className="text-muted-foreground">Thread not found.</p>;

  return (
    <section className="flex flex-col gap-4" data-testid="inbox-thread-detail">
      <header className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/inbox")}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-medium">{thread.subjectNormalized ?? "—"}</h1>
        <Badge variant="muted">{thread.status ?? "UNCLAIMED"}</Badge>
      </header>

      <div className="text-sm text-muted-foreground">
        From: {thread.fromAddress ?? "—"} · {thread.messageCount ?? 0} message(s)
      </div>

      {thread.status === "UNCLAIMED" && (
        <Button
          onClick={() => claimMutation.mutate()}
          disabled={claimMutation.isPending}
          data-testid="claim-thread-btn"
        >
          Claim thread
        </Button>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {(messages ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No messages.</p>
          )}
          {(messages ?? []).map((m) => (
            <div key={m.id} className="border-b pb-2" data-testid="inbox-message">
              <div className="text-xs text-muted-foreground mb-1">
                From: {m.from ?? "—"} · {m.receivedAt ?? "—"}
              </div>
              <div className="text-sm">
                {m.textBody ?? m.htmlBody ?? "(no content)"}
              </div>
            </div>
          ))}

          <Textarea
            placeholder="Write a reply…"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            data-testid="reply-input"
          />
          <Button
            onClick={() => replyMutation.mutate(replyText)}
            disabled={!replyText.trim() || replyMutation.isPending}
            data-testid="reply-submit"
          >
            Send reply
          </Button>
        </CardContent>
      </Card>

      <Button variant="ghost" asChild>
        <Link to="/inbox">All threads</Link>
      </Button>
    </section>
  );
}
