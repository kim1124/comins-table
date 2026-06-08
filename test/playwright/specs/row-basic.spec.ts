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
  await page.getByRole("button", { exact: true, name: "Tr Row 예제" }).click();

  const sourceBox = await page.getByTestId("row-drag-handle-c").boundingBox();
  const targetBox = await page.getByTestId("row-a").boundingBox();
  expect(sourceBox).not.toBeNull();
  expect(targetBox).not.toBeNull();

  await page.mouse.move(sourceBox!.x + 4, sourceBox!.y + 4);
  await page.mouse.down();
  await page.mouse.move(targetBox!.x + 12, targetBox!.y + 8, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator(".kmsf-data-table__body-table tbody tr").first().locator("td").first()).toHaveText("Gamma");
  await expect(page.getByTestId("layout-order")).toHaveText("name,age,role");

  expect(diagnostics).toEqual([]);
});

test("row drag shows a placeholder before drop", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "Tr Row 예제" }).click();

  const sourceBox = await page.getByTestId("row-drag-handle-c").boundingBox();
  const targetBox = await page.getByTestId("row-a").boundingBox();
  expect(sourceBox).not.toBeNull();
  expect(targetBox).not.toBeNull();

  await page.mouse.move(sourceBox!.x + 4, sourceBox!.y + 4);
  await page.mouse.down();
  await page.mouse.move(targetBox!.x + 12, targetBox!.y + 8, { steps: 8 });
  await expect(page.getByTestId("row-move-placeholder")).toBeVisible();
  await page.mouse.up();
  await expect(page.getByTestId("row-move-placeholder")).toHaveCount(0);

  expect(diagnostics).toEqual([]);
});

test("rowProps draggable false disables only row dragging", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "Tr Row 예제" }).click();

  await expect(page.getByTestId("row-drag-handle-b")).toHaveCount(0);
  await page.getByTestId("row-b").click();
  await expect(page.getByTestId("row-b")).toHaveAttribute("data-selected-row", "true");
  await expect(page.getByTestId("event-log")).toContainText("행 클릭:b");

  expect(diagnostics).toEqual([]);
});
