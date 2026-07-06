import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";

test.use({ headless: false });

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

type DevtoolsMemorySnapshot = {
  documents: number;
  jsEventListeners: number;
  jsHeapUsedSize: number;
  liveElementCount: number;
  nodes: number;
};

type RenderedRowSnapshot = {
  firstDataIndex: number;
  renderedRows: number;
  scrollTop: number;
};

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

async function readRenderedRowSnapshot(page: Page): Promise<RenderedRowSnapshot> {
  return page.getByTestId("data-table-viewport").evaluate((element) => {
    const rows = Array.from(
      element.querySelectorAll<HTMLTableRowElement>(".kmsf-data-table__body-table tbody tr[data-kmsf-row-data-index]"),
    );
    const first = rows[0];

    return {
      firstDataIndex: Number(first?.getAttribute("data-kmsf-row-data-index") ?? "-1"),
      renderedRows: rows.length,
      scrollTop: element.scrollTop,
    };
  });
}

async function measureWheelRowUpdateLatency(page: Page, deltaY: number, samples = 6) {
  const durations: number[] = [];
  let timeoutCount = 0;

  for (let index = 0; index < samples; index += 1) {
    const before = await readRenderedRowSnapshot(page);
    const startedAt = performance.now();

    await page.mouse.wheel(0, deltaY);

    const changed = await page
      .waitForFunction(
        ({ previousFirstDataIndex, previousScrollTop }) => {
          const element = document.querySelector<HTMLElement>('[data-testid="data-table-viewport"]');

          if (!element) {
            return false;
          }

          const first = element.querySelector<HTMLTableRowElement>(
            ".kmsf-data-table__body-table tbody tr[data-kmsf-row-data-index]",
          );
          const firstDataIndex = Number(first?.getAttribute("data-kmsf-row-data-index") ?? "-1");

          return firstDataIndex !== previousFirstDataIndex || Math.abs(element.scrollTop - previousScrollTop) > 1;
        },
        { previousFirstDataIndex: before.firstDataIndex, previousScrollTop: before.scrollTop },
        { timeout: 1200 },
      )
      .then(() => true)
      .catch(() => false);

    if (!changed) {
      timeoutCount += 1;
    }

    durations.push(performance.now() - startedAt);
    await page.waitForTimeout(20);
  }

  const sorted = [...durations].sort((left, right) => left - right);
  const p95Index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);

  return {
    average: durations.reduce((sum, duration) => sum + duration, 0) / durations.length,
    max: Math.max(...durations),
    p95: sorted[p95Index] ?? 0,
    timeoutCount,
  };
}

async function dragViewportScrollbarWithMouse(page: Page, direction: "down" | "up") {
  const viewport = page.getByTestId("data-table-viewport");
  const isAtTargetEdge = async () =>
    viewport.evaluate((element, scrollDirection) => {
      const maxScrollTop = Math.max(1, element.scrollHeight - element.clientHeight);

      return scrollDirection === "down"
        ? element.scrollTop >= maxScrollTop * 0.985
        : element.scrollTop <= maxScrollTop * 0.015;
    }, direction);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    await viewport.scrollIntoViewIfNeeded();
    await viewport.hover();

    const box = await viewport.boundingBox();

    expect(box).not.toBeNull();

    const metrics = await viewport.evaluate((element) => {
      const maxScrollTop = Math.max(1, element.scrollHeight - element.clientHeight);

      return {
        clientHeight: element.clientHeight,
        maxScrollTop,
        scrollHeight: element.scrollHeight,
        scrollTop: element.scrollTop,
      };
    });

    if (await isAtTargetEdge()) {
      return;
    }

    const trackInset = 2;
    const trackHeight = Math.max(1, box!.height - trackInset * 2);
    const thumbHeight = Math.min(trackHeight, Math.max(28, (metrics.clientHeight / metrics.scrollHeight) * trackHeight));
    const thumbTravel = Math.max(1, trackHeight - thumbHeight);
    const currentRatio = Math.min(1, Math.max(0, metrics.scrollTop / metrics.maxScrollTop));
    const startY = box!.y + trackInset + thumbHeight / 2 + currentRatio * thumbTravel;
    const endY =
      direction === "down"
        ? box!.y + box!.height - trackInset - thumbHeight / 2
        : box!.y + trackInset + thumbHeight / 2;
    const xCandidates = [12, 6, 18].map((offset) => box!.x + box!.width - offset);

    for (const x of xCandidates) {
      const beforeScrollTop = await viewport.evaluate((element) => element.scrollTop);

      await page.mouse.move(x, startY, { steps: 8 });
      await page.waitForTimeout(20);
      await page.mouse.down();
      await page.mouse.move(x, endY, { steps: 60 });
      await page.mouse.up();
      await page.waitForTimeout(100);

      const afterScrollTop = await viewport.evaluate((element) => element.scrollTop);
      const moved = direction === "down" ? afterScrollTop > beforeScrollTop : afterScrollTop < beforeScrollTop;

      if (moved) {
        break;
      }
    }

    if (await isAtTargetEdge()) {
      return;
    }

    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2, { steps: 4 });
    await page.mouse.wheel(0, direction === "down" ? 80_000 : -80_000);
    await page.waitForTimeout(60);
  }
}

test("playground releases devtools counters after physical scrollbar drag and return to basic @perf", async ({ page }) => {
  test.setTimeout(60_000);

  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  const basicBaseline = await readDevtoolsMemorySnapshot(page);

  await page.goto("/performance/virtualization");
  await page.addStyleTag({
    content: `
      [data-testid="data-table-viewport"]::-webkit-scrollbar {
        width: 24px;
      }

      [data-testid="data-table-viewport"] {
        overflow-y: scroll !important;
        scrollbar-gutter: stable;
      }

      [data-testid="data-table-viewport"]::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.45);
        border-radius: 8px;
      }
    `,
  });
  await expect(page.getByRole("button", { name: "10만 행 로드" })).toHaveCount(0);
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

  await page.goto("/docs/getting-started");
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

test("playground keeps wheel row updates responsive after physical scrollbar drag @perf", async ({ page }) => {
  test.setTimeout(45_000);

  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/performance/virtualization");
  await page.addStyleTag({
    content: `
      [data-testid="data-table-viewport"]::-webkit-scrollbar {
        width: 24px;
      }

      [data-testid="data-table-viewport"] {
        overflow-y: scroll !important;
        scrollbar-gutter: stable;
      }

      [data-testid="data-table-viewport"]::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.45);
        border-radius: 8px;
      }
    `,
  });

  const viewport = page.getByTestId("data-table-viewport");
  await expect.poll(() => viewport.evaluate((element) => element.scrollHeight)).toBeGreaterThan(100_000);
  await viewport.hover();

  const baseline = await measureWheelRowUpdateLatency(page, 180);
  await dragViewportScrollbarWithMouse(page, "down");
  await expect.poll(() => readRenderedRowSnapshot(page).then((snapshot) => snapshot.firstDataIndex)).toBeGreaterThan(40_000);
  const afterDrag = await measureWheelRowUpdateLatency(page, -180);
  const failureContext = JSON.stringify({ afterDrag, baseline }, null, 2);

  expect(afterDrag.timeoutCount, failureContext).toBe(0);
  expect(afterDrag.average, failureContext).toBeLessThanOrEqual(Math.max(48, baseline.average * 1.35));
  expect(afterDrag.p95, failureContext).toBeLessThanOrEqual(Math.max(72, baseline.p95 * 1.35));
  expect(diagnostics).toEqual([]);
});
