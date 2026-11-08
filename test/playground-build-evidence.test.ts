import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import {
  readMemoryPlaygroundMode, readPlaygroundBuildInputs, readProductionPlaygroundEvidence, readDevelopmentPlaygroundEvidence,
} from "./playwright/helpers/playground-build";
import { readBrowserBundleEvidence } from "./playwright/helpers/memory-runtime";

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "playground-build-")); roots.push(root);
  for (const dir of ["src", "example/src", "example/build", "example/public", ".local/playground-production/assets", "scripts", "test/playwright/helpers"]) mkdirSync(path.join(root, dir), { recursive: true });
  for (const file of ["package.json", "package-lock.json", "styles.css", "vite.example.config.ts", "tsconfig.json", "postcss.config.mjs", "example/index.html", "scripts/serve-memory-playground.mjs", "test/playwright/helpers/playground-build.ts"]) writeFileSync(path.join(root, file), "fixture");
  writeFileSync(path.join(root, "src/index.tsx"), "table source");
  writeFileSync(path.join(root, ".local/playground-production/index.html"), '<script type="module" src="/assets/main.js"></script>');
  writeFileSync(path.join(root, ".local/playground-production/assets/main.js"), "production runtime");
  writeFileSync(path.join(root, ".local/playground-production/assets/style.css"), "body { color: black; }");
  const outputs = Object.fromEntries(["index.html", "assets/main.js", "assets/style.css"].map(file =>
    [file, createHash("sha256").update(readFileSync(path.join(root, ".local/playground-production", file))).digest("hex")]));
  const metadata = { mode: "production", inputs: readPlaygroundBuildInputs(root), outputs, modules: [
    "node_modules/react/cjs/react.production.js", "node_modules/react-dom/cjs/react-dom-client.production.js",
  ] };
  writeFileSync(path.join(root, ".local/playground-production-evidence.json"), JSON.stringify(metadata));
  return { root, metadata };
}

it("keeps development as the default and rejects unknown mode labels", () => {
  expect(readMemoryPlaygroundMode(undefined)).toBe("development");
  expect(readMemoryPlaygroundMode("production")).toBe("production");
  expect(() => readMemoryPlaygroundMode("prodution")).toThrow();
});
it("records production modules and rejects JavaScript replaced after the build seal", () => {
  const { root } = fixture();
  const before = readProductionPlaygroundEvidence(root);
  expect(before.mode).toBe("production");
  expect(before.scripts["assets/main.js"]).toMatch(/^[a-f0-9]{64}$/u);
  writeFileSync(path.join(root, ".local/playground-production/assets/main.js"), "changed runtime");
  expect(() => readProductionPlaygroundEvidence(root)).toThrow(/output/u);
});
it("also freezes built CSS and public assets that affect the measured UI", () => {
  const { root } = fixture();
  const before = readProductionPlaygroundEvidence(root);
  expect(before.files["assets/style.css"]).toMatch(/^[a-f0-9]{64}$/u);
  writeFileSync(path.join(root, ".local/playground-production/assets/style.css"), "body { color: red; }");
  expect(() => readProductionPlaygroundEvidence(root)).toThrow(/output/u);
});
it.each(["index.html", "assets/style.css"])("rejects %s replacement before the first baseline", file => {
  const { root } = fixture();
  writeFileSync(path.join(root, ".local/playground-production", file), "another build");
  expect(() => readProductionPlaygroundEvidence(root)).toThrow(/output/u);
});
it.each(["extra.woff2", "__proto__"])("rejects added asset %s absent from the completed build", asset => {
  const { root } = fixture();
  writeFileSync(path.join(root, ".local/playground-production", asset), "another asset");
  expect(() => readProductionPlaygroundEvidence(root)).toThrow(/output/u);
});
it("rejects removed assets from the completed build", () => {
  const { root } = fixture();
  rmSync(path.join(root, ".local/playground-production/assets/style.css"));
  expect(() => readProductionPlaygroundEvidence(root)).toThrow(/output/u);
});
it("selects production evidence instead of stale Vite development dependencies", () => {
  const { root } = fixture();
  expect(readBrowserBundleEvidence(root, "production").mode).toBe("production");
});
it("rejects a production bundle after its application inputs change", () => {
  const { root } = fixture();
  writeFileSync(path.join(root, "src/index.tsx"), "new source");
  expect(() => readProductionPlaygroundEvidence(root)).toThrow(/input/u);
});
it("rejects newly added application input files omitted from the build", () => {
  const { root } = fixture();
  writeFileSync(path.join(root, "example/src/new.tsx"), "new module");
  expect(() => readProductionPlaygroundEvidence(root)).toThrow(/input/u);
});
it.each(["example/index.html", "postcss.config.mjs", "example/public/font.woff2"])("includes %s in the production input guard", file => {
  const { root } = fixture();
  writeFileSync(path.join(root, file), "changed build input");
  expect(() => readProductionPlaygroundEvidence(root)).toThrow(/input/u);
});
it("rejects a development React graph labelled as production", () => {
  const { root, metadata } = fixture();
  metadata.modules[0] = "node_modules/react/cjs/react.development.js";
  writeFileSync(path.join(root, ".local/playground-production-evidence.json"), JSON.stringify(metadata));
  expect(() => readProductionPlaygroundEvidence(root)).toThrow(/production/u);
});
it("rejects mixed production and development React proxy modules", () => {
  const { root, metadata } = fixture();
  metadata.modules.push("node_modules/react/cjs/react.development.js?commonjs-proxy");
  writeFileSync(path.join(root, ".local/playground-production-evidence.json"), JSON.stringify(metadata));
  expect(() => readProductionPlaygroundEvidence(root)).toThrow(/production/u);
});
it("requires matching live development server inputs and origin", () => {
  const { root } = fixture();
  const metadata = { mode: "development", origin: "http://localhost:4003", pid: process.pid, inputs: readPlaygroundBuildInputs(root) };
  const file = path.join(root, ".local/playground-development-evidence.json");
  writeFileSync(file, JSON.stringify(metadata));
  expect(readDevelopmentPlaygroundEvidence(root, metadata.origin).mode).toBe("development");
  expect(() => readDevelopmentPlaygroundEvidence(root, "http://localhost:4004")).toThrow();
  writeFileSync(path.join(root, "src/index.tsx"), "changed source");
  expect(() => readDevelopmentPlaygroundEvidence(root, metadata.origin)).toThrow(/input/u);
});
