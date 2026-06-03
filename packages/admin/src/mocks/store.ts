// In-memory store for the MSW-mocked backend. Reset per page load (lives in
// the service worker process). Grows phase-by-phase as more resources come
// online. Not exported to the prod bundle.

import type {
  ActivityDTO,
  AuditEventDTO,
  BookSlotRequest,
  BookedMeeting,
  BookingPublicView,
  CompanyDTO,
  ContactDTO,
  ContractorClientView,
  ContractorProjectView,
  ContractorTaskView,
  Contract,
  ContractTemplate,
  Dashboard,
  GbpReviewReply,
  DealDTO,
  Expense,
  FieldDefinition,
  FieldDiff,
  InboxMessage,
  InboxThread,
  Invoice,
  KnowledgeBaseArticle,
  Milestone,
  Payment,
  PayoutPeriodLine,
  PayoutReport,
  PipelineStage,
  Project,
  ProjectAssignment,
  Quote,
  RecurringInvoice,
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
} from "@kmosf/crm-components";
import type { components } from "@kmosf/crm-components";

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

const seedQuote: Quote = {
  id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
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

const quotes = new Map<string, Quote>([[seedQuote.id!, seedQuote]]);

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
      invoiceNumber: `INV-${String(invoices.size + 1).padStart(4, "0")}`,
      status: "DRAFT",
      balance: input.total ?? 0,
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
  spawnFromQuote(quote: Quote): Contract {
    // Check if one already exists for this quoteId (idempotent)
    const existing = Array.from(contracts.values()).find(
      (c) => c.quoteId === quote.id,
    );
    if (existing) return existing;
    const id = uuid();
    const created: Contract = {
      id,
      tenantId: SMOKE_USER.tenantId,
      title: `Contract for Quote ${quote.quoteNumber ?? quote.id}`,
      kind: "SOW",
      status: "DRAFT",
      quoteId: quote.id,
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
