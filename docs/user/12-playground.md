# Playground

[Documentation](../README.md) · [English guides](README.md) · [한국어](../ko/12-playground.md) · [Open Playground](http://127.0.0.1:4002/docs/getting-started)

Comins Table is maintained as an independent repository. Run the local playground from this repository root; an `npm --workspace` prefix is not required.

```bash
npm run dev
```

The playground starts at `/docs/getting-started`.

## Language switching

The Playground defaults to Korean (`"ko"`) and supports Korean and English (`"en"`). Use the `한 / EN` segmented toggle immediately to the left of the search input. Sidebar group and route names remain English in both locales. Switching the language updates article copy, search metadata, code sample titles, feature metadata, controls, Alerts, and loading or empty messages without changing the URL path or remounting the current feature.

The selected locale is stored in `localStorage` under `comins-table-playground-locale` and restored on reload and same-origin route navigation. Missing, inaccessible, or invalid storage values use `"ko"`. The active locale is synchronized to `<html lang>`.

Routes do not use locale prefixes. API and prop names, code sample source, JSON keys, `data-testid` values, and fixture identifiers remain unchanged in both languages.

Implemented routes include:

- `/examples/crud`
- `/examples/size`
- `/examples/theme`
- `/examples/loading`
- `/examples/header`
- `/examples/column-groups`
- `/examples/column-pinning`
- `/examples/cell`
- `/examples/selection-clipboard`
- `/examples/fill-handle`
- `/examples/component`
- `/examples/row`
- `/examples/row-expand`
- `/examples/row-grouping`
- `/examples/cross-table-drag`
- `/examples/column-filtering`
- `/examples/summary-row`
- `/examples/tree-grid`
- `/examples/context-menu`
- `/examples/export`
- `/api/props`
- `/api/ref`
- `/performance/pagination`
- `/performance/infinite-scroll`
- `/performance/lazy-load`
- `/performance/virtualization`
- `/performance/auto-row-height`
- `/performance/viewport-datasource`
- `/selection/cell-range`

Route changes unmount the previous page and example subtree. The playground is meant to demonstrate implemented APIs, not roadmap-only features.

The `/examples/header` route includes an explicit Multi-column Sort sample. Use a normal Header click or `Enter`/`Space` for single sorting, and hold `Shift` with the same input to add or update ordered rules while inspecting the live `CominsSortModel` output.

The `/examples/selection-clipboard` route demonstrates independent Row/Cell/Range selection with `rowSelectionOnClick={false}`, separate selection getters, explicit Cell/Row copy actions, and visible `onChangeSelection` state. It enables `clipboard` for OS copy; Ctrl/Cmd+V uses the internal buffer, respecting per-Column guards.

## Example data and state policy

- Text values align left, numeric values right, and controls, Boolean values, and fixed-format dates center. Component labels use stable Row data so dragging visibly moves their values.
- In Column Filtering, Empty demonstrates preservation of an empty Group; Row Drag is disabled there. In Rows, Data 2 in Basics blocks only dragging, while Data 4 in Locked Row blocks selection, dragging, events, and keyboard focus.
- Context Create inserts a new Row at the top; Delete removes all selected Rows. View and Update report menu events and payloads.
- Paste & Fill includes a two-value TSV source that preserves the third Column. A trailing tab explicitly includes an empty next Cell and clears that destination; no missing Columns are implicitly cleared.
- General examples use deterministic 30 Row data: Basic, CRUD, Header, Header Group, Cell, Components, Row, Context Menu, Selection/Clipboard, Export, and Ref API.
- Purpose-specific fixtures retain their own size, including the six-Row multi-sort sample and pagination, lazy-load, infinite-scroll, Row Expand, and Tree scenarios.
- Loading maps the same remote users API as Infinite Scroll. Initial loading starts with 0 Rows and skeletons, ready/refetch use 30 mapped Rows, refetch retains them under an overlay, and Empty maps an out-of-range response.
- CRUD provides add, update, delete, and reset. The ambiguous Owner-only filtering control is not part of the example.
- Header Group examples combine child Column MultiSelect selection with parent Group visibility toggles. Disabling a parent preserves the selected children for restoration.
- The 960px tall Row Detail stays semantic content inside a 480px Table frame. The Table body owns scrolling so following owner Rows remain reachable.
- Basic, Style, Component, and Renderer Tree examples start expanded and support fold/re-expand through controlled `onChangeData`; only the ref-control example starts folded.
- CRUD labels and editable data keys are `column1`–`column6`. A separate internal `id` preserves Row identity while all six fields can be updated. Other data Columns display their field names.
- Lazy Load simulates 1,000 Rows in batches of 100 with 250ms delay and cancellation; it is separate from the remote Loading/Infinite Scroll examples.
- Header Group siblings start with equal widths. Grouped Pinning permits moves; Row Grouping demonstrates movement restrictions with its own controls.
- Summary examples span labels up to their result Columns while respecting pin boundaries.
- The Tree drag example enables parent changes and automatic heights initially; library defaults remain opt-in.

## Option controls in 0.1.11

Boolean example options use toggle buttons: the accent state means enabled, and the outlined state means disabled. Click, Enter, or Space changes the option. Row selection, Checkbox component demos, and MultiSelect choices retain selection checkboxes.

The Auto row height example provides Long content, Narrow width, and Row Detail toggles, plus an Expanded content toggle inside the first Row renderer. Tree drag starts with parent changes and automatic height enabled. Viewport offers automatic height, slow response, and failed-request toggles; Change query resets the dataset and Retry reloads a failed range after the failure option is disabled.
