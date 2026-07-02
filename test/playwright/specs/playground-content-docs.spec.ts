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
  ["/docs/getting-started", "@kmsf/data-table 기본 예제입니다."],
  ["/examples/crud", "추가, 수정, 삭제, 초기화, 필터링"],
  ["/examples/size", "300px 고정 높이와 부모 컨테이너 500px"],
  ["/examples/theme", "CSS 변수와 theme class"],
  ["/examples/header", "1Depth 컬럼"],
  ["/examples/column-groups", "2Depth Header"],
  ["/performance/virtualization", "대용량 데이터"],
  ["/examples/cell", "Td Cell 포맷"],
  ["/examples/row", "Tr Row 스타일"],
  ["/examples/context-menu", "우클릭"],
] as const;

test("feature pages render Korean docs in the main content area", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");

  for (const [route, descriptionText] of featurePages) {
    await page.goto(route);
    await expect(page.getByTestId("feature-option-description").first()).toContainText(descriptionText);
    await expect(page.getByTestId("feature-option-sample").first().locator(".kmsf-data-table").first()).toBeVisible();
  }

  await expect(page.getByRole("complementary", { name: "데이터 테이블 문서" })).toHaveCount(0);
  expect(diagnostics).toEqual([]);
});
