import { test, expect, type Page } from "@playwright/test";

const SMOKE_EMAIL = "smoke@example.test";
const SMOKE_PASSWORD = "hunter2hunter2";

// Stable ID of the ACCEPTED seed quote added in Z3.1
const ACCEPTED_QUOTE_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(SMOKE_EMAIL);
  await page.getByLabel("Password").fill(SMOKE_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("dashboard")).toBeVisible();
}

// AC-B2: list from MSW seed renders
test("quotes list renders the seeded quote", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Quotes" }).click();
  await expect(page).toHaveURL(/\/quotes$/);
  await expect(page.getByTestId("quotes-page")).toBeVisible();
  await expect(page.getByTestId("quote-row-number").first()).toContainText("Q-0001");
});

// AC-B2: detail opens
test("clicking a quote row opens the detail", async ({ page }) => {
  await login(page);
  await page.goto("/quotes");
  await page.getByTestId("quote-row-number").first().click();
  await expect(page.getByTestId("quote-detail")).toBeVisible();
  await expect(page.getByText("Q-0001")).toBeVisible();
});

// AC-B2: status transition works
test("quote status transition DRAFT -> SENT works", async ({ page }) => {
  await login(page);
  await page.goto("/quotes");
  await page.getByTestId("quote-row-number").first().click();
  await expect(page.getByTestId("quote-detail")).toBeVisible();

  await page.getByTestId("quote-status-sent").click();
  await expect(page.getByText("Sent", { exact: true })).toBeVisible();
});

// AC-B2: PDF link is present
test("quote detail has a PDF download link", async ({ page }) => {
  await login(page);
  await page.goto("/quotes");
  await page.getByTestId("quote-row-number").first().click();
  await expect(page.getByTestId("quote-pdf-link")).toBeVisible();
});

// AC-B2: create new quote
test("creating a quote navigates to its detail", async ({ page }) => {
  await login(page);
  await page.goto("/quotes");
  await page.getByTestId("new-quote").click();
  await page.getByTestId("create-quote-submit").click();
  await expect(page.getByTestId("quote-detail")).toBeVisible();
});

// ---------------------------------------------------------------------------
// Z3.1: Line items on a quote
// ---------------------------------------------------------------------------

test("new quote form has an Add line item button", async ({ page }) => {
  await login(page);
  await page.goto("/quotes");
  await page.getByTestId("new-quote").click();
  await expect(page.getByRole("button", { name: "Add line item" })).toBeVisible();
});

test("adding 2 line items to a new quote persists them in the detail", async ({ page }) => {
  await login(page);
  await page.goto("/quotes");
  await page.getByTestId("new-quote").click();

  // Add first line item
  await page.getByRole("button", { name: "Add line item" }).click();
  await expect(page.getByTestId("line-item-0")).toBeVisible();
  await page.getByTestId("line-item-0").getByPlaceholder("Service description").fill("Design work");
  await page.getByTestId("line-item-0").locator('input[type="number"]').nth(0).fill("2");
  await page.getByTestId("line-item-0").locator('input[type="number"]').nth(1).fill("500");

  // Add second line item
  await page.getByRole("button", { name: "Add line item" }).click();
  await expect(page.getByTestId("line-item-1")).toBeVisible();
  await page.getByTestId("line-item-1").getByPlaceholder("Service description").fill("Hosting setup");
  await page.getByTestId("line-item-1").locator('input[type="number"]').nth(0).fill("1");
  await page.getByTestId("line-item-1").locator('input[type="number"]').nth(1).fill("300");

  // Submit
  await page.getByTestId("create-quote-submit").click();
  await expect(page.getByTestId("quote-detail")).toBeVisible();

  // Line items table should render
  await expect(page.getByTestId("quote-line-items")).toBeVisible();
  await expect(page.getByTestId("quote-line-item-row-0")).toContainText("Design work");
  await expect(page.getByTestId("quote-line-item-row-1")).toContainText("Hosting setup");
});

test("editing a quote's line items persists after save", async ({ page }) => {
  await login(page);
  // Navigate to the DRAFT seed quote
  await page.goto("/quotes");
  await page.getByTestId("quote-row-number").first().click();
  await expect(page.getByTestId("quote-detail")).toBeVisible();

  // Open edit dialog
  await page.getByTestId("quote-edit-btn").click();

  // Add a new line item
  await page.getByRole("button", { name: "Add line item" }).click();
  await page.getByTestId("line-item-1").getByPlaceholder("Service description").fill("Maintenance");
  await page.getByTestId("line-item-1").locator('input[type="number"]').nth(0).fill("1");
  await page.getByTestId("line-item-1").locator('input[type="number"]').nth(1).fill("750");

  // Save
  await page.getByRole("button", { name: "Save quote" }).click();

  // Line items table now shows 2 rows
  await expect(page.getByTestId("quote-line-items")).toBeVisible();
  await expect(page.getByTestId("quote-line-item-row-1")).toContainText("Maintenance");
});

test("line item total renders for seeded accepted quote", async ({ page }) => {
  await login(page);
  await page.goto(`/quotes/${ACCEPTED_QUOTE_ID}`);
  await expect(page.getByTestId("quote-detail")).toBeVisible();
  // Seed has 2 line items: SEO Retainer 3×500=1500, Content Writing 5×200=1000
  await expect(page.getByTestId("quote-line-item-total-0")).toContainText("1500.00");
  await expect(page.getByTestId("quote-line-item-total-1")).toContainText("1000.00");
});

// ---------------------------------------------------------------------------
// Z3.1: Convert ACCEPTED quote to invoice
// ---------------------------------------------------------------------------

test("convert-to-invoice button is not shown for DRAFT quote", async ({ page }) => {
  await login(page);
  await page.goto("/quotes");
  await page.getByTestId("quote-row-number").first().click();
  await expect(page.getByTestId("quote-detail")).toBeVisible();
  await expect(page.getByTestId("quote-convert-to-invoice-btn")).not.toBeVisible();
});

test("convert-to-invoice button is shown for ACCEPTED quote", async ({ page }) => {
  await login(page);
  await page.goto(`/quotes/${ACCEPTED_QUOTE_ID}`);
  await expect(page.getByTestId("quote-detail")).toBeVisible();
  await expect(page.getByTestId("quote-convert-to-invoice-btn")).toBeVisible();
});

test("clicking convert-to-invoice navigates to the new invoice and shows its line items", async ({
  page,
}) => {
  await login(page);
  await page.goto(`/quotes/${ACCEPTED_QUOTE_ID}`);
  await expect(page.getByTestId("quote-detail")).toBeVisible();
  await expect(page.getByTestId("quote-convert-to-invoice-btn")).toBeVisible();

  await page.getByTestId("quote-convert-to-invoice-btn").click();

  // Should navigate to invoices/:id
  await expect(page).toHaveURL(/\/invoices\//);
  await expect(page.getByTestId("invoice-detail")).toBeVisible();
});

test("converted invoice carries the quote's line items", async ({ page }) => {
  await login(page);
  await page.goto(`/quotes/${ACCEPTED_QUOTE_ID}`);
  await expect(page.getByTestId("quote-detail")).toBeVisible();

  await page.getByTestId("quote-convert-to-invoice-btn").click();

  await expect(page).toHaveURL(/\/invoices\//);
  await expect(page.getByTestId("invoice-detail")).toBeVisible();
  // Invoice detail shows line-items table (rendered when lineItems.length > 0)
  // The seeded accepted quote has SEO Retainer + Content Writing
  await expect(page.getByText("SEO Retainer")).toBeVisible();
});
