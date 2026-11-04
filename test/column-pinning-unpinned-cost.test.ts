import { describe, expect, it } from "vitest";
import { resolveCominsColumnPinning, type CominsColumnPinningBlock } from "../src/column-pinning";

describe("unpinned column layout cost", () => {
  it("reads unpinned configuration once per block while preserving grouped order", () => {
    let reads = 0;
    const blocks: CominsColumnPinningBlock[] = [
      { id: "person", columnIds: ["name", "age"], columnWidths: [120, 80], get pinned() { reads++; return undefined; } },
      { id: "role", columnIds: ["role"], columnWidths: [100], get pinned() { reads++; return undefined; } },
    ];
    const result = resolveCominsColumnPinning(blocks, 400);
    expect(result.orderedColumnIds).toEqual(["name", "age", "role"]);
    expect([...result.columns]).toEqual([["name", {}], ["age", {}], ["role", {}]]);
    expect(reads).toBeLessThanOrEqual(blocks.length);
  });

  it("keeps duplicate order and independently owned results across calls", () => {
    const blocks: CominsColumnPinningBlock[] = [
      { id: "first", columnIds: ["a", "b"], columnWidths: [10, 20] },
      { id: "second", columnIds: ["a"], columnWidths: [30] },
    ];
    const first = resolveCominsColumnPinning(blocks, Number.NaN);
    const second = resolveCominsColumnPinning(blocks, Infinity);
    expect(first.orderedColumnIds).toEqual(["a", "b", "a"]);
    expect([...first.columns.keys()]).toEqual(["a", "b"]);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.columns).not.toBe(second.columns);
    expect(first.orderedColumnIds).not.toBe(second.orderedColumnIds);
    expect(first.columns.get("a")).not.toBe(second.columns.get("a"));
    expect(first.columns.get("a")).not.toBe(first.columns.get("b"));
    expect(blocks.map(block => [...block.columnIds])).toEqual([["a", "b"], ["a"]]);
  });

  it.each([Number.NaN, Infinity, -1])("preserves configured demotion at %s width", width => {
    const result = resolveCominsColumnPinning([
      { id: "left", columnIds: ["left"], columnWidths: [80], pinned: "left" },
      { id: "center", columnIds: ["center"], columnWidths: [100] },
      { id: "right", columnIds: ["right"], columnWidths: [80], pinned: "right" },
    ], width);
    expect(result.orderedColumnIds).toEqual(["left", "center", "right"]);
    expect([...result.columns.values()]).toEqual([{}, {}, {}]);
  });

  it("preserves the existing fallback for an unsupported runtime pin value", () => {
    const result = resolveCominsColumnPinning([
      { id: "unsupported", columnIds: ["unsupported"], columnWidths: [10], pinned: "center" as never },
      { id: "plain", columnIds: ["plain"], columnWidths: [20] },
    ], 400);
    expect(result.orderedColumnIds).toEqual(["plain"]);
    expect([...result.columns.keys()]).toEqual(["plain"]);
  });

  it("returns an independently empty layout for no blocks", () => {
    const first = resolveCominsColumnPinning([], 0);
    const second = resolveCominsColumnPinning([], 100);
    expect(first.orderedColumnIds).toEqual([]);
    expect(first.columns.size).toBe(0);
    expect(first.columns).not.toBe(second.columns);
  });
});
