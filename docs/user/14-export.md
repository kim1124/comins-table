# Export

[Documentation](../README.md) · [English guides](README.md) · [한국어](../ko/14-export.md) · [Playground](http://127.0.0.1:4002/examples/export)

Export helpers are pure functions. They do not read table UI state automatically.

The Playground's **CSV file import and export** sample (0.2.1) connects Core helpers to local browser files. Download the sample CSV or select a UTF-8 file up to 1 MB with `id,name,score` headers, unique nonblank IDs, nonblank names and finite numeric scores. All rows must pass validation before replacing the table data; empty files are rejected by this sample. Reset restores the sample rows. No upload to a server occurs.

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

## CSV Import (0.2.1)

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

## Tree and Group metadata (0.2.1)

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

## XLSX (0.2.2 candidate)

`comins-table/xlsx` provides `inspectCominsXlsx`, `importCominsRowsFromXlsx` and `exportCominsRowsToXlsx`. The engines are included in installation but imported only through this entry. These APIs are implemented for the unpublished 0.2.2 candidate and are not part of the published 0.2.1 API. Import preserves string, number, boolean and null values including cached formula results. Dates use file formats; default date format 14 becomes `yyyy-mm-dd`. No formula recalculation or Tree/Group hierarchy support is provided.

<!-- comins-doc-example: compile=xlsx-files -->
```ts
import { CominsXlsxError, inspectCominsXlsx, importCominsRowsFromXlsx, exportCominsRowsToXlsx } from "comins-table/xlsx";
type Row = { id: string; score: number; active: boolean };
async function roundTrip() {
  const bytes = await exportCominsRowsToXlsx<Row>({
    rows: [{ id: "001", score: 0, active: false }],
    columns: [
      { id: "id", value: row => row.id },
      { id: "score", value: row => row.score },
      { id: "active", value: row => row.active },
    ],
  });
  const workbook = await inspectCominsXlsx({ bytes });
  try {
    return await importCominsRowsFromXlsx<Row>({
      bytes, sheetName: workbook.sheets.find(sheet => sheet.visibility === "visible")?.name,
      mapRow: ({ cells, headers }) => {
        const [id, score, active] = cells;
        if (headers?.join(",") !== "id,score,active" || typeof id !== "string" || typeof score !== "number" || typeof active !== "boolean") throw new Error("Invalid application row");
        return { id, score, active };
      },
    });
  } catch (error) {
    if (error instanceof CominsXlsxError) throw new Error(`File error: ${error.code}`);
    throw error;
  }
}
void roundTrip;
```

The functions accept `Uint8Array` (including an offset view) or `ArrayBuffer` and return Promises. `CominsXlsxImportOptions<TData>` requires `bytes` and `mapRow`; `hasHeader` defaults to true. `CominsXlsxImportRow` has readonly `cells`, readonly string `headers` or null, zero-based data `rowIndex`, and one-based `sheetRowNumber`. Headers are converted to strings; blank headers become empty strings and duplicate names are preserved. Mapping is positional; no object paths are inferred. Blank cells become null; cached empty strings, false, zero, and identifiers with leading zeros remain distinct. Dates are the exception to scalar type preservation.

`inspectCominsXlsx({ bytes, limits? })` returns `CominsXlsxWorkbookInfo` with names and visible/hidden/veryHidden states, without exposing an engine workbook or a resource handle. One visible sheet is selected automatically; multiple visible sheets require an exact, case-sensitive `sheetName`. Hidden sheets cannot be imported, while hidden rows and columns are included. No visible sheet, a missing name, any selected-sheet merge, malformed XML/ZIP, encrypted files or macro workbooks fail the operation. Other sheets' merges do not cause a selected sheet to fail. This entry supports OOXML XLSX, not XLS, XLSB, CSV renamed as XLSX or PDF.

The import rectangle starts at A1 and ends at the last actual value or formula, including empty intermediate rows/columns. Empty and header-only sheets return `[]`. Styling alone does not add trailing data rows, but exaggerated declared dimensions are still checked before engine parsing. `CominsXlsxImportLimits` defaults to `maxBytes: 10 * 1024 * 1024`, `maxUncompressedBytes: 50 * 1024 * 1024`, `maxCells: 100_000`. `maxCells` includes header and blank slots and applies to the selected sheet; byte budgets also apply to inspect. Exact limits are accepted; an over-budget file fails without truncation. Limits must be positive safe integers and can be raised explicitly for trusted workloads. Actual inflated bytes are counted across **all** entries, including unselected sheets. ZIP CRC and directory checks run before the verified container reaches the engine. XML DTDs, invalid entities and nesting deeper than 256 levels are rejected.

These limits are input budgets, not a hard heap cap. Decoded XML, metadata, normalized ZIP bytes and result rows can coexist in memory. The functions do not upload files or fetch workbook URLs; external formula references with valid cached results can still be imported. Formula text is not returned, formulas are not evaluated, and missing cached results or Excel error cells fail the complete import. The library cannot know whether stored results are current. Date results use the file's number format; regional built-in format ID 14 is fixed to `yyyy-mm-dd`. The 1900 and 1904 systems, custom time formats and the Excel phantom date `1900-02-29` are supported. ISO date cells preserve their recorded calendar/time fields without assigning a local timezone. Export Date inputs are copied into UTC fields and written with `yyyy-mm-dd hh:mm:ss.000`; no original Date is changed. Invalid dates fail.

`CominsXlsxExportOptions<TData>` accepts ordinary `rows`, existing export `columns`, `columnOrder`, `headerOverrides`, `valueSource`, optional `sheetName` (default Sheet1) and `maxCells` (default 100,000). Raw values preserve types; formatted mode uses the application's `format` getter. Strings beginning with `=`, `+`, `-`, or `@` are explicit text cells, with no formula or added apostrophe. Null/undefined become blank cells; finite numbers, booleans, strings and valid Date inputs are supported. Objects, arrays, BigInt, non-finite numbers and invalid Date inputs fail. Strings are limited to 32,767 UTF-16 code units; supplementary characters use two units. Excel's 1,048,576-row/16,384-column limits include the header. Invalid sheet names are rejected rather than rewritten. Export creates one sheet and does not preserve arbitrary cell styles. `metadata`, `nodes` and `groups` options are rejected at runtime; `metadata?: never` also rejects compatible metadata variables in TypeScript. Business columns named with `__` remain ordinary columns; this API does not generate management metadata or rebuild Tree/Group structures. Existing CSV/JSON helpers are unchanged.

`CominsXlsxError` carries `CominsXlsxErrorCode` and optional `sheetName`, `cellAddress`, `rowNumber`, `sheetNames`, without source cell values or engine diagnostics in the message. Codes are INVALID_OPTIONS, UNSUPPORTED_FILE, INVALID_WORKBOOK, LIMIT_EXCEEDED, SHEET_SELECTION_REQUIRED, SHEET_NOT_FOUND, MERGED_CELLS, MISSING_FORMULA_RESULT, CELL_ERROR and UNSUPPORTED_VALUE. Full file and cell validation completes before `mapRow` is invoked. User getter and mapper exceptions propagate unchanged; no partial row array is returned. Side effects inside callbacks cannot be rolled back. Keep callbacks pure and replace application data only after success.

The [Export Playground](/examples/export) offers an independent Excel file card with a downloadable cached-formula/date fixture, visible-sheet selection, cancel/retry and a maximum 100-row preview. It uses a dedicated module Worker for inspect/import/export; main-thread callbacks are never transferred. Application validation checks typed id/name/score/active/date rows before replacement, and empty imports preserve the prior sample data. Cancellation, file replacement and unmount terminate pending Workers and ignore late results/downloads. A Worker startup failure reports an error without parsing on the main thread. File size is checked before allocation and download object URLs are revoked. A Promise alone does not mean background execution; applications using the byte API directly should choose their own Worker strategy.

Both Transitional and Strict OOXML namespaces are supported. At the final day `9999-12-31`, ordinary calendar time and the default millisecond Date format are supported; elapsed or numeric-conditional custom formats with time fractions fail with UNSUPPORTED_VALUE rather than return a shifted total. Unsupported engine date-format syntax is also converted to this owned error.

Unselected XML uses validation without retaining node trees. Retained workbook/style/selected-sheet metadata is limited to `max(1_000_000, 8 * maxCells)` nodes per XML document before allocating another node; increase `maxCells` explicitly only for trusted complex metadata. This structural guard is separate from the selected rectangular cell quota and also protects inspect. Overlapping formula ranges are invalid and fail before repeated traversal.

The 0.2.2 candidate CSV and Excel file samples include **1000-row** and **10000-row** buttons. Select a size, download the complete file, reset, and import that file to verify the full row count. Tables show at most 100 rows; CSV text previews are also capped at 100 data rows. This preview limit does not truncate the imported data or exported file. CSV uses synchronous Core conversion; XLSX conversion runs in a dedicated Worker.
