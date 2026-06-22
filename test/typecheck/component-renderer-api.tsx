import type { KmsfDataTableColumn } from "../../src";

type TypecheckRow = {
  id: string;
  items?: Array<{ label: string; value: string }>;
  name: string;
};

const validRendererColumns = [
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
          items: [
            { label: "정보", value: "info" },
            { type: "divider" as const },
            { label: "도움말", type: "label" as const },
          ],
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
          align: "center" as const,
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
] satisfies Array<KmsfDataTableColumn<TypecheckRow>>;

const removedSingleComponentColumns = [
  {
    field: "name",
    label: "Name",
    header: {
      // @ts-expect-error header.component was replaced by header.components.
      component: {
        type: "button" as const,
      },
    },
    cell: {
      // @ts-expect-error cell.component was replaced by cell.components.
      component: {
        type: "button" as const,
      },
    },
  },
] satisfies Array<KmsfDataTableColumn<TypecheckRow>>;

const cellMenuColumns = [
  {
    field: "name",
    label: "Name",
    cell: {
      components: [
        {
          // @ts-expect-error menu is a Header-only component.
          type: "menu" as const,
          items: [{ label: "정보", value: "info" }],
        },
      ],
    },
  },
] satisfies Array<KmsfDataTableColumn<TypecheckRow>>;

const validVirtualListColumns = [
  {
    field: "items",
    label: "Items",
    cell: {
      components: [
        {
          type: "virtual-list" as const,
          items: ({ row }) => row.data.items ?? [],
          props: {
            itemHeight: 28,
            limit: 10,
            more: true,
            searchable: true,
          },
          searchFilter: ({ item, itemIndex, value }) =>
            `${itemIndex}:${String(item.label)}:${String(value)}`.includes("a"),
          onClickItem: ({ item, itemIndex, value }) => `${itemIndex}:${String(item.value)}:${String(value)}`,
          onContextMenuItem: ({ event, item }) => {
            event.preventDefault();
            return item.value;
          },
        },
      ],
    },
  },
] satisfies Array<KmsfDataTableColumn<TypecheckRow>>;

const invalidVirtualListPayloadColumns = [
  {
    field: "items",
    label: "Items",
    cell: {
      components: [
        {
          type: "virtual-list" as const,
          items: ({ row }) => row.data.items ?? [],
          searchFilter: (payload) => {
            // @ts-expect-error searchFilter payload is intentionally limited to item, itemIndex, and value.
            return payload.column.id === "items";
          },
        },
      ],
    },
  },
] satisfies Array<KmsfDataTableColumn<TypecheckRow>>;

const headerVirtualListColumns = [
  {
    field: "items",
    label: "Items",
    header: {
      components: [
        {
          // @ts-expect-error virtual-list is a Cell-only component.
          type: "virtual-list" as const,
          items: [],
        },
      ],
    },
  },
] satisfies Array<KmsfDataTableColumn<TypecheckRow>>;

const removedFormatColumns = [
  {
    field: "name",
    label: "Name",
    // @ts-expect-error root-level format was replaced by cell.format.
    format: ({ value }) => String(value),
  },
] satisfies Array<KmsfDataTableColumn<TypecheckRow>>;

const removedPropsColumns = [
  {
    field: "name",
    label: "Name",
    // @ts-expect-error root-level props was replaced by cell.props.
    props: { className: "legacy" },
  },
] satisfies Array<KmsfDataTableColumn<TypecheckRow>>;

void validRendererColumns;
void removedSingleComponentColumns;
void cellMenuColumns;
void validVirtualListColumns;
void invalidVirtualListPayloadColumns;
void headerVirtualListColumns;
void removedFormatColumns;
void removedPropsColumns;
