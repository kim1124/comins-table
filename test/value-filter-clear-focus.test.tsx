// @vitest-environment jsdom
import { act, useState, type MouseEvent as ReactMouseEvent } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { CominsTable, type CominsColumnFilterModel, type CominsValueFilterPanelRenderParams } from "../src";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
type Row = { status: string };

function mountPanel(options: { custom?: boolean; prevent?: boolean; readonly?: boolean; search?: boolean } = {}) {
  const host = document.createElement("div"); document.body.append(host);
  const root = createRoot(host);
  const changed = vi.fn();
  const focusAtChange: Array<Element | null> = [];
  let params!: CominsValueFilterPanelRenderParams<Row>;
  const cancel = (event: ReactMouseEvent<HTMLElement>) => { if (options.prevent) event.preventDefault(); };
  function Example() {
    const [model, setModel] = useState<CominsColumnFilterModel>([{ columnId: "status", operator: "in", values: ["Ready"] }]);
    return <><button data-testid="outside">Outside</button><CominsTable
      data={[{ status: "Ready" }, { status: "Blocked" }]}
      columns={[{ id: "status", field: "status", label: "Status", filter: { kind: "text", mode: "values", panel: { render: p => {
        params = p;
        return <>{options.search !== false && <input {...p.getSearchInputProps()} />}{options.custom
          ? <div {...p.getClearProps({ element: "custom", props: { onClick: cancel } })} data-testid="clear">Clear</div>
          : <button {...p.getClearProps({ props: { onClick: cancel } })} data-testid="clear">Clear</button>}</>;
      } } } }]}
      columnFiltering={{ model, openColumnId: "status", onChangeOpenColumnId: () => {}, onChangeModel: options.readonly ? undefined : next => {
        focusAtChange.push(document.activeElement); changed(next); setModel(next);
      } }}
    /></>;
  }
  act(() => root.render(<Example />));
  return { host, changed, focusAtChange, params: () => params,
    clear: () => host.querySelector<HTMLElement>('[data-testid="clear"]')!,
    search: () => host.querySelector<HTMLInputElement>('input[type="search"]'),
    dispose: () => { act(() => root.unmount()); host.remove(); } };
}

it.each(["native-click", "custom-enter", "custom-space"])("moves focus before clearing through %s", method => {
  const p = mountPanel({ custom: method !== "native-click" });
  try {
    act(() => p.clear().focus());
    act(() => method === "native-click" ? p.clear().click() : p.clear().dispatchEvent(new KeyboardEvent("keydown", {
      key: method === "custom-enter" ? "Enter" : " ", bubbles: true, cancelable: true,
    })));
    expect(p.changed).toHaveBeenCalledExactlyOnceWith([]);
    expect(p.focusAtChange).toEqual([p.search()]);
    expect(document.activeElement).toBe(p.search());
    expect(p.host.querySelector('[role="dialog"]')).not.toBeNull();
  } finally { p.dispose(); }
});

it.each([false, true])("preserves user preventDefault for custom=%s", custom => {
  const p = mountPanel({ custom, prevent: true });
  try {
    act(() => p.clear().focus());
    act(() => p.clear().click());
    expect(p.changed).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(p.clear());
  } finally { p.dispose(); }
});

it("keeps readonly custom clear inert without moving focus", () => {
  const p = mountPanel({ custom: true, readonly: true });
  try {
    act(() => p.clear().focus());
    act(() => p.clear().click());
    expect(p.changed).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(p.clear());
    expect(p.clear().getAttribute("aria-disabled")).toBe("true");
  } finally { p.dispose(); }
});

it("clears without a search ref", () => {
  const p = mountPanel({ search: false });
  try {
    act(() => p.clear().click());
    expect(p.changed).toHaveBeenCalledExactlyOnceWith([]);
  } finally { p.dispose(); }
});

it("does not focus a detached search ref", () => {
  const p = mountPanel();
  try {
    const input = p.search()!;
    const focus = vi.spyOn(input, "focus");
    input.remove();
    act(() => p.clear().click());
    expect(focus).not.toHaveBeenCalled();
    expect(p.changed).toHaveBeenCalledExactlyOnceWith([]);
  } finally { p.dispose(); }
});

it("leaves direct actions.clear focus behavior unchanged", () => {
  const p = mountPanel();
  try {
    const outside = p.host.querySelector<HTMLElement>('[data-testid="outside"]')!;
    act(() => outside.focus());
    act(() => p.params().actions.clear());
    expect(p.changed).toHaveBeenCalledExactlyOnceWith([]);
    expect(document.activeElement).toBe(outside);
  } finally { p.dispose(); }
});
