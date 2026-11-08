import { EventEmitter } from "node:events";
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import type { Page } from "@playwright/test";
import { collectMemoryServedScripts, assertProductionServedScripts, assertDevelopmentServedScripts } from "./playwright/helpers/memory-served-scripts";

function response(url: string, body: string, type = "script") {
  return { url: () => url, ok: () => true, request: () => ({ resourceType: () => type }), body: async () => Buffer.from(body) };
}
it("records actual script bytes outside the browser and ignores non-script responses", async () => {
  const page = new EventEmitter();
  const collector = collectMemoryServedScripts(page as unknown as Page);
  page.emit("response", response("http://localhost:4003/assets/a.js", "runtime"));
  page.emit("response", response("http://localhost:4003/api/data", "rows", "fetch"));
  const scripts = await collector.freeze();
  expect(scripts).toEqual({ "http://localhost:4003/assets/a.js": createHash("sha256").update("runtime").digest("hex") });
  await collector.verify(); collector.dispose();
  expect(page.listenerCount("response")).toBe(0);
});
it("rejects new scripts arriving after the fixed warmup inventory", async () => {
  const page = new EventEmitter(); const collector = collectMemoryServedScripts(page as unknown as Page);
  page.emit("response", response("http://localhost:4003/assets/a.js", "a")); await collector.freeze();
  page.emit("response", response("http://localhost:4003/assets/b.js", "b"));
  await expect(collector.verify()).rejects.toThrow(/script/u); collector.dispose();
});
it("requires production HTTP bytes to match the built same-origin script", () => {
  const built = { "assets/a.js": "expected" };
  expect(() => assertProductionServedScripts({ "http://localhost:4003/assets/a.js": "expected" }, built, "http://localhost:4003")).not.toThrow();
  for (const scripts of [
    {}, { "http://localhost:4003/assets/a.js": "changed" },
    { "http://localhost:4003/@vite/client": "expected" }, { "https://external.invalid/assets/a.js": "expected" },
  ]) expect(() => assertProductionServedScripts(scripts, built, "http://localhost:4003")).toThrow();
});

it("requires actual development entries and rejects production with stale optimized metadata", async () => {
  const entries = { react: "react.js", "react-dom": "react-dom.js", "react-dom/client": "react-dom_client.js" };
  const base = "http://localhost:4003";
  const served = Object.fromEntries(["/@vite/client", "/src/main.tsx", ...Object.values(entries).map(file => `/node_modules/.vite/deps/${file}?v=1`)].map(url => [base + url, "actual-http-hash"]));
  const currentHash = async () => "actual-http-hash";
  await expect(assertDevelopmentServedScripts(served, entries, base, currentHash)).resolves.toBeUndefined();
  await expect(assertDevelopmentServedScripts({ [base + "/assets/index.js"]: "actual-http-hash" }, entries, base, currentHash)).rejects.toThrow(/development/u);
  await expect(assertDevelopmentServedScripts(served, entries, base, async () => "changed-http-hash")).rejects.toThrow(/runtime/u);
});
