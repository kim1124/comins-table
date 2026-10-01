// @vitest-environment jsdom
import { act, createRef } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { CominsTable, createCominsViewportData, reduceCominsViewportData, type CominsTableRef } from "../src";
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let node: HTMLDivElement, root: ReturnType<typeof createRoot>;
afterEach(() => { act(() => root?.unmount()); node?.remove(); vi.restoreAllMocks(); });
function mount(content: React.ReactNode) { node = document.createElement("div"); document.body.append(node); root = createRoot(node); act(() => root.render(content)); }
function paste(selector: string, text: string) {
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", { value: { types: ["text/plain"], getData: () => text } });
  act(() => node.querySelector(selector)!.dispatchEvent(event)); return event;
}
const rows = [{ id: 0, value: "c" }, { id: 1, value: "a" }, { id: 2, value: "b" }];
const columns = [{ field: "value", label: "value", sort: true }];
const id = (row: { id: number }) => row.id;
const cell = (id: number) => `[data-testid='cell-${id}-value']`;

it.each(["cancel", "unmount"])("releases Fill capture and animation frames after %s", (reason) => {
  const changed = vi.fn();
  mount(<CominsTable fillHandle data={rows} columns={columns} getRowId={id} onChangeData={changed} />);
  act(() => node.querySelector(cell(0))!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  const button = node.querySelector<HTMLButtonElement>("[data-testid='fill-handle']")!;
  const held = new Set<number>(), frames = new Map<number, FrameRequestCallback>(); let next = 0;
  Object.assign(button, { setPointerCapture: (id: number) => held.add(id), releasePointerCapture: (id: number) => held.delete(id) });
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { frames.set(++next, callback); return next; });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(id => { frames.delete(id); });
  const down = new MouseEvent("pointerdown", { bubbles: true, cancelable: true, button: 0 });
  Object.defineProperty(down, "pointerId", { value: 7 });
  act(() => button.dispatchEvent(down));
  expect([...held]).toEqual([7]); expect(frames.size).toBeGreaterThan(0);
  act(() => { if (reason === "cancel") window.dispatchEvent(new Event("pointercancel")); else root.render(null); });
  expect([...held]).toEqual([]); expect(frames.size).toBe(0); expect(changed).not.toHaveBeenCalled();
});

it("honors application preventDefault before built-in cell copy", () => {
  const changed = vi.fn();
  mount(<CominsTable data={rows} columns={columns} getRowId={id} onChangeData={changed} onKeyDownCell={({ event }) => { if (event.key === "c") event.preventDefault(); }} />);
  for (const [row, key] of [[0, "c"], [1, "v"]] as const) act(() => node.querySelector(cell(row))!.dispatchEvent(new KeyboardEvent("keydown", { key, ctrlKey: true, bubbles: true, cancelable: true })));
  expect(changed).not.toHaveBeenCalled(); expect(node.querySelector(cell(1))!.textContent).toBe("a");
});

it("rejects Ref fill before internal state changes or application notification", () => {
  const changed = vi.fn(), error = vi.fn(), ref = createRef<CominsTableRef<typeof rows[number]>>();
  mount(<CominsTable fillHandle ref={ref} data={rows} columns={[{ ...columns[0]!, cell: { validateFill: () => false } }]}
    getRowId={id} onChangeData={changed} onClipboardError={error} />);
  act(() => node.querySelector(cell(0))!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  act(() => node.querySelector(cell(2))!.dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: true })));
  act(() => expect(ref.current!.fillSelection("down")).toBe(false));
  expect(changed).not.toHaveBeenCalled();
  expect(error).toHaveBeenCalledTimes(1);
  expect(node.querySelector(cell(1))!.textContent).toBe("a");
  expect(node.querySelector(cell(2))!.textContent).toBe("b");
});

it("leaves native editors and default clipboard behavior untouched", () => {
  const changed = vi.fn();
  mount(<CominsTable clipboard data={rows} columns={columns} getRowId={id} onChangeData={changed} />);
  expect(paste(cell(0), "new").defaultPrevented).toBe(false); expect(changed).not.toHaveBeenCalled();
  act(() => root.render(<CominsTable clipboardPaste data={rows} columns={[{ field: "value", label: "value", cell: { renderer: () => <input /> } }]} getRowId={id} onChangeData={changed} />));
  expect(paste("input", "new").defaultPrevented).toBe(false); expect(changed).not.toHaveBeenCalled();
});

it("uses sorted visible order and disabled Row guards in one callback", () => {
  const changed = vi.fn(), ref = createRef<CominsTableRef<typeof rows[number]>>();
  mount(<CominsTable clipboardPaste data={rows} ref={ref} columns={columns} getRowId={id} rowProps={{ disabled: row => row.id === 2 }} onChangeData={changed} />);
  act(() => ref.current!.setSortState({ columnId: "value", direction: "asc" }));
  expect(paste(cell(1), "first\nblocked\nthird").defaultPrevented).toBe(true);
  expect(changed).toHaveBeenCalledTimes(1);
  expect(changed.mock.calls[0]![0].map((row: typeof rows[number]) => row.value)).toEqual(["third", "first", "b"]);
});

it("does not intercept Ctrl+V for its old internal buffer when OS paste is enabled", () => {
  const changed = vi.fn();
  mount(<CominsTable clipboardPaste data={rows} columns={columns} getRowId={id} onChangeData={changed} />);
  for (const key of ["c", "v"]) {
    const event = new KeyboardEvent("keydown", { key, ctrlKey: true, bubbles: true, cancelable: true });
    act(() => node.querySelector(cell(0))!.dispatchEvent(event));
    if (key === "v") expect(event.defaultPrevented).toBe(false);
  }
  paste(cell(1), "external");
  expect(changed.mock.calls[0]![0][1].value).toBe("external"); expect(changed).toHaveBeenCalledTimes(1);
});

it("provides click/Ref fill with a single batch and refuses read-only tables", () => {
  const changed = vi.fn(), ref = createRef<CominsTableRef<typeof rows[number]>>();
  mount(<CominsTable fillHandle ref={ref} data={rows} columns={columns} getRowId={id} onChangeData={changed} />);
  act(() => node.querySelector(cell(0))!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  act(() => node.querySelector(cell(2))!.dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: true })));
  expect(node.querySelector("[data-testid='fill-handle']")).not.toBeNull();
  act(() => expect(ref.current!.fillSelection("down")).toBe(true));
  expect(changed).toHaveBeenCalledTimes(1); expect(changed.mock.calls[0]![0].map((row: typeof rows[number]) => row.value)).toEqual(["c", "c", "c"]);
  act(() => root.render(<CominsTable fillHandle clipboardPaste ref={ref} data={rows} columns={columns} getRowId={id} />));
  expect(node.querySelector("[data-testid='fill-handle']")).toBeNull(); expect(ref.current!.fillSelection("down")).toBe(false);
  expect(paste(cell(0), "no").defaultPrevented).toBe(false);
});

it("rejects Viewport holes atomically and passes absolute parser indexes", () => {
  let data = createCominsViewportData<typeof rows[number]>({ revision: "a", rowCount: 20, blockSize: 2 });
  for (const startIndex of [0, 10]) {
    const request = { startIndex, endIndex: startIndex + 2, requestId: String(startIndex), revision: "a", signal: new AbortController().signal, retainRange: { startIndex: 0, endIndex: 20 } };
    data = reduceCominsViewportData(data, { type: "request", request });
    data = reduceCominsViewportData(data, { type: "success", request, rows: [0, 1].map(offset => ({ id: startIndex + offset, value: "old" })) });
  }
  const changed = vi.fn(), error = vi.fn(), parse = vi.fn(({ text, row }: { text: string; row: { dataIndex: number } }) => `${row.dataIndex}:${text}`);
  mount(<CominsTable clipboardPaste data={data} buffer-size={100} columns={[{ ...columns[0]!, cell: { parseClipboard: parse } }]} getRowId={id} viewportDatasource={{ revision: "a" }} onViewportRequest={() => {}} onChangeData={changed} onClipboardError={error} />);
  paste(cell(1), "a\nb");
  expect(changed).not.toHaveBeenCalled(); expect(parse).not.toHaveBeenCalled(); expect(error).toHaveBeenCalledTimes(1);
  paste(cell(10), "x\ny");
  expect(changed).toHaveBeenCalledTimes(1);
  expect(changed.mock.calls[0]![0].changes).toEqual([{ index: 10, row: { id: 10, value: "10:x" } }, { index: 11, row: { id: 11, value: "11:y" } }]);
});

it("Ref fill uses the latest loading state and Row protection even with unchanged data", () => {
  const changed = vi.fn(), ref = createRef<CominsTableRef<typeof rows[number]>>();
  const render = (loading: boolean, disabled: boolean) => <CominsTable fillHandle ref={ref} data={rows} columns={columns} getRowId={id}
    loading={loading} rowProps={{ disabled }} onChangeData={changed} />;
  mount(render(false, false));
  act(() => node.querySelector(cell(0))!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  act(() => node.querySelector(cell(2))!.dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: true })));
  act(() => root.render(render(true, false)));
  act(() => expect(ref.current!.fillSelection("down")).toBe(false));
  expect(changed).not.toHaveBeenCalled();
  act(() => root.render(render(false, true)));
  act(() => expect(ref.current!.fillSelection("down")).toBe(false));
  expect(changed).not.toHaveBeenCalled();
  act(() => root.render(render(false, false)));
  act(() => expect(ref.current!.fillSelection("down")).toBe(true));
  expect(changed).toHaveBeenCalledTimes(1);
});

it("Fill validation receives absolute Viewport indexes and preserves typed patches", async () => {
  let data = createCominsViewportData<typeof rows[number]>({ revision: "fill", rowCount: 20, blockSize: 2 });
  const request = { startIndex: 10, endIndex: 12, requestId: "fill", revision: "fill", signal: new AbortController().signal, retainRange: { startIndex: 10, endIndex: 12 } };
  data = reduceCominsViewportData(data, { type: "request", request });
  data = reduceCominsViewportData(data, { type: "success", request, rows: [{ id: 10, value: "source" }, { id: 11, value: "destination" }] });
  const changed = vi.fn(), ref = createRef<CominsTableRef<typeof rows[number]>>();
  const checked: unknown[] = [];
  mount(<CominsTable fillHandle ref={ref} data={data} buffer-size={100} columns={[{ ...columns[0]!, cell: {
    validateFill: ({ row, value }) => { checked.push([row.id, row.dataIndex, row.index, row.data.value, value]); },
  } }]} getRowId={id} viewportDatasource={{ revision: "fill" }} onViewportRequest={() => {}} onChangeData={changed} />);
  await act(async () => {});
  changed.mockClear();
  act(() => node.querySelector(cell(10))!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  act(() => node.querySelector(cell(11))!.dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: true })));
  await act(async () => { expect(ref.current!.fillSelection("down")).toBe(true); });
  expect(checked).toEqual([[11, 11, 11, "destination", "source"]]);
  expect(changed.mock.calls[0]![0].changes).toEqual([{ index: 11, row: { id: 11, value: "source" } }]);
});
