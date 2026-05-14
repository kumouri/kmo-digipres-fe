import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, Link } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, Mail, Trash2 } from "lucide-react";

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
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as contactsApi from "@/api/contacts";
import {
  ContactForm,
  contactToFormValues,
  formValuesToContact,
} from "./ContactForm";
import { SendEmailDialog } from "./SendEmailDialog";

export function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [emailOpen, setEmailOpen] = useState(false);

  const contactQuery = useQuery({
    queryKey: ["contacts", id],
    queryFn: () => contactsApi.getContact(id!),
    enabled: Boolean(id),
  });

  const timelineQuery = useQuery({
    queryKey: ["contacts", id, "timeline"],
    queryFn: () => contactsApi.getContactTimeline(id!),
    enabled: Boolean(id),
  });

  const updateMutation = useMutation({
    mutationFn: (body: Parameters<typeof contactsApi.updateContact>[1]) =>
      contactsApi.updateContact(id!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contacts", id] });
      toast.success("Contact updated.");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Update failed."),
  });

  const deleteMutation = useMutation({
    mutationFn: () => contactsApi.deleteContact(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact deleted.");
      navigate("/contacts");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Delete failed."),
  });

  if (contactQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (contactQuery.isError || !contactQuery.data) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">
          Couldn't load this contact.
        </p>
        <Button asChild variant="outline">
          <Link to="/contacts">
            <ArrowLeft /> Back to contacts
          </Link>
        </Button>
      </div>
    );
  }

  const c = contactQuery.data;

  return (
    <section className="flex flex-col gap-4" data-testid="contact-detail">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Link
            to="/contacts"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3" /> All contacts
          </Link>
          <h1 className="text-2xl font-medium">{c.displayName ?? "Unnamed"}</h1>
          <div className="flex flex-wrap gap-2">
            <Badge variant="muted">{c.type === "ORG" ? "Org" : "Person"}</Badge>
            {c.tags?.map((t) => (
              <Badge key={t} variant="outline">
                {t}
              </Badge>
            ))}
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" data-testid="delete-contact">
              <Trash2 /> Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this contact?</AlertDialogTitle>
              <AlertDialogDescription>
                Removes the contact from the tenant. Activities logged against
                this contact stay on the timeline view of any deals or
                companies that reference them.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={() => deleteMutation.mutate()}
                data-testid="confirm-delete-contact"
              >
                Delete contact
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="timeline" data-testid="timeline-tab">
            Timeline
          </TabsTrigger>
        </TabsList>
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Edit contact</CardTitle>
              <CardDescription>
                Saves via <code>PUT /api/contacts/{c.id}</code>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ContactForm
                defaultValues={contactToFormValues(c)}
                submitLabel="Save changes"
                isSubmitting={updateMutation.isPending}
                onSubmit={(values) =>
                  updateMutation.mutate(formValuesToContact(values, c))
                }
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-1.5">
                  <CardTitle>Activity timeline</CardTitle>
                  <CardDescription>
                    <code>GET /api/contacts/{c.id}/timeline</code>.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setEmailOpen(true)}
                  disabled={!c.emails?.length}
                  data-testid="send-email-button"
                >
                  <Mail /> Send email
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {timelineQuery.isLoading ? (
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : !timelineQuery.data?.length ? (
                <p className="text-sm text-muted-foreground">
                  No activities yet. Emails sent from a contact's detail page
                  will log here automatically (phase 6).
                </p>
              ) : (
                <ul
                  className="flex flex-col gap-3"
                  data-testid="contact-timeline"
                >
                  {timelineQuery.data.map((a) => (
                    <li
                      key={a.id ?? `${a.occurredAt}-${a.summary}`}
                      className="flex flex-col gap-1 rounded-md border bg-card p-3"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{a.type ?? "—"}</Badge>
                        {a.direction ? (
                          <Badge variant="outline">{a.direction}</Badge>
                        ) : null}
                        {a.occurredAt ? (
                          <span className="text-xs text-muted-foreground">
                            {new Date(a.occurredAt).toLocaleString()}
                          </span>
                        ) : null}
                      </div>
                      {a.summary ? (
                        <p className="text-sm font-medium">{a.summary}</p>
                      ) : null}
                      {a.body ? (
                        <p className="text-sm text-muted-foreground">{a.body}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <SendEmailDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        contact={c}
      />
    </section>
  );
}
