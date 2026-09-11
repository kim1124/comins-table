// @vitest-environment jsdom
import { act, createRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CominsTable, createCominsViewportData, reduceCominsViewportData, useCominsViewport, type CominsViewportData, type CominsViewportRequest, type CominsTableRef } from "../src";

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
