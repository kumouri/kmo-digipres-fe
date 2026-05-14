import { http, HttpResponse, delay } from "msw";

import type { LoginRequest, LoginResponse, User } from "@/types/api";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api";

// Seeded user that matches the credentials AuthSmokeIT.java expects.
// Keep these aligned with the backend's smoke fixture so the FE and BE
// smoke suites tell the same story.
const SMOKE_USER: User = {
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

const SMOKE_PASSWORD = "hunter2hunter2";
const SMOKE_TOKEN = "msw-mock-jwt-token";

function requireAuth(request: Request): boolean {
  const header = request.headers.get("authorization");
  return !!header && header.startsWith("Bearer ");
}

export const handlers = [
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
    if (!requireAuth(request)) {
      return new HttpResponse(null, { status: 401 });
    }
    return HttpResponse.json(SMOKE_USER);
  }),

  http.post(`${API_BASE}/auth/logout`, ({ request }) => {
    if (!requireAuth(request)) {
      return new HttpResponse(null, { status: 401 });
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${API_BASE}/auth/health`, () => {
    return HttpResponse.text("ok");
  }),

  // Phase 3 onward: contacts, companies, deals, activities, communication.
];
