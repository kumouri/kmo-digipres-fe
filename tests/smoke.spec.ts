import { test, expect, type Page } from "@playwright/test";

// These tests mirror the behavioral spec from the backend's
// repos/kmo-digipres-be/src/test/java/com/kumouri/kmodigipresbe/auth/AuthSmokeIT.java
// and the controller contracts in /controller/. MSW (started by main.tsx when
// VITE_USE_MOCKS=true) provides the backend responses, so no Spring Boot is
// required.

const SMOKE_EMAIL = "smoke@example.test";
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

// --- Auth (mirrors AuthSmokeIT.java) ---------------------------------------

test("unauthenticated visit to a protected route redirects to /login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByTestId("login-page")).toBeVisible();
});

test("successful login lands on the dashboard with the user menu visible", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL("http://localhost:5173/");
  await expect(page.getByTestId("user-menu-trigger")).toBeVisible();
  await expect(page.getByText(SMOKE_EMAIL)).toBeVisible();
});

test("wrong password keeps the user on /login and surfaces an error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(SMOKE_EMAIL);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText(/invalid email or password/i)).toBeVisible();
});

// --- Contacts ---------------------------------------------------------------

test("contacts list renders the seeded contact", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Contacts" }).click();
  await expect(page).toHaveURL(/\/contacts$/);
  await expect(page.getByTestId("contacts-page")).toBeVisible();
  await expect(page.getByTestId("contact-row-name").first()).toContainText("Ada Lovelace");
});

test("clicking a contact row opens detail with timeline tab", async ({ page }) => {
  await login(page);
  await page.goto("/contacts");
  await page.getByTestId("contact-row-name").first().click();
  await expect(page.getByTestId("contact-detail")).toBeVisible();
  await page.getByTestId("timeline-tab").click();
  await expect(page.getByTestId("contact-timeline")).toBeVisible();
  await expect(page.getByText("Initial outreach")).toBeVisible();
});

test("creating a contact via the dialog navigates to its detail", async ({ page }) => {
  await login(page);
  await page.goto("/contacts");
  await page.getByTestId("new-contact").click();

  // Dialog is open; fill the required field and submit.
  await page.getByLabel("Display name *").fill("Grace Hopper");
  await page.getByRole("button", { name: "Create contact" }).click();

  await expect(page.getByTestId("contact-detail")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Grace Hopper" })).toBeVisible();
});

// --- Companies --------------------------------------------------------------

test("companies list renders the seeded company", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Companies" }).click();
  await expect(page).toHaveURL(/\/companies$/);
  await expect(page.getByTestId("companies-page")).toBeVisible();
  await expect(page.getByTestId("company-row-name").first()).toContainText(
    "Analytical Engines",
  );
});

test("creating a company via the dialog navigates to its detail", async ({ page }) => {
  await login(page);
  await page.goto("/companies");
  await page.getByTestId("new-company").click();

  await page.getByLabel("Name *").fill("Babbage & Co.");
  await page.getByRole("button", { name: "Create company" }).click();

  await expect(page.getByTestId("company-detail")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Babbage & Co." })).toBeVisible();
});

// --- Deals ------------------------------------------------------------------

test("deals pipeline renders seeded deal in its QUALIFIED column", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Deals" }).click();
  await expect(page).toHaveURL(/\/deals$/);
  await expect(page.getByTestId("deals-pipeline")).toBeVisible();
  const qualifiedColumn = page.getByTestId("pipeline-column-QUALIFIED");
  await expect(qualifiedColumn).toContainText("Analytical Engine retainer");
});

test("moving a deal to NEGOTIATION via the pipeline buttons updates the column", async ({ page }) => {
  await login(page);
  await page.goto("/deals");

  const qualified = page.getByTestId("pipeline-column-QUALIFIED");
  const negotiation = page.getByTestId("pipeline-column-NEGOTIATION");
  await expect(qualified).toContainText("Analytical Engine retainer");

  await qualified.getByTestId("move-deal").click();
  await qualified.getByTestId("move-to-NEGOTIATION").click();

  await expect(negotiation).toContainText("Analytical Engine retainer");
});

test("dragging a deal card to another column moves the deal", async ({ page }) => {
  await login(page);
  await page.goto("/deals");

  const qualified = page.getByTestId("pipeline-column-QUALIFIED");
  const proposal = page.getByTestId("pipeline-column-PROPOSAL");

  await expect(qualified).toContainText("Analytical Engine retainer");

  // @dnd-kit's PointerSensor needs an intermediate pointermove (activation
  // constraint is 5px). Playwright's high-level dragTo() emits one move,
  // which sometimes isn't enough. Drive the mouse manually with explicit
  // steps so the sensor activates reliably.
  const card = qualified.getByTestId("deal-card").first();
  const sourceBox = await card.boundingBox();
  const targetBox = await proposal.boundingBox();
  if (!sourceBox || !targetBox) throw new Error("missing bounding box");

  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2,
  );
  await page.mouse.down();
  // Small wiggle past the 5px activation threshold.
  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2 + 10,
    sourceBox.y + sourceBox.height / 2,
  );
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height / 2,
    { steps: 10 },
  );
  await page.mouse.up();

  await expect(proposal).toContainText("Analytical Engine retainer");
});

test("deal value field rejects negative numbers via inline error", async ({ page }) => {
  await login(page);
  await page.goto("/deals");
  await page.getByTestId("new-deal").click();

  await page.getByLabel("Title *").fill("Bad value deal");
  // The browser may coerce -1 in a number input, but the zod regex catches
  // anything that isn't a non-negative number with <=2 decimals.
  await page.getByLabel("Value").fill("1.234");
  await page.getByRole("button", { name: "Create deal" }).click();

  await expect(
    page.getByText("Use a non-negative number with at most 2 decimal places"),
  ).toBeVisible();
});

test("moving a deal to LOST requires a reason and reflects on detail", async ({ page }) => {
  await login(page);
  await page.goto("/deals");
  const qualified = page.getByTestId("pipeline-column-QUALIFIED");

  await qualified.getByTestId("move-deal").click();
  await qualified.getByTestId("move-to-LOST").click();

  // Confirm button is disabled until a reason is typed.
  const confirm = page.getByTestId("confirm-lost");
  await expect(confirm).toBeDisabled();
  await page.getByTestId("lost-reason-input").fill("Budget pulled");
  await confirm.click();

  await expect(page.getByTestId("pipeline-column-LOST")).toContainText(
    "Analytical Engine retainer",
  );
});

// --- Activities + email composer --------------------------------------------

test("activities list renders the seeded activity", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Activities" }).click();
  await expect(page).toHaveURL(/\/activities$/);
  await expect(page.getByTestId("activities-page")).toBeVisible();
  await expect(page.getByTestId("activity-row-summary").first()).toContainText(
    "Initial outreach",
  );
});

test("editing an activity updates its summary on the list view", async ({ page }) => {
  await login(page);
  await page.goto("/activities");
  await page.getByTestId("activity-row-summary").first().click();
  await expect(page.getByTestId("activity-detail")).toBeVisible();

  const summary = page.getByLabel("Summary *");
  await summary.fill("Updated outreach summary");
  await page.getByRole("button", { name: "Save changes" }).click();

  await page.getByRole("link", { name: "All activities" }).click();
  await expect(page.getByTestId("activity-row-summary").first()).toContainText(
    "Updated outreach summary",
  );
});

test("deleting an activity removes it from the list and redirects", async ({ page }) => {
  await login(page);
  await page.goto("/activities");
  // Snapshot the seeded summary so we can assert its absence later.
  const seededSummary = await page
    .getByTestId("activity-row-summary")
    .first()
    .innerText();

  await page.getByTestId("activity-row-summary").first().click();
  await page.getByTestId("delete-activity").click();
  await page.getByTestId("confirm-delete-activity").click();

  await expect(page).toHaveURL(/\/activities$/);
  await expect(page.getByText(seededSummary, { exact: true })).toHaveCount(0);
});

test("sending an email from contact detail adds an EMAIL activity to the timeline", async ({ page }) => {
  await login(page);
  await page.goto("/contacts");
  await page.getByTestId("contact-row-name").first().click();
  await page.getByTestId("timeline-tab").click();
  await page.getByTestId("send-email-button").click();

  await page.getByLabel("Subject").fill("Following up on our chat");
  await page.getByLabel("Body").fill("Hi Ada — circling back on next steps.");
  await page.getByTestId("send-email-submit").click();

  // Backend logs an Activity automatically; the timeline query refetches.
  await expect(
    page.getByText("Following up on our chat", { exact: false }),
  ).toBeVisible();
});

// --- Public widgets (Phase 4) ----------------------------------------------
// /embed-demo renders the standalone library components unauthenticated.

test("embed-demo: booking widget loads slots without a login", async ({ page }) => {
  await page.goto("/embed-demo");
  await expect(page.getByTestId("booking-widget")).toBeVisible();
  await expect(page.getByText("Intro call with the team")).toBeVisible();
  const slots = page.getByTestId("slot-button");
  await expect(slots.first()).toBeVisible();
  // Mock-store seeds three slots; assert at least one rendered.
  expect(await slots.count()).toBeGreaterThan(0);
});

test("embed-demo: picking a slot, submitting the form, lands on the success state", async ({ page }) => {
  await page.goto("/embed-demo");
  await expect(page.getByTestId("booking-widget")).toBeVisible();

  await page.getByTestId("slot-button").first().click();
  await expect(page.getByTestId("selected-slot-label")).toBeVisible();

  await page.getByTestId("booking-name-input").fill("Visitor McTest");
  await page.getByTestId("booking-email-input").fill("visitor@example.test");
  await page.getByTestId("confirm-booking").click();

  await expect(page.getByTestId("booking-widget-success")).toBeVisible();
  await expect(page.getByText(/You're booked\./)).toBeVisible();
});

test("embed-demo: public contact form ships disabled until the BE endpoint lands", async ({ page }) => {
  await page.goto("/embed-demo");
  await expect(page.getByTestId("public-contact-form")).toBeVisible();
  await expect(page.getByTestId("public-contact-form-banner")).toBeVisible();
  await expect(page.getByTestId("pcf-submit")).toBeDisabled();
});
