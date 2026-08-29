import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { expect, test, type ConsoleMessage, type Page, type TestInfo } from "@playwright/test";

import { initializePlaygroundLocale } from "../helpers/playground-locale";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => initializePlaygroundLocale(page, "en"));

type DevtoolsAuditSnapshot = {
  documents: number;
  jsEventListeners: number;
  jsHeapUsedSize: number;
  liveElementCount: number;
  nodes: number;
  observedDetailTargets: number;
  renderedRows: number;
  step: string;
  timestamp: string;
};

type MemoryScenarioEvidence = {
  final?: DevtoolsAuditSnapshot;
  intermediate?: DevtoolsAuditSnapshot[];
};

type MemoryScenarioExercise = (page: Page) => Promise<MemoryScenarioEvidence | void>;

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
    observedDetailTargets:
      (window as typeof window & { __cominsObservedDetailTargets?: number })
        .__cominsObservedDetailTargets ?? 0,
    renderedRows: document.querySelectorAll(".comins-table__body-table tbody tr[data-comins-row-data-index]").length,
    timestamp: new Date().toISOString(),
  }));

  return {
    documents,
    jsEventListeners,
    jsHeapUsedSize: values.get("JSHeapUsedSize") ?? 0,
    liveElementCount: domMetrics.liveElementCount,
    nodes,
    observedDetailTargets: domMetrics.observedDetailTargets,
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
  await page.getByRole("link", { exact: true, name: "Getting Started" }).click();
  await expectBasicFeature(page);
}

async function openFeature(page: Page, label: string, featureId: string) {
  await page.getByRole("link", { exact: true, name: label }).click();
  await expect(page.getByTestId("feature-content")).toHaveAttribute("data-feature", featureId);
}

const memoryFeatureSequence = [
  ["CRUD", "basic-crud"],
  ["Sizing", "size"],
  ["Theme", "theme"],
  ["Header Basics", "header"],
  ["Virtualization", "body"],
  ["Cells", "cell"],
  ["Components", "component"],
  ["Rows", "row"],
  ["Context Menu", "context-menu"],
  ["Selection & Clipboard", "selection-clipboard"],
  ["Ref API", "ref-api"],
] as const;

async function exerciseFeatureLifecycle(page: Page, rounds = 1) {
  for (let round = 0; round < rounds; round += 1) {
    for (const [label, featureId] of memoryFeatureSequence) {
      await openFeature(page, label, featureId);
    }
  }
}

async function warmMemoryBaseline(page: Page) {
  await exerciseFeatureLifecycle(page);
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
  expect(afterBasic.observedDetailTargets, failureContext).toBe(
    baseline.observedDetailTargets,
  );
}

async function writeAuditArtifact(
  testInfo: TestInfo,
  scenario: string,
  baseline: DevtoolsAuditSnapshot,
  afterBasic: DevtoolsAuditSnapshot,
  evidence?: MemoryScenarioEvidence,
) {
  const artifactsDir = path.join(process.cwd(), "reports", "artifacts");
  const safeScenario = scenario.replace(/[^a-z0-9-]+/giu, "-").replace(/^-|-$/gu, "");
  const artifactPath = path.join(artifactsDir, `memory-leak-full-audit-${safeScenario}.json`);
  const payload = {
    afterBasic,
    baseline,
    ...evidence,
    scenario,
    testTitle: testInfo.title,
    threshold: {
      documents: baseline.documents,
      jsEventListeners: Math.ceil(baseline.jsEventListeners * 1.1),
      jsHeapUsedSize: Math.ceil(baseline.jsHeapUsedSize * 1.1),
      nodes: Math.ceil(baseline.nodes * 1.1),
      observedDetailTargets: baseline.observedDetailTargets,
    },
  };

  await mkdir(artifactsDir, { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function runMemoryScenario(
  page: Page,
  testInfo: TestInfo,
  scenario: string,
  exercise: MemoryScenarioExercise,
  timeout = 90_000,
  warmup?: MemoryScenarioExercise,
) {
  test.setTimeout(timeout);
  const diagnostics = collectBrowserDiagnostics(page);

  await openBasicPage(page);
  await warmMemoryBaseline(page);
  if (warmup) {
    await warmup(page);
    await returnToBasic(page);
  }
  const baseline = await readDevtoolsAuditSnapshot(page, `${scenario}:initial-basic`);

  const evidence = await exercise(page);
  await returnToBasic(page);
  const afterBasic = await readDevtoolsAuditSnapshot(page, `${scenario}:after-basic`);

  await writeAuditArtifact(testInfo, scenario, baseline, afterBasic, evidence);
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

async function exerciseVirtualScroll(currentPage: Page) {
  await openFeature(currentPage, "Virtualization", "body");
  await expect(currentPage.getByRole("button", { name: "10만 행 로드" })).toHaveCount(0);
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
            ".comins-table__body-table tbody tr[data-comins-row-data-index]",
          ),
        );
        const last = rows[rows.length - 1];

        return Number(last?.getAttribute("data-comins-row-data-index") ?? "-1");
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
            ".comins-table__body-table tbody tr[data-comins-row-data-index]",
          ),
        );
        const first = rows[0];

        return Number(first?.getAttribute("data-comins-row-data-index") ?? "-1");
      }),
    )
    .toBeLessThan(100);
}

test("full audit keeps 100000 row virtual scroll counters within 10 percent @perf", async ({ page }, testInfo) => {
  await runMemoryScenario(
    page,
    testInfo,
    "100000-row-virtual-scroll",
    exerciseVirtualScroll,
    90_000,
    exerciseVirtualScroll,
  );
});

test("full audit releases Row Expand Detail observers and counters within 10 percent @perf", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    const NativeResizeObserver = window.ResizeObserver;
    const observedDetailTargets = new Set<Element>();
    const updateCount = () => {
      (
        window as typeof window & {
          __cominsObservedDetailTargets?: number;
        }
      ).__cominsObservedDetailTargets = observedDetailTargets.size;
    };

    window.ResizeObserver = class extends NativeResizeObserver {
      readonly detailTargets = new Set<Element>();

      override disconnect() {
        for (const target of this.detailTargets) {
          observedDetailTargets.delete(target);
        }
        this.detailTargets.clear();
        updateCount();
        super.disconnect();
      }

      override observe(target: Element, options?: ResizeObserverOptions) {
        if (target.classList.contains("comins-table__detail-content")) {
          this.detailTargets.add(target);
          observedDetailTargets.add(target);
          updateCount();
        }
        super.observe(target, options);
      }

      override unobserve(target: Element) {
        this.detailTargets.delete(target);
        observedDetailTargets.delete(target);
        updateCount();
        super.unobserve(target);
      }
    };
    updateCount();
  });

  await runMemoryScenario(page, testInfo, "row-expand-detail-lifecycle", async (currentPage) => {
    await openFeature(currentPage, "Row Expand", "row-expand");
    const documentToken = await currentPage.evaluate(() => {
      const scope = window as typeof window & {
        __cominsRowExpandAuditDocumentToken?: string;
      };

      scope.__cominsRowExpandAuditDocumentToken ??= crypto.randomUUID();
      return scope.__cominsRowExpandAuditDocumentToken;
    });
    const intermediate: DevtoolsAuditSnapshot[] = [];

    for (let cycle = 0; cycle < 10; cycle += 1) {
      expect(
        await currentPage.evaluate(
          () =>
            (
              window as typeof window & {
                __cominsRowExpandAuditDocumentToken?: string;
              }
            ).__cominsRowExpandAuditDocumentToken ?? null,
        ),
      ).toBe(documentToken);

      const fixed = currentPage.getByTestId("row-expand-example-fixed");
      const automaticCard = currentPage.locator(
        "[data-feature-option='row-expand-auto']",
      );
      const automatic = currentPage.getByTestId("row-expand-example-auto");

      await fixed.getByTestId("row-detail-toggle-fixed-1").click();
      await expect(fixed.locator("[data-detail-for='fixed-1']")).toBeVisible();

      await automatic.scrollIntoViewIfNeeded();
      await automatic.getByTestId("row-detail-toggle-auto-1").click();
      await expect(
        automatic.locator("[data-detail-for='auto-1']"),
      ).toBeVisible();
      const grow = automatic.getByTestId("auto-detail-grow-auto-1");

      if (await grow.isEnabled()) {
        await grow.click();
      }
      await expect(
        automatic.getByTestId("auto-detail-grown-content"),
      ).toBeVisible();

      const detail = automatic.getByTestId("row-detail-content-auto-1");
      const detailWidthBefore = (await detail.boundingBox())!.width;
      const resize = automaticCard.getByTestId("resize-name");
      const resizeBox = await resize.boundingBox();
      const resizeDelta = cycle % 2 === 0 ? 40 : -40;

      expect(resizeBox).not.toBeNull();
      await currentPage.mouse.move(
        resizeBox!.x + resizeBox!.width / 2,
        resizeBox!.y + resizeBox!.height / 2,
      );
      await currentPage.mouse.down();
      await currentPage.mouse.move(
        resizeBox!.x + resizeBox!.width / 2 + resizeDelta,
        resizeBox!.y + resizeBox!.height / 2,
      );
      await currentPage.mouse.up();
      await expect
        .poll(async () =>
          Math.abs(((await detail.boundingBox())?.width ?? 0) - detailWidthBefore),
        )
        .toBeGreaterThan(20);

      await automatic.getByTestId("row-detail-toggle-auto-1").click();
      await fixed.getByTestId("row-detail-toggle-fixed-1").click();
      await expect(automatic.locator("[data-detail-for]")).toHaveCount(0);
      await expect(fixed.locator("[data-detail-for]")).toHaveCount(0);
      await expect
        .poll(() =>
          currentPage.evaluate(
            () =>
              (
                window as typeof window & {
                  __cominsObservedDetailTargets?: number;
                }
              ).__cominsObservedDetailTargets ?? 0,
          ),
        )
        .toBe(0);

      const snapshot = await readDevtoolsAuditSnapshot(
        currentPage,
        `row-expand-detail-lifecycle:cycle-${cycle + 1}`,
      );

      expect(snapshot.observedDetailTargets).toBe(0);
      intermediate.push(snapshot);
    }

    const final = await readDevtoolsAuditSnapshot(
      currentPage,
      "row-expand-detail-lifecycle:final-row-expand",
    );

    expect(final.observedDetailTargets).toBe(0);
    return { final, intermediate };
  }, 120_000);
});

async function exerciseComponentColumns(currentPage: Page) {
  await openFeature(currentPage, "Components", "component");

  const inputExample = currentPage.getByTestId("component-example-input");
  await inputExample.getByTestId("row-input-a").click();
  const cellInput = inputExample.locator("tbody .comins-table__component-input").first();
  await expect(cellInput).toBeVisible();
  await cellInput.fill("Data Audit");
  await cellInput.press("Enter");

  const selectExample = currentPage.getByTestId("component-example-select");
  await selectExample.getByTestId("row-select-a").click();
  const select = selectExample.locator("tbody .comins-table__component-select").first();
  await expect(select).toBeVisible();
  await select.selectOption("Viewer");

  const menuExample = currentPage.getByTestId("component-example-menu");
  const menuTrigger = menuExample.locator(".comins-table__component-menu-trigger").first();
  await menuTrigger.scrollIntoViewIfNeeded();
  await menuTrigger.click();
  await expect(currentPage.getByRole("menu", { name: "Header menu" })).toBeVisible();
  await currentPage.getByRole("menuitem", { name: "Check status" }).click();
  await expect(currentPage.getByRole("menu", { name: "Header menu" })).toHaveCount(0);

  const moreList = currentPage.getByTestId("virtual-list-virtual-list-more-a-virtual-list-more-component");
  const moreButton = currentPage.getByTestId("virtual-list-overflow-virtual-list-more-a-virtual-list-more-component");
  await currentPage.getByTestId("cell-virtual-list-more-a-id").click();
  await moreButton.click();
  await expect(moreList).toHaveAttribute("data-comins-virtual-list-expanded", "true");
  await moreList.locator(".comins-table__component-virtual-list-items").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });

  await currentPage.getByTestId("cell-virtual-list-search-a-id").click();
  const search = currentPage.getByTestId("virtual-list-search-virtual-list-search-a-virtual-list-search-component");
  await expect(search).toBeEnabled();
  await search.fill("검색-9999");
  await expect(currentPage.getByText("검색-9999").first()).toBeVisible();
}

test("full audit keeps component column counters within 10 percent @perf", async ({ page }, testInfo) => {
  await runMemoryScenario(page, testInfo, "component-columns", async (currentPage) => {
    for (let cycle = 0; cycle < 3; cycle += 1) {
      await exerciseComponentColumns(currentPage);
      if (cycle < 2) await returnToBasic(currentPage);
    }
  }, 90_000, exerciseComponentColumns);
});

test("full audit keeps context menu counters within 10 percent @perf", async ({ page }, testInfo) => {
  await runMemoryScenario(page, testInfo, "context-menu", async (currentPage) => {
    await openFeature(currentPage, "Context Menu", "context-menu");

    await currentPage.getByTestId("row-a").click({ button: "right" });
    await expect(currentPage.getByRole("menu", { name: "Data table context menu" })).toBeVisible();
    await currentPage.getByRole("menuitem", { name: "View" }).click();
    await currentPage.getByTestId("cell-a-name").click({ button: "right" });
    await expect(currentPage.getByRole("menuitem", { name: "View" })).toBeVisible();
    await currentPage.getByRole("menuitem", { name: "View" }).click();
    await currentPage.getByTestId("cell-b-name").click({ button: "right" });
    await expect(currentPage.getByRole("menuitem", { name: "View" })).toBeVisible();
  });
});

test("full audit keeps header row cell and size counters within 10 percent @perf", async ({ page }, testInfo) => {
  await runMemoryScenario(page, testInfo, "header-row-cell-size", async (currentPage) => {
    await openFeature(currentPage, "Header Basics", "header");
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
    await currentPage.mouse.move(ageBox!.x + ageBox!.width / 2 + 6, ageBox!.y + ageBox!.height / 2);
    await expect(ageHeader).toHaveAttribute("data-column-placeholder", "true");
    await currentPage.mouse.move(nameBox!.x + nameBox!.width / 2, nameBox!.y + nameBox!.height / 2);
    await currentPage.mouse.up();

    await openFeature(currentPage, "Rows", "row");
    const rowBasicExample = currentPage.getByTestId("row-example-basic");
    const sourceBox = await rowBasicExample.getByTestId("row-drag-handle-c").boundingBox();
    const targetBox = await rowBasicExample.getByTestId("row-a").boundingBox();
    expect(sourceBox).not.toBeNull();
    expect(targetBox).not.toBeNull();
    await currentPage.mouse.move(sourceBox!.x + 4, sourceBox!.y + 4);
    await currentPage.mouse.down();
    await currentPage.mouse.move(targetBox!.x + 12, targetBox!.y + 8, { steps: 8 });
    await currentPage.mouse.up();

    await openFeature(currentPage, "Cells", "cell");
    await currentPage.getByTestId("cell-a-name").click();
    await currentPage.getByTestId("cell-b-name").click({ button: "right" });
    await currentPage.getByTestId("cell-a-name").hover();
    await currentPage.mouse.down();
    await currentPage.getByTestId("cell-b-age").hover();
    await currentPage.mouse.up();

    await openFeature(currentPage, "Sizing", "size");
    for (const tableId of ["data-table-size-manual", "data-table-size-parent"]) {
      await currentPage.getByTestId(tableId).evaluate((element) => {
        element.scrollTop = element.scrollHeight;
        element.dispatchEvent(new Event("scroll", { bubbles: true }));
      });
    }
  });
});

test("full audit keeps feature lifecycle counters within 10 percent @perf", async ({ page }, testInfo) => {
  const exercise = async (currentPage: Page) => {
    await exerciseFeatureLifecycle(currentPage, 5);

    await expect.poll(() => currentPage.evaluate(() => window.__cominsTableLifecycle?.activeMountCount ?? 0)).toBe(1);
  };

  await runMemoryScenario(page, testInfo, "feature-lifecycle", exercise, 90_000, exercise);
});
