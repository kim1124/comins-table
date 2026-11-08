import { expect, test } from "@playwright/test";
import { installMemoryResources } from "../helpers/memory-resources";
import { initializeMemoryInstrumentation } from "../helpers/memory-instrumentation";

test("memory instrumentation prevents lazy locator listeners after the baseline @perf @memory-instrumentation", async ({ page }) => {
  await page.goto("/api/props");
  await page.locator(".docs-sidebar").waitFor({ state: "visible" });
  await initializeMemoryInstrumentation(page);
  const session = await page.context().newCDPSession(page);
  const read = async () => {
    for (let index = 0; index < 3; index++) await session.send("HeapProfiler.collectGarbage");
    return (await session.send("Memory.getDOMCounters")).jsEventListeners;
  };
  try {
    const before = await read();
    await page.locator("body").evaluate(() => undefined);
    const first = await read();
    await page.locator("body").evaluate(() => undefined);
    const second = await read();
    expect({ first, second }).toEqual({ first: before, second: before });
  } finally { await session.detach(); }
});


test("numeric resource mode preserves native observer and timer implementations @perf @memory-instrumentation", async ({ page }) => {
  await page.addInitScript(() => {
    const keys = ["ResizeObserver", "MutationObserver", "IntersectionObserver", "setTimeout", "setInterval", "clearTimeout", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame"] as const;
    Object.assign(window, { __nativeMemoryImplementations: Object.fromEntries(keys.map(key => [key, window[key]])) });
  });
  await installMemoryResources(page, "counter");
  await page.goto("/api/props");
  const observed = await page.evaluate(() => {
    const native = (window as unknown as { __nativeMemoryImplementations: Record<string, unknown> }).__nativeMemoryImplementations;
    return {
      changed: Object.keys(native).filter(key => (window as unknown as Record<string, unknown>)[key] !== native[key]),
      trackerInstalled: "__memoryResources" in window,
    };
  });
  expect(observed).toEqual({ changed: [], trackerInstalled: false });
});
