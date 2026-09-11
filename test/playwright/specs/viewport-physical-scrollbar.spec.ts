import { expect, test } from "@playwright/test";

test.use({ headless: false });
test("viewport reaches the last row using the native scrollbar thumb @perf", async ({ page }) => {
  await page.goto("/performance/viewport-datasource");
  const viewport = page.getByTestId("viewport-datasource-viewport");
  await page.addStyleTag({ content: '[data-testid="viewport-datasource-viewport"] { overflow-y: scroll !important; scrollbar-gutter: stable; scrollbar-color: auto !important; } [data-testid="viewport-datasource-viewport"]::-webkit-scrollbar { width: 24px; } [data-testid="viewport-datasource-viewport"]::-webkit-scrollbar-thumb { min-height: 28px; background: #555; }' });
  await expect(viewport.getByTestId("row-0")).toBeVisible();
  await viewport.scrollIntoViewIfNeeded();
  const box = (await viewport.boundingBox())!;
  const metrics = await viewport.evaluate(element => ({ height: element.clientHeight, scrollHeight: element.scrollHeight, gutter: element.offsetWidth - element.clientWidth }));
  expect(metrics.gutter).toBeGreaterThan(0);
  const thumbHeight = Math.max(28, metrics.height / metrics.scrollHeight * metrics.height);
  await page.mouse.move(box.x + box.width - metrics.gutter / 2, box.y + thumbHeight / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - metrics.gutter / 2, box.y + metrics.height - thumbHeight / 2, { steps: 45 });
  await page.mouse.up();
  await expect(viewport.getByTestId("row-999999")).toBeVisible();
  await expect.poll(() => viewport.evaluate(element => element.scrollTop / (element.scrollHeight - element.clientHeight))).toBeGreaterThan(.999);
});
