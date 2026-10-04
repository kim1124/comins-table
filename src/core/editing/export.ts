import type { CominsExportColumn, CominsExportRowsOptions, CominsExportValueSource, CominsExportMetadata } from "../model";

const metadataKeys = ["__rowId", "__parentId", "__depth", "__groupId"] as const;

function getMetadataColumns<TData>(metadata: CominsExportMetadata<TData> | undefined, headers: readonly (string | undefined)[]) {
  return metadataKeys.flatMap(key => {
    const value = metadata?.[key];
    if (!value) return [];
    if (headers.includes(key)) throw new Error(`Export metadata column collision: ${key}`);
    return [{ key, value }];
  });
}

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
  metadata,
  valueSource = "raw",
}: CominsExportRowsOptions<TData>) {
  const exportColumns = normalizeCominsExportColumns({ columnOrder, columns });
  const headers = exportColumns.map(column => getCominsExportHeader(column, headerOverrides));
  const managementColumns = getMetadataColumns(metadata, headers);
  const lines = [
    [...headers, ...managementColumns.map(column => column.key)].map(escapeCominsCsvCell).join(","),
    ...rows.map((row, rowIndex) =>
      [...exportColumns.map(column => getCominsExportValue(column, row, rowIndex, valueSource)),
        ...managementColumns.map(column => column.value(row, rowIndex))].map(escapeCominsCsvCell).join(","),
    ),
  ];

  return lines.join("\n");
}

export function exportCominsRowsToJson<TData>({
  columnOrder,
  columns,
  headerOverrides,
  rows,
  metadata,
  valueSource = "raw",
}: CominsExportRowsOptions<TData>) {
  const exportColumns = normalizeCominsExportColumns({ columnOrder, columns });
  const managementColumns = getMetadataColumns(metadata, exportColumns.map(column => getCominsExportHeader(column, headerOverrides)));
  const data = rows.map((row, rowIndex) =>
    Object.fromEntries(
      [...exportColumns.map((column) => [
        getCominsExportHeader(column, headerOverrides),
        getCominsExportValue(column, row, rowIndex, valueSource),
      ]), ...managementColumns.map(column => [column.key, column.value(row, rowIndex)])],
    ),
  );

  return JSON.stringify(data, null, 2);
}
