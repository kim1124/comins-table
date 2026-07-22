import { describe, expect, it } from "vitest";

import { getCominsColumnMouseIntent } from "../src/column-pointer";

describe("column pointer intent", () => {
  const decide = (clientX: number, clientY: number) =>
    getCominsColumnMouseIntent({ clientX, clientY, startX: 10, startY: 10 });

  it("waits below the six pixel threshold", () => {
    expect(decide(15, 10)).toBe("pending");
    expect(decide(14, 14)).toBe("pending");
  });

  it("activates only when horizontal intent wins", () => {
    expect(decide(16, 10)).toBe("activate");
    expect(decide(3, 12)).toBe("activate");
  });

  it("cancels when vertical intent reaches the threshold first", () => {
    expect(decide(12, 16)).toBe("cancel");
    expect(decide(16, 16)).toBe("cancel");
  });
});
