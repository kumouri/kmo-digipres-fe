import { test, expect, type Page } from "@playwright/test";

// Phase J3 FE — timesheet submit / approve UX.
//
// Contractor surface (/timesheet, singular): a per-week status badge + "Submit
// for approval" for an OPEN/sent-back week; SUBMITTED/APPROVED weeks are
// read-only (Log time hidden); a sent-back week shows the reviewer's note + a
// Reopen affordance. Admin surface (/timesheets, plural): a DataTable of
// submitted timesheets with an inline Approve / Send-back decision block.
//
// MSW (handlers.ts) seeds the contractor one OPEN timesheet for the current
// week (so submit is exercisable) and one SUBMITTED prior week (so the admin
// page is non-empty). The store resets per page load, so each test is
// deterministic.

const SMOKE_PASSWORD = "hunter2hunter2";
const ADMIN_EMAIL = "smoke@example.test";
const CONTRACTOR_EMAIL = "contractor@example.test";

// The pre-seeded SUBMITTED timesheet's period (handlers.ts) — used to target
// the right admin row deterministically.
const SEED_SUBMITTED_PERIOD_START = "2026-05-11";

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

test("CONTRACTOR submits the visible week → status Submitted, week becomes read-only", async ({
  page,
}) => {
  await loginAs(page, CONTRACTOR_EMAIL);

  await page.getByRole("link", { name: "My Timesheet" }).click();
  await expect(page).toHaveURL(/\/timesheet$/);
  await expect(page.getByTestId("timesheet-page")).toBeVisible();

  // The current week's OPEN timesheet shows an "Open" badge + a submit button,
  // and logging is still available.
  await expect(page.getByTestId("timesheet-status")).toContainText("Open");
  await expect(page.getByTestId("log-time")).toBeVisible();
  await expect(page.getByTestId("submit-timesheet")).toBeVisible();

  // Submit for approval.
  await page.getByTestId("submit-timesheet").click();
  await expect(page.getByText("Timesheet submitted for approval.")).toBeVisible();

  // The week flips to Submitted and locks: the status badge updates and the
  // Log time / Submit affordances disappear.
  await expect(page.getByTestId("timesheet-status")).toContainText("Submitted");
  await expect(page.getByTestId("log-time")).toHaveCount(0);
  await expect(page.getByTestId("submit-timesheet")).toHaveCount(0);
});

test("ADMIN sees the Timesheets nav, opens the approvals page, approves a submitted timesheet", async ({
  page,
}) => {
  await loginAs(page, ADMIN_EMAIL);

  // The admin-only Timesheets nav item is present (contractor surface is at the
  // singular /timesheet, this is the plural /timesheets).
  await page.getByRole("link", { name: "Timesheets", exact: true }).click();
  await expect(page).toHaveURL(/\/timesheets$/);
  await expect(page.getByTestId("timesheet-approvals")).toBeVisible();

  // The pre-seeded SUBMITTED timesheet (contractor "Jordan Rivera") is listed.
  const seedRow = page
    .getByRole("row")
    .filter({ hasText: SEED_SUBMITTED_PERIOD_START });
  await expect(seedRow).toBeVisible();
  await expect(seedRow.getByTestId("timesheet-person")).toContainText(
    "Jordan Rivera",
  );
  await expect(seedRow.getByTestId("timesheet-row-status")).toContainText(
    "Submitted",
  );

  // Click the row → inline decision block appears. Approve.
  await seedRow.click();
  await expect(page.getByTestId("timesheet-decision")).toBeVisible();
  await page.getByTestId("approve-timesheet").click();
  await expect(page.getByText("Timesheet approved.")).toBeVisible();

  // Approving removes it from the SUBMITTED list (now empty → empty-state row).
  await expect(
    page.getByRole("row").filter({ hasText: SEED_SUBMITTED_PERIOD_START }),
  ).toHaveCount(0);
});

test("ADMIN sends a submitted timesheet back with a required note", async ({
  page,
}) => {
  await loginAs(page, ADMIN_EMAIL);
  await page.goto("/timesheets");
  await expect(page.getByTestId("timesheet-approvals")).toBeVisible();

  const seedRow = page
    .getByRole("row")
    .filter({ hasText: SEED_SUBMITTED_PERIOD_START });
  await seedRow.click();
  await expect(page.getByTestId("timesheet-decision")).toBeVisible();

  // The send-back note is required: open the form, the submit stays disabled
  // until a note is entered.
  await page.getByTestId("reject-timesheet-toggle").click();
  await expect(page.getByTestId("sendback-submit")).toBeDisabled();
  await page
    .getByTestId("sendback-note")
    .fill("Please add the Thursday client call hours.");
  await expect(page.getByTestId("sendback-submit")).toBeEnabled();
  await page.getByTestId("sendback-submit").click();
  await expect(page.getByText("Timesheet sent back.")).toBeVisible();

  // It leaves the SUBMITTED list.
  await expect(
    page.getByRole("row").filter({ hasText: SEED_SUBMITTED_PERIOD_START }),
  ).toHaveCount(0);
});

test("CONTRACTOR sees a sent-back week's note and can reopen or resubmit it", async ({
  page,
}) => {
  await loginAs(page, CONTRACTOR_EMAIL);
  await page.goto("/timesheet");
  await expect(page.getByTestId("timesheet-page")).toBeVisible();

  // Navigate back to the seeded sent-back week (2026-05-04 — 2026-05-10) and
  // confirm the destructive note panel, the Reopen affordance, and a resubmit
  // button are all shown for a REJECTED period.
  let found = false;
  for (let i = 0; i < 10; i++) {
    if (await page.getByTestId("timesheet-sendback-note").isVisible()) {
      found = true;
      break;
    }
    await page.getByTestId("prev-week").click();
    await page.waitForTimeout(200);
  }
  expect(found).toBe(true);

  await expect(page.getByTestId("timesheet-status")).toContainText("Sent back");
  await expect(page.getByTestId("timesheet-sendback-note")).toContainText(
    "Please add the Thursday client call hours.",
  );
  await expect(page.getByTestId("reopen-timesheet")).toBeVisible();
  // A sent-back week can be resubmitted directly, or reopened to edit first.
  await expect(page.getByTestId("submit-timesheet")).toBeVisible();
  // A sent-back week is NOT locked — logging is allowed.
  await expect(page.getByTestId("log-time")).toBeVisible();
});
