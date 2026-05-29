import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, Trash2 } from "lucide-react";

import { useActivitiesApi } from "../../hooks/useActivitiesApi";
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
} from "@kmosf/crm-components";
import { Badge } from "@kmosf/crm-components";
import { Button } from "@kmosf/crm-components";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@kmosf/crm-components";
import { Skeleton } from "@kmosf/crm-components";
import {
  ActivityForm,
  activityToFormValues,
  formValuesToActivity,
} from "./ActivityForm";
import {
  ACTIVITY_DIRECTION_LABELS,
  ACTIVITY_TYPE_LABELS,
  SUBJECT_TYPE_LABELS,
  labelFor,
} from "../labels";

export function ActivityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const activitiesApi = useActivitiesApi();

  const activityQuery = useQuery({
    queryKey: ["activities", id],
    queryFn: () => activitiesApi.getActivity(id!),
    enabled: Boolean(id),
  });

  const updateMutation = useMutation({
    mutationFn: (body: Parameters<typeof activitiesApi.updateActivity>[1]) =>
      activitiesApi.updateActivity(id!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities"] });
      qc.invalidateQueries({ queryKey: ["activities", id] });
      // Activities can be on a contact's timeline — invalidate coarsely so
      // any open timeline tab refetches.
      qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Activity updated.");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Update failed."),
  });

  const deleteMutation = useMutation({
    mutationFn: () => activitiesApi.deleteActivity(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities"] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Activity deleted.");
      navigate("/activities");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Delete failed."),
  });

  if (activityQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (activityQuery.isError || !activityQuery.data) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">
          Couldn't load this activity.
        </p>
        <Button asChild variant="outline">
          <Link to="/activities">
            <ArrowLeft /> Back to activities
          </Link>
        </Button>
      </div>
    );
  }

  const a = activityQuery.data;

  return (
    <section className="flex flex-col gap-4" data-testid="activity-detail">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Link
            to="/activities"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3" /> All activities
          </Link>
          <h1 className="text-2xl font-medium">{a.summary ?? "Activity"}</h1>
          <div className="flex flex-wrap gap-2">
            {a.type ? (
              <Badge variant="secondary">
                {labelFor(ACTIVITY_TYPE_LABELS, a.type)}
              </Badge>
            ) : null}
            {a.direction ? (
              <Badge variant="outline">
                {labelFor(ACTIVITY_DIRECTION_LABELS, a.direction)}
              </Badge>
            ) : null}
            {a.subjectType ? (
              <Badge variant="muted">
                {labelFor(SUBJECT_TYPE_LABELS, a.subjectType)}
              </Badge>
            ) : null}
            {a.occurredAt ? (
              <span className="text-xs text-muted-foreground">
                {new Date(a.occurredAt).toLocaleString()}
              </span>
            ) : null}
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" data-testid="delete-activity">
              <Trash2 /> Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this activity?</AlertDialogTitle>
              <AlertDialogDescription>
                Permanently removes this activity. It'll also disappear from
                any contact's timeline.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={() => deleteMutation.mutate()}
                data-testid="confirm-delete-activity"
              >
                Delete activity
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityForm
            defaultValues={activityToFormValues(a)}
            submitLabel="Save changes"
            isSubmitting={updateMutation.isPending}
            onSubmit={(values) =>
              updateMutation.mutate(formValuesToActivity(values, a))
            }
          />
        </CardContent>
      </Card>

      {a.payload && Object.keys(a.payload).length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Extra details</CardTitle>
            <CardDescription>
              Extra information recorded automatically with this activity.
              Read-only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
              {JSON.stringify(a.payload, null, 2)}
            </pre>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
