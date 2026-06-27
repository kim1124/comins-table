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

test("feature content uses card containers and avoids page-level vertical scroll", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");

  await expect(page.getByTestId("feature-option-table")).toHaveCount(0);
  await expect(page.getByTestId("feature-option-container")).toHaveCount(1);
  await expect(page.getByTestId("feature-sample-card")).toBeVisible();
  await expect(page.getByTestId("feature-sample-card-header")).toBeVisible();
  await expect(page.getByTestId("feature-sample-card-content")).toBeVisible();
  await expect(page.getByTestId("feature-option-heading").first()).toContainText("기본");
  await expect(page.getByTestId("feature-option-description").first()).toHaveText("@kmsf/data-table 기본 예제입니다.");
  await expect(page.getByTestId("feature-option-sample").first().locator(".kmsf-data-table")).toBeVisible();
  await expect(page.getByTestId("feature-controls")).toHaveCount(0);
  await expect(page.getByTestId("basic-live-state")).toHaveCount(0);
  await expect(page.getByTestId("sample-row-count")).toHaveCount(0);
  await expect(page.getByLabel("첫 번째 이름")).toHaveCount(0);
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

test("single samples fill browser height and repeated samples scroll vertically", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.setViewportSize({ height: 720, width: 1280 });
  await page.goto("/");

  const basicMetrics = await page.getByTestId("feature-content").evaluate((element) => {
    const style = window.getComputedStyle(element);
    const sample = element.querySelector<HTMLElement>("[data-testid='feature-option-sample']");
    const table = element.querySelector<HTMLElement>(".kmsf-data-table");

    return {
      overflowY: style.overflowY,
      contentHeight: element.clientHeight,
      sampleHeight: sample?.getBoundingClientRect().height ?? 0,
      tableHeight: table?.getBoundingClientRect().height ?? 0,
    };
  });

  expect(basicMetrics.overflowY).toBe("auto");
  expect(basicMetrics.tableHeight).toBeGreaterThanOrEqual(300);
  expect(basicMetrics.tableHeight).toBeGreaterThan(500);
  expect(Math.abs(basicMetrics.tableHeight - basicMetrics.sampleHeight)).toBeLessThanOrEqual(2);
  expect(basicMetrics.sampleHeight).toBeLessThanOrEqual(basicMetrics.contentHeight);

  await page.getByRole("button", { exact: true, name: "컴포넌트 예제" }).click();
  await expect(page.getByRole("main", { name: "데이터 테이블 예제" })).toHaveAttribute("data-feature", "component");
  const longContentMetrics = await page.getByTestId("feature-content").evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));

  expect(longContentMetrics.scrollHeight).toBeGreaterThan(longContentMetrics.clientHeight);
  expect(diagnostics).toEqual([]);
});

test("repeated sample containers provide at least 500px sample height and full-width tables", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "컴포넌트 예제" }).click();

  const sample = page.getByTestId("feature-option-sample").first();
  const table = sample.locator(".kmsf-data-table").first();
  const metrics = await sample.evaluate((element) => {
    const tableRoot = element.querySelector<HTMLElement>(".kmsf-data-table");
    const tableStyle = tableRoot ? window.getComputedStyle(tableRoot) : null;
    const sampleBox = element.getBoundingClientRect();
    const tableBox = tableRoot?.getBoundingClientRect();

    return {
      sampleHeight: sampleBox.height,
      sampleWidth: sampleBox.width,
      tableHeight: tableBox?.height ?? 0,
      tableMaxHeight: tableStyle?.maxHeight ?? "",
      tableMinHeight: tableStyle?.minHeight ?? "",
      tableWidth: tableBox?.width ?? 0,
    };
  });

  await expect(table).toBeVisible();
  expect(metrics.sampleHeight).toBeGreaterThanOrEqual(500);
  expect(metrics.tableMinHeight).toBe("300px");
  expect(metrics.tableMaxHeight).toBe("100%");
  expect(Math.abs(metrics.tableWidth - metrics.sampleWidth)).toBeLessThanOrEqual(2);
  expect(diagnostics).toEqual([]);
});

test("all playground examples keep width containment and component resize scrolls inside the table", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.setViewportSize({ height: 760, width: 1180 });
  await page.goto("/");

  for (const label of [
    "기본",
    "CRUD 동작",
    "테이블 사이즈",
    "Header 예제",
    "대용량 데이터 표시",
    "Td Cell 예제",
    "컴포넌트 예제",
    "Tr Row 예제",
    "Context Menu 예제",
  ]) {
    await page.getByRole("button", { exact: true, name: label }).click();
    const metrics = await page.getByTestId("feature-content").evaluate((element) => {
      const panel = element.querySelector<HTMLElement>(".feature-panel");
      const panelStyle = panel ? window.getComputedStyle(panel) : null;
      const contentRect = element.getBoundingClientRect();
      const panelRect = panel?.getBoundingClientRect();

      return {
        contentRight: contentRect.right,
        documentWidth: document.documentElement.scrollWidth,
        overflowX: panelStyle?.overflowX ?? "",
        panelRight: panelRect?.right ?? 0,
        viewportWidth: window.innerWidth,
      };
    });

    expect(metrics.panelRight).toBeLessThanOrEqual(metrics.contentRight + 1);
    expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
    expect(metrics.overflowX).not.toBe("visible");
  }

  await page.getByRole("button", { exact: true, name: "컴포넌트 예제" }).click();
  const beforeWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const table = page.getByTestId("component-example-button");
  const resizeHandle = table.getByTestId("resize-button-component");
  const handleBox = await resizeHandle.boundingBox();
  expect(handleBox).not.toBeNull();

  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox!.x + 420, handleBox!.y + handleBox!.height / 2);
  await page.mouse.up();

  const overflowMetrics = await table.locator(".kmsf-data-table__body-viewport").evaluate((element) => {
    const style = window.getComputedStyle(element);

    return {
      clientWidth: element.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      overflowX: style.overflowX,
      scrollWidth: element.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });

  expect(overflowMetrics.documentWidth).toBeLessThanOrEqual(Math.max(beforeWidth, overflowMetrics.viewportWidth) + 1);
  expect(overflowMetrics.scrollWidth).toBeGreaterThan(overflowMetrics.clientWidth);
  expect(["auto", "scroll"]).toContain(overflowMetrics.overflowX);
  expect(diagnostics).toEqual([]);
});

test("CRUD page removes noisy query output and shows table pagination at the top right", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "CRUD 동작" }).click();

  await expect(page.getByTestId("query-result")).toHaveCount(0);
  await expect(page.getByTestId("crud-row-summary")).toHaveCount(0);
  await expect(page.getByTestId("pagination-state")).toHaveCount(0);
  await expect(page.getByTestId("selected-row-state")).toHaveCount(0);
  await expect(page.getByTestId("feature-control-label")).toHaveCount(0);
  for (const label of ["추가", "수정", "삭제", "초기화", "필터링"]) {
    await expect(page.getByRole("button", { exact: true, name: label })).toBeVisible();
  }
  await expect(page.getByTestId("crud-pagination")).toBeVisible();
  await expect(page.getByTestId("crud-pagination")).toContainText("1 / 4");
  await expect(page.locator(".kmsf-data-table__header-table th")).toHaveCount(6);

  const detailBox = await page.getByTestId("crud-detail-pane").boundingBox();
  const paginationBox = await page.getByTestId("crud-pagination").boundingBox();
  const tableBox = await page.locator(".example-table.kmsf-data-table").boundingBox();
  const sampleBox = await page.getByTestId("feature-option-sample").first().boundingBox();
  expect(detailBox).not.toBeNull();
  expect(paginationBox).not.toBeNull();
  expect(tableBox).not.toBeNull();
  expect(sampleBox).not.toBeNull();
  expect(detailBox!.y).toBeLessThan(tableBox!.y);
  expect(paginationBox!.x + paginationBox!.width).toBeLessThanOrEqual(tableBox!.x + tableBox!.width + 2);
  expect(paginationBox!.y).toBeLessThan(tableBox!.y);
  expect(Math.abs(tableBox!.width - sampleBox!.width)).toBeLessThanOrEqual(2);

  await page.getByRole("button", { exact: true, name: "다음" }).click();
  await expect(page.getByTestId("crud-pagination")).toContainText("2 / 4");
  expect(diagnostics).toEqual([]);
});

test("general samples render thirty rows per page while large data remains virtualized", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");

  for (const label of ["기본", "CRUD 동작", "Header 예제", "Td Cell 예제", "Tr Row 예제", "Context Menu 예제"]) {
    await page.getByRole("button", { exact: true, name: label }).click();
    await expect(page.getByTestId("data-table-viewport")).toBeVisible();
    await expect(page.locator(".kmsf-data-table__body-table tbody tr[data-kmsf-row-data-index]")).toHaveCount(30);
  }

  await page.getByRole("button", { exact: true, name: "컴포넌트 예제" }).click();
  await expect(
    page.getByTestId("component-example-button").locator(".kmsf-data-table__body-table tbody tr[data-kmsf-row-data-index]"),
  ).toHaveCount(30);

  await page.getByRole("button", { exact: true, name: "대용량 데이터 표시" }).click();
  await expect(page.getByRole("button", { exact: true, name: "100만 행 로드" })).toHaveCount(0);
  await page.getByRole("button", { exact: true, name: "10만 행 로드" }).click();
  await expect.poll(() => page.locator(".kmsf-data-table__body-table tbody tr[data-kmsf-row-data-index]").count()).toBeLessThan(90);
  expect(diagnostics).toEqual([]);
});

test("selected row uses a stronger KMSF mint color", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");

  await page.getByTestId("row-b").click();
  await expect(page.getByTestId("row-b")).toHaveCSS("background-color", "rgb(209, 250, 229)");
  expect(diagnostics).toEqual([]);
});

test("header page keeps only requested actions and state outputs", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "Header 예제" }).click();

  for (const label of ["표시", "숨김", "저장", "불러오기", "초기화"]) {
    await expect(page.getByRole("button", { exact: true, name: label })).toBeVisible();
  }
  await expect(page.getByRole("button", { exact: true, name: "복원" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Header components/u })).toHaveCount(0);
  await expect(page.getByTestId("header-component-table")).toHaveCount(0);
  await expect(page.getByTestId("header-proof-layout")).toHaveCount(0);
  await expect(page.getByTestId("header-proof-sort")).toHaveCount(0);
  await expect(page.getByTestId("saved-layout-json")).toBeVisible();
  await expect(page.getByTestId("header-component-event")).toHaveCount(0);
  expect(diagnostics).toEqual([]);
});

test("data table uses 2px outer radius and keeps viewport edge lines visible", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "대용량 데이터 표시" }).click();
  await expect(page.getByTestId("virtual-row-count")).toHaveCount(0);
  await expect(page.locator(".kmsf-data-table__header-table th")).toHaveCount(10);

  const table = page.locator(".example-table.kmsf-data-table").first();
  await expect(table).toHaveCSS("border-radius", "2px");
  await expect(table).toHaveCSS("border-right-width", "1px");
  await expect(table).toHaveCSS("border-bottom-width", "1px");
  await expect(page.getByTestId("data-table-viewport")).toHaveCSS("overscroll-behavior-y", "none");

  const viewportMetrics = await page.getByTestId("data-table-viewport").evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    scrollTop: element.scrollTop,
  }));
  expect(viewportMetrics.scrollTop).toBe(0);
  expect(viewportMetrics.scrollHeight).toBeGreaterThan(viewportMetrics.clientHeight);
  expect(diagnostics).toEqual([]);
});

test("column shrink clips overflowing component content inside the resized cell", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "컴포넌트 예제" }).click();

  const table = page.getByTestId("component-example-button");
  const resizeHandle = table.getByTestId("resize-button-component");
  const handleBox = await resizeHandle.boundingBox();
  expect(handleBox).not.toBeNull();

  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox!.x - 260, handleBox!.y + handleBox!.height / 2);
  await page.mouse.up();

  const overflowMetrics = await table.getByTestId("cell-button-a-button-component").evaluate((cell) => {
    const rect = cell.getBoundingClientRect();
    const leakedTarget = document.elementFromPoint(rect.right + 6, rect.top + rect.height / 2);
    const header = document.querySelector<HTMLElement>("[data-testid='header-button-component']");
    const headerText = header?.querySelector<HTMLElement>(".kmsf-data-table__header-label");
    const headerTextStyle = headerText ? window.getComputedStyle(headerText) : null;
    const cellStyle = window.getComputedStyle(cell);

    return {
      cellOverflow: cellStyle.overflow,
      headerOverflow: headerTextStyle?.overflow ?? null,
      headerTextOverflow: headerTextStyle?.textOverflow ?? null,
      leakedButtonText: leakedTarget?.closest(".kmsf-data-table__component-button")?.textContent ?? null,
    };
  });

  expect(overflowMetrics.cellOverflow).toBe("hidden");
  expect(overflowMetrics.headerOverflow).toBe("hidden");
  expect(overflowMetrics.headerTextOverflow).toBe("ellipsis");
  expect(overflowMetrics.leakedButtonText).toBeNull();
  expect(diagnostics).toEqual([]);
});

test("body viewport keeps a single bottom border at max scroll", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "대용량 데이터 표시" }).click();
  await expect(page.getByTestId("body-proof-virtualization")).toHaveCount(0);

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

test("example controls stay in one horizontal row with overflow scrolling", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");

  await page.getByRole("button", { exact: true, name: "CRUD 동작" }).click();
  const crudControlRow = page.getByTestId("feature-control-row");
  await expect(crudControlRow).toBeVisible();
  await expect(crudControlRow.locator("button")).toHaveCount(5);
  await expect(crudControlRow.locator("button svg")).toHaveCount(5);
  const rowMetrics = await crudControlRow.evaluate((element) => {
    const children = [...element.children].map((child) => child.getBoundingClientRect());
    const firstTop = children[0]?.top ?? 0;
    const wrapped = children.some((box) => Math.abs(box.top - firstTop) > 2);
    const style = window.getComputedStyle(element);

    return {
      overflowX: style.overflowX,
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      wrapped,
    };
  });
  expect(rowMetrics.wrapped).toBe(false);
  expect(["auto", "scroll"]).toContain(rowMetrics.overflowX);
  await expect(page.getByRole("button", { exact: true, name: "삭제" })).toHaveAttribute("data-action-tone", "danger");
  await expect(page.getByRole("button", { exact: true, name: "필터링" })).toHaveAttribute("data-action-tone", "filter");

  expect(diagnostics).toEqual([]);
});

test("collapsed feature menu keeps feature-specific icon identities", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");

  await page.getByRole("button", { name: "기능 메뉴 접기" }).click();
  await expect(page.getByRole("complementary", { name: "데이터 테이블 기능 메뉴" })).toHaveAttribute(
    "data-collapsed",
    "true",
  );

  const iconIds = await page.locator(".feature-menu-button").evaluateAll((buttons) =>
    buttons.map((button) => button.querySelector("[data-feature-icon]")?.getAttribute("data-feature-icon")),
  );
  expect(new Set(iconIds).size).toBe(iconIds.length);
  expect(iconIds).toContain("basic");
  expect(iconIds).toContain("context-menu");
  expect(diagnostics).toEqual([]);
});

test("table size menu demonstrates manual parent and browser-responsive sizing", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "테이블 사이즈" }).click();

  await expect(page.getByRole("main", { name: "데이터 테이블 예제" })).toHaveAttribute("data-feature", "size");
  await expect(page.getByTestId("feature-option-heading").filter({ hasText: "테이블 사이즈" })).toBeVisible();
  await expect(page.getByTestId("size-case-manual")).toBeVisible();
  await expect(page.getByTestId("size-case-parent")).toBeVisible();
  await expect(page.getByTestId("size-case-responsive")).toBeVisible();

  const manualBox = await page.getByTestId("size-case-manual").boundingBox();
  const parentBox = await page.getByTestId("size-case-parent").boundingBox();
  const responsiveBox = await page.getByTestId("size-case-responsive").boundingBox();
  const manualTableBox = await page
    .getByTestId("data-table-size-manual")
    .locator("xpath=ancestor::div[contains(concat(' ', normalize-space(@class), ' '), ' kmsf-data-table ')][1]")
    .boundingBox();
  const parentTableBox = await page
    .getByTestId("data-table-size-parent")
    .locator("xpath=ancestor::div[contains(concat(' ', normalize-space(@class), ' '), ' kmsf-data-table ')][1]")
    .boundingBox();
  const responsiveTableBox = await page
    .getByTestId("data-table-size-responsive")
    .locator("xpath=ancestor::div[contains(concat(' ', normalize-space(@class), ' '), ' kmsf-data-table ')][1]")
    .boundingBox();
  expect(manualBox).not.toBeNull();
  expect(parentBox).not.toBeNull();
  expect(responsiveBox).not.toBeNull();
  expect(manualTableBox).not.toBeNull();
  expect(parentTableBox).not.toBeNull();
  expect(responsiveTableBox).not.toBeNull();
  expect(Math.round(manualBox!.height)).toBe(300);
  expect(Math.round(parentBox!.height)).toBe(500);
  expect(responsiveBox!.height).toBeGreaterThanOrEqual(500);
  expect(Math.abs(manualTableBox!.height - manualBox!.height)).toBeLessThanOrEqual(2);
  expect(Math.abs(parentTableBox!.height - parentBox!.height)).toBeLessThanOrEqual(2);
  expect(Math.abs(responsiveTableBox!.height - responsiveBox!.height)).toBeLessThanOrEqual(2);

  await page.setViewportSize({ height: 900, width: 1280 });
  const responsiveAfterResize = await page.getByTestId("size-case-responsive").boundingBox();
  expect(responsiveAfterResize).not.toBeNull();
  expect(responsiveAfterResize!.height).toBeGreaterThan(responsiveBox!.height);
  expect(diagnostics).toEqual([]);
});
