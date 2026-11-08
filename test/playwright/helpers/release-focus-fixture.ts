import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { build } from "vite";
import react from "@vitejs/plugin-react";

type ChunkInfo = { imports: string[]; dynamicImports: string[]; modules: string[]; entry: boolean; facade: string | null };
export async function startReleaseFocusFixture() {
  const root = path.resolve("test/playwright/fixtures/release-focus");
  const outDir = path.resolve(".local/release-024-release-focus/fixtures", `${Date.now()}-${process.pid}`);
  const sdkEntry = path.resolve(process.env.COMINS_FOCUS_SDK_ENTRY ?? "src/index.tsx");
  const reactRoot = path.resolve(process.env.COMINS_FOCUS_REACT_ROOT ?? "node_modules");
  const runtimeAliases = ["react/jsx-runtime", "react/jsx-dev-runtime", "react-dom/client", "react-dom", "react"].map(name => ({ find: new RegExp(`^${name}$`), replacement: path.join(reactRoot, name.includes("/") ? `${name}.js` : `${name}/index.js`) }));
  const graph: Record<string, ChunkInfo> = {};
  await mkdir(outDir, { recursive: true });
  await build({ configFile: false, root, logLevel: "error", plugins: [react(), {
    name: "record-focus-fixture-graph", generateBundle(_, bundle) {
      for (const [file, entry] of Object.entries(bundle)) if (entry.type === "chunk") graph[file] = { imports: entry.imports, dynamicImports: entry.dynamicImports, modules: Object.keys(entry.modules), entry: entry.isEntry, facade: entry.facadeModuleId };
    },
  }], resolve: { alias: [...runtimeAliases, { find: "comins-table/styles.css", replacement: path.resolve("styles.css") }, { find: /^comins-table$/, replacement: sdkEntry }], dedupe: ["react", "react-dom"] }, build: {
    outDir, emptyOutDir: false, minify: false, sourcemap: true,
    rollupOptions: { input: { table: path.join(root, "table.html"), control: path.join(root, "control.html") }, output: { codeSplitting: { groups: [
      { name: "react-runtime", test: /node_modules\/(react|react-dom|scheduler)\//, priority: 30 },
      { name: "router-runtime", test: /node_modules\/react-router\//, priority: 20 },
    ] } } },
  } });
  const controlEntry = Object.entries(graph).find(([, c]) => c.entry && c.facade?.endsWith("/control.html"))?.[0];
  if (!controlEntry) throw new Error("Control entry missing");
  const reach = new Set<string>(), pending = [controlEntry];
  while (pending.length) { const file = pending.pop()!; if (reach.has(file)) continue; reach.add(file); pending.push(...(graph[file]?.imports ?? []), ...(graph[file]?.dynamicImports ?? [])); }
  if ([...reach].flatMap(file => graph[file]?.modules ?? []).some(file => file.startsWith(path.resolve("src") + path.sep) || file === sdkEntry || file.includes("/final-candidate/"))) throw new Error("SDK present in control dependency closure");
  const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
  const servedScripts: Record<string,string> = {};
  const server = createServer(async (req,res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      const relative = url.pathname.startsWith("/assets/") ? url.pathname.slice(1) : url.searchParams.get("arm") === "control" ? "control.html" : "table.html";
      const file = path.resolve(outDir, relative);
      if (!file.startsWith(outDir + path.sep)) { res.writeHead(404).end(); return; }
      const bytes = await readFile(file);
      if (relative.endsWith(".js")) servedScripts[relative] = sha(bytes);
      res.setHeader("Content-Type", file.endsWith(".js") ? "application/javascript" : file.endsWith(".css") ? "text/css" : "text/html"); res.end(bytes);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise<void>((resolve,reject) => { server.once("error",reject); server.listen(0,"127.0.0.1",resolve); });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Fixture port unavailable");
  const manifest = { reactRoot, reactVersion: JSON.parse(await readFile(path.join(reactRoot, "react/package.json"), "utf8")).version, sdkEntry, sdkEntrySHA256: sha(await readFile(sdkEntry)), graph, controlReach: [...reach], controlProductModules: 0 };
  await writeFile(path.join(outDir,"manifest.json"),JSON.stringify(manifest,null,2));
  return { baseURL: `http://127.0.0.1:${address.port}`, outDir, manifest, servedScripts, close: () => new Promise<void>((resolve,reject) => server.close(error=>error?reject(error):resolve())) };
}
