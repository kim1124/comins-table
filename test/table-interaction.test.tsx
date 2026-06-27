// @vitest-environment jsdom

import type React from "react";
import { act, createRef } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { KmsfDataTable, type KmsfDataTableProps, type KmsfDataTableRef } from "../src";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

type PersonRow = {
  age: number;
  id: string;
  name: string;
  profile?: {
    age: number;
  };
};

const columns = [
  { field: "name", label: "Name" },
  { field: "age", label: "Age", sort: true },
] as const;

const rows: PersonRow[] = [
  { age: 31, id: "a", name: "Alpha" },
  { age: 42, id: "b", name: "Beta" },
];

const apiColumns = [
  { field: "name", label: "Name" },
  { field: "profile.age", label: "Profile Age" },
] as const;

const apiRows: PersonRow[] = [
  { age: 31, id: "a", name: "Alpha", profile: { age: 31 } },
  { age: 42, id: "b", name: "Beta", profile: { age: 42 } },
];

const threeRows: PersonRow[] = [
  ...rows,
  { age: 27, id: "c", name: "Gamma" },
];
const manyRows: PersonRow[] = Array.from({ length: 200 }, (_value, index) => ({
  age: index,
  id: `row-${index}`,
  name: `Row ${index}`,
}));

let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
  }

  container?.remove();
  root = undefined;
  container = undefined;
});

function renderTable(props: Partial<KmsfDataTableProps<PersonRow>> = {}) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  act(() => {
    root?.render(<KmsfDataTable columns={columns} data={rows} getRowId={(row) => row.id} {...props} />);
  });

  return container;
}

function renderTableElement(element: React.ReactElement) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  act(() => {
    root?.render(element);
  });

  return container;
}

function pressControlKey(element: Element, key: "c" | "v") {
  act(() => {
    element.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        ctrlKey: true,
        key,
      }),
    );
  });
}

describe("@kmsf/data-table keyboard interaction", () => {
  it("applies the shared KMSF typography class and 12px base text class", () => {
    const element = renderTable();
    const table = element.querySelector(".kmsf-data-table");

    expect(table?.className).toContain("kmsf-typography-base");
    expect(table?.className).toContain("text-[length:var(--kmsf-font-size-base,12px)]");
  });

  it("renders the redesigned field and label column API", () => {
    const element = renderTableElement(
      <KmsfDataTable columns={apiColumns} data={apiRows} getRowId={(row) => row.id} />,
    );

    expect(element.querySelector("[data-testid='header-name']")?.textContent).toContain("Name");
    expect(element.querySelector("[data-testid='header-profile.age']")?.textContent).toContain("Profile Age");
    expect(element.querySelector("[data-testid='cell-a-name']")?.textContent).toBe("Alpha");
    expect(element.querySelector("[data-testid='cell-a-profile.age']")?.textContent).toBe("31");
  });

  it("accepts buffer-size and uses a practical default virtualized row buffer", () => {
    const defaultProps: KmsfDataTableProps<PersonRow> = {
      columns,
      data: manyRows,
      getRowId: (row) => row.id,
      rowHeight: 20,
      virtualized: true,
    };
    const customProps: KmsfDataTableProps<PersonRow> = {
      ...defaultProps,
      "buffer-size": 30,
    };

    const defaultElement = renderTableElement(<KmsfDataTable {...defaultProps} />);
    const defaultRows = defaultElement.querySelectorAll("tbody tr[data-kmsf-row-data-index]");

    expect(defaultRows.length).toBeGreaterThanOrEqual(32);
    expect(defaultRows.length).toBeLessThanOrEqual(42);

    act(() => root?.unmount());
    container?.remove();
    root = undefined;
    container = undefined;

    const customElement = renderTableElement(<KmsfDataTable {...customProps} />);
    const customRows = customElement.querySelectorAll("tbody tr[data-kmsf-row-data-index]");

    expect(customRows.length).toBe(42);
  });

  it("notifies onChangeData when internal interactions mutate data", () => {
    const onChangeData = vi.fn();
    const element = renderTableElement(
      <KmsfDataTable
        columns={apiColumns}
        data={apiRows}
        getRowId={(row) => row.id}
        onChangeData={onChangeData}
      />,
    );
    const cells = element.querySelectorAll("tbody td");

    pressControlKey(cells[2]!, "c");
    pressControlKey(cells[0]!, "v");

    expect(onChangeData).toHaveBeenCalledWith([
      { age: 31, id: "a", name: "Beta", profile: { age: 31 } },
      { age: 42, id: "b", name: "Beta", profile: { age: 42 } },
    ]);
    expect(element.querySelector("[data-testid='cell-a-name']")?.textContent).toBe("Beta");
  });

  it("renders from data prop as the primary external state source", () => {
    const element = renderTableElement(
      <KmsfDataTable columns={columns} data={rows} getRowId={(row) => row.id} />,
    );

    expect(element.querySelector("[data-testid='cell-a-name']")?.textContent).toBe("Alpha");
    expect(element.querySelector("[data-testid='cell-b-age']")?.textContent).toBe("42");
  });

  it("notifies onChangeData when internal interactions mutate controlled data", () => {
    const onChangeData = vi.fn();
    const element = renderTableElement(
      <KmsfDataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        onChangeData={onChangeData}
      />,
    );
    const cells = element.querySelectorAll("tbody td");

    pressControlKey(cells[2]!, "c");
    pressControlKey(cells[0]!, "v");

    expect(onChangeData).toHaveBeenCalledWith([
      { age: 31, id: "a", name: "Beta" },
      { age: 42, id: "b", name: "Beta" },
    ]);
  });

  it("copies and pastes a full row with Ctrl+C and Ctrl+V", () => {
    const element = renderTable({ pagination: { pageIndex: 0, pageSize: 10 } });
    const bodyRows = element.querySelectorAll("tbody tr");

    pressControlKey(bodyRows[0]!, "c");
    pressControlKey(bodyRows[1]!, "v");

    const updatedBodyRows = element.querySelectorAll("tbody tr");

    expect(updatedBodyRows).toHaveLength(3);
    expect(updatedBodyRows[2]?.querySelector("td")?.textContent).toBe("Alpha");
  });

  it("copies and pastes a cell with Ctrl+C and Ctrl+V", () => {
    const element = renderTable();
    const cells = element.querySelectorAll("tbody td");

    pressControlKey(cells[2]!, "c");
    pressControlKey(cells[0]!, "v");

    expect(element.querySelector("tbody td")?.textContent).toBe("Beta");
  });

  it("does not notify column layout changes for row copy-paste updates", () => {
    const onChangeColumnLayout = vi.fn();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        <KmsfDataTable
          columns={columns}
          data={rows}
          getRowId={(row) => row.id}
          onChangeColumnLayout={onChangeColumnLayout}
        />,
      );
    });

    const bodyRows = container.querySelectorAll("tbody tr");
    pressControlKey(bodyRows[0]!, "c");
    pressControlKey(bodyRows[1]!, "v");

    expect(onChangeColumnLayout).not.toHaveBeenCalled();
  });

  it("marks clicked rows and cells as selected", () => {
    const element = renderTable();
    const bodyRows = element.querySelectorAll("tbody tr");
    const cells = element.querySelectorAll("tbody td");

    act(() => {
      bodyRows[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(bodyRows[1]?.getAttribute("aria-selected")).toBe("true");

    act(() => {
      cells[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(cells[0]?.getAttribute("data-selected")).toBe("true");
  });

  it("renders no initial selection and visibly selects the row when a cell is clicked", () => {
    const element = renderTable({ data: threeRows });
    const rowA = element.querySelector("[data-testid='row-a']")!;
    const cellA = element.querySelector("[data-testid='cell-a-name']")!;

    expect(rowA.getAttribute("data-selected-row")).toBeNull();
    expect(cellA.getAttribute("data-selected")).toBeNull();

    act(() => {
      cellA.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(rowA.getAttribute("data-selected-row")).toBe("true");
    expect(rowA.className).toContain("kmsf-row-selected");
    expect(cellA.getAttribute("data-selected")).toBe("true");
  });

  it("disables cell selection style while preserving cell callbacks and row selection", () => {
    const onClickCell = vi.fn();
    const element = renderTable({ cellSelection: false, onClickCell });
    const rowA = element.querySelector("[data-testid='row-a']")!;
    const cellA = element.querySelector("[data-testid='cell-a-name']")!;

    act(() => {
      cellA.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onClickCell).toHaveBeenCalledOnce();
    expect(rowA.getAttribute("data-selected-row")).toBe("true");
    expect(cellA.getAttribute("data-selected")).toBeNull();
    expect(cellA.getAttribute("data-range-selected")).toBeNull();
  });

  it("supports Ctrl/Cmd row toggles, Shift row ranges, sort-stable selection, and data replacement reset", () => {
    const onChangeSelection = vi.fn();
    const element = renderTableElement(
      <KmsfDataTable
        columns={columns}
        data={threeRows}
        getRowId={(row) => row.id}
        onChangeSelection={onChangeSelection}
      />,
    );
    const rowA = element.querySelector("[data-testid='row-a']")!;
    const rowB = element.querySelector("[data-testid='row-b']")!;
    const rowC = element.querySelector("[data-testid='row-c']")!;
    const ageHeader = element.querySelector("[data-testid='header-age']")!;

    act(() => {
      rowB.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      rowA.dispatchEvent(new MouseEvent("click", { bubbles: true, ctrlKey: true }));
      rowC.dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: true }));
    });

    expect(rowA.getAttribute("data-selected-row")).toBe("true");
    expect(rowB.getAttribute("data-selected-row")).toBe("true");
    expect(rowC.getAttribute("data-selected-row")).toBe("true");
    expect(onChangeSelection).toHaveBeenLastCalledWith(expect.objectContaining({ rowIds: ["a", "b", "c"] }));

    act(() => {
      ageHeader.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(element.querySelector("[data-testid='row-a']")?.getAttribute("data-selected-row")).toBe("true");
    expect(element.querySelector("[data-testid='row-b']")?.getAttribute("data-selected-row")).toBe("true");
    expect(element.querySelector("[data-testid='row-c']")?.getAttribute("data-selected-row")).toBe("true");

    act(() => {
      root?.render(
        <KmsfDataTable
          columns={columns}
          data={[{ age: 50, id: "z", name: "Zeta" }]}
          getRowId={(row) => row.id}
          onChangeSelection={onChangeSelection}
        />,
      );
    });

    expect(element.querySelector("[data-testid='row-z']")?.getAttribute("data-selected-row")).toBeNull();
  });

  it("selects a cell range with Shift+click", () => {
    const element = renderTable({ data: threeRows });
    const firstCell = element.querySelector("[data-testid='cell-a-name']")!;
    const focusCell = element.querySelector("[data-testid='cell-b-age']")!;

    act(() => {
      firstCell.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      focusCell.dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: true }));
    });

    expect(element.querySelector("[data-testid='cell-a-name']")?.getAttribute("data-range-selected")).toBe("true");
    expect(element.querySelector("[data-testid='cell-a-age']")?.getAttribute("data-range-selected")).toBe("true");
    expect(element.querySelector("[data-testid='cell-b-name']")?.getAttribute("data-range-selected")).toBe("true");
    expect(element.querySelector("[data-testid='cell-b-age']")?.getAttribute("data-range-selected")).toBe("true");
  });

  it("selects a cell range with mouse drag and copies/pastes the range", () => {
    const onChangeData = vi.fn();
    const element = renderTable({ data: threeRows, onChangeData });
    const anchorCell = element.querySelector("[data-testid='cell-a-name']")!;
    const focusCell = element.querySelector("[data-testid='cell-b-age']")!;
    const targetCell = element.querySelector("[data-testid='cell-b-name']")!;

    act(() => {
      anchorCell.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
      focusCell.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, button: 0 }));
      focusCell.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, button: 0 }));
    });

    expect(element.querySelector("[data-testid='cell-b-age']")?.getAttribute("data-range-selected")).toBe("true");

    pressControlKey(anchorCell, "c");
    pressControlKey(targetCell, "v");

    expect(onChangeData).toHaveBeenLastCalledWith([
      { age: 31, id: "a", name: "Alpha" },
      { age: 31, id: "b", name: "Alpha" },
      { age: 42, id: "c", name: "Beta" },
    ]);
  });

  it("routes row and cell context menu callbacks with precise payloads", () => {
    const onContextMenuCell = vi.fn();
    const onContextMenuRow = vi.fn();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        <KmsfDataTable
          columns={columns}
          data={rows}
          getRowId={(row) => row.id}
          onContextMenuCell={onContextMenuCell}
          onContextMenuRow={onContextMenuRow}
        />,
      );
    });

    const bodyRows = container.querySelectorAll("tbody tr");
    const cells = container.querySelectorAll("tbody td");

    act(() => {
      bodyRows[1]?.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
    });

    expect(onContextMenuRow).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 1,
        row: expect.objectContaining({ data: rows[1], id: "b", index: 1 }),
      }),
    );

    act(() => {
      cells[0]?.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
    });

    expect(onContextMenuCell).toHaveBeenCalledWith(
      expect.objectContaining({
        column: expect.objectContaining({ id: "name", index: 0 }),
        index: 0,
        row: expect.objectContaining({ data: rows[0], id: "a", index: 0 }),
        value: "Alpha",
      }),
    );
    expect(onContextMenuRow).toHaveBeenCalledTimes(1);
  });

  it("formats cell values with the column format function", () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        <KmsfDataTable
          columns={[
            {
              cell: {
                format: ({ value }) => `${String(value)} years`,
              },
              field: "age",
              id: "age",
              label: "Age",
            },
          ]}
          data={rows}
          getRowId={(row) => row.id}
        />,
      );
    });

    expect(container.querySelector("tbody td")?.textContent).toBe("31 years");
  });

  it("applies rowProps and blocks all interactions for disabled rows", () => {
    const onClickCell = vi.fn();
    const onClickRow = vi.fn();
    const onChangeData = vi.fn();
    const element = renderTableElement(
      <KmsfDataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        onChangeData={onChangeData}
        onClickCell={onClickCell}
        onClickRow={onClickRow}
        rowProps={{
          className: (row) => ({ "is-disabled-row": row.id === "a" }),
          disabled: (row) => row.id === "a",
          style: (row) => (row.id === "a" ? { color: "rgb(255, 0, 0)" } : undefined),
        }}
      />,
    );
    const disabledRow = element.querySelector("[data-testid='row-a']")!;
    const disabledCell = element.querySelector("[data-testid='cell-a-name']")!;
    const enabledCell = element.querySelector("[data-testid='cell-b-name']")!;

    expect(disabledRow.className).toContain("is-disabled-row");
    expect((disabledRow as HTMLElement).style.color).toBe("rgb(255, 0, 0)");

    act(() => {
      disabledCell.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      disabledRow.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    pressControlKey(disabledCell, "c");
    pressControlKey(enabledCell, "v");

    expect(onClickCell).not.toHaveBeenCalled();
    expect(onClickRow).not.toHaveBeenCalled();
    expect(onChangeData).not.toHaveBeenCalled();
    expect(disabledCell.getAttribute("data-selected")).toBeNull();
  });

  it("applies column props and blocks disabled cell interactions", () => {
    const onClickCell = vi.fn();
    const element = renderTableElement(
      <KmsfDataTable
        columns={[
          {
            field: "name",
            header: { props: { className: "name-header", title: "Name title" } },
            label: "Name",
            cell: {
              props: {
              className: ({ row }) => (row.id === "a" ? "blocked-cell" : "open-cell"),
              disabled: ({ row }) => row.id === "a",
              style: ({ row }) => (row.id === "a" ? { color: "rgb(0, 0, 255)" } : undefined),
              },
            },
          },
        ]}
        data={rows}
        getRowId={(row) => row.id}
        onClickCell={onClickCell}
      />,
    );
    const header = element.querySelector("[data-testid='header-name']")!;
    const blockedCell = element.querySelector("[data-testid='cell-a-name']")!;
    const openCell = element.querySelector("[data-testid='cell-b-name']")!;

    expect(header.className).toContain("name-header");
    expect(header.getAttribute("title")).toBe("Name title");
    expect(blockedCell.className).toContain("blocked-cell");
    expect((blockedCell as HTMLElement).style.color).toBe("rgb(0, 0, 255)");

    act(() => {
      blockedCell.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      openCell.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onClickCell).toHaveBeenCalledTimes(1);
    expect(onClickCell).toHaveBeenCalledWith(
      expect.objectContaining({
        row: expect.objectContaining({ id: "b", index: 1 }),
        value: "Beta",
      }),
    );
  });

  it("sorts through header click and reports sort changes", () => {
    const onChangeSort = vi.fn();
    const element = renderTableElement(
      <KmsfDataTable columns={columns} data={threeRows} getRowId={(row) => row.id} onChangeSort={onChangeSort} />,
    );
    const ageHeader = element.querySelector("[data-testid='header-age']")!;

    act(() => {
      ageHeader.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onChangeSort).toHaveBeenLastCalledWith({ columnId: "age", direction: "asc" });
    expect([...element.querySelectorAll("tbody tr")].map((row) => row.textContent)).toEqual([
      "Gamma27",
      "Alpha31",
      "Beta42",
    ]);

    act(() => {
      ageHeader.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onChangeSort).toHaveBeenLastCalledWith({ columnId: "age", direction: "desc" });
    expect([...element.querySelectorAll("tbody tr")].map((row) => row.textContent)).toEqual([
      "Beta42",
      "Alpha31",
      "Gamma27",
    ]);
  });

  it("exposes aria-sort and keyboard activation for sortable headers", () => {
    const element = renderTableElement(
      <KmsfDataTable columns={columns} data={threeRows} getRowId={(row) => row.id} />,
    );
    const ageHeader = element.querySelector("[data-testid='header-age']")!;
    const nameHeader = element.querySelector("[data-testid='header-name']")!;

    expect(ageHeader.getAttribute("aria-sort")).toBe("none");
    expect(ageHeader.getAttribute("tabindex")).toBe("0");
    expect(nameHeader.getAttribute("aria-sort")).toBeNull();

    act(() => {
      ageHeader.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
    });

    expect(ageHeader.getAttribute("aria-sort")).toBe("ascending");
    expect([...element.querySelectorAll("tbody tr")].map((row) => row.textContent)).toEqual([
      "Gamma27",
      "Alpha31",
      "Beta42",
    ]);

    act(() => {
      ageHeader.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: " " }));
    });

    expect(ageHeader.getAttribute("aria-sort")).toBe("descending");
  });

  it("renders animated sort indicator state for the full sort cycle", () => {
    const element = renderTableElement(
      <KmsfDataTable columns={columns} data={threeRows} getRowId={(row) => row.id} />,
    );
    const ageHeader = element.querySelector("[data-testid='header-age']")!;
    const indicator = element.querySelector("[data-testid='sort-indicator-age']")!;

    expect(indicator.getAttribute("data-sort-state")).toBe("none");

    act(() => {
      ageHeader.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(indicator.getAttribute("data-sort-state")).toBe("asc");

    act(() => {
      ageHeader.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(indicator.getAttribute("data-sort-state")).toBe("desc");

    act(() => {
      ageHeader.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(indicator.getAttribute("data-sort-state")).toBe("none");
  });

  it("exposes column layout, selection, and sort ref methods", () => {
    const ref = createRef<KmsfDataTableRef<PersonRow>>();
    const onChangeColumnLayout = vi.fn();
    const onChangeSelection = vi.fn();
    const onChangeSort = vi.fn();
    const element = renderTableElement(
      <KmsfDataTable
        columns={columns}
        data={threeRows}
        getRowId={(row) => row.id}
        onChangeColumnLayout={onChangeColumnLayout}
        onChangeSelection={onChangeSelection}
        onChangeSort={onChangeSort}
        ref={ref}
      />,
    );

    act(() => {
      ref.current?.setSelectedRow(1);
    });

    expect(element.querySelector("[data-testid='row-b']")?.getAttribute("aria-selected")).toBe("true");
    expect(onChangeSelection).toHaveBeenLastCalledWith(expect.objectContaining({ rowIds: ["b"] }));

    act(() => {
      ref.current?.setSelectedRows([0, 2]);
    });

    expect(element.querySelector("[data-testid='row-a']")?.getAttribute("aria-selected")).toBe("true");
    expect(element.querySelector("[data-testid='row-c']")?.getAttribute("aria-selected")).toBe("true");

    act(() => {
      ref.current?.setSortState({ columnId: "age", direction: "desc" });
    });

    expect(ref.current?.getSortState()).toEqual({ columnId: "age", direction: "desc" });
    expect(onChangeSort).toHaveBeenLastCalledWith({ columnId: "age", direction: "desc" });

    act(() => {
      ref.current?.setColumnLayout({ columns: { age: { hidden: true }, name: { width: 220 } }, order: ["age", "name"] });
    });

    expect(ref.current?.getColumnLayout()).toEqual({
      columns: { age: { hidden: true, width: undefined }, name: { hidden: undefined, width: 220 } },
      order: ["age", "name"],
    });
    expect(onChangeColumnLayout).toHaveBeenLastCalledWith(ref.current?.getColumnLayout());
  });

  it("moves rows by visible indexes through setMoveTargetRow and clears active sort", () => {
    const ref = createRef<KmsfDataTableRef<PersonRow>>();
    const onChangeData = vi.fn();
    const onChangeSort = vi.fn();
    const element = renderTableElement(
      <KmsfDataTable
        columns={columns}
        data={threeRows}
        getRowId={(row) => row.id}
        onChangeData={onChangeData}
        onChangeSort={onChangeSort}
        ref={ref}
      />,
    );

    act(() => {
      ref.current?.setSortState({ columnId: "age", direction: "asc" });
    });

    expect([...element.querySelectorAll("tbody tr")].map((row) => row.textContent)).toEqual([
      "Gamma27",
      "Alpha31",
      "Beta42",
    ]);

    act(() => {
      ref.current?.setMoveTargetRow(2, 0);
    });

    expect(ref.current?.getSortState()).toBeNull();
    expect([...element.querySelectorAll("tbody tr")].map((row) => row.textContent)).toEqual([
      "Alpha31",
      "Beta42",
      "Gamma27",
    ]);
    expect(onChangeSort).toHaveBeenLastCalledWith(null);
    expect(onChangeData).toHaveBeenLastCalledWith([
      { age: 31, id: "a", name: "Alpha" },
      { age: 42, id: "b", name: "Beta" },
      { age: 27, id: "c", name: "Gamma" },
    ]);
  });

  it("blocks row drag through rowProps.draggable without disabling row click", () => {
    const onClickRow = vi.fn();
    const element = renderTableElement(
      <KmsfDataTable
        columns={columns}
        data={threeRows}
        getRowId={(row) => row.id}
        onClickRow={onClickRow}
        rowProps={{ draggable: (row) => row.id !== "b" }}
      />,
    );
    const rowB = element.querySelector("[data-testid='row-b']")!;

    expect(rowB.getAttribute("data-row-draggable")).toBe("false");
    expect(element.querySelector("[data-testid='row-drag-handle-b']")).toBeNull();

    act(() => {
      rowB.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onClickRow).toHaveBeenCalledWith(expect.objectContaining({ row: expect.objectContaining({ id: "b" }) }));
    expect(rowB.getAttribute("data-selected-row")).toBe("true");
  });
});
