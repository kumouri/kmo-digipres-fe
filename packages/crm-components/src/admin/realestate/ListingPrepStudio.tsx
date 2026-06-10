import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarDays,
  CheckCircle2,
  FileText,
  Mail,
  ShieldAlert,
  SkipForward,
  Sparkles,
  Camera,
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
import { Input } from "../../primitives/input";
import { Label } from "../../primitives/label";
import { useListingPrepApi } from "../../hooks/useListingPrepApi";
import { useRealEstateApi } from "../../hooks/useRealEstateApi";
import type { ListingPrepPack, PrepFairHousingFlag, SocialPost } from "../../api/listing-prep";
import {
  PREP_PACK_STATUS_LABELS,
  PREP_SOCIAL_CHANNEL_LABELS,
  labelFor,
} from "../labels";

// ── Query keys ────────────────────────────────────────────────────────────────

export const DRAFTED_PACKS_KEY = [
  "realestate",
  "listing-prep",
  "drafted",
] as const;

function listingPacksKey(listingId: string) {
  return ["realestate", "listing-prep", "listing", listingId] as const;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function packStatusVariant(
  status: string | null | undefined,
): "default" | "secondary" | "muted" {
  switch (status) {
    case "APPROVED":
      return "default";
    case "DRAFTED":
      return "secondary";
    case "SKIPPED":
      return "muted";
    default:
      return "secondary";
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

/**
 * 4-week social calendar view — groups posts by weekIndex (1–4).
 */
function SocialCalendarView({ posts }: { posts: SocialPost[] }) {
  if (posts.length === 0) {
    return (
      <p className="text-sm italic text-muted-foreground" data-testid="calendar-empty">
        No calendar posts generated.
      </p>
    );
  }

  // Group posts by week index
  const byWeek = new Map<number, SocialPost[]>();
  for (const post of posts) {
    const week = post.weekIndex ?? 1;
    if (!byWeek.has(week)) byWeek.set(week, []);
    byWeek.get(week)!.push(post);
  }

  const weekNums = Array.from(byWeek.keys()).sort((a, b) => a - b);

  return (
    <div className="flex flex-col gap-4" data-testid="social-calendar">
      {weekNums.map((week) => (
        <div key={week} className="flex flex-col gap-2" data-testid="calendar-week">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Week {week}
          </h4>
          <div className="flex flex-col gap-2">
            {byWeek.get(week)!.map((post, i) => (
              <div
                key={`${post.postDate}-${post.channel}-${i}`}
                className="flex flex-col gap-1.5 rounded-md border bg-muted/20 p-3"
                data-testid="calendar-post"
                data-fair-housing-safe={String(post.fairHousingSafe)}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-medium text-muted-foreground"
                      data-testid="calendar-post-date"
                    >
                      {post.postDate}
                    </span>
                    <Badge variant="outline" className="text-xs" data-testid="calendar-post-channel">
                      {labelFor(PREP_SOCIAL_CHANNEL_LABELS, post.channel)}
                    </Badge>
                  </div>
                  {!post.fairHousingSafe ? (
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400"
                      data-testid="calendar-post-held-badge"
                    >
                      <ShieldAlert className="size-3" />
                      Auto-corrected
                    </Badge>
                  ) : null}
                </div>
                <p
                  className="whitespace-pre-wrap text-sm text-foreground/90"
                  data-testid="calendar-post-copy"
                >
                  {post.copy?.trim() || "(empty)"}
                </p>
                {!post.fairHousingSafe && post.heldReason ? (
                  <p
                    className="text-xs italic text-amber-700 dark:text-amber-400"
                    data-testid="calendar-post-held-reason"
                  >
                    Held: "{post.heldReason}" — copy replaced with a vetted neutral substitute.
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Fair-Housing flags panel — surfaced to the agent, never auto-blocking.
 */
function FairHousingPanel({
  flags,
  held,
}: {
  flags: PrepFairHousingFlag[];
  held: number;
}) {
  const hasFlags = flags.length > 0;
  const hasHeld = held > 0;

  if (!hasFlags && !hasHeld) {
    return (
      <div
        className="flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-50 p-3 dark:bg-emerald-950/30"
        data-testid="fair-housing-clear"
      >
        <CheckCircle2 className="size-4 text-emerald-600" />
        <p className="text-sm text-emerald-800 dark:text-emerald-300">
          No Fair-Housing concerns flagged.
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-md border border-amber-500/50 bg-amber-50 p-3 dark:bg-amber-950/30"
      data-testid="fair-housing-panel"
    >
      <div className="flex items-center gap-1.5">
        <ShieldAlert className="size-4 text-amber-700 dark:text-amber-400" />
        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
          Fair-Housing check
        </p>
      </div>

      {hasHeld ? (
        <p className="text-xs text-amber-800 dark:text-amber-300" data-testid="fair-housing-held-count">
          {held} calendar {held === 1 ? "post" : "posts"} auto-corrected — original copy replaced with
          a vetted neutral substitute.
        </p>
      ) : null}

      {hasFlags ? (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
            {flags.length} {flags.length === 1 ? "phrase" : "phrases"} to review:
          </p>
          <ul className="flex flex-col gap-1.5">
            {flags.map((f, i) => (
              <li
                key={`${f.term}-${i}`}
                className="text-xs text-amber-900/90 dark:text-amber-200/90"
                data-testid="fair-housing-flag"
              >
                <span className="font-medium">"{f.term}"</span>
                {f.surface?.trim() ? (
                  <span className="text-amber-700 dark:text-amber-400">
                    {" "}in {f.surface}
                  </span>
                ) : null}
                {f.snippet?.trim() ? (
                  <span className="text-amber-800/80 dark:text-amber-300/80">
                    {" "}— …{f.snippet}…
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/**
 * One prep pack card — the full generated content: MLS description, 4-week
 * social calendar, email campaign, fair-housing flags, photo callouts, and
 * (when DRAFTED) Approve / Skip actions. Used in the per-listing studio and
 * the DRAFTED review queue.
 */
export function PrepPackCard({
  pack,
  extraInvalidateKeys = [],
}: {
  pack: ListingPrepPack;
  /** Extra query keys to invalidate after approve/skip. */
  extraInvalidateKeys?: readonly string[][];
}) {
  const qc = useQueryClient();
  const api = useListingPrepApi();

  const isDrafted = pack.status === "DRAFTED";

  function invalidate() {
    qc.invalidateQueries({ queryKey: DRAFTED_PACKS_KEY });
    for (const key of extraInvalidateKeys) {
      qc.invalidateQueries({ queryKey: key });
    }
  }

  const approve = useMutation({
    mutationFn: () => api.approvePrepPack(pack.id),
    onSuccess: () => {
      invalidate();
      toast.success("Approved — copy is ready to paste out.");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Couldn't approve the pack."),
  });

  const skip = useMutation({
    mutationFn: () => api.skipPrepPack(pack.id),
    onSuccess: () => {
      invalidate();
      toast.success("Skipped.");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Couldn't skip the pack."),
  });

  const busy = approve.isPending || skip.isPending;

  return (
    <Card data-testid="prep-pack-card" data-pack-status={pack.status}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-muted-foreground" />
            Listing prep pack
          </CardTitle>
          <div className="flex items-center gap-2">
            {pack.generationDegraded ? (
              <Badge variant="outline" data-testid="prep-pack-degraded">
                Partial draft
              </Badge>
            ) : null}
            <Badge
              variant={packStatusVariant(pack.status)}
              data-testid="prep-pack-status"
            >
              {labelFor(PREP_PACK_STATUS_LABELS, pack.status, "Needs review")}
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Generated {new Date(pack.createdAt).toLocaleDateString()}
        </p>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        {/* Fair-Housing flags panel */}
        <FairHousingPanel
          flags={pack.fairHousingFlags ?? []}
          held={pack.calendarHeldCount ?? 0}
        />

        {/* MLS Description */}
        <div className="flex flex-col gap-2" data-testid="prep-pack-mls-section">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="size-4 text-muted-foreground" />
            MLS description
          </h3>
          {pack.mlsDescription?.trim() ? (
            <p
              className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm text-foreground/90"
              data-testid="prep-pack-mls-description"
            >
              {pack.mlsDescription}
            </p>
          ) : (
            <p className="text-sm italic text-muted-foreground">
              No MLS description generated.
            </p>
          )}
        </div>

        {/* 4-week social calendar */}
        <div className="flex flex-col gap-2" data-testid="prep-pack-calendar-section">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <CalendarDays className="size-4 text-muted-foreground" />
            4-week social calendar
            {(pack.socialCalendar?.length ?? 0) > 0 ? (
              <Badge variant="muted" className="ml-1">
                {pack.socialCalendar.length} posts
              </Badge>
            ) : null}
          </h3>
          <SocialCalendarView posts={pack.socialCalendar ?? []} />
        </div>

        {/* Email campaign */}
        <div className="flex flex-col gap-2" data-testid="prep-pack-email-section">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Mail className="size-4 text-muted-foreground" />
            Email campaign
          </h3>
          {pack.emailCampaign?.trim() ? (
            <p
              className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm text-foreground/90"
              data-testid="prep-pack-email-campaign"
            >
              {pack.emailCampaign}
            </p>
          ) : (
            <p className="text-sm italic text-muted-foreground">
              No email campaign generated.
            </p>
          )}
        </div>

        {/* Photo callouts */}
        {(pack.photoCaptions?.length ?? 0) > 0 ? (
          <div className="flex flex-col gap-2" data-testid="prep-pack-photo-callouts">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Camera className="size-4 text-muted-foreground" />
              Photo callouts
            </h3>
            <ul className="flex flex-col gap-1">
              {pack.photoCaptions.map((c, i) => (
                <li
                  key={`${c.photoId}-${i}`}
                  className="text-xs text-muted-foreground"
                  data-testid="photo-callout-row"
                >
                  {c.caption?.trim() || "(no caption)"}
                  {c.features && c.features.length > 0 ? (
                    <span className="text-muted-foreground/80">
                      {" "}· {c.features.join(", ")}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>

      {isDrafted ? (
        <CardFooter className="flex flex-wrap gap-2">
          <Button
            onClick={() => approve.mutate()}
            disabled={busy}
            data-testid="prep-pack-approve"
          >
            <Sparkles className="size-4" />
            {approve.isPending ? "Approving…" : "Approve"}
          </Button>
          <Button
            variant="outline"
            onClick={() => skip.mutate()}
            disabled={busy}
            data-testid="prep-pack-skip"
          >
            <SkipForward className="size-4" />
            {skip.isPending ? "Skipping…" : "Skip"}
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}

/**
 * Generate form — optional start date + posts/week.
 */
function GenerateForm({
  listingId,
  onGenerated,
}: {
  listingId: string;
  onGenerated: (pack: ListingPrepPack) => void;
}) {
  const qc = useQueryClient();
  const api = useListingPrepApi();
  const [startDate, setStartDate] = useState("");
  const [postsPerWeek, setPostsPerWeek] = useState("");

  const generate = useMutation({
    mutationFn: () =>
      api.generatePrepPack(listingId, {
        startDate: startDate.trim() || null,
        postsPerWeek: postsPerWeek.trim() ? Number(postsPerWeek) : null,
      }),
    onSuccess: (pack) => {
      qc.invalidateQueries({ queryKey: listingPacksKey(listingId) });
      qc.invalidateQueries({ queryKey: DRAFTED_PACKS_KEY });
      if (pack.generationDegraded) {
        toast.warning(
          "Drafted what we could — some pieces came back thin. Review it below.",
        );
      } else {
        toast.success("Prep pack drafted — review it below before you approve.");
      }
      onGenerated(pack);
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Couldn't generate the prep pack."),
  });

  return (
    <Card data-testid="generate-form-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-muted-foreground" />
          Generate prep pack
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          One click drafts an MLS description, a 4-week dated social calendar,
          and an email campaign — all Fair-Housing linted. Nothing is published;
          you review and approve every piece.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="prep-start-date">Calendar start date (optional)</Label>
            <Input
              id="prep-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={generate.isPending}
              data-testid="prep-start-date"
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to default to the next Monday.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="prep-posts-per-week">Posts per week (optional)</Label>
            <Input
              id="prep-posts-per-week"
              type="number"
              min={1}
              max={7}
              value={postsPerWeek}
              onChange={(e) => setPostsPerWeek(e.target.value)}
              disabled={generate.isPending}
              placeholder="3"
              data-testid="prep-posts-per-week"
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to use the configured default.
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          data-testid="prep-generate-btn"
        >
          <Sparkles className="size-4" />
          {generate.isPending ? "Generating…" : "Generate prep pack"}
        </Button>
      </CardFooter>
    </Card>
  );
}

/**
 * Per-listing prep history section (shown inside the Listing Prep Studio when
 * a listing is selected).
 */
function ListingPacksSection({ listingId }: { listingId: string }) {
  const api = useListingPrepApi();
  const [_generated, setGenerated] = useState<ListingPrepPack | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: listingPacksKey(listingId),
    queryFn: () => api.listPacksForListing(listingId),
  });

  return (
    <div className="flex flex-col gap-4" data-testid="listing-packs-section">
      <GenerateForm listingId={listingId} onGenerated={setGenerated} />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data || data.length === 0 ? (
        <div
          className="rounded-md border border-dashed p-6 text-center"
          data-testid="listing-packs-empty"
        >
          <p className="text-sm text-muted-foreground">
            No prep packs yet. Hit "Generate prep pack" to draft the full MLS +
            social calendar + email package for this listing.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4" data-testid="listing-packs-list">
          {data.map((pack) => (
            <PrepPackCard
              key={pack.id}
              pack={pack}
              extraInvalidateKeys={[Array.from(listingPacksKey(listingId))]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Real Estate Concierge (T10 — Listing Prep Studio) — the main staff surface:
 *
 * (1) A listing picker — select which listing to generate a prep pack for.
 * (2) Generate panel (optional start date + posts/week).
 * (3) Per-listing pack history (most-recent first), each expandable to the full
 *     content: MLS description, 4-week dated social calendar, email campaign,
 *     Fair-Housing flags, and Approve / Skip actions.
 * (4) DRAFTED queue — all DRAFTED packs across listings for the tenant, so
 *     a reviewer can work through the queue without navigating per-listing.
 *
 * Route: /listing-prep-studio (behind RequireNotContractor)
 * Nav label: "Listing prep" (distinct from any existing nav label)
 */
export function ListingPrepStudio() {
  const prepApi = useListingPrepApi();
  const realEstateApi = useRealEstateApi();
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);

  const {
    data: listings,
    isLoading: listingsLoading,
    isError: listingsError,
  } = useQuery({
    queryKey: ["realestate", "listings"],
    queryFn: realEstateApi.listListings,
  });

  const {
    data: draftedPacks,
    isLoading: draftedLoading,
    isError: draftedError,
    refetch: refetchDrafted,
    isRefetching: draftedRefetching,
  } = useQuery({
    queryKey: DRAFTED_PACKS_KEY,
    queryFn: prepApi.listDraftedPacks,
  });

  return (
    <section className="flex flex-col gap-6" data-testid="listing-prep-studio-page">
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-medium">
          <CalendarDays className="size-6 text-muted-foreground" />
          Listing prep
        </h1>
        <p className="text-sm text-muted-foreground">
          One-click MLS description + 4-week social calendar + email campaign for
          any listing — Fair-Housing linted. All copy is drafted for your review
          before anything goes out.
        </p>
      </header>

      {/* Listing selector + per-listing generate panel */}
      <Card data-testid="listing-selector-card">
        <CardHeader>
          <CardTitle className="text-base">Choose a listing</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {listingsLoading ? (
            <p className="text-sm text-muted-foreground">Loading listings…</p>
          ) : listingsError || !listings ? (
            <p className="text-sm text-muted-foreground">
              Couldn't load your listings.
            </p>
          ) : listings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No listings yet. Add a listing from the Listings console first.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2" data-testid="listing-picker">
              {listings.map((listing) => {
                const addr = [
                  listing.addressLine?.trim(),
                  listing.city?.trim(),
                ]
                  .filter(Boolean)
                  .join(", ");
                const isSelected = selectedListingId === listing.id;
                return (
                  <Button
                    key={listing.id}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setSelectedListingId(
                        isSelected ? null : (listing.id ?? null),
                      )
                    }
                    data-testid="listing-picker-btn"
                    data-listing-id={listing.id}
                    data-selected={String(isSelected)}
                  >
                    {addr || "Untitled listing"}
                  </Button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedListingId ? (
        <ListingPacksSection listingId={selectedListingId} />
      ) : null}

      {/* DRAFTED queue — all DRAFTED packs across listings */}
      <section className="flex flex-col gap-4" data-testid="drafted-queue-section">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-medium">Prep packs awaiting review</h2>
          {draftedPacks && draftedPacks.length > 0 ? (
            <Badge variant="secondary" data-testid="drafted-queue-count">
              {draftedPacks.length} waiting
            </Badge>
          ) : null}
        </div>

        {draftedLoading ? (
          <p className="text-sm text-muted-foreground" data-testid="drafted-queue-loading">
            Loading…
          </p>
        ) : draftedError ? (
          <div
            className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
            data-testid="drafted-queue-error"
          >
            <p className="text-sm text-foreground">
              We couldn't load the review queue.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchDrafted()}
              disabled={draftedRefetching}
              data-testid="drafted-queue-retry"
            >
              {draftedRefetching ? "Retrying…" : "Try again"}
            </Button>
          </div>
        ) : !draftedPacks || draftedPacks.length === 0 ? (
          <div
            className="rounded-md border border-dashed p-8 text-center"
            data-testid="drafted-queue-empty"
          >
            <p className="text-sm text-muted-foreground">
              No prep packs waiting for review. Generate one from a listing and
              it will land here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4" data-testid="drafted-queue-list">
            {draftedPacks.map((pack) => (
              <PrepPackCard key={pack.id} pack={pack} />
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
