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

## Virtual List row selection

- A plain Item click selects only its owning Row. `Ctrl`/`Cmd` toggles that Row, and `Shift` selects the visible Row range from the previous selection anchor.
- Item `Enter` and `Space` activation follows the same Row selection rules as a click.
- More is actionable before its Row is selected. Activating More first selects the owning Row exclusively and then expands the full virtualized list.
- Search remains single-selection-only and is available only while exactly one Row is selected.
- Item and More interactions are handled inside the component and do not invoke `onClickCell` or `onClickRow`.
