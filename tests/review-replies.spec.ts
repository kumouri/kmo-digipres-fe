import { test, expect, type Page } from "@playwright/test";

// Review replies (Google Business Profile) admin queue.
//
// The backend poller drafts on-brand replies to new Google reviews and leaves
// them DRAFTED. This admin-only queue (/review-replies) lists the drafts, each
// with the review + an editable textarea pre-filled with the AI draft, plus
// Approve & post / Skip actions. ADMIN-guarded on the BE, so the route + nav
// are admin-only.
//
// MSW (handlers.ts + store.ts) seeds two DRAFTED replies — a 5★ and a 2★ — and
// the list endpoint returns only DRAFTED, so posting/skipping a card removes it
// from the queue. The store resets per page load, so each test is deterministic.

const SMOKE_EMAIL = "smoke@example.test"; // STAFF + ADMIN
const SMOKE_PASSWORD = "hunter2hunter2";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(SMOKE_EMAIL);
  await page.getByLabel("Password").fill(SMOKE_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("dashboard")).toBeVisible();
}

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

// ---------------------------------------------------------------------------
// Nav + list rendering
// ---------------------------------------------------------------------------

test("review replies nav item is visible to an admin", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("link", { name: "Review replies" })).toBeVisible();
});

test("review replies list renders the seeded drafts", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Review replies" }).click();
  await expect(page).toHaveURL(/\/review-replies$/);
  await expect(page.getByTestId("review-replies-page")).toBeVisible();

  // Both seeded drafts render as cards.
  await expect(page.getByTestId("review-reply-card")).toHaveCount(2);
  await expect(page.getByTestId("review-replies-count")).toContainText("2 waiting");

  // Each card shows the reviewer, a rating, the comment, and an editable draft.
  await expect(page.getByTestId("review-reply-reviewer").first()).toBeVisible();
  await expect(page.getByTestId("review-rating").first()).toBeVisible();
  await expect(page.getByTestId("review-reply-comment").first()).toBeVisible();
  await expect(page.getByTestId("review-reply-textarea").first()).toBeVisible();

  // The textarea is pre-filled with the drafted reply.
  await expect(page.getByTestId("review-reply-textarea").first()).not.toHaveValue(
    "",
  );
});

// ---------------------------------------------------------------------------
// Approve & post (with an edit)
// ---------------------------------------------------------------------------

test("editing then approving a draft posts it and removes it from the queue", async ({
  page,
}) => {
  await login(page);
  await page.goto("/review-replies");
  await expect(page.getByTestId("review-reply-card")).toHaveCount(2);

  const firstCard = page.getByTestId("review-reply-card").first();
  await firstCard.getByTestId("review-reply-textarea").fill("Edited reply text.");
  await firstCard.getByTestId("review-reply-post").click();

  await expect(page.getByText("Reply posted to Google.")).toBeVisible();
  // The list returns DRAFTED only — the posted one drops off.
  await expect(page.getByTestId("review-reply-card")).toHaveCount(1);
});

// ---------------------------------------------------------------------------
// Skip
// ---------------------------------------------------------------------------

test("skipping a draft removes it from the queue", async ({ page }) => {
  await login(page);
  await page.goto("/review-replies");
  await expect(page.getByTestId("review-reply-card")).toHaveCount(2);

  await page
    .getByTestId("review-reply-card")
    .first()
    .getByTestId("review-reply-skip")
    .click();

  await expect(page.getByText("Reply skipped.")).toBeVisible();
  await expect(page.getByTestId("review-reply-card")).toHaveCount(1);
});

// ---------------------------------------------------------------------------
// Empty state (after clearing the queue)
// ---------------------------------------------------------------------------

test("clearing the queue shows the empty state", async ({ page }) => {
  await login(page);
  await page.goto("/review-replies");
  await expect(page.getByTestId("review-reply-card")).toHaveCount(2);

  // Skip both drafts.
  await page
    .getByTestId("review-reply-card")
    .first()
    .getByTestId("review-reply-skip")
    .click();
  await expect(page.getByText("Reply skipped.")).toBeVisible();
  await expect(page.getByTestId("review-reply-card")).toHaveCount(1);

  await page
    .getByTestId("review-reply-card")
    .first()
    .getByTestId("review-reply-skip")
    .click();
  await expect(page.getByTestId("review-reply-card")).toHaveCount(0);

  await expect(page.getByTestId("review-replies-empty")).toBeVisible();
  await expect(page.getByTestId("review-replies-empty")).toContainText(
    "No review replies waiting",
  );
});

// ---------------------------------------------------------------------------
// RBAC: a non-admin (STAFF) is bounced off the admin-only route
// ---------------------------------------------------------------------------

test("a STAFF (non-admin) user cannot reach the review-replies route", async ({
  page,
}) => {
  // staff@example.test is STAFF-only (no ADMIN).
  await page.goto("/login");
  await page.getByLabel("Email").fill("staff@example.test");
  await page.getByLabel("Password").fill(SMOKE_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("dashboard")).toBeVisible();

  // The nav item is hidden…
  await expect(
    page.getByRole("link", { name: "Review replies" }),
  ).toHaveCount(0);

  // …and a deep-link is redirected back to the dashboard by <RequireAdmin>.
  await page.goto("/review-replies");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("dashboard")).toBeVisible();
});
