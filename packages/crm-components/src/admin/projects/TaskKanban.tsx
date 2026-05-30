import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import { useProjectsApi } from "../../hooks/useProjectsApi";
import { Badge } from "../../primitives/badge";
import { TASK_STATUSES, type Task, type TaskStatus } from "../../types/api";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, labelFor } from "../labels";

const STATUS_VARIANT: Record<TaskStatus, "default" | "secondary" | "muted" | "destructive"> = {
  TODO: "muted",
  IN_PROGRESS: "default",
  BLOCKED: "destructive",
  DONE: "secondary",
};

interface TaskKanbanProps {
  projectId: string;
}

export function TaskKanban({ projectId }: TaskKanbanProps) {
  const qc = useQueryClient();
  const projectsApi = useProjectsApi();

  const { data } = useQuery({
    queryKey: ["projects", projectId, "tasks"],
    queryFn: () => projectsApi.listTasks(projectId),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const moveMutation = useMutation({
    mutationFn: ({ id, target }: { id: string; target: TaskStatus }) =>
      projectsApi.changeTaskStatus(id, target),
    onMutate: async ({ id, target }) => {
      await qc.cancelQueries({ queryKey: ["projects", projectId, "tasks"] });
      const previous = qc.getQueryData<Task[]>(["projects", projectId, "tasks"]);
      qc.setQueryData<Task[]>(["projects", projectId, "tasks"], (old) =>
        old?.map((t) => (t.id === id ? { ...t, status: target } : t)),
      );
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous)
        qc.setQueryData(["projects", projectId, "tasks"], ctx.previous);
      toast.error(err instanceof Error ? err.message : "Move failed.");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects", projectId, "tasks"] });
      toast.success("Task status updated.");
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const taskId = String(active.id).replace(/^task:/, "");
    const targetStatus = String(over.id).replace(/^column:/, "") as TaskStatus;
    const task = data?.find((t) => t.id === taskId);
    if (!task || task.status === targetStatus) return;
    moveMutation.mutate({ id: taskId, target: targetStatus });
  };

  const grouped = TASK_STATUSES.map((s) => ({
    status: s,
    tasks: data?.filter((t) => t.status === s) ?? [],
  }));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragEnd={handleDragEnd}
    >
      <div
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        data-testid="task-kanban"
      >
        {grouped.map(({ status, tasks }) => (
          <DroppableColumn key={status} status={status} count={tasks.length}>
            {tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground">No tasks.</p>
            ) : (
              tasks.map((t) => (
                <DraggableTaskCard key={t.id} task={t} />
              ))
            )}
          </DroppableColumn>
        ))}
      </div>
    </DndContext>
  );
}

interface DroppableColumnProps {
  status: TaskStatus;
  count: number;
  children: React.ReactNode;
}

function DroppableColumn({ status, count, children }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${status}` });
  return (
    <section
      ref={setNodeRef}
      className={
        "flex flex-col gap-2 rounded-lg border bg-card p-3 transition-colors " +
        (isOver ? "border-primary bg-primary/5" : "")
      }
      data-testid={`kanban-column-${status}`}
    >
      <header className="flex items-center justify-between">
        <Badge variant={STATUS_VARIANT[status]}>{labelFor(TASK_STATUS_LABELS, status)}</Badge>
        <span className="text-xs text-muted-foreground">{count}</span>
      </header>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

interface TaskCardProps {
  task: Task;
}

function DraggableTaskCard({ task }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: `task:${task.id}` });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={
        "flex flex-col gap-1 rounded-md border bg-background p-2 outline-none " +
        "focus-visible:ring-2 focus-visible:ring-ring " +
        (isDragging ? "opacity-50 cursor-grabbing" : "cursor-grab")
      }
      data-testid="task-card"
    >
      <span className="text-sm font-medium">{task.title ?? "Untitled task"}</span>
      {task.priority ? (
        <span className="text-xs text-muted-foreground">
          {labelFor(TASK_PRIORITY_LABELS, task.priority)}
        </span>
      ) : null}
    </div>
  );
}
