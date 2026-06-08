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

test("feature content starts with a concise option table and avoids page-level vertical scroll", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");

  const content = page.getByRole("main", { name: "데이터 테이블 예제" });
  await expect(content.getByRole("heading", { exact: true, level: 1, name: "기본" })).toBeVisible();
  await expect(page.getByTestId("feature-intro-description")).toHaveText("@kmsf/data-table 기본 예제 페이지입니다.");
  await expect(page.getByTestId("feature-option-table")).toContainText("columns");
  await expect(page.getByTestId("feature-option-table")).toContainText("데이터 테이블 컬럼 항목");
  await expect(page.locator(".feature-doc")).toHaveCount(0);

  const pageSize = await page.evaluate(() => ({
    bodyScrollHeight: document.body.scrollHeight,
    documentScrollHeight: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight,
  }));
  expect(pageSize.documentScrollHeight).toBeLessThanOrEqual(pageSize.viewportHeight + 1);
  expect(pageSize.bodyScrollHeight).toBeLessThanOrEqual(pageSize.viewportHeight + 1);
  expect(diagnostics).toEqual([]);
});

test("CRUD page removes noisy query output and shows table pagination at the top right", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "CRUD 동작" }).click();

  await expect(page.getByTestId("query-result")).toHaveCount(0);
  await expect(page.getByTestId("crud-row-summary")).toContainText("표시 행:100");
  await expect(page.getByTestId("crud-pagination")).toBeVisible();
  await expect(page.getByTestId("crud-pagination")).toContainText("1 / 10");

  const paginationBox = await page.getByTestId("crud-pagination").boundingBox();
  const tableBox = await page.locator(".example-table.kmsf-data-table").boundingBox();
  expect(paginationBox).not.toBeNull();
  expect(tableBox).not.toBeNull();
  expect(paginationBox!.x + paginationBox!.width).toBeLessThanOrEqual(tableBox!.x + tableBox!.width + 2);
  expect(paginationBox!.y).toBeLessThan(tableBox!.y);

  await page.getByRole("button", { exact: true, name: "다음 페이지" }).click();
  await expect(page.getByTestId("crud-pagination")).toContainText("2 / 10");
  expect(diagnostics).toEqual([]);
});

test("selected row uses a stronger KMSF mint color", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");

  await page.getByTestId("row-b").click();
  await expect(page.getByTestId("row-b")).toHaveCSS("background-color", "rgb(209, 250, 229)");
  expect(diagnostics).toEqual([]);
});

test("data table uses 1px outer radius and keeps viewport edge lines visible", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "대용량 데이터 표시" }).click();
  await page.getByRole("button", { name: "10만 행 로드" }).click();
  await expect(page.getByTestId("virtual-row-count")).toContainText("100000");

  const table = page.locator(".example-table.kmsf-data-table").first();
  await expect(table).toHaveCSS("border-radius", "1px");
  await expect(table).toHaveCSS("border-right-width", "1px");
  await expect(table).toHaveCSS("border-bottom-width", "1px");

  const viewportMetrics = await page.getByTestId("data-table-viewport").evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    scrollTop: element.scrollTop,
  }));
  expect(viewportMetrics.scrollTop).toBe(0);
  expect(viewportMetrics.scrollHeight).toBeGreaterThan(viewportMetrics.clientHeight);
  expect(diagnostics).toEqual([]);
});

test("body viewport keeps a single bottom border at max scroll", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "대용량 데이터 표시" }).click();
  await page.getByRole("button", { name: "10만 행 로드" }).click();
  await expect(page.getByTestId("virtual-row-count")).toContainText("100000");

  const metrics = await page.getByTestId("data-table-viewport").evaluate((viewport) => {
    viewport.scrollTop = viewport.scrollHeight;
    const tableRoot = viewport.closest(".kmsf-data-table");
    const dataRows = Array.from(
      viewport.querySelectorAll<HTMLTableRowElement>(".kmsf-data-table__body-table tbody tr[data-kmsf-row-data-index]"),
    );
    const lastDataRow = dataRows.at(-1);
    const firstCell = lastDataRow?.querySelector<HTMLElement>(".kmsf-data-table__td");
    const rootStyle = tableRoot ? window.getComputedStyle(tableRoot) : null;
    const cellStyle = firstCell ? window.getComputedStyle(firstCell) : null;

    return {
      cellBorderBottomWidth: cellStyle?.borderBottomWidth ?? null,
      rootBorderBottomWidth: rootStyle?.borderBottomWidth ?? null,
      scrollTop: viewport.scrollTop,
    };
  });

  expect(metrics.scrollTop).toBeGreaterThan(0);
  expect(metrics.rootBorderBottomWidth).toBe("1px");
  expect(metrics.cellBorderBottomWidth).toBe("0px");
  expect(diagnostics).toEqual([]);
});

test("example controls separate option indicators from icon action buttons", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");

  await expect(page.getByTestId("feature-options")).toBeVisible();
  await expect(page.getByTestId("feature-options")).toContainText("data prop 제어");
  await expect(page.getByTestId("feature-options").locator("button")).toHaveCount(0);
  await expect(page.getByTestId("feature-actions")).toBeVisible();
  await expect(page.getByTestId("feature-actions").locator(".state-pill")).toHaveCount(0);
  await expect(page.getByTestId("feature-actions").locator("button")).toHaveCount(2);
  await expect(page.getByTestId("feature-actions").locator("button svg")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Owner 행 스타일 끄기" })).toHaveAttribute("data-action-tone", "primary");

  await page.getByRole("button", { exact: true, name: "CRUD 동작" }).click();
  await expect(page.getByTestId("feature-options")).toHaveCount(0);
  await expect(page.getByTestId("feature-actions")).toBeVisible();
  await expect(page.getByTestId("feature-actions").locator("button")).toHaveCount(5);
  await expect(page.getByTestId("feature-actions").locator("button svg")).toHaveCount(5);
  await expect(page.getByRole("button", { name: "선택 행 삭제" })).toHaveAttribute("data-action-tone", "danger");
  await expect(page.getByRole("button", { name: "소유자만 보기" })).toHaveAttribute("data-action-tone", "filter");

  expect(diagnostics).toEqual([]);
});

test("table size menu demonstrates manual parent and browser-responsive sizing", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "테이블 사이즈" }).click();

  await expect(page.getByRole("main", { name: "데이터 테이블 예제" })).toHaveAttribute("data-feature", "size");
  await expect(page.getByRole("heading", { exact: true, level: 1, name: "테이블 사이즈" })).toBeVisible();
  await expect(page.getByTestId("size-case-manual")).toBeVisible();
  await expect(page.getByTestId("size-case-parent")).toBeVisible();
  await expect(page.getByTestId("size-case-responsive")).toBeVisible();

  const manualBox = await page.getByTestId("size-case-manual").boundingBox();
  const parentBox = await page.getByTestId("size-case-parent").boundingBox();
  const responsiveBox = await page.getByTestId("size-case-responsive").boundingBox();
  expect(manualBox).not.toBeNull();
  expect(parentBox).not.toBeNull();
  expect(responsiveBox).not.toBeNull();
  expect(Math.round(manualBox!.height)).toBe(320);
  expect(Math.round(parentBox!.height)).toBe(360);

  await page.setViewportSize({ height: 900, width: 1280 });
  const responsiveAfterResize = await page.getByTestId("size-case-responsive").boundingBox();
  expect(responsiveAfterResize).not.toBeNull();
  expect(responsiveAfterResize!.height).toBeGreaterThan(responsiveBox!.height);
  expect(diagnostics).toEqual([]);
});
