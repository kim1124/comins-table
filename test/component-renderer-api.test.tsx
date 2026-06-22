// @vitest-environment jsdom

import type { ReactElement } from "react";
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { KmsfDataTable, type KmsfDataTableColumn } from "../src";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

type Row = {
  enabled: boolean;
  id: string;
  items?: Array<{ data?: { group: string }; label: string; value: string }>;
  name: string;
  optionA: boolean;
  progress: number;
  role: "owner" | "viewer";
};

const baseRows: Row[] = [
  { enabled: true, id: "a", name: "Alpha", optionA: true, progress: 40, role: "owner" },
  { enabled: false, id: "b", name: "Beta", optionA: false, progress: 80, role: "viewer" },
];

const listRows: Row[] = [
  {
    enabled: true,
    id: "a",
    items: Array.from({ length: 24 }, (_, index) => ({
      data: { group: index % 2 === 0 ? "even" : "odd" },
      label: `Alpha item ${index + 1}`,
      value: `alpha-${index + 1}`,
    })),
    name: "Alpha",
    optionA: true,
    progress: 40,
    role: "owner",
  },
  {
    enabled: false,
    id: "b",
    items: Array.from({ length: 12 }, (_, index) => ({
      data: { group: "beta" },
      label: `Beta item ${index + 1}`,
      value: `beta-${index + 1}`,
    })),
    name: "Beta",
    optionA: false,
    progress: 80,
    role: "viewer",
  },
];

let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
});

function render(element: ReactElement) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  act(() => {
    root?.render(element);
  });

  return container;
}

describe("@kmsf/data-table component renderer API", () => {
  it("uses cell renderer before components and format", () => {
    const columns: Array<KmsfDataTableColumn<Row>> = [
      {
        field: "name",
        label: "Name",
        cell: {
          format: ({ value }) => `format:${String(value)}`,
          components: [
            {
              type: "button",
              props: ({ value }) => ({ children: `component:${String(value)}` }),
            },
          ],
          renderer: ({ value }) => <span data-testid="custom-name">renderer:{String(value)}</span>,
        },
      },
    ];
    const element = render(<KmsfDataTable columns={columns} data={baseRows} getRowId={(row) => row.id} />);

    expect(element.querySelector("[data-testid='custom-name']")?.textContent).toBe("renderer:Alpha");
    expect(element.textContent).not.toContain("component:Alpha");
    expect(element.textContent).not.toContain("format:Alpha");
  });

  it("renders cell components without formatted value by direction order", () => {
    const columns: Array<KmsfDataTableColumn<Row>> = [
      {
        field: "name",
        label: "Name",
        cell: {
          format: ({ value }) => `format:${String(value)}`,
          components: [
            {
              direction: "left",
              id: "left-action",
              type: "button",
              props: { children: "left" },
            },
            {
              direction: "right",
              id: "right-action",
              type: "button",
              props: { children: "right" },
            },
          ],
        },
      },
    ];
    const element = render(<KmsfDataTable columns={columns} data={baseRows} getRowId={(row) => row.id} />);
    const cell = element.querySelector("[data-testid='cell-a-name']");

    expect(cell?.textContent).toBe("leftright");
    expect(cell?.textContent).not.toContain("format:Alpha");
    expect(cell?.querySelector("[data-kmsf-component-direction='left'] button")?.textContent).toBe("left");
    expect(cell?.querySelector("[data-kmsf-component-direction='right'] button")?.textContent).toBe("right");
  });

  it("commits input component changes only on Enter or blur", () => {
    const onValueChange = vi.fn();

    function Harness() {
      const [rows, setRows] = useState(baseRows);
      const columns: Array<KmsfDataTableColumn<Row>> = [
        {
          field: "name",
          label: "Name",
          cell: {
            components: [
              {
                type: "input",
                props: ({ value }) => ({ "aria-label": "name-input", value: String(value) }),
                onValueChange: ({ row, value }) => {
                  onValueChange(value);
                  setRows((current) =>
                    current.map((item) => (item.id === row.id ? { ...item, name: value } : item)),
                  );
                },
              },
            ],
          },
        },
      ];

      return <KmsfDataTable columns={columns} data={rows} getRowId={(row) => row.id} />;
    }

    const element = render(<Harness />);
    const input = element.querySelector<HTMLInputElement>("input[aria-label='name-input']");
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;

    act(() => {
      setValue?.call(input, "Draft Alpha");
      input?.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
      input?.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(onValueChange).not.toHaveBeenCalled();

    act(() => {
      input?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
    });

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenLastCalledWith("Draft Alpha");

    act(() => {
      input?.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    });

    expect(onValueChange).toHaveBeenCalledTimes(1);

    const nextInput = element.querySelector<HTMLInputElement>("input[aria-label='name-input']");

    act(() => {
      setValue?.call(nextInput, "Blur Alpha");
      nextInput?.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
      nextInput?.dispatchEvent(new Event("change", { bubbles: true }));
      nextInput?.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    });

    expect(onValueChange).toHaveBeenCalledTimes(2);
    expect(onValueChange).toHaveBeenLastCalledWith("Blur Alpha");
  });

  it("passes row column value payload to cell button event", () => {
    const onClick = vi.fn();
    const columns: Array<KmsfDataTableColumn<Row>> = [
      {
        field: "name",
        label: "Name",
        cell: {
          components: [
            {
              type: "button",
              props: ({ value }) => ({ children: String(value) }),
              onClick,
            },
          ],
        },
      },
    ];
    const element = render(<KmsfDataTable columns={columns} data={baseRows} getRowId={(row) => row.id} />);

    act(() => {
      element.querySelector("button")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onClick).toHaveBeenCalledWith(
      expect.objectContaining({
        column: expect.objectContaining({ field: "name", id: "name", index: 0 }),
        row: expect.objectContaining({ data: baseRows[0], id: "a", index: 0, selected: false }),
        value: "Alpha",
      }),
    );
  });

  it("supports controlled checkbox update and cross-cell disabled recalculation", () => {
    function Harness() {
      const [rows, setRows] = useState(baseRows);
      const columns: Array<KmsfDataTableColumn<Row>> = [
        {
          field: "enabled",
          label: "Enabled",
          cell: {
            components: [
              {
                type: "checkbox",
                props: ({ value }) => ({ checked: Boolean(value), "aria-label": "enabled-a" }),
                onCheckedChange: ({ row, checked }) => {
                  setRows((prev) =>
                    prev.map((item) =>
                      item.id === row.id
                        ? { ...item, enabled: checked, optionA: checked ? item.optionA : false }
                        : item,
                    ),
                  );
                },
              },
            ],
          },
        },
        {
          field: "optionA",
          label: "Option A",
          cell: {
            components: [
              {
                type: "checkbox",
                props: ({ row, value }) => ({
                  checked: Boolean(value),
                  disabled: !row.data.enabled,
                  "aria-label": `option-${row.id}`,
                }),
              },
            ],
          },
        },
      ];

      return <KmsfDataTable columns={columns} data={rows} getRowId={(row) => row.id} />;
    }

    const element = render(<Harness />);

    expect(element.querySelector<HTMLInputElement>("input[aria-label='option-a']")?.disabled).toBe(false);

    act(() => {
      element.querySelector<HTMLInputElement>("input[aria-label='enabled-a']")?.click();
    });

    expect(element.querySelector<HTMLInputElement>("input[aria-label='option-a']")?.disabled).toBe(true);
  });

  it("does not route built-in component interactions to cell or row callbacks", () => {
    const onClickCell = vi.fn();
    const onClickRow = vi.fn();
    const columns: Array<KmsfDataTableColumn<Row>> = [
      {
        field: "name",
        label: "Button",
        cell: {
          components: [
            {
              type: "button",
              props: { children: "Button" },
            },
          ],
        },
      },
      {
        field: "enabled",
        label: "Checkbox",
        cell: {
          components: [
            {
              type: "checkbox",
              props: ({ value }) => ({ checked: Boolean(value), "aria-label": "enabled-checkbox" }),
            },
          ],
        },
      },
      {
        field: "role",
        id: "role-radio",
        label: "Radio",
        cell: {
          components: [
            {
              type: "radio",
              options: [
                { label: "Owner", value: "owner" },
                { label: "Viewer", value: "viewer" },
              ],
              props: ({ value }) => ({ value: String(value) }),
            },
          ],
        },
      },
      {
        field: "role",
        id: "role-select",
        label: "Select",
        cell: {
          components: [
            {
              type: "select",
              options: [
                { label: "Owner", value: "owner" },
                { label: "Viewer", value: "viewer" },
              ],
              props: ({ value }) => ({ "aria-label": "role-select", value: String(value) }),
            },
          ],
        },
      },
    ];
    const element = render(
      <KmsfDataTable
        columns={columns}
        data={baseRows}
        getRowId={(row) => row.id}
        onClickCell={onClickCell}
        onClickRow={onClickRow}
      />,
    );

    act(() => {
      element.querySelector<HTMLButtonElement>(".kmsf-data-table__component-button")?.click();
      element.querySelector<HTMLInputElement>("input[aria-label='enabled-checkbox']")?.click();
      element.querySelector<HTMLInputElement>("input[type='radio']")?.click();
      element.querySelector<HTMLSelectElement>("select[aria-label='role-select']")?.click();
    });

    expect(onClickCell).not.toHaveBeenCalled();
    expect(onClickRow).not.toHaveBeenCalled();
  });

  it("marks controlled radio value as checked per row", () => {
    const columns: Array<KmsfDataTableColumn<Row>> = [
      {
        field: "role",
        label: "Role",
        cell: {
          components: [
            {
              type: "radio",
              options: [
                { label: "Owner", value: "owner" },
                { label: "Viewer", value: "viewer" },
              ],
              props: ({ value }) => ({ value: String(value) }),
            },
          ],
        },
      },
    ];
    const element = render(<KmsfDataTable columns={columns} data={baseRows} getRowId={(row) => row.id} />);
    const groups = element.querySelectorAll("[role='radiogroup']");
    const firstRowRadios = groups[0]?.querySelectorAll<HTMLInputElement>("input[type='radio']");
    const secondRowRadios = groups[1]?.querySelectorAll<HTMLInputElement>("input[type='radio']");

    expect(firstRowRadios?.[0]?.checked).toBe(true);
    expect(firstRowRadios?.[1]?.checked).toBe(false);
    expect(secondRowRadios?.[0]?.checked).toBe(false);
    expect(secondRowRadios?.[1]?.checked).toBe(true);
    expect(firstRowRadios?.[0]?.name).not.toBe(secondRowRadios?.[0]?.name);
  });

  it("uses header renderer before header component and label", () => {
    const columns: Array<KmsfDataTableColumn<Row>> = [
      {
        field: "name",
        label: "Name",
        header: {
          components: [
            {
              type: "button",
              props: { children: "Header Component" },
            },
          ],
          renderer: ({ column }) => <span data-testid="header-custom">Header Renderer {column.id}</span>,
        },
      },
    ];
    const element = render(<KmsfDataTable columns={columns} data={baseRows} getRowId={(row) => row.id} />);

    expect(element.querySelector("[data-testid='header-custom']")?.textContent).toBe("Header Renderer name");
    expect(element.textContent).not.toContain("Header Component");
  });

  it("opens header menu, calls before/open/select, and closes after item select", () => {
    const onBeforeChange = vi.fn(() => true);
    const onOpenChange = vi.fn();
    const onSelect = vi.fn();
    const columns: Array<KmsfDataTableColumn<Row>> = [
      {
        field: "name",
        label: "Name",
        header: {
          components: [
            {
              direction: "right",
              items: [
                { label: "정보", value: "info" },
                { type: "divider" },
                { label: "도움말", type: "label" },
              ],
              onBeforeChange,
              onOpenChange,
              onSelect,
              type: "menu",
            },
          ],
        },
      },
    ];
    const element = render(<KmsfDataTable columns={columns} data={baseRows} getRowId={(row) => row.id} />);
    const trigger = element.querySelector<HTMLButtonElement>("[aria-haspopup='menu']");

    act(() => {
      trigger?.click();
    });

    expect(onBeforeChange).toHaveBeenCalledWith(expect.objectContaining({ open: true }));
    expect(onOpenChange).toHaveBeenCalledWith(expect.objectContaining({ open: true }));
    expect(container?.querySelector("[role='menu']")).toBeNull();
    expect(document.body.querySelector("[role='menu']")).toBeTruthy();

    act(() => {
      document.body.querySelector<HTMLButtonElement>("[role='menuitem']")?.click();
    });

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ value: "info" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(expect.objectContaining({ open: false }));
    expect(document.body.querySelector("[role='menu']")).toBeNull();
  });

  it("renders virtual-list default as a five-item scroll viewport with all items available", () => {
    const columns: Array<KmsfDataTableColumn<Row>> = [
      {
        cell: {
          components: [
            {
              type: "virtual-list",
              items: ({ row }) => row.data.items ?? [],
              props: {
                "aria-label": "기본 아이템",
                itemHeight: 28,
              },
            },
          ],
        },
        field: "items",
        label: "Items",
      },
    ];
    const element = render(<KmsfDataTable columns={columns} data={listRows} getRowId={(row) => row.id} rowHeight={180} />);
    const firstList = element.querySelector<HTMLElement>("[data-testid='virtual-list-a-items']");

    expect(firstList?.style.height).toBe("140px");
    expect(firstList?.querySelectorAll("[data-kmsf-virtual-list-item='true']")).toHaveLength(24);
    expect(firstList?.textContent).toContain("Alpha item 24");
  });

  it("cancels header menu open when onBeforeChange returns false", () => {
    const columns: Array<KmsfDataTableColumn<Row>> = [
      {
        field: "name",
        label: "Name",
        header: {
          components: [
            {
              items: [{ label: "정보", value: "info" }],
              onBeforeChange: () => false,
              type: "menu",
            },
          ],
        },
      },
    ];
    const element = render(<KmsfDataTable columns={columns} data={baseRows} getRowId={(row) => row.id} />);

    act(() => {
      element.querySelector<HTMLButtonElement>("[aria-haspopup='menu']")?.click();
    });

    expect(document.body.querySelector("[role='menu']")).toBeNull();
  });

  it("renders a virtual-list cell with limit, more, internal selection, and item events", () => {
    const onClickItem = vi.fn();
    const onContextMenuItem = vi.fn();
    const columns: Array<KmsfDataTableColumn<Row>> = [
      {
        cell: {
          components: [
            {
              type: "virtual-list",
              items: ({ row }) => row.data.items ?? [],
              onClickItem,
              onContextMenuItem,
              props: {
                "aria-label": "알파 아이템",
                itemHeight: 28,
                limit: 10,
                more: true,
              },
            },
          ],
        },
        field: "items",
        label: "Items",
      },
    ];
    const element = render(<KmsfDataTable columns={columns} data={listRows} getRowId={(row) => row.id} rowHeight={120} />);
    const firstList = element.querySelector("[data-testid='virtual-list-a-items']");

    expect(firstList?.querySelectorAll("[data-kmsf-virtual-list-item='true']")).toHaveLength(10);

    act(() => {
      firstList?.querySelector<HTMLButtonElement>("[data-testid='virtual-list-more-a-items']")?.click();
    });

    expect(firstList?.querySelectorAll("[data-kmsf-virtual-list-item='true']").length).toBeGreaterThan(10);

    const firstItem = firstList?.querySelector<HTMLButtonElement>("[data-kmsf-virtual-list-item='true']");

    act(() => {
      firstItem?.click();
    });

    expect(firstItem?.getAttribute("aria-selected")).toBe("true");
    expect(onClickItem).toHaveBeenCalledWith(
      expect.objectContaining({
        item: expect.objectContaining({ value: "alpha-1" }),
        itemIndex: 0,
        value: "alpha-1",
      }),
    );

    act(() => {
      firstItem?.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
    });

    expect(onContextMenuItem).toHaveBeenCalledWith(
      expect.objectContaining({
        item: expect.objectContaining({ value: "alpha-1" }),
        itemIndex: 0,
        value: "alpha-1",
      }),
    );
  });

  it("enables virtual-list search only for the single selected row and uses reduced searchFilter payload", () => {
    const searchFilter = vi.fn(
      ({ item, itemIndex, value }) => itemIndex === 1 || item.label.toLowerCase().includes(String(value).toLowerCase()),
    );
    const columns: Array<KmsfDataTableColumn<Row>> = [
      {
        cell: {
          components: [
            {
              type: "virtual-list",
              items: ({ row }) => row.data.items ?? [],
              props: {
                "aria-label": "검색 아이템",
                itemHeight: 28,
                limit: 10,
                searchable: true,
              },
              searchFilter,
            },
          ],
        },
        field: "items",
        label: "Items",
      },
    ];
    const element = render(<KmsfDataTable columns={columns} data={listRows} getRowId={(row) => row.id} rowHeight={120} />);

    expect(element.querySelector<HTMLInputElement>("[data-testid='virtual-list-search-a-items']")?.disabled).toBe(true);

    act(() => {
      element.querySelector("[data-testid='row-a']")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const firstSearch = element.querySelector<HTMLInputElement>("[data-testid='virtual-list-search-a-items']");
    const secondSearch = element.querySelector<HTMLInputElement>("[data-testid='virtual-list-search-b-items']");

    expect(firstSearch?.disabled).toBe(false);
    expect(secondSearch?.disabled).toBe(true);

    act(() => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;

      valueSetter?.call(firstSearch, "alpha");
      firstSearch?.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
      firstSearch?.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(searchFilter).toHaveBeenCalledWith(
      expect.objectContaining({
        item: expect.objectContaining({ value: "alpha-1" }),
        itemIndex: 0,
        value: "alpha",
      }),
    );
    expect(searchFilter.mock.calls[0]?.[0]).not.toHaveProperty("column");
    expect(searchFilter.mock.calls[0]?.[0]).not.toHaveProperty("row");
  });
});
