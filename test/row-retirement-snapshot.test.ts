import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { readRowRetirementSnapshot } from "./playwright/helpers/row-retirement-snapshot";

function fixture(options: { noScriptSource?: boolean; noSDKFrame?: boolean; extraSameNamedClosures?: boolean } = {}) {
  const strings: string[] = [], stringIds = new Map<string, number>();
  const intern = (text: string) => { let id = stringIds.get(text); if (id === undefined) { id = strings.length; strings.push(text); stringIds.set(text, id); } return id; };
  const types = ["synthetic", "object", "closure", "string", "native", "array", "code"];
  const edgeTypes = ["property", "internal", "element", "weak", "shortcut"];
  const rows: { type: string; name: string; edges: { type: string; key: string; to: number }[] }[] = [];
  const node = (type: string, name: string) => { const index = rows.length; rows.push({ type, name, edges: [] }); return index; };
  const edge = (from: number, key: string, to: number, type = "property") => rows[from]!.edges.push({ key, to, type });
  const root = node("synthetic", "");
  const fixtureURL = "http://fixture/row-data-retirement.tsx", sdkURL = "http://fixture/@fs/sdk/src/index.tsx";
  const fixtureBody = "class RowDataRetirementRow {}", sdkBody = "function CominsTableInner() {}";
  const script = (url: string, body: string, missing = false) => {
    const value = node("code", "system / Script"); edge(value, "name", node("string", url), "internal");
    if (!missing) edge(value, "source", node("string", body), "internal"); return value;
  };
  const fixtureScript = script(fixtureURL, fixtureBody, options.noScriptSource), sdkScript = script(sdkURL, sdkBody);
  const closure = (name: string, source: number) => { const value = node("closure", name), shared = node("code", "system / SharedFunctionInfo"); edge(value, "shared", shared, "internal"); edge(shared, "script", source, "internal"); return value; };
  if (options.extraSameNamedClosures) {
    const unused = closure("RowDataRetirementRow", fixtureScript), unusedPrototype = node("object", "Object");
    edge(unused, "prototype", unusedPrototype); edge(unusedPrototype, "constructor", unused); edge(root, "unusedConstructorWithPrototype", unused);
  }
  const ctor = closure("RowDataRetirementRow", fixtureScript), prototype = node("object", "Object");
  edge(ctor, "prototype", prototype); edge(prototype, "constructor", ctor); edge(root, "fixtureConstructor", ctor);
  if (options.extraSameNamedClosures) edge(root, "unusedConstructorWithoutPrototype", closure("RowDataRetirementRow", fixtureScript));
  // These row nodes deliberately have no root edges: a reachability filter would hide them.
  for (const generation of ["A", "A", "C"]) {
    const row = node("object", "RowDataRetirementRow"); edge(row, "__proto__", prototype); edge(row, "generation", node("string", generation));
  }
  // Same-named closure/code nodes must not be mistaken for actual Fiber root objects.
  node("closure", "FiberRootNode"); node("code", "FiberRootNode");
  const fiberRoot = node("object", "FiberRootNode"), table = node("object", "FiberNode"), td = node("object", "FiberNode");
  edge(root, "reactRoot", fiberRoot); edge(fiberRoot, "current", table); edge(table, "child", td);
  const forwardRef = node("object", "Object"); edge(table, "type", forwardRef); edge(forwardRef, "render", closure("CominsTableInner", sdkScript));
  edge(td, "stateNode", node("native", '<td class="comins-table__td">'));
  const error = node("object", "Error"), data = node("object", "system / ErrorStackData"), frames = node("array", "");
  edge(td, "_debugStack", error); edge(error, "<symbol>", data); edge(data, "0", frames, "element");
  if (!options.noSDKFrame) edge(frames, "7", closure("renderCominsDataCell", sdkScript), "element");
  const nodes: number[] = [], edges: number[] = [];
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]!;
    nodes.push(types.indexOf(row.type), intern(row.name), index * 2 + 1, 16, row.edges.length);
    for (const item of row.edges) edges.push(edgeTypes.indexOf(item.type), item.type === "element" ? Number(item.key) : intern(item.key), item.to * 5);
  }
  return { heap: { snapshot: { node_count: rows.length, edge_count: edges.length / 3, meta: {
    node_fields: ["type", "name", "id", "self_size", "edge_count"], edge_fields: ["type", "name_or_index", "to_node"],
    node_types: [types, "string", "number", "number", "number"], edge_types: [edgeTypes, "string_or_number", "node"],
  } }, nodes, edges, strings }, fixtureURL, fixtureBody, sdkURL, sdkBody };
}
async function withFixture(options: Parameters<typeof fixture>[0], run: (file: string, input: Parameters<typeof readRowRetirementSnapshot>[1]) => Promise<void>) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "comins-row-retirement-schema-"));
  try {
    const data = fixture(options), file = path.join(directory, "heap.json"), fixtureFile = path.join(directory, "fixture.js"), sdkFile = path.join(directory, "sdk.js");
    await Promise.all([writeFile(file, JSON.stringify(data.heap)), writeFile(fixtureFile, data.fixtureBody), writeFile(sdkFile, data.sdkBody)]);
    const sha = (text: string) => createHash("sha256").update(text).digest("hex");
    await run(file, { fixtureScriptURL: data.fixtureURL, sourceRoot: "/sdk", servedScripts: [
      { url: data.fixtureURL, file: fixtureFile, sha256: sha(data.fixtureBody) }, { url: data.sdkURL, file: sdkFile, sha256: sha(data.sdkBody) },
    ] });
  } finally { await rm(directory, { recursive: true, force: true }); }
}
it("counts all constructor-source-bound raw rows even without root reachability", async () => {
  await withFixture({}, async (file, input) => {
    const result = await readRowRetirementSnapshot(file, input);
    expect(result.counts).toEqual({ A: 2, B: 0, C: 1 });
    expect(result.liveFrame.frames.map(frame => frame.functionName)).toContain("renderCominsDataCell");
  });
});
it("rejects a changed HTTP script body hash instead of returning zero rows", async () => {
  await withFixture({}, async (file, input) => {
    input.servedScripts[0]!.sha256 = "invalid";
    await expect(readRowRetirementSnapshot(file, input)).rejects.toThrow("HTTP body hash mismatch");
  });
});
it("rejects missing Script source metadata", async () => {
  await withFixture({ noScriptSource: true }, async (file, input) => {
    await expect(readRowRetirementSnapshot(file, input)).rejects.toThrow("Missing source");
  });
});
it("rejects SDK stacks without populated source-verified development frames", async () => {
  await withFixture({ noSDKFrame: true }, async (file, input) => {
    await expect(readRowRetirementSnapshot(file, input)).rejects.toThrow("No populated current SDK development debugStack");
  });
});

it("derives the actual instance constructor despite unused same-named closures", async () => {
  await withFixture({ extraSameNamedClosures: true }, async (file, input) => {
    const result = await readRowRetirementSnapshot(file, input);
    expect(result.counts).toEqual({ A: 2, B: 0, C: 1 });
    expect(result.constructor.owners).toHaveLength(1);
    expect(result.constructor.owners[0]!.rows).toBe(3);
  });
});
