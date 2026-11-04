// @vitest-environment jsdom
import type { MouseEvent as ReactMouseEvent } from "react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { prepareDocsSidebarNavigation } from "../example/src/components/docs/prepareDocsSidebarNavigation";

let host: HTMLDivElement;
let input: HTMLInputElement;
let anchor: HTMLAnchorElement;
let blurValues: string[];

beforeEach(() => {
  window.history.replaceState({}, "", "/examples/component");
  host = document.createElement("div");
  host.className = "comins-table";
  host.innerHTML = '<div class="comins-table__component-virtual-list"><input class="comins-table__component-virtual-list-search"></div><a href="/docs/getting-started">Start</a>';
  document.body.append(host);
  input = host.querySelector("input")!;
  input.value = "검색-9999";
  anchor = host.querySelector("a")!;
  blurValues = [];
  input.addEventListener("blur", () => blurValues.push(input.value));
  input.focus();
});
afterEach(() => { host.remove(); });

function click(options: MouseEventInit = {}, prevented = false) {
  if (prevented) anchor.addEventListener("click", event => event.preventDefault(), { once: true });
  anchor.addEventListener("click", event => {
    prepareDocsSidebarNavigation(event as unknown as ReactMouseEvent<HTMLAnchorElement>);
    // 실제 NavLink도 사용자 handler 뒤에 기본 이동을 취소하고 SPA 이동을 처리한다.
    event.preventDefault();
  }, { once: true });
  anchor.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...options }));
}

it("blurs a built-in list search once before a different route without changing its query", () => {
  click();
  expect(document.activeElement).not.toBe(input);
  expect(blurValues).toEqual(["검색-9999"]);
  expect(input.value).toBe("검색-9999");
});

it.each([
  { metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { button: 2 },
])("preserves focus and blur callbacks for modified navigation %j", options => {
  click(options);
  expect(document.activeElement).toBe(input);
  expect(blurValues).toEqual([]);
});

it("does not blur when a prior handler cancelled navigation", () => {
  click({}, true);
  expect(document.activeElement).toBe(input);
  expect(blurValues).toEqual([]);
});

it.each(["/examples/component", "/examples/component?fixture=large", "/examples/component#detail"])("preserves focus for the current route %s", href => {
  anchor.href = href;
  click();
  expect(document.activeElement).toBe(input);
  expect(blurValues).toEqual([]);
});

it.each(["new-tab", "download", "external"])("preserves focus for %s navigation", mode => {
  if (mode === "new-tab") anchor.target = "_blank";
  if (mode === "download") anchor.download = "rows.csv";
  if (mode === "external") anchor.href = "https://example.com/docs";
  click();
  expect(document.activeElement).toBe(input);
  expect(blurValues).toEqual([]);
});

it("leaves application input focus and blur-based commits untouched", () => {
  input.className = "comins-table__component-input";
  click();
  expect(document.activeElement).toBe(input);
  expect(blurValues).toEqual([]);
});

it("does not treat a lookalike input outside a virtual list as owned search", () => {
  input.parentElement!.className = "application-editor";
  click();
  expect(document.activeElement).toBe(input);
  expect(blurValues).toEqual([]);
});

function useBuiltInFilterValueInput() {
  window.history.replaceState({}, "", "/examples/column-filtering");
  const field = input.parentElement!;
  field.className = "comins-column-filter__field";
  const popup = document.createElement("span");
  popup.className = "comins-column-filter__popover";
  field.replaceWith(popup);
  popup.append(field);
  input.className = "";
  input.dataset.cominsColumnFilterValueInput = "true";
  // fixture 재배치에서 생긴 blur는 실제 이동 검증의 관찰 구간에서 제외한다.
  input.focus();
  blurValues = [];
}

it.each(["text", "number", "date", "search"])("ends built-in filter %s focus before a route unmount without changing its value", type => {
  useBuiltInFilterValueInput();
  input.type = type;
  input.value = type === "number" ? "123" : type === "date" ? "2026-10-29" : "beta";
  const value = input.value;
  input.focus();
  blurValues = [];
  click();
  expect(document.activeElement).not.toBe(input);
  expect(blurValues).toEqual([value]);
  expect(input.value).toBe(value);
});

it("preserves a custom filter input and its blur-based commit", () => {
  useBuiltInFilterValueInput();
  delete input.dataset.cominsColumnFilterValueInput;
  click();
  expect(document.activeElement).toBe(input);
  expect(blurValues).toEqual([]);
});

it("does not blur a marked filter lookalike outside the owned popup", () => {
  input.className = "";
  input.dataset.cominsColumnFilterValueInput = "true";
  click();
  expect(document.activeElement).toBe(input);
  expect(blurValues).toEqual([]);
});

it("preserves filter focus for modified or cancelled navigation", () => {
  useBuiltInFilterValueInput();
  click({ ctrlKey: true });
  expect(document.activeElement).toBe(input);
  click({}, true);
  expect(document.activeElement).toBe(input);
  expect(blurValues).toEqual([]);
});
