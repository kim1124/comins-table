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
- `/selection/cell-range`

Route changes unmount the previous page and example subtree. The playground is meant to demonstrate implemented APIs, not roadmap-only features.

The `/examples/header` route includes an explicit Multi-column Sort sample. Use a normal Header click or `Enter`/`Space` for single sorting, and hold `Shift` with the same input to add or update ordered rules while inspecting the live `CominsSortModel` output.

The `/examples/selection-clipboard` route demonstrates controlled React Rows, visible `onChangeSelection` state, Row/Cell/Range selection, Ctrl/Cmd+C, Ctrl/Cmd+V, and per-Column clipboard guards.

## Example data and state policy

- General examples use deterministic 30 Row data: Basic, CRUD, Header, Header Group, Cell, Components, Row, Context Menu, Selection/Clipboard, Export, and Ref API.
- Purpose-specific fixtures retain their own size, including the six-Row multi-sort sample and pagination, lazy-load, infinite-scroll, Row Expand, and Tree scenarios.
- Loading maps the same remote users API as Infinite Scroll. Initial loading starts with 0 Rows and skeletons, ready/refetch use 30 mapped Rows, refetch retains them under an overlay, and Empty maps an out-of-range response.
- CRUD provides add, update, delete, and reset. The ambiguous Owner-only filtering control is not part of the example.
- Header Group examples combine child Column MultiSelect selection with parent Group visibility Checkboxes. Disabling a parent preserves the selected children for restoration.
- The 960px tall Row Detail stays semantic content inside a 480px Table frame. The Table body owns scrolling so following owner Rows remain reachable.
- Basic, Style, Component, and Renderer Tree examples start expanded and support fold/re-expand through controlled `onChangeData`; only the ref-control example starts folded.
