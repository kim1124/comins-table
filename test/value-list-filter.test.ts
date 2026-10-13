import { describe, expect, it } from "vitest";
import { getCominsColumnFilterOptions, setCominsColumnFilterValues } from "../src/filtering";
import type { CominsColumnFilterModel } from "../src/filtering";

const data = [
  { id: "1", status: "Ready", region: "KR" }, { id: "2", status: "READY", region: "KR" },
  { id: "3", status: "Ready", region: "US" }, { id: "4", status: "Blocked", region: "US" },
  { id: "5", status: "Blocked", region: "US" },
];
const columns = ["status", "region"].map(id => ({ id, field: id, label: id, filter: { kind: "text" as const } }));
const rows = data.map((data, dataIndex) => ({ data, dataIndex, id: data.id }));
const input = { columns, columnId: "status", rows, model: [] as CominsColumnFilterModel };
describe("value list options and transitions", () => {
  it("ignores malformed model entries without treating invalid source values as empty", () => {
    const values = [undefined, "", null, 0, 1, Number.NaN, "1", false].map((value, dataIndex) => ({ data: { value }, dataIndex, id: String(dataIndex) }));
    const numeric = [{ id: "value", field: "value", label: "Value", filter: { kind: "number" as const } }];
    const result = getCominsColumnFilterOptions({ columns: numeric, columnId: "value", rows: values, model: [null, { columnId: "unknown" }] as unknown as CominsColumnFilterModel })!;
    expect(result.options.map(o => [o.value, o.count])).toEqual([[null, 3], [0, 1], [1, 1]]);
  });
  it("keeps case-sensitive values and same-label options distinct", () => {
    const sameLabel = columns.map(column => ({ ...column, filter: { ...column.filter, caseSensitive: true, getOptionLabel: () => "Same" } }));
    const result = getCominsColumnFilterOptions({ ...input, columns: sameLabel })!;
    expect(result.options.map(o => o.value)).toEqual(["Ready", "READY", "Blocked"]);
    expect(new Set(result.options.map(o => o.id)).size).toBe(3);
    expect(result.options.every(o => o.label === "Same")).toBe(true);
  });
  it("represents native mixed state and protects explicit snapshots from new values", () => {
    const model: CominsColumnFilterModel = [{ columnId: "status", operator: "in", values: ["Ready"] }];
    const result = getCominsColumnFilterOptions({ ...input, model })!;
    expect(result.visibleSelection).toBe("mixed");
    const next = setCominsColumnFilterValues({ ...input, model, action: { type: "setOption", id: result.options[1]!.id, checked: true } });
    expect(next).toEqual([{ columnId: "status", operator: "in", values: ["Ready", "Blocked"] }]);
    const updated = getCominsColumnFilterOptions({ ...input, model: next, rows: [...rows, { data: { id: "6", status: "New", region: "US" }, id: "6", dataIndex: 5 }] })!;
    expect(updated.options.find(o => o.value === "New")!.selected).toBe(false);
    expect(setCominsColumnFilterValues({ ...input, model, action: { type: "setOption", id: result.options[0]!.id, checked: true } })).toBe(model);
  });
  it("keeps the whole domain and counts other column matches", () => {
    const model: CominsColumnFilterModel = [{ columnId: "region", operator: "equals", value: "KR" }, { columnId: "status", operator: "in", values: ["Ready"] }];
    const result = getCominsColumnFilterOptions({ ...input, model, query: " block " })!;
    expect(result.options.map(o => [o.label, o.count, o.selected])).toEqual([["Ready", 2, true], ["Blocked", 0, false]]);
    expect(result.visibleOptions.map(o => o.value)).toEqual(["Blocked"]);
    expect(result.visibleSelection).toBe(false);
  });
  it("retains selected identity across removal and reinsertion", () => {
    const model: CominsColumnFilterModel = [{ columnId: "status", operator: "in", values: ["Gone", "Ready"] }];
    const before = getCominsColumnFilterOptions({ ...input, model })!;
    const after = getCominsColumnFilterOptions({ ...input, model, rows: [{ data: { id: "6", status: "Gone", region: "KR" }, id: "6", dataIndex: 0 }] })!;
    const gone = before.options.find(o => o.value === "Gone")!;
    expect(gone).toMatchObject({ selected: true, present: false, count: 0 });
    expect(after.options.find(o => o.value === "Gone")).toMatchObject({ id: gone.id, selected: true, present: true, count: 1 });
  });
  it("updates only searched options while retaining absent and hidden selections", () => {
    const model: CominsColumnFilterModel = Object.freeze([{ columnId: "status", operator: "in", values: Object.freeze(["Ready", "Gone"]) }]);
    const next = setCominsColumnFilterValues({ ...input, model, query: "block", action: { type: "setVisible", checked: true } });
    expect(next).toEqual([{ columnId: "status", operator: "in", values: ["Ready", "Gone", "Blocked"] }]);
    expect(model[0]).toMatchObject({ values: ["Ready", "Gone"] });
    expect(JSON.parse(JSON.stringify(next))).toEqual(next);
  });
  it("distinguishes unrestricted from explicit all and empty sets", () => {
    const result = getCominsColumnFilterOptions(input)!;
    const next = setCominsColumnFilterValues({ ...input, action: { type: "setOption", id: result.options[0]!.id, checked: false } });
    expect(next).toEqual([{ columnId: "status", operator: "in", values: ["Blocked"] }]);
    expect(setCominsColumnFilterValues({ ...input, model: next, action: { type: "setVisible", checked: true } })).toEqual([]);
    expect(setCominsColumnFilterValues({ ...input, action: { type: "setVisible", checked: false } })).toEqual([{ columnId: "status", operator: "in", values: [] }]);
    expect(setCominsColumnFilterValues({ ...input, query: "none", action: { type: "setVisible", checked: false } })).toBe(input.model);
    expect(setCominsColumnFilterValues({ ...input, action: { type: "setOption", id: "missing", checked: false } })).toBe(input.model);
  });
  it("preserves conditions and clears only the target", () => {
    const model: CominsColumnFilterModel = [{ columnId: "region", operator: "equals", value: "KR" }, { columnId: "status", operator: "contains", value: "Ready" }];
    expect(getCominsColumnFilterOptions({ ...input, model })).toBeNull();
    expect(setCominsColumnFilterValues({ ...input, model, action: { type: "setVisible", checked: true } })).toBe(model);
    const cleared = setCominsColumnFilterValues({ ...input, model, action: { type: "clear" } });
    expect(cleared).toEqual([model[0]]);
    expect(cleared[0]).toBe(model[0]);
  });
});
