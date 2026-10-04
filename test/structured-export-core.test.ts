import { describe, expect, it } from "vitest";
import {
  createCominsTreeExportOptions, createCominsGroupedExportOptions,
  exportCominsRowsToCsv, exportCominsRowsToJson, importCominsRowsFromCsv,
} from "../src/core";

type Row = { id: string | number; name: string; group: string | number };
const columns = [{ id: "name", label: "Name", value: (row: Row) => row.name }];
const parent: Row = { id: 0, name: "Parent", group: "B" };
const child: Row = { id: "child", name: 'Child, "one"', group: "A" };
const last: Row = { id: "last", name: "Last", group: "B" };
const nodes = [{ item: parent, expand: false, children: [{ item: child }] }, { item: last }];
const getRowId = (row: Row) => row.id;

describe("structured export metadata", () => {
  it("exports all tree nodes in preorder with prefixed metadata without mutating rows", () => {
    const before = structuredClone(nodes);
    const options = createCominsTreeExportOptions({ columns, nodes, getRowId });
    expect(options.rows).toEqual([parent, child, last]);
    expect(options.rows[0]).toBe(parent);
    expect(exportCominsRowsToCsv(options)).toBe('Name,__rowId,__parentId,__depth\nParent,0,,0\n"Child, ""one""",child,0,1\nLast,last,,0');
    expect(JSON.parse(exportCominsRowsToJson(options))).toEqual([
      { Name: "Parent", __rowId: 0, __parentId: null, __depth: 0 },
      { Name: 'Child, "one"', __rowId: "child", __parentId: 0, __depth: 1 },
      { Name: "Last", __rowId: "last", __parentId: null, __depth: 0 },
    ]);
    expect(nodes).toEqual(before);
    expect(Object.keys(parent)).toEqual(["id", "name", "group"]);
  });

  it("keeps business column order and formatting while metadata names remain fixed", () => {
    const options = createCominsTreeExportOptions({
      columns: [...columns, { id: "id", value: getRowId, format: (row: Row) => `ID:${row.id}` }],
      nodes, getRowId, columnOrder: ["id"], headerOverrides: { id: "Identifier", __rowId: "rowId" }, valueSource: "formatted",
    });
    expect(exportCominsRowsToCsv(options)).toBe('Identifier,__rowId,__parentId,__depth\nID:0,0,,0\nID:child,child,0,1\nID:last,last,,0');
  });

  it("orders grouped rows by explicit group order while preserving member order", () => {
    const seen: number[] = [];
    const options = createCominsGroupedExportOptions({
      columns, rows: [parent, child, last], groups: ["A", "empty", "B"], getGroupId: group => group,
      getRowGroupId: (row, index) => { seen.push(index); return row.group; }, getRowId,
    });
    expect(seen).toEqual([0, 1, 2]);
    expect(options.rows).toEqual([child, parent, last]);
    expect(exportCominsRowsToCsv(options)).toBe('Name,__rowId,__groupId\n"Child, ""one""",child,A\nParent,0,B\nLast,last,B');
    expect(JSON.parse(exportCominsRowsToJson(options))[1]).toEqual({ Name: "Parent", __rowId: 0, __groupId: "B" });
  });

  it("uses source indexes for IDs and export indexes for value getters", () => {
    const options = createCominsGroupedExportOptions({
      columns: [{ id: "index", value: (_row: Row, index) => index }], rows: [parent, child],
      groups: ["A", "B"], getGroupId: group => group, getRowGroupId: row => row.group,
      getRowId: (_row, index) => index,
    });
    expect(exportCominsRowsToCsv(options)).toBe("index,__rowId,__groupId\n0,1,A\n1,0,B");
  });

  it("retains metadata headers for empty tree and grouped exports", () => {
    expect(exportCominsRowsToCsv(createCominsTreeExportOptions({ columns, nodes: [], getRowId }))).toBe("Name,__rowId,__parentId,__depth");
    expect(exportCominsRowsToCsv(createCominsGroupedExportOptions({ columns, rows: [], groups: [], getGroupId: (group: string) => group, getRowGroupId: row => row.group, getRowId }))).toBe("Name,__rowId,__groupId");
  });

  it("rejects duplicate tree IDs including collapsed children", () => {
    expect(() => createCominsTreeExportOptions({ columns, nodes: [{ item: parent, expand: false, children: [{ item: parent }] }], getRowId })).toThrow(/duplicate.*row.*id/i);
  });

  it("rejects unknown and duplicate groups and duplicate row IDs", () => {
    const options = { columns, rows: [parent], groups: ["B"], getGroupId: (group: string) => group, getRowGroupId: (row: Row) => row.group, getRowId };
    expect(() => createCominsGroupedExportOptions({ ...options, groups: ["A"] })).toThrow(/unknown.*group/i);
    expect(() => createCominsGroupedExportOptions({ ...options, groups: ["B", "B"] })).toThrow(/duplicate.*group/i);
    expect(() => createCominsGroupedExportOptions({ ...options, rows: [parent, parent] })).toThrow(/duplicate.*row.*id/i);
  });

  it("distinguishes numeric and string IDs in grouping and JSON", () => {
    const options = createCominsGroupedExportOptions({ columns, rows: [{ ...parent, group: 0 }, { ...child, id: "0", group: "0" }],
      groups: ["0", 0], getGroupId: group => group, getRowGroupId: row => row.group, getRowId });
    expect(JSON.parse(exportCominsRowsToJson(options)).map(row => [row.__rowId, row.__groupId])).toEqual([["0", "0"], [0, 0]]);
  });

  it.each(["__rowId", "__parentId", "__depth"])("rejects colliding business header %s in CSV and JSON", key => {
    const options = createCominsTreeExportOptions({ columns: [{ ...columns[0]!, label: key }], nodes, getRowId });
    expect(() => exportCominsRowsToCsv(options)).toThrow(/metadata.*collision/i);
    expect(() => exportCominsRowsToJson(options)).toThrow(/metadata.*collision/i);
  });

  it("detects collisions after header overrides and leaves plain export unchanged", () => {
    const options = createCominsTreeExportOptions({ columns, nodes, getRowId, headerOverrides: { name: "__depth" } });
    expect(() => exportCominsRowsToCsv(options)).toThrow(/metadata.*collision/i);
    expect(exportCominsRowsToCsv({ columns, rows: [parent], headerOverrides: { name: "__depth" } })).toBe("__depth\nParent");
  });

  it("returns plain imported rows and leaves metadata interpretation to the application", () => {
    const csv = exportCominsRowsToCsv(createCominsTreeExportOptions({ columns, nodes, getRowId }));
    expect(importCominsRowsFromCsv({ text: csv, mapRow: ({ cells }) => ({ name: cells[0] }) })).toEqual([
      { name: "Parent" }, { name: 'Child, "one"' }, { name: "Last" },
    ]);
  });

  it("supports explicit prefixed metadata without overwriting application attributes", () => {
    const row = { ...parent, __rowId: "owned-by-app" };
    const options = { columns, rows: [row], metadata: {
      __groupId: () => "__proto__", __depth: () => 0, __parentId: () => null, __rowId: () => "managed",
    } };
    expect(exportCominsRowsToCsv(options)).toBe("Name,__rowId,__parentId,__depth,__groupId\nParent,managed,,0,__proto__");
    expect(row.__rowId).toBe("owned-by-app");
  });

  it("rejects cycles even when source-index IDs are unique", () => {
    const node: { item: Row; children: unknown[] } = { item: parent, children: [] };
    node.children.push(node);
    expect(() => createCominsTreeExportOptions({ columns, nodes: [node] as typeof nodes, getRowId: (_row, index) => index })).toThrow(/cyclic/i);
  });

  it("walks deep trees without using the JavaScript call stack", () => {
    let node: { item: Row; children?: typeof node[] } = { item: parent };
    for (let depth = 0; depth < 12000; depth++) node = { item: parent, children: [node] };
    const options = createCominsTreeExportOptions({ columns, nodes: [node], getRowId: (_row, index) => index });
    expect(options.rows).toHaveLength(12001);
    expect(options.metadata!.__depth!(parent, 12000)).toBe(12000);
  });
});
