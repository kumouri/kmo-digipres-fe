import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Building, Home, MapPin, Plus } from "lucide-react";

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
import { useRealEstateApi } from "../../hooks/useRealEstateApi";
import type { Listing } from "../../types/api";
import { LISTING_STATUS_LABELS, labelFor } from "../labels";

export const LISTINGS_KEY = ["realestate", "listings"] as const;

/** Listing status drives the badge weight — ACTIVE stands out, SOLD recedes. */
function statusBadgeVariant(
  status: string | null | undefined,
): "default" | "secondary" | "muted" {
  switch (status) {
    case "ACTIVE":
      return "default";
    case "PENDING":
      return "secondary";
    case "SOLD":
      return "muted";
    default:
      return "secondary";
  }
}

/** A one-line address from the listing's parts. */
export function listingAddress(l: Listing): string {
  const line1 = l.addressLine?.trim();
  const cityState = [l.city?.trim(), l.state?.trim()].filter(Boolean).join(", ");
  const tail = [cityState, l.zip?.trim()].filter(Boolean).join(" ");
  return [line1, tail].filter(Boolean).join(" · ") || "Untitled listing";
}

function priceText(price: number | null | undefined): string | null {
  if (price == null) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

/** Compact facts line: beds · baths · sqft. */
function factsText(l: Listing): string {
  const parts: string[] = [];
  if (l.beds != null) parts.push(`${l.beds} bd`);
  if (l.baths != null) parts.push(`${l.baths} ba`);
  if (l.sqft != null) parts.push(`${l.sqft.toLocaleString()} sqft`);
  return parts.join(" · ");
}

function NewListingDialog() {
  const qc = useQueryClient();
  const api = useRealEstateApi();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [stateField, setStateField] = useState("");
  const [zip, setZip] = useState("");
  const [price, setPrice] = useState("");
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [sqft, setSqft] = useState("");
  const [trackedPhone, setTrackedPhone] = useState("");

  function reset() {
    setAddressLine("");
    setCity("");
    setStateField("");
    setZip("");
    setPrice("");
    setBeds("");
    setBaths("");
    setSqft("");
    setTrackedPhone("");
  }

  const create = useMutation({
    mutationFn: () => {
      const body: Listing = {
        addressLine: addressLine.trim() || undefined,
        city: city.trim() || undefined,
        state: stateField.trim() || undefined,
        zip: zip.trim() || undefined,
        price: price.trim() ? Number(price) : undefined,
        beds: beds.trim() ? Number(beds) : undefined,
        baths: baths.trim() ? Number(baths) : undefined,
        sqft: sqft.trim() ? Number(sqft) : undefined,
        trackedPhone: trackedPhone.trim() || undefined,
      };
      return api.createListing(body);
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: LISTINGS_KEY });
      setOpen(false);
      reset();
      toast.success("Listing added.");
      if (created.id) navigate(`/listings/${created.id}`);
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Couldn't add the listing."),
  });

  const canSubmit = addressLine.trim().length > 0 && !create.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button data-testid="listing-new-open">
          <Plus className="size-4" />
          New listing
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="listing-new-dialog">
        <DialogHeader>
          <DialogTitle>New listing</DialogTitle>
          <DialogDescription>
            Add a property to your console. You can load disclosures, photos, and
            generate marketing once it's created.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="listing-address">Street address</Label>
            <Input
              id="listing-address"
              value={addressLine}
              onChange={(e) => setAddressLine(e.target.value)}
              disabled={create.isPending}
              placeholder="123 Maple Ave"
              data-testid="listing-new-address"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="listing-city">City</Label>
              <Input
                id="listing-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={create.isPending}
                placeholder="O'Fallon"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="listing-state">State</Label>
              <Input
                id="listing-state"
                value={stateField}
                onChange={(e) => setStateField(e.target.value)}
                disabled={create.isPending}
                placeholder="IL"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="listing-zip">ZIP</Label>
              <Input
                id="listing-zip"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                disabled={create.isPending}
                placeholder="62269"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="listing-price">Price (USD)</Label>
              <Input
                id="listing-price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={create.isPending}
                placeholder="425000"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="listing-beds">Beds</Label>
              <Input
                id="listing-beds"
                type="number"
                value={beds}
                onChange={(e) => setBeds(e.target.value)}
                disabled={create.isPending}
                placeholder="3"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="listing-baths">Baths</Label>
              <Input
                id="listing-baths"
                type="number"
                step="0.5"
                value={baths}
                onChange={(e) => setBaths(e.target.value)}
                disabled={create.isPending}
                placeholder="2.5"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="listing-sqft">Sq ft</Label>
              <Input
                id="listing-sqft"
                type="number"
                value={sqft}
                onChange={(e) => setSqft(e.target.value)}
                disabled={create.isPending}
                placeholder="1850"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="listing-phone">Tracked SMS number (optional)</Label>
            <Input
              id="listing-phone"
              value={trackedPhone}
              onChange={(e) => setTrackedPhone(e.target.value)}
              disabled={create.isPending}
              placeholder="+1 555 0142"
            />
            <p className="text-xs text-muted-foreground">
              The number buyers text about this listing — the concierge answers
              their questions here.
            </p>
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
            data-testid="listing-new-submit"
          >
            {create.isPending ? "Adding…" : "Add listing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ListingCard({ listing }: { listing: Listing }) {
  const navigate = useNavigate();
  const price = priceText(listing.price);
  const facts = factsText(listing);
  return (
    <Card
      data-testid="listing-card"
      data-listing-status={listing.status ?? ""}
      className="cursor-pointer transition-colors hover:border-primary/50"
      onClick={() => listing.id && navigate(`/listings/${listing.id}`)}
    >
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle
            className="flex items-center gap-2 text-base"
            data-testid="listing-card-address"
          >
            <Home className="size-4 text-muted-foreground" />
            {listingAddress(listing)}
          </CardTitle>
          <Badge
            variant={statusBadgeVariant(listing.status)}
            data-testid="listing-card-status"
          >
            {labelFor(LISTING_STATUS_LABELS, listing.status, "Active")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {price ? (
          <span className="font-medium text-foreground" data-testid="listing-card-price">
            {price}
          </span>
        ) : null}
        {facts ? <span data-testid="listing-card-facts">{facts}</span> : null}
        {listing.mlsNumber?.trim() ? (
          <span className="flex items-center gap-1 text-xs">
            <Building className="size-3" />
            MLS {listing.mlsNumber}
          </span>
        ) : null}
        {listing.trackedPhone?.trim() ? (
          <span className="flex items-center gap-1 text-xs">
            <MapPin className="size-3" />
            {listing.trackedPhone}
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * Real Estate Concierge (RE-5b) — the listing console. Lists every listing the
 * agent has loaded, with a "New listing" action; each card links to the listing
 * detail (disclosures, photos, generate marketing).
 */
export function ListingConsole() {
  const api = useRealEstateApi();
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: LISTINGS_KEY,
    queryFn: api.listListings,
  });

  return (
    <section className="flex flex-col gap-4" data-testid="listing-console-page">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2 text-2xl font-medium">
            <Home className="size-6 text-muted-foreground" />
            Listings
          </h1>
          <p className="text-sm text-muted-foreground">
            Every property you've loaded. Open one to add disclosures, upload
            photos, and generate marketing — the concierge answers buyer texts
            grounded in each listing's disclosures.
          </p>
        </div>
        <NewListingDialog />
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground" data-testid="listing-loading">
          Loading…
        </p>
      ) : isError ? (
        <div
          className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
          data-testid="listing-error"
        >
          <p className="text-sm text-foreground">
            We couldn't load your listings.
            {error instanceof Error ? ` ${error.message}` : ""}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            data-testid="listing-retry"
          >
            {isRefetching ? "Retrying…" : "Try again"}
          </Button>
        </div>
      ) : !data || data.length === 0 ? (
        <div
          className="rounded-md border border-dashed p-8 text-center"
          data-testid="listing-empty"
        >
          <p className="text-sm text-muted-foreground">
            No listings yet. Add your first property to get started.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3" data-testid="listing-list">
          {data.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </section>
  );
}
