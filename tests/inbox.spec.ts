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

// AC-B6: list renders seeded thread
test("inbox list renders the seeded thread", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Inbox", exact: true }).click();
  await expect(page).toHaveURL(/\/inbox$/);
  await expect(page.getByTestId("inbox-page")).toBeVisible();
  await expect(page.getByTestId("inbox-thread-subject").first()).toContainText(
    "Question about the proposal",
  );
});

// AC-B6: detail opens
test("clicking a thread opens the detail with claim button", async ({ page }) => {
  await login(page);
  await page.goto("/inbox");
  await page.getByTestId("inbox-thread-subject").first().click();
  await expect(page.getByTestId("inbox-thread-detail")).toBeVisible();
  await expect(page.getByTestId("claim-thread-btn")).toBeVisible();
});

// AC-B6: claim thread
test("claiming a thread removes the claim button", async ({ page }) => {
  await login(page);
  await page.goto("/inbox");
  await page.getByTestId("inbox-thread-subject").first().click();
  await expect(page.getByTestId("inbox-thread-detail")).toBeVisible();

  await page.getByTestId("claim-thread-btn").click();
  await expect(page.getByTestId("claim-thread-btn")).toHaveCount(0);
});

// AC-B6: messages are shown
test("inbox thread detail shows the seeded message", async ({ page }) => {
  await login(page);
  await page.goto("/inbox");
  await page.getByTestId("inbox-thread-subject").first().click();
  await expect(page.getByTestId("inbox-thread-detail")).toBeVisible();
  await expect(page.getByTestId("inbox-message").first()).toBeVisible();
  await expect(page.getByText("Hi, I had some questions")).toBeVisible();
});

// AC-B6: send reply
test("sending a reply adds a new message", async ({ page }) => {
  await login(page);
  await page.goto("/inbox");
  await page.getByTestId("inbox-thread-subject").first().click();
  await expect(page.getByTestId("inbox-thread-detail")).toBeVisible();

  await page.getByTestId("reply-input").fill("Thanks for reaching out!");
  await page.getByTestId("reply-submit").click();

  // The reply should appear as a new message
  await expect(page.getByText("Thanks for reaching out!")).toBeVisible();
});
