# Clipboard

<!-- comins-restriction: fill-helper-no-visual-handle -->

[Documentation](../README.md) · [English guides](README.md) · [한국어](../ko/09-clipboard.md) · [Playground](http://127.0.0.1:4002/examples/selection-clipboard)

Clipboard helpers are available from the root export, `comins-table/core`, and the `comins-table/clipboard` subpath.

<!-- comins-doc-example: fragment -->
```ts
import {
  copyCominsCell,
  copyCominsCellRange,
  copyCominsRow,
  fillCominsCellRange,
  pasteCominsCell,
  pasteCominsCellRange,
  pasteCominsRow,
} from "comins-table/clipboard";
```

`copyCominsRow` and `pasteCominsRow` work with whole rows. `copyCominsCell` and `pasteCominsCell` work with one cell. `copyCominsCellRange` and `pasteCominsCellRange` work with the current selected range.

`fillCominsCellRange` is a core helper for Excel-like fill behavior. Version 0.1.10 does not include a drag-handle UI for that helper.

## React Table Keyboard Flow

Keep Rows in React state and pass `onChangeData={setRows}` so Ctrl/Cmd+C and Ctrl/Cmd+V update controlled data. Column-level `cell.props.copyable` and `cell.props.pasteable` guards exclude protected values.

The runnable [`/examples/selection-clipboard`](http://127.0.0.1:4002/examples/selection-clipboard) route combines the clipboard flow with `cellSelection` and visible `onChangeSelection` output.

Click a Cell to focus it, copy with Ctrl/Cmd+C, then click the destination Cell and paste with Ctrl/Cmd+V. With `cellSelection`, dragging a range keeps keyboard focus on the starting Cell so the selected range can be copied immediately. Clicking an interactive element inside `cell.renderer` preserves that element's native focus. By default, the Table keyboard flow uses an internal copy buffer. Enable `clipboard` to also copy to the operating-system clipboard with the selection policy below.

## Selection copy and OS clipboard

Set `clipboard` on `CominsTable` to enable the native copy event. The default is `false` for compatibility with the internal buffer flow. With `clipboard`, keyboard copy and `ref.current.copySelection()` use the same priority: multiple selected Cells, then selected Rows, then one selected Cell. Five selected Rows plus three selected Cells copy the three Cells without changing the five selected Rows. Five Rows plus one Cell copy the Rows.

`copySelection(target?: CominsCopyTarget)` accepts `"auto"`, `"cells"`, or `"rows"`. Call it from a user-initiated button or context menu and handle rejected clipboard access. This Ref method writes to the OS clipboard even when the `clipboard` prop is false; the prop controls keyboard copy. It returns `Promise<string | null>` with the written text, returns `null` for no copyable selection, and rejects if browser clipboard writing is unavailable or denied. Keyboard copy uses the native `copy` event; editable inputs keep native text copying.

| Target | Copied data |
| --- | --- |
| `"auto"` or omitted | Multiple selected Cells → selected Rows → one selected Cell |
| `"cells"` | The selected Cell set or rectangle, ignoring Row selection |
| `"rows"` | Visible Columns of selected Rows, ignoring Cell selection |

With `cellSelection`, plain click, Shift+click, and pointer range selection focus the Cell and clear page text selection so Ctrl/Cmd+C immediately copies the Table selection. Copying updates the internal paste buffer to the latest copied values. Right-clicking inside the selected Cell set or range preserves it for a context-menu copy action. Selection getters remain independent of copying; see [Selection](10-selection.md).

Values use TSV with quoted delimiters/newlines. String formula prefixes are escaped for spreadsheet pasting; numeric values and internal paste values remain raw. `copyable: false` or disabled Cells produce empty positions. Discontiguous Cells form their smallest enclosing rectangle with unselected positions empty; internal paste skips those positions. Copy uses visible Columns and projected Row order. Hidden or collapsed Rows are excluded from copy; selection getters still expose loaded selected business Rows.

Viewport copying never fetches unloaded Rows. A Cell rectangle crossing an unloaded gap is rejected; selected Row copy uses only loaded selected Rows. `CominsSelectionCopy` describes the resolved target, text, and internal matrix. OS clipboard import/paste is not added: Ctrl/Cmd+V continues using the Table's internal buffer.
