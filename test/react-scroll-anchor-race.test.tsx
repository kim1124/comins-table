// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { CominsTable } from "../src";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root: ReturnType<typeof createRoot> | undefined;
let host: HTMLDivElement | undefined;
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = undefined;
  host = undefined;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function setup() {
  const observers: { callback: ResizeObserverCallback; elements: Set<Element> }[] = [];
  vi.stubGlobal("ResizeObserver", class {
    record: (typeof observers)[number];
    constructor(callback: ResizeObserverCallback) {
      this.record = { callback, elements: new Set() };
      observers.push(this.record);
    }
    observe(element: Element) { this.record.elements.add(element); }
    unobserve(element: Element) { this.record.elements.delete(element); }
    disconnect() { this.record.elements.clear(); }
  });
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { callback(0); return 1; });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  const rows = Array.from({ length: 30 }, (_, id) => ({ id, name: `Row ${id}` }));
  act(() => root!.render(<CominsTable
    buffer-size={30} columns={[{ field: "name", label: "Name" }]} data={rows}
    data-testid="anchor-race" estimatedRowDetailHeight={300} expandedRowIds={[0]}
    getRowDetailHeight={() => "auto"} getRowId={row => row.id}
    onChangeExpandedRowIds={() => undefined} renderRowDetail={() => <span>Detail</span>}
    rowHeight={36} virtualized
  />));
  const viewport = host.querySelector<HTMLElement>('[data-testid="anchor-race"]')!;
  const detail = host.querySelector<HTMLElement>('[data-testid="row-detail-content-0"]')!;
  const sizer = host.querySelector<HTMLElement>(".comins-table__body-virtual-sizer")!;
  vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue({ width: 800, height: 180 } as DOMRect);
  vi.spyOn(detail, "getBoundingClientRect").mockReturnValue({ width: 800, height: 300 } as DOMRect);
  let assigned = 600;
  Object.defineProperties(viewport, {
    clientHeight: { configurable: true, value: 180 },
    scrollHeight: { configurable: true, get: () => Number.parseFloat(sizer.style.height) },
    scrollTop: {
      configurable: true,
      get: () => Math.min(assigned, Math.max(0, Number.parseFloat(sizer.style.height) - 180)),
      set: (value: number) => { assigned = value; },
    },
  });
  const emit = (target: Element, height: number) => {
    const observer = observers.find(item => item.elements.has(target));
    expect(observer).toBeDefined();
    observer!.callback([{ target, borderBoxSize: [{ blockSize: height, inlineSize: 800 }], contentRect: { width: 800, height } } as unknown as ResizeObserverEntry], {} as ResizeObserver);
  };
  act(() => emit(viewport, 180));
  act(() => viewport.dispatchEvent(new Event("scroll", { bubbles: true })));
  return { viewport, detail, emit };
}

it.each([0, 200])("preserves a newer scroll to %i before its scroll event is delivered", position => {
  const { viewport, detail, emit } = setup();
  act(() => {
    emit(detail, 420);
    // 보정이 예약된 뒤 발생한 스크롤은 이벤트 전달 전에도 이전 앵커보다 우선한다.
    viewport.scrollTop = position;
  });
  expect(viewport.scrollTop).toBe(position);
});

it("still compensates for a height change when no newer scroll occurred", () => {
  const { viewport, detail, emit } = setup();
  act(() => emit(detail, 420));
  expect(viewport.scrollTop).toBe(720);
});

it("accepts the browser bottom clamp when content becomes shorter", () => {
  const { viewport, detail, emit } = setup();
  act(() => emit(detail, 420));
  act(() => {
    viewport.scrollTop = viewport.scrollHeight - viewport.clientHeight;
    viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  act(() => emit(detail, 300));
  expect(viewport.scrollTop).toBe(viewport.scrollHeight - viewport.clientHeight);
});
