// @vitest-environment jsdom
import { act, Children } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, useLocation, useNavigate, type NavigateFunction } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DocsShell } from "../example/src/components/docs/DocsShell";
import * as article from "../example/src/components/docs/DocsArticle";
import { PLAYGROUND_LOCALE_STORAGE_KEY, PlaygroundLocaleProvider } from "../example/src/i18n/playground-locale";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root: ReturnType<typeof createRoot>;
let host: HTMLDivElement;
let navigate: NavigateFunction;
let previousLocale: string | null;
let previousLang: string;
let scrollDescriptor: PropertyDescriptor | undefined;
function RouteProbe() {
  const location = useLocation();
  navigate = useNavigate();
  return <output data-path={location.pathname} data-key={location.key} />;
}
beforeEach(() => {
  previousLocale = localStorage.getItem(PLAYGROUND_LOCALE_STORAGE_KEY);
  previousLang = document.documentElement.lang;
  localStorage.setItem(PLAYGROUND_LOCALE_STORAGE_KEY, "en");
  scrollDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollTo");
  Object.defineProperty(HTMLElement.prototype, "scrollTo", { configurable: true, value: function(this: HTMLElement, options: ScrollToOptions) {
    this.scrollTop = options.top ?? this.scrollTop;
    this.scrollLeft = options.left ?? this.scrollLeft;
  } });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  if (scrollDescriptor) Object.defineProperty(HTMLElement.prototype, "scrollTo", scrollDescriptor);
  else Reflect.deleteProperty(HTMLElement.prototype, "scrollTo");
  if (previousLocale === null) localStorage.removeItem(PLAYGROUND_LOCALE_STORAGE_KEY);
  else localStorage.setItem(PLAYGROUND_LOCALE_STORAGE_KEY, previousLocale);
  document.documentElement.lang = previousLang;
});
async function mount() {
  await act(async () => root.render(
    <MemoryRouter initialEntries={["/api/props"]}>
      <PlaygroundLocaleProvider><RouteProbe /><DocsShell /></PlaygroundLocaleProvider>
    </MemoryRouter>,
  ));
}
it("reuses unchanged article work on same-path navigation while resetting scroll", async () => {
  const renders = vi.spyOn(article, "DocsArticle");
  await mount();
  const content = host.querySelector<HTMLElement>(".docs-shell__content")!;
  const firstArticle = host.querySelector(".docs-article");
  const calls = renders.mock.calls.length;
  expect(calls).toBe(1);
  let previousKey = host.querySelector("output")!.dataset.key;
  for (let count = 0; count < 3; count++) {
    content.scrollTop = 200;
    await act(async () => { await navigate("/api/props"); });
    const key = host.querySelector("output")!.dataset.key;
    expect(key).not.toBe(previousKey);
    previousKey = key;
    expect(content.scrollTop).toBe(0);
    expect(host.querySelector(".docs-article")).toBe(firstArticle);
  }
  expect(renders.mock.calls.length).toBe(calls);
});
it("remounts the article when pathname changes even if it resolves to the same document", async () => {
  await mount();
  const first = host.querySelector(".docs-article");
  await act(async () => { await navigate("/api/props/"); });
  expect(host.querySelector("output")!.dataset.path).toBe("/api/props/");
  const second = host.querySelector(".docs-article");
  expect(second).not.toBeNull();
  expect(second).not.toBe(first);
  expect(first?.isConnected).toBe(false);
});
it("updates real document content on locale change without replacing its article", async () => {
  await mount();
  const first = host.querySelector(".docs-article");
  const previousText = host.querySelector(".docs-article__body")!.textContent;
  const korean = Array.from(host.querySelectorAll("button")).find(button => button.textContent === "한")!;
  await act(async () => korean.click());
  expect(host.querySelector(".docs-article")).toBe(first);
  expect(host.querySelector(".docs-article__body")!.textContent).not.toBe(previousText);
  expect(host.querySelector("input[type=search]")!.getAttribute("aria-label")).toBe("전체 문서 검색");
});

it("reuses route definitions across navigation and rebuilds them when locale changes", async () => {
  const routeConversions = vi.spyOn(Children, "forEach");
  await mount();
  const initialConversions = routeConversions.mock.calls.length;
  expect(initialConversions).toBeGreaterThan(0);
  for (const path of ["/api/props/", "/api/props", "/api/props"]) {
    await act(async () => { await navigate(path); });
    expect(host.querySelector("output")!.dataset.path).toBe(path);
  }
  expect(routeConversions.mock.calls.length).toBe(initialConversions);
  const korean = Array.from(host.querySelectorAll("button")).find(button => button.textContent === "한")!;
  await act(async () => korean.click());
  const localizedConversions = routeConversions.mock.calls.length;
  expect(localizedConversions).toBeGreaterThan(initialConversions);
  await act(async () => { await navigate("/api/props/"); });
  expect(routeConversions.mock.calls.length).toBe(localizedConversions);
  expect(host.querySelector("input[type=search]")!.getAttribute("aria-label")).toBe("전체 문서 검색");
});
