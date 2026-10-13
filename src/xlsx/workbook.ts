import type { CominsXlsxWorkbookInfo } from "../core/editing/xlsx-model";
import { CominsXlsxError } from "./errors";
import { canonicalXlsxRelationship, child, children, parseXlsxXml, type XmlNode } from "./xml";
import type { VerifiedXlsxContainer } from "./zip";
const MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PACKAGE_REL = "http://schemas.openxmlformats.org/package/2006/relationships";
const CONTENT = "http://schemas.openxmlformats.org/package/2006/content-types";
const invalid = (): never => { throw new CominsXlsxError("INVALID_WORKBOOK"); };
function xml(container: VerifiedXlsxContainer, path: string) { const bytes = container.files.get(path); if (!bytes) return invalid(); return parseXlsxXml(bytes, container.maxMetadataNodes); }
function root(node: XmlNode, local: string, uri: string) { if (node.local !== local || node.uri !== uri) invalid(); return node; }
function targetPath(base: string, target: string): string {
  if (!target || /[\\\0?#]/.test(target) || /^[a-z][a-z\d+.-]*:/i.test(target) || target.startsWith("//")) return invalid();
  let decoded: string; try { decoded = decodeURIComponent(target); } catch { return invalid(); }
  if (/[\\\0?#]/.test(decoded)) return invalid();
  const parts = decoded.startsWith("/") ? [] : base.split("/").slice(0, -1);
  for (const part of decoded.split("/")) {
    if (part === "..") { if (!parts.length) return invalid(); parts.pop(); }
    else if (part && part !== ".") parts.push(part);
  }
  return parts.join("/");
}
function relations(container: VerifiedXlsxContainer, base: string): Map<string, { type: string; path?: string }> {
  const slash = base.lastIndexOf("/"); const dir = slash >= 0 ? base.slice(0, slash+1) : ""; const file = base.slice(slash+1);
  const node = root(xml(container, `${dir}_rels/${file}.rels`), "Relationships", PACKAGE_REL);
  const map = new Map<string, { type: string; path?: string }>();
  for (const rel of children(node, "Relationship")) {
    const { Id, Type, Target, TargetMode } = rel.attrs;
    if (!Id || !Type || !Target || map.has(Id) || (TargetMode && TargetMode !== "External" && TargetMode !== "Internal")) invalid();
    const path = TargetMode === "External" ? undefined : targetPath(base, Target!);
    if (path && !container.files.has(path)) invalid();
    map.set(Id!, { type: canonicalXlsxRelationship(Type!), path });
  }
  return map;
}
function workbook(container: VerifiedXlsxContainer) {
  const types = root(xml(container, "[Content_Types].xml"), "Types", CONTENT);
  if (types.children.some(n => {
    const applies = n.local === "Override" ? container.files.has((n.attrs.PartName ?? "").replace(/^\//, "")) : [...container.files.keys()].some(path => path.endsWith(`.${n.attrs.Extension ?? ""}`));
    return applies && /macroEnabled|vbaProject/i.test(n.attrs.ContentType ?? "");
  })) throw new CominsXlsxError("UNSUPPORTED_FILE");
  const docRelations = [...relations(container, "").values()].filter(r => r.type === `${REL}/officeDocument`);
  const path = docRelations.length === 1 ? docRelations[0]!.path : undefined; if (!path) return invalid();
  const declaration = children(types, "Override").find(n => n.attrs.PartName === `/${path}`);
  if (declaration?.attrs.ContentType !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml") throw new CominsXlsxError("UNSUPPORTED_FILE");
  const node = root(xml(container, path), "workbook", MAIN); const rels = relations(container, path);
  const names = new Set<string>(); const sheets = children(child(node, "sheets") ?? invalid(), "sheet").map(s => {
    const name = s.attrs.name; const visibility = s.attrs.state ?? "visible"; const relationship = rels.get(s.attrs[`{${REL}}id`] ?? "");
    if (!name || names.has(name) || !["visible", "hidden", "veryHidden"].includes(visibility) || relationship?.type !== `${REL}/worksheet` || !relationship.path) return invalid();
    names.add(name);
    return { name, visibility: visibility as "visible" | "hidden" | "veryHidden", path: relationship.path };
  });
  if (!sheets.length) invalid();
  const stylePath = [...rels.values()].find(r => r.type === `${REL}/styles`)?.path;
  const formatIds = stylePath ? children(child(root(xml(container, stylePath), "styleSheet", MAIN), "cellXfs") ?? invalid(), "xf").map(n => Number(n.attrs.numFmtId ?? 0)) : [];
  return { sheets, formatIds, date1904: ["1", "true"].includes(child(node, "workbookPr")?.attrs.date1904 ?? ""), path };
}
export function inspectCominsXlsxContainer(container: VerifiedXlsxContainer): CominsXlsxWorkbookInfo {
  return { sheets: workbook(container).sheets.map(({ name, visibility }) => ({ name, visibility })) };
}
export type XlsxCellMetadata = { address: string; row: number; col: number; type?: string; style?: number; formula: boolean; cachePresent: boolean; inlinePresent: boolean; value?: string; formulaRange?: string; formulaType?: string };
export type XlsxSheetMetadata = { name: string; path: string; date1904: boolean; formatIds: readonly number[]; rows: number; cols: number; cells: ReadonlyMap<string, XlsxCellMetadata> };
export function cellAddress(row: number, col: number): string {
  let letters = ""; while (col > 0) { col--; letters = String.fromCharCode(65 + col % 26) + letters; col = Math.floor(col / 26); }
  return letters + row;
}
export function coordinate(address: string): { row: number; col: number } {
  const match = /^([A-Z]{1,3})([1-9]\d{0,6})$/.exec(address); if (!match) return invalid();
  let col = 0; for (const letter of match[1]!) col = col * 26 + letter.charCodeAt(0) - 64;
  const row = Number(match[2]); if (col > 16384 || row > 1048576) return invalid();
  return { row, col };
}
function range(ref: string) {
  const parts = ref.split(":"); if (parts.length > 2) return invalid(); const start = coordinate(parts[0]!); const end = coordinate(parts[1] ?? parts[0]!);
  if (end.row < start.row || end.col < start.col) return invalid(); return { start, end };
}
export function readCominsXlsxSheetMetadata(container: VerifiedXlsxContainer, requested: string | undefined, maxCells: number): XlsxSheetMetadata {
  const book = workbook(container); const visible = book.sheets.filter(s => s.visibility === "visible");
  if (!requested && visible.length > 1) throw new CominsXlsxError("SHEET_SELECTION_REQUIRED", { sheetNames: visible.map(s => s.name) });
  const selected = requested !== undefined ? visible.find(s => s.name === requested) : visible[0];
  if (!selected) throw new CominsXlsxError("SHEET_NOT_FOUND");
  const sheet = root(xml(container, selected.path), "worksheet", MAIN);
  if (children(child(sheet, "mergeCells") ?? sheet, "mergeCell").length) throw new CominsXlsxError("MERGED_CELLS", { sheetName: selected.name });
  let rows = 0, cols = 0;
  const bounded = (row: number, col: number) => { if (row * col > maxCells) throw new CominsXlsxError("LIMIT_EXCEEDED", { sheetName: selected.name }); };
  const declared = child(sheet, "dimension")?.attrs.ref; if (declared) { const area = range(declared); bounded(area.end.row, area.end.col); }
  const cells = new Map<string, XlsxCellMetadata>(); const formulaRanges: ReturnType<typeof range>[] = [];
  for (const row of children(child(sheet, "sheetData") ?? invalid(), "row")) {
    for (const cell of children(row, "c")) {
      const address = cell.attrs.r; if (!address || cells.has(address)) return invalid(); const position = coordinate(address);
      if (row.attrs.r !== undefined && Number(row.attrs.r) !== position.row) return invalid();
      if (["f", "v", "is"].some(local => children(cell, local).length > 1)) return invalid();
      if (cell.attrs.t !== undefined && !["b", "n", "s", "str", "inlineStr", "e", "d"].includes(cell.attrs.t)) return invalid();
      const formula = child(cell, "f"); const value = child(cell, "v"); const inline = child(cell, "is");
      if (formula && formula.attrs.ref) { const area = range(formula.attrs.ref); bounded(area.end.row, area.end.col); formulaRanges.push(area); }
      if (value?.children.length || (inline && cell.attrs.t !== "inlineStr")) return invalid();
      if (value && (cell.attrs.t === "n" || cell.attrs.t === undefined) && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value.text.trim())) return invalid();
      if (value && cell.attrs.t === "s" && (!/^\d+$/.test(value.text.trim()) || !Number.isSafeInteger(Number(value.text)))) return invalid();
      const style = cell.attrs.s === undefined ? undefined : Number(cell.attrs.s);
      if (style !== undefined && (!Number.isSafeInteger(style) || style < 0)) return invalid();
      cells.set(address, { address, ...position, type: cell.attrs.t, style, formula: !!formula, cachePresent: !!value, inlinePresent: !!inline, value: value?.text, formulaRange: formula?.attrs.ref, formulaType: formula?.attrs.t });
      if (formula || value || inline) { rows = Math.max(rows, position.row); cols = Math.max(cols, position.col); bounded(rows, cols); }
    }
  }
  const visitedFormulaCells = new Set<string>();
  for (const area of formulaRanges) {
    rows = Math.max(rows, area.end.row); cols = Math.max(cols, area.end.col); bounded(rows, cols);
    for (let row = area.start.row; row <= area.end.row; row++) for (let col = area.start.col; col <= area.end.col; col++) {
      // No formula cell may disappear merely because the engine omitted its missing cache.
      const address = cellAddress(row, col);
      if (visitedFormulaCells.has(address)) return invalid();
      visitedFormulaCells.add(address);
      const value = cells.get(address);
      if (!value?.cachePresent) throw new CominsXlsxError("MISSING_FORMULA_RESULT", { sheetName: selected.name, rowNumber: row, cellAddress: cellAddress(row, col) });
      value.formula = true;
    }
  }
  return { name: selected.name, path: selected.path, date1904: book.date1904, formatIds: book.formatIds, rows, cols, cells };
}
