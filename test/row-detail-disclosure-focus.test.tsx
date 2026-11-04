// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { CominsTable, type CominsRowId, type CominsTableColumn } from "../src";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

it("restores the current detail toggle after row identity replacement and removal", () => {
  type Row = { id: string; value: string };
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const columns: CominsTableColumn<Row>[] = [{ field: "value", label: "Value" }];
  let data: Row[] = [{ id: "before", value: "Before" }];
  let expanded: CominsRowId[] = ["before"];
  const render = () => root.render(<CominsTable data={data} columns={columns} getRowId={row => row.id}
    expandedRowIds={expanded} onChangeExpandedRowIds={next => { expanded = next; render(); }}
    rowDetail={{ render: ({ row }) => <button data-testid="close-current-detail" onClick={() => {
      expanded = expanded.filter(id => id !== row.id);
      render();
    }}>Close</button> }} />);
  const toggle = (id: string) => host.querySelector<HTMLButtonElement>(`[data-testid="row-detail-toggle-${id}"]`)!;
  const close = () => {
    const button = host.querySelector<HTMLButtonElement>("[data-testid='close-current-detail']")!;
    button.focus();
    expect(document.activeElement).toBe(button);
    act(() => button.click());
  };
  try {
    act(render);
    const before = toggle("before");
    close();
    expect(document.activeElement).toBe(before);
    expect(before.getAttribute("aria-expanded")).toBe("false");

    act(() => { data = [{ id: "after", value: "After" }]; render(); });
    expect(before.isConnected).toBe(false);
    expect(host.querySelector("[data-testid='row-detail-toggle-before']")).toBeNull();
    const after = toggle("after");
    act(() => after.click());
    expect(after.getAttribute("aria-expanded")).toBe("true");
    close();
    expect(document.activeElement).toBe(after);

    act(() => { data = []; render(); });
    expect(after.isConnected).toBe(false);
    expect(host.querySelector("[data-testid^='row-detail-toggle-']")).toBeNull();
    act(() => { data = [{ id: "after", value: "Reinserted" }]; render(); });
    const reinserted = toggle("after");
    expect(reinserted).not.toBe(after);
    act(() => reinserted.click());
    close();
    expect(document.activeElement).toBe(reinserted);
  } finally {
    act(() => root.unmount());
    host.remove();
  }
});
