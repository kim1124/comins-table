// @vitest-environment node
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { ZipReader, Uint8ArrayReader, Uint8ArrayWriter } from "@zip.js/zip.js/index-native.js";
import { build, type Plugin, type UserConfig } from "vite";
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import playgroundConfig from "../vite.example.config";

const config = playgroundConfig as UserConfig;
type Files = Record<string, Uint8Array>;
type Callback = (error: unknown, bytes: Uint8Array | null) => void;
type Zip = (files: Files, callback: Callback) => () => void;
async function compileSupplier(workerScope: boolean, rawAdapter = false) {
  const require = createRequire(import.meta.url);
  const entry = join(dirname(require.resolve("write-excel-file/package.json")), "modules/zip/zipToArrayBuffer.js");
  const directory = mkdtempSync(join(tmpdir(), "comins-worker-zip-test-"));
  const plugins = workerScope ? config.worker?.plugins?.() ?? [] : config.plugins ?? [];
  if (rawAdapter) plugins.push({ name: "owned-zip-callback-fixture", transform(_code, id) {
    if (id === entry) return 'export { zip } from "fflate";';
  } });
  try {
    await build({ configFile: false, root: join(process.cwd(), "example"), publicDir: false, cacheDir: join(directory, "cache"), logLevel: "silent", plugins,
      build: { outDir: directory, emptyOutDir: false, copyPublicDir: false, target: "es2022", sourcemap: false, minify: true,
        lib: { entry, formats: ["es"], fileName: () => "archive.mjs" }, reportCompressedSize: false } });
    const exports = await import(/* @vite-ignore */ pathToFileURL(join(directory, "archive.mjs")).href);
    return { exports, cleanup: () => rmSync(directory, { recursive: true, force: true }) };
  } catch (error) { rmSync(directory, { recursive: true, force: true }); throw error; }
}
let callbackFixture: Awaited<ReturnType<typeof compileSupplier>>;
beforeAll(async () => { callbackFixture = await compileSupplier(true, true); }, 20_000);
afterAll(() => callbackFixture?.cleanup());
afterEach(() => vi.unstubAllGlobals());

it("compresses large XLSX ZIP content inside its existing Worker without spawning a nested Worker", async () => {
  let nestedWorkers = 0;
  vi.stubGlobal("Worker", class { constructor() { nestedWorkers++; throw new Error("NESTED_WORKER_FORBIDDEN"); } });
  const fixture = await compileSupplier(true);
  try {
    const archive = fixture.exports.default as (files: Files) => Promise<ArrayBuffer>;
    const input = new TextEncoder().encode("한글 zero0 false 😀\n".repeat(20_000));
    expect(input.byteLength).toBeGreaterThan(160_000);
    const bytes = await archive({ "payload.txt": input });
    expect(nestedWorkers).toBe(0);
    const reader = new ZipReader(new Uint8ArrayReader(new Uint8Array(bytes)), { useWebWorkers: false });
    try {
      const entries = await reader.getEntries();
      expect(entries).toHaveLength(1);
      const file = entries[0];
      if (!file || file.directory) throw new Error("EXPECTED_FILE_ENTRY");
      expect(file.filename).toBe("payload.txt");
      expect(await file.getData(new Uint8ArrayWriter(), { useWebWorkers: false, checkSignature: true })).toEqual(input);
    } finally { await reader.close(); }
  } finally { fixture.cleanup(); }
}, 20_000);

it("keeps the main-thread supplier on its original asynchronous Worker path", async () => {
  let workers = 0;
  vi.stubGlobal("Worker", class { constructor() { workers++; throw new Error("EXPECTED_ASYNC_WORKER"); } });
  const fixture = await compileSupplier(false);
  try {
    const archive = fixture.exports.default as (files: Files) => Promise<ArrayBuffer>;
    await expect(archive({ "large.bin": new Uint8Array(300_000) })).rejects.toThrow("EXPECTED_ASYNC_WORKER");
    expect(workers).toBe(1);
  } finally { fixture.cleanup(); }
}, 20_000);

it("delivers the Worker ZIP callback asynchronously once", async () => {
  const zip = callbackFixture.exports.zip as Zip;
  const callback = vi.fn();
  zip({ "value.txt": new Uint8Array([0, 1, 2]) }, callback);
  expect(callback).not.toHaveBeenCalled();
  await Promise.resolve();
  expect(callback).toHaveBeenCalledOnce();
  expect(callback.mock.calls[0]![0]).toBeNull();
  expect(callback.mock.calls[0]![1]).toBeInstanceOf(Uint8Array);
});

it("cancels queued compression before delivering a callback", async () => {
  const callback = vi.fn();
  const cancel = (callbackFixture.exports.zip as Zip)({ "value.txt": new Uint8Array([1]) }, callback);
  cancel();
  await Promise.resolve();
  expect(callback).not.toHaveBeenCalled();
});

it("reports a compression error once", async () => {
  const callback = vi.fn();
  (callbackFixture.exports.zip as Zip)({ ["a".repeat(65_536)]: new Uint8Array([1]) }, callback);
  await Promise.resolve();
  expect(callback).toHaveBeenCalledOnce();
  expect(callback.mock.calls[0]![0]).toBeTruthy();
  expect(callback.mock.calls[0]![1]).toBeNull();
});

it("does not catch and redeliver an exception thrown by the callback", () => {
  const tasks: Array<() => void> = [];
  vi.stubGlobal("queueMicrotask", (task: () => void) => tasks.push(task));
  const callback = vi.fn(() => { throw new Error("CALLBACK_SENTINEL"); });
  (callbackFixture.exports.zip as Zip)({ "value.txt": new Uint8Array([1]) }, callback);
  expect(tasks).toHaveLength(1);
  expect(() => tasks[0]!()).toThrow("CALLBACK_SENTINEL");
  expect(callback).toHaveBeenCalledOnce();
});

function freshPlugin(): Plugin {
  const plugins = config.worker?.plugins?.() as Plugin[] | undefined;
  const plugin = plugins?.find(candidate => candidate.name === "comins-xlsx-worker-compression");
  if (!plugin) throw new Error("WORKER_PLUGIN_REQUIRED");
  (plugin.configResolved as Hook).call({}, { root: join(process.cwd(), "example") });
  return plugin;
}
type Hook = (this: unknown, ...args: unknown[]) => unknown;
const supplier = "/packages/write-excel-file/modules/zip/zipToArrayBuffer.js";
it("limits resolution to the supplier ZIP importer and keeps generated source path-free", async () => {
  const plugin = freshPlugin();
  const resolver = plugin.resolveId as Hook;
  const resolve = vi.fn(async () => ({ id: "/supplier/fflate-browser.js" }));
  const context = { resolve, error: (message: string) => { throw new Error(message); } };
  expect(await resolver.call(context, "fflate", "/application/main.ts")).toBeUndefined();
  expect(resolve).not.toHaveBeenCalled();
  const adapter = await resolver.call(context, "fflate", supplier);
  expect(resolve).toHaveBeenCalledWith("fflate", supplier, { skipSelf: true });
  expect(existsSync(String(adapter))).toBe(true);
  const source = readFileSync(String(adapter), "utf8");
  expect(source).toContain("comins:xlsx-worker-zip-engine");
  expect(source).not.toContain("/supplier/fflate-browser.js");
  expect(await resolver.call(context, "comins:xlsx-worker-zip-engine", adapter)).toBe("/supplier/fflate-browser.js");
});

it("fails closed when the supplier engine cannot be bundled", async () => {
  const resolver = freshPlugin().resolveId as Hook;
  const context = { resolve: async () => ({ id: "external-engine", external: true }), error: (message: string) => { throw new Error(message); } };
  await expect(resolver.call(context, "fflate", supplier)).rejects.toThrow("must be bundled");
});

it("fails the target Worker build if the supplier replacement disappears", () => {
  const plugin = freshPlugin();
  const context = { getModuleIds: () => ["/project/example/src/features/xlsx-file.worker.ts"][Symbol.iterator](), error: (message: string) => { throw new Error(message); } };
  expect(() => (plugin.generateBundle as Hook).call(context)).toThrow("match exactly once");
});
