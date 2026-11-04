import { expect, test, type Locator, type Page } from "@playwright/test";

test.use({ headless: false });

async function openHorizontalTable(page: Page) {
  await page.goto("/performance/virtualization");
  const viewport = page.getByTestId("data-table-viewport");
  const table = page.locator(".comins-table").filter({ has: viewport });
  const scrollbar = table.getByTestId("table-horizontal-scrollbar");
  await expect.poll(() => scrollbar.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeGreaterThan(200);
  return { scrollbar, table, viewport };
}

async function expectSynchronizedLeft(table: Locator, left: number) {
  await expect.poll(() => table.locator(".comins-table__header, .comins-table__body-viewport, .comins-table__horizontal-scrollbar").evaluateAll(
    (elements, target) => elements.every((element) => Math.abs(element.scrollLeft - target) <= 1), left,
  )).toBe(true);
}

test("horizontal scroll preserves a newer request before a body scroll echo @perf", async ({ page }) => {
  const { scrollbar, table } = await openHorizontalTable(page);
  const seed = await scrollbar.evaluate((element) => new Promise<{
    requestedLeft: number; right: number; synchronizedBody: number;
  }>((resolve) => {
    const body = element.closest(".comins-table")!.querySelector<HTMLElement>(".comins-table__body-viewport")!;
    const onBodyScroll = () => {
      if (body.scrollLeft <= 200) return;
      body.removeEventListener("scroll", onBodyScroll, true);
      const synchronizedBody = body.scrollLeft;
      const right = element.scrollLeft;
      // body의 지연 scroll 알림 직전에 새 사용자 위치를 요청하여 되먹임 순서를 고정한다.
      element.scrollLeft = 0;
      resolve({ requestedLeft: element.scrollLeft, right, synchronizedBody });
    };
    body.addEventListener("scroll", onBodyScroll, true);
    element.scrollLeft = element.scrollWidth;
  }));
  expect(seed.right).toBeGreaterThan(200);
  expect(seed.synchronizedBody).toBe(seed.right);
  expect(seed.requestedLeft).toBe(0);
  await expectSynchronizedLeft(table, 0);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expectSynchronizedLeft(table, 0);
});

test("horizontal native keyboard scrolling matches a table-free region @perf", async ({ page }) => {
  const { scrollbar, table } = await openHorizontalTable(page);
  const metrics = await scrollbar.evaluate((element) => ({
    height: element.getBoundingClientRect().height,
    total: element.scrollWidth,
    width: element.clientWidth,
  }));
  await page.evaluate((size) => {
    const region = document.createElement("div");
    region.id = "horizontal-scroll-native-control";
    region.tabIndex = 0;
    region.className = "comins-table__horizontal-scrollbar";
    region.style.height = `${size.height}px`;
    region.style.width = `${size.width}px`;
    const content = document.createElement("div");
    content.className = "comins-table__horizontal-scrollbar-content";
    content.style.width = `${size.total}px`;
    region.append(content);
    document.body.append(region);
  }, metrics);
  const control = page.locator("#horizontal-scroll-native-control");
  const nativeKeys = async (region: Locator) => {
    await region.scrollIntoViewIfNeeded();
    await region.focus();
    expect(await region.evaluate((element) => document.activeElement === element)).toBe(true);
    for (let index = 0; index < 16; index += 1) await page.keyboard.press("ArrowRight");
    // Native keyboard scrolling animates; this is a fixed functional settle, not a memory baseline.
    await page.waitForTimeout(1000);
    const right = await region.evaluate((element) => element.scrollLeft);
    for (let index = 0; index < 16; index += 1) await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(1000);
    return { left: await region.evaluate((element) => element.scrollLeft), right };
  };
  try {
    const baseline = await nativeKeys(control);
    expect(baseline.right).toBe(metrics.total - metrics.width);
    expect(baseline.left).toBe(0);
    const actual = await nativeKeys(scrollbar);
    expect(Math.abs(actual.right - baseline.right)).toBeLessThanOrEqual(1);
    expect(actual.left).toBe(baseline.left);
    await expectSynchronizedLeft(table, 0);
  } finally {
    await control.evaluate((element) => element.remove());
  }
});
