import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";

const primaryModifier = process.platform === "darwin" ? "Meta" : "Control";

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

test("row clicks expose controlled single, toggle, and range selection state", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/examples/selection-clipboard");

  await expect(page.locator("h1", { hasText: "선택과 Clipboard" })).toBeVisible();
  await expect(
    page.getByTestId("selection-clipboard-viewport").locator("tbody tr[data-comins-row-data-index]"),
  ).toHaveCount(30);
  await page.getByTestId("row-b").click();
  await expect(page.getByTestId("row-b")).toHaveAttribute("data-selected-row", "true");
  await expect(page.getByTestId("selection-state")).toContainText('"b"');

  await page.getByTestId("row-a").click({ modifiers: [primaryModifier] });
  await expect(page.getByTestId("row-a")).toHaveAttribute("data-selected-row", "true");
  await expect(page.getByTestId("row-b")).toHaveAttribute("data-selected-row", "true");

  await page.getByTestId("row-c").click({ modifiers: ["Shift"] });
  for (const rowId of ["a", "b", "c"]) {
    await expect(page.getByTestId(`row-${rowId}`)).toHaveAttribute("data-selected-row", "true");
    await expect(page.getByTestId("selection-state")).toContainText(`"${rowId}"`);
  }

  expect(diagnostics).toEqual([]);
});

test("cell pointer drag creates a range without reordering controlled rows", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/examples/selection-clipboard");

  const rows = page.getByTestId("selection-clipboard-viewport").locator("tbody tr[data-comins-row-data-index]");
  await expect(page.locator("h1", { hasText: "선택과 Clipboard" })).toBeVisible();
  await expect(rows).toHaveCount(30);
  const before = await rows.evaluateAll((elements) => elements.map((element) => element.getAttribute("data-testid")));

  const anchorCell = page.getByTestId("cell-a-name");
  const focusCell = page.getByTestId("cell-b-age");

  await anchorCell.scrollIntoViewIfNeeded();
  const anchorBox = await anchorCell.boundingBox();
  const focusBox = await focusCell.boundingBox();

  expect(anchorBox).not.toBeNull();
  expect(focusBox).not.toBeNull();

  await page.mouse.move(anchorBox!.x + anchorBox!.width / 2, anchorBox!.y + anchorBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(focusBox!.x + focusBox!.width / 2, focusBox!.y + focusBox!.height / 2, { steps: 4 });
  await expect(focusCell).toHaveAttribute("data-range-selected", "true");
  await page.mouse.up();

  await expect(anchorCell).toHaveAttribute("data-range-selected", "true");
  await expect(focusCell).toHaveAttribute("data-range-selected", "true");
  await expect(page.getByTestId("selection-state")).toContainText('"range"');
  const after = await rows.evaluateAll((elements) => elements.map((element) => element.getAttribute("data-testid")));
  expect(after).toEqual(before);
  expect(diagnostics).toEqual([]);
});

test("keyboard paste updates controlled data and preserves guarded columns", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/examples/selection-clipboard");

  await page.getByTestId("cell-a-name").focus();
  await page.keyboard.press(`${primaryModifier}+C`);
  await page.getByTestId("cell-b-name").focus();
  await page.keyboard.press(`${primaryModifier}+V`);
  await expect(page.getByTestId("cell-b-name")).toHaveText("Data 1");

  await page.getByTestId("cell-a-name").focus();
  await page.keyboard.press(`${primaryModifier}+C`);
  await page.getByTestId("cell-b-locked").focus();
  await page.keyboard.press(`${primaryModifier}+V`);
  await expect(page.getByTestId("cell-b-locked")).toHaveText("Data 2");

  await page.getByRole("button", { exact: true, name: "예제 초기화" }).click();
  await expect(page.getByTestId("cell-b-name")).toHaveText("Data 2");
  await expect(page.getByTestId("selection-state")).toContainText('"rowIds": []');
  await expect(page.getByTestId("row-b")).not.toHaveAttribute("data-selected-row", "true");
  expect(diagnostics).toEqual([]);
});
