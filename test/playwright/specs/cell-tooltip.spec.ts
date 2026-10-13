import { expect, test } from "@playwright/test";

test("custom cell tooltip supports hover, keyboard, Escape and native title compatibility", async ({ page }) => {
  await page.goto("/examples/cell");
  const cell = page.getByTestId("cell-a-style");
  await cell.hover();
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toBeVisible();
  await expect(tooltip.locator("strong")).toHaveText("Owner");
  await expect(cell).not.toHaveAttribute("title");
  await expect(cell).toHaveAttribute("aria-describedby", await tooltip.getAttribute("id") ?? "");
  const box = await tooltip.boundingBox();
  expect(box?.x).toBeGreaterThanOrEqual(8);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(1280 - 8);
  await tooltip.hover();
  await expect(tooltip).toBeVisible();
  await tooltip.evaluate(element => { element.style.height = "600px"; });
  await expect.poll(async () => {
    const current = await tooltip.boundingBox();
    return (current?.y ?? 0) + (current?.height ?? 0);
  }).toBeLessThanOrEqual(720 - 8);
  await page.mouse.move(0, 0);
  await expect(tooltip).toHaveCount(0);
  await cell.focus();
  await expect(tooltip).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(tooltip).toHaveCount(0);
  await expect(cell).not.toHaveAttribute("aria-describedby");
  await expect(page.getByTestId("cell-a-name")).toHaveAttribute("title", /^name:/);
  await page.getByTestId("cell-a-age").focus();
  await cell.focus();
  await expect(tooltip).toBeVisible();
  await page.goto("/examples/tree-grid");
  await expect(tooltip).toHaveCount(0);
});

test("virtualized scrolling removes old tooltip content and its aria relationship", async ({ page }) => {
  await page.goto("/performance/virtualization");
  const viewport = page.getByTestId("data-table-viewport");
  const cell = viewport.getByTestId("cell-0-name");
  await cell.focus();
  await expect(page.getByRole("tooltip")).toHaveText("Data 1");
  await viewport.evaluate(element => { element.scrollTop = 20000; });
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await expect(viewport.locator('[aria-describedby*="comins-cell-tooltip-"]')).toHaveCount(0);
});
