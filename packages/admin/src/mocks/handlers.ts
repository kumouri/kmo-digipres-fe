import { http, HttpResponse, delay } from "msw";

import type {
  ActivityDTO,
  AiDraft,
  AiSummary,
  Appointment,
  AskAiRequest,
  AskResult,
  AuditEventDTO,
  BookSlotRequest,
  CompanyDTO,
  ContactDTO,
  Contract,
  ContractTemplate,
  Dashboard,
  DraftReplyBody,
  DealDTO,
  DisclosureRequest,
  Expense,
  FieldDefinition,
  Invoice,
  KnowledgeBaseArticle,
  Listing,
  LoginRequest,
  LoginResponse,
  Milestone,
  MoveStageRequest,
  PasteInReviewRequest,
  Payment,
  Project,
  Quote,
  RecurringInvoice,
  SavedReport,
  SingleEmailCommunicationDTO,
  SummarizeBody,
  Task,
  TeamMemberRequest,
  TimeEntry,
  Timesheet,
  TimesheetStatus,
  TimesheetView,
  Ticket,
  WaitlistJoinRequest,
} from "@kmosf/crm-components";
import type { components } from "@kmosf/crm-components";
import type { ListingPrepGenerateRequest } from "@kmosf/crm-components";
import {
  SMOKE_CONTRACTOR_TOKEN,
  SMOKE_CONTRACTOR_USER,
  SMOKE_PASSWORD,
  SMOKE_STAFF_TOKEN,
  SMOKE_STAFF_USER,
  SMOKE_TOKEN,
  SMOKE_USER,
  activityStore,
  arStore,
  proposalStore,
  assignmentStore,
  attachmentStore,
  auditStore,
  bookingStore,
  callbackStore,
  reviewBoostStore,
  chairFillRiskStore,
  chairFillWaitlistStore,
  companyStore,
  contactStore,
  contractStore,
  contractTemplateStore,
  contractorStore,
  dashboardStore,
  dealStore,
  expenseStore,
  fieldDefStore,
  frontDeskAppointmentStore,
  frontDeskCallbackStore,
  frontDeskRecallStore,
  frontDeskReviewStore,
  gbpReviewReplyStore,
  inboxStore,
  invoiceStore,
  kbStore,
  milestoneStore,
  missedCallInboxStore,
  payoutStore,
  projectStore,
  quoteStore,
  realEstateStore,
  realEstateNurtureStore,
  midnightResponderStore,
  frontDeskNurtureStore,
  switchboardStore,
  rescheduleStore,
  recurringInvoiceStore,
  savedReportStore,
  taskStore2,
  teamStore,
  ticketStore,
  timeEntryStore,
  timesheetStore,
  quotingStore,
  styleConsultStore,
  listingPrepStore,
  quoteCloserStore,
  stylerMatchStore,
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

/** Resolve the calling user from the bearer token (mirrors /auth/me). */
function userFromToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  if (header === `Bearer ${SMOKE_STAFF_TOKEN}`) return SMOKE_STAFF_USER;
  if (header === `Bearer ${SMOKE_CONTRACTOR_TOKEN}`) return SMOKE_CONTRACTOR_USER;
  return SMOKE_USER;
}

/** True when the caller is a scoped-down contractor (CONTRACTOR && !ADMIN). */
function isContractorToken(request: Request): boolean {
  const roles = userFromToken(request).roles ?? [];
  return roles.includes("CONTRACTOR") && !roles.includes("ADMIN");
}

/** Project a full Timesheet to the trimmed contractor TimesheetView (mirrors BE). */
function toContractorTimesheetView(t: Timesheet): TimesheetView {
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

/**
 * Mirrors the Phase-2 BE: the broad staff readers DENY a CONTRACTOR token with
 * a 403 + errorCode 4135. Returns the deny response when the caller is a
 * contractor, otherwise null (proceed). Use on the staff list/read endpoints a
 * contractor must reach through /me/contractor/** instead.
 */
function denyContractor(request: Request): Response | null {
  if (isContractorToken(request)) {
    return HttpResponse.json(
      {
        message: "Contractors cannot access this resource",
        errorCode: 4135,
      },
      { status: 403 },
    );
  }
  return null;
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
          : body.email === SMOKE_CONTRACTOR_USER.email
            ? { user: SMOKE_CONTRACTOR_USER, token: SMOKE_CONTRACTOR_TOKEN }
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
    return HttpResponse.json(userFromToken(request));
  }),

  http.post(`${API_BASE}/auth/logout`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${API_BASE}/auth/health`, () => HttpResponse.text("ok")),

  // --- Contacts -------------------------------------------------------------
  http.get(`${API_BASE}/contacts`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const denied = denyContractor(request);
    if (denied) return denied;
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
    const denied = denyContractor(request);
    if (denied) return denied;
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
    const denied = denyContractor(request);
    if (denied) return denied;
    return HttpResponse.json(projectStore.list());
  }),

  http.get(`${API_BASE}/projects/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const denied = denyContractor(request);
    if (denied) return denied;
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

  // --- Project assignments (contractor / time-mgmt Phase 1) ------------------

  http.get(`${API_BASE}/projects/:projectId/assignments`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(
      assignmentStore.listByProject(params.projectId as string),
    );
  }),

  // POST is @IdempotentRoute on the BE: 201 new / 200 existing. Mirror that.
  http.post(`${API_BASE}/projects/:projectId/assignments`, async ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as {
      userId?: string;
      billRateOverride?: number;
      costRateOverride?: number;
      role?: string;
    };
    const { assignment, created } = assignmentStore.create(
      params.projectId as string,
      body,
    );
    return HttpResponse.json(assignment, { status: created ? 201 : 200 });
  }),

  http.put(`${API_BASE}/projects/:projectId/assignments/:id`, async ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as {
      billRateOverride?: number;
      costRateOverride?: number;
      role?: string;
    };
    const updated = assignmentStore.update(params.id as string, body);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),

  http.delete(`${API_BASE}/projects/:projectId/assignments/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const ok = assignmentStore.remove(params.id as string);
    return new HttpResponse(null, { status: ok ? 204 : 404 });
  }),

  // --- Team (contractor / time-mgmt Phase 1) ---------------------------------

  http.get(`${API_BASE}/team`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(teamStore.list());
  }),

  http.post(`${API_BASE}/team`, async ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as TeamMemberRequest;
    const created = teamStore.create(body);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.put(`${API_BASE}/team/:id`, async ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as TeamMemberRequest;
    const updated = teamStore.update(params.id as string, body);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),

  http.post(`${API_BASE}/team/:id/disable`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const updated = teamStore.disable(params.id as string);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
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
    const denied = denyContractor(request);
    if (denied) return denied;
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
    const denied = denyContractor(request);
    if (denied) return denied;
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
    const denied = denyContractor(request);
    if (denied) return denied;
    const running = timeEntryStore.getRunningTimer();
    if (!running) return new HttpResponse(null, { status: 204 });
    return HttpResponse.json(running);
  }),

  http.get(`${API_BASE}/time-entries/weekly`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const denied = denyContractor(request);
    if (denied) return denied;
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
    const denied = denyContractor(request);
    if (denied) return denied;
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
    const denied = denyContractor(request);
    if (denied) return denied;
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
    const denied = denyContractor(request);
    if (denied) return denied;
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
    const denied = denyContractor(request);
    if (denied) return denied;
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

  // --- Contract Templates (Phase F) -----------------------------------------

  http.get(`${API_BASE}/contract-templates`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(contractTemplateStore.list());
  }),

  http.get(`${API_BASE}/contract-templates/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const found = contractTemplateStore.get(params.id as string);
    if (!found) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(found);
  }),

  http.post(`${API_BASE}/contract-templates`, async ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as ContractTemplate;
    const created = contractTemplateStore.create(body);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.put(`${API_BASE}/contract-templates/:id`, async ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as ContractTemplate;
    const updated = contractTemplateStore.update(params.id as string, body);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),

  http.delete(`${API_BASE}/contract-templates/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const ok = contractTemplateStore.delete(params.id as string);
    return new HttpResponse(null, { status: ok ? 204 : 404 });
  }),

  // --- Contracts (Phase F) --------------------------------------------------
  // NOTE: more-specific paths (send, status, pdf, spawn) come before the wildcard /:id

  http.post(`${API_BASE}/contracts/:id/send`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const result = contractStore.send(params.id as string);
    if (!result) return new HttpResponse(null, { status: 409 });
    return HttpResponse.json(result);
  }),

  http.post(`${API_BASE}/contracts/:id/status`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const url = new URL(request.url);
    const target = url.searchParams.get("target") ?? "";
    const updated = contractStore.setStatus(params.id as string, target);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),

  http.get(`${API_BASE}/contracts/:id/pdf`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return new HttpResponse("PDF_STUB", {
      status: 200,
      headers: { "Content-Type": "application/pdf" },
    });
  }),

  // spawn-contract from a quote — requires templateId query param; 409 if quote not ACCEPTED
  http.post(`${API_BASE}/contracts/quotes/:quoteId/spawn-contract`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const url = new URL(request.url);
    const templateId = url.searchParams.get("templateId") ?? "";
    if (!templateId) return new HttpResponse(null, { status: 400 });
    const quote = quoteStore.get(params.quoteId as string);
    if (!quote) return new HttpResponse(null, { status: 404 });
    if (quote.status !== "ACCEPTED") return new HttpResponse(null, { status: 409 });
    const existing = contractStore.findByQuoteId(params.quoteId as string);
    if (existing) return HttpResponse.json(existing, { status: 200 });
    const template = contractTemplateStore.get(templateId);
    const created = contractStore.spawnFromQuote(quote, template ?? undefined);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.get(`${API_BASE}/contracts`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(contractStore.list());
  }),

  http.get(`${API_BASE}/contracts/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const found = contractStore.get(params.id as string);
    if (!found) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(found);
  }),

  http.post(`${API_BASE}/contracts`, async ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as Contract;
    const created = contractStore.create(body);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.put(`${API_BASE}/contracts/:id`, async ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as Contract;
    const updated = contractStore.update(params.id as string, body);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),

  http.delete(`${API_BASE}/contracts/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const ok = contractStore.delete(params.id as string);
    return new HttpResponse(null, { status: ok ? 204 : 404 });
  }),

  // --- Recurring Invoices (Phase E) -----------------------------------------
  // NOTE: more-specific paths (status, spawn-now) before the wildcard /:id

  http.post(`${API_BASE}/recurring-invoices/:id/status`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? "";
    const updated = recurringInvoiceStore.setStatus(params.id as string, status);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),

  http.post(`${API_BASE}/recurring-invoices/:id/spawn-now`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const updated = recurringInvoiceStore.spawnNow(params.id as string, invoiceStore);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),

  http.get(`${API_BASE}/recurring-invoices`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(recurringInvoiceStore.list());
  }),

  http.get(`${API_BASE}/recurring-invoices/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const found = recurringInvoiceStore.get(params.id as string);
    if (!found) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(found);
  }),

  http.post(`${API_BASE}/recurring-invoices`, async ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as RecurringInvoice;
    const created = recurringInvoiceStore.create(body);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.put(`${API_BASE}/recurring-invoices/:id`, async ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as RecurringInvoice;
    const updated = recurringInvoiceStore.update(params.id as string, body);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),

  http.delete(`${API_BASE}/recurring-invoices/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const ok = recurringInvoiceStore.delete(params.id as string);
    return new HttpResponse(null, { status: ok ? 204 : 404 });
  }),

  // --- Stripe Checkout (Phase E) — additive endpoint on invoices -------------
  http.post(`${API_BASE}/invoices/:id/stripe-checkout`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const invoiceId = params.id as string;
    const found = invoiceStore.get(invoiceId);
    if (!found) return new HttpResponse(null, { status: 404 });
    // Return a mock Stripe checkout URL
    return HttpResponse.json({
      url: `https://checkout.stripe.com/c/pay/mock_session_${invoiceId}`,
      mode: "CHECKOUT_SESSION",
      invoiceId,
    });
  }),

  // --- Timesheets — admin approvals (Phase J3) -------------------------------
  // The owner reviews timesheets teammates submitted for approval. Lists by
  // status (default SUBMITTED), approves, or sends back with a required reason
  // (?reason=). NOTE: specific action paths before the wildcard /:id.

  http.post(`${API_BASE}/timesheets/:id/approve`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const result = timesheetStore.approve(params.id as string);
    if ("code" in result) {
      const status = result.code === 3611 ? 404 : 409;
      return HttpResponse.json(
        { message: result.error, errorCode: result.code },
        { status },
      );
    }
    return HttpResponse.json(result);
  }),

  http.post(`${API_BASE}/timesheets/:id/reject`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const url = new URL(request.url);
    const reason = url.searchParams.get("reason") ?? "";
    const result = timesheetStore.reject(params.id as string, reason);
    if ("code" in result) {
      const status =
        result.code === 3615 ? 400 : result.code === 3611 ? 404 : 409;
      return HttpResponse.json(
        { message: result.error, errorCode: result.code },
        { status },
      );
    }
    return HttpResponse.json(result);
  }),

  http.get(`${API_BASE}/timesheets`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const url = new URL(request.url);
    const status = (url.searchParams.get("status") ?? "SUBMITTED") as TimesheetStatus;
    return HttpResponse.json(timesheetStore.listByStatus(status));
  }),

  http.get(`${API_BASE}/timesheets/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const found = timesheetStore.get(params.id as string);
    if (!found) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(found);
  }),

  // --- Payout & margin report (Phase J4, ADMIN) ------------------------------
  // ?userId&year — the 1099 year-to-date view ("what you owe" + margin).
  http.get(`${API_BASE}/reports/payout/ytd`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const denied = denyContractor(request);
    if (denied) return denied;
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId") ?? "";
    const year = Number(url.searchParams.get("year")) || new Date().getFullYear();
    return HttpResponse.json(payoutStore.ytd(userId, year));
  }),

  // ?userId&from&to (ISO instants) — the per-period breakdown over a window.
  http.get(`${API_BASE}/reports/payout`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const denied = denyContractor(request);
    if (denied) return denied;
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId") ?? "";
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? "";
    return HttpResponse.json(payoutStore.report(userId, from, to));
  }),

  // --- Contractor self-service surface (Phase J2) ----------------------------
  // Implicitly scoped to the caller (resolved from the bearer token). Any
  // authenticated user may call these; the data is scoped to their assignments
  // / own rows, so a non-contractor just sees an empty/own slice. The matching
  // staff readers above deny a CONTRACTOR token (4135) — this is the surface a
  // contractor uses instead.
  //
  // NOTE: more-specific paths must precede the wildcard /:id ones so MSW does
  // not match the literal segment as an id.

  // Time — specific paths first.
  http.get(`${API_BASE}/me/contractor/time/weekly`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const me = userFromToken(request);
    const url = new URL(request.url);
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? "";
    return HttpResponse.json(contractorStore.listWeekly(me.id!, from, to));
  }),

  http.post(`${API_BASE}/me/contractor/time/timer/start`, async ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const me = userFromToken(request);
    const body = (await request.json()) as TimeEntry;
    const result = timeEntryStore.startTimer({ ...body, userId: me.id });
    if ("code" in result) {
      return HttpResponse.json(
        { message: result.error, errorCode: result.code },
        { status: 409 },
      );
    }
    return HttpResponse.json(result, { status: 201 });
  }),

  http.post(`${API_BASE}/me/contractor/time/timer/stop`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const me = userFromToken(request);
    const url = new URL(request.url);
    const endedAt = url.searchParams.get("endedAt") ?? undefined;
    const zoneId = url.searchParams.get("zoneId") ?? undefined;
    const result = timeEntryStore.stopTimer(me.id!, endedAt, zoneId);
    if ("code" in result) {
      return HttpResponse.json(
        { message: result.error, errorCode: result.code },
        { status: 409 },
      );
    }
    return HttpResponse.json(result);
  }),

  http.get(`${API_BASE}/me/contractor/time`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const me = userFromToken(request);
    return HttpResponse.json(contractorStore.listTime(me.id!));
  }),

  http.post(`${API_BASE}/me/contractor/time`, async ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const me = userFromToken(request);
    const body = (await request.json()) as TimeEntry;
    const created = timeEntryStore.create({ ...body, userId: me.id });
    return HttpResponse.json(created, { status: 201 });
  }),

  http.put(`${API_BASE}/me/contractor/time/:id`, async ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const me = userFromToken(request);
    const existing = timeEntryStore.get(params.id as string);
    // A contractor may only edit their own entries.
    if (!existing || existing.userId !== me.id)
      return new HttpResponse(null, { status: 404 });
    const body = (await request.json()) as TimeEntry;
    const updated = timeEntryStore.update(params.id as string, {
      ...body,
      userId: me.id,
    });
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),

  // Expenses.
  http.get(`${API_BASE}/me/contractor/expenses`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const me = userFromToken(request);
    return HttpResponse.json(contractorStore.listExpenses(me.id!));
  }),

  http.post(`${API_BASE}/me/contractor/expenses`, async ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const me = userFromToken(request);
    const body = (await request.json()) as Expense;
    const created = expenseStore.create({ ...body, userId: me.id });
    return HttpResponse.json(created, { status: 201 });
  }),

  // Timesheets — own periods (submit for approval / reopen a sent-back one).
  // Specific action paths before the wildcard /:id.
  http.post(
    `${API_BASE}/me/contractor/timesheets/:id/submit`,
    ({ request, params }) => {
      if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
      const me = userFromToken(request);
      const existing = timesheetStore.get(params.id as string);
      // A contractor may only act on their own timesheets.
      if (!existing || existing.userId !== me.id)
        return new HttpResponse(null, { status: 404 });
      const result = timesheetStore.submit(params.id as string);
      if ("code" in result) {
        return HttpResponse.json(
          { message: result.error, errorCode: result.code },
          { status: 409 },
        );
      }
      return HttpResponse.json(toContractorTimesheetView(result));
    },
  ),

  http.post(
    `${API_BASE}/me/contractor/timesheets/:id/reopen`,
    ({ request, params }) => {
      if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
      const me = userFromToken(request);
      const existing = timesheetStore.get(params.id as string);
      if (!existing || existing.userId !== me.id)
        return new HttpResponse(null, { status: 404 });
      const result = timesheetStore.reopen(params.id as string);
      if ("code" in result) {
        return HttpResponse.json(
          { message: result.error, errorCode: result.code },
          { status: 409 },
        );
      }
      return HttpResponse.json(toContractorTimesheetView(result));
    },
  ),

  http.get(`${API_BASE}/me/contractor/timesheets/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const me = userFromToken(request);
    const existing = timesheetStore.get(params.id as string);
    if (!existing || existing.userId !== me.id)
      return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(toContractorTimesheetView(existing));
  }),

  http.get(`${API_BASE}/me/contractor/timesheets`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const me = userFromToken(request);
    return HttpResponse.json(timesheetStore.listForUser(me.id!).map(toContractorTimesheetView));
  }),

  // Projects — specific sub-resources before the wildcard /:id.
  http.get(`${API_BASE}/me/contractor/projects/:id/tasks`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const me = userFromToken(request);
    const tasks = contractorStore.listTasks(me.id!, params.id as string);
    // Not assigned → 404 (mirrors the BE's not-found-or-forbidden behavior).
    if (!tasks) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(tasks);
  }),

  http.get(`${API_BASE}/me/contractor/projects/:id/client`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const me = userFromToken(request);
    const client = contractorStore.getClient(me.id!, params.id as string);
    if (!client) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(client);
  }),

  http.get(`${API_BASE}/me/contractor/projects/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const me = userFromToken(request);
    const project = contractorStore.getProject(me.id!, params.id as string);
    if (!project) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(project);
  }),

  http.get(`${API_BASE}/me/contractor/projects`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const me = userFromToken(request);
    return HttpResponse.json(contractorStore.listProjects(me.id!));
  }),

  // --- Review replies (Google Business Profile) ------------------------------
  // ADMIN-guarded on the BE. List the drafts, post the (edited) reply to
  // Google, or skip it. 4032 = not found, 4033 = no longer DRAFTED.

  http.get(`${API_BASE}/gbp/review-replies`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(gbpReviewReplyStore.listDrafted());
  }),

  http.post(`${API_BASE}/gbp/review-replies/:id/post`, async ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json().catch(() => ({}))) as { reply?: string };
    const result = gbpReviewReplyStore.post(params.id as string, body.reply);
    if ("code" in result) {
      const status = result.code === 4033 ? 409 : 404;
      return HttpResponse.json(
        { message: "Reply cannot be posted", errorCode: result.code },
        { status },
      );
    }
    return HttpResponse.json(result);
  }),

  http.post(`${API_BASE}/gbp/review-replies/:id/skip`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const result = gbpReviewReplyStore.skip(params.id as string);
    if ("code" in result) {
      const status = result.code === 4033 ? 409 : 404;
      return HttpResponse.json(
        { message: "Reply cannot be skipped", errorCode: result.code },
        { status },
      );
    }
    return HttpResponse.json(result);
  }),

  // --- Home Services: Missed-Call Inbox (HS-4) -------------------------------
  // The triage queue of voicemail-sourced DRAFT work orders. The Schedule /
  // Dismiss actions PUT /work-orders/:id with a status transition, which drops
  // the card off this DRAFT-only list (mirrors the BE's status-filtered query).

  http.get(`${API_BASE}/home-services/missed-call-inbox`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(missedCallInboxStore.list());
  }),

  // WorkOrder update — the inbox's Schedule (→ SCHEDULED + start + tech) and
  // Dismiss (→ CANCELLED) both land here. Field-service isn't otherwise
  // surfaced in the admin, so this is the only /work-orders handler we mock.
  http.put(`${API_BASE}/work-orders/:id`, async ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as {
      status?: string;
      scheduledStart?: string;
      technicianUserId?: string;
    };
    const updated = missedCallInboxStore.patch(params.id as string, body);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),

  // --- ChairFill — salon flagship (CF-5) -------------------------------------
  // All three surfaces are STAFF + chairfill-module-gated on the BE. The routes
  // are @ConditionalOnProperty-gated, so they're hand-written here (no generated
  // alias — the HS-4 precedent). A contractor never reaches them (the nav +
  // RequireNotContractor guard hide them), so these don't deny-contractor.

  // No-show risk view: upcoming bookings with their risk, highest-risk first.
  // The BE takes ?from&to; the mock returns the seeded window as-is.
  http.get(`${API_BASE}/chairfill/risk/bookings`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(chairFillRiskStore.listByRisk());
  }),

  // Waitlist board: the one-shot envelope (OPEN entries + recent offers).
  http.get(`${API_BASE}/chairfill/waitlist/board`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const url = new URL(request.url);
    const offerLimit = Number(url.searchParams.get("offerLimit")) || 50;
    return HttpResponse.json(chairFillWaitlistStore.board(offerLimit));
  }),

  http.get(`${API_BASE}/chairfill/waitlist/entries`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(chairFillWaitlistStore.listEntries());
  }),

  http.get(`${API_BASE}/chairfill/waitlist/offers`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit")) || 50;
    return HttpResponse.json(chairFillWaitlistStore.listOffers(limit));
  }),

  // Review paste-in: draft an on-brand salon reply and park it DRAFTED in the
  // SAME review-replies queue the inbox lists. 4240 if the comment is blank.
  http.post(`${API_BASE}/chairfill/reviews/draft`, async ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as PasteInReviewRequest;
    if (!body || !body.comment || !body.comment.trim()) {
      return HttpResponse.json(
        {
          message: "A review text (comment) is required to draft a reply",
          errorCode: 4240,
        },
        { status: 400 },
      );
    }
    const created = gbpReviewReplyStore.draftPasteIn({
      comment: body.comment.trim(),
      reviewerName: body.reviewerName,
      rating: body.rating,
      externalReviewId: body.externalReviewId,
      createTime: body.createTime,
    });
    return HttpResponse.json(created, { status: 200 });
  }),

  // --- Real Estate Concierge — flagship (RE-5b) ------------------------------
  // The four staff surfaces. All routes are STAFF + realestate-module-gated on
  // the BE and @ConditionalOnProperty-gated, so they're hand-written here (no
  // generated alias — the ChairFill CF-5b precedent). Contractors never reach
  // them (the nav + RequireNotContractor guard hide them), so no deny-contractor.
  // NOTE: the marketing /drafts collection route is registered BEFORE the
  // /listings/:id parametric route so it isn't shadowed.

  // Listings — list / create / get / update.
  http.get(`${API_BASE}/realestate/listings`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(realEstateStore.listListings());
  }),
  http.post(`${API_BASE}/realestate/listings`, async ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as Listing;
    return HttpResponse.json(realEstateStore.createListing(body), {
      status: 200,
    });
  }),

  // Tenant-wide marketing draft queue + approve / skip. Registered before the
  // /realestate/listings/:id GET so "/realestate/marketing/drafts" can't be
  // mistaken for a listing id.
  http.get(`${API_BASE}/realestate/marketing/drafts`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(realEstateStore.listDrafted());
  }),
  http.post(
    `${API_BASE}/realestate/marketing/drafts/:id/approve`,
    ({ request, params }) => {
      if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
      const updated = realEstateStore.approveDraft(String(params.id));
      if (!updated)
        return HttpResponse.json(
          { message: "Draft not found or not in review", errorCode: 4253 },
          { status: 404 },
        );
      return HttpResponse.json(updated);
    },
  ),
  http.post(
    `${API_BASE}/realestate/marketing/drafts/:id/skip`,
    ({ request, params }) => {
      if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
      const updated = realEstateStore.skipDraft(String(params.id));
      if (!updated)
        return HttpResponse.json(
          { message: "Draft not found or not in review", errorCode: 4253 },
          { status: 404 },
        );
      return HttpResponse.json(updated);
    },
  ),

  // Per-listing disclosures (the grounding corpus) — list / create / update.
  http.get(
    `${API_BASE}/realestate/listings/:listingId/disclosures`,
    ({ request, params }) => {
      if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
      return HttpResponse.json(
        realEstateStore.listDisclosures(String(params.listingId)),
      );
    },
  ),
  http.post(
    `${API_BASE}/realestate/listings/:listingId/disclosures`,
    async ({ request, params }) => {
      if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
      const body = (await request.json()) as DisclosureRequest;
      if (!body || !body.text || !body.text.trim()) {
        return HttpResponse.json(
          { message: "Disclosure text is required", errorCode: 4253 },
          { status: 400 },
        );
      }
      const created = realEstateStore.createDisclosure(
        String(params.listingId),
        { ...body, text: body.text.trim() },
      );
      return HttpResponse.json(created, { status: 200 });
    },
  ),
  http.put(
    `${API_BASE}/realestate/listings/:listingId/disclosures/:id`,
    async ({ request, params }) => {
      if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
      const body = (await request.json()) as DisclosureRequest;
      const updated = realEstateStore.updateDisclosure(
        String(params.listingId),
        String(params.id),
        body,
      );
      if (!updated) return new HttpResponse(null, { status: 404 });
      return HttpResponse.json(updated);
    },
  ),

  // Per-listing marketing: photos (list / upload), generate, drafts history.
  http.get(
    `${API_BASE}/realestate/listings/:listingId/marketing/photos`,
    ({ request, params }) => {
      if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
      return HttpResponse.json(
        realEstateStore.listPhotos(String(params.listingId)),
      );
    },
  ),
  http.post(
    `${API_BASE}/realestate/listings/:listingId/marketing/photos`,
    async ({ request, params }) => {
      if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
      const form = await request.formData();
      const image = form.get("image");
      if (!(image instanceof File)) {
        return HttpResponse.json(
          { message: "Listing-photo upload is missing its 'image' part", errorCode: 4253 },
          { status: 400 },
        );
      }
      const created = realEstateStore.addPhoto(
        String(params.listingId),
        image.name || "photo.jpg",
        image.type || undefined,
        image.size || undefined,
      );
      return HttpResponse.json(created, { status: 200 });
    },
  ),
  http.post(
    `${API_BASE}/realestate/listings/:listingId/marketing/generate`,
    ({ request, params }) => {
      if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
      return HttpResponse.json(
        realEstateStore.generate(String(params.listingId)),
      );
    },
  ),
  http.get(
    `${API_BASE}/realestate/listings/:listingId/marketing/drafts`,
    ({ request, params }) => {
      if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
      return HttpResponse.json(
        realEstateStore.listListingDrafts(String(params.listingId)),
      );
    },
  ),

  // A single listing — get / update. Registered AFTER the more specific
  // /listings/:listingId/... routes above so they take precedence.
  http.get(`${API_BASE}/realestate/listings/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const listing = realEstateStore.getListing(String(params.id));
    if (!listing)
      return HttpResponse.json(
        { message: "Listing not found", errorCode: 4253 },
        { status: 404 },
      );
    return HttpResponse.json(listing);
  }),
  http.put(`${API_BASE}/realestate/listings/:id`, async ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as Listing;
    const updated = realEstateStore.updateListing(String(params.id), body);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),

  // Concierge conversations — list (optional ?listingId) + detail.
  http.get(`${API_BASE}/realestate/conversations`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const url = new URL(request.url);
    const listingId = url.searchParams.get("listingId") ?? undefined;
    return HttpResponse.json(realEstateStore.listConversations(listingId));
  }),
  http.get(
    `${API_BASE}/realestate/conversations/:id`,
    ({ request, params }) => {
      if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
      const detail = realEstateStore.getConversation(String(params.id));
      if (!detail)
        return HttpResponse.json(
          { message: "Conversation not found", errorCode: 4270 },
          { status: 404 },
        );
      return HttpResponse.json(detail);
    },
  ),

  // --- Real Estate "Database Goldmine" — dormant-lead nurture (T1) ------------
  // The dashboard reads the campaign list (shared nurture CRUD controller) + the
  // per-segment funnel, and triggers segment-and-enroll. The RE-nurture routes
  // are ADMIN + realestate-AND-nurture-module-gated and @ConditionalOnProperty-
  // gated, so they're hand-written here (no generated alias — the RE-5b / AR /
  // proposals precedent). A contractor never reaches them (the nav +
  // RequireNotContractor guard hide them), so these don't deny-contractor.
  // Shared nurture error codes: 4301 (not found), 4302 (inactive), 4303 (no
  // segments). NOTE: the analytics + segment-and-enroll routes are registered
  // before nothing parametric collides here (distinct prefixes).

  // Campaign list (the shared E1 CRUD controller) — used by both the RE T1 and
  // health T2 dashboards. Returns the union of all vertical stores; per-vertical
  // campaign filtering is deferred to GATE 2 (NurtureCampaign has no vertical
  // tag yet). In production, one tenant's /nurture/campaigns returns all that
  // tenant's nurture campaigns regardless of the vertical that created them.
  http.get(`${API_BASE}/nurture/campaigns`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json([
      ...realEstateNurtureStore.listCampaigns(),
      ...frontDeskNurtureStore.listCampaigns(),
    ]);
  }),

  // Per-segment funnel ROI. 4301 → not found (404).
  http.get(
    `${API_BASE}/realestate/nurture/campaigns/:id/analytics`,
    ({ request, params }) => {
      if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
      const result = realEstateNurtureStore.getAnalytics(String(params.id));
      if ("code" in result) {
        return HttpResponse.json(
          { message: result.message, errorCode: result.code },
          { status: 404 },
        );
      }
      return HttpResponse.json(result);
    },
  ),

  // Trigger segment-and-enroll. 4302 → inactive (409), 4301 → not found (404).
  http.post(
    `${API_BASE}/realestate/nurture/campaigns/:id/segment-and-enroll`,
    ({ request, params }) => {
      if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
      const result = realEstateNurtureStore.segmentAndEnroll(String(params.id));
      if ("code" in result) {
        const status = result.code === 4302 ? 409 : 404;
        return HttpResponse.json(
          { message: result.message, errorCode: result.code },
          { status },
        );
      }
      return HttpResponse.json(result, { status: 200 });
    },
  ),

  // --- Health "RevenueRevive" — dormant-patient reactivation funnel (T2) -----
  // The campaign list is served by the shared /nurture/campaigns handler above
  // (union of RE + FD stores). The FD-specific routes below are the analytics +
  // segment-and-enroll endpoints only. Both are ADMIN + frontdesk-AND-nurture-
  // module-gated on the BE. PHI-free by construction.

  // Per-segment funnel ROI. 4301 → not found (404).
  http.get(
    `${API_BASE}/frontdesk/nurture/campaigns/:id/analytics`,
    ({ request, params }) => {
      if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
      const result = frontDeskNurtureStore.getAnalytics(String(params.id));
      if ("code" in result) {
        return HttpResponse.json(
          { message: result.message, errorCode: result.code },
          { status: 404 },
        );
      }
      return HttpResponse.json(result);
    },
  ),

  // Trigger segment-and-enroll. 4302 → inactive (409), 4301 → not found (404).
  http.post(
    `${API_BASE}/frontdesk/nurture/campaigns/:id/segment-and-enroll`,
    ({ request, params }) => {
      if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
      const result = frontDeskNurtureStore.segmentAndEnroll(String(params.id));
      if ("code" in result) {
        const status = result.code === 4302 ? 409 : 404;
        return HttpResponse.json(
          { message: result.message, errorCode: result.code },
          { status },
        );
      }
      return HttpResponse.json(result, { status: 200 });
    },
  ),

  // --- FrontDesk IQ — Health Practices flagship (FD-5b) ----------------------
  // The five staff surfaces. All routes are STAFF + frontdesk-module-gated on
  // the BE and @ConditionalOnProperty-gated, so they're hand-written here (no
  // generated alias — the Real Estate RE-5b / ChairFill CF-5b precedent).
  // Contractors never reach them (the nav + RequireNotContractor guard hide
  // them), so no deny-contractor. The headline is PHI-free by construction —
  // no clinical field on any payload, and the callback inbox has NO transcript.

  // Risk-sorted day view: upcoming appointments with their risk, highest-risk
  // first. The BE takes ?from&to; the mock returns the seeded set as-is.
  http.get(`${API_BASE}/frontdesk/risk/appointments`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(frontDeskAppointmentStore.listByRisk());
  }),
  // Manual no-show retrain → 202 with the scoring job to poll.
  http.post(`${API_BASE}/frontdesk/risk/retrain`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(frontDeskAppointmentStore.retrain(), {
      status: 202,
    });
  }),

  // Recall board: lapsed patients, most overdue first.
  http.get(`${API_BASE}/frontdesk/recall`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(frontDeskRecallStore.list());
  }),

  // Callback inbox: after-hours voicemail callbacks, newest first. Fence F2 —
  // the rows are logistics-only and carry NO transcript field.
  http.get(`${API_BASE}/frontdesk/callbacks`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(frontDeskCallbackStore.list());
  }),

  // Review inbox (the signature demo). Paste-in → a HIPAA-safe DraftedReply
  // {reply, hipaaFlags}; 4290 if the comment is blank. List / approve / skip.
  http.post(`${API_BASE}/frontdesk/reviews/draft`, async ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as PasteInReviewRequest;
    if (!body || !body.comment || !body.comment.trim()) {
      return HttpResponse.json(
        {
          message: "A review text (comment) is required to draft a reply",
          errorCode: 4290,
        },
        { status: 400 },
      );
    }
    const created = frontDeskReviewStore.draftPasteIn({
      comment: body.comment.trim(),
      reviewerName: body.reviewerName,
      rating: body.rating,
      externalReviewId: body.externalReviewId,
      createTime: body.createTime,
    });
    return HttpResponse.json(created, { status: 200 });
  }),
  http.get(`${API_BASE}/frontdesk/reviews`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(frontDeskReviewStore.listDrafted());
  }),
  http.post(
    `${API_BASE}/frontdesk/reviews/:id/approve`,
    ({ request, params }) => {
      if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
      const result = frontDeskReviewStore.approve(String(params.id));
      if ("code" in result)
        return HttpResponse.json(
          { message: "Draft not found or not in review", errorCode: result.code },
          { status: result.code === 4292 ? 404 : 409 },
        );
      return HttpResponse.json(result);
    },
  ),
  http.post(`${API_BASE}/frontdesk/reviews/:id/skip`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const result = frontDeskReviewStore.skip(String(params.id));
    if ("code" in result)
      return HttpResponse.json(
        { message: "Draft not found or not in review", errorCode: result.code },
        { status: result.code === 4292 ? 404 : 409 },
      );
    return HttpResponse.json(result);
  }),

  // Appointment console: list / create / get / update. Registered last so the
  // more-specific /frontdesk/risk/appointments route above isn't shadowed.
  http.get(`${API_BASE}/frontdesk/appointments`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(frontDeskAppointmentStore.list());
  }),
  http.post(`${API_BASE}/frontdesk/appointments`, async ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as Appointment;
    return HttpResponse.json(frontDeskAppointmentStore.create(body), {
      status: 200,
    });
  }),
  http.get(`${API_BASE}/frontdesk/appointments/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const appt = frontDeskAppointmentStore.get(String(params.id));
    if (!appt)
      return HttpResponse.json(
        { message: "Appointment not found", errorCode: 4276 },
        { status: 404 },
      );
    return HttpResponse.json(appt);
  }),
  http.put(`${API_BASE}/frontdesk/appointments/:id`, async ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as Appointment;
    const updated = frontDeskAppointmentStore.update(String(params.id), body);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),

  // --- AR — Accounts Receivable / Collections module -------------------------
  // All three surfaces are STAFF + ar-module-gated on the BE. The routes are
  // @ConditionalOnProperty-gated, so they're hand-written here (no generated
  // alias — the FrontDesk FD-5b / ChairFill CF-5b precedent). A contractor
  // never reaches them (the nav + RequireNotContractor guard hide them), so
  // these don't deny-contractor.

  // Aging report: outstanding balance bucketed by days-past-due.
  http.get(`${API_BASE}/ar/aging`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(arStore.getAgingReport());
  }),

  // Promises to pay for a given invoice, newest first.
  http.get(`${API_BASE}/ar/promises`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const url = new URL(request.url);
    const invoiceId = url.searchParams.get("invoiceId") ?? "";
    return HttpResponse.json(arStore.listPromises(invoiceId));
  }),

  // Record a new promise to pay. 4601 → invoice not found (404), 4602 → bad
  // input (400) — mirrors the BE error-code contract.
  http.post(`${API_BASE}/ar/promises`, async ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as {
      invoiceId: string;
      promisedDate: string;
      promisedAmount?: number;
      note?: string;
    };
    const result = arStore.recordPromise(body);
    if ("code" in result) {
      const status = result.code === 4601 ? 404 : 400;
      return HttpResponse.json(
        { message: result.message, errorCode: result.code },
        { status },
      );
    }
    return HttpResponse.json(result, { status: 201 });
  }),

  // --- Proposals / SOW Studio -----------------------------------------------
  // All three surfaces are STAFF + proposals-module-gated on the BE. The
  // routes are @ConditionalOnProperty-gated, so they're hand-written here (no
  // generated alias — the AR / FrontDesk FD-5b / ChairFill CF-5b precedent).
  // A contractor never reaches them (the nav + RequireNotContractor guard hide
  // them), so these don't deny-contractor.

  // POST /proposals/draft — idempotent draft from discovery notes.
  http.post(`${API_BASE}/proposals/draft`, async ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = (await request.json()) as { notes?: string };
    if (!body.notes || !body.notes.trim()) {
      return HttpResponse.json(
        { message: "Notes are required", errorCode: 4621 },
        { status: 400 },
      );
    }
    if (body.notes.length > 8000) {
      return HttpResponse.json(
        { message: "Notes exceed maximum length", errorCode: 4621 },
        { status: 400 },
      );
    }
    const result = proposalStore.draft(body.notes);
    return HttpResponse.json(result, { status: 201 });
  }),

  // GET /proposals/:id — fetch a drafted SOW by its Quote ID.
  http.get(`${API_BASE}/proposals/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const found = proposalStore.get(params.id as string);
    if (!found) {
      return HttpResponse.json(
        { message: "Quote not found", errorCode: 2200 },
        { status: 404 },
      );
    }
    return HttpResponse.json(found);
  }),

  // GET /proposals/:id/pdf — return a minimal fake PDF blob.
  http.get(`${API_BASE}/proposals/:id/pdf`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const found = proposalStore.get(params.id as string);
    if (!found) {
      return HttpResponse.json(
        { message: "Quote not found", errorCode: 2200 },
        { status: 404 },
      );
    }
    // Return a minimal valid PDF-header blob (enough to trigger a download).
    const fakePdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]); // "%PDF-"
    return new HttpResponse(fakePdf, {
      status: 200,
      headers: { "Content-Type": "application/pdf" },
    });
  }),

  // --- Real Estate "Midnight Responder" — T3 --------------------------------
  // Response-latency stats + tier-routing config. Both controllers are
  // @ConditionalOnProperty(realestate)-gated AND responder-module-gated, so
  // they're hand-written here (no generated alias — the T1 / AR / proposals
  // precedent). A contractor never reaches them (RequireNotContractor guard).

  // TEST-ONLY control endpoint — clears/resets the responder config store.
  // Only active when VITE_USE_MOCKS=true (MSW is only loaded in that mode).
  // Used by the smoke test to exercise the 4380 no-config path without relying
  // on fragile Playwright network interception (which can't override MSW SW).
  http.post(`${API_BASE}/realestate/responder/config/test-clear`, () => {
    midnightResponderStore.clearConfig();
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(`${API_BASE}/realestate/responder/config/test-reset`, () => {
    midnightResponderStore.resetConfig();
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /realestate/responder/latency-stats — the "<30 s, 24/7" demo headline.
  http.get(`${API_BASE}/realestate/responder/latency-stats`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(midnightResponderStore.getLatencyStats());
  }),

  // GET /realestate/responder/config — 4380 (404) if not configured yet.
  http.get(`${API_BASE}/realestate/responder/config`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const result = midnightResponderStore.getConfig();
    if ("code" in result) {
      return HttpResponse.json(
        { message: result.message, errorCode: result.code },
        { status: 404 },
      );
    }
    return HttpResponse.json(result);
  }),

  // PUT /realestate/responder/config — upsert (partial: null fields preserved).
  http.put(
    `${API_BASE}/realestate/responder/config`,
    async ({ request }) => {
      if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
      const body = (await request.json()) as {
        warmCampaignId: string | null;
        coldCampaignId: string | null;
        delegateHandoffToResponder: boolean | null;
        afterHoursStartHour: number | null;
        afterHoursEndHour: number | null;
      };
      const saved = midnightResponderStore.saveConfig(body);
      return HttpResponse.json(saved);
    },
  ),

  // --- Health "Switchboard AI" — T4 -----------------------------------------
  // Logistics config card + call-deflection stats. Both controllers are
  // @ConditionalOnProperty(frontdesk)-gated AND responder-module-gated, so
  // they're hand-written here (no generated alias — the T3 precedent).
  // A contractor never reaches them (RequireNotContractor guard). PHI-free.

  // TEST-ONLY control endpoint — clears/resets the switchboard config store.
  // Only active when VITE_USE_MOCKS=true (MSW is only loaded in that mode).
  // Used by the smoke test to exercise the 4391 no-config path without
  // relying on fragile Playwright network interception.
  http.post(`${API_BASE}/frontdesk/switchboard/config/test-clear`, () => {
    switchboardStore.clearConfig();
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(`${API_BASE}/frontdesk/switchboard/config/test-reset`, () => {
    switchboardStore.resetConfig();
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /frontdesk/switchboard/config — 4391 (404) if not configured yet.
  http.get(`${API_BASE}/frontdesk/switchboard/config`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const result = switchboardStore.getConfig();
    if ("code" in result) {
      return HttpResponse.json(
        { message: result.message, errorCode: result.code },
        { status: 404 },
      );
    }
    return HttpResponse.json(result);
  }),

  // PUT /frontdesk/switchboard/config — upsert.
  http.put(
    `${API_BASE}/frontdesk/switchboard/config`,
    async ({ request }) => {
      if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
      const body = (await request.json()) as Parameters<typeof switchboardStore.saveConfig>[0];
      const saved = switchboardStore.saveConfig(body);
      return HttpResponse.json(saved);
    },
  ),

  // GET /frontdesk/switchboard/deflection-stats — PHI-free counters.
  http.get(`${API_BASE}/frontdesk/switchboard/deflection-stats`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(switchboardStore.getDeflectionStats());
  }),

  // --- Home Services T5 "Instant Callback" — T5 --------------------------------
  // Revenue-ranked callback queue + dispatch + recovery stats + config.
  // The CallbackController is @ConditionalOnProperty(home-services)-gated AND
  // requires the responder module, so all routes are hand-written here (no
  // generated alias — the T4 SwitchboardController / T3 precedent).
  // Queue / dispatch / recovery-stats are staff-accessible; config is ADMIN-only.

  // TEST-ONLY control endpoints — clear config / reset cards.
  http.post(`${API_BASE}/home-services/callbacks/config/test-clear`, () => {
    callbackStore.clearConfig();
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(`${API_BASE}/home-services/callbacks/test-reset-cards`, () => {
    callbackStore.resetCards();
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /home-services/callbacks — revenue-ranked open queue.
  http.get(`${API_BASE}/home-services/callbacks`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(callbackStore.listQueue());
  }),

  // POST /home-services/callbacks/{id}/dispatch — @IdempotentRoute.
  http.post(
    `${API_BASE}/home-services/callbacks/:id/dispatch`,
    ({ request, params }) => {
      if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
      const id = params.id as string;
      const result = callbackStore.dispatch(id);
      if ("code" in result) {
        const httpStatus = result.code === 4400 ? 404 : 409;
        return HttpResponse.json(
          { message: result.message, errorCode: result.code },
          { status: httpStatus },
        );
      }
      return HttpResponse.json(result);
    },
  ),

  // GET /home-services/callbacks/recovery-stats — funnel counters.
  http.get(`${API_BASE}/home-services/callbacks/recovery-stats`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(callbackStore.getRecoveryStats());
  }),

  // GET /home-services/callbacks/config — 4401/404 if not yet configured.
  http.get(`${API_BASE}/home-services/callbacks/config`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const result = callbackStore.getConfig();
    if ("code" in result) {
      return HttpResponse.json(
        { message: result.message, errorCode: result.code },
        { status: 404 },
      );
    }
    return HttpResponse.json(result);
  }),

  // PUT /home-services/callbacks/config — upsert.
  http.put(
    `${API_BASE}/home-services/callbacks/config`,
    async ({ request }) => {
      if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
      const body = (await request.json()) as Parameters<typeof callbackStore.saveConfig>[0];
      const saved = callbackStore.saveConfig(body);
      return HttpResponse.json(saved);
    },
  ),

  // ---------------------------------------------------------------------------
  // Salon "ReviewBoost" (T6) — per-stylist review insights + config status
  // ---------------------------------------------------------------------------
  //
  // GET /chairfill/reviewboost/insights — the salon review-insights board.
  // GET /chairfill/reviewboost/config   — ReviewBoost wiring read-back (read-only).
  //
  // Both are ADMIN + chairfill-AND-salon-spa-module-gated on the BE.
  // There is NO write/PUT endpoint — T6 is a pure read surface.

  // GET /chairfill/reviewboost/insights
  http.get(`${API_BASE}/chairfill/reviewboost/insights`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(reviewBoostStore.getInsights());
  }),

  // GET /chairfill/reviewboost/config
  http.get(`${API_BASE}/chairfill/reviewboost/config`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(reviewBoostStore.getConfig());
  }),

  // ---------------------------------------------------------------------------
  // Health "RescheduleFlow" (T7) — waitlist board + fill-rate stats
  // ---------------------------------------------------------------------------
  //
  // POST /frontdesk/reschedule/waitlist — join; @IdempotentRoute; 4421 if no
  //   contactId. Reads Idempotency-Key header for dedup (the T5 dispatch /
  //   segment-and-enroll precedent). Returns 201 WaitlistEntry.
  // GET  /frontdesk/reschedule/waitlist — the tenant's health waitlist entries.
  // GET  /frontdesk/reschedule/fill-stats — PHI-free funnel counters.
  //
  // All three are ADMIN + frontdesk-AND-waitlist-module-gated on the BE.
  // A contractor never reaches them (RequireNotContractor guard). PHI-free.

  // TEST-ONLY control endpoint — resets the reschedule store (seed entries +
  // fill stats) so smoke tests get a clean slate without a page reload.
  http.post(
    `${API_BASE}/frontdesk/reschedule/test-reset`,
    () => {
      rescheduleStore.reset();
      return new HttpResponse(null, { status: 204 });
    },
  ),

  // POST /frontdesk/reschedule/waitlist — idempotent join.
  http.post(
    `${API_BASE}/frontdesk/reschedule/waitlist`,
    async ({ request }) => {
      if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
      const idempotencyKey =
        request.headers.get("Idempotency-Key") ?? crypto.randomUUID();
      const body = (await request.json()) as Partial<WaitlistJoinRequest>;
      const result = rescheduleStore.joinWaitlist(body, idempotencyKey);
      if ("code" in result) {
        return HttpResponse.json(
          { message: result.message, errorCode: result.code },
          { status: 400 },
        );
      }
      return HttpResponse.json(result, { status: 201 });
    },
  ),

  // GET /frontdesk/reschedule/waitlist — newest first, health-appt only.
  http.get(
    `${API_BASE}/frontdesk/reschedule/waitlist`,
    ({ request }) => {
      if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
      return HttpResponse.json(rescheduleStore.listWaitlist());
    },
  ),

  // GET /frontdesk/reschedule/fill-stats — PHI-free fill-funnel counters.
  http.get(
    `${API_BASE}/frontdesk/reschedule/fill-stats`,
    ({ request }) => {
      if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
      return HttpResponse.json(rescheduleStore.getFillStats());
    },
  ),

  // ---------------------------------------------------------------------------
  // Home Services T8 "QuoteNow" — office quote-inbox + price book + token
  // ---------------------------------------------------------------------------
  //
  // GET  /quoting/quotes[?status=] — inbox list (staff-accessible)
  // GET  /quoting/quotes/{id}      — quote detail (4435 if absent)
  // GET  /quoting/price-book       — price book (ADMIN; 4431/404 if none)
  // PUT  /quoting/price-book       — upsert (ADMIN)
  // POST /quoting/tokens           — issue widget token (ADMIN)
  //
  // TEST-ONLY controls:
  // POST /quoting/price-book/test-clear  — clears the price book (4431 path)
  // POST /quoting/quotes/test-reset      — resets quote rows to seeds

  // GET /quoting/quotes[?status=]
  http.get(`${API_BASE}/quoting/quotes`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? undefined;
    return HttpResponse.json(quotingStore.list(status));
  }),

  // GET /quoting/quotes/{id}
  http.get(`${API_BASE}/quoting/quotes/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const { id } = params as { id: string };
    const detail = quotingStore.get(id);
    if (!detail) {
      return HttpResponse.json(
        { message: "Quote not found", errorCode: 4435 },
        { status: 404 },
      );
    }
    return HttpResponse.json(detail);
  }),

  // GET /quoting/price-book — 4431/404 if none
  http.get(`${API_BASE}/quoting/price-book`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const book = quotingStore.getPriceBook();
    if (!book) {
      return HttpResponse.json(
        { message: "Price book not found", errorCode: 4431 },
        { status: 404 },
      );
    }
    return HttpResponse.json(book);
  }),

  // PUT /quoting/price-book
  http.put(`${API_BASE}/quoting/price-book`, async ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const body = await request.json() as Parameters<typeof quotingStore.savePriceBook>[0];
    const saved = quotingStore.savePriceBook(body);
    return HttpResponse.json(saved);
  }),

  // POST /quoting/tokens
  http.post(`${API_BASE}/quoting/tokens`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(quotingStore.issueToken(), { status: 201 });
  }),

  // TEST-ONLY: clear price book (exercises the 4431 empty-state path)
  http.post(
    `${API_BASE}/quoting/price-book/test-clear`,
    ({ request }) => {
      if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
      quotingStore.clearPriceBook();
      return new HttpResponse(null, { status: 204 });
    },
  ),

  // TEST-ONLY: reset quote rows to seeds
  http.post(
    `${API_BASE}/quoting/quotes/test-reset`,
    ({ request }) => {
      if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
      quotingStore.resetQuotes();
      return new HttpResponse(null, { status: 204 });
    },
  ),

  // ==========================================================================
  // Salon T9 "StyleConsult AI"
  // GET  /styleconsult/consults[?status=] — consult inbox list (staff-accessible)
  // GET  /styleconsult/consults/{id}      — consult detail (4455 if absent)
  // GET  /styleconsult/analytics          — retail-attach funnel analytics
  // POST /styleconsult/tokens             — issue widget token (ADMIN)
  //
  // POST /styleconsult/consults/test-reset — resets consult rows to seeds
  // ==========================================================================

  // GET /styleconsult/consults[?status=]
  http.get(`${API_BASE}/styleconsult/consults`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? undefined;
    return HttpResponse.json(styleConsultStore.list(status));
  }),

  // GET /styleconsult/consults/{id}
  http.get(`${API_BASE}/styleconsult/consults/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const { id } = params as { id: string };
    const detail = styleConsultStore.get(id);
    if (!detail) {
      return HttpResponse.json(
        { message: "Style consult not found", errorCode: 4455 },
        { status: 404 },
      );
    }
    return HttpResponse.json(detail);
  }),

  // GET /styleconsult/analytics
  http.get(`${API_BASE}/styleconsult/analytics`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(styleConsultStore.getAnalytics());
  }),

  // POST /styleconsult/tokens (ADMIN-gated)
  http.post(`${API_BASE}/styleconsult/tokens`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(styleConsultStore.issueToken(), { status: 201 });
  }),

  // TEST-ONLY: reset consult rows to seeds
  http.post(
    `${API_BASE}/styleconsult/consults/test-reset`,
    ({ request }) => {
      if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
      styleConsultStore.resetConsults();
      return new HttpResponse(null, { status: 204 });
    },
  ),

  // ── Salon T12 "StylerMatch" ────────────────────────────────────────────────
  // POST /stylermatch/matches   — create a match (staff desk)
  // GET  /stylermatch/matches   — inbox list
  // GET  /stylermatch/matches/:id — detail (4485 if absent)
  // GET  /stylermatch/analytics — accept-rate funnel
  // POST /stylermatch/tokens    — issue widget token (ADMIN)
  // POST /public/integrations/stylermatch/:token/matches/:matchId/accept — book
  // POST /stylermatch/matches/test-reset — TEST-ONLY

  // POST /stylermatch/matches (create)
  http.post(`${API_BASE}/stylermatch/matches`, async ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    let body: Record<string, unknown> = {};
    try {
      const text = await request.text();
      if (text) body = JSON.parse(text) as Record<string, unknown>;
    } catch {
      // body is optional
    }
    const result = stylerMatchStore.create({
      styleCategory: body.styleCategory as string | null,
      serviceMenuItemId: body.serviceMenuItemId as string | null,
      length: body.length as string | null,
      texture: body.texture as string | null,
      color: body.color as string | null,
      name: body.name as string | null,
      phone: body.phone as string | null,
      notes: body.notes as string | null,
    });
    return HttpResponse.json(result, { status: 201 });
  }),

  // GET /stylermatch/matches[?status=]
  http.get(`${API_BASE}/stylermatch/matches`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? undefined;
    return HttpResponse.json(stylerMatchStore.list(status));
  }),

  // GET /stylermatch/matches/:id
  http.get(`${API_BASE}/stylermatch/matches/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const id = String(params.id);
    const match = stylerMatchStore.get(id);
    if (!match) {
      return HttpResponse.json(
        { code: 4485, message: "Styler match not found" },
        { status: 404 },
      );
    }
    return HttpResponse.json(match);
  }),

  // GET /stylermatch/analytics
  http.get(`${API_BASE}/stylermatch/analytics`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(stylerMatchStore.getAnalytics());
  }),

  // POST /stylermatch/tokens (ADMIN-gated)
  http.post(`${API_BASE}/stylermatch/tokens`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(stylerMatchStore.issueToken(), { status: 201 });
  }),

  // POST /public/integrations/stylermatch/:token/matches/:matchId/accept
  // The public accept endpoint — resolves tenant from token; books top stylist.
  // MSW: token is ignored (no JWT verify in mock); matchId drives the state machine.
  http.post(
    `/public/integrations/stylermatch/:token/matches/:matchId/accept`,
    ({ params }) => {
      const matchId = String(params.matchId);
      const result = stylerMatchStore.bookTopMatch(matchId);
      if (!result) {
        return HttpResponse.json(
          { code: 4485, message: "Styler match not found" },
          { status: 404 },
        );
      }
      return HttpResponse.json(result);
    },
  ),

  // TEST-ONLY: reset match rows to seeds
  http.post(
    `${API_BASE}/stylermatch/matches/test-reset`,
    ({ request }) => {
      if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
      stylerMatchStore.resetMatches();
      return new HttpResponse(null, { status: 204 });
    },
  ),

  // ── Real Estate T10 — Listing Prep Studio ──────────────────────────────────
  // All routes are STAFF + realestate-module-gated on the BE (the RE-5b posture).
  // No @IdempotentRoute on generate — the controller does not send one.

  // POST /realestate/listings/:listingId/prep/generate
  // Must be registered BEFORE the parametric /realestate/listings/:id routes
  // (the MSW router is first-match, not longest-match). The prep-specific
  // /listings/:listingId/prep/packs GET is also before the generic :id GET.
  http.post(
    `${API_BASE}/realestate/listings/:listingId/prep/generate`,
    async ({ request, params }) => {
      if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
      await delay(80);
      let body: ListingPrepGenerateRequest | null = null;
      try {
        const text = await request.text();
        if (text) body = JSON.parse(text) as ListingPrepGenerateRequest;
      } catch {
        // body is optional
      }
      const pack = listingPrepStore.generate(
        String(params.listingId),
        body?.startDate ?? null,
        body?.postsPerWeek ?? null,
      );
      return HttpResponse.json(pack);
    },
  ),

  // GET /realestate/listings/:listingId/prep/packs — listing prep history
  http.get(
    `${API_BASE}/realestate/listings/:listingId/prep/packs`,
    ({ request, params }) => {
      if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
      return HttpResponse.json(
        listingPrepStore.listForListing(String(params.listingId)),
      );
    },
  ),

  // GET /realestate/prep/packs — DRAFTED queue (registered before parametric
  // /realestate/prep/packs/:id to avoid matching "packs" as an id).
  http.get(`${API_BASE}/realestate/prep/packs`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(listingPrepStore.listDrafted());
  }),

  // POST /realestate/prep/packs/:id/approve
  http.post(
    `${API_BASE}/realestate/prep/packs/:id/approve`,
    async ({ request, params }) => {
      if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
      await delay(50);
      const result = listingPrepStore.approve(String(params.id));
      if (result === undefined)
        return HttpResponse.json(
          { message: "Prep pack not found", errorCode: 4460 },
          { status: 404 },
        );
      if (result === null)
        return HttpResponse.json(
          { message: "Prep pack is not DRAFTED", errorCode: 4461 },
          { status: 409 },
        );
      return HttpResponse.json(result);
    },
  ),

  // POST /realestate/prep/packs/:id/skip
  http.post(
    `${API_BASE}/realestate/prep/packs/:id/skip`,
    async ({ request, params }) => {
      if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
      await delay(50);
      const result = listingPrepStore.skip(String(params.id));
      if (result === undefined)
        return HttpResponse.json(
          { message: "Prep pack not found", errorCode: 4460 },
          { status: 404 },
        );
      if (result === null)
        return HttpResponse.json(
          { message: "Prep pack is not DRAFTED", errorCode: 4461 },
          { status: 409 },
        );
      return HttpResponse.json(result);
    },
  ),

  // GET /realestate/prep/packs/:id — single pack
  http.get(`${API_BASE}/realestate/prep/packs/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const pack = listingPrepStore.get(String(params.id));
    if (!pack)
      return HttpResponse.json(
        { message: "Prep pack not found", errorCode: 4460 },
        { status: 404 },
      );
    return HttpResponse.json(pack);
  }),

  // TEST-ONLY: reset prep packs to seeds
  http.post(
    `${API_BASE}/realestate/prep/packs/test-reset`,
    ({ request }) => {
      if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
      listingPrepStore.reset();
      return new HttpResponse(null, { status: 204 });
    },
  ),

  // ── Home Services T11 — QuoteCloser ────────────────────────────────────────
  // GET  /quoting/quote-closer/config  — ADMIN; 4470/404 if not yet configured
  // PUT  /quoting/quote-closer/config  — ADMIN; body QuoteCloserConfigDTO
  // GET  /quoting/quote-closer/analytics — staff-accessible
  //
  // TEST-ONLY:
  //   POST /quoting/quote-closer/test-clear-config  — clears config (4470 path)
  //   POST /quoting/quote-closer/test-reset-config  — restores config to seed

  // TEST-ONLY: clear config (exercises the 4470 empty-state path). Must be
  // registered before the parametric GET /quoting/quote-closer/config.
  http.post(
    `${API_BASE}/quoting/quote-closer/test-clear-config`,
    ({ request }) => {
      if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
      quoteCloserStore.clearConfig();
      return new HttpResponse(null, { status: 204 });
    },
  ),

  // TEST-ONLY: reset config to seed.
  http.post(
    `${API_BASE}/quoting/quote-closer/test-reset-config`,
    ({ request }) => {
      if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
      quoteCloserStore.resetConfig();
      return new HttpResponse(null, { status: 204 });
    },
  ),

  // GET /quoting/quote-closer/analytics
  // Must be registered before the parametric /quoting/quote-closer/config so
  // MSW's first-match router doesn't misroute it (path is longer, but safer to
  // be explicit).
  http.get(`${API_BASE}/quoting/quote-closer/analytics`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(quoteCloserStore.getAnalytics());
  }),

  // GET /quoting/quote-closer/config — 4470/404 if none
  http.get(`${API_BASE}/quoting/quote-closer/config`, ({ request }) => {
    if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
    const cfg = quoteCloserStore.getConfig();
    if (!cfg)
      return HttpResponse.json(
        { message: "QuoteCloser config not found", errorCode: 4470 },
        { status: 404 },
      );
    return HttpResponse.json(cfg);
  }),

  // PUT /quoting/quote-closer/config
  http.put(
    `${API_BASE}/quoting/quote-closer/config`,
    async ({ request }) => {
      if (!requireAuth(request)) return new HttpResponse(null, { status: 401 });
      await delay(60);
      const body = await request.json() as { campaignId: string | null; unacceptedWindowHours: number | null };
      const saved = quoteCloserStore.saveConfig(body);
      return HttpResponse.json(saved);
    },
  ),
];
