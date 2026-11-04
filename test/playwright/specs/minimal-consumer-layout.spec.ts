import { expect, test, type Page } from "@playwright/test";
import { startMinimalConsumer } from "../helpers/minimal-consumer";

let consumer: Awaited<ReturnType<typeof startMinimalConsumer>>;
test.beforeAll(async () => { consumer = await startMinimalConsumer(); });
test.afterAll(async () => { await consumer?.close(); });

async function geometry(page: Page) {
  return page.evaluate(() => ({
    viewport: document.querySelector(".comins-table__body-viewport")!.getBoundingClientRect().height,
    rows: [...document.querySelectorAll("tr[data-comins-row-data-index]")].map(row => row.getBoundingClientRect().height),
    filler: document.querySelector("[data-testid=table-empty-filler]")?.getBoundingClientRect().height ?? 0,
  }));
}

async function settledGeometry(page: Page) {
  let previous: Awaited<ReturnType<typeof geometry>> | undefined;
  let stable = 0;
  await expect.poll(async () => {
    const current = await geometry(page);
    stable = previous && Math.abs(current.viewport - previous.viewport) <= 1
      && current.rows.length === previous.rows.length ? stable + 1 : 0;
    previous = current;
    return stable;
  }).toBeGreaterThanOrEqual(3);
  return previous!;
}

for (const media of ["screen", "print"] as const) {
  test(`standalone fixed rows keep36px and a stable intrinsic viewport in ${media}`, async ({ page }) => {
    await page.emulateMedia({ media });
    await page.goto(consumer.url);
    await expect(page.locator("tr[data-comins-row-data-index]")).toHaveCount(30);
    const first = await settledGeometry(page);
    expect(first.rows.every(height => Math.abs(height - 36) <= 1)).toBe(true);
    const last = await settledGeometry(page);
    expect(Math.abs(last.viewport - first.viewport)).toBeLessThanOrEqual(1);
    expect(last.filler).toBe(0);
    const unrelated = await page.evaluate(() => {
      const td = document.createElement("td"); document.body.append(td);
      const sizing = getComputedStyle(td).boxSizing; td.remove(); return sizing;
    });
    expect(unrelated).toBe("content-box");
  });
}

for (const query of ["?automatic=1", "?virtualized=1", "?short=1&fixed=1"]) {
  test(`standalone viewport settles with ${query}`, async ({ page }) => {
    await page.goto(consumer.url + query);
    await expect(page.locator("tr[data-comins-row-data-index]").first()).toBeVisible();
    const first = await settledGeometry(page);
    const last = await settledGeometry(page);
    expect(Math.abs(last.viewport - first.viewport)).toBeLessThanOrEqual(1);
    expect(last.rows.every(height => height >= 35)).toBe(true);
    if (query.includes("virtualized")) expect(last.rows.every(height => Math.abs(height - 36) <= 1)).toBe(true);
    if (query.includes("automatic")) expect(last.rows[0]).toBeGreaterThan(72);
    if (query.includes("short")) {
      expect(last.rows).toHaveLength(3);
      expect(last.filler).toBeGreaterThan(0);
      const filler = await page.locator("[data-testid=table-empty-filler]").evaluate(element => ({
        actual: element.getBoundingClientRect().height,
        declared: parseFloat((element as HTMLElement).style.height),
        padding: getComputedStyle(element).paddingTop,
      }));
      expect(filler.padding).toBe("0px");
      expect(Math.abs(filler.actual - filler.declared)).toBeLessThanOrEqual(1);
    }
    await page.evaluate(() => (window as unknown as { minimalTable: { unmount(): void } }).minimalTable.unmount());
    await expect(page.locator(".comins-table")).toHaveCount(0);
  });
}
