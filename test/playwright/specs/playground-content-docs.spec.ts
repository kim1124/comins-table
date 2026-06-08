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

const featurePages = [
  ["기본", "feature-doc-basic", "적용 props"],
  ["기본 CRUD", "feature-doc-basic-crud", "실시간 data 수정"],
  ["헤더", "feature-doc-header", "정렬 접근성"],
  ["본문", "feature-doc-body", "100만 행"],
  ["셀", "feature-doc-cell", "cellSelection"],
  ["행", "feature-doc-row", "Row 이벤트"],
  ["컨텍스트 메뉴", "feature-doc-context-menu", "우클릭"],
  ["핵심 기능", "feature-doc-core", "core helper"],
  ["고급 기능", "feature-doc-advanced", "후속 기능"],
] as const;

test("feature pages render Korean docs in the main content area", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");

  for (const [label, testId, text] of featurePages) {
    await page.getByRole("button", { exact: true, name: label }).click();
    await expect(page.getByTestId(testId)).toBeVisible();
    await expect(page.getByTestId(testId)).toContainText(text);
  }

  await expect(page.getByRole("complementary", { name: "데이터 테이블 문서" })).toHaveCount(0);
  expect(diagnostics).toEqual([]);
});
