import { createHash } from "node:crypto";
import type { Page, Response } from "@playwright/test";

/** Fixed script inventory in the Node runner; no page evaluation or target handles. */
export function collectMemoryServedScripts(page: Page) {
  const scripts = new Map<string, string>();
  const pending = new Set<Promise<void>>();
  let frozen = false;
  let invalid = false;
  const onResponse = (response: Response) => {
    if (response.request().resourceType() !== "script") return;
    const url = response.url();
    if (frozen) { if (!scripts.has(url)) invalid = true; return; }
    let job: Promise<void>;
    job = (async () => {
      if (!response.ok()) throw new Error("Script response failed");
      const hash = createHash("sha256").update(await response.body()).digest("hex");
      if (scripts.has(url) && scripts.get(url) !== hash) throw new Error("Script changed during warmup");
      scripts.set(url, hash);
    })().catch(() => { invalid = true; }).finally(() => pending.delete(job));
    pending.add(job);
  };
  page.on("response", onResponse);
  const verify = async () => {
    while (pending.size) await Promise.all(pending);
    if (invalid || !scripts.size) throw new Error("Invalid or changed served script evidence");
  };
  return {
    async freeze() { await verify(); frozen = true; return Object.fromEntries([...scripts].sort(([a], [b]) => a.localeCompare(b))); },
    verify,
    dispose() { page.off("response", onResponse); },
  };
}

export function assertProductionServedScripts(served: Record<string, string>, built: Record<string, string>, baseURL: string) {
  if (!Object.keys(served).length) throw new Error("Missing production script responses");
  for (const [url, hash] of Object.entries(served)) {
    const parsed = new URL(url);
    const file = decodeURIComponent(parsed.pathname.slice(1));
    if (parsed.origin !== new URL(baseURL).origin || !Object.hasOwn(built, file) || built[file] !== hash) {
      throw new Error("Served script does not match the production build");
    }
  }
}

/** Vite transforms optimized entry imports, so compare HTTP bytes rather than raw disk entry bytes. */
export async function assertDevelopmentServedScripts(
  served: Record<string, string>, entries: Record<string, string>, baseURL: string,
  readCurrentHash: (url: string) => Promise<string> = async url => {
    const response = await fetch(url);
    if (!response.ok || !/javascript/u.test(response.headers.get("content-type") ?? "")) throw new Error("Invalid development runtime response");
    return createHash("sha256").update(Buffer.from(await response.arrayBuffer())).digest("hex");
  },
) {
  const urls = Object.keys(served);
  const origin = new URL(baseURL).origin;
  if (urls.some(url => new URL(url).origin !== origin)
    || !urls.some(url => new URL(url).pathname === "/@vite/client")
    || !urls.some(url => new URL(url).pathname === "/src/main.tsx")) throw new Error("Missing development entry scripts");
  for (const name of ["react", "react-dom", "react-dom/client"]) {
    const entry = entries[name];
    const url = urls.find(url => new URL(url).pathname.includes("/node_modules/.vite/deps/") && new URL(url).pathname.endsWith(`/${entry}`));
    if (!entry || !url || await readCurrentHash(url) !== served[url]) throw new Error("Development runtime script bytes changed");
  }
}
