import { test, expect, type Page } from "@playwright/test";

// FrontDesk IQ — Health Practices flagship (FD-5b) — the five staff-facing FE
// surfaces. The headline is PHI-free by construction.
//
// (a) Risk-sorted day view (/risk-day): tomorrow's appointments sorted by
//     no-show risk (HIGH → LOW), showing only logistics (visit-type bucket,
//     lead time, insurance-pending) — never a clinical field. MSW seeds one of
//     each tier (HIGH/MED/LOW/LOW).
// (b) Recall board (/recall): lapsed patients, most overdue first, with the
//     nudged-this-period flag. MSW seeds 3.
// (c) Callback inbox (/callbacks): after-hours voicemail callbacks with an
//     intent bucket and NO transcript (fence F2). MSW seeds 3.
// (d) Review inbox (/review-inbox) — the signature demo: paste a review → a
//     HIPAA-safe draft with the HIPAA lint flags surfaced → approve (copy-ready)
//     / skip. MSW seeds one DRAFTED reply that carries a sample lint flag.
// (e) Appointment console (/appointments): create/list to seed the day view.
//
// All five are staff-visible + contractor-hidden (the BE routes are STAFF-gated).
// The store resets per page load, so each test is deterministic.

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
// (a) Risk-sorted day view
// ---------------------------------------------------------------------------

test("the risk-day nav item is visible to staff", async ({ page }) => {
  await login(page);
  await expect(
    page.getByRole("link", { name: "Tomorrow's risk" }),
  ).toBeVisible();
});

test("the risk-sorted day view renders appointments highest-risk first with logistics only", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: "Tomorrow's risk" }).click();
  await expect(page).toHaveURL(/\/risk-day$/);
  await expect(page.getByTestId("risk-day-page")).toBeVisible();

  // All four seeded appointments render.
  const cards = page.getByTestId("risk-appointment-card");
  await expect(cards).toHaveCount(4);

  // One HIGH-risk — the header badge calls it out.
  await expect(page.getByTestId("risk-high-count")).toContainText("1 high-risk");

  // Sorted highest-risk first: the first card is the HIGH one, resolved to the
  // patient's name, showing the logistics visit-type bucket + risk percent.
  const first = cards.first();
  await expect(first).toHaveAttribute("data-risk-tier", "HIGH");
  await expect(first.getByTestId("risk-appointment-patient")).toContainText(
    "Eleanor Vance",
  );
  await expect(first.getByTestId("risk-appointment-badge")).toContainText(
    "High risk",
  );
  await expect(first.getByTestId("risk-appointment-visit-type")).toContainText(
    "New patient",
  );
  await expect(first.getByTestId("risk-appointment-score")).toContainText(
    "% chance of a no-show",
  );
  // Insurance-pending is a logistics signal we surface.
  await expect(first.getByTestId("risk-appointment-insurance")).toBeVisible();

  // The last card is a LOW-risk one (the sort holds).
  await expect(cards.last()).toHaveAttribute("data-risk-tier", "LOW");

  // PHI-free: nothing clinical leaks into the day view.
  await expect(page.getByTestId("risk-list")).not.toContainText(/diagnos/i);
  await expect(page.getByTestId("risk-list")).not.toContainText(/procedure/i);
});

// ---------------------------------------------------------------------------
// (b) Recall board
// ---------------------------------------------------------------------------

test("the recall board lists lapsed patients, most overdue first, with the nudged flag", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: "Recall board" }).click();
  await expect(page).toHaveURL(/\/recall$/);
  await expect(page.getByTestId("recall-board-page")).toBeVisible();

  const cards = page.getByTestId("recall-card");
  await expect(cards).toHaveCount(3);
  await expect(page.getByTestId("recall-count")).toContainText("3 due");

  // Most overdue first (410 days) — resolves to a name and shows days overdue.
  const first = cards.first();
  await expect(first.getByTestId("recall-card-patient")).toContainText(
    "Harriet Stowe",
  );
  await expect(first.getByTestId("recall-card-overdue")).toContainText(
    "410 days overdue",
  );
  await expect(first.getByTestId("recall-card-not-nudged")).toBeVisible();

  // One of the seeds was already nudged this period.
  await expect(page.getByTestId("recall-card-nudged").first()).toBeVisible();
});

// ---------------------------------------------------------------------------
// (c) Callback inbox — intent bucket + NO transcript (fence F2)
// ---------------------------------------------------------------------------

test("the callback inbox shows the intent bucket and never a transcript", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: "Callback inbox" }).click();
  await expect(page).toHaveURL(/\/callbacks$/);
  await expect(page.getByTestId("callback-inbox-page")).toBeVisible();

  const cards = page.getByTestId("callback-card");
  await expect(cards).toHaveCount(3);
  await expect(page.getByTestId("callback-count")).toContainText(
    "3 to call back",
  );

  // Newest first: the scheduling callback, resolved to the caller + a dialable
  // number + the intent bucket.
  const first = cards.first();
  await expect(first.getByTestId("callback-card-caller")).toContainText(
    "Theo Okafor",
  );
  await expect(first.getByTestId("callback-card-phone")).toContainText(
    "+1 555 0233",
  );
  await expect(first.getByTestId("callback-card-intent")).toContainText(
    "Scheduling",
  );

  // The prescription-refill bucket renders (a logistics routing hint, NOT a Rx).
  await expect(page.getByText("Prescription refill")).toBeVisible();

  // Fence F2: every row asserts "no transcript stored", and the page never
  // renders a transcript element or the spoken words.
  await expect(page.getByTestId("callback-card-no-transcript").first()).toContainText(
    "No transcript stored",
  );
  await expect(page.getByTestId("callback-list")).not.toContainText(
    /transcript:/i,
  );
});

// ---------------------------------------------------------------------------
// (d) Review inbox — the signature demo: HIPAA-safe draft + lint flags
// ---------------------------------------------------------------------------

test("the review inbox shows a HIPAA-safe draft with its lint flags and can approve it", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: "Review inbox" }).click();
  await expect(page).toHaveURL(/\/review-inbox$/);
  await expect(page.getByTestId("frontdesk-review-inbox-page")).toBeVisible();

  // The seeded DRAFTED reply renders with its draft text and the HIPAA check.
  await expect(page.getByTestId("frontdesk-review-card")).toHaveCount(1);
  await expect(page.getByTestId("frontdesk-review-count")).toContainText(
    "1 waiting",
  );
  await expect(page.getByTestId("frontdesk-review-draft")).toContainText(
    "thank you for taking the time",
  );

  // The HIPAA lint surfaced a patient-status flag on the seeded draft.
  await expect(page.getByTestId("frontdesk-review-hipaa-flags")).toBeVisible();
  await expect(
    page.getByTestId("frontdesk-review-hipaa-flag").first(),
  ).toContainText("Confirms patient status");

  // Approving it (copy-ready) clears it from the DRAFTED queue.
  await page.getByTestId("frontdesk-review-approve").click();
  await expect(
    page.getByText("Approved — it's copy-ready to paste into Google."),
  ).toBeVisible();
  await expect(page.getByTestId("frontdesk-review-empty")).toBeVisible();
});

test("pasting in a review drafts a HIPAA-safe reply that lands clean in the queue", async ({
  page,
}) => {
  await login(page);
  await page.goto("/review-inbox");
  await expect(page.getByTestId("frontdesk-review-card")).toHaveCount(1);

  // Paste in a critical review.
  await page.getByTestId("frontdesk-review-paste-in-open").click();
  await expect(
    page.getByTestId("frontdesk-review-paste-in-dialog"),
  ).toBeVisible();
  await page
    .getByTestId("frontdesk-review-paste-in-comment")
    .fill("Front desk never answered my calls. Very frustrating experience.");
  await page.getByTestId("frontdesk-review-paste-in-name").fill("Casey R.");
  await page.getByTestId("frontdesk-review-paste-in-submit").click();

  // The new draft joins the queue (1 → 2). The canned paste-in draft is
  // HIPAA-safe by construction → the all-clear panel renders for it.
  await expect(page.getByTestId("frontdesk-review-card")).toHaveCount(2);
  await expect(
    page.getByTestId("frontdesk-review-hipaa-clean").first(),
  ).toContainText("HIPAA-safe");
});

test("skipping a review draft removes it from the queue", async ({ page }) => {
  await login(page);
  await page.goto("/review-inbox");
  await expect(page.getByTestId("frontdesk-review-card")).toHaveCount(1);

  await page.getByTestId("frontdesk-review-skip").click();
  await expect(page.getByText("Skipped.")).toBeVisible();
  await expect(page.getByTestId("frontdesk-review-empty")).toBeVisible();
});

// ---------------------------------------------------------------------------
// (e) Appointment console
// ---------------------------------------------------------------------------

test("the appointment console lists appointments and can add one", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: "Appointments" }).click();
  await expect(page).toHaveURL(/\/appointments$/);
  await expect(page.getByTestId("appointment-console-page")).toBeVisible();

  // The four seeded appointments render.
  await expect(page.getByTestId("appointment-card")).toHaveCount(4);

  // Add one — it joins the list (4 → 5).
  await page.getByTestId("appointment-new-open").click();
  await expect(page.getByTestId("appointment-new-dialog")).toBeVisible();
  await page
    .getByTestId("appointment-new-start")
    .fill("2026-12-01T09:30");
  await page.getByTestId("appointment-new-submit").click();
  await expect(page.getByText("Appointment added.")).toBeVisible();
  await expect(page.getByTestId("appointment-card")).toHaveCount(5);
});

// ---------------------------------------------------------------------------
// RBAC: a scoped-down contractor sees none of the five surfaces
// ---------------------------------------------------------------------------

test("a contractor cannot see or reach the FrontDesk IQ surfaces", async ({
  page,
}) => {
  // contractor@example.test is STAFF + CONTRACTOR (no ADMIN) — scoped down.
  await login(page, "contractor@example.test");

  // The nav items are hidden…
  await expect(page.getByRole("link", { name: "Appointments" })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Tomorrow's risk" }),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Recall board" })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Callback inbox" }),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Review inbox" })).toHaveCount(0);

  // …and deep-links are bounced back to the dashboard by RequireNotContractor.
  for (const path of [
    "/appointments",
    "/risk-day",
    "/recall",
    "/callbacks",
    "/review-inbox",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId("dashboard")).toBeVisible();
  }
});
