// @vitest-environment jsdom
import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { CominsTable, type CominsLazyLoadRequest } from "../src";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const columns = [{ field: "name", label: "Name" }] as const;
const rows = [{ id: "owner", name: "Owner" }];
const getRowId = (row: (typeof rows)[number]) => row.id;
let root: Root | undefined;
let host: HTMLDivElement | undefined;
afterEach(() => { act(() => root?.unmount()); root = undefined; host?.remove(); host = undefined; });
function createHost() {
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
}
describe("lazy append cleanup boundary", () => {
  it.each([false, true])("synchronously aborts pending requests and supports StrictMode=%s re-setup", async strict => {
    const requests: CominsLazyLoadRequest[] = [], receivers: unknown[] = [];
    const completions: Array<() => void> = [];
    let aborts = 0;
    function onLazyLoad(this: unknown, request: CominsLazyLoadRequest) {
      receivers.push(this); requests.push(request);
      request.signal.addEventListener("abort", () => { aborts++; });
      return new Promise<void>(resolve => completions.push(resolve));
    }
    createHost();
    const table = <CominsTable columns={columns} data={rows} getRowId={getRowId} lazyLoad lazyLoadMode="append" hasMoreRows={false} onLazyLoad={onLazyLoad} />;
    await act(async () => { root!.render(strict ? <StrictMode>{table}</StrictMode> : table); });
    expect(requests).toHaveLength(strict ? 2 : 1);
    expect(requests.map(request => request.reason)).toEqual(strict ? ["initial", "initial"] : ["initial"]);
    expect(requests.at(-1)!.signal.aborted).toBe(false);
    expect(receivers).toEqual(requests.map(() => undefined));
    expect(aborts).toBe(strict ? 1 : 0);
    act(() => { root!.unmount(); }); root = undefined;
    expect(aborts).toBe(requests.length);
    const nativeDefault = new AbortController(); nativeDefault.abort();
    for (const request of requests) {
      expect(request.signal.aborted).toBe(true);
      expect(request.signal.reason.constructor).toBe(nativeDefault.signal.reason.constructor);
      expect(request.signal.reason.name).toBe("AbortError");
    }
    await act(async () => { completions.forEach(finish => finish()); });
    expect(host!.querySelector("[data-comins-table-instance-id]")).toBeNull();
  });

  it("uses the latest plain callback after a batch-size cleanup and ignores late cancelled completion", async () => {
    const requests: CominsLazyLoadRequest[] = [], receivers: unknown[] = [];
    const finish: Array<() => void> = [];
    function first(this: unknown, request: CominsLazyLoadRequest) { receivers.push(this); requests.push(request); return new Promise<void>(resolve => finish.push(resolve)); }
    function latest(this: unknown, request: CominsLazyLoadRequest) { receivers.push(this); requests.push(request); return new Promise<void>(resolve => finish.push(resolve)); }
    createHost();
    const render = async (size: number, onLazyLoad: typeof first) => {
      await act(async () => { root!.render(<CominsTable columns={columns} data={rows} getRowId={getRowId} lazyLoad lazyLoadMode="append" hasMoreRows={false} lazyLoadBatchSize={size} onLazyLoad={onLazyLoad} />); });
    };
    await render(1, first);
    await render(1, latest);
    expect(requests).toHaveLength(1);
    await render(2, latest);
    expect(requests.map(request => [request.limit, request.signal.aborted])).toEqual([[1, true], [2, false]]);
    await act(async () => { finish[0]!(); });
    expect(requests[1]!.signal.aborted).toBe(false);
    act(() => { root!.unmount(); }); root = undefined;
    expect(requests[1]!.signal.aborted).toBe(true);
    expect(receivers).toEqual([undefined, undefined]);
    await act(async () => { finish[1]!(); });
  });
});
