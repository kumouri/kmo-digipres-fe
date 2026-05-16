// In-memory store for the MSW-mocked backend. Reset per page load (lives in
// the service worker process). Grows phase-by-phase as more resources come
// online. Not exported to the prod bundle.

import type {
  ActivityDTO,
  BookSlotRequest,
  BookedMeeting,
  BookingPublicView,
  CompanyDTO,
  ContactDTO,
  DealDTO,
  FieldDefinition,
  InboxMessage,
  InboxThread,
  Invoice,
  KnowledgeBaseArticle,
  Payment,
  PipelineStage,
  Quote,
  Ticket,
  TicketComment,
  User,
} from "@kmosf/crm-components";

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
