// @vitest-environment jsdom

import type React from "react";
import { act, createRef } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CominsTable, type CominsTableProps, type CominsTableRef } from "../src";

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

function renderTable(props: Partial<CominsTableProps<PersonRow>> = {}) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  act(() => {
    root?.render(<CominsTable columns={columns} data={rows} getRowId={(row) => row.id} {...props} />);
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

describe("comins-table keyboard interaction", () => {
  it("renders summary values from all controlled rows before pagination", () => {
    const element = renderTableElement(
      <CominsTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        pagination={{ pageIndex: 0, pageSize: 1 }}
        summary={{ columns: { age: "sum" } }}
      />,
    );

    expect(element.querySelector("[data-testid='summary-cell-age']")?.textContent).toBe("73");
  });

  it("applies the shared COMINS typography class and 12px base text class", () => {
    const element = renderTable();
    const table = element.querySelector(".comins-table");

    expect(table?.className).toContain("comins-typography-base");
    expect(table?.className).toContain("text-[length:var(--comins-font-size-base,12px)]");
  });

  it("renders the redesigned field and label column API", () => {
    const element = renderTableElement(
      <CominsTable columns={apiColumns} data={apiRows} getRowId={(row) => row.id} />,
    );

    expect(element.querySelector("[data-testid='header-name']")?.textContent).toContain("Name");
    expect(element.querySelector("[data-testid='header-profile.age']")?.textContent).toContain("Profile Age");
    expect(element.querySelector("[data-testid='cell-a-name']")?.textContent).toBe("Alpha");
    expect(element.querySelector("[data-testid='cell-a-profile.age']")?.textContent).toBe("31");
  });

  it("accepts buffer-size and uses a practical default virtualized row buffer", () => {
    const defaultProps: CominsTableProps<PersonRow> = {
      columns,
      data: manyRows,
      getRowId: (row) => row.id,
      rowHeight: 20,
      virtualized: true,
    };
    const customProps: CominsTableProps<PersonRow> = {
      ...defaultProps,
      "buffer-size": 30,
    };

    const defaultElement = renderTableElement(<CominsTable {...defaultProps} />);
    const defaultRows = defaultElement.querySelectorAll("tbody tr[data-comins-row-data-index]");

    expect(defaultRows.length).toBeGreaterThanOrEqual(17);
    expect(defaultRows.length).toBeLessThanOrEqual(27);

    act(() => root?.unmount());
    container?.remove();
    root = undefined;
    container = undefined;

    const customElement = renderTableElement(<CominsTable {...customProps} />);
    const customRows = customElement.querySelectorAll("tbody tr[data-comins-row-data-index]");

    expect(customRows.length).toBe(42);
  });

  it("calls onLoadMore once when infinite scroll reaches the bottom threshold", () => {
    const onLoadMore = vi.fn();
    const element = renderTableElement(
      <CominsTable
        columns={columns}
        data={manyRows.slice(0, 20)}
        data-testid="infinite-scroll-viewport"
        getRowId={(row) => row.id}
        hasMoreRows
        infiniteScroll
        infiniteScrollThreshold={80}
        onLoadMore={onLoadMore}
        pagination={{ pageIndex: 0, pageSize: 20 }}
      />,
    );
    const viewport = element.querySelector<HTMLElement>("[data-testid='infinite-scroll-viewport']")!;

    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, value: 300 },
      scrollHeight: { configurable: true, value: 1000 },
      scrollTop: { configurable: true, value: 610, writable: true },
    });

    act(() => {
      viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
    expect(onLoadMore).toHaveBeenCalledTimes(0);

    viewport.scrollTop = 650;
    act(() => {
      viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
    act(() => {
      viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
    });

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("blocks infinite load requests while loading or exhausted and renders a loading row", () => {
    const onLoadMore = vi.fn();
    const loadingElement = renderTableElement(
      <CominsTable
        columns={columns}
        data={manyRows.slice(0, 20)}
        data-testid="infinite-scroll-viewport"
        getRowId={(row) => row.id}
        hasMoreRows
        infiniteScroll
        loadingMore
        onLoadMore={onLoadMore}
        pagination={{ pageIndex: 0, pageSize: 20 }}
      />,
    );
    const loadingViewport = loadingElement.querySelector<HTMLElement>("[data-testid='infinite-scroll-viewport']")!;

    expect(loadingElement.querySelector("[data-testid='data-table-infinite-loading-row']")).not.toBeNull();

    Object.defineProperties(loadingViewport, {
      clientHeight: { configurable: true, value: 300 },
      scrollHeight: { configurable: true, value: 1000 },
      scrollTop: { configurable: true, value: 900, writable: true },
    });

    act(() => {
      loadingViewport.dispatchEvent(new Event("scroll", { bubbles: true }));
    });

    expect(onLoadMore).toHaveBeenCalledTimes(0);

    act(() => root?.unmount());
    container?.remove();
    root = undefined;
    container = undefined;

    const exhaustedElement = renderTableElement(
      <CominsTable
        columns={columns}
        data={manyRows.slice(0, 20)}
        data-testid="infinite-scroll-viewport"
        getRowId={(row) => row.id}
        hasMoreRows={false}
        infiniteScroll
        onLoadMore={onLoadMore}
        pagination={{ pageIndex: 0, pageSize: 20 }}
      />,
    );
    const exhaustedViewport = exhaustedElement.querySelector<HTMLElement>("[data-testid='infinite-scroll-viewport']")!;

    Object.defineProperties(exhaustedViewport, {
      clientHeight: { configurable: true, value: 300 },
      scrollHeight: { configurable: true, value: 1000 },
      scrollTop: { configurable: true, value: 900, writable: true },
    });

    act(() => {
      exhaustedViewport.dispatchEvent(new Event("scroll", { bubbles: true }));
    });

    expect(onLoadMore).toHaveBeenCalledTimes(0);
  });

  it("loads initial lazy rows and renders the existing loading skeleton while pending", async () => {
    let resolveLazyLoad: ((result: { rows: PersonRow[]; total: number }) => void) | undefined;
    const onLazyLoad = vi.fn(
      () =>
        new Promise<{ rows: PersonRow[]; total: number }>((resolve) => {
          resolveLazyLoad = resolve;
        }),
    );
    const element = renderTableElement(
      <CominsTable
        columns={columns}
        data={[]}
        getRowId={(row) => row.id}
        lazyLoad
        lazyLoadBatchSize={2}
        onLazyLoad={onLazyLoad}
        pagination={{ pageIndex: 0, pageSize: 2 }}
        skeletonRowCount={2}
      />,
    );

    expect(onLazyLoad).toHaveBeenCalledTimes(1);
    expect(onLazyLoad).toHaveBeenLastCalledWith(
      expect.objectContaining({ limit: 2, offset: 0, reason: "initial" }),
    );
    expect(onLazyLoad.mock.calls[0]?.[0].signal).toBeInstanceOf(AbortSignal);
    expect(element.querySelectorAll("[data-testid='loading-skeleton-row']")).toHaveLength(2);

    await act(async () => {
      resolveLazyLoad?.({ rows, total: 2 });
    });

    expect(element.querySelector("[data-testid='row-a']")).not.toBeNull();
    expect(element.querySelector("[data-testid='row-b']")).not.toBeNull();
    expect(element.querySelector("[data-testid='loading-skeleton-row']")).toBeNull();
  });

  it("appends lazy rows near the bottom and blocks duplicate requests while pending", async () => {
    let resolveInitial: ((result: { rows: PersonRow[]; total: number }) => void) | undefined;
    let resolveAppend: ((result: { rows: PersonRow[]; total: number }) => void) | undefined;
    const onLazyLoad = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<{ rows: PersonRow[]; total: number }>((resolve) => {
            resolveInitial = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<{ rows: PersonRow[]; total: number }>((resolve) => {
            resolveAppend = resolve;
          }),
      );
    const element = renderTableElement(
      <CominsTable
        columns={columns}
        data={[]}
        data-testid="lazy-load-viewport"
        getRowId={(row) => row.id}
        lazyLoad
        lazyLoadBatchSize={2}
        lazyLoadThreshold={80}
        onLazyLoad={onLazyLoad}
        pagination={{ pageIndex: 0, pageSize: 4 }}
      />,
    );

    await act(async () => {
      resolveInitial?.({ rows, total: 4 });
    });

    const viewport = element.querySelector<HTMLElement>("[data-testid='lazy-load-viewport']")!;
    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, value: 300 },
      scrollHeight: { configurable: true, value: 1000 },
      scrollTop: { configurable: true, value: 650, writable: true },
    });

    act(() => {
      viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
    act(() => {
      viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
    });

    expect(onLazyLoad).toHaveBeenCalledTimes(2);
    expect(onLazyLoad).toHaveBeenLastCalledWith(
      expect.objectContaining({ limit: 2, offset: 2, reason: "scroll" }),
    );
    expect(element.querySelector("[data-testid='data-table-infinite-loading-row']")).not.toBeNull();

    await act(async () => {
      resolveAppend?.({ rows: [{ age: 27, id: "c", name: "Gamma" }, { age: 24, id: "d", name: "Delta" }], total: 4 });
    });

    expect(element.querySelector("[data-testid='row-c']")).not.toBeNull();
    expect(element.querySelector("[data-testid='row-d']")).not.toBeNull();
    expect(element.querySelector("[data-testid='data-table-infinite-loading-row']")).toBeNull();
  });

  it("aborts pending lazy load requests on unmount and ignores stale results", async () => {
    let capturedSignal: AbortSignal | undefined;
    let resolveLazyLoad: ((result: { rows: PersonRow[]; total: number }) => void) | undefined;
    const onLazyLoad = vi.fn(
      ({ signal }) =>
        new Promise<{ rows: PersonRow[]; total: number }>((resolve) => {
          capturedSignal = signal;
          resolveLazyLoad = resolve;
        }),
    );
    const element = renderTableElement(
      <CominsTable
        columns={columns}
        data={[]}
        getRowId={(row) => row.id}
        lazyLoad
        onLazyLoad={onLazyLoad}
        pagination={{ pageIndex: 0, pageSize: 2 }}
      />,
    );

    expect(onLazyLoad).toHaveBeenCalledTimes(1);

    act(() => root?.unmount());
    root = undefined;

    expect(capturedSignal?.aborted).toBe(true);

    await act(async () => {
      resolveLazyLoad?.({ rows, total: 2 });
    });

    expect(element.querySelector("[data-testid='row-a']")).toBeNull();
  });

  it("notifies onChangeData when internal interactions mutate data", () => {
    const onChangeData = vi.fn();
    const element = renderTableElement(
      <CominsTable
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
      <CominsTable columns={columns} data={rows} getRowId={(row) => row.id} />,
    );

    expect(element.querySelector("[data-testid='cell-a-name']")?.textContent).toBe("Alpha");
    expect(element.querySelector("[data-testid='cell-b-age']")?.textContent).toBe("42");
  });

  it("notifies onChangeData when internal interactions mutate controlled data", () => {
    const onChangeData = vi.fn();
    const element = renderTableElement(
      <CominsTable
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
        <CominsTable
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
    expect(rowA.className).toContain("comins-row-selected");
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
      <CominsTable
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
        <CominsTable
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
        <CominsTable
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
        <CominsTable
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
      <CominsTable
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
      <CominsTable
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
      <CominsTable columns={columns} data={threeRows} getRowId={(row) => row.id} onChangeSort={onChangeSort} />,
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
      <CominsTable columns={columns} data={threeRows} getRowId={(row) => row.id} />,
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
      <CominsTable columns={columns} data={threeRows} getRowId={(row) => row.id} />,
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

  it("renders 2-depth column groups without parent sort behavior", () => {
    const onChangeSort = vi.fn();
    const element = renderTableElement(
      <CominsTable
        columnGroups={[{ children: ["name", "age"], id: "profile", label: "Profile" }]}
        columns={columns}
        data={threeRows}
        getRowId={(row) => row.id}
        onChangeSort={onChangeSort}
      />,
    );
    const headerRows = element.querySelectorAll("thead tr");
    const groupHeader = element.querySelector("[data-testid='header-group-profile']")!;
    const nameHeader = element.querySelector("[data-testid='header-name']")!;
    const ageHeader = element.querySelector("[data-testid='header-age']")!;

    expect(headerRows).toHaveLength(2);
    expect(groupHeader.textContent).toContain("Profile");
    expect(groupHeader.getAttribute("colspan")).toBe("2");
    expect(groupHeader.getAttribute("scope")).toBe("colgroup");
    expect(groupHeader.getAttribute("aria-sort")).toBeNull();
    expect(groupHeader.getAttribute("tabindex")).toBeNull();
    expect(nameHeader.closest("tr")).toBe(headerRows[1]);
    expect(ageHeader.closest("tr")).toBe(headerRows[1]);

    act(() => {
      groupHeader.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onChangeSort).not.toHaveBeenCalled();
    expect([...element.querySelectorAll("tbody tr")].map((row) => row.textContent)).toEqual([
      "Alpha31",
      "Beta42",
      "Gamma27",
    ]);
  });

  it("hides actual child columns through parent group layout state", () => {
    const ref = createRef<CominsTableRef<PersonRow>>();
    const element = renderTableElement(
      <CominsTable
        columnGroups={[{ children: ["name", "age"], id: "profile", label: "Profile" }]}
        columns={[
          { field: "name", label: "Name" },
          { field: "age", label: "Age" },
          { field: "profile.age", label: "Profile Age" },
        ]}
        data={apiRows}
        getRowId={(row) => row.id}
        ref={ref}
      />,
    );

    act(() => {
      ref.current?.setColumnLayout({
        columns: { age: { hidden: true }, name: {}, "profile.age": {} },
        groups: { profile: { hidden: true } },
        order: ["name", "age", "profile.age"],
      });
    });

    expect(element.querySelector("[data-testid='header-group-profile']")).toBeNull();
    expect(element.querySelector("[data-testid='header-name']")).toBeNull();
    expect(element.querySelector("[data-testid='header-age']")).toBeNull();
    expect(element.querySelector("[data-testid='header-profile.age']")).not.toBeNull();
    expect([...element.querySelectorAll("tbody tr")].map((row) => row.textContent)).toEqual(["31", "42"]);

    act(() => {
      ref.current?.setColumnLayout({
        columns: { age: { hidden: true }, name: {}, "profile.age": {} },
        groups: { profile: { hidden: false } },
        order: ["name", "age", "profile.age"],
      });
    });

    expect(element.querySelector("[data-testid='header-group-profile']")).not.toBeNull();
    expect(element.querySelector("[data-testid='header-name']")).not.toBeNull();
    expect(element.querySelector("[data-testid='header-age']")).toBeNull();
    expect([...element.querySelectorAll("tbody tr")].map((row) => row.textContent)).toEqual(["Alpha31", "Beta42"]);
  });

  it("exposes column layout, selection, and sort ref methods", () => {
    const ref = createRef<CominsTableRef<PersonRow>>();
    const onChangeColumnLayout = vi.fn();
    const onChangeSelection = vi.fn();
    const onChangeSort = vi.fn();
    const element = renderTableElement(
      <CominsTable
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
    const ref = createRef<CominsTableRef<PersonRow>>();
    const onChangeData = vi.fn();
    const onChangeSort = vi.fn();
    const element = renderTableElement(
      <CominsTable
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
      <CominsTable
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
