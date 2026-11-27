// @vitest-environment jsdom
import { act, createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { CominsTable, type CominsTableRef } from "../src";
import * as body from "../src/react/body-renderer";
import * as headers from "../src/react/header-renderer";
import * as compat from "../src/react/core-compat";
import * as layouts from "../src/core/layout/columns";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const data = [{ id: "a", value: 1 }, { id: "b", value: 2 }, { id: "c", value: 3 }];
const columns = [{ field: "id" }, { field: "value" }];
const columnGroups = [{ id: "g", children: ["id", "value"] }];
const getRowId = (row: (typeof data)[number]) => row.id;

it("reuses column layout during selected-range rendering and selection-only updates", () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const ref = createRef<CominsTableRef<(typeof data)[number]>>();
  const project = vi.spyOn(compat, "getReactColumnLayoutProjection");
  const visible = vi.spyOn(layouts, "getVisibleLayoutColumns");
  const originalBody = body.renderCominsBodyRows;
  const extraTraversals: number[] = [];
  const renderBody = vi.spyOn(body, "renderCominsBodyRows").mockImplementation((env, output) => {
    const before = visible.mock.calls.length;
    const rows = originalBody(env, output);
    if (env.state.selection.range) extraTraversals.push(visible.mock.calls.length - before);
    return rows;
  });
  const click = (rowId: string, shiftKey = false) => act(() => host.querySelector(
    `[data-testid='cell-${rowId}-value']`,
  )!.dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey })));
  try {
    act(() => root.render(<CominsTable ref={ref} data={data} columns={columns} columnGroups={columnGroups} getRowId={getRowId} />));
    project.mockClear();
    click("a");
    click("b", true);
    expect(extraTraversals.length).toBeGreaterThan(0);
    expect(extraTraversals.every(count => count === 0)).toBe(true);
    expect(project).not.toHaveBeenCalled();
    expect(ref.current!.getSelectedCells()).toHaveLength(2);
    act(() => ref.current!.setColumnLayout({ columns: { id: { hidden: true } } }));
    expect(project).toHaveBeenCalled();
  } finally {
    act(() => root.unmount());
    host.remove();
    renderBody.mockRestore();
    project.mockRestore();
    visible.mockRestore();
  }
});

it("avoids filter presentation metadata when applying row and cell selection", () => {
  const getOptionLabel = vi.fn();
  const filter = { kind: "number" as const, get getOptionLabel() { getOptionLabel(); return String; } };
  const state = compat.createCominsTableState({ rows: data, getRowId, columns: [{ field: "value", filter }] });
  const next = compat.selectCell(compat.selectRow(state, "a"), { rowId: "a", columnId: "value" });
  expect(getOptionLabel).not.toHaveBeenCalled();
  expect(next.columns).toBe(state.columns);
  expect(next.selection.rowIds).toEqual(["a"]);
});

it("does not allocate filter row objects when filtering is disabled", () => {
  const renderHeaders = vi.spyOn(headers, "renderCominsHeaderRows");
  try {
    const virtualData = Array.from({ length: 100_000 }, (_, index) => ({ id: String(index), value: index }));
    renderToStaticMarkup(<CominsTable virtualized data={virtualData} columns={columns} getRowId={getRowId} />);
    expect(renderHeaders.mock.calls[0]![0].filterSourceRows).toHaveLength(0);
  } finally {
    renderHeaders.mockRestore();
  }
});

it("reads body cell values from the already resolved column", () => {
  const lookup = vi.spyOn(compat, "getCominsCellValue");
  try {
    const html = renderToStaticMarkup(<CominsTable data={data} columns={columns} getRowId={getRowId} />);
    expect(html).toContain("cell-a-value");
    expect(lookup).not.toHaveBeenCalled();
  } finally {
    lookup.mockRestore();
  }
});
