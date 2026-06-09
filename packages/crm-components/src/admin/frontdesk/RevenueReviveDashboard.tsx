import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarCheck,
  HeartPulse,
  MessageSquareReply,
  Send,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";

import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../primitives/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../primitives/select";
import { useFrontDeskNurtureApi } from "../../hooks/useFrontDeskNurtureApi";
import type {
  FdDormancyBucket,
  FdNurtureCampaign,
  FdNurtureCampaignAnalytics,
  FdNurtureSegmentCounts,
  FdSegmentationResult,
} from "../../api/frontdesk-nurture";
import { FD_DORMANCY_BUCKETS } from "../../api/frontdesk-nurture";
import { DORMANCY_BUCKET_LABELS, labelFor } from "../labels";
import { ApiError } from "../../api/client";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const FD_NURTURE_CAMPAIGNS_KEY = ["frontdesk", "nurture", "campaigns"] as const;
const analyticsKey = (campaignId: string) =>
  ["frontdesk", "nurture", "analytics", campaignId] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Open-ended max reads as a "+"; otherwise the day window is min–max. */
function segmentWindowLabel(
  campaign: FdNurtureCampaign | undefined,
  bucket: FdDormancyBucket,
): string | undefined {
  const seg = campaign?.segments?.find((s) => s.bucket === bucket);
  if (!seg) return undefined;
  if (seg.maxDaysSinceLastActivity == null) {
    return `${seg.minDaysSinceLastActivity}+ days since last visit`;
  }
  return `${seg.minDaysSinceLastActivity}–${seg.maxDaysSinceLastActivity} days since last visit`;
}

/** In-flight = still being reached (enrolled + active); the rest are outcomes. */
function inFlight(counts: FdNurtureSegmentCounts): number {
  return counts.enrolled + counts.active;
}

// ---------------------------------------------------------------------------
// Headline KPI cards — campaign-wide funnel
// ---------------------------------------------------------------------------

function FunnelStat({
  icon: Icon,
  label,
  value,
  testid,
  highlight,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  testid: string;
  highlight?: boolean;
}) {
  return (
    <Card
      data-testid={testid}
      className={highlight && value > 0 ? "border-primary/40" : undefined}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon className="size-4" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className="text-2xl font-semibold tabular-nums"
          data-testid={`${testid}-value`}
        >
          {value.toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Per-segment funnel row
// ---------------------------------------------------------------------------

function SegmentRow({
  bucket,
  counts,
  window,
}: {
  bucket: FdDormancyBucket;
  counts: FdNurtureSegmentCounts | undefined;
  window: string | undefined;
}) {
  const c: FdNurtureSegmentCounts = counts ?? {
    total: 0,
    enrolled: 0,
    active: 0,
    replied: 0,
    booked: 0,
    optedOut: 0,
    completed: 0,
    exited: 0,
  };
  const empty = c.total === 0;

  return (
    <Card data-testid="fd-nurture-segment-row" data-bucket={bucket}>
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span
              className="flex items-center gap-2 text-sm font-medium"
              data-testid="fd-nurture-segment-label"
            >
              <Badge variant="outline">{bucket}</Badge>
              {labelFor(DORMANCY_BUCKET_LABELS, bucket)}
            </span>
            {window ? (
              <span className="text-xs text-muted-foreground">{window}</span>
            ) : null}
          </div>
          {empty ? (
            <Badge variant="muted" data-testid="fd-nurture-segment-enrolled">
              No one enrolled yet
            </Badge>
          ) : (
            <Badge variant="secondary" data-testid="fd-nurture-segment-enrolled">
              {c.total} enrolled
            </Badge>
          )}
        </div>

        {/* The per-segment funnel: in-flight → replied → booked. */}
        <div
          className="grid grid-cols-3 gap-2 sm:grid-cols-5"
          data-testid="fd-nurture-segment-funnel"
        >
          <FunnelCell label="Being reached" value={inFlight(c)} testid="fd-seg-active" />
          <FunnelCell label="Replied" value={c.replied} testid="fd-seg-replied" />
          <FunnelCell
            label="Booked"
            value={c.booked}
            testid="fd-seg-booked"
            highlight
          />
          <FunnelCell label="Opted out" value={c.optedOut} testid="fd-seg-opted-out" muted />
          <FunnelCell label="Ran its course" value={c.completed} testid="fd-seg-completed" muted />
        </div>
      </CardContent>
    </Card>
  );
}

function FunnelCell({
  label,
  value,
  testid,
  highlight,
  muted,
}: {
  label: string;
  value: number;
  testid: string;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={
        "flex flex-col gap-0.5 rounded-md border p-2 " +
        (highlight && value > 0
          ? "border-primary/40 bg-primary/5"
          : muted
            ? "border-dashed"
            : "")
      }
      data-testid={testid}
    >
      <span className="text-lg font-semibold tabular-nums" data-testid={`${testid}-value`}>
        {value.toLocaleString()}
      </span>
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Segment-and-enroll result banner
// ---------------------------------------------------------------------------

function EnrollResultBanner({ result }: { result: FdSegmentationResult }) {
  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-primary/40 bg-primary/5 p-3 text-sm"
      data-testid="fd-nurture-enroll-result"
    >
      <span className="flex items-center gap-1.5 font-medium">
        <Sparkles className="size-4 text-primary" />
        {result.enrolled > 0
          ? `Enrolled ${result.enrolled} newly-lapsed ${
              result.enrolled === 1 ? "patient" : "patients"
            }.`
          : "No new patients to enroll right now — everyone matching is already in the campaign."}
      </span>
      <span className="text-muted-foreground" data-testid="fd-nurture-enroll-detail">
        Looked at {result.evaluated.toLocaleString()} contacts ·{" "}
        {result.matched.toLocaleString()} matched a segment ·{" "}
        {result.alreadyEnrolled.toLocaleString()} already enrolled ·{" "}
        {result.skippedOptedOut.toLocaleString()} skipped (opted out)
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

/**
 * Health "RevenueRevive" (T2) — the dormant-patient reactivation funnel
 * dashboard. Pick a reactivation campaign, trigger segment-and-enroll, then
 * watch the per-segment funnel fill as cadences fire and replies turn into
 * booked appointments. The headline cards are the campaign-wide funnel; each
 * segment (dormancy tier A–D) gets its own enrolled → being-reached → replied
 * → booked row.
 *
 * PHI-free by design: segments are built on logistics signals (days since last
 * visit, visit frequency) — no clinical data, no diagnoses, no procedures.
 *
 * Campaign authoring (the day-windows + cadence steps) lives on the shared
 * nurture surface — out of scope here; this dashboard is read + the one trigger.
 */
export function RevenueReviveDashboard() {
  const api = useFrontDeskNurtureApi();
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState<string>("");
  const [enrollResult, setEnrollResult] = useState<FdSegmentationResult | null>(null);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  // The tenant's nurture campaigns (the picker).
  const {
    data: campaigns,
    isLoading: campaignsLoading,
    isError: campaignsError,
    error: campaignsErr,
    refetch: refetchCampaigns,
    isRefetching: campaignsRefetching,
  } = useQuery({
    queryKey: FD_NURTURE_CAMPAIGNS_KEY,
    queryFn: () => api.listCampaigns(),
  });

  // Default to the first campaign once they load.
  useEffect(() => {
    if (!selectedId && campaigns && campaigns.length > 0) {
      setSelectedId(campaigns[0].id);
    }
  }, [campaigns, selectedId]);

  const selectedCampaign = useMemo(
    () => (campaigns ?? []).find((c) => c.id === selectedId),
    [campaigns, selectedId],
  );

  // The funnel for the selected campaign.
  const {
    data: analytics,
    isLoading: analyticsLoading,
    isError: analyticsIsError,
    error: analyticsError,
    refetch: refetchAnalytics,
    isRefetching: analyticsRefetching,
  } = useQuery({
    queryKey: analyticsKey(selectedId),
    queryFn: () => api.getAnalytics(selectedId),
    enabled: !!selectedId,
  });

  const { mutate: runSegment, isPending: enrolling } = useMutation({
    mutationFn: () => api.segmentAndEnroll(selectedId),
    onSuccess: (result) => {
      setEnrollResult(result);
      setEnrollError(null);
      // Refresh the funnel — fresh enrollments land in the in-flight columns.
      queryClient.invalidateQueries({ queryKey: analyticsKey(selectedId) });
    },
    onError: (err) => {
      setEnrollResult(null);
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setEnrollError(
            "This campaign is paused, so no one can be enrolled. Reactivate it first.",
          );
        } else if (err.status === 400) {
          setEnrollError(
            "This campaign has no dormancy segments defined yet — add them before enrolling.",
          );
        } else if (err.status === 404) {
          setEnrollError("That campaign couldn't be found.");
        } else {
          setEnrollError(`Something went wrong (${err.status}).`);
        }
      } else {
        setEnrollError("Couldn't run the enrollment — please try again.");
      }
    },
  });

  // Reset the per-run banner when the user switches campaigns.
  function selectCampaign(id: string) {
    setSelectedId(id);
    setEnrollResult(null);
    setEnrollError(null);
  }

  return (
    <section className="flex flex-col gap-6" data-testid="fd-nurture-dashboard-page">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2 text-2xl font-medium">
            <HeartPulse className="size-6 text-muted-foreground" />
            Revenue revive
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Your lapsed patients are an asset. Pick a reactivation campaign, enroll
            the contacts who've gone quiet, and watch the funnel turn cold outreach
            into booked appointments.
          </p>
        </div>
        {analytics && analytics.booked > 0 ? (
          <Badge variant="default" data-testid="fd-nurture-booked-headline">
            <CalendarCheck className="size-3" />
            {analytics.booked} {analytics.booked === 1 ? "appointment" : "appointments"} booked
          </Badge>
        ) : null}
      </header>

      {/* Campaign picker + segment-and-enroll trigger */}
      {campaignsLoading ? (
        <p className="text-sm text-muted-foreground" data-testid="fd-nurture-campaigns-loading">
          Loading…
        </p>
      ) : campaignsError ? (
        <div
          className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
          data-testid="fd-nurture-campaigns-error"
        >
          <p className="text-sm text-foreground">
            We couldn't load your reactivation campaigns.
            {campaignsErr instanceof Error ? ` ${campaignsErr.message}` : ""}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchCampaigns()}
            disabled={campaignsRefetching}
            data-testid="fd-nurture-campaigns-retry"
          >
            {campaignsRefetching ? "Retrying…" : "Try again"}
          </Button>
        </div>
      ) : !campaigns || campaigns.length === 0 ? (
        <div
          className="rounded-md border border-dashed p-8 text-center"
          data-testid="fd-nurture-campaigns-empty"
        >
          <p className="text-sm text-muted-foreground">
            No reactivation campaigns yet. Once one is set up, it'll show here and
            you can start enrolling lapsed patients.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-end justify-between gap-3" data-testid="fd-nurture-controls">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="fd-nurture-campaign-select"
              className="text-sm text-muted-foreground"
            >
              Reactivation campaign
            </label>
            <Select value={selectedId} onValueChange={selectCampaign}>
              <SelectTrigger
                id="fd-nurture-campaign-select"
                className="min-w-[18rem] max-w-md"
                data-testid="fd-nurture-campaign-select"
              >
                <SelectValue placeholder="Choose a campaign…" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((c) => (
                  <SelectItem
                    key={c.id}
                    value={c.id}
                    data-testid="fd-nurture-campaign-option"
                  >
                    {c.name}
                    {!c.active ? " (paused)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => runSegment()}
            disabled={!selectedId || enrolling}
            data-testid="fd-nurture-segment-enroll-btn"
          >
            <UserPlus className="size-4" />
            {enrolling ? "Enrolling…" : "Segment & enroll lapsed patients"}
          </Button>
        </div>
      )}

      {/* Segment-and-enroll outcome */}
      {enrollError ? (
        <p className="text-sm text-destructive" data-testid="fd-nurture-enroll-error">
          {enrollError}
        </p>
      ) : null}
      {enrollResult ? <EnrollResultBanner result={enrollResult} /> : null}

      {/* The funnel for the selected campaign */}
      {selectedId ? (
        analyticsLoading ? (
          <p className="text-sm text-muted-foreground" data-testid="fd-nurture-analytics-loading">
            Loading the funnel…
          </p>
        ) : analyticsIsError ? (
          <div
            className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
            data-testid="fd-nurture-analytics-error"
          >
            <p className="text-sm text-foreground">
              We couldn't load this campaign's funnel.
              {analyticsError instanceof Error ? ` ${analyticsError.message}` : ""}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchAnalytics()}
              disabled={analyticsRefetching}
              data-testid="fd-nurture-analytics-retry"
            >
              {analyticsRefetching ? "Retrying…" : "Try again"}
            </Button>
          </div>
        ) : analytics ? (
          <Funnel analytics={analytics} campaign={selectedCampaign} />
        ) : null
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// The funnel body (headline cards + per-segment rows + reply→booking view)
// ---------------------------------------------------------------------------

function Funnel({
  analytics,
  campaign,
}: {
  analytics: FdNurtureCampaignAnalytics;
  campaign: FdNurtureCampaign | undefined;
}) {
  const reactivated = analytics.replied + analytics.booked;

  return (
    <div className="flex flex-col gap-6" data-testid="fd-nurture-funnel">
      {/* Campaign-wide headline funnel */}
      <div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        data-testid="fd-nurture-headline"
      >
        <FunnelStat
          icon={Users}
          label="Enrolled"
          value={analytics.total}
          testid="fd-nurture-stat-enrolled"
        />
        <FunnelStat
          icon={Send}
          label="Touches sent"
          value={analytics.sent}
          testid="fd-nurture-stat-sent"
        />
        <FunnelStat
          icon={MessageSquareReply}
          label="Replied"
          value={analytics.replied}
          testid="fd-nurture-stat-replied"
          highlight
        />
        <FunnelStat
          icon={CalendarCheck}
          label="Appointments booked"
          value={analytics.booked}
          testid="fd-nurture-stat-booked"
          highlight
        />
        <FunnelStat
          icon={Sparkles}
          label="Re-engaged"
          value={reactivated}
          testid="fd-nurture-stat-reengaged"
          highlight
        />
      </div>

      {/* Reply → booking outcome view */}
      <Card data-testid="fd-nurture-reply-booking">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CalendarCheck className="size-4" />
            From reply to booked appointment
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reactivated === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="fd-nurture-reply-booking-empty">
              No replies yet. As lapsed patients respond to a nudge, they show up
              here — and a positive reply books an appointment automatically.
            </p>
          ) : (
            <p className="text-sm" data-testid="fd-nurture-reply-booking-summary">
              <span className="font-medium">{analytics.replied}</span>{" "}
              {analytics.replied === 1 ? "patient has" : "patients have"} replied, and{" "}
              <span className="font-medium">{analytics.booked}</span>{" "}
              {analytics.booked === 1 ? "has" : "have"} gone on to book an appointment —
              revenue you'd otherwise have left on the table.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Per-segment funnel rows (dormancy tiers A–D) */}
      <div className="flex flex-col gap-3" data-testid="fd-nurture-segments">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          By dormancy segment
        </h2>
        {FD_DORMANCY_BUCKETS.map((bucket) => (
          <SegmentRow
            key={bucket}
            bucket={bucket}
            counts={analytics.perBucket[bucket]}
            window={segmentWindowLabel(campaign, bucket)}
          />
        ))}
      </div>
    </div>
  );
}
