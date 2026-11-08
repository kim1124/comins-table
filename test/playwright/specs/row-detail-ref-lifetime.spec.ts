import { expect, test } from "@playwright/test";
import { startProductionRetention } from "../helpers/production-retention";
import type { ValueFilterRefController } from "../../fixtures/react-retention-consumer/value-filter-ref";

declare global { interface Window { valueFilterRef: ValueFilterRefController } }

test.use({ channel: "chromium", launchOptions: { chromiumSandbox: true } });

test("row detail disclosure ref releases retired data before another React event @perf @memory-lifetime", async ({ page, browserName }, testInfo) => {
  expect(browserName).toBe("chromium");
  const site = await startProductionRetention();
  const cdp = await page.context().newCDPSession(page);
  try {
    await page.goto(site.url + "?profile=row-detail-ref");
    const origin = await page.evaluate(() => performance.timeOrigin);
    const button = page.getByRole("button", { name: "Expand value-ref-0 details", exact: true });
    await expect(button).toBeVisible();
    await button.scrollIntoViewIfNeeded();
    const position = await button.evaluate(element => {
      const bounds = element.getBoundingClientRect();
      const point = { x: 2, y: bounds.height / 2 };
      if (document.elementFromPoint(bounds.left + point.x, bounds.top + point.y) !== element) throw new Error("Click must target button, not its SVG child");
      return point;
    });
    await button.click({ position });
    expect(await page.evaluate(() => window.valueFilterRef.inspect())).toEqual({ calls: 1, dataAlive: true, aliveRows: 1000 });
    await page.evaluate(() => window.valueFilterRef.unmount());
    await expect(page.locator(".comins-table")).toHaveCount(0);
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.waitForTimeout(1000);
    for (let index = 0; index < 3; index++) await cdp.send("HeapProfiler.collectGarbage");
    const proof = await page.evaluate(() => ({ origin: performance.timeOrigin, ...window.valueFilterRef.inspect() }));
    await testInfo.attach("row-detail-disclosure-data-release", { body: JSON.stringify({ proof, provenance: site.provenance }), contentType: "application/json" });
    expect(proof.origin).toBe(origin);
    expect(proof).toMatchObject({ calls: 1, dataAlive: false, aliveRows: 0 });
  } finally {
    await cdp.detach();
    await page.goto("about:blank");
    await site.close();
  }
});
