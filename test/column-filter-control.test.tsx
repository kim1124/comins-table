// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { CominsTable, type CominsColumnFilterModel, type CominsTableColumn } from "../src";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

it.each(["select", "hidden-input"])("focuses the first enabled custom control instead of %s fallback", variant => {
  const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
  try {
    act(() => root.render(<CominsTable data={[{ status: "Ready" }]} columns={[{ field: "status", label: "Status", filter: {
      kind: "text", mode: "values", panel: { render: () => variant === "select" ? <select><option>Ready</option></select> : <><input type="hidden" /><button>Enabled</button></> },
    } }]} columnFiltering={{ model: [], openColumnId: "status", onChangeOpenColumnId: () => {} }} />));
    expect(document.activeElement).toBe(host.querySelector(variant === "select" ? "select" : "[role=dialog] button"));
  } finally { act(() => root.unmount()); host.remove(); }
});

it("uses the owning document for popup focus, Escape and outside pointer cleanup", () => {
  const frame = document.createElement("iframe"); document.body.append(frame);
  const doc = frame.contentDocument!; const win = doc.defaultView!;
  const host = doc.createElement("div"); doc.body.append(host); const root = createRoot(host);
  function Example() {
    const [open, setOpen] = useState<string | null>("status");
    return <CominsTable data={[{ status: "Ready" }]} columns={[{ field: "status", label: "Status", filter: { kind: "text", mode: "values" } }]}
      columnFiltering={{ model: [], openColumnId: open, onChangeOpenColumnId: setOpen }} />;
  }
  try {
    act(() => root.render(<Example />));
    const trigger = host.querySelector<HTMLButtonElement>('[data-testid="column-filter-trigger-status"]')!;
    expect(doc.activeElement).toBe(host.querySelector("input[type=search]"));
    act(() => win.dispatchEvent(new win.KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(host.querySelector("[role=dialog]")).toBeNull();
    expect(doc.activeElement).toBe(trigger);
    act(() => trigger.click());
    act(() => doc.body.dispatchEvent(new win.MouseEvent("pointerdown", { bubbles: true })));
    expect(host.querySelector("[role=dialog]")).toBeNull();
  } finally { act(() => root.unmount()); frame.remove(); }
});

it("honors empty option and panel renders without removing owned controls and dialog", () => {
  const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
  const data = [{ status: "Ready" }];
  let emptyPanel = false;
  const render = () => root.render(<CominsTable data={data} columns={[{ field: "status", label: "Status", filter: {
    kind: "text", mode: "values", option: { render: () => null }, panel: { render: () => emptyPanel ? null : undefined },
  } }]} columnFiltering={{ model: [], openColumnId: "status", onChangeOpenColumnId: () => {} }} />);
  try {
    act(render);
    expect(host.querySelector('input[aria-label="Ready"]')).not.toBeNull();
    expect(host.querySelector('.comins-column-filter__option')!.textContent).toBe("");
    act(() => { emptyPanel = true; render(); });
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
    expect(host.querySelector('input[aria-label="Ready"]')).toBeNull();
  } finally { act(() => root.unmount()); host.remove(); }
});

it("composes custom markup and handlers without invoking hidden options twice", () => {
  const host = document.createElement("div"); document.body.append(host);
  const root = createRoot(host);
  const data = [{ id: 1, status: "Ready" }, { id: 2, status: "Blocked" }];
  const changed = vi.fn(); const rendered = vi.fn(); const ref = vi.fn();
  const panelCallStarts: number[] = [];
  const columns: CominsTableColumn<(typeof data)[number]>[] = [{ id: "status", field: "status", label: "Status", filter: {
    kind: "text", mode: "values",
    option: { props: { className: "custom-option", style: { color: "red" } }, render: ({ option }) => { rendered(option.id); return <strong>{option.label}</strong>; } },
    panel: { props: { className: "custom-panel" }, render: p => { panelCallStarts.push(rendered.mock.calls.length); return <section>
      <input {...p.getSearchInputProps({ ref })} />
      <ul>{p.visibleOptions.map(o => <li key={o.id} {...p.getOptionContainerProps(o)}>
        <div {...p.getOptionProps(o, { element: "custom", props: { onClick: event => event.preventDefault() } })}>{p.renderOption(o)}</div>
      </li>)}</ul>
    </section>; } },
  } }];
  try {
    act(() => root.render(<CominsTable data={data} columns={columns} columnFiltering={{ model: [], openColumnId: "status", onChangeModel: changed, onChangeOpenColumnId: () => {} }} />));
    expect(host.querySelector("section ul li strong")?.textContent).toBe("Ready");
    expect(host.querySelector(".custom-panel")).not.toBeNull();
    expect(host.querySelector<HTMLElement>(".custom-option")?.style.color).toBe("red");
    expect(panelCallStarts.length).toBeGreaterThan(0);
    // Keep every invocation: each panel render must invoke each option exactly once.
    expect(panelCallStarts.map((start, index) => (panelCallStarts[index + 1] ?? rendered.mock.calls.length) - start))
      .toEqual(panelCallStarts.map(() => 2));
    act(() => host.querySelector<HTMLElement>('[role="checkbox"]')!.click());
    expect(changed).not.toHaveBeenCalled();
    const mountedInputs = ref.mock.calls.map(([node]) => node).filter((node): node is HTMLInputElement => node instanceof HTMLInputElement);
    expect(mountedInputs.some(node => !node.isConnected)).toBe(true);
    expect(document.activeElement).toBe(host.querySelector("section input"));
    expect(ref).toHaveBeenCalledWith(host.querySelector("section input"));
  } finally { act(() => root.unmount()); host.remove(); }
  expect(ref).toHaveBeenLastCalledWith(null);
});

it("does not re-read values when searching and protects selection in readonly panels", () => {
  const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
  const data = [{ id: 1, status: "Ready" }, { id: 2, status: "Blocked" }];
  const getValue = vi.fn(({ value }: { value: unknown }) => value);
  let panel: import("../src").CominsValueFilterPanelRenderParams<(typeof data)[number]> | undefined;
  const columns: CominsTableColumn<(typeof data)[number]>[] = [{ id: "status", field: "status", label: "Status", filter: {
    kind: "text", mode: "values", getValue, panel: { render: params => { panel = params; return undefined; } },
  } }];
  try {
    act(() => root.render(<CominsTable data={data} columns={columns} columnFiltering={{ model: [], openColumnId: "status", onChangeOpenColumnId: () => {} }} />));
    const calls = getValue.mock.calls.length;
    act(() => panel!.actions.setQuery("block"));
    expect(getValue).toHaveBeenCalledTimes(calls);
    expect(panel!.visibleOptions.map(o => o.label)).toEqual(["Blocked"]);
    act(() => { panel!.actions.setVisibleSelected(false); panel!.actions.clear(); });
    expect(panel!.selectionMode).toBe("all");
    expect(panel!.visibleOptions[0]!.selected).toBe(true);
  } finally { act(() => root.unmount()); host.remove(); }
});

it("applies value choices immediately while displaying only the acknowledged model", () => {
  const host = document.createElement("div"); document.body.append(host);
  const root = createRoot(host);
  const data = [{ id: 1, status: "Ready" }, { id: 2, status: "Blocked" }];
  const columns = [{ id: "status", field: "status", label: "Status", filter: { kind: "text" as const, mode: "values" as const } }];
  let model: CominsColumnFilterModel = [];
  const changed = vi.fn();
  const render = () => root.render(<CominsTable data={data} columns={columns} columnFiltering={{ model, openColumnId: "status", onChangeModel: changed, onChangeOpenColumnId: () => {} }} />);
  try {
    act(render);
    const checkbox = () => host.querySelector<HTMLInputElement>('input[type="checkbox"][aria-label="Ready"]');
    expect(checkbox()).not.toBeNull();
    expect(checkbox()!.checked).toBe(true);
    act(() => checkbox()!.click());
    expect(changed).toHaveBeenCalledTimes(1);
    expect(changed.mock.calls[0]![0]).toEqual([{ columnId: "status", operator: "in", values: ["Blocked"] }]);
    expect(checkbox()!.checked).toBe(true);
    act(() => { model = changed.mock.calls[0]![0]; render(); });
    expect(checkbox()!.checked).toBe(false);
    act(() => { model = [{ columnId: "status", operator: "contains", value: "Ready" }]; render(); });
    expect(host.querySelector('[data-testid="column-filter-operator-status"]')).not.toBeNull();
    expect(checkbox()).toBeNull();
  } finally { act(() => root.unmount()); host.remove(); }
});

it("keeps local filter drafts but synchronizes external replacement, Clear and reopening", () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const data = [{ id: 1, value: "Alpha" }, { id: 2, value: "Beta" }];
  const columns = [{ field: "value", label: "value", filter: { kind: "text" as const } }];
  let model: CominsColumnFilterModel = [{ columnId: "value", operator: "isNotEmpty" }];
  let openColumnId: string | null = "value";
  const render = () => root.render(<CominsTable data={data} columns={columns} columnFiltering={{
    model, openColumnId,
    onChangeModel: next => { model = next; render(); },
    onChangeOpenColumnId: next => { openColumnId = next; render(); },
  }} />);
  const operator = () => host.querySelector<HTMLSelectElement>("[data-testid='column-filter-operator-value']")!;
  const input = () => host.querySelector<HTMLInputElement>("[data-testid='column-filter-value-value']")!;
  try {
    act(render);
    act(() => { operator().value = "notContains"; operator().dispatchEvent(new Event("change", { bubbles: true })); });
    expect(model).toEqual([]);
    expect(operator().value).toBe("notContains");
    act(() => { model = [{ columnId: "value", operator: "equals", value: "Beta" }]; render(); });
    expect(operator().value).toBe("equals");
    expect(input().value).toBe("Beta");
    act(() => host.querySelector<HTMLButtonElement>("[data-testid='column-filter-clear-value']")!.click());
    expect(model).toEqual([]);
    expect(operator().value).toBe("contains");
    expect(input().value).toBe("");
    act(() => { operator().value = "notContains"; operator().dispatchEvent(new Event("change", { bubbles: true })); });
    act(() => { openColumnId = null; render(); });
    act(() => { openColumnId = "value"; render(); });
    expect(operator().value).toBe("contains");
  } finally {
    act(() => root.unmount());
    host.remove();
  }
});
