import { describe, expect, it } from "vitest";
import { createCominsTableState } from "../src/core";
import { flattenCominsTree } from "../src/tree";

const modules = import.meta.glob("../src/core/rows/*.ts", { eager: true });
const api = () => {
  expect(modules["../src/core/rows/projection.ts"], "neutral row projection").toBeDefined();
  return modules["../src/core/rows/projection.ts"] as typeof import("../src/core/rows/projection");
};
const grouping = () => modules["../src/core/rows/grouping.ts"] as typeof import("../src/core/rows/grouping");
const filtering = () => modules["../src/core/rows/filtering.ts"] as typeof import("../src/core/rows/filtering");
const rows = [{ id: "a9", group: "A", score: 9 }, { id: "b4", group: "B", score: 4 }, { id: "a1", group: "A", score: 1 }, { id: "a2", group: "A", score: 2 }];
const state = createCominsTableState({ rows, getRowId: row => row.id, columns: [{ field: "score", label: "Score", sort: true, filter: { kind: "number" } }] });

describe("mode-specific Core row projection", () => {
  it("filters before aggregation, retains group order and sorts only expanded leaves", () => {
    const { projectCoreRows } = api();
    const indexes = filtering().getCominsFilteredRowIndexes({ columns: state.columns, model: [{ columnId: "score", operator: "greaterThanOrEqual", value: 2 }], rows: rows.map((data, dataIndex) => ({ data, dataIndex, id: data.id })) });
    const normalized = grouping().normalizeCominsRowGrouping({ columns: state.columns, config: { groups: ["B", "A"], getGroupId: group => group, aggregations: { score: "sum" } } });
    const model = grouping().createCominsGroupModel({ ...normalized, getRowGroupId: (row: typeof rows[number]) => row.group, rows: indexes.map(dataIndex => ({ data: rows[dataIndex]!, dataIndex, id: rows[dataIndex]!.id })) });
    const ordered = grouping().orderCominsGroupModel({ model, columns: state.columns, rows, sortModel: [{ columnId: "score", direction: "asc" }] });
    const projection = grouping().projectCominsGroups({ model: ordered, rowIds: state.rowIds, expandedGroupIds: ["A"] });
    const result = projectCoreRows({ mode: "grouped", rows, rowIds: state.rowIds, projection });
    expect(result.visibleRowIds).toEqual(["a2", "a9"]);
    expect(result.dataIndexes).toEqual([3, 0]);
    expect(result.entries.map(entry => entry.kind === "group" ? entry.groupId : entry.kind)).toEqual(["B", "A", "data", "data"]);
    expect(result.entries[0]).not.toHaveProperty("rowId");
    expect(model.groupsById.get("A")).not.toHaveProperty("label");
    expect(grouping().getCominsAggregateValue(model.groupsById.get("A")!.aggregationState.get("score")!)).toBe(11);
    expect(rows.map(row => row.score)).toEqual([9, 4, 1, 2]);
  });

  it("keeps the full source order for virtual slots and slices only nonvirtual pages", () => {
    const base = { mode: "flat" as const, rows, rowIds: state.rowIds, dataIndexes: [2, 3, 1, 0], pagination: { pageIndex: 1, pageSize: 2 } };
    const paged = api().projectCoreRows({ ...base, virtualized: false });
    expect(paged.visibleRowIds).toEqual(["a1", "a2", "b4", "a9"]);
    expect(paged.pageDataIndexes).toEqual([1, 0]);
    expect(api().projectCoreRows({ ...base, virtualized: true }).pageDataIndexes).toEqual([2, 3, 1, 0]);
    expect(api().projectCoreRows({ ...base, pagination: { pageIndex: 99, pageSize: 2 }, virtualized: false }).pageStartIndex).toBe(2);
  });

  it("sorts siblings while keeping expansion and tree paths", () => {
    const tree = [{ item: rows[0]!, expand: true, children: [{ item: rows[1]! }, { item: rows[3]! }] }, { item: rows[2]!, expand: false, children: [{ item: { id: "hidden", group: "A", score: 0 } }] }];
    const sorted = api().getSortedCoreTree(tree, state.columns, [{ columnId: "score", direction: "asc" }]);
    const visible = flattenCominsTree(sorted, row => row.id);
    const result = api().projectCoreRows({ mode: "tree", rows: visible.map(entry => entry.item), rowIds: visible.map(entry => entry.rowId), dataIndexes: [0, 1, 2, 3] });
    expect(result.visibleRowIds).toEqual(["a1", "a9", "a2", "b4"]);
    expect(visible.map(entry => entry.path)).toEqual([[0], [1], [1, 0], [1, 1]]);
    expect(tree[0]?.children?.map(node => node.item.id)).toEqual(["b4", "a2"]);
    expect(api().getSortedCoreTree(tree, state.columns, [])).toBe(tree);
  });

  it("projects only requested sparse viewport slots and keeps source and absolute positions separate", () => {
    const result = api().projectCoreRows({ mode: "viewport", rows: rows.slice(0, 2), rowIds: [1, "1"], dataIndexes: [0, 1], absoluteIndexById: new Map<string | number, number>([[1, 50], ["1", 53]]), range: { startIndex: 49, endIndex: 55 }, rowCount: 54 });
    expect(result.entries.map(entry => entry.kind)).toEqual(["placeholder", "data", "placeholder", "placeholder", "data"]);
    expect(result.entries[1]).toMatchObject({ dataIndex: 0, absoluteIndex: 50, rowId: 1 });
    expect(result.entries[4]).toMatchObject({ dataIndex: 1, absoluteIndex: 53, rowId: "1" });
    expect(result.visibleRowIds).toEqual([1, "1"]);
    expect(api().projectCoreRows({ mode: "viewport", rows: [], rowIds: [], dataIndexes: [], absoluteIndexById: new Map(), range: { startIndex: 900000, endIndex: 900003 }, rowCount: 1000000 }).entries).toHaveLength(3);
  });
});
