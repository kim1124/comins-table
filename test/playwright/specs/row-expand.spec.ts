import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";

function collectBrowserDiagnostics(page: Page) {
  const diagnostics: Array<{ text: string; type: ReturnType<ConsoleMessage["type"]> | "pageerror" }> = [];

  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      diagnostics.push({ text: message.text(), type: message.type() });
    }
  });
  page.on("pageerror", (error) => {
    diagnostics.push({ text: error.message, type: "pageerror" });
  });

  return diagnostics;
}

test("controls fixed Row Details with semantic disclosure state and focus restoration", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/examples/row-expand");

  await expect(page).toHaveURL(/\/examples\/row-expand$/u);
  await expect(page.getByRole("heading", { level: 1, name: "Row Expand" })).toBeVisible();

  const fixed = page.getByTestId("row-expand-example-fixed");
  const toggle = fixed.getByTestId("row-detail-toggle-fixed-1");
  const state = page.getByTestId("row-expand-fixed-state");

  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toHaveAccessibleName("Expand fixed-1 details");
  await expect(toggle).not.toHaveAttribute("aria-controls", /.+/u);
  await expect(state).toHaveText("[]");

  await toggle.focus();
  await toggle.press("Enter");
  const region = fixed.getByRole("region", { exact: true, name: "Collapse fixed-1 details" });
  const controlsId = await toggle.getAttribute("aria-controls");
  expect(controlsId).not.toBeNull();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(toggle).toHaveAccessibleName("Collapse fixed-1 details");
  await expect(region).toHaveAttribute("id", controlsId!);
  await expect(region).toHaveAttribute("aria-labelledby", await toggle.getAttribute("id"));
  await expect(fixed.locator("[data-detail-for='fixed-1'] > td")).toHaveAttribute("colspan", "5");
  await expect(fixed.getByTestId("row-detail-content-fixed-1")).toHaveCSS("height", "240px");
  await expect(state).toContainText('"fixed-1"');

  const detailAction = fixed.getByTestId("fixed-detail-action-fixed-1");
  await detailAction.focus();
  await detailAction.click();
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).not.toHaveAttribute("aria-controls", /.+/u);
  await expect(state).toHaveText("[]");

  await toggle.press("Space");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await toggle.press("Space");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");

  const readOnly = page.getByTestId("row-expand-example-readonly");
  const readOnlyToggle = readOnly.getByTestId("row-detail-toggle-readonly-1");
  await expect(readOnly.getByTestId("row-readonly-1")).toBeVisible();
  await expect(readOnlyToggle).toBeDisabled();
  await expect(readOnlyToggle).toHaveAccessibleName("Collapse readonly-1 details");
  await expect(readOnlyToggle).toHaveAttribute("aria-expanded", "true");
  await expect(readOnlyToggle).toHaveAttribute("aria-controls", /.+/u);
  await expect(
    readOnly.getByRole("region", { exact: true, name: "Collapse readonly-1 details" }),
  ).toBeVisible();

  const nonExpandable = page.getByTestId("row-expand-example-non-expandable");
  await expect(nonExpandable.getByTestId("row-non-expandable-1")).toBeVisible();
  await expect(nonExpandable.getByTestId("row-detail-toggle-non-expandable-1")).toHaveCount(0);
  await expect(nonExpandable.locator("[data-detail-for='non-expandable-1']")).toHaveCount(0);

  expect(diagnostics).toEqual([]);
});

test("remeasures asynchronous automatic Detail growth and Column width changes without owner drift", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.setViewportSize({ height: 900, width: 900 });
  await page.goto("/examples/row-expand");

  const automaticCard = page.locator("[data-feature-option='row-expand-auto']");
  const automatic = page.getByTestId("row-expand-example-auto");
  await automatic.scrollIntoViewIfNeeded();
  const toggle = automatic.getByTestId("row-detail-toggle-auto-1");
  await toggle.click();

  const owner = automatic.getByTestId("row-auto-1");
  const detail = automatic.getByTestId("row-detail-content-auto-1");
  const sizer = automatic.locator(".comins-table__body-virtual-sizer");
  const ownerTopBefore = (await owner.boundingBox())!.y;
  const detailHeightBefore = (await detail.boundingBox())!.height;
  const logicalHeightBefore = await sizer.evaluate((element) => element.getBoundingClientRect().height);

  await automatic.getByTestId("auto-detail-grow-auto-1").click();
  await expect(automatic.getByTestId("auto-detail-grown-content")).toBeVisible();
  await expect.poll(async () => (await detail.boundingBox())?.height ?? 0).toBeGreaterThan(detailHeightBefore + 20);
  const ownerTopAfterGrowth = (await owner.boundingBox())!.y;
  expect(Math.abs(ownerTopAfterGrowth - ownerTopBefore)).toBeLessThanOrEqual(1);

  const detailWidthBefore = (await detail.boundingBox())!.width;
  const logicalHeightAfterGrowth = await sizer.evaluate((element) => element.getBoundingClientRect().height);
  expect(logicalHeightAfterGrowth).toBeGreaterThan(logicalHeightBefore + 20);

  const resize = automaticCard.getByTestId("resize-name");
  const resizeBox = await resize.boundingBox();
  expect(resizeBox).not.toBeNull();
  await page.mouse.move(resizeBox!.x + resizeBox!.width / 2, resizeBox!.y + resizeBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(resizeBox!.x + resizeBox!.width / 2 + 180, resizeBox!.y + resizeBox!.height / 2);
  await page.mouse.up();

  await expect.poll(async () => (await detail.boundingBox())?.width ?? 0).toBeGreaterThan(detailWidthBefore + 100);
  await expect.poll(async () => {
    const detailHeight = (await detail.boundingBox())?.height ?? 0;
    const logicalHeight = await sizer.evaluate((element) => element.getBoundingClientRect().height);

    return Math.abs(logicalHeight - (216 + detailHeight));
  }).toBeLessThanOrEqual(1);
  expect(Math.abs((await owner.boundingBox())!.y - ownerTopAfterGrowth)).toBeLessThanOrEqual(1);

  expect(diagnostics).toEqual([]);
});

test("keeps a viewport-tall Detail in continuous outer scroll and one non-sticky full-span cell", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/examples/row-expand");

  const frame = page.getByTestId("row-expand-tall-frame");
  const tallTable = frame.locator(":scope > .comins-table");
  const tall = page.getByTestId("row-expand-example-tall");
  await expect(frame).toHaveCSS("height", "480px");
  await expect(tallTable).toHaveCSS("height", "480px");
  expect((await tall.boundingBox())?.height ?? 0).toBeLessThan(480);
  expect((await tall.boundingBox())?.height ?? 0).toBeGreaterThan(400);
  await tall.scrollIntoViewIfNeeded();
  await tall.getByTestId("row-detail-toggle-tall-owner").click();
  const detailRow = tall.locator("[data-detail-for='tall-owner']");
  const detailCell = detailRow.locator(":scope > td");

  await expect(detailRow).toBeVisible();
  await expect(detailCell).toHaveCount(1);
  await expect(detailCell).toHaveAttribute("colspan", "3");
  await expect(detailCell).toHaveCSS("position", "static");
  await expect(tall.getByTestId("row-detail-content-tall-owner")).toHaveCSS("height", "960px");

  await tall.evaluate((element) => {
    element.scrollTop = 960;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await expect(tall.getByTestId("row-tall-3")).toBeVisible();

  const scrollSamples = await tall.evaluate(async (element) => {
    const viewport = element;
    const maximum = viewport.scrollHeight - viewport.clientHeight;
    const samples: Array<{ detailMounted: boolean; gap: number; scrollTop: number }> = [];

    for (const scrollTop of [0, maximum / 3, (maximum * 2) / 3, maximum]) {
      viewport.scrollTop = scrollTop;
      viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const table = viewport.querySelector(".comins-table__body-table");
      const viewportRect = viewport.getBoundingClientRect();
      const tableRect = table?.getBoundingClientRect();
      samples.push({
        detailMounted: Boolean(viewport.querySelector("[data-detail-for='tall-owner']")),
        gap: tableRect ? Math.max(0, viewportRect.bottom - tableRect.bottom) : Number.POSITIVE_INFINITY,
        scrollTop: viewport.scrollTop,
      });
    }

    return samples;
  });

  expect(scrollSamples.slice(0, -1).every((sample) => sample.detailMounted)).toBe(true);
  expect(scrollSamples.every((sample) => sample.gap <= 1)).toBe(true);
  expect(scrollSamples.at(-1)?.scrollTop ?? 0).toBeGreaterThan(300);
  await expect(tall.getByTestId("row-tall-30")).toBeVisible();

  const fixedCard = page.locator("[data-feature-option='row-expand-fixed']");
  const fixed = page.getByTestId("row-expand-example-fixed");
  await fixedCard.scrollIntoViewIfNeeded();
  await fixed.getByTestId("row-detail-toggle-fixed-1").click();
  const fixedDetailCell = fixed.locator("[data-detail-for='fixed-1'] > td");
  await fixed.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await expect.poll(() => fixed.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);

  await fixedCard.getByRole("button", { exact: true, name: "Move Status first and hide Age" }).click();
  await expect(fixedDetailCell).toHaveAttribute("colspan", "4");
  await expect(fixedCard.locator(".comins-table__header-table th[data-comins-column-id]").first()).toContainText("Status");
  await expect(fixedDetailCell).toHaveCount(1);
  await expect(fixedDetailCell).toHaveCSS("position", "static");

  expect(diagnostics).toEqual([]);
});

test("preserves dormant controlled Row Detail ids across sorting and pagination", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/examples/row-expand");

  const fixedCard = page.locator("[data-feature-option='row-expand-fixed']");
  const fixed = page.getByTestId("row-expand-example-fixed");
  const state = page.getByTestId("row-expand-fixed-state");
  await fixed.getByTestId("row-detail-toggle-fixed-1").click();
  await expect(state).toContainText('"fixed-1"');
  await expect(fixed.locator("[data-detail-for='fixed-1']")).toBeVisible();

  await fixedCard.getByTestId("header-age").click();
  await fixedCard.getByTestId("header-age").click();
  await expect(state).toContainText('"fixed-1"');
  await expect(fixed.locator("[data-detail-for='fixed-1']")).toHaveCount(0);

  await fixedCard.getByRole("button", { exact: true, name: "Next Row Expand page" }).click();
  await expect(state).toContainText('"fixed-1"');
  await expect(fixed.locator("[data-detail-for='fixed-1']")).toBeVisible();

  expect(diagnostics).toEqual([]);
});

test("keeps automatic Row Detail growth anchored and repeated toggles bounded @perf", async ({ page }, testInfo) => {
  test.setTimeout(45_000);
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/performance/virtualization?fixture=row-detail-auto");

  const viewport = page.getByTestId("data-table-viewport");
  await expect.poll(() => viewport.evaluate((element) => element.scrollHeight)).toBeGreaterThan(100_000);
  await viewport.scrollIntoViewIfNeeded();
  const scrollToFixtureRow = () =>
    viewport.evaluate((element) => {
      element.scrollTop = Math.floor(element.scrollHeight / 2);
      element.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
  await scrollToFixtureRow();

  const owner = page.getByTestId("row-50000");
  const detail = page.getByTestId("row-detail-content-50000");
  const toggle = page.getByTestId("row-detail-toggle-50000");
  await expect(detail).toBeVisible();

  await viewport.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
  const growButton = page.getByTestId("row-detail-perf-grow");
  await growButton.scrollIntoViewIfNeeded();
  await expect(growButton).toBeInViewport();
  const ownerTopBefore = (await owner.boundingBox())!.y - (await viewport.boundingBox())!.y;
  const positionBefore = await viewport.evaluate((element) => ({
    detailHeight: element.querySelector<HTMLElement>("[data-testid='row-detail-content-50000']")?.getBoundingClientRect().height,
    inlineTransform: (element.querySelector(".comins-table__body-table") as HTMLElement).style.transform,
    scrollTop: element.scrollTop,
    transform: getComputedStyle(element.querySelector(".comins-table__body-table")!).transform,
  }));
  const detailHeightBefore = (await detail.boundingBox())!.height;
  await growButton.evaluate((element) => (element as HTMLButtonElement).click());
  await expect(page.getByTestId("row-detail-perf-grown-block")).toHaveCount(1);
  await expect.poll(async () => (await detail.boundingBox())?.height ?? 0).toBeGreaterThan(detailHeightBefore + 40);
  await viewport.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
  const ownerTopAfter = (await owner.boundingBox())!.y - (await viewport.boundingBox())!.y;
  const positionAfter = await viewport.evaluate((element) => ({
    detailHeight: element.querySelector<HTMLElement>("[data-testid='row-detail-content-50000']")?.getBoundingClientRect().height,
    inlineTransform: (element.querySelector(".comins-table__body-table") as HTMLElement).style.transform,
    scrollTop: element.scrollTop,
    transform: getComputedStyle(element.querySelector(".comins-table__body-table")!).transform,
  }));
  const anchorDelta = Math.abs(ownerTopAfter - ownerTopBefore);

  for (let cycle = 0; cycle < 10; cycle += 1) {
    await toggle.click();
    await expect(viewport.locator("[data-detail-for]")).toHaveCount(0);
    await scrollToFixtureRow();
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(viewport.locator("[data-detail-for]")).toHaveCount(1);
  }

  const metrics = await viewport.evaluate((element, measuredAnchorDelta) => ({
    anchorDelta: measuredAnchorDelta,
    detailRows: element.querySelectorAll("[data-detail-for]").length,
    ownerRows: element.querySelectorAll("tr[data-comins-row-data-index]").length,
    scrollHeight: element.scrollHeight,
  }), anchorDelta);
  const metricsWithPositions = { ...metrics, ownerTopAfter, ownerTopBefore, positionAfter, positionBefore };

  await testInfo.attach("row-detail-auto-metrics", {
    body: JSON.stringify(metricsWithPositions, null, 2),
    contentType: "application/json",
  });
  console.info(`[row-detail-auto] ${JSON.stringify(metricsWithPositions)}`);
  expect(metrics.anchorDelta).toBeLessThanOrEqual(1);
  expect(metrics.detailRows).toBe(1);
  expect(metrics.ownerRows).toBeLessThan(90);
  expect(metrics.scrollHeight).toBeLessThan(2_000_000);
  expect(diagnostics).toEqual([]);
});
