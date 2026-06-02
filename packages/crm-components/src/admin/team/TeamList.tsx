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
import { useTeamApi } from "../../hooks/useTeamApi";
import type { TeamMember } from "../../types/api";
import { ROLE_LABELS, USER_STATUS_LABELS, labelFor } from "../labels";
import {
  TeamMemberForm,
  teamMemberToFormValues,
  formValuesToTeamMember,
} from "./TeamMemberForm";

function formatRate(rate: number | undefined): string {
  return rate != null ? `$${rate.toFixed(2)}` : "—";
}

// Show the most specific role: a contractor (STAFF + CONTRACTOR) reads
// "Contractor"; the owner reads "Owner".
function primaryRole(roles: string[] | undefined): string {
  if (!roles || roles.length === 0) return "—";
  if (roles.includes("ADMIN")) return labelFor(ROLE_LABELS, "ADMIN");
  if (roles.includes("CONTRACTOR")) return labelFor(ROLE_LABELS, "CONTRACTOR");
  return labelFor(ROLE_LABELS, "STAFF");
}

const columns: Column<TeamMember>[] = [
  {
    key: "displayName",
    header: "Name",
    cell: (m) => (
      <span className="font-medium" data-testid="team-row-name">
        {m.displayName ?? "—"}
      </span>
    ),
  },
  {
    key: "email",
    header: "Email",
    cell: (m) => m.email ?? <span className="text-muted-foreground">—</span>,
  },
  {
    key: "role",
    header: "Role",
    cell: (m) => <Badge variant="muted">{primaryRole(m.roles)}</Badge>,
  },
  {
    key: "status",
    header: "Status",
    cell: (m) => (
      <Badge variant="outline" data-testid="team-row-status">
        {labelFor(USER_STATUS_LABELS, m.status)}
      </Badge>
    ),
  },
  {
    key: "defaultBillRate",
    header: "Bill rate",
    cell: (m) => formatRate(m.defaultBillRate),
  },
  {
    key: "defaultCostRate",
    header: "Cost rate",
    cell: (m) => formatRate(m.defaultCostRate),
  },
];

export function TeamList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const teamApi = useTeamApi();
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["team"],
    queryFn: teamApi.listTeam,
  });

  const createMutation = useMutation({
    mutationFn: teamApi.createTeamMember,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["team"] });
      toast.success("Teammate added.");
      setCreateOpen(false);
      if (created.id) navigate(`/team/${created.id}`);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Couldn't add teammate.");
    },
  });

  return (
    <section className="flex flex-col gap-4" data-testid="team-page">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium">Team</h1>
          <p className="text-sm text-muted-foreground">
            The people who work on your projects — staff and contractors, with
            their default rates.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} data-testid="invite-teammate">
          <Plus /> Invite teammate
        </Button>
      </header>

      <DataTable
        columns={columns}
        rows={data}
        rowKey={(r) => r.id ?? r.email ?? Math.random().toString()}
        isLoading={isLoading}
        emptyMessage="No teammates yet — invite someone to get started."
        onRowClick={(r) => r.id && navigate(`/team/${r.id}`)}
        data-testid="team-table"
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invite teammate</DialogTitle>
            <DialogDescription>
              Add a staff member or contractor. Leave the password unset and
              they'll be invited to set their own.
            </DialogDescription>
          </DialogHeader>
          <TeamMemberForm
            defaultValues={teamMemberToFormValues(undefined)}
            submitLabel="Add teammate"
            isSubmitting={createMutation.isPending}
            onCancel={() => setCreateOpen(false)}
            onSubmit={(values) =>
              createMutation.mutate(formValuesToTeamMember(values))
            }
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}
