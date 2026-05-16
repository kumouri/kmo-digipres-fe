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

// AC-B10: Ask AI button is visible in the header after login
test("Ask AI button is visible in the app shell header", async ({ page }) => {
  await login(page);
  await expect(page.getByTestId("ask-ai-btn")).toBeVisible();
});

// AC-B10: clicking Ask AI opens the dialog
test("clicking Ask AI button opens the dialog", async ({ page }) => {
  await login(page);
  await page.getByTestId("ask-ai-btn").click();
  await expect(page.getByTestId("ask-ai-dialog")).toBeVisible();
  await expect(page.getByTestId("ask-ai-input")).toBeVisible();
});

// AC-B10: submitting a question shows an answer
test("submitting a question shows an AI answer", async ({ page }) => {
  await login(page);
  await page.getByTestId("ask-ai-btn").click();
  await expect(page.getByTestId("ask-ai-dialog")).toBeVisible();

  await page.getByTestId("ask-ai-input").fill("How many contacts do we have?");
  await page.getByTestId("ask-ai-submit").click();

  await expect(page.getByTestId("ask-ai-answer")).toBeVisible();
  await expect(page.getByTestId("ask-ai-answer")).toContainText(
    "How many contacts do we have?",
  );
});
