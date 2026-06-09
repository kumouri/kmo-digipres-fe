import type { CrmClient } from "./client";
import type { Quote } from "../types/api";

// Proposals / SOW Studio — HAND-WRITTEN client.
//
// POST /proposals/draft is @ConditionalOnProperty(kmosf.modules.proposals)-
// gated and @IdempotentRoute — the endpoint is ABSENT from the committed
// openapi.json and the generated client has no methods for it. These calls
// back the ProposalStudio surface:
//   - Draft proposal   — POST /proposals/draft  (Idempotency-Key required)
//   - Fetch proposal   — GET  /proposals/{id}
//   - Download SOW PDF — GET  /proposals/{id}/pdf  → Blob
//
// All are STAFF-authenticated + proposals-module-gated on the BE.
// Error band 4620-4639.

// ---------------------------------------------------------------------------
// DTOs — match the BE exactly
// ---------------------------------------------------------------------------

/** Four narrative sections of the AI-drafted SOW prose (linked to a Draft Quote). */
export interface SowDraft {
  id: string;
  tenantId: string;
  quoteId: string;
  /** Project scope narrative — what the engagement covers. */
  scope: string | null;
  /** Concrete deliverables the client receives. */
  deliverables: string | null;
  /** Assumptions / out-of-scope caveats the pricing depends on. */
  assumptions: string | null;
  /** Timeline / phasing prose. */
  timeline: string | null;
  /**
   * true iff the Anthropic draft produced usable output; false when the draft
   * was materialized empty after an AI failure / budget-exhaustion /
   * blank-or-unparseable answer (a human then fills the sections in).
   * The draft is always persisted either way.
   */
  aiApplied: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * The BE's ProposalDraftService.DraftResult: a DRAFT Quote (priced line items +
 * totals) plus the SowDraft prose (four independently-editable sections).
 * sowDraft may be null if the Quote was not produced by this module.
 */
export interface ProposalDraftResult {
  quote: Quote;
  sowDraft: SowDraft | null;
}

/** Body for POST /proposals/draft. notes is required; the rest are optional context. */
export interface ProposalDraftRequest {
  notes: string;
  contactId?: string;
  companyId?: string;
  dealId?: string;
  /** ISO 4217 currency code (defaults to USD on the BE). */
  currency?: string;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Draft a SOW from discovery notes. The BE returns a DRAFT Quote (priced
 * line items + totals) + the four SOW prose sections (scope / deliverables /
 * assumptions / timeline), plus aiApplied. A fresh Idempotency-Key is minted
 * per call so retries produce a new draft (the @IdempotentRoute replays the
 * same 201 on duplicate keys — the project-assignments precedent).
 */
export function draftProposal(
  client: CrmClient,
  req: ProposalDraftRequest,
): Promise<ProposalDraftResult> {
  return client.api<ProposalDraftResult>("/proposals/draft", {
    method: "POST",
    body: JSON.stringify(req),
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
}

/**
 * Fetch a drafted proposal by its DRAFT Quote id. Returns the Quote +
 * SowDraft prose (sowDraft is null if the Quote was not produced by this
 * module). 404 (errorCode 2200) if the Quote is not found for this tenant.
 */
export function getProposal(
  client: CrmClient,
  id: string,
): Promise<ProposalDraftResult> {
  return client.api<ProposalDraftResult>(`/proposals/${encodeURIComponent(id)}`);
}

/**
 * Returns the URL for the rendered SOW PDF. The caller opens it in a new tab
 * or assigns it to an anchor's href — mirrors the getQuotePdfUrl pattern used
 * in QuoteDetail (the BE PDF endpoint produces application/pdf bytes; the
 * auth token must be sent via the Authorization header, so callers that need
 * binary bytes should fetch() with the stored token injected).
 */
export function getProposalPdfUrl(client: CrmClient, id: string): string {
  return `${client.baseUrl}/proposals/${encodeURIComponent(id)}/pdf`;
}
