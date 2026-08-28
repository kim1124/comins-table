import { describe, expect, it, vi } from "vitest";

import {
  createCominsTableTransferCoordinator,
  emitCominsTableTransfer,
  getCominsTableTransferRegistration,
  registerCominsTableTransfer,
  transferCominsGroupBetweenTables,
  transferCominsRowBetweenTables,
  type CominsTableTransferRegistration,
  type CominsTableTransferEndpoint,
} from "../src/table-transfer";

type Row = {
  groupId?: string;
  id: string;
  label: string;
};

type Group = {
  id: string;
  label: string;
};

function flatEndpoint(tableId: string, data: readonly Row[]): CominsTableTransferEndpoint<Row> {
  return { data, getRowId: (row) => row.id, tableId };
}

function groupedEndpoint(
  tableId: string,
  data: readonly Row[],
  groups: readonly Group[],
): CominsTableTransferEndpoint<Row, Group> {
  return {
    data,
    getGroupId: (group) => group.id,
    getRowGroupId: (row) => row.groupId ?? "",
    getRowId: (row) => row.id,
    groups,
    setRowGroupId: ({ row, toGroupId }) => ({ ...row, groupId: String(toGroupId) }),
    tableId,
  };
}

describe("cross-table transfer", () => {
  it("isolates registrations per Coordinator and fails closed for duplicate table IDs", () => {
    const onTransfer = vi.fn();
    const coordinator = createCominsTableTransferCoordinator<Row>({ onTransfer });
    const endpoint = flatEndpoint("left", []);
    const registration: CominsTableTransferRegistration<Row, never> = {
      getSnapshot: () => ({
        config: { coordinator, scope: "tasks", tableId: "left" },
        endpoint,
        instanceId: "instance-left",
        root: null,
        viewport: null,
      }),
    };
    const cleanup = registerCominsTableTransfer(coordinator, "tasks", "left", registration);

    expect(getCominsTableTransferRegistration(coordinator, "tasks", "left")).toBe(registration);

    const duplicate: CominsTableTransferRegistration<Row, never> = {
      getSnapshot: registration.getSnapshot,
    };
    const cleanupDuplicate = registerCominsTableTransfer(coordinator, "tasks", "left", duplicate);

    expect(getCominsTableTransferRegistration(coordinator, "tasks", "left")).toBeNull();

    cleanupDuplicate();
    expect(getCominsTableTransferRegistration(coordinator, "tasks", "left")).toBe(registration);

    const result = transferCominsRowBetweenTables({
      source: flatEndpoint("left", [{ id: "a", label: "Alpha" }]),
      sourceRowId: "a",
      target: flatEndpoint("right", []),
    })!;
    expect(emitCominsTableTransfer(coordinator, result)).toBe(true);
    expect(onTransfer).toHaveBeenCalledWith(result);

    cleanup();
    expect(getCominsTableTransferRegistration(coordinator, "tasks", "left")).toBeNull();
  });

  it("moves one flat Row before a target Row without mutating either input", () => {
    const sourceRows = [
      { id: "a", label: "Alpha" },
      { id: "b", label: "Beta" },
    ];
    const targetRows = [
      { id: "c", label: "Gamma" },
      { id: "d", label: "Delta" },
    ];
    const result = transferCominsRowBetweenTables({
      source: flatEndpoint("source", sourceRows),
      sourceRowId: "b",
      target: flatEndpoint("target", targetRows),
      targetRowId: "d",
    });

    expect(result?.source.data.map((row) => row.id)).toEqual(["a"]);
    expect(result?.target.data.map((row) => row.id)).toEqual(["c", "b", "d"]);
    expect(sourceRows.map((row) => row.id)).toEqual(["a", "b"]);
    expect(targetRows.map((row) => row.id)).toEqual(["c", "d"]);
  });

  it("rejects duplicate Row IDs by default and supports target overwrite", () => {
    const source = flatEndpoint("source", [{ id: "a", label: "Source Alpha" }]);
    const target = flatEndpoint("target", [
      { id: "x", label: "Existing" },
      { id: "a", label: "Target Alpha" },
      { id: "z", label: "Last" },
    ]);

    expect(transferCominsRowBetweenTables({ source, sourceRowId: "a", target })).toBeNull();

    const resolveConflict = vi.fn(() => "overwrite" as const);
    const result = transferCominsRowBetweenTables({
      resolveConflict,
      source,
      sourceRowId: "a",
      target,
      targetRowId: "z",
    });

    expect(resolveConflict).toHaveBeenCalledWith(expect.objectContaining({ kind: "row", rowId: "a" }));
    expect(result?.target.data).toEqual([
      { id: "x", label: "Existing" },
      { id: "a", label: "Source Alpha" },
      { id: "z", label: "Last" },
    ]);
  });

  it("moves a grouped Row into an empty target Group and preserves its business ID", () => {
    const groups = [
      { id: "todo", label: "Todo" },
      { id: "done", label: "Done" },
    ];
    const source = groupedEndpoint("source", [
      { groupId: "todo", id: "a", label: "Alpha" },
      { groupId: "todo", id: "b", label: "Beta" },
    ], groups);
    const target = groupedEndpoint("target", [], groups);
    const result = transferCominsRowBetweenTables({
      source,
      sourceRowId: "a",
      target,
      targetGroupId: "done",
    });

    expect(result?.source.data.map((row) => row.id)).toEqual(["b"]);
    expect(result?.source.groups).toEqual(groups);
    expect(result?.target.data).toEqual([
      { groupId: "done", id: "a", label: "Alpha" },
    ]);
  });

  it("fails closed when a grouped membership mapper changes the business Row ID", () => {
    const groups = [{ id: "done", label: "Done" }];
    const source = groupedEndpoint("source", [
      { groupId: "todo", id: "a", label: "Alpha" },
    ], [{ id: "todo", label: "Todo" }]);
    const target = {
      ...groupedEndpoint("target", [], groups),
      setRowGroupId: ({ row }: { row: Row }) => ({ ...row, groupId: "done", id: "changed" }),
    };

    expect(transferCominsRowBetweenTables({
      source,
      sourceRowId: "a",
      target,
      targetGroupId: "done",
    })).toBeNull();
  });

  it("moves a Group with all member Rows and leaves unrelated Rows in source order", () => {
    const todo = { id: "todo", label: "Todo" };
    const done = { id: "done", label: "Done" };
    const source = groupedEndpoint("source", [
      { groupId: "todo", id: "a", label: "Alpha" },
      { groupId: "done", id: "x", label: "Existing" },
      { groupId: "todo", id: "b", label: "Beta" },
    ], [todo, done]);
    const target = groupedEndpoint("target", [
      { groupId: "review", id: "r", label: "Review" },
    ], [{ id: "review", label: "Review" }]);
    const result = transferCominsGroupBetweenTables({
      position: "before",
      source,
      sourceGroupId: "todo",
      target,
      targetGroupId: "review",
    });

    expect(result?.source.groups).toEqual([done]);
    expect(result?.source.data.map((row) => row.id)).toEqual(["x"]);
    expect(result?.target.groups?.map((group) => group.id)).toEqual(["todo", "review"]);
    expect(result?.target.data.map((row) => row.id)).toEqual(["r", "a", "b"]);
  });

  it("moves an empty Group without changing either data array", () => {
    const empty = { id: "empty", label: "Empty" };
    const source = groupedEndpoint("source", [], [empty]);
    const target = groupedEndpoint("target", [], []);
    const result = transferCominsGroupBetweenTables({
      source,
      sourceGroupId: "empty",
      target,
    });

    expect(result?.source).toMatchObject({ data: [], groups: [] });
    expect(result?.target).toMatchObject({ data: [], groups: [empty] });
  });

  it("overwrites a conflicting Group bundle and resolves remaining Row conflicts atomically", () => {
    const sourceGroup = { id: "todo", label: "Source Todo" };
    const source = groupedEndpoint("source", [
      { groupId: "todo", id: "a", label: "Source A" },
      { groupId: "todo", id: "b", label: "Source B" },
    ], [sourceGroup]);
    const target = groupedEndpoint("target", [
      { groupId: "other", id: "a", label: "Other A" },
      { groupId: "todo", id: "old", label: "Old Todo" },
      { groupId: "other", id: "z", label: "Other Z" },
    ], [
      { id: "todo", label: "Target Todo" },
      { id: "other", label: "Other" },
    ]);
    const resolveConflict = vi.fn(() => "overwrite" as const);
    const result = transferCominsGroupBetweenTables({
      resolveConflict,
      source,
      sourceGroupId: "todo",
      target,
      targetGroupId: "todo",
    });

    expect(resolveConflict.mock.calls.map(([conflict]) => conflict.kind)).toEqual(["group", "row"]);
    expect(result?.target.groups).toEqual([sourceGroup, { id: "other", label: "Other" }]);
    expect(result?.target.data).toEqual([
      { groupId: "todo", id: "a", label: "Source A" },
      { groupId: "todo", id: "b", label: "Source B" },
      { groupId: "other", id: "z", label: "Other Z" },
    ]);
    expect(result?.details.conflicts).toHaveLength(2);
  });

  it("rejects an entire Group transfer when any member Row conflict rejects", () => {
    const source = groupedEndpoint("source", [
      { groupId: "todo", id: "a", label: "Source A" },
    ], [{ id: "todo", label: "Todo" }]);
    const target = groupedEndpoint("target", [
      { groupId: "other", id: "a", label: "Target A" },
    ], [{ id: "other", label: "Other" }]);

    expect(transferCominsGroupBetweenTables({
      resolveConflict: () => "reject",
      source,
      sourceGroupId: "todo",
      target,
    })).toBeNull();
    expect(source.data).toHaveLength(1);
    expect(target.data).toHaveLength(1);
  });
});
