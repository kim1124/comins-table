// @vitest-environment jsdom

import { act, createRef, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CominsTable, type CominsTableColumn, type CominsTableRef } from "../src";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

type Row = { id: string; value: unknown };
type Cell = NonNullable<CominsTableColumn<Row>["cell"]>;
let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
});

function mount(element: ReactElement) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(element));
  return container;
}

function table(value: unknown, cell?: Cell) {
  return <CominsTable<Row> columns={[{ field: "value", label: "Value", cell }]} data={[{ id: "a", value }]} getRowId={(row) => row.id} />;
}

const components: Record<"button" | "virtual-list", NonNullable<Cell["components"]>> = {
  button: [{ type: "button", props: { children: "Action" } }],
  "virtual-list": [{ type: "virtual-list", items: [{ label: "Visible item", value: "item" }], props: { "aria-label": "Items" } }],
};

function observedValue(primitive: boolean) {
  const toString = vi.fn(() => "hidden raw value");
  const toPrimitive = vi.fn(() => "hidden primitive value");
  return {
    value: primitive ? { toString, [Symbol.toPrimitive]: toPrimitive } : { toString },
    toString,
    toPrimitive,
  };
}

describe("default cell coercion laziness and explicit format compatibility", () => {
  it.each([
    ["render", true], ["render", false], ["renderer", true], ["renderer", false],
  ] as const)("does not coerce replaced raw values with %s (Symbol.toPrimitive=%s)", (api, primitive) => {
    const observed = observedValue(primitive);
    const cell: Cell = { [api]: () => <strong>Custom content</strong> };
    const view = mount(table(observed.value, cell));

    expect(view.querySelector('[data-testid="cell-a-value"] strong')?.textContent).toBe("Custom content");
    expect(observed.toPrimitive).not.toHaveBeenCalled();
    expect(observed.toString).not.toHaveBeenCalled();
  });

  it.each(["button", "virtual-list"] as const)("does not coerce hidden raw values behind %s components", (type) => {
    const observed = observedValue(true);
    const view = mount(table(observed.value, { components: components[type] }));
    const cell = view.querySelector('[data-testid="cell-a-value"]');

    expect(cell?.textContent).toContain(type === "button" ? "Action" : "Visible item");
    expect(cell?.textContent).not.toContain("hidden");
    expect(observed.toPrimitive).not.toHaveBeenCalled();
    expect(observed.toString).not.toHaveBeenCalled();
  });

  it.each(["button", "virtual-list"] as const)("preserves explicit format callbacks behind %s components", (type) => {
    const format = vi.fn(() => "Hidden formatted value");
    const view = mount(table("raw", { components: components[type], format }));

    expect(view.querySelector('[data-testid="cell-a-value"]')?.textContent).toContain(type === "button" ? "Action" : "Visible item");
    expect(format).toHaveBeenCalled();
  });

  it.each(["render", "renderer"] as const)("keeps explicit format before %s with the original raw payload", (api) => {
    const raw = { amount: 42 };
    const calls: Array<{ phase: "format" | "render"; value: unknown }> = [];
    const cell: Cell = {
      format: ({ value }) => {
        calls.push({ phase: "format", value });
        return "Explicit formatted value";
      },
      [api]: ({ value }: { value: unknown }) => {
        calls.push({ phase: "render", value });
        return <strong>Custom content</strong>;
      },
    };
    const view = mount(table(raw, cell));

    expect(view.querySelector('[data-testid="cell-a-value"] strong')?.textContent).toBe("Custom content");
    expect(calls.some((call) => call.phase === "render")).toBe(true);
    for (const [index, call] of calls.entries()) {
      expect(call.value).toBe(raw);
      if (call.phase === "render") {
        expect(calls[index - 1]?.phase).toBe("format");
      }
    }
  });

  it.each([null, undefined])("preserves explicit format result %s without replacing it with raw String conversion", (result) => {
    const observed = observedValue(true);
    const format = vi.fn(() => result);
    const view = mount(table(observed.value, { format }));

    expect(view.querySelector('[data-testid="cell-a-value"]')?.textContent).toBe("");
    expect(format).toHaveBeenCalledWith(expect.objectContaining({ value: observed.value }));
    expect(observed.toPrimitive).not.toHaveBeenCalled();
    expect(observed.toString).not.toHaveBeenCalled();
  });

  it("retains explicit formatting for ordinary cells", () => {
    const raw = { amount: 42 };
    const format = vi.fn(({ value }: { value: unknown }) => value === raw ? "Amount: 42" : "wrong payload");
    const view = mount(table(raw, { format }));

    expect(view.querySelector('[data-testid="cell-a-value"]')?.textContent).toBe("Amount: 42");
    expect(format).toHaveBeenCalledWith(expect.objectContaining({ value: raw }));
  });

  it("retains default String conversion for ordinary cells", () => {
    const observed = observedValue(false);
    const view = mount(table(observed.value));

    expect(view.querySelector('[data-testid="cell-a-value"]')?.textContent).toBe("hidden raw value");
    expect(observed.toString).toHaveBeenCalled();
  });

  it("uses formatted default content when standard render returns undefined", () => {
    const format = vi.fn(() => "Formatted fallback");
    const legacy = vi.fn(() => "Legacy content");
    const view = mount(table("raw", { render: () => undefined, renderer: legacy, format }));

    expect(view.querySelector('[data-testid="cell-a-value"]')?.textContent).toBe("Formatted fallback");
    expect(format).toHaveBeenCalled();
    expect(legacy).not.toHaveBeenCalled();
  });

  it("keeps legacy undefined output empty while preserving explicit formatting", () => {
    const format = vi.fn(() => "Hidden fallback");
    const view = mount(table("raw", { renderer: () => undefined, format }));

    expect(view.querySelector('[data-testid="cell-a-value"]')?.textContent).toBe("");
    expect(format).toHaveBeenCalled();
  });

  it.each(["input", "select"] as const)("keeps default text for inactive and multi-selected %s cells without an explicit formatter", (type) => {
    const ref = createRef<CominsTableRef<Row>>();
    const component: NonNullable<Cell["components"]>[number] = type === "input"
      ? { type: "input", props: { "aria-label": "Value editor", value: "alpha" } }
      : { type: "select", options: [{ label: "Alpha", value: "alpha" }], props: { "aria-label": "Value editor", value: "alpha" } };
    const view = mount(<CominsTable<Row> ref={ref} columns={[{ field: "value", label: "Value", cell: { components: [component] } }]} data={[{ id: "a", value: "alpha" }, { id: "b", value: "beta" }]} getRowId={(row) => row.id} />);

    expect(view.querySelector('[data-testid="cell-a-value"]')?.textContent).toBe("alpha");
    expect(view.querySelector('[aria-label="Value editor"]')).toBeNull();
    act(() => ref.current?.setSelectedRow(0));
    expect(view.querySelector(`${type}[aria-label="Value editor"]`)).not.toBeNull();
    act(() => ref.current?.setSelectedRows([0, 1]));
    expect(view.querySelector('[aria-label="Value editor"]')).toBeNull();
    expect(view.querySelector('[data-testid="cell-a-value"]')?.textContent).toBe("alpha");
    expect(view.querySelector('[data-testid="cell-b-value"]')?.textContent).toBe("beta");
  });

  it.each(["input", "select"] as const)("preserves explicit formatting through inactive single and multiple selection for %s cells", (type) => {
    const ref = createRef<CominsTableRef<Row>>();
    const format = vi.fn(({ value }: { value: unknown }) => `display:${String(value)}`);
    const component: NonNullable<Cell["components"]>[number] = type === "input"
      ? { type: "input", props: { "aria-label": "Value editor", value: "alpha" } }
      : { type: "select", options: [{ label: "Alpha", value: "alpha" }], props: { "aria-label": "Value editor", value: "alpha" } };
    const view = mount(<CominsTable<Row> ref={ref} columns={[{ field: "value", label: "Value", cell: { format, components: [component] } }]} data={[{ id: "a", value: "alpha" }, { id: "b", value: "beta" }]} getRowId={(row) => row.id} />);
    const firstCell = () => view.querySelector('[data-testid="cell-a-value"]');

    expect(firstCell()?.textContent).toBe("display:alpha");
    expect(view.querySelector('[aria-label="Value editor"]')).toBeNull();
    expect(format).toHaveBeenCalledWith(expect.objectContaining({ value: "alpha" }));
    format.mockClear();

    act(() => ref.current?.setSelectedRow(0));

    expect(firstCell()?.querySelector(`${type}[aria-label="Value editor"]`)).not.toBeNull();
    expect(firstCell()?.textContent).not.toContain("display:alpha");
    // Explicit application formatters retain their existing execution even when an editor hides their output.
    expect(format).toHaveBeenCalledWith(expect.objectContaining({ value: "alpha" }));
    expect(view.querySelector('[data-testid="cell-b-value"]')?.textContent).toBe("display:beta");
    format.mockClear();

    act(() => ref.current?.setSelectedRows([0, 1]));

    expect(view.querySelector('[aria-label="Value editor"]')).toBeNull();
    expect(firstCell()?.textContent).toBe("display:alpha");
    expect(view.querySelector('[data-testid="cell-b-value"]')?.textContent).toBe("display:beta");
    expect(format).toHaveBeenCalledWith(expect.objectContaining({ value: "alpha" }));
  });
});
