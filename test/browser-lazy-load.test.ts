import { describe, expect, it, vi } from "vitest";
import { settleRequestCompletion } from "../src/browser/viewport-requests";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

describe("lazy consumer completion lifetime", () => {
  it("releases the aborted completion owner while the external Promise remains pending", () => {
    // 독립 GC 프로세스에서 abort Event의 오류 스택을 통한 보유도 검출한다.
    const output = execFileSync(process.execPath, ["--expose-gc", resolve("test/fixtures/lazy-load-lifetime.mjs")], { encoding: "utf8", timeout: 5_000 });
    expect(JSON.parse(output)).toEqual({ retainedBeforeSourceSettlement: false });
  });

  it("finishes cancellation and removes its listener without waiting for the consumer", async () => {
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, "removeEventListener");
    const settled = vi.fn();
    const waiting = settleRequestCompletion(new Promise<void>(() => {}), controller.signal, settled);
    controller.abort();
    await waiting;
    expect(settled).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it.each(["resolve", "reject"])("ignores late %s after cancellation", async completion => {
    const controller = new AbortController();
    let resolve!: () => void;
    let reject!: (error: Error) => void;
    const source = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
    const settled = vi.fn();
    const waiting = settleRequestCompletion(source, controller.signal, settled);
    controller.abort();
    await waiting;
    if (completion === "resolve") resolve();
    else reject(new Error("late consumer error"));
    await Promise.resolve();
    await Promise.resolve();
    expect(settled).not.toHaveBeenCalled();
  });

  it.each(["void", "resolve", "reject"])("settles active %s work exactly once and removes the listener", async completion => {
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, "removeEventListener");
    const settled = vi.fn();
    const result = completion === "void" ? undefined : completion === "resolve" ? Promise.resolve() : Promise.reject(new Error("consumer error"));
    await settleRequestCompletion(result, controller.signal, settled);
    controller.abort();
    expect(settled).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("consumes a rejection even for an already aborted request", async () => {
    const controller = new AbortController();
    controller.abort();
    const settled = vi.fn();
    await settleRequestCompletion(Promise.reject(new Error("aborted source")), controller.signal, settled);
    expect(settled).not.toHaveBeenCalled();
  });

  it("suppresses completion when abort races with source resolution", async () => {
    const controller = new AbortController();
    const settled = vi.fn();
    const waiting = settleRequestCompletion(Promise.resolve(), controller.signal, settled);
    controller.abort();
    await waiting;
    expect(settled).not.toHaveBeenCalled();
  });
});
