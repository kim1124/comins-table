import type { CDPSession } from "@playwright/test";

/** StyleEngine이 강하게 보유한 native 미디어쿼리 캐시만 집계한다. */
export async function nativeStyleCache(session: CDPSession) {
  await session.send("HeapProfiler.collectGarbage");
  await session.send("HeapProfiler.collectGarbage");
  const chunks: string[] = [];
  const receive = ({ chunk }: { chunk: string }) => chunks.push(chunk);
  session.on("HeapProfiler.addHeapSnapshotChunk", receive);
  try { await session.send("HeapProfiler.takeHeapSnapshot", { reportProgress: false }); }
  finally { session.off("HeapProfiler.addHeapSnapshotChunk", receive); }
  return summarizeNativeStyleCache(JSON.parse(chunks.join("")));
}

type Snapshot = { snapshot: { meta: { node_fields: string[]; edge_fields: string[]; node_types: (string[] | string)[]; edge_types: (string[] | string)[] } }; nodes: number[]; edges: number[]; strings: string[] };

export function summarizeNativeStyleCache(heap: Snapshot) {
  const meta = heap.snapshot.meta, nodes = heap.nodes, edges = heap.edges;
  const width = meta.node_fields.length, ew = meta.edge_fields.length;
  const ni = meta.node_fields.indexOf("name"), ti = meta.node_fields.indexOf("type"), si = meta.node_fields.indexOf("self_size"), ci = meta.node_fields.indexOf("edge_count");
  const eti = meta.edge_fields.indexOf("type"), to = meta.edge_fields.indexOf("to_node");
  if ([ni, ti, si, ci, eti, to].some(i => i < 0)) throw new Error("Unsupported heap snapshot metadata");
  const types = meta.node_types[ti] as string[], edgeTypes = meta.edge_types[eti] as string[];
  const starts: number[] = []; let offset = 0, styleEngines = 0;
  for (let n = 0; n < nodes.length; n += width) { starts[n / width] = offset; offset += nodes[n + ci]! * ew; }
  const name = (n: number) => heap.strings[nodes[n + ni]!]!;
  const targets = (n: number) => {
    const found: number[] = [], start = starts[n / width]!;
    for (let e = start; e < start + nodes[n + ci]! * ew; e += ew) if (edgeTypes[edges[e + eti]!] !== "weak") found.push(edges[e + to]!);
    return found;
  };
  const roots: number[] = [];
  for (let n = 0; n < nodes.length; n += width) if (name(n) === "StyleEngine") {
    styleEngines++;
    for (const child of targets(n)) if (name(child).startsWith("blink::HeapHashTableBacking<") && name(child).includes("MediaQuerySet") && name(child).includes(", bool>")) roots.push(child);
  }
  if (!styleEngines) throw new Error("Native StyleEngine unavailable; cache result cannot be accepted");
  const seen = new Set<number>(), queue = [...roots]; let nativeSelfBytes = 0, features = 0, sets = 0;
  for (let p = 0; p < queue.length; p++) {
    const n = queue[p]!; if (seen.has(n)) continue; seen.add(n); nativeSelfBytes += nodes[n + si]!;
    if (name(n) === "blink::MediaQueryFeatureExpNode") features++;
    if (name(n) === "blink::MediaQuerySet") sets++;
    for (const child of targets(n)) if (types[nodes[child + ti]!] === "native") queue.push(child);
  }
  return { styleEngines, cacheRoots: roots.length, nativeSelfBytes, features, sets };
}
