import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import * as dealsApi from "@/api/deals";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/DataTable";
import type { DealDTO } from "@/types/api";
import { DealForm, dealToFormValues, formValuesToDeal } from "./DealForm";
import { DealsPipeline } from "./DealsPipeline";

const columns: Column<DealDTO>[] = [
  {
    key: "title",
    header: "Title",
    cell: (d) => (
      <span className="font-medium" data-testid="deal-row-title">
        {d.title ?? "—"}
      </span>
    ),
  },
  {
    key: "stage",
    header: "Stage",
    cell: (d) => (d.stage ? <Badge variant="secondary">{d.stage}</Badge> : "—"),
  },
  {
    key: "value",
    header: "Value",
    cell: (d) =>
      d.value != null ? (
        <span>
          {d.currency ?? "USD"} {d.value.toLocaleString()}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "close",
    header: "Expected close",
    cell: (d) =>
      d.expectedCloseDate ? (
        d.expectedCloseDate
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
];

export function DealsList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["deals"],
    queryFn: dealsApi.listDeals,
  });

  const createMutation = useMutation({
    mutationFn: dealsApi.createDeal,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Deal created.");
      setCreateOpen(false);
      if (created.id) navigate(`/deals/${created.id}`);
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Create failed."),
  });

  return (
    <section className="flex flex-col gap-4" data-testid="deals-page">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium">Deals</h1>
          <p className="text-sm text-muted-foreground">
            Opportunities moving through the pipeline.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} data-testid="new-deal">
          <Plus /> New deal
        </Button>
      </header>

      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline" data-testid="pipeline-tab">
            Pipeline
          </TabsTrigger>
          <TabsTrigger value="table" data-testid="table-tab">
            Table
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pipeline">
          <DealsPipeline />
        </TabsContent>
        <TabsContent value="table">
          <DataTable
            columns={columns}
            rows={data}
            rowKey={(r) => r.id ?? r.title ?? Math.random().toString()}
            isLoading={isLoading}
            emptyMessage="No deals yet."
            onRowClick={(r) => r.id && navigate(`/deals/${r.id}`)}
            data-testid="deals-table"
          />
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New deal</DialogTitle>
            <DialogDescription>
              Persisted via <code>POST /api/deals</code>.
            </DialogDescription>
          </DialogHeader>
          <DealForm
            defaultValues={dealToFormValues(undefined)}
            submitLabel="Create deal"
            isSubmitting={createMutation.isPending}
            onCancel={() => setCreateOpen(false)}
            onSubmit={(values) =>
              createMutation.mutate(formValuesToDeal(values))
            }
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}
