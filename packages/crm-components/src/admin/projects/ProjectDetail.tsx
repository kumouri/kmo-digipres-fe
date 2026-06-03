import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../primitives/alert-dialog";
import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../primitives/card";
import { Skeleton } from "../../primitives/skeleton";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../primitives/tabs";
import { useContractorApi } from "../../hooks/useContractorApi";
import { useProjectsApi } from "../../hooks/useProjectsApi";
import { TaskKanban } from "./TaskKanban";
import { ContractorTaskList } from "./ContractorTaskList";
import { ProjectAssignments } from "./ProjectAssignments";
import type { Milestone } from "../../types/api";
import { MILESTONE_STATUS_LABELS, PROJECT_STATUS_LABELS, labelFor } from "../labels";

const STATUS_VARIANT: Record<string, "default" | "muted" | "outline" | "secondary" | "destructive"> = {
  PLANNING: "muted",
  ACTIVE: "default",
  ON_HOLD: "outline",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

const MILESTONE_STATUS_VARIANT: Record<string, "default" | "muted" | "outline" | "secondary"> = {
  PENDING: "muted",
  IN_PROGRESS: "default",
  COMPLETED: "secondary",
};

interface Props {
  /**
   * When true, the signed-in user is a scoped-down contractor: the project is
   * read from /me/contractor/projects/{id}, a read-only client card is shown,
   * tasks come from the scoped reader, and the admin-only controls (Delete, the
   * Team tab, the Milestones manage tab) are hidden. Defaults to false
   * (staff/admin — the full management view, unchanged).
   */
  isContractor?: boolean;
}

export function ProjectDetail({ isContractor = false }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const projectsApi = useProjectsApi();
  const contractorApi = useContractorApi();

  // Contractors are denied the broad staff reader (GET /projects/{id} → 4135),
  // so they read the assignment-scoped view instead. Namespaced query key so
  // the two never collide in the cache.
  const projectQuery = useQuery({
    queryKey: isContractor ? ["contractor", "projects", id] : ["projects", id],
    queryFn: () =>
      isContractor ? contractorApi.getProject(id!) : projectsApi.getProject(id!),
    enabled: Boolean(id),
  });

  // Read-only client card — contractor surface only.
  const clientQuery = useQuery({
    queryKey: ["contractor", "projects", id, "client"],
    queryFn: () => contractorApi.getProjectClient(id!),
    enabled: Boolean(id) && isContractor,
  });

  // Milestones are an admin/staff manage surface (no contractor reader) — skip
  // the fetch entirely for contractors.
  const milestonesQuery = useQuery({
    queryKey: ["projects", id, "milestones"],
    queryFn: () => projectsApi.listMilestones(id!),
    enabled: Boolean(id) && !isContractor,
  });

  const deleteMutation = useMutation({
    mutationFn: () => projectsApi.deleteProject(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project deleted.");
      navigate("/projects");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Delete failed."),
  });

  const completeMilestoneMutation = useMutation({
    mutationFn: (milestoneId: string) =>
      projectsApi.completeMilestone(milestoneId),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["projects", id, "milestones"] });
      toast.success(
        updated.spawnedInvoiceId
          ? `Milestone completed — invoice ${updated.spawnedInvoiceId} created.`
          : "Milestone completed.",
      );
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Complete failed."),
  });

  if (projectQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">
          Couldn't load this project.
        </p>
        <Button asChild variant="outline">
          <Link to="/projects">
            <ArrowLeft /> Back to projects
          </Link>
        </Button>
      </div>
    );
  }

  const p = projectQuery.data;
  const milestones: Milestone[] = milestonesQuery.data ?? [];
  const client = clientQuery.data;

  return (
    <section className="flex flex-col gap-4" data-testid="project-detail">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Link
            to="/projects"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3" /> All projects
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">
              {p.code}
            </span>
            <h1 className="text-2xl font-medium">{p.name ?? "Untitled"}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {p.status ? (
              <Badge variant={STATUS_VARIANT[p.status] ?? "muted"}>
                {labelFor(PROJECT_STATUS_LABELS, p.status)}
              </Badge>
            ) : null}
          </div>
        </div>
        {/* Delete is an admin-only manage action — hidden from contractors. */}
        {!isContractor && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" data-testid="delete-project">
                <Trash2 /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this project?</AlertDialogTitle>
                <AlertDialogDescription>
                  Permanently removes this project, along with its milestones and
                  tasks.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90"
                  onClick={() => deleteMutation.mutate()}
                  data-testid="confirm-delete-project"
                >
                  Delete project
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <Tabs defaultValue="overview" data-testid="project-tabs">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">
            Overview
          </TabsTrigger>
          {/* Milestones is a staff/admin manage surface (no contractor
              reader) — hidden from contractors. */}
          {!isContractor && (
            <TabsTrigger value="milestones" data-testid="tab-milestones">
              Milestones
            </TabsTrigger>
          )}
          <TabsTrigger value="tasks" data-testid="tab-tasks">
            Tasks
          </TabsTrigger>
          {/* Contractors see a read-only Client card in place of the
              admin-only Team/assignments tab. */}
          {isContractor ? (
            <TabsTrigger value="client" data-testid="tab-client">
              Client
            </TabsTrigger>
          ) : (
            <TabsTrigger value="team" data-testid="tab-team">
              Team
            </TabsTrigger>
          )}
        </TabsList>

        {/* Overview tab */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Project details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <dt className="font-medium text-muted-foreground">Code</dt>
                <dd className="font-mono">{p.code ?? "—"}</dd>
                <dt className="font-medium text-muted-foreground">Status</dt>
                <dd>
                  <Badge variant={STATUS_VARIANT[p.status ?? "PLANNING"] ?? "muted"}>
                    {labelFor(PROJECT_STATUS_LABELS, p.status, "Planning")}
                  </Badge>
                </dd>
                <dt className="font-medium text-muted-foreground">Description</dt>
                <dd>{p.description ?? "—"}</dd>
                <dt className="font-medium text-muted-foreground">Start date</dt>
                <dd>{p.startDate ?? "—"}</dd>
                <dt className="font-medium text-muted-foreground">Target end</dt>
                <dd>{p.targetEndDate ?? "—"}</dd>
                <dt className="font-medium text-muted-foreground">Actual end</dt>
                <dd>{p.actualEndDate ?? "—"}</dd>
                {/* Invoice-finalization config is admin-only — staff view only. */}
                {!isContractor && (
                  <>
                    <dt className="font-medium text-muted-foreground">
                      Auto-finalize invoices
                    </dt>
                    <dd>
                      {(p as { autoFinalizeMilestoneInvoices?: boolean })
                        .autoFinalizeMilestoneInvoices
                        ? "Yes"
                        : "No"}
                    </dd>
                  </>
                )}
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Milestones tab (staff/admin only) */}
        {!isContractor && (
          <TabsContent value="milestones">
            <Card>
              <CardHeader>
                <CardTitle>Milestones</CardTitle>
              </CardHeader>
              <CardContent>
                {milestonesQuery.isLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : milestones.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No milestones yet.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-3" data-testid="milestones-list">
                    {milestones.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between gap-3 rounded-md border p-3"
                        data-testid="milestone-row"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{m.name}</span>
                          <div className="flex gap-2">
                            <Badge
                              variant={
                                MILESTONE_STATUS_VARIANT[m.status ?? "PENDING"] ?? "muted"
                              }
                            >
                              {labelFor(MILESTONE_STATUS_LABELS, m.status, "Pending")}
                            </Badge>
                            {m.triggersInvoiceOnComplete && (
                              <Badge variant="outline">Triggers invoice</Badge>
                            )}
                            {m.spawnedInvoiceId && (
                              <Badge variant="secondary" data-testid="spawned-invoice-badge">
                                Invoice: {m.spawnedInvoiceId}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {m.status !== "COMPLETED" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            data-testid="complete-milestone"
                            disabled={completeMilestoneMutation.isPending}
                            onClick={() => m.id && completeMilestoneMutation.mutate(m.id)}
                          >
                            <CheckCircle2 className="size-4" /> Complete
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Completed
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Tasks tab — interactive kanban for staff, read-only list for a
            contractor (no contractor task-status mutation endpoint). */}
        <TabsContent value="tasks">
          {id ? (
            isContractor ? (
              <ContractorTaskList projectId={id} />
            ) : (
              <TaskKanban projectId={id} />
            )
          ) : null}
        </TabsContent>

        {/* Team tab (staff/admin) or read-only Client card (contractor) */}
        {isContractor ? (
          <TabsContent value="client">
            <Card>
              <CardHeader>
                <CardTitle>Client</CardTitle>
              </CardHeader>
              <CardContent>
                {clientQuery.isLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : !client ? (
                  <p className="text-sm text-muted-foreground">
                    No client details available for this project.
                  </p>
                ) : (
                  <dl
                    className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm"
                    data-testid="contractor-client-card"
                  >
                    <dt className="font-medium text-muted-foreground">Company</dt>
                    <dd data-testid="client-company">{client.companyName ?? "—"}</dd>
                    <dt className="font-medium text-muted-foreground">Contact</dt>
                    <dd data-testid="client-contact">{client.contactName ?? "—"}</dd>
                    <dt className="font-medium text-muted-foreground">Email</dt>
                    <dd data-testid="client-email">{client.contactEmail ?? "—"}</dd>
                    <dt className="font-medium text-muted-foreground">Phone</dt>
                    <dd data-testid="client-phone">{client.contactPhone ?? "—"}</dd>
                  </dl>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ) : (
          <TabsContent value="team">
            {id ? <ProjectAssignments projectId={id} /> : null}
          </TabsContent>
        )}
      </Tabs>
    </section>
  );
}
