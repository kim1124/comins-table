// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import {
  defineLocalizedText,
  PLAYGROUND_LOCALE_STORAGE_KEY,
  PlaygroundLocaleProvider,
  resolveLocalizedText,
  usePlaygroundLocale,
} from "../example/src/i18n/playground-locale";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  window.localStorage.clear();
  document.documentElement.lang = "";
  root = undefined;
  container = undefined;
});

function LocaleProbe() {
  const { locale, setLocale, text } = usePlaygroundLocale();

  return (
    <div>
      <output data-testid="locale">{locale}</output>
      <output data-testid="message">{text(defineLocalizedText("검색", "Search"))}</output>
      <button onClick={() => setLocale("en")} type="button">
        EN
      </button>
    </div>
  );
}

function renderProbe() {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  act(() => {
    root?.render(
      <PlaygroundLocaleProvider>
        <LocaleProbe />
      </PlaygroundLocaleProvider>,
    );
  });

  return container;
}

describe("Playground locale state", () => {
  it("defaults to Korean and persists an English selection with html lang", () => {
    const element = renderProbe();

    expect(element.querySelector("[data-testid='locale']")?.textContent).toBe("ko");
    expect(element.querySelector("[data-testid='message']")?.textContent).toBe("검색");
    expect(document.documentElement.lang).toBe("ko");

    act(() => {
      element.querySelector("button")?.click();
    });

    expect(element.querySelector("[data-testid='locale']")?.textContent).toBe("en");
    expect(element.querySelector("[data-testid='message']")?.textContent).toBe("Search");
    expect(window.localStorage.getItem(PLAYGROUND_LOCALE_STORAGE_KEY)).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("restores a valid saved locale and rejects invalid saved values", () => {
    window.localStorage.setItem(PLAYGROUND_LOCALE_STORAGE_KEY, "en");
    let element = renderProbe();
    expect(element.querySelector("[data-testid='locale']")?.textContent).toBe("en");

    act(() => root?.unmount());
    element.remove();
    root = undefined;
    container = undefined;
    window.localStorage.setItem(PLAYGROUND_LOCALE_STORAGE_KEY, "unsupported");

    element = renderProbe();
    expect(element.querySelector("[data-testid='locale']")?.textContent).toBe("ko");
    expect(window.localStorage.getItem(PLAYGROUND_LOCALE_STORAGE_KEY)).toBe("ko");
  });

  it("fails explicitly when either localized value is empty", () => {
    expect(() => defineLocalizedText("", "Search")).toThrow(/incomplete localized text/u);
    expect(() => defineLocalizedText("검색", "   ")).toThrow(/incomplete localized text/u);
    expect(() => resolveLocalizedText({ en: "Search", ko: "" }, "ko")).toThrow(
      /incomplete localized text/u,
    );
  });
});
