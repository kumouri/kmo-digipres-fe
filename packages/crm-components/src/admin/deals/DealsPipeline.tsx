import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
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

import { useDealsApi } from "../../hooks/useDealsApi";
import { Badge } from "@kmosf/crm-components";
import { Button } from "@kmosf/crm-components";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@kmosf/crm-components";
import { Input } from "@kmosf/crm-components";
import { Label } from "@kmosf/crm-components";
import {
  PIPELINE_STAGES,
  type DealDTO,
  type PipelineStage,
} from "@kmosf/crm-components";

const STAGE_VARIANTS: Record<PipelineStage, "default" | "secondary" | "muted" | "destructive"> = {
  NEW: "muted",
  QUALIFIED: "secondary",
  PROPOSAL: "secondary",
  NEGOTIATION: "default",
  WON: "default",
  LOST: "destructive",
};

interface MoveTarget {
  deal: DealDTO;
  stage: PipelineStage;
}

export function DealsPipeline() {
  const qc = useQueryClient();
  const dealsApi = useDealsApi();
  const { data } = useQuery({ queryKey: ["deals"], queryFn: dealsApi.listDeals });
  const [lostTarget, setLostTarget] = useState<MoveTarget | null>(null);
  const [lostReason, setLostReason] = useState("");

  const sensors = useSensors(
    // Require 5px of movement before a drag starts so clicks on the Link /
    // Move buttons inside cards keep working.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const moveMutation = useMutation({
    mutationFn: ({ id, stage, lostReason: reason }: {
      id: string;
      stage: PipelineStage;
      lostReason?: string;
    }) => dealsApi.moveDealStage(id, { stage, lostReason: reason }),
    onMutate: async ({ id, stage }) => {
      await qc.cancelQueries({ queryKey: ["deals"] });
      const previous = qc.getQueryData<DealDTO[]>(["deals"]);
      qc.setQueryData<DealDTO[]>(["deals"], (old) =>
        old?.map((d) => (d.id === id ? { ...d, stage } : d)),
      );
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["deals"], ctx.previous);
      toast.error(err instanceof Error ? err.message : "Move failed.");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Stage updated.");
    },
  });

  const handleMove = (deal: DealDTO, stage: PipelineStage) => {
    if (!deal.id || deal.stage === stage) return;
    if (stage === "LOST") {
      setLostTarget({ deal, stage });
      setLostReason("");
      return;
    }
    moveMutation.mutate({ id: deal.id, stage });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const dealId = String(active.id).replace(/^deal:/, "");
    const targetStage = String(over.id).replace(/^column:/, "") as PipelineStage;
    const deal = data?.find((d) => d.id === dealId);
    if (!deal) return;
    handleMove(deal, targetStage);
  };

  const confirmLost = () => {
    if (!lostTarget?.deal.id || !lostReason.trim()) return;
    moveMutation.mutate({
      id: lostTarget.deal.id,
      stage: "LOST",
      lostReason: lostReason.trim(),
    });
    setLostTarget(null);
  };

  const grouped = PIPELINE_STAGES.map((s) => ({
    stage: s,
    deals: data?.filter((d) => d.stage === s) ?? [],
  }));

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragEnd={handleDragEnd}
      >
        <div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6"
          data-testid="deals-pipeline"
        >
          {grouped.map(({ stage, deals }) => (
            <DroppableColumn key={stage} stage={stage} count={deals.length}>
              {deals.length === 0 ? (
                <p className="text-xs text-muted-foreground">No deals.</p>
              ) : (
                deals.map((d) => (
                  <DraggableDealCard
                    key={d.id}
                    deal={d}
                    onMove={(toStage) => handleMove(d, toStage)}
                  />
                ))
              )}
            </DroppableColumn>
          ))}
        </div>
      </DndContext>

      <Dialog
        open={!!lostTarget}
        onOpenChange={(open) => {
          if (!open) setLostTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark deal as LOST</DialogTitle>
            <DialogDescription>
              <code>POST /api/deals/{lostTarget?.deal.id}/move</code> requires a
              non-empty <code>lostReason</code>.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="lost-reason">Lost reason</Label>
            <Input
              id="lost-reason"
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              placeholder="Why was this deal lost?"
              data-testid="lost-reason-input"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLostTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={confirmLost}
              disabled={!lostReason.trim()}
              data-testid="confirm-lost"
            >
              Mark as LOST
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface DroppableColumnProps {
  stage: PipelineStage;
  count: number;
  children: React.ReactNode;
}

function DroppableColumn({ stage, count, children }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${stage}` });
  return (
    <section
      ref={setNodeRef}
      className={
        "flex flex-col gap-2 rounded-lg border bg-card p-3 transition-colors " +
        (isOver ? "border-primary bg-primary/5" : "")
      }
      data-testid={`pipeline-column-${stage}`}
    >
      <header className="flex items-center justify-between">
        <Badge variant={STAGE_VARIANTS[stage]}>{stage}</Badge>
        <span className="text-xs text-muted-foreground">{count}</span>
      </header>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

interface DealCardProps {
  deal: DealDTO;
  onMove: (stage: PipelineStage) => void;
}

function DraggableDealCard({ deal, onMove }: DealCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `deal:${deal.id}`,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const [menuOpen, setMenuOpen] = useState(false);

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
      data-testid="deal-card"
    >
      <Link
        to={`/deals/${deal.id}`}
        className="text-sm font-medium hover:underline"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {deal.title ?? "Untitled deal"}
      </Link>
      {deal.value != null ? (
        <span className="text-xs text-muted-foreground">
          {deal.currency ?? "USD"} {deal.value.toLocaleString()}
        </span>
      ) : null}
      <div
        className="flex flex-wrap gap-1 pt-1"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {!menuOpen ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => setMenuOpen(true)}
            data-testid="move-deal"
          >
            Move <ArrowRight />
          </Button>
        ) : (
          PIPELINE_STAGES.filter((s) => s !== deal.stage).map((s) => (
            <Button
              key={s}
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => {
                setMenuOpen(false);
                onMove(s);
              }}
              data-testid={`move-to-${s}`}
            >
              {s}
            </Button>
          ))
        )}
      </div>
    </div>
  );
}
