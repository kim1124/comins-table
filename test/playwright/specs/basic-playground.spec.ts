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

test("playground uses charts-style docs shell and remounts content when switching feature menus", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");

  await expect(page.locator("body")).toHaveCSS("font-size", "12px");
  await expect(page.locator("body")).toHaveCSS("font-family", /Spoqa Han Sans Neo/);
  const aside = page.getByRole("complementary", { name: "데이터 테이블 기능 메뉴" });
  const content = page.getByRole("main", { name: "데이터 테이블 예제" });
  await expect(aside).toBeVisible();
  await expect(content).toBeVisible();
  await expect(page.getByRole("complementary", { name: "데이터 테이블 문서" })).toHaveCount(0);
  await expect(page.locator(".example-topbar")).toContainText("@kmsf/data-table");
  await expect(page.locator(".workspace-tabs")).toBeVisible();
  await expect(page.locator(".workspace-tabs__bar")).toHaveCount(0);
  await expect(page.locator(".example-topbar").getByRole("tablist", { name: "플레이그라운드 보기" })).toBeVisible();
  await expect(page.getByRole("button", { name: "React Table Playground" })).toHaveCount(0);
  await expect(page.locator(".docs-layout")).toBeVisible();

  const asideBox = await aside.boundingBox();
  const contentBox = await content.boundingBox();
  expect(asideBox).not.toBeNull();
  expect(contentBox).not.toBeNull();
  expect(asideBox!.width).toBeGreaterThanOrEqual(260);
  expect(asideBox!.width).toBeLessThanOrEqual(320);
  expect(contentBox!.width).toBeGreaterThan(asideBox!.width);

  for (const label of [
    "기본",
    "CRUD 동작",
    "테이블 사이즈",
    "Header 예제",
    "대용량 데이터 표시",
    "Td Cell 예제",
    "Tr Row 예제",
    "Context Menu 예제",
  ]) {
    await expect(page.getByRole("button", { exact: true, name: label })).toBeVisible();
  }
  await expect(page.getByRole("button", { exact: true, name: "핵심 기능" })).toHaveCount(0);
  await expect(page.getByRole("button", { exact: true, name: "고급 기능" })).toHaveCount(0);

  const firstMountId = await page.getByTestId("mount-id").textContent();
  await page.getByRole("button", { exact: true, name: "기본" }).click();
  await expect(page.getByTestId("mount-id")).toHaveText(firstMountId ?? "");

  await page.getByRole("button", { name: "Header 예제" }).click();
  const headerMountId = await page.getByTestId("mount-id").textContent();
  expect(headerMountId).not.toBe(firstMountId);
  await expect(content).toHaveAttribute("data-feature", "header");

  await page.getByRole("button", { name: "CRUD 동작" }).click();
  await expect(content).toHaveAttribute("data-feature", "basic-crud");
  await expect
    .poll(() => page.evaluate(() => window.__kmsfDataTableLastUnmount))
    .toBe(headerMountId);

  await page.locator(".example-topbar").getByRole("tab", { exact: true, name: "옵션 가이드" }).click();
  await expect(page.getByTestId("option-guide")).toContainText("columns");
  await expect(page.getByTestId("option-guide")).toContainText("setMoveTargetRow");
  await expect(page.getByRole("tab", { exact: true, name: "문서 요약" })).toHaveCount(0);

  expect(diagnostics).toEqual([]);
});

test("playground verifies row and cell Ctrl+C Ctrl+V interactions in a browser", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");

  const bodyRows = page.locator(".kmsf-data-table__body-table tbody tr");
  await bodyRows.nth(0).focus();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+C" : "Control+C");
  await bodyRows.nth(1).focus();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+V" : "Control+V");
  await expect(bodyRows.nth(2).locator("td").first()).toHaveText("Alpha");

  const cells = page.locator(".kmsf-data-table__body-table tbody td");
  await cells.nth(2).focus();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+C" : "Control+C");
  await cells.nth(0).focus();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+V" : "Control+V");
  await expect(cells.nth(0)).toHaveText("Owner");

  expect(diagnostics).toEqual([]);
});

test("playground verifies range drag and multi-cell Ctrl+C Ctrl+V interactions in a browser", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");

  const anchorCell = page.getByTestId("cell-a-name");
  const focusCell = page.getByTestId("cell-b-age");
  await anchorCell.hover();
  await page.mouse.down();
  await focusCell.hover();
  await page.mouse.up();

  await expect(page.getByTestId("cell-a-name")).toHaveAttribute("data-range-selected", "true");
  await expect(page.getByTestId("cell-b-age")).toHaveAttribute("data-range-selected", "true");

  await anchorCell.focus();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+C" : "Control+C");
  await page.getByTestId("cell-b-name").focus();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+V" : "Control+V");

  await expect(page.getByTestId("cell-b-name")).toHaveText("Alpha");
  await expect(page.getByTestId("cell-b-age")).toHaveText("31 years");
  await expect(page.getByTestId("cell-c-name")).toHaveText("Beta");
  await expect(page.getByTestId("cell-c-age")).toHaveText("42 years");
  expect(diagnostics).toEqual([]);
});

test("basic page removes live controls and keeps only the default table", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "기본" }).click();

  await expect(page.getByTestId("feature-controls")).toHaveCount(0);
  await expect(page.getByTestId("basic-live-state")).toHaveCount(0);
  await expect(page.getByLabel("첫 번째 이름")).toHaveCount(0);
  await expect(page.getByTestId("cell-a-name")).toHaveText("Alpha");

  expect(diagnostics).toEqual([]);
});

test("basic page table expands to the available browser height", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "기본" }).click();

  await expect(page.getByTestId("sample-row-count")).toHaveCount(0);

  const tableBox = await page.locator(".example-table.kmsf-data-table").first().boundingBox();
  const sampleBox = await page.getByTestId("feature-option-sample").first().boundingBox();
  expect(tableBox).not.toBeNull();
  expect(sampleBox).not.toBeNull();
  expect(tableBox!.height).toBeGreaterThan(600);
  expect(Math.abs(tableBox!.height - sampleBox!.height)).toBeLessThanOrEqual(2);

  expect(diagnostics).toEqual([]);
});
