import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, Link } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, Trash2 } from "lucide-react";

import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../primitives/card";
import { useContractTemplatesApi } from "../../hooks/useContractTemplatesApi";
import {
  ContractTemplateForm,
  templateToFormValues,
  formValuesToTemplate,
} from "./ContractTemplateForm";

export function ContractTemplateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const templatesApi = useContractTemplatesApi();
  const [editing, setEditing] = useState(false);

  const { data: template, isLoading } = useQuery({
    queryKey: ["contract-templates", id],
    queryFn: () => templatesApi.getContractTemplate(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (body: typeof template) =>
      templatesApi.updateContractTemplate(id!, body!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract-templates", id] });
      qc.invalidateQueries({ queryKey: ["contract-templates"] });
      toast.success("Template updated.");
      setEditing(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Update failed.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => templatesApi.deleteContractTemplate(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract-templates"] });
      toast.success("Template deleted.");
      navigate("/contract-templates");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!template) return <p className="text-muted-foreground">Template not found.</p>;

  if (editing) {
    return (
      <section className="flex flex-col gap-4" data-testid="contract-template-detail">
        <header className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-2xl font-medium">Edit: {template.name ?? "Template"}</h1>
        </header>
        <ContractTemplateForm
          defaultValues={templateToFormValues(template)}
          onSubmit={(v) => updateMutation.mutate(formValuesToTemplate(v, template))}
          submitLabel="Save changes"
          isSubmitting={updateMutation.isPending}
          onCancel={() => setEditing(false)}
        />
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4" data-testid="contract-template-detail">
      <header className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/contract-templates")}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-medium">{template.name ?? "—"}</h1>
        <Badge variant="outline">{template.kind ?? "—"}</Badge>
        <Badge variant={template.active ? "default" : "muted"}>
          {template.active ? "Active" : "Inactive"}
        </Badge>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {template.description && (
            <div>
              <span className="text-muted-foreground">Description:</span>{" "}
              {template.description}
            </div>
          )}
          {template.defaultTitle && (
            <div>
              <span className="text-muted-foreground">Default title:</span>{" "}
              {template.defaultTitle}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Body template</CardTitle>
        </CardHeader>
        <CardContent>
          <pre
            className="overflow-auto rounded bg-muted p-3 text-xs font-mono whitespace-pre-wrap"
            data-testid="template-body"
          >
            {template.bodyTemplate || "(empty)"}
          </pre>
          <p className="mt-2 text-xs text-muted-foreground">
            Mustache — use {"{{placeholders}}"} for dynamic values.
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-2 flex-wrap">
        <Button onClick={() => setEditing(true)} data-testid="edit-template-btn">
          Edit template
        </Button>
        <Button
          variant="outline"
          onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
          data-testid="delete-template-btn"
        >
          <Trash2 className="size-4" /> Delete
        </Button>
      </div>

      <Button variant="ghost" asChild>
        <Link to="/contract-templates">All templates</Link>
      </Button>
    </section>
  );
}
