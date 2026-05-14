import { test, expect } from "@playwright/test";

test("home placeholder renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("home-placeholder")).toBeVisible();
  await expect(page.getByRole("heading", { name: "KMO Digipres Admin" })).toBeVisible();
});
