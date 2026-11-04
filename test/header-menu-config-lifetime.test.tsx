// @vitest-environment jsdom
import { StrictMode, act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CominsTable, type CominsTableColumn } from "../src";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
type Row = { id: string; name: string };
const data: Row[] = [{ id: "a", name: "Alpha" }];
const fixtures: Array<{ root: Root; host: HTMLDivElement }> = [];
afterEach(() => {
  for (const { root, host } of fixtures.splice(0)) {
    act(() => root.unmount());
    host.remove();
  }
  vi.restoreAllMocks();
});
function fixture(strict = false) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  fixtures.push({ root, host });
  const calls: Array<{ token: number; phase: string; open: boolean; label: ReactNode }> = [];
  function render(token: number, allow = true) {
    const columns: Array<CominsTableColumn<Row>> = [{
      field: "name", label: `Name ${token}`, header: { components: [{
        type: "menu", items: [{ label: "Info", value: "info" }],
        onBeforeChange: ({ open, column }) => {
          calls.push({ token, phase: "before", open, label: column.label });
          return allow;
        },
        onOpenChange: ({ open, column }) => calls.push({ token, phase: "change", open, label: column.label }),
        onSelect: ({ column }) => calls.push({ token, phase: "select", open: false, label: column.label }),
      }] },
    }];
    const table = <CominsTable data={data} columns={columns} getRowId={(row) => row.id} />;
    act(() => root.render(strict ? <StrictMode>{table}</StrictMode> : table));
  }
  const trigger = () => host.querySelector<HTMLButtonElement>("[aria-haspopup='menu']")!;
  const menu = () => host.querySelector<HTMLElement>("[role='menu']");
  return { root, host, calls, render, trigger, menu };
}
function dismiss(kind: string, f: ReturnType<typeof fixture>) {
  act(() => {
    if (kind === "outside") document.body.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    else if (kind === "Escape") document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    else if (kind === "item") f.host.querySelector<HTMLButtonElement>("[role='menuitem']")!.click();
    else f.trigger().click();
  });
}
describe("open header menu configuration lifetime", () => {
  it.each([false, true].flatMap((strict) => ["outside", "Escape", "trigger", "item"].map((kind) => ({ strict, kind }))))(
    "uses latest committed callbacks and payload for $kind (StrictMode=$strict)", ({ strict, kind }) => {
      const f = fixture(strict);
      f.render(1);
      act(() => f.trigger().click());
      expect(f.menu()).not.toBeNull();
      f.render(2);
      f.render(3);
      const count = f.calls.length;
      dismiss(kind, f);
      expect(f.menu()).toBeNull();
      expect(f.calls.slice(count)).toEqual([
        { token: 3, phase: "before", open: false, label: "Name 3" },
        { token: 3, phase: "change", open: false, label: "Name 3" },
        ...(kind === "item" ? [{ token: 3, phase: "select", open: false, label: "Name 3" }] : []),
      ]);
      if (kind === "Escape") expect(document.activeElement).toBe(f.trigger());
    },
  );
  it.each(["outside", "Escape"])("honors the replacement close veto for %s", (kind) => {
    const f = fixture();
    f.render(1);
    act(() => f.trigger().click());
    f.render(2, false);
    const count = f.calls.length;
    dismiss(kind, f);
    expect(f.menu()).not.toBeNull();
    expect(f.calls.slice(count)).toEqual([{ token: 2, phase: "before", open: false, label: "Name 2" }]);
  });
  it("removes every menu listener on close and on active unmount", () => {
    const f = fixture();
    f.render(1);
    const da = vi.spyOn(document, "addEventListener");
    const dr = vi.spyOn(document, "removeEventListener");
    const wa = vi.spyOn(window, "addEventListener");
    const wr = vi.spyOn(window, "removeEventListener");
    for (const unmount of [false, true]) {
      da.mockClear(); wa.mockClear(); dr.mockClear(); wr.mockClear();
      act(() => f.trigger().click());
      const doc = da.mock.calls.filter(([type]) => type === "pointerdown" || type === "keydown");
      const win = wa.mock.calls.filter(([type]) => type === "resize" || type === "scroll");
      expect(doc.map(([type]) => type).sort()).toEqual(["keydown", "pointerdown"]);
      expect(win.map(([type]) => type).sort()).toEqual(["resize", "scroll"]);
      if (unmount) {
        act(() => f.root.unmount());
        fixtures.splice(fixtures.findIndex((entry) => entry.root === f.root), 1);
        f.host.remove();
      } else dismiss("outside", f);
      for (const [type, listener] of doc) expect(dr.mock.calls.filter((call) => call[0] === type && call[1] === listener)).toHaveLength(1);
      for (const [type, listener] of win) expect(wr.mock.calls.filter((call) => call[0] === type && call[1] === listener)).toHaveLength(1);
      expect(f.menu()).toBeNull();
    }
  });
  it("repositions the same open menu on resize and captured scroll after replacement", () => {
    const f = fixture();
    f.render(1);
    let rect = new DOMRect(40, 10, 80, 20);
    vi.spyOn(f.trigger(), "getBoundingClientRect").mockImplementation(() => rect);
    act(() => f.trigger().click());
    expect(f.menu()?.style.top).toBe("34px");
    f.render(2);
    rect = new DOMRect(80, 30, 80, 20);
    act(() => window.dispatchEvent(new Event("resize")));
    expect(f.menu()?.style.top).toBe("54px");
    expect(f.menu()?.style.left).toBe("80px");
    rect = new DOMRect(100, 50, 80, 20);
    act(() => document.body.dispatchEvent(new Event("scroll", { bubbles: false })));
    expect(f.menu()?.style.top).toBe("74px");
    expect(f.menu()?.style.left).toBe("100px");
  });
});
