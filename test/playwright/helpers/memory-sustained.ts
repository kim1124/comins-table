import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, expect, type CDPSession, type Page, type TestInfo } from "@playwright/test";
import { completeMemoryAudit, findMemoryStateFailures, memoryAuditStatus, type MemoryPoint } from "./memory-growth";
import { evaluateMemoryVerdict } from "./memory-verdict";
import { findHeapGrowth, readMemoryHeap, saveMemoryHeap } from "./memory-heap";
import { installMemoryResources } from "./memory-resources";
import { readBrowserResidentMemory } from "./memory-process";
import { initializeMemoryInstrumentation } from "./memory-instrumentation";
import { initializePlaygroundLocale } from "./playground-locale";
import { createUnmountWorkload, unmountScenarios, type UnmountScenario } from "./memory-unmount-workloads";
import { readBrowserBundleEvidence, readMemoryRuntime } from "./memory-runtime";
import { readMemoryPlaygroundMode, readPlaygroundBuildInputs, readDevelopmentPlaygroundEvidence } from "./playground-build";
import { collectMemoryServedScripts, assertProductionServedScripts, assertDevelopmentServedScripts } from "./memory-served-scripts";

export type MemoryScenario = "plain-scroll" | "virtual-scroll" | "route-unmount" | UnmountScenario;
const basic = "/docs/getting-started", virtual = "/performance/virtualization", free = "/api/props";
const checkpoints = [0, 10, 50, 100, 200, 300];
const warmup = 10;
const runId = process.env.MEMORY_AUDIT_RUN_ID ?? new Date().toISOString().replace(/[:.]/gu, "-");

async function inputs() {
  const files = ["package.json", "package-lock.json", "playwright.config.ts", "vite.example.config.ts", "scripts/serve-memory-playground.mjs"];
  async function walk(dir: string) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (/\.(?:ts|tsx|css|html|json)$/u.test(file)) files.push(file);
    }
  }
  for (const dir of ["src", "example/src", "test/playwright/helpers", "test/playwright/specs"]) await walk(dir);
  const hashes: Record<string, string> = readPlaygroundBuildInputs();
  for (const file of files.sort()) hashes[file] = createHash("sha256").update(await readFile(file)).digest("hex");
  return hashes;
}

async function settle(page: Page) {
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

async function route(page: Page, target: string, token: string) {
  if (new URL(page.url()).pathname !== target) {
    // 실제 Playground anchor와 React Router를 사용한다. reload/root 교체를 하지 않는다.
    await page.locator(`a[href="${target}"]`).first().evaluate((anchor: HTMLAnchorElement) => anchor.click());
  }
  await expect(page).toHaveURL(new RegExp(`${target}$`, "u"));
  const activeMounts = () => page.evaluate(() => (window as unknown as { __cominsTableLifecycle?: { activeMountCount: number } }).__cominsTableLifecycle?.activeMountCount ?? 0);
  if (target === free) await expect.poll(activeMounts).toBe(0);
  else await expect.poll(activeMounts).toBeGreaterThan(0);
  await settle(page);
  expect(await page.evaluate(() => (window as unknown as { __memoryDocumentToken: string }).__memoryDocumentToken)).toBe(token);
  if (target === free) {
    await expect(page.locator("[data-comins-table-instance-id]")).toHaveCount(0);
    await expect(page.locator("tr[data-comins-row-data-index]")).toHaveCount(0);
  } else {
    await expect(page.locator("[data-comins-table-instance-id]").first()).toBeVisible();
  }
}

async function scroll(page: Page, fraction: number) {
  await page.getByTestId("data-table-viewport").evaluate(async (element, value) => {
    const range = element.scrollHeight - element.clientHeight;
    if (range <= 0) throw new Error("Memory workload has no scrollable range");
    element.scrollTop = range * value;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    if (value > 0 && element.scrollTop <= 0) throw new Error("Memory workload did not scroll");
  }, fraction);
}

async function readCounter(session: CDPSession, processSession: CDPSession, step: string, auxiliaryWarnings: string[], diagnostic: boolean) {
  await session.send("HeapProfiler.collectGarbage");
  const cleanup = await session.send("Runtime.evaluate", {
    expression: diagnostic
      ? "if (!window.__memoryResources) throw new Error('Diagnostic resource tracker missing'); window.__memoryResources.read(); void 0"
      : "void 0",
    returnByValue: true,
  });
  if (cleanup.exceptionDetails) throw new Error(JSON.stringify(cleanup.exceptionDetails));
  await session.send("HeapProfiler.collectGarbage");
  await session.send("HeapProfiler.collectGarbage");
  const dom = await session.send("Memory.getDOMCounters");
  const performance = await session.send("Performance.getMetrics");
  const warn = (message: string) => { if (!auxiliaryWarnings.includes(message)) auxiliaryWarnings.push(message); };
  const nativeUsage = await session.send("Runtime.getHeapUsage").catch(error => {
    warn(`Native usage unavailable: ${String(error)}`);
    return { embedderHeapUsedSize: undefined, backingStorageSize: undefined };
  });
  if (nativeUsage.embedderHeapUsedSize === undefined || nativeUsage.backingStorageSize === undefined) warn("Embedder/backing-store coverage incomplete");
  const heap = performance.metrics.find(metric => metric.name === "JSHeapUsedSize")?.value;
  if (heap === undefined) throw new Error("JSHeapUsedSize unavailable");
  const resources = diagnostic
    ? "...window.__memoryResources.read().metrics,resourceCoverageComplete:Number(window.__memoryResources.read().complete),"
    : "";
  const result = await session.send("Runtime.evaluate", {
    expression: `({elements:document.querySelectorAll('*').length,rows:document.querySelectorAll('tr[data-comins-row-data-index]').length,tableRoots:document.querySelectorAll('[data-comins-table-instance-id]').length,activeMounts:window.__cominsTableLifecycle?.activeMountCount??0,${resources}scrollTop:document.querySelector('[data-testid="data-table-viewport"]')?.scrollTop??0,scrollLeft:document.querySelector('[data-testid="data-table-viewport"]')?.scrollLeft??0})`,
    returnByValue: true, objectGroup: "memory-counter",
  });
  await session.send("Runtime.releaseObjectGroup", { objectGroup: "memory-counter" });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  if (diagnostic && result.result.value.resourceCoverageComplete !== 1) warn("Observer/timer measurement coverage incomplete");
  // 보조 계측 누락은 기록하되 필수 세 지표의 수치 판정과 분리한다.
  const resident = await readBrowserResidentMemory(processSession).catch(error => {
    warn(`Process RSS unavailable: ${String(error)}`);
    return {};
  });
  return { step, metrics: { jsHeapUsedSize: heap,
    ...(nativeUsage.embedderHeapUsedSize === undefined ? {} : { embedderHeapUsedSize: nativeUsage.embedderHeapUsedSize }),
    ...(nativeUsage.backingStorageSize === undefined ? {} : { backingStorageSize: nativeUsage.backingStorageSize }),
    ...dom, ...result.result.value, ...resident } } satisfies MemoryPoint;
}

export async function runSustainedMemory(scenario: MemoryScenario, repeat: number, baseURL: string, testInfo: TestInfo, diagnostic = false) {
  const buildMode = readMemoryPlaygroundMode(process.env.PLAYWRIGHT_PLAYGROUND_MODE);
  const runtime = readMemoryRuntime();
  const directory = path.resolve(process.env.MEMORY_AUDIT_ARTIFACT_DIR ?? "reports/artifacts/strict-memory", runId, `${scenario}-${repeat}-${diagnostic ? "heap" : "counter"}`);
  await mkdir(directory, { recursive: true });
  const before = await inputs();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: "en-US", timezoneId: "UTC", deviceScaleFactor: 1, reducedMotion: "no-preference" });
  const page = await context.newPage();
  const servedScripts = collectMemoryServedScripts(page);
  await initializePlaygroundLocale(page, "en");
  await installMemoryResources(page, diagnostic ? "diagnostic" : "counter");
  const featureScenario = unmountScenarios.find(value => value === scenario);
  const workload = featureScenario ? await createUnmountWorkload(page, featureScenario) : undefined;
  const isUnmount = scenario === "route-unmount" || Boolean(workload);
  const errors: string[] = [];
  const auxiliaryWarnings: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (["error", "warning"].includes(message.type())) errors.push(message.text()); });
  const points: MemoryPoint[] = [], mounted: MemoryPoint[] = [], unmounted: MemoryPoint[] = [], heaps: MemoryPoint[] = [], heapFiles: string[] = [];
  const measurements: MemoryPoint[] = [];
  const heapGroups: Record<string, MemoryPoint[]> = { mounted: [], free: [] };
  const result = { scenario, repeat, diagnostic, directory, browser: browser.version(), runtime, protocol: { instrumentation: "Playwright utility/main worlds initialized before cold-free; pre-tooling cold preserved separately", warmup, cycles: 300, checkpoints, viewport: { width: 1280, height: 720 }, gcPerPoint: 3, resourceTracker: diagnostic ? "weak observers and live timer IDs" : "not installed in counter process", resourceCoverage: diagnostic ? "observer/timer diagnostics" : "not collected", residentMemory: "all CDP-reported browser processes; RSS includes JS and native; not added to heap", nativeSnapshotCoverage: diagnostic ? "separate diagnostic process" : "not collected in counter run", continuousHeapProfilerSession: true, contract: "devtools-three-counters-two-percent", thresholdPercent: 2, featureMountsPerCycle: (scenario === "cross-table-drag-gesture-unmount" || scenario === "loading-pending-unmount") ? 3 : scenario === "selection-clipboard-gesture-unmount" ? 2 : 1, attributionScope: "actual Playground interactions; separate controlled-consumer ownership diagnostics are not implied", comparison: "fixed same-state baseline; previous-point deltas are diagnostic only" }, before, measurements, points, mounted, unmounted, heaps, heapGroups, heapFiles, errors, auxiliaryWarnings, completed: false, layer: diagnostic ? "diagnostic" : "counter", buildMode: "vite-development", coverage: "numeric counters only; product retention attribution is separate" };
  result.buildMode = buildMode === "production" ? "vite-production" : "vite-development";
  let session: CDPSession | undefined;
  let processSession: CDPSession | undefined;
  async function persist() { await writeFile(path.join(directory, "result.json"), JSON.stringify(result, null, 2)); }
  async function point(step: string, target: MemoryPoint[], heap = false) {
    await settle(page);
    const sample = await readCounter(session!, processSession!, step, auxiliaryWarnings, diagnostic);
    target.push(sample);
    measurements.push(sample);
    await persist();
    console.log(`${scenario} #${repeat} ${diagnostic ? "heap" : "counter"} ${step}: ${JSON.stringify(sample.metrics)}`);
    if (heap) {
      const filename = path.join(directory, `${step}.heapsnapshot`);
      await saveMemoryHeap(session!, filename);
      heapFiles.push(filename);
      const heapPoint = { step, metrics: await readMemoryHeap(filename) };
      heaps.push(heapPoint);
      heapGroups[sample.metrics.tableRoots === 0 ? "free" : "mounted"]!.push(heapPoint);
      await persist();
    }
  }
  try {
    await page.goto(baseURL + free);
    const token = await page.evaluate(() => {
      const value = crypto.randomUUID();
      (window as unknown as { __memoryDocumentToken: string }).__memoryDocumentToken = value;
      return value;
    });
    await route(page, free, token);
    session = await context.newCDPSession(page);
    processSession = await browser.newBrowserCDPSession();
    await session.send("Performance.enable");
    await session.send("HeapProfiler.enable");
    const toolingCold = await readCounter(session, processSession!, "cold-before-tooling", auxiliaryWarnings, diagnostic);
    await writeFile(path.join(directory, "cold-before-tooling.json"), JSON.stringify(toolingCold, null, 2));
    await initializeMemoryInstrumentation(page);
    const cold = await readCounter(session, processSession!, "cold-free", auxiliaryWarnings, diagnostic);
    Object.assign(result, { coldBrowserBundles: readBrowserBundleEvidence() });
    await writeFile(path.join(directory, "cold.json"), JSON.stringify(cold, null, 2));
    const target = workload?.path ?? (scenario === "virtual-scroll" ? virtual : basic);
    const enter = async () => { await route(page, target, token); await workload?.ready(); };
    const leave = async () => { await route(page, free, token); await workload?.afterLeave?.(); };
    async function cycle(index: number, measured = false) {
      if (workload) {
        await enter();
        if (measured && checkpoints.includes(index)) await point(`mounted-${index}`, mounted, diagnostic);
        await workload.exercise({ enter, leave });
        await leave();
      } else if (scenario === "route-unmount") {
        await route(page, basic, token);
        await scroll(page, 0.5);
        await scroll(page, 0);
        if (measured && checkpoints.includes(index)) await point(`mounted-${index}`, mounted, diagnostic);
        await route(page, free, token);
      } else {
        // 같은 구간, 새로운 구간, 재방문 구간을 섞되 비교 시점은 시작점으로 고정한다.
        const fraction = [0.5, ((index % 97) + 1) / 98, 0.5][index % 3]!;
        await scroll(page, fraction);
        await scroll(page, 0);
      }
    }
    await enter();
    if (scenario === "virtual-scroll") await expect(page.getByTestId("data-table-viewport")).toHaveAttribute("data-virtualized", "true");
    else if (!workload) await expect(page.getByTestId("data-table-viewport")).not.toHaveAttribute("data-virtualized", "true");
    if (scenario === "virtual-scroll") {
      await expect.poll(() => page.getByTestId("data-table-viewport").evaluate(element => element.scrollHeight)).toBeGreaterThan(100_000);
    }
    for (let index = 0; index < warmup; index += 1) await cycle(index);
    await route(page, free, token);
    const browserBundles = readBrowserBundleEvidence();
    const actualServedScripts = await servedScripts.freeze();
    expect(browserBundles.mode).toBe(buildMode);
    if (browserBundles.mode === "production") assertProductionServedScripts(actualServedScripts, browserBundles.scripts, baseURL);
    else {
      Object.assign(result, { developmentServer: readDevelopmentPlaygroundEvidence(process.cwd(), baseURL) });
      await assertDevelopmentServedScripts(actualServedScripts, browserBundles.entryFiles, baseURL);
    }
    Object.assign(result, { browserBundles, actualServedScripts,
      scriptEvidenceProtocol: "HTTP bytes collected in Node before baselines; fixed URL inventory during measured cycles; same-URL repeated body/status not reverified; no additional in-page history" });
    await point("free-baseline", unmounted, diagnostic);
    await enter();
    if (!workload) { await scroll(page, 0.5); await scroll(page, 0); }
    await point("mounted-baseline", mounted, diagnostic && isUnmount);
    if (isUnmount) await leave();
    await point("baseline", points, diagnostic);
    for (let index = 1; index <= 300; index += 1) {
      await cycle(index, true);
      if (checkpoints.includes(index)) await point(`cycle-${index}`, points, diagnostic);
    }
    await route(page, free, token);
    await point("unmounted", unmounted, diagnostic);
    await page.waitForTimeout(1000);
    await point("unmounted-idle", unmounted, diagnostic);
    if (isUnmount) await point("final-idle", points, diagnostic);
    const after = await inputs();
    expect(after, "Memory measurement inputs changed during execution").toEqual(before);
    expect(readMemoryRuntime(), "Installed runtime changed during execution").toEqual(runtime);
    expect(readBrowserBundleEvidence(), "Local bundle files changed during measurement").toEqual(browserBundles);
    await servedScripts.verify();
    const growth = findMemoryStateFailures(measurements);
    const nativeGrowth = diagnostic ? Object.values(heapGroups).flatMap(group => findHeapGrowth(group)) : undefined;
    Object.assign(result, { after, growth, numericStatus: diagnostic ? "DIAGNOSTIC_ONLY" : memoryAuditStatus(growth), nativeGrowth, coverage: diagnostic ? "separate heap diagnostic; not numeric acceptance evidence" : result.coverage });
    completeMemoryAudit(result);
    // This counter/diagnostic run supplies no L1/L2 evidence. Do not infer leak absence.
    Object.assign(result, { verdict: evaluateMemoryVerdict({
      artifact: createHash("sha256").update(JSON.stringify(before)).digest("hex"),
      requiredNumeric: [`${scenario}-${repeat}`], requiredCoverage: [
        { id: "product-lifetime", layer: "lifetime", phase: "retired", target: scenario, expectation: "released" },
        { id: "active-cleanup", layer: "integration", phase: "retired", target: scenario, expectation: "responsibility-satisfied" },
      ],
      numeric: [{ id: `${scenario}-${repeat}`, artifact: createHash("sha256").update(JSON.stringify(before)).digest("hex"),
        status: diagnostic ? "NOT_RUN" : memoryAuditStatus(growth), evidence: path.join(directory, "result.json") }],
      coverage: [], lifetimeObservation: "NOT_ASSESSED", defectAttribution: "UNATTRIBUTED", defects: [],
    }) });
    await persist();
    await testInfo.attach(`${scenario}-${repeat}-${diagnostic ? "heap" : "counter"}`, { path: path.join(directory, "result.json"), contentType: "application/json" });
    return { growth, nativeGrowth, directory };
  } catch (error) {
    Object.assign(result, { completed: false, executionError: String(error) });
    await persist();
    throw error;
  } finally {
    servedScripts.dispose();
    await workload?.dispose();
    await session?.detach();
    await processSession?.detach();
    await browser.close();
  }
}
