import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, Play } from "lucide-react";

import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../primitives/card";
import { useReportsApi } from "../../hooks/useReportsApi";

export function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const reportsApi = useReportsApi();
  const [results, setResults] = useState<Record<string, unknown>[] | null>(null);

  const { data: report, isLoading } = useQuery({
    queryKey: ["reports", "saved", id],
    queryFn: () => reportsApi.getSavedReport(id!),
    enabled: !!id,
  });

  const runMutation = useMutation({
    mutationFn: () => reportsApi.runSavedReport(id!),
    onSuccess: (data) => {
      setResults(data);
      toast.success(`Report ran — ${data.length} row(s).`);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Run failed.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => reportsApi.deleteSavedReport(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports", "saved"] });
      toast.success("Report deleted.");
      navigate("/reports");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!report) return <p className="text-muted-foreground">Report not found.</p>;

  return (
    <section className="flex flex-col gap-4" data-testid="report-detail">
      <header className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/reports")}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-medium">{report.name ?? "—"}</h1>
        <Badge variant="muted">{report.entityType ?? "—"}</Badge>
        <Badge variant="outline">{report.chartHint ?? "TABLE"}</Badge>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Description:</span>{" "}
            {report.description ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Group by:</span>{" "}
            {(report.groupBy ?? []).join(", ") || "—"}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          onClick={() => runMutation.mutate()}
          disabled={runMutation.isPending}
          data-testid="run-report-btn"
        >
          <Play className="size-4" /> Run report
        </Button>
        <Button
          variant="outline"
          onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
          data-testid="delete-report-btn"
        >
          Delete
        </Button>
      </div>

      {results !== null && (
        <Card data-testid="report-results">
          <CardHeader>
            <CardTitle>Results ({results.length} rows)</CardTitle>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground">No results.</p>
            ) : (
              <pre className="text-xs overflow-auto max-h-64">
                {JSON.stringify(results, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
