// @vitest-environment jsdom
import { act, useState, type ReactElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CominsTable, type CominsTableColumn } from "../src";
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
type Row = { id: string; name: string };
const rows = [{ id: "a", name: "Alpha" }];
let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement;
function mount(element: ReactElement) {
  container = document.createElement("div"); document.body.append(container);
  root = createRoot(container); act(() => root!.render(element)); return container;
}
beforeEach(() => vi.useFakeTimers());
function focus(element: HTMLElement) { act(() => { element.focus(); vi.advanceTimersByTime(50); }); }
afterEach(() => { act(() => root?.unmount()); container?.remove(); root = undefined; vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
function table(tooltip: NonNullable<CominsTableColumn<Row>["cell"]>["tooltip"], name = "Alpha") {
  return <CominsTable columns={[{ field: "name", label: "Name", cell: { tooltip } }]} data={[{ id: "a", name }]} getRowId={row => row.id} />;
}
describe("custom cell tooltip", () => {
  it("keeps simultaneous table tooltip IDs and cleanup independent", () => {
    const view = mount(<div>{table({ render: () => "First" })}{table({ render: () => "Second" })}</div>);
    const cells = view.querySelectorAll<HTMLElement>('[data-testid="cell-a-name"]');
    act(() => {
      cells[0]!.dispatchEvent(new MouseEvent("pointerover", { bubbles: true }));
      cells[1]!.dispatchEvent(new MouseEvent("pointerover", { bubbles: true }));
    });
    const tooltips = [...document.querySelectorAll<HTMLElement>('[role="tooltip"]')];
    expect(tooltips.map(tooltip => tooltip.textContent)).toEqual(["First", "Second"]);
    expect(new Set(tooltips.map(tooltip => tooltip.id)).size).toBe(2);
    act(() => root!.render(<div>{table({ render: () => "First" })}</div>));
    expect(document.querySelectorAll('[role="tooltip"]')).toHaveLength(1);
  });
  it("portals to the owning cell's document and removes its relationship on unmount", () => {
    container = document.createElement("div"); document.body.append(container);
    const iframe = document.createElement("iframe"); container.append(iframe);
    const doc = iframe.contentDocument!;
    const target = doc.createElement("div"); doc.body.append(target);
    root = createRoot(target); act(() => root!.render(table({ render: () => "Frame tooltip" })));
    const cell = doc.querySelector<HTMLElement>('[data-testid="cell-a-name"]')!;
    focus(cell);
    expect(doc.querySelector('[role="tooltip"]')?.textContent).toBe("Frame tooltip");
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    act(() => root!.unmount()); root = undefined;
    expect(doc.querySelector('[role="tooltip"]')).toBeNull();
    expect(cell.hasAttribute("aria-describedby")).toBe(false);
  });
  it("allows the first focus after removing and restoring the same row ID", () => {
    const tooltip = { render: () => "Restored tooltip" };
    const view = mount(table(tooltip));
    focus(view.querySelector<HTMLElement>('[data-testid="cell-a-name"]')!);
    expect(document.querySelector('[role="tooltip"]')?.textContent).toBe("Restored tooltip");
    act(() => root!.render(<CominsTable columns={[{ field: "name", label: "Name", cell: { tooltip } }]} data={[]} getRowId={row => (row as Row).id} />));
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    act(() => root!.render(table(tooltip)));
    focus(view.querySelector<HTMLElement>('[data-testid="cell-a-name"]')!);
    expect(document.querySelector('[role="tooltip"]')?.textContent).toBe("Restored tooltip");
  });
  it("repositions when informational component content changes its own size", () => {
    let height = 20;
    let grow!: () => void;
    let notify: (() => void) | undefined;
    vi.stubGlobal("ResizeObserver", class {
      constructor(private callback: () => void) {}
      observe(element: Element) { if (element.classList.contains("comins-cell-tooltip")) notify = this.callback; }
      unobserve() {} disconnect() {}
    });
    const previousHeight = window.innerHeight;
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 300 });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function(this: HTMLElement) {
      return new DOMRect(20, this.classList.contains("comins-cell-tooltip") ? 0 : 180, 80, this.classList.contains("comins-cell-tooltip") ? height : 20);
    });
    function Info() { const [expanded, setExpanded] = useState(false); grow = () => { height = 200; setExpanded(true); }; return <span>{expanded ? "Expanded information" : "Information"}</span>; }
    try {
      const view = mount(table({ render: () => <Info /> }));
      focus(view.querySelector<HTMLElement>('[data-testid="cell-a-name"]')!);
      expect(document.querySelector<HTMLElement>('[role="tooltip"]')?.style.top).toBe("206px");
      act(() => { grow(); notify?.(); });
      expect(document.querySelector<HTMLElement>('[role="tooltip"]')?.style.top).toBe("8px");
    } finally { Object.defineProperty(window, "innerHeight", { configurable: true, value: previousHeight }); }
  });
  it("handles Escape from a built-in cell control that stops key propagation", () => {
    const view = mount(<CominsTable columns={[{ field: "name", label: "Name", cell: {
      components: [{ type: "button", props: { children: "Action" } }], tooltip: { render: () => "Control tooltip" },
    } }]} data={rows} getRowId={row => row.id} />);
    const button = view.querySelector<HTMLButtonElement>('[data-testid="cell-a-name"] button')!;
    focus(button);
    expect(document.querySelector('[role="tooltip"]')?.textContent).toBe("Control tooltip");
    act(() => button.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" })));
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });
  it("clears a tooltip when focus leaves an input that stops blur propagation", async () => {
    const view = mount(<CominsTable columns={[{ field: "name", label: "Name", cell: {
      components: [{ type: "input", props: { value: "Alpha" } }], tooltip: { render: () => "Input tooltip" },
    } }]} data={rows} getRowId={row => row.id} />);
    const cell = view.querySelector<HTMLElement>('[data-testid="cell-a-name"]')!;
    act(() => cell.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    const input = cell.querySelector<HTMLInputElement>("input")!;
    focus(input);
    expect(document.querySelector('[role="tooltip"]')?.textContent).toBe("Input tooltip");
    const outside = document.createElement("button"); view.append(outside);
    act(() => { outside.focus(); vi.advanceTimersByTime(120); });
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    expect(cell.hasAttribute("aria-describedby")).toBe(false);
  });
  it("preserves the owning table's custom theme colors in its portal", () => {
    const view = mount(table({ render: () => "Themed" }));
    view.style.setProperty("--comins-table-foreground", "rgb(1, 2, 3)");
    const cell = view.querySelector<HTMLElement>('[data-testid="cell-a-name"]')!;
    cell.style.setProperty("--comins-table-foreground", "rgb(1, 2, 3)");
    focus(cell);
    expect(document.querySelector<HTMLElement>('[role="tooltip"]')?.style.getPropertyValue("--comins-table-foreground")).toBe("rgb(1, 2, 3)");
  });
  it("preserves native string tooltips and non-string legacy behavior", () => {
    const view = mount(table(() => "Native"));
    const cell = view.querySelector<HTMLElement>('[data-testid="cell-a-name"]')!;
    expect(cell.title).toBe("Native");
    act(() => root!.render(table(() => <b>Legacy ignored</b>)));
    expect(cell.title).toBe(""); expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });
  it("opens on focus with custom content and combines existing aria descriptions", () => {
    const view = mount(table({ render: ({ value }) => <b>{String(value)}</b> }));
    const cell = view.querySelector<HTMLElement>('[data-testid="cell-a-name"]')!;
    cell.setAttribute("aria-describedby", "existing-description");
    focus(cell);
    const tooltip = document.querySelector<HTMLElement>('[role="tooltip"]')!;
    expect(tooltip?.textContent).toBe("Alpha");
    expect(cell.getAttribute("aria-describedby")).toBe(`existing-description ${tooltip.id}`);
    expect(cell.title).toBe("");
    act(() => cell.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    expect(cell.getAttribute("aria-describedby")).toBe("existing-description");
  });
  it.each([undefined, null, false, ""] as ReactNode[])("does not create a tooltip for %s", value => {
    const view = mount(table({ render: () => value }));
    const cell = view.querySelector<HTMLElement>('[data-testid="cell-a-name"]')!;
    cell.setAttribute("aria-describedby", "existing-description");
    focus(cell);
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    expect(cell.getAttribute("aria-describedby")).toBe("existing-description");
  });
  it("updates current data and closes on scroll/removal without leaking portals", () => {
    const tooltip = { render: ({ value }: { value: unknown }) => <b>{String(value)}</b> };
    const view = mount(table(tooltip));
    focus(view.querySelector<HTMLElement>('[data-testid="cell-a-name"]')!);
    act(() => root!.render(table(tooltip, "Updated")));
    expect(document.querySelector('[role="tooltip"]')?.textContent).toBe("Updated");
    act(() => view.querySelector('.comins-table__body-viewport')!.dispatchEvent(new Event("scroll", { bubbles: true })));
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    act(() => root!.render(<div>Removed</div>));
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });
  it("cleans up its portal on unmount", () => {
    const view = mount(table({ render: () => 0 }));
    focus(view.querySelector<HTMLElement>('[data-testid="cell-a-name"]')!);
    expect(document.querySelector('[role="tooltip"]')?.textContent).toBe("0");
    act(() => root!.unmount()); root = undefined;
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });
});
