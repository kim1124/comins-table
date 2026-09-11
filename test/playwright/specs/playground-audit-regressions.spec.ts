import { expect, test } from "@playwright/test";

for (const sample of [
  { route: "column-pinning", viewport: "column-pinning-grouped-viewport", group: "East", row: "row-pin-1" },
  { route: "cross-table-drag", viewport: "cross-table-group-left", group: "Left A", row: "row-group-a" },
]) {
  test(`${sample.route} group disclosure updates controlled rows`, async ({ page }) => {
    await page.goto(`/examples/${sample.route}`);
    const viewport = page.getByTestId(sample.viewport);
    await expect(viewport.getByTestId(sample.row)).toBeVisible();
    await viewport.getByRole("button", { name: `Collapse ${sample.group} group`, exact: true }).click();
    await expect(viewport.getByTestId(sample.row)).toHaveCount(0);
    await viewport.getByRole("button", { name: `Expand ${sample.group} group`, exact: true }).press("Enter");
    await expect(viewport.getByTestId(sample.row)).toBeVisible();
  });
}

test("Header Menu Escape closes from an item and restores trigger focus", async ({ page }) => {
  await page.goto("/examples/component");
  const trigger = page.getByTestId("component-example-menu").locator(".comins-table__component-menu-trigger");
  await trigger.click();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("menuitem", { name: "상태 확인" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu", { name: "Header menu" })).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("Context Menu keyboard navigation selects and dismisses without losing its opener", async ({ page }) => {
  await page.goto("/examples/context-menu");
  const cell = page.getByTestId("cell-a-name");
  await cell.click({ button: "right" });
  const menu = page.getByRole("menu", { name: "데이터 테이블 컨텍스트 메뉴" });
  await expect(menu.getByRole("menuitem", { name: "조회", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitem", { name: "추가", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("context-menu-alert")).toContainText("추가 기능을 선택했습니다");
  await expect(menu).toHaveCount(0);
  await expect(cell).toBeFocused();
  const opener = page.getByRole("button", { name: "메뉴 열기", exact: true });
  await page.getByRole("button", { name: "선택 해제", exact: true }).click();
  await opener.click();
  await page.keyboard.press("End");
  await expect(menu.getByRole("menuitem", { name: "추가", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitem", { name: "조회", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test("Boolean filtering uses its localized cell formatter", async ({ page }) => {
  await page.goto("/examples/column-filtering");
  const viewport = page.getByTestId("column-filtering-viewport");
  await expect(viewport.getByTestId("cell-filter-a-active")).toHaveText("활성");
  await expect(viewport.getByTestId("cell-filter-b-active")).toHaveText("비활성");
});

test("Viewport fixed mode keeps renderer growth within its numeric row height", async ({ page }) => {
  await page.goto("/performance/viewport-datasource");
  const viewport = page.getByTestId("viewport-datasource-viewport");
  await expect(viewport.getByTestId("row-0")).toBeVisible();
  await page.getByTestId("viewport-auto-height").uncheck();
  await page.getByTestId("viewport-content").click();
  await expect.poll(() => viewport.getByTestId("row-1").evaluate(row => row.getBoundingClientRect().height)).toBe(36);
  await viewport.evaluate(element => { element.scrollTop = element.scrollHeight * .5; });
  await expect(viewport.getByTestId("viewport-placeholder")).toHaveCount(0);
  const anchor = await viewport.evaluate(element => {
    const top = element.getBoundingClientRect().top;
    const row = Array.from(element.querySelectorAll<HTMLElement>("[data-comins-row-data-index]")).find(row => row.getBoundingClientRect().bottom > top)!;
    return { id: row.dataset.testid!, offset: row.getBoundingClientRect().top - top };
  });
  await page.getByTestId("viewport-content").click();
  await expect.poll(() => viewport.getByTestId(anchor.id).evaluate((row, offset) => Math.abs(row.getBoundingClientRect().top - row.closest(".comins-table__body-viewport")!.getBoundingClientRect().top - offset), anchor.offset)).toBeLessThanOrEqual(1);
  await page.getByTestId("viewport-auto-height").check();
  await page.getByTestId("viewport-content").click();
  await expect.poll(() => viewport.locator("[data-comins-row-data-index]").evaluateAll(rows => Math.max(...rows.map(row => row.getBoundingClientRect().height)))).toBeGreaterThan(60);
});
