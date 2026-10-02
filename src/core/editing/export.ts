import type { CominsExportColumn, CominsExportRowsOptions, CominsExportValueSource } from "../model";

function normalizeCominsExportColumns<TData>({
  columnOrder,
  columns,
}: Pick<CominsExportRowsOptions<TData>, "columnOrder" | "columns">) {
  if (!columnOrder?.length) {
    return columns;
  }

  const columnsById = new Map(columns.map((column) => [column.id, column]));

  return columnOrder
    .map((id) => columnsById.get(id))
    .filter((column): column is CominsExportColumn<TData> => Boolean(column));
}

function stringifyCominsExportValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }

  return JSON.stringify(value);
}

function escapeCominsCsvCell(value: unknown) {
  const text = stringifyCominsExportValue(value);

  return /[",\r\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function getCominsExportHeader<TData>(column: CominsExportColumn<TData>, headerOverrides?: Record<string, string>) {
  if (column.id && headerOverrides?.[column.id] !== undefined) {
    return headerOverrides[column.id];
  }

  return column.label ?? column.id ?? "";
}

function getCominsExportValue<TData>(
  column: CominsExportColumn<TData>,
  row: TData,
  rowIndex: number,
  valueSource: CominsExportValueSource,
) {
  if (valueSource === "formatted" && column.format) {
    return column.format(row, rowIndex);
  }

  return column.value(row, rowIndex);
}

export function exportCominsRowsToCsv<TData>({
  columnOrder,
  columns,
  headerOverrides,
  rows,
  valueSource = "raw",
}: CominsExportRowsOptions<TData>) {
  const exportColumns = normalizeCominsExportColumns({ columnOrder, columns });
  const lines = [
    exportColumns.map((column) => escapeCominsCsvCell(getCominsExportHeader(column, headerOverrides))).join(","),
    ...rows.map((row, rowIndex) =>
      exportColumns.map((column) => escapeCominsCsvCell(getCominsExportValue(column, row, rowIndex, valueSource))).join(","),
    ),
  ];

  return lines.join("\n");
}

export function exportCominsRowsToJson<TData>({
  columnOrder,
  columns,
  headerOverrides,
  rows,
  valueSource = "raw",
}: CominsExportRowsOptions<TData>) {
  const exportColumns = normalizeCominsExportColumns({ columnOrder, columns });
  const data = rows.map((row, rowIndex) =>
    Object.fromEntries(
      exportColumns.map((column) => [
        getCominsExportHeader(column, headerOverrides),
        getCominsExportValue(column, row, rowIndex, valueSource),
      ]),
    ),
  );

  return JSON.stringify(data, null, 2);
}
