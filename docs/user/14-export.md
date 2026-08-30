# Export

[Documentation](../README.md) · [English guides](README.md) · [한국어](../ko/14-export.md) · [Playground](http://127.0.0.1:4002/examples/export)

Export helpers are pure functions. They do not read table UI state automatically.

```ts
import {
  exportCominsRowsToCsv,
  exportCominsRowsToJson,
} from "comins-table/core";

const csv = exportCominsRowsToCsv({ columns: exportColumns, rows });
const json = exportCominsRowsToJson({ columns: exportColumns, rows });
```

Pass the exact rows and export columns you want to export. This keeps CSV and JSON output independent from pagination, filtering, or selection UI unless your application chooses to pass those rows.
