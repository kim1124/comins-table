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
  await page.getByRole("button", { exact: true, name: "행" }).click();

  await page.getByTestId("row-drag-handle-c").scrollIntoViewIfNeeded();
  await page.getByTestId("row-drag-handle-c").dragTo(page.getByTestId("row-a"));
  await expect(page.locator("tbody tr").first().locator("td").first()).toHaveText("Gamma");
  await expect(page.getByTestId("layout-order")).toHaveText("name,age,role");

  expect(diagnostics).toEqual([]);
});
