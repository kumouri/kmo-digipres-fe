import { test, expect, type Page } from "@playwright/test";

const SMOKE_EMAIL = "smoke@example.test";
const SMOKE_PASSWORD = "hunter2hunter2";

// SMOKE_USER has roles [STAFF, ADMIN], so we use it for both ungated and admin-only routes.

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(SMOKE_EMAIL);
  await page.getByLabel("Password").fill(SMOKE_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("dashboard")).toBeVisible();
}

async function loginAsStaff(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("staff@example.test");
  await page.getByLabel("Password").fill(SMOKE_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("dashboard")).toBeVisible();
}

// ---------------------------------------------------------------------------
// Contracts (ungated)
// ---------------------------------------------------------------------------

test("contracts list renders the seeded contract", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Contracts" }).click();
  await expect(page).toHaveURL(/\/contracts$/);
  await expect(page.getByTestId("contracts-page")).toBeVisible();
  await expect(page.getByTestId("contract-row-number").first()).toBeVisible();
});

test("contracts list shows DRAFT badge for the seeded contract", async ({ page }) => {
  await login(page);
  await page.goto("/contracts");
  await expect(page.getByTestId("contracts-page")).toBeVisible();
  await expect(page.getByText("DRAFT")).toBeVisible();
});

test("clicking a contract row opens the detail", async ({ page }) => {
  await login(page);
  await page.goto("/contracts");
  await page.getByTestId("contract-row-number").first().click();
  await expect(page.getByTestId("contract-detail")).toBeVisible();
});

test("contract detail shows Send button on DRAFT contract", async ({ page }) => {
  await login(page);
  await page.goto("/contracts");
  await page.getByTestId("contract-row-number").first().click();
  await expect(page.getByTestId("contract-detail")).toBeVisible();
  await expect(page.getByTestId("contract-send-btn")).toBeVisible();
});

test("contract detail shows Void button on DRAFT contract", async ({ page }) => {
  await login(page);
  await page.goto("/contracts");
  await page.getByTestId("contract-row-number").first().click();
  await expect(page.getByTestId("contract-detail")).toBeVisible();
  await expect(page.getByTestId("contract-void-btn")).toBeVisible();
});

test("contract detail has a PDF link", async ({ page }) => {
  await login(page);
  await page.goto("/contracts");
  await page.getByTestId("contract-row-number").first().click();
  await expect(page.getByTestId("contract-pdf-link")).toBeVisible();
});

test("sending a contract transitions it to SENT", async ({ page }) => {
  await login(page);
  await page.goto("/contracts");
  await page.getByTestId("contract-row-number").first().click();
  await expect(page.getByTestId("contract-send-btn")).toBeVisible();
  await page.getByTestId("contract-send-btn").click();
  await expect(page.getByTestId("contract-status")).toHaveText("SENT");
});

test("voiding a DRAFT contract transitions it to VOIDED", async ({ page }) => {
  await login(page);
  // Create a fresh contract so we can void it independently
  await page.goto("/contracts");
  await page.getByTestId("new-contract").click();
  await page.getByTestId("create-contract-submit").click();
  await expect(page.getByTestId("contract-detail")).toBeVisible();
  await expect(page.getByTestId("contract-void-btn")).toBeVisible();
  await page.getByTestId("contract-void-btn").click();
  await expect(page.getByTestId("contract-status")).toHaveText("VOIDED");
});

test("creating a contract navigates to its detail", async ({ page }) => {
  await login(page);
  await page.goto("/contracts");
  await page.getByTestId("new-contract").click();
  await page.getByTestId("create-contract-submit").click();
  await expect(page.getByTestId("contract-detail")).toBeVisible();
});

// ---------------------------------------------------------------------------
// Contract Templates (admin-only)
// ---------------------------------------------------------------------------

test("contract templates nav item is visible for admin users", async ({ page }) => {
  await login(page);
  await expect(
    page.getByRole("link", { name: "Contract Templates" }),
  ).toBeVisible();
});

test("contract templates nav item is hidden for staff-only users", async ({ page }) => {
  await loginAsStaff(page);
  await expect(
    page.getByRole("link", { name: "Contract Templates" }),
  ).not.toBeVisible();
});

test("staff user is redirected away from contract-templates route", async ({ page }) => {
  await loginAsStaff(page);
  await page.goto("/contract-templates");
  // RequireAdmin redirects non-admins to /
  await expect(page).toHaveURL("/");
});

test("contract templates list renders the seeded template", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Contract Templates" }).click();
  await expect(page).toHaveURL(/\/contract-templates$/);
  await expect(page.getByTestId("contract-templates-page")).toBeVisible();
  await expect(page.getByTestId("template-row-name").first()).toContainText("Standard SOW v1");
});

test("clicking a template row opens the detail", async ({ page }) => {
  await login(page);
  await page.goto("/contract-templates");
  await page.getByTestId("template-row-name").first().click();
  await expect(page.getByTestId("contract-template-detail")).toBeVisible();
});

test("template detail shows the body template content", async ({ page }) => {
  await login(page);
  await page.goto("/contract-templates");
  await page.getByTestId("template-row-name").first().click();
  await expect(page.getByTestId("template-body")).toBeVisible();
});

test("creating a contract template navigates to its detail", async ({ page }) => {
  await login(page);
  await page.goto("/contract-templates");
  await page.getByTestId("new-contract-template").click();
  await page.getByTestId("template-name-input").fill("NDA Template v1");
  await page.getByTestId("create-template-submit").click();
  await expect(page.getByTestId("contract-template-detail")).toBeVisible();
});

test("editing a template body saves changes", async ({ page }) => {
  await login(page);
  await page.goto("/contract-templates");
  await page.getByTestId("template-row-name").first().click();
  await expect(page.getByTestId("contract-template-detail")).toBeVisible();
  await page.getByTestId("edit-template-btn").click();
  await page.getByTestId("template-body-textarea").fill("Updated body {{clientName}}");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByTestId("template-body")).toContainText("Updated body");
});

