import { expect, test, type Response } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { collectAfterJob, startDevelopmentRetention } from "../helpers/production-retention";
import { saveMemoryHeap } from "../helpers/memory-heap";
import { readWeakRegistrySnapshot } from "../helpers/weak-registry-snapshot";
import { readRowRetirementSnapshot, type RetirementServedScript } from "../helpers/row-retirement-snapshot";
import type { RowDataRetirementController } from "../../fixtures/react-retention-consumer/row-data-retirement";

test.use({ channel: "chromium", launchOptions: { chromiumSandbox: true } });
const sha = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
async function inputHashes(repository: string, sourceRoot: string) {
  const inputs = ["src/index.tsx", "src/react/header-renderer.tsx", "src/react/body-renderer.tsx"].map(name => path.join(sourceRoot, name));
  inputs.push(...["test/fixtures/react-retention-consumer/main.tsx", "test/fixtures/react-retention-consumer/row-data-retirement.tsx", "test/playwright/helpers/row-retirement-snapshot.ts", "test/playwright/specs/row-data-retirement.spec.ts", "example/src/styles.css", "styles.css"].map(name => path.join(repository, name)));
  return Object.fromEntries(await Promise.all(inputs.map(async file => {
    try { return [file, sha(await readFile(file))]; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return [file, null]; throw error; }
  })));
}

test("same-ID offscreen rows retire while SDK development stacks remain populated @perf @memory-lifetime", async ({ page, browser, browserName }, info) => {
  test.setTimeout(180000);
  expect(browserName).toBe("chromium");
  const repository = process.cwd(), site = await startDevelopmentRetention();
  const session = await page.context().newCDPSession(page);
  const directory = info.outputPath("row-data-retirement");
  await mkdir(directory, { recursive: true });
  const scripts = new Map<string, RetirementServedScript>(), pending = new Set<Promise<void>>();
  const errors: string[] = [];
  const evidence: Record<string, unknown> = { completed: false, diagnostic: true, layer: "lifetime", numericStatus: "NOT_RUN", browser: browser.version(), provenance: site.provenance,
    protocol: { generations: ["A", "B", "C"], rowCount: 1000, sameIDs: true, row0OffscreenBeforeReplacement: true, GCPerSnapshot: 3, newRootPerNavigation: false,
      scope: "Only the constructed A1000 cohort retires after B/C commits; unrelated pre-existing legacy fixture empty instrumentation remains; no all-SDK or numeric release claim" } };
  const persist = () => writeFile(path.join(directory, "result.json"), JSON.stringify(evidence, null, 2)+"\n");
  const onResponse = (response: Response) => {
    if (response.request().resourceType() !== "script") return;
    let job: Promise<void>;
    job = (async () => {
      const body = await response.body(), hash = sha(body), file = path.join(directory, `${hash}.js`);
      await writeFile(file, body);
      const previous = scripts.get(response.url());
      if (previous && previous.sha256 !== hash) throw new Error(`Script changed during run: ${response.url()}`);
      scripts.set(response.url(), { url: response.url(), file, sha256: hash });
    })().catch(error => { errors.push(String(error)); }).finally(() => pending.delete(job));
    pending.add(job);
  };
  page.on("response", onResponse);
  page.on("pageerror", error => errors.push(error.message));
  const settle = () => page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const capture = async (name: string) => {
    await settle();
    // The helper disposes its undefined handle, separates JS jobs and performs GC2.
    await collectAfterJob(page, session);
    await session.send("HeapProfiler.collectGarbage");
    const file = path.join(directory, `${name}.heapsnapshot`);
    await saveMemoryHeap(session, file);
    while (pending.size) await Promise.all(pending);
    return { file, sha256: sha(await readFile(file)) };
  };
  try {
    const before = await inputHashes(repository, site.provenance.sourceRoot);
    evidence.inputsBefore = before;
    expect(before[path.join(site.provenance.sourceRoot, "src/index.tsx")]).toBe(site.provenance.sourceSha256);
    await page.goto(new URL("free?profile=row-data-retirement", site.url).href);
    await expect(page.getByTestId("row-retirement-free")).toBeVisible();
    const origin = await page.evaluate(() => performance.timeOrigin);
    await session.send("HeapProfiler.enable");
    await page.evaluate(() => {
      class CominsNativeBoundaryProbe { marker = "native-boundary-control"; }
      let cominsBoundaryControlSet: WeakSet<object> | null = new WeakSet();
      let cominsBoundaryControlTarget: object | null = new CominsNativeBoundaryProbe();
      cominsBoundaryControlSet.add(cominsBoundaryControlTarget);
      Object.assign(window, { rowDataRetirementCalibration: { release() { cominsBoundaryControlSet = null; cominsBoundaryControlTarget = null; } } });
    });
    const heldSnapshot = await capture("calibration-held");
    const held = await readWeakRegistrySnapshot(heldSnapshot.file, "cominsBoundaryControlSet", "cominsBoundaryControlTarget", "CominsNativeBoundaryProbe", "native-boundary-control");
    expect(held).toMatchObject({ heldObjects: 1, probeObjects: 1 });
    await page.evaluate(() => (window as unknown as { rowDataRetirementCalibration: { release: () => void } }).rowDataRetirementCalibration.release());
    const releasedSnapshot = await capture("calibration-released");
    const released = await readWeakRegistrySnapshot(releasedSnapshot.file, "cominsBoundaryControlSet", "cominsBoundaryControlTarget", "CominsNativeBoundaryProbe", "native-boundary-control");
    expect(released).toMatchObject({ heldObjects: 0, probeObjects: 0 });
    evidence.calibration = { held, released, heldSnapshot, releasedSnapshot };
    await page.evaluate(() => Reflect.deleteProperty(window, "rowDataRetirementCalibration"));
    await page.getByRole("link", { name: "Table", exact: true }).evaluate((link: HTMLAnchorElement) => link.click());
    await expect(page.getByTestId("row-retirement-generation")).toHaveText("A");
    await expect(page.getByTestId("row-r0")).toBeVisible();
    await expect.poll(() => page.getByTestId("row-r0").evaluate(row => row.getBoundingClientRect().height)).toBeGreaterThan(60);
    const measuredA = await capture("measured-A");
    const fixtureURLs = [...scripts.keys()].filter(url => new URL(url).origin === new URL(site.url).origin && new URL(url).pathname === "/row-data-retirement.tsx");
    expect(fixtureURLs).toHaveLength(1);
    const parse = (file: string) => readRowRetirementSnapshot(file, { fixtureScriptURL: fixtureURLs[0]!, sourceRoot: site.provenance.sourceRoot, servedScripts: [...scripts.values()] });
    const initial = await parse(measuredA.file);
    evidence.measuredA = { snapshot: measuredA, result: initial };
    expect(initial.counts).toEqual({ A: 1000, B: 0, C: 0 });
    await persist();
    await page.getByTestId("row-retirement-viewport").evaluate(element => { element.scrollTop = 30000; element.dispatchEvent(new Event("scroll", { bubbles: true })); });
    await expect(page.getByTestId("row-r0")).toHaveCount(0);
    await settle();
    const states: unknown[] = [];
    for (const generation of ["B", "C"] as const) {
      await page.evaluate(value => (window as unknown as { rowDataRetirement: RowDataRetirementController }).rowDataRetirement.replace(value), generation);
      await expect(page.getByTestId("row-retirement-generation")).toHaveText(generation);
      await expect(page.locator("tr[data-comins-row-data-index]").first()).toContainText(`${generation}:`);
      await expect(page.getByTestId("row-r0")).toHaveCount(0);
      await settle();
      states.push({ generation, visibleRows: await page.locator("tr[data-comins-row-data-index]").count(), row0: await page.getByTestId("row-r0").count() });
    }
    evidence.states = states;
    const afterCSnapshot = await capture("after-C"), afterC = await parse(afterCSnapshot.file);
    evidence.afterC = { snapshot: afterCSnapshot, result: afterC };
    const after = await inputHashes(repository, site.provenance.sourceRoot);
    evidence.inputsAfter = after; evidence.servedScripts = [...scripts.values()]; evidence.errors = errors;
    expect(after).toEqual(before);
    expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin);
    expect(errors).toEqual([]);
    expect(afterC.counts.C).toBe(1000);
    evidence.completed = true;
    evidence.retirementStatus = afterC.counts.A === 0 ? "PASS_SCOPED_A_COHORT" : "FAIL_A_COHORT_RETAINED";
    await persist();
    await info.attach("row-data-retirement", { path: path.join(directory, "result.json"), contentType: "application/json" });
    expect(afterC.counts.A).toBe(0);
  } catch (error) {
    evidence.executionError = String(error); throw error;
  } finally {
    await persist();
    page.off("response", onResponse);
    await session.detach();
    await page.goto("about:blank");
    await site.close();
  }
});
