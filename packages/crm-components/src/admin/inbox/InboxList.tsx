import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";

import { Badge } from "../../primitives/badge";
import { DataTable, type Column } from "../../components/DataTable";
import { useInboxApi } from "../../hooks/useInboxApi";
import type { InboxThread } from "../../types/api";

const columns: Column<InboxThread>[] = [
  {
    key: "subjectNormalized",
    header: "Subject",
    cell: (t) => (
      <span className="font-medium" data-testid="inbox-thread-subject">
        {t.subjectNormalized ?? "—"}
      </span>
    ),
  },
  {
    key: "fromAddress",
    header: "From",
    cell: (t) => t.fromAddress ?? <span className="text-muted-foreground">—</span>,
  },
  {
    key: "status",
    header: "Status",
    cell: (t) => (
      <Badge variant={t.status === "CLAIMED" ? "default" : "muted"}>
        {t.status ?? "UNCLAIMED"}
      </Badge>
    ),
  },
  {
    key: "messageCount",
    header: "Messages",
    cell: (t) => t.messageCount ?? 0,
  },
];

export function InboxList() {
  const navigate = useNavigate();
  const inboxApi = useInboxApi();

  const { data, isLoading } = useQuery({
    queryKey: ["inbox"],
    queryFn: inboxApi.listThreads,
  });

  return (
    <section className="flex flex-col gap-4" data-testid="inbox-page">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium">Inbox</h1>
        <p className="text-sm text-muted-foreground">
          Email threads received by your tenant.
        </p>
      </header>

      <DataTable
        columns={columns}
        rows={data}
        rowKey={(r) => r.id ?? Math.random().toString()}
        isLoading={isLoading}
        emptyMessage="No messages yet — customer conversations will land here."
        onRowClick={(r) => r.id && navigate(`/inbox/${r.id}`)}
      />
    </section>
  );
}
