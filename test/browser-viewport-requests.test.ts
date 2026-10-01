import { describe, expect, it, vi } from "vitest";
const modules = import.meta.glob("../src/browser/viewport-requests.ts", { eager: true });
function browser() {
  expect(modules["../src/browser/viewport-requests.ts"], "browser viewport executor").toBeDefined();
  return modules["../src/browser/viewport-requests.ts"] as typeof import("../src/browser/viewport-requests");
}
const descriptor = (requestId = "r") => ({ requestId, revision: "a", startIndex: 0, endIndex: 2, retainRange: { startIndex: 0, endIndex: 2 } });
const flush = async () => { for (let index = 0; index < 8; index++) await Promise.resolve(); };
describe("Browser request executor", () => {
  it("cancels before execution and suppresses settlement after cancellation or disposal", async () => {
    const requests: AbortSignal[] = [];
    const settled: string[] = [];
    let finish!: () => void;
    const executor = browser().createViewportRequestExecutor({ onRequest: request => { requests.push(request.signal); return new Promise<void>(resolve => { finish = resolve; }); }, onSettled: id => { settled.push(id); } });
    executor.start(descriptor()); executor.cancel("r"); await flush();
    expect(requests).toEqual([]);
    executor.start(descriptor("running")); await flush();
    executor.dispose(); executor.dispose(); finish(); await flush();
    expect(requests[0]?.aborted).toBe(true);
    expect(settled).toEqual([]);
    executor.start(descriptor("after-dispose")); await flush();
    expect(requests).toHaveLength(1);
  });
  it("settles rejected callbacks without a new error channel, and releases acknowledged controllers without abort", async () => {
    let signal!: AbortSignal;
    const settled: string[] = [];
    const executor = browser().createViewportRequestExecutor({ onRequest: request => { signal = request.signal; return Promise.reject(new Error("controlled consumer owns error state")); }, onSettled: id => { settled.push(id); } });
    executor.start(descriptor()); await flush();
    expect(settled).toEqual(["r"]);
    executor.release("r"); executor.dispose();
    expect(signal.aborted).toBe(false);
  });
  it("still aborts a completed but unacknowledged request on range exit", async () => {
    let signal!: AbortSignal;
    const executor = browser().createViewportRequestExecutor({ onRequest: request => { signal = request.signal; }, onSettled() {} });
    executor.start(descriptor()); await flush(); executor.cancel("r");
    expect(signal.aborted).toBe(true);
  });
});

describe("consumer getRows execution", () => {
  it("dispatches sync success and removes its abort listener", async () => {
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, "removeEventListener");
    const events: string[] = [];
    await browser().runViewportRequest({ request: { ...descriptor(), signal: controller.signal }, getRows: () => [{ id: 1 }, { id: 2 }], dispatch: event => { events.push(event.type); if (event.type === "success") expect(event.rows).toEqual([{ id: 1 }, { id: 2 }]); } });
    controller.abort();
    expect(events).toEqual(["request", "success"]);
    expect(remove).toHaveBeenCalledTimes(1);
  });
  it("dispatches cancel instead of stale success and removes the listener after completion", async () => {
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, "removeEventListener");
    const events: string[] = [];
    let finish!: (rows: readonly number[]) => void;
    const pending = browser().runViewportRequest({ request: { ...descriptor(), signal: controller.signal }, getRows: () => new Promise<readonly number[]>(resolve => { finish = resolve; }), dispatch: event => { events.push(event.type); } });
    controller.abort(); finish([1, 2]); await pending;
    expect(events).toEqual(["request", "cancel"]);
    expect(remove).toHaveBeenCalledTimes(1);
  });
  it("ignores pre-aborted starts and maps a synchronous throw to an error event", async () => {
    const controller = new AbortController(); controller.abort();
    const events: string[] = [];
    let calls = 0;
    const getRows = () => { calls++; throw new Error("failed"); };
    await browser().runViewportRequest({ request: { ...descriptor(), signal: controller.signal }, getRows, dispatch: event => { events.push(event.type); } });
    expect(calls).toBe(0); expect(events).toEqual([]);
    await browser().runViewportRequest({ request: { ...descriptor(), signal: new AbortController().signal }, getRows, dispatch: event => { events.push(event.type); } });
    expect(events).toEqual(["request", "error"]);
  });
});
