// @vitest-environment jsdom

import { act, type ReactElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CominsTable, createCominsViewportData, type CominsTableColumn, type CominsTableProps } from "../src";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
type Row = { id: string; name: string; group: string };
const rows: Row[] = [{ id: "a", name: "Alpha", group: "g" }];
let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement;
function mount(element: ReactElement) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root!.render(element));
  return container;
}
afterEach(() => { act(() => root?.unmount()); container?.remove(); root = undefined; });
const columns: CominsTableColumn<Row>[] = [{ field: "name", label: "Name" }];

describe("render API compatibility", () => {
  it("prefers standard cell and header callbacks without invoking legacy callbacks", () => {
    const legacyCell = vi.fn(() => "legacy cell");
    const legacyHeader = vi.fn(() => "legacy header");
    const view = mount(<CominsTable data={rows} getRowId={row => row.id} columns={[{
      field: "name", label: "Name",
      cell: { renderer: legacyCell, render: ({ value }) => <b>{String(value)}</b> },
      header: { renderer: legacyHeader, render: ({ column }) => <i>{column.id}</i> },
    }]} />);
    expect(view.querySelector('[data-testid="cell-a-name"] b')?.textContent).toBe("Alpha");
    expect(view.querySelector('[data-testid="header-name"] i')?.textContent).toBe("name");
    expect(legacyCell).not.toHaveBeenCalled();
    expect(legacyHeader).not.toHaveBeenCalled();
  });

  it.each([null, false, "", 0, undefined] as ReactNode[])("handles standard result %s without legacy fallback", value => {
    const legacy = vi.fn(() => "legacy");
    const view = mount(<CominsTable data={rows} getRowId={row => row.id} columns={[{
      field: "name", label: "Name", cell: { render: () => value, renderer: legacy },
      header: { render: () => value, renderer: legacy },
    }]} />);
    expect(view.querySelector('[data-testid="cell-a-name"]')?.textContent).toBe(value === undefined ? "Alpha" : value === 0 ? "0" : "");
    expect(view.querySelector('[data-testid="header-name"] .comins-table__header-label')?.textContent).toBe(value === undefined ? "Name" : value === 0 ? "0" : "");
    expect(legacy).not.toHaveBeenCalled();
  });

  it("falls back to legacy callbacks when standard callbacks are absent", () => {
    const view = mount(<CominsTable data={rows} getRowId={row => row.id} columns={[{
      field: "name", label: "Name", cell: { render: undefined, renderer: () => "legacy cell" },
      header: { render: undefined, renderer: () => "legacy header" },
    }]} />);
    expect(view.textContent).toContain("legacy cell");
    expect(view.textContent).toContain("legacy header");
  });

  it("keeps legacy undefined results empty", () => {
    const view = mount(<CominsTable data={rows} getRowId={row => row.id} columns={[{
      field: "name", label: "Name", cell: { renderer: () => undefined }, header: { renderer: () => undefined },
    }]} />);
    expect(view.querySelector('[data-testid="cell-a-name"]')?.textContent).toBe("");
    expect(view.querySelector('.comins-table__header-label')?.textContent).toBe("");
  });

  it("uses built-in components when standard callbacks return undefined", () => {
    const view = mount(<CominsTable data={rows} getRowId={row => row.id} columns={[{
      field: "name", label: "Name", cell: { render: () => undefined, components: [{ type: "button", props: { children: "Cell action" } }] },
      header: { render: () => undefined, components: [{ type: "button", props: { children: "Header action" } }] },
    }]} />);
    expect(view.textContent).toContain("Cell action");
    expect(view.textContent).toContain("Header action");
  });

  it("renders standard row detail without invoking the old callback", () => {
    const legacy = vi.fn(() => "legacy detail");
    const view = mount(<CominsTable columns={columns} data={rows} getRowId={row => row.id} expandedRowIds={["a"]}
      renderRowDetail={legacy} rowDetail={{ render: ({ row }) => <div data-testid="new-detail">{row.data.name}</div> }} />);
    expect(view.querySelector('[data-testid="new-detail"]')?.textContent).toBe("Alpha");
    expect(legacy).not.toHaveBeenCalled();
  });

  it("supports mixed Tree callback/object slots and undefined default content", () => {
    const view = mount(<CominsTable tree columns={columns} data={[{ item: rows[0]!, children: [{ item: { ...rows[0]!, id: "b" } }] }]}
      getRowId={row => row.id} treeSlots={{ leading: () => <i>L</i>, content: { render: () => undefined }, trailing: { render: ({ rowId }) => <b>{rowId}</b> } }} />);
    const cell = view.querySelector('[data-testid="cell-a-name"]')!;
    expect(cell.textContent).toBe("LAlphaa");
    expect(cell.querySelector('[data-testid="tree-expander-a"]')).not.toBeNull();
  });

  it("preserves the Tree disclosure when standard content returns null", () => {
    const view = mount(<CominsTable tree columns={columns} data={[{ item: rows[0]!, children: [{ item: { ...rows[0]!, id: "b" } }] }]}
      getRowId={row => row.id} treeSlots={{ content: { render: () => null } }} />);
    const cell = view.querySelector('[data-testid="cell-a-name"]')!;
    expect(cell.textContent).toBe("");
    expect(cell.querySelector('[data-testid="tree-expander-a"]')).not.toBeNull();
  });

  it("passes new grouping callbacks through memo reconstruction and refreshes labels", () => {
    const legacy = vi.fn(() => "legacy label");
    const props = (label: string) => <CominsTable columns={columns} data={rows} getRowId={row => row.id} rowGrouping={{
      groups: [{ id: "g" }], getGroupId: group => group.id, getRowGroupId: row => row.group,
      getGroupLabel: legacy, label: { render: group => `${label}:${group.id}` }, content: { render: () => undefined },
    }} />;
    const view = mount(props("First"));
    expect(view.querySelector('.comins-row-group-label')?.textContent).toBe("First:g");
    act(() => root!.render(props("Second")));
    expect(view.querySelector('.comins-row-group-label')?.textContent).toBe("Second:g");
    expect(legacy).not.toHaveBeenCalled();
  });

  it("prefers standard group content and allows explicit empty labels", () => {
    const legacy = vi.fn(() => "legacy content");
    const view = mount(<CominsTable columns={columns} data={rows} getRowId={row => row.id} rowGrouping={{
      groups: [{ id: "g" }], getGroupId: group => group.id, getRowGroupId: row => row.group,
      label: { render: () => null }, renderGroupContent: legacy, content: { render: ({ groupId }) => <b data-testid="group-content">{groupId}</b> },
    }} />);
    expect(view.querySelector('[data-testid="group-content"]')?.textContent).toBe("g");
    expect(legacy).not.toHaveBeenCalled();
  });

  it("keeps a null standard group label empty", () => {
    const view = mount(<CominsTable columns={columns} data={rows} rowGrouping={{
      groups: [{ id: "g" }], getGroupId: group => group.id, getRowGroupId: row => row.group, label: { render: () => null },
    }} />);
    expect(view.querySelector('.comins-row-group-label')?.textContent).toBe("");
  });

  it("does not enable row details through malformed Tree or Viewport inputs", () => {
    const render = vi.fn(() => <b data-testid="forbidden-detail">Detail</b>);
    const view = mount(<CominsTable {...({ tree: true, columns, data: [{ item: rows[0]! }], getRowId: (row: Row) => row.id,
      expandedRowIds: ["a"], rowDetail: { render } } as unknown as CominsTableProps<Row>)} />);
    expect(view.querySelector('[data-testid="forbidden-detail"]')).toBeNull();
    act(() => root!.render(<CominsTable {...({ columns, data: createCominsViewportData<Row>({ revision: "r", rowCount: 1 }),
      viewportDatasource: { revision: "r" }, onViewportRequest: () => {}, getRowId: (row: Row) => row.id,
      expandedRowIds: ["a"], rowDetail: { render } } as unknown as CominsTableProps<Row>)} />));
    expect(render).not.toHaveBeenCalled();
  });

  it("distinguishes render kind when the same header callback changes API during a move", () => {
    const callback = vi.fn(() => undefined);
    const props = (standard: boolean) => <CominsTable data={rows} getRowId={row => row.id} columns={[{
      field: "name", label: "Name", header: standard ? { render: callback } : { renderer: callback },
    }]} />;
    const view = mount(props(false));
    const header = view.querySelector<HTMLElement>('[data-testid="header-name"]')!;
    const previous = Object.getOwnPropertyDescriptor(document, "elementFromPoint");
    Object.defineProperty(document, "elementFromPoint", { configurable: true, value: () => header });
    const pointer = (type: string, x: number) => {
      const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: 10 });
      Object.defineProperties(event, { pointerType: { value: "mouse" }, pointerId: { value: 1 }, isPrimary: { value: true } });
      return event;
    };
    try {
      act(() => { header.dispatchEvent(pointer("pointerdown", 10)); window.dispatchEvent(pointer("pointermove", 16)); });
      expect(header.getAttribute("data-column-placeholder")).toBe("true");
      callback.mockClear();
      act(() => root!.render(props(true)));
      expect(callback).toHaveBeenCalledTimes(1);
      act(() => window.dispatchEvent(pointer("pointercancel", 16)));
      expect(view.querySelector('.comins-table__header-label')?.textContent).toBe("Name");
    } finally {
      if (previous) Object.defineProperty(document, "elementFromPoint", previous);
      else Reflect.deleteProperty(document, "elementFromPoint");
    }
  });

  it("applies summary render after format and preserves null in its first cell", () => {
    const aggregate = vi.fn(() => 3);
    const format = vi.fn(({ value }) => `Total ${value}`);
    const render = vi.fn(({ value, formattedValue }) => <b>{value}:{formattedValue}</b>);
    const props = (renderSummary: typeof render | (() => null) | (() => undefined)) => <CominsTable columns={columns} data={rows}
      summary={{ label: "Summary label", columns: { name: { aggregate, format, render: renderSummary } } }} />;
    const view = mount(props(render));
    expect(view.querySelector('[data-testid="summary-cell-name"]')?.textContent).toBe("3:Total 3");
    expect(aggregate).toHaveBeenCalled();
    expect(format).toHaveBeenCalledTimes(aggregate.mock.calls.length);
    expect(render).toHaveBeenCalledTimes(aggregate.mock.calls.length);
    act(() => root!.render(props(() => null)));
    expect(view.querySelector('[data-testid="summary-cell-name"]')?.textContent).toBe("");
    act(() => root!.render(props(() => undefined)));
    expect(view.querySelector('[data-testid="summary-cell-name"]')?.textContent).toBe("Total 3");
  });

  it.each([null, undefined, 0] as ReactNode[])("handles loading and empty standard result %s", value => {
    const view = mount(<CominsTable columns={columns} data={rows} getRowId={row => row.id} loading loadingComponent="legacy loading" loadingContent={{ render: () => value }} />);
    expect(view.textContent).not.toContain("legacy loading");
    expect(view.textContent).toContain(value === undefined ? "불러오는 중입니다." : value === 0 ? "0" : "Alpha");
    act(() => root!.render(<CominsTable columns={columns} data={[]} emptyComponent="legacy empty" emptyContent={{ render: () => value }} />));
    expect(view.textContent).not.toContain("legacy empty");
    expect(view.textContent).toContain(value === undefined ? "표시할 데이터가 없습니다." : value === 0 ? "0" : "");
  });
});
