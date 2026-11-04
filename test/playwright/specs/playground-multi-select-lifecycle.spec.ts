import { expect, test, type CDPSession, type Locator, type Page } from "@playwright/test";

import { initializePlaygroundLocale } from "../helpers/playground-locale";

const hosts = "[data-playground-multi-select-portal]";
let inspectorGroup = 0;

test.beforeEach(async ({ page }) => initializePlaygroundLocale(page, "en"));

async function bodyListenerCount(session: CDPSession) {
  const group = `multi-select-listeners-${++inspectorGroup}`;
  const objects = new Set<string>();
  try {
    const target = await session.send("Runtime.evaluate", { expression: "document.body", objectGroup: group });
    const objectId = target.result.objectId;
    if (!objectId) throw new Error("Body inspection did not return an object");
    objects.add(objectId);
    const result = await session.send("DOMDebugger.getEventListeners", { objectId });
    for (const listener of result.listeners) {
      if (listener.handler?.objectId) objects.add(listener.handler.objectId);
      if (listener.originalHandler?.objectId) objects.add(listener.originalHandler.objectId);
    }
    return result.listeners.length;
  } finally {
    for (const objectId of objects) await session.send("Runtime.releaseObject", { objectId });
    await session.send("Runtime.releaseObjectGroup", { objectGroup: group });
  }
}

async function counters(page: Page, session: CDPSession) {
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await session.send("HeapProfiler.collectGarbage");
  await session.send("HeapProfiler.collectGarbage");
  const dom = await session.send("Memory.getDOMCounters");
  const heap = await session.send("Runtime.getHeapUsage");
  const state = await page.evaluate(() => ({ url: location.href, timeOrigin: performance.timeOrigin, liveElements: document.querySelectorAll("*").length, rows: document.querySelectorAll("tr[data-comins-row-data-index]").length }));
  return { ...dom, heapUsed: heap.usedSize, bodyListeners: await bodyListenerCount(session), state };
}

async function start(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("feature-content")).toHaveAttribute("data-feature", "basic");
  await expect(page.getByTestId("data-table-viewport")).toBeVisible();
  await page.locator("body").evaluateAll((elements) => elements.length);
}

async function route(page: Page, href: string, feature: string) {
  await page.locator(`.docs-sidebar a[href="${href}"]`).click();
  await expect(page.getByTestId("feature-content")).toHaveAttribute("data-feature", feature);
}

async function expectPlacement(trigger: Locator, dialog: Locator) {
  await expect.poll(async () => {
    const t = await trigger.boundingBox();
    const d = await dialog.boundingBox();
    return t && d ? Math.max(Math.abs(d.x - t.x), Math.abs(d.y - t.y - t.height - 6)) : Infinity;
  }).toBeLessThanOrEqual(1);
  expect(await dialog.evaluate((node) => getComputedStyle(node).position)).toBe("fixed");
}

test("closed Header visits do not install body delegation; first-visit native residuals are recorded separately", async ({ page }, testInfo) => {
  await start(page);
  const session = await page.context().newCDPSession(page);
  await session.send("HeapProfiler.enable");
  try {
    const before = await counters(page, session);
    expect(before.bodyListeners).toBe(0);
    await route(page, "/examples/header", "header");
    await expect(page.getByTestId("header-visibility-column-select-trigger")).toHaveAttribute("aria-expanded", "false");
    const mounted = await counters(page, session);
    await route(page, "/docs/getting-started", "basic");
    const returned = await counters(page, session);
    await testInfo.attach("closed-visit-counters", { body: JSON.stringify({ before, mounted, returned, scope: "Closed visit only: native counter residuals are observations, not assumed fixed by portal ownership" }, null, 2), contentType: "application/json" });
    expect.soft(mounted.bodyListeners).toBe(before.bodyListeners);
    expect.soft(returned.bodyListeners).toBe(before.bodyListeners);
    await expect(page.locator(hosts)).toHaveCount(0);
    expect(returned.state.timeOrigin).toBe(before.state.timeOrigin);
    expect(returned.state.rows).toBe(before.state.rows);
  } finally {
    await session.detach();
  }
});

test("popover interaction keeps focus aria-controls body placement and scroll/resize positioning", async ({ page }) => {
  await start(page);
  await route(page, "/examples/header", "header");
  const trigger = page.getByTestId("header-visibility-column-select-trigger");
  const dialog = page.getByTestId("header-visibility-column-select-content");
  await trigger.click();
  await expect(dialog).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-controls", (await dialog.getAttribute("id"))!);
  expect.soft(await dialog.evaluate((node) => node.closest("[data-playground-multi-select-portal]")?.parentElement === document.body)).toBe(true);
  expect.soft(await page.locator(hosts).count()).toBe(1);
  expect.soft(await dialog.evaluate((node) => {
    const host = node.closest("[data-playground-multi-select-portal]");
    if (!host) return null;
    const style = getComputedStyle(host);
    return { role: host.getAttribute("role"), inlineStyle: host.getAttribute("style"), position: style.position, transform: style.transform, contain: style.contain, isolation: style.isolation, zIndex: style.zIndex, opacity: style.opacity };
  })).toEqual({ role: null, inlineStyle: null, position: "static", transform: "none", contain: "none", isolation: "auto", zIndex: "auto", opacity: "1" });
  expect(await dialog.evaluate((node) => !document.querySelector("[data-testid='header-example-visibility']")?.contains(node))).toBe(true);
  await expectPlacement(trigger, dialog);

  const first = dialog.locator("input").nth(0);
  const second = dialog.locator("input").nth(1);
  await first.click();
  await expect(first).not.toBeChecked();
  await expect(first).toBeFocused();
  await first.press("Space");
  await expect(first).toBeChecked();
  await first.press("Tab");
  await expect(second).toBeFocused();

  const beforeScroll = await trigger.boundingBox();
  const scroll = await trigger.evaluate((node) => {
    let target: Element | null = node.parentElement;
    while (target && !(target.scrollHeight > target.clientHeight && /auto|scroll/.test(getComputedStyle(target).overflowY))) target = target.parentElement;
    const scrolling = target ?? document.scrollingElement!;
    const before = scrolling.scrollTop;
    scrolling.scrollTop = before > 40 ? before - 40 : before + 40;
    return { before, after: scrolling.scrollTop };
  });
  expect(scroll.after).not.toBe(scroll.before);
  await expect.poll(async () => (await trigger.boundingBox())?.y).not.toBe(beforeScroll?.y);
  await expectPlacement(trigger, dialog);
  await page.setViewportSize({ width: 1100, height: 800 });
  await expectPlacement(trigger, dialog);
  await second.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(hosts)).toHaveCount(0);
  await expect(trigger).not.toHaveAttribute("aria-controls");

  await trigger.click();
  await page.getByTestId("header-example-basic").getByRole("heading").first().click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(hosts)).toHaveCount(0);
});

test("used selectors release body and global listeners after repeated Start returns and open-route unmount", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await start(page);
  const session = await page.context().newCDPSession(page);
  await session.send("HeapProfiler.enable");
  try {
    const before = await counters(page, session);
    const rounds = [];
    for (let round = 0; round < 3; round += 1) {
      await route(page, "/examples/header", "header");
      for (const id of ["header-visibility-column-select", "header-layout-column-select"]) {
        await page.getByTestId(`${id}-trigger`).click();
        const checkbox = page.getByTestId(`${id}-content`).locator("input").first();
        await checkbox.click();
        await checkbox.press("Space");
        await checkbox.press("Escape");
      }
      await route(page, "/examples/column-groups", "column-groups");
      await page.getByTestId("column-group-column-select-trigger").click();
      const dialog = page.getByTestId("column-group-column-select-content");
      await expect(dialog).toBeVisible();
      // Keyboard navigation leaves the dialog open until the route actually unmounts it.
      const home = page.locator('.docs-sidebar a[href="/docs/getting-started"]');
      await home.focus();
      await expect(dialog).toBeVisible();
      await home.press("Enter");
      await expect(page.getByTestId("feature-content")).toHaveAttribute("data-feature", "basic");
      await expect(page.locator(hosts)).toHaveCount(0);
      rounds.push(await counters(page, session));
    }
    await testInfo.attach("used-selector-return-counters", { body: JSON.stringify({ before, rounds, scope: "Real Header/Groups selector interactions, not a replacement for the separate original 11-case Header workflow or heap acceptance" }, null, 2), contentType: "application/json" });
    expect(before.bodyListeners).toBe(0);
    for (const after of rounds) {
      expect.soft(after.bodyListeners).toBe(before.bodyListeners);
      expect.soft(after.jsEventListeners).toBe(before.jsEventListeners);
      expect(after.documents).toBe(before.documents);
      expect(after.state).toEqual(before.state);
    }
  } finally {
    await session.detach();
  }
});
