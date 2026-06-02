import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

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
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../primitives/card";
import { Input } from "../../primitives/input";
import { Label } from "../../primitives/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../primitives/select";
import { Skeleton } from "../../primitives/skeleton";
import { useProjectAssignmentsApi } from "../../hooks/useProjectAssignmentsApi";
import { useTeamApi } from "../../hooks/useTeamApi";
import type { ProjectAssignment, TeamMember } from "../../types/api";
import { ROLE_LABELS, labelFor } from "../labels";

// Only staff and contractors can be assigned to a project (the owner works
// across everything and isn't assigned per-project).
function isAssignable(m: TeamMember): boolean {
  const roles = m.roles ?? [];
  return roles.includes("STAFF") || roles.includes("CONTRACTOR");
}

function memberLabel(m: TeamMember | undefined, fallbackId: string): string {
  if (!m) return fallbackId;
  return m.displayName ?? m.email ?? fallbackId;
}

function memberRoleLabel(m: TeamMember | undefined): string | null {
  if (!m?.roles) return null;
  if (m.roles.includes("CONTRACTOR")) return labelFor(ROLE_LABELS, "CONTRACTOR");
  if (m.roles.includes("STAFF")) return labelFor(ROLE_LABELS, "STAFF");
  return null;
}

interface ProjectAssignmentsProps {
  projectId: string;
}

export function ProjectAssignments({ projectId }: ProjectAssignmentsProps) {
  const qc = useQueryClient();
  const assignmentsApi = useProjectAssignmentsApi();
  const teamApi = useTeamApi();

  const [selectedUserId, setSelectedUserId] = useState("");
  const [billRate, setBillRate] = useState("");
  const [costRate, setCostRate] = useState("");

  const assignmentsQuery = useQuery({
    queryKey: ["projects", projectId, "assignments"],
    queryFn: () => assignmentsApi.listAssignments(projectId),
    enabled: Boolean(projectId),
  });

  const teamQuery = useQuery({
    queryKey: ["team"],
    queryFn: teamApi.listTeam,
  });

  const membersById = useMemo(() => {
    const map = new Map<string, TeamMember>();
    for (const m of teamQuery.data ?? []) {
      if (m.id) map.set(m.id, m);
    }
    return map;
  }, [teamQuery.data]);

  const activeAssignments = (assignmentsQuery.data ?? []).filter(
    (a) => a.active !== false,
  );

  const assignedUserIds = new Set(activeAssignments.map((a) => a.userId));

  // Assignable members not already on the project.
  const pickerMembers = (teamQuery.data ?? []).filter(
    (m) => isAssignable(m) && m.id && !assignedUserIds.has(m.id),
  );

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["projects", projectId, "assignments"] });
  }

  function resetForm() {
    setSelectedUserId("");
    setBillRate("");
    setCostRate("");
  }

  const addMutation = useMutation({
    mutationFn: () => {
      const bill = billRate.trim() ? Number(billRate) : undefined;
      const cost = costRate.trim() ? Number(costRate) : undefined;
      return assignmentsApi.createAssignment(projectId, {
        userId: selectedUserId,
        billRateOverride: Number.isFinite(bill as number) ? bill : undefined,
        costRateOverride: Number.isFinite(cost as number) ? cost : undefined,
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Added to the project.");
      resetForm();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Couldn't add them."),
  });

  const removeMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      assignmentsApi.deleteAssignment(projectId, assignmentId),
    onSuccess: () => {
      invalidate();
      toast.success("Removed from the project.");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Couldn't remove them."),
  });

  // Bill/cost overrides accept a non-negative number with up to 2 decimals.
  const RATE_RE = /^\d+(\.\d{1,2})?$/;
  const billValid = billRate.trim() === "" || RATE_RE.test(billRate.trim());
  const costValid = costRate.trim() === "" || RATE_RE.test(costRate.trim());
  const canAdd =
    Boolean(selectedUserId) && billValid && costValid && !addMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team</CardTitle>
        <CardDescription>
          Who's working on this project, with optional per-project rate
          overrides.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {/* Current assignees */}
        {assignmentsQuery.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : activeAssignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No one's on this project yet — add someone below.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {activeAssignments.map((a: ProjectAssignment) => {
              const member = a.userId ? membersById.get(a.userId) : undefined;
              const roleLabel = memberRoleLabel(member);
              return (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 rounded-md border p-3"
                  data-testid="assignment-row"
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-medium" data-testid="assignment-name">
                      {memberLabel(member, a.userId ?? "Unknown")}
                    </span>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {roleLabel ? (
                        <Badge variant="outline">{roleLabel}</Badge>
                      ) : null}
                      <span>
                        Bill{" "}
                        {a.billRateOverride != null
                          ? `$${a.billRateOverride.toFixed(2)}`
                          : "default"}
                      </span>
                      <span>
                        Cost{" "}
                        {a.costRateOverride != null
                          ? `$${a.costRateOverride.toFixed(2)}`
                          : "default"}
                      </span>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remove from project"
                        data-testid="remove-assignment"
                      >
                        <Trash2 />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Remove this person from the project?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Remove this person from the project? Their logged time
                          stays.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive hover:bg-destructive/90"
                          onClick={() => a.id && removeMutation.mutate(a.id)}
                          data-testid="confirm-remove-assignment"
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              );
            })}
          </ul>
        )}

        {/* Add an assignee */}
        <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-4">
          <h3 className="text-sm font-medium">Add someone</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="assignment-user">Teammate</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="assignment-user" data-testid="assignment-user">
                  <SelectValue
                    placeholder={
                      teamQuery.isLoading ? "Loading…" : "Pick a teammate"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {pickerMembers.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      Everyone's already assigned
                    </SelectItem>
                  ) : (
                    pickerMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id!}>
                        {memberLabel(m, m.id!)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="assignment-bill-rate">Bill rate override</Label>
              <Input
                id="assignment-bill-rate"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="default"
                data-testid="assignment-bill-rate"
                aria-invalid={billValid ? undefined : true}
                value={billRate}
                onChange={(e) => setBillRate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="assignment-cost-rate">Cost rate override</Label>
              <Input
                id="assignment-cost-rate"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="default"
                data-testid="assignment-cost-rate"
                aria-invalid={costValid ? undefined : true}
                value={costRate}
                onChange={(e) => setCostRate(e.target.value)}
              />
            </div>
          </div>
          {!billValid || !costValid ? (
            <p className="text-xs text-destructive">
              Use a non-negative number with at most 2 decimal places.
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button
              onClick={() => addMutation.mutate()}
              disabled={!canAdd}
              data-testid="add-assignment"
            >
              <Plus /> Add to project
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
