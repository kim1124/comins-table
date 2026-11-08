import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

export type MemoryPlaygroundMode = "development" | "production";
const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

export function readMemoryPlaygroundMode(value?: string): MemoryPlaygroundMode {
  if (value === undefined || value === "development") return "development";
  if (value === "production") return value;
  throw new Error("Unknown Playground memory build mode");
}

export function shouldReusePlaygroundServer(mode: MemoryPlaygroundMode, explicit?: string) {
  return mode === "development" && explicit === "1";
}

export function readDevelopmentPlaygroundEvidence(root: string, baseURL: string) {
  const bytes = readFileSync(path.join(root, ".local/playground-development-evidence.json"));
  const metadata = JSON.parse(bytes.toString()) as { mode: string; origin: string; pid: number; inputs: Record<string, string> };
  if (metadata.mode !== "development" || metadata.origin !== new URL(baseURL).origin
    || !Number.isInteger(metadata.pid) || metadata.pid < 1) throw new Error("Invalid development server evidence");
  try { process.kill(metadata.pid, 0); } catch { throw new Error("Development server is no longer live"); }
  if (JSON.stringify(metadata.inputs) !== JSON.stringify(readPlaygroundBuildInputs(root))) throw new Error("Development server inputs changed");
  return { ...metadata, mode: "development" as const, metadataSHA256: sha(bytes) };
}

export function readPlaygroundBuildInputs(root = process.cwd()) {
  const files = ["package.json", "package-lock.json", "styles.css", "vite.example.config.ts", "tsconfig.json", "postcss.config.mjs", "example/index.html",
    "scripts/serve-memory-playground.mjs", "test/playwright/helpers/playground-build.ts"];
  function walk(folder: string, allFiles = false) {
    for (const entry of readdirSync(path.join(root, folder), { withFileTypes: true })) {
      const relative = `${folder}/${entry.name}`;
      if (entry.isDirectory()) walk(relative, allFiles);
      else if (allFiles || /\.(?:ts|tsx|js|mjs|css|html|json)$/u.test(relative)) files.push(relative);
    }
  }
  for (const folder of ["src", "example/src", "example/build"]) walk(folder);
  walk("example/public", true);
  return Object.fromEntries(files.sort().map(file => [file, sha(readFileSync(path.join(root, file)))]));
}

export function readPlaygroundOutputFiles(root = process.cwd()) {
  const directory = path.join(root, ".local/playground-production");
  const files: Record<string, string> = Object.create(null);
  function walk(folder: string) {
    for (const entry of readdirSync(folder, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) walk(file);
      else files[path.relative(directory, file).split(path.sep).join("/")] = sha(readFileSync(file));
    }
  }
  walk(directory);
  return files;
}

export function readProductionPlaygroundEvidence(root = process.cwd()) {
  const bytes = readFileSync(path.join(root, ".local/playground-production-evidence.json"));
  const metadata = JSON.parse(bytes.toString()) as { mode: string; inputs: Record<string, string>; outputs: Record<string, string>; modules: string[] };
  if (metadata.mode !== "production" || !Array.isArray(metadata.modules)
    || metadata.modules.some(file => /\/react[^/]*\/.*\.development\.js(?:\?|$)/u.test(file))
    || !metadata.modules.some(file => /\/react\/cjs\/react\.production(?:\.min)?\.js$/u.test(file))
    || !metadata.modules.some(file => /\/react-dom\/cjs\/react-dom-client\.production(?:\.min)?\.js$/u.test(file))) {
    throw new Error("Expected actual production React/ReactDOM modules");
  }
  if (JSON.stringify(metadata.inputs) !== JSON.stringify(readPlaygroundBuildInputs(root))) {
    throw new Error("Production Playground build inputs changed");
  }
  const files = readPlaygroundOutputFiles(root);
  const sorted = (value: Record<string, string> | undefined) => JSON.stringify(Object.entries(value ?? {}).sort(([a], [b]) => a.localeCompare(b)));
  if (sorted(metadata.outputs) !== sorted(files)) throw new Error("Production Playground output changed after build");
  const scripts = Object.fromEntries(Object.entries(files).filter(([file]) => file.endsWith(".js")));
  if (!Object.keys(scripts).length) throw new Error("Missing production JavaScript");
  return { mode: "production" as const, metadataSHA256: sha(bytes),
    htmlSHA256: files["index.html"], modules: metadata.modules, scripts, files };
}
