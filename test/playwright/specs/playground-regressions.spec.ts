import { expect, test } from "@playwright/test";
import { initializePlaygroundLocale } from "../helpers/playground-locale";

test.beforeEach(async ({ page }) => initializePlaygroundLocale(page, "en"));
test.afterEach(async ({ page }, info) => {
  if (info.status !== info.expectedStatus) {
    await page.screenshot({ path: info.outputPath("regression.png"), fullPage: true });
  }
});

test("automatic Row height fills the last viewport after reversing sort", async ({ page }) => {
  await page.goto("/examples/fill-handle");
  const viewport = page.getByTestId("clipboard-edit-viewport");
  const header = page.getByTestId("header-column2");
  await header.click();
  await header.click();
  await expect(header).toHaveAttribute("aria-sort", "descending");
  await expect.poll(() => viewport.evaluate(element => {
    const bounds = element.getBoundingClientRect();
    const rows = [...element.querySelectorAll("tr[data-comins-row-data-index]")]
      .map(row => row.getBoundingClientRect()).filter(row => row.bottom > bounds.top && row.top < bounds.bottom);
    return { filled: rows.length >= 6 && Math.abs(rows.at(-1)!.bottom - bounds.bottom) <= 3 };
  })).toEqual({ filled: true });
});

test("sort removal keeps keyboard focus for another sort cycle", async ({ page }) => {
  await page.goto("/examples/fill-handle");
  const header = page.getByTestId("header-column2");
  const sort = page.getByTestId("sort-indicator-column2");
  await header.click();
  await sort.click();
  await page.keyboard.press("Enter");
  await expect(header).toHaveAttribute("aria-sort", "none");
  await expect(header).toBeFocused();
  await page.keyboard.press("Space");
  await expect(header).toHaveAttribute("aria-sort", "ascending");
});

test("virtual Detail retains the owner disclosure through first open and last close", async ({ page }) => {
  await page.goto("/examples/row-expand");
  const toggle = page.getByTestId("row-detail-toggle-auto-1");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(toggle).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
  await page.keyboard.press("Space");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
});

test("filter operator draft survives clearing a valueless applied rule", async ({ page }) => {
  await page.goto("/examples/column-filtering");
  for (const [column, operator] of [["amount", "lessThan"], ["name", "notContains"], ["joinedAt", "lessThan"]]) {
    await page.getByTestId(`column-filter-trigger-${column}`).first().click();
    const select = page.getByTestId(`column-filter-operator-${column}`);
    await select.selectOption("isNotEmpty");
    await select.selectOption(operator!);
    await expect(select).toHaveValue(operator!);
    if (column === "amount") {
      await page.getByTestId("column-filter-value-amount").fill("120");
      const rows = page.getByTestId("column-filtering-viewport").locator("tr[data-comins-row-data-index]");
      await expect(rows).toHaveCount(2);
      await expect(rows).toContainText(["Beta", "Epsilon"]);
      await page.getByTestId("column-filter-clear-amount").click();
    }
    await page.keyboard.press("Escape");
  }
});

test("large Tree example updates controlled expansion", async ({ page }) => {
  await page.goto("/examples/tree-grid");
  const viewport = page.getByTestId("tree-virtual-viewport");
  const toggle = viewport.locator(".comins-tree-expander").first();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(viewport).not.toContainText("Virtual Team 1-1");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(viewport).toContainText("Virtual Team 1-1");
});

test("Fill rejects a string in the numeric example without a partial commit", async ({ page }) => {
  await page.goto("/examples/fill-handle");
  await page.getByTestId("cell-0-column1").click();
  await page.getByTestId("cell-0-column3").click({ modifiers: ["Shift"] });
  await page.getByRole("button", { name: "Fill right", exact: true }).click();
  await expect(page.getByTestId("clipboard-edit-error")).toContainText("finite number");
  await expect(page.getByTestId("cell-0-column2")).toHaveText("1");
  await expect(page.getByTestId("cell-0-column3")).toHaveText("Value 1");
  await expect(page.getByTestId("clipboard-edit-commits")).toHaveText("Data commits: 0");
});

test("filter popover follows layout changes and paints above adjacent Headers", async ({ page }) => {
  await page.goto("/examples/column-filtering");
  const trigger = page.getByTestId("column-filter-trigger-amount").first();
  await trigger.click();
  const popover = page.getByTestId("column-filter-popover-amount");
  await page.getByTestId("column-filter-value-amount").fill("120");
  await expect.poll(async () => {
    const anchor = await trigger.boundingBox(), popup = await popover.boundingBox();
    return Math.abs(popup!.y - anchor!.y - anchor!.height - 6);
  }).toBeLessThanOrEqual(2);
  expect(await popover.evaluate(element => {
    const r = element.getBoundingClientRect();
    return element.contains(document.elementFromPoint(r.right - 30, r.top + 35));
  })).toBe(true);
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});
