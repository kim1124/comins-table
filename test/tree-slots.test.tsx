// @vitest-environment jsdom
import { act, createRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CominsTable, type CominsTableRef, type CominsTreeNode, type CominsTreeSlots } from "../src";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
type Row = { id: string; name: string };
const columns = [{ field: "name", label: "Name", cell: { renderer: ({ row }: { row: { data: Row } }) => <strong>{row.data.name}</strong> } }];
const data: CominsTreeNode<Row>[] = [{ item: { id: "root", name: "Root" }, expand: false, children: [{ item: { id: "child", name: "Child" } }] }];
let container: HTMLDivElement;
let root: Root;
function render(content: React.ReactNode) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root.render(content));
}
afterEach(() => { act(() => root?.unmount()); container?.remove(); });
function click(element: Element) { act(() => element.dispatchEvent(new MouseEvent("click", { bubbles: true }))); }

function dispatchClipboard(target: Element, type: "copy" | "paste", text = "") {
  const values = new Map([["text/plain", text]]);
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", { value: {
    types: ["text/plain"],
    getData: (format: string) => values.get(format) ?? "",
    setData: (format: string, value: string) => values.set(format, value),
  } });
  act(() => target.dispatchEvent(event));
  return { event, text: values.get("text/plain") };
}

const clipboardControls = [
  { slot: "leading", control: "button" },
  { slot: "content", control: "checkbox" },
  { slot: "trailing", control: "focusable" },
] as const;

function ClipboardSlotsExample({ slot, control }: typeof clipboardControls[number]) {
  const [nodes, setNodes] = useState(data);
  const [pasted, setPasted] = useState("");
  const props = {
    "data-testid": "clipboard-control",
    onPaste: (event: React.ClipboardEvent) => setPasted(event.clipboardData.getData("text/plain")),
    onCopy: (event: React.ClipboardEvent) => event.clipboardData.setData("text/plain", "Control text"),
  };
  return <><CominsTable tree clipboard clipboardPaste columns={[{ field: "name", label: "Name" }]}
    data={nodes} getRowId={row => row.id} onChangeData={setNodes} treeSlots={{ [slot]: () =>
      control === "button" ? <button {...props}>Details</button>
        : control === "checkbox" ? <input type="checkbox" {...props} />
          : <span role="button" tabIndex={0} {...props}>Details</span>,
    }} />
    <output data-testid="business-value">{nodes[0]!.item.name}</output>
    <output data-testid="control-paste">{pasted}</output></>;
}

describe("Tree slots", () => {
  it.each(clipboardControls)("keeps paste on a $slot $control out of business data", options => {
    render(<ClipboardSlotsExample {...options} />);
    const control = container.querySelector<HTMLElement>('[data-testid="clipboard-control"]')!;
    control.focus();
    act(() => control.dispatchEvent(new KeyboardEvent("keydown", { key: "v", ctrlKey: true, bubbles: true, cancelable: true })));
    const result = dispatchClipboard(control, "paste", "Replacement");
    expect(container.querySelector('[data-testid="business-value"]')?.textContent).toBe("Root");
    expect(container.querySelector('[data-testid="control-paste"]')?.textContent).toBe("Replacement");
    expect(result.event.defaultPrevented).toBe(false);
  });

  it.each(clipboardControls)("preserves clipboard content written by a $slot $control", options => {
    render(<ClipboardSlotsExample {...options} />);
    const control = container.querySelector<HTMLElement>('[data-testid="clipboard-control"]')!;
    control.focus();
    const result = dispatchClipboard(control, "copy");
    expect(result.text).toBe("Control text");
    expect(result.event.defaultPrevented).toBe(false);
  });

  it("keeps copy and paste working on plain slot content", () => {
    function Example() {
      const [nodes, setNodes] = useState(data);
      return <CominsTable tree clipboard clipboardPaste columns={[{ field: "name", label: "Name" }]}
        data={nodes} getRowId={row => row.id} onChangeData={setNodes}
        treeSlots={{ content: ({ defaultContent }) => <span data-testid="plain-content">{defaultContent}</span> }} />;
    }
    render(<Example />);
    const content = container.querySelector('[data-testid="plain-content"]')!;
    click(content);
    expect(dispatchClipboard(content, "copy").text).toBe("Root");
    expect(dispatchClipboard(content, "paste", "Updated").event.defaultPrevented).toBe(true);
    expect(content.textContent).toBe("Updated");
  });

  it("preserves disclosure and renderer content while exposing current node state to every slot", () => {
    function Example() {
      const [nodes, setNodes] = useState(data);
      return <CominsTable tree columns={columns} data={nodes} getRowId={row => row.id} onChangeData={setNodes}
        treeSlots={{
          leading: ({ item, depth, rowId }) => <span data-testid={`leading-${rowId}`}>{item.id}:{depth}</span>,
          content: ({ defaultContent }) => <em>{defaultContent}</em>,
          trailing: ({ expanded, hasChildren, rowId }) => <span data-testid={`trailing-${rowId}`}>{String(expanded)}:{String(hasChildren)}</span>,
        }} />;
    }
    render(<Example />);
    expect(container.querySelector('[data-testid="leading-root"]')?.textContent).toBe("root:0");
    expect(container.querySelector('[data-testid="cell-root-name"] em strong')?.textContent).toBe("Root");
    expect(container.querySelector('[data-testid="trailing-root"]')?.textContent).toBe("false:true");
    const expander = container.querySelector('[data-testid="tree-expander-root"]')!;
    expect(expander.getAttribute("aria-expanded")).toBe("false");
    click(expander);
    expect(expander.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector('[data-testid="trailing-root"]')?.textContent).toBe("true:true");
    expect(container.querySelector('[data-testid="leading-child"]')?.textContent).toBe("child:1");
    expect(container.querySelector('[data-testid="trailing-child"]')?.textContent).toBe("true:false");
  });

  it("allows intentional empty content while preserving the expander", () => {
    render(<CominsTable tree columns={columns} data={data} getRowId={row => row.id}
      treeSlots={{ leading: () => null, content: () => null, trailing: () => <span>Action</span> }} />);
    const cell = container.querySelector('[data-testid="cell-root-name"]')!;
    expect(cell.textContent).toBe("Action");
    expect(cell.querySelector('[data-testid="tree-expander-root"]')).not.toBeNull();
    expect(cell.querySelector('[data-comins-tree-slot="leading"]')).toBeNull();
  });

  it.each(["leading", "content", "trailing"] as const)("isolates interactive %s content without cancelling its own events", slot => {
    const ref = createRef<CominsTableRef<Row>>();
    const onClickCell = vi.fn();
    const onClickRow = vi.fn();
    const onDoubleClickCell = vi.fn();
    const onContextMenuCell = vi.fn();
    function Example() {
      const [count, setCount] = useState(0);
      const slots: CominsTreeSlots<Row> = { [slot]: () => <button onClick={() => setCount(value => value + 1)}><span data-testid="action">Action {count}</span></button> };
      return <CominsTable ref={ref} tree cellSelection columns={columns} data={data} getRowId={row => row.id}
        onClickCell={onClickCell} onClickRow={onClickRow} onDoubleClickCell={onDoubleClickCell} onContextMenuCell={onContextMenuCell} treeSlots={slots} />;
    }
    render(<Example />);
    const action = container.querySelector('[data-testid="action"]');
    expect(action).not.toBeNull();
    act(() => {
      action!.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
      action!.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
      action!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      action!.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
      action!.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
    });
    expect(container.querySelector('[data-testid="action"]')?.textContent).toBe("Action 1");
    expect(ref.current?.getSelectedRows()).toEqual([]);
    expect(ref.current?.getSelectedCells()).toEqual([]);
    expect(onClickCell).not.toHaveBeenCalled();
    expect(onClickRow).not.toHaveBeenCalled();
    expect(onDoubleClickCell).not.toHaveBeenCalled();
    expect(onContextMenuCell).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="tree-expander-root"]')?.getAttribute("aria-expanded")).toBe("false");
  });

  it.each(["nested", "associated"] as const)("isolates %s checkbox labels while retaining native activation", association => {
    const ref = createRef<CominsTableRef<Row>>();
    const onClickCell = vi.fn();
    render(<CominsTable ref={ref} tree columns={columns} data={data} getRowId={row => row.id}
      onClickCell={onClickCell} treeSlots={{ trailing: () => association === "nested"
        ? <label><input type="checkbox" /><span data-testid="label-text">Enabled</span></label>
        : <><input id="tree-slot-check" type="checkbox" /><label htmlFor="tree-slot-check"><span data-testid="label-text">Enabled</span></label></> }} />);
    const label = container.querySelector('[data-testid="label-text"]')!;
    act(() => label.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 })));
    click(label);
    expect(container.querySelector("input")?.checked).toBe(true);
    expect(ref.current?.getSelectedRows()).toEqual([]);
    expect(onClickCell).not.toHaveBeenCalled();
  });

  it("keeps plain custom labels selectable and uses the original renderer when content is omitted", () => {
    const ref = createRef<CominsTableRef<Row>>();
    render(<CominsTable ref={ref} tree columns={columns} data={data} getRowId={row => row.id}
      treeSlots={{ leading: () => <label data-testid="plain-icon">Icon</label> }} />);
    expect(container.querySelector('[data-testid="cell-root-name"] strong')?.textContent).toBe("Root");
    const icon = container.querySelector('[data-testid="plain-icon"]');
    expect(icon).not.toBeNull();
    click(icon!);
    expect(ref.current?.getSelectedRows()).toEqual([{ id: "root", name: "Root" }]);
  });
});
