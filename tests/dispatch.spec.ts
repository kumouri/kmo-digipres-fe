import { test, expect, type Page } from "@playwright/test";

// Home Services T14 "DispatchIQ" — dispatcher optimize console smoke suite.
//
// (a) Navigation: "Dispatch" nav link is visible to staff and absent for
//     contractors. Label is distinct from all existing nav labels.
//
// (b) Plan loads: mounting at /dispatch shows the date picker and the
//     AI-proposed assignment table (assignments with rationale + fit score).
//
// (c) Skill-matched badge: the HVAC EMERGENCY assignment shows a
//     "Skill matched" badge (skillMatched=true).
//
// (d) Unassigned section: the plan's one unassigned work order (boiler
//     inspection) appears in the Unassigned section with its unassignedReason.
//
// (e) Apply plan: clicking "Apply plan" sends the decisions and shows the
//     applied/skipped result banner.
//
// (f) Re-apply is idempotent: a second click returns applied=0 (all skipped).
//
// (g) Analytics card: the dispatch analytics card loads and shows stats.
//
// (h) RBAC: the surface is contractor-hidden (RequireNotContractor).

const SMOKE_EMAIL = "smoke@example.test"; // STAFF + ADMIN
const SMOKE_PASSWORD = "hunter2hunter2";

async function login(page: Page, email = SMOKE_EMAIL) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(SMOKE_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("dashboard")).toBeVisible();
}

async function resetDispatch(page: Page) {
  await page.evaluate(async () => {
    const token = localStorage.getItem("kmosf.jwt") ?? "";
    await fetch("http://localhost:8080/api/v1/dispatch/test-reset", {
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

test("Dispatch nav link is visible to staff", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("link", { name: "Dispatch" })).toBeVisible();
});

test("the dispatch page mounts at /dispatch", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Dispatch" }).click();
  await expect(page).toHaveURL(/\/dispatch$/);
  await expect(page.getByTestId("dispatch-console")).toBeVisible();
});

// ---------------------------------------------------------------------------
// (b) Plan loads — assignments + rationale + fit score
// ---------------------------------------------------------------------------

test("the dispatch plan loads with the assignment table", async ({ page }) => {
  await login(page);
  await page.goto("/dispatch");

  // Wait for the plan to load
  await expect(page.getByTestId("dispatch-plan-section")).toBeVisible();
  await expect(page.getByTestId("dispatch-assignments-table")).toBeVisible();
});

test("assignment rows show rationale text", async ({ page }) => {
  await login(page);
  await page.goto("/dispatch");

  await expect(page.getByTestId("dispatch-assignments-table")).toBeVisible();

  // At least one rationale cell is visible
  const rationaleCell = page.getByTestId("dispatch-rationale").first();
  await expect(rationaleCell).toBeVisible();
  await expect(rationaleCell).not.toBeEmpty();
});

test("assignment rows show fit scores as percentages", async ({ page }) => {
  await login(page);
  await page.goto("/dispatch");

  await expect(page.getByTestId("dispatch-assignments-table")).toBeVisible();

  // Fit score cells show a percentage
  const scoreCell = page.getByTestId("dispatch-fit-score").first();
  await expect(scoreCell).toBeVisible();
  await expect(scoreCell).toContainText("%");
});

test("the plan summary bar shows open/assigned/unassigned counts", async ({
  page,
}) => {
  await login(page);
  await page.goto("/dispatch");

  await expect(page.getByTestId("dispatch-plan-summary")).toBeVisible();
});

// ---------------------------------------------------------------------------
// (c) Skill-matched badge
// ---------------------------------------------------------------------------

test("skill-matched badge is visible on a matched assignment", async ({
  page,
}) => {
  await login(page);
  await page.goto("/dispatch");

  await expect(page.getByTestId("dispatch-assignments-table")).toBeVisible();

  // The first HVAC assignment has skillMatched=true — "Skill matched" badge
  const skillBadge = page
    .getByTestId("dispatch-skill-badge")
    .filter({ hasText: "Skill matched" })
    .first();
  await expect(skillBadge).toBeVisible();
});

test("EMERGENCY urgency badge is visible for the emergency work order", async ({
  page,
}) => {
  await login(page);
  await page.goto("/dispatch");

  await expect(page.getByTestId("dispatch-assignments-table")).toBeVisible();

  // The HVAC emergency row has urgency=EMERGENCY
  await expect(
    page.getByTestId("dispatch-urgency-badge").filter({ hasText: "Emergency" }),
  ).toBeVisible();
});

// ---------------------------------------------------------------------------
// (d) Unassigned section with unassignedReason
// ---------------------------------------------------------------------------

test("the unassigned section is visible with at least one item", async ({
  page,
}) => {
  await login(page);
  await page.goto("/dispatch");

  await expect(page.getByTestId("dispatch-unassigned-section")).toBeVisible();
  await expect(page.getByTestId("dispatch-unassigned-list")).toBeVisible();

  const items = page.getByTestId("dispatch-unassigned-item");
  await expect(items.first()).toBeVisible();
});

test("the unassigned item shows its unassignedReason", async ({ page }) => {
  await login(page);
  await page.goto("/dispatch");

  await expect(page.getByTestId("dispatch-unassigned-section")).toBeVisible();

  const reason = page.getByTestId("dispatch-unassigned-reason").first();
  await expect(reason).toBeVisible();
  await expect(reason).not.toBeEmpty();
});

test("the boiler inspection appears in the unassigned section", async ({
  page,
}) => {
  await login(page);
  await page.goto("/dispatch");

  await expect(page.getByTestId("dispatch-unassigned-section")).toBeVisible();

  // The seeded unassigned item is "Boiler inspection"
  await expect(
    page
      .getByTestId("dispatch-unassigned-title")
      .filter({ hasText: "Boiler" }),
  ).toBeVisible();
});

// ---------------------------------------------------------------------------
// (e) Apply plan → shows applied/skipped result
// ---------------------------------------------------------------------------

test("clicking Apply plan applies the decisions and shows the result banner", async ({
  page,
}) => {
  await login(page);
  await resetDispatch(page);
  await page.goto("/dispatch");

  await expect(page.getByTestId("dispatch-apply-btn")).toBeVisible();
  await page.getByTestId("dispatch-apply-btn").click();

  // Result banner appears
  await expect(page.getByTestId("dispatch-apply-result")).toBeVisible();
  // Banner text mentions "assigned" (3 applied on first call)
  await expect(page.getByTestId("dispatch-apply-result")).toContainText(
    /assign/i,
  );
});

// ---------------------------------------------------------------------------
// (f) Re-apply is idempotent — applied=0, skipped=3
// ---------------------------------------------------------------------------

test("re-applying the plan returns the already-applied result", async ({
  page,
}) => {
  await login(page);
  await resetDispatch(page);
  await page.goto("/dispatch");

  await expect(page.getByTestId("dispatch-apply-btn")).toBeVisible();

  // First apply
  await page.getByTestId("dispatch-apply-btn").click();
  await expect(page.getByTestId("dispatch-apply-result")).toBeVisible();

  // Dismiss the banner
  await page.getByTestId("dispatch-apply-result-dismiss").click();
  await expect(page.getByTestId("dispatch-apply-result")).toHaveCount(0);

  // Second apply (idempotent — same date/decisions now already committed)
  await page.getByTestId("dispatch-apply-btn").click();
  await expect(page.getByTestId("dispatch-apply-result")).toBeVisible();
  // Banner says "already applied" (applied=0)
  await expect(page.getByTestId("dispatch-apply-result")).toContainText(
    /already applied/i,
  );
});

// ---------------------------------------------------------------------------
// (g) Analytics card
// ---------------------------------------------------------------------------

test("the dispatch analytics card loads and shows stats", async ({ page }) => {
  await login(page);
  await page.goto("/dispatch");

  await expect(page.getByTestId("dispatch-analytics-card")).toBeVisible();
  await expect(page.getByTestId("dispatch-analytics-stats")).toBeVisible();

  // Total open stat tile
  await expect(page.getByTestId("dispatch-stat-total-open")).toBeVisible();
  await expect(page.getByTestId("dispatch-stat-total-open")).toContainText("4");

  // Skill-match rate tile
  await expect(
    page.getByTestId("dispatch-stat-skill-match-rate"),
  ).toBeVisible();
  await expect(
    page.getByTestId("dispatch-stat-skill-match-rate"),
  ).toContainText("%");
});

// ---------------------------------------------------------------------------
// (h) RBAC: contractor-hidden
// ---------------------------------------------------------------------------

test("a contractor cannot see the Dispatch nav link", async ({ page }) => {
  await login(page, "contractor@example.test");
  await expect(page.getByRole("link", { name: "Dispatch" })).toHaveCount(0);
});

test("a contractor cannot reach the dispatch surface", async ({ page }) => {
  await login(page, "contractor@example.test");
  await page.goto("/dispatch");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("dashboard")).toBeVisible();
});
