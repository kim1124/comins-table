import { expect, test } from "@playwright/test";

test("lazy load offers all 1000 sample rows, appends on wheel, and resets", async ({ page }) => {
  await page.goto("/performance/lazy-load");
  const state = page.getByTestId("lazy-load-state");
  const viewport = page.getByTestId("lazy-load-viewport");
  await expect(state).toHaveText("불러옴 100 / 1000");
  for (let count = 200; count <= 1000; count += 100) {
    await viewport.hover();
    await page.mouse.wheel(0, 100000);
    await expect(state).toHaveText(`불러옴 ${count} / 1000`);
  }
  await viewport.hover();
  await page.mouse.wheel(0, 100000);
  await expect(viewport.getByTestId("row-row-999")).toBeVisible();
  await expect(page.getByTestId("data-table-infinite-loading-row")).toHaveCount(0);
  await page.getByRole("button", { name: "새로고침", exact: true }).click();
  await expect(state).toHaveText("불러옴 100 / 1000");
  await expect(viewport.getByTestId("row-a")).toBeVisible();
});
