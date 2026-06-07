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

test("playground verifies 100000 row virtualization smoke", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { name: "본문" }).click();
  await page.getByRole("button", { name: "10만 행 로드" }).click();

  await expect(page.getByTestId("virtual-row-count")).toHaveText("100000");
  await expect.poll(() => page.locator("tbody tr").count()).toBeLessThan(80);
  await page.getByTestId("data-table-viewport").evaluate((element) => {
    element.scrollTop = 2400;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await expect(page.locator("tbody tr").filter({ hasText: "Row 66" }).first()).toBeVisible();

  expect(diagnostics).toEqual([]);
});

test("playground verifies 1000000 row virtualization smoke @perf", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { name: "본문" }).click();
  await page.getByRole("button", { name: "100만 행 로드" }).click();

  await expect(page.getByTestId("virtual-row-count")).toHaveText("1000000");
  await expect.poll(() => page.locator("tbody tr").count()).toBeLessThan(80);

  expect(diagnostics).toEqual([]);
});
