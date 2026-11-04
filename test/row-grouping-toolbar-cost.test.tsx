// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { RowGroupingFeature } from "../example/src/features/RowGroupingFeature";
import * as locale from "../example/src/i18n/playground-locale";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let previousLocale: string | null;
function LocaleSwitch() {
  const { setLocale } = locale.usePlaygroundLocale();
  return <button onClick={() => setLocale("ko")}>Switch locale</button>;
}
beforeEach(() => {
  previousLocale = localStorage.getItem(locale.PLAYGROUND_LOCALE_STORAGE_KEY);
  localStorage.setItem(locale.PLAYGROUND_LOCALE_STORAGE_KEY, "en");
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  if (previousLocale === null) localStorage.removeItem(locale.PLAYGROUND_LOCALE_STORAGE_KEY);
  else localStorage.setItem(locale.PLAYGROUND_LOCALE_STORAGE_KEY, previousLocale);
});
function mount() {
  act(() => root.render(<locale.PlaygroundLocaleProvider><LocaleSwitch /><RowGroupingFeature /></locale.PlaygroundLocaleProvider>));
}
function button(label: string) {
  const result = Array.from(host.querySelectorAll("button")).find(node => node.textContent === label);
  expect(result).toBeDefined();
  return result!;
}
function click(label: string) {
  act(() => button(label).click());
}
function state(testId: string) {
  return JSON.parse(host.querySelector(`[data-testid="${testId}"]`)!.textContent!);
}
it("does not rebuild unchanged toolbar labels when a group model changes", () => {
  const labels = vi.spyOn(locale, "defineLocalizedText");
  mount();
  const toolbarLabels = () => labels.mock.calls.filter(([ko]) => ko === "모든 Group 펼치기").length;
  const initialCalls = toolbarLabels();
  expect(initialCalls).toBeGreaterThan(0);
  click("Add empty group");
  expect(state("row-grouping-single-groups")).toEqual(["east", "empty", "west", "archived"]);
  expect(toolbarLabels()).toBe(initialCalls);
});
it("keeps current group actions and movement state after repeated model changes", () => {
  mount();
  click("Add empty group");
  click("Add empty group");
  expect(state("row-grouping-single-groups")).toEqual(["east", "empty", "west", "archived"]);
  click("Expand all groups");
  expect(state("row-grouping-single-state")).toEqual(["east", "empty", "west", "archived"]);
  click("Collapse all groups");
  expect(state("row-grouping-single-state")).toEqual([]);
  click("Delete added group");
  expect(state("row-grouping-single-groups")).toEqual(["east", "empty", "west"]);
  const movement = button("Allow Row and Group movement");
  movement.focus();
  expect(movement.getAttribute("aria-pressed")).toBe("true");
  act(() => movement.click());
  expect(movement.getAttribute("aria-pressed")).toBe("false");
  expect(document.activeElement).toBe(movement);
  act(() => movement.click());
  expect(movement.getAttribute("aria-pressed")).toBe("true");
});
it("updates the existing toolbar controls after a locale change", () => {
  mount();
  const expand = button("Expand all groups");
  click("Switch locale");
  expect(expand.isConnected).toBe(true);
  expect(expand.textContent).toBe("모든 Group 펼치기");
  act(() => expand.click());
  expect(state("row-grouping-single-state")).toEqual(["east", "empty", "west"]);
});
