import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, FolderKanban, Trash2 } from "lucide-react";

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
import { useDealsApi } from "../../hooks/useDealsApi";
import { useProjectsApi } from "../../hooks/useProjectsApi";
import { DealForm, dealToFormValues, formValuesToDeal } from "./DealForm";

export function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const dealsApi = useDealsApi();
  const projectsApi = useProjectsApi();

  const dealQuery = useQuery({
    queryKey: ["deals", id],
    queryFn: () => dealsApi.getDeal(id!),
    enabled: Boolean(id),
  });

  const updateMutation = useMutation({
    mutationFn: (body: Parameters<typeof dealsApi.updateDeal>[1]) =>
      dealsApi.updateDeal(id!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["deals", id] });
      toast.success("Deal updated.");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Update failed."),
  });

  const deleteMutation = useMutation({
    mutationFn: () => dealsApi.deleteDeal(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Deal deleted.");
      navigate("/deals");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Delete failed."),
  });

  const convertMutation = useMutation({
    mutationFn: () => projectsApi.convertFromDeal(id!),
    onSuccess: (project) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Deal converted to project.");
      if (project.id) navigate(`/projects/${project.id}`);
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Conversion failed."),
  });

  if (dealQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (dealQuery.isError || !dealQuery.data) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">Couldn't load this deal.</p>
        <Button asChild variant="outline">
          <Link to="/deals">
            <ArrowLeft /> Back to deals
          </Link>
        </Button>
      </div>
    );
  }

  const d = dealQuery.data;

  return (
    <section className="flex flex-col gap-4" data-testid="deal-detail">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Link
            to="/deals"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3" /> All deals
          </Link>
          <h1 className="text-2xl font-medium">{d.title ?? "Untitled"}</h1>
          <div className="flex flex-wrap gap-2">
            {d.stage ? <Badge variant="secondary">{d.stage}</Badge> : null}
            {d.value != null ? (
              <Badge variant="outline">
                {d.currency ?? "USD"} {d.value.toLocaleString()}
              </Badge>
            ) : null}
            {d.lostReason ? (
              <Badge variant="destructive">Lost: {d.lostReason}</Badge>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {d.stage === "WON" ? (
            <Button
              variant="outline"
              data-testid="convert-to-project"
              disabled={convertMutation.isPending}
              onClick={() => convertMutation.mutate()}
            >
              <FolderKanban /> Convert to Project
            </Button>
          ) : null}
          <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" data-testid="delete-deal">
              <Trash2 /> Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this deal?</AlertDialogTitle>
              <AlertDialogDescription>
                The deal is removed from the pipeline. Activities and the
                underlying contact/company stay intact.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={() => deleteMutation.mutate()}
                data-testid="confirm-delete-deal"
              >
                Delete deal
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit deal</CardTitle>
          <CardDescription>
            Saves via <code>PUT /api/deals/{d.id}</code>. Use the pipeline view
            to move stages with the dedicated <code>/move</code> endpoint.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DealForm
            defaultValues={dealToFormValues(d)}
            submitLabel="Save changes"
            isSubmitting={updateMutation.isPending}
            onSubmit={(values) =>
              updateMutation.mutate(formValuesToDeal(values, d))
            }
          />
        </CardContent>
      </Card>
    </section>
  );
}
