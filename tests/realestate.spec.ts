import { test, expect, type Page } from "@playwright/test";

// Real Estate Concierge — flagship (RE-5b) — the four staff-facing FE surfaces.
//
// (a) Listing console (/listings): the agent's listings + a "New listing"
//     action; each card opens the detail (disclosures, photos, generate
//     marketing). MSW seeds 2 listings, one with 4 disclosures + 2 photos.
// (b) Concierge inbox + lead pipeline (/concierge): conversations grouped into
//     HOT / WARM / COLD / Unscored columns. MSW seeds one of each.
// (c) Transcript + citation viewer (/concierge/:id): the full thread, each
//     assistant answer showing the disclosures it cited (type + preview +
//     score), plus the buyer qualification + linked deal.
// (d) Marketing review queue (/marketing-review): DRAFTED packages with a
//     Fair-Housing flag → approve / skip (never auto-published).
//
// All four are staff-visible + contractor-hidden (the BE routes are STAFF-gated).
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
// (a) Listing console
// ---------------------------------------------------------------------------

test("listings nav item is visible to staff", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("link", { name: "Listings" })).toBeVisible();
});

test("the listing console renders listings and opens a detail with disclosures + photos", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: "Listings" }).click();
  await expect(page).toHaveURL(/\/listings$/);
  await expect(page.getByTestId("listing-console-page")).toBeVisible();

  // Both seeded listings render; the first resolves its address.
  await expect(page.getByTestId("listing-card")).toHaveCount(2);
  await expect(
    page.getByTestId("listing-card-address").first(),
  ).toContainText("1442 Lindenwood Ave");

  // Open the flagship listing's detail.
  await page
    .getByTestId("listing-card")
    .filter({ hasText: "1442 Lindenwood Ave" })
    .click();
  await expect(page).toHaveURL(/\/listings\/.+/);
  await expect(page.getByTestId("listing-detail-page")).toBeVisible();

  // Disclosures — the grounding corpus — render, indexed ("Searchable").
  await expect(page.getByTestId("disclosures-count")).toContainText("4");
  await expect(page.getByTestId("disclosure-row")).toHaveCount(4);
  await expect(page.getByText("Roof").first()).toBeVisible();
  await expect(
    page.getByTestId("disclosure-row-indexed").first(),
  ).toContainText("Searchable");

  // Photos render.
  await expect(page.getByTestId("photos-count")).toContainText("2");
  await expect(page.getByTestId("photo-row")).toHaveCount(2);

  // The "Generate marketing" action is present.
  await expect(page.getByTestId("marketing-generate")).toBeVisible();
});

test("adding a disclosure adds it to the grounding corpus", async ({ page }) => {
  await login(page);
  await page.goto("/listings");
  await page
    .getByTestId("listing-card")
    .filter({ hasText: "1442 Lindenwood Ave" })
    .click();
  await expect(page.getByTestId("disclosure-row")).toHaveCount(4);

  await page.getByTestId("disclosure-add-open").click();
  await expect(page.getByTestId("disclosure-add-dialog")).toBeVisible();
  await page
    .getByTestId("disclosure-add-text")
    .fill("Septic system pumped and inspected in 2023; no issues found.");
  await page.getByTestId("disclosure-add-submit").click();

  // The new disclosure joins the list (4 → 5).
  await expect(page.getByTestId("disclosure-row")).toHaveCount(5);
});

test("generate marketing drafts a package on the listing", async ({ page }) => {
  await login(page);
  await page.goto("/listings");
  await page
    .getByTestId("listing-card")
    .filter({ hasText: "1442 Lindenwood Ave" })
    .click();

  // The flagship listing already has 1 historical draft seeded; generating adds one.
  await page.getByTestId("marketing-generate").click();
  await expect(
    page.getByText("Marketing drafted — review it below before you publish."),
  ).toBeVisible();
  await expect(
    page.getByTestId("marketing-drafts-list").getByTestId("marketing-draft-card"),
  ).toHaveCount(2);
});

// ---------------------------------------------------------------------------
// (b) Concierge inbox + lead pipeline
// ---------------------------------------------------------------------------

test("concierge nav item is visible to staff", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("link", { name: "Concierge" })).toBeVisible();
});

test("the concierge inbox groups conversations into a lead pipeline by tier", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: "Concierge" }).click();
  await expect(page).toHaveURL(/\/concierge$/);
  await expect(page.getByTestId("concierge-inbox-page")).toBeVisible();

  // The pipeline has the four tier columns.
  await expect(page.getByTestId("pipeline-column")).toHaveCount(4);
  await expect(page.getByTestId("lead-pipeline")).toBeVisible();

  // One HOT lead — the header badge calls it out.
  await expect(page.getByTestId("concierge-hot-count")).toContainText("1 hot");

  // The HOT column holds the HOT conversation, resolved to the buyer's name.
  const hotColumn = page.getByTestId("pipeline-column").filter({
    has: page.getByText("Hot", { exact: true }),
  });
  await expect(
    hotColumn.getByTestId("conversation-card-buyer"),
  ).toContainText("Marcus Bell");
  await expect(
    hotColumn.getByTestId("conversation-card-tier"),
  ).toContainText("Hot");

  // All four tiers' cards are present across the pipeline.
  await expect(page.getByTestId("conversation-card")).toHaveCount(4);
});

// ---------------------------------------------------------------------------
// (c) Transcript + citation viewer
// ---------------------------------------------------------------------------

test("the transcript shows turns, citations, qualification, and the linked deal", async ({
  page,
}) => {
  await login(page);
  await page.goto("/concierge");

  // Open the HOT conversation.
  await page
    .getByTestId("conversation-card")
    .filter({ hasText: "Marcus Bell" })
    .click();
  await expect(page).toHaveURL(/\/concierge\/.+/);
  await expect(page.getByTestId("conversation-detail-page")).toBeVisible();

  // The transcript renders all six turns (buyer + concierge).
  await expect(page.getByTestId("transcript-turn")).toHaveCount(6);
  await expect(page.getByTestId("turn-body").first()).toContainText(
    "Is the roof",
  );

  // The citation viewer: at least two assistant answers show their grounding
  // disclosures with type + preview + score.
  await expect(page.getByTestId("citation").first()).toBeVisible();
  await expect(page.getByTestId("citation-type").first()).toContainText("Roof");
  await expect(page.getByTestId("citation-preview").first()).toContainText(
    "Roof replaced in 2021",
  );
  await expect(page.getByTestId("citation-score").first()).toContainText("%");

  // The handoff turn is marked.
  await expect(page.getByTestId("turn-handoff")).toBeVisible();

  // The qualification panel shows the buyer, tier, budget, and the linked deal.
  await expect(page.getByTestId("qualification-tier")).toContainText("Hot");
  await expect(page.getByTestId("qualification-budget")).toContainText(
    "$430,000",
  );
  await expect(page.getByTestId("qualification-deal-link")).toContainText(
    "Marcus Bell",
  );
});

// ---------------------------------------------------------------------------
// (d) Marketing review queue
// ---------------------------------------------------------------------------

test("marketing review nav item is visible to staff", async ({ page }) => {
  await login(page);
  await expect(
    page.getByRole("link", { name: "Marketing review" }),
  ).toBeVisible();
});

test("the marketing review queue shows a flagged draft and approving it clears it", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: "Marketing review" }).click();
  await expect(page).toHaveURL(/\/marketing-review$/);
  await expect(page.getByTestId("marketing-review-page")).toBeVisible();

  // One DRAFTED package waiting, with its pieces and the Fair-Housing flag.
  await expect(page.getByTestId("marketing-review-count")).toContainText(
    "1 waiting",
  );
  await expect(page.getByTestId("marketing-draft-card")).toHaveCount(1);
  await expect(page.getByTestId("marketing-piece").first()).toBeVisible();
  await expect(page.getByTestId("marketing-fair-housing")).toContainText(
    "Fair-Housing",
  );
  await expect(
    page.getByTestId("marketing-fair-housing-flag"),
  ).toContainText("perfect for families");

  // Approving it removes it from the queue (DRAFTED-only list).
  await page.getByTestId("marketing-draft-approve").click();
  await expect(page.getByText("Approved — it's copy-ready to paste out.")).toBeVisible();
  await expect(page.getByTestId("marketing-review-empty")).toBeVisible();
});

test("skipping a marketing draft removes it from the queue", async ({ page }) => {
  await login(page);
  await page.goto("/marketing-review");
  await expect(page.getByTestId("marketing-draft-card")).toHaveCount(1);

  await page.getByTestId("marketing-draft-skip").click();
  await expect(page.getByText("Skipped.")).toBeVisible();
  await expect(page.getByTestId("marketing-review-empty")).toBeVisible();
});

// ---------------------------------------------------------------------------
// RBAC: a scoped-down contractor sees none of the four surfaces
// ---------------------------------------------------------------------------

test("a contractor cannot see or reach the Real Estate surfaces", async ({
  page,
}) => {
  // contractor@example.test is STAFF + CONTRACTOR (no ADMIN) — scoped down.
  await login(page, "contractor@example.test");

  // The nav items are hidden…
  await expect(page.getByRole("link", { name: "Listings" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Concierge" })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Marketing review" }),
  ).toHaveCount(0);

  // …and deep-links are bounced back to the dashboard by RequireNotContractor.
  for (const path of ["/listings", "/concierge", "/marketing-review"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId("dashboard")).toBeVisible();
  }
});
