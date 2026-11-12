import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { build, createServer, preview, type PreviewServer, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import type { CDPSession, Page } from "@playwright/test";

const hash = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");

/** Development-only lifecycle diagnostics; keep them separate from production release evidence. */
export async function startDevelopmentRetention() {
  const repository = process.cwd();
  const sourceRoot = path.resolve(process.env.COMINS_RETENTION_SOURCE_ROOT ?? repository);
  const source = path.join(sourceRoot, "src/index.tsx");
  const directory = await mkdtemp(path.join(os.tmpdir(), "comins-retention-dev-"));
  const previousNodeEnv = process.env.NODE_ENV;
  const restoreNodeEnv = () => {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  };
  let server: ViteDevServer | undefined;
  try {
    // Vite reads NODE_ENV during transforms too; retain development mode until close.
    process.env.NODE_ENV = "development";
    server = await createServer({ configFile: false, root: path.join(repository, "test/fixtures/react-retention-consumer"),
    plugins: [react()], resolve: { alias: { "comins-retention-source": source }, dedupe: ["react", "react-dom"] },
    cacheDir: path.join(directory, "cache"), server: { host: "127.0.0.1", port: 0, strictPort: true, fs: { allow: [repository, sourceRoot] } } });
    await server.listen();
    const address = server.httpServer!.address();
    if (!address || typeof address === "string") throw new Error("Development fixture has no TCP address");
    return { url: `http://127.0.0.1:${address.port}/`, provenance: { sourceRoot, sourceSha256: hash(await readFile(source)) }, async close() {
      try { await server!.close(); await rm(directory, { recursive: true, force: true }); }
      finally { restoreNodeEnv(); }
    } };
  } catch (error) {
    try { await server?.close(); await rm(directory, { recursive: true, force: true }); }
    finally { restoreNodeEnv(); }
    throw error;
  }
}

export async function startProductionRetention() {
  const repository = process.cwd();
  const sourceRoot = path.resolve(process.env.COMINS_RETENTION_SOURCE_ROOT ?? repository);
  const source = path.join(sourceRoot, "src/index.tsx");
  const directory = await mkdtemp(path.join(os.tmpdir(), "comins-retention-"));
  let server: PreviewServer | undefined;
  const previousNodeEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    const config = {
      configFile: false as const, root: path.join(repository, "test/fixtures/react-retention-consumer"),
      plugins: [react()], resolve: { alias: { "comins-retention-source": source }, dedupe: ["react", "react-dom"] },
      cacheDir: path.join(directory, "cache"), build: { outDir: path.join(directory, "dist"), emptyOutDir: true },
      preview: { host: "127.0.0.1", port: 0, strictPort: true },
    };
    await build(config);
    server = await preview(config);
    const address = server.httpServer.address();
    if (!address || typeof address === "string") throw new Error("Production preview has no TCP address");
    const assets = path.join(directory, "dist/assets");
    const scripts = await Promise.all((await readdir(assets)).filter(name => name.endsWith(".js")).map(async name => {
      const content = await readFile(path.join(assets, name), "utf8");
      if (/\/@vite\/client|react-refresh|RefreshRuntime/.test(content)) throw new Error("Development runtime in production bundle");
      return { name, sha256: hash(content) };
    }));
    return { url: `http://127.0.0.1:${address.port}/`, provenance: { sourceRoot, sourceSha256: hash(await readFile(source)), cellFillSha256: hash(await readFile(path.join(sourceRoot, "src/cell-fill.tsx"))), scripts },
      async close() { await new Promise<void>((resolve, reject) => server!.httpServer.close(error => error ? reject(error) : resolve())); await rm(directory, { recursive: true, force: true }); } };
  } catch (error) {
    if (server) await new Promise<void>(resolve => server!.httpServer.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
    throw error;
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
}

/** WeakRef 확인 job 종료 → remote handle 해제 → 다음 task GC2 → 다음 job 검사를 고정한다. */
export async function collectAfterJob(page: Page, session: CDPSession) {
  const handle = await page.evaluateHandle(() => undefined);
  await handle.dispose();
  await page.evaluate(() => new Promise<void>(resolve => setTimeout(resolve, 0)));
  await session.send("HeapProfiler.collectGarbage");
  await session.send("HeapProfiler.collectGarbage");
  await page.evaluate(() => new Promise<void>(resolve => setTimeout(resolve, 0)));
}
