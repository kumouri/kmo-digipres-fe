import { test, expect, type Page } from "@playwright/test";

// Salon "ReviewBoost" (T6) — admin board smoke tests.
//
// (a) Navigation: the "ReviewBoost" nav link is visible to staff and absent
//     for contractors; the page mounts at /review-boost.
//
// (b) Insights panel: the four headline stat cards render (count / avg /
//     requests sent / response rate) with the seeded demo numbers (18 reviews,
//     avg 4.6, 45 requests sent, rate = 18/45 ≈ 40%).
//
// (c) Sentiment breakdown: the seeded positive / neutral / negative counts
//     (14 / 3 / 1) are visible.
//
// (d) Per-stylist table: three seeded stylist rows are visible (Mia Torres /
//     Jordan Kim / Alex Rivera) with their uneven request counts.
//
// (e) Config card: the config card renders; the review link is shown as
//     configured; the three flags show Off (default) per the seeded state.
//
// (f) RBAC: the board is staff-visible and contractor-hidden.
//
// Both BE endpoints are ADMIN + chairfill-AND-salon-spa-module-gated; there
// is no write endpoint. MSW seeds the board + config; store is stateless
// (read-only) so no per-test teardown needed.

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

test("ReviewBoost nav item is visible to staff", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("link", { name: "ReviewBoost" })).toBeVisible();
});

test("the page mounts and the board renders", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "ReviewBoost" }).click();
  await expect(page).toHaveURL(/\/review-boost$/);
  await expect(page.getByTestId("review-boost-board-page")).toBeVisible();
});

// ---------------------------------------------------------------------------
// (b) Headline stat cards
// ---------------------------------------------------------------------------

test("the headline stats render all four cards with seeded values", async ({
  page,
}) => {
  await login(page);
  await page.goto("/review-boost");
  await expect(page.getByTestId("review-boost-board-page")).toBeVisible();

  // All four stat cards are visible.
  await expect(page.getByTestId("review-boost-insights-panel")).toBeVisible();
  await expect(page.getByTestId("review-boost-stat-count")).toBeVisible();
  await expect(page.getByTestId("review-boost-stat-avg")).toBeVisible();
  await expect(page.getByTestId("review-boost-stat-sent")).toBeVisible();
  await expect(page.getByTestId("review-boost-stat-rate")).toBeVisible();

  // Seeded: 18 reviews.
  await expect(page.getByTestId("review-boost-stat-count-value")).toHaveText("18");

  // Seeded avg 4.6.
  await expect(page.getByTestId("review-boost-stat-avg-value")).toHaveText("4.6");

  // Seeded: 45 requests sent.
  await expect(page.getByTestId("review-boost-stat-sent-value")).toHaveText("45");
});

test("the response rate shows ~40% from the seeded data", async ({ page }) => {
  await login(page);
  await page.goto("/review-boost");
  await expect(page.getByTestId("review-boost-insights-panel")).toBeVisible();
  // 18/45 = 0.4 → 40%
  await expect(page.getByTestId("review-boost-stat-rate-value")).toContainText("40%");
});

// ---------------------------------------------------------------------------
// (c) Sentiment breakdown
// ---------------------------------------------------------------------------

test("the sentiment breakdown shows the seeded counts", async ({ page }) => {
  await login(page);
  await page.goto("/review-boost");
  await expect(page.getByTestId("review-boost-insights-panel")).toBeVisible();

  // Seeded: 14 positive / 3 neutral / 1 negative.
  await expect(page.getByTestId("sentiment-breakdown")).toBeVisible();
  await expect(page.getByTestId("sentiment-positive")).toHaveText("14");
  await expect(page.getByTestId("sentiment-neutral")).toHaveText("3");
  await expect(page.getByTestId("sentiment-negative")).toHaveText("1");
});

// ---------------------------------------------------------------------------
// (d) Per-stylist table
// ---------------------------------------------------------------------------

test("the stylist table renders three rows for the seeded stylists", async ({
  page,
}) => {
  await login(page);
  await page.goto("/review-boost");
  await expect(page.getByTestId("review-boost-insights-panel")).toBeVisible();

  // Three rows visible.
  await expect(page.getByTestId("stylist-row")).toHaveCount(3);

  // The stylist names are present.
  await expect(page.getByText("Mia Torres")).toBeVisible();
  await expect(page.getByText("Jordan Kim")).toBeVisible();
  await expect(page.getByText("Alex Rivera")).toBeVisible();
});

test("the per-stylist rows have uneven request counts", async ({ page }) => {
  await login(page);
  await page.goto("/review-boost");
  await expect(page.getByTestId("stylist-table")).toBeVisible();

  // Mia: 28, Jordan: 14, Alex: 3 — counts differ.
  const sentCells = await page.getByTestId("stylist-requests-sent").allTextContents();
  const nums = sentCells.map((t) => Number(t.replace(/,/g, "")));
  // All three present and not equal.
  expect(nums).toHaveLength(3);
  expect(new Set(nums).size).toBe(3);
});

// ---------------------------------------------------------------------------
// (e) Config card
// ---------------------------------------------------------------------------

test("the config card renders and shows the review link as configured", async ({
  page,
}) => {
  await login(page);
  await page.goto("/review-boost");
  await expect(page.getByTestId("review-boost-config-card")).toBeVisible();

  // The review link is configured — green check is present.
  await expect(page.getByTestId("review-boost-config-link-ok")).toBeVisible();
});

test("the config flags show Off (default) for all three flags", async ({
  page,
}) => {
  await login(page);
  await page.goto("/review-boost");
  await expect(page.getByTestId("review-boost-config-card")).toBeVisible();

  // All three flags are Off by default in the seeded config.
  for (const key of ["senderEnabled", "sentimentRefineEnabled", "negativeAlertEnabled"]) {
    await expect(
      page.getByTestId(`review-boost-flag-${key}-value`),
    ).toContainText("Off");
  }
});

// ---------------------------------------------------------------------------
// (f) RBAC: contractor-hidden
// ---------------------------------------------------------------------------

test("a contractor cannot see or reach the ReviewBoost board", async ({
  page,
}) => {
  // contractor@example.test is STAFF + CONTRACTOR (no ADMIN) — scoped down.
  await login(page, "contractor@example.test");

  // The nav item is hidden…
  await expect(page.getByRole("link", { name: "ReviewBoost" })).toHaveCount(0);

  // …and deep-linking is bounced to the dashboard by RequireNotContractor.
  await page.goto("/review-boost");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("dashboard")).toBeVisible();
});
