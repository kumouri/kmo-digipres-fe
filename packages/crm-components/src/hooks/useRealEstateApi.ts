import { useMemo } from "react";

import * as realEstateApi from "../api/realestate";
import { useCrmClient } from "../provider/CrmProvider";
import type { DisclosureRequest, Listing } from "../types/api";

/**
 * TanStack-Query-friendly wrappers over the hand-written Real Estate Concierge
 * client (the RE-5b flagship surfaces — listing console, concierge inbox + lead
 * pipeline, and the marketing review queue), bound to the configured CrmClient
 * via useCrmClient(). The BE routes are @ConditionalOnProperty-gated, so this is
 * a hand-written client with no generated counterpart (the ChairFill CF-5b /
 * Home-Services HS-4 precedent).
 */
export function useRealEstateApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      // Listings
      listListings: () => realEstateApi.listListings(client),
      getListing: (id: string) => realEstateApi.getListing(client, id),
      createListing: (body: Listing) =>
        realEstateApi.createListing(client, body),
      updateListing: (id: string, body: Listing) =>
        realEstateApi.updateListing(client, id, body),
      // Disclosures
      listDisclosures: (listingId: string) =>
        realEstateApi.listDisclosures(client, listingId),
      createDisclosure: (listingId: string, body: DisclosureRequest) =>
        realEstateApi.createDisclosure(client, listingId, body),
      updateDisclosure: (
        listingId: string,
        id: string,
        body: DisclosureRequest,
      ) => realEstateApi.updateDisclosure(client, listingId, id, body),
      // Marketing
      listPhotos: (listingId: string) =>
        realEstateApi.listPhotos(client, listingId),
      uploadPhoto: (listingId: string, file: File) =>
        realEstateApi.uploadPhoto(client, listingId, file),
      generateMarketing: (listingId: string) =>
        realEstateApi.generateMarketing(client, listingId),
      listListingMarketingDrafts: (listingId: string) =>
        realEstateApi.listListingMarketingDrafts(client, listingId),
      listDraftedMarketing: () => realEstateApi.listDraftedMarketing(client),
      approveMarketingDraft: (id: string) =>
        realEstateApi.approveMarketingDraft(client, id),
      skipMarketingDraft: (id: string) =>
        realEstateApi.skipMarketingDraft(client, id),
      // Concierge conversations
      listConversations: (listingId?: string) =>
        realEstateApi.listConversations(client, listingId),
      getConversation: (id: string) =>
        realEstateApi.getConversation(client, id),
    }),
    [client],
  );
}
