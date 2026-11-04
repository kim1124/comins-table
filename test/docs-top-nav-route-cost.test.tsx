// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, useLocation, useNavigate, type NavigateFunction } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DocsTopNav } from "../example/src/components/docs/DocsTopNav";
import type { DocsPage } from "../example/src/docs/types";
import * as locale from "../example/src/i18n/playground-locale";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const pages: DocsPage[] = [
  { path: "/api/props", title: "Alpha", label: "Alpha", category: "API", summary: "Props", body: null, codeSamples: [] },
  { path: "/api/ref", title: "Beta", label: "Beta", category: "API", summary: "Ref", body: null, codeSamples: [] },
];
let root: ReturnType<typeof createRoot>;
let host: HTMLDivElement;
let navigate: NavigateFunction;
let previousLocale: string | null;
function RouteProbe() {
  const location = useLocation();
  navigate = useNavigate();
  return <output data-path={location.pathname} data-key={location.key} />;
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
async function mount() {
  await act(async () => root.render(
    <MemoryRouter initialEntries={["/api/props"]}>
      <locale.PlaygroundLocaleProvider><RouteProbe /><DocsTopNav pages={pages} /></locale.PlaygroundLocaleProvider>
    </MemoryRouter>,
  ));
}
async function search(query: string) {
  const input = host.querySelector<HTMLInputElement>("input[type=search]")!;
  await act(async () => {
    input.focus();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, query);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  return input;
}
async function chooseFirst() {
  const option = host.querySelector<HTMLButtonElement>('[role="option"]');
  expect(option).not.toBeNull();
  await act(async () => option!.click());
}
it("does not recreate unchanged header labels on route-only updates", async () => {
  const labels = vi.spyOn(locale, "defineLocalizedText");
  await mount();
  const brandCalls = () => labels.mock.calls.filter(([ko]) => ko === "문서 Playground").length;
  const initialCalls = brandCalls();
  expect(initialCalls).toBeGreaterThan(0);
  for (const path of ["/api/ref", "/api/props", "/api/ref"]) {
    await act(async () => { await navigate(path); });
    expect(host.querySelector("output")!.dataset.path).toBe(path);
  }
  expect(brandCalls()).toBe(initialCalls);
});
it("resets search without navigating again when the selected result is the current route", async () => {
  await mount();
  const key = host.querySelector("output")!.dataset.key;
  const input = await search("Alpha");
  await chooseFirst();
  expect(host.querySelector("output")!.dataset.path).toBe("/api/props");
  expect(host.querySelector("output")!.dataset.key).toBe(key);
  expect(input.value).toBe("");
  expect(host.querySelector('[role="listbox"]')).toBeNull();
});
it("uses the latest route when choosing a result after an external SPA navigation", async () => {
  await mount();
  const input = await search("Alpha");
  await act(async () => { await navigate("/api/ref"); });
  expect(host.querySelector('[role="option"]')?.textContent).toContain("Alpha");
  await chooseFirst();
  expect(host.querySelector("output")!.dataset.path).toBe("/api/props");
  expect(input.value).toBe("");
  expect(host.querySelector('[role="listbox"]')).toBeNull();
});
it("updates localized header controls when the locale changes", async () => {
  await mount();
  expect(host.querySelector("input")!.getAttribute("aria-label")).toBe("Search all docs");
  const korean = Array.from(host.querySelectorAll("button")).find(button => button.textContent === "한")!;
  await act(async () => korean.click());
  expect(host.querySelector("input")!.getAttribute("aria-label")).toBe("전체 문서 검색");
  expect(korean.getAttribute("aria-pressed")).toBe("true");
});
