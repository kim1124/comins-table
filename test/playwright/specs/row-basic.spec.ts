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

test("playground verifies row drag reorder without row order persistence", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.goto("/examples/row");

  const basicExample = page.getByTestId("row-example-basic");
  const source = basicExample.getByTestId("row-drag-handle-c");
  const target = basicExample.getByTestId("row-a");
  await source.scrollIntoViewIfNeeded();
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  expect(sourceBox).not.toBeNull();
  expect(targetBox).not.toBeNull();

  await page.mouse.move(sourceBox!.x + sourceBox!.width / 2, sourceBox!.y + sourceBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox!.x + targetBox!.width / 2, targetBox!.y + targetBox!.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect(basicExample.locator(".comins-table__body-table tbody tr").first().locator("td").first()).toHaveText(
    "Data 3",
  );
  await expect(page.getByTestId("layout-order")).toHaveCount(0);

  expect(diagnostics).toEqual([]);
});

test("row drag shows a placeholder before drop", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.goto("/examples/row");

  const basicExample = page.getByTestId("row-example-basic");
  const source = basicExample.getByTestId("row-drag-handle-c");
  const target = basicExample.getByTestId("row-a");
  await source.scrollIntoViewIfNeeded();
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  expect(sourceBox).not.toBeNull();
  expect(targetBox).not.toBeNull();

  await page.mouse.move(sourceBox!.x + sourceBox!.width / 2, sourceBox!.y + sourceBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox!.x + targetBox!.width / 2, targetBox!.y + targetBox!.height / 2, { steps: 12 });
  await expect(basicExample.getByTestId("row-move-placeholder")).toBeVisible();
  await page.mouse.up();
  await expect(basicExample.getByTestId("row-move-placeholder")).toHaveCount(0);

  expect(diagnostics).toEqual([]);
});

test("rowProps draggable false disables only row dragging", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.goto("/examples/row");

  const basicExample = page.getByTestId("row-example-basic");
  await expect(basicExample.getByTestId("row-drag-handle-b")).toHaveCount(0);
  await basicExample.getByTestId("row-b").click();
  await expect(basicExample.getByTestId("row-b")).toHaveAttribute("data-selected-row", "true");

  const eventsExample = page.getByTestId("row-example-events");
  await eventsExample.getByTestId("row-b").click();
  await expect(page.getByTestId("row-event-alert")).toContainText("행 클릭");
  await expect(page.getByTestId("row-event-alert")).toContainText("b");

  expect(diagnostics).toEqual([]);
});
