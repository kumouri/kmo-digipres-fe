import { test, expect, type Page } from "@playwright/test";

const SMOKE_EMAIL = "smoke@example.test";
const SMOKE_PASSWORD = "hunter2hunter2";

// The seeded audit event is for CONTACT entityId aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
const SEED_ENTITY_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(SMOKE_EMAIL);
  await page.getByLabel("Password").fill(SMOKE_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("dashboard")).toBeVisible();
}

// AC-B8: audit page loads
test("audit log page is accessible from the sidebar", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Audit Log" }).click();
  await expect(page).toHaveURL(/\/audit$/);
  await expect(page.getByTestId("audit-page")).toBeVisible();
});

// AC-B8: search returns the seeded audit event
test("searching by entity type and ID shows seeded audit event", async ({ page }) => {
  await login(page);
  await page.goto("/audit");
  await page.getByTestId("audit-entity-type-select").selectOption("CONTACT");
  await page.getByTestId("audit-entity-id-input").fill(SEED_ENTITY_ID);
  await page.getByTestId("audit-search-btn").click();

  await expect(page.getByTestId("audit-event-op").first()).toBeVisible();
  await expect(page.getByTestId("audit-event-op").first()).toContainText("UPDATE");
});

// AC-B8: op badge present
test("audit event shows entity type and op badge", async ({ page }) => {
  await login(page);
  await page.goto("/audit");
  await page.getByTestId("audit-entity-type-select").selectOption("CONTACT");
  await page.getByTestId("audit-entity-id-input").fill(SEED_ENTITY_ID);
  await page.getByTestId("audit-search-btn").click();

  await expect(page.getByTestId("audit-event-entity").first()).toContainText("CONTACT");
  await expect(page.getByTestId("audit-event-op").first()).toContainText("UPDATE");
});
