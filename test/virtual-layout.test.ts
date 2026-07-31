import { describe, expect, it } from "vitest";

import {
  COMINS_DEFAULT_DETAIL_HEIGHT,
  COMINS_MAX_PHYSICAL_TOTAL_HEIGHT,
  CominsHeightIndex,
  captureCominsScrollAnchor,
  createCominsDataVirtualSlot,
  getCominsMixedVirtualRange,
  getCominsPhysicalScrollTop,
  getCominsSlotHeight,
  normalizeCominsDetailEstimate,
  normalizeCominsDetailHeight,
  reconcileCominsDetailMeasurements,
  resolveCominsAnchorLogicalScrollTop,
  resolveCominsMeasuredDetailHeight,
} from "../src/virtual-layout";

describe("virtual layout", () => {
  it("normalizes fixed, automatic, and invalid detail heights", () => {
    expect(normalizeCominsDetailHeight(240)).toEqual({ height: 240, mode: "fixed" });
    expect(normalizeCominsDetailHeight("auto")).toEqual({
      height: COMINS_DEFAULT_DETAIL_HEIGHT,
      mode: "auto",
    });
    expect(normalizeCominsDetailHeight(0)).toEqual({
      height: COMINS_DEFAULT_DETAIL_HEIGHT,
      mode: "fixed",
    });
    expect(normalizeCominsDetailHeight(Number.POSITIVE_INFINITY)).toEqual({
      height: COMINS_DEFAULT_DETAIL_HEIGHT,
      mode: "fixed",
    });
    expect(normalizeCominsDetailEstimate(-1)).toBe(COMINS_DEFAULT_DETAIL_HEIGHT);
  });

  it("supports prefix, total, lower-bound, and logarithmic updates", () => {
    const index = CominsHeightIndex.from([36, 336, 72, 36]);

    expect(index.getTotalHeight()).toBe(480);
    expect(index.getPrefixHeight(0)).toBe(0);
    expect(index.getPrefixHeight(2)).toBe(372);
    expect(index.findIndexAtOffset(0)).toBe(0);
    expect(index.findIndexAtOffset(35)).toBe(0);
    expect(index.findIndexAtOffset(36)).toBe(1);
    expect(index.findIndexAtOffset(479)).toBe(3);
    expect(index.updateHeight(1, 436)).toBe(100);
    expect(index.getTotalHeight()).toBe(580);
    expect(index.getPrefixHeight(2)).toBe(472);
  });

  it("maps a mixed logical range into the bounded physical scrollbar", () => {
    const index = CominsHeightIndex.from([36, 2_000_000, 36]);
    const range = getCominsMixedVirtualRange({
      heightIndex: index,
      overscan: 1,
      physicalScrollTop: 750_000,
      viewportHeight: 600,
    });

    expect(range.physicalScrollHeight).toBe(COMINS_MAX_PHYSICAL_TOTAL_HEIGHT);
    expect(range.scrollScale).toBeGreaterThan(1);
    expect(range.startIndex).toBe(0);
    expect(range.endIndex).toBe(3);
    expect(Number.isFinite(range.renderOffset)).toBe(true);
  });

  it("uses a width-matched automatic measurement and evicts removed row ids", () => {
    const cache = new Map([
      ["a", { height: 420, width: 800 }],
      ["stale", { height: 100, width: 800 }],
    ]);

    expect(resolveCominsMeasuredDetailHeight(cache, "a", 800, 300)).toEqual({
      estimated: false,
      height: 420,
    });
    expect(resolveCominsMeasuredDetailHeight(cache, "a", 640, 300)).toEqual({
      estimated: true,
      height: 300,
    });
    reconcileCominsDetailMeasurements(cache, new Set(["a"]));
    expect([...cache.keys()]).toEqual(["a"]);
  });

  it("falls back to the nearest surviving slot when an anchor disappears", () => {
    const previousKeys = ["data:a", "data:b", "data:c"];
    const nextKeys = ["data:a", "data:c"];
    const anchor = { key: "data:b", offsetWithinSlot: 12, previousIndex: 1 };
    const nextIndex = CominsHeightIndex.from([36, 72]);

    expect(
      resolveCominsAnchorLogicalScrollTop({
        anchor,
        nextHeightIndex: nextIndex,
        nextKeys,
        previousKeys,
      }),
    ).toBe(12);
  });

  it("captures the first visible slot and preserves a clamped offset for its key", () => {
    const index = CominsHeightIndex.from([36, 72]);

    expect(
      captureCominsScrollAnchor({
        heightIndex: index,
        keys: ["data:a", "data:b"],
        logicalScrollTop: 50,
      }),
    ).toEqual({ key: "data:b", offsetWithinSlot: 14, previousIndex: 1 });
    expect(
      resolveCominsAnchorLogicalScrollTop({
        anchor: { key: "data:b", offsetWithinSlot: 100, previousIndex: 1 },
        nextHeightIndex: index,
        nextKeys: ["data:a", "data:b"],
        previousKeys: ["data:a", "data:b"],
      }),
    ).toBe(108);
  });

  it("chooses the nearest next slot before returning zero and reverses scroll scaling", () => {
    const nextIndex = CominsHeightIndex.from([36, 72]);

    expect(
      resolveCominsAnchorLogicalScrollTop({
        anchor: { key: "data:b", offsetWithinSlot: 12, previousIndex: 1 },
        nextHeightIndex: nextIndex,
        nextKeys: ["group:x", "data:c"],
        previousKeys: ["data:a", "data:b", "data:c"],
      }),
    ).toBe(48);
    expect(
      resolveCominsAnchorLogicalScrollTop({
        anchor: { key: "data:b", offsetWithinSlot: 12, previousIndex: 1 },
        nextHeightIndex: nextIndex,
        nextKeys: ["group:x", "group:y"],
        previousKeys: ["data:a", "data:b", "data:c"],
      }),
    ).toBe(0);
    expect(getCominsPhysicalScrollTop(750_000, 1_500_600, 600)).toBe(749_700);
  });

  it("adds detail heights to data slots while group slots use their own height", () => {
    expect(
      getCominsSlotHeight(
        {
          dataIndex: 0,
          detail: { estimated: true, height: 300, mode: "auto" },
          key: "data:a",
          kind: "data",
          row: { id: "a" },
          rowId: "a",
          visibleIndex: 0,
        },
        36,
      ),
    ).toBe(336);
    expect(
      getCominsSlotHeight(
        { groupId: "region:seoul", height: 42, key: "group:seoul", kind: "group" },
        36,
      ),
    ).toBe(42);
  });

  it("keeps collapsed data slots at rowHeight and adds fixed detail height", () => {
    const collapsed = createCominsDataVirtualSlot({
      dataIndex: 0,
      detail: null,
      row: { id: "a" },
      rowHeight: 36,
      rowId: "a",
      visibleIndex: 0,
    });
    const expanded = createCominsDataVirtualSlot({
      dataIndex: 1,
      detail: { estimated: false, height: 300, mode: "fixed" },
      row: { id: "b" },
      rowHeight: 36,
      rowId: "b",
      visibleIndex: 1,
    });

    expect(getCominsSlotHeight(collapsed, 36)).toBe(36);
    expect(getCominsSlotHeight(expanded, 36)).toBe(336);
    expect(collapsed.key).not.toBe(expanded.key);
  });
});
