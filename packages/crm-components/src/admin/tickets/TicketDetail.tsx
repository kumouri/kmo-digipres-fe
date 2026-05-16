import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, Link } from "react-router";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../primitives/card";
import { Textarea } from "../../primitives/textarea";
import { useTicketsApi } from "../../hooks/useTicketsApi";

type TicketStatus = "NEW" | "OPEN" | "PENDING" | "RESOLVED" | "CLOSED";

const VALID_TRANSITIONS: Record<string, TicketStatus[]> = {
  NEW: ["OPEN"],
  OPEN: ["PENDING", "RESOLVED"],
  PENDING: ["OPEN", "RESOLVED"],
  RESOLVED: ["CLOSED", "OPEN"],
  CLOSED: [],
};

export function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const ticketsApi = useTicketsApi();
  const [commentText, setCommentText] = useState("");

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["tickets", id],
    queryFn: () => ticketsApi.getTicket(id!),
    enabled: !!id,
  });

  const { data: comments } = useQuery({
    queryKey: ["tickets", id, "comments"],
    queryFn: () => ticketsApi.listComments(id!),
    enabled: !!id,
  });

  const transitionMutation = useMutation({
    mutationFn: (target: string) => ticketsApi.transitionTicket(id!, target),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets", id] });
      qc.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Ticket status updated.");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Transition failed.");
    },
  });

  const commentMutation = useMutation({
    mutationFn: (body: string) => ticketsApi.addComment(id!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets", id, "comments"] });
      toast.success("Comment added.");
      setCommentText("");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Comment failed.");
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!ticket) return <p className="text-muted-foreground">Ticket not found.</p>;

  const transitions = VALID_TRANSITIONS[ticket.status ?? "NEW"] ?? [];
  const slaOverdue = ticket.slaBreachedAt != null;

  return (
    <section className="flex flex-col gap-4" data-testid="ticket-detail">
      <header className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/tickets")}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-medium">{ticket.subject ?? "—"}</h1>
        <Badge variant="muted" data-testid="ticket-status-badge">
          {ticket.status ?? "NEW"}
        </Badge>
        <Badge variant="outline">{ticket.priority ?? "MEDIUM"}</Badge>
        {slaOverdue && (
          <Badge variant="default" data-testid="sla-breach-badge">
            SLA Breached
          </Badge>
        )}
      </header>

      {ticket.body && (
        <Card>
          <CardContent className="text-sm pt-4">{ticket.body}</CardContent>
        </Card>
      )}

      {ticket.slaResponseDue && (
        <div className="text-sm" data-testid="sla-info">
          <span className="text-muted-foreground">SLA Response Due:</span>{" "}
          {ticket.slaResponseDue}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {transitions.map((target) => (
          <Button
            key={target}
            variant="outline"
            onClick={() => transitionMutation.mutate(target)}
            disabled={transitionMutation.isPending}
            data-testid={`ticket-transition-${target.toLowerCase()}`}
          >
            → {target}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comments</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {(comments ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No comments yet.</p>
          )}
          {(comments ?? []).map((c) => (
            <div key={c.id} className="border-b pb-2 text-sm" data-testid="ticket-comment">
              <p>{c.body}</p>
              <p className="text-muted-foreground text-xs">{c.createdAt}</p>
            </div>
          ))}
          <Textarea
            placeholder="Add a comment…"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            data-testid="comment-input"
          />
          <Button
            onClick={() => commentMutation.mutate(commentText)}
            disabled={!commentText.trim() || commentMutation.isPending}
            data-testid="comment-submit"
          >
            Add comment
          </Button>
        </CardContent>
      </Card>

      <Button variant="ghost" asChild>
        <Link to="/tickets">All tickets</Link>
      </Button>
    </section>
  );
}
