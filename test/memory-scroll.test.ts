// @vitest-environment jsdom
import { EventEmitter } from "node:events";
import type { CDPSession } from "@playwright/test";
import { afterEach, expect, it, vi } from "vitest";
import { createMemoryScroller } from "./playwright/helpers/memory-scroll";

type Call = { functionDeclaration?: string; arguments?: { value: number }[]; executionContextId?: number; returnByValue?: boolean; awaitPromise?: boolean; userGesture?: boolean };
class Session extends EventEmitter {
  execute = false;
  exception = false;
  enableError = false;
  contexts = [
    { id: 20, auxData: { frameId: "other", isDefault: true } },
    { id: 30, auxData: { frameId: "main", isDefault: false } },
    { id: 40, auxData: { frameId: "main", isDefault: true } },
  ];
  send = vi.fn(async (method: string, params?: Call) => {
    if (method === "Page.getFrameTree") return { frameTree: { frame: { id: "main" } } };
    if (method === "Runtime.enable") {
      if (this.enableError) throw new Error("enable failed");
      for (const context of this.contexts) this.emit("Runtime.executionContextCreated", { context });
      return {};
    }
    if (method === "Runtime.callFunctionOn") {
      if (this.exception) return { exceptionDetails: { text: "scroll exception" } };
      if (this.execute) {
        const run = new Function(`return (${params!.functionDeclaration})`)() as (fraction: number) => Promise<void>;
        try { await run(params!.arguments![0]!.value); }
        catch (error) { return { exceptionDetails: { text: String(error) } }; }
      }
      return { result: { type: "undefined" } };
    }
    throw new Error(`Unexpected method ${method}`);
  });
  cdp() { return this as unknown as CDPSession; }
}
afterEach(() => { document.body.replaceChildren(); vi.unstubAllGlobals(); });
function viewport(range = 900) {
  const element = document.createElement("div"); element.dataset.testid = "data-table-viewport";
  Object.defineProperties(element, { scrollHeight: { value: 100 + range }, clientHeight: { value: 100 } });
  document.body.append(element); return element;
}
it("uses only the main default context and primitive fraction arguments", async () => {
  const session = new Session(), driver = await createMemoryScroller(session.cdp());
  await driver.scroll(.5);
  expect(session.send).toHaveBeenLastCalledWith("Runtime.callFunctionOn", expect.objectContaining({
    executionContextId: 40, arguments: [{ value: .5 }], returnByValue: true, awaitPromise: true, userGesture: true,
  }));
  driver.dispose();
  expect(session.eventNames()).toHaveLength(0);
  expect(session.send.mock.calls.some(([method]) => method === "Runtime.disable")).toBe(false);
  await expect(driver.scroll(0)).rejects.toThrow();
});
it.each([NaN, Infinity, -.1, 1.1])("rejects an invalid fraction %s before sending browser work", async fraction => {
  const session = new Session(), driver = await createMemoryScroller(session.cdp());
  await expect(driver.scroll(fraction)).rejects.toThrow();
  expect(session.send.mock.calls.some(([method]) => method === "Runtime.callFunctionOn")).toBe(false);
  driver.dispose();
});
it.each(["destroyed", "cleared", "replacement"])("fails on main-context %s without recovering", async mode => {
  const session = new Session(), driver = await createMemoryScroller(session.cdp());
  if (mode === "destroyed") session.emit("Runtime.executionContextDestroyed", { executionContextId: 40 });
  else if (mode === "cleared") session.emit("Runtime.executionContextsCleared");
  else session.emit("Runtime.executionContextCreated", { context: { id: 41, auxData: { frameId: "main", isDefault: true } } });
  await expect(driver.scroll(0)).rejects.toThrow(); driver.dispose();
});
it("cleans its listeners on initialization failure", async () => {
  const session = new Session(); session.enableError = true;
  await expect(createMemoryScroller(session.cdp())).rejects.toThrow("enable failed");
  expect(session.eventNames()).toHaveLength(0);
});
it("fails without a main default context and propagates CDP exceptions", async () => {
  const absent = new Session(); absent.contexts = [];
  await expect(createMemoryScroller(absent.cdp())).rejects.toThrow(); expect(absent.eventNames()).toHaveLength(0);
  const session = new Session(), driver = await createMemoryScroller(session.cdp()); session.exception = true;
  await expect(driver.scroll(.5)).rejects.toThrow("scroll exception"); driver.dispose();
});
it("runs the original movement, bubbling event, two frames and return-to-zero work", async () => {
  const element = viewport(), session = new Session(); session.execute = true; let frames = 0, events = 0;
  const onScroll = () => events++;
  document.body.addEventListener("scroll", onScroll);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return ++frames; });
  const driver = await createMemoryScroller(session.cdp());
  await driver.scroll(.5); expect(element.scrollTop).toBe(450); expect(frames).toBe(2); expect(events).toBe(1);
  await driver.scroll(0); expect(element.scrollTop).toBe(0); expect(frames).toBe(4); expect(events).toBe(2); driver.dispose(); document.body.removeEventListener("scroll", onScroll);
});
it.each(["missing", "duplicate", "range", "immovable"])("rejects the invalid viewport case %s", async mode => {
  if (mode !== "missing") {
    const element = viewport(mode === "range" ? 0 : 900);
    if (mode === "duplicate") viewport();
    if (mode === "immovable") Object.defineProperty(element, "scrollTop", { get: () => 0, set: () => {} });
  }
  const session = new Session(); session.execute = true;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
  const driver = await createMemoryScroller(session.cdp()); await expect(driver.scroll(.5)).rejects.toThrow(); driver.dispose();
});

it("rejects context invalidation during an awaited browser call", async () => {
  const session = new Session(), driver = await createMemoryScroller(session.cdp());
  const original = session.send.getMockImplementation()!;
  session.send.mockImplementation(async (method, params) => {
    if (method === "Runtime.callFunctionOn") session.emit("Runtime.executionContextDestroyed", { executionContextId: 40 });
    return original(method, params);
  });
  await expect(driver.scroll(.5)).rejects.toThrow("during operation"); driver.dispose();
});

it("fails final verification if the context dies after the last scroll", async () => {
  const session = new Session(), driver = await createMemoryScroller(session.cdp());
  await driver.scroll(0);
  expect(() => driver.verify()).not.toThrow();
  session.emit("Runtime.executionContextDestroyed", { executionContextId: 40 });
  expect(() => driver.verify()).toThrow("context changed");
  driver.dispose();
});
