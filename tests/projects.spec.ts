import { test, expect, type Page } from "@playwright/test";

// AC-C8: Projects area + tabbed detail + Task kanban + Deal→Project one-click
// MSW (VITE_USE_MOCKS=true) provides backend responses — no live backend needed.

const SMOKE_EMAIL = "smoke@example.test";
const SMOKE_PASSWORD = "hunter2hunter2";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(SMOKE_EMAIL);
  await page.getByLabel("Password").fill(SMOKE_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("dashboard")).toBeVisible();
}

// AC-C8: /projects renders the MSW-seeded PRJ-2026-001 row
test("projects list renders the seeded project", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Projects" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByTestId("projects-page")).toBeVisible();
  await expect(page.getByTestId("project-row-code").first()).toContainText(
    "PRJ-2026-001",
  );
  await expect(page.getByTestId("project-row-name").first()).toContainText(
    "Website Redesign",
  );
});

// AC-C8: clicking a project row opens the detail page
test("clicking a project opens the detail page", async ({ page }) => {
  await login(page);
  await page.goto("/projects");
  await page.getByTestId("project-row-name").first().click();
  await expect(page.getByTestId("project-detail")).toBeVisible();
  await expect(page.getByText("Website Redesign")).toBeVisible();
  // Overview tab is default
  await expect(page.getByTestId("tab-overview")).toBeVisible();
  await expect(page.getByTestId("tab-milestones")).toBeVisible();
  await expect(page.getByTestId("tab-tasks")).toBeVisible();
});

// AC-C8: tab switching — Overview / Milestones / Tasks
test("project detail tab switch shows milestones and tasks", async ({ page }) => {
  await login(page);
  await page.goto("/projects");
  await page.getByTestId("project-row-name").first().click();
  await expect(page.getByTestId("project-detail")).toBeVisible();

  // Switch to Milestones tab
  await page.getByTestId("tab-milestones").click();
  await expect(page.getByTestId("milestones-list")).toBeVisible();
  await expect(page.getByTestId("milestone-row").first()).toBeVisible();

  // Switch to Tasks tab
  await page.getByTestId("tab-tasks").click();
  await expect(page.getByTestId("task-kanban")).toBeVisible();
  // Should have kanban columns for each status
  await expect(page.getByTestId("kanban-column-TODO")).toBeVisible();
  await expect(page.getByTestId("kanban-column-IN_PROGRESS")).toBeVisible();
  await expect(page.getByTestId("kanban-column-BLOCKED")).toBeVisible();
  await expect(page.getByTestId("kanban-column-DONE")).toBeVisible();
});

// AC-C8: milestone "Complete" action updates status and surfaces spawned-invoice badge
test("completing a milestone updates its status and shows spawned invoice badge", async ({
  page,
}) => {
  await login(page);
  await page.goto("/projects");
  await page.getByTestId("project-row-name").first().click();
  await expect(page.getByTestId("project-detail")).toBeVisible();

  // Switch to Milestones tab
  await page.getByTestId("tab-milestones").click();
  await expect(page.getByTestId("milestones-list")).toBeVisible();

  // Complete the milestone
  await page.getByTestId("complete-milestone").first().click();

  // After completion, the spawned-invoice badge should appear
  // (the MSW handler sets spawnedInvoiceId when triggersInvoiceOnComplete=true)
  await expect(page.getByTestId("spawned-invoice-badge")).toBeVisible();
  await expect(page.getByTestId("complete-milestone")).toHaveCount(0); // button gone
});

// AC-C8: task drag moves kanban column
test("dragging a task card to another column moves the task", async ({ page }) => {
  await login(page);
  await page.goto("/projects");
  await page.getByTestId("project-row-name").first().click();
  await expect(page.getByTestId("project-detail")).toBeVisible();

  // Switch to Tasks tab
  await page.getByTestId("tab-tasks").click();
  await expect(page.getByTestId("task-kanban")).toBeVisible();

  // Verify the TODO column has a task
  const todoColumn = page.getByTestId("kanban-column-TODO");
  await expect(todoColumn.getByTestId("task-card")).toHaveCount(1);

  // Drag the card from TODO to IN_PROGRESS
  const taskCard = todoColumn.getByTestId("task-card").first();
  const inProgressColumn = page.getByTestId("kanban-column-IN_PROGRESS");

  await taskCard.dragTo(inProgressColumn);

  // After drag, IN_PROGRESS should have 2 tasks (1 seed + 1 dragged)
  await expect(inProgressColumn.getByTestId("task-card")).toHaveCount(2);
});

// AC-C8: WON deal "Convert to Project" button navigates to a project
test("WON deal 'Convert to Project' button navigates to the project", async ({
  page,
}) => {
  await login(page);
  // Navigate directly to the seeded WON deal
  await page.goto("/deals/55555555-5555-5555-5555-555555555556");
  await expect(page.getByTestId("deal-detail")).toBeVisible();

  // The "Convert to Project" button should be visible for WON deals
  await expect(page.getByTestId("convert-to-project")).toBeVisible();

  // Click it — MSW returns a new project (201)
  await page.getByTestId("convert-to-project").click();

  // Should navigate to the new project detail
  await expect(page.getByTestId("project-detail")).toBeVisible();
});
