import { http, HttpResponse, delay } from "msw";

import type {
  CompanyDTO,
  ContactDTO,
  LoginRequest,
  LoginResponse,
} from "@/types/api";
import {
  SMOKE_PASSWORD,
  SMOKE_TOKEN,
  SMOKE_USER,
  activityStore,
  companyStore,
  contactStore,
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
];
