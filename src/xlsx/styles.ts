import type { CominsXlsxCellStyle, CominsXlsxExportOptions } from "../core/editing/xlsx-model";
import { CominsXlsxError } from "./errors";
const invalid = (): never => { throw new CominsXlsxError("INVALID_OPTIONS"); };
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, allowed: readonly string[]): void {
  if (Object.keys(value).some(key => !allowed.includes(key))) invalid();
}
function size(value: unknown, max: number): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > max) return invalid();
  return value;
}
const enums: Record<string, readonly string[]> = { fontWeight: ["bold"], fontStyle: ["italic"], borderStyle: ["thin", "medium", "thick"], align: ["left", "center", "right"], alignVertical: ["top", "center", "bottom"] };
function cellStyle(value: unknown): CominsXlsxCellStyle {
  if (value === undefined) return {};
  const source = object(value); const result: Record<string, unknown> = {};
  keys(source, ["fontFamily", "fontSize", "textColor", "backgroundColor", "borderColor", "wrap", "format", ...Object.keys(enums)]);
  for (const [key, entry] of Object.entries(source)) {
    if (entry === undefined) continue;
    if (key === "fontSize") size(entry, 409);
    else if (key === "wrap") { if (typeof entry !== "boolean") invalid(); }
    else if (enums[key]) { if (typeof entry !== "string" || !enums[key]!.includes(entry)) invalid(); }
    else if (key.endsWith("Color")) { if (typeof entry !== "string" || !/^#[0-9a-f]{6}$/i.test(entry)) invalid(); }
    else if (typeof entry !== "string" || !entry || entry.length > 255 || /[\x00-\x1f\ufffe\uffff]/u.test(entry)) invalid();
    result[key] = entry;
  }
  return result as CominsXlsxCellStyle;
}
export function resolveXlsxStyles<TData>(options: CominsXlsxExportOptions<TData>) {
  const input = options.styles === undefined ? {} : object(options.styles);
  keys(input, ["theme", "header", "body", "headerHeight", "rowHeight", "columns"]);
  if (input.theme !== undefined && input.theme !== "comins" && input.theme !== "plain") invalid();
  const headerHeight = size(input.headerHeight, 409); const rowHeight = size(input.rowHeight, 409);
  const base: CominsXlsxCellStyle = input.theme === "plain" ? {} : { fontFamily: "Arial", fontSize: 11, textColor: "#111827", borderColor: "#E5E7EB", borderStyle: "thin", alignVertical: "center" };
  const header = { ...base, ...(input.theme === "plain" ? {} : { backgroundColor: "#F3F4F6", fontWeight: "bold" as const }), ...cellStyle(input.header) };
  const body = { ...base, ...cellStyle(input.body) };
  const perColumn = new Map<string, { width?: number; header: CominsXlsxCellStyle; body: CominsXlsxCellStyle }>();
  if (input.columns !== undefined) for (const [id, value] of Object.entries(object(input.columns))) {
    const column = object(value); keys(column, ["width", "header", "body"]);
    perColumn.set(id, { width: size(column.width, 255), header: cellStyle(column.header), body: cellStyle(column.body) });
  }
  const byId = new Map(options.columns.map(column => [column.id, column]));
  const chosen = options.columnOrder?.length ? options.columnOrder.flatMap(id => { const column = byId.get(id); return column ? [column] : []; }) : options.columns;
  return { headerHeight, rowHeight, columns: chosen.map(column => {
    const override = column.id === undefined ? undefined : perColumn.get(column.id);
    return { width: override?.width, header: { ...header, ...override?.header }, body: { ...body, ...override?.body } };
  }) };
}
