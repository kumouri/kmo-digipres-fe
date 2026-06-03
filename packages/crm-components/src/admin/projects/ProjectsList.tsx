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
import { useContractorApi } from "../../hooks/useContractorApi";
import { useProjectsApi } from "../../hooks/useProjectsApi";
import type { Project } from "../../types/api";
import { PROJECT_STATUS_LABELS, labelFor } from "../labels";

// Both the staff `Project` and the contractor `ContractorProjectView` carry the
// columns this list renders (code, name, status, startDate, targetEndDate), so
// a single column set drives both. The view is a strict subset of Project for
// these fields — narrow to the shared shape.
type ProjectRow = Pick<
  Project,
  "id" | "code" | "name" | "status" | "startDate" | "targetEndDate"
>;

const STATUS_VARIANT: Record<string, "default" | "muted" | "outline" | "secondary" | "destructive"> = {
  PLANNING: "muted",
  ACTIVE: "default",
  ON_HOLD: "outline",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

const columns: Column<ProjectRow>[] = [
  {
    key: "code",
    header: "Code",
    cell: (p) => (
      <span className="font-medium font-mono" data-testid="project-row-code">
        {p.code ?? "—"}
      </span>
    ),
  },
  {
    key: "name",
    header: "Name",
    cell: (p) => (
      <span data-testid="project-row-name">{p.name ?? "Untitled"}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (p) => (
      <Badge variant={STATUS_VARIANT[p.status ?? "PLANNING"] ?? "muted"}>
        {labelFor(PROJECT_STATUS_LABELS, p.status, "Planning")}
      </Badge>
    ),
  },
  {
    key: "startDate",
    header: "Start",
    cell: (p) => p.startDate ?? <span className="text-muted-foreground">—</span>,
  },
  {
    key: "targetEndDate",
    header: "Target end",
    cell: (p) => p.targetEndDate ?? <span className="text-muted-foreground">—</span>,
  },
];

interface Props {
  /**
   * When true, the signed-in user is a scoped-down contractor: list only their
   * assigned projects (via /me/contractor/projects) and hide create. Defaults
   * to false (staff/admin — unchanged behavior).
   */
  isContractor?: boolean;
}

export function ProjectsList({ isContractor = false }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const projectsApi = useProjectsApi();
  const contractorApi = useContractorApi();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");

  // Contractors are denied the broad staff reader (GET /projects → 4135), so
  // they read their assignment-scoped list instead. The query key is namespaced
  // so the two never collide in the cache.
  const { data, isLoading } = useQuery<ProjectRow[]>({
    queryKey: isContractor ? ["contractor", "projects"] : ["projects"],
    queryFn: () =>
      isContractor ? contractorApi.listProjects() : projectsApi.listProjects(),
  });

  const createMutation = useMutation({
    mutationFn: projectsApi.createProject,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project created.");
      setCreateOpen(false);
      setNewName("");
      if (created.id) navigate(`/projects/${created.id}`);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Create failed.");
    },
  });

  return (
    <section className="flex flex-col gap-4" data-testid="projects-page">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium">
            {isContractor ? "My projects" : "Projects"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isContractor
              ? "The projects you're assigned to. Open one to see its details and tasks."
              : "The work you're delivering for clients, with milestones and tasks."}
          </p>
        </div>
        {!isContractor && (
          <Button onClick={() => setCreateOpen(true)} data-testid="new-project">
            <Plus /> New project
          </Button>
        )}
      </header>

      <DataTable
        columns={columns}
        rows={data}
        rowKey={(r) => r.id ?? r.code ?? Math.random().toString()}
        isLoading={isLoading}
        emptyMessage={
          isContractor
            ? "No projects assigned to you yet."
            : "No projects yet — create one to get started."
        }
        onRowClick={(r) => r.id && navigate(`/projects/${r.id}`)}
      />

      {!isContractor && (
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>
              Start a new project. You can add milestones and tasks once it's
              created.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium">
              Project name
              <input
                className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Website Redesign"
                data-testid="project-name-input"
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
                    name: newName.trim(),
                    status: "PLANNING",
                  })
                }
                data-testid="create-project-submit"
              >
                Create project
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      )}
    </section>
  );
}
