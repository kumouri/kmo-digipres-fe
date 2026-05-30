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
import { useReportsApi } from "../../hooks/useReportsApi";
import type { SavedReport } from "../../types/api";
import { RECORD_TYPE_LABELS, humanize, labelFor } from "../labels";

const CHART_HINTS = ["TABLE", "BAR", "LINE", "PIE"] as const;
const ENTITY_TYPES = ["CONTACT", "COMPANY", "DEAL", "TICKET", "INVOICE", "QUOTE"] as const;

const columns: Column<SavedReport>[] = [
  {
    key: "name",
    header: "Name",
    cell: (r) => (
      <span className="font-medium" data-testid="saved-report-name">
        {r.name ?? "—"}
      </span>
    ),
  },
  {
    key: "entityType",
    header: "Record",
    cell: (r) => <Badge variant="muted">{labelFor(RECORD_TYPE_LABELS, r.entityType)}</Badge>,
  },
  {
    key: "chartHint",
    header: "Chart",
    cell: (r) => <Badge variant="outline">{humanize(r.chartHint ?? "TABLE")}</Badge>,
  },
  {
    key: "description",
    header: "Description",
    cell: (r) => (
      <span className="text-xs text-muted-foreground">{r.description ?? "—"}</span>
    ),
  },
];

export function ReportsList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const reportsApi = useReportsApi();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEntityType, setNewEntityType] = useState<string>(ENTITY_TYPES[0]);
  const [newChartHint, setNewChartHint] = useState<string>(CHART_HINTS[0]);

  const { data, isLoading } = useQuery({
    queryKey: ["reports", "saved"],
    queryFn: reportsApi.listSavedReports,
  });

  const createMutation = useMutation({
    mutationFn: reportsApi.createSavedReport,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["reports", "saved"] });
      toast.success("Report created.");
      setCreateOpen(false);
      if (created.id) navigate(`/reports/${created.id}`);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Create failed.");
    },
  });

  return (
    <section className="flex flex-col gap-4" data-testid="reports-page">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium">Saved Reports</h1>
          <p className="text-sm text-muted-foreground">
            Saved views of your data you can re-run anytime.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} data-testid="new-report-btn">
          <Plus /> New report
        </Button>
      </header>

      <DataTable
        columns={columns}
        rows={data}
        rowKey={(r) => r.id ?? Math.random().toString()}
        isLoading={isLoading}
        emptyMessage="No saved reports yet — build one to track what matters."
        onRowClick={(r) => r.id && navigate(`/reports/${r.id}`)}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New saved report</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium">
              Name *
              <input
                className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                data-testid="report-name-input"
              />
            </label>
            <label className="text-sm font-medium">
              Record type
              <select
                className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                value={newEntityType}
                onChange={(e) => setNewEntityType(e.target.value)}
                data-testid="report-entity-select"
              >
                {ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {labelFor(RECORD_TYPE_LABELS, t)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Chart type
              <select
                className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                value={newChartHint}
                onChange={(e) => setNewChartHint(e.target.value)}
                data-testid="report-chart-select"
              >
                {CHART_HINTS.map((t) => (
                  <option key={t} value={t}>
                    {humanize(t)}
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
                    entityType: newEntityType,
                    chartHint: newChartHint as SavedReport["chartHint"],
                    filterTree: [],
                    groupBy: [],
                    aggregations: [],
                  })
                }
                data-testid="create-report-submit"
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
