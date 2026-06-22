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
  { feature: "basic-crud", label: "CRUD 동작" },
  { feature: "size", label: "테이블 사이즈" },
  { feature: "header", label: "Header 예제" },
  { feature: "body", label: "대용량 데이터 표시" },
  { feature: "cell", label: "Td Cell 예제" },
  { feature: "row", label: "Tr Row 예제" },
  { feature: "context-menu", label: "Context Menu 예제" },
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
    await expect(page.getByTestId("feature-option-container").first()).toBeVisible();
    await expect(page.getByTestId("feature-option-description").first()).toBeVisible();
    if (item.feature === "size") {
      await expect(page.getByTestId("data-table-size-manual")).toBeVisible();
    } else {
      await expect(page.locator(".kmsf-data-table").first()).toBeVisible();
    }
  }

  await page.getByRole("button", { exact: true, name: "Header 예제" }).click();
  const headerMountId = await page.getByTestId("mount-id").textContent();
  await page.getByRole("button", { exact: true, name: "CRUD 동작" }).click();
  await expect.poll(() => page.evaluate(() => window.__kmsfDataTableLastUnmount)).toBe(headerMountId);

  expect(diagnostics).toEqual([]);
});

test("user playground uses charts-style docs shell and shadcn-style action buttons", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");

  await expect(page.locator(".example-shell")).toBeVisible();
  await expect(page.locator(".example-topbar")).toContainText("@kmsf/data-table");
  await expect(page.locator(".workspace-tabs")).toBeVisible();
  await expect(page.locator(".workspace-tabs__bar")).toHaveCount(0);
  await expect(page.locator(".example-topbar").getByRole("tablist", { name: "플레이그라운드 보기" })).toBeVisible();
  await expect(page.locator(".docs-layout")).toBeVisible();
  await expect(page.locator(".feature-aside")).toBeVisible();
  await expect(page.getByRole("complementary", { name: "데이터 테이블 문서" })).toHaveCount(0);

  await page.getByRole("button", { exact: true, name: "CRUD 동작" }).click();
  await expect(page.locator(".feature-controls button:not(.ui-button)")).toHaveCount(0);

  expect(diagnostics).toEqual([]);
});

test("basic crud page demonstrates row updates filter summary and pagination", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "CRUD 동작" }).click();

  await expect(page.getByTestId("crud-row-summary")).toHaveCount(0);
  await expect(page.getByTestId("pagination-state")).toHaveCount(0);
  await expect(page.getByTestId("selected-row-state")).toHaveCount(0);

  await page.getByRole("button", { exact: true, name: "추가" }).click();
  await expect(page.getByTestId("row-new-1")).toBeVisible();

  await page.getByTestId("row-b").click();
  await page.getByLabel("선택 행 JSON").fill('{"id":"b","name":"Beta","age":43,"role":"Editor","active":true}');
  await page.getByRole("button", { exact: true, name: "수정" }).click();
  await expect(page.getByTestId("cell-b-age")).toContainText("43");

  await page.getByRole("button", { exact: true, name: "삭제" }).click();
  await expect(page.getByTestId("row-b")).toHaveCount(0);

  await page.getByRole("button", { exact: true, name: "필터링" }).click();
  await expect(page.getByTestId("row-row-3")).toHaveCount(0);

  await page.getByRole("button", { exact: true, name: "다음" }).click();
  await expect(page.getByTestId("crud-pagination")).toContainText("2 /");

  expect(diagnostics).toEqual([]);
});

test("option guide documents core helpers and ref methods", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.locator(".example-topbar").getByRole("tab", { exact: true, name: "옵션 가이드" }).click();

  await expect(page.getByTestId("option-guide")).toContainText("setSelectedRow");
  await expect(page.getByTestId("option-guide")).toContainText("setMoveTargetRow");
  await expect(page.getByTestId("option-guide")).toContainText("core helper");
  await expect(page.getByTestId("option-guide")).toContainText("후속 기능");
  await expect(page.getByTestId("option-guide")).toContainText("data + onChangeData");
  await expect(page.getByTestId("option-guide")).toContainText("CSR");
  await expect(page.getByTestId("option-guide")).toContainText("Visual Fill Handle UI");

  expect(diagnostics).toEqual([]);
});
