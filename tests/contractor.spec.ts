import { test, expect, type Page } from "@playwright/test";

// Phase J2 FE — contractor scoped access wiring.
//
// The Phase-2 BE denies a CONTRACTOR token on the broad staff readers
// (GET /projects, /time-entries/weekly, /expenses, …, all 403 + errorCode
// 4135). These specs prove the shared My Projects / My Timesheet / My Expenses
// surfaces route a contractor through the /me/contractor/** endpoints instead,
// so they load their own scoped data rather than erroring. MSW (handlers.ts)
// mirrors the deny + serves the scoped surface for the seeded contractor.

const SMOKE_PASSWORD = "hunter2hunter2";
const CONTRACTOR_EMAIL = "contractor@example.test";

async function loginAs(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(SMOKE_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("dashboard")).toBeVisible();
}

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

// Fail the test if any /projects, /time-entries, or /expenses staff reader
// 403s during the run — that would mean the role-aware wiring leaked a staff
// call. (The contractor must never hit those.) Returns a checker to assert.
function trackForbidden(page: Page) {
  const forbidden: string[] = [];
  page.on("response", (res) => {
    if (res.status() === 403) forbidden.push(`${res.request().method()} ${res.url()}`);
  });
  return forbidden;
}

test("CONTRACTOR My Projects lists their assigned project via the scoped surface (no 4135)", async ({
  page,
}) => {
  const forbidden = trackForbidden(page);
  await loginAs(page, CONTRACTOR_EMAIL);

  await page.getByRole("link", { name: "My Projects" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByTestId("projects-page")).toBeVisible();

  // The seeded contractor (Jordan Rivera) is assigned to PRJ-2026-001.
  await expect(page.getByTestId("project-row-code").first()).toContainText(
    "PRJ-2026-001",
  );
  await expect(page.getByTestId("project-row-name").first()).toContainText(
    "Website Redesign",
  );

  // Contractors can't create projects — the staff "New project" action is gone.
  await expect(page.getByTestId("new-project")).toHaveCount(0);

  // No staff reader was hit (no 403/4135).
  expect(forbidden).toEqual([]);
});

test("CONTRACTOR project detail: read-only Client card, no Delete, no Team tab", async ({
  page,
}) => {
  const forbidden = trackForbidden(page);
  await loginAs(page, CONTRACTOR_EMAIL);

  await page.goto("/projects");
  await page.getByTestId("project-row-name").first().click();
  await expect(page.getByTestId("project-detail")).toBeVisible();
  await expect(page.getByText("Website Redesign")).toBeVisible();

  // Admin-only controls are hidden.
  await expect(page.getByTestId("delete-project")).toHaveCount(0);
  await expect(page.getByTestId("tab-team")).toHaveCount(0);
  await expect(page.getByTestId("tab-milestones")).toHaveCount(0);

  // The contractor gets a Client tab in place of Team. Tasks still render.
  await expect(page.getByTestId("tab-tasks")).toBeVisible();
  await expect(page.getByTestId("tab-client")).toBeVisible();

  // Open the read-only Client card — sourced from /me/contractor/projects/:id/client.
  await page.getByTestId("tab-client").click();
  await expect(page.getByTestId("contractor-client-card")).toBeVisible();
  await expect(page.getByTestId("client-company")).toContainText(
    "Analytical Engines",
  );
  await expect(page.getByTestId("client-contact")).toContainText("Ada Lovelace");

  // Tasks tab shows the read-only task view (not the interactive kanban).
  await page.getByTestId("tab-tasks").click();
  await expect(page.getByTestId("contractor-task-list")).toBeVisible();
  await expect(page.getByTestId("task-kanban")).toHaveCount(0);
  await expect(page.getByTestId("task-card").first()).toBeVisible();

  expect(forbidden).toEqual([]);
});

test("CONTRACTOR My Timesheet loads their own week via the scoped surface (no 4135)", async ({
  page,
}) => {
  const forbidden = trackForbidden(page);
  await loginAs(page, CONTRACTOR_EMAIL);

  await page.getByRole("link", { name: "My Timesheet" }).click();
  await expect(page).toHaveURL(/\/timesheet$/);
  await expect(page.getByTestId("timesheet-page")).toBeVisible();

  // The week grid renders; the staff-only "Invoice unbilled" action is hidden.
  await expect(page.getByTestId("week-grid")).toBeVisible();
  await expect(page.getByTestId("invoice-unbilled")).toHaveCount(0);

  // Logging time by hand goes through /me/contractor/time (no 4135).
  await page.getByTestId("log-time").click();
  await page.getByTestId("time-entry-desc").fill("Contractor manual log");
  await page.getByTestId("time-entry-start").fill("2026-05-12T09:00:00Z");
  await page.getByTestId("time-entry-end").fill("2026-05-12T11:00:00Z");
  await page.getByTestId("log-time-submit").click();
  await expect(page.getByText("Time entry logged.")).toBeVisible();

  expect(forbidden).toEqual([]);
});

test("CONTRACTOR My Expenses loads + submits via the scoped surface (no 4135)", async ({
  page,
}) => {
  const forbidden = trackForbidden(page);
  await loginAs(page, CONTRACTOR_EMAIL);

  await page.getByRole("link", { name: "My Expenses" }).click();
  await expect(page).toHaveURL(/\/expenses$/);
  await expect(page.getByTestId("expenses-page")).toBeVisible();

  // The contractor's own seed expense is listed (Parking for client site visit).
  await expect(page.getByTestId("expense-description").first()).toContainText(
    "Parking for client site visit",
  );
  // The staff-only "Invoice approved" action is hidden.
  await expect(page.getByTestId("invoice-expenses")).toHaveCount(0);

  // Submitting goes through /me/contractor/expenses (no 4135). Contractors have
  // no detail surface, so we stay on the list and the new row appears.
  await page.getByTestId("new-expense").click();
  await page.getByTestId("expense-desc-input").fill("Notebook and pens");
  await page.getByTestId("expense-amount-input").fill("18.50");
  await page.getByTestId("expense-date-input").fill("2026-05-13");
  await page.getByTestId("submit-expense").click();
  await expect(page.getByText("Expense submitted.")).toBeVisible();
  await expect(page).toHaveURL(/\/expenses$/); // no navigation to a detail page
  await expect(
    page.getByText("Notebook and pens", { exact: false }),
  ).toBeVisible();

  expect(forbidden).toEqual([]);
});
