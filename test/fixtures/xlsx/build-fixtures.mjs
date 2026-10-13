import { ZipWriter, Uint8ArrayReader, Uint8ArrayWriter } from '@zip.js/zip.js/index-native.js';
export const MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
export const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
export async function archive(files, level = 6) {
  const writer = new ZipWriter(new Uint8ArrayWriter(), { useWebWorkers: false, dataDescriptor: false });
  for (const [name, value] of files) await writer.add(name, new Uint8ArrayReader(typeof value === 'string' ? new TextEncoder().encode(value) : value), { level });
  return writer.close();
}
export function workbookFiles({ cells = '<row r="1"><c r="A1" t="inlineStr"><is><t>ID</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>00123</t></is></c></row>', sheets = [{ name: 'Sheet1', state: 'visible' }], dimension = 'A1:A2', merge = '', date1904 = false, styles = '' } = {}) {
  return [
    ['[Content_Types].xml', `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}${styles ? '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' : ''}</Types>`],
    ['_rels/.rels', `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml', `<workbook xmlns="${MAIN}" xmlns:r="${REL}"><workbookPr date1904="${date1904 ? 1 : 0}"/><sheets>${sheets.map((s, i) => `<sheet name="${s.name}" sheetId="${i+1}" state="${s.state}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i+1}" Type="${REL}/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}${styles ? `<Relationship Id="styles" Type="${REL}/styles" Target="styles.xml"/>` : ''}</Relationships>`],
    ...sheets.map((_, i) => [`xl/worksheets/sheet${i+1}.xml`, `<worksheet xmlns="${MAIN}"><dimension ref="${dimension}"/><sheetData>${cells}</sheetData>${merge}</worksheet>`]),
    ...(styles ? [['xl/styles.xml', styles]] : [])
  ];
}
export async function fixture(options) { return archive(workbookFiles(options)); }
