import type { CrmClient } from "./client";

// Home Services T13 "Tech Copilot" — HAND-WRITTEN client.
//
// The TechCopilotController and TechDocController are
// @ConditionalOnProperty(kmosf.modules.techcopilot)-gated, so all routes are
// ABSENT from the committed openapi.json and the generated client has no methods
// for them (the T11 QuoteCloserController / T8 PriceBookController / T5
// CallbackController precedent).
//
// These calls back the T13 "Tech Copilot" office surfaces:
//
//   - Ask a question      — POST /techcopilot/ask
//                               body: { question, equipmentType? }
//                               → AskResponse { answer, handoff, citations[], queryId }
//   - Query history       — GET  /techcopilot/queries
//                               → TechQuery[] (newest first, staff-gated)
//   - Submit feedback     — POST /techcopilot/queries/{id}/feedback
//                               body: { helpful: boolean }
//                               → TechQuery (4495 if helpful is null)
//   - Create doc          — POST /techcopilot/docs
//                               body: TechDocRequest → TechDoc
//   - List docs           — GET  /techcopilot/docs
//                               → TechDoc[]
//   - Get doc             — GET  /techcopilot/docs/{id}
//                               → TechDoc (4490 if absent)
//   - Update doc          — PUT  /techcopilot/docs/{id}
//                               body: TechDocRequest → TechDoc (4491 if blank title/text)
//
// Error codes: 4490 (doc not found, 404), 4491 (blank title/text, 400),
//              4494 (blank question, 400), 4495 (helpful null, 400).

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/**
 * EquipmentType — the coarse equipment category a TechDoc documents.
 * Maps to: EquipmentType (module/techcopilot/model/EquipmentType.java)
 *
 * Open by design: GENERAL is the catch-all; retrieval is never restricted to
 * one category — the type is surfaced as a citation/UI label only (T13-D3).
 */
export type EquipmentType =
  | "FURNACE"
  | "AC"
  | "HEAT_PUMP"
  | "BOILER"
  | "WATER_HEATER"
  | "THERMOSTAT"
  | "DUCTLESS_MINI_SPLIT"
  | "REFRIGERATION"
  | "GENERAL";

// ---------------------------------------------------------------------------
// DTOs — mirror the BE records / DTOs exactly
// ---------------------------------------------------------------------------

/**
 * One cited source doc from a grounded answer.
 * Maps to: AskResponse.Citation (module/techcopilot/controller/dto/AskResponse.java)
 *
 * Fields (all 5, in declaration order):
 *   techDocId, techDocTitle, equipmentType, contentPreview, score
 */
export interface Citation {
  /** The TechDoc this chunk came from. */
  techDocId: string;
  /** The human-readable doc title (e.g. "Carrier 58STA Furnace — Service Manual"). */
  techDocTitle: string;
  /** The equipment category label (e.g. "FURNACE"). */
  equipmentType: string;
  /** A short snippet from the grounding chunk (for the citation chip preview). */
  contentPreview: string;
  /** Cosine-similarity score in [0,1] — higher = more relevant. */
  score: number;
}

/**
 * The grounded, cited answer (or the honest handoff) to a technician's question.
 * Maps to: AskResponse (module/techcopilot/controller/dto/AskResponse.java)
 *
 * Fields (all 4, in declaration order):
 *   answer, handoff, citations[], queryId
 */
export interface AskResponse {
  /**
   * The grounded answer text when !handoff; the "not documented" handoff line
   * when handoff=true. Never a fabricated procedure.
   */
  answer: string;
  /**
   * true when nothing in the corpus grounded the question — the corpus
   * genuinely does not document an answer. Citations is empty on a handoff.
   */
  handoff: boolean;
  /** The source doc(s) the answer was grounded in (empty on a handoff). */
  citations: Citation[];
  /** The persisted TechQuery id — the target for feedback. */
  queryId: string;
}

/**
 * A persisted Q&A log entry (also the feedback target).
 * Maps to: TechQuery (module/techcopilot/model/TechQuery.java)
 *
 * Fields (all 10, in declaration order):
 *   id, tenantId, question, equipmentTypeHint,
 *   answer, handoff, citations[], helpful, version, createdAt, updatedAt
 */
export interface TechQuery {
  /** The persisted TechQuery id. */
  id: string;
  /** The tenant this query belongs to. */
  tenantId: string;
  /** The technician's question text. */
  question: string;
  /** Optional equipment hint the tech supplied (a UI label; not a retrieval restriction). */
  equipmentTypeHint: string | null;
  /** The grounded answer text; null on a handoff. */
  answer: string | null;
  /** True when there was nothing to ground on. */
  handoff: boolean;
  /** The source docs the answer was grounded in (empty on a handoff). */
  citations: TechQueryCitation[];
  /**
   * Tech feedback on usefulness: true=helpful, false=not, null=not yet rated.
   */
  helpful: boolean | null;
  /** Optimistic-lock version. */
  version: number | null;
  /** When the query was persisted (ISO string). */
  createdAt: string;
  /** When the query was last updated (ISO string). */
  updatedAt: string;
}

/**
 * One cited source doc carried through from RAG chunk metadata.
 * Maps to: TechQuery.QueryCitation (module/techcopilot/model/TechQuery.java)
 *
 * Fields (all 5, in declaration order):
 *   techDocId, techDocTitle, equipmentType, contentPreview, score
 */
export interface TechQueryCitation {
  techDocId: string;
  techDocTitle: string;
  equipmentType: string;
  contentPreview: string;
  score: number;
}

/**
 * One document in a tenant's field-tech corpus.
 * Maps to: TechDoc (module/techcopilot/model/TechDoc.java)
 *
 * Fields (all 10, in declaration order):
 *   id, tenantId, title, equipmentType, source,
 *   text, chunkCount, indexedAt, version, createdAt, updatedAt
 */
export interface TechDoc {
  /** The TechDoc document id. */
  id: string;
  /** The tenant this doc belongs to. */
  tenantId: string;
  /** Human-friendly doc title (e.g. "Carrier 58STA Furnace — Installation & Service Manual"). */
  title: string;
  /** The coarse equipment category (default GENERAL). */
  equipmentType: EquipmentType;
  /** Optional provenance note (manufacturer / model / SOP id / URL). */
  source: string | null;
  /** The full document text — the grounding corpus; chunked + embedded on save. */
  text: string;
  /** Number of chunks currently embedded (0 until indexed). */
  chunkCount: number;
  /** When the text was last chunked + embedded (null if not yet indexed). */
  indexedAt: string | null;
  /** Optimistic-lock version. */
  version: number | null;
  /** When the doc was created (ISO string). */
  createdAt: string;
  /** When the doc was last updated (ISO string). */
  updatedAt: string;
}

/**
 * The request body for creating or updating a TechDoc.
 * Maps to: TechDocController.TechDocRequest (module/techcopilot/controller/TechDocController.java)
 *
 * Fields (all 4, in declaration order):
 *   title, equipmentType, source, text
 */
export interface TechDocRequest {
  /** Required on create (4491 if blank). */
  title: string;
  /** One of the EquipmentType names; unknown/blank → GENERAL. */
  equipmentType?: string | null;
  /** Optional provenance note. */
  source?: string | null;
  /** The full document text — required on create (4491 if blank). */
  text: string;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Ask the Tech Copilot a question — grounded Q&A against the tenant corpus.
 * Returns a cited answer, or handoff=true + empty citations when the question
 * is not documented.
 *
 * Maps to: POST /techcopilot/ask
 * Controller: TechCopilotController @PostMapping("/ask") (method ask())
 */
export function askCopilot(
  client: CrmClient,
  question: string,
  equipmentType?: string | null,
): Promise<AskResponse> {
  return client.api<AskResponse>("/techcopilot/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, equipmentType: equipmentType ?? null }),
  });
}

/**
 * List recent Q&A queries for this tenant (newest first).
 *
 * Maps to: GET /techcopilot/queries
 * Controller: TechCopilotController @GetMapping("/queries") (method recentQueries())
 */
export function listQueries(client: CrmClient): Promise<TechQuery[]> {
  return client.api<TechQuery[]>("/techcopilot/queries");
}

/**
 * Submit usefulness feedback for a persisted query.
 * helpful=true → answer was useful; helpful=false → not useful.
 * Returns the updated TechQuery (4495 if helpful is null).
 *
 * Maps to: POST /techcopilot/queries/{id}/feedback
 * Controller: TechCopilotController @PostMapping("/queries/{id}/feedback") (method feedback())
 */
export function submitFeedback(
  client: CrmClient,
  queryId: string,
  helpful: boolean,
): Promise<TechQuery> {
  return client.api<TechQuery>(
    `/techcopilot/queries/${encodeURIComponent(queryId)}/feedback`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ helpful }),
    },
  );
}

/**
 * Create a new TechDoc (manual / SOP / spec sheet) in the corpus.
 * Triggers chunk-and-embed ingest. Returns 4491 if title or text is blank.
 *
 * Maps to: POST /techcopilot/docs
 * Controller: TechDocController @PostMapping (method create())
 */
export function createDoc(
  client: CrmClient,
  body: TechDocRequest,
): Promise<TechDoc> {
  return client.api<TechDoc>("/techcopilot/docs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * List all TechDocs in the tenant corpus.
 *
 * Maps to: GET /techcopilot/docs
 * Controller: TechDocController @GetMapping (method list())
 */
export function listDocs(client: CrmClient): Promise<TechDoc[]> {
  return client.api<TechDoc[]>("/techcopilot/docs");
}

/**
 * Get a single TechDoc by id (4490/404 if not found).
 *
 * Maps to: GET /techcopilot/docs/{id}
 * Controller: TechDocController @GetMapping("/{id}") (method get())
 */
export function getDoc(client: CrmClient, id: string): Promise<TechDoc> {
  return client.api<TechDoc>(
    `/techcopilot/docs/${encodeURIComponent(id)}`,
  );
}

/**
 * Update an existing TechDoc (triggers re-chunk-and-embed).
 * Returns 4490/404 if absent; 4491/400 if title or text is blank.
 *
 * Maps to: PUT /techcopilot/docs/{id}
 * Controller: TechDocController @PutMapping("/{id}") (method update())
 */
export function updateDoc(
  client: CrmClient,
  id: string,
  body: TechDocRequest,
): Promise<TechDoc> {
  return client.api<TechDoc>(
    `/techcopilot/docs/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}
