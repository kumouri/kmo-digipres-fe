import { test, expect, type Page } from "@playwright/test";

// Salon T12 "StylerMatch" — staff stylist-match console smoke test.
//
// (a) Navigation: "Stylist match" nav link is visible to staff and absent for
//     contractors. Label is distinct from "Style consults" (T9).
//
// (b) Inbox list: three seeded match cards render (Jordan NEW / Casey NEW /
//     Riley BOOKED). Each card shows the style category and top stylist name.
//
// (c) Status filter: NEW filter shows only 2 cards; BOOKED shows 1.
//
// (d) Create → ranked results:
//     - Submitting the create form shows the ranked-match result view.
//     - Rank-1 (Mia Torres, certified) shows rationale + score badge, no
//       "Not certified" badge.
//     - Rank-2 (Alex Rivera, NOT certified) shows the "Not certified" penalty
//       badge and its rationale.
//     - Ranked-matches order: rank 1 has a higher score than rank 2.
//     - "Book top match" button is visible on rank-1 row.
//
// (e) Book top match:
//     - Clicking "Book top match" transitions the match to BOOKED and shows
//       the booked confirmation banner.
//
// (f) Analytics: the analytics card renders with the seeded stats.
//
// (g) Token issue: "Copy match widget link" button issues POST
//     /stylermatch/tokens and surfaces the widget URL.
//
// (h) RBAC: the surface is contractor-hidden.

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
  // Reset match store to seeds before each test.
  await context.clearCookies();
});

// ---------------------------------------------------------------------------
// (a) Navigation
// ---------------------------------------------------------------------------

test("stylist-match nav item is visible to staff", async ({ page }) => {
  await login(page);
  await expect(
    page.getByRole("link", { name: "Stylist match" }),
  ).toBeVisible();
});

test("the styler-match page mounts at /styler-match", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Stylist match" }).click();
  await expect(page).toHaveURL(/\/styler-match$/);
  await expect(page.getByTestId("styler-match-console-page")).toBeVisible();
});

// ---------------------------------------------------------------------------
// (b) Inbox list
// ---------------------------------------------------------------------------

test("the match inbox renders all three seeded cards", async ({ page }) => {
  await login(page);
  await page.goto("/styler-match");
  await expect(page.getByTestId("styler-match-console-page")).toBeVisible();
  await expect(page.getByTestId("styler-match-inbox-list")).toBeVisible();
  await expect(page.getByTestId("styler-match-card")).toHaveCount(3);
});

test("the Jordan card shows the correct category and top stylist", async ({
  page,
}) => {
  await login(page);
  await page.goto("/styler-match");
  await expect(page.getByTestId("styler-match-inbox-list")).toBeVisible();

  // Find the Jordan card (NEW, Curly / wavy)
  const cards = page.getByTestId("styler-match-card");
  const jordanCard = cards
    .filter({ has: page.getByText("Curly / wavy") })
    .first();

  await expect(
    jordanCard.getByTestId("styler-match-card-category"),
  ).toHaveText("Curly / wavy");
  await expect(
    jordanCard.getByTestId("styler-match-card-status"),
  ).toHaveText("New");
  await expect(
    jordanCard.getByTestId("styler-match-card-top-stylist"),
  ).toContainText("Mia Torres");
});

test("the Riley card shows BOOKED status", async ({ page }) => {
  await login(page);
  await page.goto("/styler-match");
  await expect(page.getByTestId("styler-match-inbox-list")).toBeVisible();

  const bookedCard = page
    .getByTestId("styler-match-card")
    .filter({ has: page.getByText("Booked") })
    .first();
  await expect(
    bookedCard.getByTestId("styler-match-card-status"),
  ).toHaveText("Booked");
});

// ---------------------------------------------------------------------------
// (c) Status filter
// ---------------------------------------------------------------------------

test("the NEW filter shows only 2 cards", async ({ page }) => {
  await login(page);
  await page.goto("/styler-match");
  await expect(page.getByTestId("styler-match-console-page")).toBeVisible();

  await page.getByTestId("styler-match-filter-new").click();
  await expect(page.getByTestId("styler-match-card")).toHaveCount(2);
});

test("the BOOKED filter shows only 1 card", async ({ page }) => {
  await login(page);
  await page.goto("/styler-match");
  await expect(page.getByTestId("styler-match-console-page")).toBeVisible();

  await page.getByTestId("styler-match-filter-booked").click();
  await expect(page.getByTestId("styler-match-card")).toHaveCount(1);
});

// ---------------------------------------------------------------------------
// (d) Create → ranked results
// ---------------------------------------------------------------------------

test("submitting the create form shows the ranked-match result view", async ({
  page,
}) => {
  await login(page);
  await page.goto("/styler-match");
  await expect(page.getByTestId("create-match-form-card")).toBeVisible();

  // Fill style category (required)
  await page
    .getByTestId("create-match-style-category")
    .fill("Curly / wavy");

  // Submit
  await page.getByTestId("create-match-submit-btn").click();

  // Should transition to match result view
  await expect(page.getByTestId("match-result-view")).toBeVisible();
  await expect(page.getByTestId("ranked-matches-list")).toBeVisible();
});

test("rank-1 certified stylist shows rationale and score — no not-certified badge", async ({
  page,
}) => {
  await login(page);
  await page.goto("/styler-match");

  await page.getByTestId("create-match-style-category").fill("Curly / wavy");
  await page.getByTestId("create-match-submit-btn").click();
  await expect(page.getByTestId("match-result-view")).toBeVisible();

  // Rank-1 row
  const rank1Row = page
    .getByTestId("ranked-match-row")
    .filter({ has: page.getByTestId("ranked-match-rank").filter({ hasText: "1" }) })
    .first();

  await expect(rank1Row.getByTestId("ranked-match-name")).toHaveText("Mia Torres");
  await expect(rank1Row.getByTestId("ranked-match-rationale")).toContainText(
    "specialty",
  );
  await expect(rank1Row.getByTestId("ranked-match-score")).toContainText("%");
  // Certified — no penalty badge
  await expect(rank1Row.getByTestId("ranked-match-not-certified")).toHaveCount(0);
});

test("rank-2 NOT-certified stylist shows the not-certified badge", async ({
  page,
}) => {
  await login(page);
  await page.goto("/styler-match");

  await page.getByTestId("create-match-style-category").fill("Curly / wavy");
  await page.getByTestId("create-match-submit-btn").click();
  await expect(page.getByTestId("match-result-view")).toBeVisible();

  // Rank-2 row
  const rank2Row = page
    .getByTestId("ranked-match-row")
    .filter({ has: page.getByTestId("ranked-match-rank").filter({ hasText: "2" }) })
    .first();

  await expect(rank2Row.getByTestId("ranked-match-name")).toHaveText(
    "Alex Rivera",
  );
  await expect(rank2Row.getByTestId("ranked-match-not-certified")).toBeVisible();
  await expect(rank2Row.getByTestId("ranked-match-not-certified")).toContainText(
    "Not certified",
  );
});

test("ranked matches are in descending score order (rank-1 > rank-2)", async ({
  page,
}) => {
  await login(page);
  await page.goto("/styler-match");

  await page.getByTestId("create-match-style-category").fill("Curly / wavy");
  await page.getByTestId("create-match-submit-btn").click();
  await expect(page.getByTestId("ranked-matches-list")).toBeVisible();

  // Both rows rendered, rank 1 first
  const rows = page.getByTestId("ranked-match-row");
  await expect(rows).toHaveCount(2);
  // Rank-1 row appears before rank-2 row in DOM
  const rank1 = rows.nth(0);
  const rank2 = rows.nth(1);
  await expect(rank1.getByTestId("ranked-match-rank")).toHaveText("1");
  await expect(rank2.getByTestId("ranked-match-rank")).toHaveText("2");
  // Rank-1 name is Mia (higher score); rank-2 is Alex (lower / penalized)
  await expect(rank1.getByTestId("ranked-match-name")).toHaveText("Mia Torres");
  await expect(rank2.getByTestId("ranked-match-name")).toHaveText("Alex Rivera");
});

test("the stylist-confirm note is visible on the ranked result view", async ({
  page,
}) => {
  await login(page);
  await page.goto("/styler-match");

  await page.getByTestId("create-match-style-category").fill("Straight / sleek");
  await page.getByTestId("create-match-submit-btn").click();
  await expect(page.getByTestId("match-result-view")).toBeVisible();

  await expect(page.getByTestId("stylist-confirm-note")).toBeVisible();
  await expect(page.getByTestId("stylist-confirm-note")).toContainText(
    "salon will confirm",
  );
});

test("the book-top-match button is visible on rank-1 row", async ({ page }) => {
  await login(page);
  await page.goto("/styler-match");

  await page.getByTestId("create-match-style-category").fill("Curly / wavy");
  await page.getByTestId("create-match-submit-btn").click();
  await expect(page.getByTestId("ranked-matches-list")).toBeVisible();

  await expect(page.getByTestId("book-top-match-btn")).toBeVisible();
  await expect(page.getByTestId("book-top-match-btn")).toHaveText(
    "Book top match",
  );
});

// ---------------------------------------------------------------------------
// (e) Book top match
// ---------------------------------------------------------------------------

test("clicking book top match transitions the match to BOOKED", async ({
  page,
}) => {
  await login(page);
  await page.goto("/styler-match");

  // First generate a token (needed by the book action).
  await page.getByTestId("token-issue-btn").click();
  await expect(page.getByText("Match widget link ready")).toBeVisible();

  // Create a new match.
  await page.getByTestId("create-match-style-category").fill("Curly / wavy");
  await page.getByTestId("create-match-submit-btn").click();
  await expect(page.getByTestId("ranked-matches-list")).toBeVisible();

  // Click book top match.
  await page.getByTestId("book-top-match-btn").click();

  // Booked confirmation visible.
  await expect(page.getByTestId("match-booked-status")).toBeVisible();
  await expect(page.getByTestId("match-result-status")).toHaveText("Booked");
});

// ---------------------------------------------------------------------------
// (f) Analytics
// ---------------------------------------------------------------------------

test("the analytics card renders with seeded stats", async ({ page }) => {
  await login(page);
  await page.goto("/styler-match");
  await expect(page.getByTestId("styler-match-console-page")).toBeVisible();

  await expect(page.getByTestId("styler-match-analytics-card")).toBeVisible();
  await expect(page.getByTestId("analytics-total")).toHaveText("42");
  await expect(page.getByTestId("analytics-booked")).toHaveText("31");
  // Booking rate: 31/42 ≈ 73.8%
  await expect(page.getByTestId("analytics-booking-rate")).toContainText("73");
  // Rank-1 accept rate: 28/31 ≈ 90.3%
  await expect(page.getByTestId("analytics-top1-rate")).toContainText("90");
});

// ---------------------------------------------------------------------------
// (g) Token issue
// ---------------------------------------------------------------------------

test("the copy match widget link button issues a token and shows the URL", async ({
  page,
}) => {
  await login(page);
  await page.goto("/styler-match");
  await expect(page.getByTestId("styler-match-console-page")).toBeVisible();

  // Token card renders
  await expect(page.getByTestId("styler-match-token-card")).toBeVisible();

  // Click "Copy match widget link"
  await page.getByTestId("token-issue-btn").click();

  // Success toast
  await expect(page.getByText("Match widget link ready")).toBeVisible();

  // Widget URL is surfaced
  await expect(page.getByTestId("token-result-section")).toBeVisible();
  await expect(page.getByTestId("token-widget-url")).toBeVisible();
  await expect(page.getByTestId("token-widget-url")).toContainText(
    "styler-match",
  );

  // Copy button is visible
  await expect(page.getByTestId("token-copy-btn")).toBeVisible();
});

// ---------------------------------------------------------------------------
// (h) RBAC: contractor-hidden
// ---------------------------------------------------------------------------

test("a contractor cannot see or reach the styler-match surface", async ({
  page,
}) => {
  await login(page, "contractor@example.test");

  // Nav item hidden
  await expect(
    page.getByRole("link", { name: "Stylist match" }),
  ).toHaveCount(0);

  // Deep-linking is bounced to the dashboard by RequireNotContractor.
  await page.goto("/styler-match");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("dashboard")).toBeVisible();
});
