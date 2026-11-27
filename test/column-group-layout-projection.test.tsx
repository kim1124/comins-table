import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { ColumnGroupFeature } from "../example/src/features/ColumnGroupFeature";
import { PlaygroundLocaleProvider } from "../example/src/i18n/playground-locale";
import { CominsTable } from "../src";
import * as pinning from "../src/column-pinning";
import * as compat from "../src/react/core-compat";
import * as layout from "../src/core/layout/columns";

it("shares visible-column traversal with grouped headers for each actual sample table", () => {
  const actual = layout.getLayoutProjection;
  const observations: Array<{ iterations: number }> = [];
  vi.spyOn(layout, "getLayoutProjection").mockImplementation((state, lookup) => {
    const observation = { iterations: 0 };
    observations.push(observation);
    const columnOrder = new Proxy(state.columnOrder, {
      get(target, key, receiver) {
        if (key === Symbol.iterator) observation.iterations++;
        return Reflect.get(target, key, receiver);
      },
    });
    return actual({ ...state, columnOrder }, lookup);
  });
  try {
    const html = renderToStaticMarkup(<PlaygroundLocaleProvider><ColumnGroupFeature /></PlaygroundLocaleProvider>);
    expect((html.match(/data-comins-table-instance-id=/g) ?? []).length).toBe(2);
    expect((html.match(/data-comins-row-data-index=/g) ?? []).length).toBe(60);
    expect(observations).toEqual([{ iterations: 1 }, { iterations: 1 }]);
  } finally {
    vi.restoreAllMocks();
  }
});

it("builds each group index at most once per projection without changing layout or metadata", () => {
  const rows = [{ id: "a", name: "Ada", age: 30, active: true }];
  const label = <strong>Profile</strong>;
  for (const hidden of [false, true]) {
    const state = compat.createCominsTableState({
      rows, getRowId: row => row.id,
      columns: [{ field: "name" }, { field: "age" }, { field: "active" }],
      columnGroups: [
        { id: "profile", children: ["name", "age"], label },
        { id: "status", children: ["active"] },
      ],
      columnLayout: { groups: { profile: { hidden }, status: { pinned: "left" } } },
    });
    const expectedVisible = compat.getCominsVisibleColumns(state);
    const expectedHeaders = compat.getCominsHeaderRows(state);
    const passes = { childIndex: 0, groupIndex: 0 };
    const groups = new Proxy(state.columnGroups, {
      get(target, key, receiver) {
        if (key === Symbol.iterator) passes.childIndex++;
        if (key === "map") passes.groupIndex++;
        return Reflect.get(target, key, receiver);
      },
    });
    const projection = layout.getLayoutProjection({ ...state, columnGroups: groups });
    expect(projection.visibleColumns).toEqual(expectedVisible);
    expect(projection.headerRows).toEqual(expectedHeaders);
    expect(state.rows).toBe(rows);
    for (const column of projection.visibleColumns) expect(state.columns).toContain(column);
    for (const cell of projection.headerRows.flat()) {
      if (cell.kind === "group") {
        expect(cell.group).toBe(state.columnGroups.find(group => group.id === cell.groupId));
        if (cell.groupId === "profile") expect(cell.group.label).toBe(label);
      } else {
        expect(cell.column).toBe(state.columns.find(column => column.id === cell.columnId));
      }
    }
    expect(passes.childIndex).toBeLessThanOrEqual(1);
    expect(passes.groupIndex).toBeLessThanOrEqual(1);
  }
});

it("omits pinning projection only when neither configured pinning nor the summary needs it", () => {
  const resolve = vi.spyOn(pinning, "resolveCominsColumnPinning");
  const columns = [{ field: "name" }, { field: "age" }] as const;
  const data = [{ id: "a", name: "Ada", age: 30 }];
  const columnGroups = [{ children: ["name", "age"], id: "profile", label: "Profile" }];

  try {
    const plain = renderToStaticMarkup(<CominsTable columns={[...columns]} data={data} columnGroups={columnGroups} />);
    expect(plain).toContain("Profile");
    expect(plain).toContain("Ada");
    expect(resolve).not.toHaveBeenCalled();

    renderToStaticMarkup(<CominsTable
      columns={[...columns]} data={data}
      columnGroups={[{ ...columnGroups[0]!, pinned: "left" }]}
    />);
    expect(resolve.mock.calls.at(-1)?.[0][0]).toMatchObject({ id: "group:profile", pinned: "left" });

    resolve.mockClear();
    renderToStaticMarkup(<CominsTable
      columns={[{ ...columns[0], pinned: "right" }, columns[1]]} data={data}
    />);
    expect(resolve.mock.calls.at(-1)?.[0]).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "column:name", pinned: "right" })]),
    );

    resolve.mockClear();
    const withSummary = renderToStaticMarkup(<CominsTable
      columns={[...columns]} data={data} columnGroups={columnGroups}
      summary={{ columns: { name: { aggregate: "count", colSpan: 2 } } }}
    />);
    expect(resolve).toHaveBeenCalledOnce();
    expect(withSummary).toMatch(/colSpan="2"[^>]*data-comins-summary-column-id="name"/i);
  } finally {
    resolve.mockRestore();
  }
});
