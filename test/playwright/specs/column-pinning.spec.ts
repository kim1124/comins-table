import { expect, test } from "@playwright/test";

import { initializePlaygroundLocale } from "../helpers/playground-locale";

test.beforeEach(async ({ page }) => initializePlaygroundLocale(page, "en"));

test("Column Pinning keeps sticky surfaces aligned and demotes responsively", async ({ page }) => {
  await page.goto("/examples/column-pinning");

  const viewport = page.getByTestId("column-pinning-viewport");
  const root = viewport.locator("xpath=..");
  const leftHeader = root.getByTestId("header-name");
  const rightHeader = root.getByTestId("header-id");
  const leftCell = viewport.getByTestId("cell-pin-1-name");
  const rightCell = viewport.getByTestId("cell-pin-1-id");

  await expect(leftHeader).toHaveAttribute("data-comins-pinned", "left");
  await expect(rightHeader).toHaveAttribute("data-comins-pinned", "right");
  await expect(leftCell).toHaveCSS("position", "sticky");
  await expect(rightCell).toHaveCSS("position", "sticky");
  await expect(leftHeader.getByTestId("column-move-handle-name")).toHaveCount(0);

  const before = await Promise.all([leftCell.boundingBox(), rightCell.boundingBox()]);

  await viewport.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });

  const after = await Promise.all([leftCell.boundingBox(), rightCell.boundingBox()]);

  expect(Math.abs(after[0]!.x - before[0]!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(after[1]!.x - before[1]!.x)).toBeLessThanOrEqual(1);

  const summaryCells = root.locator(".comins-table__summary-cell");
  await expect(root.getByTestId("summary-cell-name")).toContainText("12");
  await expect(summaryCells).toHaveCount(6);
  expect(await summaryCells.evaluateAll((cells) =>
    cells.map((cell) => cell.getAttribute("data-comins-pinned"))))
    .toEqual(["left", null, null, null, "right", "right"]);

  await page.getByRole("button", { name: "Use narrow container" }).click();
  await expect(leftHeader).not.toHaveAttribute("data-comins-pinned", "left");
  await expect(rightHeader).toHaveAttribute("data-comins-pinned", "right");

  const grouped = page.getByTestId("column-pinning-grouped-viewport").locator("xpath=..");
  await expect(grouped.getByTestId("header-group-identity")).toHaveAttribute("data-comins-pinned", "left");
  await expect(grouped.getByTestId("group-row-East")).not.toHaveAttribute("data-comins-pinned");
});
