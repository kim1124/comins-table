import { xmlEscape } from "@federicocarboni/saxe";
import type { Feature } from "write-excel-file/universal";
import { findElement, getChildElements, getOpeningTagMarkup } from "write-excel-file/utility";
import { CominsXlsxError } from "./errors";
/** OOXML escapes preserve code units that XML itself cannot represent. */
function spreadsheetText(value: string): string {
  const escaped = value.replace(/_x[\da-f]{4}_/gi, text => `_x005F_${text.slice(1)}`)
    .replace(/[\x00-\x08\x0b-\x1f\ufffe\uffff]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g,
      text => `_x${text.charCodeAt(0).toString(16).padStart(4,"0").toUpperCase()}_`);
  return xmlEscape(escaped);
}
/** Literal text bypasses the writer's empty-string coercion and object-key lookup. */
export function createXlsxTextTable() {
  const values = new Map<string, string>();
  const token = (text: string, address: string) => { values.set(address, text); return 0; };
  const feature: Feature<Blob> = { files: { transform: { "xl/worksheets/sheet{id}.xml": {
    transform(xml) {
      const sheetData = findElement(xml, "sheetData");
      if (!sheetData) throw new CominsXlsxError("INVALID_WORKBOOK");
      const parts: string[] = []; let offset = 0; let written = 0;
      for (const row of getChildElements(xml, sheetData)) for (const cell of getChildElements(xml, row)) {
        const address = String(cell.openingTagAttributes.r);
        if (cell.tagName !== "c" || !values.has(address)) continue;
        const end = cell.selfClosingTag ? cell.openingTagEndIndex : cell.closingTagEndIndex;
        if (end === undefined) throw new CominsXlsxError("INVALID_WORKBOOK");
        parts.push(xml.slice(offset, cell.openingTagStartIndex),
          getOpeningTagMarkup("c", { ...cell.openingTagAttributes, t: "inlineStr" }),
          `<is><t xml:space="preserve">${spreadsheetText(values.get(address)!)}</t></is></c>`);
        // The public XML utility reports inclusive end indexes.
        offset = end + 1; written++;
      }
      if (written !== values.size) throw new CominsXlsxError("INVALID_WORKBOOK");
      parts.push(xml.slice(offset)); return parts.join("");
    },
  } } } };
  return { token, feature };
}
