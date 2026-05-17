import { http, HttpResponse, delay } from "msw";

import type {
  ActivityDTO,
  AiDraft,
  AiSummary,
  AskAiRequest,
  AskResult,
  AuditEventDTO,
  BookSlotRequest,
  CompanyDTO,
  ContactDTO,
  Dashboard,
  DraftReplyBody,
  DealDTO,
  Expense,
  FieldDefinition,
  Invoice,
  KnowledgeBaseArticle,
  LoginRequest,
  LoginResponse,
  Milestone,
  MoveStageRequest,
  Payment,
  Project,
  Quote,
  SavedReport,
  SingleEmailCommunicationDTO,
  SummarizeBody,
  Task,
  TimeEntry,
  Ticket,
} from "@kmosf/crm-components";
import type { components } from "@kmosf/crm-components";
import {
  SMOKE_PASSWORD,
  SMOKE_STAFF_TOKEN,
  SMOKE_STAFF_USER,
  SMOKE_TOKEN,
  SMOKE_USER,
  activityStore,
  attachmentStore,
  auditStore,
  bookingStore,
  companyStore,
  contactStore,
  dashboardStore,
  dealStore,
  expenseStore,
  fieldDefStore,
  inboxStore,
  invoiceStore,
  kbStore,
  milestoneStore,
  projectStore,
  quoteStore,
  savedReportStore,
  taskStore2,
  ticketStore,
  timeEntryStore,
} from "./store";

type Attachment = components["schemas"]["Attachment"];
type PresignRequest = components["schemas"]["PresignRequest"];
type InvoiceFromTimeRequest = components["schemas"]["InvoiceFromTimeRequest"];
type InvoiceFromExpensesRequest = components["schemas"]["InvoiceFromExpensesRequest"];

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1";

function requireAuth(request: Request): boolean {
  const header = request.headers.get("authorization");
  return !!header && header.startsWith("Bearer ");
}

export const handlers = [
  // --- Auth -----------------------------------------------------------------
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as LoginRequest;
    await delay(50);
    const account =
      body.email === SMOKE_USER.email
        ? { user: SMOKE_USER, token: SMOKE_TOKEN }
        : body.email === SMOKE_STAFF_USER.email
          ? { user: SMOKE_STAFF_USER, token: SMOKE_STAFF_TOKEN }
          : null;
    if (account && body.password === SMOKE_PASSWORD) {
      const res: LoginResponse = {
        token: account.token,
        userId: account.user.id,
        tenantId: account.user.tenantId,
        tenantName: account.user.tenantName,
        email: account.user.email,
        displayName: account.user.displayName,
        roles: account.user.roles,
      };
      return HttpResponse.json(res);
    }
    return new HttpResponse(null, { status: 401 });
  }),

  http.get(`${API_BASE}/auth/me`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const header = request.headers.get("authorization") ?? "";
    const me =
      header === `Bearer ${SMOKE_STAFF_TOKEN}` ? SMOKE_STAFF_USER : SMOKE_USER;
    return HttpResponse.json(me);
  }),

  http.post(`${API_BASE}/auth/logout`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${API_BASE}/auth/health`, () => HttpResponse.text("ok")),

  // --- Contacts -------------------------------------------------------------
  http.get(`${API_BASE}/contacts`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(contactStore.list());
  }),

  http.get(`${API_BASE}/contacts/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const found = contactStore.get(params.id as string);
    if (!found) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(found);
  }),

  http.post(`${API_BASE}/contacts`, async ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as ContactDTO;
    const created = contactStore.create(body);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.put(`${API_BASE}/contacts/:id`, async ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as ContactDTO;
    const updated = contactStore.update(params.id as string, body);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),

  http.delete(`${API_BASE}/contacts/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const ok = contactStore.delete(params.id as string);
    return new HttpResponse(null, { status: ok ? 204 : 404 });
  }),

  http.get(`${API_BASE}/contacts/:id/timeline`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(
      activityStore.forSubject("CONTACT", params.id as string),
    );
  }),

  // --- Companies ------------------------------------------------------------
  http.get(`${API_BASE}/companies`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(companyStore.list());
  }),

  http.get(`${API_BASE}/companies/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const found = companyStore.get(params.id as string);
    if (!found) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(found);
  }),

  http.post(`${API_BASE}/companies`, async ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as CompanyDTO;
    const created = companyStore.create(body);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.put(`${API_BASE}/companies/:id`, async ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as CompanyDTO;
    const updated = companyStore.update(params.id as string, body);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),

  http.delete(`${API_BASE}/companies/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const ok = companyStore.delete(params.id as string);
    return new HttpResponse(null, { status: ok ? 204 : 404 });
  }),

  // --- Deals ----------------------------------------------------------------
  http.get(`${API_BASE}/deals`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(dealStore.list());
  }),

  http.get(`${API_BASE}/deals/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const found = dealStore.get(params.id as string);
    if (!found) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(found);
  }),

  http.post(`${API_BASE}/deals`, async ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as DealDTO;
    const created = dealStore.create(body);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.put(`${API_BASE}/deals/:id`, async ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as DealDTO;
    const updated = dealStore.update(params.id as string, body);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),

  http.post(`${API_BASE}/deals/:id/move`, async ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as MoveStageRequest;
    const moved = dealStore.move(params.id as string, body.stage, body.lostReason);
    if (!moved) return new HttpResponse(null, { status: 400 });
    return HttpResponse.json(moved);
  }),

  http.delete(`${API_BASE}/deals/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const ok = dealStore.delete(params.id as string);
    return new HttpResponse(null, { status: ok ? 204 : 404 });
  }),

  // --- Activities -----------------------------------------------------------
  http.get(`${API_BASE}/activities`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(activityStore.list());
  }),

  http.get(`${API_BASE}/activities/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const found = activityStore.get(params.id as string);
    if (!found) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(found);
  }),

  http.post(`${API_BASE}/activities`, async ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as ActivityDTO;
    const created = activityStore.add(body);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.put(`${API_BASE}/activities/:id`, async ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as ActivityDTO;
    const updated = activityStore.update(params.id as string, body);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),

  http.delete(`${API_BASE}/activities/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const ok = activityStore.delete(params.id as string);
    return new HttpResponse(null, { status: ok ? 204 : 404 });
  }),

  // --- Public booking (unauth) ----------------------------------------------
  http.get(`${API_BASE}/public/booking/:slug`, ({ params }) => {
    const view = bookingStore.view(params.slug as string);
    if (!view) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(view);
  }),

  http.post(`${API_BASE}/public/booking/:slug/book`, async ({ request, params }) => {
    const body = (await request.json()) as BookSlotRequest;
    const meeting = bookingStore.book(params.slug as string, body);
    if (!meeting) return new HttpResponse(null, { status: 409 });
    return HttpResponse.json(meeting, { status: 201 });
  }),

  // --- Quotes ---------------------------------------------------------------
  http.get(`${API_BASE}/quotes`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(quoteStore.list());
  }),

  http.get(`${API_BASE}/quotes/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const found = quoteStore.get(params.id as string);
    if (!found) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(found);
  }),

  http.post(`${API_BASE}/quotes`, async ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as Quote;
    const created = quoteStore.create(body);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.put(`${API_BASE}/quotes/:id`, async ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as Quote;
    const updated = quoteStore.update(params.id as string, body);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),

  http.delete(`${API_BASE}/quotes/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const ok = quoteStore.delete(params.id as string);
    return new HttpResponse(null, { status: ok ? 204 : 404 });
  }),

  http.post(`${API_BASE}/quotes/:id/status`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const url = new URL(request.url);
    const target = url.searchParams.get("target") ?? "SENT";
    const updated = quoteStore.changeStatus(params.id as string, target);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),

  // Quote PDF — return a simple text response (no real PDF in smoke mode)
  http.get(`${API_BASE}/quotes/:id/pdf`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return new HttpResponse("PDF_STUB", {
      status: 200,
      headers: { "Content-Type": "application/pdf" },
    });
  }),

  // --- Invoices -------------------------------------------------------------
  http.get(`${API_BASE}/invoices`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(invoiceStore.list());
  }),

  http.get(`${API_BASE}/invoices/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const found = invoiceStore.get(params.id as string);
    if (!found) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(found);
  }),

  http.post(`${API_BASE}/invoices`, async ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as Invoice;
    const created = invoiceStore.create(body);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.post(`${API_BASE}/invoices/from-quote/:quoteId`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const quote = quoteStore.get(params.quoteId as string);
    if (!quote) return new HttpResponse(null, { status: 404 });
    const created = invoiceStore.createFromQuote(quote);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.delete(`${API_BASE}/invoices/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const ok = invoiceStore.delete(params.id as string);
    return new HttpResponse(null, { status: ok ? 204 : 404 });
  }),

  http.post(`${API_BASE}/invoices/:id/status`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const url = new URL(request.url);
    const target = url.searchParams.get("target") ?? "SENT";
    const updated = invoiceStore.changeStatus(params.id as string, target);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),

  http.get(`${API_BASE}/invoices/:id/payments`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(invoiceStore.listPayments(params.id as string));
  }),

  http.post(`${API_BASE}/invoices/:id/payments`, async ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as Payment;
    const created = invoiceStore.recordPayment(params.id as string, body);
    if (!created) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(created, { status: 201 });
  }),

  // --- Tickets ---------------------------------------------------------------
  http.get(`${API_BASE}/tickets`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(ticketStore.list());
  }),

  http.get(`${API_BASE}/tickets/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const found = ticketStore.get(params.id as string);
    if (!found) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(found);
  }),

  http.post(`${API_BASE}/tickets`, async ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as Ticket;
    const created = ticketStore.create(body);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.put(`${API_BASE}/tickets/:id`, async ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as Ticket;
    const updated = ticketStore.update(params.id as string, body);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),

  http.delete(`${API_BASE}/tickets/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const ok = ticketStore.delete(params.id as string);
    return new HttpResponse(null, { status: ok ? 204 : 404 });
  }),

  http.post(`${API_BASE}/tickets/:id/transition`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const url = new URL(request.url);
    const target = url.searchParams.get("target") ?? "OPEN";
    const updated = ticketStore.transition(params.id as string, target);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),

  http.get(`${API_BASE}/tickets/:id/comments`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(ticketStore.listComments(params.id as string));
  }),

  http.post(`${API_BASE}/tickets/:id/comments`, async ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as { body: string };
    const created = ticketStore.addComment(params.id as string, body.body ?? "");
    if (!created) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(created, { status: 201 });
  }),

  // --- Knowledge Base -------------------------------------------------------
  http.get(`${API_BASE}/knowledge-base/articles`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(kbStore.list());
  }),

  http.get(`${API_BASE}/knowledge-base/articles/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const found = kbStore.get(params.id as string);
    if (!found) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(found);
  }),

  http.post(`${API_BASE}/knowledge-base/articles`, async ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as KnowledgeBaseArticle;
    const created = kbStore.create(body);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.put(`${API_BASE}/knowledge-base/articles/:id`, async ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as KnowledgeBaseArticle;
    const updated = kbStore.update(params.id as string, body);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),

  http.delete(`${API_BASE}/knowledge-base/articles/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const ok = kbStore.delete(params.id as string);
    return new HttpResponse(null, { status: ok ? 204 : 404 });
  }),

  http.post(`${API_BASE}/knowledge-base/articles/:id/publish`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const updated = kbStore.publish(params.id as string);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),

  http.post(`${API_BASE}/knowledge-base/search`, async ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as { query?: string };
    return HttpResponse.json(kbStore.search(body.query ?? ""));
  }),

  // --- Inbox ----------------------------------------------------------------
  http.get(`${API_BASE}/inbox/threads`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(inboxStore.listThreads());
  }),

  http.get(`${API_BASE}/inbox/threads/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const found = inboxStore.getThread(params.id as string);
    if (!found) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(found);
  }),

  http.post(`${API_BASE}/inbox/threads/:id/claim`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const updated = inboxStore.claimThread(params.id as string);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),

  http.get(`${API_BASE}/inbox/threads/:id/messages`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(inboxStore.listMessages(params.id as string));
  }),

  http.post(`${API_BASE}/inbox/threads/:id/messages`, async ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as { body: string };
    const created = inboxStore.replyToThread(params.id as string, body.body ?? "");
    if (!created) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(created, { status: 201 });
  }),

  // --- Field Definitions ----------------------------------------------------
  http.get(`${API_BASE}/admin/field-definitions`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(fieldDefStore.list());
  }),

  http.get(`${API_BASE}/admin/field-definitions/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const found = fieldDefStore.get(params.id as string);
    if (!found) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(found);
  }),

  http.post(`${API_BASE}/admin/field-definitions`, async ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as FieldDefinition;
    const created = fieldDefStore.create(body);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.put(`${API_BASE}/admin/field-definitions/:id`, async ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as FieldDefinition;
    const updated = fieldDefStore.update(params.id as string, body);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),

  http.delete(`${API_BASE}/admin/field-definitions/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const ok = fieldDefStore.delete(params.id as string);
    return new HttpResponse(null, { status: ok ? 204 : 404 });
  }),

  // Mirrors PublicContactController in kmo-digipres-be: unauth, tenant
  // resolved from the path, contact stamped with the path's tenantId, 400
  // when neither firstName nor lastName is supplied. Mock store doubles as
  // the tenant directory — only "smoke-tenant" exists for tests.
  http.post(
    `${API_BASE}/public/:tenantSlug/contacts`,
    async ({ params, request }) => {
      if (params.tenantSlug !== "smoke-tenant") {
        return new HttpResponse(null, { status: 404 });
      }
      const body = (await request.json()) as {
        email?: string;
        firstName?: string;
        lastName?: string;
        phone?: string;
        message?: string;
      };
      if (!body.email) return new HttpResponse(null, { status: 400 });
      if (!body.firstName && !body.lastName) {
        return new HttpResponse(null, { status: 400 });
      }
      const displayName =
        `${body.firstName ?? ""} ${body.lastName ?? ""}`.trim() || body.email;
      const created = contactStore.create({
        type: "PERSON",
        firstName: body.firstName,
        lastName: body.lastName,
        displayName,
        emails: [body.email],
        phones: body.phone ? [{ number: body.phone, label: "primary" }] : [],
        tags: ["public-form"],
      });
      return HttpResponse.json(created, { status: 201 });
    },
  ),

  // --- Communication --------------------------------------------------------
  // Mirrors CommunicationController.sendEmail: returns Mono<Boolean>, and on
  // success logs an outbound EMAIL activity to the matching contact's
  // timeline (matched by `to` email). Mock store doubles as the timeline.
  http.post(`${API_BASE}/communication/singleEmail`, async ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as SingleEmailCommunicationDTO;
    const match = contactStore
      .list()
      .find((c) => c.emails?.includes(body.to));
    if (match?.id) {
      activityStore.add({
        type: "EMAIL",
        direction: "OUTBOUND",
        subjectType: "CONTACT",
        subjectId: match.id,
        summary: body.subject,
        body: body.body,
        payload: { to: body.to, from: body.from },
      });
    }
    return HttpResponse.json(true);
  }),

  // --- Audit ----------------------------------------------------------------
  http.get(`${API_BASE}/audit`, ({ request }) => {
    if (!requireAuth(request)) return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
    const url = new URL(request.url);
    const entityType = url.searchParams.get("entityType") ?? "";
    const entityId = url.searchParams.get("entityId") ?? "";
    const events: AuditEventDTO[] = auditStore.listForEntity(entityType, entityId);
    return HttpResponse.json(events);
  }),

  http.get(`${API_BASE}/audit/by-actor/:userId`, ({ request, params }) => {
    if (!requireAuth(request)) return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
    const { userId } = params as { userId: string };
    const events: AuditEventDTO[] = auditStore.listByActor(userId);
    return HttpResponse.json(events);
  }),

  // --- Saved Reports --------------------------------------------------------
  http.get(`${API_BASE}/reports/saved`, ({ request }) => {
    if (!requireAuth(request)) return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
    return HttpResponse.json(savedReportStore.list());
  }),

  http.post(`${API_BASE}/reports/saved`, async ({ request }) => {
    if (!requireAuth(request)) return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
    const body = (await request.json()) as SavedReport;
    return HttpResponse.json(savedReportStore.create(body), { status: 201 });
  }),

  http.get(`${API_BASE}/reports/saved/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
    const { id } = params as { id: string };
    const report = savedReportStore.get(id);
    if (!report) return HttpResponse.json({ message: "Not found" }, { status: 404 });
    return HttpResponse.json(report);
  }),

  http.put(`${API_BASE}/reports/saved/:id`, async ({ request, params }) => {
    if (!requireAuth(request)) return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
    const { id } = params as { id: string };
    const body = (await request.json()) as SavedReport;
    const updated = savedReportStore.update(id, body);
    if (!updated) return HttpResponse.json({ message: "Not found" }, { status: 404 });
    return HttpResponse.json(updated);
  }),

  http.delete(`${API_BASE}/reports/saved/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
    const { id } = params as { id: string };
    savedReportStore.delete(id);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API_BASE}/reports/saved/:id/run`, ({ request, params }) => {
    if (!requireAuth(request)) return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
    const { id } = params as { id: string };
    const report = savedReportStore.get(id);
    if (!report) return HttpResponse.json({ message: "Not found" }, { status: 404 });
    // Return mock result rows based on the report entity type
    const mockRows: Record<string, unknown>[] = [
      { stage: "QUALIFIED", count: 3, totalValue: 15000 },
      { stage: "NEGOTIATION", count: 2, totalValue: 25000 },
    ];
    return HttpResponse.json(mockRows);
  }),

  // --- Dashboards -----------------------------------------------------------
  http.get(`${API_BASE}/reports/dashboards`, ({ request }) => {
    if (!requireAuth(request)) return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
    return HttpResponse.json(dashboardStore.list());
  }),

  http.post(`${API_BASE}/reports/dashboards`, async ({ request }) => {
    if (!requireAuth(request)) return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
    const body = (await request.json()) as Dashboard;
    return HttpResponse.json(dashboardStore.create(body), { status: 201 });
  }),

  http.get(`${API_BASE}/reports/dashboards/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
    const { id } = params as { id: string };
    const dash = dashboardStore.get(id);
    if (!dash) return HttpResponse.json({ message: "Not found" }, { status: 404 });
    return HttpResponse.json(dash);
  }),

  http.put(`${API_BASE}/reports/dashboards/:id`, async ({ request, params }) => {
    if (!requireAuth(request)) return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
    const { id } = params as { id: string };
    const body = (await request.json()) as Dashboard;
    const updated = dashboardStore.update(id, body);
    if (!updated) return HttpResponse.json({ message: "Not found" }, { status: 404 });
    return HttpResponse.json(updated);
  }),

  http.delete(`${API_BASE}/reports/dashboards/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
    const { id } = params as { id: string };
    dashboardStore.delete(id);
    return new HttpResponse(null, { status: 204 });
  }),

  // --- AI assist ------------------------------------------------------------
  http.post(`${API_BASE}/ai/ask`, async ({ request }) => {
    if (!requireAuth(request)) return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
    const body = (await request.json()) as AskAiRequest;
    const result: AskResult = {
      answer: `Here is a mock AI answer for: "${body.question ?? ""}"`,
      citations: [
        {
          sourceType: "KNOWLEDGE_BASE",
          sourceId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
          contentPreview: "How to reset your password",
          score: 0.92,
        },
      ],
    };
    return HttpResponse.json(result);
  }),

  http.post(`${API_BASE}/ai/summarize-timeline`, async ({ request }) => {
    if (!requireAuth(request)) return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
    const body = (await request.json()) as SummarizeBody;
    const summary: AiSummary = {
      text: `Mock timeline summary for contact ${body.contactId ?? "unknown"}.`,
      inputTokens: 120,
      outputTokens: 45,
    };
    return HttpResponse.json(summary);
  }),

  http.post(`${API_BASE}/ai/draft-reply`, async ({ request }) => {
    if (!requireAuth(request)) return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
    const body = (await request.json()) as DraftReplyBody;
    const draft: AiDraft = {
      text: `Thank you for reaching out about "${body.threadSubject ?? "your inquiry"}". We will get back to you shortly.`,
      inputTokens: 80,
      outputTokens: 30,
    };
    return HttpResponse.json(draft);
  }),

  // --- Projects (Phase C) ----------------------------------------------------

  http.get(`${API_BASE}/projects`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(projectStore.list());
  }),

  http.get(`${API_BASE}/projects/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const found = projectStore.get(params.id as string);
    if (!found) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(found);
  }),

  http.post(`${API_BASE}/projects`, async ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as Project;
    const created = projectStore.create(body);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.put(`${API_BASE}/projects/:id`, async ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as Project;
    const updated = projectStore.update(params.id as string, body);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),

  http.delete(`${API_BASE}/projects/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const ok = projectStore.delete(params.id as string);
    return new HttpResponse(null, { status: ok ? 204 : 404 });
  }),

  http.post(`${API_BASE}/projects/:id/status`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const url = new URL(request.url);
    const target = url.searchParams.get("target") ?? "";
    const updated = projectStore.changeStatus(params.id as string, target);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),

  // Deal → Project conversion (idempotent: 201 on first create, 200 on repeat)
  http.post(`${API_BASE}/projects/from-deal/:dealId`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const dealId = params.dealId as string;
    const deal = dealStore.get(dealId);
    if (!deal) return new HttpResponse(null, { status: 404 });
    if (deal.stage !== "WON")
      return HttpResponse.json({ message: "Deal must be WON" }, { status: 409 });
    const existing = projectStore.findByDealId(dealId);
    if (existing) return HttpResponse.json(existing, { status: 200 });
    const created = projectStore.createFromDeal(deal);
    return HttpResponse.json(created, { status: 201 });
  }),

  // --- Milestones (Phase C) --------------------------------------------------

  http.get(`${API_BASE}/milestones/by-project/:projectId`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(
      milestoneStore.listByProject(params.projectId as string),
    );
  }),

  http.post(`${API_BASE}/milestones/by-project/:projectId`, async ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as Milestone;
    const created = milestoneStore.create(params.projectId as string, body);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.get(`${API_BASE}/milestones/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const found = milestoneStore.get(params.id as string);
    if (!found) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(found);
  }),

  http.put(`${API_BASE}/milestones/:id`, async ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as Milestone;
    const updated = milestoneStore.update(params.id as string, body);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),

  http.delete(`${API_BASE}/milestones/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const ok = milestoneStore.delete(params.id as string);
    return new HttpResponse(null, { status: ok ? 204 : 404 });
  }),

  // Milestone transition (complete → spawns invoice if triggersInvoiceOnComplete)
  http.post(`${API_BASE}/milestones/:id/transition`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? "";
    if (status !== "COMPLETED")
      return HttpResponse.json({ message: "Only COMPLETED transition supported" }, { status: 400 });
    const updated = milestoneStore.complete(params.id as string);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),

  // --- Tasks (Phase C) -------------------------------------------------------

  http.get(`${API_BASE}/tasks/by-project/:projectId`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(
      taskStore2.listByProject(params.projectId as string),
    );
  }),

  http.post(`${API_BASE}/tasks/by-project/:projectId`, async ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as Task;
    const created = taskStore2.create(params.projectId as string, body);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.put(`${API_BASE}/tasks/:id`, async ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as Task;
    const updated = taskStore2.update(params.id as string, body);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),

  http.delete(`${API_BASE}/tasks/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const ok = taskStore2.delete(params.id as string);
    return new HttpResponse(null, { status: ok ? 204 : 404 });
  }),

  http.post(`${API_BASE}/tasks/:id/status`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const url = new URL(request.url);
    const target = url.searchParams.get("target") ?? "";
    const updated = taskStore2.changeStatus(params.id as string, target);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),

  // --- Time Entries (Phase D) ------------------------------------------------

  // IMPORTANT: more-specific paths (/timer/start, /timer/stop, /timer/running,
  // /weekly, /invoice-from-time, /by-user/:userId) must come BEFORE the
  // wildcard /:id to avoid MSW matching the literal string as an ID.

  http.post(`${API_BASE}/time-entries/timer/start`, async ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as TimeEntry;
    const result = timeEntryStore.startTimer(body);
    if ("code" in result) {
      return HttpResponse.json(
        { message: result.error, errorCode: result.code },
        { status: 409 },
      );
    }
    return HttpResponse.json(result, { status: 201 });
  }),

  http.post(`${API_BASE}/time-entries/timer/stop`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId") ?? SMOKE_USER.id;
    const endedAt = url.searchParams.get("endedAt") ?? undefined;
    const zoneId = url.searchParams.get("zoneId") ?? undefined;
    const result = timeEntryStore.stopTimer(userId, endedAt, zoneId);
    if ("code" in result) {
      return HttpResponse.json(
        { message: result.error, errorCode: result.code },
        { status: 409 },
      );
    }
    return HttpResponse.json(result);
  }),

  http.get(`${API_BASE}/time-entries/timer/running`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const running = timeEntryStore.getRunningTimer();
    if (!running) return new HttpResponse(null, { status: 204 });
    return HttpResponse.json(running);
  }),

  http.get(`${API_BASE}/time-entries/weekly`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId") ?? SMOKE_USER.id;
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? "";
    return HttpResponse.json(timeEntryStore.listWeekly(userId, from, to));
  }),

  http.post(`${API_BASE}/time-entries/invoice-from-time`, async ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as InvoiceFromTimeRequest;
    const result = timeEntryStore.createInvoiceFromTime(body.projectId);
    if ("code" in result) {
      return HttpResponse.json(
        { message: result.error, errorCode: result.code },
        { status: 409 },
      );
    }
    return HttpResponse.json(result);
  }),

  http.get(`${API_BASE}/time-entries/by-user/:userId`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(
      timeEntryStore.listByUser(params.userId as string),
    );
  }),

  http.get(`${API_BASE}/time-entries`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(timeEntryStore.list());
  }),

  http.get(`${API_BASE}/time-entries/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const found = timeEntryStore.get(params.id as string);
    if (!found) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(found);
  }),

  http.post(`${API_BASE}/time-entries`, async ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as TimeEntry;
    const created = timeEntryStore.create(body);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.put(`${API_BASE}/time-entries/:id`, async ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as TimeEntry;
    const updated = timeEntryStore.update(params.id as string, body);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),

  http.delete(`${API_BASE}/time-entries/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const ok = timeEntryStore.delete(params.id as string);
    return new HttpResponse(null, { status: ok ? 204 : 404 });
  }),

  // --- Expenses (Phase D) ----------------------------------------------------

  // More-specific paths before wildcard /:id
  http.post(`${API_BASE}/expenses/invoice-from-expenses`, async ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as InvoiceFromExpensesRequest;
    const result = expenseStore.createInvoiceFromExpenses(body.projectId);
    if ("code" in result) {
      return HttpResponse.json(
        { message: result.error, errorCode: result.code },
        { status: 409 },
      );
    }
    return HttpResponse.json(result);
  }),

  http.post(`${API_BASE}/expenses/:id/approve`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const result = expenseStore.approve(params.id as string);
    if ("code" in result) {
      const status = result.code === 3517 ? 409 : 404;
      return HttpResponse.json(
        { message: result.error, errorCode: result.code },
        { status },
      );
    }
    return HttpResponse.json(result);
  }),

  http.post(`${API_BASE}/expenses/:id/reject`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const url = new URL(request.url);
    const reason = url.searchParams.get("reason") ?? "";
    const result = expenseStore.reject(params.id as string, reason);
    if ("code" in result) {
      const status = result.code === 3516 ? 400 : result.code === 3517 ? 409 : 404;
      return HttpResponse.json(
        { message: result.error, errorCode: result.code },
        { status },
      );
    }
    return HttpResponse.json(result);
  }),

  http.get(`${API_BASE}/expenses`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(expenseStore.list());
  }),

  http.get(`${API_BASE}/expenses/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const found = expenseStore.get(params.id as string);
    if (!found) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(found);
  }),

  http.post(`${API_BASE}/expenses`, async ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as Expense;
    const created = expenseStore.create(body);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.put(`${API_BASE}/expenses/:id`, async ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as Expense;
    const updated = expenseStore.update(params.id as string, body);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),

  http.delete(`${API_BASE}/expenses/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const ok = expenseStore.delete(params.id as string);
    return new HttpResponse(null, { status: ok ? 204 : 404 });
  }),

  // --- Attachments (Phase D reuses existing /attachments endpoints) ----------
  // MSW presign: return a fake presigned URL (no real S3 in mock mode)

  http.post(`${API_BASE}/attachments/presign`, async ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as PresignRequest;
    const storageRef = `tenants/${SMOKE_USER.tenantId}/attachments/${body.subjectType}/${body.subjectId}/mock-receipt.${body.suffix ?? "pdf"}`;
    return HttpResponse.json({
      uploadUrl: `https://mock-s3.example/presigned/${storageRef}`,
      storageRef,
    });
  }),

  http.post(`${API_BASE}/attachments`, async ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as Attachment;
    const registered = attachmentStore.register(body);
    return HttpResponse.json(registered, { status: 201 });
  }),

  http.get(`${API_BASE}/attachments`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const url = new URL(request.url);
    const subjectType = url.searchParams.get("subjectType") ?? "";
    const subjectId = url.searchParams.get("subjectId") ?? "";
    return HttpResponse.json(attachmentStore.listFor(subjectType, subjectId));
  }),
];
