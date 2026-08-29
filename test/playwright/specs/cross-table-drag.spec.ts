import { expect, test, type Locator, type Page } from "@playwright/test";

import { initializePlaygroundLocale } from "../helpers/playground-locale";

test.beforeEach(async ({ page }) => initializePlaygroundLocale(page, "en"));

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

async function dragPointerToPoint(page: Page, source: Locator, target: { x: number; y: number }) {
  await source.scrollIntoViewIfNeeded();
  await source.hover();
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 12 });
  await page.mouse.up();
}

test("Cross-Table Drag moves flat Rows and overwrites duplicate IDs only when selected", async ({ page }) => {
  await page.goto("/examples/cross-table-drag");

  const left = page.getByTestId("cross-table-flat-left");
  const right = page.getByTestId("cross-table-flat-right");

  await dragPointer(page, left.getByTestId("row-drag-handle-flat-a"), right.getByTestId("row-flat-b"));
  await expect(left.getByTestId("row-flat-a")).toHaveCount(0);
  await expect(right.getByTestId("row-flat-a")).toBeVisible();
  await expect(right.getByTestId("row-flat-a")).toBeFocused();

  await dragPointer(page, left.getByTestId("row-drag-handle-shared"), right.getByTestId("row-shared"));
  await expect(left.getByTestId("row-shared")).toBeVisible();
  await expect(right.getByTestId("row-shared")).toContainText("Shared from right");
  const rejectionTooltip = page.getByTestId("transfer-rejection-tooltip");

  await expect(rejectionTooltip).toBeVisible();
  await expect(rejectionTooltip).toContainText("Duplicate ID");
  await expect(rejectionTooltip).toContainText('The ID "shared" already exists.');
  await expect(right.locator("..")).toHaveAttribute("data-comins-transfer-rejected", "true");
  expect(await rejectionTooltip.evaluate((element) => getComputedStyle(element).pointerEvents))
    .toBe("none");
  const tooltipBox = await rejectionTooltip.boundingBox();

  expect(tooltipBox).not.toBeNull();
  expect(await page.evaluate(
    ({ x, y }) => document.elementFromPoint(x, y)
      ?.closest<HTMLElement>("[data-comins-transfer-table-id]")
      ?.dataset.cominsTransferTableId,
    { x: tooltipBox!.x + tooltipBox!.width / 2, y: tooltipBox!.y + tooltipBox!.height / 2 },
  )).toBe("flat-right");

  await page.getByRole("button", { name: "Conflict: reject" }).click();
  await dragPointer(page, left.getByTestId("row-drag-handle-shared"), right.getByTestId("row-shared"));
  await expect(left.getByTestId("row-shared")).toHaveCount(0);
  await expect(right.getByTestId("row-shared")).toHaveCount(1);
  await expect(right.getByTestId("row-shared")).toContainText("Shared from left");
});

test("Cross-Table Row Drag auto-scrolls only the long target Table", async ({ page }) => {
  await page.setViewportSize({ height: 1000, width: 1440 });
  await page.goto("/examples/cross-table-drag");

  const left = page.getByTestId("cross-table-flat-left");
  const right = page.getByTestId("cross-table-flat-right");
  const source = left.getByTestId("row-drag-handle-flat-a");

  await source.scrollIntoViewIfNeeded();
  await right.evaluate((element) => {
    element.scrollTop = 0;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  const sourceBox = await source.boundingBox();
  const targetBox = await right.boundingBox();

  expect(sourceBox).not.toBeNull();
  expect(targetBox).not.toBeNull();
  const targetEdgeY = targetBox!.y + targetBox!.height - 2;
  expect(await page.evaluate(
    ({ x, y }) => document.elementFromPoint(x, y)
      ?.closest<HTMLElement>("[data-comins-transfer-table-id]")
      ?.dataset.cominsTransferTableId,
    { x: targetBox!.x + targetBox!.width / 2, y: targetEdgeY },
  )).toBe("flat-right");
  const pageScrollBefore = await page.evaluate(() => window.scrollY);
  const sourceScrollBefore = await left.evaluate((element) => element.scrollTop);

  await page.mouse.move(sourceBox!.x + sourceBox!.width / 2, sourceBox!.y + sourceBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    targetBox!.x + targetBox!.width / 2,
    targetEdgeY,
    { steps: 12 },
  );
  await expect.poll(() => right.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect(await left.evaluate((element) => element.scrollTop)).toBe(sourceScrollBefore);
  expect(await page.evaluate(() => window.scrollY)).toBe(pageScrollBefore);
  await page.mouse.up();

  await expect(left.getByTestId("row-flat-a")).toHaveCount(0);
  await expect(right.getByTestId("row-flat-a")).toBeFocused();
});

test("Cross-Table Row Drag accepts the visible empty Body area as a target", async ({ page }) => {
  await page.setViewportSize({ height: 1000, width: 1440 });
  await page.goto("/examples/cross-table-drag");

  const left = page.getByTestId("cross-table-flat-left");
  const right = page.getByTestId("cross-table-flat-right");
  const source = right.getByTestId("row-drag-handle-flat-b");

  await left.scrollIntoViewIfNeeded();
  const lastRow = left.locator("tbody tr[data-comins-row-data-index]").last();
  const [targetBox, lastRowBox] = await Promise.all([left.boundingBox(), lastRow.boundingBox()]);

  expect(targetBox).not.toBeNull();
  expect(lastRowBox).not.toBeNull();
  const target = {
    x: targetBox!.x + targetBox!.width / 2,
    y: Math.min(targetBox!.y + targetBox!.height - 8, lastRowBox!.y + lastRowBox!.height + 40),
  };
  expect(target.y).toBeGreaterThan(lastRowBox!.y + lastRowBox!.height + 1);
  expect(await page.evaluate(
    ({ x, y }) => document.elementFromPoint(x, y)
      ?.closest<HTMLElement>("[data-comins-transfer-table-id]")
      ?.dataset.cominsTransferTableId,
    target,
  )).toBe("flat-left");

  await dragPointerToPoint(page, source, target);

  await expect(right.getByTestId("row-flat-b")).toHaveCount(0);
  await expect(left.getByTestId("row-flat-b")).toBeVisible();
  await expect(left.getByTestId("row-flat-b")).toBeFocused();
});

test("Cross-Table Row Drag moves a grouped Row into an empty target Group", async ({ page }) => {
  await page.goto("/examples/cross-table-drag");

  const left = page.getByTestId("cross-table-group-left");
  const right = page.getByTestId("cross-table-group-right");

  await dragPointer(
    page,
    left.getByTestId("row-drag-handle-group-a"),
    right.getByTestId("group-row-right-empty"),
  );

  await expect(left.getByTestId("group-row-left-a")).toBeVisible();
  await expect(left.getByTestId("row-group-a")).toHaveCount(0);
  await expect(right.getByTestId("row-group-a")).toBeVisible();
  await expect(right.getByTestId("row-group-a")).toBeFocused();
  await expect(page.getByTestId("cross-table-group-right-state")).toContainText(
    '"groupId":"right-empty","id":"group-a"',
  );
});

test("Cross-Table Group Drag moves the full bundle and preserves another empty source Group", async ({ page }) => {
  await page.goto("/examples/cross-table-drag");

  const left = page.getByTestId("cross-table-group-left");
  const right = page.getByTestId("cross-table-group-right");

  await dragPointer(
    page,
    left.getByTestId("group-drag-handle-left-a"),
    right.getByTestId("group-row-right-a"),
    0.1,
  );

  await expect(left.getByTestId("group-row-left-a")).toHaveCount(0);
  await expect(left.getByTestId("group-row-left-empty")).toBeVisible();
  await expect(right.getByTestId("group-row-left-a")).toBeVisible();
  await expect(right.getByTestId("row-group-a")).toBeVisible();
  await expect(right.getByTestId("group-drag-handle-left-a")).toBeFocused();
});
