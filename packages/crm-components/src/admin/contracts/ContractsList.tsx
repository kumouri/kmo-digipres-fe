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
import { useContractsApi } from "../../hooks/useContractsApi";
import { useContractTemplatesApi } from "../../hooks/useContractTemplatesApi";
import type { Contract, ContractKind } from "../../types/api";

const STATUS_VARIANT: Record<string, "default" | "muted" | "outline"> = {
  DRAFT: "muted",
  SENT: "default",
  SIGNED: "default",
  VOIDED: "outline",
};

const CONTRACT_KINDS: ContractKind[] = ["SOW", "MSA", "NDA", "GENERIC"];

const columns: Column<Contract>[] = [
  {
    key: "contractNumber",
    header: "Contract #",
    cell: (c) => (
      <span className="font-medium" data-testid="contract-row-number">
        {c.contractNumber ?? "—"}
      </span>
    ),
  },
  {
    key: "title",
    header: "Title",
    cell: (c) => c.title ?? <span className="text-muted-foreground">Untitled</span>,
  },
  {
    key: "kind",
    header: "Kind",
    cell: (c) => <Badge variant="outline">{c.kind ?? "—"}</Badge>,
  },
  {
    key: "status",
    header: "Status",
    cell: (c) => (
      <Badge variant={STATUS_VARIANT[c.status ?? "DRAFT"] ?? "muted"}>
        {c.status ?? "DRAFT"}
      </Badge>
    ),
  },
];

export function ContractsList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const contractsApi = useContractsApi();
  const templatesApi = useContractTemplatesApi();
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newKind, setNewKind] = useState<ContractKind>("SOW");
  const [newTemplateId, setNewTemplateId] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["contracts"],
    queryFn: contractsApi.listContracts,
  });

  const { data: templates } = useQuery({
    queryKey: ["contract-templates"],
    queryFn: templatesApi.listContractTemplates,
  });

  const createMutation = useMutation({
    mutationFn: contractsApi.createContract,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Contract created.");
      setCreateOpen(false);
      if (created.id) navigate(`/contracts/${created.id}`);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Create failed.");
    },
  });

  function handleCreate() {
    createMutation.mutate({
      title: newTitle || undefined,
      kind: newKind,
      status: "DRAFT",
      templateId: newTemplateId || undefined,
    });
  }

  return (
    <section className="flex flex-col gap-4" data-testid="contracts-page">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium">Contracts</h1>
          <p className="text-sm text-muted-foreground">
            Client contracts managed by KMO Solutions Foundry.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} data-testid="new-contract">
          <Plus /> New contract
        </Button>
      </header>

      <DataTable
        columns={columns}
        rows={data}
        rowKey={(r) => r.id ?? r.contractNumber ?? Math.random().toString()}
        isLoading={isLoading}
        emptyMessage="No contracts yet — create one to get started."
        onRowClick={(r) => r.id && navigate(`/contracts/${r.id}`)}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New contract</DialogTitle>
            <DialogDescription>
              Create a new contract in DRAFT status.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium">
              Title
              <input
                className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                value={newTitle}
                placeholder="e.g. Website Project SOW"
                onChange={(e) => setNewTitle(e.target.value)}
                data-testid="contract-title-input"
              />
            </label>
            <label className="text-sm font-medium">
              Kind
              <select
                className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                value={newKind}
                onChange={(e) => setNewKind(e.target.value as ContractKind)}
                data-testid="contract-kind-select"
              >
                {CONTRACT_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            {templates && templates.length > 0 && (
              <label className="text-sm font-medium">
                Template (optional)
                <select
                  className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                  value={newTemplateId}
                  onChange={(e) => setNewTemplateId(e.target.value)}
                  data-testid="contract-template-select"
                >
                  <option value="">— No template —</option>
                  {templates.map((t) =>
                    t.id ? (
                      <option key={t.id} value={t.id}>
                        {t.name ?? t.kind ?? t.id}
                      </option>
                    ) : null,
                  )}
                </select>
              </label>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={createMutation.isPending}
                onClick={handleCreate}
                data-testid="create-contract-submit"
              >
                Create contract
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
