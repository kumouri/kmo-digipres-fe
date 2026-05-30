import { test, expect, type Page } from "@playwright/test";

const SMOKE_EMAIL = "smoke@example.test";
const SMOKE_PASSWORD = "hunter2hunter2";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(SMOKE_EMAIL);
  await page.getByLabel("Password").fill(SMOKE_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("dashboard")).toBeVisible();
}

// ---------------------------------------------------------------------------
// Recurring Invoices list
// ---------------------------------------------------------------------------

test("recurring invoices nav item is visible", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("link", { name: "Recurring Invoices" })).toBeVisible();
});

test("recurring invoices list renders the seeded entry", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Recurring Invoices" }).click();
  await expect(page).toHaveURL(/\/recurring-invoices$/);
  await expect(page.getByTestId("recurring-invoices-page")).toBeVisible();
  await expect(page.getByTestId("recurring-row-name").first()).toContainText(
    "Monthly retainer",
  );
});

test("recurring invoices list shows ACTIVE badge for seeded entry", async ({ page }) => {
  await login(page);
  await page.goto("/recurring-invoices");
  await expect(page.getByTestId("recurring-invoices-page")).toBeVisible();
  await expect(page.getByText("Active")).toBeVisible();
});

// ---------------------------------------------------------------------------
// Create → detail navigation
// ---------------------------------------------------------------------------

test("creating a recurring invoice navigates to its detail", async ({ page }) => {
  await login(page);
  await page.goto("/recurring-invoices");
  await page.getByTestId("new-recurring-invoice").click();
  await page.getByTestId("recurring-name-input").fill("Test monthly");
  await page.getByTestId("create-recurring-submit").click();
  await expect(page.getByTestId("recurring-invoice-detail")).toBeVisible();
});

// ---------------------------------------------------------------------------
// Detail page
// ---------------------------------------------------------------------------

test("clicking a recurring invoice row opens the detail", async ({ page }) => {
  await login(page);
  await page.goto("/recurring-invoices");
  await page.getByTestId("recurring-row-name").first().click();
  await expect(page.getByTestId("recurring-invoice-detail")).toBeVisible();
});

test("recurring invoice detail shows status badge", async ({ page }) => {
  await login(page);
  await page.goto("/recurring-invoices");
  await page.getByTestId("recurring-row-name").first().click();
  await expect(page.getByTestId("recurring-invoice-detail")).toBeVisible();
  await expect(page.getByTestId("recurring-status")).toBeVisible();
});

test("recurring invoice detail shows Pause button when ACTIVE", async ({ page }) => {
  await login(page);
  await page.goto("/recurring-invoices");
  await page.getByTestId("recurring-row-name").first().click();
  await expect(page.getByTestId("recurring-invoice-detail")).toBeVisible();
  await expect(page.getByTestId("recurring-pause-btn")).toBeVisible();
});

test("recurring invoice detail shows Spawn now button", async ({ page }) => {
  await login(page);
  await page.goto("/recurring-invoices");
  await page.getByTestId("recurring-row-name").first().click();
  await expect(page.getByTestId("recurring-invoice-detail")).toBeVisible();
  await expect(page.getByTestId("recurring-spawn-now-btn")).toBeVisible();
});

// ---------------------------------------------------------------------------
// Status lifecycle: Pause → Resume → End
// ---------------------------------------------------------------------------

test("pausing an ACTIVE recurring invoice transitions status to PAUSED", async ({
  page,
}) => {
  await login(page);
  await page.goto("/recurring-invoices");
  await page.getByTestId("recurring-row-name").first().click();
  await expect(page.getByTestId("recurring-status")).toHaveText("Active");
  await page.getByTestId("recurring-pause-btn").click();
  await expect(page.getByTestId("recurring-status")).toHaveText("Paused");
});

test("resuming a PAUSED recurring invoice transitions status to ACTIVE", async ({
  page,
}) => {
  await login(page);
  // Create a new one and pause it first
  await page.goto("/recurring-invoices");
  await page.getByTestId("new-recurring-invoice").click();
  await page.getByTestId("recurring-name-input").fill("Pause-resume test");
  await page.getByTestId("create-recurring-submit").click();
  await expect(page.getByTestId("recurring-invoice-detail")).toBeVisible();
  await expect(page.getByTestId("recurring-status")).toHaveText("Active");
  await page.getByTestId("recurring-pause-btn").click();
  await expect(page.getByTestId("recurring-status")).toHaveText("Paused");
  await page.getByTestId("recurring-resume-btn").click();
  await expect(page.getByTestId("recurring-status")).toHaveText("Active");
});

test("ending a recurring invoice transitions status to ENDED", async ({ page }) => {
  await login(page);
  await page.goto("/recurring-invoices");
  await page.getByTestId("new-recurring-invoice").click();
  await page.getByTestId("recurring-name-input").fill("End test");
  await page.getByTestId("create-recurring-submit").click();
  await expect(page.getByTestId("recurring-invoice-detail")).toBeVisible();
  await page.getByTestId("recurring-end-btn").click();
  await expect(page.getByTestId("recurring-status")).toHaveText("Ended");
});

test("ENDED recurring invoice hides action buttons", async ({ page }) => {
  await login(page);
  await page.goto("/recurring-invoices");
  await page.getByTestId("new-recurring-invoice").click();
  await page.getByTestId("create-recurring-submit").click();
  await expect(page.getByTestId("recurring-invoice-detail")).toBeVisible();
  await page.getByTestId("recurring-end-btn").click();
  await expect(page.getByTestId("recurring-status")).toHaveText("Ended");
  await expect(page.getByTestId("recurring-pause-btn")).not.toBeVisible();
  await expect(page.getByTestId("recurring-spawn-now-btn")).not.toBeVisible();
});

// ---------------------------------------------------------------------------
// Spawn now
// ---------------------------------------------------------------------------

test("spawn-now button triggers a success toast", async ({ page }) => {
  await login(page);
  await page.goto("/recurring-invoices");
  await page.getByTestId("recurring-row-name").first().click();
  await expect(page.getByTestId("recurring-invoice-detail")).toBeVisible();
  await page.getByTestId("recurring-spawn-now-btn").click();
  await expect(page.getByText("Invoice spawned")).toBeVisible();
});

// ---------------------------------------------------------------------------
// Stripe Checkout on InvoiceDetail
// ---------------------------------------------------------------------------

test("invoice detail shows Generate payment link button for SENT invoice", async ({
  page,
}) => {
  await login(page);
  await page.goto("/invoices");
  await page.getByTestId("invoice-row-number").first().click();
  await expect(page.getByTestId("invoice-detail")).toBeVisible();
  // Seeded invoice is SENT
  await expect(page.getByTestId("invoice-stripe-checkout-btn")).toBeVisible();
});

test("generate payment link shows checkout URL", async ({ page }) => {
  await login(page);
  await page.goto("/invoices");
  await page.getByTestId("invoice-row-number").first().click();
  await expect(page.getByTestId("invoice-detail")).toBeVisible();
  await page.getByTestId("invoice-stripe-checkout-btn").click();
  await expect(page.getByTestId("invoice-checkout-url")).toBeVisible();
  await expect(page.getByTestId("invoice-checkout-url")).toContainText(
    "checkout.stripe.com",
  );
});
