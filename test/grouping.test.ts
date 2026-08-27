import { describe, expect, it } from "vitest";

import { createCominsTableState } from "../src/core";
import {
  createCominsGroupModel,
  getCominsAggregateValue,
  moveCominsRowGroup,
  normalizeCominsRowGrouping,
  orderCominsGroupModel,
  projectCominsGroups,
} from "../src/grouping";

type Group = {
  id: string | number;
  name: string;
};

type Row = {
  amount: unknown;
  city: string;
  groupId: string | number;
  id: string;
};

const columns = [
  { field: "city", label: "City", sort: true },
  { field: "amount", label: "Amount", sort: true },
  { field: "id", label: "ID" },
] as const;

const groups: Group[] = [
  { id: "west", name: "West" },
  { id: "empty", name: "Empty" },
  { id: 1, name: "East" },
];

const data: Row[] = [
  { amount: 3, city: "Seoul", groupId: "west", id: "a" },
  { amount: 1, city: "Busan", groupId: 1, id: "b" },
  { amount: 2, city: "Daegu", groupId: 1, id: "c" },
  { amount: null, city: "Busan", groupId: "west", id: "d" },
];

function createFixture(rows: readonly Row[] = data) {
  return createCominsTableState({
    columns,
    getRowId: (row: Row) => row.id,
    rows,
  });
}

function createSourceRows(rows: readonly Row[] = data) {
  const state = createFixture(rows);

  return state.rows.map((row, dataIndex) => ({
    data: row,
    dataIndex,
    id: state.rowIds[dataIndex]!,
  }));
}

function createModel(rows: readonly Row[] = data) {
  const state = createFixture(rows);
  const normalized = normalizeCominsRowGrouping({
    columns: state.columns,
    config: {
      aggregations: { amount: "sum", id: "count" },
      getGroupId: (group: Group) => group.id,
      getGroupLabel: (group) => group.name,
      getRowGroupId: (row: Row) => row.groupId,
      groups,
    },
  });

  return {
    model: createCominsGroupModel({
      ...normalized,
      getRowGroupId: (row: Row) => row.groupId,
      rows: createSourceRows(rows),
    }),
    state,
  };
}

describe("row grouping explicit model", () => {
  it("keeps controlled Group order, empty Groups, and first duplicate IDs", () => {
    const state = createFixture();
    const duplicate = { id: "west", name: "Duplicate" };
    const normalized = normalizeCominsRowGrouping({
      columns: state.columns,
      config: {
        getGroupId: (group: Group) => group.id,
        getGroupLabel: (group) => group.name,
        getRowGroupId: (row: Row) => row.groupId,
        groups: [...groups, duplicate],
      },
    });

    expect(normalized.groupIds).toEqual(["west", "empty", 1]);
    expect(normalized.groupsById.get("west")?.group).toBe(groups[0]);
    expect(normalized.groupsById.get("empty")?.groupIndex).toBe(1);
    expect(normalized.groupsById.get(1)?.label).toBe("East");
  });

  it("builds membership and aggregates without copying source Rows", () => {
    const { model } = createModel();
    const west = model.groupsById.get("west")!;
    const empty = model.groupsById.get("empty")!;

    expect(west.leafSourceIndexes).toEqual([0, 3]);
    expect(getCominsAggregateValue(west.aggregationState.get("amount")!)).toBe(3);
    expect(getCominsAggregateValue(west.aggregationState.get("id")!)).toBe(2);
    expect(empty.leafSourceIndexes).toEqual([]);
    expect(getCominsAggregateValue(empty.aggregationState.get("amount")!)).toBeNull();
    expect(getCominsAggregateValue(empty.aggregationState.get("id")!)).toBe(0);
    expect(Object.values(west)).not.toContain(data[0]);
  });

  it("keeps Group order while sorting Rows independently inside each Group", () => {
    const { model, state } = createModel();
    const ordered = orderCominsGroupModel({
      columns: state.columns,
      model,
      rows: state.rows,
      sortModel: [
        { columnId: "city", direction: "asc" },
        { columnId: "amount", direction: "desc" },
      ],
    });

    expect(ordered.groupIds).toEqual(["west", "empty", 1]);
    expect(ordered.orderedLeafSourceIndexesById.get("west")).toEqual([3, 0]);
    expect(ordered.orderedLeafSourceIndexesById.get(1)).toEqual([1, 2]);
  });

  it("projects every Group and only expanded member Rows", () => {
    const { model, state } = createModel();
    const ordered = orderCominsGroupModel({
      columns: state.columns,
      model,
      rows: state.rows,
      sortModel: [{ columnId: "amount", direction: "desc" }],
    });
    const projection = projectCominsGroups({
      expandedGroupIds: ["west", 1],
      model: ordered,
      rowIds: state.rowIds,
    });

    expect(
      projection.entries
        .filter((entry) => entry.kind === "group")
        .map((entry) => entry.groupId),
    ).toEqual(["west", "empty", 1]);
    expect(projection.visibleLeafRowIds).toEqual(["a", "d", "c", "b"]);
    expect(
      projection.entries
        .filter((entry) => entry.kind === "data")
        .map((entry) => entry.visibleLeafIndex),
    ).toEqual([0, 1, 2, 3]);
  });

  it.each([
    ["count", 6],
    ["sum", 3],
    ["avg", 1.5],
    ["min", 1],
    ["max", 2],
  ] as const)("computes %s with finite numeric rules", (aggregation, expected) => {
    const aggregateRows: Row[] = [1, 2, null, Number.NaN, "x", Number.POSITIVE_INFINITY].map(
      (amount, index) => ({ amount, city: "A", groupId: "west", id: `aggregate-${index}` }),
    );
    const state = createFixture(aggregateRows);
    const normalized = normalizeCominsRowGrouping({
      columns: state.columns,
      config: {
        aggregations: { amount: aggregation },
        getGroupId: (group: Group) => group.id,
        getRowGroupId: (row: Row) => row.groupId,
        groups,
      },
    });
    const model = createCominsGroupModel({
      ...normalized,
      getRowGroupId: (row: Row) => row.groupId,
      rows: createSourceRows(aggregateRows),
    });

    expect(getCominsAggregateValue(model.groupsById.get("west")!.aggregationState.get("amount")!)).toBe(expected);
  });

  it("moves Groups before and after by stable ID without mutating input", () => {
    const movedAfter = moveCominsRowGroup({
      getGroupId: (group: Group) => group.id,
      groups,
      position: "after",
      sourceGroupId: "west",
      targetGroupId: 1,
    });
    const movedBefore = moveCominsRowGroup({
      getGroupId: (group: Group) => group.id,
      groups: movedAfter,
      position: "before",
      sourceGroupId: 1,
      targetGroupId: "empty",
    });

    expect(groups.map((group) => group.id)).toEqual(["west", "empty", 1]);
    expect(movedAfter.map((group) => group.id)).toEqual(["empty", 1, "west"]);
    expect(movedBefore.map((group) => group.id)).toEqual([1, "empty", "west"]);
  });

  it("returns the same order for missing, self, and already-adjacent moves", () => {
    const move = (sourceGroupId: string | number, targetGroupId: string | number) =>
      moveCominsRowGroup({
        getGroupId: (group: Group) => group.id,
        groups,
        position: "before",
        sourceGroupId,
        targetGroupId,
      });

    expect(move("missing", "west")).toEqual(groups);
    expect(move("west", "west")).toEqual(groups);
    expect(move("west", "empty")).toEqual(groups);
  });
});
