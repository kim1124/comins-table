import type { CominsXlsxExportOptions, CominsXlsxImportOptions } from "../../src/core/editing/xlsx-model";
const exportOptions: CominsXlsxExportOptions<{ id: string }> = { rows: [{ id: "001" }], columns: [{ value: r => r.id }] };
const importOptions: CominsXlsxImportOptions<{ id: string }> = { bytes: new Uint8Array(), mapRow: row => ({ id: String(row.cells[0]) }) };
// @ts-expect-error Metadata is not an XLSX option.
const metadata: CominsXlsxExportOptions<number> = { rows: [], columns: [], metadata: {} };
// @ts-expect-error Import accepts bytes, not a file URL.
const invalid: CominsXlsxImportOptions<number> = { bytes: "file.xlsx", mapRow: () => 1 };
void [exportOptions, importOptions, metadata, invalid];

// @ts-expect-error Arbitrary engine features are not public styles.
const unsupportedStyle: CominsXlsxExportOptions<number> = { rows: [], columns: [], styles: { features: [] } };
void unsupportedStyle;
