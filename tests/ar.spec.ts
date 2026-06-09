import { test, expect, type Page } from "@playwright/test";

// AR — Accounts Receivable / Collections module — the AR-aging dashboard.
//
// (a) AR-aging page (/ar-aging): the headline KPI cards — one per aging bucket
//     (CURRENT / D1_7 / D8_14 / D15_30 / D30_PLUS) with their human-readable
//     labels and a grand-total-past-due badge. MSW seeds a realistic report
//     ($24,950 past due across 4 buckets).
//
// (b) Promise-to-pay: selecting a past-due invoice from the picker shows any
//     promises on file; the "Record a promise to pay" dialog POSTs /ar/promises
//     and adds the new promise to the list.
//
// (c) RBAC: the AR-aging tab is staff-visible and contractor-hidden.
//
// All tests are staff-visible + contractor-hidden (the BE /ar/* routes are
// STAFF + ar-module-gated). The store resets per page load, so each test is
// deterministic.

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
// (a) AR-aging buckets
// ---------------------------------------------------------------------------

test("AR aging nav item is visible to staff", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("link", { name: "AR aging" })).toBeVisible();
});

test("the AR-aging page renders all five buckets with human-readable labels", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: "AR aging" }).click();
  await expect(page).toHaveURL(/\/ar-aging$/);
  await expect(page.getByTestId("ar-aging-page")).toBeVisible();

  // All five buckets render.
  await expect(page.getByTestId("ar-aging-bucket-card")).toHaveCount(5);

  // Human-readable bucket labels — no raw enum codes.
  await expect(page.getByText("Not yet due")).toBeVisible();
  await expect(page.getByText("1–7 days past due")).toBeVisible();
  await expect(page.getByText("8–14 days past due")).toBeVisible();
  await expect(page.getByText("15–30 days past due")).toBeVisible();
  await expect(page.getByText("30+ days past due")).toBeVisible();
});

test("the grand-total-past-due badge shows the seeded $24,950 total", async ({
  page,
}) => {
  await login(page);
  await page.goto("/ar-aging");
  await expect(page.getByTestId("ar-aging-page")).toBeVisible();

  // The seeded grandTotalPastDue = 24950 USD — the badge calls it out.
  await expect(page.getByTestId("ar-grand-total-badge")).toContainText(
    "$24,950.00",
  );
  await expect(page.getByTestId("ar-grand-total-badge")).toContainText(
    "past due",
  );
});

test("each bucket card shows its invoice count and balance", async ({
  page,
}) => {
  await login(page);
  await page.goto("/ar-aging");
  await expect(page.getByTestId("ar-aging-buckets")).toBeVisible();

  // D30_PLUS bucket — seeded with 2 invoices / $12,500.
  const d30Card = page
    .getByTestId("ar-aging-bucket-card")
    .filter({ has: page.getByText("30+ days past due") });
  await expect(d30Card.getByTestId("ar-bucket-count-badge")).toContainText(
    "2 invoices",
  );
  await expect(d30Card.getByTestId("ar-bucket-total")).toContainText(
    "$12,500.00",
  );

  // D1_7 bucket — seeded with 2 invoices / $3,450.
  const d17Card = page
    .getByTestId("ar-aging-bucket-card")
    .filter({ has: page.getByText("1–7 days past due") });
  await expect(d17Card.getByTestId("ar-bucket-count-badge")).toContainText(
    "2 invoices",
  );
  await expect(d17Card.getByTestId("ar-bucket-total")).toContainText(
    "$3,450.00",
  );

  // CURRENT bucket — seeded with 0.
  const currentCard = page
    .getByTestId("ar-aging-bucket-card")
    .filter({ has: page.getByText("Not yet due") });
  await expect(currentCard.getByTestId("ar-bucket-count-badge")).toContainText(
    "None",
  );
});

// ---------------------------------------------------------------------------
// (b) Promise-to-pay
// ---------------------------------------------------------------------------

test("selecting an invoice shows its seeded promises", async ({ page }) => {
  await login(page);
  await page.goto("/ar-aging");
  await expect(page.getByTestId("ar-aging-page")).toBeVisible();

  // The invoice selector should be present (invoices list loads in mock mode).
  // If the selector rendered as a dropdown, open it and pick INV-1042.
  const selectTrigger = page.getByTestId("ar-invoice-select");
  if (await selectTrigger.isVisible()) {
    await selectTrigger.click();
    await page
      .getByTestId("ar-invoice-option")
      .filter({ hasText: "INV-1042" })
      .click();
  } else {
    // Fallback text input (no invoices in mock)
    await page
      .getByTestId("ar-invoice-id-input")
      .fill("ar000000-0000-0000-0000-000000000001");
  }

  // The seeded ACTIVE promise for INV-1042 renders.
  await expect(page.getByTestId("promises-list")).toBeVisible();
  await expect(page.getByTestId("promise-row")).toHaveCount(1);
  await expect(page.getByTestId("promise-date").first()).toContainText(
    "2026-06-15",
  );
  // Friendly status label — not "ACTIVE".
  await expect(page.getByTestId("promise-status-badge").first()).toContainText(
    "Promised",
  );
});

test("the record-promise dialog is accessible once an invoice is selected", async ({
  page,
}) => {
  await login(page);
  await page.goto("/ar-aging");
  await expect(page.getByTestId("ar-aging-page")).toBeVisible();

  // Before selection, the record button is absent (no invoice chosen yet).
  await expect(page.getByTestId("promise-dialog-open")).toHaveCount(0);

  // Select an invoice.
  const selectTrigger = page.getByTestId("ar-invoice-select");
  if (await selectTrigger.isVisible()) {
    await selectTrigger.click();
    await page
      .getByTestId("ar-invoice-option")
      .filter({ hasText: "INV-1042" })
      .click();
  } else {
    await page
      .getByTestId("ar-invoice-id-input")
      .fill("ar000000-0000-0000-0000-000000000001");
  }

  // Now the record button appears.
  await expect(page.getByTestId("promise-dialog-open")).toBeVisible();
});

test("recording a promise adds it to the list", async ({ page }) => {
  await login(page);
  await page.goto("/ar-aging");
  await expect(page.getByTestId("ar-aging-page")).toBeVisible();

  // Select invoice INV-1042 (1 seeded promise).
  const selectTrigger = page.getByTestId("ar-invoice-select");
  if (await selectTrigger.isVisible()) {
    await selectTrigger.click();
    await page
      .getByTestId("ar-invoice-option")
      .filter({ hasText: "INV-1042" })
      .click();
  } else {
    await page
      .getByTestId("ar-invoice-id-input")
      .fill("ar000000-0000-0000-0000-000000000001");
  }
  await expect(page.getByTestId("promise-row")).toHaveCount(1);

  // Open the dialog.
  await page.getByTestId("promise-dialog-open").click();
  await expect(page.getByTestId("promise-dialog")).toBeVisible();

  // Submit is disabled until a date is picked.
  await expect(page.getByTestId("promise-submit")).toBeDisabled();
  await page.getByTestId("promise-date-input").fill("2026-06-30");
  await page.getByTestId("promise-note-input").fill("Agreed on call, pays Friday.");
  await expect(page.getByTestId("promise-submit")).toBeEnabled();

  await page.getByTestId("promise-submit").click();
  // Dialog closes, promise list grows to 2.
  await expect(page.getByTestId("promise-dialog")).toHaveCount(0);
  await expect(page.getByTestId("promise-row")).toHaveCount(2);
});

// ---------------------------------------------------------------------------
// RBAC: a scoped-down contractor sees none of the AR surfaces
// ---------------------------------------------------------------------------

test("a contractor cannot see or reach the AR-aging surface", async ({
  page,
}) => {
  // contractor@example.test is STAFF + CONTRACTOR (no ADMIN) — scoped down.
  await login(page, "contractor@example.test");

  // The nav item is hidden…
  await expect(page.getByRole("link", { name: "AR aging" })).toHaveCount(0);

  // …and deep-linking is bounced to the dashboard by RequireNotContractor.
  await page.goto("/ar-aging");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("dashboard")).toBeVisible();
});
