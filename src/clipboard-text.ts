// Limits apply before allocating a matrix or invoking application parsers.
export const MAX_CLIPBOARD_CHARACTERS = 1_000_000;
export const MAX_CLIPBOARD_CELLS = 100_000;

/** Parse plain-text TSV, including spreadsheet quoted tabs, newlines and quotes. */
export function parseCominsClipboardText(text: string): string[][] {
  if (text.length > MAX_CLIPBOARD_CHARACTERS) throw new Error("Clipboard text exceeds 1000000 characters.");
  const rows: string[][] = [];
  let row: string[] = [], value = "", quoted = false, closed = false, count = 0;
  const cell = () => {
    if (++count > MAX_CLIPBOARD_CELLS) throw new Error("Clipboard exceeds 100000 cells.");
    row.push(value); value = ""; closed = false;
  };
  for (let index = 0; index < text.length; index++) {
    const char = text[index]!;
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') { value += '"'; index++; }
        else { quoted = false; closed = true; }
      } else value += char;
    } else if (char === "\t" || char === "\r" || char === "\n") {
      cell();
      if (char !== "\t") {
        rows.push(row); row = [];
        if (char === "\r" && text[index + 1] === "\n") index++;
        // A terminal spreadsheet record separator is not an extra empty Row.
        if (index === text.length - 1) return rows;
      }
    } else if (closed) {
      throw new Error("Unexpected text after a quoted clipboard cell.");
    } else if (char === '"' && value === "") quoted = true;
    else value += char;
  }
  if (quoted) throw new Error("Unclosed quoted clipboard cell.");
  cell(); rows.push(row);
  return rows;
}
