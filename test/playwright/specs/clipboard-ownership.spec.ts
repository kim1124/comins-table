import path from "node:path";
import { expect, test } from "@playwright/test";
import { build } from "vite";

let consumerBundle: string;
test.beforeAll(async () => {
  const output = await build({ configFile: false, logLevel: "error", define: { "process.env.NODE_ENV": JSON.stringify("production") },
    build: { write: false, minify: false, lib: { entry: path.resolve("test/playwright/fixtures/pending-clipboard-consumer.tsx"), formats: ["es"], fileName: "consumer" } } });
  const chunk = (Array.isArray(output) ? output[0] : output) as { output: Array<{ type: string; code?: string }> };
  const scripts = chunk.output.filter(item => item.type === "chunk");
  if (scripts.length !== 1 || !scripts[0]?.code) throw new Error("Expected one production consumer bundle");
  consumerBundle = scripts[0].code;
});

for (const completion of ["resolve", "reject"] as const) {
  test(`pending copySelection releases retired table before Clipboard ${completion} @perf @memory-lifetime`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("http://clipboard-consumer.test/**", route => route.fulfill({
      contentType: route.request().url().endsWith("consumer.js") ? "text/javascript" : "text/html",
      body: route.request().url().endsWith("consumer.js") ? consumerBundle : "<!doctype html><html><body></body></html>",
    }));
    await page.goto("http://clipboard-consumer.test/");
    await page.evaluate(async url => { Object.assign(window, { consumer: await import(/* @vite-ignore */ url), references: {} }); }, "/consumer.js");
    const session = await page.context().newCDPSession(page), points: unknown[] = [];
    const collect = async () => {
      await page.waitForTimeout(100);
      for (let index = 0; index < 3; index += 1) await session.send("HeapProfiler.collectGarbage");
      return page.evaluate(() => {
        const scope = window as unknown as { consumer: { status(): { writes: number; outcomes: Array<{ text?: string | null; error?: string }> } }; references: Record<string, Record<string, WeakRef<object>>> };
        return { ...scope.consumer.status(), roots: document.querySelectorAll("[data-comins-table-instance-id]").length,
          references: Object.fromEntries(Object.entries(scope.references).map(([mode, refs]) => [mode, Object.fromEntries(Object.entries(refs).map(([kind, ref]) => [kind, Boolean(ref.deref())]))])) };
      });
    };
    try {
      for (const mode of ["resolved", "pending"] as const) {
        await page.evaluate(async mode => {
          const scope = window as unknown as { consumer: { retire(mode: "resolved" | "pending"): Promise<Record<string, WeakRef<object>>> }; references: Record<string, Record<string, WeakRef<object>>> };
          scope.references[mode] = await scope.consumer.retire(mode);
        }, mode);
        const point = await collect();
        points.push({ mode, ...point });
        expect(point.roots).toBe(0);
        expect(point.writes).toBe(mode === "resolved" ? 1 : 2);
        expect(point.outcomes).toEqual([{ text: "Alpha" }]);
        expect(point.references[mode]).toEqual({ data: false, row: false, columns: false, host: false });
      }
    } finally {
      await page.evaluate(reject => (window as unknown as { consumer: { settle(reject: boolean): void } }).consumer.settle(reject), completion === "reject");
      const settled = await collect();
      points.push({ mode: "settled", ...settled });
      await testInfo.attach("pending-clipboard-ownership", { body: JSON.stringify({ completion, points, errors }, null, 2), contentType: "application/json" });
      await session.detach();
      expect(settled.outcomes).toEqual([{ text: "Alpha" }, completion === "reject" ? { error: "Clipboard write rejected" } : { text: "Alpha" }]);
      expect(errors).toEqual([]);
    }
  });
}
