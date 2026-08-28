import { expect, test } from "@playwright/test";

import { initializePlaygroundLocale } from "../helpers/playground-locale";

test.beforeEach(async ({ page }) => initializePlaygroundLocale(page, "en"));

test("Column Pinning keeps sticky surfaces aligned and demotes responsively", async ({ page }) => {
  await page.goto("/examples/column-pinning");

  const viewport = page.getByTestId("column-pinning-viewport");
  const root = viewport.locator("xpath=..");
  const summary = root.locator(".comins-table__summary");
  const horizontalScrollbar = root.getByTestId("table-horizontal-scrollbar");
  const leftHeader = root.getByTestId("header-name");
  const rightHeader = root.getByTestId("header-id");
  const leftCell = viewport.getByTestId("cell-pin-1-name");
  const centerCell = viewport.getByTestId("cell-pin-1-owner");
  const rightCell = viewport.getByTestId("cell-pin-1-id");

  await expect(leftHeader).toHaveAttribute("data-comins-pinned", "left");
  await expect(rightHeader).toHaveAttribute("data-comins-pinned", "right");
  await expect(leftCell).toHaveCSS("position", "sticky");
  await expect(rightCell).toHaveCSS("position", "sticky");
  await expect(leftHeader.getByTestId("column-move-handle-name")).toHaveCount(0);

  await expect(horizontalScrollbar).toBeVisible();

  const overflow = await viewport.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeGreaterThan(overflow.clientWidth + 500);
  const [viewportBox, summaryBox, scrollbarBox] = await Promise.all([
    viewport.boundingBox(),
    summary.boundingBox(),
    horizontalScrollbar.boundingBox(),
  ]);
  expect(viewportBox).not.toBeNull();
  expect(summaryBox).not.toBeNull();
  expect(scrollbarBox).not.toBeNull();
  expect(summaryBox!.y).toBeGreaterThanOrEqual(viewportBox!.y + viewportBox!.height - 1);
  expect(scrollbarBox!.y).toBeGreaterThanOrEqual(summaryBox!.y + summaryBox!.height - 1);
  const scrollbarMetrics = await horizontalScrollbar.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(scrollbarMetrics.scrollWidth).toBeGreaterThan(scrollbarMetrics.clientWidth + 500);

  const before = await Promise.all([leftCell.boundingBox(), centerCell.boundingBox(), rightCell.boundingBox()]);

  await horizontalScrollbar.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });

  await expect
    .poll(async () =>
      root.evaluate((element) => {
        const positions = [
          element.querySelector<HTMLElement>(".comins-table__header")?.scrollLeft,
          element.querySelector<HTMLElement>("[data-testid='column-pinning-viewport']")?.scrollLeft,
          element.querySelector<HTMLElement>(".comins-table__summary")?.scrollLeft,
          element.querySelector<HTMLElement>("[data-testid='table-horizontal-scrollbar']")?.scrollLeft,
        ].filter((value): value is number => typeof value === "number");

        return positions.length === 4
          ? Math.max(...positions) - Math.min(...positions)
          : Number.POSITIVE_INFINITY;
      }),
    )
    .toBeLessThanOrEqual(1);

  const endState = await root.evaluate((element) => {
    const surfaces = {
      Body: element.querySelector<HTMLElement>("[data-testid='column-pinning-viewport']"),
      "horizontal scrollbar": element.querySelector<HTMLElement>("[data-testid='table-horizontal-scrollbar']"),
    };

    return Object.fromEntries(Object.entries(surfaces).map(([name, surface]) => [name, {
      maxScrollLeft: surface ? Math.max(0, surface.scrollWidth - surface.clientWidth) : -1,
      scrollLeft: surface?.scrollLeft ?? -1,
    }]));
  });
  expect(endState.Body?.scrollLeft).toBeGreaterThan(500);
  for (const [surface, state] of Object.entries(endState)) {
    expect(
      Math.abs(state.maxScrollLeft - state.scrollLeft),
      `${surface} must reach its horizontal end (${state.scrollLeft}/${state.maxScrollLeft})`,
    ).toBeLessThanOrEqual(1);
  }

  const after = await Promise.all([leftCell.boundingBox(), centerCell.boundingBox(), rightCell.boundingBox()]);

  expect(Math.abs(after[0]!.x - before[0]!.x)).toBeLessThanOrEqual(1);
  expect(before[1]!.x - after[1]!.x).toBeGreaterThan(500);
  expect(Math.abs(after[2]!.x - before[2]!.x)).toBeLessThanOrEqual(1);

  await horizontalScrollbar.evaluate((element) => {
    element.scrollLeft = 0;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await viewport.dispatchEvent("wheel", { deltaX: 240, deltaY: 0 });
  await expect.poll(async () => root.evaluate((element) => {
    const body = element.querySelector<HTMLElement>("[data-testid='column-pinning-viewport']");
    const header = element.querySelector<HTMLElement>(".comins-table__header");
    const footer = element.querySelector<HTMLElement>(".comins-table__summary");
    const scrollbar = element.querySelector<HTMLElement>("[data-testid='table-horizontal-scrollbar']");

    return [body?.scrollLeft, header?.scrollLeft, footer?.scrollLeft, scrollbar?.scrollLeft];
  })).toEqual([240, 240, 240, 240]);

  const summaryCells = root.locator(".comins-table__summary-cell");
  await expect(root.getByTestId("summary-cell-name")).toContainText("12");
  await expect(summaryCells).toHaveCount(12);
  expect(await summaryCells.evaluateAll((cells) =>
    cells.map((cell) => cell.getAttribute("data-comins-pinned"))))
    .toEqual(["left", null, null, null, null, null, null, null, null, null, "right", "right"]);

  await page.getByRole("button", { name: "Use narrow container" }).click();
  await expect(leftHeader).not.toHaveAttribute("data-comins-pinned", "left");
  await expect(rightHeader).toHaveAttribute("data-comins-pinned", "right");

  const grouped = page.getByTestId("column-pinning-grouped-viewport").locator("xpath=..");
  await expect(grouped.getByTestId("header-group-identity")).toHaveAttribute("data-comins-pinned", "left");
  await expect(grouped.getByTestId("group-row-East")).not.toHaveAttribute("data-comins-pinned");
});

test("Column Pinning keeps the final Row boundary visible above an auto-hidden scrollbar", async ({ page }) => {
  await page.setViewportSize({ height: 1000, width: 1440 });
  await page.goto("/examples/column-pinning");

  const viewport = page.getByTestId("column-pinning-grouped-viewport");
  const root = viewport.locator("xpath=..");
  const horizontalScrollbar = root.getByTestId("table-horizontal-scrollbar");

  await viewport.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });

  const lastRow = viewport.locator("tbody tr:not(.comins-table-empty-filler)").last();
  const lastCell = lastRow.locator(".comins-table__td").first();
  await expect(lastCell).toHaveCSS("border-bottom-width", "0px");
  await expect(horizontalScrollbar).toHaveCSS("border-top-width", "1px");
  await expect(horizontalScrollbar).toHaveCSS("border-top-style", "solid");

  const [viewportBox, lastRowBox, scrollbarBox] = await Promise.all([
    viewport.boundingBox(),
    lastRow.boundingBox(),
    horizontalScrollbar.boundingBox(),
  ]);
  expect(viewportBox).not.toBeNull();
  expect(lastRowBox).not.toBeNull();
  expect(scrollbarBox).not.toBeNull();
  expect(Math.abs(lastRowBox!.y + lastRowBox!.height - (viewportBox!.y + viewportBox!.height))).toBeLessThanOrEqual(1);
  expect(Math.abs(scrollbarBox!.y - (viewportBox!.y + viewportBox!.height))).toBeLessThanOrEqual(1);
});

test("Column Pinning keeps an actively resized pinned Column above scrolling content", async ({ page }) => {
  await page.setViewportSize({ height: 1000, width: 1440 });
  await page.goto("/examples/column-pinning");

  const viewport = page.getByTestId("column-pinning-viewport");
  const root = viewport.locator("xpath=..");
  const leftHeader = root.getByTestId("header-name");
  const rightStatusHeader = root.getByTestId("header-status");
  const rightIdHeader = root.getByTestId("header-id");
  const resize = root.getByTestId("resize-name");
  const beforeHeader = await leftHeader.boundingBox();
  const resizeBox = await resize.boundingBox();
  expect(beforeHeader).not.toBeNull();
  expect(resizeBox).not.toBeNull();

  await page.mouse.move(resizeBox!.x + resizeBox!.width / 2, resizeBox!.y + resizeBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(resizeBox!.x + resizeBox!.width / 2 + 600, resizeBox!.y + resizeBox!.height / 2, { steps: 12 });
  await page.mouse.up();

  await expect(leftHeader).toHaveAttribute("data-comins-pinned", "left");
  const [afterHeader, rightStatus, rightId] = await Promise.all([
    leftHeader.boundingBox(),
    rightStatusHeader.boundingBox(),
    rightIdHeader.boundingBox(),
  ]);
  const clientWidth = await viewport.evaluate((element) => element.clientWidth);
  expect(afterHeader).not.toBeNull();
  expect(rightStatus).not.toBeNull();
  expect(rightId).not.toBeNull();
  expect(afterHeader!.width).toBeGreaterThan(beforeHeader!.width + 400);
  expect(afterHeader!.width + rightStatus!.width + rightId!.width).toBeLessThanOrEqual(clientWidth - 47);

  const beforeScrollX = afterHeader!.x;
  const scrollLeft = await viewport.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
    return element.scrollLeft;
  });
  const afterScroll = await leftHeader.boundingBox();
  expect(scrollLeft).toBeGreaterThan(500);
  expect(Math.abs(afterScroll!.x - beforeScrollX)).toBeLessThanOrEqual(1);
});

test("Column Pinning keeps an actively resized pinned Header Group atomic", async ({ page }) => {
  await page.setViewportSize({ height: 1000, width: 1440 });
  await page.goto("/examples/column-pinning");

  const viewport = page.getByTestId("column-pinning-grouped-viewport");
  const root = viewport.locator("xpath=..");
  const groupHeader = root.getByTestId("header-group-identity");
  const rightStatusHeader = root.getByTestId("header-status");
  const rightIdHeader = root.getByTestId("header-id");
  const resize = root.getByTestId("resize-group-identity");
  await resize.scrollIntoViewIfNeeded();
  const beforeHeader = await groupHeader.boundingBox();
  const resizeBox = await resize.boundingBox();
  expect(beforeHeader).not.toBeNull();
  expect(resizeBox).not.toBeNull();

  await page.mouse.move(resizeBox!.x + resizeBox!.width / 2, resizeBox!.y + resizeBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(resizeBox!.x + resizeBox!.width / 2 + 600, resizeBox!.y + resizeBox!.height / 2, { steps: 12 });
  await page.mouse.up();

  await expect(groupHeader).toHaveAttribute("data-comins-pinned", "left");
  const [afterHeader, rightStatus, rightId] = await Promise.all([
    groupHeader.boundingBox(),
    rightStatusHeader.boundingBox(),
    rightIdHeader.boundingBox(),
  ]);
  const clientWidth = await viewport.evaluate((element) => element.clientWidth);
  expect(afterHeader).not.toBeNull();
  expect(rightStatus).not.toBeNull();
  expect(rightId).not.toBeNull();
  expect(afterHeader!.width).toBeGreaterThan(beforeHeader!.width + 300);
  expect(afterHeader!.width + rightStatus!.width + rightId!.width).toBeLessThanOrEqual(clientWidth - 47);
});
