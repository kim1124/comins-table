import { describe, expect, it } from "vitest";

import { resolveCominsAnchorTarget } from "../src/virtual-layout";

describe("virtual anchor lookup complexity and fallback order", () => {
  it("bounds next-key element reads linearly when every previous key is replaced", () => {
    const previousKeys = Array.from({ length: 256 }, (_, index) => `previous:${index}`);
    const nextValues = Array.from({ length: 512 }, (_, index) => `replacement:${index}`);
    let elementReads = 0;
    const nextKeys: readonly string[] = new Proxy(nextValues, {
      get(target, property, receiver) {
        if (typeof property === "string" && /^(0|[1-9]\d*)$/.test(property)) {
          elementReads += 1;
        }
        return Reflect.get(target, property, receiver);
      },
    });

    const target = resolveCominsAnchorTarget({
      anchor: { key: "previous:128", previousIndex: 128, offsetWithinSlot: 12 },
      getNextHeight: () => { throw new Error("No surviving key should request a height"); },
      nextKeys,
      previousKeys,
    });

    expect(target).toBeUndefined();
    // Count observable sequence reads, not elapsed time or a particular lookup implementation.
    expect(elementReads).toBeLessThanOrEqual(3 * (previousKeys.length + nextValues.length) + 32);
  });

  it("prefers the nearest surviving predecessor even when a successor appears first in next keys", () => {
    expect(resolveCominsAnchorTarget({
      anchor: { key: "removed", previousIndex: 3, offsetWithinSlot: 12 },
      getNextHeight: () => 36,
      previousKeys: ["far-before", "lost-before", "near-before", "removed", "first-after", "last-after"],
      nextKeys: ["first-after", "far-before", "last-after", "near-before"],
    })).toEqual({ index: 3, offsetWithinSlot: 12 });
  });

  it("uses the first surviving successor in previous order when no predecessor survives", () => {
    expect(resolveCominsAnchorTarget({
      anchor: { key: "removed", previousIndex: 2, offsetWithinSlot: 12 },
      getNextHeight: () => 36,
      previousKeys: ["gone-a", "gone-b", "removed", "gone-c", "first-after", "last-after"],
      nextKeys: ["last-after", "first-after"],
    })).toEqual({ index: 1, offsetWithinSlot: 12 });
  });

  it("treats an empty-string anchor at next index zero as a valid first match", () => {
    expect(resolveCominsAnchorTarget({
      anchor: { key: "", previousIndex: 0, offsetWithinSlot: 12 },
      getNextHeight: (index) => index === 0 ? 9 : 36,
      previousKeys: [""],
      nextKeys: ["", "other", ""],
    })).toEqual({ index: 0, offsetWithinSlot: 9 });
  });

  it("skips sparse next-key holes while preserving missing previous-key fallback to an empty string", () => {
    const previousKeys = new Array<string>(2);
    previousKeys[1] = "removed";
    const nextKeys = new Array<string>(3);
    nextKeys[1] = "";
    nextKeys[2] = "";

    expect(resolveCominsAnchorTarget({
      anchor: { key: "removed", previousIndex: 1, offsetWithinSlot: 12 },
      getNextHeight: (index) => index === 1 ? 7 : 36,
      previousKeys,
      nextKeys,
    })).toEqual({ index: 1, offsetWithinSlot: 7 });
  });

  it.each([
    { name: "existing anchor", previousKeys: ["before", "kept", "after"], anchorKey: "kept" },
    { name: "predecessor fallback", previousKeys: ["kept", "removed", "after"], anchorKey: "removed" },
    { name: "successor fallback", previousKeys: ["gone", "removed", "kept"], anchorKey: "removed" },
  ])("preserves first-index semantics for duplicate next keys via $name", ({ previousKeys, anchorKey }) => {
    expect(resolveCominsAnchorTarget({
      anchor: { key: anchorKey, previousIndex: 1, offsetWithinSlot: 12 },
      getNextHeight: (index) => index === 0 ? 7 : 36,
      previousKeys,
      nextKeys: ["kept", "unrelated", "kept"],
    })).toEqual({ index: 0, offsetWithinSlot: 7 });
  });
});
