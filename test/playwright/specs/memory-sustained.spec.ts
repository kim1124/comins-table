import { expect, test } from "@playwright/test";
import { findMemoryThresholdFailures, memoryAuditStatus } from "../helpers/memory-growth";
import { installMemoryResources } from "../helpers/memory-resources";
import { runSustainedMemory, type MemoryScenario } from "../helpers/memory-sustained";

const diagnostic = process.env.MEMORY_AUDIT_DIAGNOSTICS === "1";
const scenarios: MemoryScenario[] = ["plain-scroll", "virtual-scroll", "route-unmount"];

for (const scenario of scenarios) {
  for (let repeat = 1; repeat <= (diagnostic ? 1 : 3); repeat += 1) {
    test(`two percent ${scenario} independent ${repeat}${diagnostic ? " heap diagnostic" : ""} @perf ${diagnostic ? "@memory-diagnostic" : "@memory-counter"}`, async ({ baseURL }, testInfo) => {
      test.setTimeout(15 * 60_000);
      if (!baseURL) throw new Error("Memory audit requires baseURL");
      const primary = await runSustainedMemory(scenario, repeat, baseURL, testInfo, diagnostic);
      // 별도 heap 진단은 수치 합격 증거로 사용하지 않는다.
      if (!diagnostic) {
        const status = memoryAuditStatus(primary.growth);
        expect(status, JSON.stringify({ status, directory: primary.directory, growth: primary.growth }, null, 2)).toBe("PASS");
      }
    });
  }
}

test("two percent detects a deliberately retained allocation @perf @memory-instrumentation", async ({ page }) => {
  await page.goto("/api/props");
  const session = await page.context().newCDPSession(page);
  const heap = async () => {
    await session.send("HeapProfiler.collectGarbage");
    await session.send("HeapProfiler.collectGarbage");
    return (await session.send("Runtime.getHeapUsage")).usedSize;
  };
  try {
    const before = await heap();
    await page.evaluate(() => { (window as unknown as { __retainedMemoryProbe?: number[] }).__retainedMemoryProbe = new Array(1_000_000).fill(7); });
    const after = await heap();
    const dom = await session.send("Memory.getDOMCounters");
    expect(findMemoryThresholdFailures([
      { step: "before", metrics: { jsHeapUsedSize: before, nodes: dom.nodes, jsEventListeners: dom.jsEventListeners } },
      { step: "retained", metrics: { jsHeapUsedSize: after, nodes: dom.nodes, jsEventListeners: dom.jsEventListeners } },
    ]).some(item => item.metric === "jsHeapUsedSize" && item.delta > 0)).toBe(true);
  } finally {
    await page.evaluate(() => { delete (window as unknown as { __retainedMemoryProbe?: number[] }).__retainedMemoryProbe; });
    await session.detach();
  }
});


test("memory resource tracker measures observer targets and timer cleanup @perf @memory-instrumentation", async ({ page }) => {
  await installMemoryResources(page, "diagnostic");
  await page.goto("/api/props");
  const result = await page.evaluate(() => {
    const tracker = (window as unknown as { __memoryResources: { read: () => { complete: boolean; metrics: Record<string, number> } } }).__memoryResources;
    const before = tracker.read();
    const element = document.createElement("div");
    document.body.append(element);
    const observer = new ResizeObserver(() => {});
    observer.observe(element);
    const timeout = window.setTimeout(() => {}, 60_000);
    const interval = window.setInterval(() => {}, 60_000);
    const frame = window.requestAnimationFrame(() => {});
    const during = tracker.read();
    observer.disconnect();
    element.remove();
    window.clearTimeout(timeout);
    window.clearInterval(interval);
    window.cancelAnimationFrame(frame);
    return { before, during, after: tracker.read() };
  });
  expect(result.before.complete).toBe(true);
  for (const metric of ["ResizeObserverTargets", "activeTimeouts", "activeIntervals", "activeAnimationFrames"]) {
    expect(result.during.metrics[metric]).toBe(result.before.metrics[metric]! + 1);
    expect(result.after.metrics[metric]).toBe(result.before.metrics[metric]);
  }
});
