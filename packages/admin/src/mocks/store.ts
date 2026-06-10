// In-memory store for the MSW-mocked backend. Reset per page load (lives in
// the service worker process). Grows phase-by-phase as more resources come
// online. Not exported to the prod bundle.

import type {
  StylerMatchResponse,
  StylerMatchAnalytics,
  RankedMatch,
} from "@kmosf/crm-components";
import type {
  ArAgingReport,
  MidnightResponderConfig,
  MidnightResponderLatencyStats,
  SwitchboardConfig,
  SwitchboardDeflectionStats,
  CallbackCardDTO,
  CallbackRecoveryStats,
  CallbackConfig,
  SalonReviewBoard,
  ReviewBoostConfig,
  QuoteInboxCard,
  QuoteResponse,
  PriceBook,
  StyleConsultInboxCard,
  StyleConsultResponse,
  StyleConsultAnalytics,
  ServiceRecommendation,
  RetailRecommendation,
  NurtureCampaign,
  NurtureCampaignAnalytics,
  SegmentationResult,
  FdNurtureCampaign,
  FdNurtureCampaignAnalytics,
  FdSegmentationResult,
  ProposalDraftResult,
  SowDraft,
  PromiseToPay,
  WaitlistEntry,
  WaitlistJoinRequest,
  RescheduleFillStats,
  ActivityDTO,
  Appointment,
  AuditEventDTO,
  BookSlotRequest,
  BookedMeeting,
  BookingPublicView,
  CallbackInboxItemDTO,
  CompanyDTO,
  ContactDTO,
  DraftedReply,
  FrontDeskScoringJob,
  RecallDueDTO,
  ContractorClientView,
  ContractorProjectView,
  ContractorTaskView,
  ConciergeConversationDetail as ConciergeConversationDetailDTO,
  ConciergeConversationSummary,
  Contract,
  ContractTemplate,
  Dashboard,
  GbpReviewReply,
  DealDTO,
  DisclosureRequest,
  Expense,
  FieldDefinition,
  FieldDiff,
  InboxMessage,
  InboxThread,
  Invoice,
  KnowledgeBaseArticle,
  Listing,
  ListingDisclosure,
  ListingMarketingDraft,
  ListingPhoto,
  MissedCallInboxItem,
  Milestone,
  Payment,
  PayoutPeriodLine,
  PayoutReport,
  PipelineStage,
  Project,
  ProjectAssignment,
  Quote,
  RecurringInvoice,
  RiskBooking,
  SavedReport,
  Task,
  TeamMember,
  TeamMemberRequest,
  TimeEntry,
  Timesheet,
  TimesheetStatus,
  TimesheetView,
  Ticket,
  TicketComment,
  User,
  WaitlistBoardDTO,
  WaitlistBoardEntry,
  WaitlistOffer,
} from "@kmosf/crm-components";
import type { components } from "@kmosf/crm-components";
import type {
  ListingPrepPack,
  SocialPost,
  PrepFairHousingFlag,
} from "@kmosf/crm-components";

type Attachment = components["schemas"]["Attachment"];

// The mock tenant's human business name. Mirrors the BE contract: surfaced on
// LoginResponse + /auth/me as `tenantName` (from Tenant.displayName) so the
// shell shows a real business name instead of a raw tenant UUID.
export const SMOKE_TENANT_NAME = "Bella Vita";

export const SMOKE_USER: User = {
  id: "11111111-1111-1111-1111-111111111111",
  tenantId: "22222222-2222-2222-2222-222222222222",
  email: "smoke@example.test",
  displayName: "Smoke User",
  tenantName: SMOKE_TENANT_NAME,
  roles: ["STAFF", "ADMIN"],
  status: "ACTIVE",
  version: 0,
  createdAt: "2026-05-14T00:00:00Z",
  updatedAt: "2026-05-14T00:00:00Z",
};

export const SMOKE_PASSWORD = "hunter2hunter2";
export const SMOKE_TOKEN = "msw-mock-jwt-token";

// STAFF-only user (no ADMIN role) — exercises role-gated nav and the
// admin-route redirect in smoke. Same tenant + password as SMOKE_USER.
export const SMOKE_STAFF_USER: User = {
  id: "33333333-3333-3333-3333-333333333333",
  tenantId: SMOKE_USER.tenantId,
  email: "staff@example.test",
  displayName: "Staff User",
  tenantName: SMOKE_TENANT_NAME,
  roles: ["STAFF"],
  status: "ACTIVE",
  version: 0,
  createdAt: "2026-05-14T00:00:00Z",
  updatedAt: "2026-05-14T00:00:00Z",
};

export const SMOKE_STAFF_TOKEN = "msw-mock-jwt-token-staff";

// Contractor user (STAFF + CONTRACTOR, no ADMIN) — exercises the scoped-down
// nav + the RequireNotContractor redirects in smoke. Same tenant + password.
export const SMOKE_CONTRACTOR_USER: User = {
  id: "99999999-9999-9999-9999-999999999999",
  tenantId: SMOKE_USER.tenantId,
  email: "contractor@example.test",
  displayName: "Jordan Rivera",
  tenantName: SMOKE_TENANT_NAME,
  roles: ["STAFF", "CONTRACTOR"],
  status: "ACTIVE",
  version: 0,
  createdAt: "2026-05-14T00:00:00Z",
  updatedAt: "2026-05-14T00:00:00Z",
};

export const SMOKE_CONTRACTOR_TOKEN = "msw-mock-jwt-token-contractor";

function uuid(): string {
  // Stable-enough UUID for mock state.
  return crypto.randomUUID();
}

// --- Contacts ---------------------------------------------------------------

const seedContact: ContactDTO = {
  id: "33333333-3333-3333-3333-333333333333",
  type: "PERSON",
  firstName: "Ada",
  lastName: "Lovelace",
  displayName: "Ada Lovelace",
  emails: ["ada@example.test"],
  phones: [{ number: "+1 555 0100", label: "work" }],
  addresses: [],
  tags: ["seed"],
};

const contacts = new Map<string, ContactDTO>([[seedContact.id!, seedContact]]);

export const contactStore = {
  list(): ContactDTO[] {
    return Array.from(contacts.values());
  },
  get(id: string): ContactDTO | undefined {
    return contacts.get(id);
  },
  create(input: ContactDTO): ContactDTO {
    const id = input.id ?? uuid();
    const created: ContactDTO = { ...input, id };
    contacts.set(id, created);
    return created;
  },
  update(id: string, input: ContactDTO): ContactDTO | undefined {
    if (!contacts.has(id)) return undefined;
    const updated: ContactDTO = { ...input, id };
    contacts.set(id, updated);
    return updated;
  },
  delete(id: string): boolean {
    return contacts.delete(id);
  },
};

// --- Companies --------------------------------------------------------------

const seedCompany: CompanyDTO = {
  id: "44444444-4444-4444-4444-444444444444",
  name: "Analytical Engines Ltd.",
  website: "https://analytical.example",
  industry: "Computing",
  addresses: [],
  tags: ["seed"],
};

const companies = new Map<string, CompanyDTO>([[seedCompany.id!, seedCompany]]);

export const companyStore = {
  list(): CompanyDTO[] {
    return Array.from(companies.values());
  },
  get(id: string): CompanyDTO | undefined {
    return companies.get(id);
  },
  create(input: CompanyDTO): CompanyDTO {
    const id = input.id ?? uuid();
    const created: CompanyDTO = { ...input, id };
    companies.set(id, created);
    return created;
  },
  update(id: string, input: CompanyDTO): CompanyDTO | undefined {
    if (!companies.has(id)) return undefined;
    const updated: CompanyDTO = { ...input, id };
    companies.set(id, updated);
    return updated;
  },
  delete(id: string): boolean {
    return companies.delete(id);
  },
};

// --- Deals ------------------------------------------------------------------

const seedDeal: DealDTO = {
  id: "55555555-5555-5555-5555-555555555555",
  title: "Analytical Engine retainer",
  stage: "QUALIFIED",
  value: 12000,
  currency: "USD",
  expectedCloseDate: "2026-08-01",
  primaryContactId: seedContact.id,
  companyId: seedCompany.id,
  lostReason: undefined,
};

const deals = new Map<string, DealDTO>([[seedDeal.id!, seedDeal]]);

export const dealStore = {
  list(): DealDTO[] {
    return Array.from(deals.values());
  },
  get(id: string): DealDTO | undefined {
    return deals.get(id);
  },
  create(input: DealDTO): DealDTO {
    const id = input.id ?? uuid();
    const created: DealDTO = { stage: "NEW", ...input, id };
    deals.set(id, created);
    return created;
  },
  update(id: string, input: DealDTO): DealDTO | undefined {
    if (!deals.has(id)) return undefined;
    const updated: DealDTO = { ...input, id };
    deals.set(id, updated);
    return updated;
  },
  delete(id: string): boolean {
    return deals.delete(id);
  },
  move(id: string, stage: PipelineStage, lostReason: string | undefined): DealDTO | undefined {
    const existing = deals.get(id);
    if (!existing) return undefined;
    if (stage === "LOST" && !lostReason?.trim()) return undefined;
    const updated: DealDTO = {
      ...existing,
      stage,
      lostReason: stage === "LOST" ? lostReason : undefined,
    };
    deals.set(id, updated);
    return updated;
  },
};

// --- Activities (timeline) --------------------------------------------------

const seedActivities: ActivityDTO[] = [
  {
    id: uuid(),
    type: "NOTE",
    direction: "INTERNAL",
    subjectType: "CONTACT",
    subjectId: seedContact.id,
    summary: "Initial outreach",
    body: "Seeded activity for the mock store.",
    occurredAt: "2026-05-13T15:00:00Z",
  },
];

const activities = new Map<string, ActivityDTO>(
  seedActivities.map((a) => [a.id!, a]),
);

// --- Public booking links (Phase 4 widget) ---------------------------------

// Three fake slots spread across the next 7 days at 10:00 / 14:00 / 11:00 UTC.
// The widget queries by [from, to] window; we return all three regardless to
// keep the smoke deterministic.
function nextSlot(daysAhead: number, hourUtc: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysAhead);
  d.setUTCHours(hourUtc, 0, 0, 0);
  return d.toISOString();
}

const bookingLinks = new Map<string, BookingPublicView>([
  [
    "smoke-intro-call",
    {
      slug: "smoke-intro-call",
      title: "Intro call with the team",
      description: "30-minute discovery sync.",
      durationMinutes: 30,
      timezone: "UTC",
      availableSlots: [nextSlot(1, 14), nextSlot(2, 10), nextSlot(3, 11)],
    },
  ],
]);

export const bookingStore = {
  view(slug: string): BookingPublicView | undefined {
    return bookingLinks.get(slug);
  },
  book(slug: string, req: BookSlotRequest): BookedMeeting | undefined {
    const link = bookingLinks.get(slug);
    if (!link) return undefined;
    if (!link.availableSlots.includes(req.slotStart)) return undefined;
    // Consume the slot so a second booking on the same slot 409s.
    link.availableSlots = link.availableSlots.filter((s) => s !== req.slotStart);
    const start = new Date(req.slotStart);
    const end = new Date(start.getTime() + link.durationMinutes * 60_000);
    return {
      id: uuid(),
      tenantId: SMOKE_USER.tenantId,
      name: link.title,
      description: req.notes,
      location: undefined,
      start: start.toISOString(),
      end: end.toISOString(),
    };
  },
  hasSlot(slug: string, slotStart: string): boolean {
    return !!bookingLinks.get(slug)?.availableSlots.includes(slotStart);
  },
};

// --- Quotes -----------------------------------------------------------------

export const SEED_QUOTE_DRAFT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
export const SEED_QUOTE_ACCEPTED_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab";

const seedQuote: Quote = {
  id: SEED_QUOTE_DRAFT_ID,
  tenantId: SMOKE_USER.tenantId,
  quoteNumber: "Q-0001",
  status: "DRAFT",
  currency: "USD",
  lineItems: [
    {
      description: "Website Design Package",
      quantity: 1,
      unitPrice: 2500,
      discountPercent: 0,
      taxPercent: 0,
      lineTotal: 2500,
    },
  ],
  subtotal: 2500,
  discountTotal: 0,
  taxTotal: 0,
  total: 2500,
  notes: "Seed quote for smoke tests.",
};

// Stable ACCEPTED quote used by convert-to-invoice smoke specs.
const seedAcceptedQuote: Quote = {
  id: SEED_QUOTE_ACCEPTED_ID,
  tenantId: SMOKE_USER.tenantId,
  quoteNumber: "Q-0002",
  status: "ACCEPTED",
  currency: "USD",
  lineItems: [
    {
      description: "SEO Retainer",
      quantity: 3,
      unitPrice: 500,
      discountPercent: 0,
      taxPercent: 0,
      lineTotal: 1500,
    },
    {
      description: "Content Writing",
      quantity: 5,
      unitPrice: 200,
      discountPercent: 0,
      taxPercent: 0,
      lineTotal: 1000,
    },
  ],
  subtotal: 2500,
  discountTotal: 0,
  taxTotal: 0,
  total: 2500,
  statusChangedAt: "2026-06-01T00:00:00Z",
};

const quotes = new Map<string, Quote>([
  [seedQuote.id!, seedQuote],
  [seedAcceptedQuote.id!, seedAcceptedQuote],
]);

export const quoteStore = {
  list(): Quote[] {
    return Array.from(quotes.values());
  },
  get(id: string): Quote | undefined {
    return quotes.get(id);
  },
  create(input: Quote): Quote {
    const id = input.id ?? uuid();
    const created: Quote = {
      ...input,
      id,
      tenantId: SMOKE_USER.tenantId,
      quoteNumber: `Q-${String(quotes.size + 1).padStart(4, "0")}`,
      status: "DRAFT",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    quotes.set(id, created);
    return created;
  },
  update(id: string, input: Quote): Quote | undefined {
    if (!quotes.has(id)) return undefined;
    const updated: Quote = { ...quotes.get(id), ...input, id };
    quotes.set(id, updated);
    return updated;
  },
  delete(id: string): boolean {
    return quotes.delete(id);
  },
  changeStatus(id: string, target: string): Quote | undefined {
    const existing = quotes.get(id);
    if (!existing) return undefined;
    const updated: Quote = {
      ...existing,
      status: target as Quote["status"],
      statusChangedAt: new Date().toISOString(),
    };
    quotes.set(id, updated);
    return updated;
  },
};

// --- Invoices ---------------------------------------------------------------

const seedInvoice: Invoice = {
  id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  tenantId: SMOKE_USER.tenantId,
  invoiceNumber: "INV-0001",
  status: "SENT",
  currency: "USD",
  lineItems: [
    {
      description: "Website Design Package",
      quantity: 1,
      unitPrice: 2500,
      discountPercent: 0,
      taxPercent: 0,
      lineTotal: 2500,
    },
  ],
  subtotal: 2500,
  discountTotal: 0,
  taxTotal: 0,
  total: 2500,
  balance: 2500,
};

const invoices = new Map<string, Invoice>([[seedInvoice.id!, seedInvoice]]);
const paymentsByInvoice = new Map<string, Payment[]>([
  [seedInvoice.id!, []],
]);

export const invoiceStore = {
  list(): Invoice[] {
    return Array.from(invoices.values());
  },
  get(id: string): Invoice | undefined {
    return invoices.get(id);
  },
  create(input: Invoice): Invoice {
    const id = input.id ?? uuid();
    const created: Invoice = {
      ...input,
      id,
      tenantId: SMOKE_USER.tenantId,
      // Preserve caller-supplied invoiceNumber / status (e.g. AR seed invoices)
      // so seeded OVERDUE invoices show up in the AR invoice picker.
      invoiceNumber: input.invoiceNumber ?? `INV-${String(invoices.size + 1).padStart(4, "0")}`,
      status: input.status ?? "DRAFT",
      balance: input.balance ?? input.total ?? 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    invoices.set(id, created);
    paymentsByInvoice.set(id, []);
    return created;
  },
  createFromQuote(quote: Quote): Invoice {
    const id = uuid();
    const created: Invoice = {
      id,
      tenantId: SMOKE_USER.tenantId,
      quoteId: quote.id,
      invoiceNumber: `INV-${String(invoices.size + 1).padStart(4, "0")}`,
      status: "DRAFT",
      currency: quote.currency ?? "USD",
      lineItems: quote.lineItems ?? [],
      subtotal: quote.subtotal ?? 0,
      discountTotal: quote.discountTotal ?? 0,
      taxTotal: quote.taxTotal ?? 0,
      total: quote.total ?? 0,
      balance: quote.total ?? 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    invoices.set(id, created);
    paymentsByInvoice.set(id, []);
    return created;
  },
  delete(id: string): boolean {
    paymentsByInvoice.delete(id);
    return invoices.delete(id);
  },
  changeStatus(id: string, target: string): Invoice | undefined {
    const existing = invoices.get(id);
    if (!existing) return undefined;
    const updated: Invoice = {
      ...existing,
      status: target as Invoice["status"],
      statusChangedAt: new Date().toISOString(),
    };
    invoices.set(id, updated);
    return updated;
  },
  listPayments(invoiceId: string): Payment[] {
    return paymentsByInvoice.get(invoiceId) ?? [];
  },
  recordPayment(invoiceId: string, payment: Payment): Payment | undefined {
    const invoice = invoices.get(invoiceId);
    if (!invoice) return undefined;
    const id = uuid();
    const created: Payment = {
      ...payment,
      id,
      tenantId: SMOKE_USER.tenantId,
      invoiceId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const existing = paymentsByInvoice.get(invoiceId) ?? [];
    paymentsByInvoice.set(invoiceId, [...existing, created]);
    // Update balance
    const newBalance = (invoice.balance ?? invoice.total ?? 0) - (payment.amount ?? 0);
    const updated: Invoice = {
      ...invoice,
      balance: Math.max(0, newBalance),
      status: newBalance <= 0 ? "PAID" : "PARTIALLY_PAID",
    };
    invoices.set(invoiceId, updated);
    return created;
  },
};

// --- Tickets ----------------------------------------------------------------

const seedTicket: Ticket = {
  id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
  tenantId: SMOKE_USER.tenantId,
  subject: "Website contact form not working",
  body: "The contact form on the homepage returns a 500 error.",
  status: "OPEN",
  priority: "HIGH",
  slaResponseDue: new Date(Date.now() + 2 * 3600_000).toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const tickets = new Map<string, Ticket>([[seedTicket.id!, seedTicket]]);
const commentsByTicket = new Map<string, TicketComment[]>([[seedTicket.id!, []]]);

export const ticketStore = {
  list(): Ticket[] {
    return Array.from(tickets.values());
  },
  get(id: string): Ticket | undefined {
    return tickets.get(id);
  },
  create(input: Ticket): Ticket {
    const id = uuid();
    const created: Ticket = {
      ...input,
      id,
      tenantId: SMOKE_USER.tenantId,
      status: "NEW",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    tickets.set(id, created);
    commentsByTicket.set(id, []);
    return created;
  },
  update(id: string, input: Ticket): Ticket | undefined {
    if (!tickets.has(id)) return undefined;
    const updated: Ticket = { ...tickets.get(id), ...input, id };
    tickets.set(id, updated);
    return updated;
  },
  delete(id: string): boolean {
    commentsByTicket.delete(id);
    return tickets.delete(id);
  },
  transition(id: string, target: string): Ticket | undefined {
    const existing = tickets.get(id);
    if (!existing) return undefined;
    const updated: Ticket = {
      ...existing,
      status: target as Ticket["status"],
      resolvedAt: target === "RESOLVED" ? new Date().toISOString() : existing.resolvedAt,
      updatedAt: new Date().toISOString(),
    };
    tickets.set(id, updated);
    return updated;
  },
  listComments(ticketId: string): TicketComment[] {
    return commentsByTicket.get(ticketId) ?? [];
  },
  addComment(ticketId: string, body: string): TicketComment | undefined {
    if (!tickets.has(ticketId)) return undefined;
    const comment: TicketComment = {
      id: uuid(),
      tenantId: SMOKE_USER.tenantId,
      ticketId,
      authorUserId: SMOKE_USER.id,
      body,
      createdAt: new Date().toISOString(),
    };
    const existing = commentsByTicket.get(ticketId) ?? [];
    commentsByTicket.set(ticketId, [...existing, comment]);
    return comment;
  },
};

// --- Knowledge Base ---------------------------------------------------------

const seedArticles: KnowledgeBaseArticle[] = [
  {
    id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
    tenantId: SMOKE_USER.tenantId,
    title: "How to reset your password",
    body: "Visit the login page and click 'Forgot password' to get a reset link.",
    tags: ["authentication", "account"],
    slug: "how-to-reset-password",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const kbArticles = new Map<string, KnowledgeBaseArticle>(
  seedArticles.map((a) => [a.id!, a]),
);

export const kbStore = {
  list(): KnowledgeBaseArticle[] {
    return Array.from(kbArticles.values());
  },
  get(id: string): KnowledgeBaseArticle | undefined {
    return kbArticles.get(id);
  },
  create(input: KnowledgeBaseArticle): KnowledgeBaseArticle {
    const id = uuid();
    const created: KnowledgeBaseArticle = {
      ...input,
      id,
      tenantId: SMOKE_USER.tenantId,
      slug: input.slug ?? input.title?.toLowerCase().replace(/\s+/g, "-") ?? id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    kbArticles.set(id, created);
    return created;
  },
  update(id: string, input: KnowledgeBaseArticle): KnowledgeBaseArticle | undefined {
    if (!kbArticles.has(id)) return undefined;
    const updated: KnowledgeBaseArticle = { ...kbArticles.get(id), ...input, id };
    kbArticles.set(id, updated);
    return updated;
  },
  delete(id: string): boolean {
    return kbArticles.delete(id);
  },
  publish(id: string): KnowledgeBaseArticle | undefined {
    const existing = kbArticles.get(id);
    if (!existing) return undefined;
    const updated: KnowledgeBaseArticle = {
      ...existing,
      publishedAt: new Date().toISOString(),
    };
    kbArticles.set(id, updated);
    return updated;
  },
  search(query: string): KnowledgeBaseArticle[] {
    const q = query.toLowerCase();
    return Array.from(kbArticles.values()).filter(
      (a) =>
        a.title?.toLowerCase().includes(q) ||
        a.body?.toLowerCase().includes(q) ||
        (a.tags ?? []).some((t) => t.toLowerCase().includes(q)),
    );
  },
};

// --- Inbox ------------------------------------------------------------------

const SEED_THREAD_ID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";

const seedThread: InboxThread = {
  id: SEED_THREAD_ID,
  tenantId: SMOKE_USER.tenantId,
  fromAddress: "client@example.test",
  subjectNormalized: "Question about the proposal",
  firstMessageAt: new Date().toISOString(),
  lastMessageAt: new Date().toISOString(),
  messageCount: 1,
  status: "UNCLAIMED",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const seedMessage: InboxMessage = {
  id: uuid(),
  tenantId: SMOKE_USER.tenantId,
  threadId: SEED_THREAD_ID,
  messageId: "msg-001",
  from: "client@example.test",
  to: ["support@kmosf.example"],
  subject: "Question about the proposal",
  textBody: "Hi, I had some questions about the proposal you sent over.",
  receivedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const inboxThreads = new Map<string, InboxThread>([[seedThread.id!, seedThread]]);
const inboxMessages = new Map<string, InboxMessage[]>([
  [SEED_THREAD_ID, [seedMessage]],
]);

export const inboxStore = {
  listThreads(): InboxThread[] {
    return Array.from(inboxThreads.values());
  },
  getThread(id: string): InboxThread | undefined {
    return inboxThreads.get(id);
  },
  claimThread(id: string): InboxThread | undefined {
    const existing = inboxThreads.get(id);
    if (!existing) return undefined;
    const updated: InboxThread = {
      ...existing,
      status: "CLAIMED",
      claimedByUserId: SMOKE_USER.id,
      updatedAt: new Date().toISOString(),
    };
    inboxThreads.set(id, updated);
    return updated;
  },
  listMessages(threadId: string): InboxMessage[] {
    return inboxMessages.get(threadId) ?? [];
  },
  replyToThread(threadId: string, body: string): InboxMessage | undefined {
    const thread = inboxThreads.get(threadId);
    if (!thread) return undefined;
    const msg: InboxMessage = {
      id: uuid(),
      tenantId: SMOKE_USER.tenantId,
      threadId,
      messageId: `reply-${Date.now()}`,
      from: SMOKE_USER.email,
      to: [thread.fromAddress ?? ""],
      subject: `Re: ${thread.subjectNormalized ?? ""}`,
      textBody: body,
      receivedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const existing = inboxMessages.get(threadId) ?? [];
    inboxMessages.set(threadId, [...existing, msg]);
    const updatedThread: InboxThread = {
      ...thread,
      messageCount: (thread.messageCount ?? 1) + 1,
      lastMessageAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    inboxThreads.set(threadId, updatedThread);
    return msg;
  },
};

// --- Field Definitions ------------------------------------------------------

const seedFieldDef: FieldDefinition = {
  id: "ffffffff-ffff-ffff-ffff-ffffffffffff",
  tenantId: SMOKE_USER.tenantId,
  entityType: "CONTACT",
  key: "preferred_contact_method",
  label: "Preferred Contact Method",
  type: "TEXT",
  required: false,
  visibilityRoles: ["STAFF", "ADMIN"],
  version: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const fieldDefs = new Map<string, FieldDefinition>([[seedFieldDef.id!, seedFieldDef]]);

export const fieldDefStore = {
  list(): FieldDefinition[] {
    return Array.from(fieldDefs.values());
  },
  get(id: string): FieldDefinition | undefined {
    return fieldDefs.get(id);
  },
  create(input: FieldDefinition): FieldDefinition {
    const id = uuid();
    const created: FieldDefinition = {
      ...input,
      id,
      tenantId: SMOKE_USER.tenantId,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    fieldDefs.set(id, created);
    return created;
  },
  update(id: string, input: FieldDefinition): FieldDefinition | undefined {
    if (!fieldDefs.has(id)) return undefined;
    const updated: FieldDefinition = {
      ...fieldDefs.get(id),
      ...input,
      id,
      version: (fieldDefs.get(id)?.version ?? 1) + 1,
      updatedAt: new Date().toISOString(),
    };
    fieldDefs.set(id, updated);
    return updated;
  },
  delete(id: string): boolean {
    return fieldDefs.delete(id);
  },
};

export const activityStore = {
  list(): ActivityDTO[] {
    return Array.from(activities.values());
  },
  forSubject(subjectType: ActivityDTO["subjectType"], subjectId: string): ActivityDTO[] {
    return Array.from(activities.values())
      .filter((a) => a.subjectType === subjectType && a.subjectId === subjectId)
      .sort((a, b) => (b.occurredAt ?? "").localeCompare(a.occurredAt ?? ""));
  },
  add(input: ActivityDTO): ActivityDTO {
    const id = input.id ?? uuid();
    const created: ActivityDTO = {
      ...input,
      id,
      occurredAt: input.occurredAt ?? new Date().toISOString(),
    };
    activities.set(id, created);
    return created;
  },
  get(id: string): ActivityDTO | undefined {
    return activities.get(id);
  },
  update(id: string, input: ActivityDTO): ActivityDTO | undefined {
    if (!activities.has(id)) return undefined;
    const updated: ActivityDTO = { ...input, id };
    activities.set(id, updated);
    return updated;
  },
  delete(id: string): boolean {
    return activities.delete(id);
  },
};

// --- Audit Events -----------------------------------------------------------

const SMOKE_CONTACT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"; // same as quoteStore seed contact ref

const seedAuditEvent: AuditEventDTO = {
  id: "a0000000-a000-a000-a000-a00000000001",
  actorUserId: SMOKE_USER.id,
  entityType: "CONTACT",
  entityId: SMOKE_CONTACT_ID,
  op: "UPDATE",
  fieldDiffs: [
    { field: "firstName", before: "John" as unknown, after: "Jonathan" as unknown } as FieldDiff,
  ],
  at: "2026-05-15T10:00:00Z",
  requestId: "req-001",
};

const auditEvents: AuditEventDTO[] = [seedAuditEvent];

export const auditStore = {
  listForEntity(entityType: string, entityId: string): AuditEventDTO[] {
    return auditEvents
      .filter((e) => e.entityType === entityType && e.entityId === entityId)
      .sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));
  },
  listByActor(userId: string): AuditEventDTO[] {
    return auditEvents
      .filter((e) => e.actorUserId === userId)
      .sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));
  },
  add(event: AuditEventDTO): void {
    auditEvents.push(event);
  },
};

// --- Reports / Dashboards ---------------------------------------------------

const seedSavedReport: SavedReport = {
  id: "b0000000-b000-b000-b000-b00000000001",
  tenantId: SMOKE_USER.tenantId,
  name: "Open Deals by Stage",
  description: "Count of open deals grouped by pipeline stage",
  entityType: "DEAL",
  filterTree: [],
  groupBy: ["stage"],
  aggregations: [],
  chartHint: "BAR",
  version: 1,
  createdAt: "2026-05-14T00:00:00Z",
  updatedAt: "2026-05-14T00:00:00Z",
};

const savedReports = new Map<string, SavedReport>([[seedSavedReport.id!, seedSavedReport]]);

export const savedReportStore = {
  list(): SavedReport[] {
    return Array.from(savedReports.values());
  },
  get(id: string): SavedReport | undefined {
    return savedReports.get(id);
  },
  create(input: SavedReport): SavedReport {
    const id = uuid();
    const created: SavedReport = {
      ...input,
      id,
      tenantId: SMOKE_USER.tenantId,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    savedReports.set(id, created);
    return created;
  },
  update(id: string, input: SavedReport): SavedReport | undefined {
    if (!savedReports.has(id)) return undefined;
    const updated: SavedReport = {
      ...savedReports.get(id),
      ...input,
      id,
      version: (savedReports.get(id)?.version ?? 1) + 1,
      updatedAt: new Date().toISOString(),
    };
    savedReports.set(id, updated);
    return updated;
  },
  delete(id: string): boolean {
    return savedReports.delete(id);
  },
};

const seedDashboard: Dashboard = {
  id: "c0000000-c000-c000-c000-c00000000001",
  tenantId: SMOKE_USER.tenantId,
  name: "Sales Overview",
  description: "Key metrics for the sales team",
  items: [
    { savedReportId: seedSavedReport.id, gridX: 0, gridY: 0, gridW: 6, gridH: 4 },
  ],
  version: 1,
  createdAt: "2026-05-14T00:00:00Z",
  updatedAt: "2026-05-14T00:00:00Z",
};

const dashboards = new Map<string, Dashboard>([[seedDashboard.id!, seedDashboard]]);

export const dashboardStore = {
  list(): Dashboard[] {
    return Array.from(dashboards.values());
  },
  get(id: string): Dashboard | undefined {
    return dashboards.get(id);
  },
  create(input: Dashboard): Dashboard {
    const id = uuid();
    const created: Dashboard = {
      ...input,
      id,
      tenantId: SMOKE_USER.tenantId,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dashboards.set(id, created);
    return created;
  },
  update(id: string, input: Dashboard): Dashboard | undefined {
    if (!dashboards.has(id)) return undefined;
    const updated: Dashboard = {
      ...dashboards.get(id),
      ...input,
      id,
      version: (dashboards.get(id)?.version ?? 1) + 1,
      updatedAt: new Date().toISOString(),
    };
    dashboards.set(id, updated);
    return updated;
  },
  delete(id: string): boolean {
    return dashboards.delete(id);
  },
};

// --- Projects / Milestones / Tasks (Phase C) ---------------------------------

// Seed IDs (stable, predictable for smoke specs)
export const SEED_PROJECT_ID = "p0000000-0000-0000-0000-000000000001";
export const SEED_MILESTONE_ID = "m0000000-0000-0000-0000-000000000001";
export const SEED_TASK_TODO_ID = "t0000000-0000-0000-0000-000000000001";
export const SEED_TASK_IN_PROGRESS_ID = "t0000000-0000-0000-0000-000000000002";
export const SEED_TASK_DONE_ID = "t0000000-0000-0000-0000-000000000003";

// Seed deal for conversion testing (WON stage)
export const SEED_WON_DEAL_ID = "55555555-5555-5555-5555-555555555556";
const seedWonDeal: DealDTO = {
  id: SEED_WON_DEAL_ID,
  title: "WON deal for conversion",
  stage: "WON",
  value: 5000,
  currency: "USD",
  primaryContactId: "33333333-3333-3333-3333-333333333333",
  companyId: "44444444-4444-4444-4444-444444444444",
};
// Add won deal to the deal store
deals.set(SEED_WON_DEAL_ID, seedWonDeal);

const seedProject: Project = {
  id: SEED_PROJECT_ID,
  tenantId: SMOKE_USER.tenantId,
  code: "PRJ-2026-001",
  name: "Website Redesign",
  status: "ACTIVE",
  description: "Full redesign of the public-facing website.",
  startDate: "2026-05-01",
  targetEndDate: "2026-08-31",
  // Linked client refs so the contractor's read-only Client card resolves
  // (primaryContactId → seedContact "Ada Lovelace", companyId → seedCompany).
  primaryContactId: "33333333-3333-3333-3333-333333333333",
  companyId: "44444444-4444-4444-4444-444444444444",
  autoFinalizeMilestoneInvoices: false,
  createdAt: "2026-05-01T00:00:00Z",
  updatedAt: "2026-05-01T00:00:00Z",
};

const seedMilestone: Milestone = {
  id: SEED_MILESTONE_ID,
  tenantId: SMOKE_USER.tenantId,
  projectId: SEED_PROJECT_ID,
  name: "Design phase complete",
  status: "PENDING",
  triggersInvoiceOnComplete: true,
  invoiceLineItems: [
    {
      description: "Design work",
      quantity: 1,
      unitPrice: 1500,
      discountPercent: 0,
      taxPercent: 0,
      lineTotal: 1500,
    },
  ],
  orderIndex: 0,
  createdAt: "2026-05-01T00:00:00Z",
  updatedAt: "2026-05-01T00:00:00Z",
};

const seedTasks: Task[] = [
  {
    id: SEED_TASK_TODO_ID,
    tenantId: SMOKE_USER.tenantId,
    projectId: SEED_PROJECT_ID,
    title: "Gather requirements",
    status: "TODO",
    priority: "HIGH",
    orderIndex: 0,
    createdAt: "2026-05-01T00:00:00Z",
    updatedAt: "2026-05-01T00:00:00Z",
  },
  {
    id: SEED_TASK_IN_PROGRESS_ID,
    tenantId: SMOKE_USER.tenantId,
    projectId: SEED_PROJECT_ID,
    title: "Create wireframes",
    status: "IN_PROGRESS",
    priority: "MEDIUM",
    orderIndex: 0,
    createdAt: "2026-05-01T00:00:00Z",
    updatedAt: "2026-05-01T00:00:00Z",
  },
  {
    id: SEED_TASK_DONE_ID,
    tenantId: SMOKE_USER.tenantId,
    projectId: SEED_PROJECT_ID,
    title: "Project kickoff meeting",
    status: "DONE",
    priority: "LOW",
    orderIndex: 0,
    createdAt: "2026-05-01T00:00:00Z",
    updatedAt: "2026-05-01T00:00:00Z",
  },
];

const projects = new Map<string, Project>([[seedProject.id!, seedProject]]);
const milestones = new Map<string, Milestone>([[seedMilestone.id!, seedMilestone]]);
const tasks = new Map<string, Task>(seedTasks.map((t) => [t.id!, t]));

export const projectStore = {
  list(): Project[] {
    return Array.from(projects.values());
  },
  get(id: string): Project | undefined {
    return projects.get(id);
  },
  create(input: Project): Project {
    const id = input.id ?? uuid();
    const year = new Date().getFullYear();
    const seq = projects.size + 1;
    const code = `PRJ-${year}-${String(seq).padStart(3, "0")}`;
    const created: Project = {
      ...input,
      id,
      tenantId: SMOKE_USER.tenantId,
      code: input.code ?? code,
      status: "PLANNING",
      autoFinalizeMilestoneInvoices: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    projects.set(id, created);
    return created;
  },
  update(id: string, input: Project): Project | undefined {
    if (!projects.has(id)) return undefined;
    const updated: Project = { ...projects.get(id), ...input, id };
    projects.set(id, updated);
    return updated;
  },
  delete(id: string): boolean {
    return projects.delete(id);
  },
  changeStatus(id: string, target: string): Project | undefined {
    const existing = projects.get(id);
    if (!existing) return undefined;
    const updated: Project = {
      ...existing,
      status: target as Project["status"],
      updatedAt: new Date().toISOString(),
    };
    projects.set(id, updated);
    return updated;
  },
  findByDealId(dealId: string): Project | undefined {
    return Array.from(projects.values()).find((p) => p.dealId === dealId);
  },
  createFromDeal(deal: DealDTO): Project {
    const id = uuid();
    const year = new Date().getFullYear();
    const seq = projects.size + 1;
    const code = `PRJ-${year}-${String(seq).padStart(3, "0")}`;
    const created: Project = {
      id,
      tenantId: SMOKE_USER.tenantId,
      code,
      name: `Project from: ${deal.title ?? "Untitled deal"}`,
      status: "PLANNING",
      dealId: deal.id,
      primaryContactId: deal.primaryContactId,
      companyId: deal.companyId,
      ownerId: deal.ownerId,
      autoFinalizeMilestoneInvoices: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    projects.set(id, created);
    return created;
  },
};

export const milestoneStore = {
  listByProject(projectId: string): Milestone[] {
    return Array.from(milestones.values())
      .filter((m) => m.projectId === projectId)
      .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  },
  get(id: string): Milestone | undefined {
    return milestones.get(id);
  },
  create(projectId: string, input: Milestone): Milestone {
    const id = uuid();
    const created: Milestone = {
      ...input,
      id,
      tenantId: SMOKE_USER.tenantId,
      projectId,
      status: "PENDING",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    milestones.set(id, created);
    return created;
  },
  update(id: string, input: Milestone): Milestone | undefined {
    if (!milestones.has(id)) return undefined;
    const updated: Milestone = { ...milestones.get(id), ...input, id };
    milestones.set(id, updated);
    return updated;
  },
  delete(id: string): boolean {
    return milestones.delete(id);
  },
  complete(id: string): Milestone | undefined {
    const existing = milestones.get(id);
    if (!existing) return undefined;
    // Idempotent: already spawned → just return COMPLETED
    const spawnedInvoiceId =
      existing.spawnedInvoiceId ??
      (existing.triggersInvoiceOnComplete ? uuid() : undefined);
    const updated: Milestone = {
      ...existing,
      status: "COMPLETED",
      completedAt: new Date().toISOString(),
      spawnedInvoiceId,
      updatedAt: new Date().toISOString(),
    };
    milestones.set(id, updated);
    return updated;
  },
};

export const taskStore2 = {
  listByProject(projectId: string): Task[] {
    return Array.from(tasks.values())
      .filter((t) => t.projectId === projectId)
      .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  },
  get(id: string): Task | undefined {
    return tasks.get(id);
  },
  create(projectId: string, input: Task): Task {
    const id = uuid();
    const created: Task = {
      ...input,
      id,
      tenantId: SMOKE_USER.tenantId,
      projectId,
      status: "TODO",
      priority: input.priority ?? "MEDIUM",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    tasks.set(id, created);
    return created;
  },
  update(id: string, input: Task): Task | undefined {
    if (!tasks.has(id)) return undefined;
    const updated: Task = { ...tasks.get(id), ...input, id };
    tasks.set(id, updated);
    return updated;
  },
  delete(id: string): boolean {
    return tasks.delete(id);
  },
  changeStatus(id: string, target: string): Task | undefined {
    const existing = tasks.get(id);
    if (!existing) return undefined;
    const updated: Task = {
      ...existing,
      status: target as Task["status"],
      completedAt: target === "DONE" ? new Date().toISOString() : existing.completedAt,
      updatedAt: new Date().toISOString(),
    };
    tasks.set(id, updated);
    return updated;
  },
};

// --- Time Entries / Expenses (Phase D) ----------------------------------------

// Stable seed IDs
export const SEED_TIME_ENTRY_UNBILLED_ID = "te000000-0000-0000-0000-000000000001";
export const SEED_TIME_ENTRY_RUNNING_PENDING_ID = ""; // no running timer in seed
// Deterministic Mon→Tue split fixture IDs
export const SEED_SPLIT_ENTRY_MON_ID = "te000000-0000-0000-0000-000000000002";
export const SEED_SPLIT_ENTRY_TUE_ID = "te000000-0000-0000-0000-000000000003";
export const SEED_SPLIT_GROUP_ID = "sg000000-0000-0000-0000-000000000001";
export const SEED_EXPENSE_PENDING_ID = "ex000000-0000-0000-0000-000000000001";

// Contractor-owned seed rows (Phase J2). The contractor (SMOKE_CONTRACTOR_USER)
// is assigned to SEED_PROJECT_ID; these are their OWN time entry + expense, so
// the scoped /me/contractor/** readers return something for them.
export const SEED_CONTRACTOR_TIME_ENTRY_ID = "te000000-0000-0000-0000-0000000000c1";
export const SEED_CONTRACTOR_EXPENSE_ID = "ex000000-0000-0000-0000-0000000000c1";

// Seed time entries: one unbilled billable entry + a deterministic Mon→Tue split pair
const MON_22 = "2026-05-11T22:00:00Z"; // Mon 22:00 UTC (also local for UTC zone)
const MON_MIDNIGHT = "2026-05-12T00:00:00Z"; // Tue 00:00 UTC boundary
const TUE_02 = "2026-05-12T02:00:00Z"; // Tue 02:00 UTC

const seedTimeEntries: TimeEntry[] = [
  {
    id: SEED_TIME_ENTRY_UNBILLED_ID,
    tenantId: SMOKE_USER.tenantId,
    userId: SMOKE_USER.id,
    projectId: SEED_PROJECT_ID,
    description: "Initial design work",
    startedAt: "2026-05-12T09:00:00Z",
    endedAt: "2026-05-12T10:30:00Z",
    durationSeconds: 5400,
    source: "MANUAL",
    billable: true,
    billingStatus: "UNBILLED",
    rateAmount: 100,
    createdAt: "2026-05-12T10:30:00Z",
    updatedAt: "2026-05-12T10:30:00Z",
  },
  // Mon→Tue split pair (shared splitGroupId)
  {
    id: SEED_SPLIT_ENTRY_MON_ID,
    tenantId: SMOKE_USER.tenantId,
    userId: SMOKE_USER.id,
    projectId: SEED_PROJECT_ID,
    description: "Late night session",
    startedAt: MON_22,
    endedAt: MON_MIDNIGHT,
    durationSeconds: 7200,
    source: "TIMER",
    billable: true,
    billingStatus: "UNBILLED",
    rateAmount: 100,
    splitGroupId: SEED_SPLIT_GROUP_ID,
    createdAt: MON_MIDNIGHT,
    updatedAt: MON_MIDNIGHT,
  },
  {
    id: SEED_SPLIT_ENTRY_TUE_ID,
    tenantId: SMOKE_USER.tenantId,
    userId: SMOKE_USER.id,
    projectId: SEED_PROJECT_ID,
    description: "Late night session",
    startedAt: MON_MIDNIGHT,
    endedAt: TUE_02,
    durationSeconds: 7200,
    source: "TIMER",
    billable: true,
    billingStatus: "UNBILLED",
    rateAmount: 100,
    splitGroupId: SEED_SPLIT_GROUP_ID,
    createdAt: TUE_02,
    updatedAt: TUE_02,
  },
  // Contractor's own time entry on their assigned project (same week as the
  // admin's unbilled entry above so the default weekly view shows it).
  {
    id: SEED_CONTRACTOR_TIME_ENTRY_ID,
    tenantId: SMOKE_USER.tenantId,
    userId: SMOKE_CONTRACTOR_USER.id,
    projectId: SEED_PROJECT_ID,
    description: "Contractor build session",
    startedAt: "2026-05-12T13:00:00Z",
    endedAt: "2026-05-12T15:00:00Z",
    durationSeconds: 7200,
    source: "MANUAL",
    billable: true,
    billingStatus: "UNBILLED",
    rateAmount: 150,
    createdAt: "2026-05-12T15:00:00Z",
    updatedAt: "2026-05-12T15:00:00Z",
  },
];

const timeEntries = new Map<string, TimeEntry>(
  seedTimeEntries.map((e) => [e.id!, e]),
);

// Running timer slot: null = no timer running
let runningTimerEntry: TimeEntry | null = null;

export const timeEntryStore = {
  list(): TimeEntry[] {
    return Array.from(timeEntries.values());
  },
  listByUser(userId: string): TimeEntry[] {
    return Array.from(timeEntries.values()).filter((e) => e.userId === userId);
  },
  listWeekly(userId: string, from: string, to: string): TimeEntry[] {
    const fromMs = new Date(from).getTime();
    const toMs = new Date(to).getTime();
    return Array.from(timeEntries.values()).filter((e) => {
      if (e.userId !== userId) return false;
      const started = new Date(e.startedAt ?? "").getTime();
      return started >= fromMs && started < toMs;
    });
  },
  get(id: string): TimeEntry | undefined {
    return timeEntries.get(id);
  },
  create(input: TimeEntry): TimeEntry {
    const id = input.id ?? uuid();
    const created: TimeEntry = {
      ...input,
      id,
      tenantId: SMOKE_USER.tenantId,
      userId: input.userId ?? SMOKE_USER.id,
      source: input.source ?? "MANUAL",
      billable: input.billable ?? true,
      billingStatus: "UNBILLED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    timeEntries.set(id, created);
    return created;
  },
  update(id: string, input: TimeEntry): TimeEntry | undefined {
    if (!timeEntries.has(id)) return undefined;
    const updated: TimeEntry = { ...timeEntries.get(id), ...input, id };
    timeEntries.set(id, updated);
    return updated;
  },
  delete(id: string): boolean {
    return timeEntries.delete(id);
  },
  getRunningTimer(): TimeEntry | null {
    return runningTimerEntry;
  },
  startTimer(input: TimeEntry): TimeEntry | { error: string; code: number } {
    if (runningTimerEntry !== null) {
      return { error: "A timer is already running for this user", code: 3505 };
    }
    const id = uuid();
    const entry: TimeEntry = {
      ...input,
      id,
      tenantId: SMOKE_USER.tenantId,
      userId: input.userId ?? SMOKE_USER.id,
      source: "TIMER",
      billable: input.billable ?? true,
      billingStatus: "UNBILLED",
      endedAt: undefined,
      durationSeconds: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    runningTimerEntry = entry;
    timeEntries.set(id, entry);
    return entry;
  },
  stopTimer(
    userId: string,
    endedAt?: string,
    _zoneId?: string,
  ): TimeEntry[] | { error: string; code: number } {
    if (runningTimerEntry === null) {
      return { error: "No timer running to stop", code: 3506 };
    }
    const stopped = { ...runningTimerEntry };
    const endInstant = endedAt ? new Date(endedAt) : new Date();
    const startInstant = new Date(stopped.startedAt ?? endInstant.toISOString());

    // Check if the session crosses a UTC-midnight boundary (deterministic split fixture)
    const startDay = new Date(startInstant);
    startDay.setUTCHours(0, 0, 0, 0);
    const endDay = new Date(endInstant);
    endDay.setUTCHours(0, 0, 0, 0);

    runningTimerEntry = null;

    if (startDay.getTime() === endDay.getTime()) {
      // Same day — no split
      const dur = Math.floor(
        (endInstant.getTime() - startInstant.getTime()) / 1000,
      );
      const closed: TimeEntry = {
        ...stopped,
        endedAt: endInstant.toISOString(),
        durationSeconds: dur,
        updatedAt: new Date().toISOString(),
      };
      timeEntries.set(stopped.id!, closed);
      return [closed];
    } else {
      // Spans midnight — produce split pair (Mon→Tue fixture)
      const splitGroupId = uuid();
      const midnight = new Date(endDay.toISOString()); // start of end-day = UTC midnight

      const segA: TimeEntry = {
        ...stopped,
        endedAt: midnight.toISOString(),
        durationSeconds: Math.floor(
          (midnight.getTime() - startInstant.getTime()) / 1000,
        ),
        splitGroupId,
        updatedAt: new Date().toISOString(),
      };
      timeEntries.set(stopped.id!, segA);

      const segBId = uuid();
      const segB: TimeEntry = {
        ...stopped,
        id: segBId,
        startedAt: midnight.toISOString(),
        endedAt: endInstant.toISOString(),
        durationSeconds: Math.floor(
          (endInstant.getTime() - midnight.getTime()) / 1000,
        ),
        splitGroupId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      timeEntries.set(segBId, segB);
      return [segA, segB];
    }

    void userId; // used by real BE; MSW ignores
  },
  createInvoiceFromTime(projectId?: string): Invoice | { error: string; code: number } {
    const candidates = Array.from(timeEntries.values()).filter(
      (e) =>
        e.billable &&
        e.billingStatus === "UNBILLED" &&
        e.endedAt != null &&
        (!projectId || e.projectId === projectId),
    );
    if (candidates.length === 0) {
      return { error: "No unbilled time entries to invoice", code: 3520 };
    }
    const invoiceId = uuid();
    const totalHours = candidates.reduce(
      (sum, e) => sum + (e.durationSeconds ?? 0) / 3600,
      0,
    );
    const unitPrice = candidates[0].rateAmount ?? 100;
    const invoice: Invoice = {
      id: invoiceId,
      tenantId: SMOKE_USER.tenantId,
      status: "DRAFT",
      projectId: projectId ?? candidates[0].projectId,
      currency: "USD",
      lineItems: [
        {
          description: "Time entries",
          quantity: Math.round(totalHours * 100) / 100,
          unitPrice,
          discountPercent: 0,
          taxPercent: 0,
          lineTotal: Math.round(totalHours * unitPrice * 100) / 100,
        },
      ],
      total: Math.round(totalHours * unitPrice * 100) / 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    // Mark entries as INVOICED
    for (const entry of candidates) {
      const marked: TimeEntry = {
        ...entry,
        billingStatus: "INVOICED",
        invoicedInvoiceId: invoiceId,
        updatedAt: new Date().toISOString(),
      };
      timeEntries.set(entry.id!, marked);
    }
    return invoice;
  },
};

// --- Expense store -----------------------------------------------------------

const seedExpense: Expense = {
  id: SEED_EXPENSE_PENDING_ID,
  tenantId: SMOKE_USER.tenantId,
  userId: SMOKE_USER.id,
  projectId: SEED_PROJECT_ID,
  description: "Client lunch",
  category: "MEALS",
  amount: 85,
  currency: "USD",
  incurredOn: "2026-05-12",
  markupPercent: 15,
  billable: true,
  approvalStatus: "PENDING",
  billingStatus: "UNBILLED",
  createdAt: "2026-05-12T12:00:00Z",
  updatedAt: "2026-05-12T12:00:00Z",
};

// Contractor's own seed expense on their assigned project.
const seedContractorExpense: Expense = {
  id: SEED_CONTRACTOR_EXPENSE_ID,
  tenantId: SMOKE_USER.tenantId,
  userId: SMOKE_CONTRACTOR_USER.id,
  projectId: SEED_PROJECT_ID,
  description: "Parking for client site visit",
  category: "TRAVEL",
  amount: 24,
  currency: "USD",
  incurredOn: "2026-05-12",
  markupPercent: 0,
  billable: true,
  approvalStatus: "PENDING",
  billingStatus: "UNBILLED",
  createdAt: "2026-05-12T16:00:00Z",
  updatedAt: "2026-05-12T16:00:00Z",
};

const expenses = new Map<string, Expense>([
  [seedExpense.id!, seedExpense],
  [seedContractorExpense.id!, seedContractorExpense],
]);

export const expenseStore = {
  list(): Expense[] {
    return Array.from(expenses.values());
  },
  get(id: string): Expense | undefined {
    return expenses.get(id);
  },
  create(input: Expense): Expense {
    const id = input.id ?? uuid();
    const created: Expense = {
      ...input,
      id,
      tenantId: SMOKE_USER.tenantId,
      userId: input.userId ?? SMOKE_USER.id,
      billable: input.billable ?? true,
      approvalStatus: "PENDING",
      billingStatus: "UNBILLED",
      currency: input.currency ?? "USD",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expenses.set(id, created);
    return created;
  },
  update(id: string, input: Expense): Expense | undefined {
    if (!expenses.has(id)) return undefined;
    const updated: Expense = { ...expenses.get(id), ...input, id };
    expenses.set(id, updated);
    return updated;
  },
  delete(id: string): boolean {
    return expenses.delete(id);
  },
  approve(id: string): Expense | { error: string; code: number } {
    const existing = expenses.get(id);
    if (!existing) return { error: "Expense not found", code: 3511 };
    if (existing.billingStatus === "INVOICED") {
      return { error: "Cannot decide an INVOICED expense", code: 3517 };
    }
    const updated: Expense = {
      ...existing,
      approvalStatus: "APPROVED",
      approvedByUserId: SMOKE_USER.id,
      decidedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expenses.set(id, updated);
    return updated;
  },
  reject(id: string, reason: string): Expense | { error: string; code: number } {
    const existing = expenses.get(id);
    if (!existing) return { error: "Expense not found", code: 3511 };
    if (existing.billingStatus === "INVOICED") {
      return { error: "Cannot decide an INVOICED expense", code: 3517 };
    }
    if (!reason || reason.trim() === "") {
      return { error: "Rejection reason required", code: 3516 };
    }
    const updated: Expense = {
      ...existing,
      approvalStatus: "REJECTED",
      approvedByUserId: SMOKE_USER.id,
      decidedAt: new Date().toISOString(),
      rejectionReason: reason,
      updatedAt: new Date().toISOString(),
    };
    expenses.set(id, updated);
    return updated;
  },
  createInvoiceFromExpenses(projectId?: string): Invoice | { error: string; code: number } {
    const candidates = Array.from(expenses.values()).filter(
      (e) =>
        e.approvalStatus === "APPROVED" &&
        e.billable &&
        e.billingStatus === "UNBILLED" &&
        (!projectId || e.projectId === projectId),
    );
    if (candidates.length === 0) {
      return { error: "No eligible approved expenses to invoice", code: 3530 };
    }
    const invoiceId = uuid();
    const lineItems = candidates.map((e) => {
      const markup = e.markupPercent ?? 0;
      const unitPrice =
        Math.round((e.amount ?? 0) * (1 + markup / 100) * 100) / 100;
      return {
        description: `Expense — ${e.description ?? ""}`,
        quantity: 1,
        unitPrice,
        discountPercent: 0,
        taxPercent: 0,
        lineTotal: unitPrice,
      };
    });
    const total = lineItems.reduce((sum, l) => sum + (l.lineTotal ?? 0), 0);
    const invoice: Invoice = {
      id: invoiceId,
      tenantId: SMOKE_USER.tenantId,
      status: "DRAFT",
      projectId: projectId ?? candidates[0].projectId,
      currency: "USD",
      lineItems,
      total,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    for (const expense of candidates) {
      const marked: Expense = {
        ...expense,
        billingStatus: "INVOICED",
        invoicedInvoiceId: invoiceId,
        updatedAt: new Date().toISOString(),
      };
      expenses.set(expense.id!, marked);
    }
    return invoice;
  },
};

// --- Attachment store (reused for receipts) -----------------------------------

const attachments = new Map<string, Attachment>();

export const attachmentStore = {
  listFor(subjectType: string, subjectId: string): Attachment[] {
    return Array.from(attachments.values()).filter(
      (a) => a.subjectType === subjectType && a.subjectId === subjectId,
    );
  },
  register(input: Attachment): Attachment {
    const id = input.id ?? uuid();
    const created: Attachment = {
      ...input,
      id,
      tenantId: SMOKE_USER.tenantId,
      uploadedByUserId: SMOKE_USER.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    attachments.set(id, created);
    return created;
  },
};

// --- Contract Templates (Phase F) --------------------------------------------

const seedContractTemplate: ContractTemplate = {
  id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
  tenantId: SMOKE_USER.tenantId,
  name: "Standard SOW v1",
  description: "Default Statement of Work template.",
  kind: "SOW",
  defaultTitle: "Statement of Work — {{clientName}}",
  bodyTemplate:
    "This Statement of Work is entered into between KMO Solutions Foundry LLC (\"Provider\") and {{clientName}} (\"Client\").\n\n## Scope\n{{scope}}\n\n## Timeline\n{{timeline}}\n\n## Fees\n{{fees}}",
  active: true,
};

const contractTemplates = new Map<string, ContractTemplate>([
  [seedContractTemplate.id!, seedContractTemplate],
]);

export const contractTemplateStore = {
  list(): ContractTemplate[] {
    return Array.from(contractTemplates.values());
  },
  get(id: string): ContractTemplate | undefined {
    return contractTemplates.get(id);
  },
  create(input: ContractTemplate): ContractTemplate {
    const id = input.id ?? uuid();
    const created: ContractTemplate = {
      ...input,
      id,
      tenantId: SMOKE_USER.tenantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    contractTemplates.set(id, created);
    return created;
  },
  update(id: string, input: ContractTemplate): ContractTemplate | undefined {
    if (!contractTemplates.has(id)) return undefined;
    const updated: ContractTemplate = { ...contractTemplates.get(id), ...input, id };
    contractTemplates.set(id, updated);
    return updated;
  },
  delete(id: string): boolean {
    return contractTemplates.delete(id);
  },
};

// --- Contracts (Phase F) -----------------------------------------------------

const seedContract: Contract = {
  id: "ffffffff-ffff-ffff-ffff-ffffffffffff",
  tenantId: SMOKE_USER.tenantId,
  contractNumber: null as unknown as string, // DRAFT contracts have no number
  title: "Website Project SOW",
  kind: "SOW",
  status: "DRAFT",
  templateId: seedContractTemplate.id,
};

const contracts = new Map<string, Contract>([[seedContract.id!, seedContract]]);
let contractCounter = 1;

export const contractStore = {
  list(): Contract[] {
    return Array.from(contracts.values());
  },
  get(id: string): Contract | undefined {
    return contracts.get(id);
  },
  create(input: Contract): Contract {
    const id = input.id ?? uuid();
    const created: Contract = {
      ...input,
      id,
      tenantId: SMOKE_USER.tenantId,
      status: "DRAFT",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    contracts.set(id, created);
    return created;
  },
  update(id: string, input: Contract): Contract | undefined {
    if (!contracts.has(id)) return undefined;
    const updated: Contract = { ...contracts.get(id), ...input, id };
    contracts.set(id, updated);
    return updated;
  },
  delete(id: string): boolean {
    return contracts.delete(id);
  },
  /** DRAFT → SENT via Documenso. Assigns contractNumber. Idempotent. */
  send(id: string): Contract | undefined {
    const existing = contracts.get(id);
    if (!existing) return undefined;
    if (existing.status === "SENT") return existing; // idempotent
    if (existing.status !== "DRAFT") return undefined; // wrong state
    contractCounter++;
    const updated: Contract = {
      ...existing,
      status: "SENT",
      contractNumber: `CTR-${new Date().getFullYear()}-${String(contractCounter).padStart(4, "0")}`,
      sentAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    contracts.set(id, updated);
    return updated;
  },
  setStatus(id: string, target: string): Contract | undefined {
    const existing = contracts.get(id);
    if (!existing) return undefined;
    const updated: Contract = {
      ...existing,
      status: target as Contract["status"],
      updatedAt: new Date().toISOString(),
    };
    contracts.set(id, updated);
    return updated;
  },
  spawnFromQuote(quote: Quote, template?: ContractTemplate): Contract {
    // Check if one already exists for this quoteId (idempotent)
    const existing = Array.from(contracts.values()).find(
      (c) => c.quoteId === quote.id,
    );
    if (existing) return existing;
    const id = uuid();
    const created: Contract = {
      id,
      tenantId: SMOKE_USER.tenantId,
      title: template?.defaultTitle
        ? template.defaultTitle.replace("{{clientName}}", "Client")
        : `Contract for Quote ${quote.quoteNumber ?? quote.id}`,
      kind: template?.kind ?? "SOW",
      status: "DRAFT",
      quoteId: quote.id,
      templateId: template?.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    contracts.set(id, created);
    return created;
  },
  findByQuoteId(quoteId: string): Contract | undefined {
    return Array.from(contracts.values()).find((c) => c.quoteId === quoteId);
  },
};

// --- Recurring Invoices (Phase E) --------------------------------------------

export const SEED_RECURRING_INVOICE_ID = "ri000000-0000-0000-0000-000000000001";

const seedRecurringInvoice: RecurringInvoice = {
  id: SEED_RECURRING_INVOICE_ID,
  tenantId: SMOKE_USER.tenantId,
  templateName: "Monthly retainer",
  rrule: "FREQ=MONTHLY;BYMONTHDAY=1",
  currency: "USD",
  status: "ACTIVE",
  autoFinalize: false,
  nextRunAt: "2026-06-01T00:00:00Z",
  occurrenceCount: 3,
  lineItems: [
    {
      description: "Monthly retainer fee",
      quantity: 1,
      unitPrice: 750,
      discountPercent: 0,
      taxPercent: 0,
      lineTotal: 750,
    },
  ],
  createdAt: "2026-03-01T00:00:00Z",
  updatedAt: "2026-05-01T00:00:00Z",
};

const recurringInvoices = new Map<string, RecurringInvoice>([
  [seedRecurringInvoice.id!, seedRecurringInvoice],
]);

export const recurringInvoiceStore = {
  list(): RecurringInvoice[] {
    return Array.from(recurringInvoices.values());
  },
  get(id: string): RecurringInvoice | undefined {
    return recurringInvoices.get(id);
  },
  create(input: RecurringInvoice): RecurringInvoice {
    const id = input.id ?? uuid();
    const created: RecurringInvoice = {
      ...input,
      id,
      tenantId: SMOKE_USER.tenantId,
      status: "ACTIVE",
      occurrenceCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    recurringInvoices.set(id, created);
    return created;
  },
  update(id: string, input: RecurringInvoice): RecurringInvoice | undefined {
    if (!recurringInvoices.has(id)) return undefined;
    const updated: RecurringInvoice = { ...recurringInvoices.get(id), ...input, id };
    recurringInvoices.set(id, updated);
    return updated;
  },
  delete(id: string): boolean {
    return recurringInvoices.delete(id);
  },
  setStatus(id: string, status: string): RecurringInvoice | undefined {
    const existing = recurringInvoices.get(id);
    if (!existing) return undefined;
    const updated: RecurringInvoice = {
      ...existing,
      status: status as RecurringInvoice["status"],
      updatedAt: new Date().toISOString(),
    };
    recurringInvoices.set(id, updated);
    return updated;
  },
  spawnNow(id: string, invoiceStore: { create: (inv: Invoice) => Invoice }): RecurringInvoice | undefined {
    const existing = recurringInvoices.get(id);
    if (!existing) return undefined;
    // Spawn a DRAFT invoice (or SENT if autoFinalize)
    const spawned = invoiceStore.create({
      tenantId: SMOKE_USER.tenantId,
      currency: existing.currency ?? "USD",
      status: existing.autoFinalize ? "SENT" : "DRAFT",
      lineItems: existing.lineItems ?? [],
    } as Invoice);
    const updated: RecurringInvoice = {
      ...existing,
      lastRunAt: new Date().toISOString(),
      lastSpawnedInvoiceId: spawned.id,
      occurrenceCount: (existing.occurrenceCount ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    recurringInvoices.set(id, updated);
    return updated;
  },
};

// --- Review replies (Google Business Profile) --------------------------------
// The backend poller drafts on-brand replies to new Google reviews and leaves
// them DRAFTED. The admin queue lists DRAFTED, posts the (edited) reply, or
// skips it. Seed two drafts — a glowing 5★ and a needs-care 2★ — so the queue
// renders with content in smoke.

export const SEED_REVIEW_REPLY_5STAR_ID =
  "gbpr0000-0000-0000-0000-000000000001";
export const SEED_REVIEW_REPLY_2STAR_ID =
  "gbpr0000-0000-0000-0000-000000000002";

const seedReviewReplies: GbpReviewReply[] = [
  {
    id: SEED_REVIEW_REPLY_5STAR_ID,
    tenantId: SMOKE_USER.tenantId,
    reviewId: "accounts/123/locations/456/reviews/aaa",
    rating: 5,
    reviewerName: "Dana Whitfield",
    comment:
      "Showed up on time, explained everything, and left the place spotless. Couldn't ask for better service.",
    reviewCreateTime: "2026-05-30T14:20:00Z",
    draftedReply:
      "Thank you so much, Dana! We're thrilled we could help, and we really appreciate you taking the time to share your experience. We're always here whenever you need us.",
    status: "DRAFTED",
    receivedAt: "2026-05-30T14:25:00Z",
  },
  {
    id: SEED_REVIEW_REPLY_2STAR_ID,
    tenantId: SMOKE_USER.tenantId,
    reviewId: "accounts/123/locations/456/reviews/bbb",
    rating: 2,
    reviewerName: "Marcus Lee",
    comment:
      "The work was fine but the crew ran two hours late and nobody called to let me know.",
    reviewCreateTime: "2026-05-29T09:05:00Z",
    draftedReply:
      "Marcus, we're sorry we kept you waiting and didn't call ahead — that's not the experience we want to give you. We'd like to make it right; please reach out to us directly so we can follow up.",
    status: "DRAFTED",
    receivedAt: "2026-05-29T09:10:00Z",
  },
];

const reviewReplies = new Map<string, GbpReviewReply>(
  seedReviewReplies.map((r) => [r.id!, r]),
);

export const gbpReviewReplyStore = {
  /** DRAFTED only, most-recent first (mirrors the BE list contract). */
  listDrafted(): GbpReviewReply[] {
    return Array.from(reviewReplies.values())
      .filter((r) => r.status === "DRAFTED")
      .sort((a, b) =>
        (b.receivedAt ?? "").localeCompare(a.receivedAt ?? ""),
      );
  },
  get(id: string): GbpReviewReply | undefined {
    return reviewReplies.get(id);
  },
  /** Post the (optionally edited) reply → POSTED. 404 if missing, 409 if not DRAFTED. */
  post(id: string, reply?: string): GbpReviewReply | { code: number } {
    const existing = reviewReplies.get(id);
    if (!existing) return { code: 4032 };
    if (existing.status !== "DRAFTED") return { code: 4033 };
    const updated: GbpReviewReply = {
      ...existing,
      draftedReply: reply !== undefined ? reply : existing.draftedReply,
      status: "POSTED",
      postedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    reviewReplies.set(id, updated);
    return updated;
  },
  /** Skip → SKIPPED, no Google call. 404 if missing, 409 if not DRAFTED. */
  skip(id: string): GbpReviewReply | { code: number } {
    const existing = reviewReplies.get(id);
    if (!existing) return { code: 4032 };
    if (existing.status !== "DRAFTED") return { code: 4033 };
    const updated: GbpReviewReply = {
      ...existing,
      status: "SKIPPED",
      updatedAt: new Date().toISOString(),
    };
    reviewReplies.set(id, updated);
    return updated;
  },
  /**
   * ChairFill CF-4 paste-in: a staffer pastes a review and the BE drafts an
   * on-brand salon reply, parking it DRAFTED in THIS shared queue (the same one
   * the review-replies list shows). Mirrors `POST /chairfill/reviews/draft` —
   * returns the queued reply; the FE 4240-guards a blank comment before calling.
   */
  draftPasteIn(input: {
    comment: string;
    reviewerName?: string;
    rating?: number;
    externalReviewId?: string;
    createTime?: string;
  }): GbpReviewReply {
    const now = new Date().toISOString();
    const created: GbpReviewReply = {
      id: uuid(),
      tenantId: SMOKE_USER.tenantId,
      reviewId:
        input.externalReviewId ?? `paste-in/${Math.random().toString(36).slice(2)}`,
      rating: input.rating ?? undefined,
      reviewerName: input.reviewerName,
      comment: input.comment,
      reviewCreateTime: input.createTime ?? now,
      // A canned on-brand salon draft — stands in for the AI's RAG-grounded
      // reply so the queue shows a ready-to-edit draft in mock mode.
      draftedReply:
        "Thank you so much for taking the time to share this! We loved having you in the chair and can't wait to see you again soon. — The team",
      status: "DRAFTED",
      receivedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    reviewReplies.set(created.id!, created);
    return created;
  },
};

// --- Team (contractor / time-management Phase 1) -----------------------------

// Stable seed IDs for smoke determinism.
export const SEED_OWNER_MEMBER_ID = SMOKE_USER.id;
export const SEED_CONTRACTOR_MEMBER_ID = SMOKE_CONTRACTOR_USER.id;

const seedTeam: TeamMember[] = [
  {
    id: SEED_OWNER_MEMBER_ID,
    email: SMOKE_USER.email,
    displayName: SMOKE_USER.displayName,
    roles: ["STAFF", "ADMIN"],
    status: "ACTIVE",
    portal: "ADMIN",
    createdAt: "2026-05-01T00:00:00Z",
    updatedAt: "2026-05-01T00:00:00Z",
  },
  {
    id: SEED_CONTRACTOR_MEMBER_ID,
    email: SMOKE_CONTRACTOR_USER.email,
    displayName: SMOKE_CONTRACTOR_USER.displayName,
    roles: ["STAFF", "CONTRACTOR"],
    status: "ACTIVE",
    portal: "ADMIN",
    defaultBillRate: 150,
    defaultCostRate: 90,
    createdAt: "2026-05-01T00:00:00Z",
    updatedAt: "2026-05-01T00:00:00Z",
  },
];

const team = new Map<string, TeamMember>(seedTeam.map((m) => [m.id!, m]));

export const teamStore = {
  list(): TeamMember[] {
    return Array.from(team.values());
  },
  get(id: string): TeamMember | undefined {
    return team.get(id);
  },
  create(input: TeamMemberRequest): TeamMember {
    const id = uuid();
    const roles =
      input.roles && input.roles.length > 0 ? input.roles : ["STAFF"];
    // CONTRACTOR implies STAFF; no password ⇒ INVITED, password ⇒ ACTIVE.
    const normalizedRoles = roles.includes("CONTRACTOR")
      ? Array.from(new Set(["STAFF", ...roles]))
      : roles;
    const status = input.status ?? (input.password ? "ACTIVE" : "INVITED");
    const created: TeamMember = {
      id,
      email: input.email,
      displayName: input.displayName,
      roles: normalizedRoles,
      status,
      portal: "ADMIN",
      defaultBillRate: input.defaultBillRate,
      defaultCostRate: input.defaultCostRate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    team.set(id, created);
    return created;
  },
  update(id: string, input: TeamMemberRequest): TeamMember | undefined {
    const existing = team.get(id);
    if (!existing) return undefined;
    const roles =
      input.roles && input.roles.length > 0 ? input.roles : existing.roles;
    const normalizedRoles =
      roles?.includes("CONTRACTOR")
        ? Array.from(new Set(["STAFF", ...roles]))
        : roles;
    const updated: TeamMember = {
      ...existing,
      email: input.email ?? existing.email,
      displayName: input.displayName ?? existing.displayName,
      roles: normalizedRoles,
      status: input.status ?? existing.status,
      defaultBillRate:
        input.defaultBillRate ?? existing.defaultBillRate,
      defaultCostRate:
        input.defaultCostRate ?? existing.defaultCostRate,
      updatedAt: new Date().toISOString(),
    };
    team.set(id, updated);
    return updated;
  },
  disable(id: string): TeamMember | undefined {
    const existing = team.get(id);
    if (!existing) return undefined;
    const updated: TeamMember = {
      ...existing,
      status: "DISABLED",
      updatedAt: new Date().toISOString(),
    };
    team.set(id, updated);
    return updated;
  },
};

// --- Project assignments -----------------------------------------------------

const seedAssignment: ProjectAssignment = {
  id: "as000000-0000-0000-0000-000000000001",
  tenantId: SMOKE_USER.tenantId,
  projectId: SEED_PROJECT_ID,
  userId: SEED_CONTRACTOR_MEMBER_ID,
  billRateOverride: 160,
  costRateOverride: 95,
  role: "Engineer",
  active: true,
  createdAt: "2026-05-02T00:00:00Z",
  updatedAt: "2026-05-02T00:00:00Z",
};

const assignments = new Map<string, ProjectAssignment>([
  [seedAssignment.id!, seedAssignment],
]);

export const assignmentStore = {
  listByProject(projectId: string): ProjectAssignment[] {
    return Array.from(assignments.values()).filter(
      (a) => a.projectId === projectId && a.active !== false,
    );
  },
  // Idempotent on (projectId, userId): a repeat add reactivates / returns the
  // existing row (200) rather than creating a duplicate (201).
  create(
    projectId: string,
    input: { userId?: string; billRateOverride?: number; costRateOverride?: number; role?: string },
  ): { assignment: ProjectAssignment; created: boolean } {
    const existing = Array.from(assignments.values()).find(
      (a) => a.projectId === projectId && a.userId === input.userId,
    );
    if (existing) {
      const reactivated: ProjectAssignment = {
        ...existing,
        active: true,
        billRateOverride: input.billRateOverride ?? existing.billRateOverride,
        costRateOverride: input.costRateOverride ?? existing.costRateOverride,
        role: input.role ?? existing.role,
        updatedAt: new Date().toISOString(),
      };
      assignments.set(existing.id!, reactivated);
      return { assignment: reactivated, created: false };
    }
    const id = uuid();
    const created: ProjectAssignment = {
      id,
      tenantId: SMOKE_USER.tenantId,
      projectId,
      userId: input.userId,
      billRateOverride: input.billRateOverride,
      costRateOverride: input.costRateOverride,
      role: input.role,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    assignments.set(id, created);
    return { assignment: created, created: true };
  },
  update(
    id: string,
    input: { billRateOverride?: number; costRateOverride?: number; role?: string },
  ): ProjectAssignment | undefined {
    const existing = assignments.get(id);
    if (!existing) return undefined;
    const updated: ProjectAssignment = {
      ...existing,
      billRateOverride: input.billRateOverride ?? existing.billRateOverride,
      costRateOverride: input.costRateOverride ?? existing.costRateOverride,
      role: input.role ?? existing.role,
      updatedAt: new Date().toISOString(),
    };
    assignments.set(id, updated);
    return updated;
  },
  // Soft delete: active=false (logged time stays attributed).
  remove(id: string): boolean {
    const existing = assignments.get(id);
    if (!existing) return false;
    assignments.set(id, {
      ...existing,
      active: false,
      updatedAt: new Date().toISOString(),
    });
    return true;
  },
};

// --- Contractor self-service surface (Phase J2) ------------------------------

// Maps the full staff Project/Task/Contact records to the trimmed contractor
// view shapes, scoping reads to the caller's active assignments + own rows. The
// handler resolves the caller's userId from the bearer token and passes it in;
// project access is gated on an active assignment so a contractor can never
// read a project they're not on.

function toProjectView(p: Project): ContractorProjectView {
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    status: p.status,
    description: p.description,
    startDate: p.startDate,
    targetEndDate: p.targetEndDate,
    actualEndDate: p.actualEndDate,
  };
}

function toTaskView(t: Task): ContractorTaskView {
  return {
    id: t.id,
    projectId: t.projectId,
    milestoneId: t.milestoneId,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate,
    orderIndex: t.orderIndex,
  };
}

export const contractorStore = {
  /** Project IDs the contractor is actively assigned to. */
  assignedProjectIds(userId: string): Set<string> {
    return new Set(
      Array.from(assignments.values())
        .filter((a) => a.userId === userId && a.active !== false)
        .map((a) => a.projectId!)
        .filter(Boolean),
    );
  },
  listProjects(userId: string): ContractorProjectView[] {
    const ids = this.assignedProjectIds(userId);
    return Array.from(projects.values())
      .filter((p) => p.id && ids.has(p.id))
      .map(toProjectView);
  },
  getProject(userId: string, projectId: string): ContractorProjectView | undefined {
    if (!this.assignedProjectIds(userId).has(projectId)) return undefined;
    const p = projects.get(projectId);
    return p ? toProjectView(p) : undefined;
  },
  listTasks(userId: string, projectId: string): ContractorTaskView[] | undefined {
    if (!this.assignedProjectIds(userId).has(projectId)) return undefined;
    return taskStore2.listByProject(projectId).map(toTaskView);
  },
  getClient(userId: string, projectId: string): ContractorClientView | undefined {
    if (!this.assignedProjectIds(userId).has(projectId)) return undefined;
    const p = projects.get(projectId);
    if (!p) return undefined;
    const contact = p.primaryContactId
      ? contacts.get(p.primaryContactId)
      : undefined;
    const company = p.companyId ? companies.get(p.companyId) : undefined;
    return {
      contactName: contact?.displayName,
      contactEmail: contact?.emails?.[0],
      contactPhone: contact?.phones?.[0]?.number,
      companyName: company?.name,
    };
  },
  // Time — own entries only.
  listTime(userId: string): TimeEntry[] {
    return timeEntryStore.listByUser(userId);
  },
  listWeekly(userId: string, from: string, to: string): TimeEntry[] {
    return timeEntryStore.listWeekly(userId, from, to);
  },
  // Expenses — own submissions only.
  listExpenses(userId: string): Expense[] {
    return Array.from(expenses.values()).filter((e) => e.userId === userId);
  },
  // Timesheets — own periods only.
  listTimesheets(userId: string): TimesheetView[] {
    return timesheetStore
      .listForUser(userId)
      .map(toTimesheetView);
  },
};

// --- Timesheets (contractor / time-management Phase 3) -----------------------
//
// A timesheet is a per-(user, week) period the contractor submits for the
// owner's approval. Lifecycle: OPEN → SUBMITTED → APPROVED, or
// SUBMITTED → REJECTED ("Sent back") → OPEN (reopen) / SUBMITTED (resubmit).
// The store holds the full Timesheet (admin shape); the contractor surface gets
// the trimmed TimesheetView projection.

// Compute the current calendar week's [Mon, Sun] as YYYY-MM-DD, identical to the
// FE's getWeekDays(new Date())[0]/[6] + fmtDate (local week, Mon-start, then
// toISOString().slice(0,10)). The contractor's OPEN seed must line up with the
// visible week so "Submit for approval" is exercisable in smoke.
function currentWeekBounds(): { start: string; end: string } {
  const d = new Date();
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day; // shift so Mon is day 0
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  const mon = new Date(d);
  const sun = new Date(d);
  sun.setDate(sun.getDate() + 6);
  const fmt = (x: Date) => x.toISOString().slice(0, 10);
  return { start: fmt(mon), end: fmt(sun) };
}

const CURRENT_WEEK = currentWeekBounds();

export const SEED_CONTRACTOR_TIMESHEET_SUBMITTED_ID =
  "ts000000-0000-0000-0000-0000000000c1";
export const SEED_CONTRACTOR_TIMESHEET_OPEN_ID =
  "ts000000-0000-0000-0000-0000000000c2";
export const SEED_CONTRACTOR_TIMESHEET_REJECTED_ID =
  "ts000000-0000-0000-0000-0000000000c3";

// A stable sent-back note so the contractor's read-only sent-back panel is
// assertable in smoke.
export const SEED_TIMESHEET_SENDBACK_NOTE =
  "Please add the Thursday client call hours.";

const seedTimesheets: Timesheet[] = [
  // A prior week the contractor already submitted — drives the admin approvals
  // page (GET /timesheets?status=SUBMITTED is non-empty).
  {
    id: SEED_CONTRACTOR_TIMESHEET_SUBMITTED_ID,
    tenantId: SMOKE_USER.tenantId,
    userId: SMOKE_CONTRACTOR_USER.id,
    periodStart: "2026-05-11",
    periodEnd: "2026-05-17",
    status: "SUBMITTED",
    submittedAt: "2026-05-18T09:00:00Z",
    version: 1,
    createdAt: "2026-05-11T00:00:00Z",
    updatedAt: "2026-05-18T09:00:00Z",
  },
  // An earlier week the owner sent back — drives the contractor's read-only
  // sent-back note panel + Reopen affordance (self-contained, no cross-identity
  // store mutation needed in smoke).
  {
    id: SEED_CONTRACTOR_TIMESHEET_REJECTED_ID,
    tenantId: SMOKE_USER.tenantId,
    userId: SMOKE_CONTRACTOR_USER.id,
    periodStart: "2026-05-04",
    periodEnd: "2026-05-10",
    status: "REJECTED",
    submittedAt: "2026-05-11T09:00:00Z",
    note: SEED_TIMESHEET_SENDBACK_NOTE,
    version: 2,
    createdAt: "2026-05-04T00:00:00Z",
    updatedAt: "2026-05-11T12:00:00Z",
  },
  // The current week, still OPEN — so the contractor can submit it from the
  // visible /timesheet week.
  {
    id: SEED_CONTRACTOR_TIMESHEET_OPEN_ID,
    tenantId: SMOKE_USER.tenantId,
    userId: SMOKE_CONTRACTOR_USER.id,
    periodStart: CURRENT_WEEK.start,
    periodEnd: CURRENT_WEEK.end,
    status: "OPEN",
    version: 0,
    createdAt: CURRENT_WEEK.start + "T00:00:00Z",
    updatedAt: CURRENT_WEEK.start + "T00:00:00Z",
  },
];

const timesheets = new Map<string, Timesheet>(
  seedTimesheets.map((t) => [t.id!, t]),
);

function toTimesheetView(t: Timesheet): TimesheetView {
  return {
    id: t.id,
    userId: t.userId,
    periodStart: t.periodStart,
    periodEnd: t.periodEnd,
    status: t.status,
    submittedAt: t.submittedAt,
    approvedBy: t.approvedBy,
    approvedAt: t.approvedAt,
    note: t.note,
  };
}

export const timesheetStore = {
  listForUser(userId: string): Timesheet[] {
    return Array.from(timesheets.values())
      .filter((t) => t.userId === userId)
      .sort((a, b) => (b.periodStart ?? "").localeCompare(a.periodStart ?? ""));
  },
  listByStatus(status: TimesheetStatus): Timesheet[] {
    return Array.from(timesheets.values())
      .filter((t) => t.status === status)
      .sort((a, b) => (b.periodStart ?? "").localeCompare(a.periodStart ?? ""));
  },
  get(id: string): Timesheet | undefined {
    return timesheets.get(id);
  },
  // Contractor: OPEN | REJECTED → SUBMITTED.
  submit(id: string): Timesheet | { error: string; code: number } {
    const existing = timesheets.get(id);
    if (!existing) return { error: "Timesheet not found", code: 3611 };
    if (existing.status !== "OPEN" && existing.status !== "REJECTED") {
      return { error: "Only an open or sent-back timesheet can be submitted", code: 3612 };
    }
    const updated: Timesheet = {
      ...existing,
      status: "SUBMITTED",
      submittedAt: new Date().toISOString(),
      note: undefined, // clear any prior send-back note on resubmit
      updatedAt: new Date().toISOString(),
    };
    timesheets.set(id, updated);
    return updated;
  },
  // Contractor: REJECTED → OPEN.
  reopen(id: string): Timesheet | { error: string; code: number } {
    const existing = timesheets.get(id);
    if (!existing) return { error: "Timesheet not found", code: 3611 };
    if (existing.status !== "REJECTED") {
      return { error: "Only a sent-back timesheet can be reopened", code: 3613 };
    }
    const updated: Timesheet = {
      ...existing,
      status: "OPEN",
      updatedAt: new Date().toISOString(),
    };
    timesheets.set(id, updated);
    return updated;
  },
  // Admin: SUBMITTED → APPROVED.
  approve(id: string): Timesheet | { error: string; code: number } {
    const existing = timesheets.get(id);
    if (!existing) return { error: "Timesheet not found", code: 3611 };
    if (existing.status !== "SUBMITTED") {
      return { error: "Only a submitted timesheet can be approved", code: 3614 };
    }
    const updated: Timesheet = {
      ...existing,
      status: "APPROVED",
      approvedBy: SMOKE_USER.id,
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    timesheets.set(id, updated);
    return updated;
  },
  // Admin: SUBMITTED → REJECTED with a required reason (stored as `note`).
  reject(id: string, reason: string): Timesheet | { error: string; code: number } {
    const existing = timesheets.get(id);
    if (!existing) return { error: "Timesheet not found", code: 3611 };
    if (existing.status !== "SUBMITTED") {
      return { error: "Only a submitted timesheet can be sent back", code: 3614 };
    }
    if (!reason || reason.trim() === "") {
      return { error: "A note is required to send a timesheet back", code: 3615 };
    }
    const updated: Timesheet = {
      ...existing,
      status: "REJECTED",
      note: reason,
      updatedAt: new Date().toISOString(),
    };
    timesheets.set(id, updated);
    return updated;
  },
};

// --- Payout & margin report (contractor / time-management Phase 4) ------------

// The admin payout/margin report (GET /reports/payout[/ytd]) sums APPROVED time
// only — payout = Σ(hours × costRate), bill = Σ(hours × billRate), margin =
// bill − payout — grouped by the owning Timesheet period. This mock mirrors the
// BE PayoutReportService faithfully (scale-2 HALF_UP money; a null cost rate
// still counts its hours and sets hasUnratedEntries but adds 0 to payout).
//
// To keep smoke deterministic regardless of the calendar year CI runs in, the
// seeded approved entries are dated in the CURRENT year (the YTD window is
// [Jan 1 this year, now], so a fixed 2026 date would fall outside it in 2027+).

// An approved, period-stamped time row the payout report rolls up. A thin
// internal shape (only the fields the report needs) rather than a full TimeEntry.
interface PayoutSeedEntry {
  userId: string;
  startedAt: string; // ISO instant — the window filter key
  periodStart: string | null; // owning Timesheet period (null ⇒ ungrouped bucket)
  periodEnd: string | null;
  durationSeconds: number;
  costRateAmount: number | null; // null ⇒ surfaced via hasUnratedEntries, 0 payout
  rateAmount: number | null; // bill rate; null ⇒ excluded from bill
}

// Jordan Rivera's seeded approved time: two named periods (so the period table
// has multiple rows). Cost 95 / bill 160 mirror the seeded assignment override.
//   Period A: 8.00h → payout 760.00, bill 1280.00, margin 520.00
//   Period B: 5.00h → payout 475.00, bill  800.00, margin 325.00
//   YTD total: 13.00h → payout 1235.00, bill 2080.00, margin 845.00
const PAYOUT_YEAR = new Date().getFullYear();
const payoutEntries: PayoutSeedEntry[] = [
  {
    userId: SEED_CONTRACTOR_MEMBER_ID,
    startedAt: `${PAYOUT_YEAR}-05-12T13:00:00Z`,
    periodStart: `${PAYOUT_YEAR}-05-11`,
    periodEnd: `${PAYOUT_YEAR}-05-17`,
    durationSeconds: 28800, // 8h
    costRateAmount: 95,
    rateAmount: 160,
  },
  {
    userId: SEED_CONTRACTOR_MEMBER_ID,
    startedAt: `${PAYOUT_YEAR}-05-06T13:00:00Z`,
    periodStart: `${PAYOUT_YEAR}-05-04`,
    periodEnd: `${PAYOUT_YEAR}-05-10`,
    durationSeconds: 18000, // 5h
    costRateAmount: 95,
    rateAmount: 160,
  },
];

// Money discipline mirrors the BE: scale-2, HALF_UP. (Number.toFixed already
// rounds HALF_UP for these non-negative magnitudes; we round at each Σ step.)
function scaleMoney(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}
function entryHours(seconds: number): number {
  return scaleMoney(seconds / 3600);
}

interface PayoutAcc {
  start: string | null;
  end: string | null;
  hours: number;
  payout: number;
  bill: number;
}

export const payoutStore = {
  // Build the report for [from, to) — startedAt-windowed, approved-only (the
  // seed set is approved by construction), grouped by period (ungrouped last).
  report(userId: string, from: string, to: string): PayoutReport {
    const fromMs = new Date(from).getTime();
    const toMs = new Date(to).getTime();
    const rows = payoutEntries.filter((e) => {
      if (e.userId !== userId) return false;
      const t = new Date(e.startedAt).getTime();
      return t >= fromMs && t < toMs;
    });

    const byPeriod = new Map<string, PayoutAcc>();
    let totalHours = 0;
    let totalPayout = 0;
    let totalBill = 0;
    let hasUnratedEntries = false;

    for (const e of rows) {
      const hours = entryHours(e.durationSeconds);
      const key = e.periodStart == null ? " ungrouped" : `${e.periodStart}`;
      const acc =
        byPeriod.get(key) ??
        { start: e.periodStart, end: e.periodEnd, hours: 0, payout: 0, bill: 0 };

      acc.hours = scaleMoney(acc.hours + hours);
      totalHours = scaleMoney(totalHours + hours);

      if (e.costRateAmount != null) {
        const payout = scaleMoney(hours * e.costRateAmount);
        acc.payout = scaleMoney(acc.payout + payout);
        totalPayout = scaleMoney(totalPayout + payout);
      } else {
        hasUnratedEntries = true;
      }

      if (e.rateAmount != null) {
        const bill = scaleMoney(hours * e.rateAmount);
        acc.bill = scaleMoney(acc.bill + bill);
        totalBill = scaleMoney(totalBill + bill);
      }

      byPeriod.set(key, acc);
    }

    // Named periods sorted by periodStart ascending; the ungrouped bucket last.
    const periods: PayoutPeriodLine[] = Array.from(byPeriod.values())
      .sort((a, b) => {
        if (a.start == null) return 1;
        if (b.start == null) return -1;
        return a.start.localeCompare(b.start);
      })
      .map((a) => ({
        periodStart: a.start ?? undefined,
        periodEnd: a.end ?? undefined,
        hours: a.hours,
        payout: a.payout,
        bill: a.bill,
        margin: scaleMoney(a.bill - a.payout),
      }));

    const member = teamStore.get(userId);
    return {
      userId,
      displayName: member?.displayName,
      from,
      to,
      totalHours,
      payout: totalPayout,
      bill: totalBill,
      margin: scaleMoney(totalBill - totalPayout),
      hasUnratedEntries,
      periods,
    };
  },

  // YTD window mirrors the BE: [year-01-01T00:00:00Z, now] for the current year,
  // else the full [year-01-01, year-12-31T23:59:59Z].
  ytd(userId: string, year: number): PayoutReport {
    const from = new Date(Date.UTC(year, 0, 1, 0, 0, 0)).toISOString();
    const to =
      year === new Date().getUTCFullYear()
        ? new Date().toISOString()
        : new Date(Date.UTC(year, 11, 31, 23, 59, 59)).toISOString();
    return this.report(userId, from, to);
  },
};

// --- Home Services: Missed-Call Inbox (HS-4) --------------------------------
// Voicemail-sourced DRAFT WorkOrders the dispatcher triages. The list endpoint
// returns DRAFTs only, so Scheduling (→ SCHEDULED) or Dismissing (→ CANCELLED)
// a card drops it off the queue — exactly the BE behavior (a status-filtered
// query). We hold a richer internal record (status + the notes blob built in
// the BE's exact "Symptom: …\nService address: …\n\nTranscript:\n…" shape so
// the card's note-parser has real text to work with) and project it to the
// lean MissedCallInboxItem the BE DTO exposes. Resets per page load.

interface MockMissedCall extends MissedCallInboxItem {
  status: "DRAFT" | "SCHEDULED" | "CANCELLED";
}

function missedCallNotes(opts: {
  symptom: string;
  address?: string;
  transcript: string;
  equipment?: string;
}): string {
  let s = "Missed-call voicemail lead (home services).";
  s += `\nSymptom: ${opts.symptom}`;
  if (opts.address) s += `\nService address: ${opts.address}`;
  if (opts.equipment) s += `\nEquipment (from photo): ${opts.equipment}`;
  s += `\n\nTranscript:\n${opts.transcript}`;
  return s;
}

const seedMissedCalls: MockMissedCall[] = [
  {
    id: "f0000000-0000-0000-0000-0000000000e1",
    status: "DRAFT",
    workOrderNumber: "2026-06-0042",
    trade: "HVAC",
    urgency: "EMERGENCY",
    jobValueBand: "LARGE",
    title: "HVAC — EMERGENCY",
    callSid: "CA00000000000000000000000000000001",
    createdAt: "2026-06-07T03:12:00Z",
    notes: missedCallNotes({
      symptom: "No heat, furnace making a loud banging; freezing inside, infant in the home",
      address: "14 Oak Street",
      equipment: "Carrier 58STA, serial 4815162342 — likely heat-exchanger fault",
      transcript:
        "Hi, this is Maria Lopez at 14 Oak Street. My furnace is making a loud banging " +
        "and there's no heat at all, it's freezing in here and I have a baby in the house. " +
        "Please call me back tonight, my number is 314-555-0142.",
    }),
  },
  {
    id: "f0000000-0000-0000-0000-0000000000e2",
    status: "DRAFT",
    workOrderNumber: "2026-06-0043",
    trade: "PLUMBING",
    urgency: "URGENT",
    jobValueBand: "MEDIUM",
    title: "PLUMBING — URGENT",
    callSid: "CA00000000000000000000000000000002",
    createdAt: "2026-06-07T02:40:00Z",
    notes: missedCallNotes({
      symptom: "Water heater leaking, pooling in the basement",
      address: "908 Maple Ave",
      transcript:
        "Hey, it's Dan Whitfield over on Maple. My water heater's leaking pretty bad, " +
        "there's a puddle spreading across the basement floor. I shut the valve but I'd " +
        "like someone out tomorrow if you can. Thanks.",
    }),
  },
  {
    id: "f0000000-0000-0000-0000-0000000000e3",
    status: "DRAFT",
    workOrderNumber: "2026-06-0044",
    trade: "ELECTRICAL",
    urgency: "ROUTINE",
    jobValueBand: "SMALL",
    title: "ELECTRICAL — ROUTINE",
    callSid: "CA00000000000000000000000000000003",
    createdAt: "2026-06-06T22:05:00Z",
    notes: missedCallNotes({
      symptom: "Outlet in the garage stopped working",
      transcript:
        "Hi, this is Priya. The outlet in my garage stopped working — no rush, just " +
        "whenever you have an opening next week is fine. You can reach me at this number.",
    }),
  },
];

const missedCalls = new Map<string, MockMissedCall>(
  seedMissedCalls.map((m) => [m.id, m]),
);

export const missedCallInboxStore = {
  /** The inbox view: DRAFTs only, newest first (mirrors the BE projection). */
  list(): MissedCallInboxItem[] {
    return Array.from(missedCalls.values())
      .filter((m) => m.status === "DRAFT")
      .sort((a, b) =>
        (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
      )
      .map(({ status: _status, ...item }) => item);
  },

  /** Lookup a work order by id (any status). */
  get(id: string): MockMissedCall | undefined {
    return missedCalls.get(id);
  },

  /**
   * Apply a WorkOrder PUT patch. The inbox only ever sends `status`
   * (SCHEDULED on Schedule, CANCELLED on Dismiss) plus the schedule fields;
   * we record the status transition (which removes it from the inbox view)
   * and echo the updated record back like the BE's WorkOrderService.update.
   */
  patch(
    id: string,
    body: {
      status?: "DRAFT" | "SCHEDULED" | "CANCELLED" | string;
      scheduledStart?: string;
      technicianUserId?: string;
    },
  ): (MissedCallInboxItem & Record<string, unknown>) | undefined {
    const existing = missedCalls.get(id);
    if (!existing) return undefined;
    if (
      body.status === "DRAFT" ||
      body.status === "SCHEDULED" ||
      body.status === "CANCELLED"
    ) {
      existing.status = body.status;
    }
    const { status, ...rest } = existing;
    return {
      ...rest,
      status,
      scheduledStart: body.scheduledStart ?? null,
      technicianUserId: body.technicianUserId ?? null,
      updatedAt: new Date().toISOString(),
    };
  },
};

// --- ChairFill — salon flagship (CF-5) --------------------------------------
//
// Backs the three CF-5 surfaces in mock mode. The BE endpoints are
// @ConditionalOnProperty-gated (hand-written client, no generated alias), so
// these mirror the BE DTOs by hand. Resets per page load.
//
// Seeds (so all three surfaces render + actions work):
//   - No-show risk: a HIGH-risk booking (Ada — resolves to a real name), a
//     MEDIUM, and a LOW, plus one unscored — newest-risk first like the BE.
//   - Waitlist board: an OPEN entry (Ada), a couple more OPEN entries, and
//     recent offers incl. an OFFERED (live) + a CLAIMED one.
//   - Review paste-in lands a DRAFTED reply in the shared gbpReviewReplyStore
//     (handled there), so it shows up in the review-replies queue.

// Relative timestamps so the demo always reads "upcoming" / "just now".
function inHours(h: number): string {
  return new Date(Date.now() + h * 60 * 60 * 1000).toISOString();
}
function agoMinutes(m: number): string {
  return new Date(Date.now() - m * 60 * 1000).toISOString();
}

const SEED_SALON_CONTACT_ID = seedContact.id!; // Ada Lovelace (resolves to a name)
const SEED_SALON_STYLIST_ID = SEED_OWNER_MEMBER_ID; // resolves to the owner's name

export const SEED_RISK_HIGH_BOOKING_ID =
  "cf000000-0000-0000-0000-0000000000a1";

const seedRiskBookings: RiskBooking[] = [
  {
    id: SEED_RISK_HIGH_BOOKING_ID,
    contactId: SEED_SALON_CONTACT_ID,
    staffMemberId: SEED_SALON_STYLIST_ID,
    serviceMenuItemId: "svc-balayage",
    serviceMenuItemName: "Balayage + cut",
    scheduledStart: inHours(20),
    scheduledEnd: inHours(22),
    status: "CONFIRMED",
    depositRequired: false,
    depositPaid: false,
    noShowRisk: {
      riskScore: 0.78,
      riskTier: "HIGH",
      source: "MODEL",
      computedAt: agoMinutes(600),
    },
  },
  {
    id: "cf000000-0000-0000-0000-0000000000a2",
    contactId: "cf000000-0000-0000-0000-0000000000c2",
    staffMemberId: SEED_SALON_STYLIST_ID,
    serviceMenuItemId: "svc-color",
    serviceMenuItemName: "Single-process color",
    scheduledStart: inHours(26),
    scheduledEnd: inHours(27),
    status: "CONFIRMED",
    noShowRisk: {
      riskScore: 0.44,
      riskTier: "MEDIUM",
      source: "MODEL",
      computedAt: agoMinutes(600),
    },
  },
  {
    id: "cf000000-0000-0000-0000-0000000000a3",
    contactId: "cf000000-0000-0000-0000-0000000000c3",
    serviceMenuItemName: "Men's cut",
    scheduledStart: inHours(30),
    scheduledEnd: inHours(30.5),
    status: "PENDING_DEPOSIT",
    depositRequired: true,
    depositPaid: true,
    noShowRisk: {
      riskScore: 0.12,
      riskTier: "LOW",
      source: "RULES_FALLBACK",
      computedAt: agoMinutes(600),
    },
  },
  {
    // Brand-new client, no usable history — never punished with a deposit.
    id: "cf000000-0000-0000-0000-0000000000a4",
    contactId: "cf000000-0000-0000-0000-0000000000c4",
    serviceMenuItemName: "Blowout",
    scheduledStart: inHours(48),
    scheduledEnd: inHours(49),
    status: "CONFIRMED",
    noShowRisk: {
      riskScore: 0.1,
      riskTier: "LOW",
      source: "INSUFFICIENT_DATA",
      computedAt: agoMinutes(600),
    },
  },
];

const riskBookings = new Map<string, RiskBooking>(
  seedRiskBookings.map((b) => [b.id, b]),
);

export const chairFillRiskStore = {
  /** Upcoming bookings, highest-risk first (mirrors the BE sort; unscored last). */
  listByRisk(): RiskBooking[] {
    return Array.from(riskBookings.values()).sort((a, b) => {
      const ra = a.noShowRisk?.riskScore ?? -1;
      const rb = b.noShowRisk?.riskScore ?? -1;
      return rb - ra;
    });
  },
};

const seedWaitlistEntries: WaitlistBoardEntry[] = [
  {
    id: "cf000000-0000-0000-0000-0000000000e1",
    contactId: SEED_SALON_CONTACT_ID, // Ada — resolves to a real name
    serviceMenuItemId: "svc-balayage",
    preferredStaffMemberId: SEED_SALON_STYLIST_ID,
    earliestStart: inHours(12),
    latestStart: inHours(72),
    smsOptIn: true,
    notes: "Any afternoon this week works great.",
    createdAt: agoMinutes(90),
  },
  {
    id: "cf000000-0000-0000-0000-0000000000e2",
    contactId: "cf000000-0000-0000-0000-0000000000c5",
    serviceMenuItemId: null, // any service
    preferredStaffMemberId: null, // any stylist
    earliestStart: null,
    latestStart: null,
    smsOptIn: true,
    notes: null,
    createdAt: agoMinutes(220),
  },
  {
    id: "cf000000-0000-0000-0000-0000000000e3",
    contactId: "cf000000-0000-0000-0000-0000000000c6",
    serviceMenuItemId: "svc-color",
    preferredStaffMemberId: null,
    earliestStart: inHours(48),
    latestStart: inHours(120),
    smsOptIn: false, // not textable — never offered
    notes: "Prefers a call, evenings only.",
    createdAt: agoMinutes(400),
  },
];

const seedWaitlistOffers: WaitlistOffer[] = [
  {
    // Live offer awaiting a reply (the showpiece's live half).
    id: "cf000000-0000-0000-0000-0000000000f1",
    freedBookingId: "cf000000-0000-0000-0000-0000000000b9",
    waitlistEntryId: "cf000000-0000-0000-0000-0000000000e1",
    contactId: SEED_SALON_CONTACT_ID,
    contactPhone: "+1 555 0100",
    staffMemberId: SEED_SALON_STYLIST_ID,
    serviceMenuItemId: "svc-balayage",
    serviceMenuItemName: "Balayage + cut",
    slotStart: inHours(5),
    slotEnd: inHours(7),
    rank: 0,
    status: "OFFERED",
    sentAt: agoMinutes(8),
    expiresAt: inHours(1),
    createdAt: agoMinutes(8),
  },
  {
    // Claimed — someone grabbed an earlier freed slot.
    id: "cf000000-0000-0000-0000-0000000000f2",
    freedBookingId: "cf000000-0000-0000-0000-0000000000b8",
    waitlistEntryId: "cf000000-0000-0000-0000-0000000000e2",
    contactId: "cf000000-0000-0000-0000-0000000000c5",
    contactPhone: "+1 555 0177",
    staffMemberId: SEED_SALON_STYLIST_ID,
    serviceMenuItemId: "svc-color",
    serviceMenuItemName: "Single-process color",
    slotStart: agoMinutes(-180), // ~3h out
    slotEnd: agoMinutes(-240),
    rank: 0,
    status: "CLAIMED",
    sentAt: agoMinutes(95),
    expiresAt: agoMinutes(35),
    createdAt: agoMinutes(95),
  },
  {
    // A sibling offer for the same freed slot — superseded by the faster YES.
    id: "cf000000-0000-0000-0000-0000000000f3",
    freedBookingId: "cf000000-0000-0000-0000-0000000000b8",
    waitlistEntryId: "cf000000-0000-0000-0000-0000000000e3",
    contactId: "cf000000-0000-0000-0000-0000000000c6",
    contactPhone: "+1 555 0199",
    staffMemberId: SEED_SALON_STYLIST_ID,
    serviceMenuItemId: "svc-color",
    serviceMenuItemName: "Single-process color",
    slotStart: agoMinutes(-180),
    slotEnd: agoMinutes(-240),
    rank: 1,
    status: "SUPERSEDED",
    sentAt: agoMinutes(95),
    expiresAt: agoMinutes(35),
    createdAt: agoMinutes(95),
  },
];

export const chairFillWaitlistStore = {
  /** OPEN entries, newest join first (mirrors the BE ordering). */
  listEntries(): WaitlistBoardEntry[] {
    return [...seedWaitlistEntries].sort((a, b) =>
      (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
    );
  },
  /** Recent offers (all statuses), newest sent first, capped by `limit`. */
  listOffers(limit = 50): WaitlistOffer[] {
    return [...seedWaitlistOffers]
      .sort((a, b) => (b.sentAt ?? "").localeCompare(a.sentAt ?? ""))
      .slice(0, limit > 0 ? limit : 50);
  },
  /** The one-shot board envelope. */
  board(offerLimit = 50): WaitlistBoardDTO {
    return {
      openEntries: this.listEntries(),
      recentOffers: this.listOffers(offerLimit),
    };
  },
};

// --- Real Estate Concierge — flagship (RE-5b) -------------------------------
// The four staff surfaces' mock backing. All routes are STAFF + realestate-
// module-gated on the BE (and @ConditionalOnProperty, so hand-written here — the
// ChairFill CF-5b precedent). The store resets per page load.
//
// Seeded so the showpiece reads end-to-end:
//   - One listing (Bella Vita's flagship) with disclosures (indexed) + photos.
//   - One DRAFTED marketing package with a Fair-Housing flag (the review queue).
//   - A HOT conversation with a cited transcript + a full qualification + a
//     linked deal, plus a WARM, a COLD, and an unscored thread (the pipeline).

const RE_LISTING_ID = "re000000-0000-0000-0000-0000000000a1";
const RE_LISTING_2_ID = "re000000-0000-0000-0000-0000000000a2";

// Buyer contacts + the materialized deal — registered into the shared stores so
// the concierge detail resolves real names + a real deal link.
const RE_BUYER_HOT_ID = "re000000-0000-0000-0000-0000000000b1";
const RE_BUYER_WARM_ID = "re000000-0000-0000-0000-0000000000b2";
const RE_DEAL_ID = "re000000-0000-0000-0000-0000000000d1";

contactStore.create({
  id: RE_BUYER_HOT_ID,
  type: "PERSON",
  firstName: "Marcus",
  lastName: "Bell",
  displayName: "Marcus Bell",
  emails: ["marcus.bell@example.test"],
  phones: [{ number: "+1 555 0142", label: "mobile" }],
  tags: ["buyer", "seed"],
});
contactStore.create({
  id: RE_BUYER_WARM_ID,
  type: "PERSON",
  firstName: "Priya",
  lastName: "Nadar",
  displayName: "Priya Nadar",
  emails: ["priya.nadar@example.test"],
  phones: [{ number: "+1 555 0188", label: "mobile" }],
  tags: ["buyer", "seed"],
});
dealStore.create({
  id: RE_DEAL_ID,
  title: "Marcus Bell — 1442 Lindenwood Ave",
  stage: "QUALIFIED",
  value: 430000,
  currency: "USD",
  primaryContactId: RE_BUYER_HOT_ID,
});

const reListings = new Map<string, Listing>();
const reDisclosures = new Map<string, ListingDisclosure[]>();
const rePhotos = new Map<string, ListingPhoto[]>();
const reDrafts = new Map<string, ListingMarketingDraft>();
const reConversations = new Map<string, ConciergeConversationDetailDTO>();

function seedRealEstate(): void {
  const listing: Listing = {
    id: RE_LISTING_ID,
    addressLine: "1442 Lindenwood Ave",
    city: "O'Fallon",
    state: "IL",
    zip: "62269",
    mlsNumber: "MLS-884213",
    price: 425000,
    beds: 4,
    baths: 2.5,
    sqft: 2480,
    status: "ACTIVE",
    trackedPhone: "+1 555 0142",
    source: "AGENT_UPLOAD",
    createdAt: agoMinutes(2880),
    updatedAt: agoMinutes(120),
  };
  const listing2: Listing = {
    id: RE_LISTING_2_ID,
    addressLine: "27 Harborview Ct",
    city: "Edwardsville",
    state: "IL",
    zip: "62025",
    price: 615000,
    beds: 5,
    baths: 3,
    sqft: 3320,
    status: "PENDING",
    trackedPhone: "+1 555 0143",
    source: "AGENT_UPLOAD",
    createdAt: agoMinutes(4320),
    updatedAt: agoMinutes(600),
  };
  reListings.set(listing.id!, listing);
  reListings.set(listing2.id!, listing2);

  reDisclosures.set(RE_LISTING_ID, [
    {
      id: "re000000-0000-0000-0000-0000000000c1",
      listingId: RE_LISTING_ID,
      disclosureType: "ROOF",
      text: "Roof replaced in 2021 — architectural asphalt shingles, 30-year transferable warranty on file.",
      indexedAt: agoMinutes(2870),
      createdAt: agoMinutes(2880),
    },
    {
      id: "re000000-0000-0000-0000-0000000000c2",
      listingId: RE_LISTING_ID,
      disclosureType: "BASEMENT",
      text: "Finished walk-out basement, fully waterproofed in 2019 with an interior French drain and sump pump. No history of water intrusion since.",
      indexedAt: agoMinutes(2870),
      createdAt: agoMinutes(2880),
    },
    {
      id: "re000000-0000-0000-0000-0000000000c3",
      listingId: RE_LISTING_ID,
      disclosureType: "SYSTEMS_HVAC",
      text: "Dual-zone HVAC; the furnace and AC were both replaced in 2022 (Carrier, serviced annually).",
      indexedAt: agoMinutes(2870),
      createdAt: agoMinutes(2880),
    },
    {
      id: "re000000-0000-0000-0000-0000000000c4",
      listingId: RE_LISTING_ID,
      disclosureType: "HOA",
      text: "HOA is $240/quarter and covers the neighborhood pool, common-area landscaping, and snow removal on shared drives.",
      indexedAt: agoMinutes(2870),
      createdAt: agoMinutes(2880),
    },
  ]);

  rePhotos.set(RE_LISTING_ID, [
    {
      id: "re000000-0000-0000-0000-0000000000e1",
      listingId: RE_LISTING_ID,
      attachmentId: "re000000-0000-0000-0000-0000000000f1",
      storageRef: "tenant/re/1442-front.jpg",
      filename: "1442-front-elevation.jpg",
      contentType: "image/jpeg",
      sizeBytes: 482_000,
      createdAt: agoMinutes(2875),
    },
    {
      id: "re000000-0000-0000-0000-0000000000e2",
      listingId: RE_LISTING_ID,
      attachmentId: "re000000-0000-0000-0000-0000000000f2",
      storageRef: "tenant/re/1442-kitchen.jpg",
      filename: "1442-kitchen.jpg",
      contentType: "image/jpeg",
      sizeBytes: 661_000,
      createdAt: agoMinutes(2875),
    },
  ]);
  rePhotos.set(RE_LISTING_2_ID, []);

  // The DRAFTED marketing package — the review queue's showpiece, with a
  // Fair-Housing flag the agent must eyeball (surfaced, never auto-blocking).
  const draft: ListingMarketingDraft = {
    id: "re000000-0000-0000-0000-00000000d101",
    listingId: RE_LISTING_ID,
    status: "DRAFTED",
    pieces: [
      {
        channel: "MLS_REMARKS",
        text: "Beautifully updated 4-bed, 2.5-bath in O'Fallon with a finished walk-out basement, dual-zone HVAC (2022), and a 2021 roof. Bright open kitchen, generous primary suite, and a fenced backyard backing to green space. Neighborhood pool and low-maintenance living via the HOA.",
      },
      {
        channel: "INSTAGRAM",
        text: "Just listed in O'Fallon ✨ 4 beds · finished walk-out basement · 2021 roof · neighborhood pool. Move-in ready and waiting. DM for a showing! #ofallonil #justlisted",
      },
      {
        channel: "FACEBOOK",
        text: "New on the market at 1442 Lindenwood Ave — a turnkey 4-bedroom with a finished walk-out basement and a backyard that backs to green space. Updated HVAC and roof mean nothing to do but move in. Message us to tour this week.",
      },
      {
        channel: "EMAIL_BLAST",
        text: "Just listed: 1442 Lindenwood Ave, O'Fallon — $425,000. Four bedrooms, a finished walk-out basement, and major systems already updated (2021 roof, 2022 HVAC). Reply to schedule a private showing.",
      },
    ],
    photoCaptions: [
      {
        photoId: "re000000-0000-0000-0000-0000000000e1",
        caption: "Two-story brick-and-siding front elevation with a covered porch.",
        features: ["covered porch", "manicured landscaping", "two-car garage"],
      },
      {
        photoId: "re000000-0000-0000-0000-0000000000e2",
        caption: "Updated kitchen with quartz counters and stainless appliances.",
        features: ["quartz counters", "stainless appliances", "island seating"],
      },
    ],
    fairHousingFlags: [
      {
        term: "perfect for families",
        channel: "FACEBOOK",
        snippet: "a backyard that backs to green space — perfect for families and",
      },
    ],
    fairHousingFlagged: true,
    generationDegraded: false,
    createdAt: agoMinutes(95),
    updatedAt: agoMinutes(95),
  };
  reDrafts.set(draft.id!, draft);

  // --- Conversations (the inbox + lead pipeline) ----------------------------

  // HOT — a fully-grounded transcript with citations, a complete qualification,
  // and the linked deal. The centerpiece of the citation viewer.
  const hot: ConciergeConversationDetailDTO = {
    id: "re000000-0000-0000-0000-00000000c001",
    listingId: RE_LISTING_ID,
    contactId: RE_BUYER_HOT_ID,
    dealId: RE_DEAL_ID,
    meetingId: null,
    buyerPhone: "+1 555 0142",
    state: "QUALIFYING",
    leadTier: "HOT",
    optedOut: false,
    qualification: {
      budget: 430000,
      timeline: "Looking to close in 45 days",
      financing: "Pre-approved with a local lender",
      preApproved: true,
      intent: "BUY",
      dealMaterialized: true,
    },
    turns: [
      {
        role: "BUYER",
        body: "Hi! Is the roof on 1442 Lindenwood original or has it been replaced?",
        at: agoMinutes(50),
        handoff: false,
        citations: [],
      },
      {
        role: "ASSISTANT",
        body: "Great question — the roof was replaced in 2021 with architectural asphalt shingles, and there's a 30-year transferable warranty on file.",
        at: agoMinutes(49),
        handoff: false,
        citations: [
          {
            disclosureId: "re000000-0000-0000-0000-0000000000c1",
            disclosureType: "ROOF",
            contentPreview:
              "Roof replaced in 2021 — architectural asphalt shingles, 30-year transferable warranty on file.",
            score: 0.91,
          },
        ],
      },
      {
        role: "BUYER",
        body: "Perfect. Any history of water in the basement? It's finished, right?",
        at: agoMinutes(44),
        handoff: false,
        citations: [],
      },
      {
        role: "ASSISTANT",
        body: "Yes, it's a finished walk-out basement. It was fully waterproofed in 2019 with an interior French drain and a sump pump, and there's been no water intrusion since.",
        at: agoMinutes(43),
        handoff: false,
        citations: [
          {
            disclosureId: "re000000-0000-0000-0000-0000000000c2",
            disclosureType: "BASEMENT",
            contentPreview:
              "Finished walk-out basement, fully waterproofed in 2019 with an interior French drain and sump pump. No history of water intrusion since.",
            score: 0.88,
          },
        ],
      },
      {
        role: "BUYER",
        body: "Love it. I'm pre-approved and hoping to close in about 45 days — can we set up a showing this week?",
        at: agoMinutes(40),
        handoff: false,
        citations: [],
      },
      {
        role: "ASSISTANT",
        body: "That's wonderful — I'd love to get you in. Let me hand you to our agent to lock in a time that works. They'll text you shortly!",
        at: agoMinutes(39),
        handoff: true,
        citations: [],
      },
    ],
    lastInboundAt: agoMinutes(40),
    createdAt: agoMinutes(50),
    updatedAt: agoMinutes(39),
  };

  // WARM — a couple of grounded turns, partial qualification, deal not yet made.
  const warm: ConciergeConversationDetailDTO = {
    id: "re000000-0000-0000-0000-00000000c002",
    listingId: RE_LISTING_ID,
    contactId: RE_BUYER_WARM_ID,
    dealId: null,
    meetingId: null,
    buyerPhone: "+1 555 0188",
    state: "ASKING",
    leadTier: "WARM",
    optedOut: false,
    qualification: {
      budget: null,
      timeline: "Just starting to look, maybe this spring",
      financing: null,
      preApproved: null,
      intent: "BUY",
      dealMaterialized: false,
    },
    turns: [
      {
        role: "BUYER",
        body: "What are the HOA fees on this one?",
        at: agoMinutes(200),
        handoff: false,
        citations: [],
      },
      {
        role: "ASSISTANT",
        body: "The HOA is $240 a quarter, and it covers the neighborhood pool, common-area landscaping, and snow removal on the shared drives.",
        at: agoMinutes(199),
        handoff: false,
        citations: [
          {
            disclosureId: "re000000-0000-0000-0000-0000000000c4",
            disclosureType: "HOA",
            contentPreview:
              "HOA is $240/quarter and covers the neighborhood pool, common-area landscaping, and snow removal on shared drives.",
            score: 0.84,
          },
        ],
      },
    ],
    lastInboundAt: agoMinutes(200),
    createdAt: agoMinutes(200),
    updatedAt: agoMinutes(199),
  };

  // COLD — a single question, no contact resolved to a budget; lower tier.
  const cold: ConciergeConversationDetailDTO = {
    id: "re000000-0000-0000-0000-00000000c003",
    listingId: RE_LISTING_ID,
    contactId: null,
    dealId: null,
    meetingId: null,
    buyerPhone: "+1 555 0203",
    state: "ASKING",
    leadTier: "COLD",
    optedOut: false,
    qualification: null,
    turns: [
      {
        role: "BUYER",
        body: "is this still available",
        at: agoMinutes(1500),
        handoff: false,
        citations: [],
      },
      {
        role: "ASSISTANT",
        body: "It is! 1442 Lindenwood Ave is active. Would you like to know more or set up a showing?",
        at: agoMinutes(1499),
        handoff: false,
        citations: [],
      },
    ],
    lastInboundAt: agoMinutes(1500),
    createdAt: agoMinutes(1500),
    updatedAt: agoMinutes(1499),
  };

  // UNSCORED — brand-new inbound, no contact / no score yet (the synthetic
  // "Unscored" pipeline column).
  const unscored: ConciergeConversationDetailDTO = {
    id: "re000000-0000-0000-0000-00000000c004",
    listingId: RE_LISTING_ID,
    contactId: null,
    dealId: null,
    meetingId: null,
    buyerPhone: "+1 555 0260",
    state: "ASKING",
    leadTier: null,
    optedOut: false,
    qualification: null,
    turns: [
      {
        role: "BUYER",
        body: "Does the kitchen have gas or electric?",
        at: agoMinutes(15),
        handoff: false,
        citations: [],
      },
      {
        role: "ASSISTANT",
        body: "I don't have that detail in the listing's disclosures yet — let me loop in our agent so they can confirm for you.",
        at: agoMinutes(14),
        handoff: true,
        citations: [],
      },
    ],
    lastInboundAt: agoMinutes(15),
    createdAt: agoMinutes(15),
    updatedAt: agoMinutes(14),
  };

  for (const c of [hot, warm, cold, unscored]) {
    reConversations.set(c.id!, c);
  }
}

seedRealEstate();

/** A lean summary projection of a stored conversation (mirrors the BE DTO). */
function toConversationSummary(
  c: ConciergeConversationDetailDTO,
): ConciergeConversationSummary {
  return {
    id: c.id,
    listingId: c.listingId,
    contactId: c.contactId,
    dealId: c.dealId,
    state: c.state,
    leadTier: c.leadTier,
    turnCount: c.turns?.length ?? 0,
    optedOut: c.optedOut,
    lastActivityAt: c.lastInboundAt ?? c.updatedAt,
  };
}

let rePhotoSeq = 100;
let reDraftSeq = 200;

export const realEstateStore = {
  // Listings
  listListings(): Listing[] {
    return Array.from(reListings.values()).sort((a, b) =>
      (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
    );
  },
  getListing(id: string): Listing | undefined {
    return reListings.get(id);
  },
  createListing(input: Listing): Listing {
    const id = input.id ?? uuid();
    const now = new Date().toISOString();
    const created: Listing = {
      status: "ACTIVE",
      source: "AGENT_UPLOAD",
      ...input,
      id,
      createdAt: now,
      updatedAt: now,
    };
    reListings.set(id, created);
    if (!reDisclosures.has(id)) reDisclosures.set(id, []);
    if (!rePhotos.has(id)) rePhotos.set(id, []);
    return created;
  },
  updateListing(id: string, input: Listing): Listing | undefined {
    const existing = reListings.get(id);
    if (!existing) return undefined;
    const updated: Listing = {
      ...existing,
      ...input,
      id,
      updatedAt: new Date().toISOString(),
    };
    reListings.set(id, updated);
    return updated;
  },

  // Disclosures
  listDisclosures(listingId: string): ListingDisclosure[] {
    return reDisclosures.get(listingId) ?? [];
  },
  createDisclosure(
    listingId: string,
    body: DisclosureRequest,
  ): ListingDisclosure {
    const now = new Date().toISOString();
    const created: ListingDisclosure = {
      id: uuid(),
      listingId,
      disclosureType: body.disclosureType || "GENERAL",
      text: body.text,
      sourceDocAttachmentId: body.sourceDocAttachmentId,
      // Index immediately in the mock so the "Searchable" state shows at once.
      indexedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    const list = reDisclosures.get(listingId) ?? [];
    list.push(created);
    reDisclosures.set(listingId, list);
    return created;
  },
  updateDisclosure(
    listingId: string,
    id: string,
    body: DisclosureRequest,
  ): ListingDisclosure | undefined {
    const list = reDisclosures.get(listingId) ?? [];
    const idx = list.findIndex((d) => d.id === id);
    if (idx < 0) return undefined;
    const now = new Date().toISOString();
    const updated: ListingDisclosure = {
      ...list[idx],
      disclosureType: body.disclosureType ?? list[idx].disclosureType,
      text: body.text ?? list[idx].text,
      sourceDocAttachmentId:
        body.sourceDocAttachmentId ?? list[idx].sourceDocAttachmentId,
      indexedAt: now,
      updatedAt: now,
    };
    list[idx] = updated;
    reDisclosures.set(listingId, list);
    return updated;
  },

  // Photos
  listPhotos(listingId: string): ListingPhoto[] {
    return rePhotos.get(listingId) ?? [];
  },
  addPhoto(
    listingId: string,
    filename: string,
    contentType: string | undefined,
    sizeBytes: number | undefined,
  ): ListingPhoto {
    const created: ListingPhoto = {
      id: `re-photo-${rePhotoSeq++}`,
      listingId,
      attachmentId: uuid(),
      storageRef: `tenant/re/${filename}`,
      filename,
      contentType: contentType ?? "image/jpeg",
      sizeBytes: sizeBytes ?? 0,
      createdAt: new Date().toISOString(),
    };
    const list = rePhotos.get(listingId) ?? [];
    list.push(created);
    rePhotos.set(listingId, list);
    return created;
  },

  // Marketing drafts
  generate(listingId: string): ListingMarketingDraft {
    const now = new Date().toISOString();
    const draft: ListingMarketingDraft = {
      id: `re-draft-${reDraftSeq++}`,
      listingId,
      status: "DRAFTED",
      pieces: [
        {
          channel: "MLS_REMARKS",
          text: "Newly drafted MLS remarks for this listing, grounded in its facts and photos. Review and refine before publishing.",
        },
        {
          channel: "INSTAGRAM",
          text: "Just listed ✨ Tap for details and DM us for a showing! #justlisted",
        },
        {
          channel: "EMAIL_BLAST",
          text: "Just listed — reply to schedule a private showing this week.",
        },
      ],
      photoCaptions: [],
      fairHousingFlags: [],
      fairHousingFlagged: false,
      generationDegraded: false,
      createdAt: now,
      updatedAt: now,
    };
    reDrafts.set(draft.id!, draft);
    return draft;
  },
  listListingDrafts(listingId: string): ListingMarketingDraft[] {
    return Array.from(reDrafts.values())
      .filter((d) => d.listingId === listingId)
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  },
  listDrafted(): ListingMarketingDraft[] {
    return Array.from(reDrafts.values())
      .filter((d) => d.status === "DRAFTED")
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  },
  approveDraft(id: string): ListingMarketingDraft | undefined {
    const existing = reDrafts.get(id);
    if (!existing || existing.status !== "DRAFTED") return undefined;
    const updated: ListingMarketingDraft = {
      ...existing,
      status: "APPROVED",
      approvedAt: new Date().toISOString(),
      approvedByUserId: SMOKE_USER.id,
      updatedAt: new Date().toISOString(),
    };
    reDrafts.set(id, updated);
    return updated;
  },
  skipDraft(id: string): ListingMarketingDraft | undefined {
    const existing = reDrafts.get(id);
    if (!existing || existing.status !== "DRAFTED") return undefined;
    const updated: ListingMarketingDraft = {
      ...existing,
      status: "SKIPPED",
      updatedAt: new Date().toISOString(),
    };
    reDrafts.set(id, updated);
    return updated;
  },

  // Conversations
  listConversations(listingId?: string): ConciergeConversationSummary[] {
    return Array.from(reConversations.values())
      .filter((c) => !listingId || c.listingId === listingId)
      .sort((a, b) =>
        (b.lastInboundAt ?? b.updatedAt ?? "").localeCompare(
          a.lastInboundAt ?? a.updatedAt ?? "",
        ),
      )
      .map(toConversationSummary);
  },
  getConversation(id: string): ConciergeConversationDetailDTO | undefined {
    return reConversations.get(id);
  },
};

// --- Real Estate T10 — Listing Prep Studio -----------------------------------
// Seeded with one DRAFTED prep pack for the first seeded listing (RE_LISTING_ID)
// with a 4-week calendar, one held/safe-substituted post (week 3), two
// Fair-Housing flags (on description + email surfaces), and a realistic MLS
// description + email campaign. The second pack is APPROVED (history row).
// A test-reset handler restores the seed state.

const PREP_PACK_1_ID = "pp000000-0000-0000-0000-000000000001";
const PREP_PACK_2_ID = "pp000000-0000-0000-0000-000000000002";

const seedSocialCalendar: SocialPost[] = [
  // Week 1
  {
    postDate: "2026-06-16",
    weekIndex: 1,
    dayOffset: 0,
    channel: "INSTAGRAM",
    copy: "Just listed at 1442 Lindenwood Ave — 3 bed, 2 bath, soaring ceilings and a chef's kitchen. Schedule your showing today! 🏡 #justlisted #stlouishomes",
    fairHousingSafe: true,
    heldReason: null,
  },
  {
    postDate: "2026-06-18",
    weekIndex: 1,
    dayOffset: 2,
    channel: "FACEBOOK",
    copy: "Open house this Saturday 11am–2pm at 1442 Lindenwood Ave. Come see the renovated master bath and the oversized backyard — bring your coffee, take a tour. Reply for details.",
    fairHousingSafe: true,
    heldReason: null,
  },
  {
    postDate: "2026-06-20",
    weekIndex: 1,
    dayOffset: 4,
    channel: "X",
    copy: "New listing alert: 1442 Lindenwood Ave, 3bd/2ba. Roof 2021, HVAC 2022. DM for a private tour. #realestate #ofallon",
    fairHousingSafe: true,
    heldReason: null,
  },
  // Week 2
  {
    postDate: "2026-06-23",
    weekIndex: 2,
    dayOffset: 7,
    channel: "INSTAGRAM",
    copy: "Still on the market — and worth a second look. The sunlit breakfast nook and freshly finished hardwoods at 1442 Lindenwood Ave are calling your name. 📸 Link in bio for the full gallery. #stlrealestate",
    fairHousingSafe: true,
    heldReason: null,
  },
  {
    postDate: "2026-06-25",
    weekIndex: 2,
    dayOffset: 9,
    channel: "FACEBOOK",
    copy: "Did you know? The seller replaced every window at 1442 Lindenwood in 2023 — double-pane, argon-filled, transferable warranty. Energy savings and peace of mind included. Schedule a showing today.",
    fairHousingSafe: true,
    heldReason: null,
  },
  // Week 3 — one held post (safe-substituted)
  {
    postDate: "2026-06-30",
    weekIndex: 3,
    dayOffset: 14,
    channel: "INSTAGRAM",
    // Safe substitute (original held for Fair-Housing lint match)
    copy: "Looking for a home in a welcoming community? 1442 Lindenwood Ave is a beautiful 3 bd/2 ba that checks all the boxes. Contact us to schedule your private tour.",
    fairHousingSafe: false,
    heldReason: "perfect for families",
  },
  {
    postDate: "2026-07-02",
    weekIndex: 3,
    dayOffset: 16,
    channel: "FACEBOOK",
    copy: "Price reflects the value — 1442 Lindenwood Ave is priced to move at $430,000. Comparable sales in the area support it. Come see it before it's gone.",
    fairHousingSafe: true,
    heldReason: null,
  },
  // Week 4
  {
    postDate: "2026-07-07",
    weekIndex: 4,
    dayOffset: 21,
    channel: "INSTAGRAM",
    copy: "Last call — 1442 Lindenwood Ave is still available! The seller is motivated. Contact us today for a showing before this one is off the market. 🏡 #motivated #stlouishomes",
    fairHousingSafe: true,
    heldReason: null,
  },
  {
    postDate: "2026-07-09",
    weekIndex: 4,
    dayOffset: 23,
    channel: "X",
    copy: "Week 4 and still available: 1442 Lindenwood Ave, 3bd/2ba $430K. Roof/HVAC/windows all updated. Serious buyers — DM us. #realestate",
    fairHousingSafe: true,
    heldReason: null,
  },
];

const seedFairHousingFlags: PrepFairHousingFlag[] = [
  {
    term: "perfect for families",
    surface: "CALENDAR week 3",
    snippet: "looking for a home perfect for families with children",
  },
  {
    term: "walking distance to churches",
    surface: "DESCRIPTION",
    snippet: "conveniently walking distance to churches and schools",
  },
];

const SEED_PREP_PACK_1: ListingPrepPack = {
  id: PREP_PACK_1_ID,
  tenantId: SMOKE_USER.tenantId!,
  listingId: RE_LISTING_ID,
  mlsDescription:
    "Beautifully maintained 3-bedroom, 2-bath home at 1442 Lindenwood Ave. Soaring ceilings and hardwood floors flow through an open-plan living and dining area. The chef's kitchen features granite counters, stainless appliances, and a gas range. The primary suite has a renovated en-suite bath with heated floors. Roof replaced 2021 (architectural shingles, transferable warranty), HVAC 2022, all windows 2023 (double-pane argon, transferable warranty). Oversized backyard with a patio — great for entertaining. Attached 2-car garage. Convenient access to I-64 and Metro East amenities. List price $430,000 — priced in line with recent comps.",
  emailCampaign:
    "Subject: Just Listed — 1442 Lindenwood Ave | 3 BD / 2 BA | $430,000\n\nHi [First Name],\n\nA beautifully maintained home just hit the market in O'Fallon and I wanted you to be among the first to know.\n\n1442 Lindenwood Ave — 3 BD / 2 BA — $430,000\n\nHighlights:\n• Roof replaced 2021 (transferable warranty)\n• HVAC replaced 2022\n• All windows replaced 2023 (double-pane, transferable warranty)\n• Renovated primary bath with heated floors\n• Open-plan kitchen with granite counters + gas range\n• Oversized backyard with patio\n\nThis one is priced right and priced to move. Reply to this email or call me directly to schedule a private showing this week.\n\nBest,\n[Agent Name]",
  socialCalendar: seedSocialCalendar,
  photoCaptions: [
    {
      photoId: "re-photo-1",
      caption: "Bright open-plan living room with hardwood floors and vaulted ceilings",
      features: ["hardwood floors", "vaulted ceilings", "natural light"],
    },
    {
      photoId: "re-photo-2",
      caption: "Chef's kitchen with granite counters and stainless appliances",
      features: ["granite counters", "stainless appliances", "gas range"],
    },
  ],
  fairHousingFlags: seedFairHousingFlags,
  fairHousingFlagged: true,
  calendarHeldCount: 1,
  generationDegraded: false,
  status: "DRAFTED",
  approvedAt: null,
  approvedByUserId: null,
  version: 0,
  createdAt: "2026-06-10T09:00:00Z",
  updatedAt: "2026-06-10T09:00:00Z",
};

const SEED_PREP_PACK_2: ListingPrepPack = {
  id: PREP_PACK_2_ID,
  tenantId: SMOKE_USER.tenantId!,
  listingId: RE_LISTING_ID,
  mlsDescription: "Earlier MLS draft — approved and filed.",
  emailCampaign: "Earlier email draft — approved and filed.",
  socialCalendar: [],
  photoCaptions: [],
  fairHousingFlags: [],
  fairHousingFlagged: false,
  calendarHeldCount: 0,
  generationDegraded: false,
  status: "APPROVED",
  approvedAt: "2026-06-09T14:00:00Z",
  approvedByUserId: SMOKE_USER.id,
  version: 1,
  createdAt: "2026-06-09T08:00:00Z",
  updatedAt: "2026-06-09T14:00:00Z",
};

let listingPrepPacks = new Map<string, ListingPrepPack>([
  [PREP_PACK_1_ID, { ...SEED_PREP_PACK_1 }],
  [PREP_PACK_2_ID, { ...SEED_PREP_PACK_2 }],
]);
let prepPackSeq = 10;

export const listingPrepStore = {
  /**
   * POST /realestate/listings/{listingId}/prep/generate
   * Generates a fresh DRAFTED pack (no @IdempotentRoute on the BE controller).
   */
  generate(
    listingId: string,
    _startDate?: string | null,
    _postsPerWeek?: number | null,
  ): ListingPrepPack {
    const now = new Date().toISOString();
    // Generate a new pack with a 4-week calendar seeded from the first listing
    const newCalendar: SocialPost[] = seedSocialCalendar.map((p) => ({ ...p }));
    const pack: ListingPrepPack = {
      id: `pp-gen-${prepPackSeq++}`,
      tenantId: SMOKE_USER.tenantId!,
      listingId,
      mlsDescription:
        "Freshly generated MLS description — review the Fair-Housing flags and refine before publishing.",
      emailCampaign:
        "Subject: Just Listed — [address]\n\nHi [First Name],\n\nA new listing you may love just hit the market. Contact us to schedule a showing.\n\nBest,\n[Agent Name]",
      socialCalendar: newCalendar,
      photoCaptions: [],
      fairHousingFlags: seedFairHousingFlags.map((f) => ({ ...f })),
      fairHousingFlagged: true,
      calendarHeldCount: 1,
      generationDegraded: false,
      status: "DRAFTED",
      approvedAt: null,
      approvedByUserId: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
    };
    listingPrepPacks.set(pack.id, pack);
    return pack;
  },

  /**
   * GET /realestate/listings/{listingId}/prep/packs
   * Lists a listing's packs, most-recent first.
   */
  listForListing(listingId: string): ListingPrepPack[] {
    return Array.from(listingPrepPacks.values())
      .filter((p) => p.listingId === listingId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  /**
   * GET /realestate/prep/packs
   * All DRAFTED packs for the tenant (the review queue), most-recent first.
   */
  listDrafted(): ListingPrepPack[] {
    return Array.from(listingPrepPacks.values())
      .filter((p) => p.status === "DRAFTED")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  /**
   * GET /realestate/prep/packs/{id}
   * A single pack. Returns undefined (→ 4460) if not found.
   */
  get(id: string): ListingPrepPack | undefined {
    return listingPrepPacks.get(id);
  },

  /**
   * POST /realestate/prep/packs/{id}/approve
   * Approve a DRAFTED pack → APPROVED. Returns undefined (→ 4460) if not found;
   * null (→ 4461/409) if not DRAFTED.
   */
  approve(id: string): ListingPrepPack | undefined | null {
    const existing = listingPrepPacks.get(id);
    if (!existing) return undefined;
    if (existing.status !== "DRAFTED") return null;
    const updated: ListingPrepPack = {
      ...existing,
      status: "APPROVED",
      approvedAt: new Date().toISOString(),
      approvedByUserId: SMOKE_USER.id,
      updatedAt: new Date().toISOString(),
    };
    listingPrepPacks.set(id, updated);
    return updated;
  },

  /**
   * POST /realestate/prep/packs/{id}/skip
   * Skip a DRAFTED pack → SKIPPED. Returns undefined (→ 4460) if not found;
   * null (→ 4461/409) if not DRAFTED.
   */
  skip(id: string): ListingPrepPack | undefined | null {
    const existing = listingPrepPacks.get(id);
    if (!existing) return undefined;
    if (existing.status !== "DRAFTED") return null;
    const updated: ListingPrepPack = {
      ...existing,
      status: "SKIPPED",
      updatedAt: new Date().toISOString(),
    };
    listingPrepPacks.set(id, updated);
    return updated;
  },

  /** TEST-ONLY: restore seed state. */
  reset() {
    listingPrepPacks = new Map([
      [PREP_PACK_1_ID, { ...SEED_PREP_PACK_1 }],
      [PREP_PACK_2_ID, { ...SEED_PREP_PACK_2 }],
    ]);
    prepPackSeq = 10;
  },
};

// --- FrontDesk IQ — Health Practices flagship (FD-5b) ------------------------
// Five staff surfaces, all STAFF + frontdesk-module-gated on the BE and
// @ConditionalOnProperty-gated (so hand-written, no generated alias — the RE-5b
// / CF-5b / HS-4 precedent):
//   - Risk-sorted day view  (GET /frontdesk/risk/appointments) — appointments
//     across HIGH/MED/LOW + unscored tiers, logistics-only (visit bucket, lead
//     time, insurance-pending), highest-risk first; never a clinical field.
//   - Recall board          (GET /frontdesk/recall) — lapsed patients, most
//     overdue first, with the nudged-this-period flag.
//   - Callback inbox        (GET /frontdesk/callbacks) — after-hours voicemail
//     callbacks with an intent bucket; fence F2 — NO transcript field at all.
//   - Review inbox          (POST /frontdesk/reviews/draft, GET /frontdesk/
//     reviews, .../{id}/approve, .../{id}/skip) — the signature demo: a pasted
//     review → a HIPAA-safe DraftedReply {reply, hipaaFlags}; one seed carries a
//     sample lint flag so the HIPAA check renders out of the box.
//   - Appointment console   (GET/POST /frontdesk/appointments) — create/list to
//     seed the day view.
// Patients are real contacts so the day view resolves their names.

const FD_PATIENT_1_ID = "fd000000-0000-0000-0000-0000000000p1";
const FD_PATIENT_2_ID = "fd000000-0000-0000-0000-0000000000p2";
const FD_PATIENT_3_ID = "fd000000-0000-0000-0000-0000000000p3";
const FD_PATIENT_4_ID = "fd000000-0000-0000-0000-0000000000p4";

contactStore.create({
  id: FD_PATIENT_1_ID,
  type: "PERSON",
  firstName: "Eleanor",
  lastName: "Vance",
  displayName: "Eleanor Vance",
  emails: ["eleanor.vance@example.test"],
  phones: [{ number: "+1 555 0211", label: "mobile" }],
  tags: ["patient", "seed"],
});
contactStore.create({
  id: FD_PATIENT_2_ID,
  type: "PERSON",
  firstName: "Theo",
  lastName: "Okafor",
  displayName: "Theo Okafor",
  emails: ["theo.okafor@example.test"],
  phones: [{ number: "+1 555 0233", label: "mobile" }],
  tags: ["patient", "seed"],
});
contactStore.create({
  id: FD_PATIENT_3_ID,
  type: "PERSON",
  firstName: "Mara",
  lastName: "Lindqvist",
  displayName: "Mara Lindqvist",
  emails: ["mara.l@example.test"],
  phones: [{ number: "+1 555 0244", label: "mobile" }],
  tags: ["patient", "seed"],
});
contactStore.create({
  id: FD_PATIENT_4_ID,
  type: "PERSON",
  firstName: "Sang",
  lastName: "Pham",
  displayName: "Sang Pham",
  emails: ["sang.pham@example.test"],
  phones: [{ number: "+1 555 0255", label: "mobile" }],
  tags: ["patient", "seed"],
});

export const SEED_FD_HIGH_APPOINTMENT_ID =
  "fd000000-0000-0000-0000-0000000000a1";

const seedFrontDeskAppointments: Appointment[] = [
  {
    id: SEED_FD_HIGH_APPOINTMENT_ID,
    tenantId: SMOKE_USER.tenantId,
    contactId: FD_PATIENT_1_ID, // Eleanor Vance
    visitTypeBucket: "NEW_PATIENT",
    scheduledStart: inHours(20),
    scheduledEnd: inHours(21),
    status: "SCHEDULED",
    insuranceVerificationPending: true,
    reminderCount: 0,
    noShowRisk: {
      riskScore: 0.81,
      riskTier: "HIGH",
      source: "MODEL",
      computedAt: agoMinutes(600),
    },
  },
  {
    id: "fd000000-0000-0000-0000-0000000000a2",
    tenantId: SMOKE_USER.tenantId,
    contactId: FD_PATIENT_2_ID, // Theo Okafor
    visitTypeBucket: "RECALL",
    scheduledStart: inHours(24),
    scheduledEnd: inHours(24.5),
    status: "CONFIRMED",
    insuranceVerificationPending: false,
    reminderCount: 1,
    noShowRisk: {
      riskScore: 0.47,
      riskTier: "MEDIUM",
      source: "MODEL",
      computedAt: agoMinutes(600),
    },
  },
  {
    id: "fd000000-0000-0000-0000-0000000000a3",
    tenantId: SMOKE_USER.tenantId,
    contactId: FD_PATIENT_3_ID, // Mara Lindqvist
    visitTypeBucket: "HYGIENE",
    scheduledStart: inHours(28),
    scheduledEnd: inHours(28.5),
    status: "CONFIRMED",
    insuranceVerificationPending: false,
    reminderCount: 2,
    noShowRisk: {
      riskScore: 0.14,
      riskTier: "LOW",
      source: "RULES_FALLBACK",
      computedAt: agoMinutes(600),
    },
  },
  {
    // Brand-new patient, no usable history — scored LOW (never punished on zero
    // evidence; INSUFFICIENT_DATA reads "Not enough history yet").
    id: "fd000000-0000-0000-0000-0000000000a4",
    tenantId: SMOKE_USER.tenantId,
    contactId: FD_PATIENT_4_ID, // Sang Pham
    visitTypeBucket: "ANNUAL_WELLNESS",
    scheduledStart: inHours(44),
    scheduledEnd: inHours(45),
    status: "SCHEDULED",
    insuranceVerificationPending: true,
    reminderCount: 0,
    noShowRisk: {
      riskScore: 0.1,
      riskTier: "LOW",
      source: "INSUFFICIENT_DATA",
      computedAt: agoMinutes(600),
    },
  },
];

const frontDeskAppointments = new Map<string, Appointment>(
  seedFrontDeskAppointments.map((a) => [a.id!, a]),
);

export const frontDeskAppointmentStore = {
  /** Every appointment for the tenant (the console list). */
  list(): Appointment[] {
    return Array.from(frontDeskAppointments.values());
  },
  /** Upcoming appointments, highest-risk first (mirrors the BE sort; unscored last). */
  listByRisk(): Appointment[] {
    return Array.from(frontDeskAppointments.values()).sort((a, b) => {
      const ra = a.noShowRisk?.riskScore ?? -1;
      const rb = b.noShowRisk?.riskScore ?? -1;
      return rb - ra;
    });
  },
  get(id: string): Appointment | undefined {
    return frontDeskAppointments.get(id);
  },
  create(body: Appointment): Appointment {
    const now = new Date().toISOString();
    const created: Appointment = {
      ...body,
      id: uuid(),
      tenantId: SMOKE_USER.tenantId,
      status: body.status ?? "SCHEDULED",
      visitTypeBucket: body.visitTypeBucket ?? "OTHER",
      insuranceVerificationPending: body.insuranceVerificationPending ?? false,
      reminderCount: body.reminderCount ?? 0,
      // A freshly-created appointment is scored next run — surface a sensible
      // MEDIUM stamp so the day view shows it ranked rather than unscored.
      noShowRisk: body.noShowRisk ?? {
        riskScore: 0.4,
        riskTier: "MEDIUM",
        source: "RULES_FALLBACK",
        computedAt: now,
      },
      createdAt: now,
      updatedAt: now,
    };
    frontDeskAppointments.set(created.id!, created);
    return created;
  },
  update(id: string, body: Appointment): Appointment | undefined {
    const existing = frontDeskAppointments.get(id);
    if (!existing) return undefined;
    const updated: Appointment = {
      ...existing,
      ...body,
      id,
      tenantId: existing.tenantId,
      updatedAt: new Date().toISOString(),
    };
    frontDeskAppointments.set(id, updated);
    return updated;
  },
  /** A manual no-show retrain — returns a DONE job (the day view re-fetches after). */
  retrain(): FrontDeskScoringJob {
    const now = new Date().toISOString();
    return {
      id: uuid(),
      tenantId: SMOKE_USER.tenantId,
      status: "DONE",
      appointmentsScored: frontDeskAppointments.size,
      startedAt: now,
      completedAt: now,
      createdAt: now,
    };
  },
};

// Recall board — lapsed patients, the BE already resolves `name` into the DTO.
const seedRecallDue: RecallDueDTO[] = [
  {
    contactId: "fd000000-0000-0000-0000-0000000000r1",
    name: "Harriet Stowe",
    lastVisitAt: new Date(
      Date.now() - 410 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    daysSinceLastVisit: 410,
    nudgedThisPeriod: false,
  },
  {
    contactId: "fd000000-0000-0000-0000-0000000000r2",
    name: "Desmond Tutu",
    lastVisitAt: new Date(
      Date.now() - 295 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    daysSinceLastVisit: 295,
    nudgedThisPeriod: true,
  },
  {
    contactId: "fd000000-0000-0000-0000-0000000000r3",
    name: "Wendell Berry",
    lastVisitAt: new Date(
      Date.now() - 210 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    daysSinceLastVisit: 210,
    nudgedThisPeriod: false,
  },
];

export const frontDeskRecallStore = {
  /** Lapsed patients, most-overdue first (mirrors the BE sort). */
  list(): RecallDueDTO[] {
    return [...seedRecallDue].sort(
      (a, b) => (b.daysSinceLastVisit ?? 0) - (a.daysSinceLastVisit ?? 0),
    );
  },
};

// Callback inbox — fence F2: logistics-only, NO transcript field anywhere. The
// intent bucket is the routing hint; there is deliberately no body/recording.
const seedCallbacks: CallbackInboxItemDTO[] = [
  {
    activityId: "fd000000-0000-0000-0000-0000000000k1",
    contactId: FD_PATIENT_2_ID,
    callerName: "Theo Okafor",
    callbackPhone: "+1 555 0233",
    intentBucket: "SCHEDULING",
    callbackRequested: true,
    receivedAt: agoMinutes(45),
  },
  {
    activityId: "fd000000-0000-0000-0000-0000000000k2",
    contactId: null,
    callerName: "Unknown caller",
    callbackPhone: "+1 555 0299",
    intentBucket: "PRESCRIPTION_REFILL_REQUEST",
    callbackRequested: true,
    receivedAt: agoMinutes(120),
  },
  {
    activityId: "fd000000-0000-0000-0000-0000000000k3",
    contactId: null,
    callerName: "Bridget Ng",
    callbackPhone: "+1 555 0277",
    intentBucket: "BILLING",
    callbackRequested: false,
    receivedAt: agoMinutes(360),
  },
];

export const frontDeskCallbackStore = {
  /** After-hours callbacks, newest first (mirrors the BE order). */
  list(): CallbackInboxItemDTO[] {
    return [...seedCallbacks].sort((a, b) =>
      (b.receivedAt ?? "").localeCompare(a.receivedAt ?? ""),
    );
  },
};

// Review inbox — the DraftedReply { reply, hipaaFlags } queue. One seed carries
// a sample HIPAA-lint flag so the HIPAA check renders out of the box; a paste-in
// produces a clean (no-flags) HIPAA-safe draft.
const SEED_FD_REVIEW_ID = "fd000000-0000-0000-0000-0000000000v1";

const frontDeskReviews = new Map<string, DraftedReply>();
frontDeskReviews.set(SEED_FD_REVIEW_ID, {
  reply: {
    id: SEED_FD_REVIEW_ID,
    tenantId: SMOKE_USER.tenantId,
    reviewId: "health-pasted/seed-1",
    rating: 2,
    reviewerName: "Jordan M.",
    comment:
      "Waited 40 minutes past my appointment time and the front desk was hard to reach. Disappointing visit.",
    // A HIPAA-safe draft (thank / apologize / invite offline) — but it slipped
    // in "your appointment", which the lint flags as patient-status confirmation
    // so the staffer can soften it before posting.
    draftedReply:
      "Hi Jordan, thank you for taking the time to share this. We're sorry your appointment didn't meet expectations, and we take feedback like this seriously. We'd welcome the chance to make it right — please give our office a call so we can speak with you directly.",
    status: "DRAFTED",
    receivedAt: agoMinutes(30),
    createdAt: agoMinutes(30),
    updatedAt: agoMinutes(30),
  },
  hipaaFlags: [
    {
      category: "PATIENT_STATUS",
      term: "your appointment",
      snippet: "sorry your appointment didn't meet",
    },
  ],
});

export const frontDeskReviewStore = {
  /** DRAFTED only, most-recent first (mirrors the BE list contract). */
  listDrafted(): DraftedReply[] {
    return Array.from(frontDeskReviews.values())
      .filter((d) => d.reply?.status === "DRAFTED")
      .sort((a, b) =>
        (b.reply?.receivedAt ?? "").localeCompare(a.reply?.receivedAt ?? ""),
      );
  },
  /**
   * Paste-in: draft a HIPAA-safe reply for a pasted review and queue it DRAFTED.
   * The canned draft is clean (thank / apologize / invite-offline, no clinical
   * mention, no patient-status confirmation) → empty hipaaFlags (the all-clear).
   */
  draftPasteIn(input: {
    comment: string;
    reviewerName?: string;
    rating?: number;
    externalReviewId?: string;
    createTime?: string;
  }): DraftedReply {
    const now = new Date().toISOString();
    const name = input.reviewerName?.trim();
    const critical = (input.rating ?? 5) <= 3;
    const draftedReply = critical
      ? `${name ? `Hi ${name}, thank you` : "Thank you"} for taking the time to share this. We're sorry to hear your experience didn't meet expectations, and we take feedback like this seriously. We'd welcome the chance to learn more and make things right — please give our office a call so we can speak with you directly.`
      : `${name ? `Thank you so much, ${name}!` : "Thank you so much for the kind words!"} We truly appreciate you taking the time to share this, and we look forward to seeing you again. Please don't hesitate to reach out to our office anytime.`;
    const created: DraftedReply = {
      reply: {
        id: uuid(),
        tenantId: SMOKE_USER.tenantId,
        reviewId:
          input.externalReviewId ??
          `health-pasted/${Math.random().toString(36).slice(2)}`,
        rating: input.rating ?? undefined,
        reviewerName: input.reviewerName,
        comment: input.comment,
        reviewCreateTime: input.createTime ?? now,
        draftedReply,
        status: "DRAFTED",
        receivedAt: now,
        createdAt: now,
        updatedAt: now,
      },
      // The canned draft is HIPAA-safe by construction → no flags (all-clear).
      hipaaFlags: [],
    };
    frontDeskReviews.set(created.reply!.id!, created);
    return created;
  },
  /** Approve → POSTED (copy-ready, no live Google call). 404 if missing, 409 if not DRAFTED. */
  approve(id: string): DraftedReply | { code: number } {
    const existing = frontDeskReviews.get(id);
    if (!existing || !existing.reply) return { code: 4292 };
    if (existing.reply.status !== "DRAFTED") return { code: 4291 };
    const updated: DraftedReply = {
      ...existing,
      reply: {
        ...existing.reply,
        status: "POSTED",
        postedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
    frontDeskReviews.set(id, updated);
    return updated;
  },
  /** Skip → SKIPPED, no Google call. 404 if missing, 409 if not DRAFTED. */
  skip(id: string): DraftedReply | { code: number } {
    const existing = frontDeskReviews.get(id);
    if (!existing || !existing.reply) return { code: 4292 };
    if (existing.reply.status !== "DRAFTED") return { code: 4291 };
    const updated: DraftedReply = {
      ...existing,
      reply: {
        ...existing.reply,
        status: "SKIPPED",
        updatedAt: new Date().toISOString(),
      },
    };
    frontDeskReviews.set(id, updated);
    return updated;
  },
};

// --- AR — Accounts Receivable / Collections module --------------------------
// Aging dashboard + promise-to-pay mock backing. All routes are STAFF +
// ar-module-gated on the BE (@ConditionalOnProperty, so hand-written here —
// the FrontDesk FD-5b / ChairFill CF-5b / HS-4 precedent). The store resets
// per page load.
//
// Seeded to showcase the "here's $X past due you didn't know about" demo moment:
//   - CURRENT: 0 outstanding (nothing due yet)
//   - D1_7:   2 invoices / $3,450.00 (fresh late)
//   - D8_14:  1 invoice  / $1,200.00
//   - D15_30: 3 invoices / $7,800.00
//   - D30_PLUS: 2 invoices / $12,500.00 (the red bucket — most urgent)
// grandTotalPastDue = 3450 + 1200 + 7800 + 12500 = 24950
//
// Two seeded promises-to-pay — one ACTIVE and one KEPT — wired to a seeded
// OVERDUE invoice so the promise panel renders with realistic data.

const AR_OVERDUE_INVOICE_ID = "ar000000-0000-0000-0000-000000000001";
const AR_OVERDUE_INVOICE_2_ID = "ar000000-0000-0000-0000-000000000002";

// Register two OVERDUE invoices into the shared invoice store so they show in
// the invoice picker.
invoiceStore.create({
  id: AR_OVERDUE_INVOICE_ID,
  invoiceNumber: "INV-1042",
  status: "OVERDUE",
  currency: "USD",
  total: 3450,
  dueAt: agoMinutes(7 * 24 * 60), // 7 days ago
});
invoiceStore.create({
  id: AR_OVERDUE_INVOICE_2_ID,
  invoiceNumber: "INV-1031",
  status: "OVERDUE",
  currency: "USD",
  total: 12500,
  dueAt: agoMinutes(35 * 24 * 60), // 35 days ago
});

const SEED_AR_AGING_REPORT: ArAgingReport = {
  buckets: [
    { label: "CURRENT",  count: 0, totalBalance: 0 },
    { label: "D1_7",     count: 2, totalBalance: 3450.0 },
    { label: "D8_14",    count: 1, totalBalance: 1200.0 },
    { label: "D15_30",   count: 3, totalBalance: 7800.0 },
    { label: "D30_PLUS", count: 2, totalBalance: 12500.0 },
  ],
  grandTotalPastDue: 24950.0,
  primaryCurrency: "USD",
};

const seedPromises: PromiseToPay[] = [
  {
    id: "ar000000-0000-0000-0000-00000000p001",
    invoiceId: AR_OVERDUE_INVOICE_ID,
    promisedDate: "2026-06-15",
    promisedAmount: 3450,
    status: "ACTIVE",
    note: "Called 2026-06-09, will pay by end of week.",
    createdAt: agoMinutes(60),
  },
  {
    id: "ar000000-0000-0000-0000-00000000p002",
    invoiceId: AR_OVERDUE_INVOICE_2_ID,
    promisedDate: "2026-06-01",
    promisedAmount: 12500,
    status: "BROKEN",
    note: "Missed the agreed date — follow up needed.",
    createdAt: agoMinutes(14 * 24 * 60),
  },
];

const arPromises = new Map<string, PromiseToPay>(
  seedPromises.map((p) => [p.id, p]),
);

export const arStore = {
  /** The AR-aging report (static seed — mirrors the BE's tenant-scoped report). */
  getAgingReport(): ArAgingReport {
    return SEED_AR_AGING_REPORT;
  },

  /** Promises to pay for a given invoice, newest first. */
  listPromises(invoiceId: string): PromiseToPay[] {
    return Array.from(arPromises.values())
      .filter((p) => p.invoiceId === invoiceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  /** Record a new promise to pay. 4601 if invoice absent, 4602 on invalid input. */
  recordPromise(body: {
    invoiceId: string;
    promisedDate: string;
    promisedAmount?: number;
    note?: string;
  }): PromiseToPay | { code: number; message: string } {
    if (!body.invoiceId) {
      return { code: 4601, message: "Invoice not found" };
    }
    if (!body.promisedDate || !/^\d{4}-\d{2}-\d{2}$/.test(body.promisedDate)) {
      return { code: 4602, message: "Invalid date format — expected YYYY-MM-DD" };
    }
    if (
      body.promisedAmount !== undefined &&
      (isNaN(body.promisedAmount) || body.promisedAmount < 0)
    ) {
      return { code: 4602, message: "Amount must be a positive number" };
    }
    const created: PromiseToPay = {
      id: `ar000000-0000-0000-0000-${Date.now().toString(16).padStart(12, "0")}`,
      invoiceId: body.invoiceId,
      promisedDate: body.promisedDate,
      promisedAmount: body.promisedAmount,
      status: "ACTIVE",
      note: body.note,
      createdAt: new Date().toISOString(),
    };
    arPromises.set(created.id, created);
    return created;
  },
};

// ---------------------------------------------------------------------------
// Real Estate "Database Goldmine" — dormant-lead nurture (T1) — seed store
// ---------------------------------------------------------------------------
//
// A single seeded RE reactivation campaign (A–D dormancy segments) + a mutable
// per-segment funnel. segmentAndEnroll() simulates a realistic run: it enrolls a
// batch of newly-dormant contacts into the in-flight columns AND advances a
// couple toward replied/booked, so the demo funnel visibly fills on the trigger
// (the 60-second "watch the cadence fire + a reply book a showing" beat).

const RE_NURTURE_CAMPAIGN_ID = "9c000000-0000-0000-0000-0000000000c1";
const RE_TENANT_ID = "22222222-2222-2222-2222-222222222222";

const SEED_RE_NURTURE_CAMPAIGN: NurtureCampaign = {
  id: RE_NURTURE_CAMPAIGN_ID,
  tenantId: RE_TENANT_ID,
  name: "Past-buyer reactivation",
  description:
    "Win back contacts who've gone quiet — a multi-touch SMS+email cadence " +
    "tiered by how long they've been dormant.",
  active: true,
  segments: [
    { bucket: "A", minDaysSinceLastActivity: 90, maxDaysSinceLastActivity: 180, minLifetimeValue: null, maxLifetimeValue: null },
    { bucket: "B", minDaysSinceLastActivity: 180, maxDaysSinceLastActivity: 365, minLifetimeValue: null, maxLifetimeValue: null },
    { bucket: "C", minDaysSinceLastActivity: 365, maxDaysSinceLastActivity: 730, minLifetimeValue: null, maxLifetimeValue: null },
    { bucket: "D", minDaysSinceLastActivity: 730, maxDaysSinceLastActivity: null, minLifetimeValue: null, maxLifetimeValue: null },
  ],
  maxTouchesPerContactPerWindow: 2,
  createdAt: agoMinutes(60 * 24 * 30),
  updatedAt: agoMinutes(60 * 2),
};

// A second, paused campaign — exercises the picker + the 4302 (inactive) path.
const RE_NURTURE_CAMPAIGN_2_ID = "9c000000-0000-0000-0000-0000000000c2";
const SEED_RE_NURTURE_CAMPAIGN_2: NurtureCampaign = {
  id: RE_NURTURE_CAMPAIGN_2_ID,
  tenantId: RE_TENANT_ID,
  name: "Open-house no-shows (paused)",
  description: "Re-engage buyers who registered for an open house but never came.",
  active: false,
  segments: [
    { bucket: "A", minDaysSinceLastActivity: 30, maxDaysSinceLastActivity: 120, minLifetimeValue: null, maxLifetimeValue: null },
  ],
  maxTouchesPerContactPerWindow: 2,
  createdAt: agoMinutes(60 * 24 * 10),
  updatedAt: agoMinutes(60 * 24 * 5),
};

type SegCounts = NurtureCampaignAnalytics["perBucket"]["A"];

function emptySeg(): NonNullable<SegCounts> {
  return {
    total: 0,
    enrolled: 0,
    active: 0,
    replied: 0,
    booked: 0,
    optedOut: 0,
    completed: 0,
    exited: 0,
  };
}

// The mutable funnel for the primary campaign — seeded with a realistic mid-run
// state (some sent, a few replies, one booked) so the dashboard reads as a live
// campaign before the agent even triggers a run.
const reNurtureBuckets: Record<"A" | "B" | "C" | "D", NonNullable<SegCounts>> = {
  A: { total: 42, enrolled: 6, active: 28, replied: 4, booked: 2, optedOut: 1, completed: 1, exited: 0 },
  B: { total: 31, enrolled: 4, active: 21, replied: 3, booked: 1, optedOut: 2, completed: 0, exited: 0 },
  C: { total: 18, enrolled: 2, active: 13, replied: 1, booked: 0, optedOut: 1, completed: 1, exited: 0 },
  D: { total: 9, enrolled: 1, active: 7, replied: 0, booked: 0, optedOut: 1, completed: 0, exited: 0 },
};
let reNurtureSent = 188;

function reNurtureAnalytics(): NurtureCampaignAnalytics {
  const sum = (k: keyof NonNullable<SegCounts>) =>
    reNurtureBuckets.A[k] +
    reNurtureBuckets.B[k] +
    reNurtureBuckets.C[k] +
    reNurtureBuckets.D[k];
  return {
    campaignId: RE_NURTURE_CAMPAIGN_ID,
    name: SEED_RE_NURTURE_CAMPAIGN.name,
    total: sum("total"),
    enrolled: sum("enrolled"),
    active: sum("active"),
    replied: sum("replied"),
    booked: sum("booked"),
    optedOut: sum("optedOut"),
    completed: sum("completed"),
    exited: sum("exited"),
    sent: reNurtureSent,
    perBucket: {
      A: { ...reNurtureBuckets.A },
      B: { ...reNurtureBuckets.B },
      C: { ...reNurtureBuckets.C },
      D: { ...reNurtureBuckets.D },
    },
  };
}

export const realEstateNurtureStore = {
  /** The tenant's nurture campaigns (active first). */
  listCampaigns(): NurtureCampaign[] {
    return [SEED_RE_NURTURE_CAMPAIGN, SEED_RE_NURTURE_CAMPAIGN_2];
  },

  /** Per-segment funnel for a campaign. 4301 if unknown. */
  getAnalytics(
    campaignId: string,
  ): NurtureCampaignAnalytics | { code: number; message: string } {
    if (campaignId === RE_NURTURE_CAMPAIGN_ID) return reNurtureAnalytics();
    if (campaignId === RE_NURTURE_CAMPAIGN_2_ID) {
      // The paused campaign has nobody enrolled yet — an all-zero funnel.
      return {
        campaignId,
        name: SEED_RE_NURTURE_CAMPAIGN_2.name,
        total: 0,
        enrolled: 0,
        active: 0,
        replied: 0,
        booked: 0,
        optedOut: 0,
        completed: 0,
        exited: 0,
        sent: 0,
        perBucket: { A: emptySeg() },
      };
    }
    return { code: 4301, message: "Nurture campaign not found" };
  },

  /**
   * Simulate segment-and-enroll. 4302 if paused, 4301 if unknown. On the active
   * campaign: enroll a fresh batch (lands in `enrolled`/`active`) and advance a
   * couple toward replied/booked so the funnel visibly moves — the demo beat.
   */
  segmentAndEnroll(
    campaignId: string,
  ): SegmentationResult | { code: number; message: string } {
    if (campaignId === RE_NURTURE_CAMPAIGN_2_ID) {
      return {
        code: 4302,
        message: "Nurture campaign is inactive — cannot segment/enroll",
      };
    }
    if (campaignId !== RE_NURTURE_CAMPAIGN_ID) {
      return { code: 4301, message: "Nurture campaign not found" };
    }

    // A realistic run: 5 freshly-dormant matches enrolled into bucket A,
    // and 1 prior in-flight lead replies + books (the cadence paying off).
    const newlyEnrolled = 5;
    reNurtureBuckets.A.total += newlyEnrolled;
    reNurtureBuckets.A.enrolled += newlyEnrolled;

    // One active A lead replies; one prior reply converts to a booked showing.
    if (reNurtureBuckets.A.active > 0) {
      reNurtureBuckets.A.active -= 1;
      reNurtureBuckets.A.replied += 1;
    }
    if (reNurtureBuckets.A.replied > 0) {
      reNurtureBuckets.A.replied -= 1;
      reNurtureBuckets.A.booked += 1;
    }
    reNurtureSent += newlyEnrolled; // step-0 touch fires for each fresh enroll

    return {
      campaignId,
      evaluated: 214,
      matched: newlyEnrolled + 3, // 3 matched but were already enrolled
      enrolled: newlyEnrolled,
      skippedOptedOut: 2,
      alreadyEnrolled: 3,
    };
  },

  /** The seeded active campaign id, for the smoke test to reference. */
  seedCampaignId: RE_NURTURE_CAMPAIGN_ID,
  seedPausedCampaignId: RE_NURTURE_CAMPAIGN_2_ID,
};

// ---------------------------------------------------------------------------
// Health "RevenueRevive" — dormant-patient reactivation (T2) — seed store
// ---------------------------------------------------------------------------
//
// Mirrors the RE T1 store structure exactly. A single seeded health reactivation
// campaign (A–D dormancy segments) + a mutable per-segment funnel.
// segmentAndEnroll() simulates a realistic run: enrolls a batch of newly-lapsed
// patients into the in-flight columns AND advances one toward replied/booked, so
// the demo funnel visibly fills on the trigger (the 60-second demo beat).
// PHI-free: only logistics signals — days since last visit, visit frequency.

const FD_NURTURE_CAMPAIGN_ID = "fd000000-0000-0000-0000-0000000000f1";
const FD_TENANT_ID = "22222222-2222-2222-2222-222222222222";

const SEED_FD_NURTURE_CAMPAIGN: FdNurtureCampaign = {
  id: FD_NURTURE_CAMPAIGN_ID,
  tenantId: FD_TENANT_ID,
  name: "Lapsed-patient reactivation",
  description:
    "Win back patients who've gone quiet — a multi-touch outreach cadence " +
    "tiered by how long they've been away.",
  active: true,
  segments: [
    { bucket: "A", minDaysSinceLastActivity: 90, maxDaysSinceLastActivity: 180, minLifetimeValue: null, maxLifetimeValue: null },
    { bucket: "B", minDaysSinceLastActivity: 180, maxDaysSinceLastActivity: 365, minLifetimeValue: null, maxLifetimeValue: null },
    { bucket: "C", minDaysSinceLastActivity: 365, maxDaysSinceLastActivity: 730, minLifetimeValue: null, maxLifetimeValue: null },
    { bucket: "D", minDaysSinceLastActivity: 730, maxDaysSinceLastActivity: null, minLifetimeValue: null, maxLifetimeValue: null },
  ],
  maxTouchesPerContactPerWindow: 2,
  createdAt: agoMinutes(60 * 24 * 30),
  updatedAt: agoMinutes(60 * 2),
};

// A second, paused campaign — exercises the picker + the 4302 (inactive) path.
const FD_NURTURE_CAMPAIGN_2_ID = "fd000000-0000-0000-0000-0000000000f2";
const SEED_FD_NURTURE_CAMPAIGN_2: FdNurtureCampaign = {
  id: FD_NURTURE_CAMPAIGN_2_ID,
  tenantId: FD_TENANT_ID,
  name: "Annual wellness reminders (paused)",
  description: "Re-engage patients overdue for their annual wellness visit.",
  active: false,
  segments: [
    { bucket: "A", minDaysSinceLastActivity: 365, maxDaysSinceLastActivity: 540, minLifetimeValue: null, maxLifetimeValue: null },
  ],
  maxTouchesPerContactPerWindow: 2,
  createdAt: agoMinutes(60 * 24 * 10),
  updatedAt: agoMinutes(60 * 24 * 5),
};

type FdSegCounts = FdNurtureCampaignAnalytics["perBucket"]["A"];

function emptyFdSeg(): NonNullable<FdSegCounts> {
  return {
    total: 0,
    enrolled: 0,
    active: 0,
    replied: 0,
    booked: 0,
    optedOut: 0,
    completed: 0,
    exited: 0,
  };
}

// The mutable funnel for the primary campaign — seeded with a realistic mid-run
// state (some sent, a few replies, one booked) so the dashboard reads as a live
// campaign before the user even triggers a run.
const fdNurtureBuckets: Record<"A" | "B" | "C" | "D", NonNullable<FdSegCounts>> = {
  A: { total: 38, enrolled: 5, active: 25, replied: 5, booked: 2, optedOut: 1, completed: 0, exited: 0 },
  B: { total: 27, enrolled: 3, active: 18, replied: 4, booked: 1, optedOut: 1, completed: 0, exited: 0 },
  C: { total: 15, enrolled: 2, active: 11, replied: 1, booked: 0, optedOut: 1, completed: 0, exited: 0 },
  D: { total: 8, enrolled: 1, active: 6, replied: 0, booked: 0, optedOut: 1, completed: 0, exited: 0 },
};
let fdNurtureSent = 172;

function fdNurtureAnalytics(): FdNurtureCampaignAnalytics {
  const sum = (k: keyof NonNullable<FdSegCounts>) =>
    fdNurtureBuckets.A[k] +
    fdNurtureBuckets.B[k] +
    fdNurtureBuckets.C[k] +
    fdNurtureBuckets.D[k];
  return {
    campaignId: FD_NURTURE_CAMPAIGN_ID,
    name: SEED_FD_NURTURE_CAMPAIGN.name,
    total: sum("total"),
    enrolled: sum("enrolled"),
    active: sum("active"),
    replied: sum("replied"),
    booked: sum("booked"),
    optedOut: sum("optedOut"),
    completed: sum("completed"),
    exited: sum("exited"),
    sent: fdNurtureSent,
    perBucket: {
      A: { ...fdNurtureBuckets.A },
      B: { ...fdNurtureBuckets.B },
      C: { ...fdNurtureBuckets.C },
      D: { ...fdNurtureBuckets.D },
    },
  };
}

export const frontDeskNurtureStore = {
  /** The tenant's nurture campaigns (active first). */
  listCampaigns(): FdNurtureCampaign[] {
    return [SEED_FD_NURTURE_CAMPAIGN, SEED_FD_NURTURE_CAMPAIGN_2];
  },

  /** Per-segment funnel for a campaign. 4301 if unknown. */
  getAnalytics(
    campaignId: string,
  ): FdNurtureCampaignAnalytics | { code: number; message: string } {
    if (campaignId === FD_NURTURE_CAMPAIGN_ID) return fdNurtureAnalytics();
    if (campaignId === FD_NURTURE_CAMPAIGN_2_ID) {
      // The paused campaign has nobody enrolled yet — an all-zero funnel.
      return {
        campaignId,
        name: SEED_FD_NURTURE_CAMPAIGN_2.name,
        total: 0,
        enrolled: 0,
        active: 0,
        replied: 0,
        booked: 0,
        optedOut: 0,
        completed: 0,
        exited: 0,
        sent: 0,
        perBucket: { A: emptyFdSeg() },
      };
    }
    return { code: 4301, message: "Nurture campaign not found" };
  },

  /**
   * Simulate segment-and-enroll. 4302 if paused, 4301 if unknown. On the active
   * campaign: enroll a fresh batch (lands in `enrolled`/`active`) and advance a
   * couple toward replied/booked so the funnel visibly moves — the demo beat.
   */
  segmentAndEnroll(
    campaignId: string,
  ): FdSegmentationResult | { code: number; message: string } {
    if (campaignId === FD_NURTURE_CAMPAIGN_2_ID) {
      return {
        code: 4302,
        message: "Nurture campaign is inactive — cannot segment/enroll",
      };
    }
    if (campaignId !== FD_NURTURE_CAMPAIGN_ID) {
      return { code: 4301, message: "Nurture campaign not found" };
    }

    // A realistic run: 5 freshly-lapsed matches enrolled into bucket A,
    // and 1 prior in-flight lead replies + books (the cadence paying off).
    const newlyEnrolled = 5;
    fdNurtureBuckets.A.total += newlyEnrolled;
    fdNurtureBuckets.A.enrolled += newlyEnrolled;

    // One active A patient replies; one prior reply converts to a booked appointment.
    if (fdNurtureBuckets.A.active > 0) {
      fdNurtureBuckets.A.active -= 1;
      fdNurtureBuckets.A.replied += 1;
    }
    if (fdNurtureBuckets.A.replied > 0) {
      fdNurtureBuckets.A.replied -= 1;
      fdNurtureBuckets.A.booked += 1;
    }
    fdNurtureSent += newlyEnrolled; // step-0 touch fires for each fresh enroll

    return {
      campaignId,
      evaluated: 198,
      matched: newlyEnrolled + 3, // 3 matched but were already enrolled
      enrolled: newlyEnrolled,
      skippedOptedOut: 2,
      alreadyEnrolled: 3,
    };
  },

  /** The seeded active campaign id, for the smoke test to reference. */
  seedCampaignId: FD_NURTURE_CAMPAIGN_ID,
  seedPausedCampaignId: FD_NURTURE_CAMPAIGN_2_ID,
};

// ---------------------------------------------------------------------------
// Proposals / SOW Studio — seed store
// ---------------------------------------------------------------------------

// A realistic seeded draft result. The quote has three priced line items and
// a total; the SowDraft has all four prose sections AI-drafted.
const SEED_PROPOSAL_ID = "pp000000-0000-0000-0000-000000000001";
const SEED_SOW_ID = "sw000000-0000-0000-0000-000000000001";

const SEED_PROPOSAL: ProposalDraftResult = {
  quote: {
    id: SEED_PROPOSAL_ID,
    tenantId: "22222222-2222-2222-2222-222222222222",
    quoteNumber: "Q-2026-042",
    status: "DRAFT",
    currency: "USD",
    lineItems: [
      {
        sku: "DISCOVERY",
        description: "Discovery & requirements workshop (2 days)",
        quantity: 2,
        unitPrice: 1500,
        discountPercent: 0,
        taxPercent: 0,
        lineTotal: 3000,
      },
      {
        sku: "DEV-CUSTOM",
        description: "Custom software development (120 hrs @ $150/hr)",
        quantity: 120,
        unitPrice: 150,
        discountPercent: 0,
        taxPercent: 0,
        lineTotal: 18000,
      },
      {
        sku: "HOSTING-MO",
        description: "Hosting & support retainer (monthly, 12 months)",
        quantity: 12,
        unitPrice: 350,
        discountPercent: 0,
        taxPercent: 0,
        lineTotal: 4200,
      },
    ],
    subtotal: 25200,
    discountTotal: 0,
    taxTotal: 0,
    total: 25200,
    notes: null,
    terms: null,
    issuedAt: new Date().toISOString().slice(0, 10),
    expiresAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 0,
    customFields: {},
  } as unknown as ProposalDraftResult["quote"],
  sowDraft: {
    id: SEED_SOW_ID,
    tenantId: "22222222-2222-2222-2222-222222222222",
    quoteId: SEED_PROPOSAL_ID,
    scope:
      "This engagement delivers a custom AI-powered CRM integration for Bella Vita " +
      "covering lead capture from the website contact form, automated follow-up sequences, " +
      "and a staff dashboard for managing open opportunities. The scope includes a two-day " +
      "discovery workshop, full-stack development of the integration layer, and a twelve-month " +
      "hosting and support retainer.",
    deliverables:
      "1. Discovery workshop summary and finalized requirements document\n" +
      "2. Production-deployed lead-capture integration (website → CRM)\n" +
      "3. Automated follow-up email sequences (3-touch, configurable)\n" +
      "4. Staff dashboard with opportunity pipeline view\n" +
      "5. Admin documentation and 1-hour walkthrough session\n" +
      "6. Twelve months of hosting, monitoring, and bug-fix support",
    assumptions:
      "• Client provides timely access to existing website codebase and hosting credentials\n" +
      "• Feedback turnaround within 3 business days at each review checkpoint\n" +
      "• Scope does not include mobile app development or third-party API licenses\n" +
      "• Email follow-up sequences are marketing/operational (not transactional healthcare)\n" +
      "• Hosting assumes ≤ 10,000 monthly active leads; overages billed at $0.002/lead",
    timeline:
      "Week 1–2: Discovery workshop + requirements sign-off\n" +
      "Week 3–6: Development sprint (lead capture + CRM integration)\n" +
      "Week 7–8: Dashboard build + internal QA\n" +
      "Week 9: Client UAT + feedback\n" +
      "Week 10: Revisions + production deployment\n" +
      "Week 11: Walkthrough session + go-live\n" +
      "Month 2–13: Ongoing hosting & support retainer",
    aiApplied: true,
    version: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } satisfies SowDraft,
};

// In-memory map keyed by quote ID.
const proposalMap = new Map<string, ProposalDraftResult>();
proposalMap.set(SEED_PROPOSAL_ID, SEED_PROPOSAL);

export const proposalStore = {
  /**
   * Simulate POST /proposals/draft — create a new draft from notes.
   * Returns a realistic result (ai=true) regardless of the note content.
   */
  draft(_notes: string): ProposalDraftResult {
    const id = `pp${Date.now().toString(16).padStart(14, "0").slice(-14)}-0000-0000-0000-000000000099`;
    const now = new Date().toISOString();
    const result: ProposalDraftResult = {
      quote: {
        id,
        tenantId: SEED_PROPOSAL.quote.tenantId,
        quoteNumber: `Q-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`,
        status: "DRAFT",
        currency: "USD",
        lineItems: SEED_PROPOSAL.quote.lineItems,
        subtotal: SEED_PROPOSAL.quote.subtotal,
        discountTotal: 0,
        taxTotal: 0,
        total: SEED_PROPOSAL.quote.total,
        notes: null,
        terms: null,
        issuedAt: now.slice(0, 10),
        expiresAt: null,
        createdAt: now,
        updatedAt: now,
        version: 0,
        customFields: {},
      } as unknown as ProposalDraftResult["quote"],
      sowDraft: {
        ...SEED_PROPOSAL.sowDraft!,
        id: `sw${Date.now().toString(16).padStart(14, "0").slice(-14)}-0000-0000-0000-000000000099`,
        quoteId: id,
        createdAt: now,
        updatedAt: now,
      },
    };
    proposalMap.set(id, result);
    return result;
  },

  /** GET /proposals/{id} — fetch by quote ID. */
  get(id: string): ProposalDraftResult | undefined {
    return proposalMap.get(id);
  },

  /** The seeded proposal ID, for the smoke test to reference. */
  seedId: SEED_PROPOSAL_ID,
};

// ---------------------------------------------------------------------------
// Real Estate "Midnight Responder" — response-latency + tier routing (T3)
// ---------------------------------------------------------------------------
//
// A seeded config (warm→Past-buyer reactivation, cold→Open-house no-shows) +
// a realistic set of latency stats (p50 ~18 s, p95 ~28 s, 42% after-hours
// coverage). The config-save round-trips (PUT) and updates the in-memory row.
// A 4380 (no-config) path is exercisable by calling getConfig() on an empty
// store — simulated by setting midnight_responder_configured = false before
// the first load via clearConfig() in the smoke test.

// Use the same stable IDs as the RE nurture store.
const RE_RESPONDER_TENANT_ID = "22222222-2222-2222-2222-222222222222";
const RE_RESPONDER_CAMPAIGN_WARM_ID = "9c000000-0000-0000-0000-0000000000c1"; // Past-buyer reactivation
const RE_RESPONDER_CAMPAIGN_COLD_ID = "9c000000-0000-0000-0000-0000000000c2"; // Open-house no-shows (paused)
const RE_RESPONDER_CONFIG_ID = "rd000000-0000-0000-0000-0000000000d1";

/** The mutable config row (one per tenant). null = not yet configured (4380). */
let responderConfigRow: MidnightResponderConfig | null = {
  id: RE_RESPONDER_CONFIG_ID,
  tenantId: RE_RESPONDER_TENANT_ID,
  warmCampaignId: RE_RESPONDER_CAMPAIGN_WARM_ID,
  coldCampaignId: RE_RESPONDER_CAMPAIGN_COLD_ID,
  delegateHandoffToResponder: false,
  afterHoursStartHour: 8,
  afterHoursEndHour: 18,
  version: 0,
  createdAt: agoMinutes(60 * 24 * 7),
  updatedAt: agoMinutes(60 * 2),
};

/** Seed latency stats — realistic demo numbers (fast, high after-hours share). */
const SEED_LATENCY_STATS: MidnightResponderLatencyStats = {
  repliedTurns: 847,
  p50LatencyMs: 18200,   // 18.2 s median
  p95LatencyMs: 27900,   // 27.9 s p95 — well under 30 s
  maxLatencyMs: 44100,   // 44.1 s worst-ever
  afterHoursTurns: 356,
  totalBuyerTurns: 847,
  afterHoursShare: 0.4203, // ~42% after-hours — the "24/7" headline
  afterHoursStartHour: 8,
  afterHoursEndHour: 18,
};

export const midnightResponderStore = {
  /**
   * GET /realestate/responder/latency-stats — returns the seeded stats,
   * with the after-hours window updated to match the current config row
   * (if configured).
   */
  getLatencyStats(): MidnightResponderLatencyStats {
    const startHour = responderConfigRow?.afterHoursStartHour ?? 8;
    const endHour = responderConfigRow?.afterHoursEndHour ?? 18;
    return { ...SEED_LATENCY_STATS, afterHoursStartHour: startHour, afterHoursEndHour: endHour };
  },

  /**
   * GET /realestate/responder/config — returns the config or signals 4380.
   */
  getConfig(): MidnightResponderConfig | { code: number; message: string } {
    if (!responderConfigRow) {
      return { code: 4380, message: "Midnight Responder config not found for this tenant" };
    }
    return { ...responderConfigRow };
  },

  /**
   * PUT /realestate/responder/config — upsert (partial: null fields preserved).
   * Mirrors the BE applyTo / toNewEntity logic. Campaign id validation is
   * skipped in the mock (the BE 4381 path is covered by the "unknown id"
   * error handling in the component; we don't re-validate here).
   */
  saveConfig(body: {
    warmCampaignId: string | null;
    coldCampaignId: string | null;
    delegateHandoffToResponder: boolean | null;
    afterHoursStartHour: number | null;
    afterHoursEndHour: number | null;
  }): MidnightResponderConfig {
    const existing = responderConfigRow;
    const now = new Date().toISOString();
    if (existing) {
      responderConfigRow = {
        ...existing,
        warmCampaignId: body.warmCampaignId !== null ? body.warmCampaignId : existing.warmCampaignId,
        coldCampaignId: body.coldCampaignId !== null ? body.coldCampaignId : existing.coldCampaignId,
        delegateHandoffToResponder:
          body.delegateHandoffToResponder !== null
            ? body.delegateHandoffToResponder
            : existing.delegateHandoffToResponder,
        afterHoursStartHour:
          body.afterHoursStartHour !== null
            ? body.afterHoursStartHour
            : existing.afterHoursStartHour,
        afterHoursEndHour:
          body.afterHoursEndHour !== null
            ? body.afterHoursEndHour
            : existing.afterHoursEndHour,
        version: existing.version + 1,
        updatedAt: now,
      };
    } else {
      responderConfigRow = {
        id: RE_RESPONDER_CONFIG_ID,
        tenantId: RE_RESPONDER_TENANT_ID,
        warmCampaignId: body.warmCampaignId,
        coldCampaignId: body.coldCampaignId,
        delegateHandoffToResponder: body.delegateHandoffToResponder ?? false,
        afterHoursStartHour: body.afterHoursStartHour ?? 8,
        afterHoursEndHour: body.afterHoursEndHour ?? 18,
        version: 0,
        createdAt: now,
        updatedAt: now,
      };
    }
    return { ...responderConfigRow };
  },

  /** Clear the config row — exercises the 4380 empty-state path. */
  clearConfig() {
    responderConfigRow = null;
  },

  /** Restore the default seeded config row. */
  resetConfig() {
    responderConfigRow = {
      id: RE_RESPONDER_CONFIG_ID,
      tenantId: RE_RESPONDER_TENANT_ID,
      warmCampaignId: RE_RESPONDER_CAMPAIGN_WARM_ID,
      coldCampaignId: RE_RESPONDER_CAMPAIGN_COLD_ID,
      delegateHandoffToResponder: false,
      afterHoursStartHour: 8,
      afterHoursEndHour: 18,
      version: 0,
      createdAt: agoMinutes(60 * 24 * 7),
      updatedAt: agoMinutes(60 * 2),
    };
  },
};

// =============================================================================
// Health "Switchboard AI" (T4) — logistics config + deflection stats store
// =============================================================================

const SWITCHBOARD_CONFIG_ID = "aa000001-0000-0000-0000-000000000001";
const SWITCHBOARD_TENANT_ID = SMOKE_USER.tenantId;

/** The mutable config row (one per tenant). null = not yet configured (4391). */
let switchboardConfigRow: SwitchboardConfig | null = {
  id: SWITCHBOARD_CONFIG_ID,
  tenantId: SWITCHBOARD_TENANT_ID,
  hoursText: "Mon–Thu 8am–5pm, Fri 8am–2pm",
  locationText: "456 Wellness Blvd, Suite 100 — parking in the rear lot",
  acceptingNewPatients: true,
  acceptingNewPatientsText: null,
  bookingInstructions: "Call us at (555) 867-5309 or book online at our website",
  rescheduleInstructions: "Call us at (555) 867-5309 at least 24 hours in advance",
  intakeFormUrl: "https://practice.example.com/intake",
  reviewLinkUrl: "https://g.page/example-practice/review",
  answerOverrides: {},
  safeTripwireReply: null,
  version: 0,
  createdAt: agoMinutes(60 * 24 * 14),
  updatedAt: agoMinutes(60 * 3),
};

/** Seed deflection stats — realistic demo numbers. */
const SEED_DEFLECTION_STATS: SwitchboardDeflectionStats = {
  logistics: 312,
  tripwire: 47,
  handoff: 28,
  total: 387,
  deflectionRate: 0.8062, // 312 / 387 = ~80.6%
};

export const switchboardStore = {
  /**
   * GET /frontdesk/switchboard/config — returns the config or signals 4391.
   */
  getConfig(): SwitchboardConfig | { code: number; message: string } {
    if (!switchboardConfigRow) {
      return { code: 4391, message: "Switchboard config not found for this tenant" };
    }
    return { ...switchboardConfigRow };
  },

  /**
   * PUT /frontdesk/switchboard/config — upsert.
   * Mirrors the BE ConfigRequest.applyTo / toNewEntity logic.
   */
  saveConfig(body: Omit<SwitchboardConfig, "id" | "tenantId" | "version" | "createdAt" | "updatedAt">): SwitchboardConfig {
    const existing = switchboardConfigRow;
    const now = new Date().toISOString();
    if (existing) {
      switchboardConfigRow = {
        ...existing,
        ...body,
        acceptingNewPatients: body.acceptingNewPatients ?? existing.acceptingNewPatients,
        answerOverrides: body.answerOverrides ?? {},
        version: existing.version + 1,
        updatedAt: now,
      };
    } else {
      switchboardConfigRow = {
        id: SWITCHBOARD_CONFIG_ID,
        tenantId: SWITCHBOARD_TENANT_ID,
        ...body,
        acceptingNewPatients: body.acceptingNewPatients ?? true,
        answerOverrides: body.answerOverrides ?? {},
        version: 0,
        createdAt: now,
        updatedAt: now,
      };
    }
    return { ...switchboardConfigRow };
  },

  /** GET /frontdesk/switchboard/deflection-stats — returns the seeded stats. */
  getDeflectionStats(): SwitchboardDeflectionStats {
    return { ...SEED_DEFLECTION_STATS };
  },

  /** Clear the config row — exercises the 4391 empty-state path. */
  clearConfig() {
    switchboardConfigRow = null;
  },

  /** Restore the default seeded config row. */
  resetConfig() {
    switchboardConfigRow = {
      id: SWITCHBOARD_CONFIG_ID,
      tenantId: SWITCHBOARD_TENANT_ID,
      hoursText: "Mon–Thu 8am–5pm, Fri 8am–2pm",
      locationText: "456 Wellness Blvd, Suite 100 — parking in the rear lot",
      acceptingNewPatients: true,
      acceptingNewPatientsText: null,
      bookingInstructions: "Call us at (555) 867-5309 or book online at our website",
      rescheduleInstructions: "Call us at (555) 867-5309 at least 24 hours in advance",
      intakeFormUrl: "https://practice.example.com/intake",
      reviewLinkUrl: "https://g.page/example-practice/review",
      answerOverrides: {},
      safeTripwireReply: null,
      version: 0,
      createdAt: agoMinutes(60 * 24 * 14),
      updatedAt: agoMinutes(60 * 3),
    };
  },
};

// =============================================================================
// Home Services T5 "Instant Callback" — ranked queue + recovery stats + config
// =============================================================================
//
// Seeded with 3 callback cards in descending revenueScore order so the ordering
// is immediately visible in smoke. Card A (LARGE/EMERGENCY, score 95) is first,
// B (MEDIUM/URGENT, score 62) is second, C (SMALL/ROUTINE, score 28) is third.
// Recovery stats show realistic demo numbers (150 offered / 105 accepted / 82
// dispatched). Config is pre-seeded with custom copy so the form shows values.

const CALLBACK_CONFIG_ID = "bb000001-0000-0000-0000-000000000001";
const CALLBACK_TENANT_ID = SMOKE_USER.tenantId;

const SEED_CALLBACK_CARDS: CallbackCardDTO[] = [
  {
    id: "cb000001-0000-0000-0000-000000000001",
    contactId: null,
    fromPhone: "+1 555 0191",
    mode: "IMMEDIATE",
    requestedWindowText: null,
    requestedAt: null,
    status: "REQUESTED",
    summaryLine: "Burst pipe in the basement — water actively leaking.",
    urgency: "EMERGENCY",
    jobValueBand: "LARGE",
    revenueScore: 95,
    workOrderId: "wo-000001-0000-0000-0000-000000000001",
    callSid: "CA0001",
    createdAt: agoMinutes(15),
  },
  {
    id: "cb000002-0000-0000-0000-000000000002",
    contactId: null,
    fromPhone: "+1 555 0142",
    mode: "SCHEDULED",
    requestedWindowText: "after 2pm tomorrow",
    requestedAt: null,
    status: "REQUESTED",
    summaryLine: "HVAC not blowing cold air — whole house warm, replacement may be needed.",
    urgency: "URGENT",
    jobValueBand: "MEDIUM",
    revenueScore: 62,
    workOrderId: "wo-000002-0000-0000-0000-000000000002",
    callSid: "CA0002",
    createdAt: agoMinutes(45),
  },
  {
    id: "cb000003-0000-0000-0000-000000000003",
    contactId: null,
    fromPhone: "+1 555 0177",
    mode: "IMMEDIATE",
    requestedWindowText: null,
    requestedAt: null,
    status: "REQUESTED",
    summaryLine: "Kitchen faucet dripping — minor but persistent leak.",
    urgency: "ROUTINE",
    jobValueBand: "SMALL",
    revenueScore: 28,
    workOrderId: null,
    callSid: "CA0003",
    createdAt: agoMinutes(90),
  },
];

/** Mutable cards map — dispatch mutates status in place. */
const callbackCards = new Map<string, CallbackCardDTO>(
  SEED_CALLBACK_CARDS.map((c) => [c.id, { ...c }]),
);

/** Mutable recovery stats — dispatch increments dispatched. */
let callbackRecoveryStats: CallbackRecoveryStats = {
  offered: 150,
  accepted: 105,
  dispatched: 82,
  acceptanceRate: 105 / 150,
  dispatchRate: 82 / 105,
};

/** Config row — null = not yet configured (4401). */
let callbackConfigRow: CallbackConfig | null = {
  id: CALLBACK_CONFIG_ID,
  tenantId: CALLBACK_TENANT_ID,
  offerMessage:
    "We saw you called — would you like us to call you back? Reply YES for now or tell us a time that works.",
  immediateConfirmMessage: "Got it — someone will call you back shortly.",
  scheduledConfirmMessage: "Noted — we'll call you back during that window.",
  version: 0,
  createdAt: agoMinutes(60 * 24 * 7),
  updatedAt: agoMinutes(60 * 2),
};

export const callbackStore = {
  /**
   * GET /home-services/callbacks — ranked queue (REQUESTED only, desc revenueScore).
   * The BE sorts by revenueScore descending; the seed cards are already in order.
   */
  listQueue(): CallbackCardDTO[] {
    return Array.from(callbackCards.values())
      .filter((c) => c.status === "REQUESTED")
      .sort((a, b) => b.revenueScore - a.revenueScore);
  },

  /**
   * POST /home-services/callbacks/{id}/dispatch — transition to DISPATCHED.
   * Returns { code: 4400 } if not found, { code: 4402 } if not REQUESTED.
   */
  dispatch(id: string):
    | CallbackCardDTO
    | { code: number; message: string } {
    const card = callbackCards.get(id);
    if (!card) {
      return { code: 4400, message: "Callback request not found" };
    }
    if (card.status !== "REQUESTED") {
      return {
        code: 4402,
        message: "Callback is not in REQUESTED state — cannot dispatch",
      };
    }
    const updated: CallbackCardDTO = { ...card, status: "DISPATCHED" };
    callbackCards.set(id, updated);
    // Increment the dispatched count + recalculate rates.
    const dispatched = callbackRecoveryStats.dispatched + 1;
    const accepted = callbackRecoveryStats.accepted;
    const offered = callbackRecoveryStats.offered;
    callbackRecoveryStats = {
      offered,
      accepted,
      dispatched,
      acceptanceRate: offered > 0 ? accepted / offered : 0,
      dispatchRate: accepted > 0 ? dispatched / accepted : 0,
    };
    return { ...updated };
  },

  /** GET /home-services/callbacks/recovery-stats. */
  getRecoveryStats(): CallbackRecoveryStats {
    return { ...callbackRecoveryStats };
  },

  /**
   * GET /home-services/callbacks/config — returns the config or signals 4401.
   */
  getConfig(): CallbackConfig | { code: number; message: string } {
    if (!callbackConfigRow) {
      return {
        code: 4401,
        message: "Callback config not found for this tenant",
      };
    }
    return { ...callbackConfigRow };
  },

  /**
   * PUT /home-services/callbacks/config — upsert.
   * Mirrors CallbackController.ConfigRequest.applyTo / toNewEntity logic.
   */
  saveConfig(body: Omit<CallbackConfig, "id" | "tenantId" | "version" | "createdAt" | "updatedAt">): CallbackConfig {
    const existing = callbackConfigRow;
    const now = new Date().toISOString();
    if (existing) {
      callbackConfigRow = {
        ...existing,
        ...body,
        version: existing.version + 1,
        updatedAt: now,
      };
    } else {
      callbackConfigRow = {
        id: CALLBACK_CONFIG_ID,
        tenantId: CALLBACK_TENANT_ID,
        ...body,
        version: 0,
        createdAt: now,
        updatedAt: now,
      };
    }
    return { ...callbackConfigRow };
  },

  /** Clear the config row — exercises the 4401 empty-state path. */
  clearConfig() {
    callbackConfigRow = null;
  },

  /** Restore seeded cards (resets dispatch mutations for test isolation). */
  resetCards() {
    callbackCards.clear();
    for (const c of SEED_CALLBACK_CARDS) {
      callbackCards.set(c.id, { ...c });
    }
    callbackRecoveryStats = {
      offered: 150,
      accepted: 105,
      dispatched: 82,
      acceptanceRate: 105 / 150,
      dispatchRate: 82 / 105,
    };
  },
};

// =============================================================================
// Salon "ReviewBoost" (T6) — per-stylist review insights + config status
// =============================================================================
//
// Three stylists with uneven request counts so the per-stylist rows are visibly
// different. Mia (28 requests) leads, Jordan (14) is mid-pack, Alex (3) is new.
// The tenant-level review block has 18 reviews — positives dominant, one negative
// so the board isn't all-green. Config has the review link set but the three
// feature flags off (the default-OFF baseline).

const SEED_SALON_BOARD: SalonReviewBoard = {
  reviewCount: 18,
  averageRating: 4.6,
  positiveCount: 14,
  neutralCount: 3,
  negativeCount: 1,
  unclassifiedCount: 0,
  totalRequestsSent: 45,
  totalRequestsResponded: 18,
  overallResponseRate: 18 / 45,
  stylists: [
    {
      staffMemberId: "aa000001-0000-0000-0000-000000000001",
      displayName: "Mia Torres",
      requestsSent: 28,
      requestsResponded: 12,
      responseRate: 12 / 28,
    },
    {
      staffMemberId: "aa000002-0000-0000-0000-000000000002",
      displayName: "Jordan Kim",
      requestsSent: 14,
      requestsResponded: 5,
      responseRate: 5 / 14,
    },
    {
      staffMemberId: "aa000003-0000-0000-0000-000000000003",
      displayName: "Alex Rivera",
      requestsSent: 3,
      requestsResponded: 1,
      responseRate: 1 / 3,
    },
  ],
};

const SEED_REVIEW_BOOST_CONFIG: ReviewBoostConfig = {
  reviewLinkConfigured: true,
  reviewLink: "https://g.page/bella-vita-salon/review",
  senderEnabled: false,
  sentimentRefineEnabled: false,
  negativeAlertEnabled: false,
};

export const reviewBoostStore = {
  /** GET /chairfill/reviewboost/insights — returns the seeded board. */
  getInsights(): SalonReviewBoard {
    return { ...SEED_SALON_BOARD, stylists: SEED_SALON_BOARD.stylists.map((s) => ({ ...s })) };
  },

  /** GET /chairfill/reviewboost/config — returns the seeded config. */
  getConfig(): ReviewBoostConfig {
    return { ...SEED_REVIEW_BOOST_CONFIG };
  },
};

// ---------------------------------------------------------------------------
// Home Services T8 "QuoteNow" — office quote-inbox + price-book config
// ---------------------------------------------------------------------------
//
// Seeds:
//  - 3 homeowner quote submissions: a REPAIR/CONDENSER (NEW), a REPLACE/FURNACE
//    with financing flag (NEW), and a DIAGNOSTIC_VISIT (ACCEPTED/DECLINED mix).
//  - A seeded price book with 2 line items (condenser repair + furnace replace).
//  - Token-issue: always returns a stable fake token.

type QuoteStore = {
  quoteId: string;
  contactId: string | null;
  contactPhone: string | null;
  equipmentType: string | null;
  low: number | null;
  high: number | null;
  currency: string | null;
  recommendation: "REPAIR" | "REPLACE" | "DIAGNOSTIC_VISIT" | null;
  diagnosticOnly: boolean;
  status: "NEW" | "ACCEPTED" | "BOOKED" | "DECLINED";
  createdAt: string;
  // Detail-only fields
  basis: string | null;
  estimateDisclaimer: string | null;
  recommendationRationale: string | null;
  financingAvailable: boolean;
  attributeSource: "MANUAL" | "VISION" | null;
  confidence: number;
};

const SEED_QUOTES: QuoteStore[] = [
  {
    quoteId: "qqq00001-0000-0000-0000-000000000001",
    contactId: "cc000001-0000-0000-0000-000000000001",
    contactPhone: "+1 555 0301",
    equipmentType: "Condenser",
    low: 450,
    high: 750,
    currency: "USD",
    recommendation: "REPAIR",
    diagnosticOnly: false,
    status: "NEW",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
    basis: "condenser / REPAIR",
    estimateDisclaimer:
      "This is an estimate — the final price is confirmed after an on-site inspection.",
    recommendationRationale:
      "The unit is 4 years old — well within its 15-year lifespan. Repair cost ($450–$750) is well below replacement ($3,500–$6,000). Recommend repair.",
    financingAvailable: false,
    attributeSource: "VISION",
    confidence: 0.87,
  },
  {
    quoteId: "qqq00002-0000-0000-0000-000000000002",
    contactId: null,
    contactPhone: "+1 555 0302",
    equipmentType: "Furnace",
    low: 3800,
    high: 6200,
    currency: "USD",
    recommendation: "REPLACE",
    diagnosticOnly: false,
    status: "NEW",
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(), // 90 min ago
    basis: "furnace / REPLACE",
    estimateDisclaimer:
      "This is an estimate — the final price is confirmed after an on-site inspection.",
    recommendationRationale:
      "The furnace is 19 years old — past its 20-year lifespan and repair cost ($1,200–$1,800) is approaching replacement. Recommend full replacement for long-term efficiency.",
    financingAvailable: true,
    attributeSource: "MANUAL",
    confidence: 1.0,
  },
  {
    quoteId: "qqq00003-0000-0000-0000-000000000003",
    contactId: null,
    contactPhone: "+1 555 0303",
    equipmentType: null,
    low: 89,
    high: 149,
    currency: "USD",
    recommendation: "DIAGNOSTIC_VISIT",
    diagnosticOnly: true,
    status: "ACCEPTED",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hr ago
    basis: null,
    estimateDisclaimer:
      "This is an estimate — the final price is confirmed after an on-site inspection.",
    recommendationRationale:
      "Not enough information to advise remotely. A paid diagnostic visit is recommended to assess the equipment.",
    financingAvailable: false,
    attributeSource: "VISION",
    confidence: 0.31,
  },
];

let quoteRows: QuoteStore[] = SEED_QUOTES.map((q) => ({ ...q }));

let priceBookRow: PriceBook | null = {
  id: "pb000001-0000-0000-0000-000000000001",
  tenantId: "22222222-2222-2222-2222-222222222222",
  name: "Comfort Air HVAC — 2026 price book",
  currency: "USD",
  lineItems: [
    {
      equipmentType: "Condenser",
      jobKind: "REPAIR",
      low: 450,
      high: 750,
      typicalLifespanYears: 15,
      agePerYearPct: 1.5,
      ageMaxPct: 20,
      severeFailurePct: 0,
      severeFailureKeywords: ["compressor", "cracked"],
    },
    {
      equipmentType: "Furnace",
      jobKind: "REPLACE",
      low: 3800,
      high: 6200,
      typicalLifespanYears: 20,
      agePerYearPct: 0,
      ageMaxPct: 0,
      severeFailurePct: 0,
      severeFailureKeywords: null,
    },
  ],
  diagnosticVisitLow: 89,
  diagnosticVisitHigh: 149,
  version: 0,
  createdAt: "2026-06-01T00:00:00Z",
  updatedAt: "2026-06-01T00:00:00Z",
};

function quoteToInboxCard(q: QuoteStore): QuoteInboxCard {
  return {
    quoteId: q.quoteId,
    contactId: q.contactId,
    contactPhone: q.contactPhone,
    equipmentType: q.equipmentType,
    low: q.low,
    high: q.high,
    currency: q.currency,
    recommendation: q.recommendation,
    diagnosticOnly: q.diagnosticOnly,
    status: q.status,
    createdAt: q.createdAt,
  };
}

function quoteToResponse(q: QuoteStore): QuoteResponse {
  return {
    quoteId: q.quoteId,
    low: q.low,
    high: q.high,
    currency: q.currency,
    basis: q.basis,
    estimateDisclaimer: q.estimateDisclaimer,
    diagnosticOnly: q.diagnosticOnly,
    recommendation: q.recommendation,
    recommendationRationale: q.recommendationRationale,
    financingAvailable: q.financingAvailable,
    equipmentType: q.equipmentType,
    attributeSource: q.attributeSource,
    confidence: q.confidence,
  };
}

export const quotingStore = {
  /**
   * GET /quoting/quotes[?status=<QuoteStatus>] — inbox list newest-first.
   * Optional status filter.
   */
  list(status?: string): QuoteInboxCard[] {
    const rows = status
      ? quoteRows.filter((q) => q.status === status)
      : quoteRows;
    return rows
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(quoteToInboxCard);
  },

  /**
   * GET /quoting/quotes/{id} — full detail (4435 if absent).
   */
  get(id: string): QuoteResponse | null {
    const q = quoteRows.find((r) => r.quoteId === id);
    return q ? quoteToResponse(q) : null;
  },

  /**
   * GET /quoting/price-book — the tenant's book (null → 4431/404).
   */
  getPriceBook(): PriceBook | null {
    return priceBookRow ? { ...priceBookRow, lineItems: priceBookRow.lineItems.map((l) => ({ ...l })) } : null;
  },

  /**
   * PUT /quoting/price-book — upsert (replaces the whole book).
   */
  savePriceBook(body: PriceBook): PriceBook {
    priceBookRow = {
      ...body,
      id: priceBookRow?.id ?? "pb000001-0000-0000-0000-000000000001",
      tenantId: "22222222-2222-2222-2222-222222222222",
      version: (priceBookRow?.version ?? 0) + 1,
      createdAt: priceBookRow?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return { ...priceBookRow, lineItems: priceBookRow.lineItems.map((l) => ({ ...l })) };
  },

  /**
   * POST /quoting/tokens — issue a stable fake widget token.
   */
  issueToken(): { token: string } {
    return { token: "msw-quote-intake-token-abc123" };
  },

  /** TEST-ONLY: clear the price book (exercises the 4431 empty-state path). */
  clearPriceBook() {
    priceBookRow = null;
  },

  /** TEST-ONLY: reset quote rows to seeds. */
  resetQuotes() {
    quoteRows = SEED_QUOTES.map((q) => ({ ...q }));
  },
};

// =============================================================================
// Health "RescheduleFlow" (T7) — waitlist board + fill-rate stats
// =============================================================================
//
// Three seeded waitlist entries with diverse states so all table states are
// visible. Ada (OPEN, any provider) leads; Brook (OPEN, specific provider
// preference + window) is mid-list; Casey (FULFILLED, already claimed a slot)
// shows the lifecycle end-state. Fill stats seed a mid-run scenario: 48
// cancellations → 41 offers → 38 claims → 32 filled (~67% fill rate).
//
// The join-POST is idempotent (accepts Idempotency-Key); duplicates with the
// same key return the same entry without adding a new row.

const RESCHEDULE_TENANT_ID = SMOKE_USER.tenantId;

// Stable UUIDs for the seeded entries.
const WAITLIST_ID_ADA = "bb000001-0000-0000-0000-000000000001";
const WAITLIST_ID_BROOK = "bb000002-0000-0000-0000-000000000002";
const WAITLIST_ID_CASEY = "bb000003-0000-0000-0000-000000000003";
const PROVIDER_ID_SEED = "cc000001-0000-0000-0000-000000000001";

const SEED_WAITLIST_ENTRIES: WaitlistEntry[] = [
  {
    id: WAITLIST_ID_ADA,
    tenantId: RESCHEDULE_TENANT_ID,
    contactId: "33333333-3333-3333-3333-333333333333",
    slotType: "health-appt",
    providerId: null,
    earliestStart: null,
    latestStart: null,
    smsOptIn: true,
    status: "OPEN",
    notes: "Any afternoon works.",
    priorNoShowCount: 0,
    priorVisitCount: 4,
    lastVisitAt: "2026-03-15T14:00:00Z",
    version: 0,
    createdAt: "2026-06-08T09:00:00Z",
    updatedAt: "2026-06-08T09:00:00Z",
  },
  {
    id: WAITLIST_ID_BROOK,
    tenantId: RESCHEDULE_TENANT_ID,
    contactId: "44444444-4444-4444-4444-444444444444",
    slotType: "health-appt",
    providerId: PROVIDER_ID_SEED,
    earliestStart: "2026-06-16T08:00:00Z",
    latestStart: "2026-06-30T17:00:00Z",
    smsOptIn: true,
    status: "OPEN",
    notes: null,
    priorNoShowCount: 1,
    priorVisitCount: 2,
    lastVisitAt: "2026-04-20T10:00:00Z",
    version: 0,
    createdAt: "2026-06-08T10:30:00Z",
    updatedAt: "2026-06-08T10:30:00Z",
  },
  {
    id: WAITLIST_ID_CASEY,
    tenantId: RESCHEDULE_TENANT_ID,
    contactId: "55555555-5555-5555-5555-555555555555",
    slotType: "health-appt",
    providerId: null,
    earliestStart: "2026-06-10T00:00:00Z",
    latestStart: "2026-06-20T23:59:00Z",
    smsOptIn: false,
    status: "FULFILLED",
    notes: "Morning preferred.",
    priorNoShowCount: 0,
    priorVisitCount: 8,
    lastVisitAt: "2026-05-01T09:00:00Z",
    version: 1,
    createdAt: "2026-06-07T14:00:00Z",
    updatedAt: "2026-06-09T08:45:00Z",
  },
];

// Mutable in-memory state.
const waitlistEntries = new Map<string, WaitlistEntry>(
  SEED_WAITLIST_ENTRIES.map((e) => [e.id, { ...e }]),
);

// Idempotency-Key dedup: maps key → id of the entry already created.
const waitlistIdempotencyCache = new Map<string, string>();

let rescheduleStats: RescheduleFillStats = {
  cancellations: 48,
  offers: 41,
  claims: 38,
  filled: 32,
  fillRate: 32 / 48, // ~0.6667
};

export const rescheduleStore = {
  /** GET /frontdesk/reschedule/waitlist — newest first, health-appt only. */
  listWaitlist(): WaitlistEntry[] {
    return Array.from(waitlistEntries.values())
      .filter((e) => e.slotType === "health-appt")
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .map((e) => ({ ...e }));
  },

  /**
   * POST /frontdesk/reschedule/waitlist — join the health waitlist. Idempotent:
   * a repeated Idempotency-Key returns the same entry (201).
   * Returns { code: 4421 } when contactId is missing.
   */
  joinWaitlist(
    body: Partial<WaitlistJoinRequest>,
    idempotencyKey: string,
  ): WaitlistEntry | { code: number; message: string } {
    if (!body.contactId) {
      return {
        code: 4421,
        message: "Reschedule waitlist join requires a contactId",
      };
    }

    // Idempotency-Key dedup.
    const existing = waitlistIdempotencyCache.get(idempotencyKey);
    if (existing) {
      const entry = waitlistEntries.get(existing);
      if (entry) return { ...entry };
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const entry: WaitlistEntry = {
      id,
      tenantId: RESCHEDULE_TENANT_ID,
      contactId: body.contactId,
      slotType: "health-appt",
      providerId: body.providerId ?? null,
      earliestStart: body.earliestStart ?? null,
      latestStart: body.latestStart ?? null,
      smsOptIn: body.smsOptIn ?? true,
      status: "OPEN",
      notes: body.notes ?? null,
      priorNoShowCount: body.priorNoShowCount ?? 0,
      priorVisitCount: body.priorVisitCount ?? 0,
      lastVisitAt: body.lastVisitAt ?? null,
      version: 0,
      createdAt: now,
      updatedAt: now,
    };
    waitlistEntries.set(id, entry);
    waitlistIdempotencyCache.set(idempotencyKey, id);
    return { ...entry };
  },

  /** GET /frontdesk/reschedule/fill-stats — PHI-free funnel counters. */
  getFillStats(): RescheduleFillStats {
    return { ...rescheduleStats };
  },

  /** Reset to seed state (test isolation). */
  reset() {
    waitlistEntries.clear();
    waitlistIdempotencyCache.clear();
    for (const e of SEED_WAITLIST_ENTRIES) {
      waitlistEntries.set(e.id, { ...e });
    }
    rescheduleStats = {
      cancellations: 48,
      offers: 41,
      claims: 38,
      filled: 32,
      fillRate: 32 / 48,
    };
  },
};

// =============================================================================
// Salon T9 "StyleConsult AI" — consult inbox + analytics + token-issue
// =============================================================================
//
// Three seeded consults with diverse statuses and retail recs ranked by margin:
//   1. Brianna — NEW, VISION-read (curly / mid-length / warm brunette), 2 services,
//      3 retail products (high → mid → low margin visible ordering).
//   2. Chloe — NEW, MANUAL-typed (straight / long / platinum), 1 service,
//      2 retail products.
//   3. Devon — BOOKED (wavy / short / auburn), 1 service, 1 retail product.
//
// Analytics seed: 28 total, 21 with retail recs, 12 booked, 10 booked+retail
// → ~83% retail-attach rate, ~43% booking rate, $8.50 avg margin.

// Stable UUIDs.
const SC_CONSULT_BRIANNA = "sc000001-0000-0000-0000-000000000001";
const SC_CONSULT_CHLOE = "sc000002-0000-0000-0000-000000000002";
const SC_CONSULT_DEVON = "sc000003-0000-0000-0000-000000000003";

const SEED_STYLE_CONSULTS: StyleConsultInboxCard[] = [
  {
    consultId: SC_CONSULT_BRIANNA,
    contactId: "cc000001-0000-0000-0000-000000000001",
    contactPhone: "+1 555 0401",
    styleCategory: "Curly / wavy",
    serviceCount: 2,
    retailCount: 3,
    status: "NEW",
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(), // 20 min ago
  },
  {
    consultId: SC_CONSULT_CHLOE,
    contactId: null,
    contactPhone: "+1 555 0402",
    styleCategory: "Straight / sleek",
    serviceCount: 1,
    retailCount: 2,
    status: "NEW",
    createdAt: new Date(Date.now() - 1000 * 60 * 75).toISOString(), // 75 min ago
  },
  {
    consultId: SC_CONSULT_DEVON,
    contactId: null,
    contactPhone: "+1 555 0403",
    styleCategory: "Wavy / beachy",
    serviceCount: 1,
    retailCount: 1,
    status: "BOOKED",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hr ago
  },
];

// Retail products — ordered highest→lowest margin within each consult.
const BRIANNA_RETAIL: RetailRecommendation[] = [
  {
    productId: "prod-0001-0000-0000-0000-000000000001",
    sku: "CR-SERUM-01",
    name: "Curl Defining Serum",
    price: 28.0,
    cost: 10.50,
    marginAmount: 17.50,
    rationale:
      "Highest margin on curly-hair products — and it's exactly what this texture needs. Your stylist will confirm the right amount at the appointment.",
  },
  {
    productId: "prod-0002-0000-0000-0000-000000000002",
    sku: "DFC-MASK-02",
    name: "Deep Frizz-Control Mask",
    price: 22.0,
    cost: 11.0,
    marginAmount: 11.0,
    rationale:
      "Great weekly treatment for curly and wavy types. Your stylist will confirm it's the right fit for your hair.",
  },
  {
    productId: "prod-0003-0000-0000-0000-000000000003",
    sku: "HLD-MIST-03",
    name: "Humidity-Blocking Hold Mist",
    price: 18.0,
    cost: 10.0,
    marginAmount: 8.0,
    rationale:
      "Locks the style in humid conditions — keeps curls defined through the day. Your stylist will confirm this works with your routine.",
  },
];

const CHLOE_RETAIL: RetailRecommendation[] = [
  {
    productId: "prod-0004-0000-0000-0000-000000000004",
    sku: "PLA-SHINE-04",
    name: "Platinum Shine Toner",
    price: 32.0,
    cost: 14.0,
    marginAmount: 18.0,
    rationale:
      "Essential between toning appointments to keep platinum bright. Your stylist will confirm the application frequency at the appointment.",
  },
  {
    productId: "prod-0005-0000-0000-0000-000000000005",
    sku: "SFT-BALM-05",
    name: "Smoothing Bond Balm",
    price: 19.0,
    cost: 11.5,
    marginAmount: 7.5,
    rationale:
      "Protects hair bonds during thermal styling — ideal for long, straight styles. Your stylist will confirm at the appointment.",
  },
];

const DEVON_RETAIL: RetailRecommendation[] = [
  {
    productId: "prod-0006-0000-0000-0000-000000000006",
    sku: "WAV-CREAM-06",
    name: "Wave Texture Cream",
    price: 24.0,
    cost: 12.5,
    marginAmount: 11.5,
    rationale:
      "Enhances natural wave without weighing it down — great for short beachy styles. Your stylist confirmed this at booking.",
  },
];

const BRIANNA_SERVICES: ServiceRecommendation[] = [
  {
    serviceMenuItemId: "svc-001",
    name: "Curl Cut & Shape",
    price: 75.0,
    rationale:
      "Cutting curly hair dry and by curl pattern gives the best shape for this style. Your stylist will confirm the cut angle at the appointment.",
  },
  {
    serviceMenuItemId: "svc-002",
    name: "Gloss Treatment",
    price: 45.0,
    rationale:
      "Enhances shine and tones the warm brunette notes in this color profile. Your stylist will confirm the shade at the appointment.",
  },
];

const CHLOE_SERVICES: ServiceRecommendation[] = [
  {
    serviceMenuItemId: "svc-003",
    name: "Platinum Toning Service",
    price: 90.0,
    rationale:
      "Maintains the platinum tone and corrects brassiness — essential for long, straight color. Your stylist will confirm the lift level at the appointment.",
  },
];

const DEVON_SERVICES: ServiceRecommendation[] = [
  {
    serviceMenuItemId: "svc-004",
    name: "Texture Cut (Short)",
    price: 65.0,
    rationale:
      "Short wavy cuts need point-cutting to preserve texture and remove bulk. Your stylist confirmed this at booking.",
  },
];

const SEED_STYLE_CONSULT_RESPONSES: Record<string, StyleConsultResponse> = {
  [SC_CONSULT_BRIANNA]: {
    consultId: SC_CONSULT_BRIANNA,
    styleCategory: "Curly / wavy",
    length: "Mid-length (shoulder)",
    texture: "Curly / 3A coils",
    color: "Warm brunette",
    attributeSource: "VISION",
    confidence: 0.89,
    serviceRecommendations: BRIANNA_SERVICES,
    retailRecommendations: BRIANNA_RETAIL,
    status: "NEW",
    bookingId: null,
  },
  [SC_CONSULT_CHLOE]: {
    consultId: SC_CONSULT_CHLOE,
    styleCategory: "Straight / sleek",
    length: "Long (collarbone+)",
    texture: "Fine / straight",
    color: "Platinum blonde",
    attributeSource: "MANUAL",
    confidence: 1.0,
    serviceRecommendations: CHLOE_SERVICES,
    retailRecommendations: CHLOE_RETAIL,
    status: "NEW",
    bookingId: null,
  },
  [SC_CONSULT_DEVON]: {
    consultId: SC_CONSULT_DEVON,
    styleCategory: "Wavy / beachy",
    length: "Short (chin)",
    texture: "Wavy / 2B",
    color: "Auburn",
    attributeSource: "VISION",
    confidence: 0.82,
    serviceRecommendations: DEVON_SERVICES,
    retailRecommendations: DEVON_RETAIL,
    status: "BOOKED",
    bookingId: "bk000001-0000-0000-0000-000000000001",
  },
};

const SEED_STYLE_CONSULT_ANALYTICS: StyleConsultAnalytics = {
  totalConsults: 28,
  consultsWithRetail: 21,
  consultsBooked: 12,
  bookedWithRetail: 10,
  retailAttachRate: 10 / 12, // ~0.833
  bookingRate: 12 / 28, // ~0.429
  avgRecommendedRetailMargin: 8.5,
};

let styleConsultRows: StyleConsultInboxCard[] = SEED_STYLE_CONSULTS.map(
  (c) => ({ ...c }),
);

export const styleConsultStore = {
  /**
   * GET /styleconsult/consults[?status=<StyleConsultStatus>] — inbox list newest-first.
   * Optional status filter.
   */
  list(status?: string): StyleConsultInboxCard[] {
    const rows = status
      ? styleConsultRows.filter((c) => c.status === status)
      : styleConsultRows;
    return rows
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((c) => ({ ...c }));
  },

  /**
   * GET /styleconsult/consults/{id} — full detail (4455 if absent).
   */
  get(id: string): StyleConsultResponse | null {
    return SEED_STYLE_CONSULT_RESPONSES[id] ?? null;
  },

  /**
   * GET /styleconsult/analytics — retail-attach funnel.
   */
  getAnalytics(): StyleConsultAnalytics {
    return { ...SEED_STYLE_CONSULT_ANALYTICS };
  },

  /**
   * POST /styleconsult/tokens — issue a stable fake widget token.
   */
  issueToken(): { token: string } {
    return { token: "msw-style-consult-token-xyz789" };
  },

  /** TEST-ONLY: reset consult rows to seeds. */
  resetConsults() {
    styleConsultRows = SEED_STYLE_CONSULTS.map((c) => ({ ...c }));
  },
};

// =============================================================================
// Home Services T11 "QuoteCloser" — follow-up config + recovery funnel
// =============================================================================
//
// Seeded config: cadence on, 48-hour window.
// Seeded analytics: a realistic mid-run recovery funnel — 120 quotes sent →
// 84 followed up → 31 recovered → 27 review-requested → 36.9% recovery rate.
// The clearConfig() method exercises the 4470 empty-state path.

const QC_TENANT_ID = SMOKE_USER.tenantId;

type QuoteCloserConfigRow = {
  id: string;
  tenantId: string;
  campaignId: string | null;
  unacceptedWindowHours: number | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

type QuoteCloserConfigDTO = {
  campaignId: string | null;
  unacceptedWindowHours: number | null;
};

type QuoteCloserAnalytics = {
  quotesSent: number;
  followedUp: number;
  recovered: number;
  reviewRequested: number;
  recoveryRate: number;
};

const SEED_QC_CONFIG: QuoteCloserConfigRow = {
  id: "qc000001-0000-0000-0000-000000000001",
  tenantId: QC_TENANT_ID,
  campaignId: "nc000001-0000-0000-0000-000000000001",
  unacceptedWindowHours: 48,
  version: 0,
  createdAt: "2026-06-09T10:00:00Z",
  updatedAt: "2026-06-09T10:00:00Z",
};

const SEED_QC_ANALYTICS: QuoteCloserAnalytics = {
  quotesSent: 120,
  followedUp: 84,
  recovered: 31,
  reviewRequested: 27,
  recoveryRate: 31 / 84, // ~0.369
};

let qcConfigRow: QuoteCloserConfigRow | null = { ...SEED_QC_CONFIG };

export const quoteCloserStore = {
  /**
   * GET /quoting/quote-closer/config — the tenant's config (null → 4470/404).
   */
  getConfig(): QuoteCloserConfigDTO | null {
    if (!qcConfigRow) return null;
    return {
      campaignId: qcConfigRow.campaignId,
      unacceptedWindowHours: qcConfigRow.unacceptedWindowHours,
    };
  },

  /**
   * PUT /quoting/quote-closer/config — upsert (all fields nullable; preserves
   * prior values for null fields — the BE partial-upsert posture).
   */
  saveConfig(body: QuoteCloserConfigDTO): QuoteCloserConfigDTO {
    if (qcConfigRow) {
      qcConfigRow = {
        ...qcConfigRow,
        campaignId: body.campaignId !== null ? body.campaignId : qcConfigRow.campaignId,
        unacceptedWindowHours:
          body.unacceptedWindowHours !== null
            ? body.unacceptedWindowHours
            : qcConfigRow.unacceptedWindowHours,
        version: qcConfigRow.version + 1,
        updatedAt: new Date().toISOString(),
      };
    } else {
      qcConfigRow = {
        id: "qc000001-0000-0000-0000-000000000001",
        tenantId: QC_TENANT_ID,
        campaignId: body.campaignId,
        unacceptedWindowHours: body.unacceptedWindowHours ?? 48,
        version: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    return {
      campaignId: qcConfigRow.campaignId,
      unacceptedWindowHours: qcConfigRow.unacceptedWindowHours,
    };
  },

  /**
   * GET /quoting/quote-closer/analytics — the recovery funnel counters.
   */
  getAnalytics(): QuoteCloserAnalytics {
    return { ...SEED_QC_ANALYTICS };
  },

  /** TEST-ONLY: clear config (exercises the 4470 empty-state path). */
  clearConfig() {
    qcConfigRow = null;
  },

  /** TEST-ONLY: reset config to seed. */
  resetConfig() {
    qcConfigRow = { ...SEED_QC_CONFIG };
  },
};

// =============================================================================
// Salon T12 "StylerMatch" — match inbox + analytics + token-issue + book
// =============================================================================
//
// Three seeded matches with diverse statuses:
//   1. Jordan — NEW, curly/mid — top match: Mia Torres (certified, 0.92);
//      second: Alex Rivera (NOT certified, penalized, 0.53). Both have
//      rationale + score breakdown visible.
//   2. Casey — NEW, straight/long/platinum — top match: Jordan Kim (0.87);
//      single-stylist result (no eligible-service penalty).
//   3. Riley — BOOKED, wavy/short — already accepted rank-1 (Mia Torres),
//      bookingId present, selectedRank = 1.
//
// Analytics seed: 42 total, 31 booked, 28 by rank-1, 2 by rank-2, 1 by rank-3+
// → ~74% booking rate, ~90% rank-1 accept rate, avg top score 0.88.

// Stable UUIDs.
const SM_MATCH_JORDAN = "sm000001-0000-0000-0000-000000000001";
const SM_MATCH_CASEY = "sm000002-0000-0000-0000-000000000002";
const SM_MATCH_RILEY = "sm000003-0000-0000-0000-000000000003";

const SM_STAFF_MIA = "sm-staff-00-0000-0000-0000-000000000001";
const SM_STAFF_ALEX = "sm-staff-00-0000-0000-0000-000000000002";
const SM_STAFF_JORDAN_KIM = "sm-staff-00-0000-0000-0000-000000000003";

const SM_BOOKING_RILEY = "sm-bk0001-0000-0000-0000-000000000001";

/** Rank-1 certified stylist — high specialty fit */
const MIA_RANKED_CERTIFIED: RankedMatch = {
  staffMemberId: SM_STAFF_MIA,
  displayName: "Mia Torres",
  score: 0.92,
  confidence: 0.91,
  rationale:
    "Mia's specialty is curly and textured hair — she's your highest-fit stylist for this look. Your salon will confirm the booking.",
  specialtyFit: 0.95,
  availability: 0.88,
  preference: 0.0,
  eligibleForRequestedService: true,
};

/** Rank-2 NOT certified stylist — penalized */
const ALEX_RANKED_NOT_CERTIFIED: RankedMatch = {
  staffMemberId: SM_STAFF_ALEX,
  displayName: "Alex Rivera",
  score: 0.53,
  confidence: 0.72,
  rationale:
    "Alex has strong availability and good color experience, but is not certified for the requested cut service — shown here for reference only. Your salon must confirm eligibility before booking.",
  specialtyFit: 0.61,
  availability: 0.82,
  preference: 0.0,
  eligibleForRequestedService: false,
};

/** Jordan Kim ranked match — single certified stylist for the straight match */
const JORDAN_KIM_RANKED: RankedMatch = {
  staffMemberId: SM_STAFF_JORDAN_KIM,
  displayName: "Jordan Kim",
  score: 0.87,
  confidence: 0.89,
  rationale:
    "Jordan specialises in fine, straight styles and platinum toning — excellent fit for this request. Your salon will confirm the booking.",
  specialtyFit: 0.91,
  availability: 0.83,
  preference: 0.0,
  eligibleForRequestedService: true,
};

/** Mia Torres for the already-booked Riley match */
const MIA_BOOKED_FOR_RILEY: RankedMatch = {
  staffMemberId: SM_STAFF_MIA,
  displayName: "Mia Torres",
  score: 0.9,
  confidence: 0.88,
  rationale:
    "Mia was the top-ranked match for this wavy short style — already booked. Your salon confirmed the appointment.",
  specialtyFit: 0.92,
  availability: 0.88,
  preference: 0.0,
  eligibleForRequestedService: true,
};

const SEED_STYLER_MATCHES: StylerMatchResponse[] = [
  {
    matchId: SM_MATCH_JORDAN,
    serviceMenuItemId: "svc-001",
    serviceMenuItemName: "Curl Cut & Shape",
    styleCategory: "Curly / wavy",
    slotStart: null,
    slotEnd: null,
    confidence: 0.88,
    rankedMatches: [MIA_RANKED_CERTIFIED, ALEX_RANKED_NOT_CERTIFIED],
    status: "NEW",
    selectedStaffMemberId: null,
    selectedRank: null,
    bookingId: null,
  },
  {
    matchId: SM_MATCH_CASEY,
    serviceMenuItemId: "svc-003",
    serviceMenuItemName: "Platinum Toning Service",
    styleCategory: "Straight / sleek",
    slotStart: null,
    slotEnd: null,
    confidence: 0.85,
    rankedMatches: [JORDAN_KIM_RANKED],
    status: "NEW",
    selectedStaffMemberId: null,
    selectedRank: null,
    bookingId: null,
  },
  {
    matchId: SM_MATCH_RILEY,
    serviceMenuItemId: "svc-004",
    serviceMenuItemName: "Texture Cut (Short)",
    styleCategory: "Wavy / beachy",
    slotStart: null,
    slotEnd: null,
    confidence: 0.86,
    rankedMatches: [MIA_BOOKED_FOR_RILEY],
    status: "BOOKED",
    selectedStaffMemberId: SM_STAFF_MIA,
    selectedRank: 1,
    bookingId: SM_BOOKING_RILEY,
  },
];

const SEED_STYLER_MATCH_ANALYTICS: StylerMatchAnalytics = {
  totalMatches: 42,
  matchesBooked: 31,
  bookingRate: 31 / 42, // ~0.738
  top1BookedCount: 28,
  top2BookedCount: 2,
  top3PlusBookedCount: 1,
  top1AcceptRate: 28 / 31, // ~0.903
  avgTopScore: 0.88,
};

let stylerMatchRows: StylerMatchResponse[] = SEED_STYLER_MATCHES.map(
  (m) => ({ ...m, rankedMatches: [...m.rankedMatches] }),
);

export const stylerMatchStore = {
  /**
   * GET /stylermatch/matches[?status=<StylerMatchStatus>] — inbox list newest-first.
   */
  list(status?: string): StylerMatchResponse[] {
    const rows = status
      ? stylerMatchRows.filter((m) => m.status === status)
      : stylerMatchRows;
    return rows
      .slice()
      .sort((a, b) => (b.matchId > a.matchId ? 1 : -1))
      .map((m) => ({ ...m, rankedMatches: [...m.rankedMatches] }));
  },

  /**
   * POST /stylermatch/matches — create a new match (returns seeded result).
   * In the mock, always returns the Jordan-style result as a newly created match.
   */
  create(body: {
    styleCategory?: string | null;
    serviceMenuItemId?: string | null;
    length?: string | null;
    texture?: string | null;
    color?: string | null;
    name?: string | null;
    phone?: string | null;
    notes?: string | null;
  }): StylerMatchResponse {
    const newId = `sm-new-${Date.now()}-0000-0000-0000-000000000001`;
    const created: StylerMatchResponse = {
      matchId: newId,
      serviceMenuItemId: body.serviceMenuItemId ?? null,
      serviceMenuItemName: null,
      styleCategory: body.styleCategory ?? null,
      slotStart: null,
      slotEnd: null,
      confidence: 0.88,
      rankedMatches: [
        { ...MIA_RANKED_CERTIFIED },
        { ...ALEX_RANKED_NOT_CERTIFIED },
      ],
      status: "NEW",
      selectedStaffMemberId: null,
      selectedRank: null,
      bookingId: null,
    };
    stylerMatchRows = [created, ...stylerMatchRows];
    return { ...created, rankedMatches: [...created.rankedMatches] };
  },

  /**
   * GET /stylermatch/matches/{id} — full detail (4485 if absent).
   */
  get(id: string): StylerMatchResponse | null {
    return stylerMatchRows.find((m) => m.matchId === id) ?? null;
  },

  /**
   * GET /stylermatch/analytics — accept-rate funnel.
   */
  getAnalytics(): StylerMatchAnalytics {
    return { ...SEED_STYLER_MATCH_ANALYTICS };
  },

  /**
   * POST /stylermatch/tokens — issue a stable fake widget token.
   */
  issueToken(): { token: string } {
    return { token: "msw-styler-match-token-abc123" };
  },

  /**
   * POST /public/integrations/stylermatch/{token}/matches/{matchId}/accept
   * Books the top-ranked stylist on the match.
   * Returns 4485/404 if not found.
   */
  bookTopMatch(
    matchId: string,
  ): StylerMatchResponse | null {
    const idx = stylerMatchRows.findIndex((m) => m.matchId === matchId);
    if (idx === -1) return null;
    const match = stylerMatchRows[idx];
    if (match.status === "BOOKED") {
      // Already booked — re-confirm idempotently.
      return { ...match, rankedMatches: [...match.rankedMatches] };
    }
    const topRanked = match.rankedMatches[0];
    const booked: StylerMatchResponse = {
      ...match,
      status: "BOOKED",
      selectedStaffMemberId: topRanked?.staffMemberId ?? null,
      selectedRank: 1,
      bookingId: `sm-bk-new-${Date.now().toString(36)}-0000`,
      rankedMatches: [...match.rankedMatches],
    };
    stylerMatchRows = [
      ...stylerMatchRows.slice(0, idx),
      booked,
      ...stylerMatchRows.slice(idx + 1),
    ];
    return { ...booked, rankedMatches: [...booked.rankedMatches] };
  },

  /** TEST-ONLY: reset match rows to seeds. */
  resetMatches() {
    stylerMatchRows = SEED_STYLER_MATCHES.map(
      (m) => ({ ...m, rankedMatches: [...m.rankedMatches] }),
    );
  },
};
