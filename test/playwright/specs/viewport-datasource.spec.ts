import { expect, test } from "@playwright/test";

test("viewport fetches initial and remote ranges with bounded rows", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/performance/viewport-datasource");
  const viewport = page.getByTestId("viewport-datasource-viewport");
  await expect(viewport.getByTestId("row-0")).toBeVisible();
  await expect.poll(() => viewport.locator("[data-comins-row-data-index]").count()).toBeGreaterThan(0);
  await viewport.evaluate(element => { element.scrollTop = element.scrollHeight / 2; });
  await expect.poll(async () => Number(await viewport.locator("[data-comins-row-data-index]").first().getAttribute("data-comins-absolute-index"))).toBeGreaterThan(400_000);
  await viewport.evaluate(element => { element.scrollTop = element.scrollHeight; });
  await expect(viewport.getByTestId("row-999999")).toBeVisible();
  const geometry = await viewport.locator("[data-comins-row-data-index]").evaluateAll(rows => rows.map(row => ({ index: Number(row.getAttribute("data-comins-absolute-index")), top: row.getBoundingClientRect().top, bottom: row.getBoundingClientRect().bottom, height: row.getBoundingClientRect().height })));
  expect(geometry.length).toBeLessThan(70);
  expect(new Set(geometry.map(row => row.height)).size).toBeGreaterThan(1);
  for (let index = 1; index < geometry.length; index++) expect(Math.abs(geometry[index]!.top - geometry[index - 1]!.bottom)).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});

test("auto height grows and shrinks rendered rows", async ({ page }) => {
  await page.goto("/performance/auto-row-height");
  const row = page.getByTestId("auto-height-viewport").getByTestId("row-0");
  await expect(row).toBeVisible();
  const initial = await row.evaluate(element => element.getBoundingClientRect().height);
  await page.getByTestId("auto-height-content").click();
  await expect.poll(() => row.evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThan(initial + 40);
  await page.getByTestId("auto-height-content").click();
  await expect.poll(() => row.evaluate(element => element.getBoundingClientRect().height)).toBe(initial);
  await page.getByTestId("renderer-resize").click();
  await expect.poll(() => row.evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThan(initial + 40);
  await page.getByTestId("renderer-resize").click();
  await expect.poll(() => row.evaluate(element => element.getBoundingClientRect().height)).toBe(initial);
});

test("viewport preserves the visible row offset when renderer content changes", async ({ page }) => {
  await page.goto("/performance/viewport-datasource");
  const viewport = page.getByTestId("viewport-datasource-viewport");
  await expect(viewport.getByTestId("row-0")).toBeVisible();
  await viewport.evaluate(element => { element.scrollTop = element.scrollHeight * .51; });
  await expect.poll(async () => Number(await viewport.locator("[data-comins-row-data-index]").first().getAttribute("data-comins-absolute-index"))).toBeGreaterThan(400_000);
  await expect(viewport.getByTestId("viewport-placeholder")).toHaveCount(0);
  const before = await viewport.evaluate(element => {
    const top = element.getBoundingClientRect().top;
    const rows = Array.from(element.querySelectorAll<HTMLElement>("[data-comins-row-data-index]"));
    const row = rows.find(row => row.getBoundingClientRect().bottom > top)!;
    return { id: row.dataset.testid!, offset: row.getBoundingClientRect().top - top, height: row.getBoundingClientRect().height };
  });
  await page.getByTestId("viewport-content").click();
  const anchor = viewport.getByTestId(before.id);
  await expect.poll(() => anchor.evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThan(before.height + 30);
  await expect.poll(() => anchor.evaluate((element, offset) => Math.abs(element.getBoundingClientRect().top - element.closest(".comins-table__body-viewport")!.getBoundingClientRect().top - offset), before.offset)).toBeLessThanOrEqual(1);
});


test("viewport resets the dataset and offers an explicit retry after errors", async ({ page }) => {
  await page.goto("/performance/viewport-datasource");
  const viewport = page.getByTestId("viewport-datasource-viewport");
  await expect(viewport.getByTestId("row-0")).toBeVisible();
  await page.getByTestId("viewport-fail").click();
  await page.getByTestId("viewport-reset").click();
  await expect(viewport.getByTestId("viewport-retry").first()).toBeVisible();
  await page.getByTestId("viewport-fail").click();
  await viewport.getByTestId("viewport-retry").first().click();
  await expect(viewport.getByTestId("row-0")).toContainText("Result 1");
  await page.getByTestId("viewport-auto-height").click();
  await viewport.evaluate(element => { element.scrollTop = element.scrollHeight; });
  await expect(viewport.getByTestId("row-999999")).toBeVisible();
  await page.getByTestId("viewport-reset").click();
  await expect(viewport.getByTestId("row-0")).toContainText("Result 2");
  await expect.poll(() => viewport.evaluate(element => element.scrollTop)).toBe(0);
});

test("viewport height metadata stays bounded over more than 64 distant blocks @perf", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/performance/viewport-datasource");
  const viewport = page.getByTestId("viewport-datasource-viewport");
  await expect(viewport.getByTestId("row-0")).toBeVisible();
  const root = viewport.locator("..");
  for (let visit = 1; visit <= 75; visit++) {
    await viewport.evaluate((element, fraction) => { element.scrollTop = (element.scrollHeight - element.clientHeight) * fraction; }, visit / 77);
    await expect(viewport.getByTestId("viewport-placeholder")).toHaveCount(0);
    await expect.poll(async () => Number(await root.getAttribute("data-comins-viewport-height-blocks"))).toBeLessThanOrEqual(64);
    expect(Number(await root.getAttribute("data-comins-viewport-blocks"))).toBeLessThanOrEqual(12);
    expect(Number(await root.getAttribute("data-comins-viewport-requests"))).toBeLessThanOrEqual(2);
    expect(await viewport.locator("[data-comins-row-data-index]").count()).toBeLessThan(70);
  }
  await viewport.evaluate(element => { element.scrollTop = 0; });
  await expect(viewport.getByTestId("row-0")).toBeVisible();
  await viewport.hover();
  await page.mouse.wheel(0, 240);
  await expect.poll(() => viewport.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  await expect(viewport.getByTestId("viewport-placeholder")).toHaveCount(0);
});

test("automatic height includes rendering and layout in scroll frame measurements @perf", async ({ page }) => {
  await page.goto("/performance/auto-row-height");
  const viewport = page.getByTestId("auto-height-viewport");
  await expect(viewport.getByTestId("row-0")).toBeVisible();
  const result = await viewport.evaluate(async element => {
    const frames: number[] = [];
    const longTasks: number[] = [];
    const observer = new PerformanceObserver(list => longTasks.push(...list.getEntries().map(entry => entry.duration)));
    observer.observe({ type: "longtask", buffered: false });
    let previous = performance.now();
    for (let step = 0; step < 40; step++) {
      element.scrollTop += 60;
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const now = performance.now();
      frames.push(now - previous);
      previous = now;
    }
    observer.disconnect();
    const sorted = frames.sort((a, b) => a - b);
    return { p95: sorted[Math.ceil(sorted.length * .95) - 1]!, max: Math.max(...frames), longTasks, rows: element.querySelectorAll("[data-comins-row-data-index]").length };
  });
  console.log("[auto-height-frames]", JSON.stringify(result));
  // New-mode budget, fixed before the first performance run: 50 ms p95, 200 ms max frame/task.
  expect(result.p95).toBeLessThan(50);
  expect(result.max).toBeLessThan(200);
  expect(Math.max(0, ...result.longTasks)).toBeLessThan(200);
  expect(result.rows).toBeLessThan(70);
});


test("automatic business height combines with Detail and column width changes", async ({ page }) => {
  await page.goto("/performance/auto-row-height");
  const viewport = page.getByTestId("auto-height-viewport");
  const row = viewport.getByTestId("row-0");
  await expect(row).toBeVisible();
  await page.getByTestId("auto-height-detail").click();
  await expect(viewport.getByTestId("row-detail-content-0")).toBeVisible();
  await page.getByTestId("auto-height-content").click();
  const wideHeight = await row.evaluate(element => element.getBoundingClientRect().height);
  await page.getByTestId("auto-height-width").click();
  await expect.poll(() => row.evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThan(wideHeight);
  await expect.poll(() => viewport.evaluate(element => {
    const row = element.querySelector('[data-testid="row-0"]')!.getBoundingClientRect();
    const detail = element.querySelector('[data-testid="row-detail-content-0"]')!.getBoundingClientRect();
    const next = element.querySelector('[data-testid="row-1"]')!.getBoundingClientRect();
    return Math.abs(next.top - row.bottom - detail.height);
  })).toBeLessThanOrEqual(1);
});

test("viewport automatic heights keep response and scroll frame work within budget @perf", async ({ page }) => {
  await page.goto("/performance/viewport-datasource");
  const viewport = page.getByTestId("viewport-datasource-viewport");
  await expect(viewport.getByTestId("row-0")).toBeVisible();
  const result = await viewport.evaluate(async element => {
    const frames: number[] = [], tasks: number[] = [];
    const observer = new PerformanceObserver(list => tasks.push(...list.getEntries().map(entry => entry.duration)));
    observer.observe({ type: "longtask", buffered: false });
    let previous = performance.now();
    for (let step = 0; step < 90; step++) {
      element.scrollTop += 40;
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const now = performance.now(); frames.push(now - previous); previous = now;
    }
    observer.disconnect();
    frames.sort((a, b) => a - b);
    return { p95: frames[Math.ceil(frames.length * .95) - 1]!, max: Math.max(...frames), tasks };
  });
  console.log("[viewport-frames]", JSON.stringify(result));
  // Same predeclared rendering budget as CSR; mock fetch delay is 40 ms.
  expect(result.p95).toBeLessThan(50);
  expect(result.max).toBeLessThan(200);
  expect(Math.max(0, ...result.tasks)).toBeLessThan(200);
  await expect(viewport.getByTestId("viewport-placeholder")).toHaveCount(0, { timeout: 1000 });
});
