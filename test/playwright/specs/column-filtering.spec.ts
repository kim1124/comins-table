import { expect, test, type ConsoleMessage, type Locator, type Page } from "@playwright/test";

import { initializePlaygroundLocale } from "../helpers/playground-locale";

test.beforeEach(async ({ page }) => initializePlaygroundLocale(page, "en"));

function collectBrowserDiagnostics(page: Page) {
  const diagnostics: Array<{ text: string; type: ReturnType<ConsoleMessage["type"]> | "pageerror" }> = [];

  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      diagnostics.push({ text: message.text(), type: message.type() });
    }
  });
  page.on("pageerror", (error) => diagnostics.push({ text: error.message, type: "pageerror" }));

  return diagnostics;
}

async function dragPointer(page: Page, source: Locator, target: Locator, targetYRatio = 0.5) {
  await source.scrollIntoViewIfNeeded();
  await target.scrollIntoViewIfNeeded();

  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();

  expect(sourceBox).not.toBeNull();
  expect(targetBox).not.toBeNull();

  await page.mouse.move(sourceBox!.x + sourceBox!.width / 2, sourceBox!.y + sourceBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    targetBox!.x + targetBox!.width / 2,
    targetBox!.y + targetBox!.height * targetYRatio,
    { steps: 12 },
  );
  await page.mouse.up();
}

test("Column Filtering keeps the Header editor controlled and isolated", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/examples/column-filtering");

  const layoutMetrics = await page
    .locator('.feature-panel--column-filtering :is([data-feature-option="column-filtering-controlled"],[data-feature-option="column-filtering-grouping"]) .feature-option-sample__inner > .example-table.comins-table')
    .evaluateAll((tables) => tables.map((table) => {
      const container = table.parentElement!;
      const containerRect = container.getBoundingClientRect();
      const tableRect = table.getBoundingClientRect();

      return {
        bottomGap: Math.abs(containerRect.bottom - tableRect.bottom),
        clientHeight: container.clientHeight,
        scrollHeight: container.scrollHeight,
      };
    }));

  expect(layoutMetrics).toHaveLength(2);
  layoutMetrics.forEach(({ bottomGap, clientHeight, scrollHeight }) => {
    expect(bottomGap).toBeLessThanOrEqual(1);
    expect(scrollHeight).toBeLessThanOrEqual(clientHeight + 1);
  });

  const table = page.getByTestId("column-filtering-viewport");
  const tableShell = table.locator("xpath=..");
  const nameHeader = tableShell.getByTestId("header-name");
  const nameTrigger = tableShell.getByTestId("column-filter-trigger-name");

  await expect(table.locator("tr[data-comins-row-data-index]")).toHaveCount(6);
  await expect(nameHeader).toHaveAttribute("aria-sort", "none");
  await nameTrigger.click();

  const popover = page.getByTestId("column-filter-popover-name");
  await expect(popover).toBeVisible();
  await expect(nameHeader).toHaveAttribute("aria-sort", "none");
  const popoverBox = await popover.boundingBox();
  const viewport = page.viewportSize();

  expect(popoverBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(popoverBox!.x).toBeGreaterThanOrEqual(8);
  expect(popoverBox!.y).toBeGreaterThanOrEqual(8);
  expect(popoverBox!.x + popoverBox!.width).toBeLessThanOrEqual(viewport!.width - 8);
  expect(popoverBox!.y + popoverBox!.height).toBeLessThanOrEqual(viewport!.height - 8);

  await page.getByTestId("column-filter-value-name").fill("beta");
  await expect(table.locator("tr[data-comins-row-data-index]")).toHaveCount(1);
  await expect(table.getByTestId("row-filter-b")).toBeVisible();
  await expect(tableShell.getByTestId("summary-cell-name")).toHaveText("1");
  await expect(tableShell.getByTestId("summary-cell-amount")).toHaveText("80");
  await expect(page.getByTestId("column-filtering-model")).toContainText('"value": "beta"');
  await expect(nameTrigger).toHaveAttribute("data-active", "true");
  await expect(nameHeader).toHaveAttribute("aria-sort", "none");

  await page.keyboard.press("Escape");
  await expect(popover).toHaveCount(0);
  await expect(nameTrigger).toBeFocused();

  await nameHeader.click();
  await expect(nameHeader).toHaveAttribute("aria-sort", "ascending");
  await expect(table.locator("tr[data-comins-row-data-index]")).toHaveCount(1);

  await nameTrigger.click();
  await page.getByTestId("column-filter-clear-name").click();
  await expect(table.locator("tr[data-comins-row-data-index]")).toHaveCount(6);
  await expect(page.getByTestId("column-filtering-model")).toHaveText("[]");

  const amountTrigger = tableShell.getByTestId("column-filter-trigger-amount");
  await amountTrigger.click();
  await page.getByTestId("column-filter-operator-amount").selectOption("between");
  await page.getByTestId("column-filter-value-amount").fill("90");
  await page.getByTestId("column-filter-value-to-amount").fill("150");
  await expect(table.locator("tr[data-comins-row-data-index]")).toHaveCount(3);
  await expect(page.getByTestId("column-filtering-model")).toContainText('"operator": "between"');

  await page.locator("body").click({ position: { x: 4, y: 4 } });
  await expect(page.getByTestId("column-filter-popover-amount")).toHaveCount(0);
  expect(diagnostics).toEqual([]);
});

test("Column Filtering preserves explicit Groups while Group Drag remains model-owned", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/examples/column-filtering");

  const table = page.getByTestId("column-filtering-grouped-viewport");
  const groups = table.locator("tr[data-comins-group-row='true']");
  const groupIds = () => groups.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-comins-group-id")));

  await expect(groups).toHaveCount(3);
  await expect.poll(groupIds).toEqual(["east", "empty", "west"]);
  await expect(table.getByTestId("group-row-east")).toContainText("2 Rows");
  await expect(table.getByTestId("group-row-empty")).toContainText("0 Rows");
  await expect(table.getByTestId("group-row-west")).toContainText("1 Rows");
  await expect(table.locator("tr[data-comins-row-data-index]")).toHaveCount(3);
  await expect(table.locator("[data-row-draggable='true']")).toHaveCount(0);
  await expect(table.locator("xpath=..").getByTestId("column-filter-trigger-status")).toHaveAttribute(
    "data-active",
    "true",
  );

  await table.locator("xpath=..").getByTestId("column-filter-trigger-status").click();
  await page.getByTestId("column-filter-clear-status").click();
  await expect(table.locator("tr[data-comins-row-data-index]")).toHaveCount(6);
  await expect(table.getByTestId("group-row-east")).toContainText("3 Rows");
  await expect(table.getByTestId("group-row-empty")).toContainText("0 Rows");
  await expect(table.getByTestId("group-row-west")).toContainText("3 Rows");

  await dragPointer(
    page,
    table.getByTestId("group-drag-handle-east"),
    table.getByTestId("group-row-west"),
    0.9,
  );
  await expect.poll(groupIds).toEqual(["empty", "west", "east"]);

  await table.locator("xpath=..").getByTestId("header-name").click();
  await expect.poll(groupIds).toEqual(["empty", "west", "east"]);
  expect(diagnostics).toEqual([]);
});

test("Column Filtering keeps a combined 100000-row Group projection bounded @perf", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/examples/column-filtering?fixture=large");

  await expect(page.getByTestId("column-filtering-virtual-count")).toHaveText("100000 source rows");
  const table = page.getByTestId("column-filtering-virtual-viewport");
  const slots = table.locator("tr[data-comins-group-row='true'], tr[data-comins-row-data-index]");

  await expect(slots).not.toHaveCount(0);
  expect(await slots.count()).toBeLessThan(60);
  await expect(table.locator("xpath=..").getByTestId("column-filter-trigger-amount")).toHaveAttribute(
    "data-active",
    "true",
  );
  await expect.poll(() => table.evaluate((element) => element.scrollHeight)).toBeGreaterThan(50_000);

  const startedAt = Date.now();
  await table.locator("xpath=..").getByTestId("column-filter-trigger-amount").click();
  await page.getByTestId("column-filter-clear-amount").click();
  await expect.poll(() => table.evaluate((element) => element.scrollHeight)).toBeGreaterThan(1_000_000);
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("column-filter-popover-amount")).toHaveCount(0);
  const clearDuration = Date.now() - startedAt;

  expect(clearDuration).toBeLessThan(2_000);
  expect(await slots.count()).toBeLessThan(60);

  await table.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await expect
    .poll(() => table.locator("tr[data-comins-row-data-index]").last().getAttribute("data-comins-row-data-index"))
    .toBe("99999");
  expect(await slots.count()).toBeLessThan(60);

  await table.locator("xpath=..").getByTestId("column-filter-trigger-amount").click();
  await page.getByTestId("column-filter-operator-amount").selectOption("greaterThan");
  await page.getByTestId("column-filter-value-amount").fill("98");
  await expect.poll(() => table.evaluate((element) => element.scrollHeight)).toBeLessThan(100_000);
  await expect.poll(() => table.evaluate((element) =>
    element.scrollTop <= element.scrollHeight - element.clientHeight + 1)).toBe(true);
  expect(await slots.count()).toBeLessThan(60);
  expect(diagnostics).toEqual([]);
});

const valueCard = (page: Page) => page.locator('[data-feature-option="column-filtering-values"]');
test("Value list filtering distinguishes explicit all, empty selection and search-scoped changes", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/examples/column-filtering");
  const card = valueCard(page);
  await card.getByRole("button", { name: "Filter status", exact: true }).click();
  const popup = page.getByRole("dialog", { name: "Filter status", exact: true });
  await expect(popup.getByRole("searchbox")).toBeFocused();
  await popup.getByRole("checkbox", { name: "Blocked", exact: true }).uncheck();
  await expect(card.getByTestId("summary-cell-status")).toHaveText("4");
  await popup.getByRole("searchbox").fill("block");
  await expect(popup.locator(".comins-column-filter__option")).toHaveCount(1);
  await popup.getByRole("checkbox", { name: "Select all matching values" }).check();
  await expect(card.getByTestId("value-filter-model")).toContainText('"operator":"in"');
  await expect(card.getByTestId("value-filter-model")).toContainText('"Ready",null,"Blocked"');
  await popup.getByRole("searchbox").fill("");
  await popup.getByRole("checkbox", { name: "Select all matching values" }).uncheck();
  await expect(card.getByTestId("value-filter-model")).toContainText('"values":[]');
  await expect(card.getByTestId("summary-cell-status")).toHaveText("0");
  await popup.getByRole("checkbox", { name: "Select all matching values" }).check();
  await expect(card.getByTestId("value-filter-model")).toHaveText("[]");
  await page.keyboard.press("Escape");
  await expect(popup).toHaveCount(0);
  await expect(card.getByRole("button", { name: "Filter status", exact: true })).toBeFocused();
  expect(diagnostics).toEqual([]);
});

test("Value list facets retain zero-count options and selected values across data replacement", async ({ page }) => {
  await page.goto("/examples/column-filtering"); const card = valueCard(page);
  await card.getByRole("button", { name: "Filter region", exact: true }).click();
  await page.getByRole("dialog", { name: "Filter region" }).getByRole("checkbox", { name: "US", exact: true }).uncheck();
  await page.keyboard.press("Escape");
  await card.getByRole("button", { name: "Filter status", exact: true }).click();
  let popup = page.getByRole("dialog", { name: "Filter status", exact: true });
  const blocked = popup.locator(".comins-column-filter__option").filter({ has: page.getByRole("checkbox", { name: "Blocked", exact: true }) });
  await expect(blocked).toContainText("0");
  await expect(blocked.getByRole("checkbox")).toBeEnabled();
  await popup.getByRole("checkbox", { name: "Blocked", exact: true }).uncheck();
  const saved = await card.getByTestId("value-filter-model").textContent();
  await card.getByTestId("value-filter-data").click();
  await card.getByRole("button", { name: "Filter status", exact: true }).click();
  popup = page.getByRole("dialog", { name: "Filter status", exact: true });
  await expect(popup.locator('[data-present="false"]')).toContainText("Ready");
  await expect(card.getByTestId("value-filter-model")).toHaveText(saved!);
  await card.getByTestId("value-filter-data").click();
  await card.getByRole("button", { name: "Filter status", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Filter status", exact: true }).getByRole("checkbox", { name: "Ready", exact: true })).toBeChecked();
  await expect(card.getByTestId("value-filter-model")).toHaveText(saved!);
});

test("Custom value filter controls support keyboard, styles, readonly and external focus", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/examples/column-filtering"); const card = valueCard(page);
  await card.getByTestId("value-filter-variant").selectOption("custom");
  const trigger = card.getByRole("button", { name: "Filter status", exact: true });
  await trigger.focus(); await page.keyboard.press("Enter");
  const popup = page.getByRole("dialog", { name: "Filter status", exact: true });
  await expect(popup.getByTestId("value-filter-custom-panel").locator("ul li")).toHaveCount(3);
  await expect(popup.locator(".value-filter-badge")).toHaveCount(3);
  await expect(popup.locator(".value-filter-option").first()).toHaveClass(/comins-column-filter__option/);
  const ready = popup.getByRole("checkbox", { name: "Ready", exact: true });
  await ready.focus(); await page.keyboard.press("Space");
  await expect(ready).toHaveAttribute("aria-checked", "false");
  await expect(card.getByTestId("summary-cell-status")).toHaveText("3");
  await page.keyboard.press("Escape"); await expect(trigger).toBeFocused();
  await card.getByTestId("value-filter-readonly").check();
  await trigger.click();
  await expect(popup.getByRole("searchbox")).toBeEnabled();
  await expect(popup.getByRole("checkbox", { name: "Ready", exact: true })).toHaveAttribute("aria-disabled", "true");
  await card.getByTestId("value-filter-variant").focus();
  await expect(popup).toHaveCount(0);
  await expect(card.getByTestId("value-filter-variant")).toBeFocused();
  expect(diagnostics).toEqual([]);
});

test("Value list high-cardinality measurements @perf", async ({ page }) => {
  await page.goto("/examples/column-filtering"); const card = valueCard(page);
  for (const scale of ["100", "10000"]) {
    await card.getByTestId("value-filter-scale").selectOption(scale);
    const start = Date.now();
    await card.getByRole("button", { name: "Filter status", exact: true }).click();
    const popup = page.getByRole("dialog", { name: "Filter status", exact: true });
    await expect(popup.locator(".comins-column-filter__option")).toHaveCount(Number(scale));
    const opened = Date.now();
    await popup.getByRole("searchbox").fill("Value 00099");
    await expect(popup.locator(".comins-column-filter__option")).toHaveCount(1);
    const searched = Date.now();
    await popup.getByRole("checkbox", { name: "Value 00099", exact: true }).uncheck();
    await expect(card.getByTestId("value-filter-model")).toContainText('"operator":"in"');
    console.log(JSON.stringify({ rows: 10000, distinct: Number(scale), openMs: opened - start, searchMs: searched - opened, checkMs: Date.now() - searched }));
    await popup.getByRole("button", { name: "Clear filter" }).click();
    await page.keyboard.press("Escape");
  }
});
