import { useMemo } from "react";

import * as listingPrepApi from "../api/listing-prep";
import { useCrmClient } from "../provider/CrmProvider";
import type { ListingPrepGenerateRequest } from "../api/listing-prep";

/**
 * Real Estate Concierge (T10 — Listing Prep Studio) — TanStack-Query-friendly
 * wrappers over the hand-written listing prep client, bound to the configured
 * CrmClient via useCrmClient(). The BE ListingPrepController is
 * @ConditionalOnProperty(kmosf.modules.realestate)-gated, so this is a
 * hand-written client with no generated counterpart (the RE-5b / ChairFill /
 * Home-Services precedent).
 */
export function useListingPrepApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      // Generate a prep pack for a listing
      generatePrepPack: (
        listingId: string,
        body?: ListingPrepGenerateRequest,
      ) => listingPrepApi.generatePrepPack(client, listingId, body),

      // List packs for a specific listing (history)
      listPacksForListing: (listingId: string) =>
        listingPrepApi.listPacksForListing(client, listingId),

      // List all DRAFTED packs for the tenant (the review queue)
      listDraftedPacks: () => listingPrepApi.listDraftedPacks(client),

      // Get a single pack
      getPrepPack: (id: string) => listingPrepApi.getPrepPack(client, id),

      // Approve a DRAFTED pack → APPROVED
      approvePrepPack: (id: string) =>
        listingPrepApi.approvePrepPack(client, id),

      // Skip a DRAFTED pack → SKIPPED
      skipPrepPack: (id: string) => listingPrepApi.skipPrepPack(client, id),
    }),
    [client],
  );
}
