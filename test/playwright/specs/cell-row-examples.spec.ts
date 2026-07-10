import { expect, test } from "@playwright/test";

test("cell page demonstrates formatting styling and events", async ({ page }) => {
  await page.setViewportSize({ height: 720, width: 640 });
  await page.goto("/");
  await page.goto("/examples/cell");

  await expect(page.getByTestId("feature-option-description").first()).toContainText("Td Cell 포맷");
  await expect(page.getByTestId("feature-option-description").first()).toContainText("onClickCell");
  await expect(page.getByTestId("feature-options")).toHaveCount(0);
  await expect(page.getByTestId("feature-controls")).toHaveCount(0);
  await expect(page.getByTestId("cell-selection-state")).toHaveCount(0);
  await expect(page.locator(".comins-table__component")).toHaveCount(0);
  await expect(page.locator(".comins-table__header-table th")).toHaveCount(6);
  await expect(page.getByTestId("header-locked")).toContainText("Column5");
  await expect(page.getByTestId("cell-b-age")).toHaveText("Data 2");
  await expect(page.getByTestId("cell-b-age")).not.toHaveCSS("background-color", "rgb(17, 24, 39)");
  await expect(page.getByTestId("cell-b-age")).not.toHaveCSS("color", "rgb(248, 250, 252)");
  await expect(page.getByTestId("cell-a-style")).toHaveClass(/cell-role-owner/u);
  await expect(page.getByTestId("cell-a-style")).toHaveCSS("background-color", "rgb(88, 28, 135)");
  await expect(page.getByTestId("cell-a-style")).toHaveCSS("color", "rgb(248, 250, 252)");
  await expect(page.getByTestId("cell-a-style")).toHaveCSS("border-left-color", "rgb(251, 191, 36)");
  await expect(page.getByTestId("cell-a-style")).toHaveCSS("font-weight", "900");
  await expect(page.getByTestId("cell-renderer-a").getByRole("button", { name: "renderer:Data 1" })).toBeVisible();

  const styleFingerprint = await page.getByTestId("cell-a-style").evaluate((element) => {
    const style = window.getComputedStyle(element);

    return {
      fontFamily: style.fontFamily,
      textTransform: style.textTransform,
    };
  });

  expect(styleFingerprint.fontFamily).toContain("Georgia");
  expect(styleFingerprint.textTransform).toBe("uppercase");

  const geometry = await page.getByTestId("data-table-viewport").evaluate((viewport) => {
    const headers = Array.from(document.querySelectorAll<HTMLElement>(".comins-table__header-table th"));

    return {
      hasHorizontalOverflow: viewport.getAttribute("data-horizontal-overflow"),
      widths: headers.map((header) => Math.round(header.getBoundingClientRect().width)),
    };
  });

  expect(geometry.hasHorizontalOverflow).toBe("true");
  for (const width of geometry.widths.slice(0, 4)) {
    expect(width).toBeGreaterThanOrEqual(98);
    expect(width).toBeLessThanOrEqual(102);
  }
  expect(geometry.widths[4]).toBeGreaterThanOrEqual(158);
  expect(geometry.widths[4]).toBeLessThanOrEqual(162);
  expect(geometry.widths[5]).toBeGreaterThanOrEqual(98);
  expect(geometry.widths[5]).toBeLessThanOrEqual(102);

  await page.getByTestId("cell-a-name").click();
  await expect(page.getByTestId("cell-event-alert")).toContainText("셀 클릭");
  await expect(page.getByTestId("cell-event-alert")).toContainText("a / name");

  await page.getByTestId("cell-b-locked").click();
  await expect(page.getByTestId("cell-event-alert")).toContainText("차단된 셀");
  await expect(page.getByTestId("cell-event-alert")).toContainText("b / locked");

  await page.getByTestId("cell-b-name").dblclick();
  await expect(page.getByTestId("cell-event-alert")).toContainText("셀 더블클릭");
  await expect(page.getByTestId("cell-event-alert")).toContainText("b / name");

  await page.getByTestId("cell-c-name").click({ button: "right" });
  await expect(page.getByTestId("cell-event-alert")).toContainText("셀 우클릭");
  await expect(page.getByTestId("cell-event-alert")).toContainText("c / name");

  await page.getByTestId("cell-a-name").press("Enter");
  await expect(page.getByTestId("cell-event-alert")).toContainText("셀 키다운");
  await expect(page.getByTestId("cell-event-alert")).toContainText("a / name / Enter");
});

test("cell page columns start at 100px and remain resizable", async ({ page }) => {
  await page.setViewportSize({ height: 720, width: 640 });
  await page.goto("/");
  await page.goto("/examples/cell");

  const header = page.getByTestId("header-name");
  const resizeHandle = page.getByTestId("resize-name");
  await expect(header).toBeVisible();
  await resizeHandle.scrollIntoViewIfNeeded();
  const before = await header.boundingBox();
  const handleBox = await resizeHandle.boundingBox();
  expect(before).not.toBeNull();
  expect(handleBox).not.toBeNull();
  expect(Math.round(before!.width)).toBe(100);

  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox!.x + 80, handleBox!.y + handleBox!.height / 2);
  await page.mouse.up();

  const after = await header.boundingBox();
  expect(after).not.toBeNull();
  expect(after!.width).toBeGreaterThan(before!.width + 50);
});

test("cell page column resize clamps at the playground 100px minimum", async ({ page }) => {
  await page.setViewportSize({ height: 720, width: 640 });
  await page.goto("/");
  await page.goto("/examples/cell");

  const header = page.getByTestId("header-name");
  const resizeHandle = page.getByTestId("resize-name");
  await expect(header).toBeVisible();
  await resizeHandle.scrollIntoViewIfNeeded();
  const before = await header.boundingBox();
  const handleBox = await resizeHandle.boundingBox();
  expect(before).not.toBeNull();
  expect(handleBox).not.toBeNull();

  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox!.x - 160, handleBox!.y + handleBox!.height / 2);
  await page.mouse.up();

  const after = await header.boundingBox();
  expect(after).not.toBeNull();
  expect(after!.width).toBeGreaterThanOrEqual(99);
  expect(after!.width).toBeLessThanOrEqual(104);

  const cellMetrics = await page.getByTestId("cell-a-name").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const value = element.querySelector<HTMLElement>(".comins-table__cell-value");

    return {
      cellRight: rect.right,
      valueRight: value?.getBoundingClientRect().right ?? 0,
    };
  });

  expect(cellMetrics.valueRight).toBeLessThanOrEqual(cellMetrics.cellRight + 1);
});

test("row page demonstrates styling and events", async ({ page }) => {
  await page.goto("/");
  await page.goto("/examples/row");

  await expect(page.getByTestId("feature-option-description").first()).toContainText("드래그 이동");
  await expect(page.getByTestId("feature-option-description").first()).toContainText("rowProps");
  await expect(page.getByTestId("feature-controls")).toHaveCount(0);

  await expect(page.getByTestId("feature-option-heading").filter({ hasText: "기본" })).toBeVisible();
  await expect(page.getByTestId("feature-option-heading").filter({ hasText: "Row 잠금" })).toBeVisible();
  await expect(page.getByTestId("feature-option-heading").filter({ hasText: "Row 스타일링" })).toBeVisible();
  await expect(page.getByTestId("feature-option-heading").filter({ hasText: "이벤트 처리" })).toBeVisible();

  const basicExample = page.getByTestId("row-example-basic");
  await expect(basicExample.getByTestId("row-b")).toHaveAttribute("data-row-draggable", "false");
  await expect(basicExample.locator(".row-custom-badge")).toHaveCount(0);

  const disabledExample = page.getByTestId("row-example-disabled");
  await expect(disabledExample.getByTestId("row-row-3")).toHaveAttribute("aria-disabled", "true");
  await expect(disabledExample.getByTestId("row-row-3")).toHaveCSS("background-color", "rgb(241, 245, 249)");
  await expect(disabledExample.getByTestId("row-row-3")).toHaveCSS("color", "rgb(100, 116, 139)");

  const stylingExample = page.getByTestId("row-example-styling");
  await expect(stylingExample.getByTestId("row-a")).toHaveClass(/row-owner/u);
  await expect(stylingExample.getByTestId("row-custom-badge-a")).toHaveText("커스텀");
  await expect(stylingExample.getByTestId("cell-a-name")).toHaveCSS("background-color", "rgb(47, 15, 95)");
  await expect(stylingExample.getByTestId("cell-a-name")).toHaveCSS("color", "rgb(248, 250, 252)");
  await expect(stylingExample.getByTestId("cell-a-name")).toHaveCSS("font-weight", "900");
  await expect(stylingExample.getByTestId("cell-a-name")).toHaveCSS("border-left-color", "rgb(244, 63, 94)");
  await expect(stylingExample.getByTestId("row-custom-badge-a")).toHaveCSS("background-color", "rgb(244, 63, 94)");

  const rowStyleFingerprint = await stylingExample.getByTestId("cell-a-name").evaluate((element) => {
    const style = window.getComputedStyle(element);

    return {
      fontFamily: style.fontFamily,
      textTransform: style.textTransform,
    };
  });

  expect(rowStyleFingerprint.fontFamily).toContain("Georgia");
  expect(rowStyleFingerprint.textTransform).toBe("uppercase");

  const eventsExample = page.getByTestId("row-example-events");
  await eventsExample.getByTestId("row-a").click();
  await expect(page.getByTestId("row-event-alert")).toContainText("행 클릭");
  await expect(page.getByTestId("row-event-alert")).toContainText("a");

  await page.waitForTimeout(350);
  await eventsExample.getByTestId("row-b").dblclick();
  await expect(page.getByTestId("row-event-alert")).toContainText("행 더블클릭");
  await expect(page.getByTestId("row-event-alert")).toContainText("b");

  await eventsExample.getByTestId("row-a").click({ button: "right" });
  await expect(page.getByTestId("row-event-alert")).toContainText("행 우클릭");
  await expect(page.getByTestId("row-event-alert")).toContainText("a");

  await eventsExample.getByTestId("row-a").press("Enter");
  await expect(page.getByTestId("row-event-alert")).toContainText("행 키다운");
  await expect(page.getByTestId("row-event-alert")).toContainText("a / Enter");
});

test("style demo classes do not leak into non-styling examples", async ({ page }) => {
  await page.goto("/");
  await page.goto("/examples/crud");

  const crudOwnerCell = page.getByTestId("cell-a-role");
  await expect(crudOwnerCell).not.toHaveClass(/cell-owner/u);
  await expect(crudOwnerCell).not.toHaveCSS("background-color", "rgb(88, 28, 135)");
  await expect(crudOwnerCell).not.toHaveCSS("color", "rgb(248, 250, 252)");
  await expect(crudOwnerCell).not.toHaveCSS("border-left-color", "rgb(251, 191, 36)");

  const crudOwnerName = page.getByTestId("cell-a-name");
  await expect(page.getByTestId("row-a")).not.toHaveClass(/row-owner/u);
  await expect(crudOwnerName).not.toHaveCSS("font-family", /Georgia/u);
  await expect(crudOwnerName).not.toHaveCSS("text-transform", "uppercase");

  await page.goto("/performance/virtualization");
  await expect(page.locator(".comins-table__td.cell-owner")).toHaveCount(0);
});
