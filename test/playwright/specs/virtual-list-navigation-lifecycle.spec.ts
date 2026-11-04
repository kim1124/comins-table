import { expect, test } from "@playwright/test";

// Heap witness 검증에서 trace snapshotter의 보유를 제품 보유와 혼합하지 않는다.
test.use({ trace: "off" });

declare global {
  interface Window {
    __virtualListNavigationWitnesses?: {
      calibration: WeakRef<HTMLElement>;
      retired: Array<WeakRef<HTMLElement>>;
    };
  }
}

test("sidebar navigation releases the retired built-in virtual-list search subtree @perf", async ({ page }, testInfo) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("HeapProfiler.enable");
  try {
    await page.goto("/docs/getting-started");
    await expect(page.getByTestId("row-a")).toBeVisible();
    await page.evaluate(() => {
      window.__virtualListNavigationWitnesses = {
        calibration: new WeakRef(document.createElement("span")),
        retired: [],
      };
    });
    for (let i = 0; i < 3; i++) await cdp.send("HeapProfiler.collectGarbage");
    expect(await page.evaluate(() => !!window.__virtualListNavigationWitnesses?.calibration.deref())).toBe(false);
    const timeOrigin = await page.evaluate(() => performance.timeOrigin);
    const entry = page.locator('.docs-sidebar a[href="/examples/component"]');
    await entry.scrollIntoViewIfNeeded();
    await entry.click();
    await expect(page.getByTestId("feature-content")).toHaveAttribute("data-feature", "component");
    const list = page.getByTestId("virtual-list-virtual-list-search-a-virtual-list-search-component");
    await list.locator('[data-comins-virtual-list-item="true"]').first().click();
    const search = page.getByTestId("virtual-list-search-virtual-list-search-a-virtual-list-search-component");
    await search.fill("검색-9999");
    await expect(list.locator('[data-comins-virtual-list-item="true"]')).toHaveCount(1);
    await expect(search).toBeFocused();
    await page.evaluate(() => {
      const input = document.querySelector<HTMLElement>('[data-testid="virtual-list-search-virtual-list-search-a-virtual-list-search-component"]');
      const nodes = [
        input,
        document.querySelector<HTMLElement>('[data-testid="virtual-list-virtual-list-search-a-virtual-list-search-component"]'),
        input?.closest<HTMLElement>("tr[data-comins-row-data-index]"),
        input?.closest<HTMLElement>(".comins-table"),
        document.querySelector<HTMLElement>('[data-testid="component-example-virtual-list-search"]'),
      ];
      if (!nodes.every(node => node?.isConnected) || document.activeElement !== input) throw new Error("Live focused witnesses missing");
      window.__virtualListNavigationWitnesses!.retired = (nodes as HTMLElement[]).map(node => new WeakRef(node));
    });
    // 실제 anchor의 SPA 동작으로 종료한다. 외부 pointerdown이나 테스트용 blur는 추가하지 않는다.
    await page.locator('.docs-sidebar a[href="/docs/getting-started"]').evaluate((anchor: HTMLAnchorElement) => anchor.click());
    await expect(page.getByTestId("feature-content")).toHaveAttribute("data-feature", "basic");
    await expect(page.locator("tr[data-comins-row-data-index]")).toHaveCount(30);
    await expect(page.getByTestId("component-example-virtual-list-search")).toHaveCount(0);
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.waitForTimeout(1000);
    for (let i = 0; i < 3; i++) await cdp.send("HeapProfiler.collectGarbage");
    const retired = await page.evaluate(() => window.__virtualListNavigationWitnesses!.retired.map(ref => !!ref.deref()));
    await testInfo.attach("retired-subtree-witnesses", { body: JSON.stringify({ retired, counters: await cdp.send("Memory.getDOMCounters") }), contentType: "application/json" });
    expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin);
    expect(retired).toEqual([false, false, false, false, false]);
  } finally {
    await cdp.detach();
  }
});
