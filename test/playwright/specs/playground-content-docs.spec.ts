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
  ["/docs/getting-started", "comins-table 기본 예제입니다."],
  ["/examples/crud", "추가, 수정, 삭제, 초기화, 필터링"],
  ["/examples/size", "300px 고정 높이와 부모 컨테이너 500px"],
  ["/examples/theme", "CSS 변수와 theme class"],
  ["/examples/header", "1Depth 컬럼"],
  ["/examples/column-groups", "2Depth Header"],
  ["/performance/infinite-scroll", "viewport 하단 근접"],
  ["/performance/lazy-load", "append-mode public API"],
  ["/performance/virtualization", "대용량 데이터"],
  ["/examples/cell", "Td Cell 포맷"],
  ["/examples/row", "Tr Row 스타일"],
  ["/examples/summary-row", "count, sum, avg, max, min"],
  ["/examples/tree-grid", "3개 Department, 9개 Team, 18개 Member"],
  ["/examples/context-menu", "우클릭"],
] as const;

test("feature pages render docs in the main content area", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");

  for (const [route, descriptionText] of featurePages) {
    await page.goto(route);
    await expect(page.getByTestId("feature-option-description").first()).toContainText(descriptionText);
    await expect(page.getByTestId("feature-option-sample").first().locator(".comins-table").first()).toBeVisible();
  }

  await expect(page.getByRole("complementary", { name: "Data table docs" })).toHaveCount(0);
  expect(diagnostics).toEqual([]);
});

test("virtualization page explains the 100000-row performance contract", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/performance/virtualization");

  const main = page.locator("main");
  await expect(main).toContainText("100000");
  await expect(main).toContainText("Chrome DevTools Performance Monitor");
  await expect(main).toContainText("DOM Node");
  await expect(main).toContainText("JS heap");
  await expect(main).toContainText("rowHeight");
  await expect(main).toContainText("buffer-size");

  expect(diagnostics).toEqual([]);
});

test("ref api page documents ref type and visible-index semantics", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/api/ref");

  const main = page.locator("main");
  await expect(main).toContainText("CominsTableRef<TData>");
  await expect(main).toContainText("getColumnLayout");
  await expect(main).toContainText("setColumnLayout");
  await expect(main).toContainText("setSelectedRow");
  await expect(main).toContainText("setMoveTargetRow");
  await expect(main).toContainText("expand");
  await expect(main).toContainText("fold");
  await expect(main).toContainText("visible index");
  await expect(main).not.toContainText("DataTableProps<T>");

  expect(diagnostics).toEqual([]);
});
