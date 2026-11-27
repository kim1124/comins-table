// @vitest-environment jsdom

import { act, Profiler, StrictMode, useState, type ReactElement } from "react";
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

async function clickTrigger(view: Element, id: string) {
  const trigger = view.querySelector<HTMLButtonElement>(`[data-testid="${id}-trigger"]`);
  expect(trigger).not.toBeNull();
  await act(async () => trigger!.click());
  return trigger!;
}

describe("Playground MultiSelect portal ownership", () => {
  it("keeps unchanged placement events from committing and follows moved trigger geometry", async () => {
    let commits = 0;
    const view = mount(<Profiler id="placement" onRender={() => { commits++; }}><Selector id="placement" /></Profiler>);
    const trigger = view.querySelector<HTMLButtonElement>("button")!;
    let left = 20;
    let bottom = 70;
    trigger.getBoundingClientRect = () => ({ x: left, y: bottom - 30, left, right: left + 250, top: bottom - 30, bottom, width: 250, height: 30, toJSON: () => ({}) });
    const closedCommits = commits;
    await clickTrigger(view, "placement");
    expect(commits - closedCommits).toBe(0);
    const dialog = document.querySelector<HTMLElement>('[data-testid="placement-content"]')!;
    expect(dialog.style.left).toBe("20px");
    expect(dialog.style.top).toBe("76px");
    expect(dialog.style.minWidth).toBe("250px");
    const positionedCommits = commits;
    act(() => document.dispatchEvent(new Event("scroll")));
    act(() => window.dispatchEvent(new Event("resize")));
    expect(commits).toBe(positionedCommits);
    left = 35;
    bottom = 100;
    act(() => document.dispatchEvent(new Event("scroll")));
    expect(dialog.style.left).toBe("35px");
    expect(dialog.style.top).toBe("106px");
    expect(commits).toBe(positionedCommits);
    await act(async () => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); });
    expect(dialog.isConnected).toBe(false);
    expect(document.querySelectorAll(hostSelector)).toHaveLength(0);
  });

  it("preserves toggle ordering when multiple trigger clicks share a batch", async () => {
    const view = mount(<Selector id="batched" />);
    const trigger = view.querySelector<HTMLButtonElement>("button")!;
    await act(async () => { trigger.click(); trigger.click(); });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelectorAll(hostSelector)).toHaveLength(0);
    await act(async () => { trigger.click(); trigger.click(); trigger.click(); });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(document.querySelectorAll(hostSelector)).toHaveLength(1);
  });

  it("keeps the committed popup position through batched close and reopen", async () => {
    const view = mount(<Selector id="batched-position" />);
    const trigger = view.querySelector<HTMLButtonElement>("button")!;
    let left = 20;
    trigger.getBoundingClientRect = () => ({
      x: left, y: 20, left, right: left + 250, top: 20, bottom: 50, width: 250, height: 30, toJSON: () => ({}),
    });

    await clickTrigger(view, "batched-position");
    const dialog = document.querySelector<HTMLElement>('[data-testid="batched-position-content"]')!;
    left = 45;
    act(() => window.dispatchEvent(new Event("resize")));
    expect(dialog.style.left).toBe("45px");

    left = 65;
    await act(async () => { trigger.click(); trigger.click(); });

    expect(document.querySelector('[data-testid="batched-position-content"]')).toBe(dialog);
    expect(dialog.style.left).toBe("45px");
    act(() => window.dispatchEvent(new Event("resize")));
    expect(dialog.style.left).toBe("65px");
  });

  it("remeasures after commit when trigger geometry changes during opening and on reopen", async () => {
    const view = mount(<StrictMode><Selector id="moved" /></StrictMode>);
    const trigger = view.querySelector<HTMLButtonElement>("button")!;
    let reads = 0;
    trigger.getBoundingClientRect = () => {
      const left = ++reads === 1 ? 10 : 40;
      return { x: left, y: 20, left, right: left + 180, top: 20, bottom: 50, width: 180, height: 30, toJSON: () => ({}) };
    };
    await clickTrigger(view, "moved");
    const dialog = document.querySelector<HTMLElement>('[data-testid="moved-content"]')!;
    expect(reads).toBeGreaterThan(1);
    expect(dialog.style.left).toBe("40px");
    expect(dialog.style.minWidth).toBe("220px");
    expect(dialog.style.top).toBe("56px");
    await act(async () => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); });
    trigger.getBoundingClientRect = () => ({ x: 90, y: 60, left: 90, right: 390, top: 60, bottom: 90, width: 300, height: 30, toJSON: () => ({}) });
    await clickTrigger(view, "moved");
    const reopened = document.querySelector<HTMLElement>('[data-testid="moved-content"]')!;
    expect(reopened.style.left).toBe("90px");
    expect(reopened.style.top).toBe("96px");
    expect(reopened.style.minWidth).toBe("300px");
  });

  it("shows the closed selection count without traversing selected values", async () => {
    const values = ["a", "b"];
    const nativeIterator = values[Symbol.iterator].bind(values);
    let iterations = 0;
    Object.defineProperty(values, Symbol.iterator, {
      value: () => { iterations++; return nativeIterator(); },
    });
    const view = mount(<MultiSelect data-testid="count-only" label="Count" options={options} values={values} onChange={() => undefined} />);
    expect(view.querySelector("strong")?.textContent).toBe("2개 컬럼");
    expect(iterations).toBe(0);
    await clickTrigger(view, "count-only");
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

  it("owns a connected body-child target only while open through StrictMode close reopen and unmount", async () => {
    const view = mount(<StrictMode><Selector id="strict" /></StrictMode>);
    const trigger = await clickTrigger(view, "strict");
    const dialog = document.querySelector('[role="dialog"]');
    const firstHost = dialog?.closest(hostSelector);
    expect(dialog).not.toBeNull();
    expect(view.contains(dialog)).toBe(false);
    expect(trigger.getAttribute("aria-controls")).toBe(dialog?.id);
    expect(firstHost?.parentElement).toBe(document.body);
    expect(firstHost?.getAttribute("role")).toBeNull();
    expect(firstHost?.getAttribute("style")).toBeNull();
    expect(document.querySelectorAll(hostSelector)).toHaveLength(1);

    await clickTrigger(view, "strict");
    expect(firstHost?.isConnected).toBe(false);
    expect(document.querySelectorAll(hostSelector)).toHaveLength(0);
    expect(trigger.hasAttribute("aria-controls")).toBe(false);
    await clickTrigger(view, "strict");
    const secondHost = document.querySelector(hostSelector);
    expect(secondHost).not.toBe(firstHost);
    expect(secondHost?.parentElement).toBe(document.body);
    act(() => root?.unmount());
    root = undefined;
    expect(secondHost?.isConnected).toBe(false);
    expect(document.querySelectorAll(hostSelector)).toHaveLength(0);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("does not remove another open selector's target when one instance unmounts", async () => {
    const tree = (first: boolean) => <>{first && <Selector key="first" id="first" />}<Selector key="second" id="second" /></>;
    const view = mount(tree(true));
    await clickTrigger(view, "first");
    await clickTrigger(view, "second");
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

  it("preserves the live target checkbox and focus while controlled selection changes", async () => {
    const view = mount(<Selector id="selection" />);
    await clickTrigger(view, "selection");
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
