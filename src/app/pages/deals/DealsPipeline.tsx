import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

import * as dealsApi from "@/api/deals";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PIPELINE_STAGES,
  type DealDTO,
  type PipelineStage,
} from "@/types/api";

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
  const { data } = useQuery({ queryKey: ["deals"], queryFn: dealsApi.listDeals });
  const [lostTarget, setLostTarget] = useState<MoveTarget | null>(null);
  const [lostReason, setLostReason] = useState("");

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
    if (!deal.id) return;
    if (stage === "LOST") {
      setLostTarget({ deal, stage });
      setLostReason("");
      return;
    }
    moveMutation.mutate({ id: deal.id, stage });
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
      <div
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6"
        data-testid="deals-pipeline"
      >
        {grouped.map(({ stage, deals }) => (
          <section
            key={stage}
            className="flex flex-col gap-2 rounded-lg border bg-card p-3"
            data-testid={`pipeline-column-${stage}`}
          >
            <header className="flex items-center justify-between">
              <Badge variant={STAGE_VARIANTS[stage]}>{stage}</Badge>
              <span className="text-xs text-muted-foreground">{deals.length}</span>
            </header>
            <div className="flex flex-col gap-2">
              {deals.length === 0 ? (
                <p className="text-xs text-muted-foreground">No deals.</p>
              ) : (
                deals.map((d) => (
                  <DealCard
                    key={d.id}
                    deal={d}
                    onMove={(toStage) => handleMove(d, toStage)}
                  />
                ))
              )}
            </div>
          </section>
        ))}
      </div>

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

interface DealCardProps {
  deal: DealDTO;
  onMove: (stage: PipelineStage) => void;
}

function DealCard({ deal, onMove }: DealCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div
      className="flex flex-col gap-1 rounded-md border bg-background p-2"
      data-testid="deal-card"
    >
      <Link
        to={`/deals/${deal.id}`}
        className="text-sm font-medium hover:underline"
      >
        {deal.title ?? "Untitled deal"}
      </Link>
      {deal.value != null ? (
        <span className="text-xs text-muted-foreground">
          {deal.currency ?? "USD"} {deal.value.toLocaleString()}
        </span>
      ) : null}
      <div className="flex flex-wrap gap-1 pt-1">
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
