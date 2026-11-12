import { expect, test, type Page } from "@playwright/test";
import { createMemoryScroller } from "../helpers/memory-scroll";

async function legacyScroll(page: Page, fraction: number) {
  await page.getByTestId("data-table-viewport").evaluate(async (element, value) => {
    const range = element.scrollHeight - element.clientHeight;
    if (range <= 0) throw new Error("Memory workload has no scrollable range");
    element.scrollTop = range * value;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    if (value > 0 && element.scrollTop <= 0) throw new Error("Memory workload did not scroll");
  }, fraction);
}
for (const [path, virtual] of [["/docs/getting-started", false], ["/performance/virtualization", true]] as const) {
  test(`preserves ${virtual ? "virtual" : "plain"} scroll geometry and actual SPA exit @perf @memory-instrumentation`, async ({ page }) => {
    await page.goto("/api/props");
    const token = await page.evaluate(() => {
      const value = crypto.randomUUID();
      (window as unknown as { __memoryScrollToken: string }).__memoryScrollToken = value;
      return value;
    });
    const session = await page.context().newCDPSession(page);
    const driver = await createMemoryScroller(session);
    try {
      await page.locator(`a[href="${path}"]`).first().evaluate((anchor: HTMLAnchorElement) => anchor.click());
      await expect(page).toHaveURL(new RegExp(`${path}$`, "u"));
      const viewport = page.getByTestId("data-table-viewport");
      await expect(viewport).toBeVisible();
      if (virtual) await expect(viewport).toHaveAttribute("data-virtualized", "true");
      else await expect(viewport).not.toHaveAttribute("data-virtualized", "true");
      const read = () => viewport.evaluate(element => {
        const rows = [...element.querySelectorAll("tr[data-comins-row-data-index]")];
        return { top: element.scrollTop, left: element.scrollLeft, height: element.scrollHeight, client: element.clientHeight,
          ids: rows.map(row => row.getAttribute("data-comins-row-data-index")) };
      });
      for (const fraction of [.5, 1 / 98, .5, 31 / 98, 97 / 98]) {
        await legacyScroll(page, fraction);
        const expected = await read();
        await legacyScroll(page, 0);
        const origin = await read();
        await driver.scroll(fraction);
        expect(await read()).toEqual(expected);
        await driver.scroll(0);
        expect(await read()).toEqual(origin);
      }
      await page.locator('a[href="/api/props"]').first().evaluate((anchor: HTMLAnchorElement) => anchor.click());
      await expect(page).toHaveURL(/\/api\/props$/u);
      await expect(page.locator("[data-comins-table-instance-id]")).toHaveCount(0);
      await expect(page.locator("tr[data-comins-row-data-index]")).toHaveCount(0);
      expect(await page.evaluate(() => (window as unknown as { __memoryScrollToken: string }).__memoryScrollToken)).toBe(token);
      await expect(driver.scroll(.5)).rejects.toThrow("Memory scroll failed");
    } finally {
      driver.dispose();
      await session.detach();
    }
  });
}
