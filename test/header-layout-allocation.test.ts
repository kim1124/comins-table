import { afterEach, describe, expect, it, vi } from "vitest";
import { createCominsTableState, getCominsHeaderRows, getCominsVisibleColumns, type CominsColumnLayout } from "../src/core";

afterEach(() => vi.unstubAllGlobals());
const cases: Array<{ name: string; grouped: boolean; layout?: Partial<CominsColumnLayout>; visible: string[]; spans: Array<Array<[string, number, number]>> }> = [
  { name: "flat", grouped: false, visible: ["name", "age", "role"], spans: [[["name", 1, 1], ["age", 1, 1], ["role", 1, 1]]] },
  { name: "grouped", grouped: true, visible: ["name", "age", "role"], spans: [[["person", 2, 1], ["role", 1, 2]], [["name", 1, 1], ["age", 1, 1]]] },
  { name: "hidden child", grouped: true, layout: { columns: { age: { hidden: true } } }, visible: ["name", "role"], spans: [[["person", 1, 1], ["role", 1, 2]], [["name", 1, 1]]] },
  { name: "pinned and reordered", grouped: true, layout: { order: ["age", "role", "name"], columns: { role: { pinned: "left" } }, groups: { person: { pinned: "right" } } }, visible: ["role", "age", "name"], spans: [[["role", 1, 2], ["person", 2, 1]], [["age", 1, 1], ["name", 1, 1]]] },
];

describe("header layout allocation budget", () => {
  it.each(cases)("preserves $name layout without an unused visible-ID Set", ({ grouped, layout, visible, spans }) => {
    const rows = [{ id: "a", name: "Alpha", age: 31, role: "Owner" }];
    const state = createCominsTableState({ rows, columns: [
      { field: "name", label: "Name" }, { field: "age", label: "Age" }, { field: "role", label: "Role" },
    ], getRowId: row => row.id, columnLayout: layout,
    columnGroups: grouped ? [{ id: "person", children: ["name", "age"], label: "Person" }] : undefined });
    const NativeSet = globalThis.Set;
    let allocations = 0;
    class TrackedSet extends NativeSet<unknown> {
      constructor(values?: Iterable<unknown> | null) { super(values); allocations++; }
    }
    let headers: ReturnType<typeof getCominsHeaderRows<typeof rows[number]>>;
    try {
      vi.stubGlobal("Set", TrackedSet);
      headers = getCominsHeaderRows(state);
    } finally {
      vi.unstubAllGlobals();
    }
    expect(getCominsVisibleColumns(state).map(column => column.id)).toEqual(visible);
    expect(headers.map(row => row.map(cell => [cell.kind === "group" ? cell.groupId : cell.columnId, cell.colSpan, cell.rowSpan]))).toEqual(spans);
    for (const cell of headers.flat()) {
      if (cell.kind === "column") expect(cell.column).toBe(state.columns.find(column => column.id === cell.columnId));
      else expect(cell.group).toBe(state.columnGroups.find(group => group.id === cell.groupId));
    }
    expect(state.rows[0]).toBe(rows[0]);
    // 그룹 조회는 방문 중복을 막는 두 Set만 필요하다.
    expect(allocations).toBeLessThanOrEqual(grouped ? 2 : 1);
  });
});
