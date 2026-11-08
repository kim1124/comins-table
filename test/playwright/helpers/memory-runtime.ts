import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { readMemoryPlaygroundMode, readProductionPlaygroundEvidence, type MemoryPlaygroundMode } from "./playground-build";

const runtimePackages = ["react", "react-dom", "scheduler", "vite", "@playwright/test", "undici"] as const;
type RuntimeEvidence = { version: string; manifestSHA256: string; mainSHA256: string | null; filesSHA256: string };
const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

function fingerprintFiles(folder: string) {
  const hashes: Record<string, string> = {};
  const walk = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(current, entry.name);
      if (entry.isDirectory()) walk(file);
      else hashes[path.relative(folder, file)] = sha(readFileSync(file));
    }
  };
  walk(folder);
  return sha(Buffer.from(JSON.stringify(hashes)));
}

/** lockfile만으로 설치된 런타임을 추정하지 않고 실행 전 실제 버전과 파일을 확인한다. */
export function readMemoryRuntime(root = process.cwd()): Record<string, RuntimeEvidence> {
  const lock = JSON.parse(readFileSync(path.join(root, "package-lock.json"), "utf8"));
  return Object.fromEntries(runtimePackages.map(name => {
    const folder = path.join(root, "node_modules", name);
    const bytes = readFileSync(path.join(folder, "package.json"));
    const installed = JSON.parse(bytes.toString());
    const expected = lock.packages?.[`node_modules/${name}`]?.version;
    if (typeof expected !== "string" || installed.version !== expected) {
      throw new Error(`Runtime mismatch for ${name}: lockfile ${String(expected)}, installed ${String(installed.version)}`);
    }
    return [name, { version: installed.version, manifestSHA256: sha(bytes),
      mainSHA256: installed.main ? sha(readFileSync(path.resolve(folder, installed.main))) : null,
      filesSHA256: fingerprintFiles(folder) }];
  }));
}

/** 실제 개발 서버가 제공하는 React entry와 공통 optimized chunk를 함께 고정한다. */
export function readBrowserBundleEvidence(root = process.cwd(), mode: MemoryPlaygroundMode = readMemoryPlaygroundMode(process.env.PLAYWRIGHT_PLAYGROUND_MODE)) {
  if (mode === "production") return readProductionPlaygroundEvidence(root);
  const folder = path.join(root, "node_modules/.vite/deps");
  const bytes = readFileSync(path.join(folder, "_metadata.json"));
  const metadata = JSON.parse(bytes.toString());
  const entries: Record<string, string> = {};
  const entryFiles: Record<string, string> = {};
  for (const name of ["react", "react-dom", "react-dom/client"]) {
    const file = metadata.optimized?.[name]?.file;
    if (typeof file !== "string") throw new Error(`Missing optimized runtime: ${name}`);
    const resolved = path.resolve(folder, file);
    if (path.relative(folder, resolved).startsWith("..")) throw new Error(`Unexpected optimized runtime path: ${name}`);
    entries[name] = sha(readFileSync(resolved));
    entryFiles[name] = path.basename(resolved);
  }
  const scripts = Object.fromEntries(readdirSync(folder).filter(file => file.endsWith(".js")).sort()
    .map(file => [file, sha(readFileSync(path.join(folder, file)))]));
  return { mode: "development" as const, metadataSHA256: sha(bytes), entries, entryFiles, scripts };
}
