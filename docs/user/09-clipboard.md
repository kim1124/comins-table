# Clipboard

Clipboard helpers are available from the root export, `comins-table/core`, and the `comins-table/clipboard` subpath.

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

`fillCominsCellRange` is a core helper for Excel-like fill behavior. The first public release does not include a drag-handle UI for that helper.
