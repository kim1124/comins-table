// @vitest-environment jsdom
import { act, createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CominsTable, type CominsTableRef } from "../src";

const dispatchObservation = vi.hoisted(() => ({
  unmounting: false,
  callsDuringUnmount: [] as string[],
  totalCalls: 0,
  wrappers: new WeakMap<object, (action: unknown) => void>(),
}));

// 실제 React 상태 처리는 유지하고, 제품의 unmount 중 dispatch만 관찰한다.
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useState: ((initial: unknown) => {
      const [value, dispatch] = actual.useState(initial);
      let observed = dispatchObservation.wrappers.get(dispatch);
      if (!observed) {
        observed = action => {
          dispatchObservation.totalCalls++;
          if (dispatchObservation.unmounting) {
            dispatchObservation.callsDuringUnmount.push(new Error("Unmount dispatch").stack ?? "");
          }
          dispatch(action);
        };
        dispatchObservation.wrappers.set(dispatch, observed);
      }
      return [value, observed];
    }) as typeof actual.useState,
  };
});

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
type Row = { id: string; name: string };
let root: Root | null;
let host: HTMLDivElement;
let originalHitTest: PropertyDescriptor | undefined;
const rows: Row[] = [{ id: "a", name: "First" }, { id: "b", name: "Second" }];

beforeEach(() => {
  dispatchObservation.unmounting = false;
  dispatchObservation.callsDuringUnmount.length = 0;
  dispatchObservation.totalCalls = 0;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  originalHitTest = Object.getOwnPropertyDescriptor(document, "elementFromPoint");
  // jsdom에 없는 hit testing만 실제 테이블 셀로 연결한다.
  Object.defineProperty(document, "elementFromPoint", {
    configurable: true,
    value: () => host.querySelector("[data-testid='cell-a-name']"),
  });
});
afterEach(() => {
  dispatchObservation.unmounting = false;
  act(() => root?.unmount());
  host.remove();
  if (originalHitTest) Object.defineProperty(document, "elementFromPoint", originalHitTest);
  else Reflect.deleteProperty(document, "elementFromPoint");
  vi.restoreAllMocks();
});

function beginDrag() {
  const afterDrag = vi.fn();
  const beforeDrag = vi.fn();
  const ref = createRef<CominsTableRef<Row>>();
  const added = vi.spyOn(window, "addEventListener");
  const removed = vi.spyOn(window, "removeEventListener");
  act(() => root!.render(<CominsTable
    columns={[{ field: "name", label: "Name" }]}
    data={rows}
    getRowId={row => row.id}
    onAfterDragRow={afterDrag}
    onBeforeRowDrag={beforeDrag}
    ref={ref}
    rowProps={{ draggable: true }}
  />));
  const handle = host.querySelector("[data-testid='row-drag-handle-a']");
  expect(handle).not.toBeNull();
  act(() => handle!.dispatchEvent(new MouseEvent("pointerdown", {
    bubbles: true, cancelable: true, button: 0, buttons: 1, clientX: 10, clientY: 10,
  })));
  expect(beforeDrag).toHaveBeenCalledTimes(1);
  expect(afterDrag).not.toHaveBeenCalled();
  const listeners = added.mock.calls.filter(([name]) =>
    ["pointermove", "pointerup", "pointercancel", "blur", "keydown"].includes(name));
  expect(listeners.map(([name]) => name)).toEqual([
    "pointermove", "pointerup", "pointercancel", "blur", "keydown",
  ]);
  return { afterDrag, ref, listeners, removed };
}

it("cancels an active row drag on unmount without enqueueing render state", () => {
  const { afterDrag, ref, listeners, removed } = beginDrag();
  dispatchObservation.unmounting = true;
  try { act(() => root!.unmount()); } finally { dispatchObservation.unmounting = false; root = null; }
  expect(ref.current).toBeNull();
  expect(afterDrag).toHaveBeenCalledTimes(1);
  expect(afterDrag.mock.calls[0][0]).toMatchObject({ result: "cancelled", reason: "pointer-cancel" });
  for (const [name, listener] of listeners) expect(removed).toHaveBeenCalledWith(name, listener);
  expect(dispatchObservation.callsDuringUnmount).toEqual([]);
});

it("still resets render state and cancels the gesture while mounted", () => {
  const { afterDrag, ref, listeners, removed } = beginDrag();
  const before = dispatchObservation.totalCalls;
  act(() => window.dispatchEvent(new MouseEvent("pointercancel", { bubbles: true })));
  expect(dispatchObservation.totalCalls).toBeGreaterThan(before);
  expect(ref.current).not.toBeNull();
  expect(afterDrag).toHaveBeenCalledTimes(1);
  expect(afterDrag.mock.calls[0][0]).toMatchObject({ result: "cancelled", reason: "pointer-cancel" });
  for (const [name, listener] of listeners) expect(removed).toHaveBeenCalledWith(name, listener);
});
