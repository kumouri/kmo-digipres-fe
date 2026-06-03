import { test, expect, type Page } from "@playwright/test";

// Contractor / time-management Phase 1 — Team directory (admin-only).
// MSW (VITE_USE_MOCKS=true) provides backend responses — no live backend needed.

const SMOKE_EMAIL = "smoke@example.test"; // STAFF + ADMIN
const SMOKE_PASSWORD = "hunter2hunter2";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(SMOKE_EMAIL);
  await page.getByLabel("Password").fill(SMOKE_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("dashboard")).toBeVisible();
}

test("admin sees the Team nav and the seeded team members", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Team" }).click();
  await expect(page).toHaveURL(/\/team$/);
  await expect(page.getByTestId("team-page")).toBeVisible();
  // Seeded contractor is listed.
  await expect(page.getByTestId("team-row-name").first()).toBeVisible();
  await expect(page.getByText("Jordan Rivera")).toBeVisible();
});

test("admin invites a teammate via the dialog and lands on their detail", async ({
  page,
}) => {
  await login(page);
  await page.goto("/team");
  await expect(page.getByTestId("team-page")).toBeVisible();

  await page.getByTestId("invite-teammate").click();
  await expect(page.getByTestId("member-name")).toBeVisible();

  await page.getByTestId("member-name").fill("Sam Carter");
  await page.getByTestId("member-email").fill("sam@example.test");
  await page.getByTestId("member-bill-rate").fill("175");
  await page.getByRole("button", { name: "Add teammate" }).click();

  // Lands on the new member's detail page.
  await expect(page.getByTestId("team-detail")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sam Carter" })).toBeVisible();

  // And the new teammate shows up back on the list.
  await page.getByRole("link", { name: "All team" }).click();
  await expect(page).toHaveURL(/\/team$/);
  await expect(page.getByText("Sam Carter")).toBeVisible();
});

test("invite form rejects an invalid email", async ({ page }) => {
  await login(page);
  await page.goto("/team");
  await page.getByTestId("invite-teammate").click();

  await page.getByTestId("member-name").fill("No Email");
  await page.getByTestId("member-email").fill("not-an-email");
  await page.getByRole("button", { name: "Add teammate" }).click();

  await expect(page.getByText("Enter a valid email")).toBeVisible();
  // Dialog stays open (no navigation to a detail page).
  await expect(page.getByTestId("team-detail")).toHaveCount(0);
});
