import { test, expect, type Page } from "@playwright/test";

// Real Estate T10 "Listing Prep Studio" — staff surface for generating a
// listing prep pack (MLS description + 4-week social calendar + email campaign)
// + Fair-Housing review + Approve / Skip.
//
// (a) Navigation: "Listing prep" nav link is visible to staff, absent for
//     contractors.
//
// (b) Page mounts: the studio page renders the listing selector card, the
//     DRAFTED queue section.
//
// (c) Listing picker: the seeded listings render as picker buttons.
//
// (d) Generate: clicking a listing + hitting "Generate prep pack" yields a
//     new pack with: MLS description, 4-week calendar, email campaign, and
//     the held badge on the auto-corrected post.
//
// (e) Fair-Housing flags: the flags panel renders (term + surface) for the
//     seeded DRAFTED pack in the queue.
//
// (f) DRAFTED queue: the seeded DRAFTED pack renders in the queue.
//
// (g) Approve: clicking Approve transitions the pack to Approved and removes
//     it from the DRAFTED queue.
//
// (h) Skip: clicking Skip transitions the pack to Skipped and removes it.
//
// (i) RBAC: a contractor cannot see or reach the surface.

const SMOKE_EMAIL = "smoke@example.test"; // STAFF + ADMIN
const SMOKE_PASSWORD = "hunter2hunter2";

async function login(page: Page, email = SMOKE_EMAIL) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(SMOKE_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("dashboard")).toBeVisible();
}

async function resetPacks(page: Page) {
  await page.evaluate(async () => {
    await fetch("/api/v1/realestate/prep/packs/test-reset", {
      method: "POST",
      headers: {
        Authorization: `Bearer msw-mock-jwt-token`,
      },
    });
  });
}

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

// ---------------------------------------------------------------------------
// (a) Navigation
// ---------------------------------------------------------------------------

test("listing-prep nav item is visible to staff", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("link", { name: "Listing prep" })).toBeVisible();
});

test("the listing-prep-studio page mounts at /listing-prep-studio", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: "Listing prep" }).click();
  await expect(page).toHaveURL(/\/listing-prep-studio$/);
  await expect(page.getByTestId("listing-prep-studio-page")).toBeVisible();
});

// ---------------------------------------------------------------------------
// (b) Page structure
// ---------------------------------------------------------------------------

test("the page renders the listing selector card and the drafted queue", async ({
  page,
}) => {
  await login(page);
  await page.goto("/listing-prep-studio");
  await expect(page.getByTestId("listing-prep-studio-page")).toBeVisible();
  await expect(page.getByTestId("listing-selector-card")).toBeVisible();
  await expect(page.getByTestId("drafted-queue-section")).toBeVisible();
});

// ---------------------------------------------------------------------------
// (c) Listing picker
// ---------------------------------------------------------------------------

test("seeded listings render as picker buttons", async ({ page }) => {
  await login(page);
  await page.goto("/listing-prep-studio");
  await expect(page.getByTestId("listing-prep-studio-page")).toBeVisible();
  // Two listings are seeded (1442 Lindenwood + 890 Maple Ridge)
  await expect(page.getByTestId("listing-picker-btn")).toHaveCount(2);
});

// ---------------------------------------------------------------------------
// (d) Generate → pack renders with 4-week calendar + held badge
// ---------------------------------------------------------------------------

test("generating a prep pack renders MLS description and 4-week calendar", async ({
  page,
}) => {
  await login(page);
  await page.goto("/listing-prep-studio");
  await expect(page.getByTestId("listing-prep-studio-page")).toBeVisible();

  // Select the first listing
  const firstPickerBtn = page.getByTestId("listing-picker-btn").first();
  await firstPickerBtn.click();

  // The generate form card appears
  await expect(page.getByTestId("generate-form-card")).toBeVisible();

  // Hit generate
  await page.getByTestId("prep-generate-btn").click();

  // Wait for the new pack card to appear in the listing packs section
  await expect(page.getByTestId("prep-pack-card").first()).toBeVisible({
    timeout: 10000,
  });

  // MLS description section is visible and non-empty
  await expect(page.getByTestId("prep-pack-mls-section").first()).toBeVisible();
  await expect(
    page.getByTestId("prep-pack-mls-description").first(),
  ).not.toBeEmpty();

  // 4-week social calendar is visible
  await expect(
    page.getByTestId("prep-pack-calendar-section").first(),
  ).toBeVisible();
  await expect(page.getByTestId("social-calendar").first()).toBeVisible();
});

test("the 4-week calendar renders posts grouped by week", async ({ page }) => {
  await login(page);
  await page.goto("/listing-prep-studio");
  await expect(page.getByTestId("listing-prep-studio-page")).toBeVisible();

  // Select the first listing
  await page.getByTestId("listing-picker-btn").first().click();
  await page.getByTestId("prep-generate-btn").click();

  await expect(page.getByTestId("social-calendar").first()).toBeVisible({
    timeout: 10000,
  });

  // 4 week groups
  const calendarWeeks = page
    .getByTestId("social-calendar")
    .first()
    .getByTestId("calendar-week");
  await expect(calendarWeeks).toHaveCount(4);

  // Posts exist
  const calendarPosts = page
    .getByTestId("social-calendar")
    .first()
    .getByTestId("calendar-post");
  await expect(calendarPosts.first()).toBeVisible();
});

test("the auto-corrected post shows the held badge", async ({ page }) => {
  await login(page);
  await page.goto("/listing-prep-studio");
  await expect(page.getByTestId("listing-prep-studio-page")).toBeVisible();

  // Select the first listing
  await page.getByTestId("listing-picker-btn").first().click();
  await page.getByTestId("prep-generate-btn").click();

  await expect(page.getByTestId("social-calendar").first()).toBeVisible({
    timeout: 10000,
  });

  // At least one calendar-post-held-badge should appear (the seeded held post)
  await expect(
    page.getByTestId("calendar-post-held-badge").first(),
  ).toBeVisible();
  await expect(
    page.getByTestId("calendar-post-held-badge").first(),
  ).toContainText("Auto-corrected");
});

test("the email campaign section renders non-empty content", async ({
  page,
}) => {
  await login(page);
  await page.goto("/listing-prep-studio");
  await expect(page.getByTestId("listing-prep-studio-page")).toBeVisible();

  await page.getByTestId("listing-picker-btn").first().click();
  await page.getByTestId("prep-generate-btn").click();

  await expect(
    page.getByTestId("prep-pack-email-section").first(),
  ).toBeVisible({ timeout: 10000 });
  await expect(
    page.getByTestId("prep-pack-email-campaign").first(),
  ).not.toBeEmpty();
});

// ---------------------------------------------------------------------------
// (e) Fair-Housing flags panel
// ---------------------------------------------------------------------------

test("the DRAFTED queue pack shows the fair-housing flags panel", async ({
  page,
}) => {
  await login(page);
  await page.goto("/listing-prep-studio");
  await expect(page.getByTestId("listing-prep-studio-page")).toBeVisible();

  // The seeded DRAFTED pack is in the queue
  await expect(page.getByTestId("drafted-queue-list")).toBeVisible();
  const queueCard = page
    .getByTestId("drafted-queue-list")
    .getByTestId("prep-pack-card")
    .first();
  await expect(queueCard).toBeVisible();

  // Fair-Housing flags panel renders
  await expect(queueCard.getByTestId("fair-housing-panel")).toBeVisible();
  // Two flags are seeded
  await expect(queueCard.getByTestId("fair-housing-flag")).toHaveCount(2);
  // Held count is shown
  await expect(queueCard.getByTestId("fair-housing-held-count")).toContainText(
    "1 calendar post auto-corrected",
  );
});

// ---------------------------------------------------------------------------
// (f) DRAFTED queue
// ---------------------------------------------------------------------------

test("the DRAFTED queue renders the seeded DRAFTED pack", async ({ page }) => {
  await login(page);
  await page.goto("/listing-prep-studio");
  await expect(page.getByTestId("listing-prep-studio-page")).toBeVisible();

  await expect(page.getByTestId("drafted-queue-list")).toBeVisible();
  // Exactly 1 DRAFTED pack seeded
  await expect(
    page
      .getByTestId("drafted-queue-list")
      .getByTestId("prep-pack-card"),
  ).toHaveCount(1);

  // The status badge shows "Needs review"
  await expect(
    page
      .getByTestId("drafted-queue-list")
      .getByTestId("prep-pack-status")
      .first(),
  ).toHaveText("Needs review");
});

// ---------------------------------------------------------------------------
// (g) Approve
// ---------------------------------------------------------------------------

test("approving the pack transitions it to Approved and removes it from the queue", async ({
  page,
}) => {
  await login(page);
  // Reset so we start clean
  await page.goto("/listing-prep-studio");
  await expect(page.getByTestId("listing-prep-studio-page")).toBeVisible();

  // Approve the DRAFTED pack from the queue
  await expect(page.getByTestId("drafted-queue-list")).toBeVisible();
  const approveBtn = page
    .getByTestId("drafted-queue-list")
    .getByTestId("prep-pack-approve")
    .first();
  await approveBtn.click();

  // Toast
  await expect(page.getByText("Approved — copy is ready to paste out.")).toBeVisible();

  // Pack leaves the DRAFTED queue → queue shows empty state
  await expect(page.getByTestId("drafted-queue-empty")).toBeVisible();
});

// ---------------------------------------------------------------------------
// (h) Skip
// ---------------------------------------------------------------------------

test("skipping the pack removes it from the DRAFTED queue", async ({
  page,
}) => {
  await login(page);
  await page.goto("/listing-prep-studio");
  await expect(page.getByTestId("listing-prep-studio-page")).toBeVisible();

  // Reset to get DRAFTED pack back in case previous test ran first
  await resetPacks(page);
  await page.reload();
  await expect(page.getByTestId("drafted-queue-list")).toBeVisible();

  const skipBtn = page
    .getByTestId("drafted-queue-list")
    .getByTestId("prep-pack-skip")
    .first();
  await skipBtn.click();

  // Toast
  await expect(page.getByText("Skipped.")).toBeVisible();

  // Pack leaves the DRAFTED queue
  await expect(page.getByTestId("drafted-queue-empty")).toBeVisible();
});

// ---------------------------------------------------------------------------
// (i) RBAC: contractor-hidden
// ---------------------------------------------------------------------------

test("a contractor cannot see or reach the listing-prep-studio surface", async ({
  page,
}) => {
  await login(page, "contractor@example.test");

  // Nav item hidden
  await expect(
    page.getByRole("link", { name: "Listing prep" }),
  ).toHaveCount(0);

  // Deep-linking is bounced to the dashboard by RequireNotContractor
  await page.goto("/listing-prep-studio");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("dashboard")).toBeVisible();
});
