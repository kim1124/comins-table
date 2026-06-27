import { expect, test } from "@playwright/test";

test("cell page demonstrates formatting styling and events", async ({ page }) => {
  await page.setViewportSize({ height: 720, width: 640 });
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "Td Cell 예제" }).click();

  await expect(page.getByTestId("feature-option-description").first()).toContainText("Td Cell 포맷");
  await expect(page.getByTestId("feature-option-description").first()).toContainText("onClickCell");
  await expect(page.getByTestId("feature-options")).toHaveCount(0);
  await expect(page.getByTestId("feature-controls")).toHaveCount(0);
  await expect(page.getByTestId("cell-selection-state")).toHaveCount(0);
  await expect(page.locator(".kmsf-data-table__component")).toHaveCount(0);
  await expect(page.locator(".kmsf-data-table__header-table th")).toHaveCount(6);
  await expect(page.getByTestId("cell-b-age")).toHaveText("42 years");
  await expect(page.getByTestId("cell-a-style")).toHaveClass(/cell-owner/u);
  await expect(page.getByTestId("cell-renderer-a")).toContainText("renderer:");

  const geometry = await page.getByTestId("data-table-viewport").evaluate((viewport) => {
    const headers = Array.from(document.querySelectorAll<HTMLElement>(".kmsf-data-table__header-table th"));

    return {
      hasHorizontalOverflow: viewport.getAttribute("data-horizontal-overflow"),
      widths: headers.map((header) => Math.round(header.getBoundingClientRect().width)),
    };
  });

  expect(geometry.hasHorizontalOverflow).toBe("true");
  for (const width of geometry.widths) {
    expect(width).toBeGreaterThanOrEqual(98);
    expect(width).toBeLessThanOrEqual(102);
  }

  await page.getByTestId("cell-a-name").click();
  await expect(page.getByTestId("cell-event-log")).toContainText("셀 클릭:a:name");

  await page.getByTestId("cell-b-locked").click();
  await expect(page.getByTestId("cell-event-log")).toContainText("차단된 셀:b:locked");

  await page.getByTestId("cell-b-name").dblclick();
  await expect(page.getByTestId("cell-event-log")).toContainText("셀 더블클릭:b:name");

  await page.getByTestId("cell-c-name").click({ button: "right" });
  await expect(page.getByTestId("cell-event-log")).toContainText("셀 컨텍스트:c:name");

  await page.getByTestId("cell-a-name").press("Enter");
  await expect(page.getByTestId("cell-event-log")).toContainText("셀 키다운:a:name:Enter");
});

test("cell page columns start at 100px and remain resizable", async ({ page }) => {
  await page.setViewportSize({ height: 720, width: 640 });
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "Td Cell 예제" }).click();

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

test("cell page column resize clamps at the global 50px minimum", async ({ page }) => {
  await page.setViewportSize({ height: 720, width: 640 });
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "Td Cell 예제" }).click();

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
  expect(after!.width).toBeGreaterThanOrEqual(49);
  expect(after!.width).toBeLessThanOrEqual(54);

  const cellMetrics = await page.getByTestId("cell-a-name").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const value = element.querySelector<HTMLElement>(".kmsf-data-table__cell-value");

    return {
      cellRight: rect.right,
      valueRight: value?.getBoundingClientRect().right ?? 0,
    };
  });

  expect(cellMetrics.valueRight).toBeLessThanOrEqual(cellMetrics.cellRight + 1);
});

test("row page demonstrates styling and events", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "Tr Row 예제" }).click();

  await expect(page.getByTestId("feature-option-description").first()).toContainText("드래그 이동");
  await expect(page.getByTestId("feature-option-description").first()).toContainText("rowProps");
  await expect(page.getByTestId("feature-controls")).toHaveCount(0);
  await expect(page.getByTestId("row-a")).toHaveClass(/row-owner/u);
  await expect(page.getByTestId("row-b")).toHaveAttribute("data-row-draggable", "false");
  await expect(page.getByTestId("row-row-3")).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByTestId("row-row-3")).toHaveCSS("background-color", "rgb(241, 245, 249)");
  await expect(page.getByTestId("row-custom-badge-a")).toHaveText("커스텀");

  await page.getByTestId("row-a").click();
  await expect(page.getByTestId("event-log")).toContainText("행 클릭:a");

  await page.waitForTimeout(350);
  await page.getByTestId("row-b").dblclick();
  await expect(page.getByTestId("event-log")).toContainText("행 더블클릭:b");

  await page.getByTestId("row-a").click({ button: "right" });
  await expect(page.getByTestId("event-log")).toContainText("행 컨텍스트:a");

  await page.getByTestId("row-a").press("Enter");
  await expect(page.getByTestId("event-log")).toContainText("행 키다운:a:Enter");
});
