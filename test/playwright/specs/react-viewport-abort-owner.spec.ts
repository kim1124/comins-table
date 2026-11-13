import { expect, test } from "@playwright/test";
import { createServer } from "vite";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { collectAfterJob } from "../helpers/production-retention";
import { saveMemoryHeap } from "../helpers/memory-heap";
import { readAbortOwnerSnapshot } from "../helpers/viewport-abort-owner-snapshot";
import { readBrowserBundleEvidence } from "../helpers/memory-runtime";

const sha = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
type Controller = {
  state: { signal?: AbortSignal; executor?: unknown };
  calibrate(): void; releaseCalibration(): void; install(): void; dispose(): void; dropSignal(): void; hasMountedRoot(): boolean;
};

test("actual React hook callback owner after unmount while consumer holds default aborted signal @perf @memory-lifetime", async ({ page, browser, baseURL }, info) => {
  test.setTimeout(180000);
  const repository = process.cwd();
  if (!baseURL) throw new Error("INVALID main Playground URL");
  // Finish loading the main runtime before fixture startup or SDK response collection.
  await page.goto(new URL("/api/props", baseURL).href, { waitUntil: "networkidle" });
  await expect(page).toHaveURL(new URL("/api/props", baseURL).href);
  const mainBundlesBefore = readBrowserBundleEvidence(repository);
  const source = path.resolve(process.env.COMINS_ABORT_OWNER_SOURCE ?? "src/browser/viewport-requests.ts");
  const inputFiles = [source, path.join(repository, "src/react/viewport.ts"), path.join(repository, "src/core/viewport/data.ts"), path.join(repository, "test/fixtures/react-viewport-abort-owner/index.html"), path.join(repository, "test/fixtures/react-viewport-abort-owner/main.tsx"), path.join(repository, "test/playwright/helpers/viewport-abort-owner-snapshot.ts"), path.join(repository, "test/playwright/helpers/memory-runtime.ts"), path.join(repository, "test/playwright/specs/react-viewport-abort-owner.spec.ts")];
  const inputs = async () => Object.fromEntries(await Promise.all(inputFiles.map(async file => [file, sha(await readFile(file))])));
  const inputsBefore = await inputs();
  const sourceBefore = inputsBefore[source];
  const server = await createServer({ configFile: false, cacheDir: info.outputPath("vite-cache"), root: path.join(repository, "test/fixtures/react-viewport-abort-owner"),
    resolve: { dedupe: ["react", "react-dom"], alias: { "comins-hook-source": path.join(repository, "src/react/viewport.ts"), "comins-hook-data": path.join(repository, "src/core/viewport/data.ts") } },
    server: { host: "127.0.0.1", port: 0, strictPort: true, fs: { allow: [repository] } } });
  const directory = process.env.COMINS_ABORT_OWNER_EVIDENCE ? path.resolve(process.env.COMINS_ABORT_OWNER_EVIDENCE) : info.outputPath("abort-owner");
  await mkdir(directory, { recursive: true });
  const errors: string[] = [], scripts = new Map<string, { url: string; sha256: string }>(), pending = new Set<Promise<void>>();
  const evidence: Record<string, unknown> = { scope: "actual useCominsViewportRequests state callback owner only; development Chrome L1, no numeric verdict", browser: browser.version(), source, sourceBefore, inputsBefore, completed: false, status: "INVALID" };
  const snapshots: Record<string, { file: string; sha256: string }> = {};
  const phases: Record<string, Awaited<ReturnType<typeof readAbortOwnerSnapshot>>> = {};
  const persist = () => writeFile(path.join(directory, "result.json"), JSON.stringify({ ...evidence, phases, snapshots, scripts: [...scripts.values()], errors }, null, 2));
  page.on("pageerror", error => errors.push(error.message));
  page.on("response", response => {
    if (response.request().resourceType() !== "script") return;
    let job: Promise<void>;
    job = (async () => {
      const body = await response.body(), hash = sha(body), previous = scripts.get(response.url());
      if (previous && previous.sha256 !== hash) throw new Error("Script changed during run");
      scripts.set(response.url(), { url: response.url(), sha256: hash });
      await writeFile(path.join(directory, `${hash}.js`), body);
    })().catch(error => { errors.push(String(error)); }).finally(() => pending.delete(job));
    pending.add(job);
  });
  let session: import("@playwright/test").CDPSession | undefined;
  try {
    await server.listen();
    const address = server.httpServer!.address();
    if (!address || typeof address === "string") throw new Error("INVALID fixture address");
    const url = `http://127.0.0.1:${address.port}`;
    await page.goto(url);
    await page.waitForFunction(() => Object.hasOwn(window, "abortOwner"));
    const origin = await page.evaluate(() => performance.timeOrigin);
    session = await page.context().newCDPSession(page);
    await session.send("HeapProfiler.enable");
    const capture = async (name: string) => {
      await collectAfterJob(page, session!);
      await session!.send("HeapProfiler.collectGarbage");
      const file = path.join(directory, `${name}.heapsnapshot`);
      await saveMemoryHeap(session!, file);
      snapshots[name] = { file, sha256: sha(await readFile(file)) };
      while (pending.size) await Promise.all(pending);
      const sdkScripts = [...scripts.keys()].filter(value => new URL(value).pathname.endsWith(source));
      if (sdkScripts.length !== 1) throw new Error(`INVALID actual SDK Script count ${sdkScripts.length}`);
      const result = await readAbortOwnerSnapshot(file, [...scripts.values()], `${url}/main.tsx`, sdkScripts[0]!, [{ name: "useCominsViewportRequests", url: [...scripts.keys()].find(value => new URL(value).pathname.endsWith("/src/react/viewport.ts")) ?? "MISSING" }]);
      phases[name] = result;
      await persist();
      return result;
    };
    // No probe object crosses the browser boundary; only primitive state is returned.
    await page.evaluate(() => (window as unknown as { abortOwner: Controller }).abortOwner.calibrate());
    expect(await capture("calibration-held")).toMatchObject({ rawOwners: 1, strongOwners: 1 });
    await page.evaluate(() => (window as unknown as { abortOwner: Controller }).abortOwner.releaseCalibration());
    expect(await capture("calibration-dropped")).toMatchObject({ rawOwners: 0, strongOwners: 0 });
    await page.evaluate(() => (window as unknown as { abortOwner: Controller }).abortOwner.install());
    await page.waitForFunction(() => (window as unknown as { abortOwner: Controller }).abortOwner.state.signal instanceof AbortSignal);
    expect(await capture("owner-held")).toMatchObject({ rawOwners: 1, strongOwners: 1 });
    await page.evaluate(() => (window as unknown as { abortOwner: Controller }).abortOwner.dispose());
    evidence.abortState = await page.evaluate(() => {
      const state = (window as unknown as { abortOwner: Controller }).abortOwner.state, signal = state.signal!;
      return { aborted: signal.aborted, nativeReason: signal.reason instanceof DOMException, name: signal.reason.name, executorPresent: Object.hasOwn(state, "executor") };
    });
    expect(evidence.abortState).toEqual({ aborted: true, nativeReason: true, name: "AbortError", executorPresent: false });
    expect(await page.evaluate(() => (window as unknown as { abortOwner: Controller }).abortOwner.hasMountedRoot())).toBe(false);
    await capture("consumer-signal-held");
    await page.evaluate(() => (window as unknown as { abortOwner: Controller }).abortOwner.dropSignal());
    expect(await capture("consumer-signal-dropped")).toMatchObject({ rawOwners: 0, strongOwners: 0 });
    expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin);
    evidence.inputsAfter = await inputs();
    expect(evidence.inputsAfter).toEqual(inputsBefore);
    expect(errors).toEqual([]);
    const held = phases["consumer-signal-held"]!;
    evidence.ownerStatus = held.rawOwners === 0 && held.strongOwners === 0 ? "PASS_SCOPED" : "FAIL_OWNER_RETAINED";
    const mainBundlesAfter = readBrowserBundleEvidence(repository);
    evidence.mainBundles = { before: mainBundlesBefore, after: mainBundlesAfter };
    const cacheUnchanged = JSON.stringify(mainBundlesAfter) === JSON.stringify(mainBundlesBefore);
    evidence.cacheStatus = cacheUnchanged ? "PASS" : "FAIL_MAIN_CACHE_CHANGED";
    if (!cacheUnchanged) evidence.status = "FAIL_FIXTURE_CACHE_ISOLATION";
    expect(mainBundlesAfter, "Fixture must preserve the main Playground runtime cache").toEqual(mainBundlesBefore);
    evidence.completed = true;
    evidence.status = held.rawOwners === 0 && held.strongOwners === 0 ? "PASS_SCOPED" : "FAIL_OWNER_RETAINED";
    await persist();
    expect(phases["consumer-signal-held"]).toMatchObject({ rawOwners: 0, strongOwners: 0 });
  } catch (error) {
    evidence.executionError = String(error); throw error;
  } finally {
    await persist();
    await session?.detach();
    await page.goto("about:blank");
    await server.close();
  }
});
