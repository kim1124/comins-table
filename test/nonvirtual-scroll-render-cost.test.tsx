// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CominsTable, type CominsTableColumn } from "../src";

import * as rowProjection from "../src/react/rows";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const data = Array.from({ length: 30 }, (_, index) => ({ id: String(index), name: `Row ${index}` }));
const getRowId = (row: (typeof data)[number]) => row.id;
let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let nextFrame: number;
let frames: Map<number, FrameRequestCallback>;
let cellRenders: number;
let columns: CominsTableColumn<(typeof data)[number]>[];

beforeEach(() => {
  nextFrame = 0;
  frames = new Map();
  cellRenders = 0;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => {
    const id = ++nextFrame;
    frames.set(id, callback);
    return id;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(id => { frames.delete(id); });
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 800, height: 180 } as DOMRect);
  columns = [{ field: "name", label: "Name", cell: { render: ({ value }) => { cellRenders++; return String(value); } } }];
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function flushFrames() {
  for (let pass = 0; frames.size; pass++) {
    if (pass > 20) throw new Error("Animation frames did not settle");
    const pending = [...frames];
    frames.clear();
    act(() => { for (const [, callback] of pending) callback(0); });
  }
}
function render(virtualized = false, loading = false) {
  act(() => root.render(<CominsTable columns={columns} data={data} data-testid="scroll-cost" getRowId={getRowId}
    rowHeight={36} buffer-size={0} virtualized={virtualized} loading={loading} />));
  flushFrames();
  return host.querySelector<HTMLDivElement>('[data-testid="scroll-cost"]')!;
}
function scroll(viewport: HTMLDivElement, top: number) {
  act(() => { viewport.scrollTop = top; viewport.dispatchEvent(new Event("scroll", { bubbles: true })); });
  flushFrames();
}
it("does not rerender unchanged nonvirtual cells for native vertical scroll", () => {
  const viewport = render();
  const initial = cellRenders;
  expect(initial).toBeGreaterThan(0);
  scroll(viewport, 360);
  scroll(viewport, 720);
  expect(viewport.scrollTop).toBe(720);
  expect(cellRenders).toBe(initial);
});
it("positions a newly shown loading overlay at the current nonvirtual scroll position", () => {
  const viewport = render();
  scroll(viewport, 720);
  render(false, true);
  expect(host.querySelector<HTMLElement>('[data-testid="data-table-loading-overlay"]')?.style.transform).toBe("translate(0px, 720px)");
  scroll(viewport, 540);
  expect(host.querySelector<HTMLElement>('[data-testid="data-table-loading-overlay"]')?.style.transform).toBe("translate(0px, 540px)");
});
it("updates virtual rows after scrolling", () => {
  const viewport = render(true);
  expect(host.querySelector('[data-testid="cell-0-name"]')).not.toBeNull();
  scroll(viewport, 720);
  expect(host.querySelector('[data-testid="cell-20-name"]')).not.toBeNull();
  expect(host.querySelector('[data-testid="cell-0-name"]')).toBeNull();
});
it("starts virtualization at the existing nonvirtual viewport position", () => {
  const viewport = render();
  scroll(viewport, 720);
  render(true);
  expect(viewport.scrollTop).toBe(720);
  expect(host.querySelector('[data-testid="cell-20-name"]')).not.toBeNull();
  expect(host.querySelector('[data-testid="cell-0-name"]')).toBeNull();
});

it("keeps the complete row projection stable during scroll but rebuilds it for new data", () => {
  const project = vi.spyOn(rowProjection, "projectReactRows");
  const viewport = render(true);
  const initial = project.mock.calls.length;
  expect(initial).toBeGreaterThan(0);
  scroll(viewport, 360);
  scroll(viewport, 720);
  expect(project.mock.calls.length).toBe(initial);
  const updated = data.map(row => ({ ...row, name: `Updated ${row.id}` }));
  act(() => root.render(<CominsTable columns={columns} data={updated} data-testid="scroll-cost" getRowId={getRowId}
    rowHeight={36} buffer-size={0} virtualized />));
  flushFrames();
  expect(project.mock.calls.length).toBeGreaterThan(initial);
  expect(host.querySelector('[data-testid="cell-20-name"]')?.textContent).toBe("Updated 20");
});

it("cancels a queued virtual scroll commit when virtualization is disabled", () => {
  const viewport = render(true);
  act(() => {
    viewport.scrollTop = 720;
    viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  const pendingFrame = [...frames.keys()];
  expect(pendingFrame).toHaveLength(1);
  act(() => root.render(<CominsTable columns={columns} data={data} data-testid="scroll-cost" getRowId={getRowId}
    rowHeight={36} buffer-size={0} virtualized={false} />));
  expect(window.cancelAnimationFrame).toHaveBeenCalledWith(pendingFrame[0]);
  expect(frames.has(pendingFrame[0]!)).toBe(false);
  const rendered = cellRenders;
  flushFrames();
  expect(cellRenders).toBe(rendered);
  expect(host.querySelectorAll("tr[data-comins-row-data-index]")).toHaveLength(data.length);
});
