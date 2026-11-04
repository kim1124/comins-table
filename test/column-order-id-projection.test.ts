import { describe, expect, it } from "vitest";
import { createCominsTableState } from "../src/core";
import { normalizeColumnOrder } from "../src/core/layout/columns";

describe("normalizeColumnOrder column ID read budget", () => {
  it.each([
    { name: "flat", grouped: false, locked: false, expected: ["role", "age", "name"] },
    { name: "grouped", grouped: true, locked: false, expected: ["role", "age", "name"] },
    { name: "locked child", grouped: true, locked: true, expected: ["name", "age", "role"] },
  ])("preserves $name order while avoiding redundant ID projections", ({ grouped, locked, expected }) => {
    const layout = { order: ["role", "age", "name"] };
    const state = createCominsTableState({
      rows: [{ id: "r1", name: "Alpha", age: 31, role: "Owner" }],
      columns: [
        { field: "name" },
        { field: "age", lockPosition: locked },
        { field: "role" },
      ],
      columnGroups: grouped ? [{ id: "person", children: ["name", "age"] }] : undefined,
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
    expect(normalizeColumnOrder(columns, layout, state.columnGroups)).toEqual(expected);
    // ID 순서 투영과 column 조회 Map 생성에 필요한 두 번의 읽기만 허용한다.
    expect(idReads).toBeLessThanOrEqual(columns.length * 2);
  });
});
