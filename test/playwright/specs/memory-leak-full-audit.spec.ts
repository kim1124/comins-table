import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { expect, test, type ConsoleMessage, type Page, type TestInfo } from "@playwright/test";

import { assessNumericBudget } from "../helpers/memory-verdict";
import { findMemoryThresholdFailures } from "../helpers/memory-growth";

import { initializeMemoryInstrumentation } from "../helpers/memory-instrumentation";
import { initializePlaygroundLocale } from "../helpers/playground-locale";

test.describe.configure({ mode: "default" });

test.beforeEach(async ({ page }) => initializePlaygroundLocale(page, "en"));

type DevtoolsAuditSnapshot = {
  documents: number;
  jsEventListeners: number;
  jsHeapUsedSize: number;
  liveElementCount: number;
  nodes: number;
  observedDetailTargets: number | null;
  renderedRows: number;
  step: string;
  timestamp: string;
};

type MemoryScenarioEvidence = {
  final?: DevtoolsAuditSnapshot;
  intermediateBaseline?: DevtoolsAuditSnapshot;
  intermediate?: DevtoolsAuditSnapshot[];
  preparation?: unknown;
  comparisonStates?: unknown;
  tooling?: { before: DevtoolsAuditSnapshot; after: DevtoolsAuditSnapshot };
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
        .__cominsObservedDetailTargets ?? null,
    renderedRows: document.querySelectorAll(".comins-table__body-table tbody tr[data-comins-row-data-index]").length,
    timestamp: new Date().toISOString(),
  }));

  const heap = values.get("JSHeapUsedSize");
  if (heap === undefined) throw new Error("JSHeapUsedSize unavailable");
  return {
    documents,
    jsEventListeners,
    jsHeapUsedSize: heap,
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

function assertCountersWithinTwoPercent(
  scenario: string,
  baseline: DevtoolsAuditSnapshot,
  afterBasic: DevtoolsAuditSnapshot,
) {
  const points = [baseline, afterBasic].map(({ step, nodes, jsEventListeners, jsHeapUsedSize }) => ({
    step, metrics: { nodes, jsEventListeners, jsHeapUsedSize },
  }));
  const growth = findMemoryThresholdFailures(points);
  expect(growth, JSON.stringify({ scenario, baseline, afterBasic, growth }, null, 2)).toEqual([]);
}

async function writeAuditArtifact(
  testInfo: TestInfo,
  scenario: string,
  baseline: DevtoolsAuditSnapshot,
  afterBasic: DevtoolsAuditSnapshot,
  evidence: MemoryScenarioEvidence,
  browserErrors: boolean,
) {
  const artifactsDir = process.env.MEMORY_AUDIT_ARTIFACT_DIR ?? path.join(process.cwd(), "reports", "artifacts");
  const safeScenario = scenario.replace(/[^a-z0-9-]+/giu, "-").replace(/^-|-$/gu, "");
  const artifactPath = path.join(artifactsDir, `memory-leak-full-audit-${safeScenario}.json`);
  const toPoint = ({ step, nodes, jsEventListeners, jsHeapUsedSize }: DevtoolsAuditSnapshot) => ({ step, metrics: { nodes, jsEventListeners, jsHeapUsedSize } });
  const budgets = [assessNumericBudget([baseline, afterBasic].map(toPoint), "counter")];
  if (evidence.intermediate?.length) {
    budgets.push(assessNumericBudget(evidence.intermediateBaseline ? [evidence.intermediateBaseline, ...evidence.intermediate].map(toPoint) : [], "counter"));
  }
  const numericStatus = budgets.some(item => item.status === "FAIL") ? "FAIL"
    : browserErrors || budgets.some(item => item.status !== "PASS") ? "INVALID" : "PASS";
  const payload = {
    numericStatus, numericBudgets: budgets, diagnostic: false, completed: !browserErrors, layer: "legacy", buildMode: "vite-development",
    afterBasic,
    baseline,
    ...evidence,
    scenario,
    testTitle: testInfo.title,
    contract: "devtools-three-counters-two-percent",
    coverage: "numeric feature regression only; sustained unmount and product attribution are separate",
    threshold: {
      jsEventListeners: baseline.jsEventListeners * 1.02,
      jsHeapUsedSize: baseline.jsHeapUsedSize * 1.02,
      nodes: baseline.nodes * 1.02,
    },
  };

  await mkdir(artifactsDir, { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await testInfo.attach("legacy-numeric-budget", { path: artifactPath, contentType: "application/json" });
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
  const toolingCold = await readDevtoolsAuditSnapshot(page, `${scenario}:cold-before-tooling`);
  await initializeMemoryInstrumentation(page);
  const toolingReady = await readDevtoolsAuditSnapshot(page, `${scenario}:cold-tooling-ready`);
  await warmMemoryBaseline(page);
  if (warmup) {
    await warmup(page);
    await returnToBasic(page);
  }
  const baseline = await readDevtoolsAuditSnapshot(page, `${scenario}:initial-basic`);

  const evidence = { ...((await exercise(page)) ?? {}), tooling: { before: toolingCold, after: toolingReady } };
  await returnToBasic(page);
  const afterBasic = await readDevtoolsAuditSnapshot(page, `${scenario}:after-basic`);

  await writeAuditArtifact(testInfo, scenario, baseline, afterBasic, evidence, diagnostics.length > 0);
  assertCountersWithinTwoPercent(scenario, baseline, afterBasic);
  if (evidence?.intermediate?.length) {
    if (!evidence.intermediateBaseline) throw new Error("Intermediate measurements require their own same-state baseline");
    const intermediate = [evidence.intermediateBaseline, ...evidence.intermediate].map(({ step, nodes, jsEventListeners, jsHeapUsedSize }) => ({ step, metrics: { nodes, jsEventListeners, jsHeapUsedSize } }));
    expect(findMemoryThresholdFailures(intermediate), "Intermediate growth over two percent must remain a failure").toEqual([]);
  }
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

test("full audit keeps 100000 row virtual scroll counters within two percent @perf @memory-legacy", async ({ page }, testInfo) => {
  await runMemoryScenario(
    page,
    testInfo,
    "100000-row-virtual-scroll",
    exerciseVirtualScroll,
    90_000,
    exerciseVirtualScroll,
  );
});

test("full audit releases Row Expand Detail observers and counters within two percent @perf @memory-legacy", async ({
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

  const exerciseRowDetails: MemoryScenarioExercise = async (currentPage) => {
    await openFeature(currentPage, "Row Expand", "row-expand");
    const documentToken = await currentPage.evaluate(() => {
      const scope = window as typeof window & {
        __cominsRowExpandAuditDocumentToken?: string;
      };

      scope.__cominsRowExpandAuditDocumentToken ??= crypto.randomUUID();
      return scope.__cominsRowExpandAuditDocumentToken;
    });
    const intermediate: DevtoolsAuditSnapshot[] = [];
    const fixed = currentPage.getByTestId("row-expand-example-fixed");
    const automaticCard = currentPage.locator("[data-feature-option='row-expand-auto']");
    const automatic = currentPage.getByTestId("row-expand-example-auto");
    const header = automaticCard.getByTestId("header-name");
    const resize = automaticCard.getByTestId("resize-name");
    const canonicalWidth = (await header.boundingBox())!.width;
    const resizeBy = async (delta: number) => {
      await resize.scrollIntoViewIfNeeded();
      const box = await resize.boundingBox(); expect(box).not.toBeNull();
      await currentPage.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
      await currentPage.mouse.down();
      await currentPage.mouse.move(box!.x + box!.width / 2 + delta, box!.y + box!.height / 2);
      await currentPage.mouse.up();
    };
    const restoreWidth = async () => {
      const width = (await header.boundingBox())!.width;
      if (width !== canonicalWidth) await resizeBy(canonicalWidth - width);
      await expect.poll(async () => (await header.boundingBox())?.width).toBe(canonicalWidth);
    };
    const readConditions = () => currentPage.evaluate(() => ({
      width: document.querySelector('[data-feature-option="row-expand-auto"] [data-testid="header-name"]')?.getBoundingClientRect().width,
      articleScroll: document.querySelector(".docs-shell__content")?.scrollTop,
      tableScroll: [...document.querySelectorAll<HTMLElement>('[data-testid^="row-expand-example-"]')].map(node => [node.scrollTop, node.scrollLeft]),
      focus: document.activeElement?.getAttribute("href"),
      focusTag: document.activeElement?.tagName,
      focusTestId: document.activeElement?.getAttribute("data-testid"),
      details: document.querySelectorAll("[data-detail-for]").length,
      selectedRows: document.querySelectorAll('[data-selected-row="true"]').length,
      selectionText: window.getSelection()?.toString(),
    }));
    const cold = await readDevtoolsAuditSnapshot(currentPage, "row-expand-detail-lifecycle:cold-before-preparation");
    // grown=true를 고정 상태로 삼되 최초 비동기 growth는 별도 증거와 전체 Basic 왕복 비용에 남긴다.
    await automatic.getByTestId("row-detail-toggle-auto-1").click();
    const initialGrow = automatic.getByTestId("auto-detail-grow-auto-1");
    await expect(initialGrow).toBeEnabled(); await initialGrow.click();
    await expect(automatic.getByTestId("auto-detail-grown-content")).toBeVisible();
    await expect(initialGrow).toBeDisabled();
    await automatic.getByTestId("row-detail-toggle-auto-1").click();
    // 최초 resize의 폭 projection도 준비 단계에 명시하여 각 체크포인트의 내부/표시 폭을 맞춘다.
    await resizeBy(1); await restoreWidth();
    const canonicalize = async () => {
      await expect(currentPage.locator("[data-detail-for]")).toHaveCount(0);
      await expect.poll(() => currentPage.evaluate(() => (window as typeof window & { __cominsObservedDetailTargets?: number }).__cominsObservedDetailTargets)).toBe(0);
      await restoreWidth();
      await currentPage.mouse.move(0, 0);
      await currentPage.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      await currentPage.evaluate(() => {
        const link = document.querySelector<HTMLAnchorElement>('.docs-sidebar a[href="/examples/row-expand"]');
        if (!link) throw new Error("Canonical focus target missing");
        link.focus({ preventScroll: true });
        for (const node of document.querySelectorAll<HTMLElement>('[data-testid^="row-expand-example-"],.docs-shell__content')) { node.scrollTop = 0; node.scrollLeft = 0; }
        document.scrollingElement?.scrollTo(0, 0);
      });
      await currentPage.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      await expect(currentPage.locator('.docs-sidebar a[href="/examples/row-expand"]')).toBeFocused();
    };
    await canonicalize();
    const baselineConditions = await readConditions();
    const comparisonStates = [];
    const intermediateBaseline = await readDevtoolsAuditSnapshot(currentPage, "row-expand-detail-lifecycle:baseline-row-expand");

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

      await fixed.getByTestId("row-detail-toggle-fixed-1").click();
      await expect(fixed.locator("[data-detail-for='fixed-1']")).toBeVisible();

      await automatic.scrollIntoViewIfNeeded();
      await automatic.getByTestId("row-detail-toggle-auto-1").click();
      await expect(
        automatic.locator("[data-detail-for='auto-1']"),
      ).toBeVisible();
      const grow = automatic.getByTestId("auto-detail-grow-auto-1");

      await expect(grow).toBeDisabled();
      await expect(
        automatic.getByTestId("auto-detail-grown-content"),
      ).toBeVisible();

      const detail = automatic.getByTestId("row-detail-content-auto-1");
      const detailWidthBefore = (await detail.boundingBox())!.width;
      const resizeBox = await resize.boundingBox();
      const resizeDelta = 40;

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

      // 펼친 상태에서 원래 폭으로 축소해 재측정까지 확인한 뒤 동일 상태로 닫는다.
      await restoreWidth();
      await expect.poll(async () => (await detail.boundingBox())?.width).toBe(detailWidthBefore);

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
              ).__cominsObservedDetailTargets ?? null,
          ),
        )
        .toBe(0);

      await canonicalize();
      const conditions = await readConditions();
      expect(conditions, "Memory checkpoints must have identical fixture, layout, focus and scroll state").toEqual(baselineConditions);
      comparisonStates.push(conditions);
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
    return { final, intermediateBaseline, intermediate,
      preparation: { cold, fixedGrowCalls: 1, canonicalWidth, resizeNormalization: "one +1px resize and restore before baseline", grownDuringComparison: true,
        resizePerCycle: "grow 40px and restore while expanded", stabilization: "2 RAF before canonical focus, 2 RAF after focus" },
      comparisonStates: { baseline: baselineConditions, points: comparisonStates } };
  };

  // Include the same Detail interactions in warmup so first-use allocations
  // are present in both snapshots, as in the other memory scenarios.
  await runMemoryScenario(
    page,
    testInfo,
    "row-expand-detail-lifecycle",
    exerciseRowDetails,
    120_000,
    exerciseRowDetails,
  );
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

test("full audit keeps component column counters within two percent @perf @memory-legacy", async ({ page }, testInfo) => {
  await runMemoryScenario(page, testInfo, "component-columns", async (currentPage) => {
    for (let cycle = 0; cycle < 3; cycle += 1) {
      await exerciseComponentColumns(currentPage);
      if (cycle < 2) await returnToBasic(currentPage);
    }
  }, 90_000, exerciseComponentColumns);
});

test("full audit keeps context menu counters within two percent @perf @memory-legacy", async ({ page }, testInfo) => {
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

test("full audit keeps header row cell and size counters within two percent @perf @memory-legacy", async ({ page }, testInfo) => {
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

test("full audit keeps feature lifecycle counters within two percent @perf @memory-legacy", async ({ page }, testInfo) => {
  const exercise = async (currentPage: Page) => {
    await exerciseFeatureLifecycle(currentPage, 5);

    await expect.poll(() => currentPage.evaluate(() => window.__cominsTableLifecycle?.activeMountCount ?? 0)).toBe(1);
  };

  await runMemoryScenario(page, testInfo, "feature-lifecycle", exercise, 90_000, exercise);
});
