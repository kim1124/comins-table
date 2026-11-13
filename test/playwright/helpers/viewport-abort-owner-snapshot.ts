import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

type Heap = {
  snapshot: { node_count: number; edge_count: number; meta: {
    node_fields: string[]; edge_fields: string[];
    node_types: (string[] | string)[]; edge_types: (string[] | string)[];
  } };
  nodes: number[]; edges: number[]; strings: string[];
};
const digest = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

/** Raw nodes, not a reachability-filtered retained-size estimate. Unknown schemas fail closed. */
class Snapshot {
  readonly count: number;
  private readonly width: number;
  private readonly edgeWidth: number;
  private readonly fields: Record<string, number>;
  private readonly edgeFields: Record<string, number>;
  private readonly types: string[];
  private readonly edgeTypes: string[];
  private readonly offsets: Uint32Array;
  constructor(private readonly heap: Heap) {
    const meta = heap.snapshot?.meta;
    if (!meta || !Array.isArray(meta.node_fields) || !Array.isArray(meta.edge_fields)) throw new Error("Missing heap metadata");
    this.fields = Object.fromEntries(meta.node_fields.map((name, index) => [name, index]));
    this.edgeFields = Object.fromEntries(meta.edge_fields.map((name, index) => [name, index]));
    for (const key of ["type", "name", "id", "edge_count"]) if (this.fields[key] === undefined) throw new Error(`Missing node field ${key}`);
    for (const key of ["type", "name_or_index", "to_node"]) if (this.edgeFields[key] === undefined) throw new Error(`Missing edge field ${key}`);
    this.width = meta.node_fields.length; this.edgeWidth = meta.edge_fields.length;
    this.types = meta.node_types[this.fields.type!] as string[];
    this.edgeTypes = meta.edge_types[this.edgeFields.type!] as string[];
    if (!Array.isArray(this.types) || !Array.isArray(this.edgeTypes)) throw new Error("Unsupported heap type tables");
    this.count = heap.snapshot.node_count;
    if (!Number.isSafeInteger(this.count) || this.count < 1 || heap.nodes.length !== this.count * this.width ||
      !Number.isSafeInteger(heap.snapshot.edge_count) || heap.edges.length !== heap.snapshot.edge_count * this.edgeWidth) throw new Error("Invalid heap table lengths");
    this.offsets = new Uint32Array(this.count + 1);
    for (let index = 0; index < this.count; index++) {
      const n = this.node(index), edges = heap.nodes[index * this.width + this.fields.edge_count!]!;
      if (!Number.isSafeInteger(n.id) || !Number.isSafeInteger(edges) || edges < 0) throw new Error("Unsupported heap node values");
      const next = this.offsets[index]! + edges * this.edgeWidth;
      if (next > heap.edges.length || next > 0xffffffff) throw new Error("Invalid heap edge offsets");
      this.offsets[index + 1] = next;
    }
    if (this.offsets[this.count] !== heap.edges.length) throw new Error("Incomplete heap edge table");
  }
  node(index: number) {
    if (!Number.isInteger(index) || index < 0 || index >= this.count) throw new Error("Invalid heap node index");
    const type = this.types[this.heap.nodes[index * this.width + this.fields.type!]!];
    const name = this.heap.strings[this.heap.nodes[index * this.width + this.fields.name!]!];
    if (typeof type !== "string" || typeof name !== "string") throw new Error("Invalid heap node metadata");
    return { index, id: this.heap.nodes[index * this.width + this.fields.id!]!, type, name };
  }
  edges(index: number) {
    const result: { type: string; key: string; to: number }[] = [];
    for (let offset = this.offsets[index]!; offset < this.offsets[index + 1]!; offset += this.edgeWidth) {
      const type = this.edgeTypes[this.heap.edges[offset + this.edgeFields.type!]!];
      const raw = this.heap.edges[offset + this.edgeFields.name_or_index!]!;
      const key = type && ["element", "hidden"].includes(type) ? String(raw) : this.heap.strings[raw] ?? (type === "weak" ? String(raw) : undefined);
      const to = this.heap.edges[offset + this.edgeFields.to_node!]! / this.width;
      if (typeof type !== "string" || typeof key !== "string") throw new Error("Unsupported heap edge metadata");
      this.node(to);
      result.push({ type, key, to });
    }
    return result;
  }
  field(index: number, key: string) {
    return this.edges(index).find(edge => edge.key === key && edge.type !== "weak" && edge.type !== "shortcut")?.to ?? null;
  }
  required(index: number, key: string) {
    const value = this.field(index, key);
    if (value === null) throw new Error(`Missing ${key} on ${this.node(index).name}`);
    return value;
  }
  functionScript(index: number) {
    const shared = this.field(index, "shared");
    return shared === null ? null : this.field(shared, "script");
  }
  scriptURL(script: number) {
    const name = this.node(this.required(script, "name"));
    if (name.type !== "string") throw new Error("Unsupported Script name representation");
    return name.name;
  }
  scriptSource(script: number) {
    const source = this.node(this.required(script, "source"));
    if (source.type !== "string") throw new Error("Unsupported Script source representation");
    return source.name;
  }
}


/** Callback-owner L1 regression. Unsupported source/schema evidence is INVALID. */
export async function readAbortOwnerSnapshot(file: string, scripts: { url: string; sha256: string }[], fixtureURL: string, sdkURL: string, additionalSDKFunctions: { name: string; url: string }[] = [], target = {
  sdkFunction: "createViewportRequestExecutor", ownerClass: "CominsAbortCallbackOwner", ownerMarker: "executor-on-settled-owner",
}) {
  const graph = new Snapshot(JSON.parse(await readFile(file, "utf8")) as Heap);
  const ids = new Map<number, number>();
  for (let i = 0; i < graph.count; i++) ids.set(graph.node(i).id, i);
  const pairs: { key: number; value: number; table: number }[] = [];
  let opaqueNativeEphemerons = 0;
  for (let i = 0; i < graph.count; i++) for (const edge of graph.edges(i)) {
    if (!edge.key.includes("part of key")) continue;
    // Opaque native metadata cannot establish a strong owner path.
    if (edge.key === "part of key -> value pair in ephemeron table") { opaqueNativeEphemerons++; continue; }
    const match = edge.key.match(/part of key \((.*?) @(\d+)\) -> value \((.*?) @(\d+)\) pair in WeakMap \(table @(\d+)\)/u);
    if (match?.[1] === "system / Hole") continue;
    if (!match) throw new Error("INVALID unsupported ephemeron metadata");
    const key = ids.get(Number(match[2])), value = ids.get(Number(match[4])), table = ids.get(Number(match[5]));
    if (key === undefined || value === undefined || table === undefined || value !== edge.to) throw new Error("INVALID incomplete ephemeron metadata");
    pairs.push({ key, value, table });
  }
  const reached = new Uint8Array(graph.count), queue = [0]; reached[0] = 1;
  let cursor = 0, progress = true;
  while (progress) {
    while (cursor < queue.length) for (const edge of graph.edges(queue[cursor++]!)) {
      if (["weak", "shortcut"].includes(edge.type) || edge.key.includes("part of key")) continue;
      if (!reached[edge.to]) { reached[edge.to] = 1; queue.push(edge.to); }
    }
    progress = false;
    for (const pair of pairs) if (reached[pair.key] && reached[pair.table] && !reached[pair.value]) {
      reached[pair.value] = 1; queue.push(pair.value); progress = true;
    }
  }
  const verified = new Set<string>();
  const verify = (script: number, expectedURL: string) => {
    const url = graph.scriptURL(script), expected = scripts.find(script => script.url === url);
    if (url !== expectedURL || !expected || digest(graph.scriptSource(script)) !== expected.sha256) throw new Error(`INVALID Script/HTTP mismatch: ${url}`);
    verified.add(url);
  };
  const additionalCounts = additionalSDKFunctions.map(() => 0);
  let rawOwners = 0, strongOwners = 0, sdkFunctions = 0;
  for (let i = 0; i < graph.count; i++) {
    const node = graph.node(i);
    if (node.type === "closure" && node.name === target.sdkFunction) {
      const script = graph.functionScript(i);
      if (script !== null && graph.scriptURL(script) === sdkURL) { verify(script, sdkURL); sdkFunctions++; }
    }
    for (const [index, target] of additionalSDKFunctions.entries()) {
      if (node.type !== "closure" || node.name !== target.name) continue;
      const script = graph.functionScript(i);
      if (script !== null && graph.scriptURL(script) === target.url) { verify(script, target.url); additionalCounts[index]!++; }
    }
    if (node.type !== "object" || node.name !== target.ownerClass) continue;
    const marker = graph.field(i, "marker");
    if (marker === null || graph.node(marker).name !== target.ownerMarker) continue;
    const ctor = graph.required(graph.required(i, "__proto__"), "constructor");
    const script = graph.functionScript(ctor);
    if (script === null) throw new Error("INVALID missing probe constructor Script");
    verify(script, fixtureURL);
    rawOwners++; if (reached[i]) strongOwners++;
  }
  if (sdkFunctions !== 1) throw new Error(`INVALID SDK function count ${sdkFunctions}`);
  if (additionalCounts.some(count => count !== 1)) throw new Error(`INVALID additional SDK function counts ${additionalCounts}`);
  return { rawOwners, strongOwners, sdkFunctions, opaqueNativeEphemerons, verified: [...verified] };
}
