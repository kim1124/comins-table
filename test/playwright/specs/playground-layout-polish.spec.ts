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
  await expect(page.getByTestId("feature-option-description").first()).toHaveText("comins-table 기본 예제입니다.");
  await expect(page.getByTestId("feature-option-sample").first().locator(".comins-table")).toBeVisible();
  await expect(page.getByTestId("feature-controls")).toHaveCount(0);
  await expect(page.getByTestId("basic-live-state")).toHaveCount(0);
  await expect(page.getByTestId("sample-row-count")).toHaveCount(0);
  await expect(page.getByLabel("첫 번째 이름")).toHaveCount(0);
  await expect(page.locator(".feature-doc")).toHaveCount(0);

  const pageSize = await page.evaluate(() => ({
    bodyOverflow: window.getComputedStyle(document.body).overflow,
    contentClientHeight: document.querySelector<HTMLElement>(".docs-shell__content")?.clientHeight ?? 0,
    contentScrollHeight: document.querySelector<HTMLElement>(".docs-shell__content")?.scrollHeight ?? 0,
    documentOverflow: window.getComputedStyle(document.documentElement).overflow,
    viewportHeight: window.innerHeight,
  }));
  expect(pageSize.documentOverflow).toBe("hidden");
  expect(pageSize.bodyOverflow).toBe("hidden");
  expect(pageSize.contentClientHeight).toBeLessThanOrEqual(pageSize.viewportHeight);
  expect(pageSize.contentScrollHeight).toBeGreaterThan(pageSize.contentClientHeight);
  expect(diagnostics).toEqual([]);
});

test("single samples keep default table height and repeated samples scroll vertically", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.setViewportSize({ height: 720, width: 1280 });
  await page.goto("/");

  const basicMetrics = await page.getByTestId("feature-content").evaluate((element) => {
    const style = window.getComputedStyle(element);
    const sample = element.querySelector<HTMLElement>("[data-testid='feature-option-sample']");
    const table = element.querySelector<HTMLElement>(".comins-table");

    return {
      overflowY: style.overflowY,
      contentHeight: element.clientHeight,
      sampleHeight: sample?.getBoundingClientRect().height ?? 0,
      tableHeight: table?.getBoundingClientRect().height ?? 0,
    };
  });

  expect(basicMetrics.overflowY).toBe("visible");
  expect(basicMetrics.tableHeight).toBeGreaterThanOrEqual(300);
  expect(Math.abs(basicMetrics.tableHeight - basicMetrics.sampleHeight)).toBeLessThanOrEqual(2);
  expect(basicMetrics.sampleHeight).toBeGreaterThanOrEqual(300);

  await page.goto("/examples/component");
  await expect(page.getByTestId("feature-content")).toHaveAttribute("data-feature", "component");
  const longContentMetrics = await page.locator(".docs-shell__content").evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));

  expect(longContentMetrics.scrollHeight).toBeGreaterThan(longContentMetrics.clientHeight);
  expect(diagnostics).toEqual([]);
});

test("repeated sample containers provide at least 500px sample height and full-width tables", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.goto("/examples/component");

  const sample = page.getByTestId("feature-option-sample").first();
  const table = sample.locator(".comins-table").first();
  const metrics = await sample.evaluate((element) => {
    const tableRoot = element.querySelector<HTMLElement>(".comins-table");
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

test("all example cards expand instead of clipping their live content", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.setViewportSize({ height: 720, width: 1280 });

  for (const route of [
    "/docs/getting-started",
    "/examples/crud",
    "/examples/size",
    "/examples/theme",
    "/examples/header",
    "/examples/column-groups",
    "/performance/pagination",
    "/examples/cell",
    "/examples/component",
    "/examples/row",
    "/examples/context-menu",
    "/performance/virtualization",
  ]) {
    await page.goto(route);
    await expect(page.getByTestId("feature-content")).toBeVisible();

    const clippedElements = await page.getByTestId("feature-content").evaluate((root) => {
      const selectors = [
        ".feature-panel",
        ".feature-option-container",
        ".feature-option-container__body",
        ".feature-option-sample",
        ".feature-option-sample__inner",
        ".crud-workspace",
        ".context-workspace",
        ".theme-example",
        ".theme-example__table-frame",
      ];

      return selectors.flatMap((selector) =>
        Array.from(root.querySelectorAll<HTMLElement>(selector)).flatMap((element) => {
          const style = window.getComputedStyle(element);
          const clipsY = style.overflowY === "hidden" || style.overflowY === "clip";

          if (!clipsY) {
            return [];
          }

          const elementRect = element.getBoundingClientRect();
          const clippedChildren = Array.from(element.children).flatMap((child) => {
            if (!(child instanceof HTMLElement)) {
              return [];
            }

            const childStyle = window.getComputedStyle(child);
            if (childStyle.display === "none" || childStyle.position === "fixed" || childStyle.position === "absolute") {
              return [];
            }

            const childRect = child.getBoundingClientRect();
            const overflowBottom = childRect.bottom - elementRect.bottom;
            const overflowTop = elementRect.top - childRect.top;

            if (overflowBottom <= 2 && overflowTop <= 2) {
              return [];
            }

            return [
              {
                childClassName: child.className,
                childTagName: child.tagName.toLowerCase(),
                className: element.className,
                overflowBottom,
                overflowTop,
                overflowY: style.overflowY,
                route: window.location.pathname,
                selector,
              },
            ];
          });

          return clippedChildren;
        }),
      );
    });

    expect(clippedElements).toEqual([]);
  }

  expect(diagnostics).toEqual([]);
});

test("all playground examples keep width containment and component resize scrolls inside the table", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.setViewportSize({ height: 760, width: 1180 });
  await page.goto("/");

  for (const route of [
    "/docs/getting-started",
    "/examples/crud",
    "/examples/size",
    "/examples/theme",
    "/examples/header",
    "/examples/column-groups",
    "/performance/pagination",
    "/performance/virtualization",
    "/examples/cell",
    "/examples/component",
    "/examples/row",
    "/examples/context-menu",
  ]) {
    await page.goto(route);
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

  await page.goto("/examples/component");
  const beforeWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const table = page.getByTestId("component-example-button");
  const resizeHandle = table.getByTestId("resize-button-component");
  const handleBox = await resizeHandle.boundingBox();
  expect(handleBox).not.toBeNull();

  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox!.x + 420, handleBox!.y + handleBox!.height / 2);
  await page.mouse.up();

  const overflowMetrics = await table.locator(".comins-table__body-viewport").evaluate((element) => {
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
  expect(overflowMetrics.scrollWidth).toBeGreaterThanOrEqual(overflowMetrics.clientWidth);
  expect(["auto", "hidden", "scroll"]).toContain(overflowMetrics.overflowX);
  expect(diagnostics).toEqual([]);
});

test("CRUD page removes noisy query output and keeps pagination controls out of the CRUD example", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.goto("/examples/crud");

  await expect(page.getByTestId("query-result")).toHaveCount(0);
  await expect(page.getByTestId("crud-row-summary")).toHaveCount(0);
  await expect(page.getByTestId("pagination-state")).toHaveCount(0);
  await expect(page.getByTestId("selected-row-state")).toHaveCount(0);
  await expect(page.getByTestId("feature-control-label")).toHaveCount(0);
  for (const label of ["추가", "수정", "삭제", "초기화", "필터링"]) {
    await expect(page.getByRole("button", { exact: true, name: label })).toBeVisible();
  }
  await expect(page.getByTestId("crud-pagination")).toHaveCount(0);
  await expect(page.locator(".comins-table__header-table th")).toHaveCount(6);

  const detailBox = await page.getByTestId("crud-detail-pane").boundingBox();
  const tableBox = await page.locator(".example-table.comins-table").boundingBox();
  const sampleBox = await page.getByTestId("feature-option-sample").first().boundingBox();
  expect(detailBox).not.toBeNull();
  expect(tableBox).not.toBeNull();
  expect(sampleBox).not.toBeNull();
  expect(detailBox!.y).toBeLessThan(tableBox!.y);
  expect(Math.abs(tableBox!.width - sampleBox!.width)).toBeLessThanOrEqual(2);

  await expect(page.getByRole("button", { exact: true, name: "다음" })).toHaveCount(0);
  expect(diagnostics).toEqual([]);
});

test("pagination page owns the table paging example above virtualization", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/performance/pagination");

  await expect(page.getByTestId("feature-content")).toHaveAttribute("data-feature", "pagination");
  await expect(page.getByTestId("pagination-control")).toContainText("1 / 4");
  await expect(page.getByTestId("pagination-state")).toContainText("Page 1");
  await expect(page.getByRole("button", { exact: true, name: "첫 페이지" })).toBeDisabled();
  await expect(page.getByRole("button", { exact: true, name: "이전 페이지" })).toBeDisabled();
  await expect(page.getByRole("button", { exact: true, name: "다음 페이지" })).toBeEnabled();
  await expect(page.getByRole("button", { exact: true, name: "마지막 페이지" })).toBeEnabled();
  await page.getByRole("button", { exact: true, name: "다음 페이지" }).click();
  await expect(page.getByTestId("pagination-control")).toContainText("2 / 4");
  await expect(page.getByTestId("pagination-state")).toContainText("Page 2");
  await page.getByRole("button", { exact: true, name: "마지막 페이지" }).click();
  await expect(page.getByTestId("pagination-control")).toContainText("4 / 4");
  await expect(page.getByTestId("pagination-state")).toContainText("Page 4");
  await page.getByRole("button", { exact: true, name: "첫 페이지" }).click();
  await expect(page.getByTestId("pagination-control")).toContainText("1 / 4");
  await expect(page.getByTestId("pagination-state")).toContainText("Page 1");

  const performanceLinks = await page
    .locator(".docs-sidebar__group", { hasText: "Body / Performance" })
    .getByRole("link")
    .allTextContents();
  expect(performanceLinks).toEqual(["Pagination", "Infinite Scroll", "Lazy Load", "Virtualization"]);
  expect(diagnostics).toEqual([]);
});

test("general samples render thirty rows per page", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");

  for (const route of ["/docs/getting-started", "/examples/cell", "/examples/context-menu", "/performance/pagination"]) {
    await page.goto(route);
    await expect(page.locator(".comins-table").first()).toBeVisible();
    await expect(page.locator(".comins-table__body-table tbody tr[data-comins-row-data-index]")).toHaveCount(30);
  }

  await page.goto("/examples/crud");
  await expect(page.getByTestId("data-table-viewport")).toBeVisible();
  await expect(page.locator(".comins-table__body-table tbody tr[data-comins-row-data-index]")).toHaveCount(100);

  await page.goto("/examples/row");
  await expect(
    page.getByTestId("row-example-basic").locator(".comins-table__body-table tbody tr[data-comins-row-data-index]"),
  ).toHaveCount(30);

  await page.goto("/examples/header");
  for (const testId of [
    "header-example-basic",
    "header-example-visibility",
    "header-example-layout",
  ]) {
    await expect(
      page.getByTestId(testId).locator(".comins-table__body-table tbody tr[data-comins-row-data-index]"),
    ).toHaveCount(30);
  }

  await page.goto("/examples/column-groups");
  for (const testId of ["header-example-groups", "column-group-dynamic-columns"]) {
    await expect(
      page.getByTestId(testId).locator(".comins-table__body-table tbody tr[data-comins-row-data-index]").first(),
    ).toBeVisible();
  }

  await page.goto("/examples/component");
  await expect(
    page.getByTestId("component-example-button").locator(".comins-table__body-table tbody tr[data-comins-row-data-index]"),
  ).toHaveCount(30);

  expect(diagnostics).toEqual([]);
});

test("large data remains virtualized @perf", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/performance/virtualization");
  await expect(page.getByRole("button", { exact: true, name: "100만 행 로드" })).toHaveCount(0);
  await expect(page.getByRole("button", { exact: true, name: "10만 행 로드" })).toHaveCount(0);
  await expect
    .poll(() => page.locator(".comins-table__body-table tbody tr[data-comins-row-data-index]").count())
    .toBeLessThan(90);
  expect(diagnostics).toEqual([]);
});

test("selected row uses a stronger COMINS mint color", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/docs/getting-started");

  await page.getByTestId("row-b").click();
  await expect(page.getByTestId("row-b")).toHaveCSS("background-color", "rgb(209, 250, 229)");
  expect(diagnostics).toEqual([]);
});

test("header page keeps only requested actions and state outputs", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.goto("/examples/header");

  await expect(page.getByTestId("feature-option-heading").filter({ hasText: "Header 기본 기능" })).toBeVisible();
  await expect(page.getByTestId("feature-option-heading").filter({ hasText: "Header 숨김 / 표시" })).toBeVisible();
  await expect(page.getByTestId("feature-option-heading").filter({ hasText: "컬럼 설정 저장 / 불러오기" })).toBeVisible();
  await expect(page.getByTestId("feature-option-heading").filter({ hasText: "컬럼 동적 표시" })).toHaveCount(0);
  await expect(page.getByTestId("feature-option-heading").filter({ hasText: "2중 헤더 예제" })).toHaveCount(0);
  await expect(page.getByTestId("header-example-basic").getByRole("button", { exact: true, name: "초기화" })).toBeVisible();
  await expect(page.getByTestId("header-example-visibility").getByRole("button", { exact: true, name: "Header 표시" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("header-example-layout").getByRole("button", { exact: true, name: "저장" })).toBeVisible();
  await expect(page.getByTestId("header-example-layout").getByRole("button", { exact: true, name: "불러오기" })).toBeVisible();
  await expect(page.getByTestId("header-example-layout").getByRole("button", { exact: true, name: "초기화" })).toBeVisible();
  await expect(page.getByRole("button", { exact: true, name: "복원" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Header components/u })).toHaveCount(0);
  await expect(page.getByTestId("header-component-table")).toHaveCount(0);
  await expect(page.getByTestId("header-proof-layout")).toHaveCount(0);
  await expect(page.getByTestId("header-proof-sort")).toHaveCount(0);
  await expect(page.getByTestId("header-example-layout").getByTestId("saved-layout-json")).toBeVisible();
  await expect(page.getByTestId("header-component-event")).toHaveCount(0);

  await page.goto("/examples/column-groups");
  await expect(page.getByTestId("header-example-groups").getByRole("button", { exact: true, name: "Header 그룹 1 표시" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("header-example-groups").getByRole("button", { exact: true, name: "초기화" })).toBeVisible();
  await expect(page.getByTestId("column-group-dynamic-columns")).toBeVisible();
  expect(diagnostics).toEqual([]);
});

test("header examples keep table body vertical scrolling available", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.setViewportSize({ height: 720, width: 1280 });
  await page.goto("/examples/header");

  for (const testId of [
    "header-example-basic",
    "header-example-visibility",
    "header-example-layout",
  ]) {
    const metrics = await page
      .getByTestId(testId)
      .locator(".comins-table__body-viewport")
      .evaluate((viewport) => {
        const style = window.getComputedStyle(viewport);

        return {
          clientHeight: viewport.clientHeight,
          overflowY: style.overflowY,
          scrollHeight: viewport.scrollHeight,
        };
      });

    expect(metrics.overflowY, `${testId} body overflow`).toBe("auto");
    expect(metrics.scrollHeight, `${testId} body scrollHeight`).toBeGreaterThan(metrics.clientHeight + 1);
  }

  await page.goto("/examples/column-groups");
  for (const testId of ["header-example-groups", "column-group-dynamic-columns"]) {
    const metrics = await page
      .getByTestId(testId)
      .locator(".comins-table__body-viewport")
      .evaluate((viewport) => {
        const style = window.getComputedStyle(viewport);

        return {
          clientHeight: viewport.clientHeight,
          overflowY: style.overflowY,
          scrollHeight: viewport.scrollHeight,
        };
      });

    expect(metrics.overflowY, `${testId} body overflow`).toBe("auto");
    expect(metrics.scrollHeight, `${testId} body scrollHeight`).toBeGreaterThan(metrics.clientHeight + 1);
  }

  expect(diagnostics).toEqual([]);
});

test("data table uses 2px outer radius and keeps viewport edge lines visible", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.goto("/performance/virtualization");
  await expect(page.getByTestId("virtual-row-count")).toHaveCount(0);
  const table = page.locator(".example-table.comins-table").first();
  await expect(table.locator(".comins-table__header-table th")).toHaveCount(10);
  const headerWidths = await table
    .locator(".comins-table__header-table th[data-comins-column-id]")
    .evaluateAll((headers) =>
      headers.map((header) => ({
        id: header.getAttribute("data-comins-column-id"),
        width: Math.round(header.getBoundingClientRect().width),
      })),
    );
  for (const header of headerWidths) {
    expect(header.width, `${header.id ?? "unknown"} header width`).toBeGreaterThanOrEqual(100);
  }

  await expect(table).toHaveCSS("border-radius", "2px");
  await expect(table).toHaveCSS("border-right-width", "1px");
  await expect(table).toHaveCSS("border-bottom-width", "1px");
  await expect(page.getByTestId("data-table-viewport")).toHaveCSS("overscroll-behavior-y", "none");

  const viewportMetrics = await page.getByTestId("data-table-viewport").evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
    const viewportRect = element.getBoundingClientRect();
    const root = element.closest<HTMLElement>(".comins-table");
    const rootRect = root?.getBoundingClientRect();
    const rootStyle = root ? window.getComputedStyle(root) : null;

    return {
      clientHeight: element.clientHeight,
      rootBorderLeftWidth: rootStyle?.borderLeftWidth ?? null,
      rootLeftDiff: rootRect ? Math.abs(viewportRect.left - rootRect.left) : Number.POSITIVE_INFINITY,
      scrollHeight: element.scrollHeight,
      scrollLeft: element.scrollLeft,
      scrollTop: element.scrollTop,
    };
  });
  expect(viewportMetrics.scrollTop).toBe(0);
  expect(viewportMetrics.scrollLeft).toBeGreaterThan(0);
  expect(viewportMetrics.scrollHeight).toBeGreaterThanOrEqual(viewportMetrics.clientHeight);
  expect(viewportMetrics.rootBorderLeftWidth).toBe("1px");
  expect(viewportMetrics.rootLeftDiff).toBeLessThanOrEqual(1);

  const scrollbarMetrics = await page.getByTestId("data-table-viewport").evaluate((element) => {
    const cornerStyle = window.getComputedStyle(element, "::-webkit-scrollbar-corner");
    const scrollbarStyle = window.getComputedStyle(element, "::-webkit-scrollbar");
    const trackStyle = window.getComputedStyle(element, "::-webkit-scrollbar-track");
    const viewportStyle = window.getComputedStyle(element);

    return {
      cornerBackgroundColor: cornerStyle.backgroundColor,
      horizontalOverflow: element.getAttribute("data-horizontal-overflow"),
      overflowX: viewportStyle.overflowX,
      overflowY: viewportStyle.overflowY,
      scrollbarHeight: scrollbarStyle.height,
      scrollbarGutter: viewportStyle.scrollbarGutter,
      scrollbarWidth: scrollbarStyle.width,
      trackBackgroundColor: trackStyle.backgroundColor,
    };
  });

  expect(scrollbarMetrics.horizontalOverflow).toBe("true");
  expect(scrollbarMetrics.overflowX).toBe("scroll");
  expect(scrollbarMetrics.overflowY).toBe("scroll");
  expect(scrollbarMetrics.scrollbarGutter).toContain("stable");
  expect(scrollbarMetrics.scrollbarHeight).toBe("12px");
  expect(scrollbarMetrics.scrollbarWidth).toBe("12px");
  expect(scrollbarMetrics.trackBackgroundColor).toBe("rgb(246, 252, 250)");
  expect(scrollbarMetrics.cornerBackgroundColor).toBe("rgb(246, 252, 250)");
  expect(diagnostics).toEqual([]);
});

test("column shrink clips overflowing component content inside the resized cell", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.goto("/examples/component");

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
    const headerText = header?.querySelector<HTMLElement>(".comins-table__header-label");
    const headerTextStyle = headerText ? window.getComputedStyle(headerText) : null;
    const cellStyle = window.getComputedStyle(cell);

    return {
      cellOverflow: cellStyle.overflow,
      headerOverflow: headerTextStyle?.overflow ?? null,
      headerTextOverflow: headerTextStyle?.textOverflow ?? null,
      leakedButtonText: leakedTarget?.closest(".comins-table__component-button")?.textContent ?? null,
    };
  });

  expect(overflowMetrics.cellOverflow).toBe("hidden");
  expect(overflowMetrics.headerOverflow).toBe("hidden");
  expect(overflowMetrics.headerTextOverflow).toBe("ellipsis");
  expect(overflowMetrics.leakedButtonText).toBeNull();
  expect(diagnostics).toEqual([]);
});

test("body viewport keeps a single bottom border at max scroll @perf", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.goto("/performance/virtualization");
  await expect(page.getByTestId("body-proof-virtualization")).toHaveCount(0);

  const metrics = await page.getByTestId("data-table-viewport").evaluate((viewport) => {
    viewport.scrollTop = viewport.scrollHeight;
    const tableRoot = viewport.closest(".comins-table");
    const dataRows = Array.from(
      viewport.querySelectorAll<HTMLTableRowElement>(".comins-table__body-table tbody tr[data-comins-row-data-index]"),
    );
    const lastDataRow = dataRows.at(-1);
    const firstCell = lastDataRow?.querySelector<HTMLElement>(".comins-table__td");
    const rootStyle = tableRoot ? window.getComputedStyle(tableRoot) : null;
    const cellStyle = firstCell ? window.getComputedStyle(firstCell) : null;

    return {
      cellBorderBottomWidth: cellStyle?.borderBottomWidth ?? null,
      rootBottomDiff: tableRoot ? Math.abs(viewport.getBoundingClientRect().bottom - tableRoot.getBoundingClientRect().bottom) : Number.POSITIVE_INFINITY,
      rootBorderBottomWidth: rootStyle?.borderBottomWidth ?? null,
      scrollTop: viewport.scrollTop,
    };
  });

  expect(metrics.scrollTop).toBeGreaterThan(0);
  expect(metrics.rootBottomDiff).toBeLessThanOrEqual(2);
  expect(metrics.rootBorderBottomWidth).toBe("1px");
  expect(metrics.cellBorderBottomWidth).toBe("0px");
  expect(diagnostics).toEqual([]);
});

test("example controls stay in one horizontal row with overflow scrolling", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");

  await page.goto("/examples/crud");
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

test("docs sidebar keeps feature-specific route identities", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");

  await expect(page.getByRole("navigation", { name: "문서 메뉴" })).toBeVisible();
  await expect(page.getByRole("link", { exact: true, name: "Getting Started" })).toHaveAttribute("href", "/docs/getting-started");
  await expect(page.getByRole("link", { exact: true, name: "기본" })).toHaveCount(0);
  await expect(page.getByRole("link", { exact: true, name: "대용량 데이터 표시" })).toHaveCount(0);
  await expect(page.getByRole("link", { exact: true, name: "Virtualization" })).toHaveAttribute(
    "href",
    "/performance/virtualization",
  );
  await expect(page.getByRole("link", { exact: true, name: "Pagination" })).toHaveAttribute(
    "href",
    "/performance/pagination",
  );
  await expect(page.getByRole("link", { exact: true, name: "Infinite Scroll" })).toHaveAttribute(
    "href",
    "/performance/infinite-scroll",
  );
  await expect(page.getByRole("link", { exact: true, name: "Lazy Load" })).toHaveAttribute(
    "href",
    "/performance/lazy-load",
  );
  await expect(page.getByRole("link", { exact: true, name: "Context Menu 예제" })).toHaveAttribute(
    "href",
    "/examples/context-menu",
  );
  await expect(page.getByRole("link", { exact: true, name: "Header 그룹" })).toHaveAttribute(
    "href",
    "/examples/column-groups",
  );
  expect(diagnostics).toEqual([]);
});

test("table size menu demonstrates manual and parent sizing only", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.goto("/examples/size");

  await expect(page.getByTestId("feature-content")).toHaveAttribute("data-feature", "size");
  await expect(page.getByTestId("feature-option-heading").filter({ hasText: "테이블 사이즈" })).toBeVisible();
  await expect(page.getByTestId("feature-option-heading").filter({ hasText: "브라우저 100%" })).toHaveCount(0);
  await expect(page.getByText("브라우저 100%")).toHaveCount(0);
  await expect(page.getByTestId("size-case-manual")).toBeVisible();
  await expect(page.getByTestId("size-case-parent")).toBeVisible();
  await expect(page.getByTestId("size-case-responsive")).toHaveCount(0);
  await expect(page.getByTestId("data-table-size-responsive")).toHaveCount(0);

  const manualBox = await page.getByTestId("size-case-manual").boundingBox();
  const parentBox = await page.getByTestId("size-case-parent").boundingBox();
  const manualTableBox = await page
    .getByTestId("data-table-size-manual")
    .locator("xpath=ancestor::div[contains(concat(' ', normalize-space(@class), ' '), ' comins-table ')][1]")
    .boundingBox();
  const parentTableBox = await page
    .getByTestId("data-table-size-parent")
    .locator("xpath=ancestor::div[contains(concat(' ', normalize-space(@class), ' '), ' comins-table ')][1]")
    .boundingBox();
  expect(manualBox).not.toBeNull();
  expect(parentBox).not.toBeNull();
  expect(manualTableBox).not.toBeNull();
  expect(parentTableBox).not.toBeNull();
  expect(Math.round(manualBox!.height)).toBe(300);
  expect(Math.round(parentBox!.height)).toBe(500);
  expect(Math.abs(manualTableBox!.height - manualBox!.height)).toBeLessThanOrEqual(2);
  expect(Math.abs(parentTableBox!.height - parentBox!.height)).toBeLessThanOrEqual(2);
  expect(diagnostics).toEqual([]);
});

test("single column group live sample uses the full available card width", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.setViewportSize({ height: 760, width: 1280 });
  await page.goto("/examples/column-groups");

  const sampleMetrics = await page.getByTestId("column-group-dynamic-columns").evaluate((element) => {
    const sample = element.querySelector<HTMLElement>("[data-testid='feature-option-sample']");
    const grid = element.querySelector<HTMLElement>("[data-testid='dynamic-group-table']");
    const table = element.querySelector<HTMLElement>("[data-testid='dynamic-group-viewport']")?.closest<HTMLElement>(".comins-table");
    const sampleRect = sample?.getBoundingClientRect();
    const gridRect = grid?.getBoundingClientRect();
    const tableRect = table?.getBoundingClientRect();

    return {
      gridWidth: gridRect?.width ?? 0,
      sampleWidth: sampleRect?.width ?? 0,
      tableWidth: tableRect?.width ?? 0,
    };
  });

  expect(sampleMetrics.sampleWidth).toBeGreaterThan(0);
  expect(Math.abs(sampleMetrics.gridWidth - sampleMetrics.sampleWidth)).toBeLessThanOrEqual(2);
  expect(Math.abs(sampleMetrics.tableWidth - sampleMetrics.sampleWidth)).toBeLessThanOrEqual(2);
  expect(diagnostics).toEqual([]);
});
