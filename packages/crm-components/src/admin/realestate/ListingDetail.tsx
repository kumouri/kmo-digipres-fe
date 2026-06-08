import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  MessageSquare,
  Plus,
  Sparkles,
  Upload,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../primitives/dialog";
import { Label } from "../../primitives/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../primitives/select";
import { Textarea } from "../../primitives/textarea";
import { useRealEstateApi } from "../../hooks/useRealEstateApi";
import type { DisclosureRequest, ListingDisclosure } from "../../types/api";
import { DISCLOSURE_TYPES } from "../../types/api";
import {
  DISCLOSURE_TYPE_LABELS,
  LISTING_STATUS_LABELS,
  labelFor,
} from "../labels";
import { MarketingDraftCard } from "./MarketingReviewQueue";
import { listingAddress } from "./ListingConsole";

function listingKey(id: string) {
  return ["realestate", "listing", id] as const;
}
function disclosuresKey(id: string) {
  return ["realestate", "listing", id, "disclosures"] as const;
}
function photosKey(id: string) {
  return ["realestate", "listing", id, "photos"] as const;
}
function listingDraftsKey(id: string) {
  return ["realestate", "listing", id, "drafts"] as const;
}

function priceText(price: number | null | undefined): string | null {
  if (price == null) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

// ── Disclosures ───────────────────────────────────────────────────────────────

function AddDisclosureDialog({ listingId }: { listingId: string }) {
  const qc = useQueryClient();
  const api = useRealEstateApi();
  const [open, setOpen] = useState(false);
  const [disclosureType, setDisclosureType] = useState<string>("GENERAL");
  const [text, setText] = useState("");

  function reset() {
    setDisclosureType("GENERAL");
    setText("");
  }

  const create = useMutation({
    mutationFn: () => {
      const body: DisclosureRequest = {
        disclosureType,
        text: text.trim(),
      };
      return api.createDisclosure(listingId, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: disclosuresKey(listingId) });
      setOpen(false);
      reset();
      toast.success("Disclosure added — the concierge can ground answers in it.");
    },
    onError: (e) =>
      toast.error(
        e instanceof Error ? e.message : "Couldn't add that disclosure.",
      ),
  });

  const canSubmit = text.trim().length > 0 && !create.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" data-testid="disclosure-add-open">
          <Plus className="size-4" />
          Add disclosure
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="disclosure-add-dialog">
        <DialogHeader>
          <DialogTitle>Add a disclosure</DialogTitle>
          <DialogDescription>
            This text is what the concierge answers buyer questions from. Be
            specific — "Roof replaced 2021, architectural shingles, transferable
            warranty."
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="disclosure-type">Category</Label>
            <Select
              value={disclosureType}
              onValueChange={setDisclosureType}
              disabled={create.isPending}
            >
              <SelectTrigger id="disclosure-type" data-testid="disclosure-add-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISCLOSURE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {labelFor(DISCLOSURE_TYPE_LABELS, t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="disclosure-text">Disclosure</Label>
            <Textarea
              id="disclosure-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={create.isPending}
              rows={5}
              placeholder="What should the concierge know — and be able to tell buyers — about this?"
              data-testid="disclosure-add-text"
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
            data-testid="disclosure-add-submit"
          >
            {create.isPending ? "Adding…" : "Add disclosure"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DisclosureRow({ disclosure }: { disclosure: ListingDisclosure }) {
  const indexed = !!disclosure.indexedAt;
  return (
    <Card data-testid="disclosure-row">
      <CardContent className="flex flex-col gap-2 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant="secondary" data-testid="disclosure-row-type">
            {labelFor(DISCLOSURE_TYPE_LABELS, disclosure.disclosureType, "General")}
          </Badge>
          {indexed ? (
            <span
              className="flex items-center gap-1 text-xs text-muted-foreground"
              data-testid="disclosure-row-indexed"
              title="Indexed — the concierge can ground answers in this"
            >
              <CheckCircle2 className="size-3.5 text-emerald-600" />
              Searchable
            </span>
          ) : (
            <span className="text-xs italic text-muted-foreground">
              Indexing…
            </span>
          )}
        </div>
        <p className="whitespace-pre-wrap text-sm text-foreground/90">
          {disclosure.text?.trim() || "(empty)"}
        </p>
      </CardContent>
    </Card>
  );
}

function DisclosuresSection({ listingId }: { listingId: string }) {
  const api = useRealEstateApi();
  const { data, isLoading } = useQuery({
    queryKey: disclosuresKey(listingId),
    queryFn: () => api.listDisclosures(listingId),
  });

  return (
    <Card data-testid="disclosures-section">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4 text-muted-foreground" />
            Disclosures
            {data && data.length > 0 ? (
              <Badge variant="muted" data-testid="disclosures-count">
                {data.length}
              </Badge>
            ) : null}
          </CardTitle>
          <AddDisclosureDialog listingId={listingId} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          The grounding corpus. The concierge only answers buyer questions from
          what's here — and cites the exact disclosure it used.
        </p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !data || data.length === 0 ? (
          <div
            className="rounded-md border border-dashed p-6 text-center"
            data-testid="disclosures-empty"
          >
            <p className="text-sm text-muted-foreground">
              No disclosures yet. Add what buyers should know — roof, systems,
              flood, HOA — so the concierge can answer with confidence.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2" data-testid="disclosures-list">
            {data.map((d) => (
              <DisclosureRow key={d.id} disclosure={d} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Photos ─────────────────────────────────────────────────────────────────

function PhotosSection({ listingId }: { listingId: string }) {
  const qc = useQueryClient();
  const api = useRealEstateApi();
  const inputRef = useRef<HTMLInputElement>(null);
  const { data, isLoading } = useQuery({
    queryKey: photosKey(listingId),
    queryFn: () => api.listPhotos(listingId),
  });

  const upload = useMutation({
    mutationFn: (file: File) => api.uploadPhoto(listingId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: photosKey(listingId) });
      toast.success("Photo uploaded.");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Couldn't upload the photo."),
  });

  return (
    <Card data-testid="photos-section">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="size-4 text-muted-foreground" />
            Photos
            {data && data.length > 0 ? (
              <Badge variant="muted" data-testid="photos-count">
                {data.length}
              </Badge>
            ) : null}
          </CardTitle>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            data-testid="photo-upload-input"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload.mutate(file);
              e.target.value = "";
            }}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={upload.isPending}
            onClick={() => inputRef.current?.click()}
            data-testid="photo-upload-open"
          >
            <Upload className="size-4" />
            {upload.isPending ? "Uploading…" : "Upload photo"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          The marketing generator reads these for feature callouts woven into the
          copy.
        </p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !data || data.length === 0 ? (
          <div
            className="rounded-md border border-dashed p-6 text-center"
            data-testid="photos-empty"
          >
            <p className="text-sm text-muted-foreground">
              No photos yet. Upload a few so the generated marketing can call out
              what makes this place shine.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2" data-testid="photos-list">
            {data.map((p) => (
              <li
                key={p.id}
                data-testid="photo-row"
                className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <ImageIcon className="size-4 text-muted-foreground" />
                <span className="truncate">{p.filename?.trim() || "Photo"}</span>
                {p.sizeBytes != null ? (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {Math.round(p.sizeBytes / 1024)} KB
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ── Marketing (generate + drafts history) ────────────────────────────────────

function MarketingSection({ listingId }: { listingId: string }) {
  const qc = useQueryClient();
  const api = useRealEstateApi();
  const { data, isLoading } = useQuery({
    queryKey: listingDraftsKey(listingId),
    queryFn: () => api.listListingMarketingDrafts(listingId),
  });

  const generate = useMutation({
    mutationFn: () => api.generateMarketing(listingId),
    onSuccess: (draft) => {
      qc.invalidateQueries({ queryKey: listingDraftsKey(listingId) });
      qc.invalidateQueries({ queryKey: ["realestate", "marketing", "drafts"] });
      if (draft.generationDegraded) {
        toast.warning(
          "Drafted what we could — some pieces came back thin. Review it below.",
        );
      } else {
        toast.success("Marketing drafted — review it below before you publish.");
      }
    },
    onError: (e) =>
      toast.error(
        e instanceof Error ? e.message : "Couldn't generate marketing.",
      ),
  });

  return (
    <Card data-testid="marketing-section">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-muted-foreground" />
            Marketing
          </CardTitle>
          <Button
            size="sm"
            disabled={generate.isPending}
            onClick={() => generate.mutate()}
            data-testid="marketing-generate"
          >
            <Sparkles className="size-4" />
            {generate.isPending ? "Generating…" : "Generate marketing"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          One click drafts MLS remarks, social captions, and an email blast from
          this listing's facts and photos — then flags any Fair-Housing risk.
          Nothing is published; you review and approve every piece.
        </p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !data || data.length === 0 ? (
          <div
            className="rounded-md border border-dashed p-6 text-center"
            data-testid="marketing-empty"
          >
            <p className="text-sm text-muted-foreground">
              No marketing drafted yet. Hit "Generate marketing" to draft a full
              package for this listing.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4" data-testid="marketing-drafts-list">
            {data.map((draft) => (
              <MarketingDraftCard
                key={draft.id}
                draft={draft}
                extraInvalidateKeys={[
                  listingDraftsKey(listingId),
                  ["realestate", "marketing", "drafts"],
                ]}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Real Estate Concierge (RE-5b) — one listing's detail: its facts, the
 * disclosure corpus (add), photos (upload), and the marketing studio (generate +
 * the draft→approve queue for this listing).
 */
export function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const api = useRealEstateApi();

  const { data: listing, isLoading, isError, error } = useQuery({
    queryKey: listingKey(id ?? ""),
    queryFn: () => api.getListing(id!),
    enabled: !!id,
  });

  if (!id) {
    return null;
  }

  return (
    <section className="flex flex-col gap-4" data-testid="listing-detail-page">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/listings")}
          data-testid="listing-detail-back"
        >
          <ArrowLeft className="size-4" />
          Listings
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground" data-testid="listing-detail-loading">
          Loading…
        </p>
      ) : isError || !listing ? (
        <div
          className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
          data-testid="listing-detail-error"
        >
          <p className="text-sm text-foreground">
            We couldn't load this listing.
            {error instanceof Error ? ` ${error.message}` : ""}
          </p>
          <Link to="/listings">
            <Button variant="outline" size="sm">
              Back to listings
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <header className="flex flex-col gap-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h1
                className="text-2xl font-medium"
                data-testid="listing-detail-address"
              >
                {listingAddress(listing)}
              </h1>
              <Badge data-testid="listing-detail-status">
                {labelFor(LISTING_STATUS_LABELS, listing.status, "Active")}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {priceText(listing.price) ? (
                <span className="font-medium text-foreground">
                  {priceText(listing.price)}
                </span>
              ) : null}
              {listing.beds != null ? <span>{listing.beds} bd</span> : null}
              {listing.baths != null ? <span>{listing.baths} ba</span> : null}
              {listing.sqft != null ? (
                <span>{listing.sqft.toLocaleString()} sqft</span>
              ) : null}
              {listing.trackedPhone?.trim() ? (
                <span className="flex items-center gap-1 text-xs">
                  <MessageSquare className="size-3" />
                  Buyers text {listing.trackedPhone}
                </span>
              ) : null}
            </div>
          </header>

          <DisclosuresSection listingId={id} />
          <PhotosSection listingId={id} />
          <MarketingSection listingId={id} />
        </>
      )}
    </section>
  );
}
