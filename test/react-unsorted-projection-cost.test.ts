import { afterEach, describe, expect, it, vi } from "vitest";
import { createCominsTableState, getCominsSortedRowIndexes } from "../src/react/core-compat";
import * as model from "../src/react/model";

const rows = [{ id: "a", score: 3 }, { id: "b", score: 1 }, { id: "c", score: 2 }];
const input = { rows, columns: [{ field: "score", label: "Score", sort: true }], getRowId: (row: { id: string }) => row.id };
afterEach(() => vi.restoreAllMocks());

describe("React unsorted row-index allocation cost", () => {
  it.each([undefined, Object.freeze([2, 0]), Object.freeze([])] as const)("copies unsorted indexes without projecting columns: %j", indexes => {
    const state = createCominsTableState(input);
    const project = vi.spyOn(model, "projectReactState");
    const result = getCominsSortedRowIndexes(state, indexes);
    expect(result).toEqual(indexes ?? [0, 1, 2]);
    expect(result).not.toBe(indexes);
    result.push(99);
    expect(getCominsSortedRowIndexes(state, indexes)).toEqual(indexes ?? [0, 1, 2]);
    expect(state.rows).toBe(rows);
    expect(project).not.toHaveBeenCalled();
  });

  it("avoids column projection for an empty unsorted model", () => {
    const state = createCominsTableState({ ...input, rows: [] });
    const project = vi.spyOn(model, "projectReactState");
    expect(getCominsSortedRowIndexes(state)).toEqual([]);
    expect(project).not.toHaveBeenCalled();
  });

  it.each(["asc", "desc"] as const)("keeps the Core sorting path for %s", direction => {
    const state = createCominsTableState({ ...input, sortModel: [{ columnId: "score", direction }] });
    const project = vi.spyOn(model, "projectReactState");
    const indexes = Object.freeze([2, 0, 1]);
    expect(getCominsSortedRowIndexes(state, indexes)).toEqual(direction === "asc" ? [1, 2, 0] : [0, 2, 1]);
    expect(indexes).toEqual([2, 0, 1]);
    expect(project).toHaveBeenCalledOnce();
  });

  it("preserves the original React column as a custom comparator receiver", () => {
    const sort = vi.fn(function (left: unknown, right: unknown) { return Number(left) - Number(right); });
    const state = createCominsTableState({ ...input, columns: [{ field: "score", label: "Score", sort }], sortModel: [{ columnId: "score", direction: "asc" }] });
    expect(getCominsSortedRowIndexes(state)).toEqual([1, 2, 0]);
    expect(sort).toHaveBeenCalled();
    expect(sort.mock.contexts.every(context => context === state.columns[0])).toBe(true);
  });
});
