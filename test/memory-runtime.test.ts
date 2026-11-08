import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { readBrowserBundleEvidence, readMemoryRuntime } from "./playwright/helpers/memory-runtime";

const roots: string[] = [];
function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "memory-runtime-")); roots.push(root);
  const packages: Record<string, { version: string }> = {};
  for (const name of ["react", "react-dom", "scheduler", "vite", "@playwright/test", "undici"]) {
    const folder = path.join(root, "node_modules", name); mkdirSync(folder, { recursive: true });
    packages[`node_modules/${name}`] = { version: "1.0.0" };
    writeFileSync(path.join(folder, "package.json"), JSON.stringify({ name, version: "1.0.0", main: "index.js" }));
    writeFileSync(path.join(folder, "index.js"), "export const runtime = 1;");
  }
  writeFileSync(path.join(root, "package-lock.json"), JSON.stringify({ packages }));
  return root;
}
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

it("rejects a stale installed React before memory measurement starts", () => {
  const root = fixture();
  writeFileSync(path.join(root, "node_modules/react/package.json"), JSON.stringify({ name: "react", version: "0.9.0" }));
  expect(() => readMemoryRuntime(root)).toThrow(/react.*1\.0\.0.*0\.9\.0/u);
});
it("rejects missing installed runtime evidence", () => {
  const root = fixture(); rmSync(path.join(root, "node_modules/react-dom/package.json"));
  expect(() => readMemoryRuntime(root)).toThrow();
});
it("records matching versions and executable changes so mixed inputs cannot be accepted", () => {
  const root = fixture(); const before = readMemoryRuntime(root);
  expect(before.react.version).toBe("1.0.0");
  writeFileSync(path.join(root, "node_modules/react/index.js"), "export const runtime = 2;");
  const after = readMemoryRuntime(root);
  expect(after.react.mainSHA256).not.toBe(before.react.mainSHA256);
});
it("detects changed CJS implementation beneath an unchanged React entry wrapper", () => {
  const root = fixture();
  const folder = path.join(root, "node_modules/react/cjs"); mkdirSync(folder);
  const file = path.join(folder, "react.development.js"); writeFileSync(file, "const implementation = 1;");
  const before = readMemoryRuntime(root);
  writeFileSync(file, "const implementation = 2;");
  expect(readMemoryRuntime(root).react.filesSHA256).not.toBe(before.react.filesSHA256);
});
it("detects changed optimized client code without a package version change", () => {
  const root = fixture(); const folder = path.join(root, "node_modules/.vite/deps"); mkdirSync(folder, { recursive: true });
  const optimized = Object.fromEntries(["react", "react-dom", "react-dom/client"].map((name, index) => {
    const file = `runtime-${index}.js`; writeFileSync(path.join(folder, file), "export const runtime = 1;"); return [name, { file }];
  }));
  writeFileSync(path.join(folder, "_metadata.json"), JSON.stringify({ optimized }));
  const before = readBrowserBundleEvidence(root);
  writeFileSync(path.join(folder, "runtime-2.js"), "export const runtime = 2;");
  expect(readBrowserBundleEvidence(root)).not.toEqual(before);
});
