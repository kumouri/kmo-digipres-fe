import { useEffect, useState } from "react";

import {
  bookSlot,
  fetchBookingView,
  PublicBookingError,
} from "../api/public-booking";
import { Button } from "../primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../primitives/card";
import { Input } from "../primitives/input";
import { Label } from "../primitives/label";
import { Skeleton } from "../primitives/skeleton";
import { Textarea } from "../primitives/textarea";
import { cn } from "../primitives/utils";
import type { BookedMeeting, BookingPublicView } from "../types/api";

export interface BookingWidgetProps {
  /** Backend base URL (e.g. `https://api.example.com/api`). */
  apiBaseUrl: string;
  /** Public booking link slug; matches the `slug` of a `BookingLink`. */
  slug: string;
  /** How many days forward to fetch slots; defaults to 14. */
  windowDays?: number;
  /** Optional callback fired with the created meeting after a successful book. */
  onBooked?: (meeting: BookedMeeting) => void;
  className?: string;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; view: BookingPublicView };

interface AttendeeForm {
  attendeeName: string;
  attendeeEmail: string;
  notes: string;
}

const EMPTY_FORM: AttendeeForm = {
  attendeeName: "",
  attendeeEmail: "",
  notes: "",
};

export function BookingWidget({
  apiBaseUrl,
  slug,
  windowDays = 14,
  onBooked,
  className,
}: BookingWidgetProps) {
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [form, setForm] = useState<AttendeeForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<BookedMeeting | null>(null);

  useEffect(() => {
    let cancelled = false;
    const from = new Date();
    const to = new Date(from.getTime() + windowDays * 86_400_000);
    setLoad({ kind: "loading" });
    fetchBookingView(apiBaseUrl, slug, from, to)
      .then((view) => {
        if (!cancelled) setLoad({ kind: "ready", view });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof PublicBookingError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to load booking link.";
        setLoad({ kind: "error", message });
      });
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, slug, windowDays]);

  function reset() {
    setSelectedSlot(null);
    setForm(EMPTY_FORM);
    setSubmitError(null);
    setSuccess(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedSlot) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const meeting = await bookSlot(apiBaseUrl, slug, {
        slotStart: selectedSlot,
        attendeeName: form.attendeeName.trim(),
        attendeeEmail: form.attendeeEmail.trim(),
        notes: form.notes.trim() || undefined,
      });
      setSuccess(meeting);
      onBooked?.(meeting);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Booking failed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (load.kind === "loading") {
    return (
      <Card className={className} data-testid="booking-widget-loading">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (load.kind === "error") {
    return (
      <Card className={className} data-testid="booking-widget-error">
        <CardHeader>
          <CardTitle>Couldn't load this booking link</CardTitle>
          <CardDescription>{load.message}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { view } = load;

  if (success) {
    return (
      <Card className={className} data-testid="booking-widget-success">
        <CardHeader>
          <CardTitle>You're booked.</CardTitle>
          <CardDescription>
            We sent a confirmation to {form.attendeeEmail}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">When</dt>
            <dd>{new Date(success.start).toLocaleString()}</dd>
            <dt className="text-muted-foreground">Duration</dt>
            <dd>{view.durationMinutes} minutes</dd>
            {success.location ? (
              <>
                <dt className="text-muted-foreground">Where</dt>
                <dd>{success.location}</dd>
              </>
            ) : null}
          </dl>
          <Button variant="outline" onClick={reset} data-testid="book-another">
            Book another
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className} data-testid="booking-widget">
      <CardHeader>
        <CardTitle>{view.title}</CardTitle>
        {view.description ? (
          <CardDescription>{view.description}</CardDescription>
        ) : null}
        <CardDescription>
          {view.durationMinutes} min · {view.timezone}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {selectedSlot ? (
          <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <span className="text-muted-foreground">Selected:</span>{" "}
              <span className="font-medium" data-testid="selected-slot-label">
                {new Date(selectedSlot).toLocaleString()}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-2 h-7 px-2 text-xs"
                onClick={() => setSelectedSlot(null)}
              >
                Change
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="booking-name">Your name</Label>
              <Input
                id="booking-name"
                required
                value={form.attendeeName}
                onChange={(e) =>
                  setForm((s) => ({ ...s, attendeeName: e.target.value }))
                }
                data-testid="booking-name-input"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="booking-email">Email</Label>
              <Input
                id="booking-email"
                type="email"
                required
                value={form.attendeeEmail}
                onChange={(e) =>
                  setForm((s) => ({ ...s, attendeeEmail: e.target.value }))
                }
                data-testid="booking-email-input"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="booking-notes">Notes (optional)</Label>
              <Textarea
                id="booking-notes"
                rows={3}
                value={form.notes}
                onChange={(e) =>
                  setForm((s) => ({ ...s, notes: e.target.value }))
                }
              />
            </div>
            {submitError ? (
              <p className="text-xs text-destructive">{submitError}</p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedSlot(null)}
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={
                  submitting ||
                  !form.attendeeName.trim() ||
                  !form.attendeeEmail.trim()
                }
                data-testid="confirm-booking"
              >
                {submitting ? "Booking…" : "Confirm booking"}
              </Button>
            </div>
          </form>
        ) : view.availableSlots.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No slots available in the next {windowDays} days.
          </p>
        ) : (
          <div
            className="grid grid-cols-2 gap-2 sm:grid-cols-3"
            data-testid="slot-grid"
          >
            {view.availableSlots.map((iso) => (
              <Button
                key={iso}
                variant="outline"
                className={cn(
                  "h-auto flex-col items-start gap-0.5 py-2",
                  "text-left",
                )}
                onClick={() => setSelectedSlot(iso)}
                data-testid="slot-button"
              >
                <span className="text-xs text-muted-foreground">
                  {new Date(iso).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span className="font-medium">
                  {new Date(iso).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
