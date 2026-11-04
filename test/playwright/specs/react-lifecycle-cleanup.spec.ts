import { expect, test, type Page } from "@playwright/test";
import { initializePlaygroundLocale } from "../helpers/playground-locale";
import { startDevelopmentRetention } from "../helpers/production-retention";
import type { RetentionController } from "../../fixtures/react-retention-consumer/main";

type Resources = { raf: number; timers: number; globalListeners: number; globalTypes: string[]; domListeners: number; observed: number; detailObserved: number; observes: number; deliveries: number; disconnects: number; cancelledRaf: number; cancelledTimers: number };
declare global { interface Window { retention: RetentionController; retentionResources: { snapshot(): Resources; holdFrames(hold: boolean): void } } }

// 계측은 GC 판정용 production profile과 분리한다. target/callback은 WeakRef만 저장한다.
function instrumentResources() {
  const frames = new Set<number>(), timers = new Set<number>();
  let holdFrames = false;
  const heldFrames = new Map<number, () => void>();
  let cancelledRaf = 0, cancelledTimers = 0, observes = 0, deliveries = 0, disconnects = 0;
  const raf = window.requestAnimationFrame.bind(window), cancel = window.cancelAnimationFrame.bind(window);
  window.requestAnimationFrame = callback => {
    const id = raf(time => {
      const run = () => { frames.delete(id); heldFrames.delete(id); callback(time); };
      if (holdFrames) heldFrames.set(id, run); else run();
    }); frames.add(id); return id;
  };
  window.cancelAnimationFrame = id => { heldFrames.delete(id); if (frames.delete(id)) cancelledRaf++; cancel(id); };
  const timeout = window.setTimeout.bind(window), clear = window.clearTimeout.bind(window);
  window.setTimeout = ((callback: TimerHandler, delay?: number, ...args: unknown[]) => {
    const id = timeout(() => { timers.delete(id); if (typeof callback === "function") callback(...args); }, delay);
    timers.add(id); return id;
  }) as typeof window.setTimeout;
  window.clearTimeout = id => { if (timers.delete(id!)) cancelledTimers++; clear(id); };
  type Registration = { target: WeakRef<EventTarget>; listener: WeakRef<object>; type: string; capture: boolean; active: boolean; global: boolean };
  const listeners: Registration[] = [];
  const add = EventTarget.prototype.addEventListener, remove = EventTarget.prototype.removeEventListener;
  EventTarget.prototype.addEventListener = function(type, listener, options) {
    const capture = typeof options === "boolean" ? options : Boolean(options?.capture);
    if (listener && !listeners.some(item => item.active && item.target.deref() === this && item.listener.deref() === listener && item.type === type && item.capture === capture)) {
      listeners.push({ target: new WeakRef(this), listener: new WeakRef(listener), type, capture, active: true, global: this === window || this === document });
    }
    return add.call(this, type, listener, options);
  };
  EventTarget.prototype.removeEventListener = function(type, listener, options) {
    const capture = typeof options === "boolean" ? options : Boolean(options?.capture);
    for (const item of listeners) if (item.active && item.target.deref() === this && item.listener.deref() === listener && item.type === type && item.capture === capture) item.active = false;
    return remove.call(this, type, listener, options);
  };
  const NativeResizeObserver = window.ResizeObserver;
  const targets: Set<WeakRef<Element>>[] = [];
  window.ResizeObserver = class extends NativeResizeObserver {
    private registered = new Set<WeakRef<Element>>();
    constructor(callback: ResizeObserverCallback) {
      super((entries, observer) => { deliveries++; callback(entries, observer); });
      targets.push(this.registered);
    }
    observe(target: Element, options?: ResizeObserverOptions) {
      observes++; if (![...this.registered].some(ref => ref.deref() === target)) this.registered.add(new WeakRef(target));
      super.observe(target, options);
    }
    unobserve(target: Element) {
      for (const ref of this.registered) if (ref.deref() === target) this.registered.delete(ref);
      super.unobserve(target);
    }
    disconnect() { disconnects++; this.registered.clear(); super.disconnect(); }
  };
  window.retentionResources = { holdFrames(hold) {
    holdFrames = hold;
    if (!hold) for (const run of [...heldFrames.values()]) run();
  }, snapshot() {
    const active = listeners.filter(item => item.active && item.target.deref() && item.listener.deref());
    return { raf: frames.size, timers: timers.size, globalListeners: active.filter(item => item.global).length,
      globalTypes: active.filter(item => item.global).map(item => `${item.type}:${item.capture}`),
      domListeners: active.filter(item => !item.global).length, observed: targets.reduce((sum, set) => sum + set.size, 0),
      detailObserved: targets.reduce((sum, set) => sum + [...set].filter(ref => ref.deref()?.closest("[data-detail-for]")).length, 0),
      observes, deliveries, disconnects, cancelledRaf, cancelledTimers };
  } };
}

const snapshot = (page: Page) => page.evaluate(() => window.retentionResources.snapshot());
async function idle(page: Page) {
  await expect.poll(async () => (await snapshot(page)).raf).toBe(0);
  await expect.poll(async () => (await snapshot(page)).timers).toBe(0);
}
async function ready(page: Page) {
  // lazy route가 아직 mount되지 않은 수치를 listener baseline으로 오인하지 않는다.
  await expect(page.locator(".comins-table").first()).toBeVisible();
  // locator.evaluate의 main-world InjectedScript가 설치하는 자체 listener 13개도 먼저 생성한다.
  await page.locator(".comins-table").first().evaluate(element => element.tagName);
  await page.evaluate(() => new Promise<void>(resolve => setTimeout(resolve, 50)));
  await idle(page);
}
async function leave(page: Page) {
  await page.getByRole("link", { exact: true, name: "Getting Started" }).evaluate((element: HTMLAnchorElement) => element.click());
  await expect(page.getByTestId("feature-content")).toHaveAttribute("data-feature", "basic");
}
async function assertGlobalCleanup(page: Page, baseline: Resources, active: Resources) {
  await idle(page);
  const after = await snapshot(page);
  expect(after.globalListeners, JSON.stringify({ baseline, active, after })).toBeLessThanOrEqual(baseline.globalListeners);
  expect(after.cancelledRaf).toBeGreaterThanOrEqual(active.cancelledRaf);
  // DOM 소유 listener는 명시 remove 계약이 아니다. 다음 task GC2 이후 별도로 검사한다.
  const session = await page.context().newCDPSession(page);
  await page.evaluate(() => new Promise<void>(resolve => setTimeout(resolve, 0)));
  await session.send("HeapProfiler.collectGarbage"); await session.send("HeapProfiler.collectGarbage"); await session.detach();
  return snapshot(page);
}

test.beforeEach(async ({ page }) => {
  await initializePlaygroundLocale(page, "en");
  await page.addInitScript(instrumentResources);
});

async function beginTransfer(page: Page, sourceId: string, targetId: string) {
  const left = page.getByTestId("cross-table-flat-left"), right = page.getByTestId("cross-table-flat-right");
  const source = left.getByTestId(`row-drag-handle-${sourceId}`), target = right.getByTestId(`row-${targetId}`);
  await source.scrollIntoViewIfNeeded(); await target.scrollIntoViewIfNeeded();
  const from = await source.boundingBox(), to = await target.boundingBox();
  await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2); await page.mouse.down();
  await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height / 2, { steps: 12 });
  return { left, right, target };
}

for (const ending of ["escape", "unmount"] as const) {
  test(`external transfer marker and listeners clean on ${ending}`, async ({ page }, testInfo) => {
    await page.goto("/examples/cross-table-drag"); await ready(page);
    const baseline = await snapshot(page);
    const { right } = await beginTransfer(page, "flat-a", "flat-b");
    const marker = right.locator("[data-comins-cross-row-drop-position]");
    await expect(marker).toHaveCount(1);
    const handle = await marker.elementHandle();
    const active = await snapshot(page);
    expect(active.globalListeners).toBeGreaterThan(baseline.globalListeners);
    if (ending === "escape") await page.keyboard.press("Escape"); else await leave(page);
    expect(await handle!.getAttribute("data-comins-cross-row-drop-position")).toBeNull();
    expect(await handle!.getAttribute("data-comins-row-drop-valid")).toBeNull();
    await handle!.dispose();
    const after = await assertGlobalCleanup(page, baseline, active);
    await page.mouse.up();
    await testInfo.attach("transfer-marker-counts", { body: JSON.stringify({ baseline, active, after }), contentType: "application/json" });
  });
}

test("transfer rejection feedback cancels its pending timer on unmount", async ({ page }, testInfo) => {
  await page.goto("/examples/cross-table-drag"); await ready(page);
  const baseline = await snapshot(page);
  const { right } = await beginTransfer(page, "shared", "shared");
  await page.mouse.up();
  await expect(page.getByTestId("transfer-rejection-tooltip")).toBeVisible();
  await expect(right.locator("..")).toHaveAttribute("data-comins-transfer-rejected", "true");
  const active = await snapshot(page);
  expect(active.timers).toBeGreaterThan(0);
  await leave(page);
  const after = await assertGlobalCleanup(page, baseline, active);
  expect(after.cancelledTimers).toBeGreaterThan(active.cancelledTimers);
  await expect(page.getByTestId("transfer-rejection-tooltip")).toHaveCount(0);
  await testInfo.attach("transfer-feedback-counts", { body: JSON.stringify({ baseline, active, after }), contentType: "application/json" });
});

test("successful transfer cancels an actually pending focus RAF on unmount", async ({ page }, testInfo) => {
  await page.goto("/examples/cross-table-drag"); await ready(page);
  const baseline = await snapshot(page);
  const { right } = await beginTransfer(page, "flat-a", "flat-b");
  await page.evaluate(() => window.retentionResources.holdFrames(true));
  await page.mouse.up();
  await expect(right.getByTestId("row-flat-a")).toBeVisible();
  const active = await snapshot(page);
  expect(active.raf).toBeGreaterThan(0);
  await leave(page);
  const after = await assertGlobalCleanup(page, baseline, active);
  expect(after.cancelledRaf).toBeGreaterThan(active.cancelledRaf);
  await page.evaluate(() => window.retentionResources.holdFrames(false));
  await testInfo.attach("transfer-focus-counts", { body: JSON.stringify({ baseline, active, after }), contentType: "application/json" });
});

for (const ending of ["escape", "release", "unmount"] as const) {
  test(`active fill edge-scroll resources clean on ${ending}`, async ({ page }, testInfo) => {
    await page.goto("/examples/fill-handle");
    const viewport = page.getByTestId("clipboard-edit-viewport");
    await viewport.scrollIntoViewIfNeeded();
    const table = page.locator(".comins-table").filter({ has: viewport });
    await table.getByTestId("cell-0-column1").click();
    await idle(page);
    const baseline = await snapshot(page);
    const handle = await table.getByTestId("fill-handle").boundingBox(), box = await viewport.boundingBox();
    await page.mouse.move(handle!.x + handle!.width - 5, handle!.y + handle!.height - 5); await page.mouse.down();
    await page.mouse.move(box!.x + 80, box!.y + box!.height - 5, { steps: 4 });
    await expect.poll(() => viewport.evaluate(element => element.scrollTop)).toBeGreaterThan(180);
    const active = await snapshot(page);
    expect(active.raf).toBeGreaterThan(0);
    expect(active.globalListeners).toBeGreaterThan(baseline.globalListeners);
    if (ending === "escape") await page.keyboard.press("Escape");
    else if (ending === "release") await page.mouse.up();
    else await leave(page);
    const after = await assertGlobalCleanup(page, baseline, active);
    expect(after.cancelledRaf).toBeGreaterThan(active.cancelledRaf);
    if (ending === "unmount") expect(after.domListeners).toBeLessThan(baseline.domListeners);
    await page.mouse.up();
    await testInfo.attach("fill-resource-counts", { body: JSON.stringify({ baseline, active, after }), contentType: "application/json" });
  });
}

for (const ending of ["cancel", "complete", "unmount"] as const) {
  test(`active column move resources clean on ${ending}`, async ({ page }, testInfo) => {
    await page.goto("/examples/header");
    const table = page.getByTestId("header-example-basic");
    const source = table.getByTestId("header-age"), target = table.getByTestId("header-name");
    await source.scrollIntoViewIfNeeded(); await idle(page);
    const baseline = await snapshot(page), box = await source.boundingBox(), destination = await target.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2); await page.mouse.down();
    await page.mouse.move(destination!.x + destination!.width / 2, destination!.y + destination!.height / 2, { steps: 5 });
    await expect(page.getByTestId("column-move-ghost")).toBeVisible();
    const active = await snapshot(page);
    expect(active.globalListeners).toBeGreaterThan(baseline.globalListeners);
    if (ending === "cancel") {
      await page.keyboard.press("Escape");
      // Escape 뒤 파생 click 억제용 pointerup/pointercancel/blur 3개는 pointer 종료까지 유지하는 공개 동작이다.
      expect((await snapshot(page)).globalListeners).toBe(baseline.globalListeners + 3);
      await page.mouse.up();
    }
    else if (ending === "complete") await page.mouse.up();
    else await leave(page);
    await expect(page.getByTestId("column-move-ghost")).toHaveCount(0);
    const after = await assertGlobalCleanup(page, baseline, active);
    if (ending === "unmount") expect(after.domListeners).toBeLessThan(baseline.domListeners);
    await page.mouse.up();
    await testInfo.attach("column-resource-counts", { body: JSON.stringify({ baseline, active, after }), contentType: "application/json" });
  });
}

test("automatic detail observer delivers, remeasures and disconnects after unmount", async ({ page }, testInfo) => {
  await page.goto("/"); await ready(page);
  const baseline = await snapshot(page);
  await page.goto("/examples/row-expand");
  const table = page.getByTestId("row-expand-example-auto");
  await table.scrollIntoViewIfNeeded();
  await table.getByTestId("row-detail-toggle-auto-1").click();
  await expect.poll(async () => (await snapshot(page)).observed).toBeGreaterThan(0);
  const active = await snapshot(page);
  expect(active.observes).toBeGreaterThan(0);
  expect(active.detailObserved).toBeGreaterThan(0);
  await table.getByTestId("auto-detail-grow-auto-1").click();
  await expect(table.getByTestId("auto-detail-grown-content")).toBeVisible();
  await expect.poll(async () => (await snapshot(page)).deliveries).toBeGreaterThan(active.deliveries);
  await leave(page); await idle(page);
  const after = await snapshot(page);
  // 새 Basic viewport observer 하나는 살아 있어야 하며 이전 상세 target은 모두 해제된다.
  expect(after.observed).toBe(baseline.observed);
  expect(after.detailObserved).toBe(0);
  expect(after.disconnects).toBeGreaterThan(active.disconnects);
  await assertGlobalCleanup(page, baseline, active);
  await testInfo.attach("observer-resource-counts", { body: JSON.stringify({ baseline, active, after }), contentType: "application/json" });
});

test("development StrictMode setup-cleanup-setup restores automatic observers and final cleanup", async ({ page }, testInfo) => {
  const site = await startDevelopmentRetention();
  try {
    await page.goto(`${site.url}?strict&lifecycle`);
    await expect.poll(() => page.evaluate(() => window.retention?.lifecycle())).toEqual({ setups: 2, cleanups: 1 });
    await expect.poll(async () => (await snapshot(page)).detailObserved).toBeGreaterThan(0);
    const active = await snapshot(page);
    expect(active.disconnects).toBeGreaterThan(0);
    expect(active.observes).toBeGreaterThan(active.observed);
    const before = await page.getByTestId("strict-detail").evaluate(element => element.closest("tr")!.getBoundingClientRect().height);
    await page.getByTestId("strict-detail").evaluate((element: HTMLElement) => { element.style.height = "180px"; });
    await expect.poll(async () => (await snapshot(page)).deliveries).toBeGreaterThan(active.deliveries);
    await expect.poll(() => page.getByTestId("strict-detail").evaluate(element => element.closest("tr")!.getBoundingClientRect().height)).toBeGreaterThan(before);
    await page.evaluate(() => window.retention.unmount());
    await idle(page);
    const after = await snapshot(page);
    expect(await page.evaluate(() => window.retention.lifecycle())).toEqual({ setups: 2, cleanups: 2 });
    expect(after.observed).toBe(0);
    expect(after.detailObserved).toBe(0);
    expect(after.disconnects).toBeGreaterThan(active.disconnects);
    await testInfo.attach("strictmode-development-counts", { body: JSON.stringify({ active, after }), contentType: "application/json" });
  } finally { await page.goto("about:blank"); await site.close(); }
});


test("Activity reconnect clears an interrupted column drag without discarding row state", async ({ page }) => {
  const site = await startDevelopmentRetention();
  try {
    await page.goto(`${site.url}?activity`);
    const header = page.getByTestId("header-id");
    await expect(header).toBeVisible();
    await page.evaluate(() => window.retention.replace("kept", "activity-data"));
    await expect(page.getByTestId("cell-kept-0-value")).toHaveText("0");
    const box = (await header.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 12, box.y + box.height / 2);
    await expect(page.getByTestId("column-move-ghost")).toHaveCount(1);
    await page.evaluate(() => window.retention.hide());
    await expect(header).toBeHidden();
    await page.mouse.up();
    await page.evaluate(() => window.retention.show());
    await expect(header).toBeVisible();
    await expect(page.getByTestId("column-move-ghost")).toHaveCount(0);
    await expect(header).not.toHaveAttribute("data-column-placeholder", "true");
    await expect(page.getByTestId("cell-kept-0-value")).toHaveText("0");
    expect(await page.evaluate(() => window.retention.status().size)).toBe(30);
  } finally { await page.goto("about:blank"); await site.close(); }
});
