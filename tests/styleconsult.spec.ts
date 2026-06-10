import { test, expect, type Page } from "@playwright/test";

// Salon T9 "StyleConsult AI" — staff consult-inbox + analytics + token-issue
// smoke test.
//
// (a) Navigation: "Style consults" nav link is visible to staff and absent for
//     contractors.
//
// (b) Consult inbox list: three seeded consult cards render (Brianna NEW/VISION,
//     Chloe NEW/MANUAL, Devon BOOKED). Each card shows the style category, service
//     count, and retail count.
//
// (c) Status filter: NEW filter shows only 2 cards; BOOKED filter shows 1 card;
//     empty state renders when no cards match.
//
// (d) Consult detail — assessment + recs + "stylist will confirm":
//     - The style assessment card shows category, length, texture, color, source.
//     - The "stylist will confirm" guardrail note is visible.
//     - Service recommendations are listed.
//     - Retail recommendations are ranked by margin (highest first).
//     - The back button returns to the inbox list.
//
// (e) Retail-attach analytics: the analytics card renders with the seeded stats.
//
// (f) Token issue: the "Generate consult link" button issues POST
//     /styleconsult/tokens and surfaces the widget URL.
//
// (g) RBAC: the surface is contractor-hidden.

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

test("style-consults nav item is visible to staff", async ({ page }) => {
  await login(page);
  await expect(
    page.getByRole("link", { name: "Style consults" }),
  ).toBeVisible();
});

test("the style-consults page mounts at /style-consults", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Style consults" }).click();
  await expect(page).toHaveURL(/\/style-consults$/);
  await expect(page.getByTestId("style-consult-inbox-page")).toBeVisible();
});

// ---------------------------------------------------------------------------
// (b) Consult inbox list
// ---------------------------------------------------------------------------

test("the consult inbox renders all three seeded cards", async ({ page }) => {
  await login(page);
  await page.goto("/style-consults");
  await expect(page.getByTestId("style-consult-inbox-page")).toBeVisible();
  await expect(page.getByTestId("style-consult-inbox-list")).toBeVisible();
  await expect(page.getByTestId("style-consult-card")).toHaveCount(3);
});

test("the Brianna card shows the correct category and counts", async ({
  page,
}) => {
  await login(page);
  await page.goto("/style-consults");
  await expect(page.getByTestId("style-consult-inbox-list")).toBeVisible();

  // First card (most recent) = Brianna NEW
  const firstCard = page.getByTestId("style-consult-card").first();
  await expect(
    firstCard.getByTestId("style-consult-card-category"),
  ).toHaveText("Curly / wavy");
  await expect(
    firstCard.getByTestId("style-consult-card-status"),
  ).toHaveText("New");
  await expect(
    firstCard.getByTestId("style-consult-card-service-count"),
  ).toContainText("2 services");
  await expect(
    firstCard.getByTestId("style-consult-card-retail-count"),
  ).toContainText("3 retail items");
});

test("the Devon card shows BOOKED status", async ({ page }) => {
  await login(page);
  await page.goto("/style-consults");
  await expect(page.getByTestId("style-consult-inbox-list")).toBeVisible();

  // Third card (oldest) = Devon BOOKED
  const thirdCard = page.getByTestId("style-consult-card").nth(2);
  await expect(
    thirdCard.getByTestId("style-consult-card-status"),
  ).toHaveText("Booked");
});

// ---------------------------------------------------------------------------
// (c) Status filter
// ---------------------------------------------------------------------------

test("the NEW filter shows only 2 cards", async ({ page }) => {
  await login(page);
  await page.goto("/style-consults");
  await expect(page.getByTestId("style-consult-inbox-page")).toBeVisible();

  await page.getByTestId("style-consult-filter-new").click();
  await expect(page.getByTestId("style-consult-card")).toHaveCount(2);
});

test("the BOOKED filter shows only 1 card", async ({ page }) => {
  await login(page);
  await page.goto("/style-consults");
  await expect(page.getByTestId("style-consult-inbox-page")).toBeVisible();

  await page.getByTestId("style-consult-filter-booked").click();
  await expect(page.getByTestId("style-consult-card")).toHaveCount(1);
});

// ---------------------------------------------------------------------------
// (d) Consult detail — assessment + recs + "stylist will confirm"
// ---------------------------------------------------------------------------

test("clicking a card opens the detail with assessment and service recs", async ({
  page,
}) => {
  await login(page);
  await page.goto("/style-consults");
  await expect(page.getByTestId("style-consult-inbox-list")).toBeVisible();

  // Click first card (Brianna)
  await page.getByTestId("style-consult-card").first().click();
  await expect(page.getByTestId("style-consult-detail-view")).toBeVisible();

  // Assessment card
  await expect(page.getByTestId("style-consult-assessment-card")).toBeVisible();
  await expect(page.getByTestId("style-consult-category")).toHaveText(
    "Curly / wavy",
  );
  await expect(page.getByTestId("style-consult-length")).toContainText("shoulder");
  await expect(page.getByTestId("style-consult-texture")).toContainText("Curly");
  await expect(page.getByTestId("style-consult-source")).toContainText("Inspiration photo");
  await expect(page.getByTestId("style-consult-confidence")).toContainText("89%");
});

test("the stylist-confirm guardrail note is visible on the detail view", async ({
  page,
}) => {
  await login(page);
  await page.goto("/style-consults");
  await expect(page.getByTestId("style-consult-inbox-list")).toBeVisible();

  await page.getByTestId("style-consult-card").first().click();
  await expect(page.getByTestId("style-consult-detail-view")).toBeVisible();

  await expect(page.getByTestId("stylist-confirm-note")).toBeVisible();
  await expect(page.getByTestId("stylist-confirm-note")).toContainText(
    "stylist will confirm",
  );
});

test("service recommendations are listed in the detail view", async ({
  page,
}) => {
  await login(page);
  await page.goto("/style-consults");
  await expect(page.getByTestId("style-consult-inbox-list")).toBeVisible();

  await page.getByTestId("style-consult-card").first().click();
  await expect(page.getByTestId("service-recs-list")).toBeVisible();

  // Brianna has 2 service recommendations
  await expect(page.getByTestId("service-rec-row")).toHaveCount(2);
  await expect(
    page.getByTestId("service-rec-row").first().getByTestId("service-rec-name"),
  ).toHaveText("Curl Cut & Shape");
});

test("retail recommendations are visible and ranked by margin (highest first)", async ({
  page,
}) => {
  await login(page);
  await page.goto("/style-consults");
  await expect(page.getByTestId("style-consult-inbox-list")).toBeVisible();

  await page.getByTestId("style-consult-card").first().click();
  await expect(page.getByTestId("retail-recs-list")).toBeVisible();

  // Brianna has 3 retail items; first = highest margin (Curl Defining Serum, $17.50)
  const retailRows = page.getByTestId("retail-rec-row");
  await expect(retailRows).toHaveCount(3);

  // First row = highest margin
  const firstRetail = retailRows.first();
  await expect(firstRetail.getByTestId("retail-rec-name")).toHaveText(
    "Curl Defining Serum",
  );
  await expect(firstRetail.getByTestId("retail-rec-margin")).toContainText(
    "$17.50",
  );

  // Last row = lowest margin
  const lastRetail = retailRows.last();
  await expect(lastRetail.getByTestId("retail-rec-name")).toHaveText(
    "Humidity-Blocking Hold Mist",
  );
  await expect(lastRetail.getByTestId("retail-rec-margin")).toContainText(
    "$8.00",
  );
});

test("the back button returns to the inbox list", async ({ page }) => {
  await login(page);
  await page.goto("/style-consults");
  await expect(page.getByTestId("style-consult-inbox-list")).toBeVisible();

  await page.getByTestId("style-consult-card").first().click();
  await expect(page.getByTestId("style-consult-detail-view")).toBeVisible();

  await page.getByTestId("style-consult-detail-back").click();
  await expect(page.getByTestId("style-consult-inbox-list")).toBeVisible();
});

// ---------------------------------------------------------------------------
// (e) Retail-attach analytics
// ---------------------------------------------------------------------------

test("the analytics card renders with seeded stats", async ({ page }) => {
  await login(page);
  await page.goto("/style-consults");
  await expect(page.getByTestId("style-consult-inbox-page")).toBeVisible();

  await expect(page.getByTestId("style-consult-analytics-card")).toBeVisible();
  await expect(page.getByTestId("analytics-total")).toHaveText("28");
  await expect(page.getByTestId("analytics-booked")).toHaveText("12");
  // Retail attach rate: 10/12 ≈ 83.3%
  await expect(page.getByTestId("analytics-attach-rate")).toContainText("83");
});

// ---------------------------------------------------------------------------
// (f) Token issue
// ---------------------------------------------------------------------------

test("the generate consult link button issues a token and shows the widget URL", async ({
  page,
}) => {
  await login(page);
  await page.goto("/style-consults");
  await expect(page.getByTestId("style-consult-inbox-page")).toBeVisible();

  // Token issue card renders
  await expect(page.getByTestId("token-issue-card")).toBeVisible();

  // Click "Generate consult link"
  await page.getByTestId("token-issue-btn").click();

  // Success toast
  await expect(page.getByText("Consult link ready")).toBeVisible();

  // Widget URL is surfaced
  await expect(page.getByTestId("token-result-section")).toBeVisible();
  await expect(page.getByTestId("token-widget-url")).toBeVisible();
  await expect(page.getByTestId("token-widget-url")).toContainText(
    "style-consult",
  );

  // Copy button is visible
  await expect(page.getByTestId("token-copy-btn")).toBeVisible();
});

// ---------------------------------------------------------------------------
// (g) RBAC: contractor-hidden
// ---------------------------------------------------------------------------

test("a contractor cannot see or reach the style-consults surface", async ({
  page,
}) => {
  await login(page, "contractor@example.test");

  // Nav item hidden
  await expect(
    page.getByRole("link", { name: "Style consults" }),
  ).toHaveCount(0);

  // Deep-linking is bounced to the dashboard by RequireNotContractor.
  await page.goto("/style-consults");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("dashboard")).toBeVisible();
});
