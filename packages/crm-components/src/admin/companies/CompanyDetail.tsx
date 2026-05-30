import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, Trash2 } from "lucide-react";

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
  CardHeader,
  CardTitle,
} from "@kmosf/crm-components";
import { Skeleton } from "@kmosf/crm-components";
import { useCompaniesApi } from "../../hooks/useCompaniesApi";
import {
  CompanyForm,
  companyToFormValues,
  formValuesToCompany,
} from "./CompanyForm";

export function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const companiesApi = useCompaniesApi();

  const companyQuery = useQuery({
    queryKey: ["companies", id],
    queryFn: () => companiesApi.getCompany(id!),
    enabled: Boolean(id),
  });

  const updateMutation = useMutation({
    mutationFn: (body: Parameters<typeof companiesApi.updateCompany>[1]) =>
      companiesApi.updateCompany(id!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["companies"] });
      qc.invalidateQueries({ queryKey: ["companies", id] });
      toast.success("Company updated.");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Update failed."),
  });

  const deleteMutation = useMutation({
    mutationFn: () => companiesApi.deleteCompany(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company deleted.");
      navigate("/companies");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Delete failed."),
  });

  if (companyQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (companyQuery.isError || !companyQuery.data) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">
          Couldn't load this company.
        </p>
        <Button asChild variant="outline">
          <Link to="/companies">
            <ArrowLeft /> Back to companies
          </Link>
        </Button>
      </div>
    );
  }

  const c = companyQuery.data;

  return (
    <section className="flex flex-col gap-4" data-testid="company-detail">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Link
            to="/companies"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3" /> All companies
          </Link>
          <h1 className="text-2xl font-medium">{c.name ?? "Unnamed"}</h1>
          <div className="flex flex-wrap gap-2">
            {c.industry ? <Badge variant="muted">{c.industry}</Badge> : null}
            {c.tags?.map((t) => (
              <Badge key={t} variant="outline">
                {t}
              </Badge>
            ))}
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" data-testid="delete-company">
              <Trash2 /> Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this company?</AlertDialogTitle>
              <AlertDialogDescription>
                Contacts and deals linked to this company will stay, but they'll
                no longer show a company. You can re-assign them first if you'd
                like.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={() => deleteMutation.mutate()}
                data-testid="confirm-delete-company"
              >
                Delete company
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit company</CardTitle>
        </CardHeader>
        <CardContent>
          <CompanyForm
            defaultValues={companyToFormValues(c)}
            submitLabel="Save changes"
            isSubmitting={updateMutation.isPending}
            onSubmit={(values) =>
              updateMutation.mutate(formValuesToCompany(values, c))
            }
          />
        </CardContent>
      </Card>
    </section>
  );
}
