import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../primitives/dialog";
import { DataTable, type Column } from "../../components/DataTable";
import { useTicketsApi } from "../../hooks/useTicketsApi";
import type { Ticket } from "../../types/api";
import { TICKET_PRIORITY_LABELS, TICKET_STATUS_LABELS, labelFor } from "../labels";

const PRIORITY_VARIANT: Record<string, "default" | "muted" | "outline"> = {
  LOW: "muted",
  MEDIUM: "default",
  HIGH: "default",
  URGENT: "default",
};

const columns: Column<Ticket>[] = [
  {
    key: "subject",
    header: "Subject",
    cell: (t) => (
      <span className="font-medium" data-testid="ticket-row-subject">
        {t.subject ?? "—"}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (t) => (
      <Badge variant="muted">{labelFor(TICKET_STATUS_LABELS, t.status, "New")}</Badge>
    ),
  },
  {
    key: "priority",
    header: "Priority",
    cell: (t) => (
      <Badge variant={PRIORITY_VARIANT[t.priority ?? "LOW"] ?? "muted"}>
        {labelFor(TICKET_PRIORITY_LABELS, t.priority, "Low")}
      </Badge>
    ),
  },
  {
    key: "slaResponseDue",
    header: "Response due",
    cell: (t) => {
      if (!t.slaResponseDue) return <span className="text-muted-foreground">—</span>;
      const due = new Date(t.slaResponseDue);
      const now = new Date();
      const overdue = due < now;
      return (
        <span
          className={overdue ? "text-destructive font-medium" : ""}
          data-testid={overdue ? "sla-badge-overdue" : "sla-badge-ok"}
        >
          {t.slaResponseDue}
        </span>
      );
    },
  },
];

export function TicketsList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const ticketsApi = useTicketsApi();
  const [createOpen, setCreateOpen] = useState(false);
  const [subject, setSubject] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: ticketsApi.listTickets,
  });

  const createMutation = useMutation({
    mutationFn: ticketsApi.createTicket,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Ticket created.");
      setCreateOpen(false);
      if (created.id) navigate(`/tickets/${created.id}`);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Create failed.");
    },
  });

  return (
    <section className="flex flex-col gap-4" data-testid="tickets-page">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium">Tickets</h1>
          <p className="text-sm text-muted-foreground">
            Support requests from your clients, and where each one stands.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} data-testid="new-ticket">
          <Plus /> New ticket
        </Button>
      </header>

      <DataTable
        columns={columns}
        rows={data}
        rowKey={(r) => r.id ?? Math.random().toString()}
        isLoading={isLoading}
        emptyMessage="No tickets yet — they'll appear here when customers need help."
        onRowClick={(r) => r.id && navigate(`/tickets/${r.id}`)}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New ticket</DialogTitle>
            <DialogDescription>
              Create a support ticket.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium">
              Subject *
              <input
                className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                data-testid="ticket-subject-input"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={!subject.trim() || createMutation.isPending}
                onClick={() =>
                  createMutation.mutate({
                    subject,
                    status: "NEW",
                    priority: "MEDIUM",
                  })
                }
                data-testid="create-ticket-submit"
              >
                Create ticket
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
