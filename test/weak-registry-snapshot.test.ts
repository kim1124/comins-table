import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { readWeakRegistrySnapshot } from "./playwright/helpers/weak-registry-snapshot";

type Link = { kind: string; key: string | number; to: number };
type Node = { type: string; name: string; bytes?: number; links?: Link[] };
const directories: string[] = [];
const link = (kind: string, key: string | number, to: number): Link => ({ kind, key, to });
function fixture(released = false): Node[] {
  return [
    { type: "synthetic", name: "root", links: [link("internal", "context", 1), link("internal", "prototype", 9), link("weak", "retired", 4)] },
    { type: "object", name: "system / Context", links: [link("context", "registry", 2), link("context", "held", 3)] },
    { type: "native", name: "system / ContextCell", links: [link("hidden", 0, released ? 7 : 4)] },
    { type: "native", name: "system / ContextCell", links: [link("hidden", 0, released ? 7 : 6)] },
    { type: "object", name: "WeakSet", links: [link("internal", "table", 5)] },
    { type: "array", name: "", bytes: 100, links: [link("weak", "key", 6)] },
    { type: "object", name: "Probe", links: [link("property", "marker", 8)] },
    { type: "native", name: "null" },
    { type: "string", name: "probe-marker" },
    { type: "object", name: "Probe" },
  ];
}
async function inspect(nodes: Node[]) {
  const nodeTypes = ["synthetic", "object", "native", "array", "string"];
  const edgeTypes = ["internal", "context", "hidden", "property", "weak", "element", "shortcut"];
  const strings: string[] = [];
  const intern = (value: string) => { let i = strings.indexOf(value); if (i < 0) { i = strings.length; strings.push(value); } return i; };
  const rawNodes: number[] = [], edges: number[] = [];
  for (const [i, node] of nodes.entries()) {
    rawNodes.push(nodeTypes.indexOf(node.type), intern(node.name), i * 2 + 1, node.bytes ?? 16, node.links?.length ?? 0);
    for (const e of node.links ?? []) edges.push(edgeTypes.indexOf(e.kind), ["hidden", "element"].includes(e.kind) ? Number(e.key) : intern(String(e.key)), e.to * 5);
  }
  const directory = await mkdtemp(path.join(os.tmpdir(), "comins-registry-")); directories.push(directory);
  const file = path.join(directory, "fixture.heapsnapshot");
  await writeFile(file, JSON.stringify({ snapshot: { node_count: nodes.length, meta: {
    node_fields: ["type", "name", "id", "self_size", "edge_count"], edge_fields: ["type", "name_or_index", "to_node"],
    node_types: [nodeTypes], edge_types: [edgeTypes],
  } }, nodes: rawNodes, edges, strings }));
  return readWeakRegistrySnapshot(file, "registry", "held", "Probe", "probe-marker");
}
afterEach(async () => { for (const directory of directories.splice(0)) await rm(directory, { recursive: true }); });

it("reads mutable ContextCell values and distinguishes a probe instance from its prototype", async () => {
  expect(await inspect(fixture())).toMatchObject({ stores: 1, backingBytes: 100, weakKeys: 1, heldObjects: 1, probeObjects: 1 });
});
it("does not classify native null or weak-only retired stores as held objects", async () => {
  expect(await inspect(fixture(true))).toMatchObject({ stores: 0, backingBytes: 0, heldObjects: 0, probeObjects: 0 });
});
it("deduplicates shared backing storage without merging distinct registries", async () => {
  const nodes = fixture();
  nodes[0]!.links!.push(link("internal", "second-context", 10));
  nodes.push({ type: "object", name: "system / Context", links: [link("context", "registry", 11)] });
  nodes.push({ type: "object", name: "WeakSet", links: [link("internal", "table", 5)] });
  expect(await inspect(nodes)).toMatchObject({ stores: 2, backingBytes: 100 });
});
it("requires both the WeakMap table and key before traversing its conditional value", async () => {
  const nodes = fixture();
  nodes[0]!.links = [link("internal", "table", 10), link("internal", "key", 11)];
  nodes.push({ type: "array", name: "ephemeron", links: [link("internal", "part of key (Object @23) -> value (Context @3) pair in WeakMap (table @21)", 1)] });
  nodes.push({ type: "object", name: "Object" });
  expect(await inspect(nodes)).toMatchObject({ stores: 1 });
  nodes[0]!.links![1]!.kind = "weak";
  expect(await inspect(nodes)).toMatchObject({ stores: 0 });
});
