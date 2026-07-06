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
  { feature: "basic", label: "기본", route: "/docs/getting-started" },
  { feature: "basic-crud", label: "CRUD 동작", route: "/examples/crud" },
  { feature: "size", label: "테이블 사이즈", route: "/examples/size" },
  { feature: "theme", label: "Theme", route: "/examples/theme" },
  { feature: "loading", label: "Loading / Empty State", route: "/examples/loading" },
  { feature: "header", label: "Header 예제", route: "/examples/header" },
  { feature: "column-groups", label: "Header 그룹", route: "/examples/column-groups" },
  { feature: "pagination", label: "Pagination", route: "/performance/pagination" },
  { feature: "infinite-scroll", label: "Infinite Scroll", route: "/performance/infinite-scroll" },
  { feature: "lazy-load", label: "Lazy Load", route: "/performance/lazy-load" },
  { feature: "body", label: "대용량 데이터 표시", route: "/performance/virtualization" },
  { feature: "cell", label: "Td Cell 예제", route: "/examples/cell" },
  { feature: "component", label: "컴포넌트 예제", route: "/examples/component" },
  { feature: "row", label: "Tr Row 예제", route: "/examples/row" },
  { feature: "context-menu", label: "Context Menu 예제", route: "/examples/context-menu" },
  { feature: "export", label: "Export Helper", route: "/examples/export" },
];

test("user playground exposes every current feature page with recreated content", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/examples/crud");

  const firstMountId = await page.getByTestId("mount-id").textContent();
  await page.getByRole("link", { exact: true, name: "Getting Started" }).click();
  await expect(page.getByTestId("mount-id")).not.toHaveText(firstMountId ?? "");
  await expect.poll(() => page.evaluate(() => window.__kmsfDataTableLastUnmount)).toBe(firstMountId);

  for (const item of featurePages) {
    await page.goto(item.route);
    const content = page.getByTestId("feature-content");
    await expect(content).toHaveAttribute("data-feature", item.feature);
    await expect(content).toHaveAttribute("data-feature-label", item.label);
    await expect(page.getByTestId("feature-option-container").first()).toBeVisible();
    await expect(page.getByTestId("feature-option-description").first()).toBeVisible();
    if (item.feature === "size") {
      await expect(page.getByTestId("data-table-size-manual")).toBeVisible();
    } else {
      await expect(page.locator(".kmsf-data-table").first()).toBeVisible();
    }
  }

  await page.goto("/examples/header");
  const headerMountId = await page.getByTestId("mount-id").textContent();
  await page.getByRole("link", { exact: true, name: "CRUD 동작" }).click();
  await expect.poll(() => page.evaluate(() => window.__kmsfDataTableLastUnmount)).toBe(headerMountId);

  expect(diagnostics).toEqual([]);
});

test("user playground uses charts-style docs shell and shadcn-style action buttons", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");

  await expect(page.locator(".docs-shell")).toBeVisible();
  await expect(page.locator(".docs-top-nav")).toContainText("@kmsf/data-table");
  await expect(page.locator(".workspace-tabs")).toHaveCount(0);
  await expect(page.locator(".workspace-tabs__bar")).toHaveCount(0);
  await expect(page.getByRole("tablist", { name: "플레이그라운드 보기" })).toHaveCount(0);
  await expect(page.getByRole("searchbox", { name: "전체 문서 검색" })).toBeVisible();
  await expect(page.getByRole("link", { exact: true, name: "문서" })).toHaveCount(0);
  await expect(page.locator(".docs-shell__body")).toBeVisible();
  await expect(page.locator(".docs-sidebar")).toBeVisible();
  await expect(page.getByRole("complementary", { name: "데이터 테이블 문서" })).toHaveCount(0);

  await page.goto("/examples/crud");
  await expect(page.locator(".feature-controls button:not(.ui-button)")).toHaveCount(0);

  expect(diagnostics).toEqual([]);
});

test("basic crud page demonstrates row updates and filter summary without pagination controls", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.goto("/examples/crud");

  await expect(page.getByTestId("crud-row-summary")).toHaveCount(0);
  await expect(page.getByTestId("pagination-state")).toHaveCount(0);
  await expect(page.getByTestId("selected-row-state")).toHaveCount(0);

  await page.getByRole("button", { exact: true, name: "추가" }).click();
  await expect(page.getByTestId("row-new-1")).toBeVisible();

  await page.getByTestId("row-b").click();
  await page.getByLabel("선택 행 JSON").fill('{"id":"b","name":"Data 2","age":43,"role":"Editor","active":true}');
  await page.getByRole("button", { exact: true, name: "수정" }).click();
  await expect(page.getByTestId("cell-b-name")).toContainText("Data 2");

  await page.getByRole("button", { exact: true, name: "삭제" }).click();
  await expect(page.getByTestId("row-b")).toHaveCount(0);

  await page.getByRole("button", { exact: true, name: "필터링" }).click();
  await expect(page.getByTestId("row-row-3")).toHaveCount(0);

  await expect(page.getByRole("button", { exact: true, name: "다음" })).toHaveCount(0);
  await expect(page.getByTestId("crud-pagination")).toHaveCount(0);

  expect(diagnostics).toEqual([]);
});

test("option guide documents core helpers and ref methods", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/api/props");

  await expect(page.locator(".docs-reference-list")).toContainText("setSelectedRow");
  await expect(page.locator(".docs-reference-list")).toContainText("setMoveTargetRow");
  await expect(page.locator(".docs-reference-list")).toContainText("core helper");
  await expect(page.locator(".docs-reference-list")).toContainText("data + onChangeData");
  await expect(page.locator(".docs-reference-list")).toContainText("CSR");
  await expect(page.locator(".docs-reference-list")).not.toContainText("후속 기능");
  await expect(page.locator(".docs-reference-list")).not.toContainText("Visual Fill Handle UI");

  expect(diagnostics).toEqual([]);
});
