# Cell

Cells support formatting, custom rendering, event callbacks, props, and component slots.

```tsx
const columns: Array<CominsTableColumn<PersonRow>> = [
  {
    field: "name",
    label: "Name",
    cell: {
      format: ({ value }) => String(value).toUpperCase(),
      props: ({ row }) => ({ className: row.selected ? "selected" : "normal" }),
      renderer: ({ value }) => <strong>{String(value)}</strong>,
    },
  },
];
```

Use `onClickCell` for click payloads and `onContextMenuCell` for context menu workflows.

Clipboard guards are configured through column `props.copyable`, `props.pasteable`, and disabled state callbacks.
