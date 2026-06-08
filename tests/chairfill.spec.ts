import { test, expect, type Page } from "@playwright/test";

// ChairFill — salon flagship (CF-5) — the three staff-facing FE surfaces.
//
// (a) No-show risk view (/no-show-risk): upcoming bookings sorted highest-risk
//     first, each with a color-coded tier badge (HIGH=red / MEDIUM / LOW) + the
//     score source. MSW seeds a HIGH, a MEDIUM, two LOW.
// (b) Waitlist board (/waitlist): two columns — OPEN entries (who's waiting) +
//     recent offers (with OFFERED/CLAIMED/SUPERSEDED status). MSW seeds 3 OPEN
//     entries + 3 offers incl. a live OFFERED and a CLAIMED.
// (c) Salon review inbox (/salon-reviews): the shared review-replies queue plus
//     a paste-in action that POSTs /chairfill/reviews/draft → a new DRAFTED
//     reply in that same queue.
//
// All three are staff-visible + contractor-hidden (the BE board/draft routes
// are STAFF-gated). The store resets per page load, so each test is
// deterministic.

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
// (a) No-show risk view
// ---------------------------------------------------------------------------

test("no-show risk nav item is visible to staff", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("link", { name: "No-show risk" })).toBeVisible();
});

test("the risk view renders upcoming bookings with color-coded risk badges", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: "No-show risk" }).click();
  await expect(page).toHaveURL(/\/no-show-risk$/);
  await expect(page.getByTestId("no-show-risk-page")).toBeVisible();

  // All four seeded bookings render.
  await expect(page.getByTestId("risk-booking-card")).toHaveCount(4);
  // One is HIGH risk — the header badge calls it out.
  await expect(page.getByTestId("risk-high-count")).toContainText("1 high-risk");

  // The HIGH-risk card reads as such: red-tier badge + the warm tier label,
  // the score percent, and a deposit suggestion.
  const high = page
    .getByTestId("risk-booking-card")
    .filter({ has: page.getByText("High risk") })
    .first();
  await expect(high.getByTestId("risk-booking-badge")).toContainText("High risk");
  await expect(high.getByTestId("risk-booking-score")).toContainText("78%");
  await expect(high.getByTestId("risk-booking-client")).toContainText(
    "Ada Lovelace",
  );

  // The tiers render across the list (HIGH + MEDIUM + LOW all present).
  await expect(page.getByText("High risk")).toBeVisible();
  await expect(page.getByText("Some risk")).toBeVisible();
  await expect(page.getByText("Low risk").first()).toBeVisible();

  // Highest-risk first: the first card is the HIGH one.
  await expect(
    page.getByTestId("risk-booking-card").first().getByTestId("risk-booking-badge"),
  ).toContainText("High risk");
});

// ---------------------------------------------------------------------------
// (b) Waitlist board
// ---------------------------------------------------------------------------

test("waitlist nav item is visible to staff", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("link", { name: "Waitlist" })).toBeVisible();
});

test("the waitlist board renders OPEN entries and recent offers", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: "Waitlist" }).click();
  await expect(page).toHaveURL(/\/waitlist$/);
  await expect(page.getByTestId("waitlist-board-page")).toBeVisible();

  // Waiting column: the 3 seeded OPEN entries.
  await expect(page.getByTestId("waitlist-entries-count")).toContainText("3");
  await expect(page.getByTestId("waitlist-entry-card")).toHaveCount(3);
  // The first entry resolves to a real contact name.
  await expect(
    page.getByTestId("waitlist-entry-client").first(),
  ).toContainText("Ada Lovelace");

  // Offers column: the 3 seeded offers, with their statuses.
  await expect(page.getByTestId("waitlist-offers-count")).toContainText("3");
  await expect(page.getByTestId("waitlist-offer-card")).toHaveCount(3);

  // A live OFFERED slot, a CLAIMED one, and a SUPERSEDED one all render with
  // their humanized status labels.
  await expect(page.getByText("Waiting on reply")).toBeVisible();
  await expect(page.getByText("Claimed")).toBeVisible();
  await expect(page.getByText("Filled by someone else")).toBeVisible();
});

// ---------------------------------------------------------------------------
// (c) Salon review inbox — paste-in drafts into the shared queue
// ---------------------------------------------------------------------------

test("salon reviews nav item is visible to staff", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("link", { name: "Salon reviews" })).toBeVisible();
});

test("the review inbox shows the shared queue and a paste-in action", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: "Salon reviews" }).click();
  await expect(page).toHaveURL(/\/salon-reviews$/);
  await expect(page.getByTestId("salon-review-inbox-page")).toBeVisible();

  // It reuses the existing review-replies queue (2 seeded DRAFTED replies).
  await expect(page.getByTestId("review-replies-page")).toBeVisible();
  await expect(page.getByTestId("review-reply-card")).toHaveCount(2);

  // And it offers the paste-in entry point.
  await expect(page.getByTestId("review-paste-in-open")).toBeVisible();
});

test("pasting in a review drafts a reply into the queue", async ({ page }) => {
  await login(page);
  await page.goto("/salon-reviews");
  await expect(page.getByTestId("review-reply-card")).toHaveCount(2);

  // Open the paste-in dialog and drop in a review.
  await page.getByTestId("review-paste-in-open").click();
  await expect(page.getByTestId("review-paste-in-dialog")).toBeVisible();
  await page
    .getByTestId("review-paste-in-comment")
    .fill(
      "Absolutely loved my balayage — best color I've ever had. The whole team made me feel so welcome!",
    );
  await page.getByTestId("review-paste-in-name").fill("Jamie R.");
  await page.getByTestId("review-paste-in-submit").click();

  // The toast confirms, and the new DRAFTED reply joins the queue (2 → 3).
  await expect(
    page.getByText("Drafted a reply — it's in your queue below for a look."),
  ).toBeVisible();
  await expect(page.getByTestId("review-reply-card")).toHaveCount(3);
});

test("the paste-in submit is disabled until a review is entered", async ({
  page,
}) => {
  await login(page);
  await page.goto("/salon-reviews");
  await page.getByTestId("review-paste-in-open").click();
  await expect(page.getByTestId("review-paste-in-dialog")).toBeVisible();

  // No comment yet → submit disabled.
  await expect(page.getByTestId("review-paste-in-submit")).toBeDisabled();
  await page.getByTestId("review-paste-in-comment").fill("Great cut, thanks!");
  await expect(page.getByTestId("review-paste-in-submit")).toBeEnabled();
});

// ---------------------------------------------------------------------------
// RBAC: a scoped-down contractor sees none of the three surfaces
// ---------------------------------------------------------------------------

test("a contractor cannot see or reach the ChairFill surfaces", async ({
  page,
}) => {
  // contractor@example.test is STAFF + CONTRACTOR (no ADMIN) — scoped down.
  await login(page, "contractor@example.test");

  // The nav items are hidden…
  await expect(page.getByRole("link", { name: "No-show risk" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Waitlist" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Salon reviews" })).toHaveCount(0);

  // …and deep-links are bounced back to the dashboard by RequireNotContractor.
  for (const path of ["/no-show-risk", "/waitlist", "/salon-reviews"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId("dashboard")).toBeVisible();
  }
});
