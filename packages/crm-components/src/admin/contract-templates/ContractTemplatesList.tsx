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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../primitives/dialog";
import { DataTable, type Column } from "../../components/DataTable";
import { useContractTemplatesApi } from "../../hooks/useContractTemplatesApi";
import type { ContractTemplate, ContractKind } from "../../types/api";

const CONTRACT_KINDS: ContractKind[] = ["SOW", "MSA", "NDA", "GENERIC"];

const columns: Column<ContractTemplate>[] = [
  {
    key: "name",
    header: "Name",
    cell: (t) => (
      <span className="font-medium" data-testid="template-row-name">
        {t.name ?? "—"}
      </span>
    ),
  },
  {
    key: "kind",
    header: "Kind",
    cell: (t) => <Badge variant="outline">{t.kind ?? "—"}</Badge>,
  },
  {
    key: "defaultTitle",
    header: "Default title",
    cell: (t) =>
      t.defaultTitle ?? <span className="text-muted-foreground">—</span>,
  },
  {
    key: "active",
    header: "Active",
    cell: (t) => (
      <Badge variant={t.active ? "default" : "muted"}>
        {t.active ? "Active" : "Inactive"}
      </Badge>
    ),
  },
];

export function ContractTemplatesList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const templatesApi = useContractTemplatesApi();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState<ContractKind>("SOW");

  const { data, isLoading } = useQuery({
    queryKey: ["contract-templates"],
    queryFn: templatesApi.listContractTemplates,
  });

  const createMutation = useMutation({
    mutationFn: templatesApi.createContractTemplate,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["contract-templates"] });
      toast.success("Contract template created.");
      setCreateOpen(false);
      if (created.id) navigate(`/contract-templates/${created.id}`);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Create failed.");
    },
  });

  return (
    <section className="flex flex-col gap-4" data-testid="contract-templates-page">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium">Contract Templates</h1>
          <p className="text-sm text-muted-foreground">
            Mustache templates used to generate client contracts.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} data-testid="new-contract-template">
          <Plus /> New template
        </Button>
      </header>

      <DataTable
        columns={columns}
        rows={data}
        rowKey={(r) => r.id ?? Math.random().toString()}
        isLoading={isLoading}
        emptyMessage="No contract templates yet — add one to generate contracts from."
        onRowClick={(r) => r.id && navigate(`/contract-templates/${r.id}`)}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New contract template</DialogTitle>
            <DialogDescription>
              Create a Mustache template for generating contracts.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium">
              Name *
              <input
                className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                value={newName}
                placeholder="e.g. Standard SOW v1"
                onChange={(e) => setNewName(e.target.value)}
                data-testid="template-name-input"
              />
            </label>
            <label className="text-sm font-medium">
              Kind
              <select
                className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                value={newKind}
                onChange={(e) => setNewKind(e.target.value as ContractKind)}
                data-testid="template-kind-select"
              >
                {CONTRACT_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={!newName.trim() || createMutation.isPending}
                onClick={() =>
                  createMutation.mutate({
                    name: newName,
                    kind: newKind,
                    active: true,
                    bodyTemplate: "",
                  })
                }
                data-testid="create-template-submit"
              >
                Create template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
