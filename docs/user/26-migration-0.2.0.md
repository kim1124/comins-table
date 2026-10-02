# Migrating to 0.2.0 (unreleased)

[English guides](README.md) · [한국어](../ko/26-migration-0.2.0.md) · [Core State](03-core-state.md)

This guide describes the source prepared for 0.2.0. The package version is 0.2.0, but publication is pending separate approval. Do not assume installing the published 0.1.x package provides the neutral Core contract below.

## Choose the contract owning your state

| Usage | Import | Contract |
| --- | --- | --- |
| React Table, JSX labels, renderers, themes, React state helpers | `comins-table` | Existing React contract |
| Clipboard or selection applied to React state | `comins-table/clipboard`, `comins-table/selection` | Same React state as the root |
| Framework-neutral calculation and data policies | `comins-table/core` | Neutral state; string labels; no theme or renderer |
| Table styles | `comins-table/styles.css` | Unchanged CSS entry point |

Helpers can share names without sharing state contracts. Create state and apply helpers from the matching entry point. Internal `src/core`, `src/browser`, and `src/react` paths are not supported package imports; there is no public `/browser` entry point.

## Existing React applications

If you already import React helpers and types from the root, keep doing so. If you imported them from `/core`, move those imports to `comins-table`. Keep JSX labels, `cell.props` guards, `cell.renderer`, formatters, and themes unchanged. Do not move React guards out of `cell.props` as part of this migration.

<!-- comins-doc-example: fragment -->
```tsx
import { createCominsTableState } from "comins-table";
import { pasteCominsText } from "comins-table/clipboard";
import { selectCell } from "comins-table/selection";

const state = createCominsTableState({
  rows: [{ id: "a", score: 10 }], getRowId: row => row.id,
  columns: [{ field: "score", label: <strong>Score</strong>, cell: {
    props: ({ row }) => ({ pasteable: row.data.score >= 0 }),
    parseClipboard: ({ text }) => Number(text),
  } }],
});
const selected = selectCell(state, { rowId: "a", columnId: "score" });
const edited = pasteCominsText(selected, { rowId: "a", columnId: "score" }, "42");
```

`edited.rows[0].score` is 42; the original row remains 10. The JSX label and theme remain part of the React state. Keep passing application-owned arrays through `data`, and use `onChangeData` to synchronize edits. Helpers return state; they neither set your React state nor invoke the Table's change callbacks for you. Existing local-versus-controlled Row behavior is unchanged.

React-only exports, including `CominsTableCellConfig`, `CominsTableTheme`, `formatCominsCellValue`, `getCominsCellClassName`, `getCominsCellStyle`, and `setCominsTableTheme`, belong to the root, not `/core`. Column, state, and payload types with the same names have different React and neutral contracts. Import the type from the same contract as its helper rather than suppressing a mismatch with a cast.

## Neutral Core consumers

Use `/core` for both state creation and operations. Column and Group labels are strings. Cell data policies are directly on `cell`: `disabled`, `copyable`, `pasteable`, `parseClipboard`, and `validateFill`. React props, JSX renderers, CSS styles, themes, DOM events, and `AbortSignal` do not belong in this model.

<!-- comins-doc-example: fragment -->
```ts
import { createCominsTableState, pasteCominsText, queryCominsRows } from "comins-table/core";

const state = createCominsTableState({
  rows: [{ id: "a", score: 10 }], getRowId: row => row.id,
  columns: [{ field: "score", label: "Score", cell: {
    pasteable: ({ row }) => row.data.score >= 0,
    parseClipboard: ({ text }) => Number(text),
  } }],
});
const edited = pasteCominsText(state, { rowId: "a", columnId: "score" }, "42");
const rows = queryCominsRows(edited); // [{ id: "a", score: 42 }]
```

The application decides where to store the result. Clipboard helpers calculate data changes; OS clipboard I/O remains a browser/application responsibility. There is no public automatic React↔Core state conversion API. If an application needs both, share its row data and explicitly define each column contract; do not pass neutral state to the React clipboard/selection subpaths.

## What this release does not add

- React and React DOM remain package peer dependencies (`>=18.0.0 <20.0.0`). React-free `/core` declarations and runtime do not mean the single npm package has no React installation peers.
- The React Table remains client-only. DOM-free Core is not an SSR support guarantee.
- Vue 3 support is planned for a later version; this branch does not provide a Vue adapter.
- Existing mode combinations, clipboard option ordering, ID types, and callback order are preserved. Core extraction does not add general cell Arrow/Home/End navigation or new mode combinations.

## Migration checklist

1. Locate imports from `comins-table/core`; move React-state helpers and React-only types to the root.
2. Keep root `/clipboard` and `/selection` operations on React state; keep neutral operations entirely on `/core`.
3. For a deliberate neutral consumer, use string labels and direct cell data policies; remove React rendering metadata from that model.
4. Run strict type checking and your editing, selection, sorting/filtering/grouping, and callback regressions. Use browser tests for your actual UI integration.
5. Verify the exact release tarball; source tests alone do not prove packaged declarations or CSS resolution.

The repository's package fixtures compile strict packed types, execute root/subpath helpers, mount the packed Table in jsdom, and build a browser JS/CSS consumer for React 18 and 19. The same artifact is also checked by the React-free Core consumer. The release workflow runs this check against its canonical artifact before staging. For local diagnostics, pass an existing trusted tarball:

```bash
node test/public-package-consumer.mjs /absolute/path/to/comins-table-0.2.0.tgz
```

This trusted-local-artifact test installs peers only in temporary directories and requires registry access. It is not a sandbox for untrusted packages. jsdom mount and a browser bundle are not cross-browser, layout, SSR, or release certification. See [the React consumer fixture](../../test/fixtures/react-public-consumer/consumer.tsx) and [Core consumer fixture](../../test/fixtures/core-public-consumer/consumer.ts) for executable type coverage.
