import { test, expect, type Page } from "@playwright/test";

// Home Services — "Front Desk That Never Sleeps" — Missed-Call Inbox (HS-4).
//
// The BE turns an after-hours voicemail into a triaged DRAFT WorkOrder (trade,
// urgency, symptom, job-value, transcript, + an MMS equipment-nameplate read).
// This staff queue (/missed-calls) lists those DRAFTs as cards, each with
// Schedule (assign a tech + start time → promotes onto the dispatch board) and
// Dismiss (→ CANCELLED, recoverable) actions. Both PUT /work-orders/:id with a
// status transition, and the list returns DRAFT only, so acting on a card
// removes it from the queue.
//
// MSW seeds three DRAFTs — an EMERGENCY HVAC (with an equipment read), an
// URGENT plumbing, and a ROUTINE electrical. The store resets per page load, so
// each test is deterministic. Hidden from a scoped-down contractor.

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

test("missed-calls nav item is visible to staff", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("link", { name: "Missed Calls" })).toBeVisible();
});

test("the inbox renders the seeded triaged voicemails", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Missed Calls" }).click();
  await expect(page).toHaveURL(/\/missed-calls$/);
  await expect(page.getByTestId("missed-call-inbox-page")).toBeVisible();

  // All three seeded DRAFTs render.
  await expect(page.getByTestId("missed-call-card")).toHaveCount(3);
  await expect(page.getByTestId("missed-call-count")).toContainText("3 waiting");

  // The EMERGENCY HVAC card shows its trade, urgency, symptom + transcript.
  const emergency = page
    .getByTestId("missed-call-card")
    .filter({ has: page.getByText("Emergency") })
    .first();
  await expect(emergency.getByTestId("missed-call-trade")).toContainText("HVAC");
  await expect(emergency.getByTestId("missed-call-urgency")).toContainText(
    "Emergency",
  );
  await expect(emergency.getByTestId("missed-call-symptom")).toContainText(
    "No heat",
  );
  // HS-2's MMS equipment-nameplate read, surfaced from the notes blob.
  await expect(emergency.getByTestId("missed-call-equipment")).toContainText(
    "Carrier 58STA",
  );
  await expect(emergency.getByTestId("missed-call-transcript")).toContainText(
    "Maria Lopez",
  );
});

// ---------------------------------------------------------------------------
// Schedule — assign a tech + start time, card drops off the queue
// ---------------------------------------------------------------------------

test("scheduling a job assigns a tech and clears it from the inbox", async ({
  page,
}) => {
  await login(page);
  await page.goto("/missed-calls");
  await expect(page.getByTestId("missed-call-card")).toHaveCount(3);

  // Open Schedule on the first card.
  await page
    .getByTestId("missed-call-card")
    .first()
    .getByTestId("missed-call-schedule")
    .click();
  await expect(page.getByTestId("schedule-dialog")).toBeVisible();

  // Pick a technician from the team directory.
  await page.getByTestId("schedule-technician").click();
  await page.getByRole("option").first().click();

  // Set a start time and confirm.
  await page.getByTestId("schedule-start").fill("2026-06-08T09:00");
  await page.getByTestId("schedule-confirm").click();

  await expect(
    page.getByText("Job scheduled — it's on the dispatch board now."),
  ).toBeVisible();
  // The scheduled card drops off (list is DRAFT-only).
  await expect(page.getByTestId("missed-call-card")).toHaveCount(2);
});

// ---------------------------------------------------------------------------
// Dismiss — confirm, card drops off the queue
// ---------------------------------------------------------------------------

test("dismissing a lead removes it from the inbox", async ({ page }) => {
  await login(page);
  await page.goto("/missed-calls");
  await expect(page.getByTestId("missed-call-card")).toHaveCount(3);

  await page
    .getByTestId("missed-call-card")
    .first()
    .getByTestId("missed-call-dismiss")
    .click();
  await expect(page.getByTestId("dismiss-dialog")).toBeVisible();
  await page.getByTestId("dismiss-confirm").click();

  await expect(page.getByText("Cleared from your inbox.")).toBeVisible();
  await expect(page.getByTestId("missed-call-card")).toHaveCount(2);
});

// ---------------------------------------------------------------------------
// Empty state (after clearing the queue)
// ---------------------------------------------------------------------------

test("clearing the queue shows the empty state", async ({ page }) => {
  await login(page);
  await page.goto("/missed-calls");
  await expect(page.getByTestId("missed-call-card")).toHaveCount(3);

  // Dismiss all three.
  for (let remaining = 3; remaining > 0; remaining--) {
    await page
      .getByTestId("missed-call-card")
      .first()
      .getByTestId("missed-call-dismiss")
      .click();
    await page.getByTestId("dismiss-confirm").click();
    await expect(page.getByTestId("missed-call-card")).toHaveCount(remaining - 1);
  }

  await expect(page.getByTestId("missed-call-empty")).toBeVisible();
  await expect(page.getByTestId("missed-call-empty")).toContainText(
    "Inbox zero",
  );
});

// ---------------------------------------------------------------------------
// RBAC: a scoped-down contractor doesn't see the queue
// ---------------------------------------------------------------------------

test("a contractor cannot reach the missed-calls route", async ({ page }) => {
  // contractor@example.test is STAFF + CONTRACTOR (no ADMIN) — scoped down.
  await page.goto("/login");
  await page.getByLabel("Email").fill("contractor@example.test");
  await page.getByLabel("Password").fill(SMOKE_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("dashboard")).toBeVisible();

  // The nav item is hidden…
  await expect(
    page.getByRole("link", { name: "Missed Calls" }),
  ).toHaveCount(0);

  // …and a deep-link is bounced back to the dashboard by <RequireNotContractor>.
  await page.goto("/missed-calls");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("dashboard")).toBeVisible();
});
