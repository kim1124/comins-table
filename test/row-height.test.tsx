// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { CominsTable } from "../src";
import { resolveCominsRowHeight } from "../src/row-height";
import { createCominsDataVirtualSlot, getCominsSlotHeight } from "../src/virtual-layout";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("business Row height", () => {
  it("normalizes defaults and uses measurements only for the same data and layout", () => {
    const row = { id: "a" };
    const contentRevision = {};
    const input = { row, rowHeight: 40, layoutKey: "wide", contentRevision, estimate: 60 };
    for (const value of [undefined, 0, -1, NaN, Infinity]) {
      expect(resolveCominsRowHeight({ ...input, value })).toEqual({ auto: false, height: 40 });
    }
    expect(resolveCominsRowHeight({ ...input, value: 90 }).height).toBe(90);
    const measured = { ...input, value: "auto" as const, measurement: { row, layoutKey: "wide", contentRevision, height: 120 } };
    expect(resolveCominsRowHeight(measured).height).toBe(120);
    expect(resolveCominsRowHeight({ ...measured, row: { id: "a" } }).height).toBe(60);
    expect(resolveCominsRowHeight({ ...measured, layoutKey: "narrow" }).height).toBe(60);
    expect(resolveCominsRowHeight({ ...measured, contentRevision: {} }).height).toBe(60);
    const slot = createCominsDataVirtualSlot({ row, rowId: "a", dataIndex: 0, visibleIndex: 0, rowHeight: 120, autoHeight: true, detail: { height: 80, estimated: false, mode: "fixed" } });
    expect(getCominsSlotHeight(slot, 40)).toBe(200);
  });

  it.each([false, true])("applies mixed numeric and auto heights with virtualized=%s", virtualized => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    try {
      act(() => root.render(<CominsTable columns={[{ field: "id", label: "ID" }]} data={[{ id: "auto" }, { id: "fixed" }, { id: "default" }]} getRowId={row => row.id} rowHeight={40} getRowHeight={({ row }) => row.id === "auto" ? "auto" : row.id === "fixed" ? 90 : undefined} virtualized={virtualized} />));
      expect(host.querySelector<HTMLElement>('[data-testid="row-auto"]')?.style.height).toBe("auto");
      expect(host.querySelector<HTMLElement>('[data-testid="row-fixed"]')?.style.height).toBe("90px");
      expect(host.querySelector<HTMLElement>('[data-testid="row-default"]')?.style.height).toBe("40px");
    } finally {
      act(() => root.unmount());
      host.remove();
    }
  });
});
