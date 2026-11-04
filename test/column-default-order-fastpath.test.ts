import { describe, expect, it } from "vitest";
import { createCominsTableState } from "../src/core";
import { normalizeColumnOrder } from "../src/core/layout/columns";

describe("default column order calculation", () => {
  it.each([
    { name: "flat declaration", grouped: false, emptyOrder: false, locked: false, expected: ["name", "role", "age"] },
    { name: "interleaved group", grouped: true, emptyOrder: false, locked: false, expected: ["name", "age", "role"] },
    { name: "locked interleaved group", grouped: true, emptyOrder: false, locked: true, expected: ["name", "age", "role"] },
    { name: "explicit empty order", grouped: true, emptyOrder: true, locked: true, expected: ["name", "age", "role"] },
  ])("preserves $name without requested-order bookkeeping", ({ grouped, emptyOrder, locked, expected }) => {
    const state = createCominsTableState({
      rows: [{ id: "r1", name: "Alpha", role: "Owner", age: 31 }],
      columns: [
        { field: "name" },
        { field: "role", lockPosition: locked, pinned: "left" },
        { field: "age", lockPosition: locked },
      ],
      columnGroups: grouped ? [{ id: "person", children: ["name", "age"], lockPosition: locked }] : undefined,
      getRowId: (row) => row.id,
    });
    let idReads = 0;
    const columns = state.columns.map((column) => ({
      ...column,
      get id() {
        idReads += 1;
        return column.id;
      },
    }));
    const order = normalizeColumnOrder(columns, emptyOrder ? { order: [] } : undefined, state.columnGroups);
    expect(order).toEqual(expected);
    // 요청 순서가 없으면 선언 ID를 한 번 읽어 기본 그룹 순서만 구성한다.
    expect(idReads).toBeLessThanOrEqual(columns.length);
  });
});
