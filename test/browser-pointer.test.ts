// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
const modules = import.meta.glob("../src/browser/pointer.ts", { eager: true });
function browser() {
  expect(modules["../src/browser/pointer.ts"], "Browser pointer ownership").toBeDefined();
  return modules["../src/browser/pointer.ts"] as typeof import("../src/browser/pointer");
}
afterEach(() => vi.restoreAllMocks());
it("captures and releases the exact pointer once, tolerating detached controls", () => {
  const held = new Set<number>();
  const element = { setPointerCapture: (id: number) => held.add(id), releasePointerCapture: (id: number) => held.delete(id) };
  const release = browser().captureCominsPointer(element, 7);
  expect([...held]).toEqual([7]); release(); release(); expect([...held]).toEqual([]);
  expect(() => browser().captureCominsPointer({ setPointerCapture() { throw Error("detached"); }, releasePointerCapture() { throw Error("detached"); } }, 1)()).not.toThrow();
});
it("removes pointer and capture-phase keyboard listeners when a gesture stops", () => {
  const events: string[] = [];
  const stop = browser().registerCominsPointerListeners({ move: () => events.push("move"), up: () => events.push("up"), cancel: () => events.push("cancel"), blur: () => events.push("blur"), key: () => events.push("key"), keyCapture: true });
  for (const name of ["pointermove", "pointerup", "pointercancel", "blur", "keydown"]) window.dispatchEvent(new Event(name));
  expect(events).toEqual(["move", "up", "cancel", "blur", "key"]);
  stop(); stop(); window.dispatchEvent(new Event("pointermove")); window.dispatchEvent(new Event("keydown")); expect(events).toHaveLength(5);
});
it("cancels its frame and cannot resurrect when cleanup occurs within a tick", () => {
  const pending = new Map<number, FrameRequestCallback>(); let id = 0, calls = 0;
  const host = { requestAnimationFrame: (cb: FrameRequestCallback) => { pending.set(++id, cb); return id; }, cancelAnimationFrame: (id: number) => { pending.delete(id); } };
  const stop = browser().startCominsPointerFrames(() => { calls++; stop(); }, host);
  const tick = pending.get(1)!; pending.delete(1); tick(10);
  expect(calls).toBe(1); expect(pending.size).toBe(0); stop();
  const stopBefore = browser().startCominsPointerFrames(() => { calls++; }, host); stopBefore(); expect(pending.size).toBe(0);
});
