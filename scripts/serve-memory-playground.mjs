import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { readMemoryPlaygroundMode, readPlaygroundBuildInputs, readPlaygroundOutputFiles } from "../test/playwright/helpers/playground-build.ts";

const { values } = parseArgs({ options: { port: { type: "string", default: "4003" }, mode: { type: "string", default: "production" } } });
if (!/^\d+$/u.test(values.port) || Number(values.port) < 1 || Number(values.port) > 65535) throw new Error("Invalid Playground server port");
const mode = readMemoryPlaygroundMode(values.mode);
process.env.NODE_ENV = mode;
const { build, preview, createServer } = await import("vite");
const root = process.cwd();
const inputs = readPlaygroundBuildInputs(root);
const configFile = path.join(root, "vite.example.config.ts");
mkdirSync(path.join(root, ".local"), { recursive: true });
let close;
if (mode === "development") {
  const server = await createServer({ configFile, server: { host: "127.0.0.1", port: Number(values.port), strictPort: true } });
  await server.listen();
  writeFileSync(path.join(root, ".local/playground-development-evidence.json"), JSON.stringify({
    mode, origin: `http://127.0.0.1:${Number(values.port)}`, pid: process.pid, inputs,
  }, null, 2));
  server.printUrls();
  close = () => server.close();
} else {
  let modules = [];
  const outDir = path.join(root, ".local/playground-production");
  await build({ configFile, build: { outDir, emptyOutDir: true },
    plugins: [{ name: "playground-memory-production-evidence", generateBundle() {
      modules = [...this.getModuleIds()].filter(id => !id.startsWith("\0"))
        .map(id => path.relative(root, id).split(path.sep).join("/")).sort();
    } }],
  });
  if (JSON.stringify(inputs) !== JSON.stringify(readPlaygroundBuildInputs(root))) throw new Error("Playground inputs changed during build");
  writeFileSync(path.join(root, ".local/playground-production-evidence.json"), JSON.stringify({
    mode, inputs, modules, outputs: readPlaygroundOutputFiles(root),
  }, null, 2));
  const server = await preview({ configFile, build: { outDir }, preview: { host: "127.0.0.1", port: Number(values.port), strictPort: true } });
  server.printUrls();
  close = () => new Promise((resolve, reject) => server.httpServer.close(error => error ? reject(error) : resolve()));
}
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => { void close().then(() => process.exit(0), () => process.exit(1)); });
