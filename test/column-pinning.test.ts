import { describe, expect, it } from "vitest";

import {
  getCominsPinnedBlockResizeMaxWidth,
  getCominsColumnPinningSpanFragments,
  normalizeCominsColumnPinned,
  resolveCominsColumnPinning,
} from "../src/column-pinning";

describe("column pinning", () => {
  const blocks = [
    { columnIds: ["left-a"], columnWidths: [80], id: "left-a", pinned: "left" as const },
    { columnIds: ["center"], columnWidths: [100], id: "center" },
    { columnIds: ["right-a"], columnWidths: [70], id: "right-a", pinned: "right" as const },
    { columnIds: ["right-b"], columnWidths: [60], id: "right-b", pinned: "right" as const },
  ];

  it("normalizes only supported public pin values", () => {
    expect(normalizeCominsColumnPinned("left")).toBe("left");
    expect(normalizeCominsColumnPinned("right")).toBe("right");
    expect(normalizeCominsColumnPinned("center")).toBeUndefined();
    expect(normalizeCominsColumnPinned(true)).toBeUndefined();
  });

  it("orders configured zones and computes sticky offsets and boundaries", () => {
    const resolved = resolveCominsColumnPinning(blocks, 400);

    expect(resolved.orderedColumnIds).toEqual(["left-a", "center", "right-a", "right-b"]);
    expect(resolved.columns.get("left-a")).toEqual({ boundary: true, offset: 0, pinned: "left" });
    expect(resolved.columns.get("right-b")).toEqual({ offset: 0, pinned: "right" });
    expect(resolved.columns.get("right-a")).toEqual({ boundary: true, offset: 60, pinned: "right" });
  });

  it("demotes the wider side's inner block and uses right on ties", () => {
    const narrow = resolveCominsColumnPinning(blocks, 200);

    expect(narrow.columns.get("left-a")?.pinned).toBe("left");
    expect(narrow.columns.get("right-a")?.pinned).toBeUndefined();
    expect(narrow.columns.get("right-b")?.pinned).toBe("right");

    const tied = resolveCominsColumnPinning([
      { columnIds: ["left"], columnWidths: [80], id: "left", pinned: "left" },
      { columnIds: ["right"], columnWidths: [80], id: "right", pinned: "right" },
    ], 150);

    expect(tied.columns.get("right")?.pinned).toBeUndefined();
    expect(tied.columns.get("left")?.pinned).toBe("left");
  });

  it("demotes every block below 48px without changing derived order", () => {
    const resolved = resolveCominsColumnPinning(blocks, 47);

    expect(resolved.orderedColumnIds).toEqual(["left-a", "center", "right-a", "right-b"]);
    expect([...resolved.columns.values()].every((column) => column.pinned === undefined)).toBe(true);
  });

  it("limits an effective pinned block resize without changing responsive demotion", () => {
    const resolved = resolveCominsColumnPinning(blocks, 400);

    expect(getCominsPinnedBlockResizeMaxWidth(blocks, resolved, "left-a", 400)).toBe(222);
    expect(getCominsPinnedBlockResizeMaxWidth(blocks, resolved, "right-a", 400)).toBe(212);
    expect(getCominsPinnedBlockResizeMaxWidth(blocks, resolved, "center", 400)).toBeUndefined();

    const narrow = resolveCominsColumnPinning(blocks, 200);

    expect(getCominsPinnedBlockResizeMaxWidth(blocks, narrow, "right-a", 200)).toBeUndefined();
    expect(getCominsPinnedBlockResizeMaxWidth(blocks, narrow, "right-b", 200)).toBe(72);
  });

  it("splits a spanning Summary cell at effective zone boundaries", () => {
    const resolved = resolveCominsColumnPinning(blocks, 400);

    expect(getCominsColumnPinningSpanFragments(resolved, 0, 4)).toEqual([
      { boundary: true, colSpan: 1, offset: 0, pinned: "left", startIndex: 0 },
      { boundary: undefined, colSpan: 1, offset: undefined, pinned: undefined, startIndex: 1 },
      { boundary: true, colSpan: 2, offset: 0, pinned: "right", startIndex: 2 },
    ]);
  });
});
