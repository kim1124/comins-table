// @vitest-environment jsdom
import { act, Profiler, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { createCominsTableState } from "../src";
import { useCominsCellFill } from "../src/cell-fill";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

it("does not enqueue a second commit for an idle fill menu when layout changes", () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const commits: string[] = [];
  const onFill = vi.fn(() => false);
  function Harness() {
    const [state, setState] = useState(() => createCominsTableState({
      columns: [{ field: "id" }], rows: [{ id: "a" }], getRowId: row => row.id,
    }));
    const table = useRef<HTMLDivElement>(null);
    const fill = useCominsCellFill({
      enabled: false, state, rowIds: state.rowIds, columnIds: state.columnOrder,
      root: table, viewport: table, addressAtPoint: () => null, canUseRange: () => false,
      onFill, registerGesture: () => {}, releaseGesture: () => {}, scrollHorizontal: () => {},
    });
    return <div ref={table}>
      <button onClick={() => setState(current => ({ ...current, columnOrder: [...current.columnOrder] }))}>Apply layout</button>
      {fill.handle}{fill.menu}
    </div>;
  }
  try {
    act(() => root.render(<Profiler id="idle-fill" onRender={(_id, phase) => commits.push(phase)}><Harness /></Profiler>));
    commits.length = 0;
    act(() => host.querySelector("button")!.click());
    expect(host.querySelectorAll("button")).toHaveLength(1);
    expect(onFill).not.toHaveBeenCalled();
    expect(commits).toEqual(["update"]);
  } finally {
    act(() => root.unmount());
    host.remove();
  }
});
