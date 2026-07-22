import { expect, test } from "@playwright/test";

test("Tree Grid route demonstrates 30-node defaults, array ref controls, styles, and component cells", async ({ page }) => {
  await page.goto("/examples/tree-grid");

  await expect(page).toHaveURL(/\/examples\/tree-grid$/u);
  await expect(page.getByRole("heading", { level: 1, name: "Tree Grid" })).toBeVisible();

  const basic = page.getByTestId("tree-grid-basic-viewport");
  await expect(page.getByTestId("tree-basic-node-count")).toHaveText("30 nodes");
  await expect(basic.locator("tr[data-comins-row-data-index]")).toHaveCount(30);

  const controls = page.getByTestId("tree-grid-controls");
  const controlViewport = page.getByTestId("tree-grid-controls-viewport");
  await expect(controlViewport.locator("tr[data-comins-row-data-index]")).toHaveCount(3);
  await controls.getByRole("button", { name: "Expand team 1-1" }).click();
  await expect(controlViewport.locator("tr[data-comins-row-data-index]")).toHaveCount(3);
  await controls.getByRole("button", { name: "Expand department 1" }).click();
  await expect(controlViewport.getByTestId("row-team-1-1")).toBeVisible();
  await expect(controlViewport.getByTestId("row-member-1-1-1")).toHaveCount(0);
  await controls.getByRole("button", { name: "Expand team 1-1" }).click();
  await expect(controlViewport.getByTestId("row-member-1-1-1")).toBeVisible();
  await controls.getByRole("button", { name: "Expand all" }).click();
  await expect(controlViewport.locator("tr[data-comins-row-data-index]")).toHaveCount(30);
  await controls.getByRole("button", { name: "Fold all" }).click();
  await expect(controlViewport.locator("tr[data-comins-row-data-index]")).toHaveCount(3);

  const styled = page.locator("[data-feature-option='tree-grid-style']");
  await expect(styled.getByTestId("row-department-1")).toHaveClass(/tree-row-root/u);
  const checkbox = page.getByRole("checkbox", { name: "Active Department 1" });
  await expect(checkbox).toBeChecked();
  await checkbox.click();
  await expect(checkbox).not.toBeChecked();
  await expect(page.getByTestId("tree-custom-renderer-department-1")).toContainText("Department 1");

  await expect(page.locator("main")).toContainText("Pagination, lazy loading, infinite scrolling, and row drag");
  await expect(page.locator("main")).toContainText("Row-level copy/paste");
});

test("Tree Grid virtualizes exactly 10000 expanded nodes @perf", async ({ page }) => {
  await page.goto("/examples/tree-grid");

  await expect(page.getByTestId("tree-virtual-node-count")).toHaveText("10000 nodes");
  const viewport = page.getByTestId("tree-virtual-viewport");
  const renderedRows = viewport.locator("tr[data-comins-row-data-index]");
  await expect(renderedRows).not.toHaveCount(0);
  expect(await renderedRows.count()).toBeLessThan(50);

  await viewport.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await expect(viewport.getByTestId("row-virtual-member-100-9-10")).toBeVisible();
});
