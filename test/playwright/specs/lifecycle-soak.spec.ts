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

test("playground repeatedly destroys and recreates feature content without stale mounts", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);

  await page.goto("/");

  for (let index = 0; index < 30; index += 1) {
    await page.getByRole("button", { name: "헤더" }).click();
    await page.getByRole("button", { name: "본문" }).click();
    await page.getByRole("button", { name: "셀" }).click();
    await page.getByRole("button", { exact: true, name: "기본" }).click();
  }

  await expect(page.getByTestId("feature-content")).toHaveAttribute("data-feature", "basic");
  await expect(page.getByRole("menu", { name: "데이터 테이블 컨텍스트 메뉴" })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.__kmsfDataTableLifecycle?.activeMountCount ?? 0)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.__kmsfDataTableLifecycle?.mountCount ?? 0)).toBeGreaterThan(30);
  expect(diagnostics).toEqual([]);
});
