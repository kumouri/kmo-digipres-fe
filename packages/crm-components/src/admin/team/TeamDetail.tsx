import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, UserX } from "lucide-react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../primitives/tabs";
import { useProjectsApi } from "../../hooks/useProjectsApi";
import { useProjectAssignmentsApi } from "../../hooks/useProjectAssignmentsApi";
import { useTeamApi } from "../../hooks/useTeamApi";
import type { Project } from "../../types/api";
import { ROLE_LABELS, USER_STATUS_LABELS, labelFor } from "../labels";
import {
  TeamMemberForm,
  teamMemberToFormValues,
  formValuesToTeamMember,
} from "./TeamMemberForm";

const STATUS_VARIANT: Record<string, "default" | "muted" | "outline" | "secondary" | "destructive"> = {
  ACTIVE: "default",
  INVITED: "muted",
  DISABLED: "destructive",
};

function primaryRoleKey(roles: string[] | undefined): string {
  if (!roles || roles.length === 0) return "STAFF";
  if (roles.includes("ADMIN")) return "ADMIN";
  if (roles.includes("CONTRACTOR")) return "CONTRACTOR";
  return "STAFF";
}

function formatRate(rate: number | undefined): string {
  return rate != null ? `$${rate.toFixed(2)}` : "—";
}

/** Body of the Projects tab: this member's active assignments across projects. */
function MemberProjectsTab({ userId }: { userId: string }) {
  const projectsApi = useProjectsApi();
  const assignmentsApi = useProjectAssignmentsApi();

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: projectsApi.listProjects,
  });
  const projects: Project[] = projectsQuery.data ?? [];

  // No "assignments by user" endpoint on the backend — fan out across projects
  // and keep the ones this member is on.
  const assignmentQueries = useQueries({
    queries: projects.map((p) => ({
      queryKey: ["projects", p.id, "assignments"],
      queryFn: () => assignmentsApi.listAssignments(p.id!),
      enabled: Boolean(p.id),
    })),
  });

  const isLoading =
    projectsQuery.isLoading || assignmentQueries.some((q) => q.isLoading);

  const rows = projects
    .map((project, i) => {
      const assignment = (assignmentQueries[i]?.data ?? []).find(
        (a) => a.userId === userId && a.active !== false,
      );
      return assignment ? { project, assignment } : null;
    })
    .filter((r): r is { project: Project; assignment: NonNullable<typeof r>["assignment"] } => r !== null);

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Not on any projects yet. Add them from a project's Team tab.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3" data-testid="member-projects-list">
      {rows.map(({ project, assignment }) => (
        <li
          key={assignment.id}
          className="flex items-center justify-between gap-3 rounded-md border p-3"
          data-testid="member-project-row"
        >
          <div className="flex flex-col gap-1">
            <Link
              to={`/projects/${project.id}`}
              className="font-medium hover:underline"
            >
              {project.name ?? project.code ?? "Untitled project"}
            </Link>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {assignment.role ? (
                <Badge variant="outline">{assignment.role}</Badge>
              ) : null}
              <span>Bill {formatRate(assignment.billRateOverride)}</span>
              <span>Cost {formatRate(assignment.costRateOverride)}</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function TeamDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const teamApi = useTeamApi();

  const memberQuery = useQuery({
    queryKey: ["team", id],
    queryFn: () => teamApi.getTeamMember(id!),
    enabled: Boolean(id),
  });

  const updateMutation = useMutation({
    mutationFn: (body: Parameters<typeof teamApi.updateTeamMember>[1]) =>
      teamApi.updateTeamMember(id!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team"] });
      qc.invalidateQueries({ queryKey: ["team", id] });
      toast.success("Teammate updated.");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Update failed."),
  });

  const disableMutation = useMutation({
    mutationFn: () => teamApi.disableTeamMember(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team"] });
      qc.invalidateQueries({ queryKey: ["team", id] });
      toast.success("Teammate deactivated.");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Couldn't deactivate."),
  });

  if (memberQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (memberQuery.isError || !memberQuery.data) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">
          Couldn't load this teammate.
        </p>
        <Button asChild variant="outline">
          <Link to="/team">
            <ArrowLeft /> Back to team
          </Link>
        </Button>
      </div>
    );
  }

  const m = memberQuery.data;
  const isDisabled = m.status === "DISABLED";

  return (
    <section className="flex flex-col gap-4" data-testid="team-detail">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Link
            to="/team"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3" /> All team
          </Link>
          <h1 className="text-2xl font-medium">{m.displayName ?? "Unnamed"}</h1>
          <div className="flex flex-wrap gap-2">
            <Badge variant="muted">
              {labelFor(ROLE_LABELS, primaryRoleKey(m.roles))}
            </Badge>
            <Badge variant={STATUS_VARIANT[m.status ?? "INVITED"] ?? "outline"}>
              {labelFor(USER_STATUS_LABELS, m.status)}
            </Badge>
          </div>
        </div>
        {!isDisabled ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" data-testid="deactivate-teammate">
                <UserX /> Deactivate
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Deactivate this teammate?</AlertDialogTitle>
                <AlertDialogDescription>
                  They'll lose access right away. Their logged time and project
                  history stay put — you can reactivate them later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90"
                  onClick={() => disableMutation.mutate()}
                  data-testid="confirm-deactivate-teammate"
                >
                  Deactivate
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>

      <Tabs defaultValue="details" data-testid="team-tabs">
        <TabsList>
          <TabsTrigger value="details" data-testid="tab-details">
            Details
          </TabsTrigger>
          <TabsTrigger value="projects" data-testid="tab-projects">
            Projects
          </TabsTrigger>
          <TabsTrigger value="timesheets" data-testid="tab-timesheets">
            Timesheets
          </TabsTrigger>
          <TabsTrigger value="payout" data-testid="tab-payout">
            Payout
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Edit teammate</CardTitle>
            </CardHeader>
            <CardContent>
              <TeamMemberForm
                defaultValues={teamMemberToFormValues(m)}
                submitLabel="Save changes"
                isSubmitting={updateMutation.isPending}
                emailLocked
                onSubmit={(values) =>
                  updateMutation.mutate(formValuesToTeamMember(values))
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects">
          <Card>
            <CardHeader>
              <CardTitle>Projects</CardTitle>
            </CardHeader>
            <CardContent>
              {m.id ? <MemberProjectsTab userId={m.id} /> : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timesheets">
          <Card>
            <CardHeader>
              <CardTitle>Timesheets</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                A per-teammate timesheet view is coming soon.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payout">
          <Card>
            <CardHeader>
              <CardTitle>Payout</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Contractor payout summaries are coming soon.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  );
}
