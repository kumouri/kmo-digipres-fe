import { test, expect, type Page } from "@playwright/test";

// Health "RevenueRevive" — dormant-patient reactivation funnel dashboard (T2).
//
// (a) Dashboard (/revenue-revive): the campaign-wide headline funnel cards
//     (Enrolled / Touches sent / Replied / Appointments booked / Re-engaged),
//     the reply→booking view, and a per-dormancy-segment funnel row for each
//     tier A–D. MSW seeds an active "Lapsed-patient reactivation" campaign
//     mid-run (88 enrolled across A–D, 10 replied, 3 booked) + a paused
//     campaign.
//
// (b) Campaign picker + segment-and-enroll: choosing the active campaign and
//     clicking "Segment & enroll" POSTs the FD-nurture trigger, surfaces the
//     per-run result banner, and the funnel visibly fills (booked grows).
//
// (c) The paused campaign refuses enrollment (BE 4302 → friendly error).
//
// (d) RBAC: the dashboard is staff-visible and contractor-hidden.
//
// All routes are ADMIN + frontdesk-AND-nurture-module-gated on the BE; the
// store resets per page load, so each test is deterministic. PHI-free by design.

const SMOKE_EMAIL = "smoke@example.test"; // STAFF + ADMIN
const SMOKE_PASSWORD = "hunter2hunter2";

async function login(page: Page, email = SMOKE_EMAIL) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(SMOKE_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("dashboard")).toBeVisible();
}

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

// ---------------------------------------------------------------------------
// (a) Dashboard funnel
// ---------------------------------------------------------------------------

test("revenue-revive nav item is visible to staff", async ({ page }) => {
  await login(page);
  await expect(
    page.getByRole("link", { name: "Revenue revive" }),
  ).toBeVisible();
});

test("the dashboard renders the headline funnel and a row per dormancy segment", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: "Revenue revive" }).click();
  await expect(page).toHaveURL(/\/revenue-revive$/);
  await expect(page.getByTestId("fd-nurture-dashboard-page")).toBeVisible();

  // The active campaign auto-selects → its funnel renders.
  await expect(page.getByTestId("fd-nurture-funnel")).toBeVisible();

  // Headline funnel cards.
  await expect(page.getByTestId("fd-nurture-stat-enrolled")).toBeVisible();
  await expect(page.getByTestId("fd-nurture-stat-sent")).toBeVisible();
  await expect(page.getByTestId("fd-nurture-stat-replied")).toBeVisible();
  await expect(page.getByTestId("fd-nurture-stat-booked")).toBeVisible();

  // One row per dormancy tier A–D.
  await expect(page.getByTestId("fd-nurture-segment-row")).toHaveCount(4);

  // The seeded campaign-wide total is 38+27+15+8 = 88 enrolled.
  await expect(page.getByTestId("fd-nurture-stat-enrolled-value")).toHaveText("88");
  // Booked across buckets: 2+1+0+0 = 3.
  await expect(page.getByTestId("fd-nurture-stat-booked-value")).toHaveText("3");
});

test("each segment row shows its dormancy band label and day window", async ({
  page,
}) => {
  await login(page);
  await page.goto("/revenue-revive");
  await expect(page.getByTestId("fd-nurture-funnel")).toBeVisible();

  // Friendly band labels — no raw "A".."D" leaking as the only text.
  await expect(page.getByText("Recently dormant")).toBeVisible();
  await expect(page.getByText("Cooling off")).toBeVisible();
  await expect(page.getByText("Long dormant")).toBeVisible();
  await expect(page.getByText("Coldest leads")).toBeVisible();

  // Segment A's seeded window (90–180 days since last visit) shows.
  const rowA = page
    .getByTestId("fd-nurture-segment-row")
    .filter({ has: page.getByText("Recently dormant") });
  await expect(rowA).toContainText("90–180 days since last visit");
  await expect(rowA.getByTestId("fd-nurture-segment-enrolled")).toContainText(
    "38 enrolled",
  );
});

test("the reply-to-booking view summarizes the re-engaged patients", async ({
  page,
}) => {
  await login(page);
  await page.goto("/revenue-revive");
  await expect(page.getByTestId("fd-nurture-reply-booking")).toBeVisible();

  // Seeded replied = 5+4+1+0 = 10; booked = 3. The summary calls both out.
  await expect(page.getByTestId("fd-nurture-reply-booking-summary")).toContainText(
    "10",
  );
  await expect(page.getByTestId("fd-nurture-reply-booking-summary")).toContainText(
    "3",
  );
});

// ---------------------------------------------------------------------------
// (b) Campaign picker + segment-and-enroll
// ---------------------------------------------------------------------------

test("segment-and-enroll surfaces the run result and fills the funnel", async ({
  page,
}) => {
  await login(page);
  await page.goto("/revenue-revive");
  await expect(page.getByTestId("fd-nurture-funnel")).toBeVisible();

  // Booked starts at 3.
  await expect(page.getByTestId("fd-nurture-stat-booked-value")).toHaveText("3");

  // Trigger the run.
  await page.getByTestId("fd-nurture-segment-enroll-btn").click();

  // The per-run result banner appears (5 newly enrolled).
  await expect(page.getByTestId("fd-nurture-enroll-result")).toBeVisible();
  await expect(page.getByTestId("fd-nurture-enroll-result")).toContainText(
    "Enrolled 5",
  );
  await expect(page.getByTestId("fd-nurture-enroll-detail")).toContainText(
    "198 contacts",
  );

  // The funnel re-fetches: booked grew to 4 (a reply converted), enrolled to 93.
  await expect(page.getByTestId("fd-nurture-stat-booked-value")).toHaveText("4");
  await expect(page.getByTestId("fd-nurture-stat-enrolled-value")).toHaveText("93");
});

test("switching to the paused campaign and enrolling shows a friendly error", async ({
  page,
}) => {
  await login(page);
  await page.goto("/revenue-revive");
  await expect(page.getByTestId("fd-nurture-controls")).toBeVisible();

  // Pick the paused campaign.
  await page.getByTestId("fd-nurture-campaign-select").click();
  await page
    .getByTestId("fd-nurture-campaign-option")
    .filter({ hasText: "Annual wellness" })
    .click();

  // Try to enroll → BE 4302 (inactive) → friendly error, no result banner.
  await page.getByTestId("fd-nurture-segment-enroll-btn").click();
  await expect(page.getByTestId("fd-nurture-enroll-error")).toBeVisible();
  await expect(page.getByTestId("fd-nurture-enroll-error")).toContainText("paused");
  await expect(page.getByTestId("fd-nurture-enroll-result")).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// (c) RBAC: a scoped-down contractor sees none of it
// ---------------------------------------------------------------------------

test("a contractor cannot see or reach the revenue-revive surface", async ({
  page,
}) => {
  // contractor@example.test is STAFF + CONTRACTOR (no ADMIN) — scoped down.
  await login(page, "contractor@example.test");

  // The nav item is hidden…
  await expect(
    page.getByRole("link", { name: "Revenue revive" }),
  ).toHaveCount(0);

  // …and deep-linking is bounced to the dashboard by RequireNotContractor.
  await page.goto("/revenue-revive");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("dashboard")).toBeVisible();
});
