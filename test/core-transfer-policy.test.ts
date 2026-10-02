import { describe, expect, it } from "vitest";
import type { CominsTableTransferEndpoint } from "../src/table-transfer";
const modules = import.meta.glob("../src/core/transfer/policy.ts", { eager: true });
function core() {
  expect(modules["../src/core/transfer/policy.ts"], "neutral transfer policy").toBeDefined();
  return modules["../src/core/transfer/policy.ts"] as typeof import("../src/table-transfer");
}
type Row = { id: string | number; groupId: string; label: string };
type Group = { id: string };
function endpoint(tableId: string, data: readonly Row[], groups: readonly Group[]): CominsTableTransferEndpoint<Row, Group> {
  return { tableId, data, groups, getRowId: row => row.id, getGroupId: group => group.id, getRowGroupId: row => row.groupId };
}
describe("neutral transfer policy", () => {
  it("rejects the entire group on a member conflict without changing either dataset", () => {
    const source = endpoint("source", Object.freeze([{ id: "a", groupId: "g", label: "A" }, { id: "b", groupId: "g", label: "B" }]), Object.freeze([{ id: "g" }]));
    const target = endpoint("target", Object.freeze([{ id: "b", groupId: "h", label: "Old B" }]), Object.freeze([{ id: "h" }]));
    const seen: Array<string | number> = [];
    const result = core().transferCominsGroupBetweenTables({ source, target, sourceGroupId: "g", resolveConflict: conflict => { if (conflict.kind === "row") seen.push(conflict.rowId); return "reject"; } });
    expect(result).toBeNull();
    expect(seen).toEqual(["b"]);
    expect(source.data.map(row => row.id)).toEqual(["a", "b"]);
    expect(target.data).toEqual([{ id: "b", groupId: "h", label: "Old B" }]);
    expect(source.groups).toEqual([{ id: "g" }]);
    expect(target.groups).toEqual([{ id: "h" }]);
  });
  it("overwrites a conflicting member while keeping numeric and string IDs distinct", () => {
    const source = endpoint("source", [{ id: 1, groupId: "g", label: "New" }], [{ id: "g" }]);
    const target = endpoint("target", [{ id: "1", groupId: "h", label: "String" }, { id: 1, groupId: "h", label: "Old" }], [{ id: "h" }]);
    const result = core().transferCominsGroupBetweenTables({ source, target, sourceGroupId: "g", targetGroupId: "h", resolveConflict: () => "overwrite" });
    expect(result?.source).toEqual({ tableId: "source", data: [], groups: [] });
    expect(result?.target.data).toEqual([{ id: "1", groupId: "h", label: "String" }, { id: 1, groupId: "g", label: "New" }]);
    expect(result?.target.groups).toEqual([{ id: "g" }, { id: "h" }]);
    expect(result?.details.conflicts.map(item => item.conflict.kind)).toEqual(["row"]);
    expect(target.data[1]?.label).toBe("Old");
  });
  it("moves only the exact typed row ID and preserves endpoint callback receivers", () => {
    const source = { tableId: "source", data: [{ id: 1 }, { id: "1" }], getRowId(this: { tableId: string }, row: { id: string | number }) { expect(this.tableId).toBe("source"); return row.id; } };
    const target = { tableId: "target", data: [{ id: "end" }], getRowId(this: { tableId: string }, row: { id: string | number }) { expect(this.tableId).toBe("target"); return row.id; } };
    const result = core().transferCominsRowBetweenTables({ source, target, sourceRowId: 1, targetRowId: "end" });
    expect(result?.source.data).toEqual([{ id: "1" }]);
    expect(result?.target.data).toEqual([{ id: 1 }, { id: "end" }]);
  });
});
