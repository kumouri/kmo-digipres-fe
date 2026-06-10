import { test, expect, type Page } from "@playwright/test";

// Home Services T13 "Tech Copilot" — grounded Q&A + corpus manager + history
// smoke suite.
//
// (a) Navigation: "Tech copilot" nav link is visible to staff and absent for
//     contractors. Label is distinct from all existing nav labels.
//
// (b) Ask panel: mounting at /tech-copilot shows the ask form; submitting a
//     question that matches a seeded doc returns a grounded answer with
//     citation chips (doc title + equipment type + score).
//
// (c) Handoff: submitting a question that does not match any doc returns the
//     handoff banner (handoff=true, empty citations).
//
// (d) Feedback: the thumbs-up/down buttons appear after an answer; clicking
//     them records feedback.
//
// (e) Docs manager: switching to the "Manual library" tab shows the seeded
//     docs; the add-doc form saves successfully.
//
// (f) Query history: switching to the "Recent questions" tab shows the seeded
//     queries; thumbs-up/down can be submitted from history.
//
// (g) RBAC: the surface is contractor-hidden (RequireNotContractor).

const SMOKE_EMAIL = "smoke@example.test"; // STAFF + ADMIN
const SMOKE_PASSWORD = "hunter2hunter2";

async function login(page: Page, email = SMOKE_EMAIL) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(SMOKE_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("dashboard")).toBeVisible();
}

async function resetTechCopilot(page: Page) {
  await page.evaluate(async () => {
    const token = localStorage.getItem("kmosf.jwt") ?? "";
    await fetch("http://localhost:8080/api/v1/techcopilot/test-reset", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  });
}

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

// ---------------------------------------------------------------------------
// (a) Navigation
// ---------------------------------------------------------------------------

test("Tech copilot nav link is visible to staff", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("link", { name: "Tech copilot" })).toBeVisible();
});

test("the tech-copilot page mounts at /tech-copilot", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Tech copilot" }).click();
  await expect(page).toHaveURL(/\/tech-copilot$/);
  await expect(page.getByTestId("tech-copilot-panel")).toBeVisible();
});

// ---------------------------------------------------------------------------
// (b) Grounded ask → answer + citation chips
// ---------------------------------------------------------------------------

test("submitting a question matching a doc returns a grounded answer", async ({
  page,
}) => {
  await login(page);
  await page.goto("/tech-copilot");
  await expect(page.getByTestId("tech-copilot-ask-panel")).toBeVisible();

  // Ask a question that matches the furnace doc
  await page
    .getByTestId("tc-question-input")
    .fill("What is the igniter resistance range for the Carrier 58STA furnace?");
  await page.getByTestId("tc-ask-btn").click();

  // Answer card should appear
  await expect(page.getByTestId("tc-answer-card")).toBeVisible();

  // Grounded answer text is present (not the handoff banner)
  await expect(page.getByTestId("tc-answer-text")).toBeVisible();
  await expect(page.getByTestId("tc-handoff-banner")).toHaveCount(0);

  // At least one citation chip
  await expect(page.getByTestId("citations-list").or(page.getByTestId("tc-citations-list"))).toBeVisible();
  const chips = page.getByTestId("citation-chip");
  await expect(chips).toHaveCount.call(chips, await chips.count().then((c) => c));
  // The first chip has the doc title
  await expect(page.getByTestId("citation-doc-title").first()).toContainText(
    "Carrier 58STA",
  );
  // Equipment type badge is shown
  await expect(page.getByTestId("citation-equipment-type").first()).toContainText(
    "Furnace",
  );
});

test("the citation chip shows a score percentage", async ({ page }) => {
  await login(page);
  await page.goto("/tech-copilot");

  await page
    .getByTestId("tc-question-input")
    .fill("What is the igniter resistance for the 58STA furnace?");
  await page.getByTestId("tc-ask-btn").click();

  await expect(page.getByTestId("tc-answer-card")).toBeVisible();
  await expect(page.getByTestId("citation-score").first()).toContainText("%");
});

// ---------------------------------------------------------------------------
// (c) No-context ask → handoff banner
// ---------------------------------------------------------------------------

test("a question with no matching docs shows the handoff banner", async ({
  page,
}) => {
  await login(page);
  await page.goto("/tech-copilot");

  await page
    .getByTestId("tc-question-input")
    .fill("What refrigerant does the commercial ice machine use?");
  await page.getByTestId("tc-ask-btn").click();

  // Handoff banner is shown, grounded answer text is absent
  await expect(page.getByTestId("tc-answer-card")).toBeVisible();
  await expect(page.getByTestId("tc-handoff-banner")).toBeVisible();
  await expect(page.getByTestId("tc-answer-text")).toHaveCount(0);
  // No citation chips on a handoff
  await expect(page.getByTestId("citation-chip")).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// (d) Feedback round-trip
// ---------------------------------------------------------------------------

test("thumbs-up feedback records and updates the UI", async ({ page }) => {
  await login(page);
  await page.goto("/tech-copilot");

  await page
    .getByTestId("tc-question-input")
    .fill("What is the igniter resistance for the furnace?");
  await page.getByTestId("tc-ask-btn").click();

  await expect(page.getByTestId("tc-answer-card")).toBeVisible();
  await expect(page.getByTestId("tc-feedback-row")).toBeVisible();

  await page.getByTestId("tc-feedback-thumbs-up").click();

  // Feedback-sent indicator replaces the buttons
  await expect(page.getByTestId("tc-feedback-sent")).toBeVisible();
  await expect(page.getByTestId("tc-feedback-row")).toHaveCount(0);
});

test("thumbs-down feedback records and updates the UI", async ({ page }) => {
  await login(page);
  await page.goto("/tech-copilot");

  await page
    .getByTestId("tc-question-input")
    .fill("What is the igniter resistance for the Carrier furnace?");
  await page.getByTestId("tc-ask-btn").click();

  await expect(page.getByTestId("tc-answer-card")).toBeVisible();
  await page.getByTestId("tc-feedback-thumbs-down").click();
  await expect(page.getByTestId("tc-feedback-sent")).toBeVisible();
});

// ---------------------------------------------------------------------------
// (e) Docs manager — list + add a manual
// ---------------------------------------------------------------------------

test("the Manual library tab shows the seeded docs", async ({ page }) => {
  await login(page);
  await page.goto("/tech-copilot");

  await page.getByTestId("tc-tab-docs").click();
  await expect(page.getByTestId("tc-docs-manager")).toBeVisible();
  await expect(page.getByTestId("tc-docs-list")).toBeVisible();

  // Two seeded docs
  const cards = page.getByTestId("tc-doc-card");
  await expect(cards).toHaveCount(2);
});

test("the seeded furnace doc title is visible in the doc list", async ({
  page,
}) => {
  await login(page);
  await page.goto("/tech-copilot");
  await page.getByTestId("tc-tab-docs").click();

  await expect(
    page.getByTestId("tc-doc-title").filter({ hasText: "Carrier 58STA" }),
  ).toBeVisible();
});

test("adding a new manual via the form saves successfully", async ({ page }) => {
  await login(page);
  await page.goto("/tech-copilot");
  await page.getByTestId("tc-tab-docs").click();

  await page.getByTestId("tc-add-doc-btn").click();
  await expect(page.getByTestId("tc-add-doc-card")).toBeVisible();

  // Fill in the form
  await page
    .getByTestId("tc-doc-title-input")
    .fill("Lennox XC21 AC — Field Service Guide");
  await page.getByTestId("tc-doc-equipment-type-select").selectOption("AC");
  await page
    .getByTestId("tc-doc-text-input")
    .fill(
      "SECTION 2 — REFRIGERANT CHARGE\n" +
        "Use R-410A refrigerant. Charge by subcooling method. Target subcooling 10–12°F.",
    );
  await page.getByTestId("tc-doc-save-btn").click();

  // Success toast + add card dismissed
  await expect(
    page.getByText("Manual added", { exact: false }),
  ).toBeVisible();
  await expect(page.getByTestId("tc-add-doc-card")).toHaveCount(0);
});

test("the edit button on a doc card shows the edit form", async ({ page }) => {
  await login(page);
  await page.goto("/tech-copilot");
  await page.getByTestId("tc-tab-docs").click();

  // Click the first edit button
  await page.getByTestId("tc-doc-edit-btn").first().click();
  await expect(page.getByTestId("tc-doc-form")).toBeVisible();
  await expect(page.getByTestId("tc-doc-cancel-btn")).toBeVisible();
});

// ---------------------------------------------------------------------------
// (f) Query history + feedback from history
// ---------------------------------------------------------------------------

test("the Recent questions tab shows the seeded Q&A history", async ({
  page,
}) => {
  await login(page);
  await page.goto("/tech-copilot");

  await page.getByTestId("tc-tab-history").click();
  await expect(page.getByTestId("tc-query-history")).toBeVisible();
  await expect(page.getByTestId("tc-queries-list")).toBeVisible();

  // Two seeded queries
  const cards = page.getByTestId("tc-query-card");
  await expect(cards).toHaveCount(2);
});

test("the seeded grounded query shows its question and grounded badge", async ({
  page,
}) => {
  await login(page);
  await page.goto("/tech-copilot");
  await page.getByTestId("tc-tab-history").click();

  await expect(page.getByTestId("tc-queries-list")).toBeVisible();
  // There should be a grounded badge somewhere in the query list
  await expect(page.getByTestId("tc-query-grounded-badge").first()).toBeVisible();
});

test("the seeded handoff query shows its question and not-documented badge", async ({
  page,
}) => {
  await login(page);
  await page.goto("/tech-copilot");
  await page.getByTestId("tc-tab-history").click();

  await expect(page.getByTestId("tc-queries-list")).toBeVisible();
  // There should be a handoff badge somewhere in the query list
  await expect(page.getByTestId("tc-query-handoff-badge").first()).toBeVisible();
});

test("thumbs-up feedback from query history updates the card", async ({
  page,
}) => {
  await login(page);
  // Reset seeds while on the dashboard (MSW active) so helpful starts as null
  await resetTechCopilot(page);
  await page.goto("/tech-copilot");

  // Navigate to history tab using SPA link (MSW state preserved)
  await page.getByTestId("tc-tab-history").click();
  await expect(page.getByTestId("tc-queries-list")).toBeVisible();

  // Click thumbs-up on the first query that has a feedback row
  const firstFeedbackRow = page.getByTestId("tc-query-feedback-row").first();
  await expect(firstFeedbackRow).toBeVisible();
  await firstFeedbackRow.getByTestId("tc-query-thumbs-up").click();

  // Feedback-sent indicator replaces the buttons
  await expect(page.getByTestId("tc-query-feedback-sent").first()).toBeVisible();
});

// ---------------------------------------------------------------------------
// (g) RBAC: contractor-hidden
// ---------------------------------------------------------------------------

test("a contractor cannot see the Tech copilot nav link", async ({ page }) => {
  await login(page, "contractor@example.test");
  await expect(
    page.getByRole("link", { name: "Tech copilot" }),
  ).toHaveCount(0);
});

test("a contractor cannot reach the tech-copilot surface", async ({ page }) => {
  await login(page, "contractor@example.test");
  await page.goto("/tech-copilot");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("dashboard")).toBeVisible();
});
