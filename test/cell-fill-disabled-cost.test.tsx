// @vitest-environment jsdom
import { act, createRef } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { useCominsCellFill } from "../src/cell-fill";
import { createCominsTableState, type CominsCellRange } from "../src/react/core-compat";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let node: HTMLDivElement | undefined;
let root: ReturnType<typeof createRoot> | undefined;
afterEach(() => { act(() => root?.unmount()); node?.remove(); root = undefined; node = undefined; });

function fixture() {
  const rows = [{ id: 0, value: "source" }, { id: 1, value: "target" }];
  const state = createCominsTableState({ rows, columns: [{ field: "value", label: "Value" }], getRowId: row => row.id });
  const range = { anchor: { rowId: 0, columnId: "value" }, focus: { rowId: 1, columnId: "value" } };
  const selected = { ...state, selection: { ...state.selection, range } };
  let reads = 0;
  const columnIds = ["value"];
  Object.defineProperty(columnIds, 0, { get: () => { reads++; return "value"; }, configurable: true, enumerable: true });
  const tableRoot = createRef<HTMLDivElement>(), viewport = createRef<HTMLDivElement>();
  const commits: Array<[CominsCellRange, CominsCellRange]> = [];
  let controller: ReturnType<typeof useCominsCellFill<typeof rows[number]>>;
  function Probe({ enabled }: { enabled: boolean }) {
    controller = useCominsCellFill({ enabled, state: selected, rowIds: state.rowIds, columnIds, root: tableRoot, viewport,
      addressAtPoint: () => null, canUseRange: () => true,
      onFill: (source, target) => { commits.push([source, target]); return true; },
      registerGesture: () => {}, releaseGesture: () => {}, scrollHorizontal: () => {},
    });
    return <>{controller.handle}{controller.menu}</>;
  }
  const render = (enabled: boolean) => {
    if (!root) { node = document.createElement("div"); document.body.append(node); root = createRoot(node); }
    act(() => root!.render(<Probe enabled={enabled} />));
  };
  return { render, get current() { return controller!; }, get reads() { return reads; }, commits };
}

describe("disabled cell fill work", () => {
  it("does not enumerate fill geometry inputs while disabled", () => {
    const f = fixture(); f.render(false);
    expect(f.current.fillSelection("down")).toBe(false);
    expect(f.commits).toEqual([]);
    expect(f.reads).toBe(0);
  });

  it("produces no interactive fill control while disabled", () => {
    const f = fixture(); f.render(false);
    expect(node!.querySelector('[data-testid="fill-handle"]')).toBeNull();
    expect(node!.querySelector('[role="dialog"]')).toBeNull();
  });

  it("preserves enabled toggles and a previously retained fill method", () => {
    const f = fixture(); f.render(false);
    const retained = f.current.fillSelection;
    f.render(true);
    expect(node!.querySelector('[data-testid="fill-handle"]')).not.toBeNull();
    act(() => expect(retained("down")).toBe(true));
    expect(f.commits).toEqual([[
      { anchor: { rowId: 0, columnId: "value" }, focus: { rowId: 0, columnId: "value" } },
      { anchor: { rowId: 0, columnId: "value" }, focus: { rowId: 1, columnId: "value" } },
    ]]);
    f.render(false);
    act(() => expect(retained("down")).toBe(false));
    expect(f.commits).toHaveLength(1);
    f.render(true);
    act(() => expect(retained("down")).toBe(true));
    expect(f.commits).toHaveLength(2);
  });
});
