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
  await expect(page.getByText("SENT")).toBeVisible();
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
