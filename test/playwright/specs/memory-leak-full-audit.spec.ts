import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { expect, test, type ConsoleMessage, type Page, type TestInfo } from "@playwright/test";

test.describe.configure({ mode: "serial" });

type DevtoolsAuditSnapshot = {
  documents: number;
  jsEventListeners: number;
  jsHeapUsedSize: number;
  liveElementCount: number;
  nodes: number;
  renderedRows: number;
  step: string;
  timestamp: string;
};

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

async function readDevtoolsAuditSnapshot(page: Page, step: string): Promise<DevtoolsAuditSnapshot> {
  const session = await page.context().newCDPSession(page);

  await session.send("HeapProfiler.enable");
  await session.send("HeapProfiler.collectGarbage");
  await session.send("HeapProfiler.collectGarbage");
  await session.send("Performance.enable");
  const [{ documents, jsEventListeners, nodes }, metrics] = await Promise.all([
    session.send("Memory.getDOMCounters"),
    session.send("Performance.getMetrics"),
  ]);
  await session.detach();
  await page.waitForTimeout(100);

  const values = new Map(metrics.metrics.map((metric) => [metric.name, metric.value]));
  const domMetrics = await page.evaluate(() => ({
    liveElementCount: document.querySelectorAll("*").length,
    renderedRows: document.querySelectorAll(".kmsf-data-table__body-table tbody tr[data-kmsf-row-data-index]").length,
    timestamp: new Date().toISOString(),
  }));

  return {
    documents,
    jsEventListeners,
    jsHeapUsedSize: values.get("JSHeapUsedSize") ?? 0,
    liveElementCount: domMetrics.liveElementCount,
    nodes,
    renderedRows: domMetrics.renderedRows,
    step,
    timestamp: domMetrics.timestamp,
  };
}

async function expectBasicFeature(page: Page) {
  await expect(page.getByTestId("feature-content")).toHaveAttribute("data-feature", "basic");
  await expect(page.getByTestId("data-table-viewport")).toBeVisible();
}

async function openBasicPage(page: Page) {
  await page.goto("/");
  await expectBasicFeature(page);
}

async function returnToBasic(page: Page) {
  await page.getByRole("button", { exact: true, name: "기본" }).click();
  await expectBasicFeature(page);
}

async function openFeature(page: Page, label: string, featureId: string) {
  await page.getByRole("button", { exact: true, name: label }).click();
  await expect(page.getByTestId("feature-content")).toHaveAttribute("data-feature", featureId);
}

async function warmMemoryBaseline(page: Page) {
  const sequence = [
    ["CRUD 동작", "basic-crud"],
    ["테이블 사이즈", "size"],
    ["Header 예제", "header"],
    ["대용량 데이터 표시", "body"],
    ["Td Cell 예제", "cell"],
    ["컴포넌트 예제", "component"],
    ["Tr Row 예제", "row"],
    ["Context Menu 예제", "context-menu"],
  ] as const;

  for (const [label, featureId] of sequence) {
    await openFeature(page, label, featureId);
  }

  await returnToBasic(page);
}

function assertRecoveredWithinTenPercent(
  scenario: string,
  baseline: DevtoolsAuditSnapshot,
  afterBasic: DevtoolsAuditSnapshot,
) {
  const failureContext = JSON.stringify({ afterBasic, baseline, scenario }, null, 2);

  expect(afterBasic.nodes, failureContext).toBeLessThanOrEqual(Math.ceil(baseline.nodes * 1.1));
  expect(afterBasic.jsEventListeners, failureContext).toBeLessThanOrEqual(
    Math.ceil(baseline.jsEventListeners * 1.1),
  );
  expect(afterBasic.jsHeapUsedSize, failureContext).toBeLessThanOrEqual(Math.ceil(baseline.jsHeapUsedSize * 1.1));
  expect(afterBasic.documents, failureContext).toBe(baseline.documents);
}

async function writeAuditArtifact(
  testInfo: TestInfo,
  scenario: string,
  baseline: DevtoolsAuditSnapshot,
  afterBasic: DevtoolsAuditSnapshot,
) {
  const artifactsDir = path.join(process.cwd(), "reports", "artifacts");
  const safeScenario = scenario.replace(/[^a-z0-9-]+/giu, "-").replace(/^-|-$/gu, "");
  const artifactPath = path.join(artifactsDir, `memory-leak-full-audit-${safeScenario}.json`);
  const payload = {
    afterBasic,
    baseline,
    scenario,
    testTitle: testInfo.title,
    threshold: {
      documents: baseline.documents,
      jsEventListeners: Math.ceil(baseline.jsEventListeners * 1.1),
      jsHeapUsedSize: Math.ceil(baseline.jsHeapUsedSize * 1.1),
      nodes: Math.ceil(baseline.nodes * 1.1),
    },
  };

  await mkdir(artifactsDir, { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function runMemoryScenario(
  page: Page,
  testInfo: TestInfo,
  scenario: string,
  exercise: (page: Page) => Promise<void>,
) {
  test.setTimeout(90_000);
  const diagnostics = collectBrowserDiagnostics(page);

  await openBasicPage(page);
  await warmMemoryBaseline(page);
  const baseline = await readDevtoolsAuditSnapshot(page, `${scenario}:initial-basic`);

  await exercise(page);
  await returnToBasic(page);
  const afterBasic = await readDevtoolsAuditSnapshot(page, `${scenario}:after-basic`);

  await writeAuditArtifact(testInfo, scenario, baseline, afterBasic);
  assertRecoveredWithinTenPercent(scenario, baseline, afterBasic);
  expect(diagnostics).toEqual([]);
}

async function dragVirtualScrollbar(page: Page, direction: "down" | "up") {
  await page.getByTestId("data-table-viewport").evaluate(
    async (element, scrollDirection) => {
      const start = element.scrollTop;
      const end = scrollDirection === "down" ? element.scrollHeight : 0;
      const steps = 60;

      for (let step = 1; step <= steps; step += 1) {
        element.scrollTop = start + ((end - start) * step) / steps;
        element.dispatchEvent(new Event("scroll", { bubbles: true }));

        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
      }
    },
    direction,
  );
}

test("full audit keeps 100000 row virtual scroll counters within 10 percent @perf", async ({ page }, testInfo) => {
  await runMemoryScenario(page, testInfo, "100000-row-virtual-scroll", async (currentPage) => {
    await openFeature(currentPage, "대용량 데이터 표시", "body");
    await currentPage.getByRole("button", { name: "10만 행 로드" }).click();
    const viewport = currentPage.getByTestId("data-table-viewport");

    await expect.poll(() => viewport.evaluate((element) => element.scrollHeight)).toBeGreaterThan(100_000);
    await viewport.hover();
    await currentPage.mouse.wheel(0, 2400);
    await dragVirtualScrollbar(currentPage, "down");
    await expect
      .poll(() =>
        viewport.evaluate((element) => {
          const rows = Array.from(
            element.querySelectorAll<HTMLTableRowElement>(
              ".kmsf-data-table__body-table tbody tr[data-kmsf-row-data-index]",
            ),
          );
          const last = rows[rows.length - 1];

          return Number(last?.getAttribute("data-kmsf-row-data-index") ?? "-1");
        }),
      )
      .toBeGreaterThan(99_900);

    await currentPage.mouse.wheel(0, -2400);
    await dragVirtualScrollbar(currentPage, "up");
    await expect
      .poll(() =>
        viewport.evaluate((element) => {
          const rows = Array.from(
            element.querySelectorAll<HTMLTableRowElement>(
              ".kmsf-data-table__body-table tbody tr[data-kmsf-row-data-index]",
            ),
          );
          const first = rows[0];

          return Number(first?.getAttribute("data-kmsf-row-data-index") ?? "-1");
        }),
      )
      .toBeLessThan(100);
  });
});

test("full audit keeps component column counters within 10 percent @perf", async ({ page }, testInfo) => {
  await runMemoryScenario(page, testInfo, "component-columns", async (currentPage) => {
    await openFeature(currentPage, "컴포넌트 예제", "component");

    const inputExample = currentPage.getByTestId("component-example-input");
    await inputExample.getByTestId("row-input-a").click();
    const cellInput = inputExample.locator("tbody .kmsf-data-table__component-input").first();
    await expect(cellInput).toBeVisible();
    await cellInput.fill("Alpha Audit");
    await cellInput.press("Enter");

    const selectExample = currentPage.getByTestId("component-example-select");
    await selectExample.getByTestId("row-select-a").click();
    const select = selectExample.locator("tbody .kmsf-data-table__component-select").first();
    await expect(select).toBeVisible();
    await select.selectOption("Viewer");

    const menuExample = currentPage.getByTestId("component-example-menu");
    const menuTrigger = menuExample.locator(".kmsf-data-table__component-menu-trigger").first();
    await menuTrigger.scrollIntoViewIfNeeded();
    await menuTrigger.click();
    await expect(currentPage.getByRole("menu", { name: "Header menu" })).toBeVisible();
    await currentPage.getByRole("menuitem", { name: "상태 확인" }).click();
    await expect(currentPage.getByRole("menu", { name: "Header menu" })).toHaveCount(0);

    const moreList = currentPage.getByTestId("virtual-list-virtual-list-more-a-virtual-list-more-component");
    const moreButton = currentPage.getByTestId("virtual-list-overflow-virtual-list-more-a-virtual-list-more-component");
    await currentPage.getByTestId("cell-virtual-list-more-a-id").click();
    await moreButton.click();
    await expect(moreList).toHaveAttribute("data-kmsf-virtual-list-expanded", "true");
    await moreList.locator(".kmsf-data-table__component-virtual-list-items").evaluate((element) => {
      element.scrollTop = element.scrollHeight;
      element.dispatchEvent(new Event("scroll", { bubbles: true }));
    });

    await currentPage.getByTestId("cell-virtual-list-search-a-id").click();
    const search = currentPage.getByTestId("virtual-list-search-virtual-list-search-a-virtual-list-search-component");
    await expect(search).toBeEnabled();
    await search.fill("검색-9999");
    await expect(currentPage.getByText("검색-9999").first()).toBeVisible();
  });
});

test("full audit keeps context menu counters within 10 percent @perf", async ({ page }, testInfo) => {
  await runMemoryScenario(page, testInfo, "context-menu", async (currentPage) => {
    await openFeature(currentPage, "Context Menu 예제", "context-menu");

    await currentPage.getByTestId("row-a").click({ button: "right" });
    await expect(currentPage.getByRole("menu", { name: "데이터 테이블 컨텍스트 메뉴" })).toBeVisible();
    await currentPage.getByRole("menuitem", { name: "행 데이터 보기" }).click();
    await currentPage.getByTestId("cell-a-name").click({ button: "right" });
    await expect(currentPage.getByRole("menuitem", { name: "셀 데이터 보기" })).toBeVisible();
    await currentPage.getByRole("menuitem", { name: "셀 데이터 보기" }).click();
    await currentPage.getByRole("button", { name: "Cell 컨텍스트 비활성화" }).click();
    await currentPage.getByTestId("cell-b-name").click({ button: "right" });
    await expect(currentPage.getByRole("menuitem", { name: "행 데이터 보기" })).toBeVisible();
  });
});

test("full audit keeps header row cell and size counters within 10 percent @perf", async ({ page }, testInfo) => {
  await runMemoryScenario(page, testInfo, "header-row-cell-size", async (currentPage) => {
    await openFeature(currentPage, "Header 예제", "header");
    const basicHeaderExample = currentPage.getByTestId("header-example-basic");
    const ageHeader = basicHeaderExample.getByTestId("header-age");
    const nameHeader = basicHeaderExample.getByTestId("header-name");
    await ageHeader.click();
    const ageBox = await ageHeader.boundingBox();
    const nameBox = await nameHeader.boundingBox();
    expect(ageBox).not.toBeNull();
    expect(nameBox).not.toBeNull();
    await currentPage.mouse.move(ageBox!.x + ageBox!.width / 2, ageBox!.y + ageBox!.height / 2);
    await currentPage.mouse.down();
    await currentPage.waitForTimeout(1100);
    await currentPage.mouse.move(nameBox!.x + nameBox!.width / 2, nameBox!.y + nameBox!.height / 2);
    await currentPage.mouse.up();

    await openFeature(currentPage, "Tr Row 예제", "row");
    const sourceBox = await currentPage.getByTestId("row-drag-handle-c").boundingBox();
    const targetBox = await currentPage.getByTestId("row-a").boundingBox();
    expect(sourceBox).not.toBeNull();
    expect(targetBox).not.toBeNull();
    await currentPage.mouse.move(sourceBox!.x + 4, sourceBox!.y + 4);
    await currentPage.mouse.down();
    await currentPage.mouse.move(targetBox!.x + 12, targetBox!.y + 8, { steps: 8 });
    await currentPage.mouse.up();

    await openFeature(currentPage, "Td Cell 예제", "cell");
    await currentPage.getByTestId("cell-a-name").click();
    await currentPage.getByTestId("cell-b-name").click({ button: "right" });
    await currentPage.getByTestId("cell-a-name").hover();
    await currentPage.mouse.down();
    await currentPage.getByTestId("cell-b-age").hover();
    await currentPage.mouse.up();

    await openFeature(currentPage, "테이블 사이즈", "size");
    for (const tableId of ["data-table-size-manual", "data-table-size-parent", "data-table-size-responsive"]) {
      await currentPage.getByTestId(tableId).evaluate((element) => {
        element.scrollTop = element.scrollHeight;
        element.dispatchEvent(new Event("scroll", { bubbles: true }));
      });
    }
  });
});

test("full audit keeps feature lifecycle counters within 10 percent @perf", async ({ page }, testInfo) => {
  await runMemoryScenario(page, testInfo, "feature-lifecycle", async (currentPage) => {
    const sequence = [
      ["CRUD 동작", "basic-crud"],
      ["테이블 사이즈", "size"],
      ["Header 예제", "header"],
      ["대용량 데이터 표시", "body"],
      ["Td Cell 예제", "cell"],
      ["컴포넌트 예제", "component"],
      ["Tr Row 예제", "row"],
      ["Context Menu 예제", "context-menu"],
    ] as const;

    for (let round = 0; round < 5; round += 1) {
      for (const [label, featureId] of sequence) {
        await openFeature(currentPage, label, featureId);
      }
    }

    await expect.poll(() => currentPage.evaluate(() => window.__kmsfDataTableLifecycle?.activeMountCount ?? 0)).toBe(1);
  });
});
