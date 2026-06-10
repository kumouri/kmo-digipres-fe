import { test, expect, type Page } from "@playwright/test";

// Home Services T8 "QuoteNow" — office quote-inbox + price-book config +
// token-issue smoke test.
//
// (a) Navigation: "Job estimates" and "Estimate settings" nav links are visible
//     to staff and absent for contractors.
//
// (b) Quote inbox list: three seeded quote cards render (condenser REPAIR/NEW,
//     furnace REPLACE/NEW, diagnostic ACCEPTED). Each card shows the price range
//     and the recommendation badge.
//
// (c) Quote detail: clicking a card opens the detail view — price range low–high,
//     estimate disclaimer, repair-vs-replace recommendation + rationale visible.
//     REPLACE card also shows the financing flag. Back button returns to the list.
//
// (d) Price-book config: the price book card renders with the seeded book name
//     and line items. Editing the diagnostic visit fee and saving round-trips
//     the PUT and shows a success toast.
//
// (e) Token issue: the "Generate quote link" button issues POST /quoting/tokens
//     and surfaces the widget URL.
//
// (f) RBAC: the surfaces are contractor-hidden.

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

test("instant quotes and quote settings nav items are visible to staff", async ({
  page,
}) => {
  await login(page);
  await expect(
    page.getByRole("link", { name: "Job estimates" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Estimate settings" }),
  ).toBeVisible();
});

test("the instant-quotes page mounts at /instant-quotes", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Job estimates" }).click();
  await expect(page).toHaveURL(/\/instant-quotes$/);
  await expect(page.getByTestId("quote-inbox-page")).toBeVisible();
});

test("the quote-settings page mounts at /quote-settings", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Estimate settings" }).click();
  await expect(page).toHaveURL(/\/quote-settings$/);
  await expect(page.getByTestId("price-book-config-page")).toBeVisible();
});

// ---------------------------------------------------------------------------
// (b) Quote inbox list
// ---------------------------------------------------------------------------

test("the quote inbox renders all three seeded cards", async ({ page }) => {
  await login(page);
  await page.goto("/instant-quotes");
  await expect(page.getByTestId("quote-inbox-page")).toBeVisible();
  await expect(page.getByTestId("quote-inbox-list")).toBeVisible();
  await expect(page.getByTestId("quote-inbox-card")).toHaveCount(3);
});

test("the REPAIR condenser card shows the correct price range", async ({
  page,
}) => {
  await login(page);
  await page.goto("/instant-quotes");
  await expect(page.getByTestId("quote-inbox-list")).toBeVisible();

  // First card (most recent) = condenser REPAIR NEW ($450 – $750)
  const firstCard = page.getByTestId("quote-inbox-card").first();
  await expect(firstCard.getByTestId("quote-card-equipment")).toHaveText(
    "Condenser",
  );
  await expect(firstCard.getByTestId("quote-card-range")).toContainText("$450");
  await expect(firstCard.getByTestId("quote-card-range")).toContainText("$750");
  await expect(firstCard.getByTestId("quote-card-recommendation")).toContainText(
    "Repair",
  );
  await expect(firstCard.getByTestId("quote-card-status")).toHaveText("New");
});

test("the REPLACE furnace card shows a recommendation badge", async ({
  page,
}) => {
  await login(page);
  await page.goto("/instant-quotes");
  await expect(page.getByTestId("quote-inbox-list")).toBeVisible();

  // Second card = furnace REPLACE NEW ($3,800 – $6,200)
  const secondCard = page.getByTestId("quote-inbox-card").nth(1);
  await expect(
    secondCard.getByTestId("quote-card-recommendation"),
  ).toContainText("Replace");
  await expect(secondCard.getByTestId("quote-card-status")).toHaveText("New");
});

test("the status filter shows only NEW quotes when selected", async ({
  page,
}) => {
  await login(page);
  await page.goto("/instant-quotes");
  await expect(page.getByTestId("quote-inbox-page")).toBeVisible();

  // The accepted quote has status ACCEPTED — after filtering to NEW, only 2 show.
  await page.getByTestId("quote-filter-new").click();
  await expect(page.getByTestId("quote-inbox-card")).toHaveCount(2);
});

test("the status filter shows an empty state when no quotes match", async ({
  page,
}) => {
  await login(page);
  await page.goto("/instant-quotes");
  await expect(page.getByTestId("quote-inbox-page")).toBeVisible();

  // Filter to BOOKED — no seeded quotes have BOOKED status.
  await page.getByTestId("quote-filter-booked").click();
  await expect(page.getByTestId("quote-inbox-empty")).toBeVisible();
});

// ---------------------------------------------------------------------------
// (c) Quote detail — price range + disclaimer + repair-vs-replace
// ---------------------------------------------------------------------------

test("clicking a card opens the detail view with range and disclaimer", async ({
  page,
}) => {
  await login(page);
  await page.goto("/instant-quotes");
  await expect(page.getByTestId("quote-inbox-list")).toBeVisible();

  // Click the first card (condenser REPAIR)
  await page.getByTestId("quote-inbox-card").first().click();
  await expect(page.getByTestId("quote-detail-view")).toBeVisible();

  // Price range is shown
  await expect(page.getByTestId("quote-detail-range")).toContainText("$450");
  await expect(page.getByTestId("quote-detail-range")).toContainText("$750");

  // Disclaimer is visible
  await expect(page.getByTestId("quote-detail-disclaimer")).toBeVisible();
  await expect(page.getByTestId("quote-detail-disclaimer")).toContainText(
    "estimate",
  );
});

test("the detail view shows the repair-vs-replace recommendation and rationale", async ({
  page,
}) => {
  await login(page);
  await page.goto("/instant-quotes");
  await expect(page.getByTestId("quote-inbox-list")).toBeVisible();

  await page.getByTestId("quote-inbox-card").first().click();
  await expect(page.getByTestId("quote-detail-view")).toBeVisible();

  // Recommendation badge is "Repair recommended"
  await expect(page.getByTestId("quote-detail-recommendation")).toContainText(
    "Repair",
  );

  // Rationale is shown
  await expect(page.getByTestId("quote-detail-rationale")).toBeVisible();
  await expect(page.getByTestId("quote-detail-rationale")).toContainText(
    "lifespan",
  );
});

test("the REPLACE detail shows the financing flag", async ({ page }) => {
  await login(page);
  await page.goto("/instant-quotes");
  await expect(page.getByTestId("quote-inbox-list")).toBeVisible();

  // Click the second card (furnace REPLACE, financingAvailable=true)
  await page.getByTestId("quote-inbox-card").nth(1).click();
  await expect(page.getByTestId("quote-detail-view")).toBeVisible();

  await expect(page.getByTestId("quote-detail-recommendation")).toContainText(
    "Replace",
  );
  await expect(page.getByTestId("quote-detail-financing")).toBeVisible();
  await expect(page.getByTestId("quote-detail-financing")).toContainText(
    "Financing",
  );
});

test("the back button returns to the inbox list", async ({ page }) => {
  await login(page);
  await page.goto("/instant-quotes");
  await expect(page.getByTestId("quote-inbox-list")).toBeVisible();

  await page.getByTestId("quote-inbox-card").first().click();
  await expect(page.getByTestId("quote-detail-view")).toBeVisible();

  await page.getByTestId("quote-detail-back").click();
  await expect(page.getByTestId("quote-inbox-list")).toBeVisible();
});

// ---------------------------------------------------------------------------
// (d) Price-book config
// ---------------------------------------------------------------------------

test("the price book card renders with the seeded book name", async ({
  page,
}) => {
  await login(page);
  await page.goto("/quote-settings");
  await expect(page.getByTestId("price-book-config-page")).toBeVisible();
  await expect(page.getByTestId("price-book-card")).toBeVisible();

  // The seeded book name appears in the name field
  await expect(page.getByTestId("price-book-name")).toHaveValue(
    "Comfort Air HVAC — 2026 price book",
  );
});

test("the price book shows the seeded line items", async ({ page }) => {
  await login(page);
  await page.goto("/quote-settings");
  await expect(page.getByTestId("price-book-card")).toBeVisible();

  // Two seeded line items
  await expect(page.getByTestId("price-book-line-item")).toHaveCount(2);
});

test("editing the diagnostic visit fee and saving round-trips the PUT", async ({
  page,
}) => {
  await login(page);
  await page.goto("/quote-settings");
  await expect(page.getByTestId("price-book-card")).toBeVisible();

  // Edit the diagnostic visit low fee
  await page.getByTestId("diag-visit-low").fill("99");

  // The form is dirty — save button is enabled
  await expect(page.getByTestId("price-book-save-btn")).toBeEnabled();
  await page.getByTestId("price-book-save-btn").click();

  // Success toast appears
  await expect(page.getByText("Price book saved.")).toBeVisible();
});

test("when no price book exists the empty-state banner renders", async ({
  page,
}) => {
  // Log in so the MSW service worker is running.
  await login(page);

  // Use the test-control MSW endpoint to clear the price book store. The fetch
  // must use the same origin as the API calls (localhost:8080) so MSW's SW
  // intercepts it. The token is read from localStorage where the auth client
  // stores it (TOKEN_STORAGE_KEY = "kmosf.jwt").
  await page.evaluate(async () => {
    const token = localStorage.getItem("kmosf.jwt") ?? "";
    await fetch("http://localhost:8080/api/v1/quoting/price-book/test-clear", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  });

  // SPA navigation — click the nav link (no full page reload, so the cleared
  // MSW store state is preserved for the subsequent price-book GET).
  await page.getByRole("link", { name: "Estimate settings" }).click();
  await expect(page).toHaveURL(/\/quote-settings$/);
  await expect(page.getByTestId("price-book-config-page")).toBeVisible();

  // The empty-state banner is shown.
  await expect(page.getByTestId("price-book-empty-state")).toBeVisible();

  // The editor form is still rendered (admin can do initial setup).
  await expect(page.getByTestId("price-book-form")).toBeVisible();
});

// ---------------------------------------------------------------------------
// (e) Token issue
// ---------------------------------------------------------------------------

test("the generate quote link button issues a token and shows the widget URL", async ({
  page,
}) => {
  await login(page);
  await page.goto("/quote-settings");
  await expect(page.getByTestId("price-book-config-page")).toBeVisible();

  // The token-issue card renders
  await expect(page.getByTestId("token-issue-card")).toBeVisible();

  // Click "Generate quote link"
  await page.getByTestId("token-issue-btn").click();

  // Success toast
  await expect(page.getByText("Widget link ready")).toBeVisible();

  // Widget URL is surfaced
  await expect(page.getByTestId("token-result-section")).toBeVisible();
  await expect(page.getByTestId("token-widget-url")).toBeVisible();
  await expect(page.getByTestId("token-widget-url")).toContainText(
    "quote-intake",
  );

  // Copy button is visible
  await expect(page.getByTestId("token-copy-btn")).toBeVisible();
});

// ---------------------------------------------------------------------------
// (f) RBAC: contractor-hidden
// ---------------------------------------------------------------------------

test("a contractor cannot see or reach the instant-quotes surface", async ({
  page,
}) => {
  await login(page, "contractor@example.test");

  // Nav items hidden
  await expect(
    page.getByRole("link", { name: "Job estimates" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Estimate settings" }),
  ).toHaveCount(0);

  // Deep-linking is bounced to the dashboard by RequireNotContractor.
  await page.goto("/instant-quotes");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("dashboard")).toBeVisible();
});

test("a contractor cannot reach the quote-settings surface", async ({
  page,
}) => {
  await login(page, "contractor@example.test");

  await page.goto("/quote-settings");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("dashboard")).toBeVisible();
});
