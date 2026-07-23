import { describe, expect, it } from "vitest";
import {
  CominsTable,
  cominsTablePackage,
  type CominsSortModel,
  type CominsTreeNode,
} from "../src";

describe("comins-table public API", () => {
  it("exports the package marker and table component", () => {
    expect(cominsTablePackage).toBe("comins-table");
    expect(CominsTable).toBeTruthy();
  });

  it("removes legacy row input and legacy callback props from the TypeScript surface", () => {
    const columns = [{ field: "name", label: "Name" }];
    const data = [{ id: "a", name: "Alpha" }];

    const removedPropAssertions = [
      // @ts-expect-error rows was removed in the API redesign.
      <CominsTable columns={columns} rows={data} />,
      // @ts-expect-error defaultRows was removed in the API redesign.
      <CominsTable columns={columns} defaultRows={data} data={data} />,
      // @ts-expect-error defaultData was removed in the API redesign.
      <CominsTable columns={columns} defaultData={data} data={data} />,
      // @ts-expect-error onDataChange was renamed to onChangeData.
      <CominsTable columns={columns} data={data} onDataChange={() => undefined} />,
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

    expect(<CominsTable columns={columns} data={data} getRowId={(row) => row.id} />).toBeTruthy();
  });

  it("accepts loading and empty state props", () => {
    const columns = [{ field: "name", label: "Name" }];
    const data = [{ id: "a", name: "Alpha" }];

    expect(
      <CominsTable
        columns={columns}
        data={data}
        emptyComponent={<span>데이터가 없습니다.</span>}
        loading
        loadingComponent={<span>불러오는 중입니다.</span>}
        persistHeaderWhenEmpty
        skeletonRowCount={3}
      />,
    ).toBeTruthy();
  });

  it("accepts controlled infinite scroll props", () => {
    const columns = [{ field: "name", label: "Name" }];
    const data = [{ id: "a", name: "Alpha" }];

    expect(
      <CominsTable
        columns={columns}
        data={data}
        getRowId={(row) => row.id}
        hasMoreRows
        infiniteScroll
        infiniteScrollThreshold={160}
        loadingMore={false}
        onLoadMore={() => undefined}
      />,
    ).toBeTruthy();
  });

  it("accepts append-mode lazy load props", () => {
    const columns = [{ field: "name", label: "Name" }];
    const data = [{ id: "a", name: "Alpha" }];

    expect(
      <CominsTable
        columns={columns}
        data={data}
        getRowId={(row) => row.id}
        lazyLoad
        lazyLoadBatchSize={30}
        lazyLoadMode="append"
        lazyLoadThreshold={120}
        onLazyLoad={async ({ limit, offset, reason, signal }) => {
          expect(limit).toBe(30);
          expect(offset).toBeGreaterThanOrEqual(0);
          expect(["initial", "scroll", "refresh"]).toContain(reason);
          expect(signal).toBeInstanceOf(AbortSignal);

          return { rows: data, total: 1 };
        }}
      />,
    ).toBeTruthy();
  });

  it("accepts controlled Tree Grid data while preserving item columns", () => {
    const data: CominsTreeNode<{ age: number; id: string; name: string }>[] = [
      {
        children: [{ item: { age: 20, id: "child", name: "Child" } }],
        item: { age: 40, id: "root", name: "Root" },
      },
    ];

    expect(
      <CominsTable
        columns={[{ field: "name", label: "Name", sort: true }]}
        data={data}
        getRowId={(item) => item.id}
        onChangeData={() => undefined}
        tree
      />,
    ).toBeTruthy();
  });

  it("accepts the additive multi-column sort API for flat and Tree tables", () => {
    const sortModel: CominsSortModel = [
      { columnId: "name", direction: "asc" },
      { columnId: "age", direction: "desc" },
    ];
    const rows = [{ age: 20, id: "a", name: "Alpha" }];
    const treeRows: CominsTreeNode<(typeof rows)[number]>[] = [{ item: rows[0]! }];

    expect(
      <CominsTable
        columns={[
          { field: "name", label: "Name", sort: true },
          { field: "age", label: "Age", sort: true },
        ]}
        data={rows}
        multiSort
        onChangeSortModel={(nextModel) => expect(nextModel).toEqual(sortModel)}
      />,
    ).toBeTruthy();
    expect(
      <CominsTable
        columns={[{ field: "name", label: "Name", sort: true }]}
        data={treeRows}
        getRowId={(item) => item.id}
        multiSort
        onChangeSortModel={() => undefined}
        tree
      />,
    ).toBeTruthy();
  });

  it("rejects flat-only pagination, remote loading, and row dragging in Tree Grid", () => {
    const data: CominsTreeNode<{ id: string; name: string }>[] = [{ item: { id: "root", name: "Root" } }];
    const columns = [{ field: "name", label: "Name" }];

    const rejectedTreeProps = [
      <CominsTable
        columns={columns}
        data={data}
        getRowId={(item) => item.id}
        // @ts-expect-error Tree Grid V1 does not support pagination.
        pagination={{ pageIndex: 0, pageSize: 10 }}
        tree
      />,
      <CominsTable
        columns={columns}
        data={data}
        getRowId={(item) => item.id}
        // @ts-expect-error Tree Grid V1 does not support infinite scroll.
        infiniteScroll
        tree
      />,
      <CominsTable
        columns={columns}
        data={data}
        getRowId={(item) => item.id}
        // @ts-expect-error Tree Grid V1 does not support lazy load.
        lazyLoad
        tree
      />,
      <CominsTable
        columns={columns}
        data={data}
        getRowId={(item) => item.id}
        // @ts-expect-error Tree Grid V1 does not support lazy callbacks.
        onLazyLoad={async () => ({ rows: [], total: 0 })}
        tree
      />,
      <CominsTable
        columns={columns}
        data={data}
        getRowId={(item) => item.id}
        // @ts-expect-error Tree Grid V1 does not support infinite-scroll callbacks.
        onLoadMore={() => undefined}
        tree
      />,
      <CominsTable
        columns={columns}
        data={data}
        getRowId={(item) => item.id}
        // @ts-expect-error Tree Grid V1 does not support remote-load state props.
        hasMoreRows
        tree
      />,
      <CominsTable
        columns={columns}
        data={data}
        getRowId={(item) => item.id}
        rowProps={{
          // @ts-expect-error Tree Grid V1 does not support row drag.
          draggable: true,
        }}
        tree
      />,
    ];

    expect(rejectedTreeProps).toHaveLength(7);
  });

  it("rejects removed root-level format and props column API", () => {
    const data = [{ id: "a", name: "Alpha" }];
    const removed = [
      <CominsTable
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
      <CominsTable
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
      <CominsTable
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
      <CominsTable
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
      <CominsTable
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
