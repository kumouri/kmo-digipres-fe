import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import * as commsApi from "@/api/communication";
import { Button } from "@kmosf/crm-components";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@kmosf/crm-components";
import { Input } from "@kmosf/crm-components";
import { Label } from "@kmosf/crm-components";
import { Textarea } from "@kmosf/crm-components";
import { useAuth } from "@/auth/useAuth";
import type { ContactDTO } from "@kmosf/crm-components";

const schema = z.object({
  to: z.string().email("Recipient must be a valid email"),
  from: z.string().email("From must be a valid email"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
});

type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: ContactDTO;
}

export function SendEmailDialog({ open, onOpenChange, contact }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const defaultTo = contact.emails?.[0] ?? "";
  const defaultFrom = user?.email ?? "";

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      to: defaultTo,
      from: defaultFrom,
      subject: "",
      body: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        to: contact.emails?.[0] ?? "",
        from: user?.email ?? "",
        subject: "",
        body: "",
      });
    }
  }, [open, contact.emails, user?.email, form]);

  const mutation = useMutation({
    mutationFn: commsApi.sendSingleEmail,
    onSuccess: (sent) => {
      if (!sent) {
        toast.error("Backend reported the message was not delivered.");
        return;
      }
      // The backend logs an Activity to the matching contact's timeline.
      qc.invalidateQueries({ queryKey: ["contacts", contact.id, "timeline"] });
      qc.invalidateQueries({ queryKey: ["activities"] });
      toast.success("Email sent — activity logged on the timeline.");
      onOpenChange(false);
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Send failed."),
  });

  const onSubmit = form.handleSubmit((values) => mutation.mutate(values));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send email</DialogTitle>
          <DialogDescription>
            Routes through <code>POST /api/communication/singleEmail</code>.
            The backend logs an outbound EMAIL activity to this contact's
            timeline on success.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={onSubmit} noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email-from">From</Label>
              <Input
                id="email-from"
                type="email"
                aria-invalid={form.formState.errors.from ? true : undefined}
                {...form.register("from")}
              />
              {form.formState.errors.from ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.from.message}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email-to">To</Label>
              <Input
                id="email-to"
                type="email"
                aria-invalid={form.formState.errors.to ? true : undefined}
                {...form.register("to")}
              />
              {form.formState.errors.to ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.to.message}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email-subject">Subject</Label>
            <Input
              id="email-subject"
              aria-invalid={form.formState.errors.subject ? true : undefined}
              {...form.register("subject")}
            />
            {form.formState.errors.subject ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.subject.message}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email-body">Body</Label>
            <Textarea
              id="email-body"
              rows={8}
              aria-invalid={form.formState.errors.body ? true : undefined}
              {...form.register("body")}
            />
            {form.formState.errors.body ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.body.message}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              data-testid="send-email-submit"
            >
              {mutation.isPending ? "Sending…" : "Send email"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
