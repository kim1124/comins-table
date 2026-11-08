// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router";
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
