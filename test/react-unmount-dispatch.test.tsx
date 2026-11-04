// @vitest-environment jsdom
import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { CominsTable } from "../src";

// React 19 does not warn about unmounted setState. Record the actual dispatch boundary.
const retirement = vi.hoisted(() => ({ active: false, writes: [] as unknown[], setters: new WeakMap<object, unknown>() }));
vi.mock("react", async original => {
  const actual = await original<typeof import("react")>();
  return { ...actual, useState: ((initial: unknown) => {
    const [value, dispatch] = actual.useState(initial);
    let tracked = retirement.setters.get(dispatch);
    if (!tracked) {
      tracked = (next: unknown) => {
        if (retirement.active) retirement.writes.push(next);
        dispatch(next);
      };
      retirement.setters.set(dispatch, tracked);
    }
    return [value, tracked];
  }) as typeof actual.useState };
});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement;
afterEach(() => {
  retirement.active = false;
  act(() => root?.unmount()); root = undefined;
  container?.remove(); retirement.writes.length = 0;
  vi.unstubAllGlobals();
});
const data = [{ id: "a", name: "Alpha" }];
const columns = [{ field: "name", label: "Name" }];
function mount(strict = false) {
  container = document.createElement("div"); document.body.append(container);
  root = createRoot(container);
  const table = <CominsTable data={data} columns={columns} getRowId={row => row.id} />;
  act(() => root!.render(strict ? <StrictMode>{table}</StrictMode> : table));
  expect(container.querySelector('[data-testid="cell-a-name"]')?.textContent).toBe("Alpha");
}
it("does not enqueue table state updates during unmount", () => {
  mount();
  retirement.active = true;
  act(() => root!.unmount()); root = undefined;
  retirement.active = false;
  expect(retirement.writes).toEqual([]);
});
it("disconnects the viewport observer before its element is removed, including StrictMode replay", () => {
  const retiredConnected: boolean[] = [], observed: HTMLElement[] = [];
  vi.stubGlobal("ResizeObserver", class {
    target?: HTMLElement;
    observe(element: HTMLElement) { this.target = element; observed.push(element); }
    disconnect() { if (this.target) retiredConnected.push(this.target.isConnected); }
    unobserve() {}
  });
  mount(true);
  expect(observed.length).toBeGreaterThan(0);
  retirement.active = true;
  act(() => root!.unmount()); root = undefined;
  retirement.active = false;
  expect(retiredConnected.length).toBeGreaterThan(0);
  expect(retiredConnected.every(Boolean)).toBe(true);
  expect(retirement.writes).toEqual([]);
});
