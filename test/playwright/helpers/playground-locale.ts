import type { Page } from "@playwright/test";

export const PLAYGROUND_LOCALE_STORAGE_KEY = "comins-table-playground-locale";

export type PlaygroundLocale = "en" | "ko";

export async function initializePlaygroundLocale(page: Page, locale: PlaygroundLocale) {
  await page.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: PLAYGROUND_LOCALE_STORAGE_KEY, value: locale },
  );
}
