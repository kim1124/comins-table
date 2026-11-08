import { expect, test } from "@playwright/test";
import { startReleaseFocusFixture } from "../helpers/release-focus-fixture";

test.use({ trace: "off" });
let fixture: Awaited<ReturnType<typeof startReleaseFocusFixture>>;
test.beforeAll(async () => { fixture = await startReleaseFocusFixture(); });
test.afterAll(async () => { await fixture?.close(); });

for (const strict of [false, true]) {
  test(`explicit SDK releaseFocus releases a focused search subtree on real SPA removal, StrictMode=${strict} @perf @memory-lifetime`, async ({ page }, testInfo) => {
    const session = await page.context().newCDPSession(page);
    await session.send("HeapProfiler.enable");
    try {
      await page.goto(`${fixture.baseURL}/free?strict=${strict ? "on" : "off"}`);
      const origin = await page.evaluate(() => performance.timeOrigin);
      await page.locator("#open-table").evaluate((a: HTMLAnchorElement) => a.click());
      await page.locator('[data-comins-virtual-list-item="true"]').first().click();
      const before = await page.evaluate(() => ({ ...(window as any).focusFixture.counts }));
      const search = page.getByTestId("virtual-list-search-a-items");
      await search.fill("Item");
      await expect(search).toBeFocused();
      await search.evaluate((input: HTMLInputElement) => input.setSelectionRange(0, 4));
      await page.keyboard.press("Shift+ArrowLeft");
      await expect.poll(() => page.evaluate(() => (window as any).focusFixture.counts.select)).toBeGreaterThan(0);
      const counts = await page.evaluate(() => ({ ...(window as any).focusFixture.counts }));
      expect(counts.selectCapture).toBeGreaterThan(0);
      expect(counts.focusCapture).toBeGreaterThan(before.focusCapture);
      expect(counts.nativeFocusIn).toBeGreaterThan(before.nativeFocusIn);
      await page.evaluate(() => {
        const input = document.querySelector('[data-testid="virtual-list-search-a-items"]')!;
        const table = input.closest(".comins-table")!;
        const host = table.closest("section")!;
        Object.assign(window, { focusWitnesses: [input, table, host].map(node => new WeakRef(node)) });
      });
      expect(await page.evaluate(() => (window as any).focusWitnesses.map((r: WeakRef<object>) => !!r.deref()))).toEqual([true, true, true]);
      // The consumer calls the SDK API. The driver performs no blur or extra focus move.
      await page.locator("#leave-table").evaluate((a: HTMLAnchorElement) => a.click());
      await expect(page.locator('[data-comins-table-instance-id]')).toHaveCount(0);
      await expect(page.locator('tr[data-comins-row-data-index]')).toHaveCount(0);
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      await page.waitForTimeout(1000);
      for (let i = 0; i < 3; i++) { await page.evaluate(() => new Promise<void>(resolve => setTimeout(resolve, 0))); await session.send("HeapProfiler.collectGarbage"); }
      const retired = await page.evaluate(() => (window as any).focusWitnesses.map((r: WeakRef<object>) => !!r.deref()));
      await testInfo.attach("SDK-focus-lifetime", { body: JSON.stringify({ retired, counts: await page.evaluate(() => (window as any).focusFixture.counts), manifest: fixture.manifest, servedScripts: fixture.servedScripts }), contentType: "application/json" });
      expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin);
      expect(retired).toEqual([false, false, false]);
      expect(await page.evaluate(() => (window as any).focusFixture.counts.apiCalls)).toBe(1);
      expect(await page.evaluate(() => (window as any).focusFixture.counts.focusChanged)).toBe(true);
    } finally { await session.detach(); }
  });
}

test("product-free React input retains a focused subtree without pre-removal release @perf @memory-lifetime", async ({ page }) => {
  const session = await page.context().newCDPSession(page);
  await session.send("HeapProfiler.enable");
  try {
    const scripts: string[] = [];
    page.on("response", response => { if (response.url().endsWith(".js")) scripts.push(new URL(response.url()).pathname.slice(1)); });
    await page.goto(`${fixture.baseURL}/free?arm=control`);
    await page.locator("#open-table").evaluate((a: HTMLAnchorElement) => a.click());
    const input = page.getByRole("textbox", { name: "Control search" });
    await input.fill("control");
    await expect(input).toBeFocused();
    await page.evaluate(() => Object.assign(window, { controlWitness: new WeakRef(document.querySelector('section input')!) }));
    await page.locator("#leave-table").evaluate((a: HTMLAnchorElement) => a.click());
    await expect(page.locator("section input")).toHaveCount(0);
    await page.waitForTimeout(1000);
    for (let i = 0; i < 3; i++) { await page.evaluate(() => new Promise<void>(resolve => setTimeout(resolve, 0))); await session.send("HeapProfiler.collectGarbage"); }
    expect(await page.evaluate(() => !!(window as any).controlWitness.deref())).toBe(true);
    expect(scripts.every(script => fixture.manifest.controlReach.includes(script))).toBe(true);
  } finally { await session.detach(); }
});
