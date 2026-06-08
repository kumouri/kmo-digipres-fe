import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, CalendarPlus, ShieldCheck, UserRound } from "lucide-react";

import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../primitives/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../primitives/dialog";
import { Input } from "../../primitives/input";
import { Label } from "../../primitives/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../primitives/select";
import { useFrontDeskApi } from "../../hooks/useFrontDeskApi";
import { useContactsApi } from "../../hooks/useContactsApi";
import type { Appointment, ContactDTO, VisitTypeBucket } from "../../types/api";
import { RISK_APPOINTMENTS_KEY } from "./RiskDayView";
import {
  APPOINTMENT_STATUS_LABELS,
  VISIT_TYPE_BUCKET_LABELS,
  labelFor,
} from "../labels";

export const APPOINTMENTS_KEY = ["frontdesk", "appointments"] as const;

const VISIT_TYPE_OPTIONS: VisitTypeBucket[] = [
  "NEW_PATIENT",
  "RECALL",
  "FOLLOW_UP",
  "HYGIENE",
  "ANNUAL_WELLNESS",
  "OTHER",
];

/** Status drives the badge weight — upcoming stands out, terminal recedes. */
function statusBadgeVariant(
  status: string | null | undefined,
): "default" | "secondary" | "muted" | "destructive" {
  switch (status) {
    case "SCHEDULED":
      return "secondary";
    case "CONFIRMED":
      return "default";
    case "NO_SHOW":
      return "destructive";
    default:
      return "muted";
  }
}

function contactName(c: ContactDTO | undefined): string | undefined {
  if (!c) return undefined;
  return (
    c.displayName?.trim() ||
    `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() ||
    c.emails?.[0] ||
    undefined
  );
}

function NewAppointmentDialog({ contacts }: { contacts: ContactDTO[] }) {
  const qc = useQueryClient();
  const api = useFrontDeskApi();
  const [open, setOpen] = useState(false);
  const [contactId, setContactId] = useState("");
  const [visitTypeBucket, setVisitTypeBucket] = useState<string>("NEW_PATIENT");
  const [scheduledStartLocal, setScheduledStartLocal] = useState("");
  const [insurancePending, setInsurancePending] = useState<string>("no");

  function reset() {
    setContactId("");
    setVisitTypeBucket("NEW_PATIENT");
    setScheduledStartLocal("");
    setInsurancePending("no");
  }

  const create = useMutation({
    mutationFn: () => {
      const body: Appointment = {
        contactId: contactId || undefined,
        visitTypeBucket: visitTypeBucket as VisitTypeBucket,
        // datetime-local has no zone; treat it as the operator's local time.
        scheduledStart: scheduledStartLocal
          ? new Date(scheduledStartLocal).toISOString()
          : undefined,
        insuranceVerificationPending: insurancePending === "yes",
        status: "SCHEDULED",
      };
      return api.createAppointment(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: APPOINTMENTS_KEY });
      qc.invalidateQueries({ queryKey: RISK_APPOINTMENTS_KEY });
      setOpen(false);
      reset();
      toast.success("Appointment added.");
    },
    onError: (e) =>
      toast.error(
        e instanceof Error ? e.message : "Couldn't add the appointment.",
      ),
  });

  const canSubmit = scheduledStartLocal.length > 0 && !create.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button data-testid="appointment-new-open">
          <CalendarPlus className="size-4" />
          New appointment
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="appointment-new-dialog">
        <DialogHeader>
          <DialogTitle>New appointment</DialogTitle>
          <DialogDescription>
            Add an appointment to the schedule. We only ever track scheduling
            logistics — never anything clinical.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="appointment-contact">Patient</Label>
            <Select
              value={contactId}
              onValueChange={setContactId}
              disabled={create.isPending}
            >
              <SelectTrigger
                id="appointment-contact"
                data-testid="appointment-new-contact"
              >
                <SelectValue placeholder="Choose a patient (optional)" />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id!}>
                    {contactName(c) ?? "Unnamed contact"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appointment-visit-type">Visit type</Label>
              <Select
                value={visitTypeBucket}
                onValueChange={setVisitTypeBucket}
                disabled={create.isPending}
              >
                <SelectTrigger
                  id="appointment-visit-type"
                  data-testid="appointment-new-visit-type"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISIT_TYPE_OPTIONS.map((v) => (
                    <SelectItem key={v} value={v}>
                      {labelFor(VISIT_TYPE_BUCKET_LABELS, v)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appointment-insurance">Insurance verified?</Label>
              <Select
                value={insurancePending}
                onValueChange={setInsurancePending}
                disabled={create.isPending}
              >
                <SelectTrigger
                  id="appointment-insurance"
                  data-testid="appointment-new-insurance"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">Verified</SelectItem>
                  <SelectItem value="yes">Still pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="appointment-start">Start time</Label>
            <Input
              id="appointment-start"
              type="datetime-local"
              value={scheduledStartLocal}
              onChange={(e) => setScheduledStartLocal(e.target.value)}
              disabled={create.isPending}
              data-testid="appointment-new-start"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={create.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => create.mutate()}
            disabled={!canSubmit}
            data-testid="appointment-new-submit"
          >
            {create.isPending ? "Adding…" : "Add appointment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AppointmentRow({
  appt,
  contactsById,
}: {
  appt: Appointment;
  contactsById: Map<string, ContactDTO>;
}) {
  const who =
    contactName(appt.contactId ? contactsById.get(appt.contactId) : undefined) ??
    "A patient";
  return (
    <Card data-testid="appointment-card" data-status={appt.status ?? ""}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle
            className="flex items-center gap-2 text-base"
            data-testid="appointment-card-patient"
          >
            <UserRound className="size-4 text-muted-foreground" />
            {who}
          </CardTitle>
          <Badge
            variant={statusBadgeVariant(appt.status)}
            data-testid="appointment-card-status"
          >
            {labelFor(APPOINTMENT_STATUS_LABELS, appt.status, "Scheduled")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5" data-testid="appointment-card-when">
          <CalendarClock className="size-4" />
          {appt.scheduledStart
            ? new Date(appt.scheduledStart).toLocaleString()
            : "Time TBD"}
        </span>
        <Badge variant="outline" data-testid="appointment-card-visit-type">
          {labelFor(VISIT_TYPE_BUCKET_LABELS, appt.visitTypeBucket, "Visit")}
        </Badge>
        {appt.insuranceVerificationPending ? (
          <Badge variant="muted" className="gap-1" data-testid="appointment-card-insurance">
            <ShieldCheck className="size-3" />
            Insurance pending
          </Badge>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * FrontDesk IQ (FD-5b) — the appointment console. Lists every appointment and
 * lets a staffer add one (to seed the demo / day view). Every field is
 * scheduling logistics (patient, visit-type bucket, start, insurance-pending) —
 * there is no clinical field to enter, by construction.
 */
export function AppointmentConsole() {
  const api = useFrontDeskApi();
  const contactsApi = useContactsApi();

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: APPOINTMENTS_KEY,
    queryFn: api.listAppointments,
  });

  const { data: contacts } = useQuery({
    queryKey: ["contacts"],
    queryFn: contactsApi.listContacts,
  });
  const contactsById = useMemo(() => {
    const m = new Map<string, ContactDTO>();
    for (const c of contacts ?? []) if (c.id) m.set(c.id, c);
    return m;
  }, [contacts]);

  return (
    <section className="flex flex-col gap-4" data-testid="appointment-console-page">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2 text-2xl font-medium">
            <CalendarClock className="size-6 text-muted-foreground" />
            Appointments
          </h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Your full schedule. Add an appointment here — it'll get a no-show
            risk score and show up on tomorrow's risk view.
          </p>
        </div>
        <NewAppointmentDialog contacts={contacts ?? []} />
      </header>

      {isLoading ? (
        <p
          className="text-sm text-muted-foreground"
          data-testid="appointment-loading"
        >
          Loading…
        </p>
      ) : isError ? (
        <div
          className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
          data-testid="appointment-error"
        >
          <p className="text-sm text-foreground">
            We couldn't load your appointments.
            {error instanceof Error ? ` ${error.message}` : ""}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            data-testid="appointment-retry"
          >
            {isRefetching ? "Retrying…" : "Try again"}
          </Button>
        </div>
      ) : !data || data.length === 0 ? (
        <div
          className="rounded-md border border-dashed p-8 text-center"
          data-testid="appointment-empty"
        >
          <p className="text-sm text-muted-foreground">
            No appointments yet. Add your first one to get started.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3" data-testid="appointment-list">
          {data.map((a) => (
            <AppointmentRow key={a.id} appt={a} contactsById={contactsById} />
          ))}
        </div>
      )}
    </section>
  );
}
