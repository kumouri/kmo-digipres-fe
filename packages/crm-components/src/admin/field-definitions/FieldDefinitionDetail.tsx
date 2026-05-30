import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, Link } from "react-router";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../primitives/card";
import { useFieldDefinitionsApi } from "../../hooks/useFieldDefinitionsApi";
import { FIELD_TYPE_LABELS, RECORD_TYPE_LABELS, labelFor } from "../labels";

export function FieldDefinitionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fdApi = useFieldDefinitionsApi();
  const [roles, setRoles] = useState<string>("");
  const [editRolesOpen, setEditRolesOpen] = useState(false);

  const { data: field, isLoading } = useQuery({
    queryKey: ["field-definitions", id],
    queryFn: () => fdApi.getFieldDefinition(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (updated: typeof field) => fdApi.updateFieldDefinition(id!, updated!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["field-definitions", id] });
      qc.invalidateQueries({ queryKey: ["field-definitions"] });
      toast.success("Field updated.");
      setEditRolesOpen(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Update failed.");
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!field) return <p className="text-muted-foreground">Field not found.</p>;

  return (
    <section className="flex flex-col gap-4" data-testid="field-def-detail">
      <header className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/field-definitions")}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-medium">{field.label ?? "—"}</h1>
        <Badge variant="muted">{labelFor(RECORD_TYPE_LABELS, field.entityType)}</Badge>
        <Badge variant="outline">{labelFor(FIELD_TYPE_LABELS, field.type)}</Badge>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Key:</span>{" "}
            <code>{field.key ?? "—"}</code>
          </div>
          <div>
            <span className="text-muted-foreground">Required:</span>{" "}
            {field.required ? "Yes" : "No"}
          </div>
          <div>
            <span className="text-muted-foreground">Visibility roles:</span>{" "}
            <span data-testid="field-visibility-roles">
              {(field.visibilityRoles ?? []).join(", ") || "(all)"}
            </span>
          </div>
        </CardContent>
      </Card>

      {!editRolesOpen ? (
        <Button
          variant="outline"
          onClick={() => {
            setRoles((field.visibilityRoles ?? []).join(", "));
            setEditRolesOpen(true);
          }}
          data-testid="edit-visibility-roles-btn"
        >
          Edit visibility roles
        </Button>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            Visibility roles (comma-separated)
            <input
              className="mt-1 block w-full rounded border px-2 py-1 text-sm"
              value={roles}
              onChange={(e) => setRoles(e.target.value)}
              data-testid="visibility-roles-input"
            />
          </label>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditRolesOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                updateMutation.mutate({
                  ...field,
                  visibilityRoles: roles.split(",").map((r) => r.trim()).filter(Boolean),
                })
              }
              disabled={updateMutation.isPending}
              data-testid="save-visibility-roles-btn"
            >
              Save
            </Button>
          </div>
        </div>
      )}

      <Button variant="ghost" asChild>
        <Link to="/field-definitions">All fields</Link>
      </Button>
    </section>
  );
}
