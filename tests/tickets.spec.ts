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

// AC-B4: list renders seeded ticket with SLA badge
test("tickets list renders the seeded ticket with SLA info", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Tickets" }).click();
  await expect(page).toHaveURL(/\/tickets$/);
  await expect(page.getByTestId("tickets-page")).toBeVisible();
  await expect(page.getByTestId("ticket-row-subject").first()).toContainText(
    "Website contact form not working",
  );
});

// AC-B4: detail opens with transition button
test("clicking a ticket opens detail with transition button", async ({ page }) => {
  await login(page);
  await page.goto("/tickets");
  await page.getByTestId("ticket-row-subject").first().click();
  await expect(page.getByTestId("ticket-detail")).toBeVisible();
  await expect(page.getByText("Website contact form not working")).toBeVisible();
  // OPEN ticket has PENDING and RESOLVED transitions
  await expect(page.getByTestId("ticket-transition-resolved")).toBeVisible();
});

// AC-B4: status transition
test("ticket transition OPEN -> RESOLVED works", async ({ page }) => {
  await login(page);
  await page.goto("/tickets");
  await page.getByTestId("ticket-row-subject").first().click();
  await expect(page.getByTestId("ticket-detail")).toBeVisible();

  await page.getByTestId("ticket-transition-resolved").click();
  await expect(page.getByTestId("ticket-status-badge")).toContainText("Resolved");
});

// AC-B4: add comment
test("adding a comment appears in the ticket", async ({ page }) => {
  await login(page);
  await page.goto("/tickets");
  await page.getByTestId("ticket-row-subject").first().click();
  await expect(page.getByTestId("ticket-detail")).toBeVisible();

  await page.getByTestId("comment-input").fill("Test comment from smoke test");
  await page.getByTestId("comment-submit").click();
  await expect(page.getByTestId("ticket-comment").first()).toContainText(
    "Test comment from smoke test",
  );
});

// AC-B4: create new ticket
test("creating a ticket navigates to its detail", async ({ page }) => {
  await login(page);
  await page.goto("/tickets");
  await page.getByTestId("new-ticket").click();
  await page.getByTestId("ticket-subject-input").fill("New smoke ticket");
  await page.getByTestId("create-ticket-submit").click();
  await expect(page.getByTestId("ticket-detail")).toBeVisible();
  await expect(page.getByText("New smoke ticket")).toBeVisible();
});
