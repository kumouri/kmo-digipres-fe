import { test, expect, type Page } from "@playwright/test";

// Real Estate "Database Goldmine" — dormant-lead nurture funnel dashboard (T1).
//
// (a) Dashboard (/database-goldmine): the campaign-wide headline funnel cards
//     (Enrolled / Touches sent / Replied / Showings booked / Re-engaged), the
//     reply→booking view, and a per-dormancy-segment funnel row for each tier
//     A–D. MSW seeds an active "Past-buyer reactivation" campaign mid-run
//     (100 enrolled across A–D, 8 replied, 3 booked) + a paused campaign.
//
// (b) Campaign picker + segment-and-enroll: choosing the active campaign and
//     clicking "Segment & enroll" POSTs the RE-nurture trigger, surfaces the
//     per-run result banner, and the funnel visibly fills (booked grows).
//
// (c) The paused campaign refuses enrollment (BE 4302 → friendly error).
//
// (d) RBAC: the dashboard is staff-visible and contractor-hidden.
//
// All routes are ADMIN + realestate-AND-nurture-module-gated on the BE; the
// store resets per page load, so each test is deterministic.

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

test("database-goldmine nav item is visible to staff", async ({ page }) => {
  await login(page);
  await expect(
    page.getByRole("link", { name: "Database goldmine" }),
  ).toBeVisible();
});

test("the dashboard renders the headline funnel and a row per dormancy segment", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: "Database goldmine" }).click();
  await expect(page).toHaveURL(/\/database-goldmine$/);
  await expect(page.getByTestId("nurture-dashboard-page")).toBeVisible();

  // The active campaign auto-selects → its funnel renders.
  await expect(page.getByTestId("nurture-funnel")).toBeVisible();

  // Headline funnel cards.
  await expect(page.getByTestId("nurture-stat-enrolled")).toBeVisible();
  await expect(page.getByTestId("nurture-stat-sent")).toBeVisible();
  await expect(page.getByTestId("nurture-stat-replied")).toBeVisible();
  await expect(page.getByTestId("nurture-stat-booked")).toBeVisible();

  // One row per dormancy tier A–D.
  await expect(page.getByTestId("nurture-segment-row")).toHaveCount(4);

  // The seeded campaign-wide total is 42+31+18+9 = 100 enrolled.
  await expect(page.getByTestId("nurture-stat-enrolled-value")).toHaveText("100");
  // Booked across buckets: 2+1+0+0 = 3.
  await expect(page.getByTestId("nurture-stat-booked-value")).toHaveText("3");
});

test("each segment row shows its dormancy band label and day window", async ({
  page,
}) => {
  await login(page);
  await page.goto("/database-goldmine");
  await expect(page.getByTestId("nurture-funnel")).toBeVisible();

  // Friendly band labels — no raw "A".."D" leaking as the only text.
  await expect(page.getByText("Recently dormant")).toBeVisible();
  await expect(page.getByText("Cooling off")).toBeVisible();
  await expect(page.getByText("Long dormant")).toBeVisible();
  await expect(page.getByText("Coldest leads")).toBeVisible();

  // Segment A's seeded window (90–180 days dormant) shows.
  const rowA = page
    .getByTestId("nurture-segment-row")
    .filter({ has: page.getByText("Recently dormant") });
  await expect(rowA).toContainText("90–180 days dormant");
  await expect(rowA.getByTestId("nurture-segment-enrolled")).toContainText(
    "42 enrolled",
  );
});

test("the reply-to-booking view summarizes the re-engaged leads", async ({
  page,
}) => {
  await login(page);
  await page.goto("/database-goldmine");
  await expect(page.getByTestId("nurture-reply-booking")).toBeVisible();

  // Seeded replied = 4+3+1+0 = 8; booked = 3. The summary calls both out.
  await expect(page.getByTestId("nurture-reply-booking-summary")).toContainText(
    "8",
  );
  await expect(page.getByTestId("nurture-reply-booking-summary")).toContainText(
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
  await page.goto("/database-goldmine");
  await expect(page.getByTestId("nurture-funnel")).toBeVisible();

  // Booked starts at 3.
  await expect(page.getByTestId("nurture-stat-booked-value")).toHaveText("3");

  // Trigger the run.
  await page.getByTestId("nurture-segment-enroll-btn").click();

  // The per-run result banner appears (5 newly enrolled).
  await expect(page.getByTestId("nurture-enroll-result")).toBeVisible();
  await expect(page.getByTestId("nurture-enroll-result")).toContainText(
    "Enrolled 5",
  );
  await expect(page.getByTestId("nurture-enroll-detail")).toContainText(
    "214 contacts",
  );

  // The funnel re-fetches: booked grew to 4 (a reply converted), enrolled to 105.
  await expect(page.getByTestId("nurture-stat-booked-value")).toHaveText("4");
  await expect(page.getByTestId("nurture-stat-enrolled-value")).toHaveText("105");
});

test("switching to the paused campaign and enrolling shows a friendly error", async ({
  page,
}) => {
  await login(page);
  await page.goto("/database-goldmine");
  await expect(page.getByTestId("nurture-controls")).toBeVisible();

  // Pick the paused campaign.
  await page.getByTestId("nurture-campaign-select").click();
  await page
    .getByTestId("nurture-campaign-option")
    .filter({ hasText: "Open-house no-shows" })
    .click();

  // Try to enroll → BE 4302 (inactive) → friendly error, no result banner.
  await page.getByTestId("nurture-segment-enroll-btn").click();
  await expect(page.getByTestId("nurture-enroll-error")).toBeVisible();
  await expect(page.getByTestId("nurture-enroll-error")).toContainText("paused");
  await expect(page.getByTestId("nurture-enroll-result")).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// (c) RBAC: a scoped-down contractor sees none of it
// ---------------------------------------------------------------------------

test("a contractor cannot see or reach the database-goldmine surface", async ({
  page,
}) => {
  // contractor@example.test is STAFF + CONTRACTOR (no ADMIN) — scoped down.
  await login(page, "contractor@example.test");

  // The nav item is hidden…
  await expect(
    page.getByRole("link", { name: "Database goldmine" }),
  ).toHaveCount(0);

  // …and deep-linking is bounced to the dashboard by RequireNotContractor.
  await page.goto("/database-goldmine");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("dashboard")).toBeVisible();
});
