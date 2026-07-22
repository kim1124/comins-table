// @vitest-environment jsdom

import { createRef, type ReactElement } from "react";
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CominsTable, type CominsTableColumn, type CominsTableRef } from "../src";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

type Row = {
  enabled: boolean;
  id: string;
  items?: Array<{ data?: { group: string }; disabled?: boolean; label: string; value: string }>;
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

const shortListRows: Row[] = [
  {
    ...listRows[0],
    id: "c",
    items: Array.from({ length: 5 }, (_, index) => ({
      data: { group: "short" },
      label: `Short item ${index + 1}`,
      value: `short-${index + 1}`,
    })),
    name: "Gamma",
  },
];

const largeListRows: Row[] = [
  {
    ...listRows[0],
    items: Array.from({ length: 10_000 }, (_, index) => ({
      data: { group: "large" },
      label: `Large item ${index + 1}`,
      value: `large-${index + 1}`,
    })),
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

describe("comins-table component renderer API", () => {
  it("uses cell renderer before components and format", () => {
    const columns: Array<CominsTableColumn<Row>> = [
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
    const element = render(<CominsTable columns={columns} data={baseRows} getRowId={(row) => row.id} />);

    expect(element.querySelector("[data-testid='custom-name']")?.textContent).toBe("renderer:Alpha");
    expect(element.textContent).not.toContain("component:Alpha");
    expect(element.textContent).not.toContain("format:Alpha");
  });

  it("renders cell components without formatted value by direction order", () => {
    const columns: Array<CominsTableColumn<Row>> = [
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
    const element = render(<CominsTable columns={columns} data={baseRows} getRowId={(row) => row.id} />);
    const cell = element.querySelector("[data-testid='cell-a-name']");

    expect(cell?.textContent).toBe("leftright");
    expect(cell?.textContent).not.toContain("format:Alpha");
    expect(cell?.querySelector("[data-comins-component-direction='left'] button")?.textContent).toBe("left");
    expect(cell?.querySelector("[data-comins-component-direction='right'] button")?.textContent).toBe("right");
  });

  it("renders cell input and select only for the single selected row", () => {
    const ref = createRef<CominsTableRef<Row>>();
    const columns: Array<CominsTableColumn<Row>> = [
      {
        field: "name",
        label: "Name",
        cell: {
          format: ({ value }) => `name:${String(value)}`,
          components: [
            {
              type: "input",
              props: ({ value }) => ({ "aria-label": "name-input", value: String(value) }),
            },
          ],
        },
      },
      {
        field: "role",
        label: "Role",
        cell: {
          format: ({ value }) => `role:${String(value)}`,
          components: [
            {
              options: [
                { label: "Owner", value: "owner" },
                { label: "Viewer", value: "viewer" },
              ],
              props: ({ value }) => ({ "aria-label": "role-select", value: String(value) }),
              type: "select",
            },
          ],
        },
      },
    ];
    const element = render(<CominsTable columns={columns} data={baseRows} getRowId={(row) => row.id} ref={ref} />);

    expect(element.querySelector("[data-testid='cell-a-name']")?.textContent).toBe("name:Alpha");
    expect(element.querySelector("[data-testid='cell-a-role']")?.textContent).toBe("role:owner");
    expect(element.querySelector("[aria-label='name-input']")).toBeNull();
    expect(element.querySelector("[aria-label='role-select']")).toBeNull();

    act(() => {
      ref.current?.setSelectedRow(0);
    });

    expect(element.querySelector("[data-testid='cell-a-name'] input[aria-label='name-input']")).not.toBeNull();
    expect(element.querySelector("[data-testid='cell-a-role'] select[aria-label='role-select']")).not.toBeNull();
    expect(element.querySelector("[data-testid='cell-b-name']")?.textContent).toBe("name:Beta");
    expect(element.querySelector("[data-testid='cell-b-role']")?.textContent).toBe("role:viewer");

    act(() => {
      ref.current?.setSelectedRows([0, 1]);
    });

    expect(element.querySelector("[aria-label='name-input']")).toBeNull();
    expect(element.querySelector("[aria-label='role-select']")).toBeNull();
    expect(element.querySelector("[data-testid='cell-a-name']")?.textContent).toBe("name:Alpha");
    expect(element.querySelector("[data-testid='cell-a-role']")?.textContent).toBe("role:owner");
  });

  it("keeps header input and select components visible without row selection", () => {
    const columns: Array<CominsTableColumn<Row>> = [
      {
        field: "name",
        header: {
          components: [
            {
              type: "input",
              props: { "aria-label": "header-input", value: "Header" },
            },
            {
              options: [
                { label: "Owner", value: "owner" },
                { label: "Viewer", value: "viewer" },
              ],
              props: { "aria-label": "header-select", value: "owner" },
              type: "select",
            },
          ],
        },
        label: "Name",
      },
    ];
    const element = render(<CominsTable columns={columns} data={baseRows} getRowId={(row) => row.id} />);

    expect(element.querySelector("thead input[aria-label='header-input']")).not.toBeNull();
    expect(element.querySelector("thead select[aria-label='header-select']")).not.toBeNull();
  });

  it("commits input component changes only on Enter or blur", () => {
    const onValueChange = vi.fn();

    function Harness() {
      const [rows, setRows] = useState(baseRows);
      const columns: Array<CominsTableColumn<Row>> = [
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

      return <CominsTable columns={columns} data={rows} getRowId={(row) => row.id} />;
    }

    const element = render(<Harness />);
    const row = element.querySelector("[data-testid='row-a']");

    act(() => {
      row?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

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

  it("updates the table model when a cell input commits on Enter or blur", () => {
    const onChangeData = vi.fn();
    const columns: Array<CominsTableColumn<Row>> = [
      {
        field: "name",
        label: "Name",
        cell: {
          components: [
            {
              type: "input",
              props: ({ value }) => ({ "aria-label": "name-model-input", value: String(value) }),
            },
          ],
        },
      },
    ];
    const element = render(
      <CominsTable columns={columns} data={baseRows} getRowId={(row) => row.id} onChangeData={onChangeData} />,
    );

    act(() => {
      element.querySelector("[data-testid='row-a']")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const input = element.querySelector<HTMLInputElement>("input[aria-label='name-model-input']");
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;

    act(() => {
      setValue?.call(input, "Committed Alpha");
      input?.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
      input?.dispatchEvent(new Event("change", { bubbles: true }));
      input?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
    });

    expect(onChangeData).toHaveBeenLastCalledWith([
      { ...baseRows[0], name: "Committed Alpha" },
      baseRows[1],
    ]);
    expect(element.querySelector<HTMLInputElement>("input[aria-label='name-model-input']")?.value).toBe("Committed Alpha");

    act(() => {
      element.querySelector("[data-testid='row-b']")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(element.querySelector("[data-testid='cell-a-name']")?.textContent).toContain("Committed Alpha");

    const nextInput = element.querySelector<HTMLInputElement>("input[aria-label='name-model-input']");

    act(() => {
      setValue?.call(nextInput, "Committed Beta");
      nextInput?.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
      nextInput?.dispatchEvent(new Event("change", { bubbles: true }));
      nextInput?.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    });

    expect(onChangeData).toHaveBeenLastCalledWith([
      { ...baseRows[0], name: "Committed Alpha" },
      { ...baseRows[1], name: "Committed Beta" },
    ]);
    expect(element.querySelector<HTMLInputElement>("input[aria-label='name-model-input']")?.value).toBe("Committed Beta");
  });

  it("passes row column value payload to cell button event", () => {
    const onClick = vi.fn();
    const columns: Array<CominsTableColumn<Row>> = [
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
    const element = render(<CominsTable columns={columns} data={baseRows} getRowId={(row) => row.id} />);

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
      const columns: Array<CominsTableColumn<Row>> = [
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

      return <CominsTable columns={columns} data={rows} getRowId={(row) => row.id} />;
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
    const columns: Array<CominsTableColumn<Row>> = [
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
      <CominsTable
        columns={columns}
        data={baseRows}
        getRowId={(row) => row.id}
        onClickCell={onClickCell}
        onClickRow={onClickRow}
      />,
    );

    act(() => {
      element.querySelector<HTMLButtonElement>(".comins-table__component-button")?.click();
      element.querySelector<HTMLInputElement>("input[aria-label='enabled-checkbox']")?.click();
      element.querySelector<HTMLInputElement>("input[type='radio']")?.click();
      element.querySelector<HTMLSelectElement>("select[aria-label='role-select']")?.click();
    });

    expect(onClickCell).not.toHaveBeenCalled();
    expect(onClickRow).not.toHaveBeenCalled();
  });

  it("marks controlled radio value as checked per row", () => {
    const columns: Array<CominsTableColumn<Row>> = [
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
    const element = render(<CominsTable columns={columns} data={baseRows} getRowId={(row) => row.id} />);
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
    const columns: Array<CominsTableColumn<Row>> = [
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
    const element = render(<CominsTable columns={columns} data={baseRows} getRowId={(row) => row.id} />);

    expect(element.querySelector("[data-testid='header-custom']")?.textContent).toBe("Header Renderer name");
    expect(element.textContent).not.toContain("Header Component");
  });

  it("opens inline header menu, calls before/open/select, and closes after item select", () => {
    const onBeforeChange = vi.fn(() => true);
    const onOpenChange = vi.fn();
    const onSelect = vi.fn();
    const columns: Array<CominsTableColumn<Row>> = [
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
    const element = render(<CominsTable columns={columns} data={baseRows} getRowId={(row) => row.id} />);
    const trigger = element.querySelector<HTMLButtonElement>("[aria-haspopup='menu']");

    act(() => {
      trigger?.click();
    });

    expect(onBeforeChange).toHaveBeenCalledWith(expect.objectContaining({ open: true }));
    expect(onOpenChange).toHaveBeenCalledWith(expect.objectContaining({ open: true }));
    const menu = element.querySelector("[role='menu']");
    expect(menu).toBeTruthy();
    expect(document.body.querySelector("[role='menu']")).toBe(menu);

    act(() => {
      element.querySelector<HTMLButtonElement>("[role='menuitem']")?.click();
    });

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ value: "info" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(expect.objectContaining({ open: false }));
    expect(element.querySelector("[role='menu']")).toBeNull();
  });

  it("renders virtual-list collapsed preview with ellipsis only when items exceed five", () => {
    const columns: Array<CominsTableColumn<Row>> = [
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
    const element = render(
      <CominsTable columns={columns} data={[...listRows, ...shortListRows]} getRowId={(row) => row.id} rowHeight={180} />,
    );
    const firstList = element.querySelector<HTMLElement>("[data-testid='virtual-list-a-items']");
    const shortList = element.querySelector<HTMLElement>("[data-testid='virtual-list-c-items']");

    expect(firstList?.style.height).toBe("140px");
    expect(firstList?.querySelectorAll("[data-comins-virtual-list-item='true']")).toHaveLength(5);
    expect(firstList?.textContent).toContain("Alpha item 5");
    expect(firstList?.textContent).not.toContain("Alpha item 6");
    expect(firstList?.querySelector("[data-testid='virtual-list-overflow-a-items']")?.textContent).toBe("...");

    expect(shortList?.querySelectorAll("[data-comins-virtual-list-item='true']")).toHaveLength(5);
    expect(shortList?.querySelector("[data-testid='virtual-list-overflow-c-items']")).toBeNull();
  });

  it("cancels header menu open when onBeforeChange returns false", () => {
    const columns: Array<CominsTableColumn<Row>> = [
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
    const element = render(<CominsTable columns={columns} data={baseRows} getRowId={(row) => row.id} />);

    act(() => {
      element.querySelector<HTMLButtonElement>("[aria-haspopup='menu']")?.click();
    });

    expect(document.body.querySelector("[role='menu']")).toBeNull();
  });

  it("selects the owning row from a virtual-list item without invoking cell or row click callbacks", () => {
    const onClickCell = vi.fn();
    const onClickItem = vi.fn();
    const onClickRow = vi.fn();
    const columns: Array<CominsTableColumn<Row>> = [
      {
        cell: {
          components: [
            {
              type: "virtual-list",
              items: ({ row }) => row.data.items ?? [],
              onClickItem,
            },
          ],
        },
        field: "items",
        label: "Items",
      },
    ];
    const element = render(
      <CominsTable
        columns={columns}
        data={listRows}
        getRowId={(row) => row.id}
        onClickCell={onClickCell}
        onClickRow={onClickRow}
        rowHeight={180}
      />,
    );
    const firstItem = element.querySelector<HTMLButtonElement>(
      "[data-testid='virtual-list-a-items'] [data-comins-virtual-list-item='true']",
    );

    act(() => {
      firstItem?.click();
    });

    expect(element.querySelector("[data-testid='row-a']")?.getAttribute("data-selected-row")).toBe("true");
    expect(element.querySelector("[data-testid='cell-a-items']")?.getAttribute("data-selected")).toBeNull();
    expect(firstItem?.getAttribute("aria-selected")).toBe("true");
    expect(onClickItem).toHaveBeenCalledTimes(1);
    expect(onClickCell).not.toHaveBeenCalled();
    expect(onClickRow).not.toHaveBeenCalled();
  });

  it("applies Ctrl, Cmd, and Shift Row selection semantics from virtual-list items", () => {
    const columns: Array<CominsTableColumn<Row>> = [
      {
        cell: {
          components: [
            {
              type: "virtual-list",
              items: ({ row }) => row.data.items ?? [],
            },
          ],
        },
        field: "items",
        label: "Items",
      },
    ];
    const element = render(<CominsTable columns={columns} data={listRows} getRowId={(row) => row.id} rowHeight={180} />);
    const firstItem = element.querySelector<HTMLButtonElement>(
      "[data-testid='virtual-list-a-items'] [data-comins-virtual-list-item='true']",
    );
    const secondItem = element.querySelector<HTMLButtonElement>(
      "[data-testid='virtual-list-b-items'] [data-comins-virtual-list-item='true']",
    );

    act(() => {
      firstItem?.click();
      secondItem?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, ctrlKey: true }));
    });

    expect(element.querySelector("[data-testid='row-a']")?.getAttribute("data-selected-row")).toBe("true");
    expect(element.querySelector("[data-testid='row-b']")?.getAttribute("data-selected-row")).toBe("true");

    act(() => {
      firstItem?.click();
      secondItem?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, metaKey: true }));
    });

    expect(element.querySelector("[data-testid='row-a']")?.getAttribute("data-selected-row")).toBe("true");
    expect(element.querySelector("[data-testid='row-b']")?.getAttribute("data-selected-row")).toBe("true");

    act(() => {
      firstItem?.click();
      secondItem?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, shiftKey: true }));
    });

    expect(element.querySelector("[data-testid='row-a']")?.getAttribute("data-selected-row")).toBe("true");
    expect(element.querySelector("[data-testid='row-b']")?.getAttribute("data-selected-row")).toBe("true");
  });

  it("selects the owning row from virtual-list Enter and Space activation", () => {
    const onClickCell = vi.fn();
    const onClickItem = vi.fn();
    const onClickRow = vi.fn();
    const columns: Array<CominsTableColumn<Row>> = [
      {
        cell: {
          components: [
            {
              type: "virtual-list",
              items: ({ row }) => row.data.items ?? [],
              onClickItem,
            },
          ],
        },
        field: "items",
        label: "Items",
      },
    ];
    const element = render(
      <CominsTable
        columns={columns}
        data={listRows}
        getRowId={(row) => row.id}
        onClickCell={onClickCell}
        onClickRow={onClickRow}
        rowHeight={180}
      />,
    );
    const firstItem = element.querySelector<HTMLButtonElement>(
      "[data-testid='virtual-list-a-items'] [data-comins-virtual-list-item='true']",
    );
    const secondItem = element.querySelector<HTMLButtonElement>(
      "[data-testid='virtual-list-b-items'] [data-comins-virtual-list-item='true']",
    );

    act(() => {
      firstItem?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Enter" }));
    });

    expect(element.querySelector("[data-testid='row-a']")?.getAttribute("data-selected-row")).toBe("true");
    expect(firstItem?.getAttribute("aria-selected")).toBe("true");

    act(() => {
      secondItem?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: " " }));
    });

    expect(element.querySelector("[data-testid='row-a']")?.getAttribute("data-selected-row")).toBeNull();
    expect(element.querySelector("[data-testid='row-b']")?.getAttribute("data-selected-row")).toBe("true");
    expect(secondItem?.getAttribute("aria-selected")).toBe("true");
    expect(onClickItem).toHaveBeenCalledTimes(2);
    expect(onClickCell).not.toHaveBeenCalled();
    expect(onClickRow).not.toHaveBeenCalled();
  });

  it("rejects virtual-list item activation for disabled rows and disabled items", () => {
    const onClickItem = vi.fn();
    const disabledRows = listRows.map((row) =>
      row.id === "a"
        ? {
            ...row,
            items: row.items?.map((item, index) => (index === 0 ? { ...item, disabled: true } : item)),
          }
        : row,
    );
    const columns: Array<CominsTableColumn<Row>> = [
      {
        cell: {
          components: [
            {
              type: "virtual-list",
              items: ({ row }) => row.data.items ?? [],
              onClickItem,
            },
          ],
        },
        field: "items",
        label: "Items",
      },
    ];
    const element = render(
      <CominsTable
        columns={columns}
        data={disabledRows}
        getRowId={(row) => row.id}
        rowHeight={180}
        rowProps={{ disabled: (row) => row.id === "b" }}
      />,
    );
    const disabledItem = element.querySelector<HTMLButtonElement>(
      "[data-testid='virtual-list-a-items'] [data-comins-virtual-list-item='true']",
    );
    const disabledRowItem = element.querySelector<HTMLButtonElement>(
      "[data-testid='virtual-list-b-items'] [data-comins-virtual-list-item='true']",
    );

    act(() => {
      disabledItem?.click();
      disabledRowItem?.click();
    });

    expect(element.querySelector("[data-testid='row-a']")?.getAttribute("data-selected-row")).toBeNull();
    expect(element.querySelector("[data-testid='row-b']")?.getAttribute("data-selected-row")).toBeNull();
    expect(onClickItem).not.toHaveBeenCalled();
  });

  it("selects the owning row exclusively while expanding virtual-list More", () => {
    const onClickItem = vi.fn();
    const onContextMenuItem = vi.fn();
    const columns: Array<CominsTableColumn<Row>> = [
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
                more: true,
              },
            },
          ],
        },
        field: "items",
        label: "Items",
      },
    ];
    const element = render(<CominsTable columns={columns} data={listRows} getRowId={(row) => row.id} rowHeight={120} />);
    const firstList = element.querySelector("[data-testid='virtual-list-a-items']");

    expect(firstList?.querySelectorAll("[data-comins-virtual-list-item='true']")).toHaveLength(5);

    const overflowButton = firstList?.querySelector<HTMLButtonElement>("[data-testid='virtual-list-overflow-a-items']");

    expect(overflowButton?.tagName).toBe("BUTTON");

    act(() => {
      overflowButton?.click();
    });

    expect(firstList?.getAttribute("data-comins-virtual-list-expanded")).toBe("true");
    expect(firstList?.querySelectorAll("[data-comins-virtual-list-item='true']").length).toBeLessThan(24);
    expect(element.querySelector("[data-testid='row-a']")?.getAttribute("data-selected-row")).toBe("true");

    const firstItem = firstList?.querySelector<HTMLButtonElement>("[data-comins-virtual-list-item='true']");

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

    const secondItem = element.querySelector<HTMLButtonElement>(
      "[data-testid='virtual-list-b-items'] [data-comins-virtual-list-item='true']",
    );

    act(() => {
      secondItem?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, ctrlKey: true }));
    });

    expect(element.querySelector("[data-testid='row-a']")?.getAttribute("data-selected-row")).toBe("true");
    expect(element.querySelector("[data-testid='row-b']")?.getAttribute("data-selected-row")).toBe("true");

    act(() => {
      firstList?.querySelector<HTMLButtonElement>("[data-testid='virtual-list-overflow-a-items']")?.click();
    });

    expect(element.querySelector("[data-testid='row-a']")?.getAttribute("data-selected-row")).toBe("true");
    expect(element.querySelector("[data-testid='row-b']")?.getAttribute("data-selected-row")).toBeNull();
    expect(firstList?.getAttribute("data-comins-virtual-list-expanded")).toBe("true");
  });

  it("gates virtual-list search and full scroll behind a single selected row", () => {
    const searchFilter = vi.fn(
      ({ item, itemIndex, value }) => itemIndex === 1 || item.label.toLowerCase().includes(String(value).toLowerCase()),
    );
    const columns: Array<CominsTableColumn<Row>> = [
      {
        cell: {
          components: [
            {
              type: "virtual-list",
              items: ({ row }) => row.data.items ?? [],
              props: {
                "aria-label": "검색 아이템",
                itemHeight: 28,
                more: true,
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
    const rows = [
      largeListRows[0],
      {
        ...largeListRows[0],
        id: "b",
        name: "Beta",
      },
    ];
    const element = render(
      <CominsTable columns={columns} data={rows} getRowId={(row) => row.id} rowHeight={120} />,
    );
    const firstList = element.querySelector<HTMLElement>("[data-testid='virtual-list-a-items']");

    expect(firstList?.querySelectorAll("[data-comins-virtual-list-item='true']")).toHaveLength(5);
    expect(firstList?.textContent).not.toContain("Large item 10000");
    expect(firstList?.querySelector("[data-testid='virtual-list-overflow-a-items']")?.tagName).toBe("BUTTON");

    const firstSearch = element.querySelector<HTMLInputElement>("[data-testid='virtual-list-search-a-items']");

    expect(firstSearch).toBeNull();
    expect(element.querySelector("[data-testid='row-a']")?.getAttribute("data-selected-row")).toBeNull();

    act(() => {
      const itemsViewport = firstList?.querySelector<HTMLElement>(".comins-table__component-virtual-list-items");

      if (itemsViewport) {
        itemsViewport.scrollTop = (10_000 - 5) * 28;
        itemsViewport.dispatchEvent(new Event("scroll", { bubbles: true }));
      }
    });

    expect(firstList?.querySelectorAll("[data-comins-virtual-list-item='true']")).toHaveLength(5);
    expect(firstList?.textContent).not.toContain("Large item 10000");

    act(() => {
      firstList?.querySelector<HTMLButtonElement>("[data-comins-virtual-list-item='true']")?.click();
    });

    const selectedSearch = element.querySelector<HTMLInputElement>("[data-testid='virtual-list-search-a-items']");

    expect(selectedSearch).not.toBeNull();
    expect(firstList?.querySelector("[data-testid='virtual-list-overflow-a-items']")?.tagName).toBe("BUTTON");

    act(() => {
      firstList?.querySelector<HTMLButtonElement>("[data-testid='virtual-list-overflow-a-items']")?.click();
    });

    expect(firstList?.getAttribute("data-comins-virtual-list-expanded")).toBe("true");

    act(() => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;

      valueSetter?.call(selectedSearch, "9999");
      selectedSearch?.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
      selectedSearch?.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(firstList?.querySelectorAll("[data-comins-virtual-list-item='true']").length).toBeLessThan(30);
    expect(firstList?.textContent).toContain("Large item 9999");
    expect(searchFilter).toHaveBeenCalledWith(
      expect.objectContaining({
        item: expect.objectContaining({ value: "large-1" }),
        itemIndex: 0,
        value: "9999",
      }),
    );
    expect(searchFilter.mock.calls[0]?.[0]).not.toHaveProperty("column");
    expect(searchFilter.mock.calls[0]?.[0]).not.toHaveProperty("row");

    const secondItem = element.querySelector<HTMLButtonElement>(
      "[data-testid='virtual-list-b-items'] [data-comins-virtual-list-item='true']",
    );

    act(() => {
      secondItem?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, ctrlKey: true }));
    });

    expect(element.querySelector("[data-testid='row-a']")?.getAttribute("data-selected-row")).toBe("true");
    expect(element.querySelector("[data-testid='row-b']")?.getAttribute("data-selected-row")).toBe("true");
    expect(element.querySelector("[data-testid='virtual-list-search-a-items']")).toBeNull();
    expect(firstList?.querySelectorAll("[data-comins-virtual-list-item='true']")).toHaveLength(5);
    expect(firstList?.querySelector("[data-testid='virtual-list-overflow-a-items']")?.tagName).toBe("BUTTON");
  });
});
