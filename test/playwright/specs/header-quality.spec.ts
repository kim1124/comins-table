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

test("header boundary resize is isolated from long-press column move and animated sort state", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.goto("/examples/header");
  await expect(page.getByTestId("header-proof-layout")).toHaveCount(0);
  const basicExample = page.getByTestId("header-example-basic");

  await expect(basicExample.getByTestId("header-role")).toHaveAttribute("data-sortable", "false");
  await expect(basicExample.getByTestId("header-role").locator(".comins-table__header-content")).toHaveCSS(
    "justify-content",
    "center",
  );
  await expect(basicExample.getByTestId("header-name")).toHaveAttribute("data-sortable", "true");

  const firstHeaderBefore = await basicExample
    .locator(".comins-table__header-table thead th[data-comins-column-id]")
    .first()
    .textContent();
  const boundary = basicExample.getByTestId("resize-age");
  await boundary.scrollIntoViewIfNeeded();
  const boundaryBox = await boundary.boundingBox();
  expect(boundaryBox).not.toBeNull();

  await page.mouse.move(boundaryBox!.x + boundaryBox!.width / 2, boundaryBox!.y + boundaryBox!.height / 2);
  await expect(boundary).toHaveCSS("cursor", "col-resize");
  await page.mouse.down();
  await page.mouse.move(boundaryBox!.x + boundaryBox!.width / 2 + 60, boundaryBox!.y + boundaryBox!.height / 2);
  await page.mouse.up();

  await expect(basicExample.locator(".comins-table__header-table thead th[data-comins-column-id]").first()).toContainText(
    firstHeaderBefore ?? "",
  );

  const ageHeader = basicExample.getByTestId("header-age");
  await ageHeader.scrollIntoViewIfNeeded();
  await expect(ageHeader).toHaveCSS("cursor", "grab");

  const indicator = basicExample.getByTestId("sort-indicator-age");
  await expect(indicator).toHaveAttribute("data-sort-state", "none");

  await ageHeader.click();
  await expect(indicator).toHaveAttribute("data-sort-state", "asc");
  await expect(indicator).toHaveCSS("opacity", "1");
  await expect(page.getByTestId("header-proof-sort")).toHaveCount(0);

  await ageHeader.click();
  await expect(indicator).toHaveAttribute("data-sort-state", "desc");

  await ageHeader.click();
  await expect(indicator).toHaveAttribute("data-sort-state", "none");

  await ageHeader.focus();
  await page.keyboard.press("Enter");
  await expect(indicator).toHaveAttribute("data-sort-state", "asc");
  await expect(ageHeader).toHaveAttribute("aria-sort", "ascending");
  await page.keyboard.press("Space");
  await expect(indicator).toHaveAttribute("data-sort-state", "desc");
  await expect(ageHeader).toHaveAttribute("aria-sort", "descending");

  const ageBox = await ageHeader.boundingBox();
  const nameBox = await basicExample.getByTestId("header-name").boundingBox();
  expect(ageBox).not.toBeNull();
  expect(nameBox).not.toBeNull();

  await page.mouse.move(ageBox!.x + ageBox!.width / 2, ageBox!.y + ageBox!.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1100);
  await expect(ageHeader).toHaveCSS("cursor", "grabbing");
  await page.mouse.move(nameBox!.x + nameBox!.width / 2, nameBox!.y + nameBox!.height / 2);
  await page.mouse.up();

  await expect(basicExample.locator(".comins-table__header-table thead th[data-comins-column-id]").first()).toContainText("Column2");
  await expect(page.getByTestId("layout-order")).toHaveCount(0);

  const firstBodyCell = basicExample.locator(".comins-table__body-table tbody tr").first().locator("td").first();
  const firstBodyCellBox = await firstBodyCell.boundingBox();
  const rowDragHandleBox = await basicExample.locator(".comins-row-drag-handle").first().boundingBox();
  expect(firstBodyCellBox).not.toBeNull();
  expect(rowDragHandleBox).not.toBeNull();
  expect(rowDragHandleBox!.x - firstBodyCellBox!.x).toBeGreaterThanOrEqual(0);
  expect(rowDragHandleBox!.x - firstBodyCellBox!.x).toBeLessThanOrEqual(24);

  const firstHeaderAfterMove = await basicExample
    .locator(".comins-table__header-table thead th[data-comins-column-id]")
    .first()
    .textContent();
  const roleHeader = basicExample.getByTestId("header-role");
  const roleBox = await roleHeader.boundingBox();
  expect(roleBox).not.toBeNull();
  await page.mouse.move(roleBox!.x + roleBox!.width / 2, roleBox!.y + roleBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(roleBox!.x + roleBox!.width / 2 + 8, roleBox!.y + roleBox!.height / 2);
  await page.mouse.up();

  await expect(basicExample.locator(".comins-table__header-table thead th[data-comins-column-id]").first()).toContainText(
    firstHeaderAfterMove ?? "",
  );
  await expect(basicExample.getByTestId("sort-indicator-role")).toHaveAttribute("data-sort-state", "none");

  expect(diagnostics).toEqual([]);
});

test("column move shows a ghost and insertion marker while dragging", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.goto("/examples/header");

  const basicExample = page.getByTestId("header-example-basic");
  const ageHeader = basicExample.getByTestId("header-age");
  const nameHeader = basicExample.getByTestId("header-name");
  await ageHeader.scrollIntoViewIfNeeded();
  const ageBox = await ageHeader.boundingBox();
  const nameBox = await nameHeader.boundingBox();
  expect(ageBox).not.toBeNull();
  expect(nameBox).not.toBeNull();

  await page.mouse.move(ageBox!.x + ageBox!.width / 2, ageBox!.y + ageBox!.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1100);
  await page.mouse.move(nameBox!.x + nameBox!.width / 2, nameBox!.y + nameBox!.height / 2);

  await expect(page.getByTestId("column-move-ghost")).toBeVisible();
  await expect(page.getByTestId("column-move-ghost")).toContainText("Column2");
  await expect(nameHeader).toHaveAttribute("data-column-drop-target", "true");
  await expect(nameHeader.locator(".comins-column-drop-marker")).toBeVisible();

  await page.mouse.up();
  await expect(page.getByTestId("column-move-ghost")).toHaveCount(0);
  await expect(basicExample.locator(".comins-table__header-table thead th[data-comins-column-id]").first()).toContainText("Column2");

  expect(diagnostics).toEqual([]);
});

test("resize handle is hidden until boundary hover and first resize starts from measured width", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.goto("/examples/header");

  const basicExample = page.getByTestId("header-example-basic");
  const ageHeader = basicExample.getByTestId("header-age");
  const handle = basicExample.getByTestId("resize-age");
  await handle.scrollIntoViewIfNeeded();
  const beforeHeaderBox = await ageHeader.boundingBox();
  const handleBox = await handle.boundingBox();
  expect(beforeHeaderBox).not.toBeNull();
  expect(handleBox).not.toBeNull();

  await expect(handle.locator(".comins-table__resize-line")).toHaveCSS("opacity", "0");
  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
  await expect(handle.locator(".comins-table__resize-line")).toHaveCSS("opacity", "1");

  await page.mouse.down();
  await page.mouse.move(handleBox!.x + handleBox!.width / 2 + 4, handleBox!.y + handleBox!.height / 2);
  await page.mouse.up();

  const afterHeaderBox = await ageHeader.boundingBox();
  expect(afterHeaderBox).not.toBeNull();
  expect(Math.abs(afterHeaderBox!.width - beforeHeaderBox!.width)).toBeLessThan(16);

  expect(diagnostics).toEqual([]);
});
