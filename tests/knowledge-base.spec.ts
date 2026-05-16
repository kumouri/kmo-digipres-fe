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

// AC-B5: list renders seeded article
test("knowledge base list renders the seeded article", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Knowledge Base" }).click();
  await expect(page).toHaveURL(/\/knowledge-base$/);
  await expect(page.getByTestId("kb-page")).toBeVisible();
  await expect(page.getByTestId("kb-article-title").first()).toContainText(
    "How to reset your password",
  );
});

// AC-B5: detail opens with publish button for draft
test("clicking article opens detail with publish button", async ({ page }) => {
  await login(page);
  await page.goto("/knowledge-base");
  await page.getByTestId("kb-article-title").first().click();
  await expect(page.getByTestId("kb-article-detail")).toBeVisible();
  await expect(page.getByTestId("publish-article-btn")).toBeVisible();
});

// AC-B5: publish article
test("publishing an article removes the publish button", async ({ page }) => {
  await login(page);
  await page.goto("/knowledge-base");
  await page.getByTestId("kb-article-title").first().click();
  await expect(page.getByTestId("kb-article-detail")).toBeVisible();

  await page.getByTestId("publish-article-btn").click();
  // After publish, button should disappear (article is now published)
  await expect(page.getByTestId("publish-article-btn")).toHaveCount(0);
});

// AC-B5: create article
test("creating an article navigates to its detail", async ({ page }) => {
  await login(page);
  await page.goto("/knowledge-base");
  await page.getByTestId("new-kb-article").click();
  await page.getByTestId("kb-title-input").fill("Test KB article");
  await page.getByTestId("create-kb-article-submit").click();
  await expect(page.getByTestId("kb-article-detail")).toBeVisible();
  await expect(page.getByText("Test KB article")).toBeVisible();
});

// AC-B5: search
test("searching articles filters results", async ({ page }) => {
  await login(page);
  await page.goto("/knowledge-base");
  await page.getByTestId("kb-search-input").fill("password");
  await page.getByTestId("kb-search-btn").click();
  await expect(page.getByTestId("kb-article-title").first()).toContainText("password");
});
