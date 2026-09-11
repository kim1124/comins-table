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

test("five selected rows remain available while three cells are copied by keyboard and context menu", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/performance/lazy-load");
  await page.getByRole("link", { name: "Selection & Clipboard", exact: true }).click();
  await page.getByRole("button", { name: "Row 5개 선택", exact: true }).click();
  await page.getByTestId("cell-a-name").click();
  await page.evaluate(() => navigator.clipboard.writeText("stale clipboard sentinel"));
  await page.getByTestId("cell-c-name").click({ modifiers: ["Shift"] });
  // No toolbar/context-menu clicks or programmatic focus between selection and copy.
  await page.keyboard.press(`${primaryModifier}+C`);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("Data 1\nData 2\nData 3");
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe("");
  await expect(page.getByTestId("cell-c-name")).toBeFocused();
  await page.getByRole("button", { name: "선택 데이터 조회", exact: true }).click();
  const read = JSON.parse(await page.getByTestId("selection-read-result").innerText());
  expect(read.rows).toHaveLength(5); expect(read.cells).toHaveLength(3);
  await page.getByTestId("cell-b-name").click({ button: "right" });
  await page.getByRole("menuitem", { name: "선택 복사", exact: true }).click();
  await expect(page.getByTestId("selection-copy-result")).toHaveText("Data 1\nData 2\nData 3");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("Data 1\nData 2\nData 3");
  await page.evaluate(() => navigator.clipboard.writeText("keyboard must replace this sentinel"));
  await page.getByTestId("cell-a-name").focus();
  await page.keyboard.press(`${primaryModifier}+C`);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("Data 1\nData 2\nData 3");
  await page.getByTestId("cell-a-name").click();
  await page.keyboard.press(`${primaryModifier}+C`);
  expect((await page.evaluate(() => navigator.clipboard.readText())).split("\n")).toHaveLength(5);
  for (const id of ["a", "b", "c", "row-3", "row-4"]) await expect(page.getByTestId(`row-${id}`)).toHaveAttribute("data-selected-row", "true");
});

test("Shift selection takes ownership from existing document text selection", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/examples/selection-clipboard");
  await page.getByRole("button", { name: "Row 5개 선택", exact: true }).click();
  await page.getByTestId("cell-a-name").click();
  // A real text-selection gesture outside the table leaves a browser selection
  // independent of the table's Cell anchor.
  await page.getByRole("heading", { level: 1 }).click({ clickCount: 3 });
  expect(await page.evaluate(() => window.getSelection()?.toString())).toContain("선택과 Clipboard");
  await page.evaluate(() => navigator.clipboard.writeText("stale clipboard sentinel"));
  await page.keyboard.down("Shift");
  await page.getByTestId("cell-c-name").click();
  await page.keyboard.up("Shift");
  await page.keyboard.press(`${primaryModifier}+C`);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("Data 1\nData 2\nData 3");
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe("");
});

test("Shift copy replaces the previous internal buffer before keyboard paste", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/examples/selection-clipboard");
  await page.getByTestId("cell-a-age").click();
  await page.keyboard.press(`${primaryModifier}+C`);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("31");

  await page.getByTestId("cell-a-name").click();
  await page.getByRole("heading", { level: 1 }).click({ clickCount: 3 });
  await page.getByTestId("cell-c-name").click({ modifiers: ["Shift"] });
  await page.keyboard.press(`${primaryModifier}+C`);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("Data 1\nData 2\nData 3");
  await page.getByTestId("cell-row-3-name").click();
  await page.keyboard.press(`${primaryModifier}+V`);
  await expect(page.getByTestId("cell-row-3-name")).toHaveText("Data 1");
  await expect(page.getByTestId("cell-row-4-name")).toHaveText("Data 2");
  await expect(page.getByTestId("cell-row-5-name")).toHaveText("Data 3");
  await expect(page.getByTestId("cell-row-3-age")).toHaveText("3");
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
  await expect(anchorCell).toBeFocused();
  await page.keyboard.press(`${primaryModifier}+C`);
  await page.getByTestId("cell-c-name").click();
  await expect(page.getByTestId("cell-c-name")).toBeFocused();
  await page.keyboard.press(`${primaryModifier}+V`);
  await expect(page.getByTestId("cell-c-name")).toHaveText("Data 1");
  await expect(page.getByTestId("cell-row-3-name")).toHaveText("Data 2");
  await expect(page.getByTestId("cell-c-age")).toHaveText("31");
  await expect(page.getByTestId("cell-row-3-age")).toHaveText("42");
  expect(diagnostics).toEqual([]);
});

test("mouse-selected cells receive keyboard paste and preserve guarded columns", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/examples/selection-clipboard");

  await page.getByTestId("cell-a-name").click();
  await expect(page.getByTestId("cell-a-name")).toBeFocused();
  await page.keyboard.press(`${primaryModifier}+C`);
  await page.getByTestId("cell-b-name").click();
  await expect(page.getByTestId("cell-b-name")).toBeFocused();
  await page.keyboard.press(`${primaryModifier}+V`);
  await expect(page.getByTestId("cell-b-name")).toHaveText("Data 1");

  await page.getByTestId("cell-a-name").click();
  await expect(page.getByTestId("cell-a-name")).toBeFocused();
  await page.keyboard.press(`${primaryModifier}+C`);
  await page.getByTestId("cell-b-locked").click();
  await page.keyboard.press(`${primaryModifier}+V`);
  await expect(page.getByTestId("cell-b-locked")).toHaveText("Data 2");

  await page.getByRole("button", { exact: true, name: "예제 초기화" }).click();
  await expect(page.getByTestId("cell-b-name")).toHaveText("Data 2");
  await expect(page.getByTestId("selection-state")).toContainText('"rowIds": []');
  await expect(page.getByTestId("row-b")).not.toHaveAttribute("data-selected-row", "true");
  expect(diagnostics).toEqual([]);
});


test("ordinary cell clicks preserve native renderer button focus", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/examples/cell");
  const cell = page.getByTestId("cell-a-name");
  await cell.click();
  await expect(cell).toBeFocused();
  const button = page.getByTestId("cell-renderer-a").getByRole("button");
  await button.click();
  await expect(button).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByTestId("cell-a-locked")).toBeFocused();
  expect(diagnostics).toEqual([]);
});
