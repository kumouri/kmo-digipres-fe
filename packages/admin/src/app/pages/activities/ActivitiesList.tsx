import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import * as activitiesApi from "@/api/activities";
import { Badge } from "@kmosf/crm-components";
import { Button } from "@kmosf/crm-components";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@kmosf/crm-components";
import { DataTable, type Column } from "@/components/DataTable";
import type { ActivityDTO } from "@kmosf/crm-components";
import {
  ActivityForm,
  formValuesToActivity,
} from "./ActivityForm";

const columns: Column<ActivityDTO>[] = [
  {
    key: "type",
    header: "Type",
    cell: (a) => <Badge variant="secondary">{a.type ?? "—"}</Badge>,
  },
  {
    key: "direction",
    header: "Direction",
    cell: (a) =>
      a.direction ? (
        <Badge variant="outline">{a.direction}</Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "summary",
    header: "Summary",
    cell: (a) => (
      <span className="font-medium" data-testid="activity-row-summary">
        {a.summary ?? "—"}
      </span>
    ),
  },
  {
    key: "subject",
    header: "Subject",
    cell: (a) => (
      <span className="text-xs text-muted-foreground">
        {a.subjectType ?? "?"} / {a.subjectId ?? "—"}
      </span>
    ),
  },
  {
    key: "when",
    header: "Occurred",
    cell: (a) =>
      a.occurredAt ? (
        new Date(a.occurredAt).toLocaleString()
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
];

export function ActivitiesList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["activities"],
    queryFn: activitiesApi.listActivities,
  });

  const createMutation = useMutation({
    mutationFn: activitiesApi.createActivity,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["activities"] });
      // Touched-contact timelines refetch on next navigation.
      qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Activity logged.");
      setCreateOpen(false);
      if (created.id) navigate(`/activities/${created.id}`);
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Create failed."),
  });

  return (
    <section className="flex flex-col gap-4" data-testid="activities-page">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium">Activities</h1>
          <p className="text-sm text-muted-foreground">
            Notes, calls, emails, meetings, and tasks across the tenant.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} data-testid="new-activity">
          <Plus /> Log activity
        </Button>
      </header>

      <DataTable
        columns={columns}
        rows={data}
        rowKey={(r) => r.id ?? r.summary ?? Math.random().toString()}
        isLoading={isLoading}
        emptyMessage="No activities yet."
        onRowClick={(r) => r.id && navigate(`/activities/${r.id}`)}
        data-testid="activities-table"
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log activity</DialogTitle>
            <DialogDescription>
              Persisted via <code>POST /api/activities</code>.
            </DialogDescription>
          </DialogHeader>
          <ActivityForm
            submitLabel="Log activity"
            isSubmitting={createMutation.isPending}
            onCancel={() => setCreateOpen(false)}
            onSubmit={(values) =>
              createMutation.mutate(formValuesToActivity(values))
            }
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}
