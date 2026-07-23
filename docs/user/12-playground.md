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
- `/examples/component`
- `/examples/row`
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
