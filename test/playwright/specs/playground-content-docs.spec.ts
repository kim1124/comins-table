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
  ["기본", "@kmsf/data-table 기본 예제입니다."],
  ["CRUD 동작", "추가, 수정, 삭제, 초기화, 필터링"],
  ["테이블 사이즈", "300px, 500px, 브라우저 100%"],
  ["Header 예제", "1Depth 컬럼"],
  ["대용량 데이터 표시", "대용량 데이터"],
  ["Td Cell 예제", "Td Cell 포맷"],
  ["Tr Row 예제", "Tr Row 스타일"],
  ["Context Menu 예제", "우클릭"],
] as const;

test("feature pages render Korean docs in the main content area", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");

  for (const [label, descriptionText] of featurePages) {
    await page.getByRole("button", { exact: true, name: label }).click();
    await expect(page.getByTestId("feature-option-description").first()).toContainText(descriptionText);
    await expect(page.getByTestId("feature-option-sample").first().locator(".kmsf-data-table").first()).toBeVisible();
  }

  await expect(page.getByRole("complementary", { name: "데이터 테이블 문서" })).toHaveCount(0);
  expect(diagnostics).toEqual([]);
});
