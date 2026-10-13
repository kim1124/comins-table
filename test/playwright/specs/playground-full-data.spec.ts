import { expect, test } from "@playwright/test";

for (const format of ["csv", "xlsx"] as const) {
  test(`${format} starts with all 1000 rows and reaches the final row`, async ({ page }) => {
    await page.goto("/examples/export");
    const sample = page.locator(`[data-feature-option="${format}-files"]`);
    await expect(sample.getByRole("status")).toContainText("1000");
    const table = sample.getByTestId(`${format}-file-preview`);
    await expect(table.getByTestId("row-00001")).toBeVisible();
    await table.evaluate(el => { el.scrollTop = el.scrollHeight; el.dispatchEvent(new Event("scroll", { bubbles: true })); });
    await expect(table.getByTestId("row-01000")).toBeVisible();
    expect(await table.locator('tbody tr[data-comins-row-data-index]').count()).toBeLessThan(80);
  });
}

test("remote loading requests and displays the complete response", async ({ page }) => {
  const limits: string[] = [];
  await page.route('https://dummyjson.com/users?**', async route => {
    const url = new URL(route.request().url()); limits.push(url.searchParams.get("limit")!);
    const users = Array.from({ length: 120 }, (_, i) => ({ id: i + 1, firstName: "Remote", lastName: String(i + 1), age: 20, email: `fixture-${i}@example.com` }));
    await route.fulfill({ json: { users, total: 120, limit: 120, skip: 0 } });
  });
  await page.goto("/examples/loading");
  const primary = page.getByTestId("loading-state-viewport");
  await expect(primary.locator('tbody tr[data-comins-row-data-index]')).toHaveCount(120);
  await page.getByRole("button", { name: "원격 데이터 로드", exact: true }).click();
  const remote = page.getByTestId("loading-lazy-viewport");
  await expect(remote.locator('tbody tr[data-comins-row-data-index]')).toHaveCount(120);
  await remote.evaluate(el => { el.scrollTop = el.scrollHeight; el.dispatchEvent(new Event("scroll", { bubbles: true })); });
  await expect(remote.getByTestId("row-dummy-120")).toBeVisible();
  expect(limits).toEqual(["0", "0"]);
});

test("navigation and browser back reset the article scroll position", async ({ page }) => {
  await page.goto("/examples/export");
  const content = page.locator(".docs-shell__content");
  await content.evaluate(el => { el.scrollTop = 700; });
  await expect.poll(() => content.evaluate(el => el.scrollTop)).toBe(700);
  await page.getByRole("link", { name: "Column Filtering", exact: true }).click();
  await expect(page).toHaveURL(/column-filtering$/);
  await expect.poll(() => content.evaluate(el => el.scrollTop)).toBe(0);
  await content.evaluate(el => { el.scrollTop = 700; });
  await expect.poll(() => content.evaluate(el => el.scrollTop)).toBe(700);
  await page.goBack();
  await expect(page).toHaveURL(/examples\/export$/);
  await expect.poll(() => content.evaluate(el => el.scrollTop)).toBe(0);
});
