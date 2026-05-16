import { http, HttpResponse, delay } from "msw";

import type {
  ActivityDTO,
  BookSlotRequest,
  CompanyDTO,
  ContactDTO,
  DealDTO,
  FieldDefinition,
  Invoice,
  KnowledgeBaseArticle,
  LoginRequest,
  LoginResponse,
  MoveStageRequest,
  Payment,
  Quote,
  SingleEmailCommunicationDTO,
  Ticket,
} from "@kmosf/crm-components";
import {
  SMOKE_PASSWORD,
  SMOKE_TOKEN,
  SMOKE_USER,
  activityStore,
  bookingStore,
  companyStore,
  contactStore,
  dealStore,
  fieldDefStore,
  inboxStore,
  invoiceStore,
  kbStore,
  quoteStore,
  ticketStore,
} from "./store";

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
    if (body.email === SMOKE_USER.email && body.password === SMOKE_PASSWORD) {
      const res: LoginResponse = {
        token: SMOKE_TOKEN,
        userId: SMOKE_USER.id,
        tenantId: SMOKE_USER.tenantId,
        email: SMOKE_USER.email,
        displayName: SMOKE_USER.displayName,
        roles: SMOKE_USER.roles,
      };
      return HttpResponse.json(res);
    }
    return new HttpResponse(null, { status: 401 });
  }),

  http.get(`${API_BASE}/auth/me`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(SMOKE_USER);
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
];
