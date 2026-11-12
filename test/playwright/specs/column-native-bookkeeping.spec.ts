import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { saveMemoryHeap } from "../helpers/memory-heap";
import { initializePlaygroundLocale } from "../helpers/playground-locale";
import { createUnmountWorkload } from "../helpers/memory-unmount-workloads";
import { readWeakRegistrySnapshot } from "../helpers/weak-registry-snapshot";

declare global {
  interface Window { __cominsBoundaryControl?: { release(): void; read(): boolean } }
}

test("header registration bookkeeping returns to its empty-owner footprint @perf @memory-integration", async ({ page, browserName }, info) => {
  test.setTimeout(180_000);
  expect(process.env.PLAYWRIGHT_PLAYGROUND_MODE, "Development source-bound diagnostic; production numeric counters are separate").not.toBe("production");
  expect(browserName).toBe("chromium");
  const hash = async () => createHash("sha256").update(await readFile("src/index.tsx")).digest("hex");
  const beforeSource = await hash();
  const session = await page.context().newCDPSession(page);
  const workload = await createUnmountWorkload(page, "column-groups-open-ui-unmount");
  const snapshots: Record<string, string> = {};
  const capture = async (phase: string) => {
    await page.evaluate(() => new Promise<void>(resolve => setTimeout(resolve, 0)));
    for (let i = 0; i < 3; i++) await session.send("HeapProfiler.collectGarbage");
    const file = info.outputPath(`${phase}.heapsnapshot`);
    await saveMemoryHeap(session, file);
    snapshots[phase] = file;
    return file;
  };
  try {
    await initializePlaygroundLocale(page, "en");
    await page.goto("/api/props");
    await session.send("HeapProfiler.enable");
    const document = await page.evaluate(() => performance.timeOrigin);
    await expect(page.locator("[data-comins-table-instance-id]")).toHaveCount(0);
    // Initialize the same feature module without creating a table owner.
    await page.evaluate(async () => {
      const moduleURL = new URL("/src/features/ColumnGroupFeature.tsx", location.href).href;
      await import(/* @vite-ignore */ moduleURL);
    });
    await expect(page.locator("[data-comins-table-instance-id]")).toHaveCount(0);
    await page.evaluate(() => {
      class CominsNativeBoundaryProbe { marker = "native-boundary-control"; }
      let cominsBoundaryControlSet: WeakSet<CominsNativeBoundaryProbe> | null = new WeakSet();
      let cominsBoundaryControlTarget: CominsNativeBoundaryProbe | null = new CominsNativeBoundaryProbe();
      cominsBoundaryControlSet.add(cominsBoundaryControlTarget);
      window.__cominsBoundaryControl = {
        read: () => Boolean(cominsBoundaryControlSet && cominsBoundaryControlTarget),
        release() { cominsBoundaryControlSet = null; cominsBoundaryControlTarget = null; },
      };
    });
    const held = await readWeakRegistrySnapshot(await capture("control-held"), "cominsBoundaryControlSet", "cominsBoundaryControlTarget", "CominsNativeBoundaryProbe", "native-boundary-control");
    await info.attach("bookkeeping-control-held.json", { body: JSON.stringify(held), contentType: "application/json" });
    expect(held.stores).toBe(1);
    expect(held.backingBytes).toBeGreaterThan(0);
    expect(held.heldObjects).toBe(1);
    expect(held.probeObjects).toBe(1);
    await page.evaluate(() => window.__cominsBoundaryControl!.release());
    const released = await readWeakRegistrySnapshot(await capture("control-released"), "cominsBoundaryControlSet", "cominsBoundaryControlTarget", "CominsNativeBoundaryProbe", "native-boundary-control");
    await info.attach("bookkeeping-control-released.json", { body: JSON.stringify(released), contentType: "application/json" });
    expect(released).toMatchObject({ stores: 0, backingBytes: 0, heldObjects: 0, probeObjects: 0 });
    await page.evaluate(() => { delete window.__cominsBoundaryControl; });

    const route = async (target: string) => {
      await page.locator(`.docs-sidebar a[href="${target}"]`).first().evaluate((anchor: HTMLAnchorElement) => anchor.click());
      await expect(page).toHaveURL(new RegExp(`${target}$`, "u"));
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      expect(await page.evaluate(() => performance.timeOrigin)).toBe(document);
    };
    const enter = async () => {
      await route(workload.path);
      await workload.ready();
      await expect(page.getByTestId("header-groups-viewport")).toBeVisible();
      await expect(page.getByTestId("dynamic-group-viewport")).toBeVisible();
      await expect(page.locator("tr[data-comins-row-data-index]")).toHaveCount(60);
    };
    const leave = async () => {
      await route("/api/props");
      await expect(page.locator("[data-comins-table-instance-id]")).toHaveCount(0);
      await expect(page.locator("tr[data-comins-row-data-index]")).toHaveCount(0);
    };
    const registry = async (phase: string) => readWeakRegistrySnapshot(await capture(phase), "cominsColumnPlaceholderNativeBoundaries");
    // This empty-owner resource baseline is separate from the formal warmup10 counters.
    const cold = await registry("cold-free");
    for (let i = 0; i < 10; i++) { await enter(); await workload.exercise({ enter, leave }); }
    const warm = await registry("warm-free");
    for (let i = 0; i < 300; i++) { await enter(); await workload.exercise({ enter, leave }); }
    await leave();
    const retired = await registry("retired-free");
    expect(await hash()).toBe(beforeSource);
    await info.attach("header-bookkeeping.json", {
      body: JSON.stringify({ sourceSHA256: beforeSource, held, released, cold, warm, retired, snapshots,
        warmup: 10, cycles: 300, scope: "Source-bound empty-owner SDK registration backing; not the global 2% numeric gate" }, null, 2),
      contentType: "application/json",
    });
    expect(warm.backingBytes, "registration history after warm owner teardown").toBeLessThanOrEqual(cold.backingBytes);
    expect(retired.backingBytes, "registration history after 300 owner lifetimes").toBeLessThanOrEqual(cold.backingBytes);
  } finally {
    await workload.dispose();
    await session.detach();
  }
});
