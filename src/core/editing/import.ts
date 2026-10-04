import type { CominsCsvImportOptions } from "../model";

function validateLimit(value: number, name: string) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive safe integer.`);
  }
}

/** Parse and validate the complete CSV before mapping any application-owned rows. */
export function importCominsRowsFromCsv<TData>({
  text,
  mapRow,
  hasHeader = true,
  maxCharacters = 1_000_000,
  maxCells = 100_000,
}: CominsCsvImportOptions<TData>): TData[] {
  validateLimit(maxCharacters, "maxCharacters");
  validateLimit(maxCells, "maxCells");
  if (text.length > maxCharacters) throw new RangeError("CSV exceeds the character limit.");

  const start = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  if (text.length === start) return [];

  const records: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  let closed = false;
  let cellCount = 0;
  let width: number | undefined;
  const syntaxError = (reason: string) => new SyntaxError(
    `Invalid CSV at record ${records.length + 1}, field ${row.length + 1}: ${reason}.`,
  );
  const finishCell = () => {
    if (++cellCount > maxCells) throw new RangeError("CSV exceeds the cell limit.");
    row.push(value);
    value = "";
    closed = false;
  };
  const finishRecord = () => {
    finishCell();
    width ??= row.length;
    if (row.length !== width) throw syntaxError("inconsistent field count");
    records.push(row);
    row = [];
  };

  for (let index = start; index < text.length; index++) {
    const char = text[index]!;
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') { value += '"'; index++; }
        else { quoted = false; closed = true; }
      } else value += char;
    } else if (char === ",") {
      finishCell();
    } else if (char === "\r" || char === "\n") {
      finishRecord();
      if (char === "\r" && text[index + 1] === "\n") index++;
    } else if (closed) {
      throw syntaxError("unexpected text after a quoted field");
    } else if (char === '"') {
      if (value !== "") throw syntaxError("quote inside an unquoted field");
      quoted = true;
    } else value += char;
  }
  if (quoted) throw syntaxError("unclosed quoted field");
  // A final record separator terminates the preceding row, not an extra blank row.
  if (row.length || value !== "" || closed || !/[\r\n]$/u.test(text)) finishRecord();

  const headers = hasHeader ? records[0]! : null;
  const firstRow = hasHeader ? 1 : 0;
  return records.slice(firstRow).map((cells, rowIndex) => mapRow({ cells, headers, rowIndex }));
}
