import { http, HttpResponse, delay } from "msw";

import type {
  ActivityDTO,
  BookSlotRequest,
  CompanyDTO,
  ContactDTO,
  DealDTO,
  LoginRequest,
  LoginResponse,
  MoveStageRequest,
  SingleEmailCommunicationDTO,
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
} from "./store";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api";

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
