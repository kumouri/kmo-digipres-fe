import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pause, Play, Timer } from "lucide-react";

import { Button } from "../../primitives/button";
import { useContractorApi } from "../../hooks/useContractorApi";
import { useTimeExpensesApi } from "../../hooks/useTimeExpensesApi";
import type { TimeEntry } from "../../types/api";

interface Props {
  userId: string;
  /**
   * When true, the signed-in user is a scoped-down contractor: start/stop hit
   * /me/contractor/time/timer/* and the running-timer state is derived from the
   * contractor's own-time list (no dedicated /timer/running on that surface).
   * The staff /time-entries timer endpoints deny a CONTRACTOR token (4135).
   * Defaults to false (staff/admin — unchanged behavior).
   */
  isContractor?: boolean;
}

/** Format elapsed seconds as HH:MM:SS */
function fmtElapsed(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return [h, m, s]
    .map((v) => v.toString().padStart(2, "0"))
    .join(":");
}

/**
 * Global timer widget — mounts in the AppShell header next to AskAiDialog.
 * Shows live HH:MM:SS elapsed from startedAt via client setInterval.
 * NEVER persists the moving elapsed value — only startedAt is the source of truth.
 * Query key: ["timer","running"]. Stop invalidates ["timer","running"] + ["time-entries"].
 */
export function TimerWidget({ userId, isContractor = false }: Props) {
  const qc = useQueryClient();
  const staffApi = useTimeExpensesApi();
  const contractorApi = useContractorApi();
  const [elapsed, setElapsed] = useState(0);

  // Namespaced query keys so a contractor's derived running-timer never collides
  // with the staff poll, and start/stop invalidates the matching time family
  // (TimesheetPage reads ["contractor","time",…] vs ["time-entries",…]).
  const runningKey = isContractor
    ? ["contractor", "timer", "running"]
    : ["timer", "running"];
  const timeKey = isContractor ? ["contractor", "time"] : ["time-entries"];

  const { data: running, isLoading } = useQuery<TimeEntry | null>({
    queryKey: runningKey,
    queryFn: () =>
      isContractor ? contractorApi.getRunningTime() : staffApi.getRunningTimer(userId),
    refetchInterval: 30_000, // re-sync every 30s (not a tick — ticks are client-side)
    staleTime: 10_000,
  });

  // Client-side tick — compute elapsed from startedAt, never from a persisted value
  const computeElapsed = useCallback(() => {
    if (!running?.startedAt) return 0;
    return Math.floor(
      (Date.now() - new Date(running.startedAt).getTime()) / 1000,
    );
  }, [running?.startedAt]);

  useEffect(() => {
    if (!running) {
      setElapsed(0);
      return;
    }
    setElapsed(computeElapsed());
    const intervalId = setInterval(() => {
      setElapsed(computeElapsed());
    }, 1000);
    return () => clearInterval(intervalId);
  }, [running, computeElapsed]);

  const startMutation = useMutation({
    mutationFn: () => {
      const body: TimeEntry = {
        userId,
        startedAt: new Date().toISOString(),
        source: "TIMER",
        billable: true,
      };
      return isContractor
        ? contractorApi.startTimer(body)
        : staffApi.startTimer(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: runningKey });
      qc.invalidateQueries({ queryKey: timeKey });
      toast.success("Timer started.");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not start timer."),
  });

  const stopMutation = useMutation({
    mutationFn: () => {
      const endedAt = new Date().toISOString();
      const zoneId = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return isContractor
        ? contractorApi.stopTimer(endedAt, zoneId)
        : staffApi.stopTimer(userId, endedAt, zoneId);
    },
    onSuccess: (segments) => {
      qc.invalidateQueries({ queryKey: runningKey });
      qc.invalidateQueries({ queryKey: timeKey });
      if (segments.length > 1) {
        // Split across midnight — surface a note
        toast.success(
          `Timer stopped — session split across ${segments.length} days (midnight split).`,
          { duration: 8000 },
        );
      } else {
        toast.success("Timer stopped.");
      }
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not stop timer."),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground" data-testid="timer-widget-loading">
        <Timer className="size-3" />
        <span>…</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1" data-testid="timer-widget">
      {running ? (
        <>
          <Timer className="size-4 text-amber-500" />
          <span
            className="font-mono text-sm tabular-nums text-amber-600"
            data-testid="timer-elapsed"
            aria-live="polite"
          >
            {fmtElapsed(elapsed)}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => stopMutation.mutate()}
            disabled={stopMutation.isPending}
            data-testid="timer-stop"
            title="Stop timer"
          >
            <Pause className="size-3" />
          </Button>
        </>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => startMutation.mutate()}
          disabled={startMutation.isPending}
          data-testid="timer-start"
          title="Start timer"
        >
          <Play className="size-3" />
          <span className="text-xs">Timer</span>
        </Button>
      )}
    </div>
  );
}
