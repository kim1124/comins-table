// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { CominsTable } from "../src";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
});

function mount(renderer?: ReactNode, cellSelection = true) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root.render(<CominsTable
    data={[{ id: "a", name: "First" }, { id: "b", name: "Second" }]}
    getRowId={row => row.id}
    cellSelection={cellSelection}
    columns={[{ field: "name", label: "Name", cell: renderer ? { renderer: () => <div data-testid="renderer">{renderer}</div> } : undefined }]}
  />));
  return container.querySelector<HTMLTableCellElement>("[data-testid='cell-a-name']")!;
}

function down(target: Element, type: "pointerdown" | "mousedown", shiftKey = false) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, buttons: 1, shiftKey });
  act(() => { target.dispatchEvent(event); });
  return event;
}

it("leaves native pointer focus available when range selection is disabled", () => {
  const cell = mount(undefined, false);
  expect(down(cell, "pointerdown").defaultPrevented).toBe(false);
});

it("focuses the range anchor without scrolling", () => {
  const cell = mount();
  const focus = vi.spyOn(cell, "focus");
  expect(down(cell, "pointerdown").defaultPrevented).toBe(true);
  expect(cell).toBe(document.activeElement);
  expect(focus).toHaveBeenCalledWith({ preventScroll: true });
});

it.each(["pointerdown", "mousedown"] as const)("owns Shift selection without starting a new drag through %s", (type) => {
  const first = mount();
  const next = container.querySelector<HTMLTableCellElement>("[data-testid='cell-b-name']")!;
  const description = document.createElement("p");
  description.textContent = "Previously selected page description";
  container.append(description);
  const selection = document.getSelection()!;
  const range = document.createRange();
  range.selectNodeContents(description);
  selection.removeAllRanges(); selection.addRange(range);
  expect(selection.toString()).toBe(description.textContent);

  expect(down(next, type, true).defaultPrevented).toBe(true);
  expect(document.activeElement).toBe(next);
  // Focusing a cell may create a collapsed caret; selected page text must clear.
  expect(selection.toString()).toBe("");
  expect(selection.isCollapsed).toBe(true);
  act(() => first.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, buttons: 1 })));
  expect(first.getAttribute("data-range-selected")).not.toBe("true");
});

it.each([
  ["input", <input aria-label="Editor" />],
  ["textarea", <textarea aria-label="Editor" />],
  ["select", <select aria-label="Editor"><option>One</option></select>],
  ["button", <button><span>Action</span></button>],
  ["link", <a href="#test"><span>Link</span></a>],
  ["editable", <div contentEditable suppressContentEditableWarning><span>Edit</span></div>],
  ["custom focusable", <div tabIndex={0}><span>Control</span></div>],
] as const)("preserves %s renderer interaction in both pointer and mouse paths", (_, renderer) => {
  const cell = mount(renderer);
  const content = cell.querySelector("[data-testid=renderer]")!;
  const target = content.querySelector("span") ?? content.firstElementChild!;
  const focus = vi.spyOn(cell, "focus");
  for (const shiftKey of [false, true]) {
    expect(down(target, "pointerdown", shiftKey).defaultPrevented).toBe(false);
    expect(down(target, "mousedown", shiftKey).defaultPrevented).toBe(false);
  }
  const next = container.querySelector("[data-testid='cell-b-name']")!;
  act(() => { next.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, buttons: 1 })); });
  expect(next.getAttribute("data-range-selected")).not.toBe("true");
  expect(focus).not.toHaveBeenCalled();
});

it("respects a renderer that cancels the pointer gesture", () => {
  const cell = mount(<span onPointerDown={event => event.preventDefault()}>Custom gesture</span>);
  const focus = vi.spyOn(cell, "focus");
  down(cell.querySelector("[data-testid=renderer] > span")!, "pointerdown");
  expect(focus).not.toHaveBeenCalled();
});
