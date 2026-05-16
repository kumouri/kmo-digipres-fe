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
} from "../../primitives/dialog";
import { DataTable, type Column } from "../../components/DataTable";
import { useFieldDefinitionsApi } from "../../hooks/useFieldDefinitionsApi";
import type { FieldDefinition } from "../../types/api";

const ENTITY_TYPES = ["CONTACT", "COMPANY", "DEAL", "TICKET"] as const;
const FIELD_TYPES = ["TEXT", "NUMBER", "DATE", "BOOL", "ENUM", "LOOKUP"] as const;

const columns: Column<FieldDefinition>[] = [
  {
    key: "label",
    header: "Label",
    cell: (fd) => (
      <span className="font-medium" data-testid="field-def-label">
        {fd.label ?? "—"}
      </span>
    ),
  },
  {
    key: "entityType",
    header: "Entity",
    cell: (fd) => <Badge variant="muted">{fd.entityType ?? "—"}</Badge>,
  },
  {
    key: "type",
    header: "Type",
    cell: (fd) => fd.type ?? "—",
  },
  {
    key: "key",
    header: "Key",
    cell: (fd) => (
      <code className="text-xs text-muted-foreground">{fd.key ?? "—"}</code>
    ),
  },
  {
    key: "visibilityRoles",
    header: "Visibility",
    cell: (fd) => (
      <div className="flex gap-1 flex-wrap">
        {(fd.visibilityRoles ?? []).map((r) => (
          <Badge key={r} variant="outline">
            {r}
          </Badge>
        ))}
      </div>
    ),
  },
];

export function FieldDefinitionsList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fdApi = useFieldDefinitionsApi();
  const [createOpen, setCreateOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newEntityType, setNewEntityType] = useState<typeof ENTITY_TYPES[number]>("CONTACT");
  const [newType, setNewType] = useState<typeof FIELD_TYPES[number]>("TEXT");

  const { data, isLoading } = useQuery({
    queryKey: ["field-definitions"],
    queryFn: fdApi.listFieldDefinitions,
  });

  const createMutation = useMutation({
    mutationFn: fdApi.createFieldDefinition,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["field-definitions"] });
      toast.success("Field definition created.");
      setCreateOpen(false);
      if (created.id) navigate(`/field-definitions/${created.id}`);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Create failed.");
    },
  });

  return (
    <section className="flex flex-col gap-4" data-testid="field-definitions-page">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium">Field Definitions</h1>
          <p className="text-sm text-muted-foreground">
            Custom fields extending CRM entities.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} data-testid="new-field-def">
          <Plus /> New field
        </Button>
      </header>

      <DataTable
        columns={columns}
        rows={data}
        rowKey={(r) => r.id ?? Math.random().toString()}
        isLoading={isLoading}
        emptyMessage="No custom fields yet."
        onRowClick={(r) => r.id && navigate(`/field-definitions/${r.id}`)}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New field definition</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium">
              Label *
              <input
                className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                data-testid="field-label-input"
              />
            </label>
            <label className="text-sm font-medium">
              Key *
              <input
                className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                data-testid="field-key-input"
              />
            </label>
            <label className="text-sm font-medium">
              Entity
              <select
                className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                value={newEntityType}
                onChange={(e) =>
                  setNewEntityType(e.target.value as typeof ENTITY_TYPES[number])
                }
                data-testid="field-entity-select"
              >
                {ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Type
              <select
                className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                value={newType}
                onChange={(e) =>
                  setNewType(e.target.value as typeof FIELD_TYPES[number])
                }
                data-testid="field-type-select"
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={!newLabel.trim() || !newKey.trim() || createMutation.isPending}
                onClick={() =>
                  createMutation.mutate({
                    label: newLabel,
                    key: newKey,
                    entityType: newEntityType,
                    type: newType,
                    required: false,
                    visibilityRoles: ["STAFF"],
                  })
                }
                data-testid="create-field-def-submit"
              >
                Create field
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
