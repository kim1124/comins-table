import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

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

type CdpPerformanceMetrics = {
  JSHeapUsedSize: number;
  JSEventListeners: number;
  Nodes: number;
};

type DevtoolsMemorySnapshot = {
  documents: number;
  jsEventListeners: number;
  jsHeapUsedSize: number;
  liveElementCount: number;
  nodes: number;
};

async function readPerformanceMetrics(page: Page): Promise<CdpPerformanceMetrics> {
  const session = await page.context().newCDPSession(page);

  await session.send("Performance.enable");
  const metrics = await session.send("Performance.getMetrics");
  await session.detach();

  const values = new Map(metrics.metrics.map((metric) => [metric.name, metric.value]));

  return {
    JSHeapUsedSize: values.get("JSHeapUsedSize") ?? 0,
    JSEventListeners: values.get("JSEventListeners") ?? 0,
    Nodes: values.get("Nodes") ?? 0,
  };
}

async function collectGarbage(page: Page) {
  const session = await page.context().newCDPSession(page);

  await session.send("HeapProfiler.enable");
  await session.send("HeapProfiler.collectGarbage");
  await session.detach();
  await page.waitForTimeout(100);
}

async function readDevtoolsMemorySnapshot(page: Page): Promise<DevtoolsMemorySnapshot> {
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
  const liveElementCount = await page.evaluate(() => document.querySelectorAll("*").length);

  return {
    documents,
    jsEventListeners,
    jsHeapUsedSize: values.get("JSHeapUsedSize") ?? 0,
    liveElementCount,
    nodes,
  };
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

async function dragViewportScrollbarWithMouse(page: Page, direction: "down" | "up") {
  const viewport = page.getByTestId("data-table-viewport");
  const box = await viewport.boundingBox();

  expect(box).not.toBeNull();

  const x = box!.x + box!.width - 4;
  const startY = direction === "down" ? box!.y + 18 : box!.y + box!.height - 18;
  const endY = direction === "down" ? box!.y + box!.height - 18 : box!.y + 18;

  await page.mouse.move(x, startY);
  await page.mouse.down();
  await page.mouse.move(x, endY, { steps: 40 });
  await page.mouse.up();
}

async function runVirtualScrollFrames(page: Page, frames = 30) {
  return page.getByTestId("data-table-viewport").evaluate(
    (element, frameCount) => {
      const durations: number[] = [];

      for (let index = 0; index < frameCount; index += 1) {
        const startedAt = performance.now();

        element.scrollTop = Math.max(0, element.scrollTop - 2400);
        element.dispatchEvent(new Event("scroll", { bubbles: true }));

        durations.push(performance.now() - startedAt);
      }

      const sorted = [...durations].sort((left, right) => left - right);
      const p95Index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);

      return {
        average: durations.reduce((sum, value) => sum + value, 0) / durations.length,
        max: Math.max(...durations),
        p95: sorted[p95Index] ?? 0,
      };
    },
    frames,
  );
}

test("playground verifies 100000 row virtualization smoke", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { name: "대용량 데이터 표시" }).click();
  await expect(page.getByRole("button", { name: "100만 행 로드" })).toHaveCount(0);
  await page.getByRole("button", { name: "10만 행 로드" }).click();

  await expect(page.getByTestId("virtual-row-count")).toHaveCount(0);
  await expect.poll(() => page.locator(".kmsf-data-table__body-table tbody tr").count()).toBeLessThan(80);
  await page.getByTestId("data-table-viewport").evaluate((element) => {
    element.scrollTop = 2400;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await expect
    .poll(() =>
      page.getByTestId("data-table-viewport").evaluate((element) => {
        const firstRow = element.querySelector<HTMLTableRowElement>(
          ".kmsf-data-table__body-table tbody tr[data-kmsf-row-data-index]",
        );

        return Number(firstRow?.getAttribute("data-kmsf-row-data-index") ?? "-1");
      }),
    )
    .toBeGreaterThan(50);

  expect(diagnostics).toEqual([]);
});

test("playground verifies 100000 row virtualization perf smoke @perf", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { name: "대용량 데이터 표시" }).click();
  await expect(page.getByRole("button", { name: "100만 행 로드" })).toHaveCount(0);
  await page.getByRole("button", { name: "10만 행 로드" }).click();

  await expect(page.getByTestId("virtual-row-count")).toHaveCount(0);
  await expect.poll(() => page.locator(".kmsf-data-table__body-table tbody tr").count()).toBeLessThan(80);
  await expect
    .poll(() => page.getByTestId("data-table-viewport").evaluate((element) => element.scrollHeight))
    .toBeGreaterThan(100_000);

  const scrollDispatchMs = await page.getByTestId("data-table-viewport").evaluate((element) => {
    const startedAt = performance.now();

    element.scrollTop = element.scrollHeight;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));

    return performance.now() - startedAt;
  });
  await expect
    .poll(() =>
      page.getByTestId("data-table-viewport").evaluate((element) => {
        const rows = Array.from(
          element.querySelectorAll<HTMLTableRowElement>(
            ".kmsf-data-table__body-table tbody tr[data-kmsf-row-data-index]",
          ),
        );
        const lastRow = rows[rows.length - 1];

        return Number(lastRow?.getAttribute("data-kmsf-row-data-index") ?? "-1");
      }),
    )
    .toBeGreaterThan(99_950);
  const metrics = await page.getByTestId("data-table-viewport").evaluate((element) => {
    const rows = Array.from(
      element.querySelectorAll<HTMLTableRowElement>(".kmsf-data-table__body-table tbody tr[data-kmsf-row-data-index]"),
    );
    const lastRow = rows[rows.length - 1];

    return {
      lastRenderedIndex: Number(lastRow?.getAttribute("data-kmsf-row-data-index") ?? "-1"),
      renderedRows: rows.length,
      scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop,
    };
  });

  expect(metrics.lastRenderedIndex).toBeGreaterThan(99_950);
  expect(metrics.renderedRows).toBeLessThan(90);
  expect(metrics.scrollTop).toBeGreaterThan(0);
  expect(metrics.scrollHeight).toBeLessThan(2_000_000);
  expect(scrollDispatchMs).toBeLessThan(2_000);

  expect(diagnostics).toEqual([]);
});

test("playground keeps devtools metrics bounded during one hundred thousand row virtual scroll @perf", async ({ page }) => {
  test.setTimeout(45_000);
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { name: "대용량 데이터 표시" }).click();
  await expect(page.getByRole("button", { name: "100만 행 로드" })).toHaveCount(0);
  await page.getByRole("button", { name: "10만 행 로드" }).click();

  const viewport = page.getByTestId("data-table-viewport");
  await expect.poll(() => viewport.evaluate((element) => element.scrollHeight)).toBeGreaterThan(100_000);

  await viewport.evaluate((element) => {
    element.scrollTop = Math.floor(element.scrollHeight / 2);
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
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
    .toBeGreaterThan(40_000);
  await collectGarbage(page);
  const stableBaseline = await readPerformanceMetrics(page);

  await viewport.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });

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

  const frameDurations = await runVirtualScrollFrames(page, 30);

  await collectGarbage(page);
  const afterScroll = await readPerformanceMetrics(page);
  const rowMetrics = await viewport.evaluate((element) => {
    const rows = Array.from(
      element.querySelectorAll<HTMLTableRowElement>(".kmsf-data-table__body-table tbody tr[data-kmsf-row-data-index]"),
    );
    const bodyTable = element.querySelector<HTMLElement>(".kmsf-data-table__body-table");
    const transform = bodyTable ? window.getComputedStyle(bodyTable).transform : "none";

    return {
      renderedRows: rows.length,
      transform,
    };
  });

  expect(rowMetrics.renderedRows).toBeLessThanOrEqual(80);
  expect(rowMetrics.transform).not.toBe("none");
  expect(frameDurations.average).toBeLessThanOrEqual(24);
  expect(frameDurations.p95).toBeLessThanOrEqual(32);
  expect(frameDurations.max).toBeLessThanOrEqual(50);
  expect(afterScroll.Nodes).toBeLessThanOrEqual(Math.ceil(stableBaseline.Nodes * 1.1));
  expect(afterScroll.JSEventListeners).toBeLessThanOrEqual(Math.ceil(stableBaseline.JSEventListeners * 1.1));
  expect(afterScroll.JSHeapUsedSize).toBeLessThanOrEqual(Math.ceil(stableBaseline.JSHeapUsedSize * 1.2));
  expect(diagnostics).toEqual([]);
});

test("playground releases devtools DOM counters after 100000 row scroll and return to basic @perf", async ({ page }) => {
  test.setTimeout(60_000);
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { name: "대용량 데이터 표시" }).click();
  await expect(page.getByRole("button", { name: "100만 행 로드" })).toHaveCount(0);
  await page.getByRole("button", { name: "10만 행 로드" }).click();

  const viewport = page.getByTestId("data-table-viewport");
  await expect.poll(() => viewport.evaluate((element) => element.scrollHeight)).toBeGreaterThan(100_000);
  await expect.poll(() => page.locator(".kmsf-data-table__body-table tbody tr").count()).toBeLessThan(90);
  const postLoad = await readDevtoolsMemorySnapshot(page);

  await viewport.hover();
  await page.mouse.wheel(0, 2400);
  await dragVirtualScrollbar(page, "down");
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
  const afterDown = await readDevtoolsMemorySnapshot(page);

  await page.mouse.wheel(0, -2400);
  await dragVirtualScrollbar(page, "up");
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
  const afterUp = await readDevtoolsMemorySnapshot(page);

  await page.getByRole("button", { name: "기본" }).click();
  await expect(page.getByTestId("feature-content")).toHaveAttribute("data-feature", "basic");
  await expect(page.getByTestId("data-table-viewport")).toBeVisible();
  const afterBasic = await readDevtoolsMemorySnapshot(page);
  const snapshots = { afterBasic, afterDown, afterUp, postLoad };
  const failureContext = JSON.stringify(snapshots, null, 2);

  expect(afterBasic.nodes, failureContext).toBeLessThanOrEqual(Math.ceil(postLoad.nodes * 1.5));
  expect(afterBasic.jsEventListeners, failureContext).toBeLessThanOrEqual(Math.ceil(postLoad.jsEventListeners * 1.5));
  expect(afterBasic.documents, failureContext).toBe(postLoad.documents);
  expect(diagnostics).toEqual([]);
});

test("playground recycles rendered row DOM while virtual scrolling one hundred thousand rows @perf", async ({ page }) => {
  test.setTimeout(30_000);
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { name: "대용량 데이터 표시" }).click();
  await page.getByRole("button", { name: "10만 행 로드" }).click();

  const viewport = page.getByTestId("data-table-viewport");
  await expect.poll(() => viewport.evaluate((element) => element.scrollHeight)).toBeGreaterThan(100_000);
  const before = await viewport.evaluate((element) => {
    const rows = Array.from(
      element.querySelectorAll<HTMLTableRowElement>(".kmsf-data-table__body-table tbody tr[data-kmsf-row-data-index]"),
    );

    (window as typeof window & { __kmsfVirtualRowNodeSnapshot?: HTMLTableRowElement[] })
      .__kmsfVirtualRowNodeSnapshot = rows.slice(0, 12);

    return {
      firstDataIndex: Number(rows[0]?.getAttribute("data-kmsf-row-data-index") ?? "-1"),
      rowCount: rows.length,
    };
  });

  await dragVirtualScrollbar(page, "down");
  const after = await viewport.evaluate((element) => {
    const previousRows =
      (window as typeof window & { __kmsfVirtualRowNodeSnapshot?: HTMLTableRowElement[] })
        .__kmsfVirtualRowNodeSnapshot ?? [];
    const rows = Array.from(
      element.querySelectorAll<HTMLTableRowElement>(".kmsf-data-table__body-table tbody tr[data-kmsf-row-data-index]"),
    );
    const comparedCount = Math.min(previousRows.length, rows.length);
    let reusedCount = 0;

    for (let index = 0; index < comparedCount; index += 1) {
      if (previousRows[index] === rows[index]) {
        reusedCount += 1;
      }
    }

    return {
      firstDataIndex: Number(rows[0]?.getAttribute("data-kmsf-row-data-index") ?? "-1"),
      reusedCount,
      rowCount: rows.length,
    };
  });

  expect(before.rowCount).toBeGreaterThan(0);
  expect(after.firstDataIndex).toBeGreaterThan(before.firstDataIndex);
  expect(after.reusedCount).toBeGreaterThanOrEqual(Math.min(10, before.rowCount, after.rowCount));
  expect(diagnostics).toEqual([]);
});

test("playground releases devtools counters after physical scrollbar drag and return to basic", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  test.skip(
    testInfo.project.use.headless !== false,
    "Physical scrollbar thumb dragging requires headed Chrome; headless Chromium does not expose a draggable native scrollbar thumb.",
  );

  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.addStyleTag({
    content: `
      [data-testid="data-table-viewport"]::-webkit-scrollbar {
        width: 16px;
      }

      [data-testid="data-table-viewport"]::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.45);
        border-radius: 8px;
      }
    `,
  });
  const basicBaseline = await readDevtoolsMemorySnapshot(page);

  await page.getByRole("button", { name: "대용량 데이터 표시" }).click();
  await page.getByRole("button", { name: "10만 행 로드" }).click();
  const viewport = page.getByTestId("data-table-viewport");
  await expect.poll(() => viewport.evaluate((element) => element.scrollHeight)).toBeGreaterThan(100_000);
  await page.mouse.wheel(0, 2400);
  await dragViewportScrollbarWithMouse(page, "down");
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

  await page.mouse.wheel(0, -2400);
  await dragViewportScrollbarWithMouse(page, "up");
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

  await page.getByRole("button", { exact: true, name: "기본" }).click();
  await expect(page.getByTestId("feature-content")).toHaveAttribute("data-feature", "basic");
  const afterBasic = await readDevtoolsMemorySnapshot(page);
  const failureContext = JSON.stringify({ afterBasic, basicBaseline }, null, 2);

  expect(afterBasic.nodes, failureContext).toBeLessThanOrEqual(Math.ceil(basicBaseline.nodes * 1.25));
  expect(afterBasic.jsEventListeners, failureContext).toBeLessThanOrEqual(
    Math.ceil(basicBaseline.jsEventListeners * 1.25),
  );
  expect(afterBasic.documents, failureContext).toBe(basicBaseline.documents);
  expect(diagnostics).toEqual([]);
});

test("playground keeps follow-up scroll responsive after one hundred thousand row jump @perf", async ({ page }) => {
  test.setTimeout(30_000);
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { name: "대용량 데이터 표시" }).click();
  await expect(page.getByRole("button", { name: "100만 행 로드" })).toHaveCount(0);
  await page.getByRole("button", { name: "10만 행 로드" }).click();

  const viewport = page.getByTestId("data-table-viewport");
  await expect.poll(() => viewport.evaluate((element) => element.scrollHeight)).toBeGreaterThan(100_000);

  await viewport.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
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

  const frameDurations = await runVirtualScrollFrames(page, 10);

  await expect
    .poll(() =>
      page.evaluate(() => {
        const viewportElement = document.querySelector<HTMLElement>('[data-testid="data-table-viewport"]');
        const renderedRows = Array.from(
          viewportElement?.querySelectorAll<HTMLTableRowElement>(
            ".kmsf-data-table__body-table tbody tr[data-kmsf-row-data-index]",
          ) ?? [],
        );
        const last = renderedRows[renderedRows.length - 1];

        return Number(last?.getAttribute("data-kmsf-row-data-index") ?? "-1");
      }),
    )
    .toBeGreaterThan(98_000);

  const rows = await viewport.evaluate((element) => {
    const renderedRows = Array.from(
      element.querySelectorAll<HTMLTableRowElement>(".kmsf-data-table__body-table tbody tr[data-kmsf-row-data-index]"),
    );
    const first = renderedRows[0];
    const last = renderedRows[renderedRows.length - 1];

    return {
      firstRenderedIndex: Number(first?.getAttribute("data-kmsf-row-data-index") ?? "-1"),
      lastRenderedIndex: Number(last?.getAttribute("data-kmsf-row-data-index") ?? "-1"),
      renderedRows: renderedRows.length,
      scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop,
    };
  });

  expect(rows.lastRenderedIndex).toBeGreaterThan(98_000);
  expect(rows.renderedRows).toBeLessThan(100);
  expect(frameDurations.average).toBeLessThanOrEqual(24);
  expect(frameDurations.p95).toBeLessThanOrEqual(32);
  expect(frameDurations.max).toBeLessThanOrEqual(50);
  expect(diagnostics).toEqual([]);
});
