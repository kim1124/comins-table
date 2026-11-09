// @vitest-environment jsdom
import { act } from "react";
import * as jsxRuntime from "react/jsx-dev-runtime";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createDocsPages } from "../example/src/docs/docsRoutes";
import * as guideModule from "../example/src/docs/dataTableOptionGuide";
import { PLAYGROUND_LOCALE_STORAGE_KEY, PlaygroundLocaleProvider, usePlaygroundLocale } from "../example/src/i18n/playground-locale";

vi.mock("react/jsx-dev-runtime", async importOriginal => {
  const actual = await importOriginal<typeof import("react/jsx-dev-runtime")>();
  return { ...actual, jsxDEV: vi.fn(actual.jsxDEV) };
});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let previousLocale: string | null;
let previousLang: string;
const reference = createDocsPages("en").find(page => page.path === "/api/props")!.body;
function SwitchLocale() {
  const { setLocale } = usePlaygroundLocale();
  return <button onClick={() => setLocale("ko")}>Korean</button>;
}
function legacy(groups: ReturnType<typeof guideModule.getImplementedDataTableOptionGuide>) {
  return <div className="docs-reference-list">{groups.map(group => <section key={group.title} className="docs-reference-list__group">
    <h2>{group.title}</h2><dl>{group.items.map(item => <div key={item.name} className="docs-reference-list__item">
      <dt>{item.name}</dt><dd>{item.description}</dd>
    </div>)}</dl>
  </section>)}</div>;
}
beforeEach(() => {
  previousLocale = localStorage.getItem(PLAYGROUND_LOCALE_STORAGE_KEY);
  previousLang = document.documentElement.lang;
  localStorage.setItem(PLAYGROUND_LOCALE_STORAGE_KEY, "en");
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  vi.mocked(jsxRuntime.jsxDEV).mockClear();
});
afterEach(() => {
  act(() => root.unmount()); host.remove(); vi.restoreAllMocks();
  if (previousLocale === null) localStorage.removeItem(PLAYGROUND_LOCALE_STORAGE_KEY);
  else localStorage.setItem(PLAYGROUND_LOCALE_STORAGE_KEY, previousLocale);
  document.documentElement.lang = previousLang;
});
it("keeps all reference terms without constructing per-term React elements", () => {
  act(() => root.render(<PlaygroundLocaleProvider>{reference}</PlaygroundLocaleProvider>));
  const expected = guideModule.getImplementedDataTableOptionGuide("en").reduce((count, group) => count + group.items.length, 0);
  expect(host.querySelectorAll("dt")).toHaveLength(expected);
  expect(expected).toBeGreaterThan(50);
  expect(vi.mocked(jsxRuntime.jsxDEV).mock.calls.filter(([type]) => type === "dt")).toHaveLength(0);
});
it.each(["en", "ko"] as const)("preserves the complete %s DOM and server markup", locale => {
  localStorage.setItem(PLAYGROUND_LOCALE_STORAGE_KEY, locale);
  const expected = renderToStaticMarkup(legacy(guideModule.getImplementedDataTableOptionGuide(locale)));
  const actual = renderToStaticMarkup(<PlaygroundLocaleProvider>{reference}</PlaygroundLocaleProvider>);
  expect(actual).toBe(expected);
  act(() => root.render(<PlaygroundLocaleProvider>{reference}</PlaygroundLocaleProvider>));
  const expectedHost = document.createElement("div"); expectedHost.innerHTML = expected;
  expect(host.isEqualNode(expectedHost)).toBe(true);
});
it("preserves hostile documentation text as text in every field", () => {
  const text = `<img src=x onerror='globalThis.executed=1'> & "quoted" </dd><script>alert(1)</script>`;
  const groups = [{ title: text, items: [{ name: text, description: text }] }];
  vi.spyOn(guideModule, "getImplementedDataTableOptionGuide").mockReturnValue(groups);
  const expected = renderToStaticMarkup(legacy(groups));
  expect(renderToStaticMarkup(<PlaygroundLocaleProvider>{reference}</PlaygroundLocaleProvider>)).toBe(expected);
  act(() => root.render(<PlaygroundLocaleProvider>{reference}</PlaygroundLocaleProvider>));
  expect(host.querySelectorAll("script,img")).toHaveLength(0);
  for (const selector of ["h2", "dt", "dd"]) expect(host.querySelector(selector)?.textContent).toBe(text);
});
it("updates locale and removes the static subtree when the document leaves", () => {
  act(() => root.render(<PlaygroundLocaleProvider><SwitchLocale />{reference}</PlaygroundLocaleProvider>));
  const before = host.querySelector(".docs-reference-list")!.textContent;
  act(() => host.querySelector<HTMLButtonElement>("button")!.click());
  const expected = document.createElement("div"); expected.innerHTML = renderToStaticMarkup(legacy(guideModule.getImplementedDataTableOptionGuide("ko")));
  expect(host.querySelector(".docs-reference-list")?.isEqualNode(expected.firstElementChild)).toBe(true);
  expect(host.querySelector(".docs-reference-list")!.textContent).not.toBe(before);
  const detached = host.querySelector(".docs-reference-list")!;
  act(() => root.render(<main>Another page</main>));
  expect(detached.isConnected).toBe(false);
  expect(host.querySelector(".docs-reference-list")).toBeNull();
});
