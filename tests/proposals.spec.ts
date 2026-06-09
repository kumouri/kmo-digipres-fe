import { test, expect, type Page } from "@playwright/test";

// Proposals / SOW Studio — the AI Proposal/SOW generator.
//
// (a) Nav: "Proposals" is visible to staff; not visible to contractors.
//
// (b) Draft flow (/proposals): the discovery-notes textarea + "Draft SOW"
//     button → after submission, renders the priced line-items table, the
//     four prose sections (Scope / Deliverables / Assumptions / Timeline),
//     an AI-drafted badge, the "Download SOW PDF" button, and the
//     "Send for signature" affordance.
//
// (c) Validation: "Draft SOW" is disabled until notes are entered.
//
// (d) RBAC: the Proposals nav item is staff-visible and contractor-hidden.
//
// All tests use MSW mock mode. The store resets per page load → deterministic.

const SMOKE_EMAIL = "smoke@example.test"; // STAFF + ADMIN
const SMOKE_PASSWORD = "hunter2hunter2";
const STAFF_EMAIL = "staff@example.test"; // STAFF only (no ADMIN)
const CONTRACTOR_EMAIL = "contractor@example.test"; // CONTRACTOR (no ADMIN)

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
// (a) Nav visibility
// ---------------------------------------------------------------------------

test("Proposals nav item is visible to staff + admin", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("link", { name: "Proposals" })).toBeVisible();
});

test("Proposals nav item is visible to staff (non-admin)", async ({ page }) => {
  await login(page, STAFF_EMAIL);
  await expect(page.getByRole("link", { name: "Proposals" })).toBeVisible();
});

// ---------------------------------------------------------------------------
// (b) Draft SOW button is disabled when notes are empty
// ---------------------------------------------------------------------------

test("Draft SOW button is disabled until discovery notes are entered", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: "Proposals" }).click();
  await expect(page).toHaveURL(/\/proposals$/);
  await expect(page.getByTestId("proposal-studio-page")).toBeVisible();

  // Button starts disabled (no notes).
  await expect(page.getByTestId("proposal-draft-button")).toBeDisabled();

  // Once notes are entered the button is enabled.
  await page
    .getByTestId("proposal-notes-input")
    .fill("Build a custom CRM integration for Bella Vita.");
  await expect(page.getByTestId("proposal-draft-button")).toBeEnabled();
});

// ---------------------------------------------------------------------------
// (c) Full draft flow — submit notes → priced SOW renders
// ---------------------------------------------------------------------------

test("submitting discovery notes returns a priced SOW draft with all four prose sections", async ({
  page,
}) => {
  await login(page);
  await page.goto("/proposals");
  await expect(page.getByTestId("proposal-studio-page")).toBeVisible();

  // Fill notes and submit.
  await page
    .getByTestId("proposal-notes-input")
    .fill(
      "Build a custom AI-powered CRM integration for Bella Vita: lead capture, " +
        "automated follow-ups, and a staff pipeline dashboard.",
    );
  await page.getByTestId("proposal-draft-button").click();

  // Draft result renders.
  await expect(page.getByTestId("proposal-draft-result")).toBeVisible({
    timeout: 10_000,
  });

  // Priced line-items table is present.
  await expect(page.getByTestId("proposal-line-items")).toBeVisible();
  // At least one line item (the mock seeds 3).
  await expect(page.getByTestId("proposal-line-item").first()).toBeVisible();
  // Total is shown.
  await expect(page.getByTestId("proposal-total-label")).toContainText("Total");
  await expect(page.getByTestId("proposal-total-amount")).toBeVisible();

  // All four SOW prose sections render.
  await expect(page.getByTestId("proposal-prose-scope")).toBeVisible();
  await expect(page.getByTestId("proposal-prose-deliverables")).toBeVisible();
  await expect(page.getByTestId("proposal-prose-assumptions")).toBeVisible();
  await expect(page.getByTestId("proposal-prose-timeline")).toBeVisible();

  // Human-readable section headings — no raw field names.
  await expect(page.getByText("Scope of work")).toBeVisible();
  await expect(page.getByText("Deliverables")).toBeVisible();
  await expect(page.getByText("Assumptions")).toBeVisible();
  await expect(page.getByText("Timeline")).toBeVisible();

  // AI-drafted badge is present (mock always seeds aiApplied=true).
  await expect(page.getByTestId("proposal-ai-badge")).toBeVisible();
  await expect(page.getByTestId("proposal-ai-badge")).toContainText(
    "AI-drafted",
  );
});

// ---------------------------------------------------------------------------
// (d) Download PDF button and send-for-signature affordance
// ---------------------------------------------------------------------------

test("Download SOW PDF button is present after drafting", async ({ page }) => {
  await login(page);
  await page.goto("/proposals");

  await page
    .getByTestId("proposal-notes-input")
    .fill("Quick engagement note for PDF test.");
  await page.getByTestId("proposal-draft-button").click();

  await expect(page.getByTestId("proposal-draft-result")).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByTestId("proposal-download-pdf")).toBeVisible();
  await expect(page.getByTestId("proposal-download-pdf")).toContainText(
    "Download SOW PDF",
  );
});

test("Send-for-signature card is present after drafting", async ({ page }) => {
  await login(page);
  await page.goto("/proposals");

  await page
    .getByTestId("proposal-notes-input")
    .fill("Engagement for signature flow test.");
  await page.getByTestId("proposal-draft-button").click();

  await expect(page.getByTestId("proposal-draft-result")).toBeVisible({
    timeout: 10_000,
  });
  await expect(
    page.getByTestId("proposal-send-for-signature"),
  ).toBeVisible();
  // The "Open quote" link points at the quotes page.
  await expect(page.getByTestId("proposal-go-to-quote")).toBeVisible();
  await expect(page.getByTestId("proposal-go-to-quote")).toContainText(
    "Open quote",
  );
});

// ---------------------------------------------------------------------------
// (e) RBAC: a contractor cannot see or reach Proposals
// ---------------------------------------------------------------------------

test("a contractor cannot see or reach the Proposals surface", async ({
  page,
}) => {
  await login(page, CONTRACTOR_EMAIL);

  // Nav item is hidden.
  await expect(page.getByRole("link", { name: "Proposals" })).toHaveCount(0);

  // Deep-linking is bounced to the dashboard by RequireNotContractor.
  await page.goto("/proposals");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("dashboard")).toBeVisible();
});
