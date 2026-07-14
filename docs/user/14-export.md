# Export

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
