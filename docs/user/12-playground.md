# Playground

Comins Table is maintained as an independent repository. Run the local playground from this repository root; an `npm --workspace` prefix is not required.

```bash
npm run dev
```

The playground starts at `/docs/getting-started`.

Implemented routes include:

- `/examples/crud`
- `/examples/size`
- `/examples/theme`
- `/examples/loading`
- `/examples/header`
- `/examples/column-groups`
- `/examples/cell`
- `/examples/selection-clipboard`
- `/examples/component`
- `/examples/row`
- `/examples/row-expand`
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
- Loading `ready` and `refetch` retain 30 Row data. Initial loading and Empty use 0 Row data; initial loading renders skeleton Rows and refetch renders an overlay over the retained data.
- CRUD provides add, update, delete, and reset. The ambiguous Owner-only filtering control is not part of the example.
- Header Group examples combine child Column MultiSelect selection with parent Group visibility Checkboxes. Disabling a parent preserves the selected children for restoration.
- The 960px tall Row Detail stays semantic content inside a 480px Table frame. The Table body owns scrolling so following owner Rows remain reachable.
- Basic, Style, Component, and Renderer Tree examples start expanded and support fold/re-expand through controlled `onChangeData`; only the ref-control example starts folded.
