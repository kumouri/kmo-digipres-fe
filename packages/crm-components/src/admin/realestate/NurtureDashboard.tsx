import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarCheck,
  Database,
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
import { useRealEstateNurtureApi } from "../../hooks/useRealEstateNurtureApi";
import type {
  DormancyBucket,
  NurtureCampaign,
  NurtureCampaignAnalytics,
  NurtureSegmentCounts,
  SegmentationResult,
} from "../../api/realestate-nurture";
import { DORMANCY_BUCKETS } from "../../api/realestate-nurture";
import { DORMANCY_BUCKET_LABELS, labelFor } from "../labels";
import { ApiError } from "../../api/client";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const NURTURE_CAMPAIGNS_KEY = ["realestate", "nurture", "campaigns"] as const;
const analyticsKey = (campaignId: string) =>
  ["realestate", "nurture", "analytics", campaignId] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Open-ended max reads as a "+"; otherwise the day window is min–max. */
function segmentWindowLabel(
  campaign: NurtureCampaign | undefined,
  bucket: DormancyBucket,
): string | undefined {
  const seg = campaign?.segments?.find((s) => s.bucket === bucket);
  if (!seg) return undefined;
  if (seg.maxDaysSinceLastActivity == null) {
    return `${seg.minDaysSinceLastActivity}+ days dormant`;
  }
  return `${seg.minDaysSinceLastActivity}–${seg.maxDaysSinceLastActivity} days dormant`;
}

/** In-flight = still being worked (enrolled + active); the rest are outcomes. */
function inFlight(counts: NurtureSegmentCounts): number {
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
  bucket: DormancyBucket;
  counts: NurtureSegmentCounts | undefined;
  window: string | undefined;
}) {
  const c: NurtureSegmentCounts = counts ?? {
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
    <Card data-testid="nurture-segment-row" data-bucket={bucket}>
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span
              className="flex items-center gap-2 text-sm font-medium"
              data-testid="nurture-segment-label"
            >
              <Badge variant="outline">{bucket}</Badge>
              {labelFor(DORMANCY_BUCKET_LABELS, bucket)}
            </span>
            {window ? (
              <span className="text-xs text-muted-foreground">{window}</span>
            ) : null}
          </div>
          {empty ? (
            <Badge variant="muted" data-testid="nurture-segment-enrolled">
              No one enrolled yet
            </Badge>
          ) : (
            <Badge variant="secondary" data-testid="nurture-segment-enrolled">
              {c.total} enrolled
            </Badge>
          )}
        </div>

        {/* The per-segment funnel: in-flight → replied → booked. */}
        <div
          className="grid grid-cols-3 gap-2 sm:grid-cols-5"
          data-testid="nurture-segment-funnel"
        >
          <FunnelCell label="Being nudged" value={inFlight(c)} testid="seg-active" />
          <FunnelCell label="Replied" value={c.replied} testid="seg-replied" />
          <FunnelCell
            label="Booked"
            value={c.booked}
            testid="seg-booked"
            highlight
          />
          <FunnelCell label="Opted out" value={c.optedOut} testid="seg-opted-out" muted />
          <FunnelCell label="Ran its course" value={c.completed} testid="seg-completed" muted />
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

function EnrollResultBanner({ result }: { result: SegmentationResult }) {
  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-primary/40 bg-primary/5 p-3 text-sm"
      data-testid="nurture-enroll-result"
    >
      <span className="flex items-center gap-1.5 font-medium">
        <Sparkles className="size-4 text-primary" />
        {result.enrolled > 0
          ? `Enrolled ${result.enrolled} newly-dormant ${
              result.enrolled === 1 ? "lead" : "leads"
            }.`
          : "No new leads to enroll right now — everyone matching is already in the campaign."}
      </span>
      <span className="text-muted-foreground" data-testid="nurture-enroll-detail">
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
 * Real Estate "Database Goldmine" (T1) — the dormant-lead nurture funnel
 * dashboard. Pick a reactivation campaign, trigger segment-and-enroll, then
 * watch the per-segment funnel fill as cadences fire and replies turn into
 * booked showings. The headline cards are the campaign-wide funnel; each segment
 * (dormancy tier A–D) gets its own enrolled → nudged → replied → booked row.
 *
 * Campaign authoring (the day-windows + cadence steps) lives on the shared
 * nurture surface — out of scope here; this dashboard is read + the one trigger.
 */
export function NurtureDashboard() {
  const api = useRealEstateNurtureApi();
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState<string>("");
  const [enrollResult, setEnrollResult] = useState<SegmentationResult | null>(null);
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
    queryKey: NURTURE_CAMPAIGNS_KEY,
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

  // Reset the per-run banner when the agent switches campaigns.
  function selectCampaign(id: string) {
    setSelectedId(id);
    setEnrollResult(null);
    setEnrollError(null);
  }

  return (
    <section className="flex flex-col gap-6" data-testid="nurture-dashboard-page">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2 text-2xl font-medium">
            <Database className="size-6 text-muted-foreground" />
            Database goldmine
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Your past leads are an asset. Pick a reactivation campaign, enroll the
            contacts who've gone quiet, and watch the funnel turn cold leads into
            booked showings.
          </p>
        </div>
        {analytics && analytics.booked > 0 ? (
          <Badge variant="default" data-testid="nurture-booked-headline">
            <CalendarCheck className="size-3" />
            {analytics.booked} {analytics.booked === 1 ? "showing" : "showings"} booked
          </Badge>
        ) : null}
      </header>

      {/* Campaign picker + segment-and-enroll trigger */}
      {campaignsLoading ? (
        <p className="text-sm text-muted-foreground" data-testid="nurture-campaigns-loading">
          Loading…
        </p>
      ) : campaignsError ? (
        <div
          className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
          data-testid="nurture-campaigns-error"
        >
          <p className="text-sm text-foreground">
            We couldn't load your nurture campaigns.
            {campaignsErr instanceof Error ? ` ${campaignsErr.message}` : ""}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchCampaigns()}
            disabled={campaignsRefetching}
            data-testid="nurture-campaigns-retry"
          >
            {campaignsRefetching ? "Retrying…" : "Try again"}
          </Button>
        </div>
      ) : !campaigns || campaigns.length === 0 ? (
        <div
          className="rounded-md border border-dashed p-8 text-center"
          data-testid="nurture-campaigns-empty"
        >
          <p className="text-sm text-muted-foreground">
            No reactivation campaigns yet. Once one is set up, it'll show here and
            you can start enrolling dormant leads.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-end justify-between gap-3" data-testid="nurture-controls">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="nurture-campaign-select"
              className="text-sm text-muted-foreground"
            >
              Reactivation campaign
            </label>
            <Select value={selectedId} onValueChange={selectCampaign}>
              <SelectTrigger
                id="nurture-campaign-select"
                className="min-w-[18rem] max-w-md"
                data-testid="nurture-campaign-select"
              >
                <SelectValue placeholder="Choose a campaign…" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((c) => (
                  <SelectItem
                    key={c.id}
                    value={c.id}
                    data-testid="nurture-campaign-option"
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
            data-testid="nurture-segment-enroll-btn"
          >
            <UserPlus className="size-4" />
            {enrolling ? "Enrolling…" : "Segment & enroll dormant leads"}
          </Button>
        </div>
      )}

      {/* Segment-and-enroll outcome */}
      {enrollError ? (
        <p className="text-sm text-destructive" data-testid="nurture-enroll-error">
          {enrollError}
        </p>
      ) : null}
      {enrollResult ? <EnrollResultBanner result={enrollResult} /> : null}

      {/* The funnel for the selected campaign */}
      {selectedId ? (
        analyticsLoading ? (
          <p className="text-sm text-muted-foreground" data-testid="nurture-analytics-loading">
            Loading the funnel…
          </p>
        ) : analyticsIsError ? (
          <div
            className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
            data-testid="nurture-analytics-error"
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
              data-testid="nurture-analytics-retry"
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
  analytics: NurtureCampaignAnalytics;
  campaign: NurtureCampaign | undefined;
}) {
  const reactivated = analytics.replied + analytics.booked;

  return (
    <div className="flex flex-col gap-6" data-testid="nurture-funnel">
      {/* Campaign-wide headline funnel */}
      <div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        data-testid="nurture-headline"
      >
        <FunnelStat
          icon={Users}
          label="Enrolled"
          value={analytics.total}
          testid="nurture-stat-enrolled"
        />
        <FunnelStat
          icon={Send}
          label="Touches sent"
          value={analytics.sent}
          testid="nurture-stat-sent"
        />
        <FunnelStat
          icon={MessageSquareReply}
          label="Replied"
          value={analytics.replied}
          testid="nurture-stat-replied"
          highlight
        />
        <FunnelStat
          icon={CalendarCheck}
          label="Showings booked"
          value={analytics.booked}
          testid="nurture-stat-booked"
          highlight
        />
        <FunnelStat
          icon={Sparkles}
          label="Re-engaged"
          value={reactivated}
          testid="nurture-stat-reengaged"
          highlight
        />
      </div>

      {/* Reply → booking outcome view */}
      <Card data-testid="nurture-reply-booking">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CalendarCheck className="size-4" />
            From reply to booked showing
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reactivated === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="nurture-reply-booking-empty">
              No replies yet. As dormant leads answer a nudge, they show up here —
              and a positive reply books a showing automatically.
            </p>
          ) : (
            <p className="text-sm" data-testid="nurture-reply-booking-summary">
              <span className="font-medium">{analytics.replied}</span>{" "}
              {analytics.replied === 1 ? "lead has" : "leads have"} replied, and{" "}
              <span className="font-medium">{analytics.booked}</span>{" "}
              {analytics.booked === 1 ? "has" : "have"} gone on to book a showing —
              business you'd otherwise have left on the table.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Per-segment funnel rows (dormancy tiers A–D) */}
      <div className="flex flex-col gap-3" data-testid="nurture-segments">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          By dormancy segment
        </h2>
        {DORMANCY_BUCKETS.map((bucket) => (
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
