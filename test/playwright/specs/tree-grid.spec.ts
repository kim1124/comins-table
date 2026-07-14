import { expect, test } from "@playwright/test";

test("Tree Grid route expands nested rows and documents its V1 limits", async ({ page }) => {
  await page.goto("/examples/tree-grid");

  await expect(page).toHaveURL(/\/examples\/tree-grid$/u);
  await expect(page.getByRole("heading", { level: 1, name: "Tree Grid" })).toBeVisible();

  const expander = page.getByTestId("tree-expander-department-engineering");
  await expect(expander).toHaveAttribute("aria-expanded", "false");
  await expander.click();
  await expect(expander).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByTestId("cell-team-platform-name")).toContainText("Platform Team");

  await expect(page.locator("main")).toContainText("Pagination, lazy loading, infinite scrolling, and row drag");
  await expect(page.locator("main")).toContainText("Row-level copy/paste");
});
