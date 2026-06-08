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
  { feature: "basic", label: "기본" },
  { feature: "basic-crud", label: "기본 CRUD" },
  { feature: "header", label: "헤더" },
  { feature: "body", label: "본문" },
  { feature: "cell", label: "셀" },
  { feature: "row", label: "행" },
  { feature: "context-menu", label: "컨텍스트 메뉴" },
  { feature: "core", label: "핵심 기능" },
  { feature: "advanced", label: "고급 기능" },
];

test("user playground exposes every current feature page with recreated content", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");

  const firstMountId = await page.getByTestId("mount-id").textContent();
  await page.getByRole("button", { exact: true, name: "기본" }).click();
  await expect(page.getByTestId("mount-id")).toHaveText(firstMountId ?? "");

  for (const item of featurePages) {
    await page.getByRole("button", { exact: true, name: item.label }).click();
    const content = page.getByRole("main", { name: "데이터 테이블 예제" });
    await expect(content).toHaveAttribute("data-feature", item.feature);
    await expect(content).toHaveAttribute("data-feature-label", item.label);
    await expect(page.getByTestId("feature-summary")).toBeVisible();
    await expect(page.getByTestId("data-table-viewport")).toBeVisible();
  }

  await page.getByRole("button", { exact: true, name: "헤더" }).click();
  const headerMountId = await page.getByTestId("mount-id").textContent();
  await page.getByRole("button", { exact: true, name: "기본 CRUD" }).click();
  await expect.poll(() => page.evaluate(() => window.__kmsfDataTableLastUnmount)).toBe(headerMountId);

  expect(diagnostics).toEqual([]);
});

test("user playground uses charts-style docs shell and shadcn-style action buttons", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");

  await expect(page.locator(".example-shell")).toBeVisible();
  await expect(page.locator(".example-topbar")).toContainText("@kmsf/data-table");
  await expect(page.locator(".workspace-tabs")).toBeVisible();
  await expect(page.locator(".docs-layout")).toBeVisible();
  await expect(page.locator(".feature-aside")).toBeVisible();
  await expect(page.getByRole("complementary", { name: "데이터 테이블 문서" })).toHaveCount(0);

  await page.getByRole("button", { exact: true, name: "기본 CRUD" }).click();
  await expect(page.locator(".feature-controls button:not(.ui-button)")).toHaveCount(0);

  expect(diagnostics).toEqual([]);
});

test("basic crud page demonstrates row updates query and pagination", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "기본 CRUD" }).click();

  await page.getByRole("button", { name: "행 추가" }).click();
  await expect(page.getByTestId("row-new-1")).toBeVisible();

  await page.getByTestId("row-b").click();
  await page.getByLabel("선택 행 JSON").fill('{"id":"b","name":"Beta","age":43,"role":"Editor","active":true}');
  await page.getByRole("button", { name: "선택 행 수정" }).click();
  await expect(page.getByTestId("cell-b-age")).toContainText("43");

  await page.getByRole("button", { name: "선택 행 삭제" }).click();
  await expect(page.getByTestId("row-b")).toHaveCount(0);

  await page.getByRole("button", { name: "소유자만 보기" }).click();
  await expect(page.getByTestId("query-result")).toContainText("Owner");

  await page.getByRole("button", { name: "다음 페이지" }).click();
  await expect(page.getByTestId("pagination-state")).toContainText("pageIndex:1");

  expect(diagnostics).toEqual([]);
});

test("core page demonstrates selection and serialized layout helpers", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "핵심 기능" }).click();

  await page.getByRole("button", { exact: true, name: "Alpha 선택" }).click();
  await expect(page.getByTestId("selection-state")).toContainText("a");

  await page.getByRole("button", { name: "Alpha 이름 셀 선택" }).click();
  await expect(page.getByTestId("selection-state")).toContainText("name");

  await page.getByRole("button", { name: "레이아웃 직렬화" }).click();
  await expect(page.getByTestId("core-state-json")).toContainText("order");

  await page.getByRole("button", { name: "선택 초기화" }).click();
  await expect(page.getByTestId("selection-state")).toContainText("rowIds:[]");

  expect(diagnostics).toEqual([]);
});

test("advanced page separates unavailable future capabilities", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "고급 기능" }).click();

  const unavailable = page.getByTestId("advanced-unavailable");
  await expect(unavailable).toContainText("외부 store adapter");
  await expect(unavailable).toContainText("범위 선택 고도화");
  await expect(unavailable).toContainText("fill handle");
  await expect(unavailable).toContainText("multi-cell clipboard");
  await expect(unavailable).toContainText("server-side row model");
  await expect(page.getByRole("button", { name: /외부 store 활성화/u })).toHaveCount(0);

  expect(diagnostics).toEqual([]);
});
