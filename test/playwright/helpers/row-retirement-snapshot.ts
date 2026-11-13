import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

type Heap = {
  snapshot: { node_count: number; edge_count: number; meta: {
    node_fields: string[]; edge_fields: string[];
    node_types: (string[] | string)[]; edge_types: (string[] | string)[];
  } };
  nodes: number[]; edges: number[]; strings: string[];
};
export type RetirementServedScript = { url: string; file: string; sha256: string };
export type RowRetirementSnapshotInput = {
  fixtureScriptURL: string;
  sourceRoot: string;
  servedScripts: readonly RetirementServedScript[];
};
const digest = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const CLASS_NAME = "RowDataRetirementRow";

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

/** Counts every actual fixture row node and requires populated, source-bound live SDK dev frames. */
export async function readRowRetirementSnapshot(file: string, input: RowRetirementSnapshotInput) {
  const graph = new Snapshot(JSON.parse(await readFile(file, "utf8")) as Heap);
  const scripts = new Map(input.servedScripts.map(script => [script.url, script]));
  if (scripts.size !== input.servedScripts.length) throw new Error("Duplicate served Script URLs");
  const verified = new Map<number, { url: string; httpSHA256: string; snapshotSHA256: string; representation: string }>();
  const verifyScript = async (script: number) => {
    const existing = verified.get(script); if (existing) return existing;
    const url = graph.scriptURL(script), response = scripts.get(url);
    if (!response) throw new Error(`No actual HTTP body for Script ${url}`);
    const body = await readFile(response.file, "utf8");
    if (digest(body) !== response.sha256) throw new Error(`HTTP body hash mismatch for ${url}`);
    const snapshotSHA256 = digest(graph.scriptSource(script));
    // Chromium's observed heap source string can encode non-BMP code points as low16 values.
    const low16 = [...body].map(char => char.codePointAt(0)! > 65535 ? String.fromCharCode(char.codePointAt(0)! & 65535) : char).join("");
    const representation = snapshotSHA256 === response.sha256 ? "utf8" : snapshotSHA256 === digest(low16) ? "v8-low16-codepoint" : null;
    if (!representation) throw new Error(`Script/HTTP source mismatch for ${url}`);
    const value = { url, httpSHA256: response.sha256, snapshotSHA256, representation };
    verified.set(script, value); return value;
  };
  const sdkRoot = path.resolve(input.sourceRoot);
  const sdkFile = (url: string) => {
    let pathname: string;
    try {
      const parsed = new URL(url);
      if (parsed.origin !== new URL(input.fixtureScriptURL).origin) return null;
      pathname = decodeURIComponent(parsed.pathname);
    } catch { return null; }
    if (!pathname.startsWith("/@fs/")) return null;
    const file = path.resolve(pathname.slice(4));
    return file.startsWith(sdkRoot + path.sep + "src" + path.sep) ? file : null;
  };
  // Only constructors actually owned by raw row instances define the cohort.
  // V8 can keep other same-named function objects with no instance prototype.
  const constructors = new Map<number, { prototype: number; rows: number; source: Awaited<ReturnType<typeof verifyScript>> }>();
  const counts = { A: 0, B: 0, C: 0 };
  for (let index = 0; index < graph.count; index++) {
    const node = graph.node(index);
    if (node.type !== "object" || node.name !== CLASS_NAME) continue;
    const prototype = graph.required(index, "__proto__"), constructor = graph.required(prototype, "constructor");
    const owner = graph.node(constructor);
    if (owner.type !== "closure" || owner.name !== CLASS_NAME || graph.required(constructor, "prototype") !== prototype) throw new Error("Fixture row constructor identity mismatch");
    const script = graph.functionScript(constructor);
    if (script === null || graph.scriptURL(script) !== input.fixtureScriptURL) throw new Error("Fixture row constructor source mismatch");
    let record = constructors.get(constructor);
    if (!record) {
      record = { prototype, rows: 0, source: await verifyScript(script) };
      constructors.set(constructor, record);
    }
    const generation = graph.node(graph.required(index, "generation"));
    if (generation.type !== "string" || !Object.hasOwn(counts, generation.name)) throw new Error("Invalid fixture row generation");
    counts[generation.name as keyof typeof counts]++;
    record.rows++;
  }
  if (constructors.size === 0) throw new Error("No source-verified fixture instances for positive cohort control");
  const roots: number[] = [];
  for (let index = 0; index < graph.count; index++) {
    const node = graph.node(index);
    if (node.type === "object" && node.name === "FiberRootNode") roots.push(index);
  }
  if (roots.length !== 1) throw new Error("Expected one current App Fiber root");
  const walk = (start: number) => {
    const queue = [start], visited = new Set<number>();
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const current = queue[cursor]!; if (visited.has(current)) continue;
      if (graph.node(current).name !== "FiberNode") throw new Error("Unsupported current Fiber representation");
      visited.add(current);
      for (const name of ["child", "sibling"]) {
        const next = graph.field(current, name);
        if (next !== null && graph.node(next).name === "FiberNode") queue.push(next);
      }
    }
    return visited;
  };
  const current = walk(graph.required(roots[0]!, "current"));
  const sdkFibers: { index: number; source: Awaited<ReturnType<typeof verifyScript>> }[] = [];
  for (const index of current) {
    let type = graph.field(index, "type");
    if (type !== null && graph.node(type).type === "object") type = graph.field(type, "render");
    if (type === null || graph.node(type).type !== "closure" || graph.node(type).name !== "CominsTableInner") continue;
    const script = graph.functionScript(type);
    if (script === null || sdkFile(graph.scriptURL(script)) !== path.join(sdkRoot, "src/index.tsx")) continue;
    sdkFibers.push({ index, source: await verifyScript(script) });
  }
  if (sdkFibers.length !== 1) throw new Error("Expected one source-bound current SDK Table Fiber");
  const child = graph.required(sdkFibers[0]!.index, "child");
  const descendants = walk(child);
  let liveFrame: { fiberIndex: number; domName: string; frames: { functionName: string; source: Awaited<ReturnType<typeof verifyScript>> }[] } | null = null;
  for (const index of descendants) {
    const dom = graph.field(index, "stateNode");
    if (dom === null) continue;
    const node = graph.node(dom);
    if (node.type !== "native" || !node.name.startsWith("<td ") || !node.name.includes("comins-table__td")) continue;
    const stack = graph.field(index, "_debugStack"); if (stack === null) continue;
    const errorData = graph.edges(stack).find(edge => edge.type !== "weak" && edge.type !== "shortcut" && graph.node(edge.to).name === "system / ErrorStackData");
    if (!errorData) continue;
    const queue = [{ index: errorData.to, depth: 0 }], seen = new Set<number>();
    const frames: { functionName: string; source: Awaited<ReturnType<typeof verifyScript>> }[] = [];
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const current = queue[cursor]!; if (seen.has(current.index)) continue; seen.add(current.index);
      for (const edge of graph.edges(current.index)) {
        if (edge.type === "weak" || edge.type === "shortcut") continue;
        const target = graph.node(edge.to);
        if (target.type === "closure") {
          const script = graph.functionScript(edge.to);
          if (script !== null && sdkFile(graph.scriptURL(script))) frames.push({ functionName: target.name, source: await verifyScript(script) });
        } else if (current.depth < 3 && ["array", "object"].includes(target.type)) queue.push({ index: edge.to, depth: current.depth + 1 });
      }
    }
    if (frames.length) { liveFrame = { fiberIndex: index, domName: node.name, frames }; break; }
  }
  if (!liveFrame) throw new Error("No populated current SDK development debugStack; shared unknown fallback is not accepted");
  return { counts, constructor: { name: CLASS_NAME, owners: [...constructors].map(([index, owner]) => ({ index, ...owner })) }, sdk: sdkFibers[0]!.source, liveFrame,
    scope: "All raw snapshot nodes of the 1000 constructed test rows only; not every SDK object/cache or a numeric release gate" };
}
