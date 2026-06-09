import { test, expect, type Page } from "@playwright/test";

// Health "Switchboard AI" (T4) — admin panels smoke test.
//
// (a) Navigation: the "Switchboard AI" nav link is visible to staff and
//     absent for contractors; the page mounts at /switchboard.
//
// (b) Deflection stats panel: the four stat cards render (logistics/tripwire/
//     handoff/rate) with the seeded demo numbers (logistics = 312, rate ~80%).
//
// (c) Config loads: the logistics config card shows the pre-seeded hours text
//     and location, booking instructions, and accepting-new-patients checkbox.
//
// (d) Config saves: editing an input and clicking "Save settings" POSTs the
//     PUT /frontdesk/switchboard/config, surfaces the success toast, and the
//     save button returns to idle ("Save settings").
//
// (e) No-config empty state: when the store has no config row, the page shows
//     the friendly "not configured yet" banner, and the form is still rendered
//     so the admin can do initial setup.
//
// (f) RBAC: the panel is staff-visible and contractor-hidden.
//
// All routes are ADMIN + frontdesk-AND-responder-module-gated on the BE.
// MSW seeds a config + deflection stats; the store resets per page load.

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

test("switchboard nav item is visible to staff", async ({ page }) => {
  await login(page);
  await expect(
    page.getByRole("link", { name: "Switchboard AI" }),
  ).toBeVisible();
});

test("the page mounts and the panel renders", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Switchboard AI" }).click();
  await expect(page).toHaveURL(/\/switchboard$/);
  await expect(page.getByTestId("switchboard-panel-page")).toBeVisible();
});

// ---------------------------------------------------------------------------
// (b) Deflection stats panel
// ---------------------------------------------------------------------------

test("the deflection stats panel renders all four stat cards", async ({
  page,
}) => {
  await login(page);
  await page.goto("/switchboard");
  await expect(page.getByTestId("switchboard-panel-page")).toBeVisible();

  // All four cards must be visible.
  await expect(page.getByTestId("switchboard-stats-panel")).toBeVisible();
  await expect(page.getByTestId("switchboard-stat-logistics")).toBeVisible();
  await expect(page.getByTestId("switchboard-stat-tripwire")).toBeVisible();
  await expect(page.getByTestId("switchboard-stat-handoff")).toBeVisible();
  await expect(page.getByTestId("switchboard-stat-rate")).toBeVisible();
});

test("the logistics stat shows the seeded value (312)", async ({ page }) => {
  await login(page);
  await page.goto("/switchboard");
  await expect(page.getByTestId("switchboard-stats-panel")).toBeVisible();
  // logistics = 312
  await expect(
    page.getByTestId("switchboard-stat-logistics-value"),
  ).toHaveText("312");
});

test("the deflection rate stat shows ~81% from the seeded data", async ({
  page,
}) => {
  await login(page);
  await page.goto("/switchboard");
  await expect(page.getByTestId("switchboard-stats-panel")).toBeVisible();
  // deflectionRate = 0.8062 → 81% (toFixed(0) rounds 80.62 → 81)
  await expect(page.getByTestId("switchboard-stat-rate-value")).toContainText(
    "81%",
  );
});

// ---------------------------------------------------------------------------
// (c) Config loads
// ---------------------------------------------------------------------------

test("the config card renders with the seeded logistics values", async ({
  page,
}) => {
  await login(page);
  await page.goto("/switchboard");
  await expect(page.getByTestId("switchboard-config-card")).toBeVisible();

  // The hours text should show the seeded value.
  await expect(page.getByTestId("hours-text-input")).toHaveValue(
    "Mon–Thu 8am–5pm, Fri 8am–2pm",
  );

  // The accepting-new-patients checkbox is checked (seeded true).
  await expect(
    page.getByTestId("accepting-new-patients-checkbox"),
  ).toBeChecked();
});

test("the booking instructions show the seeded value", async ({ page }) => {
  await login(page);
  await page.goto("/switchboard");
  await expect(page.getByTestId("switchboard-config-card")).toBeVisible();

  // <textarea> — use toHaveValue (not toContainText which reads inner text).
  await expect(page.getByTestId("booking-instructions-input")).toHaveValue(
    "Call us at (555) 867-5309 or book online at our website",
  );
});

// ---------------------------------------------------------------------------
// (d) Config saves
// ---------------------------------------------------------------------------

test("editing the hours and saving round-trips the PUT and shows success", async ({
  page,
}) => {
  await login(page);
  await page.goto("/switchboard");
  await expect(page.getByTestId("switchboard-config-card")).toBeVisible();

  // Edit the hours text — this makes the form dirty.
  await page.getByTestId("hours-text-input").fill("Mon–Fri 9am–6pm");

  // The form is now dirty — save button is enabled.
  await expect(
    page.getByTestId("switchboard-config-save-btn"),
  ).toBeEnabled();

  await page.getByTestId("switchboard-config-save-btn").click();

  // Success toast appears.
  await expect(
    page.getByText("Switchboard settings saved."),
  ).toBeVisible();

  // The save button returns to idle.
  await expect(page.getByTestId("switchboard-config-save-btn")).toHaveText(
    /Save settings/,
  );
});

// ---------------------------------------------------------------------------
// (e) No-config empty state (4391 path)
// ---------------------------------------------------------------------------

test("when no config exists the empty-state banner and blank form render", async ({
  page,
}) => {
  // Log in so the MSW service worker is running.
  await login(page);

  // Use the test-control MSW endpoint to clear the config store.
  await page.evaluate(async () => {
    const token = localStorage.getItem("kmosf.jwt") ?? "";
    await fetch("http://localhost:8080/api/v1/frontdesk/switchboard/config/test-clear", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  });

  // SPA navigation — click the nav link (no full page reload).
  await page.getByRole("link", { name: "Switchboard AI" }).click();
  await expect(page).toHaveURL(/\/switchboard$/);
  await expect(page.getByTestId("switchboard-panel-page")).toBeVisible();

  // The empty-state note is shown.
  await expect(
    page.getByTestId("switchboard-config-empty-state"),
  ).toBeVisible();

  // The form is still rendered (the admin can do initial setup).
  await expect(page.getByTestId("switchboard-config-form")).toBeVisible();
});

// ---------------------------------------------------------------------------
// (f) RBAC: contractor-hidden
// ---------------------------------------------------------------------------

test("a contractor cannot see or reach the switchboard surface", async ({
  page,
}) => {
  // contractor@example.test is STAFF + CONTRACTOR (no ADMIN) — scoped down.
  await login(page, "contractor@example.test");

  // The nav item is hidden…
  await expect(
    page.getByRole("link", { name: "Switchboard AI" }),
  ).toHaveCount(0);

  // …and deep-linking is bounced to the dashboard by RequireNotContractor.
  await page.goto("/switchboard");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("dashboard")).toBeVisible();
});
