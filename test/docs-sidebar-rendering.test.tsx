// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { createPath, MemoryRouter, useLocation, useNavigate } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { DocsSidebar } from "../example/src/components/docs/DocsSidebar";
import { createDocsNavGroups, createDocsPages } from "../example/src/docs/docsRoutes";
import * as locale from "../example/src/i18n/playground-locale";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root: ReturnType<typeof createRoot> | undefined;
let host: HTMLDivElement | undefined;
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  localStorage.clear();
  vi.restoreAllMocks();
});

function setup() {
  localStorage.setItem(locale.PLAYGROUND_LOCALE_STORAGE_KEY, "en");
  host = document.createElement("div"); document.body.append(host);
  root = createRoot(host);
  return host;
}

it("does not rebuild the unchanged sidebar for an unrelated parent update", () => {
  setup();
  const groups = createDocsNavGroups(createDocsPages("en"));
  const readLocale = vi.spyOn(locale, "usePlaygroundLocale");
  const render = (tick: number) => <locale.PlaygroundLocaleProvider>
    <MemoryRouter><DocsSidebar groups={groups} /><output>{tick}</output></MemoryRouter>
  </locale.PlaygroundLocaleProvider>;
  act(() => root!.render(render(0)));
  const calls = readLocale.mock.calls.length;
  expect(calls).toBeGreaterThan(0);
  act(() => root!.render(render(1)));
  expect(readLocale.mock.calls.length).toBe(calls);
});

it("continues to update active links and locale through their contexts", () => {
  const element = setup();
  function LocaleControl() {
    const { setLocale } = locale.usePlaygroundLocale();
    return <button onClick={() => setLocale("ko")}>Switch language</button>;
  }
  act(() => root!.render(<locale.PlaygroundLocaleProvider>
    <MemoryRouter initialEntries={["/docs/getting-started"]}>
      <DocsSidebar groups={createDocsNavGroups(createDocsPages("en"))} /><LocaleControl />
    </MemoryRouter>
  </locale.PlaygroundLocaleProvider>));
  const start = element.querySelector<HTMLAnchorElement>('a[href="/docs/getting-started"]')!;
  const header = element.querySelector<HTMLAnchorElement>('a[href="/examples/header"]')!;
  expect(start.getAttribute("aria-current")).toBe("page");
  act(() => header.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 })));
  expect(header.getAttribute("aria-current")).toBe("page");
  expect(start.hasAttribute("aria-current")).toBe(false);
  const englishLabel = element.querySelector("nav")!.getAttribute("aria-label");
  act(() => element.querySelector("button")!.click());
  expect(element.querySelector("nav")!.getAttribute("aria-label")).not.toBe(englishLabel);
  expect(header.getAttribute("aria-current")).toBe("page");
  expect(header.textContent).toBe("Header Basics");
});

function sidebarGroups(paths: string[]) {
  return [{ category: "Test", pages: paths.map(path => ({ path, label: path, body: null, codeSamples: [], summary: "", title: path, category: "Test" })) }];
}

function NavigationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return <><output data-testid="route">{createPath(location)}</output><button data-testid="back" onClick={() => navigate(-1)}>Back</button><button data-testid="forward" onClick={() => navigate(1)}>Forward</button></>;
}

it.each([
  ["/", ["/"]],
  ["/API/PROPS", ["/api/props"]],
  ["/api/props/child", ["/api/props", "/api/props/"]],
  ["/api/propsx", []],
] as const)("preserves NavLink pathname matching at %s", (pathname, active) => {
  const view = setup();
  const paths = ["/", "/api/props", "/api/props/", "/api/prop"];
  act(() => root!.render(<locale.PlaygroundLocaleProvider><MemoryRouter initialEntries={[pathname]}><DocsSidebar groups={sidebarGroups(paths)} /></MemoryRouter></locale.PlaygroundLocaleProvider>));
  expect(Array.from(view.querySelectorAll<HTMLAnchorElement>('a[aria-current="page"]')).map(a => a.textContent)).toEqual(active);
  expect(Array.from(view.querySelectorAll("a.active"))).toEqual(Array.from(view.querySelectorAll('a[aria-current="page"]')));
});

it("preserves basename hrefs, query/hash history, same-URL replace and anchor identity", () => {
  const view = setup();
  const groups = sidebarGroups(["/api/props", "/examples/column-groups"]);
  act(() => root!.render(<locale.PlaygroundLocaleProvider><MemoryRouter basename="/manual" initialEntries={["/manual/docs/getting-started", "/manual/api/props?keep=1#old"]} initialIndex={1}><DocsSidebar groups={groups} /><NavigationProbe /></MemoryRouter></locale.PlaygroundLocaleProvider>));
  const link = view.querySelector<HTMLAnchorElement>('a[href="/manual/api/props"]')!;
  const route = () => view.querySelector('[data-testid="route"]')!.textContent;
  expect(link).not.toBeNull();
  act(() => link.click());
  expect(route()).toBe("/api/props");
  act(() => view.querySelector<HTMLButtonElement>('[data-testid="back"]')!.click());
  expect(route()).toBe("/api/props?keep=1#old");
  act(() => view.querySelector<HTMLButtonElement>('[data-testid="forward"]')!.click());
  expect(route()).toBe("/api/props");
  act(() => link.click());
  act(() => view.querySelector<HTMLButtonElement>('[data-testid="back"]')!.click());
  expect(route()).toBe("/api/props?keep=1#old");
  expect(view.querySelector('a[href="/manual/api/props"]')).toBe(link);
});

it("preserves modified, non-left and cancelled click handling", () => {
  const view = setup();
  act(() => root!.render(<locale.PlaygroundLocaleProvider><MemoryRouter initialEntries={["/api/props"]}><DocsSidebar groups={sidebarGroups(["/api/props", "/examples/column-groups"])} /><NavigationProbe /></MemoryRouter></locale.PlaygroundLocaleProvider>));
  const link = view.querySelector<HTMLAnchorElement>('a[href="/examples/column-groups"]')!;
  const intercepted: boolean[] = [];
  // Observe after the application handler and prevent jsdom's native fallback only.
  view.addEventListener("click", event => { intercepted.push(event.defaultPrevented); event.preventDefault(); });
  for (const options of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
    act(() => link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...options })));
    expect(view.querySelector('[data-testid="route"]')!.textContent).toBe("/api/props");
  }
  expect(intercepted).toEqual([false, false, false, false, false]);
  const cancelled = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
  cancelled.preventDefault();
  act(() => link.dispatchEvent(cancelled));
  expect(view.querySelector('[data-testid="route"]')!.textContent).toBe("/api/props");
});
