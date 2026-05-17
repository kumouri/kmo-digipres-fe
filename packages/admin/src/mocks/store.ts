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
  Dashboard,
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
  PipelineStage,
  Project,
  Quote,
  SavedReport,
  Task,
  TimeEntry,
  Ticket,
  TicketComment,
  User,
} from "@kmosf/crm-components";
import type { components } from "@kmosf/crm-components";

type Attachment = components["schemas"]["Attachment"];

export const SMOKE_USER: User = {
  id: "11111111-1111-1111-1111-111111111111",
  tenantId: "22222222-2222-2222-2222-222222222222",
  email: "smoke@example.test",
  displayName: "Smoke User",
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
  roles: ["STAFF"],
  status: "ACTIVE",
  version: 0,
  createdAt: "2026-05-14T00:00:00Z",
  updatedAt: "2026-05-14T00:00:00Z",
};

export const SMOKE_STAFF_TOKEN = "msw-mock-jwt-token-staff";

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

const expenses = new Map<string, Expense>([[seedExpense.id!, seedExpense]]);

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
