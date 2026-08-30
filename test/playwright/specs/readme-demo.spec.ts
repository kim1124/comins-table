import { expect, test, type ConsoleMessage, type Locator, type Page } from "@playwright/test";

function collectBrowserDiagnostics(page: Page) {
  const diagnostics: string[] = [];
  page.on("console", (message: ConsoleMessage) => {
    if (message.type() === "error" || message.type() === "warning") diagnostics.push(message.text());
  });
  page.on("pageerror", (error) => diagnostics.push(error.message));
  return diagnostics;
}

async function dragPointer(page: Page, source: Locator, target: Locator, targetYRatio = 0.5) {
  await source.scrollIntoViewIfNeeded();
  await target.scrollIntoViewIfNeeded();
  await source.hover();
  await page.mouse.down();
  const targetBox = await target.boundingBox();

  expect(targetBox).not.toBeNull();
  await page.mouse.move(
    targetBox!.x + targetBox!.width / 2,
    targetBox!.y + targetBox!.height * targetYRatio,
    { steps: 12 },
  );
  await page.mouse.up();
}

test("README overview moves through representative controlled Table scenes", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/readme-demo");

  const demo = page.getByTestId("readme-demo");
  const table = page.getByTestId("readme-demo-table-overview-table");
  const tableRoot = table.locator("xpath=..");

  await expect(demo).toHaveAttribute("data-feature", "table-overview");
  await expect(table.locator("tr[data-comins-row-data-index]")).toHaveCount(6);
  await tableRoot.getByTestId("header-amount").click();
  await expect(tableRoot.getByTestId("header-amount")).toHaveAttribute("aria-sort", "ascending");
  await table.getByTestId("row-record-a").click();
  await expect(table.getByTestId("row-record-a")).toHaveAttribute("aria-selected", "true");

  await page.getByTestId("readme-demo-view-tree-grid").click();
  await expect(demo).toHaveAttribute("data-feature", "tree-grid");
  const tree = page.getByTestId("readme-demo-tree-grid-table");
  await expect(tree.locator("tr[data-comins-row-data-index]")).toHaveCount(2);
  await page.getByRole("button", { name: "Expand all" }).click();
  await expect(tree.locator("tr[data-comins-row-data-index]")).toHaveCount(8);

  for (const feature of ["column-pinning", "row-grouping", "column-filtering", "cross-table-drag"]) {
    await page.getByTestId(`readme-demo-view-${feature}`).click();
    await expect(demo).toHaveAttribute("data-feature", feature);
    await expect(page.getByTestId(`readme-demo-${feature}`)).toBeVisible();
  }
  expect(diagnostics).toEqual([]);
});

test("README Column Pinning demo keeps both pinned edges visible during horizontal input", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/readme-demo?feature=column-pinning");

  const demo = page.getByTestId("readme-demo");
  const table = page.getByTestId("readme-demo-column-pinning-table");
  const root = table.locator("xpath=..");
  const scrollbar = root.getByTestId("table-horizontal-scrollbar");
  const leftHeader = root.getByTestId("header-name");
  const rightHeader = root.getByTestId("header-status");

  await expect(demo).toHaveAttribute("data-feature", "column-pinning");
  await expect(leftHeader).toHaveAttribute("data-comins-pinned", "left");
  await expect(rightHeader).toHaveAttribute("data-comins-pinned", "right");
  await expect(scrollbar).toBeVisible();
  const before = await Promise.all([leftHeader.boundingBox(), rightHeader.boundingBox()]);

  await scrollbar.hover();
  await page.mouse.wheel(10_000, 0);
  await expect.poll(() => scrollbar.evaluate((element) => element.scrollLeft)).toBeGreaterThan(500);
  const after = await Promise.all([leftHeader.boundingBox(), rightHeader.boundingBox()]);

  expect(Math.abs(after[0]!.x - before[0]!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(after[1]!.x - before[1]!.x)).toBeLessThanOrEqual(1);
  await page.getByTestId("readme-demo-view-row-grouping").click();
  await expect(demo).toHaveAttribute("data-feature", "row-grouping");
  await expect(page.getByTestId("readme-demo-row-grouping-table")).toBeVisible();
  expect(diagnostics).toEqual([]);
});

test("README Row Grouping demo changes the controlled Group order and preserves an empty Group", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/readme-demo?feature=row-grouping");

  const table = page.getByTestId("readme-demo-row-grouping-table");
  const groupRows = table.locator("tr[data-comins-group-row='true']");
  const groupIds = () => groupRows.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-comins-group-id")));

  await expect(groupRows).toHaveCount(3);
  await expect.poll(groupIds).toEqual(["platform", "empty", "experience"]);
  await expect(table.getByTestId("group-row-empty")).toContainText("0 rows");
  await expect(table.getByTestId("group-row-platform")).toContainText("Total 425");

  const toggle = table.getByTestId("group-toggle-platform");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");

  await dragPointer(
    page,
    table.getByTestId("group-drag-handle-platform"),
    table.getByTestId("group-row-experience"),
    0.9,
  );
  await expect.poll(groupIds).toEqual(["empty", "experience", "platform"]);
  await expect(table.getByTestId("group-row-empty")).toContainText("0 rows");
  expect(diagnostics).toEqual([]);
});

test("README Column Filtering demo updates grouped rows and Summary from controlled input", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/readme-demo?feature=column-filtering");

  const table = page.getByTestId("readme-demo-column-filtering-table");
  const root = table.locator("xpath=..");
  const trigger = root.getByTestId("column-filter-trigger-status");

  await expect(table.locator("tr[data-comins-row-data-index]")).toHaveCount(6);
  await trigger.click();
  await expect(page.getByTestId("column-filter-popover-status")).toBeVisible();
  await page.getByTestId("column-filter-value-status").fill("Active");
  await expect(table.locator("tr[data-comins-row-data-index]")).toHaveCount(3);
  await expect(table.getByTestId("group-row-platform")).toContainText("3 Rows");
  await expect(table.getByTestId("group-row-experience")).toContainText("0 Rows");
  await expect(root.getByTestId("summary-cell-name")).toHaveText("3");
  await expect(root.getByTestId("summary-cell-amount")).toHaveText("425");
  await page.getByTestId("column-filter-clear-status").click();
  await expect(table.locator("tr[data-comins-row-data-index]")).toHaveCount(6);
  expect(diagnostics).toEqual([]);
});

test("README Cross-Table Drag demo moves a Group bundle and shows duplicate feedback", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/readme-demo?feature=cross-table-drag");

  const left = page.getByTestId("readme-demo-transfer-left");
  const right = page.getByTestId("readme-demo-transfer-right");

  await dragPointer(
    page,
    left.getByTestId("group-drag-handle-platform"),
    right.getByTestId("group-row-experience"),
    0.1,
  );
  await expect(left.getByTestId("group-row-platform")).toHaveCount(0);
  await expect(left.getByTestId("group-row-left-empty")).toBeVisible();
  await expect(right.getByTestId("group-row-platform")).toBeVisible();
  await expect(right.getByTestId("row-transfer-alpha")).toBeVisible();

  await dragPointer(page, left.getByTestId("row-drag-handle-shared"), right.getByTestId("row-shared"));
  const tooltip = page.getByTestId("transfer-rejection-tooltip");
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText("Duplicate ID");
  await expect(left.getByTestId("row-shared")).toContainText("Shared from left");
  await expect(right.getByTestId("row-shared")).toContainText("Shared from right");
  expect(diagnostics).toEqual([]);
});
