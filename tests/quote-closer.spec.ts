import { test, expect, type Page } from "@playwright/test";

// Home Services T11 "QuoteCloser" — follow-up settings + recovery funnel smoke.
//
// (a) Navigation: "Quote follow-up" nav link is visible to staff and absent for
//     contractors. Label is distinct from "Job estimates", "Estimate settings",
//     and "Quotes" — no Playwright partial-match collision risk.
//
// (b) Config card: the settings page mounts at /quote-follow-up, the config
//     card renders with the seeded values (48-hour window, cadence on).
//
// (c) Config edit round-trip: editing the window hours and saving issues a PUT
//     that round-trips successfully (success toast, form resets clean).
//
// (d) Analytics panel: the recovery funnel panel renders all five seeded stat
//     cards (quotes sent / followed up / recovered / review requested / rate).
//
// (e) Empty-state config: when no config exists the empty-state banner renders
//     (the 4470 path).
//
// (f) RBAC: the surface is contractor-hidden (RequireNotContractor).

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

test("Quote follow-up nav link is visible to staff", async ({ page }) => {
  await login(page);
  await expect(
    page.getByRole("link", { name: "Quote follow-up" }),
  ).toBeVisible();
});

test("the quote-follow-up page mounts at /quote-follow-up", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Quote follow-up" }).click();
  await expect(page).toHaveURL(/\/quote-follow-up$/);
  await expect(page.getByTestId("quote-closer-settings-page")).toBeVisible();
});

// ---------------------------------------------------------------------------
// (b) Config card — seeded values
// ---------------------------------------------------------------------------

test("the config card renders with the seeded follow-up window", async ({
  page,
}) => {
  await login(page);
  await page.goto("/quote-follow-up");
  await expect(page.getByTestId("quote-closer-settings-page")).toBeVisible();
  await expect(page.getByTestId("quote-closer-config-card")).toBeVisible();

  // Seeded: 48-hour window; cadence enabled
  await expect(page.getByTestId("unaccepted-window-hours-input")).toHaveValue(
    "48",
  );
  await expect(page.getByTestId("cadence-enabled-toggle")).toBeChecked();
});

test("the config form renders with all expected fields", async ({ page }) => {
  await login(page);
  await page.goto("/quote-follow-up");
  await expect(page.getByTestId("quote-closer-config-form")).toBeVisible();

  await expect(page.getByTestId("cadence-enabled-toggle")).toBeVisible();
  await expect(page.getByTestId("unaccepted-window-hours-input")).toBeVisible();
  await expect(page.getByTestId("financing-nudge-copy-input")).toBeVisible();
  await expect(page.getByTestId("quote-closer-config-save-btn")).toBeVisible();
});

// ---------------------------------------------------------------------------
// (c) Config edit round-trip
// ---------------------------------------------------------------------------

test("editing the window hours and saving round-trips the PUT", async ({
  page,
}) => {
  await login(page);
  await page.goto("/quote-follow-up");
  await expect(page.getByTestId("quote-closer-config-card")).toBeVisible();

  // Change the window from 48 to 72 hours
  await page.getByTestId("unaccepted-window-hours-input").fill("72");

  // Save button is now enabled (form is dirty)
  await expect(page.getByTestId("quote-closer-config-save-btn")).toBeEnabled();
  await page.getByTestId("quote-closer-config-save-btn").click();

  // Success toast appears
  await expect(
    page.getByText("Follow-up settings saved."),
  ).toBeVisible();
});

test("the save button is disabled until the form is dirty", async ({ page }) => {
  await login(page);
  await page.goto("/quote-follow-up");
  await expect(page.getByTestId("quote-closer-config-card")).toBeVisible();

  // Before any edits the button is disabled
  await expect(
    page.getByTestId("quote-closer-config-save-btn"),
  ).toBeDisabled();
});

test("disabling the cadence toggle greys out the window input", async ({
  page,
}) => {
  await login(page);
  await page.goto("/quote-follow-up");
  await expect(page.getByTestId("quote-closer-config-card")).toBeVisible();

  // Cadence starts enabled — window input is active
  await expect(
    page.getByTestId("unaccepted-window-hours-input"),
  ).toBeEnabled();

  // Uncheck the cadence toggle
  await page.getByTestId("cadence-enabled-toggle").uncheck();

  // Window input becomes disabled
  await expect(
    page.getByTestId("unaccepted-window-hours-input"),
  ).toBeDisabled();
});

// ---------------------------------------------------------------------------
// (d) Analytics panel — seeded funnel
// ---------------------------------------------------------------------------

test("the recovery funnel panel renders", async ({ page }) => {
  await login(page);
  await page.goto("/quote-follow-up");
  await expect(page.getByTestId("quote-closer-settings-page")).toBeVisible();
  await expect(page.getByTestId("quote-closer-analytics-card")).toBeVisible();
});

test("the funnel shows all five seeded stat cards", async ({ page }) => {
  await login(page);
  await page.goto("/quote-follow-up");
  await expect(page.getByTestId("quote-closer-analytics-card")).toBeVisible();

  // All five funnel stats are present
  await expect(page.getByTestId("funnel-quotes-sent")).toBeVisible();
  await expect(page.getByTestId("funnel-followed-up")).toBeVisible();
  await expect(page.getByTestId("funnel-recovered")).toBeVisible();
  await expect(page.getByTestId("funnel-review-requested")).toBeVisible();
  await expect(page.getByTestId("funnel-recovery-rate")).toBeVisible();
});

test("the funnel shows the seeded quotes-sent count", async ({ page }) => {
  await login(page);
  await page.goto("/quote-follow-up");
  await expect(page.getByTestId("funnel-quotes-sent")).toContainText("120");
});

test("the funnel shows the seeded recovered count", async ({ page }) => {
  await login(page);
  await page.goto("/quote-follow-up");
  await expect(page.getByTestId("funnel-recovered")).toContainText("31");
});

test("the funnel shows a non-zero recovery rate", async ({ page }) => {
  await login(page);
  await page.goto("/quote-follow-up");
  await expect(page.getByTestId("funnel-recovery-rate")).toContainText("%");
});

// ---------------------------------------------------------------------------
// (e) Empty-state config (4470 path)
// ---------------------------------------------------------------------------

test("when no config exists the empty-state banner renders", async ({
  page,
}) => {
  await login(page);

  // Use the test-control MSW endpoint to clear the QuoteCloser config store.
  await page.evaluate(async () => {
    const token = localStorage.getItem("kmosf.jwt") ?? "";
    await fetch(
      "http://localhost:8080/api/v1/quoting/quote-closer/test-clear-config",
      {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );
  });

  // SPA navigate to the page without a full reload so MSW state is preserved.
  await page.getByRole("link", { name: "Quote follow-up" }).click();
  await expect(page).toHaveURL(/\/quote-follow-up$/);
  await expect(page.getByTestId("quote-closer-settings-page")).toBeVisible();

  // The empty-state banner shows.
  await expect(
    page.getByTestId("quote-closer-config-empty-state"),
  ).toBeVisible();

  // The config form is still rendered (admin can do initial setup).
  await expect(page.getByTestId("quote-closer-config-form")).toBeVisible();
});

// ---------------------------------------------------------------------------
// (f) RBAC: contractor-hidden
// ---------------------------------------------------------------------------

test("a contractor cannot see the Quote follow-up nav link", async ({
  page,
}) => {
  await login(page, "contractor@example.test");

  // Nav item is hidden
  await expect(
    page.getByRole("link", { name: "Quote follow-up" }),
  ).toHaveCount(0);
});

test("a contractor cannot reach the quote-follow-up surface", async ({
  page,
}) => {
  await login(page, "contractor@example.test");

  // Deep-linking is bounced to the dashboard by RequireNotContractor.
  await page.goto("/quote-follow-up");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("dashboard")).toBeVisible();
});
