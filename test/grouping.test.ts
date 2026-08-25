import { describe, expect, it, vi } from "vitest";

import { createCominsTableState } from "../src";
import {
  createCominsGroupTree,
  encodeCominsGroupPath,
  getCominsAggregateValue,
  normalizeCominsGroupKey,
  normalizeCominsRowGrouping,
  orderCominsGroupTree,
  projectCominsGroupTree,
} from "../src/grouping";

type Row = {
  amount: unknown;
  city: string;
  hiddenCode?: string;
  id: string;
  region: unknown;
};

const columns = [
  { field: "region", label: "Region", sort: true },
  { field: "city", label: "City", sort: true },
  { field: "amount", label: "Amount", sort: true },
  { field: "hiddenCode", hidden: true, label: "Hidden code" },
  { field: "id", label: "ID" },
] as const;

const data: Row[] = [
  { amount: 3, city: "Seoul", hiddenCode: "a", id: "a", region: "West" },
  { amount: 1, city: "Busan", hiddenCode: "b", id: "b", region: "East" },
  { amount: 2, city: "Busan", hiddenCode: "b", id: "c", region: "East" },
  { amount: null, city: "Seoul", hiddenCode: "a", id: "d", region: "West" },
];

function createFixture() {
  return createCominsTableState({
    columns,
    getRowId: (row: Row) => row.id,
    rows: data,
  });
}

function createSourceRows() {
  const state = createFixture();

  return state.rows.map((row, dataIndex) => ({
    data: row,
    dataIndex,
    id: state.rowIds[dataIndex]!,
  }));
}

describe("row grouping pure model", () => {
  it("keeps the first valid criterion, allows hidden criteria, and ignores invalid aggregations", () => {
    const state = createFixture();
    const normalized = normalizeCominsRowGrouping({
      columns: state.columns,
      config: {
        aggregations: {
          amount: "sum",
          missing: "count",
          region: "median" as never,
        },
        criteria: ["region", "unknown", "region", "hiddenCode"],
      },
    });

    expect(normalized.criteria.map(({ column }) => column.id)).toEqual([
      "region",
      "hiddenCode",
    ]);
    expect([...normalized.aggregations]).toEqual([["amount", "sum"]]);
  });

  it("uses typed length-prefixed group IDs for supported, empty, and unsupported keys", () => {
    const variants = [
      null,
      undefined,
      0,
      -0,
      1,
      "1",
      true,
      new Date(1),
      Number.NaN,
      Number.POSITIVE_INFINITY,
      new Date(Number.NaN),
      {},
    ];
    const encoded = variants.map((value) =>
      encodeCominsGroupPath([
        { columnId: "segment:one", key: normalizeCominsGroupKey(value) },
      ]),
    );

    expect(encoded.every((id) => id.startsWith("comins-group:"))).toBe(true);
    expect(encoded[0]).toBe(encoded[1]);
    expect(encoded[2]).toBe(encoded[3]);
    expect(new Set(encoded.slice(4, 8)).size).toBe(4);
    expect(new Set(encoded.slice(8)).size).toBe(1);
    expect(
      encodeCominsGroupPath([
        { columnId: "a:1", key: normalizeCominsGroupKey("b") },
      ]),
    ).not.toBe(
      encodeCominsGroupPath([
        { columnId: "a", key: normalizeCominsGroupKey("1:b") },
      ]),
    );
  });

  it("builds one-pass nested membership without copying source rows and aggregates every descendant", () => {
    const state = createFixture();
    const normalized = normalizeCominsRowGrouping({
      columns: state.columns,
      config: {
        aggregations: { amount: "sum", id: "count" },
        criteria: ["region", "city"],
      },
    });
    const tree = createCominsGroupTree({
      ...normalized,
      rows: createSourceRows(),
    });

    expect(tree.rootGroupIds).toHaveLength(2);
    const west = tree.nodesById.get(tree.rootGroupIds[0]!)!;
    const east = tree.nodesById.get(tree.rootGroupIds[1]!)!;

    expect(west.label).toBe("West");
    expect(east.label).toBe("East");
    expect(west.firstSourceIndex).toBe(0);
    expect(west.leafSourceIndexes).toBeUndefined();
    expect(west.childGroupIds).toHaveLength(1);
    expect(getCominsAggregateValue(west.aggregationState.get("amount")!)).toBe(3);
    expect(getCominsAggregateValue(west.aggregationState.get("id")!)).toBe(2);

    const westSeoul = tree.nodesById.get(west.childGroupIds[0]!)!;
    expect(westSeoul.leafSourceIndexes).toEqual([0, 3]);
    expect(Object.values(westSeoul)).not.toContain(data[0]);
  });

  it("applies empty and unsupported labels without exposing unsupported values to getLabel", () => {
    const getLabel = vi.fn(({ key }) => (key === null ? "No region" : `Region ${String(key)}`));
    const state = createCominsTableState<Row>({
      columns,
      getRowId: (row) => row.id,
      rows: [
        { amount: 1, city: "A", id: "empty", region: undefined },
        { amount: 2, city: "B", id: "unsupported", region: {} },
      ],
    });
    const normalized = normalizeCominsRowGrouping({
      columns: state.columns,
      config: { criteria: [{ columnId: "region", getLabel }] },
    });
    const tree = createCominsGroupTree({
      ...normalized,
      rows: state.rows.map((row, dataIndex) => ({ data: row, dataIndex, id: state.rowIds[dataIndex]! })),
    });
    const groups = tree.rootGroupIds.map((groupId) => tree.nodesById.get(groupId)!);

    expect(groups.map(({ label }) => label)).toEqual(["No region", "(unsupported)"]);
    expect(getLabel).toHaveBeenCalledTimes(1);
    expect(getLabel).toHaveBeenCalledWith(expect.objectContaining({ depth: 0, key: null }));
  });

  it("sorts hierarchy rules separately from leaf rules and projects visible leaf indexes", () => {
    const state = createFixture();
    const normalized = normalizeCominsRowGrouping({
      columns: state.columns,
      config: { criteria: ["region", "city"] },
    });
    const tree = createCominsGroupTree({ ...normalized, rows: createSourceRows() });
    const ordered = orderCominsGroupTree({
      columns: state.columns,
      rows: state.rows,
      sortModel: [
        { columnId: "region", direction: "asc" },
        { columnId: "city", direction: "desc" },
        { columnId: "amount", direction: "desc" },
      ],
      tree,
    });
    const eastId = ordered.orderedRootGroupIds[0]!;
    const eastCityId = ordered.orderedChildGroupIdsById.get(eastId)?.[0]!;
    const projection = projectCominsGroupTree({
      expandedGroupIds: [eastId, eastCityId],
      rowIds: state.rowIds,
      tree: ordered,
    });

    expect(ordered.nodesById.get(eastId)?.label).toBe("East");
    expect(
      ordered.orderedLeafSourceIndexesById.get(eastCityId),
    ).toEqual([2, 1]);
    expect(projection.entries.map((entry) => entry.kind)).toEqual([
      "group",
      "group",
      "data",
      "data",
      "group",
    ]);
    expect(projection.visibleLeafRowIds).toEqual(["c", "b"]);
    expect(
      projection.entries
        .filter((entry) => entry.kind === "data")
        .map((entry) => entry.visibleLeafIndex),
    ).toEqual([0, 1]);
  });

  it("applies the fixed mixed-key total order and reverses it for descending groups", () => {
    const mixedRows: Row[] = [
      { amount: 1, city: "A", id: "string", region: "1" },
      { amount: 1, city: "A", id: "number", region: 1 },
      { amount: 1, city: "A", id: "boolean", region: false },
      { amount: 1, city: "A", id: "empty", region: null },
      { amount: 1, city: "A", id: "unsupported", region: {} },
      { amount: 1, city: "A", id: "date", region: new Date(1) },
    ];
    const state = createCominsTableState({
      columns,
      getRowId: (row: Row) => row.id,
      rows: mixedRows,
    });
    const normalized = normalizeCominsRowGrouping({
      columns: state.columns,
      config: { criteria: ["region"] },
    });
    const tree = createCominsGroupTree({
      ...normalized,
      rows: state.rows.map((row, dataIndex) => ({ data: row, dataIndex, id: state.rowIds[dataIndex]! })),
    });
    const getKinds = (direction: "asc" | "desc") => {
      const ordered = orderCominsGroupTree({
        columns: state.columns,
        rows: state.rows,
        sortModel: [{ columnId: "region", direction }],
        tree,
      });

      return ordered.orderedRootGroupIds.map((groupId) => ordered.nodesById.get(groupId)?.key.kind);
    };

    expect(getKinds("asc")).toEqual(["empty", "unsupported", "boolean", "number", "date", "string"]);
    expect(getKinds("desc")).toEqual(["string", "date", "number", "boolean", "unsupported", "empty"]);
  });

  it.each([
    ["count", 6],
    ["sum", 3],
    ["avg", 1.5],
    ["min", 1],
    ["max", 2],
  ] as const)("computes %s from every descendant with finite numeric rules", (aggregation, expected) => {
    const aggregateRows: Row[] = [1, 2, null, Number.NaN, "x", Number.POSITIVE_INFINITY].map(
      (amount, index) => ({ amount, city: "A", id: `aggregate-${index}`, region: "All" }),
    );
    const state = createCominsTableState({
      columns,
      getRowId: (row: Row) => row.id,
      rows: aggregateRows,
    });
    const normalized = normalizeCominsRowGrouping({
      columns: state.columns,
      config: { aggregations: { amount: aggregation }, criteria: ["region"] },
    });
    const tree = createCominsGroupTree({
      ...normalized,
      rows: state.rows.map((row, dataIndex) => ({ data: row, dataIndex, id: state.rowIds[dataIndex]! })),
    });
    const node = tree.nodesById.get(tree.rootGroupIds[0]!)!;

    expect(getCominsAggregateValue(node.aggregationState.get("amount")!)).toBe(expected);
  });

  it("returns an empty numeric aggregate when no finite number exists", () => {
    const state = createCominsTableState<Row>({
      columns,
      getRowId: (row) => row.id,
      rows: [{ amount: null, city: "A", id: "empty-number", region: "All" }],
    });
    const normalized = normalizeCominsRowGrouping({
      columns: state.columns,
      config: { aggregations: { amount: "sum" }, criteria: ["region"] },
    });
    const tree = createCominsGroupTree({
      ...normalized,
      rows: [{ data: state.rows[0]!, dataIndex: 0, id: state.rowIds[0]! }],
    });

    expect(getCominsAggregateValue(tree.nodesById.get(tree.rootGroupIds[0]!)!.aggregationState.get("amount")!)).toBeNull();
  });
});
