import { test, expect, type Page } from "@playwright/test";

// Real Estate "Midnight Responder" (T3) — admin panels smoke test.
//
// (a) Navigation: the "Midnight Responder" nav link is visible to staff and
//     absent for contractors; the page mounts at /midnight-responder.
//
// (b) Latency stats panel: the four stat cards render (p50/p95/max/after-hours)
//     with the seeded demo numbers (p50 = 18.2 s, after-hours ~42%).
//
// (c) Config loads: the tier-routing card shows the pre-seeded warm/cold
//     campaign dropdowns (Past-buyer reactivation / Open-house no-shows),
//     the business-hours start/end inputs, and the delegate-handoff checkbox.
//
// (d) Config saves: picking a campaign and clicking "Save settings" POSTs the
//     PUT /realestate/responder/config, surfaces the success toast, and the
//     save button returns to idle ("Save settings").
//
// (e) No-config empty state: when the store has no config row, the page shows
//     the friendly "not configured yet" banner, and the form is pre-blank so
//     the agent can do initial setup.
//
// (f) RBAC: the panel is staff-visible and contractor-hidden.
//
// All routes are STAFF + realestate-AND-responder-module-gated on the BE.
// MSW seeds a config + latency stats; the store resets per page load.

const SMOKE_EMAIL = "smoke@example.test"; // STAFF + ADMIN
const SMOKE_PASSWORD = "hunter2hunter2";

async function login(page: Page, email = SMOKE_EMAIL) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(SMOKE_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("dashboard")).toBeVisible();
}

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

// ---------------------------------------------------------------------------
// (a) Navigation
// ---------------------------------------------------------------------------

test("midnight-responder nav item is visible to staff", async ({ page }) => {
  await login(page);
  await expect(
    page.getByRole("link", { name: "Midnight Responder" }),
  ).toBeVisible();
});

test("the page mounts and the panel renders", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Midnight Responder" }).click();
  await expect(page).toHaveURL(/\/midnight-responder$/);
  await expect(page.getByTestId("midnight-responder-page")).toBeVisible();
});

// ---------------------------------------------------------------------------
// (b) Latency stats panel
// ---------------------------------------------------------------------------

test("the latency stats panel renders all four stat cards", async ({
  page,
}) => {
  await login(page);
  await page.goto("/midnight-responder");
  await expect(page.getByTestId("midnight-responder-page")).toBeVisible();

  // All four cards must be visible.
  await expect(page.getByTestId("responder-stats-panel")).toBeVisible();
  await expect(page.getByTestId("responder-p50")).toBeVisible();
  await expect(page.getByTestId("responder-p95")).toBeVisible();
  await expect(page.getByTestId("responder-max")).toBeVisible();
  await expect(page.getByTestId("responder-after-hours")).toBeVisible();
});

test("the p50 stat shows the seeded value (18.2 s)", async ({ page }) => {
  await login(page);
  await page.goto("/midnight-responder");
  await expect(page.getByTestId("responder-stats-panel")).toBeVisible();
  // p50 = 18200 ms → 18.2 s
  await expect(page.getByTestId("responder-p50-value")).toHaveText("18.2");
});

test("the after-hours stat shows ~42% coverage", async ({ page }) => {
  await login(page);
  await page.goto("/midnight-responder");
  await expect(page.getByTestId("responder-stats-panel")).toBeVisible();
  // afterHoursShare = 0.4203 → 42%
  await expect(page.getByTestId("responder-after-hours-value")).toHaveText(
    "42",
  );
});

// ---------------------------------------------------------------------------
// (c) Config loads
// ---------------------------------------------------------------------------

test("the config card renders with the seeded campaign selections", async ({
  page,
}) => {
  await login(page);
  await page.goto("/midnight-responder");
  await expect(page.getByTestId("responder-config-card")).toBeVisible();

  // The warm campaign picker should show the seeded campaign name.
  await expect(page.getByTestId("warm-campaign-select")).toBeVisible();
  await expect(page.getByTestId("warm-campaign-select")).toContainText(
    "Past-buyer reactivation",
  );

  // The cold campaign picker should show the paused campaign.
  await expect(page.getByTestId("cold-campaign-select")).toBeVisible();
  await expect(page.getByTestId("cold-campaign-select")).toContainText(
    "Open-house no-shows",
  );
});

test("the business-hours inputs show the default window 8–18", async ({
  page,
}) => {
  await login(page);
  await page.goto("/midnight-responder");
  await expect(page.getByTestId("responder-config-card")).toBeVisible();

  await expect(page.getByTestId("start-hour-input")).toHaveValue("8");
  await expect(page.getByTestId("end-hour-input")).toHaveValue("18");
});

// ---------------------------------------------------------------------------
// (d) Config saves
// ---------------------------------------------------------------------------

test("switching the warm campaign and saving round-trips the PUT and shows success", async ({
  page,
}) => {
  await login(page);
  await page.goto("/midnight-responder");
  await expect(page.getByTestId("responder-config-card")).toBeVisible();

  // Open the warm campaign picker and choose "None" to clear it —
  // this changes the value so the form becomes dirty.
  await page.getByTestId("warm-campaign-select").click();
  // "None" option is the first SelectItem.
  await page
    .getByRole("option", { name: /None — don't enroll warm leads/ })
    .click();

  // The form is now dirty — save button is enabled.
  await expect(page.getByTestId("responder-config-save-btn")).toBeEnabled();

  await page.getByTestId("responder-config-save-btn").click();

  // Success toast appears.
  await expect(
    page.getByText("Midnight Responder settings saved."),
  ).toBeVisible();

  // The save button returns to idle.
  await expect(page.getByTestId("responder-config-save-btn")).toHaveText(
    /Save settings/,
  );
});

// ---------------------------------------------------------------------------
// (e) No-config empty state (4380 path)
// ---------------------------------------------------------------------------

test("when no config exists the empty-state banner and blank form render", async ({
  page,
}) => {
  // Log in so the MSW service worker is running.
  await login(page);

  // Use the test-control MSW endpoint to clear the config store. The fetch
  // must use the same origin as the API calls (localhost:8080) so MSW's SW
  // intercepts it. The token is read from localStorage where the auth client
  // stores it (TOKEN_STORAGE_KEY = "kmosf.jwt").
  await page.evaluate(async () => {
    const token = localStorage.getItem("kmosf.jwt") ?? "";
    await fetch("http://localhost:8080/api/v1/realestate/responder/config/test-clear", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  });

  // SPA navigation — click the nav link (no full page reload, so the cleared
  // MSW store state is preserved for the subsequent config GET).
  await page.getByRole("link", { name: "Midnight Responder" }).click();
  await expect(page).toHaveURL(/\/midnight-responder$/);
  await expect(page.getByTestId("midnight-responder-page")).toBeVisible();

  // The empty-state note is shown.
  await expect(
    page.getByTestId("responder-config-empty-state"),
  ).toBeVisible();

  // The form is still rendered (the agent can do initial setup).
  await expect(page.getByTestId("responder-config-form")).toBeVisible();
});

// ---------------------------------------------------------------------------
// (f) RBAC: contractor-hidden
// ---------------------------------------------------------------------------

test("a contractor cannot see or reach the midnight-responder surface", async ({
  page,
}) => {
  // contractor@example.test is STAFF + CONTRACTOR (no ADMIN) — scoped down.
  await login(page, "contractor@example.test");

  // The nav item is hidden…
  await expect(
    page.getByRole("link", { name: "Midnight Responder" }),
  ).toHaveCount(0);

  // …and deep-linking is bounced to the dashboard by RequireNotContractor.
  await page.goto("/midnight-responder");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("dashboard")).toBeVisible();
});
