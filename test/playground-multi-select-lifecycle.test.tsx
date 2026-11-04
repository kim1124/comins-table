// @vitest-environment jsdom

import { act, StrictMode, useState, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { MultiSelect } from "../example/src/components/ui/multi-select";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const hostSelector = "[data-playground-multi-select-portal]";
const options = [{ label: "Alpha", value: "a" }, { label: "Beta", value: "b" }];
let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
});

function Selector({ id }: { id: string }) {
  const [values, setValues] = useState<string[]>([]);
  return <MultiSelect data-testid={id} label={id} options={options} values={values} onChange={setValues} />;
}

function mount(element: ReactElement) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(element));
  return container;
}

function clickTrigger(view: Element, id: string) {
  const trigger = view.querySelector<HTMLButtonElement>(`[data-testid="${id}-trigger"]`);
  expect(trigger).not.toBeNull();
  act(() => trigger!.click());
  return trigger!;
}

describe("Playground MultiSelect portal ownership", () => {
  it("shows the closed selection count without traversing selected values", () => {
    const values = ["a", "b"];
    const nativeIterator = values[Symbol.iterator].bind(values);
    let iterations = 0;
    Object.defineProperty(values, Symbol.iterator, {
      value: () => { iterations++; return nativeIterator(); },
    });
    const view = mount(<MultiSelect data-testid="count-only" label="Count" options={options} values={values} onChange={() => undefined} />);
    expect(view.querySelector("strong")?.textContent).toBe("2개 컬럼");
    expect(iterations).toBe(0);
    clickTrigger(view, "count-only");
    expect(iterations).toBeGreaterThan(0);
    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('[data-testid="count-only-content"] input'));
    expect(inputs.map(input => input.checked)).toEqual([true, true]);
  });

  it("does not attach a popover target while closed", () => {
    const before = Array.from(document.body.children);
    const view = mount(<Selector id="closed" />);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.querySelectorAll(hostSelector)).toHaveLength(0);
    expect(Array.from(document.body.children)).toEqual([...before, view]);
    expect(view.querySelector("button")?.getAttribute("aria-expanded")).toBe("false");
  });

  it("owns a connected body-child target only while open through StrictMode close reopen and unmount", () => {
    const view = mount(<StrictMode><Selector id="strict" /></StrictMode>);
    const trigger = clickTrigger(view, "strict");
    const dialog = document.querySelector('[role="dialog"]');
    const firstHost = dialog?.closest(hostSelector);
    expect(dialog).not.toBeNull();
    expect(view.contains(dialog)).toBe(false);
    expect(trigger.getAttribute("aria-controls")).toBe(dialog?.id);
    expect(firstHost?.parentElement).toBe(document.body);
    expect(firstHost?.getAttribute("role")).toBeNull();
    expect(firstHost?.getAttribute("style")).toBeNull();
    expect(document.querySelectorAll(hostSelector)).toHaveLength(1);

    clickTrigger(view, "strict");
    expect(firstHost?.isConnected).toBe(false);
    expect(document.querySelectorAll(hostSelector)).toHaveLength(0);
    expect(trigger.hasAttribute("aria-controls")).toBe(false);
    clickTrigger(view, "strict");
    const secondHost = document.querySelector(hostSelector);
    expect(secondHost).not.toBe(firstHost);
    expect(secondHost?.parentElement).toBe(document.body);
    act(() => root?.unmount());
    root = undefined;
    expect(secondHost?.isConnected).toBe(false);
    expect(document.querySelectorAll(hostSelector)).toHaveLength(0);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("does not remove another open selector's target when one instance unmounts", () => {
    const tree = (first: boolean) => <>{first && <Selector key="first" id="first" />}<Selector key="second" id="second" /></>;
    const view = mount(tree(true));
    clickTrigger(view, "first");
    clickTrigger(view, "second");
    const first = document.querySelector('[data-testid="first-content"]')?.closest(hostSelector);
    const secondDialog = document.querySelector('[data-testid="second-content"]');
    const second = secondDialog?.closest(hostSelector);
    expect(document.querySelectorAll(hostSelector)).toHaveLength(2);
    expect(first).not.toBe(second);
    act(() => root?.render(tree(false)));
    expect(first?.isConnected).toBe(false);
    expect(second?.isConnected).toBe(true);
    expect(document.querySelector('[data-testid="second-content"]')).toBe(secondDialog);
    expect(document.querySelectorAll(hostSelector)).toHaveLength(1);
  });

  it("preserves the live target checkbox and focus while controlled selection changes", () => {
    const view = mount(<Selector id="selection" />);
    clickTrigger(view, "selection");
    const dialog = document.querySelector('[data-testid="selection-content"]');
    const host = dialog?.closest(hostSelector);
    const checkbox = dialog?.querySelector<HTMLInputElement>("input");
    expect(checkbox).not.toBeNull();
    checkbox!.focus();
    act(() => checkbox!.click());
    expect(checkbox!.checked).toBe(true);
    expect(document.querySelector('[data-testid="selection-content"] input')).toBe(checkbox);
    expect(document.activeElement).toBe(checkbox);
    expect(view.querySelector("strong")?.textContent).toBe("1개 컬럼");
    expect(host?.parentElement).toBe(document.body);
    expect(document.querySelector('[data-testid="selection-content"]')?.closest(hostSelector)).toBe(host);
  });

  it("renders closed server markup without attaching DOM targets", () => {
    const before = Array.from(document.body.children);
    const html = renderToString(<Selector id="server" />);
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('role="dialog"');
    expect(Array.from(document.body.children)).toEqual(before);
    expect(document.querySelectorAll(hostSelector)).toHaveLength(0);
  });
});
