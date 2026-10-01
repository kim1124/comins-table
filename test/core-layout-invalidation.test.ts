import { expect, it } from "vitest";
const modules = import.meta.glob("../src/core/layout/{virtual,viewport,row-height}.ts", { eager: true });
function core() {
  for (const name of ["virtual", "viewport", "row-height"]) expect(modules[`../src/core/layout/${name}.ts`], `neutral ${name} layout`).toBeDefined();
  return { ...modules["../src/core/layout/virtual.ts"], ...modules["../src/core/layout/viewport.ts"], ...modules["../src/core/layout/row-height.ts"] } as typeof import("../src/core/layout/virtual") & typeof import("../src/core/layout/viewport") & typeof import("../src/core/layout/row-height");
}
it("keeps numeric and string row measurements in independent slots", () => {
  const { getCominsDataSlotKey, CominsHeightIndex } = core();
  const keys = [getCominsDataSlotKey(1), getCominsDataSlotKey("1")];
  expect(keys).toEqual(["data:number:1", "data:string:1"]);
  const index = CominsHeightIndex.from([36, 72]);
  index.updateHeight(keys.indexOf("data:number:1"), 100);
  expect(index.getHeight(1)).toBe(72);
  expect(index.getTotalHeight()).toBe(172);
});
it("reuses measurements only for the identical row, layout and content revision", () => {
  const row = { id: 1 }, contentRevision = {};
  const input = { value: "auto" as const, rowHeight: 36, estimate: 42, row, layoutKey: "a", contentRevision, measurement: { row, layoutKey: "a", contentRevision, height: 81 } };
  expect(core().resolveCominsRowHeight(input)).toEqual({ auto: true, height: 81 });
  for (const change of [{ row: { id: 1 } }, { layoutKey: "b" }, { contentRevision: {} }]) expect(core().resolveCominsRowHeight({ ...input, ...change })).toEqual({ auto: true, height: 42 });
});
it("falls back to a surviving previous then next anchor and clamps its offset", () => {
  const input = { anchor: { key: "b", previousIndex: 1, offsetWithinSlot: 50 }, previousKeys: ["a", "b", "c"], nextHeightIndex: core().CominsHeightIndex.from([20, 60]) };
  expect(core().resolveCominsAnchorLogicalScrollTop({ ...input, nextKeys: ["a", "c"] })).toBe(20);
  expect(core().resolveCominsAnchorLogicalScrollTop({ ...input, nextKeys: ["x", "c"] })).toBe(70);
  expect(core().resolveCominsAnchorLogicalScrollTop({ ...input, nextKeys: [] })).toBe(0);
});
it("clones sparse blocks independently, retains required blocks and bounds physical height", () => {
  const index = new (core().CominsViewportHeightIndex)(1_000_000, 36, 10, 2);
  index.updateHeight(0, 50); index.updateHeight(10, 60); index.updateHeight(20, 70);
  const next = index.clone(); next.updateHeight(0, 100); next.retain({ startIndex: 10, endIndex: 30 });
  expect(next.measuredBlockCount).toBe(2); expect(next.measuredRowCount).toBe(2);
  expect(next.getHeight(0)).toBe(36); expect(index.getHeight(0)).toBe(50);
  expect(index.measuredBlockCount).toBe(3);
  expect(next.getPrefixHeight(21)).toBe(814);
  expect(next.updateHeight(-1, 200)).toBe(0); expect(next.updateHeight(1_000_000, 200)).toBe(0);
  index.retain({ startIndex: 0, endIndex: 30 }); expect(index.measuredBlockCount).toBe(3);
  expect(core().getCominsScrollScale(index.getTotalHeight(), 600).physicalScrollHeight).toBe(1_500_000);
  expect(core().getCominsPhysicalScrollTop(Infinity, index.getTotalHeight(), 600)).toBe(1_499_400);
});
