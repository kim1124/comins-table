import path from "node:path";
import { expect, test } from "@playwright/test";
import { build } from "vite";

let consumerBundle: string;
test.beforeAll(async () => {
  const output = await build({
    configFile: false,
    logLevel: "error",
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    build: { write: false, minify: false, lib: { entry: path.resolve("test/playwright/fixtures/pending-lazy-consumer.tsx"), formats: ["es"], fileName: "consumer" } },
  });
  const chunk = (Array.isArray(output) ? output[0] : output) as { output: Array<{ type: string; code?: string }> };
  const scripts = chunk.output.filter(item => item.type === "chunk");
  if (scripts.length !== 1 || !scripts[0]?.code) throw new Error("Expected one self-contained production consumer bundle");
  consumerBundle = scripts[0].code;
});

for (const [requestKind, completion] of [
  ["lazy", "resolve"], ["lazy", "reject"],
  ["viewport", "resolve"], ["viewport", "reject"],
] as const) {
  test(`unmount releases ${requestKind} consumer data while its external Promise stays pending (${completion}) @perf @memory-lifetime`, async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    // 개발 도구의 React 디버그 참조와 분리하여 실제 production 모듈의 수명을 검증한다.
    await page.route("http://pending-consumer.test/**", route => route.fulfill({
      contentType: route.request().url().endsWith("consumer.js") ? "text/javascript" : "text/html",
      body: route.request().url().endsWith("consumer.js") ? consumerBundle : "<!doctype html><html><body></body></html>",
    }));
    await page.goto("http://pending-consumer.test/");
    const session = await page.context().newCDPSession(page);
    const fixtureURL = "/consumer.js";
    await page.evaluate(async url => {
      const consumer = await import(/* @vite-ignore */ url);
      Object.assign(window, { ownershipConsumer: consumer, ownershipReferences: {} });
    }, fixtureURL);
    // 검사 도구가 참조를 보유하지 않도록 GC와 WeakRef 읽기는 별도 태스크로 실행한다.
    const collect = async () => {
      await page.waitForTimeout(100);
      for (let index = 0; index < 3; index += 1) await session.send("HeapProfiler.collectGarbage");
      return page.evaluate(() => {
        const scope = window as unknown as {
          ownershipConsumer: { status(): { requests: number; cancellations: number; coordinatorRegistered: boolean } };
          ownershipReferences: Record<string, Record<string, WeakRef<object>>>;
        };
        return { ...scope.ownershipConsumer.status(), roots: document.querySelectorAll("[data-comins-table-instance-id]").length,
          references: Object.fromEntries(Object.entries(scope.ownershipReferences).map(([mode, refs]) => [mode, Object.fromEntries(Object.entries(refs).map(([key, ref]) => [key, Boolean(ref.deref())]))])) };
      });
    };
    const points: unknown[] = [];
    try {
      for (const mode of ["resolved", "coordinator", "pending"] as const) {
        await page.evaluate(async ({ mode, requestKind }) => {
          const scope = window as unknown as {
            ownershipConsumer: { retire(mode: "resolved" | "pending" | "coordinator", requestKind: "lazy" | "viewport"): Promise<Record<string, WeakRef<object>>> };
            ownershipReferences: Record<string, Record<string, WeakRef<object>>>;
          };
          scope.ownershipReferences[mode] = await scope.ownershipConsumer.retire(mode, requestKind);
        }, { mode, requestKind });
        const point = await collect();
        points.push({ mode, ...point });
        expect(point.roots).toBe(0);
        expect(point.coordinatorRegistered).toBe(false);
        expect(point.references[mode]).toEqual({ data: false, row: false, columns: false, host: false });
      }
      expect((points[2] as { cancellations: number }).cancellations - (points[0] as { cancellations: number }).cancellations).toBe(1);
    } finally {
      await page.evaluate(reject => (window as unknown as { ownershipConsumer: { settle(reject: boolean): void } }).ownershipConsumer.settle(reject), completion === "reject");
      const settled = await collect();
      points.push({ mode: "settled", ...settled });
      await testInfo.attach("pending-consumer-ownership", { body: JSON.stringify({ requestKind, completion, points, errors }, null, 2), contentType: "application/json" });
      await session.detach();
    }
    expect(errors).toEqual([]);
  });
}
