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

// AC-B7: list renders seeded field definition
test("field definitions list renders the seeded field", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Field Definitions" }).click();
  await expect(page).toHaveURL(/\/field-definitions$/);
  await expect(page.getByTestId("field-definitions-page")).toBeVisible();
  await expect(page.getByTestId("field-def-label").first()).toContainText(
    "Preferred Contact Method",
  );
});

// AC-B7: detail opens
test("clicking a field definition opens the detail", async ({ page }) => {
  await login(page);
  await page.goto("/field-definitions");
  await page.getByTestId("field-def-label").first().click();
  await expect(page.getByTestId("field-def-detail")).toBeVisible();
});

// AC-B7: create a new field definition
test("can create a TEXT field definition on CONTACT", async ({ page }) => {
  await login(page);
  await page.goto("/field-definitions");
  await page.getByTestId("new-field-def").click();

  await page.getByTestId("field-label-input").fill("Twitter Handle");
  await page.getByTestId("field-key-input").fill("twitterHandle");
  await page.getByTestId("field-entity-select").selectOption("CONTACT");
  await page.getByTestId("field-type-select").selectOption("TEXT");
  await page.getByTestId("create-field-def-submit").click();

  // After creation, navigates to the new field's detail page
  await expect(page.getByTestId("field-def-detail")).toBeVisible();
});

// AC-B7: edit visibility roles
test("can edit visibility roles on a field definition", async ({ page }) => {
  await login(page);
  await page.goto("/field-definitions");
  await page.getByTestId("field-def-label").first().click();
  await expect(page.getByTestId("field-def-detail")).toBeVisible();

  await page.getByTestId("edit-visibility-roles-btn").click();
  const input = page.getByTestId("visibility-roles-input");
  await input.clear();
  await input.fill("ADMIN, MANAGER");
  await page.getByTestId("save-visibility-roles-btn").click();

  await expect(page.getByTestId("field-visibility-roles")).toContainText("ADMIN");
});
