// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
const modules = import.meta.glob("../src/browser/{measurements,scroll,clipboard}.ts", { eager: true });
function browser() {
  for (const name of ["measurements", "scroll", "clipboard"]) expect(modules[`../src/browser/${name}.ts`], `Browser ${name} boundary`).toBeDefined();
  return { ...modules["../src/browser/measurements.ts"], ...modules["../src/browser/scroll.ts"], ...modules["../src/browser/clipboard.ts"] } as typeof import("../src/browser/measurements") & typeof import("../src/browser/scroll") & typeof import("../src/browser/clipboard");
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); Reflect.deleteProperty(document, "fonts"); document.body.replaceChildren(); });
function resizeHost() {
  const records: Array<{ callback: ResizeObserverCallback; targets: Set<Element> }> = [];
  class Observer {
    record: (typeof records)[number];
    constructor(callback: ResizeObserverCallback) { this.record = { callback, targets: new Set() }; records.push(this.record); }
    observe(element: Element) { this.record.targets.add(element); }
    unobserve(element: Element) { this.record.targets.delete(element); }
    disconnect() { this.record.targets.clear(); }
  }
  vi.stubGlobal("ResizeObserver", Observer);
  return records;
}
it("preserves border-box versus row rect heights, batches delivery and rejects retired observations", () => {
  const records = resizeHost(), events: unknown[] = [];
  const element = document.createElement("div");
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({ height: 40, width: 120.6 } as DOMRect);
  const observer = browser().createMeasurementObserver({ onMeasure: value => events.push([value.height, value.rectHeight, value.width]), onBatchComplete: () => events.push("batch") });
  expect(records).toHaveLength(0);
  observer.observe(element); observer.observe(element);
  const first = records[0]!;
  const entry = { target: element, borderBoxSize: [{ blockSize: 60 }], contentRect: { height: 38, width: 118 } } as unknown as ResizeObserverEntry;
  first.callback([entry], {} as ResizeObserver);
  expect(events).toEqual([[60, 40, 121], "batch"]);
  observer.unobserve(element); expect(first.targets.size).toBe(0);
  observer.observe(element); expect(records).toHaveLength(2);
  first.callback([entry], {} as ResizeObserver); expect(events).toHaveLength(2);
  observer.dispose(); observer.dispose(); observer.observe(element);
  records[1]!.callback([entry], {} as ResizeObserver);
  expect(events).toHaveLength(2); expect(records[1]!.targets.size).toBe(0);
});
it("measures once without ResizeObserver, permits re-observation and ignores invalid heights", () => {
  vi.stubGlobal("ResizeObserver", undefined);
  const element = document.createElement("div"), heights: number[] = [];
  const rect = vi.spyOn(element, "getBoundingClientRect").mockReturnValue({ height: 42, width: 80 } as DOMRect);
  const observer = browser().createMeasurementObserver({ onMeasure: value => heights.push(value.height) });
  observer.observe(element); observer.observe(element); expect(heights).toEqual([42]);
  observer.unobserve(element); rect.mockReturnValue({ height: 0, width: 80 } as DOMRect); observer.observe(element);
  expect(heights).toEqual([42]); observer.dispose();
});
it("removes font listeners and observers across repeated lifetimes", () => {
  const records = resizeHost(), fonts = new EventTarget();
  Object.defineProperty(document, "fonts", { configurable: true, value: fonts });
  let count = 0;
  for (let i = 0; i < 3; i++) {
    const stop = browser().observeCominsFontChanges(() => count++);
    const observer = browser().createMeasurementObserver({ onMeasure() {} });
    observer.observe(document.createElement("div")); fonts.dispatchEvent(new Event("loadingdone"));
    stop(); stop(); observer.dispose(); fonts.dispatchEvent(new Event("loadingdone"));
  }
  expect(count).toBe(3); expect(records.every(record => record.targets.size === 0)).toBe(true);
});
it("restores disclosure focus immediately and once after layout without a recurring frame", () => {
  const pending: FrameRequestCallback[] = [];
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { pending.push(callback); return pending.length; });
  const content = document.createElement("div"), input = document.createElement("input"), toggle = document.createElement("button");
  content.append(input); document.body.append(toggle, content); input.focus();
  browser().createCominsDetailFocusRestorer().restore(content, () => toggle);
  expect(document.activeElement).toBe(toggle); expect(pending).toHaveLength(1);
  toggle.remove(); pending.shift()!(0); expect(pending).toHaveLength(0);
});
it("preserves synchronous event clipboard I/O and asynchronous permission failures", async () => {
  const data = new Map<string, string>();
  const transfer = { types: ["text/plain"], getData: (type: string) => data.get(type) ?? "", setData: (type: string, value: string) => { data.set(type, value); } };
  browser().writeCominsClipboardEvent(transfer, "a\tb"); expect(browser().readCominsClipboardEvent(transfer)).toBe("a\tb");
  expect(browser().readCominsClipboardEvent({ ...transfer, types: ["text/html"] })).toBeNull();
  vi.stubGlobal("navigator", {});
  await expect(browser().writeCominsClipboardText("a")).rejects.toThrow("Clipboard writing is unavailable.");
  const error = new Error("denied");
  vi.stubGlobal("navigator", { clipboard: { writeText: () => Promise.reject(error) } });
  await expect(browser().writeCominsClipboardText("a")).rejects.toBe(error);
  vi.stubGlobal("navigator", { clipboard: { async writeText(value: string) { data.set("written", value); } } });
  await browser().writeCominsClipboardText("ok"); expect(data.get("written")).toBe("ok");
});
