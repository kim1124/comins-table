// @vitest-environment jsdom

import { act, createRef, startTransition, useState, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { CominsTable, type CominsColumnLayout, type CominsTableColumn, type CominsTableRef } from "../src";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

type Row = { id: string; name: string; age: number; role: string };
const rows: Row[] = [
  { id: "a", name: "Alpha", age: 31, role: "Owner" },
  { id: "b", name: "Beta", age: 42, role: "Viewer" },
];
const columns: CominsTableColumn<Row>[] = [
  { field: "name", label: "Name", width: 140 },
  { field: "age", label: "Age", width: 140, sort: true },
  { field: "role", label: "Role", width: 140 },
];
const getRowId = (row: Row) => row.id;
let root: ReturnType<typeof createRoot> | undefined;
let host: HTMLDivElement | undefined;

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = undefined;
  host = undefined;
});

function mount(element: ReactElement) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root?.render(element));
  return host;
}

function headerOrder(view: Element) {
  return Array.from(view.querySelectorAll("th[data-comins-column-id]"), (node) => node.getAttribute("data-comins-column-id"));
}

describe("React public state update ordering", () => {
  it("preserves earlier selection and sorting across consecutive layout replacements in one batch", () => {
    const ref = createRef<CominsTableRef<Row>>();
    const view = mount(<CominsTable ref={ref} columns={columns} data={rows} getRowId={getRowId} />);

    act(() => {
      ref.current?.setSelectedRow(0);
      ref.current?.setSortModel([{ columnId: "age", direction: "desc" }]);
      ref.current?.setColumnLayout({ columns: { name: { width: 220 } }, order: ["age", "name", "role"] });
      ref.current?.setColumnLayout({ columns: { age: { width: 180 }, role: { hidden: true } }, order: ["name", "role", "age"] });
    });

    // Layouts are complete replacements; earlier unrelated state must still survive the last one.
    expect(ref.current?.getSelectedRows()).toEqual([rows[0]]);
    expect(ref.current?.getSortModel()).toEqual([{ columnId: "age", direction: "desc" }]);
    expect(ref.current?.getColumnLayout()).toMatchObject({
      columns: { age: { width: 180 }, role: { hidden: true } },
      order: ["name", "role", "age"],
    });
    expect(headerOrder(view)).toEqual(["name", "age"]);
    expect(view.querySelector('[data-testid="row-a"]')?.getAttribute("aria-selected")).toBe("true");
    expect(Array.from(view.querySelectorAll("tr[data-comins-row-data-index]"), (node) => node.getAttribute("data-testid"))).toEqual(["row-b", "row-a"]);
  });

  it("settles transition-driven column input and an urgent layout update to one consistent layout", async () => {
    const ref = createRef<CominsTableRef<Row>>();
    function Consumer() {
      const [declared, setDeclared] = useState(columns);
      return <>
        <button onClick={() => {
          startTransition(() => setDeclared(columns.filter((column) => column.field !== "role")));
          ref.current?.setColumnLayout({ columns: { age: { width: 222 } }, order: ["age", "name", "role"] });
        }} type="button">Remove role while reordering</button>
        <CominsTable ref={ref} columns={declared} data={rows} getRowId={getRowId} />
      </>;
    }
    const view = mount(<Consumer />);

    await act(async () => view.querySelector<HTMLButtonElement>("button")!.click());

    expect(headerOrder(view)).toEqual(["age", "name"]);
    expect(view.querySelector('[data-testid="header-role"]')).toBeNull();
    expect(ref.current?.getColumnLayout()).toMatchObject({ columns: { age: { width: 222 } }, order: ["age", "name"] });
    expect(view.querySelector('[data-testid="cell-a-age"]')?.textContent).toBe("31");
  });

  it("restores saved widths visibility and order after a different layout was applied", () => {
    const ref = createRef<CominsTableRef<Row>>();
    const view = mount(<CominsTable ref={ref} columns={columns} data={rows} getRowId={getRowId} />);
    const saved: CominsColumnLayout = {
      columns: { name: { width: 240 }, age: { hidden: true, width: 180 }, role: { width: 160 } },
      order: ["role", "name", "age"],
    };
    act(() => ref.current?.setColumnLayout(saved));
    expect(headerOrder(view)).toEqual(["role", "name"]);

    act(() => ref.current?.setColumnLayout({ columns: { name: { hidden: true }, age: { hidden: false, width: 200 } }, order: ["age", "name", "role"] }));
    expect(headerOrder(view)).toEqual(["age", "role"]);

    act(() => ref.current?.setColumnLayout(saved));

    expect(ref.current?.getColumnLayout()).toMatchObject({
      columns: { name: { width: 240 }, age: { hidden: true, width: 180 }, role: { width: 160 } },
      order: ["role", "name", "age"],
    });
    expect(headerOrder(view)).toEqual(["role", "name"]);
    expect(view.querySelector('[data-testid="cell-a-age"]')).toBeNull();
    expect(view.querySelector('[data-testid="cell-a-name"]')?.textContent).toBe("Alpha");
  });
});
