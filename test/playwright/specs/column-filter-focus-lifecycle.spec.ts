import { expect, test } from "@playwright/test";
import { initializePlaygroundLocale } from "../helpers/playground-locale";

type FocusWitness = {
  refs: Array<WeakRef<Element>>;
  focusOut: Array<{ field: string | null; connected: boolean }>;
  outsideClicks: number;
};

declare global {
  interface Window { __columnFilterFocusWitness?: FocusWitness }
}

test.use({ viewport: { width: 1280, height: 720 }, locale: "en-US", timezoneId: "UTC" });

for (const dismissal of ["outside-pointer", "outside-button", "escape"] as const) {
  test(`numeric filter ${dismissal} releases its retired focused popup after GC @perf`, async ({ page, browserName }, testInfo) => {
    expect(browserName).toBe("chromium");
    await initializePlaygroundLocale(page, "ko");
    const cdp = await page.context().newCDPSession(page);
    try {
      await cdp.send("HeapProfiler.enable");
      await page.goto("/docs/getting-started");
      await expect(page.getByTestId("row-a")).toBeVisible();
      const timeOrigin = await page.evaluate(() => performance.timeOrigin);
      await page.locator('.docs-sidebar a[href="/examples/column-filtering"]').click();
      const table = page.getByTestId("column-filtering-viewport");
      const shell = table.locator("xpath=..");
      await shell.getByTestId("column-filter-trigger-amount").click();
      await page.getByTestId("column-filter-operator-amount").selectOption("between");
      await page.getByTestId("column-filter-value-amount").fill("90");
      await page.getByTestId("column-filter-value-to-amount").fill("150");
      await expect(table.locator("tr[data-comins-row-data-index]")).toHaveCount(3);
      await expect(page.getByTestId("column-filter-value-to-amount")).toBeFocused();
      await page.evaluate(() => {
        const ids = ["column-filter-popover-amount", "column-filter-operator-amount", "column-filter-value-amount", "column-filter-value-to-amount"];
        const elements = ids.map(id => document.querySelector(`[data-testid="${id}"]`));
        if (elements.some(element => !element?.isConnected)) throw new Error("Missing connected filter witnesses");
        window.__columnFilterFocusWitness = { refs: elements.map(element => new WeakRef(element!)), focusOut: [], outsideClicks: 0 };
        document.addEventListener("focusout", event => {
          const target = event.target;
          if (target instanceof Element && target.getAttribute("data-testid") === "column-filter-value-to-amount") {
            window.__columnFilterFocusWitness!.focusOut.push({ field: target.getAttribute("data-testid"), connected: target.isConnected });
          }
        }, true);
      });
      if (dismissal === "outside-pointer") {
        await page.locator("body").click({ position: { x: 4, y: 4 } });
      } else if (dismissal === "outside-button") {
        await page.evaluate(() => {
          const button = document.createElement("button");
          button.dataset.testid = "filter-external-focus-target";
          button.style.cssText = "position:fixed;left:8px;top:8px;z-index:999999";
          button.textContent = "External destination";
          button.addEventListener("click", () => { window.__columnFilterFocusWitness!.outsideClicks++; });
          document.body.append(button);
        });
        const destination = page.getByTestId("filter-external-focus-target");
        await destination.click();
        await expect(destination).toBeFocused();
        expect(await page.evaluate(() => window.__columnFilterFocusWitness!.outsideClicks)).toBe(1);
      } else {
        await page.keyboard.press("Escape");
        await expect(shell.getByTestId("column-filter-trigger-amount")).toBeFocused();
      }
      await expect(page.getByTestId("column-filter-popover-amount")).toHaveCount(0);
      await page.locator('.docs-sidebar a[href="/docs/getting-started"]').click();
      await expect(page.getByTestId("feature-content")).toHaveAttribute("data-feature", "basic");
      await expect(page.locator("tr[data-comins-row-data-index]")).toHaveCount(30);
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      await page.waitForTimeout(1000);
      for (let index = 0; index < 3; index++) await cdp.send("HeapProfiler.collectGarbage");
      const proof = await page.evaluate(() => ({
        timeOrigin: performance.timeOrigin,
        alive: window.__columnFilterFocusWitness!.refs.map(reference => Boolean(reference.deref())),
        focusOut: window.__columnFilterFocusWitness!.focusOut,
      }));
      await testInfo.attach("filter-focus-release-proof", { body: JSON.stringify(proof), contentType: "application/json" });
      expect(proof.timeOrigin).toBe(timeOrigin);
      expect(proof).toMatchObject({
        alive: [false, false, false, false],
        focusOut: [{ field: "column-filter-value-to-amount", connected: true }],
      });
    } finally {
      await cdp.detach();
    }
  });
}

test("focused text filter releases input and popup on programmatic sidebar route unmount @perf", async ({ page, browserName }, testInfo) => {
  expect(browserName).toBe("chromium");
  await initializePlaygroundLocale(page, "ko");
  const cdp = await page.context().newCDPSession(page);
  try {
    await page.goto("/docs/getting-started");
    await expect(page.getByTestId("row-a")).toBeVisible();
    const timeOrigin = await page.evaluate(() => performance.timeOrigin);
    await page.locator('.docs-sidebar a[href="/examples/column-filtering"]').click();
    const viewport = page.getByTestId("column-filtering-viewport");
    await viewport.locator("xpath=..").getByTestId("column-filter-trigger-name").click();
    await page.getByTestId("column-filter-value-name").fill("beta");
    await expect(viewport.getByTestId("row-filter-b")).toBeVisible();
    await expect(viewport.locator("tr[data-comins-row-data-index]")).toHaveCount(1);
    await expect(page.getByTestId("column-filter-value-name")).toBeFocused();
    await page.evaluate(() => {
      const input = document.querySelector('[data-testid="column-filter-value-name"]');
      const popup = document.querySelector('[data-testid="column-filter-popover-name"]');
      const table = document.querySelector('[data-testid="column-filtering-viewport"]')?.closest(".comins-table");
      if (!input || !popup || !table) throw new Error("Missing connected route-unmount witnesses");
      window.__columnFilterFocusWitness = { refs: [input, popup, table].map(node => new WeakRef(node)), focusOut: [], outsideClicks: 0 };
      document.addEventListener("focusout", event => {
        if (event.target instanceof Element && event.target.getAttribute("data-testid") === "column-filter-value-name") {
          window.__columnFilterFocusWitness!.focusOut.push({ field: "column-filter-value-name", connected: event.target.isConnected });
        }
      }, true);
    });
    // 수동 blur/외부 pointerdown 없이 실제 NavLink handler가 commit 전에 정리해야 한다.
    await page.locator('.docs-sidebar a[href="/docs/getting-started"]').evaluate(anchor => anchor.click());
    await expect(page.getByTestId("feature-content")).toHaveAttribute("data-feature", "basic");
    await expect(page.locator("tr[data-comins-row-data-index]")).toHaveCount(30);
    await expect(page.getByTestId("column-filter-popover-name")).toHaveCount(0);
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.waitForTimeout(1000);
    for (let index = 0; index < 3; index++) await cdp.send("HeapProfiler.collectGarbage");
    const proof = await page.evaluate(() => ({
      timeOrigin: performance.timeOrigin,
      alive: window.__columnFilterFocusWitness!.refs.map(reference => Boolean(reference.deref())),
      focusOut: window.__columnFilterFocusWitness!.focusOut,
    }));
    await testInfo.attach("filter-route-unmount-release-proof", { body: JSON.stringify(proof), contentType: "application/json" });
    expect(proof.timeOrigin).toBe(timeOrigin);
    expect(proof.alive).toEqual([false, false, false]);
    expect(proof.focusOut).toEqual([{ field: "column-filter-value-name", connected: true }]);
  } finally {
    await cdp.detach();
  }
});

for (const route of ["history", "sidebar"] as const) {
  test(`built-in value search releases retired table on ${route} unmount @perf`, async ({ page, browserName }, testInfo) => {
    expect(browserName).toBe("chromium");
    await initializePlaygroundLocale(page, "ko");
    const cdp = await page.context().newCDPSession(page);
    try {
      await page.goto("/docs/getting-started");
      await expect(page.getByTestId("row-a")).toBeVisible();
      const timeOrigin = await page.evaluate(() => performance.timeOrigin);
      await page.locator('.docs-sidebar a[href="/examples/column-filtering"]').click();
      const viewport = page.getByTestId("value-filter-table");
      await viewport.locator("xpath=..").getByTestId("column-filter-trigger-status").click();
      await page.getByRole("searchbox", { name: "Search filter values" }).fill("Ready");
      await expect(page.getByRole("searchbox", { name: "Search filter values" })).toBeFocused();
      await page.evaluate(() => {
        const popup = document.querySelector('[data-testid="column-filter-popover-status"]');
        const input = popup?.querySelector("input[type=search]");
        const table = document.querySelector('[data-testid="value-filter-table"]')?.closest(".comins-table");
        if (!input || !popup || !table) throw new Error("Missing value-search witnesses");
        window.__columnFilterFocusWitness = { refs: [input, popup, table].map(node => new WeakRef(node)), focusOut: [], outsideClicks: 0 };
        document.addEventListener("focusout", event => {
          if (event.target instanceof Element && event.target.classList.contains("comins-column-filter__search")) {
            window.__columnFilterFocusWitness!.focusOut.push({ field: "value-search", connected: event.target.isConnected });
          }
        }, true);
      });
      if (route === "sidebar") await page.locator('.docs-sidebar a[href="/docs/getting-started"]').evaluate(a => a.click());
      else await page.evaluate(() => {
        // Playground blur 경로를 우회해 library ref의 테이블 보유 해제를 독립적으로 검증한다.
        history.pushState({}, "", "/docs/getting-started"); window.dispatchEvent(new PopStateEvent("popstate"));
      });
      await expect(page.getByTestId("feature-content")).toHaveAttribute("data-feature", "basic");
      await expect(page.locator("tr[data-comins-row-data-index]")).toHaveCount(30);
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      await page.waitForTimeout(1000);
      for (let index = 0; index < 3; index++) await cdp.send("HeapProfiler.collectGarbage");
      const proof = await page.evaluate(() => ({
        timeOrigin: performance.timeOrigin, alive: window.__columnFilterFocusWitness!.refs.map(ref => !!ref.deref()), focusOut: window.__columnFilterFocusWitness!.focusOut,
      }));
      await testInfo.attach("value-search-retired-table-proof", { body: JSON.stringify({ route, ...proof }), contentType: "application/json" });
      expect(proof.timeOrigin).toBe(timeOrigin);
      expect(proof.alive[2]).toBe(false);
      if (route === "sidebar") {
        expect(proof.alive).toEqual([false, false, false]);
        expect(proof.focusOut).toEqual([{ field: "value-search", connected: true }]);
      }
    } finally { await cdp.detach(); }
  });
}

for (const variant of ["panel", "custom"] as const) {
  test(`Playground ${variant} value search releases its focused input and popup on sidebar unmount @perf`, async ({ page, browserName }, testInfo) => {
    expect(browserName).toBe("chromium");
    await initializePlaygroundLocale(page, "ko");
    const cdp = await page.context().newCDPSession(page);
    try {
      await page.goto("/docs/getting-started");
      await expect(page.getByTestId("row-a")).toBeVisible();
      const timeOrigin = await page.evaluate(() => performance.timeOrigin);
      await page.locator('.docs-sidebar a[href="/examples/column-filtering"]').click();
      await page.getByTestId("value-filter-variant").selectOption(variant);
      const viewport = page.getByTestId("value-filter-table");
      await viewport.locator("xpath=..").getByRole("button", { name: "Filter status", exact: true }).click();
      const search = page.getByRole("searchbox", { name: "Search filter values" });
      await search.fill("Ready");
      await expect(search).toBeFocused();
      const marker = await search.getAttribute("data-comins-column-filter-value-input");
      await page.evaluate(() => {
        const popup = document.querySelector('[data-testid="column-filter-popover-status"]');
        const input = popup?.querySelector("input[type=search]");
        const table = document.querySelector('[data-testid="value-filter-table"]')?.closest(".comins-table");
        if (!input || !popup || !table) throw new Error("Missing Playground custom-search witnesses");
        window.__columnFilterFocusWitness = { refs: [input, popup, table].map(node => new WeakRef(node)), focusOut: [], outsideClicks: 0 };
        document.addEventListener("focusout", event => {
          if (event.target instanceof Element && event.target.classList.contains("comins-column-filter__search")) {
            window.__columnFilterFocusWitness!.focusOut.push({ field: "value-search", connected: event.target.isConnected });
          }
        }, true);
      });
      await page.locator('.docs-sidebar a[href="/docs/getting-started"]').evaluate(a => a.click());
      await expect(page.getByTestId("feature-content")).toHaveAttribute("data-feature", "basic");
      await expect(page.locator("tr[data-comins-row-data-index]")).toHaveCount(30);
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      await page.waitForTimeout(1000);
      for (let index = 0; index < 3; index++) await cdp.send("HeapProfiler.collectGarbage");
      const proof = await page.evaluate(() => ({ timeOrigin: performance.timeOrigin, alive: window.__columnFilterFocusWitness!.refs.map(ref => !!ref.deref()), focusOut: window.__columnFilterFocusWitness!.focusOut }));
      await testInfo.attach("playground-custom-value-search-release", { body: JSON.stringify({ variant, marker, ...proof }), contentType: "application/json" });
      expect(proof.timeOrigin).toBe(timeOrigin);
      expect(proof.alive).toEqual([false, false, false]);
      expect(proof.focusOut).toEqual([{ field: "value-search", connected: true }]);
      expect(marker).toBe("true");
    } finally { await cdp.detach(); }
  });
}
