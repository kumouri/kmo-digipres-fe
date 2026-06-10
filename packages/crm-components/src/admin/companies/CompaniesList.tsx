import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { Badge } from "@kmosf/crm-components";
import { Button } from "@kmosf/crm-components";
import { safeHref } from "@kmosf/crm-components";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@kmosf/crm-components";
import { DataTable, type Column } from "../../components/DataTable";
import { useCompaniesApi } from "../../hooks/useCompaniesApi";
import type { CompanyDTO } from "@kmosf/crm-components";
import {
  CompanyForm,
  companyToFormValues,
  formValuesToCompany,
} from "./CompanyForm";

const columns: Column<CompanyDTO>[] = [
  {
    key: "name",
    header: "Name",
    cell: (c) => (
      <span className="font-medium" data-testid="company-row-name">
        {c.name ?? "—"}
      </span>
    ),
  },
  {
    key: "industry",
    header: "Industry",
    cell: (c) =>
      c.industry ? (
        <Badge variant="muted">{c.industry}</Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "website",
    header: "Website",
    cell: (c) => {
      if (!c.website)
        return <span className="text-muted-foreground">—</span>;
      // Security FE-01: only render a clickable link for http(s) URLs.
      // A non-http(s) value (e.g. a stored `javascript:` URI) is shown as
      // inert text — never as a navigable href.
      const href = safeHref(c.website);
      return href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline-offset-2 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {c.website}
        </a>
      ) : (
        <span className="text-muted-foreground">{c.website}</span>
      );
    },
  },
  {
    key: "tags",
    header: "Tags",
    cell: (c) =>
      c.tags && c.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {c.tags.map((t) => (
            <Badge key={t} variant="outline">
              {t}
            </Badge>
          ))}
        </div>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
];

export function CompaniesList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const companiesApi = useCompaniesApi();
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: companiesApi.listCompanies,
  });

  const createMutation = useMutation({
    mutationFn: companiesApi.createCompany,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company created.");
      setCreateOpen(false);
      if (created.id) navigate(`/companies/${created.id}`);
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Create failed."),
  });

  return (
    <section className="flex flex-col gap-4" data-testid="companies-page">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium">Companies</h1>
          <p className="text-sm text-muted-foreground">
            The businesses your contacts and deals belong to.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} data-testid="new-company">
          <Plus /> New company
        </Button>
      </header>

      <DataTable
        columns={columns}
        rows={data}
        rowKey={(r) => r.id ?? r.name ?? Math.random().toString()}
        isLoading={isLoading}
        emptyMessage="No companies yet — add one to get started."
        onRowClick={(r) => r.id && navigate(`/companies/${r.id}`)}
        data-testid="companies-table"
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New company</DialogTitle>
            <DialogDescription>
              Add a business you work with. You can add details and contacts
              later.
            </DialogDescription>
          </DialogHeader>
          <CompanyForm
            defaultValues={companyToFormValues(undefined)}
            submitLabel="Create company"
            isSubmitting={createMutation.isPending}
            onCancel={() => setCreateOpen(false)}
            onSubmit={(values) =>
              createMutation.mutate(formValuesToCompany(values))
            }
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}
