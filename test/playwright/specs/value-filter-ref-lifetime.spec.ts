import { expect, test } from "@playwright/test";
import { startProductionRetention } from "../helpers/production-retention";
import type { ValueFilterRefController } from "../../fixtures/react-retention-consumer/value-filter-ref";

declare global { interface Window { valueFilterRef: ValueFilterRefController } }

test.use({ channel: "chromium", launchOptions: { chromiumSandbox: true } });

for (const label of ["Ready", "Select all matching values"]) test(`native value checkbox ${label} releases table data on unmount before another React event @perf @memory-lifetime`, async ({ page, browserName }, testInfo) => {
  expect(browserName).toBe("chromium");
  const site = await startProductionRetention();
  const cdp = await page.context().newCDPSession(page);
  try {
    await page.goto(site.url + "?profile=value-filter-ref");
    const origin = await page.evaluate(() => performance.timeOrigin);
    const ready = page.getByRole("checkbox", { name: label, exact: true });
    await expect(ready).toBeVisible();
    await ready.click();
    expect(await page.evaluate(() => window.valueFilterRef.inspect())).toEqual({ calls: 1, dataAlive: true, aliveRows: 1000 });
    // 다음 React 이벤트가 마지막 Fiber를 교체하기 전에 public root를 제거한다.
    await page.evaluate(() => window.valueFilterRef.unmount());
    await expect(page.locator(".comins-table")).toHaveCount(0);
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.waitForTimeout(1000);
    for (let index = 0; index < 3; index++) await cdp.send("HeapProfiler.collectGarbage");
    const proof = await page.evaluate(() => ({ origin: performance.timeOrigin, ...window.valueFilterRef.inspect() }));
    await testInfo.attach("native-checkbox-data-release", { body: JSON.stringify({ proof, provenance: site.provenance }), contentType: "application/json" });
    expect(proof.origin).toBe(origin);
    expect(proof).toMatchObject({ calls: 1, dataAlive: false, aliveRows: 0 });
  } finally {
    await cdp.detach();
    await page.goto("about:blank");
    await site.close();
  }
});
