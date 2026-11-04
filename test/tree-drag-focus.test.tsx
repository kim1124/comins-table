// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { useCominsTreeDrag } from "../src/tree-drag";
import { flattenCominsTree } from "../src/tree";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
type Row = { id: string; name: string };
const data = [{ item: { id: "a", name: "A" } }, { item: { id: "b", name: "B" } }];
const getRowId = (row: Row) => row.id;
const entries = flattenCominsTree(data, getRowId);
const config = { allowReparent: true };
let root: Root | undefined;
let host: HTMLDivElement | undefined;
const originalElementFromPoint = Object.getOwnPropertyDescriptor(document, "elementFromPoint");
let drag: ReturnType<typeof useCominsTreeDrag<Row>>;

afterEach(() => { act(() => root?.unmount()); host?.remove(); root = undefined; host = undefined; drag = undefined!; if (originalElementFromPoint) Object.defineProperty(document, "elementFromPoint", originalElementFromPoint); else Reflect.deleteProperty(document, "elementFromPoint"); vi.restoreAllMocks(); });
function mount() {
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  const change = vi.fn(), after = vi.fn();
  function Harness() {
    drag = useCominsTreeDrag({ data, entries, getRowId, config, sorted: false, onChangeData: change, onAfterDragRow: after });
    return <div data-comins-table-instance-id="focus-test"><div className="comins-table__body-viewport">{data.map((node, index) => <div key={node.item.id} data-testid={`row-${node.item.id}`} data-comins-row-data-index={index}>
      <button data-comins-tree-drag-handle data-testid={`row-drag-handle-${node.item.id}`}
        onKeyDown={event => drag.onKeyDown(event, { data: node.item, dataIndex: index, id: node.item.id, index })}
        onPointerDown={event => drag.onPointerDown(event, { data: node.item, dataIndex: index, id: node.item.id, index })}>{node.item.name}</button>
    </div>)}</div></div>;
  }
  act(() => root!.render(<Harness />));
  const source = host.querySelector<HTMLButtonElement>("[data-testid='row-drag-handle-a']")!;
  const target = host.querySelector<HTMLButtonElement>("[data-testid='row-drag-handle-b']")!;
  const sourceScroll = vi.fn(), targetScroll = vi.fn();
  Object.defineProperty(source, "scrollIntoView", { configurable: true, value: sourceScroll });
  Object.defineProperty(target, "scrollIntoView", { configurable: true, value: targetScroll });
  source.focus(); return { source, target, sourceScroll, targetScroll, change, after };
}
function key(target: EventTarget, value: string) { act(() => { target.dispatchEvent(new KeyboardEvent("keydown", { key: value, bubbles: true, cancelable: true })); }); }
function keyboardDrop(source: HTMLElement) { key(source, " "); key(window, "ArrowDown"); key(window, "Enter"); }

it("exposes a mounted keyboard source before restoring its focus, only once", () => {
  const f = mount(); keyboardDrop(f.source); expect(f.change).toHaveBeenCalledOnce();
  act(() => drag.restoreFocus());
  expect(f.sourceScroll).toHaveBeenCalledWith({ block: "nearest", inline: "nearest" });
  expect(document.activeElement).toBe(f.source); act(() => drag.restoreFocus()); expect(f.sourceScroll).toHaveBeenCalledOnce();
});
it("keeps pending restoration while a virtual handle is absent and restores the same ID when mounted", () => {
  const f = mount(); keyboardDrop(f.source); const navigate = vi.fn(); drag.navigateRef.current = navigate;
  const parent = f.source.parentElement!; f.source.remove(); act(() => drag.restoreFocus()); expect(navigate).toHaveBeenCalledWith("a"); expect(f.sourceScroll).not.toHaveBeenCalled();
  parent.append(f.source); act(() => drag.restoreFocus()); expect(f.sourceScroll).toHaveBeenCalledOnce(); expect(document.activeElement).toBe(f.source);
});
it("restores cancelled keyboard focus without committing data", () => {
  const f = mount(); key(f.source, " "); key(window, "ArrowDown"); key(window, "Escape"); act(() => drag.restoreFocus());
  expect(f.change).not.toHaveBeenCalled(); expect(f.after.mock.calls[0][0].result).toBe("cancelled"); expect(f.sourceScroll).toHaveBeenCalledOnce(); expect(document.activeElement).toBe(f.source);
});
it("restores the inside-drop parent handle for keyboard moves", () => {
  const f = mount(); key(f.source, " "); key(window, "ArrowDown"); key(window, "ArrowRight"); key(window, "Enter"); act(() => drag.restoreFocus());
  expect(f.change).toHaveBeenCalledOnce(); expect(f.sourceScroll).not.toHaveBeenCalled(); expect(f.targetScroll).toHaveBeenCalledOnce(); expect(document.activeElement).toBe(f.target);
});
it("preserves pointer scroll instead of applying keyboard exposure", () => {
  const f = mount(), viewport = host!.querySelector<HTMLElement>(".comins-table__body-viewport")!; viewport.scrollTop = 137;
  const targetRow = f.target.parentElement!; Object.defineProperty(document, "elementFromPoint", { configurable: true, value: () => targetRow });
  act(() => f.source.dispatchEvent(new MouseEvent("pointerdown", { button: 0, bubbles: true, cancelable: true })));
  act(() => window.dispatchEvent(new MouseEvent("pointerup", { button: 0, clientY: 1, bubbles: true })));
  expect(f.change).toHaveBeenCalledOnce(); expect(drag.pendingScrollTop.current).toBe(137); act(() => drag.restoreFocus());
  expect(f.sourceScroll).not.toHaveBeenCalled(); expect(f.targetScroll).not.toHaveBeenCalled(); expect(viewport.scrollTop).toBe(137); expect(document.activeElement).toBe(f.source);
});
