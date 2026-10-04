# Export

[Documentation](../README.md) · [English guides](README.md) · [한국어](../ko/14-export.md) · [Playground](http://127.0.0.1:4002/examples/export)

Export helpers are pure functions. They do not read table UI state automatically.

The Playground's **CSV file import and export** sample (0.2.1, unreleased) connects Core helpers to local browser files. Download the sample CSV or select a UTF-8 file up to 1 MB with `id,name,score` headers, unique nonblank IDs, nonblank names and finite numeric scores. All rows must pass validation before replacing the table data; empty files are rejected by this sample. Reset restores the sample rows. No upload to a server occurs.

The sample prefixes spreadsheet-like ID/name values with an apostrophe when downloading (formula prefixes after optional whitespace, or an initial tab/newline). Reimporting preserves this extra character. This is an application policy for the sample; Core Export does not escape formulas automatically and spreadsheet applications may interpret CSV differently.

<!-- comins-doc-example: fragment -->
```ts
import {
  exportCominsRowsToCsv,
  exportCominsRowsToJson,
} from "comins-table/core";

const csv = exportCominsRowsToCsv({ columns: exportColumns, rows });
const json = exportCominsRowsToJson({ columns: exportColumns, rows });
```

Pass the exact rows and export columns you want to export. This keeps CSV and JSON output independent from pagination, filtering, or selection UI unless your application chooses to pass those rows.

## CSV Import (0.2.1, unreleased)

`importCominsRowsFromCsv<TData>` is available from `comins-table/core` and `comins-table`. It accepts CSV text and returns ordinary application rows. It does not update a Table, create IDs, rebuild Tree/Group structures, or read files. Read a file in the application and pass its decoded text to Core.

<!-- comins-doc-example: compile=csv-import -->
```ts
import { importCominsRowsFromCsv } from "comins-table/core";

type Row = { id: string; score: number };
const rows = importCominsRowsFromCsv<Row>({
  text: 'id,score\r\n"001",42',
  mapRow: ({ cells, headers, rowIndex }) => {
    if (headers?.[0] !== "id" || headers[1] !== "score") throw new Error("Unexpected columns");
    const score = Number(cells[1]);
    if (!cells[0] || !Number.isFinite(score)) throw new Error(`Invalid row ${rowIndex + 1}`);
    return { id: cells[0], score };
  },
});
// rows: [{ id: "001", score: 42 }]
```

`CominsCsvImportOptions<TData>` requires `text` and `mapRow`. `hasHeader` defaults to `true`; use `false` to keep the first record as data. The `CominsCsvImportRow` callback payload contains readonly `cells`, readonly `headers` (or `null` without a header), and a zero-based data `rowIndex`. Values stay strings, including leading zeros, whitespace, formula text, and duplicate header names. Map by position and validate headers yourself; no field paths or object properties are inferred from untrusted headers. Treat callback inputs as read-only.

The comma delimiter and doubled-quote escaping follow the CSV conventions described in [RFC 4180](https://www.rfc-editor.org/info/rfc4180/). CRLF, LF, and CR record endings are accepted. Newlines inside quoted fields are preserved. A leading BOM is ignored, a terminal record separator adds no extra record, and actual blank records remain. Empty input or a header-only input returns `[]`. Every record must have the same field count; blank records in a multi-column file therefore fail validation.

Unclosed quotes, quotes inside unquoted fields, text after closing quotes, and inconsistent field counts throw `SyntaxError`. The complete CSV is parsed and validated before any `mapRow` call. Mapping errors propagate without returning partial rows, but the library cannot undo side effects inside your callback; keep mapping pure and apply the returned rows only after success.

`maxCharacters` defaults to `1_000_000` UTF-16 code units, including an initial BOM. `maxCells` defaults to `100_000`, including header cells. Both accept only positive safe integers and throw `RangeError` when invalid or exceeded. Increase them explicitly for trusted workloads; this is a synchronous, in-memory importer, not streaming. The importer does not evaluate formulas or sanitize text for a later spreadsheet export or HTML renderer. Existing CSV/JSON Export behavior is unchanged.

## Tree and Group metadata (0.2.1, unreleased)

The Playground's **Tree and Group export** card switches between the two source structures and CSV/JSON previews. Collapse the source table to verify that export still includes all supplied rows. Its CSV download always uses the selected structure, even while previewing JSON. The Group example includes an empty group to show that it contributes no synthetic data row.

Management columns use a double underscore prefix. `CominsExportMetadata<TData>` supplies optional `__rowId`, `__parentId`, `__depth`, and `__groupId` value getters through `CominsExportRowsOptions.metadata`. The enabled columns are appended in that fixed order, after the selected business columns. Application rows are never assigned these properties. An existing business property with the same name is untouched; exporting it with a header that collides with an enabled management column throws an error instead of overwriting a value.

`columnOrder`, `headerOverrides`, and `valueSource` still apply to business columns. Management headers remain prefixed and fixed; formatting callbacks do not change metadata. CSV applies its usual escaping and renders null parents as empty cells. JSON preserves null and numeric/string IDs. CSV cannot preserve those type distinctions; applications that need typed IDs should use JSON or their own mapping. Passing no metadata preserves existing Export behavior.

<!-- comins-doc-example: compile=structured-export -->
```ts
import {
  createCominsTreeExportOptions,
  createCominsGroupedExportOptions,
  exportCominsRowsToCsv,
  exportCominsRowsToJson,
  type CominsExportColumn,
} from "comins-table/core";

type Item = { id: string; name: string; group: string };
const parent: Item = { id: "folder", name: "Documents", group: "files" };
const child: Item = { id: "guide", name: "Guide", group: "files" };
const columns: CominsExportColumn<Item>[] = [
  { id: "name", label: "Name", value: row => row.name },
];
const tree = createCominsTreeExportOptions({
  columns,
  nodes: [{ item: parent, expand: false, children: [{ item: child }] }],
  getRowId: item => item.id,
});
const treeCsv = exportCominsRowsToCsv(tree);
// Name,__rowId,__parentId,__depth
// Documents,folder,,0
// Guide,guide,folder,1

const grouped = createCominsGroupedExportOptions({
  columns,
  rows: [parent, child],
  groups: [{ id: "files" }],
  getGroupId: group => group.id,
  getRowGroupId: item => item.group,
  getRowId: item => item.id,
});
const groupedCsv = exportCominsRowsToCsv(grouped);
// Name,__rowId,__groupId
// Documents,folder,files
// Guide,guide,files
const groupedJson = exportCominsRowsToJson(grouped);
void [treeCsv, groupedCsv, groupedJson];
```

`createCominsTreeExportOptions` accepts `CominsExportTreeOptions<TData>` and includes every supplied node in preorder, including collapsed descendants. Roots have a null `__parentId` and depth 0. Its `getRowId` index follows that complete preorder. Duplicate IDs and cycles throw. It does not use the UI's visible-row projection, which would omit collapsed nodes.

`createCominsGroupedExportOptions` accepts `CominsExportGroupedOptions<TData, TGroup>`. Rows follow the explicit `groups` order and retain input order within each group. `getRowId` and `getRowGroupId` receive the original input row index; column value/format callbacks receive the final export row index. Duplicate group/row IDs and rows referencing unknown groups throw. Empty groups add no data rows. Current grouping is one level, so `__groupId` identifies membership; there are no synthetic heading, aggregate, or report rows.

Both functions return `CominsExportRowsOptions<TData>` for the same CSV and JSON helpers. They retain the original row objects and capture the corresponding metadata when prepared. Use the returned options together without replacing/reordering `rows`, and rebuild them after data or structure changes. Sorting, filtering, pagination and selection are application decisions: pass the intended source rows/tree/groups explicitly. Import still returns ordinary rows through your mapper and does not reconstruct Tree/Group structures. No React or DOM is required.
