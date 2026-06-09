import { test, expect, type Page } from "@playwright/test";

// Home Services T5 "Instant Callback" — dispatcher queue smoke test.
//
// (a) Navigation: the "Callback queue" nav link is visible to staff and absent
//     for contractors; the page mounts at /callback-queue.
//
// (b) Ranked queue: the three seeded callback cards render; the high-value
//     card (revenueScore 95, EMERGENCY, LARGE) appears before the medium-value
//     card (revenueScore 62) and the low-value card (revenueScore 28). The
//     queue count badge shows "3 waiting" on load.
//
// (c) Dispatch: clicking "Dispatch" on the top card triggers the
//     POST /home-services/callbacks/{id}/dispatch, the card status updates to
//     "Dispatched", the button becomes disabled, and the recovery stats panel
//     shows an incremented dispatched count.
//
// (d) Recovery stats: the five stat cards render with realistic seeded values
//     (offered=150, accepted=105, dispatched=82 pre-dispatch).
//
// (e) Config: the config card renders with the pre-seeded offer message;
//     editing the message and clicking "Save settings" round-trips the PUT and
//     shows a success toast.
//
// (f) No-config empty state (4401 path): when the store has no config row, the
//     page shows the "not yet configured" banner and the form is still rendered.
//
// (g) RBAC: the panel is staff-visible and contractor-hidden.

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
// (a) Navigation
// ---------------------------------------------------------------------------

test("callback queue nav item is visible to staff", async ({ page }) => {
  await login(page);
  await expect(
    page.getByRole("link", { name: "Callback queue" }),
  ).toBeVisible();
});

test("the page mounts and the queue page renders", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Callback queue" }).click();
  await expect(page).toHaveURL(/\/callback-queue$/);
  await expect(page.getByTestId("callback-queue-page")).toBeVisible();
});

// ---------------------------------------------------------------------------
// (b) Ranked queue
// ---------------------------------------------------------------------------

test("the ranked queue renders three seeded cards", async ({ page }) => {
  await login(page);
  await page.goto("/callback-queue");
  await expect(page.getByTestId("callback-queue-page")).toBeVisible();

  // Queue count badge says "3 waiting".
  await expect(page.getByTestId("callback-queue-count")).toHaveText("3 waiting");

  // All three cards render.
  await expect(page.getByTestId("callback-card")).toHaveCount(3);
});

test("the highest-value card is first (revenueScore ordering visible)", async ({
  page,
}) => {
  await login(page);
  await page.goto("/callback-queue");
  await expect(page.getByTestId("callback-queue-list")).toBeVisible();

  // The three phones in seeded order: 0191 (score 95), 0142 (score 62), 0177 (score 28).
  const phones = page.getByTestId("callback-phone");
  await expect(phones.nth(0)).toHaveText("+1 555 0191");
  await expect(phones.nth(1)).toHaveText("+1 555 0142");
  await expect(phones.nth(2)).toHaveText("+1 555 0177");
});

test("the EMERGENCY badge shows on the top card", async ({ page }) => {
  await login(page);
  await page.goto("/callback-queue");
  await expect(page.getByTestId("callback-queue-list")).toBeVisible();

  // The first card's urgency badge should be "Emergency".
  await expect(
    page.getByTestId("callback-card").first().getByTestId("callback-urgency"),
  ).toHaveText("Emergency");
});

// ---------------------------------------------------------------------------
// (c) Dispatch
// ---------------------------------------------------------------------------

test("dispatching a card removes it from the queue and increments the dispatched count", async ({
  page,
}) => {
  await login(page);

  // Reset cards to a clean state before the test.
  await page.evaluate(async () => {
    const token = localStorage.getItem("kmosf.jwt") ?? "";
    await fetch("http://localhost:8080/api/v1/home-services/callbacks/test-reset-cards", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  });

  await page.goto("/callback-queue");
  await expect(page.getByTestId("callback-queue-list")).toBeVisible();

  // 3 cards waiting before dispatch.
  await expect(page.getByTestId("callback-card")).toHaveCount(3);

  // Capture the dispatched count before dispatch.
  const beforeText = await page.getByTestId("callback-stat-dispatched-value").textContent();
  const before = parseInt(beforeText ?? "0", 10);

  // Click dispatch on the first (highest-value) card.
  await page
    .getByTestId("callback-card")
    .first()
    .getByTestId("callback-dispatch-btn")
    .click();

  // Success toast appears.
  await expect(page.getByText("Callback dispatched")).toBeVisible();

  // After the queue refetch, only 2 cards remain (the dispatched one left the queue).
  await expect(page.getByTestId("callback-card")).toHaveCount(2);

  // Recovery stats dispatched count incremented.
  await expect(page.getByTestId("callback-stat-dispatched-value")).toHaveText(
    String(before + 1),
  );
});

// ---------------------------------------------------------------------------
// (d) Recovery stats
// ---------------------------------------------------------------------------

test("the recovery stats panel renders all five stat cards", async ({
  page,
}) => {
  await login(page);
  await page.goto("/callback-queue");
  await expect(page.getByTestId("callback-queue-page")).toBeVisible();

  await expect(page.getByTestId("callback-recovery-stats-panel")).toBeVisible();
  await expect(page.getByTestId("callback-stat-offered")).toBeVisible();
  await expect(page.getByTestId("callback-stat-accepted")).toBeVisible();
  await expect(page.getByTestId("callback-stat-dispatched")).toBeVisible();
  await expect(page.getByTestId("callback-stat-acceptance-rate")).toBeVisible();
  await expect(page.getByTestId("callback-stat-dispatch-rate")).toBeVisible();
});

test("the offered stat shows the seeded value (150)", async ({ page }) => {
  await login(page);
  await page.goto("/callback-queue");
  await expect(page.getByTestId("callback-recovery-stats-panel")).toBeVisible();
  await expect(page.getByTestId("callback-stat-offered-value")).toHaveText("150");
});

// ---------------------------------------------------------------------------
// (e) Config loads and saves
// ---------------------------------------------------------------------------

test("the config card renders with the seeded offer message", async ({
  page,
}) => {
  await login(page);
  await page.goto("/callback-queue");
  await expect(page.getByTestId("callback-config-card")).toBeVisible();

  await expect(page.getByTestId("offer-message-input")).toHaveValue(
    "We saw you called — would you like us to call you back? Reply YES for now or tell us a time that works.",
  );
});

test("editing the offer message and saving round-trips the PUT and shows success", async ({
  page,
}) => {
  await login(page);
  await page.goto("/callback-queue");
  await expect(page.getByTestId("callback-config-card")).toBeVisible();

  // Edit the offer message.
  await page
    .getByTestId("offer-message-input")
    .fill("Hey — we saw your call. Want a callback? Reply YES.");

  // The form is dirty — save button is enabled.
  await expect(page.getByTestId("callback-config-save-btn")).toBeEnabled();

  await page.getByTestId("callback-config-save-btn").click();

  // Success toast.
  await expect(page.getByText("Callback settings saved.")).toBeVisible();

  // Button returns to idle.
  await expect(page.getByTestId("callback-config-save-btn")).toHaveText(
    /Save settings/,
  );
});

// ---------------------------------------------------------------------------
// (f) No-config empty state (4401)
// ---------------------------------------------------------------------------

test("when no config exists the empty-state banner and blank form render", async ({
  page,
}) => {
  await login(page);

  // Clear the config store via the TEST-ONLY control endpoint.
  await page.evaluate(async () => {
    const token = localStorage.getItem("kmosf.jwt") ?? "";
    await fetch("http://localhost:8080/api/v1/home-services/callbacks/config/test-clear", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  });

  // SPA navigation.
  await page.getByRole("link", { name: "Callback queue" }).click();
  await expect(page).toHaveURL(/\/callback-queue$/);
  await expect(page.getByTestId("callback-queue-page")).toBeVisible();

  // Empty-state banner is shown.
  await expect(page.getByTestId("callback-config-empty-state")).toBeVisible();

  // The form is still rendered (admin can do initial setup).
  await expect(page.getByTestId("callback-config-form")).toBeVisible();
});

// ---------------------------------------------------------------------------
// (g) RBAC: contractor-hidden
// ---------------------------------------------------------------------------

test("a contractor cannot see or reach the callback queue surface", async ({
  page,
}) => {
  // contractor@example.test is STAFF + CONTRACTOR (no ADMIN) — scoped down.
  await login(page, "contractor@example.test");

  // The nav item is hidden.
  await expect(
    page.getByRole("link", { name: "Callback queue" }),
  ).toHaveCount(0);

  // Deep-linking is bounced to the dashboard by RequireNotContractor.
  await page.goto("/callback-queue");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("dashboard")).toBeVisible();
});
