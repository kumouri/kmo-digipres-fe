import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

import { Button } from "../../primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../primitives/card";
import { useReportsApi } from "../../hooks/useReportsApi";

export function DashboardDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const reportsApi = useReportsApi();

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["reports", "dashboards", id],
    queryFn: () => reportsApi.getDashboard(id!),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => reportsApi.deleteDashboard(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports", "dashboards"] });
      toast.success("Dashboard deleted.");
      navigate("/dashboards");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!dashboard) return <p className="text-muted-foreground">Dashboard not found.</p>;

  return (
    <section className="flex flex-col gap-4" data-testid="dashboard-detail">
      <header className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboards")}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-medium">{dashboard.name ?? "—"}</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Description:</span>{" "}
            {dashboard.description ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Widgets:</span>{" "}
            <span data-testid="dashboard-widget-count">
              {(dashboard.items ?? []).length}
            </span>
          </div>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        onClick={() => deleteMutation.mutate()}
        disabled={deleteMutation.isPending}
        data-testid="delete-dashboard-btn"
      >
        Delete dashboard
      </Button>
    </section>
  );
}
