// @vitest-environment jsdom
import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { RowExpandFeature } from "../example/src/features/RowExpandFeature";
import { PlaygroundLocaleProvider } from "../example/src/i18n/playground-locale";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  vi.useFakeTimers();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
});

function mount(strict: boolean) {
  const feature = <PlaygroundLocaleProvider><RowExpandFeature /></PlaygroundLocaleProvider>;
  act(() => root.render(strict ? <StrictMode>{feature}</StrictMode> : feature));
  const toggle = host.querySelector<HTMLButtonElement>('[data-testid="row-detail-toggle-auto-1"]');
  expect(toggle).not.toBeNull();
  act(() => toggle!.click());
  const grow = host.querySelector<HTMLButtonElement>('[data-testid="auto-detail-grow-auto-1"]');
  expect(grow).not.toBeNull();
  return grow!;
}

it.each([false, true])("cancels every pending detail growth when the feature exits (StrictMode=%s)", strict => {
  const grow = mount(strict);
  act(() => { grow.click(); grow.click(); });
  expect(vi.getTimerCount()).toBe(2);
  act(() => root.render(<p>Table-free page</p>));
  expect(host.querySelector('[data-comins-table-instance-id]')).toBeNull();
  expect(vi.getTimerCount()).toBe(0);
  act(() => vi.advanceTimersByTime(100));
  expect(host.textContent).toBe("Table-free page");
});

it.each([false, true])("preserves delayed growth and disables the action after completion (StrictMode=%s)", strict => {
  const grow = mount(strict);
  act(() => grow.click());
  act(() => vi.advanceTimersByTime(49));
  expect(host.querySelector('[data-testid="auto-detail-grown-content"]')).toBeNull();
  expect(grow.disabled).toBe(false);
  act(() => vi.advanceTimersByTime(1));
  expect(host.querySelector('[data-testid="auto-detail-grown-content"]')).not.toBeNull();
  expect(grow.disabled).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});
