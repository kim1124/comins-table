// @vitest-environment jsdom

import { act, type ComponentType, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CominsTable, type CominsTreeNode } from "../src";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

type PersonRow = {
  age: number;
  id: string;
  name: string;
};

const columns = [
  { field: "name", label: "Name", sort: true },
  { field: "age", label: "Age", sort: true },
] as const;

const initialData: CominsTreeNode<PersonRow>[] = [
  {
    children: [{ item: { age: 20, id: "child", name: "Child" } }],
    item: { age: 100, id: "root", name: "Root" },
  },
  { item: { age: 10, id: "leaf", name: "Leaf" } },
];

let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
});

function ControlledTreeTable() {
  const [data, setData] = useState(initialData);

  return (
    <CominsTable
      columns={columns}
      data={data}
      getRowId={(item) => item.id}
      onChangeData={setData}
      summary={{ columns: { age: "sum" } }}
      tree
    />
  );
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

describe("comins-table tree grid", () => {
  it("keeps existing columns on item rows and toggles descendant visibility", () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() => root?.render(<ControlledTreeTable />));

    expect(container.querySelector("[data-testid='cell-root-name']")?.textContent).toContain("Root");
    expect(container.querySelector("[data-testid='row-child']")).toBeNull();
    expect(container.querySelector("[data-testid='summary-cell-age']")?.textContent).toBe("30");

    const expander = container.querySelector<HTMLButtonElement>("[data-testid='tree-expander-root']");
    expect(expander?.getAttribute("aria-expanded")).toBe("false");

    act(() => expander?.click());

    expect(container.querySelector("[data-testid='row-child']")).not.toBeNull();
    expect(container.querySelector("[data-testid='tree-expander-root']")?.getAttribute("aria-expanded")).toBe("true");
  });

  it("sorts root siblings without separating a parent from its descendants", async () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() => root?.render(<ControlledTreeTable />));
    act(() => container?.querySelector<HTMLElement>("[data-testid='header-name']")?.click());

    const visibleRows = Array.from(container.querySelectorAll("tr[data-comins-row-data-index]"));
    expect(visibleRows.map((row) => row.getAttribute("data-testid"))).toEqual(["row-leaf", "row-root"]);

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='tree-expander-root']")?.click();
      await Promise.resolve();
    });

    expect(Array.from(container.querySelectorAll("tr[data-comins-row-data-index]")).map((row) => row.getAttribute("data-testid"))).toEqual([
      "row-leaf",
      "row-root",
      "row-child",
    ]);
  });

  it("does not apply flat row copy and paste operations to Tree Grid data", () => {
    const onChangeData = vi.fn();
    const onKeyDownRow = vi.fn();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        <CominsTable
          columns={columns}
          data={initialData}
          getRowId={(item) => item.id}
          onChangeData={onChangeData}
          onKeyDownRow={onKeyDownRow}
          tree
        />,
      );
    });

    pressControlKey(container.querySelector("[data-testid='row-root']")!, "c");
    pressControlKey(container.querySelector("[data-testid='row-root']")!, "v");

    expect(onKeyDownRow).toHaveBeenCalledTimes(2);
    expect(onChangeData).not.toHaveBeenCalled();
  });

  it("hard-disables runtime lazy and infinite loading props in Tree Grid", async () => {
    const onLazyLoad = vi.fn(async () => ({ rows: [], total: 0 }));
    const onLoadMore = vi.fn();
    const UnsafeTreeTable = CominsTable as unknown as ComponentType<Record<string, unknown>>;

    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <UnsafeTreeTable
          columns={columns}
          data={initialData}
          data-testid="tree-runtime-viewport"
          getRowId={(item: PersonRow) => item.id}
          hasMoreRows
          infiniteScroll
          lazyLoad
          loadingMore
          onLazyLoad={onLazyLoad}
          onLoadMore={onLoadMore}
          tree
        />,
      );
      await Promise.resolve();
    });

    const viewport = container.querySelector<HTMLElement>("[data-testid='tree-runtime-viewport']")!;
    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, value: 300 },
      scrollHeight: { configurable: true, value: 1000 },
      scrollTop: { configurable: true, value: 900, writable: true },
    });

    act(() => {
      viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
    });

    expect(onLazyLoad).not.toHaveBeenCalled();
    expect(onLoadMore).not.toHaveBeenCalled();
  });
});
