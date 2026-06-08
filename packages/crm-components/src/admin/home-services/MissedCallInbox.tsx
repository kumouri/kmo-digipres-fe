import { useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarClock,
  Camera,
  PhoneMissed,
  Wrench,
  X,
} from "lucide-react";

import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import {
  Card,
  CardContent,
  CardFooter,
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
} from "../../primitives/dialog";
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
} from "../../primitives/alert-dialog";
import { Input } from "../../primitives/input";
import { Label } from "../../primitives/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../primitives/select";
import { useHomeServicesApi } from "../../hooks/useHomeServicesApi";
import { useTeamApi } from "../../hooks/useTeamApi";
import type { MissedCallInboxItem, TeamMember } from "../../types/api";
import {
  JOB_VALUE_BAND_LABELS,
  TRADE_LABELS,
  URGENCY_LABELS,
  labelFor,
} from "../labels";

const INBOX_KEY = ["missed-call-inbox"] as const;

/** Urgency drives the card's visual weight — an emergency should read red. */
function urgencyBadgeVariant(
  urgency: string | null | undefined,
): "destructive" | "default" | "secondary" | "muted" {
  switch (urgency) {
    case "EMERGENCY":
      return "destructive";
    case "URGENT":
      return "default";
    case "ROUTINE":
      return "secondary";
    default:
      return "muted";
  }
}

/**
 * Pull the human-readable lines out of the BE's `notes` blob. The BE stamps
 * "Symptom: …", "Service address: …", an optional "Equipment …:" line (HS-2's
 * MMS nameplate read), then a "Transcript:" block — we surface each as a
 * labelled field and keep the transcript separate. Falls back gracefully when
 * the shape differs (a lead is never hidden).
 */
function parseNotes(notes: string | null | undefined): {
  symptom?: string;
  address?: string;
  equipment?: string;
  transcript?: string;
} {
  if (!notes) return {};
  const [head, ...rest] = notes.split(/\n\nTranscript:\n/);
  const transcript = rest.length > 0 ? rest.join("\n\nTranscript:\n").trim() : undefined;
  let symptom: string | undefined;
  let address: string | undefined;
  let equipment: string | undefined;
  for (const line of head.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("Symptom:")) {
      symptom = trimmed.slice("Symptom:".length).trim();
    } else if (trimmed.startsWith("Service address:")) {
      address = trimmed.slice("Service address:".length).trim();
    } else if (trimmed.startsWith("Equipment")) {
      // "Equipment (from photo): …" — strip everything up to the first colon.
      const colon = trimmed.indexOf(":");
      equipment = colon >= 0 ? trimmed.slice(colon + 1).trim() : trimmed;
    }
  }
  return { symptom, address, equipment, transcript };
}

function technicianName(m: TeamMember): string {
  return m.displayName?.trim() || m.email?.trim() || "Unnamed teammate";
}

// ---------------------------------------------------------------------------
// Schedule dialog — assign a technician + a start time, promoting the DRAFT
// onto the dated dispatch board.
// ---------------------------------------------------------------------------

function ScheduleDialog({
  item,
  technicians,
  techniciansLoading,
  open,
  onOpenChange,
}: {
  item: MissedCallInboxItem;
  technicians: TeamMember[];
  techniciansLoading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const api = useHomeServicesApi();
  const [technicianUserId, setTechnicianUserId] = useState("");
  const [scheduledStartLocal, setScheduledStartLocal] = useState("");

  const schedule = useMutation({
    mutationFn: () =>
      api.scheduleWorkOrder(item.id, {
        // datetime-local has no zone; treat it as the operator's local time and
        // hand the BE a full ISO instant.
        scheduledStart: new Date(scheduledStartLocal).toISOString(),
        technicianUserId,
      }),
    onSuccess: () => {
      // Drop the card immediately, then reconcile with the server.
      qc.setQueryData<MissedCallInboxItem[]>(INBOX_KEY, (prev) =>
        prev ? prev.filter((i) => i.id !== item.id) : prev,
      );
      qc.invalidateQueries({ queryKey: INBOX_KEY });
      onOpenChange(false);
      toast.success("Job scheduled — it's on the dispatch board now.");
    },
    onError: (e) =>
      toast.error(
        e instanceof Error ? e.message : "Couldn't schedule this job.",
      ),
  });

  const canSubmit =
    technicianUserId.length > 0 &&
    scheduledStartLocal.length > 0 &&
    !schedule.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="schedule-dialog">
        <DialogHeader>
          <DialogTitle>Schedule this visit</DialogTitle>
          <DialogDescription>
            Pick who's going and when. This moves the job onto the dispatch
            board and clears it from your inbox.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`tech-${item.id}`}>Technician</Label>
            <Select
              value={technicianUserId}
              onValueChange={setTechnicianUserId}
              disabled={techniciansLoading || schedule.isPending}
            >
              <SelectTrigger id={`tech-${item.id}`} data-testid="schedule-technician">
                <SelectValue
                  placeholder={
                    techniciansLoading ? "Loading team…" : "Choose a technician"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {technicians.map((m) => (
                  <SelectItem key={m.id} value={m.id!}>
                    {technicianName(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`start-${item.id}`}>Start time</Label>
            <Input
              id={`start-${item.id}`}
              type="datetime-local"
              value={scheduledStartLocal}
              onChange={(e) => setScheduledStartLocal(e.target.value)}
              disabled={schedule.isPending}
              data-testid="schedule-start"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={schedule.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => schedule.mutate()}
            disabled={!canSubmit}
            data-testid="schedule-confirm"
          >
            <CalendarClock className="size-4" />
            {schedule.isPending ? "Scheduling…" : "Schedule visit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Inbox card
// ---------------------------------------------------------------------------

function MissedCallCard({
  item,
  technicians,
  techniciansLoading,
}: {
  item: MissedCallInboxItem;
  technicians: TeamMember[];
  techniciansLoading: boolean;
}) {
  const qc = useQueryClient();
  const api = useHomeServicesApi();
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const { symptom, address, equipment, transcript } = useMemo(
    () => parseNotes(item.notes),
    [item.notes],
  );

  const dismiss = useMutation({
    mutationFn: () => api.dismissWorkOrder(item.id),
    onSuccess: () => {
      qc.setQueryData<MissedCallInboxItem[]>(INBOX_KEY, (prev) =>
        prev ? prev.filter((i) => i.id !== item.id) : prev,
      );
      qc.invalidateQueries({ queryKey: INBOX_KEY });
      toast.success("Cleared from your inbox.");
    },
    onError: (e) =>
      toast.error(
        e instanceof Error ? e.message : "Couldn't dismiss this lead.",
      ),
  });

  const isEmergency = item.urgency === "EMERGENCY";

  return (
    <Card
      data-testid="missed-call-card"
      data-urgency={item.urgency ?? "UNTRIAGED"}
      className={isEmergency ? "border-destructive/50" : undefined}
    >
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="size-4 text-muted-foreground" />
              <span data-testid="missed-call-trade">
                {labelFor(TRADE_LABELS, item.trade, "Unsorted")}
              </span>
            </CardTitle>
            {item.workOrderNumber ? (
              <span className="text-xs text-muted-foreground">
                Job #{item.workOrderNumber}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={urgencyBadgeVariant(item.urgency)}
              data-testid="missed-call-urgency"
            >
              {labelFor(URGENCY_LABELS, item.urgency, "Needs triage")}
            </Badge>
            {item.jobValueBand ? (
              <Badge variant="muted" data-testid="missed-call-value">
                {labelFor(JOB_VALUE_BAND_LABELS, item.jobValueBand)}
              </Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {symptom ? (
          <p className="text-sm text-foreground" data-testid="missed-call-symptom">
            {symptom}
          </p>
        ) : (
          <p className="text-sm italic text-muted-foreground">
            No symptom captured — listen to the message below.
          </p>
        )}

        {address ? (
          <p className="text-sm text-muted-foreground" data-testid="missed-call-address">
            <span className="font-medium text-foreground">Address: </span>
            {address}
          </p>
        ) : null}

        {equipment ? (
          <p
            className="flex flex-wrap items-baseline gap-1.5 text-sm text-muted-foreground"
            data-testid="missed-call-equipment"
          >
            <Badge variant="outline" className="gap-1">
              <Camera className="size-3" />
              From photo
            </Badge>
            <span className="text-foreground">{equipment}</span>
          </p>
        ) : null}

        {transcript ? (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Voicemail transcript
            </span>
            <blockquote
              className="border-l-2 border-muted pl-3 text-sm text-foreground/90"
              data-testid="missed-call-transcript"
            >
              {transcript}
            </blockquote>
          </div>
        ) : null}

        {item.callSid ? (
          <span className="text-xs text-muted-foreground">
            From voicemail · {item.createdAt
              ? new Date(item.createdAt).toLocaleString()
              : "time unknown"}
          </span>
        ) : null}
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2">
        <Button
          onClick={() => setScheduleOpen(true)}
          disabled={dismiss.isPending}
          data-testid="missed-call-schedule"
        >
          <CalendarClock className="size-4" />
          Schedule
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              disabled={dismiss.isPending}
              data-testid="missed-call-dismiss"
            >
              <X className="size-4" />
              {dismiss.isPending ? "Dismissing…" : "Dismiss"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent data-testid="dismiss-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>Dismiss this lead?</AlertDialogTitle>
              <AlertDialogDescription>
                It'll drop off your inbox. Nothing is deleted — you can still
                find the job later if you change your mind.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep it</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => dismiss.mutate()}
                data-testid="dismiss-confirm"
              >
                Dismiss
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>

      <ScheduleDialog
        item={item}
        technicians={technicians}
        techniciansLoading={techniciansLoading}
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
      />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function MissedCallInbox() {
  const api = useHomeServicesApi();
  const teamApi = useTeamApi();

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: INBOX_KEY,
    queryFn: api.listMissedCallInbox,
  });

  // The Schedule dialog assigns a technician — reuse the team directory. Only
  // active teammates are offered (an invited/deactivated user can't take a job).
  const { data: team } = useQuery({
    queryKey: ["team"],
    queryFn: teamApi.listTeam,
  });
  const technicians = useMemo(
    () => (team ?? []).filter((m) => m.status !== "DISABLED"),
    [team],
  );
  const techniciansLoading = team === undefined;

  return (
    <section className="flex flex-col gap-4" data-testid="missed-call-inbox-page">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2 text-2xl font-medium">
            <PhoneMissed className="size-6 text-muted-foreground" />
            Missed-Call Inbox
          </h1>
          <p className="text-sm text-muted-foreground">
            Overnight voicemails, already triaged into ready-to-dispatch jobs.
            Schedule each one or clear it.
          </p>
        </div>
        {data && data.length > 0 ? (
          <Badge variant="secondary" data-testid="missed-call-count">
            {data.length} waiting
          </Badge>
        ) : null}
      </header>

      {isLoading ? (
        <p
          className="text-sm text-muted-foreground"
          data-testid="missed-call-loading"
        >
          Loading…
        </p>
      ) : isError ? (
        <div
          className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
          data-testid="missed-call-error"
        >
          <p className="text-sm text-foreground">
            We couldn't load your missed-call inbox.
            {error instanceof Error ? ` ${error.message}` : ""}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            data-testid="missed-call-retry"
          >
            {isRefetching ? "Retrying…" : "Try again"}
          </Button>
        </div>
      ) : !data || data.length === 0 ? (
        <div
          className="rounded-md border border-dashed p-8 text-center"
          data-testid="missed-call-empty"
        >
          <p className="text-sm text-muted-foreground">
            Inbox zero. New after-hours voicemails will land here as triaged
            jobs.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4" data-testid="missed-call-list">
          {data.map((item) => (
            <MissedCallCard
              key={item.id}
              item={item}
              technicians={technicians}
              techniciansLoading={techniciansLoading}
            />
          ))}
        </div>
      )}
    </section>
  );
}
