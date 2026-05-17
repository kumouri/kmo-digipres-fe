import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import { DataTable, type Column } from "../../components/DataTable";
import { useAuditApi } from "../../hooks/useAuditApi";
import type { AuditEventDTO } from "../../types/api";

const ENTITY_TYPES = ["CONTACT", "COMPANY", "DEAL", "TICKET", "INVOICE", "QUOTE", "KB_ARTICLE"] as const;

const OP_VARIANT: Record<string, "default" | "muted" | "outline"> = {
  CREATE: "default",
  UPDATE: "muted",
  DELETE: "outline",
};

const columns: Column<AuditEventDTO>[] = [
  {
    key: "at",
    header: "Time",
    cell: (e) => (
      <span className="text-xs text-muted-foreground" data-testid="audit-event-time">
        {e.at ? new Date(e.at).toLocaleString() : "—"}
      </span>
    ),
  },
  {
    key: "op",
    header: "Op",
    cell: (e) => (
      <Badge variant={OP_VARIANT[e.op ?? ""] ?? "outline"} data-testid="audit-event-op">
        {e.op ?? "—"}
      </Badge>
    ),
  },
  {
    key: "entityType",
    header: "Entity",
    cell: (e) => (
      <span data-testid="audit-event-entity">
        {e.entityType ?? "—"}
      </span>
    ),
  },
  {
    key: "entityId",
    header: "Entity ID",
    cell: (e) => (
      <code className="text-xs text-muted-foreground">{e.entityId ?? "—"}</code>
    ),
  },
  {
    key: "actorUserId",
    header: "Actor",
    cell: (e) => (
      <code className="text-xs text-muted-foreground">{e.actorUserId ?? "—"}</code>
    ),
  },
];

export function AuditList() {
  const auditApi = useAuditApi();
  const [entityType, setEntityType] = useState<string>(ENTITY_TYPES[0]);
  const [entityId, setEntityId] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["audit", entityType, entityId],
    queryFn: () => auditApi.listAuditEvents({ entityType, entityId }),
    enabled: submitted && !!entityId.trim(),
  });


  function handleSearch() {
    setSubmitted(true);
    void refetch();
  }

  return (
    <section className="flex flex-col gap-4" data-testid="audit-page">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium">Audit Log</h1>
          <p className="text-sm text-muted-foreground">
            Track changes to CRM entities.
          </p>
        </div>
      </header>

      <div className="flex flex-wrap gap-3 items-end">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Entity type
          <select
            className="rounded border px-2 py-1 text-sm"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            data-testid="audit-entity-type-select"
          >
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Entity ID
          <input
            className="rounded border px-2 py-1 text-sm"
            placeholder="UUID"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            data-testid="audit-entity-id-input"
          />
        </label>
        <Button onClick={handleSearch} data-testid="audit-search-btn">
          Search
        </Button>
      </div>

      {submitted && (
        <DataTable
          columns={columns}
          rows={data}
          rowKey={(r) => r.id ?? Math.random().toString()}
          isLoading={isLoading}
          emptyMessage="No activity recorded yet."
        />
      )}
    </section>
  );
}
