import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { Badge } from "@kmosf/crm-components";
import { Button } from "@kmosf/crm-components";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@kmosf/crm-components";
import { DataTable, type Column } from "../../components/DataTable";
import { useContactsApi } from "../../hooks/useContactsApi";
import type { ContactDTO } from "@kmosf/crm-components";
import {
  ContactForm,
  contactToFormValues,
  formValuesToContact,
} from "./ContactForm";

const columns: Column<ContactDTO>[] = [
  {
    key: "displayName",
    header: "Name",
    cell: (c) => (
      <span className="font-medium" data-testid="contact-row-name">
        {c.displayName ?? "—"}
      </span>
    ),
  },
  {
    key: "type",
    header: "Type",
    cell: (c) => (
      <Badge variant="muted">{c.type === "ORG" ? "Org" : "Person"}</Badge>
    ),
  },
  {
    key: "email",
    header: "Primary email",
    cell: (c) => c.emails?.[0] ?? <span className="text-muted-foreground">—</span>,
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

export function ContactsList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const contactsApi = useContactsApi();
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: contactsApi.listContacts,
  });

  const createMutation = useMutation({
    mutationFn: contactsApi.createContact,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact created.");
      setCreateOpen(false);
      if (created.id) navigate(`/contacts/${created.id}`);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Create failed.");
    },
  });

  return (
    <section className="flex flex-col gap-4" data-testid="contacts-page">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium">Contacts</h1>
          <p className="text-sm text-muted-foreground">
            People and organizations across your tenant.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} data-testid="new-contact">
          <Plus /> New contact
        </Button>
      </header>

      <DataTable
        columns={columns}
        rows={data}
        rowKey={(r) => r.id ?? r.displayName ?? Math.random().toString()}
        isLoading={isLoading}
        emptyMessage="No contacts yet — create one to get started."
        onRowClick={(r) => r.id && navigate(`/contacts/${r.id}`)}
        data-testid="contacts-table"
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New contact</DialogTitle>
            <DialogDescription>
              Persisted via <code>POST /api/v1/contacts</code>.
            </DialogDescription>
          </DialogHeader>
          <ContactForm
            defaultValues={contactToFormValues(undefined)}
            submitLabel="Create contact"
            isSubmitting={createMutation.isPending}
            onCancel={() => setCreateOpen(false)}
            onSubmit={(values) =>
              createMutation.mutate(formValuesToContact(values))
            }
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}
