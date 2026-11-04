// @vitest-environment jsdom
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CominsTable, type CominsTableColumn } from "../src";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root: ReturnType<typeof createRoot> | undefined;
let host: HTMLDivElement | undefined;
afterEach(() => { act(() => root?.unmount()); host?.remove(); root = undefined; host = undefined; });
function render(element: ReactElement) { host = document.createElement("div"); document.body.append(host); root = createRoot(host); act(() => root?.render(element)); return host; }
type Row = { id: string; name: string };
function setup(kind: "header" | "cell") {
  const onValueChange = vi.fn(), onCompositionStart = vi.fn(), onCompositionEnd = vi.fn();
  const component = { type: "input" as const, props: { "aria-label": "ime-editor", value: "Alpha", onCompositionStart, onCompositionEnd }, onValueChange };
  const columns: CominsTableColumn<Row>[] = [{ field: "name", label: "Name", ...(kind === "header" ? { header: { components: [component] } } : { cell: { components: [component] } }) }];
  const container = render(<CominsTable columns={columns} data={[{ id: "a", name: "Alpha" }]} getRowId={row => row.id} />);
  if (kind === "cell") act(() => container.querySelector("[data-testid='row-a']")?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  const input = container.querySelector<HTMLInputElement>("input[aria-label='ime-editor']")!;
  expect(input).not.toBeNull(); act(() => input.focus());
  const draft = (value: string) => act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value); input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertCompositionText", data: value, isComposing: true })); input.dispatchEvent(new Event("change", { bubbles: true })); });
  return { input, draft, onValueChange, onCompositionStart, onCompositionEnd };
}
describe.each(["header", "cell"] as const)("%s input IME commit boundary", kind => {
  it("keeps the draft and focus on composition Enter, then commits once after compositionend", () => {
    const { input, draft, onValueChange, onCompositionStart, onCompositionEnd } = setup(kind);
    act(() => input.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: "" })));
    draft("가"); expect(onValueChange).not.toHaveBeenCalled();
    act(() => input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter", isComposing: true })));
    expect(onValueChange).not.toHaveBeenCalled(); expect(document.activeElement).toBe(input); expect(input.value).toBe("가");
    act(() => input.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "가" })));
    act(() => input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" })));
    expect(onValueChange).toHaveBeenCalledTimes(1); expect(onValueChange.mock.calls[0][0].value).toBe("가");
    act(() => input.dispatchEvent(new FocusEvent("focusout", { bubbles: true })));
    expect(onValueChange).toHaveBeenCalledTimes(1); expect(onCompositionStart).toHaveBeenCalledTimes(1); expect(onCompositionEnd).toHaveBeenCalledTimes(1);
  });
  it("ignores Enter when only the composition lifecycle marks the input as composing", () => {
    const { input, draft, onValueChange } = setup(kind);
    act(() => input.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true })));
    draft("한");
    act(() => input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter", isComposing: false })));
    expect(onValueChange).not.toHaveBeenCalled(); expect(document.activeElement).toBe(input);
  });
  it("ignores native isComposing even without a compositionstart callback", () => {
    const { input, draft, onValueChange } = setup(kind); draft("한글");
    act(() => input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter", isComposing: true })));
    expect(onValueChange).not.toHaveBeenCalled(); expect(document.activeElement).toBe(input);
  });
  it("ignores the legacy IME confirmation keyCode229 even when isComposing is false", () => {
    const { input, draft, onValueChange } = setup(kind); draft("글");
    act(() => input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter", keyCode: 229, isComposing: false })));
    expect(onValueChange).not.toHaveBeenCalled(); expect(document.activeElement).toBe(input);
    act(() => input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" })));
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });
});
