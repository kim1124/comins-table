import type { Page } from "@playwright/test";

/** 지연 주입된 Playwright 리스너가 최초 기준 이후에 추가되지 않도록 준비한다. */
export async function initializeMemoryInstrumentation(page: Page) {
  await page.locator("html").count();
  await page.locator("html").evaluate(() => undefined);
}
