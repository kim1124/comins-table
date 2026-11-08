import type { Page } from "@playwright/test";

export type MemoryResourceMode = "counter" | "diagnostic";

// WeakRef bookkeeping과 native API wrapping은 별도 진단 프로세스에서만 설치한다.
export async function installMemoryResources(page: Page, mode: MemoryResourceMode) {
  if (mode === "counter") return;
  if (mode !== "diagnostic") throw new Error("Memory resource instrumentation requires an explicit counter or diagnostic mode");
  await page.addInitScript(() => {
    type ObserverRecord = { ref: WeakRef<object>; targets: Set<WeakRef<Element>>; byTarget: WeakMap<Element, WeakRef<Element>>; kind: string };
    const records = new Set<ObserverRecord>();
    const timeouts = new Set<number>(), intervals = new Set<number>(), frames = new Set<number>();
    let complete = true;
    for (const kind of ["ResizeObserver", "MutationObserver", "IntersectionObserver"] as const) {
      const Native = window[kind];
      if (typeof Native !== "function") { complete = false; continue; }
      class TrackedObserver extends (Native as new (...args: any[]) => any) {
        private record: ObserverRecord;
        constructor(...args: any[]) {
          super(...args);
          this.record = { ref: new WeakRef(this), targets: new Set(), byTarget: new WeakMap(), kind };
          records.add(this.record);
        }
        observe(target: Element, ...options: any[]) {
          super.observe(target, ...options);
          if (!this.record.byTarget.has(target)) {
            const ref = new WeakRef(target);
            this.record.byTarget.set(target, ref);
            this.record.targets.add(ref);
          }
        }
        unobserve(target: Element) {
          super.unobserve?.(target);
          const ref = this.record.byTarget.get(target);
          if (ref) this.record.targets.delete(ref);
          this.record.byTarget.delete(target);
        }
        disconnect() {
          super.disconnect();
          this.record.targets.clear();
          this.record.byTarget = new WeakMap();
        }
      }
      (window as unknown as Record<string, unknown>)[kind] = TrackedObserver;
    }
    const timeout = window.setTimeout.bind(window), interval = window.setInterval.bind(window);
    const clearTimeout = window.clearTimeout.bind(window), clearInterval = window.clearInterval.bind(window);
    const frame = window.requestAnimationFrame.bind(window), cancelFrame = window.cancelAnimationFrame.bind(window);
    window.setTimeout = ((handler: TimerHandler, delay?: number, ...args: any[]) => {
      if (typeof handler !== "function") { complete = false; return timeout(handler, delay, ...args); }
      const id = timeout((...values: any[]) => { timeouts.delete(id); Reflect.apply(handler, window, values); }, delay, ...args);
      timeouts.add(id);
      return id;
    }) as typeof window.setTimeout;
    window.setInterval = ((handler: TimerHandler, delay?: number, ...args: any[]) => {
      const id = interval(handler, delay, ...args); intervals.add(id); return id;
    }) as typeof window.setInterval;
    window.clearTimeout = id => { timeouts.delete(Number(id)); intervals.delete(Number(id)); clearTimeout(id); };
    window.clearInterval = id => { intervals.delete(Number(id)); timeouts.delete(Number(id)); clearInterval(id); };
    window.requestAnimationFrame = callback => {
      const id = frame(time => { frames.delete(id); callback(time); }); frames.add(id); return id;
    };
    window.cancelAnimationFrame = id => { frames.delete(id); cancelFrame(id); };
    const read = () => {
      const metrics: Record<string, number> = { activeTimeouts: timeouts.size, activeIntervals: intervals.size, activeAnimationFrames: frames.size };
      for (const kind of ["ResizeObserver", "MutationObserver", "IntersectionObserver"]) {
        metrics[kind] = 0; metrics[`${kind}Targets`] = 0;
      }
      for (const record of records) {
        if (!record.ref.deref()) { records.delete(record); continue; }
        metrics[record.kind]! += 1;
        for (const ref of record.targets) {
          if (!ref.deref()) record.targets.delete(ref);
          else metrics[`${record.kind}Targets`]! += 1;
        }
      }
      return { complete, metrics };
    };
    (window as unknown as { __memoryResources: { read: typeof read } }).__memoryResources = { read };
  });
}
