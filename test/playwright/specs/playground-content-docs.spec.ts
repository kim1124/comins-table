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
  ["기본", "@kmsf/data-table 기본 예제", "columns"],
  ["CRUD 동작", "추가, 수정, 삭제", "pagination"],
  ["테이블 사이즈", "부모 크기와 브라우저 리사이즈", "responsive height"],
  ["Header 예제", "Header 포맷", "getColumnLayout"],
  ["대용량 데이터 표시", "대용량 데이터", "virtualized"],
  ["Td Cell 예제", "Td Cell 포맷", "onClickCell"],
  ["Tr Row 예제", "Tr Row 스타일", "setMoveTargetRow"],
  ["Context Menu 예제", "우클릭", "onContextMenuRow"],
] as const;

test("feature pages render Korean docs in the main content area", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");

  for (const [label, descriptionText, optionText] of featurePages) {
    await page.getByRole("button", { exact: true, name: label }).click();
    await expect(page.getByTestId("feature-intro-description")).toContainText(descriptionText);
    await expect(page.getByTestId("feature-option-table")).toContainText(optionText);
  }

  await expect(page.getByRole("complementary", { name: "데이터 테이블 문서" })).toHaveCount(0);
  expect(diagnostics).toEqual([]);
});
