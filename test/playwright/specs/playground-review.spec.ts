import { expect, test } from "@playwright/test";
import { initializePlaygroundLocale } from "../helpers/playground-locale";

test.beforeEach(async ({ page }) => initializePlaygroundLocale(page, "en"));
test.afterEach(async ({ page }, info) => {
  await page.screenshot({ path: info.outputPath("result.png") });
});

test("hidden Header retains a stationary top border after wheel scrolling", async ({ page }) => {
  await page.goto("/examples/header");
  const example = page.getByTestId("header-example-visibility");
  await example.getByRole("button", { name: "Show Header" }).click();
  const viewport = example.locator(".comins-table__body-viewport");
  await viewport.hover();
  await page.mouse.wheel(0, 300);
  await expect.poll(() => viewport.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  await expect(viewport.locator("..")).toHaveCSS("border-top-width", "1px");
  await expect(viewport).toHaveCSS("border-top-width", "0px");
});

test("component Row movement keeps values attached to their Row identity", async ({ page }) => {
  await page.goto("/examples/component");
  const example = page.getByTestId("component-example-button");
  const source = example.getByTestId("row-drag-handle-button-a");
  const target = example.getByTestId("row-button-row-3");
  await source.scrollIntoViewIfNeeded();
  const from = await source.boundingBox(), to = await target.boundingBox();
  await page.mouse.move(from!.x + 12, from!.y + 12); await page.mouse.down();
  await page.mouse.move(to!.x + 80, to!.y + 18, { steps: 12 }); await page.mouse.up();
  await expect(example.locator("tbody tr").first()).toHaveAttribute("data-testid", "row-button-b");
  await expect(example.getByTestId("row-button-a").getByRole("button")).toHaveText("Data 1 Button");
  await expect(example.getByTestId("cell-button-a-id")).toHaveText("button-a");
});

test("Context Create inserts a Row and Delete removes the selected Rows", async ({ page }) => {
  await page.goto("/examples/context-menu");
  await page.getByTestId("cell-a-name").click({ button: "right" });
  await page.getByRole("menuitem", { name: "Create", exact: true }).click();
  await expect(page.getByTestId("context-row-count")).toHaveText("31 Rows");
  await expect(page.getByTestId("cell-context-new-1-name")).toHaveText("New row 1");
  await page.getByTestId("cell-a-name").click();
  await page.getByTestId("cell-b-name").click({ modifiers: ["ControlOrMeta"] });
  await page.getByTestId("cell-a-name").click({ button: "right" });
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  await expect(page.getByTestId("context-row-count")).toHaveText("29 Rows");
  await expect(page.getByTestId("row-a")).toHaveCount(0);
  await expect(page.getByTestId("row-b")).toHaveCount(0);
  await expect(page.getByTestId("row-context-new-1")).toBeVisible();
});

test("two pasted values preserve the third, while an explicit empty field clears it", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/examples/fill-handle");
  for (const [tsv, third] of [["Check\t22", "Value 1"], ["Check\t22\t", ""]]) {
    await page.evaluate(text => navigator.clipboard.writeText(text), tsv!);
    await page.getByTestId("cell-0-column1").click();
    await page.keyboard.press("ControlOrMeta+V");
    await expect(page.getByTestId("cell-0-column1")).toHaveText("Check");
    await expect(page.getByTestId("cell-0-column2")).toHaveText("22");
    await expect(page.getByTestId("cell-0-column3")).toHaveText(third!);
  }
});

test("virtual Row drag keeps viewport and target geometry stable at mid scroll @perf", async ({ page }) => {
  await page.goto("/examples/row-grouping");
  const viewport = page.getByTestId("row-grouping-virtual-viewport");
  await viewport.getByRole("button", { name: "Expand All rows group" }).click();
  await viewport.scrollIntoViewIfNeeded();
  await viewport.evaluate(el => { el.scrollTop = 779459; });
  await expect.poll(() => viewport.locator("tr[data-comins-row-data-index]").first().getAttribute("data-comins-row-data-index")).not.toBe("0");
  const metrics = await viewport.evaluate(el => {
    const bounds = el.getBoundingClientRect();
    const rows = [...el.querySelectorAll<HTMLElement>("tr[data-comins-row-data-index]")].filter(row => {
      const r = row.getBoundingClientRect(); return r.top >= bounds.top && r.bottom <= bounds.bottom;
    });
    return { scroll: el.scrollTop, ids: rows.map(row => row.dataset.testid!), positions: rows.map(row => row.getBoundingClientRect().top) };
  });
  // Move the first fully visible Row: this also exercises the scroll anchor Row.
  const source = viewport.getByTestId(metrics.ids[0]!).locator(".comins-row-drag-handle");
  const target = viewport.getByTestId(metrics.ids[4]!);
  const targetIndex = await target.getAttribute("data-comins-row-data-index");
  const from = await source.boundingBox(), to = await target.boundingBox();
  await page.mouse.move(from!.x + 12, from!.y + 12); await page.mouse.down();
  await page.mouse.move(to!.x + 100, to!.y + 18, { steps: 12 });
  await expect(viewport.getByTestId("row-move-placeholder")).toBeVisible();
  expect(Math.abs((await target.boundingBox())!.y - to!.y)).toBeLessThanOrEqual(1);
  await page.mouse.up();
  await expect.poll(() => viewport.evaluate(el => el.scrollTop)).toBe(metrics.scroll);
  // The Core transition places the source at the target's original index.
  await expect(viewport.getByTestId(metrics.ids[0]!)).toHaveAttribute("data-comins-row-data-index", targetIndex!);
});
