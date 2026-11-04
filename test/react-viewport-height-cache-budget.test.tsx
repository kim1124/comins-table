// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { CominsTable, createCominsViewportData, reduceCominsViewportData, type CominsViewportRequest } from "../src";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root: ReturnType<typeof createRoot> | undefined;
let host: HTMLDivElement | undefined;
afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  host?.remove();
  host = undefined;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it.each([false, true])("bounds newly measured viewport blocks without another request (protect both: %s)", async protectBoth => {
  const records: { callback: ResizeObserverCallback; targets: Set<Element> }[] = [];
  vi.stubGlobal("ResizeObserver", class {
    record: (typeof records)[number];
    constructor(callback: ResizeObserverCallback) { this.record = { callback, targets: new Set() }; records.push(this.record); }
    observe(element: Element) { this.record.targets.add(element); }
    unobserve(element: Element) { this.record.targets.delete(element); }
    disconnect() { this.record.targets.clear(); }
  });
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { callback(0); return 1; });
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  const columns = [{ field: "name", label: "Name" }];
  const getRowId = (row: { id: number; name: string }) => row.id;
  const getRowHeight = () => "auto" as const;
  let data = createCominsViewportData<{ id: number; name: string }>({ revision: "budget", rowCount: 3, blockSize: 1, cacheSize: protectBoth ? 2 : 1 });
  const load = (index: number, range: { startIndex: number; endIndex: number }) => {
    const request: CominsViewportRequest = { revision: "budget", requestId: String(index), startIndex: index, endIndex: index + 1, signal: new AbortController().signal, retainRange: range };
    data = reduceCominsViewportData(data, { type: "request", request });
    data = reduceCominsViewportData(data, { type: "success", request, rows: [{ id: index, name: "Row " + index }] });
  };
  const render = async () => act(async () => root!.render(<CominsTable columns={columns} data={data} getRowId={getRowId} getRowHeight={getRowHeight} rowHeight={36} estimatedRowHeight={36} buffer-size={10} viewportDatasource={{ revision: "budget", heightCacheSize: 1 }} onViewportRequest={() => {}} data-testid="height-cache-budget" />));
  const measure = async (rowId: number, height: number) => {
    const row = host!.querySelector<HTMLElement>(`[data-testid="row-${rowId}"]`)!;
    expect(row).not.toBeNull();
    vi.spyOn(row, "getBoundingClientRect").mockReturnValue({ width: 800, height } as DOMRect);
    const record = records.find(record => record.targets.has(row));
    expect(record).toBeDefined();
    await act(async () => record!.callback([{ target: row, borderBoxSize: [{ blockSize: height, inlineSize: 800 }], contentRect: { width: 800, height } } as unknown as ResizeObserverEntry], {} as ResizeObserver));
  };
  load(0, { startIndex: 0, endIndex: 1 }); await render(); await measure(0, 72);
  const table = host.querySelector<HTMLElement>(".comins-table")!;
  expect(table.getAttribute("data-comins-viewport-height-blocks")).toBe("1");
  load(1, { startIndex: protectBoth ? 0 : 1, endIndex: 2 }); await render(); await measure(1, 84);
  // 실제 측정 배치 직후 검사한다. 추가 스크롤·요청·렌더로 뒤늦게 정리하지 않는다.
  expect(table.getAttribute("data-comins-viewport-height-blocks")).toBe(protectBoth ? "2" : "1");
  expect(Number.parseFloat(host.querySelector<HTMLElement>(".comins-table__body-virtual-sizer")!.style.height)).toBe(protectBoth ? 192 : 156);
  act(() => root!.unmount()); root = undefined;
  expect(records.every(record => record.targets.size === 0)).toBe(true);
});
