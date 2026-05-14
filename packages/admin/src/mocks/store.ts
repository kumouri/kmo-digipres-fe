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
  PipelineStage,
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
