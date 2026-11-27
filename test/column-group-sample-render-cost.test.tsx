// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ColumnGroupFeature } from "../example/src/features/ColumnGroupFeature";
import * as tableState from "../src/react/state";
import * as tableQueries from "../src/react/core-compat";
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
it("preserves dynamic selection, open portal and focus across rich actions and locale changes", async () => {
  mount();
  await act(async () => {
    host.querySelector<HTMLButtonElement>('[data-testid="column-group-column-select-trigger"]')!.click();
  });
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

it("does not reconcile unchanged table inputs for rich labels and group visibility", () => {
  const reconcile = vi.spyOn(tableState, "reconcileReactState");
  mount();
  reconcile.mockClear();
  richAction("group");
  richAction("column");
  const groupToggle = Array.from(host.querySelectorAll<HTMLButtonElement>("button"))
    .find(button => button.textContent === "Show Header group 1")!;
  click(groupToggle);
  expect(host.querySelector('[data-testid="header-example-groups"] [data-testid="header-name"]')).toBeNull();
  click(groupToggle);
  expect(host.querySelector('[data-testid="header-example-groups"] [data-testid="header-name"]')).not.toBeNull();
  expect(reconcile).not.toHaveBeenCalled();
});

it("still reconciles changed dynamic columns without rebuilding row identity", async () => {
  const reconcile = vi.spyOn(tableState, "reconcileReactState");
  mount();
  reconcile.mockClear();
  await act(async () => {
    host.querySelector<HTMLButtonElement>('[data-testid="column-group-column-select-trigger"]')!.click();
  });
  click(document.querySelector('[data-testid="column-group-column-select-option-age"] input'));
  expect(reconcile).toHaveBeenCalledTimes(1);
  expect(reconcile.mock.calls[0][0].getRowIdChanged).toBe(false);
  expect(host.querySelector('[data-testid="dynamic-group-table"] [data-testid="header-age"]')).toBeNull();
});

it("keeps row order projection when only header group visibility changes", async () => {
  const sortedIndexes = vi.spyOn(tableQueries, "getCominsSortedRowIndexes");
  mount();
  sortedIndexes.mockClear();
  const groupToggle = Array.from(host.querySelectorAll<HTMLButtonElement>("button"))
    .find(button => button.textContent === "Show Header group 1")!;
  click(groupToggle);
  expect(host.querySelector('[data-testid="header-example-groups"] [data-testid="header-name"]')).toBeNull();
  click(groupToggle);
  expect(host.querySelector('[data-testid="header-example-groups"] [data-testid="header-name"]')).not.toBeNull();
  expect(sortedIndexes).not.toHaveBeenCalled();

  // Changing the actual column definitions must still invalidate row ordering.
  await act(async () => {
    host.querySelector<HTMLButtonElement>('[data-testid="column-group-column-select-trigger"]')!.click();
  });
  click(document.querySelector('[data-testid="column-group-column-select-option-age"] input'));
  expect(sortedIndexes).toHaveBeenCalled();
  expect(host.querySelector('[data-testid="dynamic-group-table"] [data-testid="header-age"]')).toBeNull();
});
