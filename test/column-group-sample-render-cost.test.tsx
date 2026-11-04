// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ColumnGroupFeature } from "../example/src/features/ColumnGroupFeature";
import * as selector from "../example/src/components/ui/multi-select";
import { PLAYGROUND_LOCALE_STORAGE_KEY, PlaygroundLocaleProvider, usePlaygroundLocale } from "../example/src/i18n/playground-locale";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let previousLocale: string | null;
let previousURL: string;
let previousLang: string;
function LocaleSwitch() {
  const { setLocale } = usePlaygroundLocale();
  return <button data-testid="switch-locale" onClick={() => setLocale("ko")}>Korean</button>;
}
beforeEach(() => {
  previousURL = location.href;
  previousLang = document.documentElement.lang;
  previousLocale = localStorage.getItem(PLAYGROUND_LOCALE_STORAGE_KEY);
  localStorage.setItem(PLAYGROUND_LOCALE_STORAGE_KEY, "en");
  history.replaceState(null, "", "/?fixture=rich-header-label");
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  history.replaceState(null, "", previousURL);
  document.documentElement.lang = previousLang;
  if (previousLocale === null) localStorage.removeItem(PLAYGROUND_LOCALE_STORAGE_KEY);
  else localStorage.setItem(PLAYGROUND_LOCALE_STORAGE_KEY, previousLocale);
});
function mount() {
  act(() => root.render(<PlaygroundLocaleProvider><LocaleSwitch /><ColumnGroupFeature /></PlaygroundLocaleProvider>));
}
function click(element: HTMLElement | null) {
  expect(element).not.toBeNull();
  act(() => element!.click());
}
function richAction(kind: "group" | "column") {
  click(host.querySelector<HTMLButtonElement>(`button[aria-label="Rich ${kind} label action"]`));
}
it("does not rerender the unchanged dynamic sample when rich header actions update", () => {
  const renders = vi.spyOn(selector, "MultiSelect");
  mount();
  const initialCalls = renders.mock.calls.length;
  expect(initialCalls).toBeGreaterThan(0);
  richAction("group");
  richAction("column");
  expect(host.querySelector('output[aria-label="Rich header label actions"]')!.textContent).toBe("group:1,column:1");
  expect(renders.mock.calls.length).toBe(initialCalls);
});
it("preserves dynamic selection, open portal and focus across rich actions and locale changes", () => {
  mount();
  click(host.querySelector('[data-testid="column-group-column-select-trigger"]'));
  const dialog = document.querySelector('[data-testid="column-group-column-select-content"]')!;
  const checkbox = dialog.querySelector<HTMLInputElement>('[data-testid="column-group-column-select-option-age"] input')!;
  expect(checkbox.checked).toBe(true);
  checkbox.focus();
  click(checkbox);
  expect(checkbox.checked).toBe(false);
  expect(host.querySelector('[data-testid="dynamic-group-viewport"] [data-testid="header-age"]')).toBeNull();
  richAction("group");
  expect(document.querySelector('[data-testid="column-group-column-select-content"]')).toBe(dialog);
  expect(document.activeElement).toBe(checkbox);
  expect(checkbox.checked).toBe(false);
  click(host.querySelector('[data-testid="switch-locale"]'));
  expect(document.querySelector('[data-testid="column-group-column-select-content"]')).toBe(dialog);
  expect(dialog.getAttribute("aria-label")).toBe("컬럼 선택");
  expect(checkbox.checked).toBe(false);
  expect(host.querySelector('[data-testid="dynamic-group-viewport"] [data-testid="header-age"]')).toBeNull();
});
