import { afterEach, describe, expect, it, vi } from "vitest";
import { createCominsViewportData, reduceCominsViewportData as reduceCore, type CoreViewportRequest, type CominsViewportData } from "../src/core/viewport/data";
import { reduceCominsViewportData as reduceBrowser } from "../src/viewport-data";
import { runViewportRequest } from "../src/browser/viewport-requests";

type Row = { id: string; payload?: Uint8Array };
const request = (startIndex: number, requestId: string, range = { startIndex, endIndex: startIndex + 1 }): CoreViewportRequest => ({ revision: "r", startIndex, endIndex: startIndex + 1, requestId, retainRange: range });
const starts = (data: CominsViewportData<Row>) => data.blocks.map((block) => block.startIndex);
function scene(patched = false) {
  let data = createCominsViewportData<Row>({ rowCount: 4, revision: "r", blockSize: 1, cacheSize: 1 });
  const first = request(0, "first0"), refresh = request(0, "refresh0"), second = request(1, "first1");
  data = reduceCore(data, { type: "request", request: first });
  data = reduceCore(data, { type: "success", request: first, rows: [{ id: "retired0", payload: new Uint8Array(8192) }] });
  data = reduceCore(data, { type: "request", request: refresh });
  data = reduceCore(data, { type: "request", request: second });
  data = reduceCore(data, { type: "success", request: second, rows: [{ id: "current1" }] });
  const edited: Row = { id: "patched0", payload: new Uint8Array(8192) };
  if (patched) data = reduceCore(data, { type: "patch", changes: [{ index: 0, row: edited }] });
  expect(starts(data)).toEqual([0, 1]);
  return { data, refresh, edited };
}
afterEach(() => vi.restoreAllMocks());
describe("viewport cache budget after request protection ends", () => {
  it.each(["cancel", "superseded-success"])("evicts the unprotected block immediately after %s without mutating the previous snapshot", (mode) => {
    const { data, refresh } = scene(mode === "superseded-success");
    const retained = data.blocks.find((block) => block.startIndex === 1);
    const next = mode === "cancel" ? reduceCore(data, { type: "cancel", request: refresh }) : reduceCore(data, { type: "success", request: refresh, rows: [{ id: "stale0" }] });
    expect(starts(next)).toEqual([1]);
    expect(next.requests).toEqual([]);
    expect(next.blocks[0]).toBe(retained);
    expect(next.changes).toEqual([]);
    expect(next.version).toBe(data.version);
    expect(next.clock).toBe(data.clock);
    expect(next.retainRange).toBe(data.retainRange);
    expect(reduceCore(next, { type: "retain", range: { startIndex: 1, endIndex: 2 } })).toBe(next);
    expect(starts(data)).toEqual([0, 1]);
    expect(data.requests.map((entry) => entry.requestId)).toEqual(["refresh0"]);
  });
  it("still protects the current screen and another loading request beyond a small budget", () => {
    const { data } = scene();
    const cancelled = request(2, "cancel2", { startIndex: 1, endIndex: 2 });
    const pending = reduceCore(data, { type: "request", request: cancelled });
    const next = reduceCore(pending, { type: "cancel", request: cancelled });
    expect(starts(next)).toEqual([0, 1]);
    expect(next.requests.map((entry) => entry.requestId)).toEqual(["refresh0"]);
    expect(next.blocks.every((block) => data.blocks.includes(block))).toBe(true);
  });
  it("keeps a newer local patch when its block is still in the retain range", () => {
    const { data, refresh, edited } = scene(true);
    const current = reduceCore(data, { type: "retain", range: { startIndex: 0, endIndex: 1 } });
    const next = reduceCore(current, { type: "success", request: refresh, rows: [{ id: "stale0" }] });
    expect(starts(next)).toEqual([0]);
    expect(next.blocks[0]?.rows[0]).toBe(edited);
    expect(next.requests).toEqual([]);
    expect(next.version).toBe(current.version);
  });
  it("keeps stale token and revision completions as identity no-ops", () => {
    const { data, refresh } = scene();
    for (const stale of [{ ...refresh, requestId: "old-token" }, { ...refresh, revision: "old-revision" }]) {
      expect(reduceCore(data, { type: "cancel", request: stale })).toBe(data);
      expect(reduceCore(data, { type: "success", request: stale, rows: [{ id: "stale0" }] })).toBe(data);
    }
    expect(data.requests[0]?.requestId).toBe("refresh0");
  });
  it("applies actual abort cancellation through the browser adapter and ignores its late response", async () => {
    const initial = scene();
    let data = initial.data;
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, "removeEventListener");
    const events: string[] = [];
    let finish!: (rows: readonly Row[]) => void;
    const pending = runViewportRequest<Row>({ request: { ...initial.refresh, signal: controller.signal }, getRows: () => new Promise((resolve) => { finish = resolve; }), dispatch: (event) => { events.push(event.type); data = reduceBrowser(data, event); } });
    controller.abort();
    const immediatelyAfterAbort = starts(data);
    finish([{ id: "late0" }]);
    await pending;
    expect(immediatelyAfterAbort).toEqual([1]);
    expect(starts(data)).toEqual([1]);
    expect(data.requests).toEqual([]);
    expect(events).toEqual(["request", "cancel"]);
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
