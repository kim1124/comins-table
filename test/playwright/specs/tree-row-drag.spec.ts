import { expect, test } from "@playwright/test";

test("tree keyboard reorders actual sibling ids through controlled data", async ({ page }) => {
  await page.goto("/examples/tree-grid");
  const viewport = page.getByTestId("tree-drag-viewport");
  const source = viewport.getByTestId("row-drag-handle-a-1");
  await source.focus();
  await source.press("Space");
  await source.press("ArrowDown");
  await expect(viewport.getByTestId("row-a-2")).toHaveAttribute("data-comins-tree-drop", "after");
  await source.press("Enter");
  await expect(page.getByTestId("tree-drag-result")).toContainText('"rowId":"a-1","result":"moved"');
  await expect.poll(() => viewport.locator("[data-comins-row-data-index]").evaluateAll(rows => rows.map(row => row.getAttribute("data-testid")))).toEqual(["row-root-a", "row-a-2", "row-a-1", "row-root-b", "row-b-1"]);
  await expect(source).toBeFocused();
  await page.keyboard.press("Space");
  await expect(viewport.locator("..").getByRole("status")).toContainText("Moving a-1");
  await page.keyboard.press("Escape");
});

test("tree pointer reparent moves the complete collapsed subtree", async ({ page }) => {
  await page.goto("/examples/tree-grid");
  await expect(page.getByTestId("tree-auto-height")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("tree-allow-reparent")).toHaveAttribute("aria-pressed", "true");
  const viewport = page.getByTestId("tree-drag-viewport");
  await viewport.getByTestId("row-root-b").scrollIntoViewIfNeeded();
  const source = await viewport.getByTestId("row-drag-handle-a-2").boundingBox();
  const target = await viewport.getByTestId("row-root-b").boundingBox();
  expect(source).not.toBeNull(); expect(target).not.toBeNull();
  await page.mouse.move(source!.x + source!.width / 2, source!.y + source!.height / 2);
  await page.mouse.down();
  await page.mouse.move(target!.x + target!.width / 2, target!.y + target!.height / 2, { steps: 6 });
  await expect(viewport.getByTestId("row-root-b")).toHaveAttribute("data-comins-tree-drop-valid", "true");
  await page.mouse.up();
  await expect(page.getByTestId("tree-drag-result")).toContainText('"rowId":"a-2","result":"moved"');
  await expect(page.getByTestId("tree-drag-result")).toContainText('"parentId":"root-b"');
  await expect(viewport.getByTestId("row-hidden-child")).toHaveCount(0);
  await viewport.getByTestId("tree-expander-a-2").click();
  await expect(viewport.getByTestId("row-hidden-child")).toBeVisible();
  await expect.poll(() => viewport.locator("[data-comins-row-data-index]").evaluateAll(rows => rows.map(row => row.getAttribute("data-testid")))).toEqual(["row-root-a", "row-a-1", "row-root-b", "row-b-1", "row-a-2", "row-hidden-child"]);
});


test("tree keyboard navigation survives source virtualization and restores moved focus", async ({ page }) => {
  await page.goto("/examples/tree-grid");
  await page.getByTestId("tree-many-rows").click();
  const viewport = page.getByTestId("tree-drag-viewport");
  await viewport.getByTestId("row-drag-handle-child-0").focus();
  await page.keyboard.press("Space");
  for (let index = 0; index < 60; index++) await page.keyboard.press("ArrowDown");
  await expect(viewport.getByTestId("row-child-0")).toHaveCount(0);
  await expect(viewport.getByTestId("row-child-60")).toHaveAttribute("data-comins-tree-drop", "after");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("tree-drag-result")).toContainText('"rowId":"child-0","result":"moved"');
  await expect(viewport.getByTestId("row-drag-handle-child-0")).toBeFocused();
  await expect(viewport.getByTestId("row-child-0")).toHaveAttribute("data-comins-row-data-index", "61");
});

test("tree policy change cancels a gesture without changing data", async ({ page }) => {
  await page.goto("/examples/tree-grid");
  const viewport = page.getByTestId("tree-drag-viewport");
  await viewport.getByTestId("row-drag-handle-a-1").press("Space");
  await page.keyboard.press("ArrowDown");
  await page.getByTestId("tree-allow-reparent").click();
  await expect(page.getByTestId("tree-drag-result")).toContainText('"result":"cancelled"');
  await page.keyboard.press("Enter");
  await expect(viewport.getByTestId("row-a-1")).toHaveAttribute("data-comins-row-data-index", "1");
});
