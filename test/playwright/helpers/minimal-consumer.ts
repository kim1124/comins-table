import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { build, preview, type PreviewServer } from "vite";
import react from "@vitejs/plugin-react";

/** No Playground, development runtime, global reset, or injected component CSS. */
export async function startMinimalConsumer() {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "comins-minimal-"));
  const sourceRoot = path.resolve(process.env.COMINS_MINIMAL_SOURCE_ROOT ?? process.cwd());
  const config = { configFile: false as const, root: path.resolve("test/fixtures/react-minimal-consumer"),
    resolve: { alias: { "comins-minimal-source": path.join(sourceRoot, "src/index.tsx"), "comins-minimal-styles": path.join(sourceRoot, "styles.css") }, dedupe: ["react", "react-dom"] },
    plugins: [react()], build: { outDir: path.join(temporary, "dist"), emptyOutDir: true },
    preview: { host: "127.0.0.1", port: 0, strictPort: true } };
  let server: PreviewServer | undefined;
  const previousNodeEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    await build(config);
    server = await preview(config);
    const address = server.httpServer.address();
    if (!address || typeof address === "string") throw new Error("Minimal consumer has no address");
    return { url: `http://127.0.0.1:${address.port}/`, async close() {
      await new Promise<void>((resolve, reject) => server!.httpServer.close(error => error ? reject(error) : resolve()));
      await rm(temporary, { recursive: true, force: true });
    } };
  } catch (error) {
    if (server) await new Promise<void>(resolve => server!.httpServer.close(() => resolve()));
    await rm(temporary, { recursive: true, force: true });
    throw error;
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
}
