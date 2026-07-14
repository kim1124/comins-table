// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

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
});
