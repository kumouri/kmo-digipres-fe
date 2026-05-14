import { test, expect, type Page } from "@playwright/test";

// These tests mirror the behavioral spec from the backend's
// repos/kmo-digipres-be/src/test/java/com/kumouri/kmodigipresbe/auth/AuthSmokeIT.java
// and the controller contracts in /controller/. MSW (started by main.tsx when
// VITE_USE_MOCKS=true) provides the backend responses, so no Spring Boot is
// required.

const SMOKE_EMAIL = "smoke@example.test";
const SMOKE_PASSWORD = "hunter2hunter2";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(SMOKE_EMAIL);
  await page.getByLabel("Password").fill(SMOKE_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("dashboard")).toBeVisible();
}

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

// --- Auth (mirrors AuthSmokeIT.java) ---------------------------------------

test("unauthenticated visit to a protected route redirects to /login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByTestId("login-page")).toBeVisible();
});

test("successful login lands on the dashboard with the user menu visible", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL("http://localhost:5173/");
  await expect(page.getByTestId("user-menu-trigger")).toBeVisible();
  await expect(page.getByText(SMOKE_EMAIL)).toBeVisible();
});

test("wrong password keeps the user on /login and surfaces an error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(SMOKE_EMAIL);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText(/invalid email or password/i)).toBeVisible();
});

// --- Contacts ---------------------------------------------------------------

test("contacts list renders the seeded contact", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Contacts" }).click();
  await expect(page).toHaveURL(/\/contacts$/);
  await expect(page.getByTestId("contacts-page")).toBeVisible();
  await expect(page.getByTestId("contact-row-name").first()).toContainText("Ada Lovelace");
});

test("clicking a contact row opens detail with timeline tab", async ({ page }) => {
  await login(page);
  await page.goto("/contacts");
  await page.getByTestId("contact-row-name").first().click();
  await expect(page.getByTestId("contact-detail")).toBeVisible();
  await page.getByTestId("timeline-tab").click();
  await expect(page.getByTestId("contact-timeline")).toBeVisible();
  await expect(page.getByText("Initial outreach")).toBeVisible();
});

test("creating a contact via the dialog navigates to its detail", async ({ page }) => {
  await login(page);
  await page.goto("/contacts");
  await page.getByTestId("new-contact").click();

  // Dialog is open; fill the required field and submit.
  await page.getByLabel("Display name *").fill("Grace Hopper");
  await page.getByRole("button", { name: "Create contact" }).click();

  await expect(page.getByTestId("contact-detail")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Grace Hopper" })).toBeVisible();
});

// --- Companies --------------------------------------------------------------

test("companies list renders the seeded company", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Companies" }).click();
  await expect(page).toHaveURL(/\/companies$/);
  await expect(page.getByTestId("companies-page")).toBeVisible();
  await expect(page.getByTestId("company-row-name").first()).toContainText(
    "Analytical Engines",
  );
});

test("creating a company via the dialog navigates to its detail", async ({ page }) => {
  await login(page);
  await page.goto("/companies");
  await page.getByTestId("new-company").click();

  await page.getByLabel("Name *").fill("Babbage & Co.");
  await page.getByRole("button", { name: "Create company" }).click();

  await expect(page.getByTestId("company-detail")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Babbage & Co." })).toBeVisible();
});

// --- Deals ------------------------------------------------------------------

test("deals pipeline renders seeded deal in its QUALIFIED column", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Deals" }).click();
  await expect(page).toHaveURL(/\/deals$/);
  await expect(page.getByTestId("deals-pipeline")).toBeVisible();
  const qualifiedColumn = page.getByTestId("pipeline-column-QUALIFIED");
  await expect(qualifiedColumn).toContainText("Analytical Engine retainer");
});

test("moving a deal to NEGOTIATION via the pipeline buttons updates the column", async ({ page }) => {
  await login(page);
  await page.goto("/deals");

  const qualified = page.getByTestId("pipeline-column-QUALIFIED");
  const negotiation = page.getByTestId("pipeline-column-NEGOTIATION");
  await expect(qualified).toContainText("Analytical Engine retainer");

  await qualified.getByTestId("move-deal").click();
  await qualified.getByTestId("move-to-NEGOTIATION").click();

  await expect(negotiation).toContainText("Analytical Engine retainer");
});

test("moving a deal to LOST requires a reason and reflects on detail", async ({ page }) => {
  await login(page);
  await page.goto("/deals");
  const qualified = page.getByTestId("pipeline-column-QUALIFIED");

  await qualified.getByTestId("move-deal").click();
  await qualified.getByTestId("move-to-LOST").click();

  // Confirm button is disabled until a reason is typed.
  const confirm = page.getByTestId("confirm-lost");
  await expect(confirm).toBeDisabled();
  await page.getByTestId("lost-reason-input").fill("Budget pulled");
  await confirm.click();

  await expect(page.getByTestId("pipeline-column-LOST")).toContainText(
    "Analytical Engine retainer",
  );
});
