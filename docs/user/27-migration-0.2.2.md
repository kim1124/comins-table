# Rendering API migration for 0.2.2

[Documentation](../README.md) · [English guides](README.md) · [한국어](../ko/27-migration-0.2.2.md) · [Cell Playground](http://127.0.0.1:4002/examples/cell) · [Changelog](../../CHANGELOG.md)

This guide describes the 0.2.2 changes. Earlier 0.2.1 installations do not support the new paths. UI customization uses `render` for both elements and components. These are adapter options; `/core` remains framework-neutral.

| Legacy property | Standard property |
| --- | --- |
| `column.cell.renderer` | `column.cell.render` |
| `column.header.renderer` | `column.header.render` |
| `renderRowDetail` | `rowDetail.render` |
| `rowGrouping.getGroupLabel` | `rowGrouping.label.render` |
| `rowGrouping.renderGroupContent` | `rowGrouping.content.render` |
| `treeSlots.leading/content/trailing` callback | Each slot's `{ render }` object |
| `tableTransfer.rejectionFeedback.renderTooltip` | `tableTransfer.rejectionFeedback.tooltip.render` |
| `loadingComponent` | `loadingContent.render: () => content` |
| `emptyComponent` | `emptyContent.render: () => content` |

Legacy properties keep their behavior throughout 0.x; removal targets 1.0.0, not 0.3.0, with no removal date set. Callback arguments remain unchanged, including the direct group argument to the label callback. Tree slots support mixed legacy functions and standard objects.

A defined standard callback wins; absent/undefined callbacks use the legacy path. A standard callback returning `undefined` uses built-in content; `null`, `false`, and empty strings empty the content; `0` is displayed. Once a standard callback is selected, the legacy callback is never called. Errors propagate through the existing React error boundary.

Legacy return behavior is preserved: cell/header callbacks returning undefined remain empty, while group labels and transfer feedback keep nullish fallback. When migrating, use undefined for defaults and null for hiding content.

`format`, `aggregate`, static `label`, built-in `components`, classes and styles keep their roles. Summary adds `summary.columns[id].render` after aggregate → format, with both `value` and `formattedValue`. The Table owns outer td/tr/th, Tree indentation/disclosure, detail heights, loading spinners and transfer behavior. Existing Tree/Viewport restrictions remain.

## React example

<!-- comins-doc-example: compile=render-api -->
```tsx
import { CominsTable, type CominsTableColumn } from "comins-table";
type Row = { id: string; score: number };
const rows: Row[] = [{ id: "a", score: 10 }];
const columns: CominsTableColumn<Row>[] = [{ field: "score", label: "Score",
  header: { render: ({ column }) => <strong>{column.label}</strong> },
  cell: { render: ({ value }) => <strong>{String(value)}</strong>,
    tooltip: { render: ({ row }) => <span>Score: <b>{row.data.score}</b></span> } },
}];
export function RenderingExample() {
  return <CominsTable columns={columns} data={rows} getRowId={row => row.id}
    expandedRowIds={["a"]} rowDetail={{ render: ({ row }) => <span>{row.data.score}</span> }}
    loadingContent={{ render: () => <span>Loading</span> }} emptyContent={{ render: () => <span>No rows</span> }}
    summary={{ columns: { score: { aggregate: "sum", format: ({ value }) => `Total ${value}`,
      render: ({ formattedValue }) => <strong>{formattedValue}</strong> } } }} />;
}
```

Render callbacks are ordinary functions. Return `<StatusBadge />` so React runs the component; do not directly call component functions or Hooks inside a callback. Hooks belong inside returned components. Other framework templates follow adapter-native lifecycles instead of a forced ReactNode type; this is not a declaration that those adapters have shipped.

## Custom cell tooltip

`cell.tooltip: string` and legacy callbacks preserve native string title behavior. Legacy non-string results remain undisplayed. Use `cell.tooltip: { render }` for badges, icons and components. This is an extension, not a reinterpretation of old callbacks.

Custom tooltips support hover, cell focus, Escape and pointer movement onto the tooltip. Scroll, resize, cell removal/reuse and unmount clear the tooltip and aria-describedby relationship. They use role=tooltip and are informational; focusable buttons/forms belong in a separate application popover. Native title and custom tooltips are not displayed together.

Value-list filter customization and XLSX files are described below. Official Vue Table UI support remains planned for 0.3.0.

## New value list filters

[Value list guide](21-column-filtering.md): `filter.mode: "values"`, `operator: "in"` and trigger/option/panel.render are new in 0.2.2; existing condition filters and names remain unchanged.

## XLSX files

0.2.2 adds `comins-table/xlsx` for typed ordinary-row import/export. Engines install with the package; existing root/Core APIs remain independent. See [file APIs](14-export.md#xlsx-022-candidate) for cached formula, date, sheet, budget and Worker contracts.
