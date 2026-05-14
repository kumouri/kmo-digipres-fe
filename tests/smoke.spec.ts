import { test, expect } from "@playwright/test";

// These tests mirror the behavioral spec from the backend's
// repos/kmo-digipres-be/src/test/java/com/kumouri/kmodigipresbe/auth/AuthSmokeIT.java.
// MSW (started by main.tsx when VITE_USE_MOCKS=true) provides the backend
// responses, so no Spring Boot is required.

const SMOKE_EMAIL = "smoke@example.test";
const SMOKE_PASSWORD = "hunter2hunter2";

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

test("unauthenticated visit to a protected route redirects to /login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByTestId("login-page")).toBeVisible();
});

test("successful login lands on the dashboard with the user menu visible", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(SMOKE_EMAIL);
  await page.getByLabel("Password").fill(SMOKE_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL("http://localhost:5173/");
  await expect(page.getByTestId("dashboard")).toBeVisible();
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

test("home placeholder smoke test (post-phase-1 sanity)", async ({ page }) => {
  // After authenticating, the protected root renders the dashboard. Acts as
  // a smoke test that the protected shell + auth provider hydrate end-to-end.
  await page.goto("/login");
  await page.getByLabel("Email").fill(SMOKE_EMAIL);
  await page.getByLabel("Password").fill(SMOKE_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: /welcome/i })).toBeVisible();
});
