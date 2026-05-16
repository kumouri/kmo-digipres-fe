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

// AC-B9: saved reports list renders seeded report
test("reports list renders the seeded saved report", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Reports" }).click();
  await expect(page).toHaveURL(/\/reports$/);
  await expect(page.getByTestId("reports-page")).toBeVisible();
  await expect(page.getByTestId("saved-report-name").first()).toContainText(
    "Open Deals by Stage",
  );
});

// AC-B9: clicking a report opens detail
test("clicking a saved report opens its detail page", async ({ page }) => {
  await login(page);
  await page.goto("/reports");
  await page.getByTestId("saved-report-name").first().click();
  await expect(page.getByTestId("report-detail")).toBeVisible();
});

// AC-B9: run report shows results
test("running a saved report shows result rows", async ({ page }) => {
  await login(page);
  await page.goto("/reports");
  await page.getByTestId("saved-report-name").first().click();
  await expect(page.getByTestId("report-detail")).toBeVisible();

  await page.getByTestId("run-report-btn").click();
  await expect(page.getByTestId("report-results")).toBeVisible();
});

// AC-B9: create a new report
test("can create a new saved report", async ({ page }) => {
  await login(page);
  await page.goto("/reports");
  await page.getByTestId("new-report-btn").click();

  await page.getByTestId("report-name-input").fill("Contact Growth");
  await page.getByTestId("report-entity-select").selectOption("CONTACT");
  await page.getByTestId("report-chart-select").selectOption("LINE");
  await page.getByTestId("create-report-submit").click();

  await expect(page.getByTestId("report-detail")).toBeVisible();
});

// AC-B9: dashboards list renders seeded dashboard
test("dashboards list renders the seeded dashboard", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Dashboards" }).click();
  await expect(page).toHaveURL(/\/dashboards$/);
  await expect(page.getByTestId("dashboards-page")).toBeVisible();
  await expect(page.getByTestId("dashboard-name").first()).toContainText(
    "Sales Overview",
  );
});

// AC-B9: clicking a dashboard opens detail
test("clicking a dashboard opens its detail page", async ({ page }) => {
  await login(page);
  await page.goto("/dashboards");
  await page.getByTestId("dashboard-name").first().click();
  await expect(page.getByTestId("dashboard-detail")).toBeVisible();
  await expect(page.getByTestId("dashboard-widget-count")).toContainText("1");
});
