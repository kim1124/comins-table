// @vitest-environment jsdom
import { act, StrictMode, Suspense, useLayoutEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CominsTable } from "../src";

const observation = vi.hoisted(() => ({
  retired: false,
  retiredDispatches: 0,
  mountedDispatches: 0,
  wrappers: new WeakMap<object, (action: unknown) => void>(),
}));
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, useState: ((initial: unknown) => {
    const [value, dispatch] = actual.useState(initial);
    let observed = observation.wrappers.get(dispatch);
    if (!observed) {
      observed = action => {
        if (observation.retired) observation.retiredDispatches++;
        else observation.mountedDispatches++;
        dispatch(action);
      };
      observation.wrappers.set(dispatch, observed);
    }
    return [value, observed];
  }) as typeof actual.useState };
});

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const data = Array.from({ length: 100 }, (_, id) => ({ id, name: `Row ${id}` }));
const columns = [{ field: "name" as const, label: "Name" }];
const blocked = new Promise<void>(() => {});
let root: Root;
let host: HTMLDivElement;
let nextFrame: number;
let frames: Map<number, { callback: FrameRequestCallback; scroll: boolean }>;
function table() {
  return <CominsTable data={data} columns={columns} getRowId={row => row.id} virtualized
    rowHeight={36} buffer-size={0} data-testid="scroll-owner" />;
}
function flushFrames() {
  for (let pass = 0; frames.size; pass++) {
    if (pass > 20) throw new Error("Frames did not settle");
    const pending = [...frames]; frames.clear();
    for (const [, frame] of pending) frame.callback(0);
  }
}
function pendingScrollFrames() { return [...frames.values()].filter(frame => frame.scroll); }
function scroll(top = 720) {
  const viewport = host.querySelector<HTMLDivElement>('[data-testid="scroll-owner"]')!;
  act(() => { viewport.scrollTop = top; viewport.dispatchEvent(new Event("scroll", { bubbles: true })); });
  expect(pendingScrollFrames()).toHaveLength(1);
}
beforeEach(() => {
  observation.retired = false;
  observation.retiredDispatches = observation.mountedDispatches = 0;
  frames = new Map(); nextFrame = 0;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => {
    const id = ++nextFrame;
    frames.set(id, { callback, scroll: (new Error().stack ?? "").includes("handleBodyScroll") });
    return id;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(id => { frames.delete(id); });
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 800, height: 180 } as DOMRect);
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(() => {
  observation.retired = false;
  act(() => root.unmount());
  host.remove(); frames.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});
it("cancels a queued virtual scroll frame before replacement layout can run it", () => {
  function App({ show }: { show: boolean }) {
    useLayoutEffect(() => {
      if (!show) {
        observation.retired = true;
        // The separate browser diagnosis verifies this native RAF ordering.
        flushFrames();
      }
    }, [show]);
    return show ? table() : <div>Table-free page</div>;
  }
  act(() => { root.render(<App show />); });
  act(flushFrames);
  scroll();
  act(() => { root.render(<App show={false} />); });
  expect(observation.retiredDispatches).toBe(0);
});
it.each([false, true])("commits mounted scroll with StrictMode=%s", strict => {
  act(() => { root.render(strict ? <StrictMode>{table()}</StrictMode> : table()); });
  act(flushFrames);
  const before = observation.mountedDispatches;
  scroll();
  act(flushFrames);
  expect(observation.mountedDispatches).toBeGreaterThan(before);
  expect(Number(host.querySelector("tr[data-comins-row-data-index]")!.getAttribute("data-comins-row-data-index"))).toBeGreaterThan(0);
});
it("restores the DOM scroll position after actual Suspense hide and reveal", () => {
  function Blocker({ suspend }: { suspend: boolean }) { if (suspend) throw blocked; return null; }
  const content = (suspend: boolean) => <Suspense fallback={<div>Suspended</div>}>
    {table()}<Blocker suspend={suspend} />
  </Suspense>;
  act(() => { root.render(content(false)); });
  act(flushFrames);
  scroll();
  act(() => { root.render(content(true)); });
  expect(host.textContent).toContain("Suspended");
  expect(pendingScrollFrames()).toHaveLength(0);
  act(() => { root.render(content(false)); });
  act(flushFrames);
  expect(host.querySelector<HTMLDivElement>('[data-testid="scroll-owner"]')!.scrollTop).toBe(720);
  scroll(1080);
  act(flushFrames);
  expect(host.querySelector<HTMLDivElement>('[data-testid="scroll-owner"]')!.scrollTop).toBe(1080);
  expect(Number(host.querySelector("tr[data-comins-row-data-index]")!.getAttribute("data-comins-row-data-index"))).toBeGreaterThan(0);
});
