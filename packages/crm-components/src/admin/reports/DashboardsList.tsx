import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { Button } from "../../primitives/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../primitives/dialog";
import { DataTable, type Column } from "../../components/DataTable";
import { useReportsApi } from "../../hooks/useReportsApi";
import type { Dashboard } from "../../types/api";

const columns: Column<Dashboard>[] = [
  {
    key: "name",
    header: "Name",
    cell: (d) => (
      <span className="font-medium" data-testid="dashboard-name">
        {d.name ?? "—"}
      </span>
    ),
  },
  {
    key: "description",
    header: "Description",
    cell: (d) => (
      <span className="text-xs text-muted-foreground">{d.description ?? "—"}</span>
    ),
  },
  {
    key: "items",
    header: "Widgets",
    cell: (d) => (
      <span className="text-sm">{(d.items ?? []).length}</span>
    ),
  },
];

export function DashboardsList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const reportsApi = useReportsApi();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["reports", "dashboards"],
    queryFn: reportsApi.listDashboards,
  });

  const createMutation = useMutation({
    mutationFn: reportsApi.createDashboard,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["reports", "dashboards"] });
      toast.success("Dashboard created.");
      setCreateOpen(false);
      if (created.id) navigate(`/dashboards/${created.id}`);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Create failed.");
    },
  });

  return (
    <section className="flex flex-col gap-4" data-testid="dashboards-page">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium">Dashboards</h1>
          <p className="text-sm text-muted-foreground">
            Compose saved reports into a single view.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} data-testid="new-dashboard-btn">
          <Plus /> New dashboard
        </Button>
      </header>

      <DataTable
        columns={columns}
        rows={data}
        rowKey={(d) => d.id ?? Math.random().toString()}
        isLoading={isLoading}
        emptyMessage="No dashboards yet — create one for an at-a-glance view."
        onRowClick={(d) => d.id && navigate(`/dashboards/${d.id}`)}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New dashboard</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium">
              Name *
              <input
                className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                data-testid="dashboard-name-input"
              />
            </label>
            <label className="text-sm font-medium">
              Description
              <input
                className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                data-testid="dashboard-desc-input"
              />
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
                    description: newDesc || undefined,
                    items: [],
                  })
                }
                data-testid="create-dashboard-submit"
              >
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
