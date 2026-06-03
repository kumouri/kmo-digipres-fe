import { test, expect, type Page } from "@playwright/test";

// Phase J4 FE — contractor payout & margin tab.
//
// An ADMIN opens the seeded contractor's (Jordan Rivera) /team/:id detail page,
// switches to the Payout tab, and sees the year-to-date "what you owe" headline
// plus a per-period breakdown (with a Margin column). MSW (store.ts payoutStore)
// seeds Jordan two APPROVED periods this year so the owe figure is non-zero and
// deterministic:
//   Period A: 8.00h  → owe 760.00, bill 1280.00, margin 520.00
//   Period B: 5.00h  → owe 475.00, bill  800.00, margin 325.00
//   YTD:      13.00h → owe 1235.00 (the headline figure)

const SMOKE_EMAIL = "smoke@example.test"; // STAFF + ADMIN
const SMOKE_PASSWORD = "hunter2hunter2";
const CONTRACTOR_NAME = "Jordan Rivera";
const EXPECTED_YTD_OWE = "$1235.00";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(SMOKE_EMAIL);
  await page.getByLabel("Password").fill(SMOKE_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("dashboard")).toBeVisible();
}

// Open the seeded contractor's detail page by clicking their team-list row.
async function openContractorDetail(page: Page) {
  await page.goto("/team");
  await expect(page.getByTestId("team-page")).toBeVisible();
  await page.getByRole("row").filter({ hasText: CONTRACTOR_NAME }).click();
  await expect(page.getByTestId("team-detail")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: CONTRACTOR_NAME }),
  ).toBeVisible();
}

test("ADMIN sees the contractor's YTD payout headline on the Payout tab", async ({
  page,
}) => {
  await login(page);
  await openContractorDetail(page);

  await page.getByTestId("tab-payout").click();

  // The year-to-date "Paid this year" card renders with the expected owe figure.
  const ytd = page.getByTestId("payout-ytd");
  await expect(ytd).toBeVisible();
  await expect(page.getByTestId("payout-total")).toHaveText(EXPECTED_YTD_OWE);
});

test("ADMIN sees the per-period payout breakdown with a Margin column", async ({
  page,
}) => {
  await login(page);
  await openContractorDetail(page);
  await page.getByTestId("tab-payout").click();

  // The period table renders, with a Margin column header.
  const table = page.getByTestId("payout-table");
  await expect(table).toBeVisible();
  await expect(table.getByRole("columnheader", { name: "Margin", exact: true })).toBeVisible();
  await expect(
    table.getByRole("columnheader", { name: "Cost (what you owe)" }),
  ).toBeVisible();

  // Both seeded periods render. Periods sort by start ascending, so Period B
  // (05-04, owe 475 / margin 325) is the first data row and Period A (05-11,
  // owe 760 / margin 520) the second — assert both are present.
  const periodB = table.getByRole("row").filter({ hasText: "$475.00" });
  await expect(periodB).toBeVisible();
  await expect(periodB).toContainText("$325.00"); // Period B margin
  const periodA = table.getByRole("row").filter({ hasText: "$760.00" });
  await expect(periodA).toBeVisible();
  await expect(periodA).toContainText("$520.00"); // Period A margin
});
