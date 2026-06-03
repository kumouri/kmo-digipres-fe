import { useQuery } from "@tanstack/react-query";

import { useContractorApi } from "../../hooks/useContractorApi";
import { Badge } from "../../primitives/badge";
import { Skeleton } from "../../primitives/skeleton";
import { TASK_STATUSES, type TaskStatus } from "../../types/api";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, labelFor } from "../labels";

const STATUS_VARIANT: Record<TaskStatus, "default" | "secondary" | "muted" | "destructive"> = {
  TODO: "muted",
  IN_PROGRESS: "default",
  BLOCKED: "destructive",
  DONE: "secondary",
};

interface Props {
  projectId: string;
}

/**
 * Read-only task view for a contractor's project. Mirrors the staff
 * {@link TaskKanban} columns but sources tasks from the scoped reader
 * (/me/contractor/projects/{id}/tasks) and offers no drag/move affordances —
 * there is no contractor task-status mutation endpoint.
 */
export function ContractorTaskList({ projectId }: Props) {
  const contractorApi = useContractorApi();

  const { data, isLoading } = useQuery({
    queryKey: ["contractor", "projects", projectId, "tasks"],
    queryFn: () => contractorApi.listProjectTasks(projectId),
  });

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  const grouped = TASK_STATUSES.map((s) => ({
    status: s,
    tasks: (data ?? []).filter((t) => t.status === s),
  }));

  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
      data-testid="contractor-task-list"
    >
      {grouped.map(({ status, tasks }) => (
        <section
          key={status}
          className="flex flex-col gap-2 rounded-lg border bg-card p-3"
          data-testid={`task-column-${status}`}
        >
          <header className="flex items-center justify-between">
            <Badge variant={STATUS_VARIANT[status]}>
              {labelFor(TASK_STATUS_LABELS, status)}
            </Badge>
            <span className="text-xs text-muted-foreground">{tasks.length}</span>
          </header>
          <div className="flex flex-col gap-2">
            {tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground">No tasks.</p>
            ) : (
              tasks.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-col gap-1 rounded-md border bg-background p-2"
                  data-testid="task-card"
                >
                  <span className="text-sm font-medium">
                    {t.title ?? "Untitled task"}
                  </span>
                  {t.priority ? (
                    <span className="text-xs text-muted-foreground">
                      {labelFor(TASK_PRIORITY_LABELS, t.priority)}
                    </span>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
