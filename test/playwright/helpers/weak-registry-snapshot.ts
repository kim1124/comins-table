import { readFile } from "node:fs/promises";

type Heap = {
  snapshot: { node_count: number; meta: {
    node_fields: string[]; edge_fields: string[];
    node_types: (string[] | string)[]; edge_types: (string[] | string)[];
  } };
  nodes: number[]; edges: number[]; strings: string[];
};

/** Source-bound registration storage, not total JS Heap or retained-byte attribution. */
export async function readWeakRegistrySnapshot(file: string, field: string, heldField?: string, probeClass?: string, probeMarker?: string) {
  const heap = JSON.parse(await readFile(file, "utf8")) as Heap;
  const meta = heap.snapshot.meta;
  const nf = Object.fromEntries(meta.node_fields.map((name, i) => [name, i]));
  const ef = Object.fromEntries(meta.edge_fields.map((name, i) => [name, i]));
  for (const key of ["type", "name", "id", "self_size", "edge_count"]) {
    if (nf[key] === undefined) throw new Error(`Missing heap node field ${key}`);
  }
  for (const key of ["type", "name_or_index", "to_node"]) {
    if (ef[key] === undefined) throw new Error(`Missing heap edge field ${key}`);
  }
  const width = meta.node_fields.length, edgeWidth = meta.edge_fields.length;
  const nodeTypes = meta.node_types[nf.type!] as string[];
  const edgeTypes = meta.edge_types[ef.type!] as string[];
  if (!Array.isArray(nodeTypes) || !Array.isArray(edgeTypes)) throw new Error("Unsupported heap types");
  const count = heap.snapshot.node_count;
  const offsets = new Uint32Array(count + 1), ids = new Map<string, number>();
  const type = (i: number) => nodeTypes[heap.nodes[i * width + nf.type!]!]!;
  const name = (i: number) => heap.strings[heap.nodes[i * width + nf.name!]!]!;
  for (let i = 0; i < count; i++) {
    offsets[i + 1] = offsets[i]! + heap.nodes[i * width + nf.edge_count!]! * edgeWidth;
    const id = heap.nodes[i * width + nf.id!]!;
    if (!Number.isSafeInteger(id)) throw new Error("Unsupported heap object ID");
    ids.set(String(id), i);
  }
  const edge = (i: number) => {
    const kind = edgeTypes[heap.edges[i + ef.type!]!]!;
    const raw = heap.edges[i + ef.name_or_index!]!;
    const key = ["element", "hidden"].includes(kind) ? String(raw) : heap.strings[raw] ?? (kind === "weak" ? String(raw) : undefined);
    if (key === undefined) throw new Error("Unsupported heap edge name");
    return { kind, key,
      to: heap.edges[i + ef.to_node!]! / width };
  };
  const conditional: { key: number; value: number; table: number }[] = [];
  let opaqueNativeEphemeronEdges = 0;
  for (let i = 0; i < heap.edges.length; i += edgeWidth) {
    const e = edge(i);
    if (!e.key.includes("part of key")) continue;
    // This native annotation supplies no key/table IDs. It is not an unconditional
    // strong edge; this inspector targets direct module bindings, not native reachability.
    if (e.key === "part of key -> value pair in ephemeron table") {
      opaqueNativeEphemeronEdges++;
      continue;
    }
    const match = e.key.match(/part of key \((.*?) @(\d+)\) -> value \((.*?) @(\d+)\) pair in WeakMap \(table @(\d+)\)/u);
    if (!match) throw new Error("Unsupported WeakMap metadata");
    if (match[1] === "system / Hole") continue;
    const key = ids.get(match[2]!), value = ids.get(match[4]!), table = ids.get(match[5]!);
    if (key === undefined || value === undefined || table === undefined || value !== e.to) {
      throw new Error("Incomplete WeakMap metadata");
    }
    conditional.push({ key, value, table });
  }
  const reached = new Uint8Array(count), queue = [0];
  reached[0] = 1;
  let cursor = 0, changed = true;
  while (changed) {
    while (cursor < queue.length) {
      const from = queue[cursor++]!;
      for (let i = offsets[from]!; i < offsets[from + 1]!; i += edgeWidth) {
        const e = edge(i);
        if (["weak", "shortcut"].includes(e.kind) || e.key.includes("part of key")) continue;
        if (!reached[e.to]) { reached[e.to] = 1; queue.push(e.to); }
      }
    }
    changed = false;
    for (const pair of conditional) {
      if (!reached[pair.value] && reached[pair.key] && reached[pair.table]) {
        reached[pair.value] = 1; queue.push(pair.value); changed = true;
      }
    }
  }
  const stores = new Set<number>(), tables = new Set<number>(), held = new Set<number>();
  const value = (start: number) => {
    let current = start;
    const seen = new Set<number>();
    while (name(current) === "system / ContextCell") {
      if (seen.has(current)) throw new Error("ContextCell cycle");
      seen.add(current);
      let target: number | undefined;
      for (let i = offsets[current]!; i < offsets[current + 1]!; i += edgeWidth) {
        const e = edge(i);
        if (e.kind === "hidden" && e.key === "0") target = e.to;
      }
      if (target === undefined || !reached[target]) throw new Error("Unsupported ContextCell value");
      current = target;
    }
    return current;
  };
  let probeObjects = 0;
  for (let from = 0; from < count; from++) {
    if (!reached[from]) continue;
    if (probeClass && type(from) === "object" && name(from) === probeClass) {
      let matches = probeMarker === undefined;
      for (let i = offsets[from]!; i < offsets[from + 1]!; i += edgeWidth) {
        const e = edge(i);
        if (e.kind === "property" && e.key === "marker" && type(e.to) === "string" && name(e.to) === probeMarker) matches = true;
      }
      if (matches) probeObjects++;
    }
    for (let i = offsets[from]!; i < offsets[from + 1]!; i += edgeWidth) {
      const e = edge(i);
      if (["weak", "shortcut"].includes(e.kind)) continue;
      if (e.key === field || (heldField && e.key === heldField)) {
        const target = value(e.to);
        if (e.key === field && type(target) === "object" && name(target) === "WeakSet") stores.add(target);
        const isObject = type(target) === "object" && (!probeClass || name(target) === probeClass);
        if (heldField && e.key === heldField && isObject) held.add(target);
      }
    }
  }
  let weakKeys = 0;
  for (const store of stores) {
    let table: number | undefined;
    for (let i = offsets[store]!; i < offsets[store + 1]!; i += edgeWidth) {
      const e = edge(i);
      if (e.key === "table" && !["weak", "shortcut"].includes(e.kind)) table = e.to;
    }
    if (table === undefined || !reached[table] || type(table) !== "array") throw new Error("Missing strong WeakSet backing table");
    tables.add(table);
  }
  let backingBytes = 0;
  for (const table of tables) {
    backingBytes += heap.nodes[table * width + nf.self_size!]!;
    for (let i = offsets[table]!; i < offsets[table + 1]!; i += edgeWidth) if (edge(i).kind === "weak") weakKeys++;
  }
  return { stores: stores.size, backingBytes, weakKeys, heldObjects: held.size, probeObjects, opaqueNativeEphemeronEdges };
}
