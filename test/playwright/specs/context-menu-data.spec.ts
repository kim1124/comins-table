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

test("row and cell context examples show selected data objects", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");

  await page.getByRole("button", { exact: true, name: "컨텍스트 메뉴" }).click();
  await page.getByTestId("row-a").click({ button: "right" });
  await expect(page.getByRole("menuitem", { name: "행 데이터 보기" })).toBeVisible();
  await expect(page.getByTestId("context-data-preview")).toContainText('"id": "a"');
  await expect(page.getByTestId("context-data-preview")).toContainText('"name": "Alpha"');

  await page.getByTestId("cell-a-name").click({ button: "right" });
  await expect(page.getByRole("menuitem", { name: "셀 데이터 보기" })).toBeVisible();
  await expect(page.getByTestId("context-data-preview")).toContainText('"columnId": "name"');
  await expect(page.getByTestId("context-data-preview")).toContainText('"value": "Alpha"');

  expect(diagnostics).toEqual([]);
});
