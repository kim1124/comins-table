import { describe, expect, it } from "vitest";

import {
  COMINS_DRAG_AUTO_SCROLL_MAX_SPEED,
  getCominsDragAutoScrollTop,
  getCominsDragAutoScrollVelocity,
} from "../src/drag-autoscroll";

describe("cross-table drag auto-scroll", () => {
  it("uses a proportional velocity in the top and bottom 40px bands", () => {
    expect(getCominsDragAutoScrollVelocity({ bottom: 200, clientY: 100, top: 100 }))
      .toBe(-COMINS_DRAG_AUTO_SCROLL_MAX_SPEED);
    expect(getCominsDragAutoScrollVelocity({ bottom: 200, clientY: 120, top: 100 }))
      .toBe(-COMINS_DRAG_AUTO_SCROLL_MAX_SPEED / 2);
    expect(getCominsDragAutoScrollVelocity({ bottom: 200, clientY: 180, top: 100 }))
      .toBe(COMINS_DRAG_AUTO_SCROLL_MAX_SPEED / 2);
    expect(getCominsDragAutoScrollVelocity({ bottom: 200, clientY: 200, top: 100 }))
      .toBe(COMINS_DRAG_AUTO_SCROLL_MAX_SPEED);
    expect(getCominsDragAutoScrollVelocity({ bottom: 200, clientY: 150, top: 100 }))
      .toBe(0);
  });

  it("shrinks the activation band for a viewport shorter than 80px", () => {
    expect(getCominsDragAutoScrollVelocity({ bottom: 140, clientY: 110, top: 100 }))
      .toBe(-COMINS_DRAG_AUTO_SCROLL_MAX_SPEED / 2);
    expect(getCominsDragAutoScrollVelocity({ bottom: 140, clientY: 120, top: 100 }))
      .toBe(0);
  });

  it("clamps frame delta and physical scroll boundaries", () => {
    expect(getCominsDragAutoScrollTop({
      clientHeight: 100,
      deltaMs: 1000,
      scrollHeight: 1000,
      scrollTop: 100,
      velocity: COMINS_DRAG_AUTO_SCROLL_MAX_SPEED,
    })).toBeCloseTo(123.04);
    expect(getCominsDragAutoScrollTop({
      clientHeight: 100,
      deltaMs: 32,
      scrollHeight: 1000,
      scrollTop: 899,
      velocity: COMINS_DRAG_AUTO_SCROLL_MAX_SPEED,
    })).toBe(900);
    expect(getCominsDragAutoScrollTop({
      clientHeight: 100,
      deltaMs: 32,
      scrollHeight: 1000,
      scrollTop: 1,
      velocity: -COMINS_DRAG_AUTO_SCROLL_MAX_SPEED,
    })).toBe(0);
  });
});
