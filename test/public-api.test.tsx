import { describe, expect, it } from "vitest";
import { KmsfDataTable, kmsfDataTablePackage } from "../src";

describe("@kmsf/data-table public API", () => {
  it("exports the package marker and table component", () => {
    expect(kmsfDataTablePackage).toBe("@kmsf/data-table");
    expect(KmsfDataTable).toBeTruthy();
  });

  it("removes legacy row input and legacy callback props from the TypeScript surface", () => {
    const columns = [{ field: "name", label: "Name" }];
    const data = [{ id: "a", name: "Alpha" }];

    const removedPropAssertions = [
      // @ts-expect-error rows was removed in the API redesign.
      <KmsfDataTable columns={columns} rows={data} />,
      // @ts-expect-error defaultRows was removed in the API redesign.
      <KmsfDataTable columns={columns} defaultRows={data} data={data} />,
      // @ts-expect-error defaultData was removed in the API redesign.
      <KmsfDataTable columns={columns} defaultData={data} data={data} />,
      // @ts-expect-error onDataChange was renamed to onChangeData.
      <KmsfDataTable columns={columns} data={data} onDataChange={() => undefined} />,
    ];

    expect(removedPropAssertions).toHaveLength(4);
  });

  it("accepts cell and header renderer component column API", () => {
    const columns = [
      {
        field: "name",
        label: "Name",
        header: {
          renderer: ({ column }) => <span>{column.label}</span>,
          components: [
            {
              direction: "left" as const,
              id: "header-button",
              type: "button" as const,
              props: ({ column }) => ({ children: column.label }),
              onClick: ({ column }) => column.id,
            },
            {
              direction: "right" as const,
              id: "header-menu",
              type: "menu" as const,
              items: [{ label: "정보", value: "info" }],
              onBeforeChange: ({ open }) => open,
              onOpenChange: ({ open }) => open,
              onSelect: ({ value }) => value,
            },
          ],
        },
        cell: {
          format: ({ value }) => String(value).toUpperCase(),
          tooltip: ({ value }) => `value:${String(value)}`,
          props: ({ row }) => ({ className: row.selected ? "selected" : "normal" }),
          components: [
            {
              direction: "right" as const,
              id: "cell-button",
              type: "button" as const,
              props: ({ value }) => ({ children: String(value) }),
              onClick: ({ row, column, value }) => `${row.id}:${column.id}:${String(value)}`,
            },
          ],
          renderer: ({ value }) => <strong>{String(value)}</strong>,
        },
      },
    ];
    const data = [{ id: "a", name: "Alpha" }];

    expect(<KmsfDataTable columns={columns} data={data} getRowId={(row) => row.id} />).toBeTruthy();
  });

  it("rejects removed root-level format and props column API", () => {
    const data = [{ id: "a", name: "Alpha" }];
    const removed = [
      <KmsfDataTable
        columns={[
          {
            field: "name",
            label: "Name",
            // @ts-expect-error root-level format was replaced by cell.format.
            format: ({ value }) => String(value),
          },
        ]}
        data={data}
      />,
      <KmsfDataTable
        columns={[
          {
            field: "name",
            label: "Name",
            // @ts-expect-error root-level props was replaced by cell.props.
            props: { className: "legacy" },
          },
        ]}
        data={data}
      />,
      <KmsfDataTable
        columns={[
          {
            field: "name",
            label: "Name",
            header: {
              // @ts-expect-error header.component was replaced by header.components.
              component: { type: "button" as const },
            },
          },
        ]}
        data={data}
      />,
      <KmsfDataTable
        columns={[
          {
            field: "name",
            label: "Name",
            cell: {
              // @ts-expect-error cell.component was replaced by cell.components.
              component: { type: "button" as const },
            },
          },
        ]}
        data={data}
      />,
      <KmsfDataTable
        columns={[
          {
            field: "name",
            label: "Name",
            cell: {
              components: [
                {
                  // @ts-expect-error menu is Header-only.
                  type: "menu" as const,
                  items: [{ label: "정보", value: "info" }],
                },
              ],
            },
          },
        ]}
        data={data}
      />,
    ];

    expect(removed).toHaveLength(5);
  });
});
