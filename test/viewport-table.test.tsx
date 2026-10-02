// @vitest-environment jsdom
import { act, createRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CominsTable, createCominsViewportData, reduceCominsViewportData, useCominsViewport, type CominsViewportData, type CominsViewportRequest, type CominsTableRef } from "../src";
import { useCominsViewportRequests } from "../src/viewport-requests";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
type Row = { id: number; name: string };
const id = (row: Row) => row.id;
let root: Root | undefined;
let element: HTMLDivElement;
afterEach(() => { act(() => root?.unmount()); element?.remove(); root = undefined; });
function mount(content: React.ReactNode) {
  element = document.createElement("div"); document.body.append(element);
  root = createRoot(element);
  act(() => root!.render(content));
}
function snapshot() {
  let data = createCominsViewportData<Row>({ revision: "a", rowCount: 100, blockSize: 2 });
  for (const startIndex of [0, 50]) {
    const request: CominsViewportRequest = { startIndex, endIndex: startIndex + 2, requestId: String(startIndex), revision: "a", signal: new AbortController().signal, retainRange: { startIndex: 0, endIndex: 2 } };
    data = reduceCominsViewportData(data, { type: "request", request });
    data = reduceCominsViewportData(data, { type: "success", request, rows: [{ id: startIndex, name: `Row ${startIndex}` }, { id: startIndex + 1, name: `Row ${startIndex + 1}` }] });
  }
  return data;
}
function press(element: Element, key: string) {
  act(() => element.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, ctrlKey: true, key })));
}

describe("viewport Table integration", () => {
  it("cancels scheduled requests on range exit, revision reset and unmount without restarting late completions", async () => {
    const requests: CominsViewportRequest[] = [];
    const finish: Array<() => void> = [];
    const onRequest = (request: CominsViewportRequest) => {
      requests.push(request);
      return new Promise<void>(resolve => { finish.push(resolve); });
    };
    const initial = createCominsViewportData<Row>({ revision: "a", rowCount: 100, blockSize: 2 });
    function Harness({ data, start = 0 }: { data: CominsViewportData<Row>; start?: number }) {
      useCominsViewportRequests({ data, range: { startIndex: start, endIndex: start + 8 }, onRequest });
      return null;
    }
    await act(async () => { mount(<Harness data={initial} />); });
    expect(requests.map(request => request.startIndex)).toEqual([0, 2]);
    await act(async () => { root!.render(<Harness data={initial} start={8} />); });
    expect(requests.slice(0, 2).every(request => request.signal.aborted)).toBe(true);
    expect(requests.slice(2).map(request => request.startIndex)).toEqual([8, 10]);
    const next = createCominsViewportData<Row>({ revision: "b", rowCount: 100, blockSize: 2 });
    await act(async () => { root!.render(<Harness data={next} start={8} />); });
    expect(requests.slice(2, 4).every(request => request.signal.aborted)).toBe(true);
    expect(requests.slice(4).map(request => request.revision)).toEqual(["b", "b"]);
    act(() => { root!.unmount(); root = undefined; });
    expect(requests.every(request => request.signal.aborted)).toBe(true);
    await act(async () => { finish.forEach(resolve => resolve()); });
    expect(requests).toHaveLength(6);
  });
  it("waits for explicit retry after an acknowledged error", async () => {
    const initial = createCominsViewportData<Row>({ revision: "a", rowCount: 2, blockSize: 2 });
    const requests: CominsViewportRequest[] = [];
    let retry!: (index: number) => void;
    let finishRetry!: () => void;
    const onRequest = (request: CominsViewportRequest) => {
      requests.push(request);
      if (requests.length > 1) return new Promise<void>(resolve => { finishRetry = resolve; });
    };
    function Harness({ data }: { data: CominsViewportData<Row> }) {
      retry = useCominsViewportRequests({ data, range: { startIndex: 0, endIndex: 2 }, onRequest });
      return null;
    }
    await act(async () => { mount(<Harness data={initial} />); });
    const request = requests[0]!;
    const failed = reduceCominsViewportData(reduceCominsViewportData(initial, { type: "request", request }), { type: "error", request });
    await act(async () => { root!.render(<Harness data={failed} />); });
    expect(requests).toHaveLength(1);
    await act(async () => { retry(1); });
    expect(requests).toHaveLength(2);
    expect(requests[1]?.requestId).not.toBe(request.requestId);
    expect(requests[1]?.startIndex).toBe(0);
    act(() => { root!.unmount(); root = undefined; });
    expect(request.signal.aborted).toBe(false);
    expect(requests[1]?.signal.aborted).toBe(true);
    await act(async () => { finishRetry(); });
  });
  it("does not apply a consumer response from the previous query snapshot", async () => {
    let current!: ReturnType<typeof useCominsViewport<Row>>;
    let finish!: (rows: readonly Row[]) => void;
    const getRows = () => new Promise<readonly Row[]>(resolve => { finish = resolve; });
    function Harness({ queryKey }: { queryKey: string }) {
      current = useCominsViewport<Row>({ rowCount: 2, blockSize: 2, queryKey, getRows });
      return null;
    }
    await act(async () => { mount(<Harness queryKey="a" />); });
    const request: CominsViewportRequest = { revision: "a", requestId: "old", startIndex: 0, endIndex: 2, retainRange: { startIndex: 0, endIndex: 2 }, signal: new AbortController().signal };
    let pending!: Promise<void>;
    act(() => { pending = current.tableProps.onViewportRequest(request); });
    await act(async () => { root!.render(<Harness queryKey="b" />); });
    await act(async () => { finish([{ id: 0, name: "Stale" }, { id: 1, name: "Stale" }]); await pending; });
    expect(current.data.revision).toBe("b");
    expect(current.data.blocks).toEqual([]);
    expect(current.data.requests).toEqual([]);
  });
  it("renders skeletons without business callbacks and selects loaded absolute indexes", () => {
    const renderer = vi.fn(({ row }: { row: { id: string | number; dataIndex: number } }) => `${row.id}:${row.dataIndex}`);
    const getRowHeight = vi.fn(() => 36);
    const onChangeSelection = vi.fn();
    const ref = createRef<CominsTableRef<Row>>();
    mount(<CominsTable data={snapshot()} columns={[{ field: "name", label: "Name", cell: { renderer } }]} getRowId={id} getRowHeight={getRowHeight} viewportDatasource={{ revision: "a" }} onViewportRequest={() => {}} onChangeSelection={onChangeSelection} ref={ref} />);
    expect(element.querySelectorAll("[data-testid='viewport-placeholder']").length).toBeGreaterThan(0);
    expect(renderer.mock.calls.every(([params]) => params.row.id === 0 || params.row.id === 1)).toBe(true);
    expect(getRowHeight.mock.calls.length).toBeGreaterThan(0);
    act(() => ref.current!.setSelectedRows([50, 99]));
    expect(onChangeSelection.mock.calls.at(-1)?.[0].rowIds).toEqual([50]);
    expect(ref.current!.getSelectedRows()).toEqual([{ id: 50, name: "Row 50" }]);
    expect(ref.current!.getSelection().rowIds).toEqual([50]);
    expect(ref.current!.getSelectedCells()).toEqual([]);
    act(() => ref.current!.setSortModel([{ columnId: "name", direction: "desc" }]));
    expect(ref.current!.getSortModel()).toEqual([]);
  });
  it("pastes into a loaded cell without replacing another cached block", () => {
    const initial = snapshot();
    let changed: CominsViewportData<Row> | undefined;
    function Example() {
      const [data, setData] = useState(initial);
      return <CominsTable data={data} columns={[{ field: "name", label: "Name" }]} getRowId={id} viewportDatasource={{ revision: "a" }} onViewportRequest={() => {}} onChangeData={next => { if (next.changes.length) changed = next; setData(next); }} />;
    }
    mount(<Example />);
    press(element.querySelector("[data-testid='cell-0-name']")!, "c");
    press(element.querySelector("[data-testid='cell-1-name']")!, "v");
    expect(changed?.blocks.find(block => block.startIndex === 0)?.rows[1]?.name).toBe("Row 0");
    expect(changed?.blocks.find(block => block.startIndex === 50)).toBe(initial.blocks.find(block => block.startIndex === 50));
    expect(changed?.changes.map(change => change.index)).toEqual([1]);
  });
  it("the convenience hook acknowledges successful requests and releases cancelled requests", async () => {
    const getRows = vi.fn(async ({ startIndex, endIndex }: CominsViewportRequest) => Array.from({ length: endIndex - startIndex }, (_, offset) => ({ id: startIndex + offset, name: "Loaded" })));
    function Example() {
      const viewport = useCominsViewport({ rowCount: 100, queryKey: "a", getRows });
      return <CominsTable {...viewport.tableProps} columns={[{ field: "name", label: "Name" }]} getRowId={id} />;
    }
    await act(async () => { mount(<Example />); });
    expect(element.querySelector("[data-testid='row-0']")?.textContent).toContain("Loaded");
    expect(getRows).toHaveBeenCalledTimes(1);
  });
  it("passes absolute indexes to clipboard props and nested guards", async () => {
    let changed: CominsViewportData<Row> | undefined;
    function Example() {
      const [data, setData] = useState(snapshot());
      return <CominsTable data={data} buffer-size={100} columns={[{ field: "name", label: "Name", cell: { props: ({ row }) => ({ copyable: row.dataIndex >= 50, pasteable: ({ row }) => row.index >= 50 }) } }]} getRowId={id} viewportDatasource={{ revision: "a" }} onViewportRequest={() => {}} onChangeData={next => { if (next.changes.length) changed = next; setData(next); }} />;
    }
    await act(async () => { mount(<Example />); });
    press(element.querySelector("[data-testid='cell-50-name']")!, "c");
    press(element.querySelector("[data-testid='cell-51-name']")!, "v");
    expect(changed?.changes[0]).toEqual({ index: 51, row: { id: 51, name: "Row 50" } });
  });
});
