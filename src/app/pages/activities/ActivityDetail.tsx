import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";

import * as activitiesApi from "@/api/activities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ActivityDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["activities", id],
    queryFn: () => activitiesApi.getActivity(id!),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data) {
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

  return (
    <section className="flex flex-col gap-4" data-testid="activity-detail">
      <div className="flex flex-col gap-1">
        <Link
          to="/activities"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" /> All activities
        </Link>
        <h1 className="text-2xl font-medium">{data.summary ?? "Activity"}</h1>
        <div className="flex flex-wrap gap-2">
          {data.type ? <Badge variant="secondary">{data.type}</Badge> : null}
          {data.direction ? <Badge variant="outline">{data.direction}</Badge> : null}
          {data.subjectType ? (
            <Badge variant="muted">{data.subjectType}</Badge>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>
            <code>GET /api/activities/{data.id}</code>. Activities are
            append-only via the backend — no update or delete endpoints
            exposed.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {data.body ? (
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Body
              </span>
              <p className="whitespace-pre-wrap">{data.body}</p>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Subject ID" value={data.subjectId} />
            <Field
              label="Occurred at"
              value={data.occurredAt ? new Date(data.occurredAt).toLocaleString() : undefined}
            />
            <Field label="Due at" value={data.dueAt} />
            <Field label="Completed at" value={data.completedAt} />
          </div>
          {data.payload && Object.keys(data.payload).length > 0 ? (
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Payload
              </span>
              <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                {JSON.stringify(data.payload, null, 2)}
              </pre>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span>{value ?? "—"}</span>
    </div>
  );
}
